import assert from "node:assert/strict";
import { test } from "node:test";
import {
  formatTransferRequest, parseTransferResults, previewTransferResults, requireTransferContext,
  isTransferReference, selectTransferCards, transferRequestRows, defaultTransferPreferences, readTransferPreferences,
} from "./balanceTransfer.js";
import {
  assertTransferUnchanged, checkTransferContinuity, commitTransferApplication, createTransferLedger,
  createTransferDiscardGuard, decodeTransferLedger, invalidateOnObservedContext, invalidateTransferBeforeMutation,
  prepareTransferApplication, readTransferLedger, writeTransferLedger,
} from "./legacyTransfer.fixture.mjs";
import { bundledSampleGiftCards } from "./cards.js";
import { loadCards } from "./legacyCards.fixture.mjs";
import { schemaCapability } from "./csvSchema.js";
import { storageKeys } from "./storage.js";

const created = "2026-06-01T11:00:00.000Z";
const checked = "2026-06-01T11:01:00.012Z";
const now = Date.parse(checked);
const context = { sheetId: "fixture-sheet", sheetVersion: "fixture-v1" };
const status = { ...context, authenticated: true, schemaCapability };
const knownContext = {
  sync: { status: "connected", lastKnownSheetVersion: context.sheetVersion },
  sheets: { status: "ready", spreadsheetId: context.sheetId, remoteSheetVersion: context.sheetVersion },
};
const unknownRef = "10000000-0000-4000-8000-000000000001";
const header = "WMGC-RESULT\t1\nref\tbalanceCAD\tcheckedAt";
const prefs = (changes = {}) => ({ ...defaultTransferPreferences, ...changes });

function card(index, fields = {}) {
  return {
    cardNumber: `63${String(index).padStart(10, "0")}0042`, pin: "0007", currentBalance: 8, startingBalance: 10,
    used: false, merchant: "", merchantInferred: "walmart-ca", dateAdded: "2026-01-01", dateUpdated: "2026-02-01",
    dateUsed: "", notes: "Synthetic", pendingReconciliation: false, ...fields,
  };
}

function resultPacket(...rows) {
  return [header, ...rows.map((row) => row.join("\t"))].join("\n");
}

function mockStorage(t, cards) {
  const prior = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  const store = new Map([[storageKeys.cards, JSON.stringify(cards)]]);
  const writes = [];
  const fixture = {
    store, writes, fail: () => false, ignore: () => false,
    getItem(key) { return store.get(key) ?? null; },
    setItem(key, data) {
      if (fixture.fail(key, data)) throw new Error("blocked write");
      if (fixture.ignore(key, data)) return;
      writes.push(key);
      store.set(key, data);
    },
    removeItem(key) { store.delete(key); },
  };
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: fixture });
  t.after(() => {
    if (prior) Object.defineProperty(globalThis, "localStorage", prior);
    else delete globalThis.localStorage;
  });
  return fixture;
}

async function makeLedger(cards, inventoryRaw = JSON.stringify(cards)) {
  return createTransferLedger(context, selectTransferCards(cards, prefs({ status: "all", balance: "all" })).selected, inventoryRaw, new Date(created));
}

function observation(request, balance = 8, checkedAt = checked) {
  return { ref: request.ref, balance, checkedAt };
}

async function stage(t, cards = [card(1), card(2)]) {
  const fixture = mockStorage(t, cards);
  const inventoryRaw = fixture.getItem(storageKeys.cards);
  const ledger = await makeLedger(cards, inventoryRaw);
  const raw = writeTransferLedger(null, ledger);
  return { fixture, inventoryRaw, ledger, raw, cards };
}

test("selection excludes ambiguous identities and invalid transfer credentials", () => {
  const valid = card(1);
  const inventory = [valid, card(2, { pin: "12345" }), card(3, { pin: "１２３４" }), card(4), card(4, { pin: "9999" }), ...bundledSampleGiftCards];
  assert.deepEqual(selectTransferCards(inventory, prefs({ status: "all", balance: "all" })).selected.map(x => x.card), [valid]);
});

