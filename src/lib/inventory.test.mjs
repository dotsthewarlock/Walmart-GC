import assert from 'node:assert/strict';
import { test } from 'node:test';
import { migrateLegacy, openInventory, profileOf, reduceInventory, inventoryBytes, requireSafeSheetWrite, inventoryContext } from './inventory.js';
import { bundledSampleGiftCards } from './cards.js';
import { createTransferLedger, decodeTransferLedger, prepareTransferApplication } from './balanceTransferLedger.js';
import { previewTransferResults, selectTransferCards } from './balanceTransfer.js';
import { syntheticIndexedDB } from '../../tests/syntheticIndexedDB.mjs';

const first = { cardNumber: '6300000000010042', pin: '0042', startingBalance: 100, currentBalance: 100,
  merchant: '', merchantInferred: 'walmart-ca', dateAdded: '2024-01-01', dateUpdated: '2024-01-01', dateUsed: '', used: false, notes: '' };
const second = { ...first, cardNumber: '6300000000020042' };
const raw = (cards = [first], ledger = null) => ({ cards: JSON.stringify(cards), ledger, sheets: '{"spreadsheetId":"untrusted"}', sync: '{"status":"connected"}' });
const source = bytes => ({ getItem: key => bytes[{ 'walmartGc.cards': 'cards', 'walmartGc.balanceTransfer': 'ledger', 'walmartGc.directSheets': 'sheets', 'walmartGc.sync': 'sync' }[key]] });
let sequence = 0;
const command = (state, kind, values = {}) => ({ id: `operation-${++sequence}`, ...inventoryContext(state), kind, ...values });
const patch = (state, cardNumber, values, version = profileOf(state).versions[cardNumber]) => command(state, 'patch', { cardNumber, version, patch: values });
const fixture = (bytes = raw()) => {
  const indexedDB = syntheticIndexedDB();
  const store = openInventory({ indexedDB, storage: source(bytes), name: 'synthetic' });
  return { store, indexedDB };
};

test('migration preserves exact original bytes, credentials and optional false/date; leaves ownership unbound', () => {
  const bytes = raw([{ ...first, lastBalanceChecked: '2024-02-29', pendingReconciliation: false }]);
  bytes.cards = ' \n' + bytes.cards;
  const state = migrateLegacy(bytes), p = profileOf(state);
  assert.deepEqual(state.migration, bytes);
  assert.equal(p.cards[0].pin, '0042');
  assert.equal(p.cards[0].pendingReconciliation, false);
  assert.equal(p.cards[0].lastBalanceChecked, '2024-02-29');
  assert.equal(p.pending.length, 1);
  assert.equal(p.context.kind, 'unbound');
  assert.equal(p.context.principal, null);
  assert.equal(p.sheets, null);
});

test('migration quarantines every duplicate, invalid identity, unknown metadata and sample; never seeds samples', () => {
  const cards = [first, { ...first, pin: '9999' }, { ...second, cardNumber: 'broken' },
    { ...second, pendingReconciliation: "ambiguous" }, ...bundledSampleGiftCards];
  const state = migrateLegacy(raw(cards));
  assert.equal(profileOf(state).cards.length, 0);
  assert.equal(profileOf(state).pending.length, 0);
  assert.equal(state.quarantine.length, cards.length);
  const fresh = migrateLegacy({ cards: null, ledger: null, sheets: null, sync: null });
  assert.deepEqual(profileOf(fresh).cards, []);
});

test('corrupt source and damaged/interrupted ledgers are archived, not guessed or replayed', async () => {
  const damaged = migrateLegacy({ ...raw(), cards: '{broken', ledger: '{broken' });
  assert.equal(damaged.quarantine.length, 2);
  assert.equal(profileOf(damaged).ledgerRecovery, true);
  const state = sheetState();
  const ledger = await makeLedger(state);
  const request = ledger.requests[0];
  ledger.application = [{ ref: request.ref, balance: 90, checkedAt: '2026-11-25T00:01:00.000Z' }];
  const interrupted = migrateLegacy(raw([first, second], JSON.stringify(ledger)));
  assert.equal(profileOf(interrupted).ledgerRecovery, true);
  const edited=reduceInventory(interrupted, patch(interrupted, first.cardNumber, { notes: 'available' }));
  assert.equal(profileOf(edited).cards[0].notes,'available');
  assert.equal(profileOf(edited).ledgerRecovery,true);
  const before = structuredClone(interrupted);
  assert.throws(() => reduceInventory(interrupted, command(interrupted, 'discard-batch', { revision: -1 })), /changed/);
  assert.deepEqual(interrupted, before);
  const recovered = reduceInventory(interrupted, command(interrupted, 'discard-batch', { revision: 0 }));
  assert.equal(profileOf(recovered).ledgerRecovery, false);
  assert.deepEqual(recovered.migration, interrupted.migration);
  assert.deepEqual(recovered.quarantine, interrupted.quarantine);
});

