import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createVerificationWorkflow} from '../features/verification/verificationWorkflow.js';
import {migrateLegacy,reduceInventory,inventoryContext,profileOf} from './inventory.js';
import {defaultTransferPreferences} from './balanceTransfer.js';
import {cardA,cardB} from '../../tests/syncFixtures.mjs';

const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};
function fixture(){
 let wallet=migrateLegacy({cards:JSON.stringify([cardA,cardB]),ledger:null,sheets:null,sync:null});
 let hold=null,readHook=null,sendHook=null;const copied=[],sent=[];
 const workflow=createVerificationWorkflow({...defaultTransferPreferences});
 const options={getTransferWallet:()=>null,copyText:async text=>{copied.push(text);return true;},
  readWallet:async()=>{const captured=structuredClone(wallet);if(readHook){const hook=readHook;readHook=null;await hook();}return captured;},
  commitWallet:async command=>{
   const pending=hold;hold=null;
   if(pending?.fail){pending.started.resolve();await pending.gate.promise;throw Error('Synthetic transaction failure');}
   wallet=reduceInventory(wallet,{id:crypto.randomUUID(),...command});
   const committed=structuredClone(wallet);
   if(pending){pending.started.resolve();await pending.gate.promise;}
   notify();return committed;
  },sendCompanion:async message=>{sent.push(message);return sendHook?sendHook(message):{};},confirm:()=>true};
 function notify(){workflow.configure({...options,walletSnapshot:structuredClone(wallet)});}
 notify();workflow.enter();
 return {workflow,options,copied,sent,get wallet(){return wallet;},notify,
  change(notifyNow=true){wallet=structuredClone(wallet);wallet.contextGeneration=(wallet.contextGeneration??0)+1;wallet.revision++;if(notifyNow)notify();},
  // Synthetic external adoption; credential changes are not local patch commands.
  editCard(patch,notifyNow=true){wallet=structuredClone(wallet);Object.assign(profileOf(wallet).cards[0],patch);wallet.revision++;if(notifyNow)notify();},
  hold(fail=false){hold={started:deferred(),gate:deferred(),fail};return hold;},
  holdRead(){const started=deferred(),gate=deferred();readHook=()=>{started.resolve();return gate.promise;};return {started,gate};},
  sendWith(hook){sendHook=hook;},
 };
}
async function prepare(f){f.workflow.setMode('batch');await f.workflow.select(true);assert.ok(f.workflow.getSnapshot().selection.refs?.length);}
function packet(f,balance='12.34'){
 const request=profileOf(f.wallet).ledger.requests.find(r=>r.state==='pending');
 return `WMGC-RESULT\t1\nref\tbalanceCAD\tcheckedAt\n${request.ref}\t${balance}\t${new Date().toISOString()}`;
}

function contextualTarget(f,number=cardB.cardNumber){return {...inventoryContext(f.wallet),cardNumber:number,version:profileOf(f.wallet).versions[number]};}

test('P1.2 single-card changed/unchanged/zero saves preserve the general session and saved Batch',async()=>{
 for(const amount of ['12.34',String(cardB.currentBalance),'0']){
  const f=fixture(),w=f.workflow;await prepare(f);w.setPacket('GENERAL RESULT DRAFT');w.setMode('manual');w.setAmount('GENERAL MANUAL DRAFT');
  const prior=w.getSnapshot(),ledger=structuredClone(profileOf(f.wallet).ledger);
  await w.startContextual(contextualTarget(f));
  assert.equal(w.getSnapshot().selection.queue.length,1);assert.equal(w.getSnapshot().selection.queue[0].snapshot.cardNumber,cardB.cardNumber);
  assert.equal(w.getSnapshot().mode,'manual');assert.equal(w.getSnapshot().manual.amount,'');
  w.setMode('batch');assert.equal(w.getSnapshot().mode,'manual');
  w.setAmount(amount);await w.saveObservation(amount,true);
  assert.equal(w.getSnapshot().contextual.done,true);
  assert.equal(profileOf(f.wallet).cards[1].currentBalance,Number(amount));
  assert.equal(profileOf(f.wallet).cards[0].currentBalance,cardA.currentBalance);
  assert.equal(profileOf(f.wallet).ledger.id,ledger.id);
  assert.equal(w.finishContextual(),true);assert.equal(w.getSnapshot().selection,prior.selection);
  assert.deepEqual(w.getSnapshot().manual,prior.manual);assert.equal(w.getSnapshot().packet,prior.packet);
 }
});

