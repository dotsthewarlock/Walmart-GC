import {test} from 'node:test';
import assert from 'node:assert/strict';
import {coordinate,SerialCoordinator} from './src/syncCoordinator.js';
import {syncProtocol} from '../src/lib/syncProtocol.js';
import {cardA as a,cardB as b,operation,memoryStorage,syntheticRemote,commitRequest} from '../tests/syncFixtures.mjs';
test('simultaneous writers serialize read/reconcile/write across external awaits, preserving independent additions',async()=>{
 const remote=await syntheticRemote([]),base=await remote.read();
 let release;remote.delay=new Promise(resolve=>{release=resolve;});
 const one=remote.coordinator.run(await commitRequest(remote,[a],[operation('add-a',null,a,'csv-recovery')],undefined,base));
 const two=remote.coordinator.run(await commitRequest(remote,[b],[operation('add-b',null,b,'csv-recovery')],undefined,base));
 await new Promise(resolve=>setTimeout(resolve,10));assert.equal(remote.writes,1);release();await Promise.all([one,two]);assert.equal((await remote.read()).cards.length,2);
});
test('successful write with lost response confirms marker and content on same-ID retry without redispatch',async()=>{
 const remote=await syntheticRemote([a]),storage=memoryStorage();remote.fail='after';
 const request=await commitRequest(remote,[{...a,notes:'saved'}],[operation('note',a,{...a,notes:'saved'})]);
 await assert.rejects(coordinate(storage,remote.adapter,request),/uncertain/);assert.ok((await storage.get('coordination')).flight);
 const recovered=await coordinate(storage,remote.adapter,request);assert.equal(remote.writes,1);assert.deepEqual(recovered.acknowledged,['note']);
 assert.doesNotMatch(JSON.stringify([...storage.data.values()]),new RegExp(a.pin));
});
test('missing marker after possible dispatch suspends all writes across coordinator restart, even other clients',async()=>{
 const remote=await syntheticRemote([a]),storage=memoryStorage();remote.fail='before';
 const request=await commitRequest(remote,[{...a,notes:'uncertain'}],[operation('uncertain',a,{...a,notes:'uncertain'})]);
 await assert.rejects(coordinate(storage,remote.adapter,request),/uncertain/);
 const restarted=new SerialCoordinator(storage,remote.adapter);
 await assert.rejects(restarted.run({...request,id:'other-client'}),/uncertain/);assert.equal(remote.writes,1);
});
test('reused IDs reject changed content; older confirmed retries cannot duplicate monetary actions',async()=>{
 const remote=await syntheticRemote([a]);const req=await commitRequest(remote,[{...a,currentBalance:80}],[operation('spend',a,{...a,currentBalance:80},'set-balance')]);
 await remote.coordinator.run(req);await assert.rejects(remote.coordinator.run({...req,cards:[a]}),/reused/);
 const next=await commitRequest(remote,[{...(await remote.read()).cards[0],notes:'next'}],[operation('next',(await remote.read()).cards[0],{...(await remote.read()).cards[0],notes:'next'})]);await remote.coordinator.run(next);
 assert.deepEqual((await remote.coordinator.run(req)).acknowledged,['spend']);assert.equal(remote.writes,2);
});
test('direct Sheet edits without sheetVersion change are detected; maintenance is shared and explicit deletions tombstoned',async()=>{
 const remote=await syntheticRemote([a,b]);remote.directEdit(s=>{s.cards[0].notes='direct';});
 await assert.rejects(remote.coordinator.run({protocol:syncProtocol,action:'pull'}),/without a retained baseline/);
 await remote.coordinator.run({protocol:syncProtocol,action:'pause',id:'pause'});
 await assert.rejects(remote.coordinator.run(await commitRequest(remote,[a,b],[])),/maintenance/);
 remote.directEdit(s=>{s.cards=s.cards.filter(c=>c.cardNumber!==a.cardNumber);});
 await remote.coordinator.run({protocol:syncProtocol,action:'resume',id:'resume',deletedIds:[a.cardNumber]});
 assert.ok((await remote.read()).evidence.tombstones[a.cardNumber]);
});
test('incompatible protocols and unknown old baselines reject before external writes',async()=>{
 const remote=await syntheticRemote([a]);await assert.rejects(remote.coordinator.run({protocol:'old',action:'pull'}),/updated/);
 const req=await commitRequest(remote,[a],[]);req.base.version='unknown';await assert.rejects(remote.coordinator.run(req),/old or unknown/);assert.equal(remote.writes,0);
});

