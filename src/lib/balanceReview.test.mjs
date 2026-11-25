import assert from "node:assert/strict";
import { test } from "node:test";
import { applyBalanceObservation, createBalanceReviewQueue, parseVerifiedBalance } from "./balanceReview.js";
import {
  bundledSampleGiftCards, calculateVisibleCards,
} from "./cards.js";
import { captureBalanceReviewStorage, loadCards, persistBalanceReviewCards } from "./legacyCards.fixture.mjs";

const first = {
  cardNumber: "6300000000010042", pin: "0042", merchant: "", merchantInferred: "walmart-ca",
  startingBalance: 10, currentBalance: 7.25, dateAdded: "2024-02-01", dateUpdated: "2024-02-02",
  dateUsed: "2024-02-03", used: true, notes: "Synthetic\nnotes", pendingReconciliation: false,
};
const second = { ...first, cardNumber: "6300000000020042", used: false, currentBalance: 0 };
const checkedAt = "2024-03-01T00:15:00+01:00";

function observation(cards, card = first, fields = {}) {
  return {
    cardNumber: card.cardNumber, observedBalance: "7.25", checkedAt,
    expected: createBalanceReviewQueue(cards).find(({ snapshot }) => snapshot.cardNumber === card.cardNumber),
    ...fields,
  };
}

test("queue uses effective merchant, includes used and zero balances, and orders by date then exact identity", () => {
  const newest = { ...first, cardNumber: "6300000000030042", lastBalanceChecked: "2024-02-03" };
  const oldest = { ...second, cardNumber: "6300000000040042", lastBalanceChecked: "2024-02-01", merchant: "walmart-ca" };
  const oldestTie = { ...oldest, cardNumber: "6300000000050042" };
  const override = { ...first, cardNumber: "6300000000060042", merchant: "other" };
  const invalid = { ...first, cardNumber: "1234" };
  const invalidPin = { ...first, cardNumber: "6300000000070042", pin: "1" };
  const cards = [oldestTie, newest, second, invalid, oldest, override, first, invalidPin];
  assert.deepEqual(calculateVisibleCards([first, second], { hideUsedCards: true, hideZeroBalanceCards: true }), []);
  assert.deepEqual(createBalanceReviewQueue(cards).map(({ card }) => card),
    [first, second, oldest, oldestTie, newest]);
  assert.deepEqual(createBalanceReviewQueue([first, { ...first }]), []);
  assert.deepEqual(createBalanceReviewQueue([{ ...first, merchantInferred: "" }]).length, 1);
});

test("a session queue stays stable and a new session rebuilds from current reviews", () => {
  const cards = [second, first];
  const queue = createBalanceReviewQueue(cards);
  const updated = applyBalanceObservation(cards, { ...observation(cards), expected: queue[0] });
  assert.deepEqual(queue.map(({ card }) => card), [first, second]);
  assert.deepEqual(createBalanceReviewQueue(updated).map(({ card }) => card), [second, updated[1]]);
  assert.equal(first.lastBalanceChecked, undefined);
});

test("applies only to the full number, preserving used state, notes, PIN and optional metadata", () => {
  const cards = [second, first];
  const [unchanged, verified] = applyBalanceObservation(cards, observation(cards, first, { observedBalance: "20,05" }));
  assert.equal(unchanged, second);
  assert.deepEqual(verified, { ...first, currentBalance: 20.05, dateUpdated: "2024-02-29", lastBalanceChecked: "2024-02-29" });
  assert.equal(first.currentBalance, 7.25);
  assert.throws(() => applyBalanceObservation(cards, observation(cards, first, { cardNumber: "0042" })), /missing or ambiguous/);
});

test("unchanged observations advance the UTC date only, and zero is accepted", () => {
  const cards = [first];
  assert.deepEqual(applyBalanceObservation(cards, observation(cards)), [{ ...first, lastBalanceChecked: "2024-02-29" }]);
  assert.deepEqual(applyBalanceObservation(cards, observation(cards, first, {
    observedBalance: "0", checkedAt: new Date("2024-03-01T00:10:00Z"),
  })), [{ ...first, currentBalance: 0, dateUpdated: "2024-03-01", lastBalanceChecked: "2024-03-01" }]);
});

test("rejects missing, duplicate, replaced and in-place changed snapshots", () => {
  const editable = { ...first };
  const cards = [editable, second];
  const request = observation(cards, editable);
  assert.throws(() => applyBalanceObservation([second], request), /missing or ambiguous/);
  assert.throws(() => applyBalanceObservation([editable, { ...editable }], request), /missing or ambiguous/);
  assert.throws(() => applyBalanceObservation([{ ...editable }, second], request), /changed during review/);
  editable.notes = "Changed";
  assert.throws(() => applyBalanceObservation(cards, request), /changed during review/);
  assert.equal(editable.lastBalanceChecked, undefined);
});

test("rejects older observations and invalid timestamps", () => {
  const verified = { ...first, lastBalanceChecked: "2024-03-01" };
  assert.throws(() => applyBalanceObservation([verified], observation([verified], verified)), /older than the last/);
  for (const invalid of ["2024-02-01", "2024-02-30T01:00:00Z", "2024-02-28T24:00:00Z", new Date(NaN)]) {
    assert.throws(() => applyBalanceObservation([first], observation([first], first, { checkedAt: invalid })), /timestamp/);
  }
  assert.equal(applyBalanceObservation([verified], observation([verified], verified, {
    checkedAt: "2024-03-01T01:00:00Z",
  }))[0].lastBalanceChecked, "2024-03-01");
});

