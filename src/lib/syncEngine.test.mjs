import {test} from 'node:test';
import assert from 'node:assert/strict';
import {openInventory,inventoryContext,profileOf,inventoryBytes} from './inventory.js';
import {createSyncEngine} from './syncEngine.js';
import {createTransferLedger} from './balanceTransferLedger.js';
import {selectTransferCards} from './balanceTransfer.js';
import {syncProtocol} from './syncProtocol.js';
import {syntheticIndexedDB} from '../../tests/syntheticIndexedDB.mjs';
import {cardA as a,cardB as b,syntheticRemote} from '../../tests/syncFixtures.mjs';
const timers={setTimeout(){return 1;},clearTimeout(){},setInterval(){return 1;},clearInterval(){}};
test('remote same-day unchanged verification invalidates an outstanding request',async()=>{
 const f=await fixture();let state=await f.store.read(),p=profileOf(state);
 const checkedAt=new Date().toISOString(),verified={...p.cards[0],lastBalanceChecked:checkedAt.slice(0,10)};
 const {commitRequest,operation}=await import('../../tests/syncFixtures.mjs');
 await f.remote.coordinator.run(await commitRequest(f.remote,[verified],[operation('initial-check',p.cards[0],verified,'manual-verification',{checkedAt,observedBalance:verified.currentBalance})]));
 await f.engine.sync();state=await f.store.read();p=profileOf(state);
 const ledger=await createTransferLedger({sheetId:'synthetic-sheet',sheetVersion:p.sync.lastKnownSheetVersion},selectTransferCards(p.cards,{version:2,quantity:'all',status:'all',balance:'all',checked:'any',days:30,sort:'checked-oldest'}).selected,inventoryBytes(state));
 await f.store.commit({id:crypto.randomUUID(),kind:'set-batch',...inventoryContext(state),revision:p.revision,ledger});
 const same=profileOf(await f.store.read()).cards[0],anotherTime=new Date().toISOString();
 await f.remote.coordinator.run(await commitRequest(f.remote,[same],[operation('remote-check',same,same,'manual-verification',{checkedAt:anotherTime,observedBalance:same.currentBalance})]));
 await f.engine.sync();assert.equal(profileOf(await f.store.read()).ledger.requests[0].state,'invalidated');
});
test('acknowledging a prior local verification preserves a later Batch request',async()=>{
 const f=await fixture();let state=await f.store.read(),p=profileOf(state),card=p.cards[0];
 state=await f.store.commit({id:crypto.randomUUID(),kind:'manual-verification',...inventoryContext(state),cardNumber:card.cardNumber,version:p.versions[card.cardNumber],observation:{checkedAt:new Date().toISOString(),observedBalance:card.currentBalance}});p=profileOf(state);
 const ledger=await createTransferLedger({sheetId:'synthetic-sheet',sheetVersion:p.sync.lastKnownSheetVersion},selectTransferCards(p.cards,{version:2,quantity:'all',status:'all',balance:'all',checked:'any',days:30,sort:'checked-oldest'}).selected,inventoryBytes(state));
 await f.store.commit({id:crypto.randomUUID(),kind:'set-batch',...inventoryContext(state),revision:p.revision,ledger});
 await f.engine.sync();assert.equal(profileOf(await f.store.read()).ledger.requests[0].state,'pending');
});
async function fixture(){
 const indexedDB=syntheticIndexedDB(),store=openInventory({indexedDB,name:'sync-engine',storage:{getItem:key=>key==='walmartGc.cards'?JSON.stringify([b]):null}});await store.initialize();
 const remote=await syntheticRemote([a]);let posts=0,status={authenticated:true,principal:'synthetic-principal',ownershipVerified:true,sheetId:'synthetic-sheet',syncProtocol,coordinationAvailable:true};
 const request=async(path,options)=>{
  if(path==='/api/status')return {...status};posts++;const result=await remote.coordinator.run(JSON.parse(options.body));return {...result,principal:status.principal,sheetId:status.sheetId};
 };
 const engine=createSyncEngine({store,request,timers});await engine.sync({bind:true});
 return {store,indexedDB,remote,engine,request,status,posts:()=>posts};
}
async function edit(store,notes){const state=await store.read();return store.commit({id:crypto.randomUUID(),kind:'patch',...inventoryContext(state),cardNumber:a.cardNumber,version:profileOf(state).versions[a.cardNumber],patch:{notes}});}
test('verified binding preserves unbound inventory/outbox and never infers ownership from cached Sheet context',async()=>{
 const f=await fixture(),state=await f.store.read();assert.equal(state.profiles.unbound.cards[0].pin,b.pin);assert.equal(state.profiles.unbound.pending.length,1);
 assert.equal(profileOf(state).context.principal,'synthetic-principal');assert.equal(profileOf(state).context.ownershipVerified,true);assert.equal(profileOf(state).remoteBase.cards[0].cardNumber,a.cardNumber);
});
test('acknowledgment removes only submitted operations and preserves edits made during external await',async()=>{
 const f=await fixture();await edit(f.store,'first');let release;f.remote.delay=new Promise(resolve=>{release=resolve;});
 const syncing=f.engine.sync();while(!(await f.store.read()).profiles[(await f.store.read()).active].inFlight)await new Promise(resolve=>setTimeout(resolve,1));
 await edit(f.store,'later edit');release();await syncing;
 let state=await f.store.read();assert.equal(profileOf(state).cards[0].notes,'later edit');assert.equal(profileOf(state).pending.length,1);assert.equal(profileOf(state).inFlight,null);
 await f.engine.sync();state=await f.store.read();assert.equal(profileOf(state).pending.length,0);assert.equal((await f.remote.read()).cards[0].notes,'later edit');
});
test('failed local flight persistence prevents dispatch; a successful retry confirms and drains outbox',async()=>{
 const f=await fixture();await edit(f.store,'saved locally');f.indexedDB.failNextWrite=true;const before=f.posts();await f.engine.sync();assert.equal(f.posts(),before);assert.equal(profileOf(await f.store.read()).pending.length,1);
 await f.engine.sync();assert.equal(profileOf(await f.store.read()).pending.length,0);
});
test('lost remote response and application restart reuse the exact durable request identity',async()=>{
 const f=await fixture();await edit(f.store,'lost response');let lost=true;
 const request=async(...args)=>{const result=await f.request(...args);if(args[0]==='/api/sync'&&lost){lost=false;throw new TypeError('Synthetic response lost');}return result;};
 const engine=createSyncEngine({store:f.store,request,timers});await engine.sync();const flight=profileOf(await f.store.read()).inFlight;assert.ok(flight);
 const restarted=createSyncEngine({store:f.store,request,timers});await restarted.sync();assert.equal(profileOf(await f.store.read()).inFlight,null);assert.equal(f.remote.writes,1);
});
test('tampered content or wrong account response cannot acknowledge durable pending work',async()=>{
 const f=await fixture();await edit(f.store,'protected');
 const engine=createSyncEngine({store:f.store,timers,request:async(...args)=>{const result=await f.request(...args);if(args[0]==='/api/sync')result.snapshot.cards[0].pin='9999';return result;}});
 await engine.sync();assert.equal(profileOf(await f.store.read()).pending.length,1);assert.ok(profileOf(await f.store.read()).inFlight);
 const count=f.posts();f.status.principal='other-account';await f.engine.sync();assert.equal(f.posts(),count);assert.equal(profileOf(await f.store.read()).context.principal,'synthetic-principal');
});
test('switching away and back while a commit is pending rejects obsolete acknowledgments and retains its durable identity',async()=>{
 const f=await fixture();await edit(f.store,'context-bound');let release;f.remote.delay=new Promise(resolve=>{release=resolve;});const syncing=f.engine.sync();
 let state;while(!(state=await f.store.read()).profiles[state.active].inFlight)await new Promise(resolve=>setTimeout(resolve,1));
 const active=state.active,commitId=profileOf(state).inFlight.request.id;
 state=await f.store.commit({id:crypto.randomUUID(),kind:'select-compartment',...inventoryContext(state),target:'unbound'});
 await f.store.commit({id:crypto.randomUUID(),kind:'select-compartment',...inventoryContext(state),target:active});release();await syncing;
 assert.equal(profileOf(await f.store.read()).inFlight.request.id,commitId);assert.equal(profileOf(await f.store.read()).pending.length,1);
 await f.engine.sync();assert.equal(profileOf(await f.store.read()).pending.length,0);assert.equal(f.remote.writes,1);
});
test('obsolete pulls cannot regress an inventory or baseline after a compatible local acknowledgment',async()=>{
 const f=await fixture();const before=await f.store.read(),old=profileOf(before).remoteBase;
 await edit(f.store,'newer confirmed note');await f.engine.sync();const current=await f.store.read();
 await assert.rejects(f.store.commit({id:crypto.randomUUID(),kind:'sync-pull',...inventoryContext(before),revision:profileOf(before).revision,snapshot:old}),/changed/);
 assert.deepEqual(await f.store.read(),current);
});
test('expired recovery is explicit, archives intent and cannot silently replay an unknown financial action',async()=>{
 const f=await fixture();await edit(f.store,'old intent');let block=true;
 const request=async(...args)=>{if(args[0]==='/api/sync'&&JSON.parse(args[1].body).action==='commit'&&block){block=false;throw Object.assign(Error('Expired baseline'),{payload:{code:'baseline_expired',notDispatched:true}});}return f.request(...args);};
 const engine=createSyncEngine({store:f.store,request,timers});await engine.sync();assert.equal(profileOf(await f.store.read()).syncBlocked,'baseline_expired');
 await engine.recoverExpired();let state=await f.store.read();assert.equal(profileOf(state).inFlight,null);assert.equal(profileOf(state).pending[0].kind,'unbound-recovery');assert.equal(state.quarantine.at(-1).kind,'expired-sync-recovery');
 await engine.sync();state=await f.store.read();assert.equal(profileOf(state).pending.length,0);
 assert.ok(profileOf(state).recoveryEvidence.cards[a.cardNumber].conflicts.some(c=>!c.resolution));
 const normal=await fixture();await assert.rejects(normal.engine.recoverExpired(),/cannot be bypassed/);
});
test('an independent monetary change observed during acknowledgment cannot be hidden by rebasing a later local spend',async()=>{
 const f=await fixture();const original=profileOf(await f.store.read()).cards[0];await edit(f.store,'in-flight note');let release,held=true;
 const barrier=new Promise(resolve=>{release=resolve;});
 const engine=createSyncEngine({store:f.store,timers,request:async(...args)=>{if(args[0]==='/api/sync'&&JSON.parse(args[1].body).action==='commit'&&held){held=false;await barrier;}return f.request(...args);}});
 const syncing=engine.sync();let state;while(!(state=await f.store.read()).profiles[state.active].inFlight)await new Promise(resolve=>setTimeout(resolve,1));
 await f.store.commit({id:crypto.randomUUID(),kind:'patch',action:'set-balance',...inventoryContext(state),cardNumber:a.cardNumber,version:profileOf(state).versions[a.cardNumber],patch:{currentBalance:90}});
 const {commitRequest,operation}=await import('../../tests/syncFixtures.mjs');
 await f.remote.coordinator.run(await commitRequest(f.remote,[{...original,currentBalance:80}],[operation('independent-spend',original,{...original,currentBalance:80},'set-balance')]));
 release();await syncing;state=await f.store.read();assert.equal(profileOf(state).pending[0].requiresReconciliation,true);assert.equal(profileOf(state).cards[0].pendingReconciliation,true);
 await engine.sync();assert.equal((await f.remote.read()).cards[0].currentBalance,80);assert.equal((await f.remote.read()).cards[0].pendingReconciliation,true);
 assert.ok((await f.remote.read()).evidence.cards[a.cardNumber].conflicts.some(c=>c.local===90));
});
test('ACK rebasing retains competing later notes durably and the next commit cannot overwrite their remote alternative',async()=>{
 const f=await fixture(),original=profileOf(await f.store.read()).cards[0];await edit(f.store,'submitted note');let release;
 const barrier=new Promise(resolve=>{release=resolve;});let held=true;
 const engine=createSyncEngine({store:f.store,timers,request:async(...args)=>{if(args[0]==='/api/sync'&&JSON.parse(args[1].body).action==='commit'&&held){held=false;await barrier;}return f.request(...args);}});
 const syncing=engine.sync();let state;while(!(state=await f.store.read()).profiles[state.active].inFlight)await new Promise(resolve=>setTimeout(resolve,1));
 await edit(f.store,'later competing note');const {commitRequest,operation}=await import('../../tests/syncFixtures.mjs');
 await f.remote.coordinator.run(await commitRequest(f.remote,[{...original,notes:'other device'}],[operation('other-note',original,{...original,notes:'other device'})]));
 release();await syncing;state=await f.store.read();assert.equal(profileOf(state).cards[0].notes,'other device');assert.equal(profileOf(state).pending.length,1);
 assert.ok(profileOf(state).recoveryEvidence.cards[a.cardNumber].conflicts.some(c=>c.local==='later competing note'));
 const restarted=createSyncEngine({store:f.store,timers,request:f.request});await restarted.sync();const remote=await f.remote.read();
 assert.equal(remote.cards[0].notes,'other device');assert.ok(remote.evidence.cards[a.cardNumber].conflicts.some(c=>c.local==='later competing note'&&c.remote==='other device'&&c.base==='submitted note'));
 assert.equal(profileOf(await f.store.read()).pending.length,0);
});
test('a missing remote card gets durable recovery intent, stays uncertain and survives later acknowledgments',async()=>{
 const f=await fixture();await f.remote.coordinator.run({protocol:syncProtocol,action:'pause',id:crypto.randomUUID()});
 f.remote.directEdit(s=>{s.cards=[];});await f.remote.coordinator.run({protocol:syncProtocol,action:'resume',id:crypto.randomUUID()});
 await f.engine.sync();let state=await f.store.read(),profile=profileOf(state);
 assert.equal(profile.cards[0].pin,a.pin);assert.equal(profile.cards[0].pendingReconciliation,true);assert.equal(profile.pending[0].kind,'unbound-recovery');
 assert.equal(profile.recoveryEvidence.cards[a.cardNumber].conflicts[0].kind,'missing-remote');
 await f.engine.sync();state=await f.store.read();profile=profileOf(state);assert.equal(profile.pending.length,0);assert.equal((await f.remote.read()).cards[0].pin,a.pin);
 const conflict=profile.recoveryEvidence.cards[a.cardNumber].conflicts.find(c=>c.kind==='missing-remote'&&!c.resolution);
 await f.store.commit({id:crypto.randomUUID(),kind:'resolve-conflict',...inventoryContext(state),cardNumber:a.cardNumber,version:profile.versions[a.cardNumber],conflictId:conflict.id,choice:'local'});
 await f.engine.sync();assert.ok((await f.remote.read()).evidence.cards[a.cardNumber].conflicts.find(c=>c.id===conflict.id).resolution);
 await edit(f.store,'still retained');await f.engine.sync();assert.equal(profileOf(await f.store.read()).cards[0].pin,a.pin);assert.equal((await f.remote.read()).cards[0].notes,'still retained');
});
