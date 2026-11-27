import { reconcile, equal as syncEqual, syncProtocol, emptyEvidence, materialize, validateEvidence, isMonetaryOperation, fingerprint, maintenanceRevision } from './syncProtocol.js';
import { bundledSampleGiftCards, normalizeCard, serializeReviewInventory, getEffectiveMerchant } from './cards.js';
import { csvHeaders } from './csvSchema.js';
import { applyBalanceObservation, createBalanceReviewQueue } from './balanceReview.js';
import { previewTransferResults, transferCardSnapshot } from './balanceTransfer.js';
import { decodeTransferLedger, invalidatedLedger } from './balanceTransferLedger.js';
import { storageKeys } from './storage.js';
import { isolateBatch, pruneObservationReceipts, credentialAmbiguous, verificationCards, planInventoryRecovery } from './inventoryRecovery.js';

export const inventoryDatabase = 'walmartGc.inventory';
const stale = 'Saved cards changed. Reload the wallet or reopen this editor before saving.';
const samples = new Set(bundledSampleGiftCards.map(c => c.cardNumber));
const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
export function operationId() {
  if (!globalThis.crypto?.randomUUID) throw new Error('Saving requires a secure browser context with Web Crypto.');
  return globalThis.crypto.randomUUID();
}
export const profileOf = state => state.profiles[state.active];
export const inventoryContext = state => ({ profile: state.active, generation: state.contextGeneration ?? 0 });
export function assertInventoryContext(state, context) {
  if (context.profile !== state.active || context.generation !== (state.contextGeneration ?? 0)) {
    throw new Error('Inventory context changed. Reopen this editor or retry the request.');
  }
}
export const recoveryWarning = 'Recovery exports contain card credentials, original storage and quarantined data. Store the file privately.';
export function savedCompartments(state) {
  return Object.entries(state.profiles).map(([key, profile]) => ({ key,
    label: key === 'unbound' ? 'Unbound local inventory' : profile.context.ownershipVerified ? `Saved account …${profile.context.principal.slice(-6)} · Sheet ${profile.context.sheetId}` : `Saved Sheet ${profile.context.sheetId} (ownership unverified)`,
    count: profile.cards.length }));
}
export function compartmentCards(state, key) {
  if (!Object.hasOwn(state.profiles, key)) throw new Error('Saved compartment is unavailable.');
  return state.profiles[key].cards;
}
export const recoveryExport = state => JSON.stringify({ format: 'gc-wallet-recovery-v1', warning: recoveryWarning, wallet: state }, null, 2);

export function validateInventory(cards) {
  if (!Array.isArray(cards)) throw new Error('Expected an inventory array.');
  const seen = new Set();
  return cards.map(c => {
    const normalized = normalizeCard(c);
    if (!normalized || typeof c.cardNumber !== 'string' || !/^63\d{14}$/.test(c.cardNumber)
        || typeof c.pin !== 'string' || c.pin !== c.pin.trim() || c.pin.length < 4
        || normalized.startingBalance < 0 || normalized.currentBalance < 0
        || Object.keys(c).some(k => !csvHeaders.includes(k)) || seen.has(c.cardNumber)) {
      throw new Error('Invalid, duplicate or unsupported card data was preserved for recovery.');
    }
    seen.add(c.cardNumber);
    return normalized;
  });
}

const newProfile = context => ({ cards: [], pending: [], versions: {}, ledger: null,
  ledgerRecovery: false, revision: 0, context, sheets: null, sync: null, remoteBase: null, inFlight: null, recoveryEvidence: emptyEvidence() });

export function migrateLegacy(raw, migrationId = operationId()) {
  const state = { schema: 1, revision: 0, active: 'unbound', contextGeneration: 0,
    profiles: { unbound: newProfile({ kind: 'unbound', principal: null }) },
    migration: structuredClone(raw), migrationOperationNamespace: migrationId,
    legacyObserved: structuredClone(raw), quarantine: [], receipts: {}, observationReceipts: {} };
  const profile = profileOf(state);
  let cards;
  try {
    cards = raw.cards === null ? [] : JSON.parse(raw.cards);
    if (!Array.isArray(cards)) throw new Error('Expected array');
  } catch {
    state.quarantine.push({ kind: 'legacy-inventory', reason: 'Unreadable original inventory', raw: raw.cards });
    cards = [];
  }
  const counts = new Map();
  cards.forEach(c => counts.set(c?.cardNumber, (counts.get(c?.cardNumber) || 0) + 1));
  cards.forEach((c, index) => {
    try {
      if (counts.get(c?.cardNumber) !== 1 || samples.has(c?.cardNumber)) throw new Error('Ambiguous or bundled sample identity');
      const [card] = validateInventory([c]);
      profile.cards.push(card);
      profile.versions[card.cardNumber] = 1;
      profile.pending.push({ id: `migration:${migrationId}:${index}`, kind: 'legacy-recovery', cardNumber: card.cardNumber,
        before: null, after: card, revision: 1 });
    } catch (error) {
      state.quarantine.push({ kind: 'legacy-card', reason: error.message, record: c });
    }
  });
  try {
    const ledger = decodeTransferLedger(raw.ledger);
    if (ledger?.application) throw new Error('Interrupted legacy Batch application');
    // Cached context cannot bind the migrated wallet to an authenticated Sheet.
    profile.ledger = invalidatedLedger(ledger);
    for (const request of ledger?.requests ?? []) {
      if (request.state === 'applied') state.observationReceipts[request.ref] = { ...request.applied, profile: 'unbound' };
    }
  } catch (error) {
    profile.ledgerRecovery = true;
    state.quarantine.push({ kind: 'legacy-batch', reason: error.message, raw: raw.ledger });
  }
  return state;
}

