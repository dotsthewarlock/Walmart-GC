import assert from "node:assert/strict";
import { test } from "node:test";
import worker from "./src/index.js";
import {
  requiredCardHeaders, oldApprovedCsvHeaders, optionalCardHeaders, schemaCapability,
} from "../src/lib/csvSchema.js";

const card = {
  cardNumber: "6300000000000001",
  pin: "0007",
  startingBalance: "10",
  currentBalance: "7.5",
  merchant: "",
  merchantInferred: "walmart-ca",
  dateAdded: "2024-02-28",
  dateUpdated: "2024-02-29",
  dateUsed: "",
  used: false,
  notes: ' note, "quoted"\nsecond line ',
};
const withMetadata = { ...card, lastBalanceChecked: "2024-02-29", pendingReconciliation: false };
const spreadsheetId = "synthetic-sheet";
const metaVersion = "version-1";
const session = {
  accessToken: "fixture-access",
  refreshToken: "fixture-refresh",
  expiresAt: "2099-01-01T00:00:00Z",
  sheetId: spreadsheetId,
};
const env = {
  SESSIONS: { get: async () => session, put: async () => {} },
  OAUTH_STATE: {},
  SESSION_SECRET: "fixture-secret",
  GOOGLE_CLIENT_ID: "fixture-client",
  GOOGLE_CLIENT_SECRET: "fixture-client-secret",
};

function rowFor(headers, source) {
  return headers.map((key) => key === "used" ? "FALSE" : source[key] ?? "");
}

function setupSheet(t, {
  headers = requiredCardHeaders,
  rows = [rowFor(headers, card)],
  extraCell,
  gridColumns = 26,
  failBatch = false,
  changedOnLoad = false,
  defaultTab,
  metaRows,
  metaHidden = true,
  metaMissing = false,
  fresh = false,
} = {}) {
  const meta = metaRows ?? (fresh ? [] : [
    ["key", "value"], ["schemaVersion", "1"], ["sheetVersion", metaVersion],
    ["lastUpdated", "2024-02-28T00:00:00Z"], ["appName", "Walmart-GC"], ["fixtureExtra", "preserve me"],
  ]);
  const cards = fresh ? [] : [headers, ...rows].map((row) => [...row]);
  let cardsExist = !fresh;
  let metaExists = !fresh && !metaMissing;
  if (extraCell) {
    cards[1] ??= [];
    cards[1][extraCell.column] = extraCell.value;
  }
  const grid = { rowCount: 100, columnCount: gridColumns };
  const mutations = [];
  const reads = [];
  const fetch = t.mock.method(globalThis, "fetch", async (input, options) => {
    const url = new URL(input);
    const path = decodeURIComponent(url.pathname);
    if (options.method === "PUT") {
      assert.equal(path, `/v4/spreadsheets/${spreadsheetId}/values/'Cards'!A1:K1`);
      assert.equal(url.searchParams.get("valueInputOption"), "RAW");
      const { values } = JSON.parse(options.body);
      assert.equal(cards.length, 0);
      cards.push(...values);
      return Response.json({});
    }
    if (options.method) {
      assert.equal(path, `/v4/spreadsheets/${spreadsheetId}:batchUpdate`);
      assert.equal(options.method, "POST");
      const { requests } = JSON.parse(options.body);
      mutations.push(requests);
      if (failBatch) return Response.json({}, { status: 400 });
      for (const { addSheet } of requests) {
        if (addSheet?.properties.title === "Cards") cardsExist = true;
        if (addSheet?.properties.title === "_META") metaExists = true;
      }
      applySheetBatch(requests.filter((request) => !request.addSheet), cards, meta, grid);
      return Response.json({});
    }
    if (path === `/drive/v3/files/${spreadsheetId}`) {
      return Response.json({ id: spreadsheetId, mimeType: "application/vnd.google-apps.spreadsheet" });
    }
    if (path === `/v4/spreadsheets/${spreadsheetId}`) {
      return Response.json({
        properties: { title: "Walmart-GC Data" },
        sheets: [
          ...(cardsExist ? [{ properties: { title: "Cards", sheetId: 10, gridProperties: grid } }] : []),
          ...(metaExists ? [{ properties: { title: "_META", sheetId: 20, hidden: metaHidden } }] : []),
          ...(defaultTab ? [{ properties: { title: "Sheet1", sheetId: 30 } }] : []),
        ],
      });
    }
    const range = path.split("/values/")[1];
    const render = url.searchParams.get("valueRenderOption");
    reads.push({ range, render });
    switch (range) {
      case "'Cards'!1:1":
        return Response.json({ values: [cards[0]] });
      case "'Cards'":
        return Response.json({ values: cards.map((row) => row.map((cell) =>
          typeof cell === "string" && cell.startsWith("=") && render !== "FORMULA" ? "" : cell
        )) });
      case "_META!A:B":
        if (changedOnLoad && reads.filter((entry) => entry.range === range).length > 1) {
          meta[2][1] = "version-during-load";
        }
        return Response.json({ values: meta });
      case "_META!A1:B1":
        return Response.json({ values: [meta[0]] });
      case "'Sheet1'":
        assert.equal(render, "FORMULA");
        return defaultTab.readFails
          ? Response.json({}, { status: 500 })
          : Response.json({ values: defaultTab.values });
      default:
        assert.fail(`Unexpected Google fixture read: ${path}`);
    }
  });
  return { cards, meta, grid, mutations, reads, fetch };
}

