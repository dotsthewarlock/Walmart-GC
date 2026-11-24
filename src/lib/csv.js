import {
  csvHeaders, requiredCardHeaders, oldApprovedCsvHeaders, legacyCsvHeaders,
  validateCsvHeaders, readOptionalCardMetadata,
} from "./csvSchema.js";
import {
  isValidWalmartGiftCardNumber, normalizePinValue, normalizeMerchantValue,
  inferMerchantFromCardNumber, todayString, normalizeMoney,
} from "./cards.js";

export function escapeCsvValue(value) {
  const text = String(value ?? "");
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function cardToCsvRow(card) {
  return csvHeaders
    .map((field) => {
      if (field === "used") {
        return escapeCsvValue(String(Boolean(card[field])));
      }
      if (field === "merchantInferred") {
        return escapeCsvValue(inferMerchantFromCardNumber(card.cardNumber));
      }
      return escapeCsvValue(card[field]);
    })
    .join(",");
}

export function cardsToCsv(cards, limit = cards.length) {
  return [csvHeaders.join(","), ...cards.slice(0, limit).map(cardToCsvRow)].join("\n");
}

// Parse complete records so quoted notes can contain commas, quotes and line breaks.
function readCsvRecords(rawCsv) {
  const source = rawCsv.replace(/^\uFEFF/, "");
  const records = [];
  let values = [];
  let value = "";
  let state = "unquoted";
  let lineNumber = 1;
  let recordLine = 1;

  function finishField() {
    values.push(value);
    value = "";
    state = "unquoted";
  }

  function finishRecord() {
    finishField();
    if (values.length !== 1 || values[0].trim()) {
      records.push({ values, lineNumber: recordLine });
    }
    values = [];
  }

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    const newline = character === "\n" || character === "\r";

    if (state === "quoted") {
      if (character === '"') {
        if (source[index + 1] === '"') {
          value += '"';
          index += 1;
        } else {
          state = "closed";
        }
      } else {
        value += character;
        if (newline) {
          if (character === "\r" && source[index + 1] === "\n") {
            value += "\n";
            index += 1;
          }
          lineNumber += 1;
        }
      }
    } else if (character === ",") {
      finishField();
    } else if (newline) {
      finishRecord();
      if (character === "\r" && source[index + 1] === "\n") index += 1;
      lineNumber += 1;
      recordLine = lineNumber;
    } else if (state === "closed") {
      if (!/^[ \t]$/.test(character)) throw new Error(`Row ${recordLine}: unexpected text after a closing CSV quote.`);
    } else if (character === '"') {
      if (value.trim()) throw new Error(`Row ${recordLine}: unexpected CSV quote.`);
      value = "";
      state = "quoted";
    } else {
      value += character;
    }
  }

  if (state === "quoted") throw new Error(`Row ${recordLine}: unclosed CSV quote.`);
  finishRecord();
  return records;
}

export function parseBooleanValue(value) {
  const normalizedValue = value.trim().toLowerCase();
  if (["true", "yes", "y", "1"].includes(normalizedValue)) {
    return true;
  }
  if (["false", "no", "n", "0"].includes(normalizedValue)) {
    return false;
  }
  return null;
}

export function readCsvMoney(value) {
  if (value.trim() === "") return null;
  const amount = value.trim().replace(/^\$/, "");
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(amount)) return NaN;
  const parsed = Number(amount);
  return Number.isFinite(parsed) ? normalizeMoney(parsed) : NaN;
}

const historicalHeaderlessSchemas = [legacyCsvHeaders, oldApprovedCsvHeaders, requiredCardHeaders];

export function wouldDiscardCardMetadata(currentCards, replacementCards) {
  const replacements = new Map(replacementCards.map((card) => [card.cardNumber, readOptionalCardMetadata(card)]));
  return currentCards.some((card) => Object.entries(readOptionalCardMetadata(card)).some(([header, value]) =>
    value !== replacements.get(card.cardNumber)?.[header]
  ));
}