export function relevantLedger(ledger,cards) {
  if(!ledger || ledger.application)return ledger;
  const next=structuredClone(ledger);
  for(const request of next.requests) {
    if(request.state!=='pending')continue;
    const card=cards.find(c=>c.cardNumber===request.cardNumber);
    if(!card || getEffectiveMerchant(card)!=='walmart-ca' || (request.relevance && !syncEqual(request.relevance,{pinDigest:request.relevance.pinDigest,currentBalance:card.currentBalance,lastBalanceChecked:card.lastBalanceChecked||'',pendingReconciliation:card.pendingReconciliation===true,used:card.used})))request.state='invalidated';
    else if(!request.relevance && !syncEqual(request.snapshot,{currentBalance:card.currentBalance,lastBalanceChecked:card.lastBalanceChecked||'',dateUpdated:card.dateUpdated,used:card.used}))request.state='invalidated';
  }
  if(!next.requests.some(r=>r.state==='pending'))next.inventoryDigest=null;
  return next;
}

function editable(profile) {
  // Cards and pending operations already commit atomically. A broken transfer
  // ledger is recovery input, never a reason to suspend unrelated inventory work.
  if (profile.ledger?.application) throw new Error('Open Batch to recover the interrupted transfer.');
}

function record(profile, op, before, after) {
  const number = after?.cardNumber ?? before?.cardNumber;
  const revision = (profile.versions[number] || 0) + 1;
  profile.versions[number] = revision;
  const position = profile.cards.findIndex(c => c.cardNumber === number);
  if (position < 0) profile.cards.push(after);
  else profile.cards[position] = after;
  if(before&&after&&(before.pin!==after.pin||(op.kind!=='batch-verification'&&before.lastBalanceCheckedAt!==after.lastBalanceCheckedAt))&&profile.ledger)
    for(const request of profile.ledger.requests)if(request.cardNumber===number&&request.state==='pending')request.state='invalidated';
  profile.pending.push({ id: op.id, kind: op.kind, cardNumber: number, before, after,
    revision, ...(op.observation ? { observation: op.observation } : {}), ...(op.kind === 'resolve-conflict' ? {conflictId:op.conflictId,choice:op.choice}: {}) });
}