test('adapter: simultaneous first migrations cannot replace migrated state; restart retains outbox', async () => {
  const { store, indexedDB } = fixture();
  const other = openInventory({ indexedDB, storage: source(raw([second])), name: 'synthetic' });
  await Promise.all([store.initialize(), other.initialize()]);
  const state = await store.read();
  assert.equal(profileOf(state).cards.length, 1);
  const number = profileOf(state).cards[0].cardNumber;
  const saved = await store.commit(patch(state, number, { notes: 'durable' }));
  await store.close();
  const restarted = openInventory({ indexedDB, storage: { getItem() { throw new Error('must not reimport'); } }, name: 'synthetic' });
  assert.deepEqual(await restarted.initialize(), saved);
  assert.equal(profileOf(saved).pending.length, 2);
});

test('adapter: save resolves only at transaction completion; storage failure leaves cards/outbox/Batch unchanged', async () => {
  const { store, indexedDB } = fixture();
  const state = await store.initialize();
  let settled = false, observed = false;
  indexedDB.beforeComplete = ({ mode }) => {
    if (mode === 'readwrite') { observed = true; assert.equal(settled, false); }
  };
  const saved = await store.commit(patch(state, first.cardNumber, { notes: 'committed' })).then(value => { settled = true; return value; });
  assert.equal(observed, true);
  indexedDB.beforeComplete = null;
  indexedDB.failNextWrite = true;
  await assert.rejects(store.commit(patch(saved, first.cardNumber, { notes: 'not saved' })), /storage failure/);
  assert.deepEqual(await store.read(), saved);
});

test('adapter: reducer abort after one bulk proposal leaves entire stored inventory unchanged', async () => {
  const { store } = fixture(raw([{ ...first, currentBalance: 0 }, { ...second, currentBalance: 0 }]));
  const state = await store.initialize();
  await assert.rejects(store.commit(command(state, 'mark-zero-used', {
    date: '2026-11-25', targets: [{ cardNumber: first.cardNumber, version: 1 }, { cardNumber: second.cardNumber, version: 99 }],
  })), /changed/);
  assert.deepEqual(await store.read(), state);
});

test('adapter: two connections preserve independent edits and reject same-card stale editors', async () => {
  const { store, indexedDB } = fixture(raw([first, second]));
  const initial = await store.initialize();
  const tab = openInventory({ indexedDB, name: 'synthetic' });
  await tab.initialize();
  await Promise.all([store.commit(patch(initial, first.cardNumber, { notes: 'tab A' })), tab.commit(patch(initial, second.cardNumber, { used: true, dateUsed: '2026-11-25' }))]);
  const current = await store.read();
  assert.equal(profileOf(current).cards[0].notes, 'tab A');
  assert.equal(profileOf(current).cards[1].used, true);
  assert.equal(profileOf(current).pending.length, 4);
  await assert.rejects(tab.commit(patch(initial, first.cardNumber, { notes: 'stale' })), /changed/);
  assert.deepEqual(await store.read(), current);
});

test('adapter: unreadable legacy storage and unavailable IndexedDB fail explicitly without replacement', async () => {
  const store = openInventory({ indexedDB: syntheticIndexedDB(), storage: { getItem() { throw new Error('denied'); } } });
  await assert.rejects(store.initialize(), /cannot be read/);
  assert.equal(await store.read(), undefined);
  const unavailable = openInventory({ indexedDB: { open() { throw new Error('IDB denied'); } } });
  await assert.rejects(unavailable.initialize(), /IDB denied/);
});

test('a notification failure cannot misreport a completed durable save as failed', async () => {
  const store = openInventory({ indexedDB: syntheticIndexedDB(), storage: source(raw()), notify() { throw new Error('Broadcast denied'); } });
  const state = await store.initialize();
  const saved = await store.commit(patch(state, first.cardNumber, { notes: 'saved despite notification failure' }));
  assert.deepEqual(await store.read(), saved);
  assert.equal(profileOf(saved).pending.length, 2);
});