function applySheetBatch(requests, cards, meta, grid) {
  for (const request of requests) {
    if (request.deleteSheet) {
      assert.equal(request.deleteSheet.sheetId, 30);
      continue;
    }
    if (request.appendDimension) {
      const { sheetId, dimension, length } = request.appendDimension;
      assert.equal(sheetId, 10);
      grid[dimension === "COLUMNS" ? "columnCount" : "rowCount"] += length;
      continue;
    }
    const { start, range, rows, fields } = request.updateCells;
    assert.equal(fields, "userEnteredValue");
    const target = (start ?? range).sheetId === 10 ? cards : meta;
    const rowOffset = start?.rowIndex ?? range.startRowIndex;
    const columnOffset = start?.columnIndex ?? range.startColumnIndex;
    if (range) {
      for (const row of target.slice(rowOffset)) {
        for (let column = columnOffset; column < range.endColumnIndex; column += 1) {
          row[column] = "";
        }
      }
    }
    rows.forEach((row, index) => {
      const targetRow = target[rowOffset + index] ??= [];
      row.values.forEach((cell, column) => {
        const value = cell.userEnteredValue;
        targetRow[columnOffset + column] = value?.stringValue ?? value?.boolValue ?? "";
      });
    });
  }
}

function route(path, body, auth = true) {
  return worker.fetch(new Request("https://wallet.synthetic" + path, {
    method: body === undefined ? "GET" : "POST",
    headers: auth ? { Cookie: "walmart_gc_session=fixture-session" } : {},
    body: body === undefined ? undefined : JSON.stringify(body),
  }), env);
}

function save(cards, baseSheetVersion = metaVersion, client = schemaCapability) {
  return route("/api/cards/save", { cards, baseSheetVersion, schemaCapability: client });
}

test("existing API responses advertise the capability without changing signed-out status", async (t) => {
  const fixture = setupSheet(t);
  const signedOut = await route("/api/status", undefined, false);
  assert.equal(signedOut.status, 200);
  assert.equal((await signedOut.json()).schemaCapability, schemaCapability);
  const ensure = await route("/api/sheet/ensure", {});
  assert.equal(ensure.status, 200);
  const payload = await ensure.json();
  assert.equal(payload.schemaCapability, schemaCapability);
  assert.equal(payload.hasCardRows, true);
  assert.deepEqual(fixture.mutations, []);
});

test("Fix Sheet deletes a default tab only after a successful whole-tab emptiness check", async (t) => {
  for (const [name, defaultTab, shouldDelete] of [
    ["failed read", { readFails: true }, false],
    ["formula content", { values: [['=""']] }, false],
    ["empty tab", { values: [] }, true],
  ]) {
    await t.test(name, async (sub) => {
      const fixture = setupSheet(sub, { defaultTab });
      assert.equal((await route("/api/sheet/ensure", {})).status, 200);
      assert.equal(fixture.mutations.some((batch) => batch.some((request) => request.deleteSheet)), shouldDelete);
    });
  }
});

