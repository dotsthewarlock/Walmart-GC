import {test} from 'node:test';
import assert from 'node:assert/strict';
import {reconcile, emptyEvidence, fingerprint, snapshotContent, syncProtocol} from './syncProtocol.js';
import {evidenceMetadata, readEvidenceMetadata, evidenceCellBytes} from './syncEvidence.js';
import {reconcileDuplicates, verificationCards} from './inventoryRecovery.js';
import {migrateLegacy, reduceInventory, inventoryContext, profileOf} from './inventory.js';
import {selectTransferCards, defaultTransferPreferences} from './balanceTransfer.js';
import {createBalanceReviewQueue} from './balanceReview.js';
import {coordinate} from '../../worker/src/syncCoordinator.js';
import {createTransferLedger} from './balanceTransferLedger.js';
import {cardA, operation, syntheticRemote, memoryStorage, commitRequest} from '../../tests/syncFixtures.mjs';

const fixture=()=>Array.from({length:621},(_,index)=>({...cardA,cardNumber:'63'+String(100000+index).padStart(14,'0'),
  lastBalanceChecked:'2026-11-20',lastBalanceCheckedAt:'2026-11-20T10:00:00.000Z'}));
const bytes=value=>new TextEncoder().encode(JSON.stringify(value)).length;
const command=(state,kind,details={})=>({id:crypto.randomUUID(),...inventoryContext(state),kind,...details});

test('621 cards: repeated whole-inventory verification retains revisions with bounded packed evidence',async t=>{
  let cards=fixture(),evidence=emptyEvidence();const measurements=[];
  for(let cycle=0;cycle<16;cycle++){
    const time=new Date(Date.UTC(2026,10,21,0,cycle)).toISOString();
    const local=cards.map(card=>({...card,lastBalanceChecked:time.slice(0,10),lastBalanceCheckedAt:time}));
    const operations=local.map((card,index)=>operation('cycle:'+cycle+':'+index,cards[index],card,'batch-verification',
      {ref:'synthetic:'+cycle+':'+index,balance:card.currentBalance,checkedAt:time}));
    ({cards,evidence}=reconcile({base:cards,local,remote:cards,operations,baseEvidence:evidence,evidence,now:time}));
    const metadata=evidenceMetadata(evidence);
    assert.deepEqual(readEvidenceMetadata(metadata),evidence);
    for(const part of Object.values(metadata))assert.ok(new TextEncoder().encode(part).length<=evidenceCellBytes);
    assert.ok(Object.values(evidence.cards).every(entry=>!entry.conflicts.length&&entry.money===cycle+1));
    if([0,7,15].includes(cycle))measurements.push({cycles:cycle+1,logicalBytes:bytes(evidence),packedBytes:Object.values(metadata).reduce((n,s)=>n+new TextEncoder().encode(s).length,0),parts:Object.keys(metadata).length-1});
  }
  assert.ok(measurements.at(-1).packedBytes-measurements[0].packedBytes<=621);
  const legacyProofs=Object.fromEntries(await Promise.all(cards.map(async c=>[await fingerprint(c.cardNumber),await fingerprint([c.lastBalanceChecked,c.lastBalanceCheckedAt])])));
  t.diagnostic(JSON.stringify({cards:cards.length,legacyProofBytes:bytes(legacyProofs),measurements}));
  assert.ok(bytes(legacyProofs)>64000);
});