test("independent filters, explicit sorts and limits preserve deterministic identities", () => {
  const cards = [card(1, { used: true, currentBalance: 0 }), card(2, { currentBalance: 0, lastBalanceChecked: "2026-05-25", dateAdded: "2026-02-01" }),
    card(3, { used: true, lastBalanceChecked: "2026-05-24", currentBalance: 20 }), card(4, { lastBalanceChecked: "2026-05-25" }), card(5)];
  const select = changes => selectTransferCards([...cards].reverse(), prefs(changes), new Date("2026-06-01T23:59:59Z"));
  const ids = changes => select(changes).selected.map(x => x.card.cardNumber);
  assert.deepEqual(ids({}), [cards[4], cards[3]].map(x => x.cardNumber));
  assert.deepEqual(ids({ status: "used", balance: "zero" }), [cards[0].cardNumber]);
  assert.deepEqual(ids({ status: "all", balance: "all", checked: "older", days: 7 }), [cards[0], cards[4], cards[2], cards[1], cards[3]].map(x => x.cardNumber));
  assert.deepEqual(ids({ status: "all", balance: "all", checked: "recent", days: 7 }), [cards[1], cards[3]].map(x => x.cardNumber));
  assert.deepEqual(ids({ status: "all", balance: "all", sort: "checked-newest" }), [cards[1], cards[3], cards[2], cards[0], cards[4]].map(x => x.cardNumber));
  assert.deepEqual(ids({ status: "all", balance: "all", sort: "added-newest", quantity: "1" }), [cards[1].cardNumber]);
  assert.deepEqual(ids({ status: "all", balance: "all", sort: "balance-highest", quantity: "1" }), [cards[2].cardNumber]);
  assert.deepEqual(ids({ status: "all", balance: "all", sort: "balance-lowest", quantity: "1" }), [cards[0].cardNumber]);
});

test("selection preferences migrate checkboxes and validate saved values", () => {
  const read = value => readTransferPreferences({ getItem: () => value });
  const valid = prefs({ quantity: "50", status: "used", balance: "zero", checked: "older", days: 7, sort: "added-oldest" });
  assert.deepEqual(read(JSON.stringify(valid)), valid);
  assert.deepEqual(read(JSON.stringify({ version: 1, quantity: "5", includeUsed: true, includeZero: true, checked: "older", days: 7 })), prefs({ quantity: "5", status: "all", balance: "all", checked: "older", days: 7 }));
  assert.deepEqual(read(JSON.stringify({ version: 1, quantity: "10", includeUsed: "true", includeZero: false })), prefs());
  for (const raw of [null, "{", JSON.stringify({ version: 3 })]) assert.deepEqual(read(raw), prefs());
  assert.deepEqual(readTransferPreferences({ getItem() { throw Error("blocked"); } }), prefs());
});

test("saved used zero-balance requests remain copyable and applicable with default filters", async () => {
  const cards = [card(1, { used: true, currentBalance: 0, dateUsed: "2026-02-01" })];
  const ledger = await makeLedger(cards);
  assert.equal(selectTransferCards(cards).matching, 0);
  assert.equal(transferRequestRows(ledger, cards).length, 1);
  const preview = previewTransferResults(ledger, cards, [observation(ledger.requests[0], 12)], now);
  assert.equal(preview.counts.accepted, 1);
  assert.equal(preview.candidate[0].used, true);
  assert.equal(preview.candidate[0].currentBalance, 12);
});

test("request format preserves leading zeros and resuming uses the original lowercase UUID references", async (t) => {
  const { cards, raw, ledger } = await stage(t);
  const loaded = decodeTransferLedger(raw);
  const request = formatTransferRequest(transferRequestRows(loaded, loadCards()));
  assert.equal(request, [
    "WMGC-REQUEST\t1", "ref\tcardNumber\tpin",
    ...ledger.requests.map(({ ref }, i) => `${ref}\t${cards[i].cardNumber}\t0007`),
  ].join("\n"));
  assert.ok(ledger.requests.every(({ ref }) => isTransferReference(ref)));
  assert.equal(new Set(ledger.requests.map(({ ref }) => ref)).size, 2);
  assert.notDeepEqual((await makeLedger(cards)).requests.map(({ ref }) => ref), ledger.requests.map(({ ref }) => ref));
  assert.equal(raw.includes('"pin"'), false);
  assert.equal(raw.includes("WMGC-REQUEST"), false);
  assert.throws(() => formatTransferRequest([{ ref: unknownRef.toUpperCase().replace(/^1/, "A"), ...cards[0] }]), /invalid/);
  assert.throws(() => formatTransferRequest([{ ref: unknownRef, ...cards[0] }, { ref: unknownRef, ...cards[1] }]), /ambiguous/);
});

