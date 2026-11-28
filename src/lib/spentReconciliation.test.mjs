import {test} from 'node:test';
import assert from 'node:assert/strict';
import {cardA,operation,syntheticRemote,commitRequest} from '../../tests/syncFixtures.mjs';
import {syntheticIndexedDB} from '../../tests/syntheticIndexedDB.mjs';
import {migrateLegacy,reduceInventory,profileOf,inventoryContext,openInventory} from './inventory.js';
import {reconcile,emptyEvidence,syncProtocol,fingerprint,snapshotContent} from './syncProtocol.js';
import {compactEvidence,evidenceMetadata,readEvidenceMetadata} from './syncEvidence.js';
import {repairRecovery} from './reconciliationPolicy.js';
import {resumeMaintenance} from './inventoryRecovery.js';
import {applicableZeroProof} from './zeroObservation.js';
import {spentLifecycle} from './spentReconciliation.js';
import {selectTransferCards,readTransferPreferences} from './balanceTransfer.js';
import {createSyncEngine} from './syncEngine.js';

const number=cardA.cardNumber, used={...cardA,used:true,dateUsed:'2026-07-01'};
const time='2026-11-26T10:00:00.000Z', now=new Date('2026-11-28T12:00:00.000Z');
const zero={...used,currentBalance:0,lastBalanceChecked:time.slice(0,10),lastBalanceCheckedAt:time};
const evidence=()=>({cards:{[number]:{money:1,moneyAt:time,conflicts:[],zeroObservation:{money:1,checkedAt:time}}},tombstones:{}});
const valid=(card,entry,ops)=>Boolean(applicableZeroProof(card,entry,ops));
const init=(cards=[used])=>migrateLegacy({cards:JSON.stringify(cards),ledger:null,sheets:null,sync:null});
const command=(state,kind,extra={})=>({id:crypto.randomUUID(),kind,...inventoryContext(state),...extra});
const verify=(state,balance=0,checkedAt=time)=>reduceInventory(state,command(state,'manual-verification',{
  cardNumber:number,version:profileOf(state).versions[number],observation:{observedBalance:balance,checkedAt}}));
const patch=(state,values,action)=>reduceInventory(state,command(state,'patch',{
  cardNumber:number,version:profileOf(state).versions[number],patch:values,...(action?{action}:{})}));
const select=(cards,purpose,ev=emptyEvidence(),extra={})=>selectTransferCards(cards,{purpose,quantity:'20',freshness:60,...extra},now,ev);

test('estimated zero after a prior positive verification is unconfirmed; only accepted zero creates proof',()=>{
  let state=verify(init(),50,'2026-11-25T10:00:00.000Z');
  state=patch(state,{currentBalance:0},'set-balance');
  let p=profileOf(state);assert.equal(valid(p.cards[0],p.recoveryEvidence.cards[number],p.pending),false);
  state=verify(state,0,new Date(Date.now()+1).toISOString());p=profileOf(state);
  assert.equal(valid(p.cards[0],p.recoveryEvidence.cards[number],p.pending),true);
  assert.equal(p.cards[0].used,true);
  assert.equal(select(p.cards,'reconcile',p.recoveryEvidence).matching,1,'pending proof requires its exact operation');
  assert.equal(selectTransferCards(p.cards,{purpose:'reconcile'},now,p.recoveryEvidence,p.pending).matching,0);
});

test('notes and independent used changes preserve proof; money, recovery and uncertainty invalidate it',()=>{
  let state=verify(init());
  state=patch(state,{notes:'offline note'});state=patch(state,{used:false,dateUsed:''});
  let p=profileOf(state);assert.equal(valid(p.cards[0],p.recoveryEvidence.cards[number],p.pending),true);
  state=patch(state,{currentBalance:1},'set-balance');state=patch(state,{currentBalance:0},'set-balance');
  p=profileOf(state);assert.equal(valid(p.cards[0],p.recoveryEvidence.cards[number],p.pending),false);
  for(const edit of [{money:2},{uncertainSince:time},{zeroObservation:{money:1,checkedAt:'bad'}},{zeroObservation:{money:0,checkedAt:time}}]) {
    const ev=evidence();Object.assign(ev.cards[number],edit);
    assert.equal(valid(zero,ev.cards[number]),false);
    assert.equal(repairRecovery([zero],ev).evidence.cards[number]?.zeroObservation,undefined);
  }
  assert.equal(valid({...zero,pendingReconciliation:true},evidence().cards[number]),false);
  assert.equal(valid({...zero,lastBalanceCheckedAt:'2026-11-25T10:00:00.000Z'},evidence().cards[number]),false);
  assert.equal(valid({...zero,currentBalance:0},undefined),false,'CSV timestamps cannot recreate proof');
});