test("Fix Sheet fills missing metadata without clearing existing keys or extending Cards", async (t) => {
  const fixture = setupSheet(t, { metaRows: [
    ["key", "value"], ["sheetVersion", metaVersion], ["lastUpdated", ""], ["fixtureExtra", "keep"],
  ] });
  const response = await route("/api/sheet/ensure", {});
  assert.equal(response.status, 200);
  assert.equal((await response.json()).sheetVersion, metaVersion);
  assert.equal(fixture.mutations.length, 1);
  assert.deepEqual(fixture.meta, [
    ["key", "value"], ["sheetVersion", metaVersion], ["lastUpdated", fixture.meta[2][1]],
    ["fixtureExtra", "keep"], ["schemaVersion", "1"], ["appName", "Walmart-GC"],
  ]);
  assert.ok(fixture.meta[2][1]);
  assert.deepEqual(fixture.cards[0], requiredCardHeaders);
});

test("Fix Sheet creates a loadable empty Sheet with only the required headers", async (t) => {
  const fixture = setupSheet(t, { fresh: true });
  const response = await route("/api/sheet/ensure", {});
  assert.equal(response.status, 200);
  const { sheetVersion, hasCardRows } = await response.json();
  assert.ok(sheetVersion);
  assert.equal(hasCardRows, false);
  assert.deepEqual(fixture.cards, [requiredCardHeaders]);
  const load = await route("/api/cards/load");
  assert.equal(load.status, 200);
  const loaded = await load.json();
  assert.equal(loaded.sheetVersion, sheetVersion);
  assert.deepEqual(loaded.cards, []);
});

test("Fix Sheet validates existing Cards headers and metadata before structural changes", async (t) => {
  for (const [headers, record] of [
    [[...requiredCardHeaders, false], card],
    [[...requiredCardHeaders, ...optionalCardHeaders], { ...card, pendingReconciliation: true }],
  ]) {
    await t.test(String(headers.at(-1)), async (sub) => {
      const fixture = setupSheet(sub, { headers, rows: [rowFor(headers, record)], metaHidden: false });
      assert.equal((await route("/api/sheet/ensure", {})).status, 409);
      assert.deepEqual(fixture.mutations, []);
    });
  }
});

test("load and save never initialize missing Sheet structure", async (t) => {
  const fixture = setupSheet(t, { metaMissing: true });
  for (const response of [await route("/api/cards/load"), await save([withMetadata], "")]) {
    assert.equal(response.status, 409);
    assert.match((await response.json()).error, /Use Fix Sheet/);
  }
  assert.deepEqual(fixture.mutations, []);
});

test("legacy ten-column load infers merchant without migration, and legacy save retains compatibility", async (t) => {
  const headers = [...oldApprovedCsvHeaders].reverse();
  const explicit = { ...card, merchant: "explicit" };
  const fixture = setupSheet(t, { headers, rows: [rowFor(headers, explicit)] });
  const load = await route("/api/cards/load");
  assert.equal(load.status, 200);
  assert.deepEqual((await load.json()).cards, [explicit]);
  assert.deepEqual(fixture.cards[0], headers);
  assert.deepEqual(fixture.mutations, []);

  const response = await route("/api/cards/save", { cards: [explicit], baseSheetVersion: metaVersion });
  assert.equal(response.status, 200);
  assert.deepEqual(fixture.cards[0], [...headers, "merchantInferred"]);
  assert.deepEqual(fixture.cards[1], rowFor(fixture.cards[0], explicit));
});

