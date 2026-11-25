import assert from "node:assert/strict";
import { test } from "node:test";
import worker, {googleSheetAdapter} from "./src/index.js";
import {fingerprint,snapshotContent,syncProtocol,emptyEvidence} from "../src/lib/syncProtocol.js";
import {openInventory,profileOf,inventoryContext,inventoryBytes} from '../src/lib/inventory.js';
import {createSyncEngine} from '../src/lib/syncEngine.js';
import {createTransferLedger,prepareTransferApplication} from '../src/lib/balanceTransferLedger.js';
import {selectTransferCards,previewTransferResults} from '../src/lib/balanceTransfer.js';
import {syntheticIndexedDB} from '../tests/syntheticIndexedDB.mjs';
import {cardA,memoryStorage} from '../tests/syncFixtures.mjs';
import {SerialCoordinator} from './src/syncCoordinator.js';
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
  let cardsId=10,metaId=20;
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
        if (addSheet?.properties.title === "Cards") cardsExist = true, cardsId=addSheet.properties.sheetId;
        if (addSheet?.properties.title === "_META") metaExists = true, metaId=addSheet.properties.sheetId;
      }
      applySheetBatch(requests.filter((request) => !request.addSheet), cards, meta, grid,cardsId);
      return Response.json({});
    }
    if (path === `/drive/v3/files/${spreadsheetId}`) {
      return Response.json({ id: spreadsheetId, mimeType: "application/vnd.google-apps.spreadsheet" });
    }
    if (path === `/v4/spreadsheets/${spreadsheetId}`) {
      return Response.json({
        properties: { title: "Walmart-GC Data" },
        sheets: [
          ...(cardsExist ? [{ properties: { title: "Cards", sheetId: cardsId, gridProperties: grid } }] : []),
          ...(metaExists ? [{ properties: { title: "_META", sheetId: metaId, hidden: metaHidden } }] : []),
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

function applySheetBatch(requests, cards, meta, grid,cardsId=10) {
  for (const request of requests) {
    if (request.deleteSheet) {
      assert.equal(request.deleteSheet.sheetId, 30);
      continue;
    }
    if (request.appendDimension) {
      const { sheetId, dimension, length } = request.appendDimension;
      assert.equal(sheetId, cardsId);
      grid[dimension === "COLUMNS" ? "columnCount" : "rowCount"] += length;
      continue;
    }
    const { start, range, rows, fields } = request.updateCells;
    assert.equal(fields, "userEnteredValue");
    const target = (start ?? range).sheetId === cardsId ? cards : meta;
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


async function write(adapter, previous, cards=previous.cards) {
  const next={cards,evidence:previous.evidence,maintenance:false};
  await adapter.prepare(next,previous);
  await adapter.write(next,'synthetic-commit',await fingerprint(snapshotContent(next)),previous);
}

test('unchanged Batch verification survives IndexedDB, protected commit and Sheet cells',async(t)=>{
  const sheet=setupSheet(t,{rows:[rowFor(requiredCardHeaders,cardA)]});
  const adapter=googleSheetAdapter('fixture-access',spreadsheetId), coordinator=new SerialCoordinator(memoryStorage(),adapter);
  const store=openInventory({indexedDB:syntheticIndexedDB(),name:'batch-roundtrip',storage:{getItem:()=>null}});await store.initialize();
  const status={authenticated:true,principal:'synthetic-principal',ownershipVerified:true,sheetId:spreadsheetId,syncProtocol,coordinationAvailable:true};
  const timers={setTimeout(){return 1;},clearTimeout(){},setInterval(){return 1;},clearInterval(){}};
  const engine=createSyncEngine({store,timers,request:async(path,options)=>path==='/api/status'?status:{...await coordinator.run(JSON.parse(options.body)),principal:status.principal,sheetId:spreadsheetId}});
  await engine.sync({bind:true});let state=await store.read(),profile=profileOf(state);
  const ledger=await createTransferLedger({sheetId:spreadsheetId,sheetVersion:profile.sync.lastKnownSheetVersion},selectTransferCards(profile.cards).selected,inventoryBytes(state));
  state=await store.commit({id:crypto.randomUUID(),kind:'set-batch',...inventoryContext(state),revision:profile.revision,ledger});profile=profileOf(state);
  const observation={ref:ledger.requests[0].ref,balance:cardA.currentBalance,checkedAt:new Date().toISOString()},now=Date.now();
  const preview=previewTransferResults(profile.ledger,profile.cards,[observation],now),prepared=await prepareTransferApplication(profile.ledger,preview.candidate,preview.items);
  state=await store.commit({id:crypto.randomUUID(),kind:'apply-batch',...inventoryContext(state),ledgerId:ledger.id,observations:[observation],items:preview.items,now,inventoryDigest:prepared.finalized.inventoryDigest});
  assert.equal(profileOf(state).pending[0].kind,'batch-verification');assert.equal(profileOf(state).cards[0].lastBalanceChecked,observation.checkedAt.slice(0,10));
  await engine.sync();state=await store.read();assert.equal(profileOf(state).pending.length,0);assert.ok(profileOf(state).sync.lastConfirmedAt);
  const reloaded=await adapter.read();assert.equal(reloaded.cards[0].currentBalance,cardA.currentBalance);assert.equal(reloaded.cards[0].lastBalanceChecked,observation.checkedAt.slice(0,10));
  assert.equal(sheet.cards[1][sheet.cards[0].indexOf('lastBalanceChecked')],observation.checkedAt.slice(0,10));
});

test('legacy whole-inventory and ensure requests are fenced before any Google call',async(t)=>{
  const fixture=setupSheet(t);
  for(const path of ['/api/cards/save','/api/sheet/ensure']){
    const response=await worker.fetch(new Request('https://wallet.synthetic'+path,{method:'POST',body:JSON.stringify({cards:[card]})}),env);
    assert.equal(response.status,426);
  }
  assert.equal(fixture.fetch.mock.callCount(),0);
});

test('signed-out status retains schema capability without Google requests',async(t)=>{
  const fixture=setupSheet(t);const response=await worker.fetch(new Request('https://wallet.synthetic/api/status'),env);
  assert.equal(response.status,200);assert.equal((await response.json()).schemaCapability,schemaCapability);assert.equal(fixture.fetch.mock.callCount(),0);
});

test('coordinated adapter preserves every recognized reordered header map and lazily appends populated metadata',async(t)=>{
 for(const headers of [oldApprovedCsvHeaders,requiredCardHeaders,[...requiredCardHeaders,'lastBalanceChecked'],[...requiredCardHeaders,'pendingReconciliation'],[...requiredCardHeaders,...optionalCardHeaders]]){
  for(const flag of [undefined,false,true])await t.test(headers.length+':'+flag,async(sub)=>{
   const source={...card,...(flag!==undefined?{pendingReconciliation:flag}:{})};
   const fixture=setupSheet(sub,{headers:[...headers].reverse(),rows:[rowFor([...headers].reverse(),source)]});
   const adapter=googleSheetAdapter('fixture-access',spreadsheetId),before=await adapter.read();
   assert.deepEqual(fixture.mutations,[]);assert.equal(before.cards[0].pin,'0007');
   await write(adapter,before,[{...before.cards[0],lastBalanceChecked:'2024-02-29',...(flag!==undefined?{pendingReconciliation:flag}:{})}]);
   const after=await adapter.read();assert.equal(after.cards[0].lastBalanceChecked,'2024-02-29');
   assert.deepEqual(fixture.cards[0].slice(0,headers.length),[...headers].reverse());
   assert.equal(fixture.cards[0].filter(h=>h==='lastBalanceChecked').length,1);
   assert.equal(after.cards[0].pendingReconciliation,flag);
   assert.equal(after.commitId,'synthetic-commit');assert.equal(after.fingerprint,await fingerprint(snapshotContent(after)));
   assert.equal(fixture.mutations.length,1);assert.equal(fixture.meta.find(r=>r[0]==='fixtureExtra')[1],'preserve me');
  });
 }
});

test('empty optional values never eagerly backfill optional headers',async(t)=>{
 const fixture=setupSheet(t),adapter=googleSheetAdapter('fixture-access',spreadsheetId),before=await adapter.read();
 await write(adapter,before);assert.deepEqual(fixture.cards[0],requiredCardHeaders);
});

test('fresh schema initialization is one atomic batch and preserves other tabs',async(t)=>{
 const fixture=setupSheet(t,{fresh:true,defaultTab:{values:[['private preserved']]}}),adapter=googleSheetAdapter('fixture-access',spreadsheetId),before=await adapter.read();
 await write(adapter,before);const after=await adapter.read();assert.deepEqual(after.cards,[]);assert.deepEqual(fixture.cards[0],requiredCardHeaders);
 assert.equal(fixture.mutations.length,1);assert.ok(fixture.mutations[0].some(r=>r.addSheet));assert.ok(!fixture.mutations[0].some(r=>r.deleteSheet));
});

test('blank-looking formulas in append targets block the complete inventory/metadata batch',async(t)=>{
 for(const value of ['occupied','=""'])await t.test(value,async(sub)=>{
  const fixture=setupSheet(sub,{extraCell:{column:11,value}}),adapter=googleSheetAdapter('fixture-access',spreadsheetId),before=await adapter.read();
  await assert.rejects(write(adapter,before,[{...before.cards[0],lastBalanceChecked:'2024-02-29'}]),/target column/);assert.deepEqual(fixture.mutations,[]);
 });
});

test('unknown, duplicate, missing and malformed Cards values reject before mutation',async(t)=>{
 for(const headers of [[...requiredCardHeaders,'unknown'],[...requiredCardHeaders,'pin'],requiredCardHeaders.filter(h=>h!=='pin'),['',...requiredCardHeaders]])await t.test(headers.join(','),async(sub)=>{
  const fixture=setupSheet(sub,{headers}),adapter=googleSheetAdapter('fixture-access',spreadsheetId);await assert.rejects(adapter.read());assert.deepEqual(fixture.mutations,[]);
 });
 for(const record of [{...card,lastBalanceChecked:'2024-04-31'},{...card,pendingReconciliation:'invalid'},{...card,pin:'1'},{...card,currentBalance:'NaN'}])await t.test(JSON.stringify(record),async(sub)=>{
  const fixture=setupSheet(sub,{headers:[...requiredCardHeaders,...optionalCardHeaders],rows:[rowFor([...requiredCardHeaders,...optionalCardHeaders],record)]}),adapter=googleSheetAdapter('fixture-access',spreadsheetId);await assert.rejects(adapter.read());assert.deepEqual(fixture.mutations,[]);
 });
});

test('version changing across reads rejects a torn snapshot',async(t)=>{
 const fixture=setupSheet(t,{changedOnLoad:true});await assert.rejects(googleSheetAdapter('fixture-access',spreadsheetId).read(),/changed during read/);assert.deepEqual(fixture.mutations,[]);
});

test('failed Sheets batch leaves headers, cards and metadata at the previous values',async(t)=>{
 const fixture=setupSheet(t,{failBatch:true}),adapter=googleSheetAdapter('fixture-access',spreadsheetId),before=await adapter.read();
 const original=structuredClone({cards:fixture.cards,meta:fixture.meta});
 await assert.rejects(write(adapter,before,[{...before.cards[0],pendingReconciliation:true}]),/Google API/);
 assert.deepEqual({cards:fixture.cards,meta:fixture.meta},original);
});
