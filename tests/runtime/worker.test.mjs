import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {Miniflare,createFetchMock} from 'miniflare';
import {cardA,cardB,operation} from '../syncFixtures.mjs';
import {csvHeaders} from '../../src/lib/csvSchema.js';
import {syncProtocol,fingerprint,snapshotContent} from '../../src/lib/syncProtocol.js';

// Real workerd + SQLite, production Worker module graph and HTTP DO class.
// All outbound requests are denied unless fulfilled by these synthetic adapters.
// https://developers.cloudflare.com/workers/testing/miniflare/core/standards/
function googleFixture(){
 const mock=createFetchMock();mock.disableNetConnect();
 const sheet={cards:[csvHeaders],meta:[['key','value'],['sheetVersion','initial']],writes:0,mode:null,principal:'qa-principal'};
 const apply=requests=>{
  for(const {updateCells} of requests){
   assert.ok(updateCells,'Fixture must explicitly support every dispatched mutation');
   const {start,range,rows}=updateCells,target=(start??range).sheetId===10?sheet.cards:sheet.meta;
   const row=start?.rowIndex??range.startRowIndex,column=start?.columnIndex??range.startColumnIndex;
   if(range)target.splice(row);
   rows.forEach((r,i)=>{const dest=target[row+i]??=[];r.values.forEach((c,j)=>{dest[column+j]=c.userEnteredValue?.stringValue??c.userEnteredValue?.boolValue??'';});});
  }
 };
 const google=mock.get('https://www.googleapis.com');
 google.intercept({method:'GET',path:/.*/}).reply(({path})=>{
  if(path.startsWith('/drive/v3/about'))return {statusCode:200,data:JSON.stringify({user:{permissionId:sheet.principal,emailAddress:'qa@example.invalid'}})};
  if(path.startsWith('/drive/v3/files/synthetic-sheet'))return {statusCode:200,data:JSON.stringify({id:'synthetic-sheet',name:'Walmart-GC Data',mimeType:'application/vnd.google-apps.spreadsheet',ownedByMe:true,owners:[{permissionId:'qa-principal'}]})};
  throw Error('Unmocked Drive request: '+path);
 }).persist();
 const sheets=mock.get('https://sheets.googleapis.com');
 sheets.intercept({method:'GET',path:/.*/}).reply(({path})=>{
  const decoded=decodeURIComponent(path),range=decoded.split('/values/')[1]?.split('?')[0];
  const data=range?{values:range.startsWith('_META')?sheet.meta:sheet.cards}:{sheets:[{properties:{sheetId:10,title:'Cards',gridProperties:{rowCount:1000,columnCount:26}}},{properties:{sheetId:20,title:'_META',hidden:true,gridProperties:{rowCount:1000,columnCount:26}}}]};
  return {statusCode:200,data:JSON.stringify(data)};
 }).delay(5).persist();
 sheets.intercept({method:'POST',path:'/v4/spreadsheets/synthetic-sheet:batchUpdate'}).reply(({body})=>{
  sheet.writes++;const mode=sheet.mode;
  return {statusCode:mode?503:200,data:async()=>{
   const {requests}=await new Response(body).json();
   if(mode==='before')sheet.late=()=>apply(requests);else apply(requests);
   return '{}';
  }};
 }).persist();
 return {mock,sheet};
}
function runtime(mock,persist){return new Miniflare({modules:true,scriptPath:resolve('worker/src/index.js'),modulesRoot:resolve('.'),
 modulesRules:[{type:'ESModule',include:['**/*.js'],fallthrough:true}],compatibilityDate:'2026-06-11',
 durableObjects:{SHEET_COORDINATOR:{className:'SheetCoordinator',useSQLite:true}},durableObjectsPersist:persist,
 kvNamespaces:['SESSIONS','OAUTH_STATE'],bindings:{SESSION_SECRET:'synthetic-secret',GOOGLE_CLIENT_ID:'synthetic-client',GOOGLE_CLIENT_SECRET:'synthetic-client-secret',FRONTEND_ORIGIN:'https://wallet.example',REDIRECT_URI:'https://wallet.example/auth/callback'},fetchMock:mock});}