test('621 cards and 80 duplicate pairs: deterministic repair isolates credential conflicts and never sums balances',async t=>{
  const cards=fixture(),duplicates=cards.slice(0,80).map((card,index)=>({...card,currentBalance:index===0?0:card.currentBalance,
    ...(index===1?{pin:'9999'}:{}),lastBalanceCheckedAt:'2026-11-20T11:00:00.000Z'}));
  const one=reconcileDuplicates([...cards,...duplicates],emptyEvidence(),'2026-11-21T00:00:00.000Z');
  const two=reconcileDuplicates([...duplicates,...cards].reverse(),emptyEvidence(),'2026-11-21T00:00:00.000Z');
  assert.deepEqual(one,two);assert.equal(one.cards.length,621);assert.equal(one.diagnostics.length,80);
  assert.equal(one.cards[0].currentBalance,0);assert.equal(one.cards[0].pendingReconciliation,true);
  assert.equal(one.cards[1].pendingReconciliation,true);
  assert.equal(verificationCards({cards:one.cards,recoveryEvidence:one.evidence}).length,620);
  const pins=one.evidence.cards[cards[1].cardNumber].conflicts.find(c=>c.kind==='credentials');
  assert.deepEqual(new Set([pins.local.pin,pins.remote.pin]),new Set([cards[1].pin,'9999']));
  const remote=await syntheticRemote([...cards,...duplicates]);
  let reads=0;const read=remote.adapter.read;remote.adapter.read=async()=>{reads++;return read();};
  const pull=await remote.coordinator.run({protocol:syncProtocol,action:'pull'});
  const request=await commitRequest(remote,pull.snapshot.cards,[],undefined,pull.snapshot);
  const repaired=await remote.coordinator.run(request);
  assert.equal(repaired.snapshot.cards.length,621);assert.equal(remote.writes,1);
  await remote.coordinator.run(request);assert.equal(remote.writes,1);
  assert.equal(reads,5);t.diagnostic(JSON.stringify({cards:621,duplicatePairs:80,reads,writes:remote.writes,replayedWrites:0}));
});

test('widespread precise timestamps no longer fill the DO maintenance value; edited times are restored locally',async t=>{
  const cards=fixture(),remote=await syntheticRemote(cards),storage=memoryStorage();
  await coordinate(storage,remote.adapter,{protocol:syncProtocol,action:'pause',id:crypto.randomUUID()});
  const paused=await remote.read();assert.equal(Object.keys(paused.evidence.maintenanceCards).length,621);
  assert.ok(bytes(await storage.get('coordination'))<2000);
  t.diagnostic(JSON.stringify({maintenanceCards:621,doMetadataBytes:bytes(await storage.get('coordination')),
    temporaryPrivateEvidenceBytes:Object.values(evidenceMetadata(paused.evidence)).reduce((n,s)=>n+new TextEncoder().encode(s).length,0)}));
  remote.directEdit(s=>{delete s.cards[0].lastBalanceCheckedAt;s.cards[1].notes='Compatible direct note';});
  const resumed=await coordinate(storage,remote.adapter,{protocol:syncProtocol,action:'resume',id:crypto.randomUUID()});
  assert.equal(resumed.snapshot.cards[0].lastBalanceCheckedAt,cards[0].lastBalanceCheckedAt);
  assert.equal(resumed.snapshot.cards[0].pendingReconciliation,true);
  assert.equal(resumed.snapshot.cards[1].notes,'Compatible direct note');
  assert.equal(resumed.snapshot.cards.filter(c=>c.pendingReconciliation).length,1);
  assert.equal(resumed.snapshot.evidence.maintenanceCards,undefined);
});

test('unbound recovery continues through conflicting credentials and older timestamps while preserving the source',async()=>{
  const cards=fixture(),source=migrateLegacy({cards:JSON.stringify(cards),ledger:null,sheets:null,sync:null});
  const remote=await syntheticRemote([{...cards[0],pin:'9999'},{...cards[1],currentBalance:0,lastBalanceChecked:'2026-11-22',lastBalanceCheckedAt:'2026-11-22T10:00:00.000Z'}]);
  let state=reduceInventory(source,command(source,'bind-remote',{principal:'synthetic-principal',sheetId:'synthetic-sheet',snapshot:await remote.read()}));
  state=reduceInventory(state,command(state,'csv-recovery',{revision:profileOf(state).revision,cards,recovery:true}));
  assert.deepEqual(state.profiles.unbound.cards,source.profiles.unbound.cards);
  assert.deepEqual(state.profiles.unbound.pending,source.profiles.unbound.pending);
  assert.equal(profileOf(state).cards.length,621);assert.equal(profileOf(state).cards[0].pin,'9999');
  assert.equal(profileOf(state).cards[1].currentBalance,0);assert.equal(profileOf(state).cards[1].pendingReconciliation,true);
  assert.equal(profileOf(state).cards[1].lastBalanceCheckedAt,'2026-11-22T10:00:00.000Z');
  assert.equal(profileOf(state).pending.length,621);
});

