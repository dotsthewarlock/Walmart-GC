export const requiredCardHeaders = [
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

export const oldApprovedCsvHeaders = [
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

export const optionalCardHeaders = ["lastBalanceChecked", "pendingReconciliation"];
export const schemaCapability = "optional-card-metadata-v1";
export const csvHeaders = [...requiredCardHeaders, ...optionalCardHeaders];
export const expectedCardsHeaderRow = csvHeaders.join(", ");

export function validateCsvHeaders(headers) {
  if (!Array.isArray(headers)) return false;
  const normalized = headers.map((header) => String(header ?? "").trim());
  const names = new Set(normalized);
  if (names.size !== normalized.length) return false;

  return [legacyCsvHeaders, oldApprovedCsvHeaders].some((schema) =>
    schema.length === names.size && schema.every((header) => names.has(header))
  ) || (
    requiredCardHeaders.every((header) => names.has(header)) &&
    normalized.every((header) => csvHeaders.includes(header))
  );
}

export function isCalendarDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith("0000-")) {
    return false;
  }
  const date = new Date(value + "T00:00:00Z");
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

// Sheet and CSV cells may encode a Boolean as text. JSON cards use Booleans.
export function readOptionalCardMetadata(card, { cellValues = false } = {}) {
  const metadata = {};
  const date = card.lastBalanceChecked;
  if (!isAbsentMetadata(date, cellValues)) {
    if (!isCalendarDate(date)) {
      throw new Error("lastBalanceChecked must be a valid YYYY-MM-DD date or blank.");
    }
    metadata.lastBalanceChecked = date;
  }

  const pending = card.pendingReconciliation;
  if (!isAbsentMetadata(pending, cellValues)) {
    const flag = cellValues && typeof pending === "string" ? pending.trim().toLowerCase() : pending;
    if (flag === true || (cellValues && flag === "true")) {
      throw new Error("pendingReconciliation=true is unsupported in V0.1.");
    }
    if (flag !== false && !(cellValues && flag === "false")) {
      throw new Error("pendingReconciliation must be Boolean or blank.");
    }
    metadata.pendingReconciliation = false;
  }
  return metadata;
}

function isAbsentMetadata(value, cellValues) {
  return value === undefined || (cellValues && (value === null || (typeof value === "string" && value.trim() === "")));
}
