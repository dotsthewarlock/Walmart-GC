/**
 * Walmart-GC Google Apps Script MVP API.
 *
 * Bound this file to the user's Google Sheet and deploy it as a Web App.
 * The frontend calls one Web App URL with an action query parameter.
 */

const DATA_SHEET_NAME = 'Cards';
const META_SHEET_NAME = '_META';
const SCHEMA_VERSION = '1';
const WRITE_SOURCE = 'apps-script';

const CARD_SCHEMA = [
  'cardNumber',
  'pin',
  'merchant',
  'startingBalance',
  'currentBalance',
  'dateAdded',
  'dateUpdated',
  'dateUsed',
  'used',
  'notes'
];

const META_KEYS = [
  'lastSheetWriteAt',
  'lastWriteSource',
  'schemaVersion'
];

const ERROR_CODES = {
  NOT_AUTHORIZED: 'NOT_AUTHORIZED',
  NETWORK_ERROR: 'NETWORK_ERROR',
  INVALID_SCHEMA: 'INVALID_SCHEMA',
  SETUP_REQUIRED: 'SETUP_REQUIRED',
  SYNC_CONFLICT: 'SYNC_CONFLICT',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR'
};

/**
 * Handles GET ?action=health and GET ?action=load.
 */
function doGet(e) {
  return handleRequest_(e, 'GET');
}

/**
 * Handles POST ?action=updateCard, POST ?action=batchUpdate, and POST ?action=replaceAll.
 */
function doPost(e) {
  return handleRequest_(e, 'POST');
}

function handleRequest_(e, method) {
  try {
    const action = getAction_(e);

    if (method === 'GET') {
      if (action === 'health') return jsonResponse_(handleHealth_());
      if (action === 'load') return jsonResponse_(handleLoad_());
    }

    if (method === 'POST') {
      const request = parsePostBody_(e);
      if (action === 'updateCard') return jsonResponse_(withDocumentLock_(function () {
        return handleUpdateCard_(request);
      }));
      if (action === 'batchUpdate') return jsonResponse_(withDocumentLock_(function () {
        return handleBatchUpdate_(request);
      }));
      if (action === 'replaceAll') return jsonResponse_(withDocumentLock_(function () {
        return handleReplaceAll_(request);
      }));
    }

    return jsonResponse_(errorEnvelope_(ERROR_CODES.VALIDATION_ERROR, 'Unsupported action.'));
  } catch (err) {
    return jsonResponse_(exceptionEnvelope_(err));
  }
}

function handleHealth_() {
  const context = ensureWorkbookStructure_();
  const sheet = context.sheet;
  const meta = readMeta_(context.metaSheet);

  return successEnvelope_({
    spreadsheetId: context.spreadsheet.getId(),
    spreadsheetName: context.spreadsheet.getName(),
    sheetName: sheet ? sheet.getName() : null,
    schemaVersion: meta.schemaVersion || SCHEMA_VERSION,
    schemaValid: Boolean(sheet),
    setupStatus: context.setupStatus
  }, getSheetVersion_(context.metaSheet));
}

function handleLoad_() {
  const context = ensureWorkbookStructure_();
  const cards = readCards_(context.sheet);

  return successEnvelope_({
    cards: cards,
    sheetName: context.sheet.getName(),
    spreadsheetId: context.spreadsheet.getId(),
    spreadsheetName: context.spreadsheet.getName()
  }, getSheetVersion_(context.metaSheet));
}

function handleUpdateCard_(request) {
  validatePostEnvelope_(request);
  const context = ensureWorkbookStructure_();
  assertFreshSheetVersion_(context.metaSheet, request.lastKnownSheetVersion);

  const payload = request.payload || {};
  const card = payload.card || payload;
  validateCardForWrite_(card);

  upsertCard_(context.sheet, card);
  const sheetVersion = touchSheetVersion_(context.metaSheet, 'updateCard');

  return successEnvelope_({ card: normalizeCard_(card) }, sheetVersion);
}