test('same semantic operation with a new commit identity is a true replay; changed reuse rejects',async()=>{
 const remote=await syntheticRemote([a]),base=await remote.read();const after={...a,currentBalance:80},op=operation('one-spend',a,after,'set-balance');
 const first=await commitRequest(remote,[after],[op],undefined,base);await remote.coordinator.run(first);
 const money=(await remote.read()).evidence.cards[a.cardNumber].money;
 await remote.coordinator.run({...first,id:crypto.randomUUID()});assert.equal((await remote.read()).evidence.cards[a.cardNumber].money,money);assert.equal((await remote.read()).cards[0].pendingReconciliation,undefined);
 await assert.rejects(remote.coordinator.run({...first,id:crypto.randomUUID(),operations:[{...op,after:{...after,currentBalance:70}}]}),/reused/);
});
test('late external completion remains fenced until positive marker and independent content proof',async()=>{
 const remote=await syntheticRemote([a]),storage=memoryStorage();let finish,writes=0;
 const adapter={read:remote.read,async write(next,id,hash){writes++;finish=()=>remote.directEdit(s=>Object.assign(s,{...next,commitId:id,fingerprint:hash,protocol:syncProtocol,version:'late-version'}));throw Error('Request timed out while external write continues');}};
 const req=await commitRequest(remote,[{...a,notes:'late'}],[operation('late-op',a,{...a,notes:'late'})]);
 await assert.rejects(coordinate(storage,adapter,req),/uncertain/);await assert.rejects(coordinate(storage,adapter,req),/uncertain/);assert.equal(writes,1);
 finish();assert.deepEqual((await coordinate(storage,adapter,req)).acknowledged,['late-op']);assert.equal(writes,1);
});
test('a copied commit marker with mismatched content never creates a receipt or acknowledgment',async()=>{
 const remote=await syntheticRemote([a]),storage=memoryStorage();remote.fail='after';
 const req=await commitRequest(remote,[{...a,notes:'intended'}],[operation('marker-op',a,{...a,notes:'intended'})]);await assert.rejects(coordinate(storage,remote.adapter,req),/uncertain/);
 remote.directEdit(s=>{s.cards[0].notes='changed after dispatch';});await assert.rejects(coordinate(storage,remote.adapter,req),/uncertain/);
 assert.equal((await storage.get('coordination')).receipts.length,0);assert.ok((await storage.get('coordination')).flight);
});
test('compact receipt groups stay bounded and older retries cannot resurrect unretained operations',async()=>{
 const remote=await syntheticRemote([a]),storage=memoryStorage();let original;
 for(let i=0;i<68;i++){
  const before=(await remote.read()).cards[0],after={...before,notes:'note '+i},req=await commitRequest(remote,[after],[operation('bounded-'+i,before,after)]);
  original??=req;await coordinate(storage,remote.adapter,req);
 }
 assert.equal((await storage.get('coordination')).receipts.length,64);assert.equal([...storage.data.keys()].filter(k=>k.startsWith('operations:')).length,64);
 for(const value of storage.data.values())assert.ok(new TextEncoder().encode(JSON.stringify(value)).length<128*1024);
 await assert.rejects(coordinate(storage,remote.adapter,original),/old or unknown/);assert.equal(remote.writes,68);
});
test('validation and layout changes before dispatch cannot create an uncertain flight',async()=>{
 const remote=await syntheticRemote([a]),storage=memoryStorage();remote.adapter.prepare=async()=>{throw Error('Occupied append cells');};
 const req=await commitRequest(remote,[{...a,notes:'valid local'}],[operation('prepare',a,{...a,notes:'valid local'})]);
 await assert.rejects(coordinate(storage,remote.adapter,req),/Occupied/);assert.equal(await storage.get('coordination'),undefined);assert.equal(remote.writes,0);
});
test('shared maintenance cannot erase managed tombstones or recovery evidence',async()=>{
 const remote=await syntheticRemote([a]);await remote.coordinator.run({protocol:syncProtocol,action:'pause',id:'pause-evidence'});
 remote.directEdit(s=>{s.evidence.tombstones[b.cardNumber]={id:'external-injection'};});
 await assert.rejects(remote.coordinator.run({protocol:syncProtocol,action:'resume',id:'resume-evidence'}),/recovery evidence changed|Managed recovery evidence changed/);
});
test('maintenance restores genuine precise verification and localizes uncertainty when it was edited',async()=>{
 const precise={...a,lastBalanceChecked:'2026-11-25',lastBalanceCheckedAt:'2026-11-25T10:00:00.000Z'};
 const remote=await syntheticRemote([precise]);await remote.coordinator.run({protocol:syncProtocol,action:'pause',id:'pause-precise'});
 remote.directEdit(s=>{delete s.cards[0].lastBalanceCheckedAt;});
 await assert.rejects(remote.coordinator.run({protocol:syncProtocol,action:'pause',id:'pause-again'}),/already paused/i);
 await remote.coordinator.run({protocol:syncProtocol,action:'resume',id:'resume-precise'});
 assert.equal((await remote.read()).cards[0].lastBalanceCheckedAt,precise.lastBalanceCheckedAt);
 assert.equal((await remote.read()).cards[0].pendingReconciliation,true);
});