test('post-migration legacy writes or clears are quarantined without changing authoritative cards/outbox', async () => {
  const bytes = raw();
  const { store } = fixture(bytes);
  const initial = await store.initialize();
  bytes.cards = JSON.stringify([{ ...first, pin: '9999' }]);
  let state = await store.captureLegacyChanges();
  assert.deepEqual(profileOf(state), profileOf(initial));
  assert.equal(state.migration.cards, initial.migration.cards);
  assert.equal(state.quarantine.at(-1).raw.cards, bytes.cards);
  assert.deepEqual(await store.captureLegacyChanges(), state);
  bytes.cards = null;
  state = await store.captureLegacyChanges();
  assert.equal(profileOf(state).cards.length, 1);
  assert.equal(profileOf(state).pending.length, 1);
});

test('CSV recovery is atomic, retains missing records and rejects conflicting PINs/stale previews', () => {
  const state = migrateLegacy(raw([first, second]));
  const recovered = reduceInventory(state, command(state, 'csv-recovery', { revision: 0, cards: [{ ...first, notes: 'recovered' }] }));
  assert.equal(profileOf(recovered).cards.length, 2);
  assert.equal(profileOf(recovered).cards[1].cardNumber, second.cardNumber);
  assert.equal(profileOf(recovered).pending.length, 3);
  assert.equal(profileOf(recovered).pending[2].kind, 'csv-recovery');
  assert.throws(() => reduceInventory(recovered, command(recovered, 'csv-recovery', { revision: 0, cards: [] })), /changed/);
  assert.throws(() => reduceInventory(state, command(state, 'csv-recovery', { revision: 0, cards: [{ ...first, pin: '9999' }] })), /credentials/);
  assert.deepEqual(profileOf(reduceInventory(state, command(state, 'csv-recovery', { revision: 0, cards: [] }))).cards, profileOf(state).cards);
});

test('historical CSV cannot erase or backdate precise verification metadata',()=>{
 const precise={...first,lastBalanceChecked:'2026-11-25',lastBalanceCheckedAt:'2026-11-25T10:00:00.000Z'};
 const state=migrateLegacy(raw([precise]));
 const updated=reduceInventory(state,command(state,'csv-recovery',{revision:0,cards:[{...first,notes:'backup'}]}));
 assert.equal(profileOf(updated).cards[0].lastBalanceCheckedAt,precise.lastBalanceCheckedAt);
 assert.throws(()=>reduceInventory(state,command(state,'csv-recovery',{revision:0,cards:[{...first,lastBalanceChecked:'2026-11-24'}]})),/different date/);
});

test('semantic operation replay is idempotent; changed payload with reused ID rejects', () => {
  const state = migrateLegacy(raw());
  const op = { ...patch(state, first.cardNumber, { notes: 'saved' }), action: 'set-notes' };
  const saved = reduceInventory(state, op);
  assert.equal(profileOf(saved).pending.at(-1).kind, 'set-notes');
  assert.deepEqual(reduceInventory(saved, op), saved);
  assert.throws(() => reduceInventory(saved, { ...op, patch: { notes: 'different' } }), /reused/);
});

function sheetState() {
  const state = migrateLegacy(raw([first]));
  return reduceInventory(state, command(state, 'sheet-import', { revision: 0, cards: [first, second], sheetId: 'sheet-A', sheetVersion: 'v1',
    sheets: { spreadsheetId: 'sheet-A', remoteSheetVersion: 'v1', status: 'ready' }, sync: { lastKnownSheetVersion: 'v1', status: 'connected' } }));
}
const makeLedger = state => createTransferLedger({ sheetId: 'sheet-A', sheetVersion: 'v1' }, selectTransferCards(profileOf(state).cards).selected, inventoryBytes(state), new Date('2026-11-25T00:00:00.000Z'));

test('Sheet import compartment preserves unbound pending work, quarantines destructive reimport, and never claims ownership', () => {
  const state = sheetState();
  assert.equal(state.profiles.unbound.pending.length, 1);
  assert.equal(profileOf(state).context.principal, null);
  assert.equal(profileOf(state).context.ownershipVerified, false);
  const preserved = reduceInventory(state, command(state, 'sheet-import', { revision: 1, cards: [], sheetId: 'sheet-A', sheetVersion: 'v2' }));
  assert.deepEqual(profileOf(preserved).cards, profileOf(state).cards);
  assert.equal(preserved.quarantine.at(-1).kind, 'sheet-read-conflict');
  assert.throws(() => reduceInventory(state, { ...patch(state, first.cardNumber, { notes: 'cross-context' }), profile: 'unbound' }), /context changed/);
  const local = reduceInventory(state, command(state, 'use-unbound'));
  assert.equal(local.active, 'unbound');
  assert.equal(local.profiles['sheet:sheet-A'].cards.length, 2);
  const edited = reduceInventory(state, patch(state, first.cardNumber, { notes: 'keep pending' }));
  const signedOut = reduceInventory(edited, command(edited, 'use-unbound'));
  const reopened = reduceInventory(signedOut, command(signedOut, 'sheet-import', { revision: profileOf(signedOut).revision,
    cards: [], sheetId: 'sheet-A', sheetVersion: 'v2' }));
  assert.equal(reopened.active, 'sheet:sheet-A');
  assert.equal(profileOf(reopened).cards[0].notes, 'keep pending');
  assert.equal(profileOf(reopened).pending.length, 1);
  assert.throws(requireSafeSheetWrite, /protected/);
});

