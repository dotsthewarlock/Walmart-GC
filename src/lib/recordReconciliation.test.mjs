import {test} from 'node:test';
import assert from 'node:assert/strict';
import {persistedRecoveryFixture} from '../../tests/recoveryFixture.mjs';
import {syntheticRemote,operation,commitRequest,cardA} from '../../tests/syncFixtures.mjs';
import {syntheticIndexedDB} from '../../tests/syntheticIndexedDB.mjs';
import {reconcile,emptyEvidence,syncProtocol,fingerprint,snapshotContent,materialize} from './syncProtocol.js';
import {repairRecovery,recoverySummary,recordQuarantined} from './reconciliationPolicy.js';
import {evidenceMetadata} from './syncEvidence.js';
import {openInventory,inventoryContext,profileOf,inventoryBytes} from './inventory.js';
import {createSyncEngine} from './syncEngine.js';
import {selectTransferCards} from './balanceTransfer.js';
import {verificationCards} from './inventoryRecovery.js';
import {createTransferLedger} from './balanceTransferLedger.js';
import {previewTransferResults,transferRequestRows} from './balanceTransfer.js';

const bytes=value=>Buffer.byteLength(JSON.stringify(value));
const counts=evidence=>Object.values(evidence.cards).reduce((n,e)=>n+e.conflicts.length,0);
const command=(state,kind,values={})=>({id:crypto.randomUUID(),...inventoryContext(state),kind,...values});
const timers={setTimeout(){return 1;},clearTimeout(){}};

test('621 persisted cards / 285 accumulated conflicts converge to card-level uncertainty with one repair write',async t=>{
  const fixture=persistedRecoveryFixture();assert.equal(counts(fixture.evidence),285);
  const remote=await syntheticRemote(fixture.cards);
  remote.directEdit(s=>{s.evidence=fixture.evidence;});
  // Establish a genuine pre-upgrade snapshot, not an out-of-protocol edit.
  remote.directEdit(s=>{s.fingerprint='';});
  let reads=0;const read=remote.adapter.read;remote.adapter.read=async()=>{reads++;return read();};
  const pulled=(await remote.coordinator.run({protocol:syncProtocol,action:'pull'})).snapshot;
  assert.equal(pulled.needsRepair,true);assert.equal(pulled.cards.length,621);
  assert.equal(counts(pulled.evidence),41);
  assert.deepEqual(recoverySummary({cards:pulled.cards,recoveryEvidence:pulled.evidence}),{uncertain:72,quarantined:0,flaggedEligible:72});
  assert.ok(pulled.cards.slice(0,65).every(c=>c.dateAdded==='2023-11-01'&&c.dateUpdated==='2026-11-01'));
  assert.deepEqual(pulled.cards.map(c=>c.used),fixture.cards.map(c=>c.used));
  const committed=await remote.coordinator.run(await commitRequest(remote,pulled.cards,[],undefined,pulled));
  assert.equal(remote.writes,1);assert.equal(committed.snapshot.needsRepair,undefined);
  const stable=await remote.coordinator.run({protocol:syncProtocol,action:'pull',base:committed.snapshot});
  assert.deepEqual(snapshotContent(stable.snapshot),snapshotContent(committed.snapshot));assert.ok(!stable.snapshot.needsRepair);
  assert.equal(remote.writes,1);
  const afterBytes=bytes(committed.snapshot.evidence),beforeBytes=bytes(fixture.evidence);
  assert.ok(afterBytes<beforeBytes/3);
  t.diagnostic(JSON.stringify({cards:621,persistedEntries:285,remainingFlagDetails:41,uncertainCards:72,manualDecisions:0,beforeBytes,afterBytes,
    encodedBytes:bytes(evidenceMetadata(committed.snapshot.evidence)),reads,writes:remote.writes,repeatWrites:0}));
});

async function localFixture() {
  const source=persistedRecoveryFixture(),indexedDB=syntheticIndexedDB(),storage={getItem:()=>null};
  let store=openInventory({indexedDB,storage,name:'persisted-recovery'}),state=await store.initialize();
  const remote=await syntheticRemote(source.cards);
  const snapshot=await remote.read();snapshot.evidence=source.evidence;snapshot.fingerprint=await fingerprint(snapshotContent(snapshot));
  state=await store.commit(command(state,'bind-remote',{principal:'synthetic-principal',sheetId:'synthetic-sheet',snapshot}));
  await store.close();store=openInventory({indexedDB,storage,name:'persisted-recovery'});
  return {source,indexedDB,storage,store,state};
}

