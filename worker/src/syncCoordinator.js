import {syncProtocol,fingerprint,snapshotContent,reconcile,emptyEvidence,equal,materialize,validateEvidence} from '../../src/lib/syncProtocol.js';
import {reconcileDuplicates,projectSheetChanges,resumeMaintenance} from '../../src/lib/inventoryRecovery.js';
import {compactEvidence} from '../../src/lib/syncEvidence.js';
const failure=(code,message)=>Object.assign(Error(message),{code});
const publicSnapshot=s=>({cards:s.cards,evidence:s.evidence??emptyEvidence(),version:s.version,fingerprint:s.fingerprint,commitId:s.commitId||'',protocol:syncProtocol,maintenance:s.maintenance===true,...(s.needsRepair?{needsRepair:true}:{}),...(s.diagnostics?{diagnostics:s.diagnostics}: {})});
const controlTime=id=>/^control:(\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z):/.exec(id??'')?.[1];
const monetaryContent=cards=>cards.map(card=>[card.cardNumber,card.pin,card.currentBalance,card.lastBalanceChecked||'',card.lastBalanceCheckedAt||'',card.pendingReconciliation===true,card.used])
  .sort(([a],[b])=>a.localeCompare(b));

// Called only within the DO's explicit promise queue, including every API await.
// Durable storage contains hashes, commit IDs and receipts; never cards or tokens.
export async function coordinate(storage,adapter,request) {
  try{return await coordinateRequest(storage,adapter,request);}
  catch(error){
    // Only a durable, exact rejection permits retiring a local control identity.
    // Any possible dispatch or confirmed receipt takes precedence over rejection.
    if(['ensure','pause','resume'].includes(request.action)&&request.id&&request.protocol===syncProtocol
      &&(!controlTime(request.id)||Date.parse(controlTime(request.id))<=Date.now()+60000)){
      const state=await storage.get('coordination')??{receipts:[],versions:[],maintenance:false};
      const requestHash=await fingerprint(request),known=state.controlRejections?.find(r=>r.id===request.id);
      if(!state.flight&&!state.receipts.some(r=>r.id===request.id)&&(!known||known.requestHash===requestHash)){
        const at=controlTime(request.id);
        if(!known&&!(at&&at<=state.controlRejectionCutoff)){
          state.controlRejections??=[];
          if(!at&&state.controlRejections.filter(r=>!controlTime(r.id)).length>=64)throw failure('upgrade_required','Reload the updated wallet before submitting another control.');
          state.controlRejections.push({id:request.id,requestHash});
          const dated=state.controlRejections.filter(r=>controlTime(r.id)).sort((a,b)=>controlTime(a.id).localeCompare(controlTime(b.id)));
          for(const old of dated.slice(0,-64))state.controlRejectionCutoff=[state.controlRejectionCutoff??'',controlTime(old.id)].sort().at(-1);
          state.controlRejections=state.controlRejections.filter(r=>!controlTime(r.id)||!state.controlRejectionCutoff||controlTime(r.id)>state.controlRejectionCutoff);
          await storage.put('coordination',state);
        }
        error.notDispatched=true;error.rejection={id:request.id,requestHash};
      }
    }
    throw error;
  }
}