test('control validation rejection is durably fenced by exact identity across restart',async()=>{
 const remote=await syntheticRemote([a]),storage=memoryStorage();let invalid=true;
 remote.adapter.prepare=async()=>{if(invalid)throw Error('Synthetic invalid layout');};
 const request={protocol:syncProtocol,action:'pause',id:crypto.randomUUID(),principal:'synthetic-principal',sheetId:'synthetic-sheet'};
 let proof;await assert.rejects(coordinate(storage,remote.adapter,request),error=>{assert.equal(error.notDispatched,true);proof=error.rejection;return true;});
 assert.equal(remote.writes,0);assert.ok(proof.requestHash);invalid=false;
 await assert.rejects(new SerialCoordinator(storage,remote.adapter).run(request),error=>{assert.equal(error.code,'control_rejected');assert.deepEqual(error.rejection,proof);return true;});
 await assert.rejects(coordinate(storage,remote.adapter,{...request,action:'resume'}),error=>{assert.notEqual(error.notDispatched,true);return true;});
 await coordinate(storage,remote.adapter,{...request,id:crypto.randomUUID()});assert.equal(remote.writes,1);
});

test('an uncertain control cannot gain non-dispatch proof even when later validation fails',async()=>{
 const remote=await syntheticRemote([a]),storage=memoryStorage();remote.fail='before';
 const request={protocol:syncProtocol,action:'pause',id:crypto.randomUUID()};
 await assert.rejects(coordinate(storage,remote.adapter,request),error=>{assert.equal(error.code,'uncertain');assert.notEqual(error.notDispatched,true);return true;});
 const saved=await storage.get('coordination');
 remote.adapter.read=async()=>{throw Error('Synthetic malformed rows');};
 await assert.rejects(coordinate(storage,remote.adapter,request),error=>{assert.notEqual(error.notDispatched,true);return true;});
 assert.deepEqual(await storage.get('coordination'),saved);assert.equal(remote.writes,1);
});