test('accepted shared zero is revision-bound, packed and compacted; legacy writers cannot reuse it after spending',()=>{
  const op=operation('zero',used,zero,'manual-verification',{observedBalance:0,checkedAt:time});
  const result=reconcile({base:[used],local:[zero],remote:[used],operations:[op],now:'2026-11-26T10:00:01.000Z'});
  assert.equal(valid(result.cards[0],result.evidence.cards[number]),true);
  assert.deepEqual(readEvidenceMetadata(evidenceMetadata(compactEvidence(result.evidence))),result.evidence);
  const spent={...zero,currentBalance:0};
  const next=reconcile({base:result.cards,local:[spent],remote:result.cards,operations:[operation('legacy-zero',zero,spent,'set-balance')],baseEvidence:result.evidence,evidence:result.evidence});
  assert.equal(valid(next.cards[0],next.evidence.cards[number]),false);
  const legacy={...zero};delete legacy.lastBalanceCheckedAt;
  const older=reconcile({base:[used],local:[legacy],remote:[used],operations:[operation('older-check',used,legacy,'manual-verification',{observedBalance:0,checkedAt:time})],now:'2026-11-26T10:00:01.000Z'});
  assert.equal(valid(older.cards[0],older.evidence.cards[number]),true,'applicable legacy observations can establish genuine proof');
  const stale=reconcile({base:[used],local:[zero],remote:[zero],operations:[op],baseEvidence:emptyEvidence(),evidence:evidence(),now:now.toISOString()});
  assert.equal(valid(stale.cards[0],stale.evidence.cards[number]),false);
});

test('credential conflicts/resolution and affected maintenance invalidate; notes maintenance preserves',()=>{
  const ev=evidence();ev.cards[number].conflicts.push({id:'pin',kind:'credentials',local:{...zero,pin:'1234'},remote:zero});
  const changed=reconcile({base:[zero],local:[{...zero,pin:'1234'}],remote:[zero],operations:[{...operation('resolve',zero,{...zero,pin:'1234'},'resolve-conflict'),conflictId:'pin',choice:'local'}],baseEvidence:ev,evidence:ev});
  assert.equal(changed.evidence.cards[number].zeroObservation,undefined);
  for (const changes of [{notes:'note'},{currentBalance:4},{pin:'1234'},{merchant:'unknown'}]) {
    const candidate={cards:[{...zero,...changes}],evidence:{...evidence(),maintenanceCards:{[number]:zero}}};
    resumeMaintenance(candidate,{id:'resume',now:now.toISOString()});
    const repaired=repairRecovery(candidate.cards,candidate.evidence);
    assert.equal(valid(repaired.cards[0],repaired.evidence.cards[number]),'notes' in changes);
  }
});

test('proof and accepted observations cannot predate earlier pending monetary actions, including clock regression and legacy unknown times',()=>{
  const afterSpend={...used,currentBalance:5};
  const spend=operation('spend',used,afterSpend,'set-balance');
  spend.performedAt='2026-11-27T00:00:00.000Z';
  const observe=operation('older-zero',afterSpend,zero,'manual-verification',{observedBalance:0,checkedAt:time});
  for(const earlier of [spend,{...spend,performedAt:undefined}]) {
    const result=reconcile({base:[used],local:[zero],remote:[used],operations:[earlier,observe],now:now.toISOString()});
    assert.equal(valid(result.cards[0],result.evidence.cards[number]),false);
  }
  const ev=evidence();ev.cards[number].moneyAt='2026-11-27T00:00:00.000Z';
  assert.equal(valid(zero,ev.cards[number]),false);
  const local=patch(init(),{currentBalance:5},'set-balance');
  assert.throws(()=>verify(local,0,time),/latest monetary change/);
});