test('persisted repair commits atomically on restart; abort preserves original evidence and exact pending/flight bytes',async()=>{
  const f=await localFixture();let initial=await f.store.read(),p0=profileOf(initial);
  initial=await f.store.commit(command(initial,'patch',{cardNumber:p0.cards[0].cardNumber,version:p0.versions[p0.cards[0].cardNumber],patch:{notes:'Saved during flight'}}));
  p0=profileOf(initial);
  const request={id:crypto.randomUUID(),protocol:syncProtocol,principal:p0.context.principal,sheetId:p0.context.sheetId,action:'commit',
    base:p0.remoteBase,cards:materialize(p0.remoteBase.cards,p0.pending),operations:p0.pending};
  await f.store.commit(command(initial,'sync-begin',{revision:p0.revision,request,requestHash:await fingerprint(request)}));
  const before=await f.store.read();f.indexedDB.failNextWrite=true;
  await assert.rejects(f.store.initialize());assert.deepEqual(await f.store.read(),before);
  let state=await f.store.initialize(),p=profileOf(state);
  assert.equal(counts(p.recoveryEvidence),41);assert.equal(p.cards.filter(c=>c.pendingReconciliation).length,72);
  assert.deepEqual(p.pending,profileOf(before).pending);assert.deepEqual(p.remoteBase,profileOf(before).remoteBase);
  assert.deepEqual(p.inFlight,profileOf(before).inFlight);
  assert.deepEqual(state.migration,before.migration);
  const version=state.revision;await f.store.close();f.store=openInventory({indexedDB:f.indexedDB,storage:f.storage,name:'persisted-recovery'});
  state=await f.store.initialize();assert.equal(state.revision,version);await f.store.close();
});

test('flagged selection includes used and zero cards; local manual and Batch verification retire old evidence without reactivation',async()=>{
  const f=await localFixture();let state=await f.store.initialize(),p=profileOf(state);
  const selected=selectTransferCards(verificationCards(p),{flaggedOnly:true,quantity:'all',sort:'checked-oldest'}).selected;
  assert.equal(selected.length,72);assert.equal(selected.filter(e=>e.card.used).length,6);assert.equal(selected.filter(e=>e.card.currentBalance===0).length,10);
  const saved=p.cards[0],checkedAt=new Date().toISOString();
  const details={cardNumber:saved.cardNumber,version:p.versions[saved.cardNumber],observation:{observedBalance:0,checkedAt:'2026-11-25T12:00:00.000Z'}};
  await assert.rejects(f.store.commit(command(state,'manual-verification',details)),/latest monetary/);
  state=await f.store.commit(command(state,'manual-verification',{...details,observation:{observedBalance:0,checkedAt}}));p=profileOf(state);
  assert.equal(p.cards[0].pendingReconciliation,false);assert.equal(p.cards[0].used,true);assert.equal(p.recoveryEvidence.cards[saved.cardNumber].conflicts.length,0);
  const next=p.cards[1],selection=selectTransferCards([next],{flaggedOnly:true,quantity:'all',sort:'checked-oldest'}).selected;
  const ledger=await createTransferLedger({sheetId:'synthetic-sheet',sheetVersion:p.remoteBase.version},selection,inventoryBytes(state),new Date(checkedAt));
  state=await f.store.commit(command(state,'set-batch',{revision:p.revision,ledger}));p=profileOf(state);
  const observations=[{ref:ledger.requests[0].ref,balance:3,checkedAt:new Date(Date.parse(checkedAt)+1).toISOString()}];
  const preview=previewTransferResults(p.ledger,verificationCards(p),observations,Date.parse(checkedAt)+2,p.recoveryEvidence);
  assert.equal(preview.counts.accepted,1);
  state=await f.store.commit(command(state,'apply-batch',{ledgerId:ledger.id,items:preview.items,observations,now:Date.parse(checkedAt)+2,inventoryDigest:null}));
  p=profileOf(state);assert.equal(p.cards[1].used,true);assert.equal(p.cards[1].currentBalance,3);assert.equal(p.cards[1].pendingReconciliation,false);
  assert.equal(p.recoveryEvidence.cards[next.cardNumber].conflicts.length,0);
  await f.store.close();
});

