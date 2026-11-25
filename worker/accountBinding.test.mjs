import {test} from 'node:test';
import assert from 'node:assert/strict';
import worker,{ownedByPrincipal} from './src/index.js';
const scope='https://www.googleapis.com/auth/drive.file';
function environment(old){const writes=[];return {writes,env:{GOOGLE_CLIENT_ID:'synthetic-client',GOOGLE_CLIENT_SECRET:'synthetic-only',SESSION_SECRET:'synthetic-session-only',OAUTH_STATE:{get:async()=>({verifier:'synthetic-verifier',existingSessionKey:'session:old'}),delete:async()=>{}},SESSIONS:{get:async()=>old,put:async(k,v)=>writes.push(JSON.parse(v)),delete:async()=>{}}}};}
test('ownership requires the exact verified principal, ownedByMe, correct MIME and a nontrashed file',()=>{
 const file={mimeType:'application/vnd.google-apps.spreadsheet',ownedByMe:true,owners:[{permissionId:'principal-A'}]};
 assert.equal(ownedByPrincipal(file,'principal-A'),true);assert.equal(ownedByPrincipal(file,'principal-B'),false);
 for(const altered of [{...file,ownedByMe:false},{...file,trashed:true},{...file,owners:[]},{...file,mimeType:'text/plain'}])assert.equal(ownedByPrincipal(altered,'principal-A'),false);
});
test('OAuth callback cannot inherit refresh token or Sheet from a different or unknown account',async(t)=>{
 for(const principal of ['principal-A',undefined])await t.test(String(principal),async(sub)=>{
  const {env,writes}=environment({principal,refreshToken:'old-synthetic-token',sheetId:'old-sheet'});
  sub.mock.method(globalThis,'fetch',async(url)=>String(url).includes('/token')?Response.json({access_token:'new-synthetic-access',scope}):Response.json({user:{permissionId:'principal-B'}}));
  const response=await worker.fetch(new Request('https://synthetic/auth/callback?code=fixture&state=fixture'),env);
  assert.equal(response.status,400);assert.equal(writes.length,0);
 });
});
test('a fresh grant binds the new stable principal and clears old Sheet context',async(t)=>{
 const {env,writes}=environment({principal:'principal-A',refreshToken:'old-synthetic-token',sheetId:'old-sheet'});
 t.mock.method(globalThis,'fetch',async(url)=>String(url).includes('/token')?Response.json({access_token:'new-synthetic-access',refresh_token:'new-synthetic-refresh',scope}):Response.json({user:{permissionId:'principal-B',emailAddress:'b@example.invalid'}}));
 const response=await worker.fetch(new Request('https://synthetic/auth/callback?code=fixture&state=fixture'),env);
 assert.equal(response.status,302);assert.equal(writes[0].principal,'principal-B');assert.equal(writes[0].sheetId,'');assert.equal(writes[0].refreshToken,'new-synthetic-refresh');
});
test('same verified account may reuse its own refresh grant; missing stable principal fails closed',async(t)=>{
 const {env,writes}=environment({principal:'principal-A',refreshToken:'own-synthetic-refresh',sheetId:'own-sheet'});
 t.mock.method(globalThis,'fetch',async(url)=>String(url).includes('/token')?Response.json({access_token:'new-synthetic-access',scope}):Response.json({user:{permissionId:'principal-A'}}));
 assert.equal((await worker.fetch(new Request('https://synthetic/auth/callback?code=fixture&state=fixture'),env)).status,302);assert.equal(writes[0].sheetId,'own-sheet');
});
test('missing coordinator binding rejects protected requests before OAuth/Sheets calls',async(t)=>{
 const fetch=t.mock.method(globalThis,'fetch',async()=>assert.fail('No live request permitted'));
 const response=await worker.fetch(new Request('https://synthetic/api/sync',{method:'POST',body:JSON.stringify({protocol:'gc-wallet-sync-v1',action:'pull'})}),{});
 assert.equal(response.status,503);assert.equal(fetch.mock.callCount(),0);
});
test('missing Drive permissionId prevents session creation even with a fresh refresh grant',async(t)=>{
 const {env,writes}=environment(null);
 t.mock.method(globalThis,'fetch',async(url)=>String(url).includes('/token')?Response.json({access_token:'synthetic-access',refresh_token:'synthetic-refresh',scope}):Response.json({user:{emailAddress:'unverified@example.invalid'}}));
 const response=await worker.fetch(new Request('https://synthetic/auth/callback?code=fixture&state=fixture'),env);assert.equal(response.status,401);assert.equal(writes.length,0);
});
test('cross-origin protected POST is rejected before account or Sheet requests',async(t)=>{
 const fetch=t.mock.method(globalThis,'fetch',async()=>assert.fail('No external request'));
 const response=await worker.fetch(new Request('https://synthetic/api/sync',{method:'POST',headers:{Origin:'https://untrusted.invalid'},body:'{}'}),{});
 assert.equal(response.status,403);assert.equal(fetch.mock.callCount(),0);
});
test('uncertain Sheet creation uses tagged positive discovery, never another creation dispatch',async(t)=>{
 const {SheetCoordinator}=await import('./src/index.js');const {memoryStorage}=await import('../tests/syncFixtures.mjs');
 const storage=memoryStorage(),coordinator=new SheetCoordinator({storage},{}),id=crypto.randomUUID();let creates=0;
 t.mock.method(globalThis,'fetch',async(url,options)=>{
  if(options.method==='POST'){creates++;throw Error('Synthetic response lost after creation');}
  assert.match(String(url),/appProperties/);
  return Response.json({files:[{id:'created-sheet',mimeType:'application/vnd.google-apps.spreadsheet',ownedByMe:true,owners:[{permissionId:'principal-A'}],appProperties:{gcWalletCreationId:id}}]});
 });
 const call=action=>coordinator.fetch(new Request('https://coordinator/setup',{method:'POST',headers:{Authorization:'Bearer synthetic-only'},body:JSON.stringify({id,protocol:'gc-wallet-sync-v1',principal:'principal-A',action})}));
 assert.equal((await call('create')).status,409);assert.equal((await storage.get('setup')).phase,'possible-dispatch');
 const result=await call('inspect-setup');assert.equal(result.status,200);assert.equal((await result.json()).sheetId,'created-sheet');assert.equal(creates,1);
 assert.doesNotMatch(JSON.stringify([...storage.data.values()]),/synthetic-only/);
});