test('local pending proof survives reload, abort/retry and explicit positive recovery never reactivates',async()=>{
  const indexedDB=syntheticIndexedDB(),storage={getItem:key=>key==='walmartGc.cards'?JSON.stringify([used]):null};
  let store=openInventory({indexedDB,storage,name:'p20'}),state=await store.initialize();
  const observation=command(state,'manual-verification',{cardNumber:number,version:1,observation:{observedBalance:0,checkedAt:time}});
  indexedDB.failNextWrite=true;await assert.rejects(store.commit(observation),/storage failure/);
  assert.deepEqual(await store.read(),state);
  state=await store.commit(observation);assert.deepEqual(await store.commit(observation),state);
  await store.close();store=openInventory({indexedDB,storage,name:'p20'});state=await store.initialize();
  let p=profileOf(state);assert.equal(valid(p.cards[0],p.recoveryEvidence.cards[number],p.pending),true);
  state=await store.commit(command(state,'manual-verification',{cardNumber:number,version:p.versions[number],observation:{observedBalance:150,checkedAt:'2026-11-27T10:00:00.000Z'}}));
  p=profileOf(state);assert.equal(p.cards[0].currentBalance,150);assert.equal(p.cards[0].used,true);
  assert.equal(p.recoveryEvidence.cards[number].zeroObservation,undefined);
  state=await store.commit(command(state,'patch',{cardNumber:number,version:p.versions[number],patch:{used:false,dateUsed:''}}));
  assert.equal(profileOf(state).cards[0].used,false);await store.close();
});

test('120-day watch and final boundaries, grace priority and missed checks; no fabricated dates',()=>{
  const atAge=age=>({...zero,dateUsed:new Date(Date.parse('2026-11-28')-age*86400000).toISOString().slice(0,10)});
  const oldTime='2024-06-01T00:00:00.000Z',ev=evidence();ev.cards[number].zeroObservation.checkedAt=oldTime;
  const aged=age=>({...atAge(age),lastBalanceChecked:'2024-06-01',lastBalanceCheckedAt:oldTime});
  assert.equal(select([aged(119)],'watch',ev).matching,1);
  assert.equal(select([aged(120)],'watch',ev).matching,0);
  for(const age of [120,149,150,500])assert.equal(select([aged(age)],'final',ev).matching,1);
  assert.equal(spentLifecycle(aged(149),ev,[],now).finalPriority,true);
  assert.equal(spentLifecycle(aged(150),ev,[],now).finalPriority,false);
  assert.equal(select([atAge(122)],'final',evidence()).matching,0,'only a genuine zero after anniversary completes final');
  for (const dateUsed of ['', '2026-02-30','2027-01-01']) {
    const card={...zero,dateUsed};assert.equal(spentLifecycle(card,evidence(),[],now).age,null);
    assert.equal(select([card],'final',evidence()).matching,0);
    assert.equal(select([{...card,lastBalanceCheckedAt:undefined}],'historical').matching,1);
  }
  assert.equal(select([{...zero,currentBalance:150}],'final',evidence()).matching,1,'positive check never fabricates final zero');
});

