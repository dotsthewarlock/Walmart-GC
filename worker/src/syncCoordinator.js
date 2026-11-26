import {syncProtocol,fingerprint,snapshotContent,reconcile,emptyEvidence,equal,materialize} from '../../src/lib/syncProtocol.js';
const failure=(code,message)=>Object.assign(Error(message),{code});
const publicSnapshot=s=>({cards:s.cards,evidence:s.evidence??emptyEvidence(),version:s.version,fingerprint:s.fingerprint,commitId:s.commitId||'',protocol:syncProtocol,maintenance:s.maintenance===true});

// Called only within the DO's explicit promise queue, including every API await.
// Durable storage contains hashes, commit IDs and receipts; never cards or tokens.
export async function coordinate(storage,adapter,request) {
  if(request.protocol!==syncProtocol)throw failure('upgrade_required','Reload the updated wallet before syncing.');
  const persisted=await storage.get('coordination');
  let state=persisted??{receipts:[],versions:[],maintenance:false};
  let remote=await adapter.read();
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
  const actual=await fingerprint(snapshotContent(remote));
  if(remote.fingerprint&&actual!==remote.fingerprint&&!state.maintenance&&request.action!=='pause')throw failure('direct_edit','Sheet contents changed outside the wallet. Pause maintenance before accepting direct edits.');
  remote.fingerprint=actual;
  if(request.action==='pull')return {snapshot:publicSnapshot(remote)};
  if(!request.id)throw failure('invalid','Missing durable commit identity.');
  const requestHash=await fingerprint(request);
  const previous=state.receipts.find(r=>r.id===request.id);
  if(previous){
    if(previous.requestHash!==requestHash)throw failure('reused_id','Commit identity was reused with different content.');
    // Never acknowledge an old receipt with a newer, unrelated snapshot.
    return {snapshot:publicSnapshot(remote),acknowledged:request.operations?.map(o=>o.id)??[],receipt:previous};
  }
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
    const proofs={};
    for(const card of remote.cards) if(card.lastBalanceCheckedAt) proofs[await fingerprint(card.cardNumber)]=await fingerprint([card.lastBalanceChecked,card.lastBalanceCheckedAt]);
    if(new TextEncoder().encode(JSON.stringify(proofs)).length>64000)throw failure('maintenance_proof_full','Too many precise verification records to safely pause maintenance.');
    state.maintenanceVerificationProofs=proofs;
  }else if(request.action==='resume'){
    if(!state.maintenance)throw failure('maintenance_required','Pause shared maintenance before accepting direct edits.');
    if(state.maintenanceEvidenceHash&&await fingerprint(remote.evidence)!==state.maintenanceEvidenceHash)throw failure('evidence_changed','Managed recovery evidence changed during maintenance. Restore the preserved _META evidence before resuming.');
    if(state.maintenanceVerificationProofs){
      const actualProofs={};
      for(const card of remote.cards) if(card.lastBalanceCheckedAt) actualProofs[await fingerprint(card.cardNumber)]=await fingerprint([card.lastBalanceChecked,card.lastBalanceCheckedAt]);
      const deleted=new Set(await Promise.all((request.deletedIds??[]).map(number=>fingerprint(number))));
      for(const [key,proof] of Object.entries(state.maintenanceVerificationProofs)) if(!deleted.has(key)&&actualProofs[key]!==proof)
        throw failure('verification_changed','Precise verification details changed during maintenance. Restore them from a private backup before resuming.');
    } else if(remote.cards.some(card=>card.lastBalanceCheckedAt)) throw failure('verification_unproven','Verification details cannot be confirmed for this older maintenance session. Preserve a private backup and use controlled recovery.');
    // Deletion is explicit and fenced; absence by itself never creates a tombstone.
    for(const number of request.deletedIds??[]){
      if(!/^63\d{14}$/.test(number)||remote.cards.some(c=>c.cardNumber===number))throw failure('invalid_deletion','Remove the exact row during maintenance before explicitly confirming its deletion.');
      candidate.evidence.tombstones[number]={id:request.id+':'+number,at:new Date().toISOString()};
    }
    candidate.evidence.maintenanceAt=new Date().toISOString();
    delete state.maintenanceVerificationProofs;
    state.maintenance=false;
  }else if(request.action!=='ensure')throw failure('invalid','Unknown synchronization action.');
  if(request.action==='commit'&&equal(snapshotContent(candidate),snapshotContent(remote))){
    // Still write commit evidence so even no-op acknowledgments have durable proof.
  }
  await adapter.prepare?.(candidate,remote);
  const checked=await adapter.read();
  if(checked.version!==remote.version||!equal(snapshotContent(checked),snapshotContent(remote))||!equal(checked.internal,remote.internal)||checked.maintenance!==remote.maintenance)throw failure('remote_changed','Sheet changed before dispatch. Recheck synchronization.');
  const contentFingerprint=await fingerprint(snapshotContent(candidate));
  const id=request.id;
  if(!state.versions.some(v=>v.version===remote.version&&v.fingerprint===remote.fingerprint))state.versions.push({version:remote.version,fingerprint:remote.fingerprint});
  state.versions=state.versions.slice(-64);
  state.flight={id,requestHash,operationHashes,evidenceHash:await fingerprint(candidate.evidence),fingerprint:contentFingerprint,phase:'possible-dispatch',maintenance:state.maintenance};
  // Persist BEFORE calling an external write. A restart cannot permit a blind retry.
  await storage.put('coordination',state);
  try{await adapter.write({...candidate,maintenance:state.maintenance},id,contentFingerprint,remote);}catch{
    throw failure('uncertain','Sheet write outcome is uncertain. Local work is preserved; use Sync now to check commit evidence.');
  }
  remote=await adapter.read();
  await recover();
  if(remote.commitId!==id||remote.fingerprint!==contentFingerprint||await fingerprint(snapshotContent(remote))!==contentFingerprint)throw failure('uncertain','Sheet commit content could not be confirmed.');
  return {snapshot:publicSnapshot(remote),acknowledged:request.operations?.map(o=>o.id)??[],receipt:state.receipts.at(-1)};
}

export class SerialCoordinator {
  constructor(storage,adapter){this.storage=storage;this.adapter=adapter;this.tail=Promise.resolve();}
  run(request){const result=this.tail.then(()=>coordinate(this.storage,this.adapter,request));this.tail=result.then(()=>undefined,()=>undefined);return result;}
}
