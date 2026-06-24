import { csvHeaders, oldApprovedCsvHeaders, legacyCsvHeaders } from "./csvSchema";
import { isValidWalmartGiftCardNumber, normalizePinValue, normalizeMerchantValue, inferMerchantFromCardNumber, todayString, normalizeMoney } from "./cards";

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

export function parseCsvLine(line) {
  const values = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    const nextCharacter = line[index + 1];

    if (character === '"') {
      if (inQuotes && nextCharacter === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (character === "," && !inQuotes) {
      values.push(current.trim());
      current = "";
      continue;
    }

    current += character;
  }

  if (inQuotes) {
    return null;
  }

  values.push(current.trim());
  return values;
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
  if (value.trim() === "") {
    return null;
  }
  const parsedValue = Number.parseFloat(value.replace(/^\$/, ""));
  return Number.isFinite(parsedValue) ? normalizeMoney(parsedValue) : NaN;
}

export function getCsvHeaderMap(headerValues) {
  if (!Array.isArray(headerValues)) {
    return null;
  }

  const normalizedValues = headerValues.map((value) => value.trim());
  const knownHeaders = new Set([...csvHeaders, ...oldApprovedCsvHeaders, ...legacyCsvHeaders]);
  if (!normalizedValues.every((value) => knownHeaders.has(value))) {
    return null;
  }

  const headerMap = new Map();
  normalizedValues.forEach((value, index) => {
    if (value) {
      headerMap.set(value, index);
    }
  });

  const hasApprovedHeaders = csvHeaders.every((header) => headerMap.has(header));
  const hasOldApprovedHeaders = oldApprovedCsvHeaders.every((header) => headerMap.has(header));
  const hasLegacyPrototypeHeaders = legacyCsvHeaders.every((header) => headerMap.has(header));
  return hasApprovedHeaders || hasOldApprovedHeaders || hasLegacyPrototypeHeaders ? headerMap : null;
}

export function normalizeCsvRows(rawCsv) {
  const rows = rawCsv
    .split(/\r?\n/)
    .map((line, index) => ({ line: line.trim(), lineNumber: index + 1 }))
    .filter(({ line }) => line);

  if (rows.length === 0) {
    return { rows: [], headerMap: null };
  }

  const headerMap = getCsvHeaderMap(parseCsvLine(rows[0].line));
  return headerMap ? { rows: rows.slice(1), headerMap } : { rows, headerMap: null };
}

export function parseRawCardData(rawCsv) {
  const warnings = [];
  const parsedCards = [];
  const seenCardNumbers = new Set();
  const { rows, headerMap } = normalizeCsvRows(rawCsv);
  const fallbackToday = todayString();

  rows.forEach(({ line, lineNumber }) => {
    const displayRow = lineNumber;
    const values = parseCsvLine(line);

    if (!values || (!headerMap && ![csvHeaders.length, oldApprovedCsvHeaders.length, legacyCsvHeaders.length].includes(values.length))) {
      warnings.push(`Row ${displayRow}: malformed row; expected ${csvHeaders.length} CSV fields.`);
      return;
    }

    const isLegacyPrototypeRow = !headerMap && values.length === legacyCsvHeaders.length;
    const isOldApprovedRow = !headerMap && values.length === oldApprovedCsvHeaders.length;
    const readHeaderValue = (header) => {
      if (!headerMap || !headerMap.has(header)) {
        return "";
      }
      return values[headerMap.get(header)] ?? "";
    };
    
    const fallbackApprovedValues = [
      values[0],
      values[1],
      values[4],
      values[2],
      values[3],
      values[6],
      values[7],
      values[8],
      values[9],
      values[10] ?? "",
    ];
    
    const [
      cardNumber,
      pin,
      merchantRaw,
      startingBalanceRaw,
      currentBalanceRaw,
      dateAddedRaw,
      dateUpdatedRaw,
      dateUsedRaw,
      usedRaw,
      notesRaw = "",
    ] = headerMap
      ? [
        readHeaderValue("cardNumber"),
        readHeaderValue("pin"),
        readHeaderValue("merchant"),
        readHeaderValue("startingBalance"),
        readHeaderValue("currentBalance"),
        readHeaderValue("dateAdded"),
        readHeaderValue("dateUpdated"),
        readHeaderValue("dateUsed"),
        readHeaderValue("used"),
        readHeaderValue("notes"),
      ]
      : isLegacyPrototypeRow
        ? [values[0], values[1], "", ...values.slice(2), ""]
        : isOldApprovedRow
          ? [values[0], values[1], values[4], values[2], values[3], ...values.slice(5)]
          : fallbackApprovedValues;
          
    let hasError = false;

    if (!cardNumber) {
      warnings.push(`Row ${displayRow}: missing card number.`);
      hasError = true;
    } else if (!isValidWalmartGiftCardNumber(cardNumber)) {
      warnings.push(`Row ${displayRow}: Card number must start with 63 and be exactly 16 digits.`);
      hasError = true;
    } else if (seenCardNumbers.has(cardNumber)) {
      warnings.push(`Row ${displayRow}: duplicate card number ${cardNumber}.`);
      hasError = true;
    }

    const normalizedPin = normalizePinValue(pin);
    if (!normalizedPin) {
      warnings.push(`Row ${displayRow}: missing PIN.`);
      hasError = true;
    } else if (normalizedPin.length < 4) {
      warnings.push(`Row ${displayRow}: PIN must be at least 4 characters.`);
      hasError = true;
    }

    const merchant = normalizeMerchantValue(merchantRaw);

    const startingBalance = readCsvMoney(startingBalanceRaw);
    if (startingBalance === null || Number.isNaN(startingBalance)) {
      warnings.push(`Row ${displayRow}: invalid starting balance.`);
      hasError = true;
    }

    const currentBalance = currentBalanceRaw === "" ? startingBalance : readCsvMoney(currentBalanceRaw);
    if (Number.isNaN(currentBalance)) {
      warnings.push(`Row ${displayRow}: invalid current balance.`);
      hasError = true;
    } else if (currentBalance < 0) {
      warnings.push(`Row ${displayRow}: current balance cannot be below zero.`);
      hasError = true;
    }

    const used = usedRaw === "" ? false : parseBooleanValue(usedRaw);
    if (used === null) {
      warnings.push(`Row ${displayRow}: invalid used value.`);
      hasError = true;
    }

    if (hasError) {
      return;
    }

    seenCardNumbers.add(cardNumber);

    const dateAdded = dateAddedRaw || fallbackToday;
    const dateUpdated = dateUpdatedRaw || dateAdded || fallbackToday;
    const dateUsed = dateUsedRaw || (used ? dateUpdated || fallbackToday : "");

    parsedCards.push({
      cardNumber,
      pin: normalizedPin,
      merchant,
      merchantInferred: inferMerchantFromCardNumber(cardNumber),
      startingBalance,
      currentBalance,
      dateAdded,
      dateUpdated,
      dateUsed,
      used,
      notes: notesRaw,
    });
  });

  return { parsedCards, warnings };
}