test("result parser accepts BOM, CRLF, blanks at the end and identical duplicates", () => {
  const row = [unknownRef, "000.05", checked];
  const packet = resultPacket(row, row).replaceAll("\n", "\r\n");
  assert.deepEqual(parseTransferResults("\uFEFF" + packet + "\r\n\r\n"), [{ ref: unknownRef, balance: 0.05, checkedAt: checked }]);
  assert.throws(() => parseTransferResults(resultPacket(row, [unknownRef, "0.06", checked])), /Conflicting/);
  for (const bad of [
    resultPacket(row).replace("WMGC-RESULT", "wmgc-result"),
    resultPacket(row).replace("RESULT\t1", "RESULT\t2"), resultPacket(row).replace("balanceCAD", "balance"),
    "cardNumber,balance\n0001,1.00", resultPacket(row).replaceAll("\t", ","),
    resultPacket(row).replaceAll("\n", "\r"), header, resultPacket(row, [], row),
  ]) assert.throws(() => parseTransferResults(bad), /Wallet results|Invalid result/);
  for (const balance of ["0", "-0.00", "+1.00", "1.2", "1.001", "=1.00", "1,000.00", "90071992547409.92", "1e4", " 1.00"]) {
    assert.throws(() => parseTransferResults(resultPacket([unknownRef, balance, checked])), /Invalid result|accurately/);
  }
  for (const date of [checked.replace(".012", ""), checked.replace("Z", "+00:00"), "2026-02-30T00:00:00.000Z", "2026-06-01T24:00:00.000Z"]) {
    assert.throws(() => parseTransferResults(resultPacket([unknownRef, "1.00", date])), /UTC timestamp/);
  }
  for (const ref of [unknownRef.replace("4000", "5000"), unknownRef.replace("8000", "7000"), unknownRef.replace("1000", "AA00")]) {
    assert.throws(() => parseTransferResults(resultPacket([ref, "1.00", checked])), /UUID/);
  }
});

test("authentication requires matching authenticated context, established sync, and compatible capability", () => {
  assert.deepEqual(requireTransferContext(status, knownContext), context);
  for (const changed of [
    { authenticated: false }, { schemaCapability: "legacy" }, { sheetId: "" }, { sheetVersion: "" },
    { sheetId: "different" }, { sheetVersion: "different" },
  ]) assert.throws(() => requireTransferContext({ ...status, ...changed }, knownContext));
  assert.throws(() => requireTransferContext(status, {}), /context/);
  assert.throws(() => requireTransferContext(status, { ...knownContext, sync: { ...knownContext.sync, status: "conflict" } }), /context/);
});

test("protected Batch uses verified identity and confirmed snapshot rather than the session version", () => {
  const protectedStatus = { ...status, principal: 'account-A', ownershipVerified: true, coordinationAvailable: true, syncProtocol: 'gc-wallet-sync-v1' };
  const local = { ...knownContext, context: { kind: 'sheet', principal: 'account-A', sheetId: context.sheetId, ownershipVerified: true },
    remoteBase: { protocol: 'gc-wallet-sync-v1', version: context.sheetVersion } };
  for (const sheetVersion of ['', 'stale']) assert.deepEqual(requireTransferContext({ ...protectedStatus, sheetVersion }, local), context);
  for (const changed of [{ principal: 'account-B' }, { principal: '' }, { ownershipVerified: false }, { sheetId: 'other' }, { coordinationAvailable: false }]) {
    assert.throws(() => requireTransferContext({ ...protectedStatus, ...changed }, local));
  }
  for (const changed of [{ context: { ...local.context, principal: 'account-B' } }, { context: { ...local.context, sheetId: 'other' } },
    { context: { ...local.context, ownershipVerified: false } }, { remoteBase: null }, { remoteBase: { ...local.remoteBase, version: 'stale' } }]) {
    assert.throws(() => requireTransferContext(protectedStatus, { ...local, ...changed }));
  }
});