test('an exact import operation retry remains idempotent after a context switch', () => {
  const original = migrateLegacy(raw());
  const request = command(original, 'sheet-import', { revision: 0, cards: [second], sheetId: 'sheet-B', sheetVersion: 'v1' });
  const imported = reduceInventory(original, request);
  const signedOut = reduceInventory(imported, command(imported, 'use-unbound'));
  assert.deepEqual(reduceInventory(signedOut, request), signedOut);
});

test('manual verification preserves dates, used state and dormant false flag, including unchanged observations', () => {
  const state = migrateLegacy(raw([{ ...first, used: true, pendingReconciliation: false }]));
  const verified = reduceInventory(state, command(state, 'manual-verification', { cardNumber: first.cardNumber, version: 1,
    observation: { observedBalance: 100, checkedAt: '2026-11-25T00:01:00.000Z' } }));
  const card = profileOf(verified).cards[0];
  assert.equal(card.used, true);
  assert.equal(card.pendingReconciliation, false);
  assert.equal(card.lastBalanceChecked, '2026-11-25');
  assert.equal(card.dateUpdated, first.dateUpdated);
  assert.equal(profileOf(verified).pending.at(-1).kind, 'manual-verification');
});

test('Batch partial application atomically records exact refs, inventory/outbox and remaining fingerprint', async () => {
  let state = sheetState();
  const ledger = await makeLedger(state);
  state = reduceInventory(state, command(state, 'set-batch', { revision: profileOf(state).revision, ledger }));
  const observation = { ref: ledger.requests[0].ref, balance: 80, checkedAt: '2026-11-25T00:01:00.000Z' };
  const now = Date.parse(observation.checkedAt);
  const preview = previewTransferResults(profileOf(state).ledger, profileOf(state).cards, [observation], now);
  const prepared = await prepareTransferApplication(profileOf(state).ledger, preview.candidate, preview.items.filter(i => i.outcome === 'accepted'));
  const op = command(state, 'apply-batch', { revision: profileOf(state).revision, ledgerId: ledger.id,
    observations: [observation], items: preview.items, now, inventoryDigest: prepared.finalized.inventoryDigest });
  const applied = reduceInventory(state, op), p = profileOf(applied);
  assert.equal(p.cards[0].currentBalance, 80);
  assert.equal(p.ledger.requests[0].state, 'applied');
  assert.equal(p.ledger.requests[1].state, 'pending');
  assert.equal(p.pending.at(-1).id, `observation:${observation.ref}`);
  assert.deepEqual(reduceInventory(applied, op), applied);
  assert.equal(previewTransferResults(p.ledger, p.cards, [observation], now).items[0].outcome, 'alreadyApplied');
  assert.equal(previewTransferResults(p.ledger, p.cards, [{ ...observation, balance: 70 }], now).items[0].outcome, 'rejected');
  const otherObservation = { ...observation, ref: ledger.requests[1].ref, balance: 70 };
  const remaining = previewTransferResults(p.ledger, p.cards, [otherObservation], now);
  const rest = await prepareTransferApplication(p.ledger, remaining.candidate, remaining.items);
  const completed = reduceInventory(applied, command(applied, 'apply-batch', { revision: p.revision, ledgerId: ledger.id,
    observations: [otherObservation], items: remaining.items, now, inventoryDigest: rest.finalized.inventoryDigest }));
  assert.equal(profileOf(completed).ledger.requests.every(r => r.state === 'applied'), true);
  assert.equal(profileOf(completed).ledger.inventoryDigest, null);
  assert.equal(profileOf(completed).pending.length, 2);
  const edited = reduceInventory(applied, patch(applied, second.cardNumber, { notes: 'changed after first result' }));
  assert.equal(profileOf(edited).ledger.requests[1].state, 'pending');
  assert.deepEqual(profileOf(edited).ledger.requests[0].applied, observation);
  const discarded = reduceInventory(applied, command(applied, 'discard-batch', { revision: p.revision }));
  assert.equal(discarded.observationReceipts[observation.ref],undefined);
  assert.equal(previewTransferResults(ledger,profileOf(discarded).cards,[observation],now).counts.accepted,0);
});