export function parseRawCardData(rawCsv) {
  const warnings = [];
  const parsedCards = [];
  const seenCardNumbers = new Set();
  let rows;
  try {
    rows = readCsvRecords(rawCsv);
  } catch (error) {
    return { parsedCards: [], warnings: [error.message] };
  }
  if (!rows.length) return { parsedCards: [], warnings: ["CSV is empty. Include a recognized header row or card records."] };

  const firstValues = rows[0].values.map((value) => value.trim());
  let headers;
  if (validateCsvHeaders(firstValues)) {
    headers = firstValues;
    rows.shift();
  } else if (!isValidWalmartGiftCardNumber(firstValues[0]) && firstValues.some((value) => csvHeaders.includes(value))) {
    return { parsedCards: [], warnings: ["CSV header row is malformed. Use a supported schema with unique, recognized header names."] };
  }

  const fallbackToday = todayString();
  for (const { values, lineNumber } of rows) {
    const schema = headers ?? historicalHeaderlessSchemas.find((fields) => fields.length === values.length);
    if (!schema || values.length !== schema.length) {
      warnings.push(`Row ${lineNumber}: malformed row; expected ${headers?.length ?? "8, 10, or 11"} CSV fields.`);
      continue;
    }
    const fields = Object.fromEntries(schema.map((header, index) => [header, values[index]]));
    const read = (header) => (fields[header] ?? "").trim();
    const cardNumber = read("cardNumber");
    const pin = normalizePinValue(fields.pin);
    const startingBalance = readCsvMoney(read("startingBalance"));
    const currentBalance = readCsvMoney(read("currentBalance")) ?? startingBalance;
    const used = read("used") ? parseBooleanValue(read("used")) : false;
    const dateAddedRaw = read("dateAdded");
    const dateUpdatedRaw = read("dateUpdated");
    const dateUsedRaw = read("dateUsed");
    const warningsBeforeRow = warnings.length;

    if (!isValidWalmartGiftCardNumber(cardNumber)) {
      warnings.push(`Row ${lineNumber}: Card number must start with 63 and be exactly 16 digits.`);
    } else if (seenCardNumbers.has(cardNumber)) {
      warnings.push(`Row ${lineNumber}: duplicate card number.`);
    }
    if (pin.length < 4) warnings.push(`Row ${lineNumber}: PIN must be at least 4 characters.`);
    if (!Number.isFinite(startingBalance)) warnings.push(`Row ${lineNumber}: invalid starting balance.`);
    if (Number.isNaN(currentBalance) && Number.isFinite(startingBalance)) {
      warnings.push(`Row ${lineNumber}: invalid current balance.`);
    } else if (currentBalance < 0) {
      warnings.push(`Row ${lineNumber}: current balance cannot be below zero.`);
    }
    if (used === null) warnings.push(`Row ${lineNumber}: invalid used value.`);
    let metadata;
    try {
      metadata = readOptionalCardMetadata(fields, { cellValues: true });
    } catch (error) {
      warnings.push(`Row ${lineNumber}: ${error.message}`);
    }
    if (warnings.length !== warningsBeforeRow) continue;

    seenCardNumbers.add(cardNumber);
    const dateAdded = dateAddedRaw || fallbackToday;
    const dateUpdated = dateUpdatedRaw || dateAdded;
    const dateUsed = dateUsedRaw || (used ? dateUpdated : "");
    parsedCards.push({
      cardNumber,
      pin,
      merchant: normalizeMerchantValue(fields.merchant),
      merchantInferred: inferMerchantFromCardNumber(cardNumber),
      startingBalance,
      currentBalance,
      dateAdded,
      dateUpdated,
      dateUsed,
      used,
      notes: fields.notes ?? "",
      ...metadata,
    });
  }

  return { parsedCards: warnings.length ? [] : parsedCards, warnings };
}
