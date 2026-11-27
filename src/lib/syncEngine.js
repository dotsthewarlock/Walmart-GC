import {inventoryContext,assertInventoryContext,profileOf,operationId} from './inventory.js';
import {syncProtocol,fingerprint,snapshotContent,materialize,validateEvidence,equal} from './syncProtocol.js';
import { recoverySummary } from './reconciliationPolicy.js';

// All local write commands finish before the coalesced push. No work is promised
// after the page closes. In-flight request bytes/identity survive a process exit.
export function createSyncEngine({store,request,onState=()=>{},onStatus=()=>{},onAuth=()=>{},timers=globalThis,automatic=()=>true,visible=()=>typeof document==='undefined'||document.visibilityState==='visible',now=()=>Date.now()}) {
  let running=false,again=false,stopped=false,timer,retryTimer,queuedAt=null,attempts=0,lastPrincipal,lastAttempt=-Infinity,lastManual=-Infinity,lastCheck=-Infinity,lastContext='',retryNotBefore=0,initialBind=true;
  const autoAllowed=()=>!stopped&&automatic()&&visible();
  const pending=state=>{const p=profileOf(state);return p.context.ownershipVerified===true&&Boolean(p.inFlight||p.pending.length||p.remoteBase?.needsRepair||state.controlFlights?.[p.context.principal]);};
  const commit=async command=>{const state=await store.commit({id:operationId(),...command});onState(state);return state;};
  async function observeIdentity(state,status){
    const identity=status.authenticated?status.principal||null:null;
    const previous=lastPrincipal===undefined?profileOf(state).context.principal||null:lastPrincipal;
    if(previous!==identity)state=await commit({kind:'begin-context',...inventoryContext(state)});
    lastPrincipal=identity;return state;
  }
  async function verifySnapshot(result,principal,sheetId){
    validateEvidence(result.snapshot?.evidence);
    if(result.principal!==principal||result.sheetId!==sheetId||result.snapshot?.protocol!==syncProtocol
      ||await fingerprint(snapshotContent(result.snapshot))!==result.snapshot.fingerprint)throw Error('The response did not confirm the exact account, Sheet and content. Local work remains saved.');
  }
  async function bindSnapshot(state,principal,sheetId,snapshot){
    state=await commit({kind:'bind-remote',...inventoryContext(state),principal,sheetId,snapshot});
    const profile=profileOf(state);
    if(!profile.pending.length&&!profile.inFlight&&!equal(profile.remoteBase,snapshot))
      state=await commit({kind:'sync-pull',...inventoryContext(state),revision:profile.revision,snapshot});
    return state;
  }
  async function performControl(state,status,action,details={}) {
    const context=inventoryContext(state);
    if(!status.authenticated||!status.principal||!status.ownershipVerified||status.syncProtocol!==syncProtocol||!status.coordinationAvailable)throw Error('Verified Google access and protected coordination are required.');
    const saved=state.controlFlights?.[status.principal]?.request;
    if(saved&&!saved.sheetId)throw Error('Saved setup has no confirmed Sheet destination. Its outcome may be uncertain; preserve a private recovery backup and use operator recovery. It cannot be redirected to another Sheet.');
    if(saved&&action&&(saved.action!==action||(details.sheetId&&details.sheetId!==saved.sheetId)))throw Error('A previous control request still needs confirmation. Select Sync now to check it before choosing a different action or Sheet.');
    if(!state.controlFlights?.[status.principal]){
      const payload={...details,id:'control:'+new Date(now()).toISOString()+':'+operationId(),protocol:syncProtocol,action,principal:status.principal,sheetId:details.sheetId||status.sheetId||''};
      state=await commit({kind:'control-begin',...context,request:payload});
    }
    const payload=state.controlFlights[status.principal].request;
    let result;
    try{result=await request(payload.action==='ensure'?'/api/sheet/ensure':'/api/sync',{method:'POST',body:JSON.stringify(payload)});}
    catch(error){
      const proof=error.payload?.rejection;
      const requestHash=await fingerprint(payload);
      if(payload.sheetId&&error.payload?.notDispatched===true&&proof?.id===payload.id&&proof.requestHash===requestHash){
        await commit({kind:'control-rejected',...context,principal:status.principal,commitId:payload.id,requestHash,rejection:proof,reason:error.message});
      }
      throw error;
    }
    await verifySnapshot(result,status.principal,payload.sheetId||result.sheetId);
    const normalized={...payload,sheetId:result.sheetId};
    if(result.receipt?.id!==payload.id||result.receipt.requestHash!==await fingerprint(normalized))throw Error('Protected control commit could not be confirmed.');
    state=await commit({kind:'control-ack',...context,principal:status.principal,commitId:payload.id});
    return bindSnapshot(state,status.principal,result.sheetId,result.snapshot);
  }
  async function control(action,details={}) {
    if(running||stopped)throw Error('Wait for the current synchronization check to finish.');
    running=true;lastAttempt=now();let completed=false;
    try{
      let state=await store.read();const context=inventoryContext(state);
      const status=await request('/api/status',{cache:'no-store'});assertInventoryContext(await store.read(),context);state=await observeIdentity(state,status);onAuth(status);
      const result=await performControl(state,status,action,details);completed=true;return result;
    }catch(error){onStatus({phase:'error',message:error.message,diagnostics:error.payload?.diagnostics,sheetId:error.payload?.sheetId});throw error;}
    finally{running=false;if(completed)schedule();}
  }
  async function sync({bind=false,bindOnly=false,source='manual'}={}) {
    const isAuto=source!=='manual';
    if(stopped||(isAuto&&!autoAllowed()))return;
    if(running){if(source==='change')again=true;return;}
    running=true;let context,bound=false;
    try{
      let state=await store.read();context=inventoryContext(state);
      if(isAuto&&!autoAllowed())return;
      const hasPending=pending(state),key=JSON.stringify(context);
      if(source==='change'&&!hasPending)return;
      if(source==='foreground'&&!bind&&!hasPending&&key===lastContext&&now()-lastCheck<300000)return;
      if(isAuto&&now()<Math.max(lastAttempt+15000,retryNotBefore)){if(hasPending)again=true;return;}
      timers.clearTimeout(timer);timer=undefined;queuedAt=null;
      timers.clearTimeout(retryTimer);retryTimer=undefined;
      lastAttempt=lastCheck=now();lastContext=key;
      onStatus({phase:'checking',message:'Checking saved changes…'});
      const status=await request('/api/status',{cache:'no-store'});
      assertInventoryContext(await store.read(),context);
      state=await observeIdentity(state,status);context=inventoryContext(state);onAuth(status);
      if(!status.authenticated||!status.principal||!status.ownershipVerified||status.syncProtocol!==syncProtocol||!status.coordinationAvailable){
        onStatus({phase:'local',message:status.authenticated?'Protected synchronization is unavailable. Local cards remain saved.':'Saved on this device. Connect Google to synchronize.'});return;
      }
      if(state.controlFlights?.[status.principal]){
        state=await performControl(state,status);context=inventoryContext(state);
      }
      let profile=profileOf(state);
      if(profile.context.principal!==status.principal||profile.context.sheetId!==status.sheetId||profile.context.ownershipVerified!==true){
        if(!bind){onStatus({phase:'local',message:'This inventory is offline or belongs to another account. Select a matching saved inventory or reconnect.'});return;}
        if(!status.sheetId){onStatus({phase:'setup',message:'Create or choose your private wallet Sheet in Settings.'});return;}
        const saved=state.profiles[`account:${status.principal}:sheet:${status.sheetId}`];
        const result=await request('/api/sync',{method:'POST',body:JSON.stringify({protocol:syncProtocol,action:'pull',principal:status.principal,sheetId:status.sheetId,...(saved?.remoteBase?{base:saved.remoteBase}:{})})});
        await verifySnapshot(result,status.principal,status.sheetId);
        state=await bindSnapshot(state,status.principal,status.sheetId,result.snapshot);
        context=inventoryContext(state);profile=profileOf(state);bound=true;
      }
      initialBind=false;
      if(bindOnly){onStatus({phase:'local',message:'Connected. Select Sync now to synchronize saved changes.'});return state;}
      state=await store.read();assertInventoryContext(state,context);profile=profileOf(state);
      if(profile.inFlight||profile.pending.length||profile.remoteBase?.needsRepair){
        if(!profile.inFlight){
          const payload={id:operationId(),protocol:syncProtocol,action:'commit',principal:status.principal,sheetId:status.sheetId,
            base:profile.remoteBase,cards:materialize(profile.remoteBase.cards,profile.pending.slice(0,128)),operations:profile.pending.slice(0,128)};
          state=await commit({kind:'sync-begin',...context,revision:profile.revision,request:payload,requestHash:await fingerprint(payload)});
          profile=profileOf(state);
        }
        const flight=profile.inFlight;
        const result=await request('/api/sync',{method:'POST',body:JSON.stringify(flight.request)});
        await verifySnapshot(result,status.principal,status.sheetId);
        if(!result.receipt||result.receipt.id!==flight.request.id||result.receipt.requestHash!==flight.requestHash)throw Error('Commit receipt could not be confirmed. Pending work remains saved.');
        state=await commit({kind:'sync-ack',...context,snapshot:result.snapshot,receipt:result.receipt,acknowledged:result.acknowledged,confirmedAt:new Date().toISOString()});
      }else if(!bound){
        const result=await request('/api/sync',{method:'POST',body:JSON.stringify({protocol:syncProtocol,action:'pull',principal:status.principal,sheetId:status.sheetId,base:profile.remoteBase})});
        await verifySnapshot(result,status.principal,status.sheetId);
        state=await commit({kind:'sync-pull',...context,revision:profile.revision,snapshot:result.snapshot,confirmedAt:new Date().toISOString()});
      }
      attempts=0;retryNotBefore=0;lastCheck=now();lastContext=JSON.stringify(inventoryContext(state));
      const current=profileOf(state),recovery=recoverySummary(current),hasWork=Boolean(current.pending.length||current.inFlight||current.remoteBase?.needsRepair);
      onStatus({phase:current.remoteBase?.maintenance?'maintenance':hasWork?'local':'saved',
        message:current.remoteBase?.maintenance?'Shared maintenance is paused. Local work remains saved.':hasWork?'Saved locally. Synchronization pending.':'Synchronized with your private Sheet.',
        balanceConfidence:recovery.uncertain?'uncertain':'verified',recordIntegrity:recovery.quarantined?'quarantined':'accepted',...recovery});
      if(profileOf(state).pending.length||profileOf(state).remoteBase?.needsRepair)again=true;
    }catch(error){
      if(error.payload?.code==='baseline_expired'&&error.payload.notDispatched&&context){
        const state=await store.read();
        try{assertInventoryContext(state,context);if(profileOf(state).inFlight)await commit({kind:'sync-blocked',...context,commitId:profileOf(state).inFlight.request.id,reason:'baseline_expired'});}catch{/* preserve original pending work */}
      }
      onStatus({phase:'error',message:error.message,diagnostics:error.payload?.diagnostics,sheetId:error.payload?.sheetId});
      // Only transport failures receive bounded retries of the SAME durable ID.
      // An uncertain response never authorizes a new request identity.
      if((error instanceof TypeError||error.name==='TimeoutError')&&autoAllowed()){
        retryNotBefore=now()+60000;
        if(attempts++===0)retryTimer=timers.setTimeout(()=>sync({bind,source:'retry'}),60000);
      }
    }finally{
      running=false;
      const follow=again;again=false;
      if(follow)schedule();
    }
  }
  function schedule(){
    if(!autoAllowed())return;
    const time=now();queuedAt??=time;
    const due=Math.max(Math.min(time+3000,queuedAt+30000),lastAttempt+15000,retryNotBefore);
    timers.clearTimeout(timer);timer=timers.setTimeout(()=>{timer=undefined;queuedAt=null;return sync({source:'change'});},Math.max(0,due-time));
  }
  function foreground(){if(autoAllowed())return sync({bind:initialBind,source:'foreground'});}
  function manual(options={}){if(stopped||running||now()-lastManual<5000)return;lastManual=now();return sync({...options,bind:options.bind||initialBind});}
  async function recoverUnbound(){
    if(running||stopped)throw Error('Wait for the current synchronization check.');
    // Binding is a read-only prerequisite; failure leaves the source untouched.
    if(!await sync({bind:true,bindOnly:true}))throw Error('A valid verified Sheet is required before recovering unbound cards. Resolve the synchronization problem and retry.');
    if(running||stopped)throw Error('Wait for the current synchronization check.');
    running=true;
    try{
      const state=await store.read(),context=inventoryContext(state),profile=profileOf(state);
      const status=await request('/api/status',{cache:'no-store'});
      assertInventoryContext(await store.read(),context);
      if(!status.authenticated||!status.ownershipVerified||profile.context.ownershipVerified!==true||status.principal!==profile.context.principal||status.sheetId!==profile.context.sheetId)throw Error('Connect the matching Google account and establish a valid Sheet before recovering unbound cards.');
      await commit({kind:'csv-recovery',...context,revision:profile.revision,cards:state.profiles.unbound.cards,recovery:true});
    }finally{running=false;}
    schedule();
  }
  async function recoverExpired(){
    if(running||stopped)throw Error('Wait for the current synchronization check.');
    running=true;lastAttempt=now();
    try{
    const state=await store.read(),context=inventoryContext(state),profile=profileOf(state);
    if(profile.syncBlocked!=='baseline_expired')throw Error('Uncertain dispatches cannot be bypassed. Use Sync now to check commit evidence.');
    const result=await request('/api/sync',{method:'POST',body:JSON.stringify({protocol:syncProtocol,action:'pull',principal:profile.context.principal,sheetId:profile.context.sheetId})});
    await verifySnapshot(result,profile.context.principal,profile.context.sheetId);
    await commit({kind:'recover-expired',...context,revision:profile.revision,snapshot:result.snapshot});schedule();
    }finally{running=false;}
  }
  return {sync,manual,foreground,control,recoverExpired,recoverUnbound,schedule,start({authReturn=false}={}){if(automatic()){initialBind=true;return foreground();}if(authReturn)return manual({bind:true,bindOnly:true});},stop(){stopped=true;timers.clearTimeout(timer);timers.clearTimeout(retryTimer);}};
}