test("blank values do not extend an eleven-column Sheet, and populated metadata extends it once", async (t) => {
  const headers = [...requiredCardHeaders].reverse();
  const fixture = setupSheet(t, { headers, gridColumns: 11 });
  const blank = await save([card]);
  assert.equal(blank.status, 200);
  assert.deepEqual(fixture.cards[0], headers);
  assert.equal(fixture.mutations[0].length, 3);
  const blankPayload = await blank.json();

  const extended = await route("/api/cards/save", {
    cardsWithMetadata: [withMetadata],
    baseSheetVersion: blankPayload.sheetVersion,
    schemaCapability,
  });
  assert.equal(extended.status, 200);
  const extendedPayload = await extended.json();
  assert.equal(extendedPayload.schemaCapability, schemaCapability);
  assert.deepEqual(fixture.cards[0], [...headers, ...optionalCardHeaders]);
  assert.equal(fixture.grid.columnCount, 13);
  assert.equal(fixture.cards[1][headers.indexOf("pin")], "0007");
  assert.equal(fixture.cards[1][headers.indexOf("notes")], card.notes);
  assert.equal(fixture.cards[1][12], false);
  assert.deepEqual(fixture.meta.at(-1), ["fixtureExtra", "preserve me"]);
  assert.equal(fixture.meta[2][1], extendedPayload.sheetVersion);

  const loaded = await (await route("/api/cards/load")).json();
  assert.deepEqual(loaded.cards, [withMetadata]);
  const repeated = await save(loaded.cards, loaded.sheetVersion);
  assert.equal(repeated.status, 200);
  assert.equal(fixture.mutations[2].length, 3);
  assert.deepEqual(fixture.cards[0], [...headers, ...optionalCardHeaders]);
});

test("an explicit false adds only its own optional header", async (t) => {
  const fixture = setupSheet(t);
  const populated = { ...card, pendingReconciliation: false };
  const response = await save([populated]);
  assert.equal(response.status, 200);
  assert.deepEqual(fixture.cards[0], [...requiredCardHeaders, "pendingReconciliation"]);
  assert.deepEqual((await (await route("/api/cards/load")).json()).cards, [populated]);
});

test("a twelve-column Sheet appends the other optional header only for its first populated value", async (t) => {
  const headers = ["pendingReconciliation", ...requiredCardHeaders];
  const existing = { ...card, pendingReconciliation: false };
  const fixture = setupSheet(t, { headers, rows: [rowFor(headers, existing)] });
  assert.deepEqual((await (await route("/api/cards/load")).json()).cards, [existing]);
  const same = await save([existing]);
  assert.equal(same.status, 200);
  assert.deepEqual(fixture.cards[0], headers);
  const next = await save([withMetadata], (await same.json()).sheetVersion);
  assert.equal(next.status, 200);
  assert.deepEqual(fixture.cards[0], [...headers, "lastBalanceChecked"]);
});

test("occupied append cells, including visually blank formulas, block all Sheet writes", async (t) => {
  for (const [index, value] of ["unlabelled", '=IF(TRUE,"","")', false, " "].entries()) {
    await t.test(`occupied cell fixture ${index + 1}`, async (sub) => {
      const fixture = setupSheet(sub, { extraCell: { column: 11, value } });
      const response = await save([withMetadata]);
      assert.equal(response.status, 409);
      assert.match((await response.json()).error, /target column already contains data/);
      assert.deepEqual(fixture.mutations, []);
      assert.equal(fixture.cards[1][11], value);
      assert.equal(fixture.meta[2][1], metaVersion);
      assert.equal(fixture.reads.some((read) => read.render === "FORMULA"), true);
    });
  }
});

test("stale force and empty saves cannot mutate a Sheet with an optional header, even if blank", async (t) => {
  const headers = [...requiredCardHeaders, "lastBalanceChecked"];
  const fixture = setupSheet(t, { headers, rows: [] });
  for (const body of [
    { cards: [card], baseSheetVersion: metaVersion },
    { cards: [], baseSheetVersion: metaVersion, force: true },
    { cards: [], baseSheetVersion: metaVersion, schemaCapability: "unrecognized" },
  ]) {
    const response = await route("/api/cards/save", body);
    assert.equal(response.status, 409);
    assert.equal((await response.json()).errorType, "cards_schema_capability");
  }
  assert.deepEqual(fixture.mutations, []);
  assert.deepEqual(fixture.cards[0], headers);
});