test('steady-state status and protected pull do not rewrite unchanged KV sessions',async(t)=>{
 const session={principal:'principal-A',email:'',name:'',sheetId:'own-sheet',sheetName:'Walmart-GC Data',accessToken:'synthetic-access',refreshToken:'synthetic-refresh',expiresAt:new Date(Date.now()+3600000).toISOString(),updatedAt:new Date().toISOString()};
 const {env,writes}=environment(session);
 env.SHEET_COORDINATOR={idFromName:name=>name,get:()=>({fetch:async()=>Response.json({ok:true})})};
 t.mock.method(globalThis,'fetch',async(url)=>{
  if(String(url).includes('/about?'))return Response.json({user:{permissionId:'principal-A'}});
  assert.match(String(url),/\/files\/own-sheet/);
  return Response.json({id:'own-sheet',name:'Walmart-GC Data',mimeType:'application/vnd.google-apps.spreadsheet',ownedByMe:true,owners:[{permissionId:'principal-A'}]});
 });
 const headers={Cookie:'walmart_gc_session=synthetic-session'};
 for(let i=0;i<10;i++){
  assert.equal((await worker.fetch(new Request('https://synthetic/api/status',{headers}),env)).status,200);
  assert.equal((await worker.fetch(new Request('https://synthetic/api/sync',{method:'POST',headers,body:JSON.stringify({protocol:'gc-wallet-sync-v1',action:'pull',principal:'principal-A',sheetId:'own-sheet'})}),env)).status,200);
 }
 assert.equal(writes.length,0);
});
test('unchanged session renews once when aged and actual metadata changes persist',async(t)=>{
 let session={principal:'principal-A',email:'',name:'',sheetId:'own-sheet',sheetName:'Walmart-GC Data',accessToken:'synthetic-access',refreshToken:'synthetic-refresh',expiresAt:new Date(Date.now()+3600000).toISOString(),updatedAt:new Date(Date.now()-90000000).toISOString()};
 const {env,writes}=environment(session);
 env.SESSIONS.get=async()=>structuredClone(session);
 env.SESSIONS.put=async(k,v,options)=>{session=JSON.parse(v);writes.push(session);assert.equal(options.expirationTtl,2592000);};
 let email='';
 t.mock.method(globalThis,'fetch',async(url)=>String(url).includes('/about?')?Response.json({user:{permissionId:'principal-A',emailAddress:email}}):Response.json({id:'own-sheet',name:'Walmart-GC Data',mimeType:'application/vnd.google-apps.spreadsheet',ownedByMe:true,owners:[{permissionId:'principal-A'}]}));
 const status=()=>worker.fetch(new Request('https://synthetic/api/status',{headers:{Cookie:'walmart_gc_session=synthetic-session'}}),env);
 assert.equal((await status()).status,200);assert.equal(writes.length,1);
 assert.equal((await status()).status,200);assert.equal(writes.length,1);
 email='changed@example.invalid';
 assert.equal((await status()).status,200);assert.equal(writes.length,2);assert.equal(session.email,email);
 assert.equal((await status()).status,200);assert.equal(writes.length,2);
});