function handleBatchUpdate_(request) {
  validatePostEnvelope_(request);
  const context = ensureWorkbookStructure_();
  assertFreshSheetVersion_(context.metaSheet, request.lastKnownSheetVersion);

  const payload = request.payload || {};
  const cards = payload.cards;
  if (!Array.isArray(cards)) {
    throw apiError_(ERROR_CODES.VALIDATION_ERROR, 'payload.cards must be an array.');
  }

  assertUniqueCardNumbers_(cards);
  cards.forEach(validateCardForWrite_);
  cards.forEach(function (card) {
    upsertCard_(context.sheet, card);
  });

  const sheetVersion = touchSheetVersion_(context.metaSheet, 'batchUpdate');

  return successEnvelope_({ updatedCount: cards.length }, sheetVersion);
}

function handleReplaceAll_(request) {
  validatePostEnvelope_(request);
  const context = ensureWorkbookStructure_();
  assertFreshSheetVersion_(context.metaSheet, request.lastKnownSheetVersion);

  const payload = request.payload || {};
  if (payload.confirmReplaceAll !== true) {
    throw apiError_(ERROR_CODES.VALIDATION_ERROR, 'replaceAll requires payload.confirmReplaceAll to be true.');
  }

  const cards = payload.cards;
  if (!Array.isArray(cards)) {
    throw apiError_(ERROR_CODES.VALIDATION_ERROR, 'payload.cards must be an array.');
  }

  assertUniqueCardNumbers_(cards);
  cards.forEach(validateCardForWrite_);
  replaceCards_(context.sheet, cards);

  const sheetVersion = touchSheetVersion_(context.metaSheet, 'replaceAll');

  return successEnvelope_({ replacedCount: cards.length }, sheetVersion);
}

function ensureWorkbookStructure_() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  if (!spreadsheet) {
    throw apiError_(ERROR_CODES.SETUP_REQUIRED, 'No active spreadsheet is available.');
  }

  let sheet = spreadsheet.getSheetByName(DATA_SHEET_NAME);
  let setupStatus = 'ready';

  if (sheet) {
    if (sheet.isSheetHidden()) sheet.showSheet();
    ensureHeaderStructure_(sheet);
  } else {
    const visibleSheets = spreadsheet.getSheets().filter(function (candidate) {
      return !candidate.isSheetHidden() && candidate.getName() !== META_SHEET_NAME;
    });
    const exactMatches = visibleSheets.filter(isExactSchemaSheet_);

    if (exactMatches.length === 1) {
      exactMatches[0].setName(DATA_SHEET_NAME);
      sheet = exactMatches[0];
      setupStatus = 'renamedSchemaSheet';
    } else if (exactMatches.length > 1) {
      throw apiError_(ERROR_CODES.SETUP_REQUIRED, 'Multiple schema-valid visible sheets exist. Rename the intended sheet to Cards.');
    } else if (isWorkbookBlank_(visibleSheets)) {
      sheet = visibleSheets.length ? visibleSheets[0] : spreadsheet.insertSheet(DATA_SHEET_NAME);
      sheet.setName(DATA_SHEET_NAME);
      writeSchemaHeaders_(sheet);
      setupStatus = 'createdCardsSheet';
    } else {
      throw apiError_(ERROR_CODES.SETUP_REQUIRED, 'No Cards sheet or single schema-valid visible sheet was found.');
    }
  }

  const metaSheet = ensureMetaSheet_(spreadsheet);
  initializeMeta_(metaSheet);

  return {
    spreadsheet: spreadsheet,
    sheet: sheet,
    metaSheet: metaSheet,
    setupStatus: setupStatus
  };
}

function ensureMetaSheet_(spreadsheet) {
  let sheet = spreadsheet.getSheetByName(META_SHEET_NAME);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(META_SHEET_NAME);
  }
  if (!sheet.isSheetHidden()) {
    sheet.hideSheet();
  }
  return sheet;
}

function initializeMeta_(metaSheet) {
  const meta = readMeta_(metaSheet);
  let changed = false;

  if (!meta.schemaVersion) {
    setMetaValue_(metaSheet, 'schemaVersion', SCHEMA_VERSION);
    changed = true;
  }
  if (!meta.lastWriteSource) {
    setMetaValue_(metaSheet, 'lastWriteSource', 'setup');
    changed = true;
  }
  if (!meta.lastSheetWriteAt) {
    setMetaValue_(metaSheet, 'lastSheetWriteAt', newIsoTimestamp_());
    changed = true;
  }

  if (changed) SpreadsheetApp.flush();
}

