import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {Miniflare,createFetchMock} from 'miniflare';
import {cardA,cardB,operation} from '../syncFixtures.mjs';
import {csvHeaders} from '../../src/lib/csvSchema.js';
import {syncProtocol,fingerprint,snapshotContent} from '../../src/lib/syncProtocol.js';
import {createSyncEngine} from '../../src/lib/syncEngine.js';
import {openInventory,inventoryContext,profileOf} from '../../src/lib/inventory.js';
import {syntheticIndexedDB} from '../syntheticIndexedDB.mjs';
import {persistedRecoveryFixture} from '../recoveryFixture.mjs';
import {evidenceMetadata} from '../../src/lib/syncEvidence.js';

// Real workerd + SQLite, production Worker module graph and HTTP DO class.
// All outbound requests are denied unless fulfilled by these synthetic adapters.
// https://developers.cloudflare.com/workers/testing/miniflare/core/standards/
function googleFixture(){
 const mock=createFetchMock();mock.disableNetConnect();
 const sheet={cards:[csvHeaders],meta:[['key','value'],['sheetVersion','initial']],reads:0,writes:0,creates:0,exists:true,mode:null,principal:'qa-principal'};
 const ownedFile=()=>({id:'synthetic-sheet',name:'Walmart-GC Data',mimeType:'application/vnd.google-apps.spreadsheet',ownedByMe:true,owners:[{permissionId:'qa-principal'}],appProperties:{gcWalletCreationId:sheet.creationId}});
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
  if(path.startsWith('/drive/v3/files?'))return {statusCode:200,data:JSON.stringify({files:sheet.exists?[ownedFile()]:[]})};
  if(path.startsWith('/drive/v3/files/synthetic-sheet'))return {statusCode:200,data:JSON.stringify({id:'synthetic-sheet',name:'Walmart-GC Data',mimeType:'application/vnd.google-apps.spreadsheet',ownedByMe:true,owners:[{permissionId:'qa-principal'}]})};
  if(path.startsWith('/drive/v3/files/nonowned-sheet'))return {statusCode:200,data:JSON.stringify({id:'nonowned-sheet',mimeType:'application/vnd.google-apps.spreadsheet',ownedByMe:false,owners:[{permissionId:'another-principal'}]})};
  throw Error('Unmocked Drive request: '+path);
 }).persist();
 google.intercept({method:'POST',path:/^\/drive\/v3\/files\?/}).reply(({body})=>{
  return {statusCode:200,data:async()=>{sheet.exists=true;sheet.creates++;sheet.creationId=(await new Response(body).json()).appProperties.gcWalletCreationId;return JSON.stringify(ownedFile());}};
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

test('621 persisted recovery cards converge through actual frontend/Worker HTTP and fresh used-card verification',async()=>{
 const {mock,sheet}=googleFixture(),fixture=persistedRecoveryFixture();
 sheet.cards.push(...fixture.cards.map(card=>csvHeaders.map(h=>card[h]??'')));
 sheet.meta.push(...Object.entries(evidenceMetadata(fixture.evidence)));
 const mf=runtime(mock),store=openInventory({indexedDB:syntheticIndexedDB(),name:'persisted-http',storage:{getItem:()=>null}}),statuses=[];
 const request=async(path,options={})=>{
  const response=await mf.dispatchFetch('https://wallet.example'+path,{...options,headers:{Origin:'https://wallet.example',Cookie:'walmart_gc_session=synthetic-session','Content-Type':'application/json'}});
  const result=await response.json();if(!response.ok)throw Object.assign(Error(result.error),{status:response.status,payload:result});return result;
 };
 const engine=createSyncEngine({store,request,timers:{setTimeout(){return 1;},clearTimeout(){}},onStatus:s=>statuses.push(s)});
 try{
  await seedSession(mf);await store.initialize();await engine.sync({bind:true});
  let state=await store.read(),p=profileOf(state);assert.equal(statuses.at(-1).phase,'saved',JSON.stringify(statuses));
  assert.equal(p.cards.length,621);assert.equal(p.pending.length,0);assert.equal(sheet.writes,1);assert.equal(statuses.at(-1).uncertain,72);
  const card=p.cards[0];assert.equal(card.used,true);assert.equal(card.currentBalance,0);
  await store.commit({id:crypto.randomUUID(),kind:'manual-verification',...inventoryContext(state),cardNumber:card.cardNumber,
   version:p.versions[card.cardNumber],observation:{observedBalance:0,checkedAt:new Date().toISOString()}});
  await engine.sync();state=await store.read();p=profileOf(state);
  assert.equal(p.cards[0].pendingReconciliation,false);assert.equal(p.cards[0].used,true);assert.equal(p.recoveryEvidence.cards[card.cardNumber].conflicts.length,0);
  assert.equal(statuses.at(-1).uncertain,71);assert.equal(p.pending.length,0);assert.equal(sheet.writes,2);
  await engine.sync();assert.equal(sheet.writes,2);assert.equal(statuses.at(-1).phase,'saved');
 }finally{engine.stop();await store.close();await mf.dispose();await mock.close();}
});
async function stub(mf,name='sheet:synthetic-sheet'){const ns=await mf.getDurableObjectNamespace('SHEET_COORDINATOR');return ns.get(ns.idFromName(name));}
async function send(target,body){const response=await target.fetch('https://internal/sync',{method:'POST',headers:{Authorization:'Bearer synthetic-token','Content-Type':'application/json'},body:JSON.stringify({protocol:syncProtocol,principal:'qa-principal',sheetId:'synthetic-sheet',...body})});return {status:response.status,...await response.json()};}
const commit=(base,operations)=>({action:'commit',id:crypto.randomUUID(),base,cards:operations.map(op=>op.after),operations});
async function seedSession(mf,sheetId='synthetic-sheet'){
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode('synthetic-secret'),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 const digest=await crypto.subtle.sign('HMAC',key,new TextEncoder().encode('synthetic-session'));
 const kv=await mf.getKVNamespace('SESSIONS');await kv.put('session:'+Buffer.from(digest).toString('base64url'),JSON.stringify({principal:'qa-principal',sheetId,refreshToken:'synthetic-refresh',accessToken:'synthetic-token',expiresAt:'2099-01-01T00:00:00Z'}));
}

test('frontend control identities cross Worker HTTP, retain rejection proofs and recover persisted original flights without redispatch',async()=>{
 const {mock,sheet}=googleFixture(),persist=await mkdtemp(join(tmpdir(),'gc-control-http-'));
 const indexedDB=syntheticIndexedDB(),local=()=>openInventory({indexedDB,name:'http-controls',storage:{getItem:key=>key==='walmartGc.cards'?'[]':null}});
 let mf=runtime(mock,persist),store=local(),oldBoundary=false;const sent=[];
 const http=async(path,options={})=>{
  const response=await mf.dispatchFetch('https://wallet.example'+path,{...options,headers:{Origin:'https://wallet.example',Cookie:'walmart_gc_session=synthetic-session','Content-Type':'application/json'}});
  const result=await response.json();if(!response.ok)throw Object.assign(Error(result.error),{payload:result,status:response.status});return result;
 };
 const request=async(path,options)=>{
  if(options?.body){sent.push(JSON.parse(options.body));
   // Model an already persisted flight after the former HTTP boundary's 400.
   if(oldBoundary)throw Object.assign(Error('A UUID commit identity is required.'),{status:400,payload:{error:'A UUID commit identity is required.'}});
  }
  return http(path,options);
 };
 const timers={setTimeout(){return 1;},clearTimeout(){}};
 const engine=()=>createSyncEngine({store,request,timers});let client=engine();
 try{
  await seedSession(mf);await store.initialize();await client.sync({bind:true});
  await client.control('ensure');assert.match(sent.at(-1).id,/^control:\d{4}-.*Z:[a-f0-9-]{36}$/);assert.equal(sheet.writes,1);
  await client.control('pause');assert.equal(sheet.writes,2);
  await assert.rejects(client.control('pause'),error=>error.payload.notDispatched===true&&error.payload.rejection.requestHash.length===64);
  const rejected=sent.at(-1);assert.equal((await store.read()).controlFlights['qa-principal'],undefined);
  await assert.rejects(http('/api/sync',{method:'POST',body:JSON.stringify(rejected)}),error=>error.payload.code==='control_rejected'&&error.payload.rejection.id===rejected.id);
  await assert.rejects(http('/api/sync',{method:'POST',body:JSON.stringify({...rejected,action:'resume'})}),error=>error.payload.code==='control_rejected'&&!error.payload.rejection);
  assert.equal(sheet.writes,2);
  // Historical standalone UUID controls remain readable from local persistence.
  const legacy={protocol:syncProtocol,principal:'qa-principal',sheetId:'synthetic-sheet',action:'resume',id:crypto.randomUUID()};
  await store.commit({id:crypto.randomUUID(),kind:'control-begin',...inventoryContext(await store.read()),request:legacy});
  store=local();await store.initialize();client=engine();await client.sync();
  assert.deepEqual(sent.find(body=>body.id===legacy.id),legacy);assert.equal((await store.read()).controlFlights['qa-principal'],undefined);assert.equal(sheet.writes,3);
  oldBoundary=true;await assert.rejects(client.control('pause'),/UUID commit/);
  const saved=structuredClone((await store.read()).controlFlights['qa-principal'].request);assert.equal(sheet.writes,3);
  oldBoundary=false;store=local();await store.initialize();client=engine();await client.sync();
  assert.deepEqual(sent.findLast(body=>body.id),saved);assert.equal((await store.read()).controlFlights['qa-principal'],undefined);assert.equal(sheet.writes,4);
  sheet.mode='before';await assert.rejects(client.control('resume'),error=>error.payload.code==='uncertain'&&!error.payload.rejection);
  const uncertain=structuredClone((await store.read()).controlFlights['qa-principal'].request);assert.equal(sheet.writes,5);
  await mf.dispose();mf=runtime(mock,persist);await seedSession(mf);store=local();await store.initialize();client=engine();
  await client.sync();assert.deepEqual((await store.read()).controlFlights['qa-principal'].request,uncertain);assert.equal(sheet.writes,5);
  sheet.late();sheet.mode=null;await client.sync();
  assert.deepEqual(sent.findLast(body=>body.id),uncertain);assert.equal((await store.read()).controlFlights['qa-principal'],undefined);assert.equal(sheet.writes,5);
  await assert.rejects(http('/api/sync',{method:'POST',body:JSON.stringify(rejected)}),error=>error.payload.code==='control_rejected');
  const base=(await http('/api/sync',{method:'POST',body:JSON.stringify({protocol:syncProtocol,principal:'qa-principal',sheetId:'synthetic-sheet',action:'pull'})})).snapshot;
  const ordinary=commit(base,[]);const result=await http('/api/sync',{method:'POST',body:JSON.stringify({protocol:syncProtocol,principal:'qa-principal',sheetId:'synthetic-sheet',...ordinary})});
  assert.equal(result.receipt.id,ordinary.id);assert.equal(sheet.writes,6);
 }finally{await mf.dispose();await mock.close();await rm(persist,{recursive:true,force:true});}
});

test('Worker HTTP validates timestamped control identities by action, canonical UTC time and complete UUID; frontend setup uses the same identity',async()=>{
 const {mock,sheet}=googleFixture();sheet.exists=false;const mf=runtime(mock),store=openInventory({indexedDB:syntheticIndexedDB(),name:'http-setup',storage:{getItem:key=>key==='walmartGc.cards'?'[]':null}});
 const sent=[];
 const request=async(path,options={})=>{
  if(options.body)sent.push(JSON.parse(options.body));
  const response=await mf.dispatchFetch('https://wallet.example'+path,{...options,headers:{Origin:'https://wallet.example',Cookie:'walmart_gc_session=synthetic-session','Content-Type':'application/json'}});
  const result=await response.json();if(!response.ok)throw Object.assign(Error(result.error),{status:response.status,payload:result});return result;
 };
 const client=createSyncEngine({store,request,timers:{setTimeout(){return 1;},clearTimeout(){}}});
 try{
  await seedSession(mf,'');await store.initialize();await client.control('ensure');
  const generated=sent[0];assert.equal(sheet.creationId,generated.id);assert.equal(sheet.creates,1);assert.equal(sheet.writes,1);
  assert.equal((await store.read()).controlFlights['qa-principal'],undefined);
  const control={...generated,sheetId:'synthetic-sheet',action:'pause'};
  for(const id of [generated.id+'suffix',generated.id+'\n',generated.id.replace(/:[^:]+$/,':not-a-uuid'),generated.id.replace(/-4([0-9a-f]{3}-)/,'-5$1'),generated.id.replace(/control:.*Z:/,'control:2026-02-30T00:00:00.000Z:'),generated.id.replace(/\.\d{3}Z:/, 'Z:'),crypto.randomUUID()+'\n']){
   await assert.rejects(request('/api/sync',{method:'POST',body:JSON.stringify({...control,id})}),error=>error.status===400);
  }
  for(const action of ['commit','create','unknown']){
   await assert.rejects(request('/api/sync',{method:'POST',body:JSON.stringify({...control,action})}),error=>error.status===400);
  }
  const future={...control,id:'control:'+new Date(Date.now()+120000).toISOString()+':'+crypto.randomUUID()};
  await assert.rejects(request('/api/sync',{method:'POST',body:JSON.stringify(future)}),error=>error.status===409&&error.payload.code==='control_rejected'&&!error.payload.rejection);
  assert.equal(sheet.writes,1);assert.equal(sheet.creates,1);
  // A targetless saved setup cannot be safely redirected using a later status.
  await store.commit({id:crypto.randomUUID(),kind:'control-begin',...inventoryContext(await store.read()),request:generated});
  const before=sent.length;await client.sync();
  assert.equal(sent.length,before);assert.deepEqual((await store.read()).controlFlights['qa-principal'].request,generated);
 }finally{await mf.dispose();await mock.close();}
});
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

test('SQLite maintenance recovery survives restart and restores a removed genuine timestamp',async()=>{
 const persist=await mkdtemp(join(tmpdir(),'gc-wallet-proof-')),{mock,sheet}=googleFixture();
 const precise={...cardA,lastBalanceChecked:'2026-11-25',lastBalanceCheckedAt:'2026-11-25T10:00:00.000Z'};
 for(let index=0;index<621;index++)sheet.cards.push(csvHeaders.map(h=>h==='cardNumber'?'63'+String(100000+index).padStart(14,'0'):precise[h]??''));
 let mf=runtime(mock,persist);
 try{
  let object=await stub(mf);assert.equal((await send(object,{action:'pause',id:crypto.randomUUID()})).status,200);
  await mf.dispose();mf=runtime(mock,persist);object=await stub(mf);
  sheet.cards[1][csvHeaders.indexOf('lastBalanceCheckedAt')]='';
  const result=await send(object,{action:'resume',id:crypto.randomUUID(),deletedIds:[]});
  assert.equal(result.status,200);assert.equal(result.snapshot.cards[0].lastBalanceCheckedAt,precise.lastBalanceCheckedAt);
  assert.equal(result.snapshot.cards[0].pendingReconciliation,true);
  assert.equal(result.snapshot.cards.length,621);assert.equal(result.snapshot.cards.filter(c=>c.pendingReconciliation).length,1);
 }finally{await mf.dispose();await mock.close();await rm(persist,{recursive:true,force:true});}
});

test('SQLite control rejection proof and duplicate maintenance survive HTTP boundaries and restart',async()=>{
 const {mock,sheet}=googleFixture(),persist=await mkdtemp(join(tmpdir(),'gc-p0-'));let mf=runtime(mock,persist);
 const row=csvHeaders.map(key=>key==='used'?'FALSE':cardA[key]??'');sheet.cards.push(row,[...row]);
 const headers=sheet.cards[0];sheet.cards[0]=[...headers,'pin'];
 try{
  await seedSession(mf);
  const request={protocol:syncProtocol,principal:'qa-principal',sheetId:'synthetic-sheet',action:'ensure',id:crypto.randomUUID()};
  const http=body=>mf.dispatchFetch('https://wallet.example/api/sheet/ensure',{method:'POST',headers:{Cookie:'walmart_gc_session=synthetic-session','Content-Type':'application/json'},body:JSON.stringify(body)});
  let response=await http(request),result=await response.json();assert.equal(response.status,409);assert.equal(result.notDispatched,true);assert.equal(result.rejection.id,request.id);assert.equal(result.rejection.requestHash,await fingerprint(request));assert.ok(!JSON.stringify(result).includes(cardA.cardNumber));
  await mf.dispose();mf=runtime(mock,persist);await seedSession(mf);response=await http(request);result=await response.json();assert.equal(result.code,'control_rejected');assert.equal(result.notDispatched,true);
  sheet.cards[0]=headers;
  const object=await stub(mf),paused=await send(object,{action:'pause',id:crypto.randomUUID()});
  assert.equal(paused.status,200);assert.equal(paused.snapshot.maintenance,true);assert.equal(paused.snapshot.cards.length,1);assert.equal(sheet.cards.length,2);assert.equal(sheet.writes,1);
 }finally{await mf.dispose();mock.close();await rm(persist,{recursive:true,force:true});}
});
