import assert from "node:assert/strict";
import { test } from "node:test";
import { saveWorkerCards } from "./api.js";
import { normalizeCards } from "./cards.js";
import { loadCards, saveCards } from "./legacyCards.fixture.mjs";
import { cardsToCsv, parseRawCardData, wouldDiscardCardMetadata } from "./csv.js";
import { csvHeaders, schemaCapability } from "./csvSchema.js";

const historical = {
  cardNumber: "6300000000000001",
  pin: "0042",
  startingBalance: 8,
  currentBalance: 4.25,
  merchant: "",
  merchantInferred: "walmart-ca",
  dateAdded: "2024-02-28",
  dateUpdated: "2024-02-29",
  dateUsed: "",
  used: false,
  notes: ' Line one, "quoted"\r\nline two. ',
};
const extended = { ...historical, lastBalanceChecked: "2024-02-29", pendingReconciliation: false };

const historicalFixtures = [
  ["cardNumber,pin,startingBalance,currentBalance,dateAdded,dateUpdated,dateUsed,used",
    "6300000000000001,0042,8,4.25,2024-02-28,2024-02-29,,false"],
  ["cardNumber,pin,startingBalance,currentBalance,merchant,dateAdded,dateUpdated,dateUsed,used,notes",
    '6300000000000001,0042,8,4.25,explicit,2024-02-28,2024-02-29,,false,"a,b"'],
  ["cardNumber,pin,startingBalance,currentBalance,merchant,merchantInferred,dateAdded,dateUpdated,dateUsed,used,notes",
    '6300000000000001,0042,8,4.25,explicit,stale,2024-02-28,2024-02-29,,false,"a,b"'],
];

for (const [index, [header, row]] of historicalFixtures.entries()) {
  test(`historical ${header.split(",").length}-column CSV works with and without headers`, () => {
    for (const text of [header + "\n" + row, row]) {
      const { parsedCards, warnings } = parseRawCardData(text);
      assert.deepEqual(warnings, []);
      assert.equal(parsedCards.length, 1);
      const [card] = parsedCards;
      assert.equal(card.pin, "0042");
      assert.equal(card.merchant, index === 0 ? "" : "explicit");
      assert.equal(card.merchantInferred, "walmart-ca");
      assert.equal(card.notes, index === 0 ? "" : "a,b");
      assert.equal(Object.hasOwn(card, "lastBalanceChecked"), false);
      assert.equal(Object.hasOwn(card, "pendingReconciliation"), false);
    }
  });
}

test("13-field export round trips metadata, multiline notes, quotes and PINs", () => {
  const text = cardsToCsv([extended]);
  assert.equal(text.split("\n")[0], csvHeaders.join(","));
  assert.deepEqual(parseRawCardData("\uFEFF" + text), { parsedCards: [extended], warnings: [] });
  const blank = cardsToCsv([historical]);
  assert.match(blank, /,,$/);
  assert.deepEqual(parseRawCardData(blank), { parsedCards: [historical], warnings: [] });
});

test("precise verification timestamps round trip and must match their date", () => {
  const precise = { ...extended, lastBalanceCheckedAt: "2024-02-29T23:15:00.000Z" };
  assert.deepEqual(parseRawCardData(cardsToCsv([precise])), { parsedCards: [precise], warnings: [] });
  const invalid = cardsToCsv([{ ...precise, lastBalanceCheckedAt: "2024-03-01T00:00:00.000Z" }]);
  assert.match(parseRawCardData(invalid).warnings.join(" "), /matching lastBalanceChecked/);
});

test("either optional CSV header works on its own and may be reordered", () => {
  const [header, row] = historicalFixtures[2];
  for (const [extra, text, value] of [
    ["lastBalanceChecked", "2024-02-29", "2024-02-29"],
    ["pendingReconciliation", "FALSE", false],
  ]) {
    const result = parseRawCardData(extra + "," + header + "\r\n" + text + "," + row);
    assert.deepEqual(result.warnings, []);
    assert.equal(result.parsedCards[0][extra], value);
  }
});

