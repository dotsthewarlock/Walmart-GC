import assert from "node:assert/strict";
import { test } from "node:test";
import { workerTestInternals } from "./src/index.js";

const { CARD_HEADERS, inferMerchantFromCardNumber, validateCardHeaders } = workerTestInternals;
const legacyHeaders = [
  "cardNumber", "pin", "startingBalance", "currentBalance", "merchant",
  "dateAdded", "dateUpdated", "dateUsed", "used", "notes",
];
const requiredHeaders = [
  ...legacyHeaders.slice(0, 5), "merchantInferred", ...legacyHeaders.slice(5),
];

test("the eleven required headers keep their existing names and order", () => {
  assert.deepEqual(CARD_HEADERS, requiredHeaders);
});

test("Sheets accept reordered exact 10/11/12/13-column schemas", () => {
  for (const headers of [
    legacyHeaders,
    requiredHeaders,
    [...requiredHeaders, "lastBalanceChecked"],
    [...requiredHeaders, "pendingReconciliation"],
    [...requiredHeaders, "lastBalanceChecked", "pendingReconciliation"],
  ]) {
    const reversed = [...headers].reverse();
    assert.deepEqual([...validateCardHeaders([...reversed, "", ""])], reversed.map((header, index) => [header, index]));
  }
});

test("ambiguous and unknown Sheet headers are rejected with recovery details", () => {
  for (const [headers, message] of [
    [[...requiredHeaders, "notes"], /Duplicate Cards header/],
    [[...requiredHeaders, "lastBalanceChecked", "lastBalanceChecked"], /Duplicate Cards header/],
    [[...requiredHeaders, "surprise"], /Unsupported Cards header/],
    [[...requiredHeaders.slice(0, 5), "", ...requiredHeaders.slice(5)], /blank or ambiguous/],
    [[], /blank or ambiguous/],
    [requiredHeaders.filter((header) => header !== "pin"), /Missing required Cards header\(s\): pin/],
    [[...legacyHeaders, "lastBalanceChecked"], /Missing required Cards header\(s\): merchantInferred/],
  ]) {
    assert.throws(() => validateCardHeaders(headers), (error) => {
      assert.equal(error.status, 409);
      assert.match(error.body.error, message);
      assert.match(error.body.error, /CSV backup/);
      return true;
    });
  }
});

test("a historical Walmart card still derives its merchant", () => {
  assert.equal(inferMerchantFromCardNumber("6300000000000001"), "walmart-ca");
  assert.equal(inferMerchantFromCardNumber("unrecognized"), "");
});