for (const earlier of ['notes','balance','verification']) test(`compatible ${earlier} ACK preserves a later pending zero through reload and shared commit; account isolation`,async()=>{
  const indexedDB=syntheticIndexedDB(),storage={getItem:()=>null};
  let store=openInventory({indexedDB,storage,name:'p20-ack'});await store.initialize();
  const remote=await syntheticRemote([used]);
  const makeEngine=()=>createSyncEngine({store,timers:{setTimeout(){return 1;},clearTimeout(){}},request:async(path,options)=>path==='/api/status'
    ? {authenticated:true,principal:'synthetic-principal',ownershipVerified:true,sheetId:'synthetic-sheet',syncProtocol,coordinationAvailable:true}
    : {...await remote.coordinator.run(JSON.parse(options.body)),principal:'synthetic-principal',sheetId:'synthetic-sheet'}});
  let engine=makeEngine();await engine.sync({bind:true});
  let state=await store.read(),p=profileOf(state);
  await store.commit(earlier==='verification'
    ? command(state,'manual-verification',{cardNumber:number,version:p.versions[number],observation:{observedBalance:10,checkedAt:new Date().toISOString()}})
    : command(state,'patch',{cardNumber:number,version:p.versions[number],patch:earlier==='notes'?{notes:'earlier work'}:{currentBalance:10},...(earlier==='balance'?{action:'set-balance'}:{})}));
  let release;remote.delay=new Promise(resolve=>{release=resolve;});
  const syncing=engine.sync();
  for(let tries=0;tries<100 && !(await store.read()).profiles[(await store.read()).active].inFlight;tries++)await new Promise(resolve=>setTimeout(resolve,1));
  state=await store.read();p=profileOf(state);assert.ok(p.inFlight);
  const checkedAt=new Date(Date.now()+1).toISOString();
  state=await store.commit(command(state,'manual-verification',{cardNumber:number,version:p.versions[number],observation:{observedBalance:0,checkedAt}}));
  release();await syncing;
  state=await store.read();p=profileOf(state);
  assert.equal(p.pending.length,1,JSON.stringify({sync:p.sync,blocked:p.syncBlocked,flight:p.inFlight,ev:p.recoveryEvidence}));assert.equal(valid(p.cards[0],p.recoveryEvidence.cards[number],p.pending),true);
  await store.close();store=openInventory({indexedDB,storage,name:'p20-ack'});state=await store.initialize();p=profileOf(state);
  engine=makeEngine();
  assert.equal(valid(p.cards[0],p.recoveryEvidence.cards[number],p.pending),true);
  await engine.sync();state=await store.read();p=profileOf(state);
  assert.equal(p.pending.length,0);assert.equal(valid(p.cards[0],p.recoveryEvidence.cards[number]),true);
  const local=reduceInventory(state,command(state,'use-unbound'));
  assert.equal(profileOf(local).cards.length,0);assert.deepEqual(profileOf(local).recoveryEvidence,emptyEvidence());
  assert.throws(()=>reduceInventory(local,command(state,'manual-verification',{cardNumber:number,version:p.versions[number],observation:{observedBalance:0,checkedAt}})),/context changed/);
  await store.close();
});

test('bounded deterministic history, freshness choices, known uncertainty bypass and general verification survive',()=>{
  const cards=Array.from({length:2000},(_,i)=>({...zero,cardNumber:'6300'+String(i).padStart(12,'0'),dateUsed:'',lastBalanceCheckedAt:undefined,lastBalanceChecked:undefined}));
  assert.equal(select(cards,'historical').selected.length,20);
  assert.equal(select(cards,'historical',emptyEvidence(),{quantity:'all'}).selected.length,20);
  assert.equal(select(cards,'historical',emptyEvidence(),{quantity:'50'}).selected.length,50);
  assert.deepEqual(select(cards,'historical').selected.map(e=>e.card.cardNumber),select([...cards].reverse(),'historical').selected.map(e=>e.card.cardNumber));
  const flagged={...cardA,pendingReconciliation:true,lastBalanceChecked:'2026-11-28',lastBalanceCheckedAt:'2026-11-28T10:00:00.000Z'};
  for(const purpose of ['reconcile','watch','final','historical'])assert.equal(select([flagged],purpose).matching,1);
  const recent={...zero,dateUsed:'2026-10-01'};
  for(const freshness of [30,60,90])assert.equal(select([recent],'watch',evidence(),{freshness}).matching,0);
  assert.equal(selectTransferCards([cardA],{checked:'any'},now).matching,1);
  assert.equal(readTransferPreferences({getItem:()=>JSON.stringify({version:2,purpose:'watch',freshness:60})}).purpose,'watch');
});