test('credential, merchant, missing identity and deletion alternatives remain quarantined; unrelated edits converge',()=>{
  const fixture=persistedRecoveryFixture(),cards=fixture.cards.slice(0,4),evidence=emptyEvidence();
  const add=(index,kind,values)=>{evidence.cards[cards[index].cardNumber]={money:0,conflicts:[{id:'exception:'+index,kind,at:fixture.at,...values}]};};
  add(0,'credentials',{local:{...cards[0],pin:'9999'},remote:cards[0]});
  add(1,'field:merchant',{local:'other',remote:'walmart-ca'});
  add(2,'deleted-identity',{local:cards[2],remote:null});evidence.tombstones[cards[2].cardNumber]={id:'delete'};
  const edited={...cards[3],notes:'Unrelated edit'};
  const merged=reconcile({base:cards,local:[...cards.slice(0,3),edited],remote:cards.slice(0,2).concat(cards[3]),evidence,
    operations:[operation('unrelated',cards[3],edited)]});
  for(const card of cards.slice(0,3))assert.equal(recordQuarantined(merged.evidence,card.cardNumber),true);
  assert.equal(verificationCards({cards:merged.cards,recoveryEvidence:merged.evidence}).length,1);
  assert.equal(merged.evidence.cards[cards[0].cardNumber].conflicts[0].local.pin,'9999');
  assert.ok(!merged.cards.some(c=>c.cardNumber===cards[2].cardNumber));
  assert.equal(merged.cards.find(c=>c.cardNumber===cards[3].cardNumber).notes,'Unrelated edit');
  assert.deepEqual(repairRecovery(merged.cards,merged.evidence),merged);
});

test('evidence-only quarantine invalidates affected Batch references while healthy pending requests remain usable',async()=>{
  const f=await localFixture();let state=await f.store.initialize(),p=profileOf(state);
  const selected=selectTransferCards(p.cards.slice(0,2),{flaggedOnly:true}).selected;
  const ledger=await createTransferLedger({sheetId:'synthetic-sheet',sheetVersion:p.remoteBase.version},selected,inventoryBytes(state));
  state=await f.store.commit(command(state,'set-batch',{revision:p.revision,ledger}));p=profileOf(state);
  const snapshot={...p.remoteBase,cards:p.cards,evidence:structuredClone(p.recoveryEvidence),version:'evidence-only'};
  const number=p.cards[0].cardNumber;
  snapshot.evidence.cards[number].conflicts.push({id:'merchant-identity',kind:'field:merchant',local:'amazon-ca',remote:'walmart-ca'});
  snapshot.fingerprint=await fingerprint(snapshotContent(snapshot));
  state=await f.store.commit(command(state,'sync-pull',{revision:p.revision,snapshot}));p=profileOf(state);
  assert.equal(p.ledger.requests.find(r=>r.cardNumber===number).state,'invalidated');
  assert.equal(p.ledger.requests.filter(r=>r.state==='pending').length,1);
  assert.equal(transferRequestRows(p.ledger,verificationCards(p)).length,1);
  await f.store.close();
});

test('lost repair acknowledgment resumes the original flight and reports synchronized with uncertainty',async()=>{
  const fixture=persistedRecoveryFixture(),remote=await syntheticRemote(fixture.cards);
  remote.directEdit(s=>{s.evidence=fixture.evidence;s.fingerprint='';});
  const indexedDB=syntheticIndexedDB(),store=openInventory({indexedDB,storage:{getItem:()=>null},name:'lost-repair'});
  await store.initialize();let lose=true;const statuses=[];
  const request=async(path,options)=>{
    if(path==='/api/status')return {authenticated:true,principal:'synthetic-principal',sheetId:'synthetic-sheet',ownershipVerified:true,syncProtocol,coordinationAvailable:true};
    const payload=JSON.parse(options.body),result=await remote.coordinator.run(payload);
    if(payload.action==='commit'&&lose){lose=false;throw new TypeError('Synthetic lost response');}
    return {...result,principal:'synthetic-principal',sheetId:'synthetic-sheet'};
  };
  let engine=createSyncEngine({store,request,timers,onStatus:s=>statuses.push(s)});
  await engine.sync({bind:true});let state=await store.read();assert.ok(profileOf(state).inFlight);const flight=structuredClone(profileOf(state).inFlight);
  engine.stop();engine=createSyncEngine({store,request,timers,onStatus:s=>statuses.push(s)});
  await engine.sync();state=await store.read();assert.equal(profileOf(state).inFlight,null);assert.equal(remote.writes,1);
  assert.equal(statuses.at(-1).phase,'saved');assert.equal(statuses.at(-1).balanceConfidence,'uncertain');assert.equal(statuses.at(-1).recordIntegrity,'accepted');
  assert.ok(flight.request.id);assert.equal(profileOf(state).pending.length,0);
  await engine.sync();assert.equal(remote.writes,1);await store.close();
});