test("CSV rejects ambiguous headers, partial imports and malformed metadata or values", () => {
  const [header, row] = historicalFixtures[2];
  for (const [text, message] of [
    [header + ",pin\n" + row + ",0001", /header row is malformed/],
    [header + ",unknown\n" + row + ",x", /header row is malformed/],
    [header.replace(",notes", ",") + "\n" + row, /header row is malformed/],
    [header + ",lastBalanceChecked\n" + row, /expected 12/],
    [row + ",2024-02-29", /expected 8, 10, or 11/],
    [header + ",lastBalanceChecked\n" + row + ",2023-02-29", /valid YYYY-MM-DD/],
    [header + ",lastBalanceChecked\n" + row + ",2024-02-29T00:00:00Z", /valid YYYY-MM-DD/],
    [header + ",pendingReconciliation\n" + row + ",0", /must be Boolean/],
    [header + "\n" + row + "\n" + row, /duplicate card number/],
    [header + "\n" + row.replace(",4.25,", ",4.25junk,"), /invalid current balance/],
    [header + "\n" + row.slice(0, -1), /unclosed CSV quote/],
    [" \n", /CSV is empty/],
  ]) {
    const { parsedCards, warnings } = parseRawCardData(text);
    assert.deepEqual(parsedCards, []);
    assert.match(warnings.join("\n"), message);
  }
  assert.deepEqual(parseRawCardData(header), { parsedCards: [], warnings: [] });
});

test("historical date fields keep legacy text handling independently of lastBalanceChecked", () => {
  const [header, row] = historicalFixtures[2];
  const restored = parseRawCardData(header + "\n" + row.replace("2024-02-28", "28/02/2024"));
  assert.deepEqual(restored.warnings, []);
  assert.equal(restored.parsedCards[0].dateAdded, "28/02/2024");
});

test("CSV balances must stay finite after rounding", () => {
  const [header, row] = historicalFixtures[2];
  for (const [amount, token, label] of [
    ["1e307", "8", "starting"],
    ["1e307", "4.25", "current"],
    ["-1e307", "4.25", "current"],
    ["1e309", "4.25", "current"],
  ]) {
    const result = parseRawCardData(header + "\n" + row.replace(`,${token},`, `,${amount},`));
    assert.deepEqual(result.parsedCards, []);
    assert.match(result.warnings.join("\n"), new RegExp(`invalid ${label} balance`));
  }
});

test("historical restore detection includes an explicit false and empty inventories", () => {
  for (const [header, row] of historicalFixtures) {
    const restored = parseRawCardData(header + "\n" + row).parsedCards;
    assert.equal(wouldDiscardCardMetadata([extended], restored), true);
  }
  assert.equal(wouldDiscardCardMetadata([extended], []), true);
  assert.equal(wouldDiscardCardMetadata([extended], [extended]), false);
  assert.equal(wouldDiscardCardMetadata([historical], []), false);
  assert.equal(wouldDiscardCardMetadata([{ ...historical, pendingReconciliation: false }], [historical]), true);
});

test("local storage preserves metadata and rejects unsupported data without replacing the source", (t) => {
  const values = new Map();
  const original = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) },
  });
  t.after(() => {
    if (original) Object.defineProperty(globalThis, "localStorage", original);
    else delete globalThis.localStorage;
  });

  saveCards([extended]);
  assert.deepEqual(loadCards(), [extended]);
  const unchanged = values.get("walmartGc.cards");
  for (const metadata of [
    { lastBalanceChecked: "2024-04-31" },
    { pendingReconciliation: "false" },
    { pendingReconciliation: null },
    { lastBalanceChecked: "" },
  ]) {
    assert.equal(normalizeCards([{ ...extended, ...metadata }]), null);
    saveCards([{ ...extended, ...metadata }]);
    assert.equal(values.get("walmartGc.cards"), unchanged);
  }
  const unsupported = JSON.stringify([{ ...extended, pendingReconciliation: true }]);
  values.set("walmartGc.cards", unsupported);
  assert.equal(loadCards()[0].pendingReconciliation, true);
  assert.equal(values.get("walmartGc.cards"), unsupported);

  values.set("walmartGc.cards", "[");
  assert.throws(() => loadCards(), /original browser data is preserved/);
  assert.equal(values.get("walmartGc.cards"), "[");

  saveCards([historical]);
  assert.deepEqual(loadCards(), [historical]);
});

test("retired whole-inventory helper cannot contact any Worker, including an old deployment", async (t) => {
  const fetch=t.mock.method(globalThis,'fetch',async()=>assert.fail('Unsafe legacy network request'));
  await assert.rejects(saveWorkerCards([historical],'v1'),/retired/);
  await assert.rejects(saveWorkerCards([extended],'v1'),/retired/);
  assert.equal(fetch.mock.callCount(),0);
});

test("active reconciliation true round-trips CSV, while malformed flags remain rejected",()=>{
  const disputed={...extended,pendingReconciliation:true};
  assert.equal(parseRawCardData(cardsToCsv([disputed])).parsedCards[0].pendingReconciliation,true);
});