function ensureHeaderStructure_(sheet) {
  const headerValues = getHeaderValues_(sheet);

  if (headerValues.length === 0) {
    writeSchemaHeaders_(sheet);
    return;
  }

  if (isExactHeaderPrefix_(headerValues)) {
    return;
  }

  if (!isRepairableApprovedHeaderSubset_(headerValues)) {
    throw apiError_(ERROR_CODES.INVALID_SCHEMA, 'Cards sheet headers do not match the approved schema.');
  }

  repairMissingSchemaColumns_(sheet, headerValues);
}

function writeSchemaHeaders_(sheet) {
  sheet.getRange(1, 1, 1, CARD_SCHEMA.length).setValues([CARD_SCHEMA]);
}

function repairMissingSchemaColumns_(sheet, headerValues) {
  let currentHeaders = headerValues.slice();

  CARD_SCHEMA.forEach(function (expectedHeader, expectedIndex) {
    if (currentHeaders[expectedIndex] === expectedHeader) return;

    const existingIndex = currentHeaders.indexOf(expectedHeader);
    if (existingIndex > expectedIndex) {
      throw apiError_(ERROR_CODES.INVALID_SCHEMA, 'Cards sheet headers are out of order.');
    }

    sheet.insertColumnBefore(expectedIndex + 1);
    sheet.getRange(1, expectedIndex + 1).setValue(expectedHeader);
    currentHeaders.splice(expectedIndex, 0, expectedHeader);
  });
}

function isExactSchemaSheet_(sheet) {
  return isExactHeaderPrefix_(getHeaderValues_(sheet));
}

function isExactHeaderPrefix_(headerValues) {
  if (headerValues.length !== CARD_SCHEMA.length) return false;
  for (let i = 0; i < CARD_SCHEMA.length; i += 1) {
    if (headerValues[i] !== CARD_SCHEMA[i]) return false;
  }
  return true;
}

function isRepairableApprovedHeaderSubset_(headerValues) {
  const seen = {};
  let schemaIndex = 0;

  for (let i = 0; i < headerValues.length; i += 1) {
    const header = headerValues[i];
    if (!header) continue;
    if (seen[header]) return false;
    seen[header] = true;

    const foundIndex = CARD_SCHEMA.indexOf(header, schemaIndex);
    if (foundIndex === -1) return false;
    schemaIndex = foundIndex + 1;
  }

  return Object.keys(seen).length > 0;
}

function getHeaderValues_(sheet) {
  const lastColumn = sheet.getLastColumn();
  if (lastColumn === 0) return [];

  const values = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
  while (values.length && values[values.length - 1] === '') values.pop();
  return values.map(function (value) {
    return String(value).trim();
  });
}

function isWorkbookBlank_(visibleSheets) {
  if (visibleSheets.length === 0) return true;
  return visibleSheets.every(function (sheet) {
    return sheet.getLastRow() === 0 || (sheet.getLastRow() === 1 && getHeaderValues_(sheet).length === 0);
  });
}

function readCards_(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  const values = sheet.getRange(2, 1, lastRow - 1, CARD_SCHEMA.length).getValues();
  const cards = [];
  const cardNumbers = {};

  values.forEach(function (row) {
    if (row.every(function (cell) { return cell === ''; })) return;

    const card = {};
    CARD_SCHEMA.forEach(function (field, index) {
      card[field] = normalizeCellValue_(row[index]);
    });

    if (!card.cardNumber) {
      throw apiError_(ERROR_CODES.VALIDATION_ERROR, 'A populated card row is missing cardNumber.');
    }
    if (cardNumbers[card.cardNumber]) {
      throw apiError_(ERROR_CODES.VALIDATION_ERROR, 'Duplicate cardNumber values are not allowed.');
    }
    cardNumbers[card.cardNumber] = true;
    cards.push(card);
  });

  return cards;
}

function upsertCard_(sheet, card) {
  const normalized = normalizeCard_(card);
  const rowIndex = findCardRow_(sheet, normalized.cardNumber);
  const targetRow = rowIndex || sheet.getLastRow() + 1;
  const existing = rowIndex ? sheet.getRange(rowIndex, 1, 1, CARD_SCHEMA.length).getValues()[0] : CARD_SCHEMA.map(function () { return ''; });
  const nextRow = CARD_SCHEMA.map(function (field, index) {
    if (Object.prototype.hasOwnProperty.call(normalized, field)) {
      return normalized[field];
    }
    return existing[index];
  });

  sheet.getRange(targetRow, 1, 1, CARD_SCHEMA.length).setValues([nextRow]);
}

