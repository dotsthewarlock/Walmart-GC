import {inventoryContext,assertInventoryContext,profileOf,operationId} from './inventory.js';
import {syncProtocol,fingerprint,snapshotContent,materialize,validateEvidence} from './syncProtocol.js';

// All local write commands finish before the coalesced push. No work is promised
// after the page closes. In-flight request bytes/identity survive a process exit.
export function createSyncEngine({store,request,onState=()=>{},onStatus=()=>{},onAuth=()=>{},timers=globalThis,automatic=()=>true,visible=()=>typeof document==='undefined'||document.visibilityState==='visible',now=()=>Date.now()}) {
  let running=false,again=false,stopped=false,timer,retryTimer,queuedAt=null,attempts=0,lastPrincipal,lastAttempt=-Infinity,lastManual=-Infinity,lastCheck=-Infinity,lastContext='',retryNotBefore=0,initialBind=false;
  const autoAllowed=()=>!stopped&&automatic()&&visible();
  const pending=state=>{const p=profileOf(state);return p.context.ownershipVerified===true&&Boolean(p.inFlight||p.pending.length||state.controlFlights?.[p.context.principal]);};
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
  async function performControl(state,status,action,details={}) {
    const context=inventoryContext(state);
    if(!status.authenticated||!status.principal||!status.ownershipVerified||status.syncProtocol!==syncProtocol||!status.coordinationAvailable)throw Error('Verified Google access and protected coordination are required.');
    if(!state.controlFlights?.[status.principal]){
      const payload={...details,id:operationId(),protocol:syncProtocol,action,principal:status.principal,sheetId:details.sheetId||status.sheetId||''};
      state=await commit({kind:'control-begin',...context,request:payload});
    }
    const payload=state.controlFlights[status.principal].request;
    const result=await request(payload.action==='ensure'?'/api/sheet/ensure':'/api/sync',{method:'POST',body:JSON.stringify(payload)});
    await verifySnapshot(result,status.principal,payload.sheetId||result.sheetId);
    const normalized={...payload,sheetId:result.sheetId};
    if(result.receipt?.id!==payload.id||result.receipt.requestHash!==await fingerprint(normalized))throw Error('Protected control commit could not be confirmed.');
    state=await commit({kind:'control-ack',...context,principal:status.principal,commitId:payload.id});
    return commit({kind:'bind-remote',...inventoryContext(state),principal:status.principal,sheetId:result.sheetId,snapshot:result.snapshot});
  }
  async function control(action,details={}) {
    if(running||stopped)throw Error('Wait for the current synchronization check to finish.');
    running=true;lastAttempt=now();let completed=false;
    try{
      let state=await store.read();const context=inventoryContext(state);
      const status=await request('/api/status',{cache:'no-store'});assertInventoryContext(await store.read(),context);state=await observeIdentity(state,status);onAuth(status);
      const result=await performControl(state,status,action,details);completed=true;return result;
    }catch(error){onStatus({phase:'error',message:error.message});throw error;}
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
      if(bind)initialBind=false;
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
        const result=await request('/api/sync',{method:'POST',body:JSON.stringify({protocol:syncProtocol,action:'pull',principal:status.principal,sheetId:status.sheetId})});
        await verifySnapshot(result,status.principal,status.sheetId);
        state=await commit({kind:'bind-remote',...context,principal:status.principal,sheetId:status.sheetId,snapshot:result.snapshot});
        context=inventoryContext(state);profile=profileOf(state);bound=true;
      }
      if(bindOnly){onStatus({phase:'local',message:'Connected. Select Sync now to synchronize saved changes.'});return;}
      state=await store.read();assertInventoryContext(state,context);profile=profileOf(state);
      if(profile.inFlight||profile.pending.length){
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
        state=await commit({kind:'sync-ack',...context,snapshot:result.snapshot,receipt:result.receipt,acknowledged:result.acknowledged});
      }else if(!bound){
        const result=await request('/api/sync',{method:'POST',body:JSON.stringify({protocol:syncProtocol,action:'pull',principal:status.principal,sheetId:status.sheetId})});
        await verifySnapshot(result,status.principal,status.sheetId);
        state=await commit({kind:'sync-pull',...context,revision:profile.revision,snapshot:result.snapshot});
      }
      attempts=0;retryNotBefore=0;lastCheck=now();lastContext=JSON.stringify(inventoryContext(state));
      const evidence=profileOf(state).recoveryEvidence;
      const conflicts=Object.values(evidence?.cards??{}).flatMap(e=>e.conflicts??[]).filter(c=>!c.resolution).length;
      onStatus({phase:profileOf(state).remoteBase?.maintenance?'maintenance':conflicts?'review':'saved',message:profileOf(state).remoteBase?.maintenance?'Shared maintenance is paused. Local work remains saved.':conflicts?'Saved with recovery evidence. Review uncertain cards.':'Changes saved to your private Sheet.'});
      if(profileOf(state).pending.length)again=true;
    }catch(error){
      if(error.payload?.code==='baseline_expired'&&error.payload.notDispatched&&context){
        const state=await store.read();
        try{assertInventoryContext(state,context);if(profileOf(state).inFlight)await commit({kind:'sync-blocked',...context,commitId:profileOf(state).inFlight.request.id,reason:'baseline_expired'});}catch{/* preserve original pending work */}
      }
      onStatus({phase:'error',message:error.message});
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
  function manual(options={}){if(stopped||running||now()-lastManual<5000)return;lastManual=now();return sync(options);}
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
  return {sync,manual,foreground,control,recoverExpired,schedule,start({authReturn=false}={}){if(automatic()){initialBind=true;return foreground();}if(authReturn)return manual({bind:true,bindOnly:true});},stop(){stopped=true;timers.clearTimeout(timer);timers.clearTimeout(retryTimer);}};
}