test('same-day unchanged manual verification invalidates only its outstanding request', async () => {
  let state = sheetState();
  const ledger = await makeLedger(state);
  state = reduceInventory(state, command(state, 'set-batch', { revision: profileOf(state).revision, ledger }));
  const number = ledger.requests[0].cardNumber;
  state = reduceInventory(state, command(state, 'manual-verification', { cardNumber: number,
    version: profileOf(state).versions[number], observation: { observedBalance: profileOf(state).cards.find(c => c.cardNumber === number).currentBalance, checkedAt: '2026-11-25T00:01:00.000Z' } }));
  assert.equal(profileOf(state).ledger.requests[0].state, 'invalidated');
  assert.equal(profileOf(state).ledger.requests[1].state, 'pending');
});

test('successive selections preserve references and accept later checks without erasing prior results', async () => {
  let state = sheetState();
  const one = await makeLedger(state);
  state = reduceInventory(state, command(state, 'set-batch', { revision: profileOf(state).revision, ledger: one }));
  const selected = selectTransferCards(profileOf(state).cards).selected;
  const two = await createTransferLedger(one.context, selected, inventoryBytes(state), new Date('2026-11-25T00:00:10.000Z'), one.id);
  assert.throws(() => decodeTransferLedger(JSON.stringify({...one, requests:[...one.requests,...two.requests]})), /damaged or unsupported/);
  state = reduceInventory(state, command(state, 'set-batch', { revision: profileOf(state).revision, ledger: two }));
  const apply = async (ref, balance, checkedAt) => {
    const observations = [{ ref, balance, checkedAt }], now = Date.parse(checkedAt), profile = profileOf(state);
    const preview = previewTransferResults(profile.ledger, profile.cards, observations, now);
    assert.equal(preview.counts.accepted, 1);
    const prepared = await prepareTransferApplication(profile.ledger, preview.candidate, preview.items);
    state = reduceInventory(state, command(state, 'apply-batch', { revision: profile.revision, ledgerId: one.id,
      observations, items: preview.items, now, inventoryDigest: prepared.finalized.inventoryDigest }));
  };
  const older = one.requests[0], later = two.requests.find(r => r.cardNumber === older.cardNumber);
  const tie = ['2026-11-25T00:01:00.000Z', '2026-11-25T00:01:00.000Z'];
  const conflicting = [{ ref: older.ref, balance: 80, checkedAt: tie[0] }, { ref: later.ref, balance: 70, checkedAt: tie[1] }];
  assert.equal(previewTransferResults(profileOf(state).ledger, profileOf(state).cards, conflicting, Date.parse(tie[0])).counts.accepted, 0);
  await apply(older.ref, 80, '2026-11-25T00:01:00.000Z');
  await apply(later.ref, 70, '2026-11-25T00:02:00.000Z');
  assert.equal(profileOf(state).cards.find(c => c.cardNumber === older.cardNumber).currentBalance, 70);
  assert.equal(profileOf(state).ledger.requests.find(r => r.ref === older.ref).state, 'applied');
  assert.equal(profileOf(state).ledger.requests.find(r => r.ref === later.ref).state, 'applied');
});

test('invalidating one obsolete reference preserves unrelated requests and later selections',async()=>{
 let state=sheetState();const ledger=await makeLedger(state);
 state=reduceInventory(state,command(state,'set-batch',{revision:profileOf(state).revision,ledger}));
 state=reduceInventory(state,command(state,'invalidate-batch-refs',{revision:profileOf(state).revision,refs:[ledger.requests[0].ref],context:ledger.context}));
 assert.equal(profileOf(state).ledger.requests[0].state,'invalidated');
 assert.equal(profileOf(state).ledger.requests[1].state,'pending');
 const next=await createTransferLedger(ledger.context,selectTransferCards(profileOf(state).cards).selected,inventoryBytes(state),new Date('2026-11-25T00:03:00.000Z'),ledger.id);
 state=reduceInventory(state,command(state,'set-batch',{revision:profileOf(state).revision,ledger:next}));
 assert.equal(profileOf(state).ledger.requests.length,ledger.requests.length+next.requests.length);
});
test('foreign historical requests are preserved for recovery and cannot cross inventories',async()=>{
 let state=sheetState();const ledger=await makeLedger(state);ledger.context.sheetId='other-sheet';
 profileOf(state).ledger=ledger;
 state=reduceInventory(state,command(state,'archive-foreign-batch',{revision:profileOf(state).revision}));
 assert.equal(profileOf(state).ledger,null);
 assert.deepEqual(state.quarantine.at(-1).ledger,ledger);
 assert.equal(state.quarantine.at(-1).kind,'foreign-batch');
});