async function coordinateRequest(storage,adapter,request) {
  if(request.protocol!==syncProtocol)throw failure('upgrade_required','Reload the updated wallet before syncing.');
  const persisted=await storage.get('coordination');
  let state=persisted??{receipts:[],versions:[],maintenance:false};
  const rejected=state.controlRejections?.find(r=>r.id===request.id);
  if(rejected)throw failure('control_rejected',rejected.requestHash===await fingerprint(request)?'This control request was rejected before dispatch. Review the problem and submit the intended action again.':'Control identity was reused with different content.');
  const createdAt=controlTime(request.id);
  const read=()=>adapter.read();
  let remote=await read();
  if(!persisted)state.maintenance=remote.maintenance===true;
  const recover=async()=>{
    if(!state.flight)return;
    const flight=state.flight;
    // A missing marker is NOT proof a dispatched write cannot still complete.
    if(remote.commitId!==flight.id||remote.fingerprint!==flight.fingerprint||remote.protocol!==syncProtocol||remote.maintenance!==flight.maintenance||await fingerprint(snapshotContent(remote))!==flight.fingerprint)throw failure('uncertain','A prior Sheet write is uncertain. Local work is preserved; Sheet writes are suspended.');
    const receipt={id:flight.id,requestHash:flight.requestHash,fingerprint:flight.fingerprint,version:remote.version};
    state.receipts.push(receipt);
    const pruned=state.receipts.slice(0,-64);state.receipts=state.receipts.slice(-64);
    state.versions.push({version:remote.version,fingerprint:remote.fingerprint});state.versions=state.versions.slice(-64);
    state.maintenance=remote.maintenance===true;state.evidenceHash=flight.evidenceHash;
    state.monetaryHash=flight.monetaryHash??await fingerprint(monetaryContent(remote.cards));
    delete state.repair;
    const operationHashes=flight.operationHashes??{};
    delete state.flight;
    // Keep each noncredential storage value comfortably below 128 KiB.
    // Receipt/index and operation hash pruning commit together.
    await storage.transaction(async txn=>{
      await txn.put('operations:'+receipt.id,operationHashes);
      await txn.put('coordination',state);
      for(const old of pruned)await txn.delete('operations:'+old.id);
    });
  };
  await recover();
  if(remote.maintenance!==state.maintenance && !['pause','resume'].includes(request.action))throw failure('direct_edit','Maintenance metadata changed outside the coordinator. Preserve a backup and review it.');
  if(remote.protocol&&remote.protocol!==syncProtocol)throw failure('upgrade_required','The Sheet uses an incompatible synchronization protocol.');
  if(state.receipts.length&&(!remote.protocol||!remote.fingerprint||!remote.commitId)&&!['pause','resume'].includes(request.action))throw failure('direct_edit','Commit metadata was removed outside shared maintenance.');
  if(state.evidenceHash&&await fingerprint(remote.evidence)!==state.evidenceHash)throw failure('evidence_changed','Managed recovery evidence changed outside the coordinator. Restore the preserved _META evidence.');
  const original=remote,actual=await fingerprint(snapshotContent(remote));
  const drift=Boolean(remote.fingerprint&&actual!==remote.fingerprint);
  if(!state.monetaryHash&&!drift&&state.receipts.length){
    state.monetaryHash=await fingerprint(monetaryContent(remote.cards));await storage.put('coordination',state);
  }
  const knownBase=request.base&&await fingerprint(snapshotContent(request.base))===request.base.fingerprint
    &&((request.base.version===remote.version&&request.base.fingerprint===remote.fingerprint)
      ||state.versions.some(v=>v.version===request.base.version&&v.fingerprint===request.base.fingerprint));
  const repairBase=knownBase&&request.base.version===remote.version&&state.versions.some(v=>v.version===request.base.version&&v.fingerprint===request.base.fingerprint&&v.repair);
  const sameProjection=repairBase&&state.repair?.fingerprint===actual&&state.repair.projectionFingerprint===request.base.fingerprint;
  const hasDuplicates=new Set(remote.cards.map(card=>card.cardNumber)).size!==remote.cards.length;
  if((drift||hasDuplicates)&&state.repair?.fingerprint!==actual){
    state.repair={fingerprint:actual,at:new Date().toISOString(),id:crypto.randomUUID()};await storage.put('coordination',state);
  }
  let projected=reconcileDuplicates(remote.cards,repairBase?request.base.evidence:remote.evidence,state.repair?.at,state.repair?.id);
  const monetaryUnchanged=state.monetaryHash&&state.monetaryHash===await fingerprint(monetaryContent(projected.cards));
  if(drift&&!knownBase&&!monetaryUnchanged&&!state.maintenance&&!['pause','resume'].includes(request.action)
    &&await fingerprint(snapshotContent(projected))!==remote.fingerprint)
    throw failure('direct_edit','Sheet contents changed without a retained baseline. Pause maintenance to accept the changes.');
  if(sameProjection)projected={...projected,cards:structuredClone(request.base.cards),evidence:structuredClone(request.base.evidence)};
  else if(drift&&knownBase&&!monetaryUnchanged&&!state.maintenance){
    if(!repairBase&&(request.base.version!==remote.version||request.base.fingerprint!==remote.fingerprint))
      throw failure('direct_edit','Current monetary changes cannot be classified from this stale baseline. Pause maintenance to preserve and accept them.');
    // A registered repair baseline may contain alternatives not written yet.
    // Preserve that exact, independently hashed plan across another direct edit.
    projected=projectSheetChanges(projected,request.base,state.repair.at,actual);
  }
  remote={...remote,cards:projected.cards,evidence:projected.evidence};
  remote.fingerprint=await fingerprint(snapshotContent(remote));
  remote.needsRepair=drift||!equal(snapshotContent(original),snapshotContent(remote));
  if(remote.needsRepair&&!state.versions.some(v=>v.version===remote.version&&v.fingerprint===remote.fingerprint)){
    state.versions.push({version:remote.version,fingerprint:remote.fingerprint,repair:true});state.versions=state.versions.slice(-64);
    state.repair={...state.repair,projectionFingerprint:remote.fingerprint};
    await storage.put('coordination',state);
  }
  if(request.action==='pull')return {snapshot:publicSnapshot(remote)};
  if(!request.id)throw failure('invalid','Missing durable commit identity.');
  const requestHash=await fingerprint(request);
  const previous=state.receipts.find(r=>r.id===request.id);
  if(previous){
    if(previous.requestHash!==requestHash)throw failure('reused_id','Commit identity was reused with different content.');
    // Never acknowledge an old receipt with a newer, unrelated snapshot.
    return {snapshot:publicSnapshot(remote),acknowledged:request.operations?.map(o=>o.id)??[],receipt:previous};
  }
  if(createdAt&&(createdAt<=state.controlRejectionCutoff||Date.parse(createdAt)>Date.now()+60000))throw failure('control_rejected','This control is outside the retained recovery window. Review and submit the intended action again.');
  if(state.maintenance&&!['resume','pause'].includes(request.action))throw failure('maintenance','Shared Sheet maintenance is paused. Local changes remain saved.');
  let candidate={cards:remote.cards,evidence:structuredClone(remote.evidence??emptyEvidence())};
  const operationHashes={};
  if(request.action==='commit'){
    if(!request.base||!Array.isArray(request.cards)||!Array.isArray(request.operations))throw failure('baseline_required','Establish a remote baseline before sending changes.');
    if(await fingerprint(snapshotContent(request.base))!==request.base.fingerprint)throw failure('invalid_base','The saved baseline fingerprint is invalid.');
    const known=request.base.version===remote.version&&request.base.fingerprint===remote.fingerprint
      ||state.versions.some(v=>v.version===request.base.version&&v.fingerprint===request.base.fingerprint);
    if(!known)throw failure('baseline_expired','The saved baseline is too old or unknown. Preserve a backup and explicitly recover it against a fresh Sheet read.');
    const groups=state.receipts.length?await storage.get(state.receipts.map(r=>'operations:'+r.id)):new Map();
    const unseen=[];
    for(const op of request.operations){
      const key=await fingerprint(op.id),hash=await fingerprint(op);
      const prior=[...groups.values()].map(group=>group?.[key]).find(Boolean);
      if(prior&&prior!==hash)throw failure('reused_id','Operation identity was reused with different content.');
      operationHashes[key]=hash;if(!prior)unseen.push(op);
    }
    candidate=reconcile({base:request.base.cards,local:materialize(request.base.cards,unseen),remote:remote.cards,operations:unseen,
      baseEvidence:request.base.evidence,evidence:remote.evidence});
  }else if(request.action==='pause'){
    if(state.maintenance)throw failure('maintenance','Shared Sheet maintenance is already paused.');
    state.maintenance=true;state.maintenanceEvidenceHash=await fingerprint(candidate.evidence);
    // The private Sheet retains original timestamps in the same bounded evidence
    // representation as recovery. The DO needs only their aggregate evidence hash.
    candidate.evidence.maintenanceCards=Object.fromEntries(remote.cards.map(c=>[c.cardNumber,{...c}]));
    state.maintenanceEvidenceHash=await fingerprint(candidate.evidence);
  }else if(request.action==='resume'){
    if(!state.maintenance)throw failure('maintenance_required','Pause shared maintenance before accepting direct edits.');
    if(state.maintenanceEvidenceHash&&await fingerprint(remote.evidence)!==state.maintenanceEvidenceHash)throw failure('evidence_changed','Managed recovery evidence changed during maintenance. Restore the preserved _META evidence before resuming.');
    const resumedAt=new Date().toISOString();
    if(candidate.evidence.maintenanceCards){
      resumeMaintenance(candidate,{deletedIds:request.deletedIds,id:request.id,now:resumedAt});
    }else if(state.maintenanceVerificationProofs){
      const actualProofs={};
      for(const card of remote.cards) if(card.lastBalanceCheckedAt) actualProofs[await fingerprint(card.cardNumber)]=await fingerprint([card.lastBalanceChecked,card.lastBalanceCheckedAt]);
      const deleted=new Set(await Promise.all((request.deletedIds??[]).map(number=>fingerprint(number))));
      for(const [key,proof] of Object.entries(state.maintenanceVerificationProofs)) if(!deleted.has(key)&&actualProofs[key]!==proof)
        throw failure('verification_changed','Precise verification details changed during maintenance. Restore them from a private backup before resuming.');
    }
    // Deletion is explicit and fenced; absence by itself never creates a tombstone.
    for(const number of request.deletedIds??[]){
      if(!/^63\d{14}$/.test(number)||remote.cards.some(c=>c.cardNumber===number))throw failure('invalid_deletion','Remove the exact row during maintenance before explicitly confirming its deletion.');
      candidate.evidence.tombstones[number]={id:request.id+':'+number,at:new Date().toISOString()};
    }
    candidate.evidence.maintenanceAt=resumedAt;
    delete state.maintenanceVerificationProofs;
    state.maintenance=false;
  }else if(request.action!=='ensure')throw failure('invalid','Unknown synchronization action.');
  candidate.cards.sort((a,b)=>a.cardNumber.localeCompare(b.cardNumber));
  candidate.evidence=compactEvidence(candidate.evidence);
  validateEvidence(candidate.evidence);
  if(request.action==='commit'&&equal(snapshotContent(candidate),snapshotContent(remote))){
    // Still write commit evidence so even no-op acknowledgments have durable proof.
  }
  await adapter.prepare?.({...candidate,maintenance:state.maintenance},remote);
  const checked=await read();
  if(checked.version!==original.version||!equal(snapshotContent(checked),snapshotContent(original))||!equal(checked.internal,original.internal)||checked.maintenance!==original.maintenance)throw failure('remote_changed','Sheet changed before dispatch. Recheck synchronization.');
  const contentFingerprint=await fingerprint(snapshotContent(candidate));
  const id=request.id;
  if(!state.versions.some(v=>v.version===remote.version&&v.fingerprint===remote.fingerprint))state.versions.push({version:remote.version,fingerprint:remote.fingerprint});
  state.versions=state.versions.slice(-64);
  state.flight={id,requestHash,operationHashes,evidenceHash:await fingerprint(candidate.evidence),monetaryHash:await fingerprint(monetaryContent(candidate.cards)),fingerprint:contentFingerprint,phase:'possible-dispatch',maintenance:state.maintenance};
  // Persist BEFORE calling an external write. A restart cannot permit a blind retry.
  await storage.put('coordination',state);
  try{await adapter.write({...candidate,maintenance:state.maintenance},id,contentFingerprint,remote);}catch{
    throw failure('uncertain','Sheet write outcome is uncertain. Local work is preserved; use Sync now to check commit evidence.');
  }
  remote=await read();
  await recover();
  if(remote.commitId!==id||remote.fingerprint!==contentFingerprint||await fingerprint(snapshotContent(remote))!==contentFingerprint)throw failure('uncertain','Sheet commit content could not be confirmed.');
  return {snapshot:publicSnapshot(remote),acknowledged:request.operations?.map(o=>o.id)??[],receipt:state.receipts.at(-1)};
}

export class SerialCoordinator {
  constructor(storage,adapter){this.storage=storage;this.adapter=adapter;this.tail=Promise.resolve();}
  run(request){const result=this.tail.then(()=>coordinate(this.storage,this.adapter,request));this.tail=result.then(()=>undefined,()=>undefined);return result;}
}