// Pure reducer: the native adapter invokes it only after reading inside the
// readwrite transaction. Every command is immutable and independently retryable.
export function reduceInventory(input, command, commandHash) {
  if (input.schema !== 1) throw new Error('Unsupported local inventory schema.');
  const state = structuredClone(input);
  const profile = profileOf(state);
  isolateBatch(state, profile);
  if (!command.id || !command.profile) throw new Error('Missing operation identity or context.');
  const digest = commandHash ?? JSON.stringify(command);
  if (Object.hasOwn(state.receipts, command.id)) {
    if (state.receipts[command.id] !== digest && state.receipts[command.id] !== JSON.stringify(command)) throw new Error('Operation ID was reused with different content.');
    return input;
  }
  assertInventoryContext(state, command);
  state.contextGeneration ??= 0;
  if (command.kind === 'sync-blocked') {
    if(!profile.inFlight||command.commitId!==profile.inFlight.request.id||command.reason!=='baseline_expired')throw new Error('Commit recovery context changed.');
    profile.syncBlocked=command.reason;
  } else if (command.kind === 'recover-expired') {
    if(profile.syncBlocked!=='baseline_expired'||!profile.inFlight||command.revision!==profile.revision)throw new Error('Recheck the expired commit before recovery.');
    validateInventory(command.snapshot.cards);
    state.quarantine.push({kind:'expired-sync-recovery',inFlight:profile.inFlight,operations:profile.pending,reason:'Explicit recovery after server fencing of an expired baseline.'});
    const proposed=materialize(profile.inFlight.request.base.cards,profile.pending);
    const touched=new Set(profile.pending.map(op=>op.cardNumber));
    profile.pending=[];
    for(const card of proposed.filter(c=>touched.has(c.cardNumber))){
      const before=command.snapshot.cards.find(c=>c.cardNumber===card.cardNumber)??null;
      profile.pending.push({id:operationId(),kind:'unbound-recovery',cardNumber:card.cardNumber,before,after:card,revision:profile.versions[card.cardNumber]??1});
    }
    profile.remoteBase=command.snapshot;profile.inFlight=null;delete profile.syncBlocked;
  } else if (command.kind === 'control-begin') {
    state.controlFlights??={};
    if(!command.request.principal)throw new Error('Verified account required.');
    if(state.controlFlights[command.request.principal])return input;
    state.controlFlights[command.request.principal]={request:command.request};
  } else if (command.kind === 'control-ack' || command.kind === 'control-rejected') {
    const flight=state.controlFlights?.[command.principal];
    if(!flight||flight.request.id!==command.commitId)throw new Error('Saved control request changed.');
    if(command.kind==='control-rejected'){
      if(!command.rejection||command.rejection.id!==flight.request.id||command.rejection.requestHash!==command.requestHash)throw new Error('Exact non-dispatch proof required.');
      state.quarantine.push({kind:'rejected-control',request:flight.request,rejection:command.rejection,reason:command.reason});
      const rejected=state.quarantine.filter(item=>item.kind==='rejected-control');
      const retired=new Set(rejected.slice(0,-64));
      state.quarantine=state.quarantine.filter(item=>!retired.has(item));
    }
    delete state.controlFlights[command.principal];
  } else if (command.kind === 'bind-remote') {
    if (!command.principal || !command.sheetId || command.snapshot.protocol !== syncProtocol) throw new Error('Verified account and Sheet context required.');
    const key = `account:${command.principal}:sheet:${command.sheetId}`;
    if (!state.profiles[key]) {
      const cards = validateInventory(command.snapshot.cards);
      if (cards.some(c => samples.has(c.cardNumber))) throw new Error('Bundled samples cannot synchronize.');
      const bound = newProfile({kind:'sheet',principal:command.principal,sheetId:command.sheetId,ownershipVerified:true});
      bound.cards=cards;for(const c of cards)bound.versions[c.cardNumber]=1;
      bound.remoteBase=command.snapshot;bound.recoveryEvidence=command.snapshot.evidence;
      bound.sheets={spreadsheetId:command.sheetId,remoteSheetVersion:command.snapshot.version,status:'ready'};
      bound.sync={status:'connected',lastKnownSheetVersion:command.snapshot.version};
      state.profiles[key]=bound;
    }
    state.active=key;state.contextGeneration++;
  } else if (command.kind === 'sync-begin') {
    if (profile.context.ownershipVerified !== true || !profile.remoteBase) throw new Error('Establish verified ownership and a remote baseline first.');
    if (profile.inFlight) return input;
    if (command.revision !== profile.revision) throw new Error(stale);
    profile.inFlight={request:command.request,requestHash:command.requestHash};
  } else if (command.kind === 'sync-ack' || command.kind === 'sync-pull') {
    const remote=command.snapshot;
    validateInventory(remote.cards);
    if (remote.protocol!==syncProtocol) throw new Error('Incompatible synchronization response.');
    // Evidence revisions reveal remote monetary actions even when balance and
    // date-only verification metadata are unchanged. Discount this flight's
    // own operations so a compatible acknowledgment preserves continuation.
    if (profile.ledger && profile.remoteBase) {
      const submitted = command.kind === 'sync-ack' ? profile.inFlight?.request.operations ?? [] : [];
      for (const request of profile.ledger.requests) {
        if (request.state !== 'pending') continue;
        const number = request.cardNumber;
        const before = profile.remoteBase.evidence?.cards?.[number]?.money ?? 0;
        const after = remote.evidence?.cards?.[number]?.money ?? 0;
        const own = submitted.filter(op => op.cardNumber === number && isMonetaryOperation(op)).length;
        if (after !== before + own || maintenanceRevision(remote.evidence,number)!==maintenanceRevision(profile.remoteBase.evidence,number)) request.state = 'invalidated';
      }
      if (!profile.ledger.requests.some(request => request.state === 'pending')) profile.ledger.inventoryDigest = null;
    }
    let base=profile.remoteBase?.cards??[];
    if (command.kind==='sync-ack') {
      const flight=profile.inFlight;
      if(!flight||command.receipt.id!==flight.request.id||command.receipt.requestHash!==flight.requestHash) throw new Error('Commit receipt does not match saved pending work.');
      const ids=new Set(flight.request.operations.map(op=>op.id));
      if(!syncEqual([...ids].sort(),[...new Set(command.acknowledged)].sort())) throw new Error('Incomplete operation acknowledgment.');
      profile.pending=profile.pending.filter(op=>!ids.has(op.id));
      // Rebase later monetary actions only when their original monetary context
      // is compatible with the confirmed remote result. Equal values alone do
      // not prove that an independent action did not occur during the flight.
      const expected=new Map(remote.cards.map(card=>[card.cardNumber,card.currentBalance]));
      for(const op of profile.pending.filter(isMonetaryOperation)){
        const number=op.cardNumber,remoteCard=remote.cards.find(c=>c.cardNumber===number);
        const oldMoney=flight.request.base.evidence.cards[number]?.money??0,newMoney=remote.evidence.cards[number]?.money??0;
        const hadBase=flight.request.base.cards.some(c=>c.cardNumber===number);
        const submitted=flight.request.operations.filter(sent=>sent.cardNumber===number&&isMonetaryOperation(sent)
          &&(hadBase||['set-balance','manual-verification','batch-verification'].includes(sent.kind))).length;
        if(!remoteCard||op.before?.currentBalance!==expected.get(number)||op.before?.pin!==remoteCard.pin
          ||newMoney-oldMoney!==submitted||remoteCard.pendingReconciliation
          ||maintenanceRevision(flight.request.base.evidence,number)!==maintenanceRevision(remote.evidence,number))op.requiresReconciliation=true;
        expected.set(number,op.after?.currentBalance);
      }
      base=flight.request.cards;
      profile.inFlight=null;delete profile.syncBlocked;
    } else if (profile.inFlight || profile.pending.length || command.revision!==profile.revision) throw new Error('Saved cards changed. Recheck synchronization before accepting this remote response.');
    if(command.kind==='sync-pull'&&syncEqual(profile.remoteBase,remote)&&syncEqual(profile.cards,remote.cards)&&syncEqual(profile.recoveryEvidence,remote.evidence)&&profile.sync?.status==='connected'&&profile.sheets?.status==='ready'&&(!profile.ledger||profile.ledger.context.sheetVersion===remote.version))return input;
    const local=command.kind==='sync-ack'?materialize(remote.cards,profile.pending):profile.cards;
    if(command.kind==='sync-ack')for(const card of profile.cards)if(!local.some(c=>c.cardNumber===card.cardNumber)&&!remote.evidence.tombstones[card.cardNumber])local.push(card);
    const merged=reconcile({base,local,remote:remote.cards,operations:profile.pending,
      baseEvidence:command.kind==='sync-ack'?remote.evidence:profile.remoteBase?.evidence,evidence:remote.evidence});
    // A restored row must have durable semantic intent; otherwise the next ACK
    // could replace it with an absent remote baseline. Tombstones remain explicit.
    for(const card of merged.cards)if(!remote.cards.some(c=>c.cardNumber===card.cardNumber)&&!profile.pending.some(op=>op.cardNumber===card.cardNumber)){
      profile.pending.push({id:command.id+':missing:'+card.cardNumber,kind:'unbound-recovery',cardNumber:card.cardNumber,
        before:profile.remoteBase?.cards.find(c=>c.cardNumber===card.cardNumber)??card,after:card,revision:profile.revision+1});
    }
    for(const op of profile.pending.filter(op=>op.requiresReconciliation)) {const card=merged.cards.find(c=>c.cardNumber===op.cardNumber);if(card)card.pendingReconciliation=true;}
    for(const card of merged.cards) {
      const previous=profile.cards.find(c=>c.cardNumber===card.cardNumber);
      if(previous&&(previous.pin!==card.pin||previous.lastBalanceCheckedAt!==card.lastBalanceCheckedAt)&&profile.ledger)
        for(const r of profile.ledger.requests)if(r.cardNumber===card.cardNumber&&r.state==='pending')r.state='invalidated';
      if(!syncEqual(previous,card))profile.versions[card.cardNumber]=(profile.versions[card.cardNumber]??0)+1;
    }
    for(const old of profile.cards)if(!merged.cards.some(c=>c.cardNumber===old.cardNumber))state.quarantine.push({kind:'tombstoned-local',record:old,reason:'Explicit remote deletion retained for recovery.'});
    profile.cards=merged.cards;profile.recoveryEvidence=merged.evidence;profile.remoteBase=remote;
    profile.sheets={spreadsheetId:profile.context.sheetId,remoteSheetVersion:remote.version,status:'ready'};
    profile.sync={status:'connected',lastKnownSheetVersion:remote.version,...(command.confirmedAt ? {lastConfirmedAt:command.confirmedAt} : {})};
    profile.ledger=relevantLedger(profile.ledger,profile.cards);
    if(profile.ledger)profile.ledger.context.sheetVersion=remote.version;
  } else if (command.kind === 'sync-rejected') {
    if (!profile.inFlight || command.commitId!==profile.inFlight.request.id || !command.notDispatched) throw new Error('Uncertain commits must remain preserved.');
    profile.inFlight=null;
  } else if (command.kind === 'resolve-conflict') {
    editable(profile);
    const entry=profile.recoveryEvidence?.cards?.[command.cardNumber];
    const conflict=entry?.conflicts?.find(c=>c.id===command.conflictId&&!c.resolution);
    const tombstone=profile.recoveryEvidence?.tombstones?.[command.cardNumber];
    if(!conflict&&!tombstone)throw new Error('This recovery item changed.');
    if(conflict?.kind==='balance')throw new Error('Verify this balance with the merchant to clear uncertainty.');
    const before=profile.cards.find(c=>c.cardNumber===command.cardNumber)??null;
    if(before&&profile.versions[command.cardNumber]!==command.version)throw new Error(stale);
    let after=before;
    if(command.choice==='local'||command.choice==='restore') {
      const local=conflict?.local;
      if(conflict?.kind?.startsWith('field:')){after={...before};if(local===null)delete after[conflict.kind.slice(6)];else after[conflict.kind.slice(6)]=local;}
      else after=before ? {...before,pin:local?.pin??before.pin} : local;
    }
    if(!before&&command.choice==='remote'&&conflict){
      profile.pending.push({...command,kind:'resolve-conflict',before:null,after:conflict.local,revision:profile.versions[command.cardNumber]??1});
    } else {
    if(!after)throw new Error('Export recovery data and review the missing credentials before restoring.');
    [after]=validateInventory([after]);
    record(profile,{...command,...(command.choice==='restore'&&tombstone?{conflictId:tombstone.id}:{})},before,after);
    }
  } else if (command.kind === 'begin-context') {
    // Invalidate older requests and editors before asynchronous context work.
    state.contextGeneration++;
  } else if (command.kind === 'select-compartment') {
    if (!Object.hasOwn(state.profiles, command.target)) throw new Error('Saved compartment is unavailable.');
    // Selection remains available even when Batch recovery blocks card edits.
    state.active = command.target;
    state.contextGeneration++;
  } else if (command.kind === 'discard-batch') {
    if (command.revision !== profile.revision) throw new Error(stale);
    validateInventory(profile.cards);
    // Recovery artifacts remain in quarantine/migration; discard never erases them.
    if (profile.ledger?.application) state.quarantine.push({ kind: 'discarded-batch-recovery', ledger: profile.ledger });
    profile.ledger = null;
    profile.ledgerRecovery = false;
  } else if (command.kind === 'observe-session') {
    const status = command.status;
    if (profile.ledger && (status.authenticated !== true
        || status.sheetId !== profile.ledger.context.sheetId
        || (status.syncProtocol !== syncProtocol && status.sheetVersion !== profile.ledger.context.sheetVersion))) {
      if (!profile.ledger.application) {
        const invalidated = invalidatedLedger(profile.ledger);
        if (invalidated === profile.ledger) return input;
        profile.ledger = invalidated;
      } else return input;
    } else return input;
    // A legacy status is a hint, never verified principal or profile ownership.
  } else if (command.kind === 'invalidate-batch') {
    editable(profile);
    profile.ledger = invalidatedLedger(profile.ledger);
  } else if (command.kind === 'archive-foreign-batch') {
    editable(profile);
    if (command.revision !== profile.revision || !profile.ledger) throw new Error(stale);
    const expected = profile.context.kind === 'unbound' ? 'local:unbound' : profile.context.sheetId;
    if (!expected || profile.ledger.context.sheetId === expected) throw new Error('Saved requests still match this inventory.');
    state.quarantine.push({kind:'foreign-batch',reason:'Requests from another inventory were preserved without being reused.',ledger:profile.ledger});
    profile.ledger=null;
    profile.batchSelection=null;
  } else if (command.kind === 'invalidate-batch-refs') {
    editable(profile);
    if (command.revision !== profile.revision || !profile.ledger || !Array.isArray(command.refs)
        || command.context?.sheetId !== profile.ledger.context.sheetId) throw new Error(stale);
    const refs = new Set(command.refs);
    for (const request of profile.ledger.requests) if (request.state === 'pending' && refs.has(request.ref)) request.state = 'invalidated';
    if (!profile.ledger.requests.some(request => request.state === 'pending')) profile.ledger.inventoryDigest = null;
    profile.ledger.context = command.context;
  } else if (command.kind === 'patch' || command.kind === 'manual-verification') {
    editable(profile);
    if((command.kind==='manual-verification'||command.action==='set-balance')&&credentialAmbiguous(profile.recoveryEvidence,command.cardNumber))throw new Error('Resolve this card’s conflicting credentials in Settings before verifying or changing its balance.');
    const before = profile.cards.find(c => c.cardNumber === command.cardNumber);
    if (!before || profile.versions[command.cardNumber] !== command.version) throw new Error(stale);
    let after;
    if (command.kind === 'manual-verification') {
      const evidence=profile.recoveryEvidence?.cards?.[command.cardNumber],time=command.observation?.checkedAt;
      if(time<(evidence?.uncertainSince||'')||time<(evidence?.moneyAt||''))throw new Error('Verify this card again after its latest monetary change or uncertainty.');
      const entry = createBalanceReviewQueue(profile.cards).find(e => e.card.cardNumber === command.cardNumber);
      after = applyBalanceObservation(profile.cards, { ...command.observation, cardNumber: command.cardNumber, expected: entry })
        .find(c => c.cardNumber === command.cardNumber);
    } else {
      const allowed = ['currentBalance', 'dateUpdated', 'used', 'dateUsed', 'notes'];
      if (Object.keys(command.patch).some(k => !allowed.includes(k))) throw new Error('Unsupported local edit.');
      [after] = validateInventory([{ ...before, ...command.patch }]);
      if(command.action==='set-balance'&&before.currentBalance===after.currentBalance)after.dateUpdated=before.dateUpdated;
      if(syncEqual(before,after))return input;
    }
    record(profile, { ...command, kind: command.action ?? command.kind }, before, after);
  } else if (command.kind === 'mark-zero-used') {
    editable(profile);
    for (const target of command.targets) {
      const before = profile.cards.find(c => c.cardNumber === target.cardNumber);
      if (!before || profile.versions[target.cardNumber] !== target.version || before.currentBalance !== 0) throw new Error(stale);
      record(profile, { ...command, id: `${command.id}:${before.cardNumber}` }, before,
        { ...before, used: true, dateUsed: command.date });
    }
    profile.ledger = relevantLedger(profile.ledger, profile.cards);
  } else if (command.kind === 'csv-recovery') {
    editable(profile);
    if (command.revision !== profile.revision) throw new Error(stale);
    const recovered = validateInventory(command.cards);
    if (recovered.some(c => samples.has(c.cardNumber))) throw new Error('Bundled sample identities cannot be imported into the real inventory.');
    if(command.recovery){
      const merged=planInventoryRecovery(profile,recovered,command.id);
      for(const op of merged.operations)record(profile,op,op.before,op.after);
      profile.cards=merged.cards;profile.recoveryEvidence=merged.evidence;
    }else{
    for (const card of recovered) {
      const before = profile.cards.find(c => c.cardNumber === card.cardNumber);
      if (before && before.pin !== card.pin) throw new Error('CSV credentials conflict with a saved card. Original cards were preserved.');
      let after = card;
      if (before?.lastBalanceCheckedAt && !card.lastBalanceCheckedAt) {
        if (card.lastBalanceChecked && card.lastBalanceChecked !== before.lastBalanceChecked) throw new Error('The backup has an older verification format with a different date. Saved verification details were preserved.');
        after = { ...card, lastBalanceChecked: before.lastBalanceChecked, lastBalanceCheckedAt: before.lastBalanceCheckedAt };
      }
      if (before?.lastBalanceCheckedAt && after.lastBalanceCheckedAt && after.lastBalanceCheckedAt < before.lastBalanceCheckedAt) throw new Error('The backup has an older verification time. Saved verification details were preserved.');
      if (!equal(before, after)) record(profile, { ...command, kind: command.recovery ? 'unbound-recovery' : command.kind, id: `${command.id}:${card.cardNumber}` }, before ?? null, after);
    }
    }
    // A recovery file is a set of explicit additions/updates, never a delete list.
  } else if (command.kind === 'sheet-import') {
    state.contextGeneration++;
    editable(profile);
    if (command.revision !== profile.revision) throw new Error(stale);
    if (!command.sheetId || !command.sheetVersion) throw new Error('Missing Sheet context.');
    const cards = validateInventory(command.cards);
    if (cards.some(c => samples.has(c.cardNumber))) throw new Error('The Sheet contains bundled sample identities. Import was blocked.');
    const key = `sheet:${command.sheetId}`;
    const target = state.profiles[key];
    // Reopening a compartment must remain possible after logout, even when it
    // has pending edits. Preserve its local inventory; quarantine remote drift.
    if (target && (!equal(target.cards, cards) || target.pending.length)) {
      if (!equal(target.cards, cards)) state.quarantine.push({ kind: 'sheet-read-conflict', sheetId: command.sheetId,
        sheetVersion: command.sheetVersion, cards, reason: 'Remote import did not replace saved local cards or acknowledge pending operations.' });
      target.sheets = { ...target.sheets, message: 'Opened saved local Sheet inventory. Local changes were retained; differing remote cards were quarantined.' };
      target.ledger = invalidatedLedger(target.ledger);
      state.active = key;
    } else {
      const imported = target ?? newProfile({ kind: 'sheet', sheetId: command.sheetId, principal: null, ownershipVerified: false });
      imported.cards = cards;
      for (const c of cards) imported.versions[c.cardNumber] ??= 1;
      imported.sheets = command.sheets;
      imported.sync = command.sync;
      state.profiles[key] = imported;
      state.active = key;
    }
  } else if (command.kind === 'use-unbound') {
    state.contextGeneration++;
    editable(profile);
    state.active = 'unbound';
  } else if (command.kind === 'set-batch') {
    editable(profile);
    if(profile.ledgerRecovery)throw new Error('Discard the preserved damaged Batch before creating another.');
    if (command.revision !== profile.revision) throw new Error(stale);
    const ledger = decodeTransferLedger(JSON.stringify(command.ledger));
    if(ledger.requests.some(r=>credentialAmbiguous(profile.recoveryEvidence,r.cardNumber)))throw new Error('Resolve conflicting card credentials before creating verification requests.');
    if (ledger.application || ledger.requests.some(r => r.state !== 'pending')) throw new Error('A new Batch must contain only pending requests.');
    if (ledger.requests.some(r => Object.hasOwn(state.observationReceipts, r.ref))) throw new Error('A Batch reference was already applied. Create a new Batch.');
    const localOnly = profile.context.kind === 'unbound' && ledger.context.sheetId === 'local:unbound' && ledger.context.sheetVersion === 'local';
    if (!localOnly && (profile.context.kind !== 'sheet' || ledger.context.sheetId !== profile.context.sheetId
        || ledger.context.sheetVersion !== profile.sync?.lastKnownSheetVersion)) throw new Error('Establish matching inventory context before creating Batch.');
    if (profile.ledger) {
      if (profile.ledger.id !== ledger.id || profile.ledger.application) throw new Error('Saved request context changed.');
      const existing = new Set(profile.ledger.requests.map(r => r.ref));
      if (ledger.requests.some(r => existing.has(r.ref))) throw new Error('Request reference already exists.');
      profile.ledger.requests.push(...ledger.requests);
      profile.ledger.multipleSelections = true;
      profile.ledger.inventoryDigest = ledger.inventoryDigest;
      decodeTransferLedger(JSON.stringify(profile.ledger));
    } else profile.ledger = ledger;
    profile.batchSelection = ledger.requests.map(r => r.ref);
    const history=profile.ledger.requests.filter(r=>r.state!=='pending');
    const expired=new Set(history.slice(0,-128).map(r=>r.ref));
    profile.ledger.requests=profile.ledger.requests.filter(r=>!expired.has(r.ref));
  } else if (command.kind === 'apply-batch') {
    editable(profile);
    if(profile.ledgerRecovery)throw new Error('Discard the preserved damaged Batch before applying results.');
    if (command.ledgerId !== profile.ledger?.id) throw new Error(stale);
    const result = previewTransferResults(profile.ledger, verificationCards(profile), command.observations, command.now,profile.recoveryEvidence);
    if (!equal(result.items, command.items)) throw new Error('Batch preview changed. Preview again.');
    if (!result.counts.accepted) return input;
    for (const item of result.items.filter(i => i.outcome === 'accepted')) {
      if (Object.hasOwn(state.observationReceipts, item.ref)) throw new Error('This reference was already applied.');
      const before = profile.cards.find(c => c.cardNumber === item.cardNumber);
      const after = result.candidate.find(c => c.cardNumber === item.cardNumber);
      record(profile, { id: `observation:${item.ref}`, kind: 'batch-verification', observation: { ref: item.ref,
        balance: item.balance, checkedAt: item.checkedAt } }, before, after);
      const request = profile.ledger.requests.find(r => r.ref === item.ref);
      request.state = 'applied';
      request.applied = { ref: item.ref, balance: item.balance, checkedAt: item.checkedAt };
      state.observationReceipts[item.ref] = { ...request.applied, profile: state.active };
      // Only this known verification advances equivalent pending requests. Other
      // monetary and credential changes retain their normal invalidation fence.
      for (const other of profile.ledger.requests) if (other.state === 'pending' && other.cardNumber === item.cardNumber
          && syncEqual(other.snapshot, transferCardSnapshot(before))) {
        other.snapshot = transferCardSnapshot(after);
        if (other.relevance) Object.assign(other.relevance, {currentBalance:after.currentBalance,lastBalanceChecked:after.lastBalanceChecked||'',pendingReconciliation:after.pendingReconciliation===true,used:after.used});
      }
    }
    // Legacy aggregate digest is retained for decoding; current requests use per-card relevance.
    profile.ledger.inventoryDigest = command.inventoryDigest;
    decodeTransferLedger(JSON.stringify(profile.ledger));
  } else {
    throw new Error('Unknown inventory operation.');
  }
  // A verification is a new observation even when its amount and calendar date
  // did not change. Requests created before it must not overwrite that evidence.
  if (command.kind === 'manual-verification' && profile.ledger) {
    for (const request of profile.ledger.requests) if (request.state === 'pending' && request.cardNumber === command.cardNumber) request.state = 'invalidated';
    if (!profile.ledger.requests.some(request => request.state === 'pending')) profile.ledger.inventoryDigest = null;
  }
  if (['patch','manual-verification','csv-recovery','resolve-conflict'].includes(command.kind)) profile.ledger=relevantLedger(profile.ledger,profile.cards);
  if(!command.kind.startsWith('sync-')&&!command.kind.startsWith('control-')&&command.kind!=='bind-remote')state.receipts[command.id] = digest;
  const receiptIds=Object.keys(state.receipts);for(const id of receiptIds.slice(0,-128))delete state.receipts[id];
  pruneObservationReceipts(state);
  if (state.active !== input.active) profile.revision++;
  profileOf(state).revision++;
  state.revision++;
  return state;
}