function replaceCards_(sheet, cards) {
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.getRange(2, 1, lastRow - 1, CARD_SCHEMA.length).clearContent();
  }

  if (cards.length > 0) {
    const values = cards.map(function (card) {
      const normalized = normalizeCard_(card);
      return CARD_SCHEMA.map(function (field) {
        return Object.prototype.hasOwnProperty.call(normalized, field) ? normalized[field] : '';
      });
    });
    sheet.getRange(2, 1, values.length, CARD_SCHEMA.length).setValues(values);
  }
}

function findCardRow_(sheet, cardNumber) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return null;

  const values = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  for (let i = 0; i < values.length; i += 1) {
    if (String(values[i][0]).trim() === String(cardNumber).trim()) {
      return i + 2;
    }
  }
  return null;
}

function validatePostEnvelope_(request) {
  if (!request || typeof request !== 'object') {
    throw apiError_(ERROR_CODES.VALIDATION_ERROR, 'POST body must be a JSON object.');
  }
  if (!request.lastKnownSheetVersion) {
    throw apiError_(ERROR_CODES.VALIDATION_ERROR, 'lastKnownSheetVersion is required for write actions.');
  }
  if (!request.payload || typeof request.payload !== 'object') {
    throw apiError_(ERROR_CODES.VALIDATION_ERROR, 'payload must be an object.');
  }
}

function validateCardForWrite_(card) {
  if (!card || typeof card !== 'object' || Array.isArray(card)) {
    throw apiError_(ERROR_CODES.VALIDATION_ERROR, 'Card payload must be an object.');
  }
  if (!String(card.cardNumber || '').trim()) {
    throw apiError_(ERROR_CODES.VALIDATION_ERROR, 'cardNumber is required.');
  }

  Object.keys(card).forEach(function (field) {
    if (CARD_SCHEMA.indexOf(field) === -1) {
      throw apiError_(ERROR_CODES.VALIDATION_ERROR, 'Card payload contains an unsupported field.');
    }
  });

  if (Object.prototype.hasOwnProperty.call(card, 'currentBalance')) {
    validateBalance_(card.currentBalance, 'currentBalance');
  }
  if (Object.prototype.hasOwnProperty.call(card, 'startingBalance')) {
    validateBalance_(card.startingBalance, 'startingBalance');
  }
  if (Object.prototype.hasOwnProperty.call(card, 'used')) {
    validateUsed_(card.used);
  }
}

function validateBalance_(value, field) {
  if (value === '' || value === null || typeof value === 'undefined') return;
  const numberValue = Number(value);
  if (!isFinite(numberValue) || numberValue < 0) {
    throw apiError_(ERROR_CODES.VALIDATION_ERROR, field + ' must be a non-negative number.');
  }
}

function validateUsed_(value) {
  if (value === '' || value === null || typeof value === 'undefined') return;
  if (value === true || value === false) return;
  const normalized = String(value).toLowerCase();
  if (normalized !== 'true' && normalized !== 'false') {
    throw apiError_(ERROR_CODES.VALIDATION_ERROR, 'used must be true or false.');
  }
}

function normalizeCard_(card) {
  const normalized = {};
  CARD_SCHEMA.forEach(function (field) {
    if (Object.prototype.hasOwnProperty.call(card, field)) {
      normalized[field] = normalizeCellValue_(card[field]);
    }
  });
  normalized.cardNumber = String(normalized.cardNumber || '').trim();
  return normalized;
}

function normalizeCellValue_(value) {
  if (value instanceof Date) return value.toISOString();
  if (value === null || typeof value === 'undefined') return '';
  return value;
}

function assertUniqueCardNumbers_(cards) {
  const seen = {};
  cards.forEach(function (card) {
    const cardNumber = String((card && card.cardNumber) || '').trim();
    if (!cardNumber) return;
    if (seen[cardNumber]) {
      throw apiError_(ERROR_CODES.VALIDATION_ERROR, 'Duplicate cardNumber values are not allowed.');
    }
    seen[cardNumber] = true;
  });
}

function assertFreshSheetVersion_(metaSheet, lastKnownSheetVersion) {
  const currentVersion = getSheetVersion_(metaSheet);
  if (String(lastKnownSheetVersion) !== String(currentVersion)) {
    throw apiError_(ERROR_CODES.SYNC_CONFLICT, 'The Sheet changed after the client loaded it.', {
      sheetVersion: currentVersion
    });
  }
}