test('an unbound local inventory can retain requests without transferring them to a Sheet compartment', async () => {
  let state = migrateLegacy(raw());
  const ledger = await createTransferLedger({sheetId:'local:unbound',sheetVersion:'local'}, selectTransferCards(profileOf(state).cards).selected, inventoryBytes(state));
  state = reduceInventory(state, command(state, 'set-batch', {revision:profileOf(state).revision,ledger}));
  state = reduceInventory(state, command(state, 'sheet-import', {revision:profileOf(state).revision,cards:[second],sheetId:'sheet-A',sheetVersion:'v1'}));
  assert.equal(profileOf(state).ledger, null);
  assert.equal(state.profiles.unbound.ledger.requests[0].state, 'pending');
});

test('leaving and reopening a compartment preserves its outstanding references while fencing old commands', async () => {
  let state = sheetState();
  const ledger = await makeLedger(state);
  state = reduceInventory(state, command(state, 'set-batch', { revision: profileOf(state).revision, ledger }));
  const oldContext = inventoryContext(state);
  const originalProfile = state.active;
  state = reduceInventory(state, command(state, 'use-unbound'));
  state = reduceInventory(state, command(state, 'select-compartment', { target: originalProfile }));
  assert.equal(profileOf(state).ledger.requests[0].state, 'pending');
  assert.throws(() => reduceInventory(state, { id: crypto.randomUUID(), kind: 'discard-batch', ...oldContext, revision: profileOf(state).revision }), /context changed/);
});

test('Batch apply failure leaves all accepted observations and reference states together at previous commit', async () => {
  const { store, indexedDB } = fixture(raw([first]));
  await store.initialize();
  // Seed a synthetic Sheet read through the same public transaction API.
  let state = await store.read();
  state = await store.commit(command(state, 'sheet-import', { revision: 0, cards: [first, second], sheetId: 'sheet-A', sheetVersion: 'v1', sync: { lastKnownSheetVersion: 'v1' } }));
  const ledger = await makeLedger(state);
  state = await store.commit(command(state, 'set-batch', { revision: profileOf(state).revision, ledger }));
  const observation = { ref: ledger.requests[0].ref, balance: 80, checkedAt: '2026-11-25T00:01:00.000Z' };
  const now = Date.parse(observation.checkedAt);
  const preview = previewTransferResults(profileOf(state).ledger, profileOf(state).cards, [observation], now);
  const prepared = await prepareTransferApplication(profileOf(state).ledger, preview.candidate, preview.items);
  indexedDB.failNextWrite = true;
  await assert.rejects(store.commit(command(state, 'apply-batch', { revision: profileOf(state).revision, ledgerId: ledger.id,
    observations: [observation], items: preview.items, now, inventoryDigest: prepared.finalized.inventoryDigest })), /storage failure/);
  assert.deepEqual(await store.read(), state);
});

test('offline compartment selection retains separate inventories, outboxes and Batch recovery across restart', async () => {
  const { store, indexedDB } = fixture();
  let state = await store.initialize();
  state = await store.commit(command(state, 'sheet-import', { revision: 0, cards: [second], sheetId: 'offline-sheet', sheetVersion: 'v1' }));
  state = await store.commit(patch(state, second.cardNumber, { notes: 'saved Sheet edit' }));
  const savedSheet = structuredClone(profileOf(state));
  state = await store.commit(command(state, 'select-compartment', { target: 'unbound' }));
  assert.equal(profileOf(state).cards[0].cardNumber, first.cardNumber);
  assert.equal(profileOf(state).pending.length, 1);
  assert.equal(state.profiles['sheet:offline-sheet'].pending.length, 1);
  state = await store.commit(command(state, 'select-compartment', { target: 'sheet:offline-sheet' }));
  assert.deepEqual(profileOf(state).cards, savedSheet.cards);
  assert.deepEqual(profileOf(state).pending, savedSheet.pending);
  assert.equal(profileOf(state).context.ownershipVerified, false);
  await store.close();
  const reopened = openInventory({ indexedDB, name: 'synthetic', storage: source(raw()) });
  assert.deepEqual(await reopened.initialize(), state);
  await assert.rejects(reopened.commit(command(state, 'select-compartment', { target: 'missing' })), /unavailable/);
  const damaged = migrateLegacy(raw([first], '{broken'));
  assert.doesNotThrow(() => reduceInventory(damaged, command(damaged, 'select-compartment', { target: 'unbound' })));
});

