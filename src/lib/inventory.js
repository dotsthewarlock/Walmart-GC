import { bundledSampleGiftCards, normalizeCard, serializeReviewInventory } from './cards.js';
import { csvHeaders } from './csvSchema.js';
import { applyBalanceObservation, createBalanceReviewQueue } from './balanceReview.js';
import { previewTransferResults } from './balanceTransfer.js';
import { decodeTransferLedger, invalidatedLedger } from './balanceTransferLedger.js';
import { storageKeys } from './storage.js';

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
    label: key === 'unbound' ? 'Unbound local inventory' : `Saved Sheet ${profile.context.sheetId} (ownership unverified)`,
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
  ledgerRecovery: false, revision: 0, context, sheets: null, sync: null });

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

function editable(profile) {
  if (profile.ledgerRecovery || profile.ledger?.application) {
    throw new Error('An interrupted or damaged Batch was preserved. Open Batch and discard it after reloading the saved inventory.');
  }
}

function record(profile, op, before, after) {
  const number = after?.cardNumber ?? before?.cardNumber;
  const revision = (profile.versions[number] || 0) + 1;
  profile.versions[number] = revision;
  const position = profile.cards.findIndex(c => c.cardNumber === number);
  if (position < 0) profile.cards.push(after);
  else profile.cards[position] = after;
  profile.pending.push({ id: op.id, kind: op.kind, cardNumber: number, before, after,
    revision, ...(op.observation ? { observation: op.observation } : {}) });
}

// Pure reducer: the native adapter invokes it only after reading inside the
// readwrite transaction. Every command is immutable and independently retryable.
export function reduceInventory(input, command) {
  if (input.schema !== 1) throw new Error('Unsupported local inventory schema.');
  const state = structuredClone(input);
  const profile = profileOf(state);
  if (!command.id || !command.profile) throw new Error('Missing operation identity or context.');
  const digest = JSON.stringify(command);
  if (Object.hasOwn(state.receipts, command.id)) {
    if (state.receipts[command.id] !== digest) throw new Error('Operation ID was reused with different content.');
    return input;
  }
  assertInventoryContext(state, command);
  state.contextGeneration ??= 0;
  if (command.kind === 'begin-context') {
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
        || status.sheetVersion !== profile.ledger.context.sheetVersion)) {
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
  } else if (command.kind === 'patch' || command.kind === 'manual-verification') {
    editable(profile);
    const before = profile.cards.find(c => c.cardNumber === command.cardNumber);
    if (!before || profile.versions[command.cardNumber] !== command.version) throw new Error(stale);
    let after;
    if (command.kind === 'manual-verification') {
      const entry = createBalanceReviewQueue(profile.cards).find(e => e.card.cardNumber === command.cardNumber);
      after = applyBalanceObservation(profile.cards, { ...command.observation, cardNumber: command.cardNumber, expected: entry })
        .find(c => c.cardNumber === command.cardNumber);
    } else {
      const allowed = ['currentBalance', 'dateUpdated', 'used', 'dateUsed', 'notes'];
      if (Object.keys(command.patch).some(k => !allowed.includes(k))) throw new Error('Unsupported local edit.');
      [after] = validateInventory([{ ...before, ...command.patch }]);
    }
    profile.ledger = invalidatedLedger(profile.ledger);
    record(profile, { ...command, kind: command.action ?? command.kind }, before, after);
  } else if (command.kind === 'mark-zero-used') {
    editable(profile);
    for (const target of command.targets) {
      const before = profile.cards.find(c => c.cardNumber === target.cardNumber);
      if (!before || profile.versions[target.cardNumber] !== target.version || before.currentBalance !== 0) throw new Error(stale);
      record(profile, { ...command, id: `${command.id}:${before.cardNumber}` }, before,
        { ...before, used: true, dateUsed: command.date });
    }
    profile.ledger = invalidatedLedger(profile.ledger);
  } else if (command.kind === 'csv-recovery') {
    editable(profile);
    if (command.revision !== profile.revision) throw new Error(stale);
    const recovered = validateInventory(command.cards);
    if (recovered.some(c => samples.has(c.cardNumber))) throw new Error('Bundled sample identities cannot be imported into the real inventory.');
    profile.ledger = invalidatedLedger(profile.ledger);
    for (const card of recovered) {
      const before = profile.cards.find(c => c.cardNumber === card.cardNumber);
      if (before && before.pin !== card.pin) throw new Error('CSV credentials conflict with a saved card. Original cards were preserved.');
      if (!equal(before, card)) record(profile, { ...command, id: `${command.id}:${card.cardNumber}` }, before ?? null, card);
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
    profile.ledger = invalidatedLedger(profile.ledger);
    state.active = 'unbound';
  } else if (command.kind === 'set-batch') {
    editable(profile);
    if (command.revision !== profile.revision) throw new Error(stale);
    const ledger = decodeTransferLedger(JSON.stringify(command.ledger));
    if (ledger.application || ledger.requests.some(r => r.state !== 'pending')) throw new Error('A new Batch must contain only pending requests.');
    if (ledger.requests.some(r => Object.hasOwn(state.observationReceipts, r.ref))) throw new Error('A Batch reference was already applied. Create a new Batch.');
    if (profile.context.kind !== 'sheet' || ledger.context.sheetId !== profile.context.sheetId
        || ledger.context.sheetVersion !== profile.sync?.lastKnownSheetVersion) throw new Error('Establish matching Sheet context before creating Batch.');
    profile.ledger = ledger;
  } else if (command.kind === 'apply-batch') {
    editable(profile);
    if (command.revision !== profile.revision || command.ledgerId !== profile.ledger?.id) throw new Error(stale);
    const result = previewTransferResults(profile.ledger, profile.cards, command.observations, command.now);
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
    }
    // SHA-256 is prepared before transaction and protected by the revision CAS.
    profile.ledger.inventoryDigest = command.inventoryDigest;
    decodeTransferLedger(JSON.stringify(profile.ledger));
  } else {
    throw new Error('Unknown inventory operation.');
  }
  state.receipts[command.id] = digest;
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
          if (mode === 'readwrite' && state !== request.result) store.put(state, key);
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
      const state = await transaction('readwrite', current => {
        if (!current) throw new Error('Initialize local inventory first.');
        return reduceInventory(current, command);
      });
      // Notification failures cannot turn a completed commit into a failed save.
      try { notify(); } catch { /* tab focus also reloads committed state */ }
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
    if (profile.ledger) decodeTransferLedger(JSON.stringify(profile.ledger));
  }
}

export const inventoryBytes = state => serializeReviewInventory(profileOf(state).cards);

// The legacy Worker cannot enforce principal + exact Sheet destination. Keep
// outbound writes fail-closed; never acknowledge/remove semantic pending work.
export function requireSafeSheetWrite() {
  throw new Error('Sheet writes are intentionally paused during this development stage. Local cards and pending changes remain saved; use CSV backup.');
}