function readMeta_(metaSheet) {
  const meta = {};
  const lastRow = metaSheet.getLastRow();
  if (lastRow === 0) return meta;

  const values = metaSheet.getRange(1, 1, lastRow, 2).getValues();
  values.forEach(function (row) {
    const key = String(row[0] || '').trim();
    if (key) meta[key] = normalizeCellValue_(row[1]);
  });
  return meta;
}

function getSheetVersion_(metaSheet) {
  return readMeta_(metaSheet).lastSheetWriteAt || '';
}

function touchSheetVersion_(metaSheet, source) {
  const now = newIsoTimestamp_();
  setMetaValue_(metaSheet, 'lastSheetWriteAt', now);
  setMetaValue_(metaSheet, 'lastWriteSource', source || WRITE_SOURCE);
  setMetaValue_(metaSheet, 'schemaVersion', SCHEMA_VERSION);
  SpreadsheetApp.flush();
  return now;
}

function setMetaValue_(metaSheet, key, value) {
  const row = findMetaRow_(metaSheet, key);
  const targetRow = row || metaSheet.getLastRow() + 1;
  metaSheet.getRange(targetRow, 1, 1, 2).setValues([[key, value]]);
}

function findMetaRow_(metaSheet, key) {
  const lastRow = metaSheet.getLastRow();
  if (lastRow === 0) return null;

  const values = metaSheet.getRange(1, 1, lastRow, 1).getValues();
  for (let i = 0; i < values.length; i += 1) {
    if (String(values[i][0]).trim() === key) return i + 1;
  }
  return null;
}

function parsePostBody_(e) {
  if (!e || !e.postData || !e.postData.contents) {
    throw apiError_(ERROR_CODES.VALIDATION_ERROR, 'POST body is required.');
  }

  try {
    return JSON.parse(e.postData.contents);
  } catch (err) {
    throw apiError_(ERROR_CODES.VALIDATION_ERROR, 'POST body must be valid JSON.');
  }
}

function getAction_(e) {
  return e && e.parameter && e.parameter.action ? String(e.parameter.action) : '';
}

function withDocumentLock_(callback) {
  const lock = LockService.getDocumentLock();
  if (!lock.tryLock(30000)) {
    throw apiError_(ERROR_CODES.INTERNAL_ERROR, 'Could not acquire the Sheet lock.');
  }

  try {
    return callback();
  } finally {
    lock.releaseLock();
  }
}

function successEnvelope_(data, sheetVersion) {
  return {
    ok: true,
    data: data || {},
    meta: {
      sheetVersion: sheetVersion || ''
    },
    error: null
  };
}

function errorEnvelope_(code, message, details) {
  return {
    ok: false,
    data: {},
    meta: {
      sheetVersion: details && details.sheetVersion ? details.sheetVersion : ''
    },
    error: {
      code: code,
      message: message || 'Request failed.'
    }
  };
}

function exceptionEnvelope_(err) {
  const code = err && err.code && isApprovedErrorCode_(err.code) ? err.code : mapExceptionCode_(err);
  const message = err && err.publicMessage ? err.publicMessage : 'Request failed.';
  const details = err && err.details ? err.details : null;
  return errorEnvelope_(code, message, details);
}

function apiError_(code, message, details) {
  const err = new Error(message || code);
  err.code = isApprovedErrorCode_(code) ? code : ERROR_CODES.INTERNAL_ERROR;
  err.publicMessage = message || 'Request failed.';
  err.details = details || null;
  return err;
}

function isApprovedErrorCode_(code) {
  return Object.keys(ERROR_CODES).some(function (key) {
    return ERROR_CODES[key] === code;
  });
}

function mapExceptionCode_(err) {
  const message = err && err.message ? String(err.message).toLowerCase() : '';
  if (message.indexOf('authorization') !== -1 || message.indexOf('permission') !== -1 || message.indexOf('access') !== -1) {
    return ERROR_CODES.NOT_AUTHORIZED;
  }
  return ERROR_CODES.INTERNAL_ERROR;
}

function jsonResponse_(body) {
  return ContentService
    .createTextOutput(JSON.stringify(body))
    .setMimeType(ContentService.MimeType.JSON);
}

function newIsoTimestamp_() {
  return new Date().toISOString();
}