async function stub(mf,name='sheet:synthetic-sheet'){const ns=await mf.getDurableObjectNamespace('SHEET_COORDINATOR');return ns.get(ns.idFromName(name));}
async function send(target,body){const response=await target.fetch('https://internal/sync',{method:'POST',headers:{Authorization:'Bearer synthetic-token','Content-Type':'application/json'},body:JSON.stringify({protocol:syncProtocol,principal:'qa-principal',sheetId:'synthetic-sheet',...body})});return {status:response.status,...await response.json()};}
const commit=(base,operations)=>({action:'commit',id:crypto.randomUUID(),base,cards:operations.map(op=>op.after),operations});
async function seedSession(mf){
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode('synthetic-secret'),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 const digest=await crypto.subtle.sign('HMAC',key,new TextEncoder().encode('synthetic-session'));
 const kv=await mf.getKVNamespace('SESSIONS');await kv.put('session:'+Buffer.from(digest).toString('base64url'),JSON.stringify({principal:'qa-principal',sheetId:'synthetic-sheet',refreshToken:'synthetic-refresh',accessToken:'synthetic-token',expiresAt:'2099-01-01T00:00:00Z'}));
}
test('production Worker and SQLite coordinator fence legacy clients and serialize independent writers across external awaits',async()=>{
 const {mock,sheet}=googleFixture(),mf=runtime(mock);try{
  const legacy=await mf.dispatchFetch('https://wallet.example/api/cards/save',{method:'POST',headers:{Origin:'https://wallet.example'},body:'{}'});assert.equal(legacy.status,426);assert.equal(sheet.writes,0);
  const object=await stub(mf),base=(await send(object,{action:'pull'})).snapshot;
  const [a,b]=await Promise.all([send(object,commit(base,[operation(crypto.randomUUID(),null,cardA,'csv-recovery')])),send(object,commit(base,[operation(crypto.randomUUID(),null,cardB,'csv-recovery')]))]);
  assert.equal(a.status,200,JSON.stringify({a,sheet}));assert.equal(b.status,200,JSON.stringify(b));assert.equal(b.snapshot.cards.length,2);assert.equal(sheet.writes,2);
  assert.equal(await fingerprint(snapshotContent(b.snapshot)),b.snapshot.fingerprint);
  await seedSession(mf);
  const pull=()=>mf.dispatchFetch('https://wallet.example/api/sync',{method:'POST',headers:{Origin:'https://wallet.example',Cookie:'walmart_gc_session=synthetic-session','Content-Type':'application/json'},body:JSON.stringify({protocol:syncProtocol,action:'pull',principal:'qa-principal',sheetId:'synthetic-sheet'})});
  let response=await pull();assert.equal(response.status,200);assert.equal((await response.json()).snapshot.cards.length,2);
  sheet.principal='another-principal';response=await pull();assert.equal(response.status,401);assert.equal(sheet.writes,2);
 }finally{await mf.dispose();await mock.close();}
});
test('SQLite possible-dispatch and receipts survive actual runtime restart; missing proof cannot authorize redispatch',async()=>{
 const persist=await mkdtemp(join(tmpdir(),'gc-wallet-do-')),{mock,sheet}=googleFixture();let mf=runtime(mock,persist);
 try{
  let object=await stub(mf),base=(await send(object,{action:'pull'})).snapshot;
  const request=commit(base,[operation(crypto.randomUUID(),null,cardA,'csv-recovery')]);sheet.mode='after';
  assert.equal((await send(object,request)).code,'uncertain');assert.equal(sheet.writes,1);await mf.dispose();mf=runtime(mock,persist);object=await stub(mf);sheet.mode=null;
  const recovered=await send(object,request);assert.equal(recovered.status,200,JSON.stringify({recovered,sheet}));assert.equal(recovered.receipt.id,request.id);assert.equal(sheet.writes,1);
  const next=commit(recovered.snapshot,[operation(crypto.randomUUID(),cardA,{...cardA,notes:'late completion'})]);sheet.mode='before';assert.equal((await send(object,next)).code,'uncertain');
  await mf.dispose();mf=runtime(mock,persist);object=await stub(mf);
  assert.equal((await send(object,{action:'pull'})).code,'uncertain');assert.equal((await send(object,next)).code,'uncertain');assert.equal(sheet.writes,2);
  sheet.late();sheet.mode=null;const confirmed=await send(object,next);assert.equal(confirmed.status,200);assert.equal(confirmed.snapshot.cards[0].notes,'late completion');assert.equal(sheet.writes,2);
 }finally{await mf.dispose();await mock.close();await rm(persist,{recursive:true,force:true});}
});