test('uncertain provisional zero is first in default verification, with used-card selection semantics retained',()=>{
  const cards=fixture().slice(0,3);cards[1]={...cards[1],currentBalance:0,pendingReconciliation:true,lastBalanceChecked:'2026-11-27',lastBalanceCheckedAt:'2026-11-27T00:00:00.000Z'};
  cards[2]={...cards[2],pendingReconciliation:true,used:true};
  assert.equal(createBalanceReviewQueue(cards)[0].card.cardNumber,cards[2].cardNumber);
  const selection=selectTransferCards(cards,{...defaultTransferPreferences,quantity:'1'},new Date('2026-11-27T12:00:00Z'));
  assert.equal(selection.selected[0].card.cardNumber,cards[1].cardNumber);
  const saved=cards[1],time='2026-11-27T01:00:00.000Z',after={...saved,pendingReconciliation:false,lastBalanceCheckedAt:time};
  const evidence={cards:{[saved.cardNumber]:{money:2,uncertainSince:'2026-11-27T00:30:00.000Z',conflicts:[]}},tombstones:{}};
  const apply=checkedAt=>reconcile({base:[saved],local:[after],remote:[saved],operations:[operation('verify',saved,after,'manual-verification',{observedBalance:0,checkedAt})],baseEvidence:evidence,evidence,now:time});
  assert.equal(apply(time).cards[0].pendingReconciliation,false);
  assert.equal(apply('2026-11-27T00:15:00.000Z').cards[0].pendingReconciliation,true);
});

test('rejected control hashes remain bounded while evicted IDs and changed actions remain fenced after restart',async()=>{
  const remote=await syntheticRemote([cardA]),storage=memoryStorage();remote.adapter.prepare=async()=>{throw Error('Synthetic layout error');};
  let first;
  for(let index=0;index<140;index++){
    const request={protocol:syncProtocol,action:'pause',id:'control:'+new Date(Date.now()-86400000+index).toISOString()+':'+crypto.randomUUID()};first??=request;
    await assert.rejects(coordinate(storage,remote.adapter,request),error=>error.notDispatched&&error.rejection.id===request.id);
  }
  const state=await storage.get('coordination');assert.ok(state.controlRejections.length<=64);assert.ok(state.controlRejectionCutoff);
  remote.adapter.prepare=undefined;
  await assert.rejects(coordinate(storage,remote.adapter,first),error=>error.code==='control_rejected'&&error.notDispatched);
  await assert.rejects(coordinate(storage,remote.adapter,{...first,action:'commit'}),error=>error.code==='control_rejected');
  assert.equal(remote.writes,0);
});

test('compatible external edits use the retained baseline, localize monetary uncertainty and repair in one write',async()=>{
  const cards=fixture().slice(0,3),remote=await syntheticRemote(cards);
  const base=await remote.read();remote.directEdit(s=>{s.cards[0].notes='external';s.cards[1].currentBalance=0;s.cards[1].lastBalanceCheckedAt='2026-11-20T12:00:00.000Z';});
  const projected=await remote.coordinator.run({protocol:syncProtocol,action:'pull',base});
  assert.equal(projected.snapshot.cards[0].notes,'external');assert.equal(projected.snapshot.cards[0].pendingReconciliation,undefined);
  assert.equal(projected.snapshot.cards[1].pendingReconciliation,true);assert.equal(projected.snapshot.cards[1].lastBalanceCheckedAt,cards[1].lastBalanceCheckedAt);
  const repaired=await remote.coordinator.run(await commitRequest(remote,projected.snapshot.cards,[],undefined,projected.snapshot));
  assert.equal(remote.writes,1);assert.equal(repaired.snapshot.needsRepair,undefined);
  assert.equal(repaired.snapshot.evidence.cards[cards[1].cardNumber].money,1);
  assert.ok(repaired.snapshot.evidence.cards[cards[1].cardNumber].conflicts.some(c=>c.kind==='balance'&&c.local===100&&c.remote===0));
  assert.equal(await fingerprint(snapshotContent(repaired.snapshot)),repaired.snapshot.fingerprint);
});

