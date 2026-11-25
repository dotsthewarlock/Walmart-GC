import assert from 'node:assert/strict';
import { test } from 'node:test';
import { migrateLegacy, openInventory, profileOf, reduceInventory, inventoryBytes, requireSafeSheetWrite } from './inventory.js';
import { bundledSampleGiftCards } from './cards.js';
import { createTransferLedger, prepareTransferApplication } from './balanceTransferLedger.js';
import { previewTransferResults, selectTransferCards } from './balanceTransfer.js';
import { syntheticIndexedDB } from '../../tests/syntheticIndexedDB.mjs';

const first = { cardNumber: '6300000000010042', pin: '0042', startingBalance: 100, currentBalance: 100,
  merchant: '', merchantInferred: 'walmart-ca', dateAdded: '2024-01-01', dateUpdated: '2024-01-01', dateUsed: '', used: false, notes: '' };
const second = { ...first, cardNumber: '6300000000020042' };
const raw = (cards = [first], ledger = null) => ({ cards: JSON.stringify(cards), ledger, sheets: '{"spreadsheetId":"untrusted"}', sync: '{"status":"connected"}' });
const source = bytes => ({ getItem: key => bytes[{ 'walmartGc.cards': 'cards', 'walmartGc.balanceTransfer': 'ledger', 'walmartGc.directSheets': 'sheets', 'walmartGc.sync': 'sync' }[key]] });
let sequence = 0;
const command = (state, kind, values = {}) => ({ id: `operation-${++sequence}`, profile: state.active, kind, ...values });
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
    { ...second, pendingReconciliation: true }, ...bundledSampleGiftCards];
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
  assert.throws(() => reduceInventory(interrupted, patch(interrupted, first.cardNumber, { notes: 'blocked' })), /interrupted|damaged/);
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
const makeLedger = state => createTransferLedger({ sheetId: 'sheet-A', sheetVersion: 'v1' }, selectTransferCards(profileOf(state).cards, 'all').selected, inventoryBytes(state), new Date('2026-11-25T00:00:00.000Z'));

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
  assert.throws(requireSafeSheetWrite, /paused/);
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
  assert.equal(profileOf(edited).ledger.requests[1].state, 'invalidated');
  assert.deepEqual(profileOf(edited).ledger.requests[0].applied, observation);
  const discarded = reduceInventory(applied, command(applied, 'discard-batch', { revision: p.revision }));
  assert.ok(discarded.observationReceipts[observation.ref]);
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