export function openInventory({ indexedDB, storage,
  name = inventoryDatabase, notify = () => {} } = {}) {
  let database;
  const connected = new Promise((resolve, reject) => {
    const factory = indexedDB ?? globalThis.indexedDB;
    if (!factory) { reject(new Error('IndexedDB is unavailable. No inventory changes can be saved.')); return; }
    const request = factory.open(name, 1);
    request.onupgradeneeded = () => request.result.createObjectStore('state');
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('Close older wallet tabs before opening local inventory.'));
    request.onsuccess = () => {
      database = request.result;
      database.onversionchange = () => database.close();
      resolve(database);
    };
  });

  async function transaction(mode, transform, key = 'wallet') {
    const db = await connected;
    return new Promise((resolve, reject) => {
      let tx;
      try { tx = db.transaction('state', mode, { durability: 'strict' }); }
      catch (error) { reject(error); return; }
      const store = tx.objectStore('state');
      const request = store.get(key);
      let state, failure;
      request.onsuccess = () => {
        try {
          if (key === 'wallet' && request.result) validateSnapshot(request.result);
          state = transform ? transform(request.result) : request.result;
          if (state?.then) throw new Error('Asynchronous inventory transaction is forbidden.');
          if (mode === 'readwrite' && state !== request.result) {if(key==='wallet')validateSnapshot(state);store.put(state, key);}
        } catch (error) { failure = error; tx.abort(); }
      };
      tx.onabort = () => reject(failure ?? tx.error ?? new Error('Inventory transaction aborted.'));
      tx.onerror = () => { /* onabort reports the final failure */ };
      tx.oncomplete = () => resolve(state);
    });
  }

  const read = () => transaction('readonly');
  const legacyBytes = () => {
    const source = storage ?? globalThis.localStorage;
    return { cards: source.getItem(storageKeys.cards), ledger: source.getItem(storageKeys.balanceTransfer),
      sheets: source.getItem(storageKeys.directSheets), sync: source.getItem(storageKeys.sync) };
  };
  async function captureLegacyChanges() {
    let bytes;
    try { bytes = legacyBytes(); } catch { return read(); }
    const state = await transaction('readwrite', current => {
      if (!current || equal(current.legacyObserved, bytes)) return current;
      const next = structuredClone(current);
      next.quarantine.push({ kind: 'legacy-after-migration', reason: 'Legacy storage changed after migration; it was not merged or treated as deletion.', raw: bytes });
      next.legacyObserved = bytes;
      next.revision++;
      return next;
    });
    return state;
  }
  return {
    read,
    captureLegacyChanges,
    async initialize() {
      const existing = await read();
      if (existing) {
        if (existing.schema !== 1) throw new Error('Unsupported local inventory schema.');
        // Upgrade development-stage migration IDs without remigrating inventory
        // or altering pending operation content. The namespace commits with IDs.
        await transaction('readwrite', current => {
          const needsUpgrade = Object.values(current.profiles).some(profile =>
            profile.pending.some(op => op.kind === 'legacy-recovery' && /^migration:\d+$/.test(op.id)));
          if (!needsUpgrade) return current;
          const next = structuredClone(current);
          next.migrationOperationNamespace ??= operationId();
          for (const profile of Object.values(next.profiles)) {
            for (const op of profile.pending) {
              if (op.kind === 'legacy-recovery' && /^migration:\d+$/.test(op.id)) {
                op.id = `migration:${next.migrationOperationNamespace}:${op.id.slice('migration:'.length)}`;
              }
            }
          }
          next.revision++;
          return next;
        });
        return captureLegacyChanges();
      }
      let seed = await transaction('readonly', undefined, 'migration-seed');
      if (!seed) {
        let raw;
        try {
          raw = legacyBytes();
        } catch { throw new Error('Legacy browser storage cannot be read. Migration stopped without replacing it.'); }
        // Persist a unique namespace and exact source before attempting migration.
        // An aborted inventory transaction reuses this seed on retry/restart.
        seed = await transaction('readwrite', existing => existing ?? { id: operationId(), raw }, 'migration-seed');
      }
      const candidate = migrateLegacy(seed.raw, seed.id);
      // Concurrent first opens cannot replace whichever migration committed first.
      await transaction('readwrite', state => state ?? candidate);
      const verified = await read();
      if (!verified || verified.schema !== 1) throw new Error('Local migration could not be verified.');
      return captureLegacyChanges();
    },
    async commit(command) {
      let changed=false;
      const commandHash=await fingerprint(command);
      const state = await transaction('readwrite', current => {
        if (!current) throw new Error('Initialize local inventory first.');
        const next=reduceInventory(current, command,commandHash);changed=next!==current;return next;
      });
      // Notification failures cannot turn a completed commit into a failed save.
      if(changed)try { notify(); } catch { /* tab focus also reloads committed state */ }
      return state;
    },
    async close() { (await connected).close(); },
  };
}