test('a registered repair preserves its uncommitted alternatives across another external edit',async()=>{
  const cards=fixture().slice(0,2),remote=await syntheticRemote(cards),base=await remote.read();
  remote.directEdit(s=>{s.cards[0].currentBalance=50;});
  const first=(await remote.coordinator.run({protocol:syncProtocol,action:'pull',base})).snapshot;
  remote.directEdit(s=>{s.cards[1].notes='changed during repair';});
  const next=(await remote.coordinator.run({protocol:syncProtocol,action:'pull',base:first})).snapshot;
  assert.ok(next.evidence.cards[cards[0].cardNumber].conflicts.some(c=>c.local===100&&c.remote===50));
  const result=await remote.coordinator.run(await commitRequest(remote,next.cards,[],undefined,next));
  assert.equal(result.snapshot.cards[1].notes,'changed during repair');
  assert.ok(result.snapshot.evidence.cards[cards[0].cardNumber].conflicts.some(c=>c.local===100&&c.remote===50));
  assert.equal(remote.writes,1);
});

test('notes-only maintenance preserves pending Batch requests and observations from before the pause',async()=>{
  const card={...fixture()[0],pendingReconciliation:true},remote=await syntheticRemote([card]);
  let state=migrateLegacy({cards:null,ledger:null,sheets:null,sync:null});
  state=reduceInventory(state,command(state,'bind-remote',{principal:'synthetic-principal',sheetId:'synthetic-sheet',snapshot:await remote.read()}));
  const profile=profileOf(state),checkedAt=new Date(Date.now()-1000).toISOString();
  const ledger=await createTransferLedger({sheetId:'synthetic-sheet',sheetVersion:profile.remoteBase.version},createBalanceReviewQueue(profile.cards),JSON.stringify(profile.cards),new Date(Date.now()-2000));
  state=reduceInventory(state,command(state,'set-batch',{revision:profile.revision,ledger}));
  await remote.coordinator.run({protocol:syncProtocol,action:'pause',id:crypto.randomUUID()});
  remote.directEdit(s=>{s.cards[0].notes='only notes';});
  const resumed=await remote.coordinator.run({protocol:syncProtocol,action:'resume',id:crypto.randomUUID()});
  state=reduceInventory(state,command(state,'sync-pull',{revision:profileOf(state).revision,snapshot:resumed.snapshot}));
  assert.equal(profileOf(state).ledger.requests[0].state,'pending');
  const before=resumed.snapshot.cards[0],after={...before,pendingReconciliation:false,lastBalanceChecked:checkedAt.slice(0,10),lastBalanceCheckedAt:checkedAt};
  const result=await remote.coordinator.run(await commitRequest(remote,[after],[operation('pre-pause-observation',before,after,'batch-verification',{balance:before.currentBalance,checkedAt})],undefined,resumed.snapshot));
  assert.equal(result.snapshot.cards[0].pendingReconciliation,false);
});

test('a later monetary conflict fences earlier observations even after conflict compaction',()=>{
  const card=fixture()[0],saved={...card,pendingReconciliation:true};
  const first={cards:{[card.cardNumber]:{money:1,uncertainSince:'2026-11-22T00:00:00.000Z',conflicts:[]}},tombstones:{}};
  const proposal={...saved,currentBalance:50};
  const disputed=reconcile({base:[saved],local:[proposal],remote:[saved],operations:[operation('later-spend',saved,proposal,'set-balance')],evidence:first,baseEvidence:first,now:'2026-11-23T00:00:00.000Z'});
  assert.equal(disputed.evidence.cards[card.cardNumber].money,2);
  const checkedAt='2026-11-22T12:00:00.000Z',observed={...saved,currentBalance:50,lastBalanceChecked:'2026-11-22',lastBalanceCheckedAt:checkedAt,pendingReconciliation:false};
  const rejected=reconcile({base:[saved],local:[observed],remote:disputed.cards,operations:[operation('old-observation',saved,observed,'manual-verification',{checkedAt,observedBalance:50})],evidence:disputed.evidence,baseEvidence:first,now:'2026-11-24T00:00:00.000Z'});
  assert.equal(rejected.cards[0].pendingReconciliation,true);assert.equal(rejected.cards[0].currentBalance,100);
});

