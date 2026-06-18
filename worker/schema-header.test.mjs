import assert from "node:assert/strict";
import { workerTestInternals } from "./src/index.js";

const { CARD_HEADERS, validateCardHeaders } = workerTestInternals;

function assertValid(headers, expectedIndexes) {
  const headerMap = validateCardHeaders(headers);
  Object.entries(expectedIndexes).forEach(([header, index]) => {
    assert.equal(headerMap.get(header), index, `${header} index`);
  });
}

function assertHeaderError(headers, expectedMessageParts) {
  assert.throws(
    () => validateCardHeaders(headers),
    (error) => {
      assert.equal(error.status, 409);
      expectedMessageParts.forEach((part) => assert.match(error.body.error, part));
      return true;
    },
  );
}

assert.deepEqual(CARD_HEADERS, [
  "cardNumber",
  "pin",
  "startingBalance",
  "currentBalance",
  "merchant",
  "dateAdded",
  "dateUpdated",
  "dateUsed",
  "used",
  "notes",
]);

assertValid(CARD_HEADERS, { cardNumber: 0, merchant: 4, notes: 9 });
assertValid([
  "cardNumber",
  "pin",
  "merchant",
  "startingBalance",
  "currentBalance",
  "dateAdded",
  "dateUpdated",
  "dateUsed",
  "used",
  "notes",
], { cardNumber: 0, merchant: 2, currentBalance: 4 });
assertValid([
  "notes",
  "used",
  "dateUsed",
  "dateUpdated",
  "dateAdded",
  "merchant",
  "currentBalance",
  "startingBalance",
  "pin",
  "cardNumber",
], { notes: 0, merchant: 5, cardNumber: 9 });
assertValid(["extraColumn", ...CARD_HEADERS], { cardNumber: 1, notes: 10 });

assertHeaderError(
  CARD_HEADERS.filter((header) => header !== "currentBalance"),
  [/Missing required Cards header\(s\): currentBalance\./, /Local data remains available/, /CSV backup/],
);
assertHeaderError(
  ["cardNumber", ...CARD_HEADERS],
  [/Duplicate required Cards header\(s\): cardNumber\./, /column order can be changed/],
);

console.log("schema-header tests passed");