test("accepts decimal cents and rejects malformed, negative, partial and nonrepresentable amounts", () => {
  for (const [value, expected] of [["0", 0], [" 00.50 ", 0.5], [".5", 0.5], ["5,1", 5.1], [0.29, 0.29], ["2400.99", 2400.99]]) {
    assert.equal(parseVerifiedBalance(value), expected);
  }
  for (const value of ["", " ", "-0", "-1", "2.", "2.001", "2abc", "1e3", "1,000", "1,234.50", "$5",
    "90071992547409.91", "90071992547409.92", "1e307", Infinity, NaN, undefined, null, true]) {
    assert.throws(() => parseVerifiedBalance(value), /amount/);
  }
});

function setupStorage(t, initial) {
  const prior = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  const storage = { raw: initial, failRead: false, failWrite: false, writes: 0 };
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem() {
        if (storage.failRead) throw new Error("unavailable");
        return storage.raw;
      },
      setItem(_key, raw) {
        if (storage.failWrite) throw new Error("quota");
        storage.writes += 1;
        storage.raw = raw;
      },
    },
  });
  t.after(() => {
    if (prior) Object.defineProperty(globalThis, "localStorage", prior);
    else delete globalThis.localStorage;
  });
  return storage;
}

test("fresh startup keeps the bundled samples in Cards and offers none for review", (t) => {
  const fixture = setupStorage(t, null);
  const cards = loadCards();
  assert.deepEqual(cards, bundledSampleGiftCards);
  assert.deepEqual(createBalanceReviewQueue(cards), []);
  assert.equal(fixture.raw, null);
  assert.equal(fixture.writes, 0);
});

test("persisted samples remain ineligible after their notes and PINs change", (t) => {
  const samples = bundledSampleGiftCards.map((card) => ({ ...card, notes: "", pin: "0001" }));
  const initial = JSON.stringify(samples);
  const fixture = setupStorage(t, initial);
  const cards = loadCards();
  assert.deepEqual(cards, samples);
  assert.deepEqual(createBalanceReviewQueue(cards), []);
  const [sample] = cards;
  assert.throws(() => applyBalanceObservation(cards, observation(cards, sample, {
    expected: { card: sample, snapshot: { ...sample } },
  })), /changed during review/);
  assert.equal(fixture.raw, initial);
  assert.equal(fixture.writes, 0);
});

test("mixed inventory reviews a distinct card with the same last four and notes while preserving samples", (t) => {
  const [sample] = bundledSampleGiftCards;
  const eligible = {
    ...first, cardNumber: first.cardNumber.slice(0, -4) + sample.cardNumber.slice(-4), notes: sample.notes,
  };
  setupStorage(t, JSON.stringify([eligible, ...bundledSampleGiftCards]));
  const cards = loadCards();
  const queue = createBalanceReviewQueue(cards);
  assert.deepEqual(queue.map(({ card }) => card.cardNumber), [eligible.cardNumber]);
  const updated = applyBalanceObservation(cards, observation(cards, eligible, {
    expected: queue[0], observedBalance: "4.04",
  }));
  persistBalanceReviewCards(updated, captureBalanceReviewStorage(cards));
  const reloaded = loadCards();
  assert.equal(reloaded[0].currentBalance, 4.04);
  assert.deepEqual(reloaded.slice(1), bundledSampleGiftCards);
});

test("checked save survives reload and refreshes the expected storage snapshot", (t) => {
  const fixture = setupStorage(t, JSON.stringify([first, second]));
  const cards = loadCards();
  const raw = captureBalanceReviewStorage(cards);
  const next = applyBalanceObservation(cards, observation(cards, first, { observedBalance: "4.04" }));
  const committed = persistBalanceReviewCards(next, raw);
  assert.deepEqual(loadCards(), next);
  assert.equal(committed, fixture.raw);
  assert.equal(fixture.writes, 1);
  assert.throws(() => persistBalanceReviewCards(next, raw), /changed in this browser/);
  assert.equal(fixture.writes, 1);
});

test("checked save protects the committed inventory through validation, read, write and stale snapshot failures", (t) => {
  const initial = JSON.stringify([first, second]);
  const fixture = setupStorage(t, initial);
  assert.throws(() => captureBalanceReviewStorage([first]), /changed in this browser/);
  assert.throws(() => persistBalanceReviewCards([first, { ...second, startingBalance: 1e307 }], initial), /invalid/);
  fixture.failRead = true;
  assert.throws(() => captureBalanceReviewStorage([first, second], { allowEmptyStorage: true }), /unavailable/);
  assert.throws(() => persistBalanceReviewCards([first, second], initial), /unavailable/);
  fixture.failRead = false;
  fixture.failWrite = true;
  assert.throws(() => persistBalanceReviewCards([first, second], initial), /Could not save/);
  assert.equal(fixture.raw, initial);
  fixture.raw = JSON.stringify([{ ...first, notes: "Newer" }, second]);
  assert.throws(() => persistBalanceReviewCards([first, second], initial), /changed in this browser/);
  assert.equal(JSON.parse(fixture.raw)[0].notes, "Newer");
  assert.equal(fixture.writes, 0);
});

test("checked capture rejects invalid or removed storage and accepts an observed empty first-run store", (t) => {
  const fixture = setupStorage(t, "{");
  assert.throws(() => captureBalanceReviewStorage([first], { allowEmptyStorage: true }), /invalid/);
  fixture.raw = "[]";
  assert.throws(() => captureBalanceReviewStorage([first]), /changed in this browser/);
  fixture.raw = null;
  assert.throws(() => captureBalanceReviewStorage([first]), /changed in this browser/);
  let initialInventory;
  assert.equal(loadCards({ onEmptyStorage: (cards) => { initialInventory = cards; } }), initialInventory);
  assert.equal(captureBalanceReviewStorage(initialInventory, { allowEmptyStorage: true }), null);
  assert.equal(fixture.writes, 0);
});
