import assert from "node:assert/strict";
import { test } from "node:test";
import { saveWorkerCards } from "./api.js";
import { loadCards, normalizeCards, saveCards } from "./cards.js";
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
    [header + ",pendingReconciliation\n" + row + ",true", /unsupported in V0.1/],
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
    { pendingReconciliation: true },
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
  assert.throws(() => loadCards(), /unsupported in V0.1.*original browser data is preserved/);
  assert.equal(values.get("walmartGc.cards"), unsupported);

  values.set("walmartGc.cards", "[");
  assert.throws(() => loadCards(), /original browser data is preserved/);
  assert.equal(values.get("walmartGc.cards"), "[");

  saveCards([historical]);
  assert.deepEqual(loadCards(), [historical]);
});

test("a new client can use legacy saves, but an old Worker rejects the protected inventory", async (t) => {
  const writes = [];
  const fetch = t.mock.method(globalThis, "fetch", async (path, request) => {
    assert.equal(path, "/api/cards/save");
    assert.equal(request.credentials, "include");
    const body = JSON.parse(request.body);
    assert.equal(body.schemaCapability, schemaCapability);
    assert.equal(body.baseSheetVersion, "v1");
    // The baseline Worker checks for this exact array before accessing Sheets.
    if (!Array.isArray(body.cards)) {
      assert.deepEqual(body.cardsWithMetadata, [extended]);
      return Response.json({ ok: false, error: "Expected cards array." }, { status: 400 });
    }
    writes.push(body.cards);
    return Response.json({ ok: true, sheetVersion: "v2" });
  });

  await assert.rejects(saveWorkerCards([extended], "v1"), /Worker does not support card metadata/);
  assert.deepEqual(writes, []);
  assert.equal((await saveWorkerCards([historical], "v1")).sheetVersion, "v2");
  assert.deepEqual(writes, [[historical]]);
  await assert.rejects(saveWorkerCards([{ ...historical, pendingReconciliation: true }], "v1"), /unsupported/);
  assert.equal(fetch.mock.callCount(), 2);
});

test("a metadata save requires the capability in its success response", async (t) => {
  const fetch = t.mock.method(globalThis, "fetch", async () => Response.json({ ok: true, sheetVersion: "v2" }));
  await assert.rejects(saveWorkerCards([extended], "v1"), /did not confirm card metadata support/);
  assert.equal(fetch.mock.callCount(), 1);
});

test("only explicit boolean acknowledgement is sent with a save", async (t) => {
  const requests = [];
  t.mock.method(globalThis, "fetch", async (_path, options) => {
    requests.push(JSON.parse(options.body));
    return Response.json({ ok: true, schemaCapability });
  });
  await saveWorkerCards([], "v1");
  await saveWorkerCards([], "v1", { acknowledgeMetadataRemoval: "true" });
  await saveWorkerCards([], "v1", { acknowledgeMetadataRemoval: true });
  assert.deepEqual(requests, [
    { cards: [], baseSheetVersion: "v1", schemaCapability },
    { cards: [], baseSheetVersion: "v1", schemaCapability },
    { cards: [], baseSheetVersion: "v1", schemaCapability, acknowledgeMetadataRemoval: true },
  ]);
});