test('CSV backups address a captured compartment and recovery export retains exact original and quarantined credentials', async () => {
  const { savedCompartments, compartmentCards, recoveryExport, recoveryWarning } = await import('./inventory.js');
  const { cardsToCsv, parseRawCardData } = await import('./csv.js');
  const bytes = raw([first, { ...second, pin: '1111' }, { ...second, pin: '2222' }], '{broken');
  bytes.cards = ' \n' + bytes.cards;
  const migrated = migrateLegacy(bytes);
  const initial = reduceInventory(migrated, command(migrated, 'discard-batch', { revision: 0 }));
  const state = reduceInventory(initial, command(initial, 'sheet-import', { revision: profileOf(initial).revision, cards: [second], sheetId: 'backup-sheet', sheetVersion: 'v1' }));
  assert.equal(savedCompartments(state).length, 2);
  assert.match(savedCompartments(state)[1].label, /ownership unverified/);
  assert.deepEqual(parseRawCardData(cardsToCsv(compartmentCards(state, 'unbound'))).parsedCards, profileOf(initial).cards);
  assert.equal(parseRawCardData(cardsToCsv(compartmentCards(state, 'sheet:backup-sheet'))).parsedCards[0].cardNumber, second.cardNumber);
  assert.throws(() => compartmentCards(state, 'missing'), /unavailable/);
  const exported = JSON.parse(recoveryExport(state));
  assert.match(recoveryWarning, /contain card credentials/);
  assert.equal(exported.warning, recoveryWarning);
  assert.deepEqual(exported.wallet, JSON.parse(JSON.stringify(state)));
  assert.equal(exported.wallet.migration.cards, bytes.cards);
  assert.deepEqual(exported.wallet.quarantine.filter(item => item.kind === 'legacy-card').map(item => item.record.pin), ['1111', '2222']);
  assert.equal(exported.wallet.migration.ledger, '{broken');
  assert.equal(profileOf(state).cards.length, 1); // No ambiguous records merged.
});

test('persistent generations reject stale editors and responses after switching away and back, including across connections', async () => {
  const { assertInventoryContext } = await import('./inventory.js');
  const { store, indexedDB } = fixture();
  let state = await store.initialize();
  state = await store.commit(command(state, 'sheet-import', { revision: 0, cards: [second], sheetId: 'generation-sheet', sheetVersion: 'v1' }));
  const stale = state;
  const tab = openInventory({ indexedDB, name: 'synthetic', storage: source(raw()) });
  state = await tab.commit(command(state, 'select-compartment', { target: 'unbound' }));
  state = await tab.commit(command(state, 'select-compartment', { target: stale.active }));
  assert.equal(state.active, stale.active);
  assert.equal(profileOf(state).versions[second.cardNumber], profileOf(stale).versions[second.cardNumber]);
  assert.throws(() => assertInventoryContext(state, inventoryContext(stale)), /context changed/);
  const requests = [
    patch(stale, second.cardNumber, { notes: 'obsolete' }),
    command(stale, 'manual-verification', { cardNumber: second.cardNumber, version: 1, observation: { observedBalance: 90, checkedAt: '2026-11-25T00:01:00.000Z' } }),
    command(stale, 'csv-recovery', { revision: profileOf(stale).revision, cards: [first] }),
    command(stale, 'observe-session', { status: { authenticated: false } }),
    command(stale, 'sheet-import', { revision: profileOf(stale).revision, cards: [], sheetId: 'wrong-sheet', sheetVersion: 'v2' }),
    command(stale, 'discard-batch', { revision: profileOf(stale).revision }),
  ];
  for (const request of requests) await assert.rejects(store.commit(request), /context changed/);
  assert.deepEqual(await store.read(), state);
  await store.close();
  const reopened = openInventory({ indexedDB, name: 'synthetic', storage: source(raw()) });
  assert.equal((await reopened.initialize()).contextGeneration, state.contextGeneration);
  await assert.rejects(reopened.commit(patch(stale, second.cardNumber, { notes: 'still stale after restart' })), /context changed/);
});