test("preview counts outcomes, applies only accepted exact identities and preserves all unrelated fields", async () => {
  const cards = [card(1), card(2), card(3, { used: true, dateUsed: "2026-02-01" }),
    card(4, { lastBalanceChecked: "2026-06-01" }), card(5), card(6), card(7)];
  const ledger = await makeLedger(cards);
  const byNumber = (index) => ledger.requests.find(({ cardNumber }) => cardNumber === cards[index - 1].cardNumber);
  const preview = previewTransferResults(ledger, cards, [
    observation(byNumber(1), 0), observation(byNumber(2)), observation(byNumber(3), 21.12),
    observation(byNumber(4)), observation(byNumber(5), 9, "2026-06-01T10:59:59.999Z"),
    observation(byNumber(6), 9, "2026-06-01T11:02:00.013Z"), observation(byNumber(7), 8, "2026-06-01T11:02:00.012Z"),
    { ref: unknownRef, balance: 1, checkedAt: checked },
  ], now);
  assert.deepEqual(preview.counts, {
    accepted: 4, changed: 2, unchanged: 2, unknown: 1, invalidated: 0, stale: 3, alreadyApplied: 0, rejected: 0,
  });
  assert.equal(preview.netCents, 512n);
  assert.deepEqual(preview.candidate[0], { ...cards[0], currentBalance: 0, dateUpdated: "2026-06-01", lastBalanceChecked: "2026-06-01" });
  assert.deepEqual(preview.candidate[1], { ...cards[1], lastBalanceChecked: "2026-06-01" });
  assert.deepEqual(preview.candidate[2], { ...cards[2], currentBalance: 21.12, dateUpdated: "2026-06-01", lastBalanceChecked: "2026-06-01" });
  assert.equal(preview.items[2].used, true);
  assert.equal(preview.candidate[3], cards[3]);
  assert.equal(preview.outstanding, 7);
});

test("missing, corrupt and unsupported ledgers fail closed", () => {
  assert.equal(decodeTransferLedger(null), null);
  for (const raw of ["{", "null", "[]", '{"version":2}']) {
    assert.throws(() => decodeTransferLedger(raw), /damaged or unsupported/);
  }
});

test("continuity invalidates requests after a PIN edit or version change", async (t) => {
  const { fixture, cards, ledger, raw } = await stage(t);
  const modified = JSON.stringify([{ ...cards[0], pin: "0008" }, cards[1]]);
  fixture.store.set(storageKeys.cards, modified);
  assert.throws(() => assertTransferUnchanged(raw, JSON.stringify(cards)), /changed/);
  const updated = await checkTransferContinuity({ ledger, raw, inventoryRaw: modified, context });
  assert.ok(updated.ledger.requests.every(({ state }) => state === "invalidated"));
  assert.equal(previewTransferResults(updated.ledger, loadCards(), [observation(ledger.requests[0])], now).counts.invalidated, 1);

  const fresh = await makeLedger(loadCards(), modified);
  const freshRaw = writeTransferLedger(updated.raw, fresh);
  invalidateOnObservedContext(freshRaw, { ...status, sheetVersion: "v2" });
  assert.ok(decodeTransferLedger(readTransferLedger()).requests.every(({ state }) => state === "invalidated"));
});

test("observable disconnects and local Sheet switches invalidate requests before a former context can resume", async (t) => {
  const { fixture, ledger, raw } = await stage(t);
  invalidateOnObservedContext(raw, { ...status, authenticated: false });
  const disconnectedRaw = readTransferLedger();
  assert.equal(decodeTransferLedger(disconnectedRaw).inventoryDigest, null);
  invalidateOnObservedContext(disconnectedRaw, status, knownContext);
  assert.equal(readTransferLedger(), disconnectedRaw);
  const nextRaw = writeTransferLedger(disconnectedRaw, ledger);
  invalidateOnObservedContext(nextRaw, status, {
    ...knownContext, sheets: { ...knownContext.sheets, spreadsheetId: "other-sheet" },
  });
  assert.ok(decodeTransferLedger(readTransferLedger()).requests.every(({ state }) => state === "invalidated"));
  assert.equal(fixture.writes.length, 4);
});

