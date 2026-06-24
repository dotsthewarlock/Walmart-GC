export const csvHeaders = [
  "cardNumber",
  "pin",
  "startingBalance",
  "currentBalance",
  "merchant",
  "merchantInferred",
  "dateAdded",
  "dateUpdated",
  "dateUsed",
  "used",
  "notes",
];

export const legacyCsvHeaders = [
  "cardNumber",
  "pin",
  "startingBalance",
  "currentBalance",
  "dateAdded",
  "dateUpdated",
  "dateUsed",
  "used",
];

export const oldApprovedCsvHeaders = csvHeaders.filter((header) => header !== "merchantInferred");

export const expectedCardsHeaderRow = csvHeaders.join(", ");

export function validateCsvHeaders(headers) {
  if (!Array.isArray(headers)) {
    return false;
  }
  const normalized = headers.map(h => String(h || "").trim());
  const headerSet = new Set(normalized);

  const hasApprovedHeaders = csvHeaders.every(h => headerSet.has(h));
  const hasOldApprovedHeaders = oldApprovedCsvHeaders.every(h => headerSet.has(h));
  const hasLegacyPrototypeHeaders = legacyCsvHeaders.every(h => headerSet.has(h));

  return hasApprovedHeaders || hasOldApprovedHeaders || hasLegacyPrototypeHeaders;
}
