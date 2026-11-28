import {profileOf, inventoryContext, inventoryBytes, assertInventoryContext} from '../../lib/inventory.js';
import {selectTransferCards, transferEligibleCards, formatTransferRequest, transferRequestRows,
 parseTransferResults, previewTransferResults} from '../../lib/balanceTransfer.js';
import {createTransferLedger, prepareTransferApplication} from '../../lib/balanceTransferLedger.js';
import {verificationCards} from '../../lib/inventoryRecovery.js';
import {parseVerifiedBalance} from '../../lib/balanceReview.js';
import {sendCompanion} from '../../lib/companionTransport.js';
import {openVerificationSession, assertVerificationSession} from './verificationCommands.js';

const emptyManual=()=>({position:0,saved:0,amount:'',completed:[]});
const emptyFeedback=()=>({selectionError:'',inputError:'',saveError:'',copyMessage:'',batchError:'',batchMessage:''});
const scopeOf=wallet=>wallet?`${wallet.active}:${wallet.contextGeneration??0}`:null;
class SupersededVerification extends Error {}
const initialState=preferences=>({preferences,mode:'manual',flaggedOnly:false,selection:null,
 manual:emptyManual(),packet:'',preview:null,transfer:null,busy:false,feedback:emptyFeedback()});

// One controller per App, with no persistence authority. Views subscribe to its
// snapshot; command lifetime and completion ownership never depend on mounting.
export function createVerificationWorkflow(preferences){
 let state=initialState(preferences),options={},wallet=null,scope=null,epoch={},operation=null,copyAction=null,pendingObservation=null,started=false;
 const listeners=new Set();
 function publish(patch){state={...state,...patch};for(const notify of listeners)notify();}
 function feedback(patch){publish({feedback:{...state.feedback,...patch}});}
 function capture(source,queue,refs=null){return {id:crypto.randomUUID(),queue,versions:{...profileOf(source).versions},context:inventoryContext(source),refs};}
 function counts(source=wallet){const p=profileOf(source);return selectTransferCards(verificationCards(p),{...state.preferences,flaggedOnly:state.flaggedOnly},new Date(),p.recoveryEvidence,p.pending);}
 function restore(){
  if(!started||!wallet||state.selection)return;
  const p=profileOf(wallet),refs=new Set(p.batchSelection??[]);
  const requests=!state.flaggedOnly&&!p.ledgerRecovery&&!p.ledger?.application?p.ledger?.requests.filter(r=>refs.has(r.ref)&&r.state==='pending')??[]:[];
  const eligible=new Map(transferEligibleCards(verificationCards(p)).map(entry=>[entry.card.cardNumber,entry]));
  const queue=requests.map(r=>eligible.get(r.cardNumber)).filter(Boolean);
  publish({selection:queue.length?capture(wallet,queue,requests.map(r=>r.ref)):capture(wallet,counts().selected)});
 }
 function reset(patch={}){
  const transfer=state.transfer,send=options.sendCompanion??sendCompanion;
  epoch={};operation=null;copyAction=null;pendingObservation=null;
  publish({...initialState(state.preferences),mode:state.mode,flaggedOnly:state.flaggedOnly,...patch});
  if(transfer)void send({type:'wallet-transfer-cancel',version:1,sessionId:transfer.sessionId}).catch(()=>{});
 }
 function configure(next){
  options=next;
  const nextWallet=next.walletSnapshot,nextScope=scopeOf(nextWallet);
  const eligible=nextWallet?new Map(verificationCards(profileOf(nextWallet)).map(card=>[card.cardNumber,card])):null;
  const changedCredentials=state.selection?.queue.some(({snapshot:card})=>{
   const current=eligible?.get(card.cardNumber);return !current||current.pin!==card.pin;
  });
  wallet=nextWallet;
  if(scope!==nextScope||changedCredentials){scope=nextScope;reset();}
  restore();
 }
 function token(){return {epoch,selection:state.selection?.id,context:wallet&&inventoryContext(wallet),options:{...options},snapshot:state};}
 function current(target){return target.epoch===epoch&&target.selection===state.selection?.id;}
 function assertCurrent(target){if(!current(target))throw new SupersededVerification('Verification workflow changed.');}
 async function assertSaved(target){
  assertCurrent(target);
  const saved=await target.options.readWallet();
  assertCurrent(target);
  try{assertInventoryContext(saved,target.context);}catch{throw new SupersededVerification('Inventory context changed.');}
  // A notification can lag an IndexedDB credential edit; do not export stale PINs.
  const eligible=new Map(verificationCards(profileOf(saved)).map(card=>[card.cardNumber,card]));
  if(target.snapshot.selection?.queue.some(({snapshot:card})=>eligible.get(card.cardNumber)?.pin!==card.pin))throw new SupersededVerification('Selected credentials changed. Select cards again.');
  return saved;
 }
 async function run(channel,action){
  if(operation||!wallet)return;
  const target=token();operation=target;publish({busy:true});
  feedback(channel==='batch'?{batchError:'',batchMessage:''}:channel==='selection'?{selectionError:''}:{saveError:''});
  const isCurrent=()=>operation===target&&current(target);
  const check=()=>{if(!isCurrent())throw new SupersededVerification('Verification workflow changed.');};
  const guard=async()=>{check();const saved=await assertSaved(target);check();return saved;};
  const command=async value=>{await guard();return target.options.commitWallet(value,isCurrent);};
  try{await guard();await action({target,guard,check,command,isCurrent});}
  catch(error){
   // Read the saved context too: an away/back switch can precede notification.
   if(isCurrent()&&!(error instanceof SupersededVerification)){
    let superseded=false;
    try{await guard();}catch(validation){superseded=validation instanceof SupersededVerification;}
    // A failed read is an owned failure, not proof of a context change.
    if(!superseded&&isCurrent())feedback({[channel==='batch'?'batchError':channel==='selection'?'selectionError':'saveError']:error.message});
   }
  }finally{if(isCurrent()){operation=null;publish({busy:false});}}
 }
 function batchOptions(task){return {...task.target.options,commitWallet:task.command,assertActive:task.check};}
 async function opened(task){const session=await openVerificationSession(batchOptions(task));await task.guard();return session;}
 async function assertBatch(task,session){await assertVerificationSession(session,batchOptions(task));await task.guard();}
 function buildPreview(session,results){
  if(!session.ledger)throw Error('There is no saved request for these results. Create a new batch.');
  if(session.ledger.application)throw Error('Resolve the interrupted application first.');
  const now=Date.now();
  return {...previewTransferResults(session.ledger,session.previewCards,results,now,session.profile.recoveryEvidence,session.profile.pending),
   context:inventoryContext(session.state),results,now,ledgerRaw:JSON.stringify(session.ledger),inventoryRaw:session.inventoryRaw};
 }
 function advance(manual=state.manual){
  let position=manual.position+1;
  while(state.selection?.queue[position]&&manual.completed.includes(state.selection.queue[position].snapshot.cardNumber))position++;
  copyAction=null;pendingObservation=null;
  publish({manual:{...manual,position,amount:''},feedback:{...state.feedback,inputError:'',saveError:'',copyMessage:''}});
 }
 const api={
  subscribe(notify){listeners.add(notify);return()=>listeners.delete(notify);},getSnapshot:()=>state,configure,
  enter(){started=true;restore();},
  setPreferences(value){if(!state.busy)publish({preferences:typeof value==='function'?value(state.preferences):value});},
  setMode(mode){if(!state.busy)publish({mode});},
  setFlaggedOnly(flaggedOnly){if(!state.busy)publish({flaggedOnly});},
  setPacket(packet){if(!state.busy)publish({packet,preview:null});},
  setAmount(amount){if(!state.busy){pendingObservation=null;publish({manual:{...state.manual,amount}});feedback({inputError:''});}},
  startFlaggedReview(){started=true;reset({mode:'manual',flaggedOnly:true});restore();},
  select(prepare=false){return run('selection',async task=>{
   const ui=task.target.snapshot,batch=ui.mode==='batch';
   const session=batch?await opened(task):null;
   const saved=session?.state??await task.guard(),p=profileOf(saved);
   const selected=prepare?ui.selection.queue.filter(entry=>!ui.manual.completed.includes(entry.card.cardNumber)):
    selectTransferCards(verificationCards(p),{...ui.preferences,flaggedOnly:ui.flaggedOnly},new Date(),p.recoveryEvidence,p.pending).selected;
   if(prepare){assertInventoryContext(saved,ui.selection.context);if(selected.some(entry=>p.versions[entry.card.cardNumber]!==ui.selection.versions[entry.card.cardNumber]))throw Error('Selected cards changed. Select cards again before preparing requests.');}
   let refs=null;
   if(batch){
    const ledger=await createTransferLedger(session.context,selected,inventoryBytes(saved),undefined,p.ledger?.id);
    await assertBatch(task,session);
    await task.command({kind:'set-batch',...inventoryContext(saved),revision:p.revision,ledger});
    await task.guard();refs=ledger.requests.map(r=>r.ref);
   }
   await task.guard();
   // Finish the old command before replacing its workflow identity.
   const transfer=state.transfer;
   if(transfer)void (task.target.options.sendCompanion??sendCompanion)({type:'wallet-transfer-cancel',version:1,sessionId:transfer.sessionId}).catch(()=>{});
   operation=null;copyAction=null;pendingObservation=null;
   publish({busy:false,selection:prepare?{...ui.selection,refs}:capture(saved,selected,refs),
    manual:prepare?state.manual:emptyManual(),preview:null,transfer:null,feedback:emptyFeedback()});
  });},
  skip(){if(!state.busy)advance();},
  saveObservation(value,fromInput=false){
   if(state.busy||!state.selection?.queue[state.manual.position])return;
   let verifiedBalance;try{verifiedBalance=parseVerifiedBalance(value);}catch(error){feedback({[fromInput?'inputError':'saveError']:error.message});return;}
   if(pendingObservation?.value!==value)pendingObservation={value,checkedAt:new Date().toISOString()};
   const checkedAt=pendingObservation.checkedAt;
   return run('manual',async task=>{
    const ui=task.target.snapshot,card=ui.selection.queue[ui.manual.position].snapshot;
    await task.command({kind:'manual-verification',...ui.selection.context,cardNumber:card.cardNumber,
     version:ui.selection.versions[card.cardNumber],observation:{observedBalance:verifiedBalance,checkedAt}});
    await task.guard();
    advance({...ui.manual,saved:ui.manual.saved+1,completed:[...ui.manual.completed,card.cardNumber]});
   });
  },
  async copy(label,value){
   const target=token(),action={};copyAction=action;feedback({copyMessage:''});
   const position=state.manual.position;
   const isCurrent=()=>current(target)&&copyAction===action&&state.manual.position===position;
   let copied=false;try{await assertSaved(target);if(!isCurrent())return;copied=await target.options.copyText(value,isCurrent);}catch{/* report only to the originating task */}
   try{await assertSaved(target);}catch(error){if(current(target)&&copyAction===action&&!(error instanceof SupersededVerification))feedback({copyMessage:`${label} copy failed. Try again.`});return;}
   if(copyAction!==action||state.manual.position!==position)return;
   feedback({copyMessage:copied?`${label} copied.`:`${label} copy failed. Try again.`});
  },
  copyRequest(){return run('batch',async task=>{
   const session=await opened(task),ui=task.target.snapshot;
   if(!session.ledger)throw Error('Create a batch before copying a request.');
   if(!ui.selection?.refs)throw Error('Prepare selected cards before copying a request.');
   const rows=transferRequestRows(session.ledger,session.previewCards,ui.selection.refs);
   await assertBatch(task,session);
   const copied=await task.target.options.copyText(formatTransferRequest(rows),task.isCurrent);
   await task.guard();if(!copied)throw Error('Clipboard access failed. Try Copy selected cards again.');
   feedback({batchMessage:`Copied ${rows.length} requests. Paste them into the Companion.`});
  });},
  sendRequest(){return run('batch',async task=>{
   const session=await opened(task),ui=task.target.snapshot;
   if(!session.ledger||!ui.selection?.refs)throw Error('Prepare selected cards before sending a request.');
   const rows=transferRequestRows(session.ledger,session.previewCards,ui.selection.refs),sessionId=crypto.randomUUID();
   await assertBatch(task,session);
   publish({transfer:{sessionId,context:inventoryContext(session.state)}});
   await (task.target.options.sendCompanion??sendCompanion)({type:'wallet-transfer-request',version:1,sessionId,packet:formatTransferRequest(rows)});
   await task.guard();await assertBatch(task,session);
   feedback({batchMessage:'Request sent. Open the Walmart checker, receive Wallet cards in the extension, then explicitly start checking.'});
  });},
  receiveResults(){return run('batch',async task=>{
   const transfer=task.target.snapshot.transfer;if(!transfer)return;
   const reply=await (task.target.options.sendCompanion??sendCompanion)({type:'wallet-transfer-results',version:1,sessionId:transfer.sessionId});
   await task.guard();
   if(!reply.packet){feedback({batchMessage:'No results returned yet. Existing requests remain saved.'});return;}
   const results=parseTransferResults(reply.packet),session=await opened(task);
   assertInventoryContext(session.state,transfer.context);
   publish({preview:buildPreview(session,results)});feedback({batchMessage:'Companion observations received. Review before applying.'});
  });},
  cancelTransfer(){return run('batch',async task=>{
   const transfer=task.target.snapshot.transfer;if(!transfer)return;
   try{await (task.target.options.sendCompanion??sendCompanion)({type:'wallet-transfer-cancel',version:1,sessionId:transfer.sessionId});}
   finally{await task.guard();publish({transfer:null});feedback({batchMessage:'Transfer ended. Saved requests and observations remain available for fallback.'});}
  });},
  discardBatch(){return run('batch',async task=>{
   const displayed=task.target.options.walletSnapshot;
   if(!(task.target.options.confirm??globalThis.confirm)('Discard this Batch and its outstanding request references? Saved cards and archived recovery evidence will be preserved.'))return;
   await task.command({kind:'discard-batch',...inventoryContext(displayed),revision:profileOf(displayed).revision});
   await task.guard();publish({preview:null,packet:''});feedback({batchMessage:'Batch discarded. Recovery evidence remains preserved.'});
  });},
  importResults(){return run('batch',async task=>{
   const results=parseTransferResults(task.target.snapshot.packet),session=await opened(task);
   publish({preview:buildPreview(session,results),packet:''});
  });},
  applyResults(){return run('batch',async task=>{
   const prior=task.target.snapshot.preview;if(!prior?.counts.accepted)return;
   const session=await opened(task),fresh=buildPreview(session,prior.results);
   assertInventoryContext(session.state,prior.context);
   if(prior.ledgerRaw!==fresh.ledgerRaw||prior.inventoryRaw!==fresh.inventoryRaw||JSON.stringify(prior.items)!==JSON.stringify(fresh.items)){
    publish({preview:fresh});feedback({batchMessage:'The preview changed. Review the updated results before applying.'});return;
   }
   const accepted=fresh.items.filter(item=>item.outcome==='accepted');
   const prepared=await prepareTransferApplication(session.ledger,fresh.candidate,accepted);
   await assertBatch(task,session);
   await task.command({kind:'apply-batch',...inventoryContext(session.state),revision:session.profile.revision,
    ledgerId:session.ledger.id,observations:fresh.results,items:fresh.items,now:fresh.now,inventoryDigest:prepared.finalized.inventoryDigest});
   await task.guard();
   const ui=task.target.snapshot,queue=ui.selection?.queue??[],selected=new Set(queue.map(entry=>entry.snapshot.cardNumber));
   const completed=[...new Set([...ui.manual.completed,...accepted.map(item=>item.cardNumber).filter(number=>selected.has(number))])];
   let position=ui.manual.position;while(queue[position]&&completed.includes(queue[position].snapshot.cardNumber))position++;
   copyAction=null;
   publish({manual:{...ui.manual,completed,saved:completed.length,position,amount:position!==ui.manual.position?'':ui.manual.amount},preview:null});
   feedback({copyMessage:'',batchMessage:`Applied ${accepted.length} locally (${fresh.counts.changed} balances changed, ${fresh.counts.unchanged} unchanged). Verification dates were recorded. ${fresh.outstanding-accepted.length} requests remain outstanding. Sheet synchronization is pending confirmation.`});
  });},
 };
 return api;
}