test("force recovery still needs the latest version and a compatible empty save only clears approved cells", async (t) => {
  const headers = [...requiredCardHeaders, ...optionalCardHeaders];
  const fixture = setupSheet(t, {
    headers, rows: [rowFor(headers, withMetadata)], extraCell: { column: 14, value: "unrelated" },
  });
  const stale = await route("/api/cards/save", {
    cards: [], baseSheetVersion: "stale", schemaCapability, force: true,
  });
  assert.equal(stale.status, 409);
  assert.deepEqual(await stale.json(), { ok: false, conflict: true, remoteSheetVersion: metaVersion, schemaCapability });
  assert.deepEqual(fixture.mutations, []);
  const recovery = await save([]);
  assert.equal(recovery.status, 200);
  assert.deepEqual(fixture.cards[0], headers);
  assert.deepEqual(fixture.cards[1].slice(0, headers.length), headers.map(() => ""));
  assert.equal(fixture.cards[1][14], "unrelated");
  assert.deepEqual((await (await route("/api/cards/load")).json()).cards, []);
});

test("unknown and malformed headers block mutation", async (t) => {
  for (const [index, headers] of [
    [...requiredCardHeaders, "unsupported"],
    [...requiredCardHeaders, "pendingReconciliation", "pendingReconciliation"],
    [...requiredCardHeaders, "", "lastBalanceChecked"],
  ].entries()) {
    await t.test(`malformed header fixture ${index + 1}`, async (sub) => {
      const fixture = setupSheet(sub, { headers });
      assert.equal((await save([withMetadata])).status, 409);
      assert.deepEqual(fixture.mutations, []);
    });
  }
});

test("malformed or dormant persisted values prevent both load and replacement", async (t) => {
  const headers = [...requiredCardHeaders, ...optionalCardHeaders];
  for (const [metadata, regex] of [
    [{ lastBalanceChecked: "2024-02-30" }, /valid YYYY-MM-DD/],
    [{ pendingReconciliation: "hold" }, /must be Boolean/],
    [{ pendingReconciliation: 0 }, /must be Boolean/],
    [{ pendingReconciliation: "TRUE" }, /unsupported in V0.1/],
    [{ pendingReconciliation: true }, /unsupported in V0.1/],
  ]) {
    await t.test(JSON.stringify(metadata), async (sub) => {
      const row = rowFor(headers, { ...card, ...metadata });
      const fixture = setupSheet(sub, { headers, rows: [row] });
      const load = await route("/api/cards/load");
      assert.equal(load.status, 409);
      assert.match((await load.json()).error, regex);
      const overwrite = await save([]);
      assert.equal(overwrite.status, 409);
      assert.match((await overwrite.json()).error, regex);
      assert.deepEqual(fixture.mutations, []);
      assert.deepEqual(fixture.cards[1], row);
    });
  }
});

test("unsafe submitted metadata is rejected before any Google request", async (t) => {
  const fixture = setupSheet(t);
  for (const metadata of [
    { lastBalanceChecked: "2024-02-31" },
    { pendingReconciliation: true },
    { pendingReconciliation: "false" },
    { pendingReconciliation: null },
    { lastBalanceChecked: "" },
  ]) {
    assert.equal((await save([{ ...card, ...metadata }])).status, 400);
  }
  assert.equal(fixture.fetch.mock.callCount(), 0);
});

test("a known remote change blocks a write before header extension", async (t) => {
  const fixture = setupSheet(t);
  const response = await save([withMetadata], "stale-version");
  assert.equal(response.status, 409);
  assert.equal((await response.json()).remoteSheetVersion, metaVersion);
  assert.deepEqual(fixture.mutations, []);
  assert.deepEqual(fixture.cards[0], requiredCardHeaders);
});

test("a changed version during load is rejected instead of pairing old cards with a new version", async (t) => {
  const fixture = setupSheet(t, { changedOnLoad: true });
  const response = await route("/api/cards/load");
  assert.equal(response.status, 409);
  assert.match((await response.json()).error, /changed while loading/);
  assert.deepEqual(fixture.mutations, []);
});

test("a failed Google batch leaves headers, card values and metadata together at the old version", async (t) => {
  const fixture = setupSheet(t, { failBatch: true });
  const before = structuredClone(fixture.cards);
  const response = await save([withMetadata]);
  assert.equal(response.status, 502);
  assert.equal(fixture.mutations.length, 1);
  assert.deepEqual(fixture.cards, before);
  assert.equal(fixture.meta[2][1], metaVersion);
});