test('P1.2 cancellation is read-only; transaction abort retains task/draft for retry and waits for durable completion',async()=>{
 const f=fixture(),w=f.workflow;w.setAmount('general');const prior=w.getSnapshot(),before=structuredClone(f.wallet);
 await w.startContextual(contextualTarget(f));w.setAmount('19.99');w.finishContextual();
 assert.deepEqual(f.wallet,before);assert.deepEqual(w.getSnapshot().manual,prior.manual);
 await w.startContextual(contextualTarget(f));w.setAmount('19.99');
 const failure=f.hold(true),save=w.saveObservation('19.99',true);await failure.started.promise;
 assert.equal(w.finishContextual(),false);assert.equal(w.getSnapshot().contextual.done,false);
 failure.gate.resolve();await save;assert.deepEqual(f.wallet,before);assert.equal(w.getSnapshot().manual.amount,'19.99');
 assert.match(w.getSnapshot().feedback.saveError,/transaction failure/);
 const held=f.hold(),retry=w.saveObservation('19.99',true);await held.started.promise;
 assert.equal(w.getSnapshot().contextual.done,false);held.gate.resolve();await retry;
 assert.equal(w.getSnapshot().contextual.done,true);
});

test('P1.2 retained Companion correlation survives valid tasks and is cancelled on context or credential invalidation',async()=>{
 for(const change of ['context','general-credentials','task-credentials','valid']){
  const f=fixture(),w=f.workflow;await prepare(f);await w.sendRequest();
  const transfer=w.getSnapshot().transfer;
  await w.startContextual(contextualTarget(f));
  if(change==='context')f.change();
  if(change==='general-credentials')f.editCard({pin:'9999'});
  if(change==='task-credentials'){
   // Both queues cover A; edit the active task to exercise reset with retained state.
   w.finishContextual();await w.startContextual(contextualTarget(f,cardA.cardNumber));f.editCard({pin:'9999'});
  }
  if(change==='valid'){
   w.finishContextual();assert.deepEqual(w.getSnapshot().transfer,transfer);
   assert.equal(f.sent.filter(message=>message.type==='wallet-transfer-cancel').length,0);
  }else assert.equal(f.sent.filter(message=>message.type==='wallet-transfer-cancel'&&message.sessionId===transfer.sessionId).length,1);
 }
});

test('P1.2 resolves saved origin version/context and fences removed or edited credentials',async()=>{
 for(const changed of ['version','generation','pin','removed']){
  const f=fixture(),w=f.workflow,target=contextualTarget(f,cardA.cardNumber);
  if(changed==='version')await f.options.commitWallet({kind:'patch',action:'set-notes',...target,patch:{notes:'new'}});
  if(changed==='generation')f.change(false);
  if(changed==='pin')f.editCard({pin:'9999'},false);
  if(changed==='removed')f.editCard({cardNumber:'0000000000000000'},false);
  await w.startContextual(target);assert.equal(w.getSnapshot().contextual,null);
 }
 const f=fixture(),w=f.workflow;await w.startContextual(contextualTarget(f));w.setAmount('33.33');
 f.change();assert.equal(w.getSnapshot().contextual,null);assert.equal(w.getSnapshot().manual.amount,'');
});

test('P0.2 residual: same-observation retries retain time; Batch advancing Manual cannot transfer it to the next card',async()=>{
 const f=fixture(),w=f.workflow;await prepare(f);w.setMode('manual');
 const commands=[],commit=f.options.commitWallet;
 f.options.commitWallet=async command=>{commands.push(command);return commit(command);};f.notify();
 const failed=f.hold(true),save=w.saveObservation('20.00');await failed.started.promise;failed.gate.resolve();await save;
 const first=commands.at(-1).observation.checkedAt;
 const failedAgain=f.hold(true),retry=w.saveObservation('20.00');await failedAgain.started.promise;failedAgain.gate.resolve();await retry;
 assert.equal(commands.at(-1).observation.checkedAt,first);
 w.setMode('batch');w.setPacket(packet(f));await w.importResults();await w.applyResults();
 assert.equal(w.getSnapshot().manual.position,1);
 await new Promise(resolve=>setTimeout(resolve,5));w.setMode('manual');await w.saveObservation('20.00');
 assert.notEqual(commands.at(-1).observation.checkedAt,first);
 assert.equal(commands.at(-1).cardNumber,cardB.cardNumber);
});

test('P0.2 residual: delayed fallback validator checks saved context/credentials and action ownership without notification',async()=>{
 for(const changed of ['generation','pin','action']){
  const f=fixture(),w=f.workflow,held=deferred(),started=deferred();let fallback=0;
  f.options.copyText=async(_text,isCurrent,validate)=>{started.resolve();await held.promise;if(isCurrent()&&(!validate||await validate()))fallback++;return true;};f.notify();
  const copy=w.copy('PIN',cardA.pin);await started.promise;
  if(changed==='generation'){f.change(false);f.change(false);}
  if(changed==='pin')f.editCard({pin:'9999'},false);
  if(changed==='action')w.skip();
  held.resolve();await copy;assert.equal(fallback,0);assert.equal(w.getSnapshot().feedback.copyMessage,'');
 }
});