test('evidence parts round-trip Unicode and legacy values; missing or excessive parts fail closed',()=>{
  const legacy={cards:{},tombstones:{}};assert.deepEqual(readEvidenceMetadata({syncEvidence:JSON.stringify(legacy)}),legacy);
  const evidence={cards:{[cardA.cardNumber]:{money:5,conflicts:[{id:'unicode',kind:'field:notes',local:'é💳'.repeat(10000),remote:'preserved'}]}},tombstones:{}};
  const metadata=evidenceMetadata(evidence);assert.ok(JSON.parse(metadata.syncEvidence).count>1);
  assert.deepEqual(readEvidenceMetadata(metadata),evidence);
  delete metadata['syncEvidence:1'];assert.throws(()=>readEvidenceMetadata(metadata),/Missing/);
  assert.throws(()=>readEvidenceMetadata({syncEvidence:JSON.stringify({format:'parts-v1',count:129})}),/manifest/);
});

test('repeated conflicts and fresh verification compact alternatives while retaining monetary replay fences',async()=>{
  const remote=await syntheticRemote([cardA]);let time=Date.now();
  for(let cycle=0;cycle<20;cycle++){
    const base=await remote.read(),before=base.cards[0],a={...before,currentBalance:before.currentBalance-1},b={...before,currentBalance:before.currentBalance-2};
    await remote.coordinator.run(await commitRequest(remote,[a],[operation('spend-a:'+cycle,before,a,'set-balance')],undefined,base));
    const conflict=await remote.coordinator.run(await commitRequest(remote,[b],[operation('spend-b:'+cycle,before,b,'set-balance')],undefined,base));
    assert.equal(conflict.snapshot.cards[0].pendingReconciliation,true);
    time=Math.max(Date.now()+100,time+1);const checkedAt=new Date(time).toISOString(),card=conflict.snapshot.cards[0];
    const after={...card,lastBalanceChecked:checkedAt.slice(0,10),lastBalanceCheckedAt:checkedAt,pendingReconciliation:false};
    const verified=await remote.coordinator.run(await commitRequest(remote,[after],[operation('verify:'+cycle,card,after,'manual-verification',{checkedAt,observedBalance:card.currentBalance})],undefined,conflict.snapshot));
    const entry=verified.snapshot.evidence.cards[card.cardNumber];
    assert.equal(verified.snapshot.cards[0].pendingReconciliation,false);assert.equal(entry.money,(cycle+1)*3);
    assert.equal(entry.conflicts.length,0);assert.ok(bytes(verified.snapshot.evidence)<250);
  }
});

test('stale retained baselines preserve genuine current verification across notes-only external edits',async()=>{
  const old=fixture()[0],remote=await syntheticRemote([old]),base=await remote.read();
  const checkedAt=new Date(Date.now()-1000).toISOString(),verified={...old,currentBalance:75,lastBalanceChecked:checkedAt.slice(0,10),lastBalanceCheckedAt:checkedAt};
  await remote.coordinator.run(await commitRequest(remote,[verified],[operation('genuine-check',old,verified,'manual-verification',{checkedAt,observedBalance:75})],undefined,base));
  remote.directEdit(s=>{s.cards[0].notes='external note after genuine verification';});
  const pulled=await remote.coordinator.run({protocol:syncProtocol,action:'pull',base});
  assert.equal(pulled.snapshot.cards[0].lastBalanceCheckedAt,checkedAt);assert.equal(pulled.snapshot.cards[0].currentBalance,75);
  assert.notEqual(pulled.snapshot.cards[0].pendingReconciliation,true);assert.equal(pulled.snapshot.evidence.cards[old.cardNumber].money,1);
  remote.directEdit(s=>{s.cards[0].currentBalance=50;});
  await assert.rejects(remote.coordinator.run({protocol:syncProtocol,action:'pull',base}),error=>error.code==='direct_edit');
  assert.equal((await remote.read()).cards[0].lastBalanceCheckedAt,checkedAt);assert.equal(remote.writes,1);
});