function validateSnapshot(state) {
  if (state.schema !== 1 || !state.profiles || !Object.hasOwn(state.profiles, state.active)) throw new Error('Unsupported or damaged local inventory. Saved data was preserved.');
  if (state.contextGeneration !== undefined && (!Number.isSafeInteger(state.contextGeneration) || state.contextGeneration < 0)) throw new Error('Damaged inventory context generation. Saved data was preserved.');
  for (const profile of Object.values(state.profiles)) {
    const cards = validateInventory(profile.cards);
    if (!Array.isArray(profile.pending) || !Number.isSafeInteger(profile.revision) || profile.revision < 0
        || cards.some((card, i) => Object.keys(card).length !== Object.keys(profile.cards[i]).length
          || Object.keys(card).some(key => !Object.is(card[key], profile.cards[i][key]))
          || !Number.isSafeInteger(profile.versions[card.cardNumber]))) {
      throw new Error('Damaged local inventory. Saved data was preserved.');
    }
    if(profile.remoteBase){validateInventory(profile.remoteBase.cards);validateEvidence(profile.remoteBase.evidence);if(profile.remoteBase.protocol!==syncProtocol)throw new Error('Unsupported local synchronization baseline.');}
    if(profile.inFlight){
      const flight=profile.inFlight;
      if(!/^[a-f0-9]{64}$/.test(flight.requestHash)||flight.request?.protocol!==syncProtocol||flight.request.principal!==profile.context.principal||flight.request.sheetId!==profile.context.sheetId||!Array.isArray(flight.request.operations))throw new Error('Damaged saved commit identity. Original work was preserved.');
      validateInventory(flight.request.cards);validateInventory(flight.request.base.cards);validateEvidence(flight.request.base.evidence);
    }
    if (profile.ledger) {
      try { decodeTransferLedger(JSON.stringify(profile.ledger)); }
      catch { profile.ledgerRecovery=true; }
      isolateBatch(state,profile);
    }
  }
}

export const inventoryBytes = state => serializeReviewInventory(profileOf(state).cards);

// The legacy Worker cannot enforce principal + exact Sheet destination. Keep
// outbound writes fail-closed; never acknowledge/remove semantic pending work.
export function requireSafeSheetWrite() {
  throw new Error('Use verified protected synchronization. Local cards remain saved.');
}