test('P0.2 workflow commands run without a presentation and retain drafts/progress across modes',async()=>{
 const f=fixture(),w=f.workflow;w.setAmount('27.31');w.setMode('batch');w.setMode('manual');
 assert.equal(w.getSnapshot().manual.amount,'27.31');
 await w.saveObservation('27.31',true);
 assert.equal(w.getSnapshot().manual.saved,1);assert.equal(profileOf(f.wallet).cards[0].currentBalance,27.31);
 w.setAmount('18.20');await prepare(f);w.setMode('manual');
 assert.equal(w.getSnapshot().manual.saved,1);assert.equal(w.getSnapshot().manual.amount,'18.20');
 assert.equal(w.getSnapshot().selection.refs.length,1);
});

test('P0.2 late Manual success/failure cannot advance a replacement workflow or release its busy owner',async()=>{
 for(const fail of [false,true]){
  const f=fixture(),w=f.workflow,old=f.hold(fail),save=w.saveObservation('44.44');await old.started.promise;
  f.change();const number=w.getSnapshot().selection.queue[0].snapshot.cardNumber;
  w.setAmount('55.55');const next=f.hold(),newSave=w.saveObservation('55.55');await next.started.promise;
  old.gate.resolve();await save;
  assert.equal(w.getSnapshot().busy,true);assert.equal(w.getSnapshot().manual.saved,0);
  assert.equal(w.getSnapshot().manual.amount,'55.55');assert.equal(w.getSnapshot().feedback.saveError,'');
  next.gate.resolve();await newSave;assert.equal(w.getSnapshot().manual.saved,1);
  assert.equal(profileOf(f.wallet).cards.find(card=>card.cardNumber===number).currentBalance,55.55);
 }
});

test('P0.2 failed Manual save retains draft, pending observation time, recovery and zero proof semantics',async()=>{
 const f=fixture(),w=f.workflow;w.setAmount('0');const before=structuredClone(f.wallet);
 const held=f.hold(true),save=w.saveObservation('0',true);await held.started.promise;held.gate.resolve();await save;
 assert.deepEqual(f.wallet,before);assert.equal(w.getSnapshot().manual.amount,'0');assert.equal(w.getSnapshot().manual.saved,0);
 assert.match(w.getSnapshot().feedback.saveError,/Synthetic transaction failure/);
 await w.saveObservation('0',true);assert.equal(w.getSnapshot().manual.saved,1);assert.equal(profileOf(f.wallet).cards[0].currentBalance,0);
});

test('P0.2 current-workflow read failures surface errors and retain retryable drafts',async()=>{
 const f=fixture(),w=f.workflow;w.setAmount('12.34');
 const read=f.options.readWallet;f.options.readWallet=async()=>{throw Error('Synthetic IndexedDB read failed');};f.notify();
 await w.saveObservation('12.34',true);
 assert.match(w.getSnapshot().feedback.saveError,/Synthetic IndexedDB read failed/);
 assert.equal(w.getSnapshot().manual.amount,'12.34');assert.equal(w.getSnapshot().busy,false);
 await w.select();assert.match(w.getSnapshot().feedback.selectionError,/Synthetic IndexedDB read failed/);
 w.setMode('batch');await w.copyRequest();assert.match(w.getSnapshot().feedback.batchError,/Synthetic IndexedDB read failed/);
 f.options.readWallet=read;f.notify();w.setMode('manual');await w.saveObservation('12.34',true);
 assert.equal(w.getSnapshot().manual.saved,1);
});

test('P0.2 delayed selection read cannot replace newer selection or clear its busy state',async()=>{
 const f=fixture(),w=f.workflow,held=f.holdRead(),selection=w.select();await held.started.promise;
 f.change();w.setAmount('88.88');const newer=w.getSnapshot().selection.id;
 const next=f.hold(),save=w.saveObservation('88.88');await next.started.promise;
 held.gate.resolve();await selection;assert.equal(w.getSnapshot().selection.id,newer);assert.equal(w.getSnapshot().busy,true);
 next.gate.resolve();await save;assert.equal(w.getSnapshot().manual.saved,1);
});

test('P0.2 persisted away/back generation fences commands even before notification',async()=>{
 const f=fixture(),w=f.workflow;w.setAmount('33.33');f.change(false);f.change(false);
 await w.saveObservation('33.33');assert.equal(profileOf(f.wallet).cards[0].currentBalance,cardA.currentBalance);
 assert.equal(w.getSnapshot().manual.saved,0);assert.equal(w.getSnapshot().feedback.saveError,'');
 f.notify();assert.equal(w.getSnapshot().manual.amount,'');
});