test('a retained successful control receipt takes precedence over later rejection cutoffs',async()=>{
  const remote=await syntheticRemote([cardA]),storage=memoryStorage(),start=Date.now()-86400000;
  const first={protocol:syncProtocol,action:'ensure',id:'control:'+new Date(start).toISOString()+':'+crypto.randomUUID()};
  await coordinate(storage,remote.adapter,first);
  remote.adapter.prepare=async()=>{throw Error('Synthetic layout error');};
  for(let index=1;index<=66;index++)await assert.rejects(coordinate(storage,remote.adapter,{protocol:syncProtocol,action:'pause',id:'control:'+new Date(start+index).toISOString()+':'+crypto.randomUUID()}));
  const result=await coordinate(storage,remote.adapter,first);
  assert.equal(result.receipt.id,first.id);assert.equal(remote.writes,1);
});

test('compacted duplicate credential conflicts cannot be resolved by stale choices from a prior repair episode',async()=>{
  const remote=await syntheticRemote([cardA,{...cardA,pin:'9999'}]);
  const firstPull=(await remote.coordinator.run({protocol:syncProtocol,action:'pull'})).snapshot;
  const original=(await remote.coordinator.run(await commitRequest(remote,firstPull.cards,[],undefined,firstPull))).snapshot;
  const originalConflict=original.evidence.cards[cardA.cardNumber].conflicts.find(c=>c.kind==='credentials');
  const choice=id=>({...operation(id,original.cards[0],original.cards[0],'resolve-conflict'),conflictId:originalConflict.id,choice:'remote'});
  const accepted=(await remote.coordinator.run(await commitRequest(remote,original.cards,[choice('first-choice')],undefined,original))).snapshot;
  assert.equal(accepted.evidence.cards[cardA.cardNumber].conflicts.length,0);
  remote.directEdit(s=>{s.cards.push({...cardA,pin:'8888'});});
  const next=(await remote.coordinator.run({protocol:syncProtocol,action:'pull',base:accepted})).snapshot;
  const repaired=(await remote.coordinator.run(await commitRequest(remote,next.cards,[],undefined,next))).snapshot;
  const current=repaired.evidence.cards[cardA.cardNumber].conflicts.find(c=>c.kind==='credentials');
  assert.notEqual(current.id,originalConflict.id);
  const stale=await remote.coordinator.run(await commitRequest(remote,original.cards,[choice('stale-distinct-choice')],undefined,original));
  assert.ok(stale.snapshot.evidence.cards[cardA.cardNumber].conflicts.some(c=>c.id===current.id&&c.local.pin==='8888'));
});

test('duplicate repair keeps latest legacy verification and preserves older genuine precision without fabricating a time',()=>{
  const older={...cardA,lastBalanceChecked:'2026-11-20'},newer={...cardA,lastBalanceChecked:'2026-11-26'};
  const legacy=reconcileDuplicates([older,newer]);assert.equal(legacy.cards[0].lastBalanceChecked,'2026-11-26');
  assert.equal(legacy.cards[0].lastBalanceCheckedAt,undefined);
  const precise={...older,lastBalanceCheckedAt:'2026-11-20T10:00:00.000Z'},mixed=reconcileDuplicates([precise,newer]);
  assert.equal(mixed.cards[0].lastBalanceChecked,'2026-11-26');assert.equal(mixed.cards[0].lastBalanceCheckedAt,undefined);
  assert.deepEqual(mixed.evidence.cards[cardA.cardNumber].previousVerification,['2026-11-20','2026-11-20T10:00:00.000Z']);
  assert.equal(mixed.cards[0].pendingReconciliation,true);
});