test("same-day unchanged manual saves and other conflicting mutations require durable invalidation", async (t) => {
  const { fixture, raw, inventoryRaw } = await stage(t, [card(1, { lastBalanceChecked: "2026-06-01" })]);
  fixture.fail = (key) => key === storageKeys.balanceTransfer;
  assert.throws(() => invalidateTransferBeforeMutation(), /storage could not be verified/);
  assert.equal(readTransferLedger(), raw);
  assert.equal(fixture.getItem(storageKeys.cards), inventoryRaw);
  fixture.fail = () => false;
  invalidateTransferBeforeMutation();
  assert.equal(decodeTransferLedger(readTransferLedger()).requests[0].state, "invalidated");
  assert.equal(fixture.getItem(storageKeys.cards), inventoryRaw);
  invalidateTransferBeforeMutation();
  assert.equal(fixture.writes.length, 2);
});

test("absent ledgers leave ordinary mutations unguarded and corrupt references fail closed", async (t) => {
  const fixture = mockStorage(t, [card(1)]);
  invalidateTransferBeforeMutation();
  assert.deepEqual(fixture.writes, []);
  const ledger = await makeLedger([card(1)]);
  const corrupt = { ...ledger, id: [ledger.id] };
  assert.throws(() => writeTransferLedger(null, corrupt), /damaged or unsupported/);
  assert.equal(readTransferLedger(), null);
});

test("ledger writes are read-verified before any copy or application", async (t) => {
  const fixture = mockStorage(t, [card(1)]);
  const ledger = await makeLedger([card(1)]);
  fixture.ignore = (key) => key === storageKeys.balanceTransfer;
  assert.throws(() => writeTransferLedger(null, ledger), /storage could not be verified/);
  assert.equal(readTransferLedger(), null);
  fixture.ignore = () => false;
  const raw = writeTransferLedger(null, ledger);
  assert.throws(() => writeTransferLedger(null, ledger), /batch changed/);
  assert.equal(readTransferLedger(), raw);
});

test("partial application writes one inventory, preserves resume references, and blocks stale or conflicting replay", async (t) => {
  const { fixture, cards, raw, ledger, inventoryRaw } = await stage(t);
  const one = observation(ledger.requests[0], 15);
  const preview = previewTransferResults(ledger, cards, [one], now);
  const prepared = await prepareTransferApplication(ledger, preview.candidate, [one]);
  assert.deepEqual(commitTransferApplication({ raw, inventoryRaw, candidate: preview.candidate, prepared }), { saved: true });
  assert.deepEqual(fixture.writes, [storageKeys.balanceTransfer, storageKeys.balanceTransfer, storageKeys.cards, storageKeys.balanceTransfer]);
  const current = decodeTransferLedger(readTransferLedger());
  assert.deepEqual(transferRequestRows(current, loadCards()).map(({ ref }) => ref), [ledger.requests[1].ref]);
  const replay = previewTransferResults(current, loadCards(), [one], now);
  assert.equal(replay.counts.alreadyApplied, 1);
  assert.equal(replay.counts.accepted, 0);
  assert.equal(previewTransferResults(current, loadCards(), [{ ...one, balance: 16 }], now).counts.rejected, 1);
  assert.throws(() => commitTransferApplication({ raw, inventoryRaw, candidate: preview.candidate, prepared }), /changed/);
  assert.equal(loadCards()[0].currentBalance, 15);
});

for (const interruptedAt of ["marker", "inventory", "inventory readback", "finalize"]) {
  test(`protected recovery after a failure at ${interruptedAt}`, async (t) => {
    const { fixture, cards, raw, ledger, inventoryRaw } = await stage(t);
    const one = observation(ledger.requests[0], 15);
    const preview = previewTransferResults(ledger, cards, [one], now);
    const prepared = await prepareTransferApplication(ledger, preview.candidate, [one]);
    fixture.fail = (key, data) => interruptedAt === "marker" ? key === storageKeys.balanceTransfer && JSON.parse(data).application !== null
      : interruptedAt === "inventory" ? key === storageKeys.cards
        : interruptedAt === "finalize" && key === storageKeys.balanceTransfer && JSON.parse(data).application === null;
    fixture.ignore = (key) => interruptedAt === "inventory readback" && key === storageKeys.cards;
    const commit = () => commitTransferApplication({ raw, inventoryRaw, candidate: preview.candidate, prepared });
    if (interruptedAt === "marker") {
      assert.throws(commit, /storage could not be verified/);
      assert.equal(readTransferLedger(), raw);
    } else {
      const result = commit();
      assert.equal(result.saved, interruptedAt === "finalize");
      assert.ok(result.error);
      const uncertain = decodeTransferLedger(readTransferLedger());
      assert.deepEqual(uncertain.application, [one]);
      assert.equal(uncertain.requests[0].state, "pending");
      assert.throws(() => invalidateTransferBeforeMutation(), /interrupted/);
      assert.throws(() => transferRequestRows(uncertain, loadCards()), /interrupted/);
      assert.equal(previewTransferResults(uncertain, loadCards(), [one], now).counts.accepted, 0);
    }
    assert.equal(loadCards()[0].currentBalance, interruptedAt === "finalize" ? 15 : 8);
  });
}