test('P0.2 credential edits invalidate queue/drafts and fence pending clipboard completions',async()=>{
 const f=fixture(),w=f.workflow,held=deferred(),started=deferred();
 f.options.copyText=async()=>{started.resolve();await held.promise;return true;};f.notify();
 w.setAmount('91.11');const oldId=w.getSnapshot().selection.id,copy=w.copy('PIN',cardA.pin);await started.promise;
 f.editCard({pin:'9999'});held.resolve();await copy;
 assert.notEqual(w.getSnapshot().selection.id,oldId);assert.equal(w.getSnapshot().manual.amount,'');
 assert.equal(w.getSnapshot().feedback.copyMessage,'');
 f.editCard({pin:'8888'},false);await w.copy('PIN','9999');assert.equal(f.copied.length,0);
});

test('P0.2 Batch apply preserves durable commit while late success/failure cannot alter new preview, draft or busy state',async()=>{
 for(const fail of [false,true]){
  const f=fixture(),w=f.workflow;await prepare(f);w.setPacket(packet(f));await w.importResults();
  assert.equal(w.getSnapshot().preview.counts.accepted,1);
  const held=f.hold(fail),apply=w.applyResults();await held.started.promise;
  f.change();w.setPacket('NEW RESULT DRAFT');const next=f.holdRead(),selection=w.select();await next.started.promise;
  held.gate.resolve();await apply;
  assert.equal(w.getSnapshot().packet,'NEW RESULT DRAFT');assert.equal(w.getSnapshot().preview,null);
  assert.equal(w.getSnapshot().manual.saved,0);assert.equal(w.getSnapshot().busy,true);
  assert.equal(w.getSnapshot().feedback.batchError,'');assert.equal(w.getSnapshot().feedback.batchMessage,'');
  assert.equal(profileOf(f.wallet).cards[0].currentBalance,fail?cardA.currentBalance:12.34);
  next.gate.resolve();await selection;
 }
});

test('P0.2 Batch abort keeps valid preview and result recovery, then retry advances once',async()=>{
 const f=fixture(),w=f.workflow;await prepare(f);w.setPacket(packet(f));await w.importResults();
 const preview=w.getSnapshot().preview,before=structuredClone(f.wallet),held=f.hold(true),apply=w.applyResults();
 await held.started.promise;held.gate.resolve();await apply;
 assert.deepEqual(f.wallet,before);assert.equal(w.getSnapshot().preview,preview);assert.equal(w.getSnapshot().manual.saved,0);
 await w.applyResults();assert.equal(w.getSnapshot().preview,null);assert.equal(w.getSnapshot().manual.saved,1);
});

test('P0.2 delayed import cannot publish a preview in another workflow',async()=>{
 const f=fixture(),w=f.workflow;await prepare(f);w.setPacket(packet(f));
 const held=f.holdRead(),preview=w.importResults();await held.started.promise;
 f.change();w.setPacket('NEW');held.gate.resolve();await preview;
 assert.equal(w.getSnapshot().packet,'NEW');assert.equal(w.getSnapshot().preview,null);assert.equal(w.getSnapshot().feedback.batchError,'');
});

test('P0.2 late Companion success/failure and cancel preserve newer correlation and busy ownership',async()=>{
 for(const type of ['wallet-transfer-request','wallet-transfer-results','wallet-transfer-cancel'])for(const fail of [false,true]){
  const f=fixture(),w=f.workflow;await prepare(f);await w.sendRequest();
  const started=deferred(),gate=deferred();
  f.sendWith(async message=>{if(message.type!==type)return {};started.resolve();return gate.promise;});
  const pending=type==='wallet-transfer-request'?(await w.cancelTransfer(),w.sendRequest()):type==='wallet-transfer-results'?w.receiveResults():w.cancelTransfer();
  await started.promise;f.sendWith(null);f.change();await prepare(f);await w.sendRequest();
  const correlation=w.getSnapshot().transfer.sessionId,message=w.getSnapshot().feedback.batchMessage;
  const next=f.holdRead(),selection=w.select();await next.started.promise;
  if(fail)gate.reject(Error('Old transport failed'));else gate.resolve({});await pending;
  assert.equal(w.getSnapshot().transfer.sessionId,correlation);assert.equal(w.getSnapshot().feedback.batchMessage,message);
  assert.equal(w.getSnapshot().feedback.batchError,'');assert.equal(w.getSnapshot().busy,true);
  next.gate.resolve();await selection;
 }
});