test('new authentication/Sheet request epochs reject delayed success and failure contexts without clearing pending work', async () => {
  const { assertInventoryContext } = await import('./inventory.js');
  const { store } = fixture();
  let state = await store.initialize();
  state = await store.commit(command(state, 'begin-context'));
  const firstRequest = inventoryContext(state);
  let release;
  const delayed = new Promise(resolve => { release = resolve; }).then(async () => {
    assertInventoryContext(await store.read(), firstRequest);
    return store.commit({ id: 'delayed-status', kind: 'observe-session', ...firstRequest, status: { authenticated: true } });
  });
  const pending = structuredClone(profileOf(state).pending);
  state = await store.commit(command(state, 'begin-context'));
  release();
  await assert.rejects(delayed, /context changed/);
  assert.throws(() => assertInventoryContext(state, firstRequest), /context changed/); // Same guard used before error setters.
  assert.deepEqual(profileOf(await store.read()).pending, pending);
  assert.doesNotThrow(() => assertInventoryContext(state, inventoryContext(state)));
});

test('migration IDs are globally namespaced, stable after failed inventory transaction and independent of later legacy bytes', async () => {
  const bytes = raw();
  const indexedDB = syntheticIndexedDB();
  let seed;
  indexedDB.beforeComplete = ({ key, proposed }) => {
    if (key === 'migration-seed' && proposed) { seed = proposed; indexedDB.failNextWrite = true; }
  };
  const store = openInventory({ indexedDB, storage: source(bytes), name: 'retry-migration' });
  await assert.rejects(store.initialize(), /storage failure/);
  assert.equal(await store.read(), undefined);
  assert.match(seed.id, /^[0-9a-f-]{36}$/);
  indexedDB.beforeComplete = null;
  bytes.cards = JSON.stringify([second]);
  await store.close();
  const restarted = openInventory({ indexedDB, storage: source(bytes), name: 'retry-migration' });
  const state = await restarted.initialize();
  const id = profileOf(state).pending[0].id;
  assert.equal(id, `migration:${seed.id}:0`);
  assert.equal(profileOf(state).cards[0].cardNumber, first.cardNumber);
  assert.equal(state.quarantine.at(-1).raw.cards, bytes.cards);
  assert.equal(profileOf(await restarted.initialize()).pending[0].id, id);
  const independent = fixture(raw());
  const other = await independent.store.initialize();
  assert.notEqual(profileOf(other).pending[0].id, id);
});

test('existing development migration IDs upgrade atomically without changing cards, evidence or pending operation content', async () => {
  const indexedDB = syntheticIndexedDB();
  const request = indexedDB.open('older-wallet', 1);
  const db = await new Promise(resolve => { request.onsuccess = () => resolve(request.result); });
  const older = migrateLegacy(raw());
  delete older.contextGeneration;
  delete older.migrationOperationNamespace;
  profileOf(older).pending[0].id = 'migration:0';
  await new Promise(resolve => { const tx = db.transaction('state', 'readwrite'); tx.objectStore('state').get('wallet').onsuccess = () => tx.objectStore('state').put(older, 'wallet'); tx.oncomplete = resolve; });
  const store = openInventory({ indexedDB, name: 'older-wallet', storage: source(raw()) });
  indexedDB.failNextWrite = true;
  await assert.rejects(store.initialize(), /storage failure/);
  assert.deepEqual(await store.read(), older);
  const upgraded = await store.initialize();
  assert.match(profileOf(upgraded).pending[0].id, /^migration:[0-9a-f-]{36}:0$/);
  assert.deepEqual(profileOf(upgraded).cards, profileOf(older).cards);
  assert.deepEqual(upgraded.quarantine, older.quarantine);
  const expected = structuredClone(profileOf(older).pending);
  expected[0].id = profileOf(upgraded).pending[0].id;
  assert.deepEqual(profileOf(upgraded).pending, expected);
  assert.deepEqual(await store.initialize(), upgraded);
});

test('UI exposes protected synchronization, account recovery and balance warning without mandatory hold',async()=>{
  const {readFile}=await import('node:fs/promises');
  const app=await readFile(new URL('../App.jsx',import.meta.url),'utf8');
  const settings=await readFile(new URL('../features/settings/SettingsPanel.jsx',import.meta.url),'utf8');
  const checkout=await readFile(new URL('../features/checkout/CheckoutPanel.jsx',import.meta.url),'utf8');
  assert.match(app,/createSyncEngine/);assert.match(settings,/Sync now/);assert.match(checkout,/Balance needs verification/);
  assert.match(app,/window.confirm\(recoveryWarning\)/);assert.match(settings,/commands.exportCsv\(undefined, inventory.activeKey\)/);
  assert.doesNotMatch(app,/Sheet writes are paused during this development stage/);
});