test("a successful inventory write with failed readback protects stale cards until wallet reload and verified discard", async (t) => {
  const { fixture, cards, raw, ledger, inventoryRaw } = await stage(t);
  const one = observation(ledger.requests[0], 15);
  const { candidate } = previewTransferResults(ledger, cards, [one], now);
  const prepared = await prepareTransferApplication(ledger, candidate, [one]);
  const read = fixture.getItem;
  let failedReadback = false;
  fixture.getItem = (key) => {
    if (key === storageKeys.cards && !failedReadback && fixture.writes.includes(storageKeys.cards)) {
      failedReadback = true;
      throw new Error("readback failed after the inventory write");
    }
    return read(key);
  };

  assert.equal(commitTransferApplication({ raw, inventoryRaw, candidate, prepared }).saved, false);
  assert.equal(failedReadback, true);
  assert.equal(cards[0].currentBalance, 8);
  assert.equal(loadCards()[0].currentBalance, 15);
  const marker = readTransferLedger();
  const persisted = fixture.getItem(storageKeys.cards);
  const discard = createTransferDiscardGuard();
  assert.throws(() => discard(marker, () => cards), /Reload the wallet/);
  assert.equal(readTransferLedger(), marker);
  assert.throws(() => invalidateTransferBeforeMutation(), /interrupted/);
  assert.throws(() => discard(marker, loadCards), /Reload the wallet/);

  const reloadedCards = loadCards();
  createTransferDiscardGuard()(marker, () => reloadedCards);
  assert.equal(readTransferLedger(), null);
  assert.doesNotThrow(invalidateTransferBeforeMutation);
  assert.equal(fixture.getItem(storageKeys.cards), persisted);
  assert.equal(fixture.writes.filter((key) => key === storageKeys.cards).length, 1);
});

test("damaged ledger recovery requires readable, valid persisted cards and rejects stale displays", async (t) => {
  const { fixture, cards } = await stage(t);
  const damaged = "{";
  fixture.store.set(storageKeys.balanceTransfer, damaged);
  const read = fixture.getItem;
  fixture.getItem = (key) => {
    if (key === storageKeys.cards) throw new Error("unreadable");
    return read(key);
  };
  const discard = createTransferDiscardGuard();
  assert.throws(() => discard(damaged, () => cards), /Reload the wallet/);
  fixture.getItem = read;
  assert.throws(() => discard(damaged, () => cards), /Reload the wallet/);
  fixture.store.set(storageKeys.cards, "{");
  assert.throws(() => createTransferDiscardGuard()(damaged, () => cards), /Reload the wallet/);
  const changed = [{ ...cards[0], currentBalance: 17 }, cards[1]];
  fixture.store.set(storageKeys.cards, JSON.stringify(changed));
  assert.throws(() => createTransferDiscardGuard()(damaged, () => cards), /Reload the wallet/);
  assert.equal(readTransferLedger(), damaged);
  assert.throws(() => invalidateTransferBeforeMutation(), /damaged or unsupported/);

  const reloadedCards = loadCards();
  createTransferDiscardGuard()(damaged, () => reloadedCards);
  assert.equal(readTransferLedger(), null);
  assert.deepEqual(loadCards(), changed);
});

test("discarding a valid batch without an interrupted application leaves inventory checks unchanged", async (t) => {
  const { raw } = await stage(t);
  createTransferDiscardGuard()(raw, () => assert.fail("Normal discard should not read the inventory"));
  assert.equal(readTransferLedger(), null);
});
