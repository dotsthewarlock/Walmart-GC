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
 const sheet={cards:[csvHeaders],meta:[['key','value'],['sheetVersion','initial']],reads:0,writes:0,mode:null,principal:'qa-principal'};
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
  if(path.startsWith('/drive/v3/files/nonowned-sheet'))return {statusCode:200,data:JSON.stringify({id:'nonowned-sheet',mimeType:'application/vnd.google-apps.spreadsheet',ownedByMe:false,owners:[{permissionId:'another-principal'}]})};
  throw Error('Unmocked Drive request: '+path);
 }).persist();
 const sheets=mock.get('https://sheets.googleapis.com');
 sheets.intercept({method:'GET',path:/.*/}).reply(({path})=>{
  sheet.reads++;
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
function runtime(mock,persist,bindings={}){return new Miniflare({modules:true,scriptPath:resolve('worker/src/index.js'),modulesRoot:resolve('.'),
 modulesRules:[{type:'ESModule',include:['**/*.js'],fallthrough:true}],compatibilityDate:'2026-06-11',
 durableObjects:{SHEET_COORDINATOR:{className:'SheetCoordinator',useSQLite:true}},durableObjectsPersist:persist,
 kvNamespaces:['SESSIONS','OAUTH_STATE'],bindings:{SESSION_SECRET:'synthetic-secret',GOOGLE_CLIENT_ID:'synthetic-client',GOOGLE_CLIENT_SECRET:'synthetic-client-secret',FRONTEND_ORIGIN:'https://wallet.example',REDIRECT_URI:'https://wallet.example/auth/callback',...bindings},fetchMock:mock});}
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
test('activation block permits verified identity/ownership checks but cannot read, initialize or write inventory',async()=>{
 const {mock,sheet}=googleFixture(),mf=runtime(mock,undefined,{SYNC_ACTIVATION_BLOCKED:'true'});try{
  await seedSession(mf);
  const headers={Origin:'https://wallet.example',Cookie:'walmart_gc_session=synthetic-session','Content-Type':'application/json'};
  const status=await (await mf.dispatchFetch('https://wallet.example/api/status',{headers})).json();
  assert.equal(status.principal,'qa-principal');assert.equal(status.ownershipVerified,true);assert.equal(status.activationBlocked,true);assert.equal(status.coordinationAvailable,false);
  for(const [path,body] of [['/api/sync',{action:'pull'}],['/api/sync',{action:'commit',id:crypto.randomUUID()}],['/api/sheet/ensure',{id:crypto.randomUUID()}]]){
   const result=await mf.dispatchFetch('https://wallet.example'+path,{method:'POST',headers,body:JSON.stringify({protocol:syncProtocol,principal:'qa-principal',sheetId:'synthetic-sheet',...body})});
   assert.equal(result.status,503);assert.equal((await result.json()).code,'activation_pending');
  }
  const rejected=await mf.dispatchFetch('https://wallet.example/api/sync',{method:'POST',headers,body:JSON.stringify({protocol:syncProtocol,action:'pull',sheetId:'nonowned-sheet'})});assert.equal(rejected.status,403);
  assert.equal(sheet.reads,0);assert.equal(sheet.writes,0);
 }finally{await mf.dispose();await mock.close();}
});

test('SQLite maintenance verification proofs survive restart and block timestamp removal',async()=>{
 const persist=await mkdtemp(join(tmpdir(),'gc-wallet-proof-')),{mock,sheet}=googleFixture();
 const precise={...cardA,lastBalanceChecked:'2026-11-25',lastBalanceCheckedAt:'2026-11-25T10:00:00.000Z'};
 sheet.cards.push(csvHeaders.map(h=>precise[h]??''));let mf=runtime(mock,persist);
 try{
  let object=await stub(mf);assert.equal((await send(object,{action:'pause',id:crypto.randomUUID()})).status,200);
  await mf.dispose();mf=runtime(mock,persist);object=await stub(mf);
  sheet.cards[1][csvHeaders.indexOf('lastBalanceCheckedAt')]='';
  const result=await send(object,{action:'resume',id:crypto.randomUUID(),deletedIds:[]});
  assert.equal(result.code,'verification_changed');
 }finally{await mf.dispose();await mock.close();await rm(persist,{recursive:true,force:true});}
});

test('SQLite control rejection proof and duplicate maintenance survive HTTP boundaries and restart',async()=>{
 const {mock,sheet}=googleFixture(),persist=await mkdtemp(join(tmpdir(),'gc-p0-'));let mf=runtime(mock,persist);
 const row=csvHeaders.map(key=>key==='used'?'FALSE':cardA[key]??'');sheet.cards.push(row,[...row]);
 try{
  await seedSession(mf);
  const request={protocol:syncProtocol,principal:'qa-principal',sheetId:'synthetic-sheet',action:'ensure',id:crypto.randomUUID()};
  const http=body=>mf.dispatchFetch('https://wallet.example/api/sheet/ensure',{method:'POST',headers:{Cookie:'walmart_gc_session=synthetic-session','Content-Type':'application/json'},body:JSON.stringify(body)});
  let response=await http(request),result=await response.json();assert.equal(response.status,409);assert.equal(result.code,'duplicate_cards');assert.equal(result.notDispatched,true);assert.equal(result.rejection.id,request.id);assert.equal(result.rejection.requestHash,await fingerprint(request));assert.deepEqual(result.diagnostics[0].rows,[2,3]);assert.ok(!JSON.stringify(result).includes(cardA.cardNumber));
  await mf.dispose();mf=runtime(mock,persist);await seedSession(mf);response=await http(request);result=await response.json();assert.equal(result.code,'control_rejected');assert.equal(result.notDispatched,true);
  const before=structuredClone(sheet.cards),object=await stub(mf),paused=await send(object,{action:'pause',id:crypto.randomUUID()});
  assert.equal(paused.status,200);assert.equal(paused.snapshot.maintenance,true);assert.deepEqual(sheet.cards,before);assert.equal(sheet.writes,1);
 }finally{await mf.dispose();mock.close();await rm(persist,{recursive:true,force:true});}
});
