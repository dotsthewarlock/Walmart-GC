// Debug file fingerprint: app.js version 1.01.03 (cache/debug only, not a product release).
// These manually maintained values identify loaded static files for cache debugging; they are not product or release versions.
const DEBUG_VERSION_JS = "1.01.03";
const DEBUG_VERSION_CSS = "1.01.03";

function renderDebugVersionFingerprint() {
  const fingerprint = document.querySelector("#debug-version-fingerprint");

  if (!fingerprint) {
    return;
  }

  const htmlVersion = fingerprint.dataset.htmlVersion || "unknown";
  fingerprint.textContent = `HTML ${htmlVersion} · JS ${DEBUG_VERSION_JS} · CSS ${DEBUG_VERSION_CSS}`;
}

renderDebugVersionFingerprint();

const bundledSampleGiftCards = [
  {
    cardNumber: "6045782190348765",
    pin: "4821",
    merchant: "walmart-ca",
    startingBalance: 50,
    currentBalance: 50,
    dateAdded: "2026-06-01",
    dateUpdated: "2026-06-09",
    dateUsed: "",
    used: false,
    notes: "Sample card ready for checkout testing.",
  },
  {
    cardNumber: "6045789317522388",
    pin: "9064",
    merchant: "walmart-ca",
    startingBalance: 100,
    currentBalance: 37.42,
    dateAdded: "2026-05-28",
    dateUpdated: "2026-06-08",
    dateUsed: "",
    used: false,
    notes: "Partially used sample card with a remaining balance.",
  },
  {
    cardNumber: "6045780642197715",
    pin: "1138",
    merchant: "walmart-ca",
    startingBalance: 25,
    currentBalance: 0,
    dateAdded: "2026-05-20",
    dateUpdated: "2026-06-07",
    dateUsed: "2026-06-07",
    used: true,
    notes: "Zero-balance sample card retained for used flag visibility.",
  },
  {
    cardNumber: "6045787063154490",
    pin: "7205",
    merchant: "walmart-ca",
    startingBalance: 75,
    currentBalance: 18.25,
    dateAdded: "2026-06-05",
    dateUpdated: "2026-06-10",
    dateUsed: "2026-06-10",
    used: true,
    notes: "Used flag is independent of balance so this card keeps its remaining value.",
  },
  {
    cardNumber: "6045784926808824",
    pin: "3349",
    merchant: "walmart-ca",
    startingBalance: 10,
    currentBalance: 0,
    dateAdded: "2026-06-03",
    dateUpdated: "2026-06-06",
    dateUsed: "",
    used: false,
    notes: "Zero-balance sample card that is not marked used yet.",
  },
];

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

const navButtons = document.querySelectorAll(".nav-button");
const panelSections = document.querySelectorAll("[data-panel-name]");
const cardList = document.querySelector("#card-list");
const cardCount = document.querySelector("#card-count");
const cardTotalBalance = document.querySelector("#card-total-balance");
const advanceOnUsedCheckbox = document.querySelector("#advance-on-used");
const hideUsedCheckbox = document.querySelector("#hide-used");
const hideZeroBalanceCheckbox = document.querySelector("#hide-zero-balance");
const sortCardsSelect = document.querySelector("#sort-cards");
const markZeroUsedButton = document.querySelector("#mark-zero-used");
const detailStatus = document.querySelector("#detail-status");
const detailNumber = document.querySelector("#detail-number");
const detailPin = document.querySelector("#detail-pin");
const detailStartingBalance = document.querySelector("#detail-starting-balance");
const detailCurrentBalance = document.querySelector("#detail-current-balance");
const detailDateAdded = document.querySelector("#detail-date-added");
const detailCurrentDateLabel = document.querySelector("#detail-current-date-label");
const detailCurrentDate = document.querySelector("#detail-current-date");
const currentBalanceCard = document.querySelector("#current-balance-card");
const detailNotes = document.querySelector("#detail-notes");
const previousButton = document.querySelector("#prev-card");
const nextButton = document.querySelector("#next-card");
const cardPosition = document.querySelector("#card-position");
const markUsedButton = document.querySelector("#mark-used");
const openBalanceModalButton = document.querySelector("#open-balance-modal");
const balanceModal = document.querySelector("#balance-modal");
const balanceModalContext = document.querySelector("#balance-modal-context");
const amountUsedInput = document.querySelector("#amount-used-input");
const remainingBalanceInput = document.querySelector("#remaining-balance-input");
const balanceModalError = document.querySelector("#balance-modal-error");
const cancelBalanceUpdateButton = document.querySelector("#cancel-balance-update");
const saveBalanceUpdateButton = document.querySelector("#save-balance-update");
const confirmModal = document.querySelector("#confirm-modal");
const confirmModalMessage = document.querySelector("#confirm-modal-message");
const cancelConfirmButton = document.querySelector("#cancel-confirm");
const confirmZeroUsedButton = document.querySelector("#confirm-zero-used");
const barcodeOpenButton = document.querySelector("#barcode-open");
const fullscreenBarcode = document.querySelector("#fullscreen-barcode");
const barcodeCloseButton = document.querySelector("#barcode-close");
const fullscreenCardNumber = document.querySelector("#fullscreen-card-number");
const fullscreenPin = document.querySelector("#fullscreen-pin");
const fullscreenCurrentBalance = document.querySelector("#fullscreen-current-balance");
const detailBarcodeStatus = document.querySelector("#detail-barcode-status");
const detailBarcodeRender = document.querySelector("#detail-barcode-render");
const detailBarcodeCaption = document.querySelector("#detail-barcode-caption");
const fullscreenBarcodeStatus = document.querySelector("#fullscreen-barcode-status");
const fullscreenBarcodeRender = document.querySelector("#fullscreen-barcode-render");
const fullscreenBarcodeCaption = document.querySelector("#fullscreen-barcode-caption");
const fullscreenPosition = document.querySelector("#fullscreen-position");
const fullscreenPreviousButton = document.querySelector("#fullscreen-prev");
const fullscreenNextButton = document.querySelector("#fullscreen-next");
const fullscreenMarkUsedButton = document.querySelector("#fullscreen-mark-used");
const fullscreenUpdateBalanceButton = document.querySelector("#fullscreen-update-balance");
const cardDetail = document.querySelector("#card-detail");
const rawDataInput = document.querySelector("#raw-data-input");
const toggleDataLockButton = document.querySelector("#toggle-data-lock");
const refreshCardDataButton = document.querySelector("#refresh-card-data");
const updateCardDataButton = document.querySelector("#update-card-data");
const importCsvButton = document.querySelector("#import-csv");
const exportCsvButton = document.querySelector("#export-csv");
const csvFileInput = document.querySelector("#csv-file-input");
const dataValidationWarnings = document.querySelector("#data-validation-warnings");
const dataCountSummary = document.querySelector("#data-count-summary");
const appsScriptUrlInput = document.querySelector("#apps-script-url");
const saveConnectionButton = document.querySelector("#save-connection");
const testConnectionButton = document.querySelector("#test-connection");
const loadSheetsButton = document.querySelector("#load-sheets");
const connectionStatusArea = document.querySelector("#connection-status");
const syncRecoveryActions = document.querySelector("#sync-recovery-actions");

let selectedCardIndex = -1;
let advanceOnMarkUsed = true;
let hideUsedCards = true;
let hideZeroBalanceCards = false;
let sortMode = "balance-asc";
let amountUsedEditedLast = false;
let touchStartX = 0;
let touchStartY = 0;
let rawDataLocked = true;
let detailNumberRevealed = false;
let wakeLock = null;
let balanceOpenedFromCheckout = false;

const dataPanelRowLimit = 100;
const csvHeaders = [
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
];
const legacyCsvHeaders = [
  "cardNumber",
  "pin",
  "startingBalance",
  "currentBalance",
  "dateAdded",
  "dateUpdated",
  "dateUsed",
  "used",
];
const prototypeDefaultMerchant = "walmart-ca";
const walmartCaBarcodePrefix = "79936686504000";
const code128Patterns = [
  "212222", "222122", "222221", "121223", "121322", "131222", "122213", "122312", "132212", "221213",
  "221312", "231212", "112232", "122132", "122231", "113222", "123122", "123221", "223211", "221132",
  "221231", "213212", "223112", "312131", "311222", "321122", "321221", "312212", "322112", "322211",
  "212123", "212321", "232121", "111323", "131123", "131321", "112313", "132113", "132311", "211313",
  "231113", "231311", "112133", "112331", "132131", "113123", "113321", "133121", "313121", "211331",
  "231131", "213113", "213311", "213131", "311123", "311321", "331121", "312113", "312311", "332111",
  "314111", "221411", "431111", "111224", "111422", "121124", "121421", "141122", "141221", "112214",
  "112412", "122114", "122411", "142112", "142211", "241211", "221114", "413111", "241112", "134111",
  "111242", "121142", "121241", "114212", "124112", "124211", "411212", "421112", "421211", "212141",
  "214121", "412121", "111143", "111341", "131141", "114113", "114311", "411113", "411311", "113141",
  "114131", "311141", "411131", "211412", "211214", "211232", "2331112",
];

const storageKeys = {
  cards: "walmartGc.cards",
  settings: "walmartGc.settings",
  connection: "walmartGc.connection",
  sync: "walmartGc.sync",
};

const defaultSettings = {
  advanceOnMarkUsed: true,
  hideUsedCards: true,
  hideZeroBalanceCards: false,
  sortMode: "balance-asc",
};

const connectionStatuses = {
  notConnected: "Not Connected",
  checking: "Checking",
  loading: "Loading",
  connected: "Connected",
  error: "Connection Error",
};

const defaultConnectionState = {
  appsScriptUrl: "",
  connectionStatus: connectionStatuses.notConnected,
  lastHealthCheckAt: "",
  healthStatus: "Not checked",
  spreadsheetName: "",
  sheetName: "",
  schemaVersion: "",
  lastHealthSheetVersion: "",
  message: "Enter and save an Apps Script URL, then test the connection.",
  lastErrorMessage: "",
};

const syncStatuses = {
  connected: "connected",
  unsynced: "unsynced",
  conflict: "conflict",
};

const defaultSyncState = {
  status: syncStatuses.unsynced,
  lastSyncTimestamp: "",
  lastSyncAttemptTimestamp: "",
  lastKnownSheetVersion: "",
  message: "Load from Sheets to enable completed-action sync writes.",
  lastErrorMessage: "",
  pendingOperation: null,
};

let sampleGiftCards = cloneStateValue(bundledSampleGiftCards);
let connectionState = cloneStateValue(defaultConnectionState);
let syncState = cloneStateValue(defaultSyncState);

function formatBalance(balance) {
  return currencyFormatter.format(balance);
}

function formatDate(dateValue) {
  if (!dateValue) {
    return "—";
  }

  return dateFormatter.format(new Date(`${dateValue}T00:00:00Z`));
}

function normalizeCardNumber(cardNumber) {
  return String(cardNumber ?? "").replace(/\D/g, "");
}

function getBarcodeFallbackMessage(card) {
  if (!normalizeCardNumber(card?.cardNumber)) {
    return "Barcode unavailable";
  }

  const merchant = card?.merchant || prototypeDefaultMerchant;
  if (merchant !== prototypeDefaultMerchant) {
    return "Barcode unavailable for this merchant";
  }

  return "Barcode unavailable";
}

function getBarcodePayload(card) {
  const cardNumber = normalizeCardNumber(card?.cardNumber);
  const merchant = card?.merchant || prototypeDefaultMerchant;

  if (merchant !== prototypeDefaultMerchant || !cardNumber) {
    return "";
  }

  // Walmart Canada checkout barcodes are derived from scanned sample gift cards;
  // keep the static prefix frontend-only so the approved Sheet schema stays unchanged.
  return `${walmartCaBarcodePrefix}${cardNumber}`;
}

function getCode128CValues(payload) {
  if (!/^\d+$/.test(payload) || payload.length % 2 !== 0) {
    return [];
  }

  const values = [105];
  for (let index = 0; index < payload.length; index += 2) {
    values.push(Number(payload.slice(index, index + 2)));
  }

  const checksum = values.reduce((sum, value, index) => {
    return index === 0 ? value : sum + value * index;
  }, 0) % 103;

  values.push(checksum, 106);
  return values;
}

function createCode128BarcodeSvg(payload, options = {}) {
  const values = getCode128CValues(payload);

  if (!values.length) {
    return null;
  }

  const moduleWidth = options.moduleWidth || 2;
  const height = options.height || 88;
  const quietZone = options.quietZone || moduleWidth * 10;
  const svgNamespace = "http://www.w3.org/2000/svg";
  const totalModules = values
    .map((value) => code128Patterns[value])
    .reduce((sum, pattern) => sum + pattern.split("").reduce((width, digit) => width + Number(digit), 0), 0);
  const width = totalModules * moduleWidth + quietZone * 2;
  const svg = document.createElementNS(svgNamespace, "svg");

  svg.setAttribute("class", "barcode-svg");
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", "Code 128 checkout barcode");
  svg.setAttribute("preserveAspectRatio", "none");

  const background = document.createElementNS(svgNamespace, "rect");
  background.setAttribute("width", String(width));
  background.setAttribute("height", String(height));
  background.setAttribute("fill", "#ffffff");
  svg.appendChild(background);

  let cursor = quietZone;
  values.forEach((value) => {
    const pattern = code128Patterns[value];

    pattern.split("").forEach((digit, index) => {
      const barWidth = Number(digit) * moduleWidth;
      if (index % 2 === 0) {
        const bar = document.createElementNS(svgNamespace, "rect");
        bar.setAttribute("x", String(cursor));
        bar.setAttribute("y", "0");
        bar.setAttribute("width", String(barWidth));
        bar.setAttribute("height", String(height));
        bar.setAttribute("fill", "#000000");
        svg.appendChild(bar);
      }
      cursor += barWidth;
    });
  });

  return svg;
}

function renderBarcode(container, statusElement, captionElement, card, options = {}) {
  container.replaceChildren();

  const payload = getBarcodePayload(card);
  if (!payload) {
    statusElement.textContent = getBarcodeFallbackMessage(card);
    captionElement.textContent = "Card number and PIN remain available below.";
    container.hidden = true;
    return false;
  }

  try {
    const svg = createCode128BarcodeSvg(payload, options);
    if (!svg) {
      throw new Error("Barcode payload is not compatible with the local Code 128 renderer.");
    }

    container.appendChild(svg);
    container.hidden = false;
    statusElement.textContent = "Walmart Canada checkout barcode";
    captionElement.textContent = "Encodes the Walmart Canada checkout payload derived from this card number.";
    return true;
  } catch {
    statusElement.textContent = "Barcode unavailable";
    captionElement.textContent = "Card number and PIN remain available below.";
    container.hidden = true;
    return false;
  }
}

function clearRenderedBarcode(container, statusElement, captionElement) {
  container.replaceChildren();
  container.hidden = true;
  statusElement.textContent = "Barcode unavailable";
  captionElement.textContent = "Select a Walmart Canada card to render its checkout barcode.";
}

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

function normalizeMoney(value) {
  return Math.round(value * 100) / 100;
}

function cloneStateValue(value) {
  return JSON.parse(JSON.stringify(value));
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeBooleanField(value, fallback = false) {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    if (value === 1) {
      return true;
    }
    if (value === 0) {
      return false;
    }
  }

  if (typeof value === "string") {
    const normalizedValue = value.trim().toLowerCase();
    if (["true", "yes", "y", "1"].includes(normalizedValue)) {
      return true;
    }
    if (["false", "no", "n", "0", ""].includes(normalizedValue)) {
      return false;
    }
  }

  return fallback;
}

function normalizeDateField(value, fallback = "") {
  const rawValue = String(value ?? "").trim();
  if (!rawValue) {
    return fallback;
  }

  if (/^\d{4}-\d{2}-\d{2}/.test(rawValue)) {
    return rawValue.slice(0, 10);
  }

  const parsedDate = new Date(rawValue);
  if (!Number.isNaN(parsedDate.getTime())) {
    return parsedDate.toISOString().slice(0, 10);
  }

  return fallback;
}

function readStoredJson(key) {
  try {
    const value = localStorage.getItem(key);
    return value === null ? undefined : JSON.parse(value);
  } catch {
    return undefined;
  }
}

function writeStoredJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Keep the in-memory session usable if storage is unavailable or full.
  }
}

function removeStoredJson(key) {
  try {
    localStorage.removeItem(key);
  } catch {
    // Ignore storage access failures so reset helpers never break startup.
  }
}

function normalizeStoredCard(card) {
  if (!isPlainObject(card)) {
    return null;
  }

  const cardNumber = String(card.cardNumber ?? "").trim();
  const pin = String(card.pin ?? "").trim();
  const startingBalance = Number(card.startingBalance);
  const currentBalance = Number(card.currentBalance);

  if (!cardNumber || !pin || !Number.isFinite(startingBalance) || !Number.isFinite(currentBalance)) {
    return null;
  }

  const dateAdded = normalizeDateField(card.dateAdded, todayString());

  return {
    cardNumber,
    pin,
    merchant: String(card.merchant || prototypeDefaultMerchant),
    startingBalance: normalizeMoney(startingBalance),
    currentBalance: normalizeMoney(currentBalance),
    dateAdded,
    dateUpdated: normalizeDateField(card.dateUpdated, dateAdded),
    dateUsed: normalizeDateField(card.dateUsed, ""),
    used: normalizeBooleanField(card.used),
    notes: String(card.notes ?? ""),
  };
}

function normalizeStoredCards(cards) {
  if (!Array.isArray(cards)) {
    return null;
  }

  const normalizedCards = cards.map(normalizeStoredCard);
  return normalizedCards.includes(null) ? null : normalizedCards;
}

function normalizeStoredSettings(settings) {
  if (!isPlainObject(settings)) {
    return cloneStateValue(defaultSettings);
  }

  const allowedSortModes = [
    "balance-asc",
    "balance-desc",
    "date-added-asc",
    "date-added-desc",
    "date-updated-asc",
    "date-updated-desc",
    "card-number",
  ];

  return {
    advanceOnMarkUsed: typeof settings.advanceOnMarkUsed === "boolean"
      ? settings.advanceOnMarkUsed
      : defaultSettings.advanceOnMarkUsed,
    hideUsedCards: typeof settings.hideUsedCards === "boolean"
      ? settings.hideUsedCards
      : defaultSettings.hideUsedCards,
    hideZeroBalanceCards: typeof settings.hideZeroBalanceCards === "boolean"
      ? settings.hideZeroBalanceCards
      : defaultSettings.hideZeroBalanceCards,
    sortMode: allowedSortModes.includes(settings.sortMode)
      ? settings.sortMode
      : defaultSettings.sortMode,
  };
}

function normalizeStoredConnection(connection) {
  if (!isPlainObject(connection)) {
    return cloneStateValue(defaultConnectionState);
  }

  const allowedStatuses = Object.values(connectionStatuses);
  const connectionStatus = allowedStatuses.includes(connection.connectionStatus)
    ? connection.connectionStatus
    : defaultConnectionState.connectionStatus;

  return {
    appsScriptUrl: String(connection.appsScriptUrl || ""),
    connectionStatus,
    lastHealthCheckAt: String(connection.lastHealthCheckAt || ""),
    healthStatus: String(connection.healthStatus || defaultConnectionState.healthStatus),
    spreadsheetName: String(connection.spreadsheetName || ""),
    sheetName: String(connection.sheetName || ""),
    schemaVersion: String(connection.schemaVersion || ""),
    lastHealthSheetVersion: String(connection.lastHealthSheetVersion || ""),
    message: String(connection.message || defaultConnectionState.message),
    lastErrorMessage: String(connection.lastErrorMessage || ""),
  };
}

function normalizePendingSyncOperation(operation) {
  if (!isPlainObject(operation)) {
    return null;
  }

  const action = operation.action === "updateCard" ? "updateCard" : "batchUpdate";
  if (!isPlainObject(operation.payload)) {
    return null;
  }

  if (action === "updateCard") {
    const card = normalizeStoredCard(operation.payload.card);
    if (!card) {
      return null;
    }

    return {
      action,
      payload: { card },
      successMessage: String(operation.successMessage || "Sync succeeded."),
      description: String(operation.description || "card update"),
    };
  }

  if (!Array.isArray(operation.payload.cards)) {
    return null;
  }

  const cards = normalizeStoredCards(operation.payload.cards);
  if (!cards) {
    return null;
  }

  return {
    action,
    payload: { cards },
    successMessage: String(operation.successMessage || "Sync succeeded."),
    description: String(operation.description || "local card data"),
  };
}

function normalizeStoredSync(sync) {
  if (!isPlainObject(sync)) {
    return cloneStateValue(defaultSyncState);
  }

  const allowedStatuses = Object.values(syncStatuses);
  const status = allowedStatuses.includes(sync.status)
    ? sync.status
    : defaultSyncState.status;

  return {
    status,
    lastSyncTimestamp: String(sync.lastSyncTimestamp || ""),
    lastSyncAttemptTimestamp: String(sync.lastSyncAttemptTimestamp || ""),
    lastKnownSheetVersion: String(sync.lastKnownSheetVersion || ""),
    message: String(sync.message || defaultSyncState.message),
    lastErrorMessage: String(sync.lastErrorMessage || ""),
    pendingOperation: normalizePendingSyncOperation(sync.pendingOperation),
  };
}

function getCurrentSettings() {
  return {
    advanceOnMarkUsed,
    hideUsedCards,
    hideZeroBalanceCards,
    sortMode,
  };
}

function applySettings(settings) {
  advanceOnMarkUsed = settings.advanceOnMarkUsed;
  hideUsedCards = settings.hideUsedCards;
  hideZeroBalanceCards = settings.hideZeroBalanceCards;
  sortMode = settings.sortMode;
}

function loadAppState() {
  const storedCards = normalizeStoredCards(readStoredJson(storageKeys.cards));
  const storedSettings = normalizeStoredSettings(readStoredJson(storageKeys.settings));
  const storedConnection = normalizeStoredConnection(readStoredJson(storageKeys.connection));
  const storedSync = normalizeStoredSync(readStoredJson(storageKeys.sync));

  return {
    cards: storedCards ?? cloneStateValue(bundledSampleGiftCards),
    settings: storedSettings,
    connection: storedConnection,
    sync: storedSync,
  };
}

function saveAppState() {
  writeStoredJson(storageKeys.cards, sampleGiftCards);
  writeStoredJson(storageKeys.settings, getCurrentSettings());
  writeStoredJson(storageKeys.connection, connectionState);
  writeStoredJson(storageKeys.sync, syncState);
}

function clearAppState() {
  Object.values(storageKeys).forEach(removeStoredJson);
}

function applyAppState(appState) {
  sampleGiftCards = appState.cards;
  applySettings(appState.settings);
  connectionState = appState.connection;
  syncState = appState.sync;
}

function escapeHtml(value) {
  // Regression guard: escaped diagnostics like "Spreadsheet" and "Connected" must stay visible text.
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeCsvValue(value) {
  const text = String(value ?? "");

  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

function cardToCsvRow(card) {
  return csvHeaders
    .map((field) => escapeCsvValue(field === "used" ? String(Boolean(card[field])) : card[field]))
    .join(",");
}

function cardsToCsv(cards, limit = cards.length) {
  return [csvHeaders.join(","), ...cards.slice(0, limit).map(cardToCsvRow)].join("\n");
}

function groupCardNumber(cardNumber) {
  return String(cardNumber ?? "").replace(/\D/g, "").replace(/(.{4})/g, "$1 ").trim();
}

function maskCardNumber(cardNumber) {
  const digits = String(cardNumber ?? "").replace(/\D/g, "");
  if (!digits) {
    return "—";
  }

  const lastFour = digits.slice(-4);
  const maskedDigits = `${"•".repeat(Math.max(digits.length - 4, 0))}${lastFour}`;
  return maskedDigits.replace(/(.{4})/g, "$1 ").trim();
}

function getDataRowCount(rawCsv) {
  return normalizeCsvRows(rawCsv).length;
}

function updateDataCountSummary(displayedCount = 0) {
  dataCountSummary.textContent = `Total cards: ${sampleGiftCards.length} · Displayed: ${displayedCount}`;
}

function parseCsvLine(line) {
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

function parseBooleanValue(value) {
  const normalizedValue = value.trim().toLowerCase();

  if (["true", "yes", "y", "1"].includes(normalizedValue)) {
    return true;
  }

  if (["false", "no", "n", "0"].includes(normalizedValue)) {
    return false;
  }

  return null;
}

function readCsvMoney(value) {
  if (value.trim() === "") {
    return null;
  }

  const parsedValue = Number.parseFloat(value.replace(/^\$/, ""));
  return Number.isFinite(parsedValue) ? normalizeMoney(parsedValue) : NaN;
}

function setRawDataLocked(isLocked) {
  rawDataLocked = isLocked;
  rawDataInput.readOnly = rawDataLocked;
  toggleDataLockButton.textContent = rawDataLocked ? "Unlock Editing" : "Lock Editing";
}

function renderValidationWarnings(warnings, summary = "No validation run yet.") {
  dataValidationWarnings.innerHTML = "";

  const summaryElement = document.createElement("p");
  summaryElement.textContent = summary;
  dataValidationWarnings.append(summaryElement);

  if (warnings.length === 0) {
    return;
  }

  const warningList = document.createElement("ul");
  warnings.forEach((warning) => {
    const item = document.createElement("li");
    item.textContent = warning;
    warningList.append(item);
  });
  dataValidationWarnings.append(warningList);
}

function normalizeCsvRows(rawCsv) {
  const rows = rawCsv
    .split(/\r?\n/)
    .map((line, index) => ({ line: line.trim(), lineNumber: index + 1 }))
    .filter(({ line }) => line);

  if (rows.length === 0) {
    return [];
  }

  const firstRow = parseCsvLine(rows[0].line);
  const normalizedHeader = firstRow?.map((value) => value.toLowerCase()).join(",");
  const hasApprovedHeader = normalizedHeader === csvHeaders.join(",").toLowerCase();
  const hasLegacyPrototypeHeader = normalizedHeader === legacyCsvHeaders.join(",").toLowerCase();
  return hasApprovedHeader || hasLegacyPrototypeHeader ? rows.slice(1) : rows;
}

function parseRawCardData(rawCsv) {
  const warnings = [];
  const parsedCards = [];
  const seenCardNumbers = new Set();
  const rows = normalizeCsvRows(rawCsv);
  const fallbackToday = todayString();

  rows.forEach(({ line, lineNumber }) => {
    const displayRow = lineNumber;
    const values = parseCsvLine(line);

    if (!values || ![csvHeaders.length, legacyCsvHeaders.length].includes(values.length)) {
      warnings.push(`Row ${displayRow}: malformed row; expected ${csvHeaders.length} CSV fields.`);
      return;
    }

    const isLegacyPrototypeRow = values.length === legacyCsvHeaders.length;
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
    ] = isLegacyPrototypeRow
      ? [values[0], values[1], "", ...values.slice(2), ""]
      : values;
    let hasError = false;

    if (!cardNumber) {
      warnings.push(`Row ${displayRow}: missing card number.`);
      hasError = true;
    } else if (!/^\d+$/.test(cardNumber)) {
      warnings.push(`Row ${displayRow}: card number must contain contiguous digits only.`);
      hasError = true;
    } else if (seenCardNumbers.has(cardNumber)) {
      warnings.push(`Row ${displayRow}: duplicate card number ${cardNumber}.`);
      hasError = true;
    }

    if (!pin) {
      warnings.push(`Row ${displayRow}: missing PIN.`);
      hasError = true;
    }

    const merchant = merchantRaw || prototypeDefaultMerchant;
    if (!merchantRaw) {
      warnings.push(`Row ${displayRow}: missing merchant; defaulted to ${prototypeDefaultMerchant} for prototype import.`);
    }

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
      pin,
      merchant,
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

function refreshRawCardData(summaryText) {
  const displayedCount = Math.min(sampleGiftCards.length, dataPanelRowLimit);
  rawDataInput.value = cardsToCsv(sampleGiftCards, dataPanelRowLimit);
  updateDataCountSummary(displayedCount);

  const warnings = sampleGiftCards.length > dataPanelRowLimit
    ? [`Displaying first ${dataPanelRowLimit} cards only. Export CSV includes all ${sampleGiftCards.length} cards.`]
    : [];
  renderValidationWarnings(
    warnings,
    summaryText ?? `Refreshed ${displayedCount} of ${sampleGiftCards.length} cards into the textarea.`,
  );
}

async function updateRawCardData() {
  const suppliedRows = getDataRowCount(rawDataInput.value);

  if (suppliedRows > dataPanelRowLimit) {
    renderValidationWarnings(
      ["Data panel update is limited to 100 card rows. Use CSV export/import for larger datasets."],
      `Update rejected: ${suppliedRows} rows supplied; maximum is ${dataPanelRowLimit}.`,
    );
    updateDataCountSummary(Math.min(sampleGiftCards.length, dataPanelRowLimit));
    return;
  }

  const { parsedCards, warnings } = parseRawCardData(rawDataInput.value);

  sampleGiftCards.splice(0, sampleGiftCards.length, ...parsedCards);
  selectedCardIndex = parsedCards.length > 0 ? 0 : -1;
  saveAppState();
  detailNumberRevealed = false;
  renderApp(selectedCardIndex);
  updateDataCountSummary(Math.min(parsedCards.length, dataPanelRowLimit));

  const summary = warnings.length === 0
    ? `Imported ${parsedCards.length} card${parsedCards.length === 1 ? "" : "s"}.`
    : `Imported ${parsedCards.length} card${parsedCards.length === 1 ? "" : "s"}. ${warnings.length} warning${warnings.length === 1 ? "" : "s"}.`;
  renderValidationWarnings(warnings, summary);

  const importedCardsPayload = { cards: cloneStateValue(parsedCards) };
  const importedCardsNoun = `card${parsedCards.length === 1 ? "" : "s"}`;
  const importSuccessMessage = `Sync succeeded. Imported ${parsedCards.length} ${importedCardsNoun} ${parsedCards.length === 1 ? "was" : "were"} saved to Sheets.`;
  await postCompletedActionToSheets(
    "batchUpdate",
    importedCardsPayload,
    importSuccessMessage,
    {
      pendingOperation: {
        action: "batchUpdate",
        payload: importedCardsPayload,
        successMessage: importSuccessMessage,
        description: "accepted CSV import",
      },
      startMessage: "Imported data saved locally. Syncing imported cards to Sheets...",
      noAutoSyncMessage: syncState.lastKnownSheetVersion
        ? "Imported data saved locally, but it is not ready to sync right now. Retry Sync or download a CSV backup."
        : "Imported data saved locally. Load from Sheets before syncing so Walmart-GC can verify the current Sheet version.",
    },
  );
}

function importCsvFile(file) {
  if (!file) {
    return;
  }

  const reader = new FileReader();
  reader.addEventListener("load", () => {
    rawDataInput.value = String(reader.result ?? "");
    renderValidationWarnings([], "CSV imported into the raw data area. Press Update Data to validate and load it into this session.");
  });
  reader.addEventListener("error", () => {
    renderValidationWarnings(["Unable to read the selected CSV file."], "CSV import failed.");
  });
  reader.readAsText(file);
}

function exportCurrentCardsCsv(filename = "walmart-gift-cards-export.csv") {
  const csvContent = cardsToCsv(sampleGiftCards);
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const downloadLink = document.createElement("a");

  downloadLink.href = url;
  downloadLink.download = filename;
  document.body.append(downloadLink);
  downloadLink.click();
  downloadLink.remove();
  URL.revokeObjectURL(url);
}

function getConnectionInputUrl() {
  return appsScriptUrlInput.value.trim();
}

function parseAppsScriptUrl(rawUrl) {
  try {
    const parsedUrl = new URL(rawUrl);
    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      return null;
    }
    return parsedUrl;
  } catch {
    return null;
  }
}

function buildAppsScriptActionUrl(rawUrl, action) {
  const parsedUrl = parseAppsScriptUrl(rawUrl);
  if (!parsedUrl) {
    return null;
  }

  parsedUrl.searchParams.set("action", action);
  return parsedUrl.toString();
}

function buildHealthCheckUrl(rawUrl) {
  return buildAppsScriptActionUrl(rawUrl, "health");
}

function buildLoadCardsUrl(rawUrl) {
  return buildAppsScriptActionUrl(rawUrl, "load");
}

function buildUpdateCardUrl(rawUrl) {
  return buildAppsScriptActionUrl(rawUrl, "updateCard");
}

function buildBatchUpdateUrl(rawUrl) {
  return buildAppsScriptActionUrl(rawUrl, "batchUpdate");
}

function buildReplaceAllUrl(rawUrl) {
  return buildAppsScriptActionUrl(rawUrl, "replaceAll");
}

function getHealthData(responseBody) {
  if (!isPlainObject(responseBody)) {
    return null;
  }

  if (responseBody.ok !== true) {
    return null;
  }

  return isPlainObject(responseBody.data) ? responseBody.data : responseBody;
}

function getActionableErrorMessage(baseMessage, actionHint) {
  return actionHint ? `${baseMessage} ${actionHint}` : baseMessage;
}

function getEnvelopeErrorMessage(responseBody, fallbackMessage, actionHint = "") {
  if (!isPlainObject(responseBody)) {
    return fallbackMessage;
  }

  if (isPlainObject(responseBody.error)) {
    const code = String(responseBody.error.code || "").trim();
    const message = String(responseBody.error.message || "").trim();

    if (code && message) {
      return `${code}: ${message}`;
    }
    if (message) {
      return message;
    }
    if (code) {
      return `Apps Script returned ${code}.`;
    }
  }

  return getActionableErrorMessage(fallbackMessage, actionHint);
}

function getHealthErrorMessage(responseBody) {
  return getEnvelopeErrorMessage(
    responseBody,
    "Apps Script reported that the connection is not ready.",
    "Confirm the Web App URL ends in /exec, deployment access allows your Google account, and the bound Sheet has the approved Cards headers.",
  );
}

function getLoadErrorMessage(responseBody) {
  return getEnvelopeErrorMessage(
    responseBody,
    "Apps Script could not load cards from the Sheet.",
    "Run Test Connection again, then check the Cards sheet headers and duplicate card numbers.",
  );
}

function getWriteErrorMessage(responseBody) {
  return getEnvelopeErrorMessage(
    responseBody,
    "Apps Script could not save this change to Sheets.",
    "Your local data is still saved in this browser; use Retry Sync or download a CSV backup before recovery.",
  );
}

function getEnvelopeErrorCode(responseBody) {
  if (!isPlainObject(responseBody) || !isPlainObject(responseBody.error)) {
    return "";
  }

  return String(responseBody.error.code || "").trim();
}

function generateRequestId() {
  if (window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }

  return `wgc-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function buildWriteEnvelope(payload) {
  return {
    requestId: generateRequestId(),
    clientTimestamp: new Date().toISOString(),
    lastKnownSheetVersion: syncState.lastKnownSheetVersion,
    payload,
  };
}

function postAppsScriptJson(actionUrl, envelope) {
  return fetch(actionUrl, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "text/plain;charset=utf-8",
    },
    body: JSON.stringify(envelope),
  });
}

function setSyncState(nextState) {
  syncState = {
    ...syncState,
    ...nextState,
  };
  saveAppState();
  renderConnectionState();
}

function formatConnectionTimestamp(timestamp) {
  if (!timestamp) {
    return "Never";
  }

  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function valueOrFallback(value, fallback = "Not available") {
  const normalizedValue = String(value ?? "").trim();
  return normalizedValue || fallback;
}

function renderDiagnosticRow(label, value) {
  const diagnosticLabel = valueOrFallback(label);
  const diagnosticValue = valueOrFallback(value);

  return `
    <li class="diagnostic-row">
      <strong class="diagnostic-label">${escapeHtml(diagnosticLabel)}:</strong>
      <span class="diagnostic-value">${escapeHtml(diagnosticValue)}</span>
    </li>`;
}

function setConnectionState(nextState) {
  connectionState = {
    ...connectionState,
    ...nextState,
  };
  saveAppState();
  renderConnectionState();
}

function getSyncStatusLabel() {
  if (syncState.status === syncStatuses.connected) {
    return "Connected/Synced";
  }

  if (syncState.status === syncStatuses.conflict) {
    return "Conflict";
  }

  return "Unsynced";
}

function canAutoSyncToSheets() {
  return Boolean(
    connectionState.appsScriptUrl
      && syncState.lastKnownSheetVersion
      && syncState.status !== syncStatuses.conflict,
  );
}

function updateCardsFromWriteResponse(responseBody) {
  const returnedCard = responseBody?.data?.card;
  const normalizedCard = normalizeStoredCard(returnedCard);

  if (!normalizedCard) {
    return;
  }

  const existingIndex = sampleGiftCards.findIndex((card) => card.cardNumber === normalizedCard.cardNumber);
  if (existingIndex >= 0) {
    sampleGiftCards[existingIndex] = normalizedCard;
  } else {
    sampleGiftCards.push(normalizedCard);
  }
}

function handleSuccessfulWrite(responseBody, successMessage) {
  const sheetVersion = String(responseBody?.meta?.sheetVersion || "").trim();
  updateCardsFromWriteResponse(responseBody);

  syncState = {
    ...syncState,
    status: syncStatuses.connected,
    lastSyncTimestamp: new Date().toISOString(),
    lastSyncAttemptTimestamp: new Date().toISOString(),
    lastKnownSheetVersion: sheetVersion || syncState.lastKnownSheetVersion,
    message: successMessage,
    lastErrorMessage: "",
    pendingOperation: null,
  };
  connectionState = {
    ...connectionState,
    connectionStatus: connectionStatuses.connected,
    healthStatus: connectionState.healthStatus || "Not checked",
    message: successMessage,
    lastErrorMessage: "",
  };
  saveAppState();
  renderConnectionState();
  refreshRawCardData(successMessage);
  renderApp(selectedCardIndex);
}

function downloadSessionCsvBackup() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  exportCurrentCardsCsv(`walmart-gift-cards-session-backup-${timestamp}.csv`);
  renderValidationWarnings([], "Downloaded a CSV backup of the current local session.");
}

function handleFailedWrite(message, responseBody) {
  const isConflict = getEnvelopeErrorCode(responseBody) === "SYNC_CONFLICT";
  const nextStatus = isConflict ? syncStatuses.conflict : syncStatuses.unsynced;
  const friendlyMessage = isConflict
    ? "Sheets changed since your last load. Your local change is saved here, auto-sync is paused, and Sheets were not overwritten."
    : message;

  setSyncState({
    status: nextStatus,
    lastSyncAttemptTimestamp: new Date().toISOString(),
    message: friendlyMessage,
    lastErrorMessage: friendlyMessage,
  });
  connectionState = {
    ...connectionState,
    connectionStatus: isConflict ? connectionStatuses.error : connectionStatuses.connected,
    message: friendlyMessage,
    lastErrorMessage: friendlyMessage,
  };
  saveAppState();
  renderConnectionState();
}

async function postCompletedActionToSheets(action, payload, successMessage, options = {}) {
  const pendingOperation = normalizePendingSyncOperation(options.pendingOperation ?? {
    action,
    payload,
    successMessage,
    description: action === "batchUpdate" ? "local card updates" : "card update",
  });

  if (!canAutoSyncToSheets()) {
    setSyncState({
      status: syncState.status === syncStatuses.conflict ? syncStatuses.conflict : syncStatuses.unsynced,
      lastSyncAttemptTimestamp: new Date().toISOString(),
      message: options.noAutoSyncMessage || "Saved locally. Load from Sheets before syncing so Walmart-GC can verify the current Sheet version.",
      lastErrorMessage: options.noAutoSyncMessage || "Saved locally, but no safe Sheet version is available for syncing.",
      pendingOperation,
    });
    return;
  }

  const actionUrl = action === "batchUpdate"
    ? buildBatchUpdateUrl(connectionState.appsScriptUrl)
    : buildUpdateCardUrl(connectionState.appsScriptUrl);

  if (!actionUrl) {
    setSyncState({ pendingOperation });
    handleFailedWrite("Saved locally, but the Apps Script URL is not valid. Update the Data Panel connection before syncing.");
    return;
  }

  const envelope = buildWriteEnvelope(payload);
  setSyncState({
    lastSyncAttemptTimestamp: new Date().toISOString(),
    message: options.startMessage || "Syncing completed action to Sheets...",
    pendingOperation,
  });

  try {
    const response = await postAppsScriptJson(actionUrl, envelope);

    let responseBody;
    try {
      responseBody = await response.json();
    } catch {
      handleFailedWrite("Saved locally, but the Sheets save response was not valid JSON.");
      return;
    }

    if (!isPlainObject(responseBody)) {
      handleFailedWrite("Saved locally, but Apps Script returned an unexpected save response.");
      return;
    }

    if (!response.ok || responseBody.ok !== true) {
      handleFailedWrite(getWriteErrorMessage(responseBody), responseBody);
      return;
    }

    const sheetVersion = String(responseBody.meta?.sheetVersion || "").trim();
    if (!sheetVersion) {
      handleFailedWrite("Saved locally, but Apps Script did not return an updated Sheet version.", responseBody);
      return;
    }

    handleSuccessfulWrite(responseBody, successMessage);
  } catch {
    handleFailedWrite("Saved locally, but Sheets sync could not reach Apps Script. Your local data remains in this browser. Confirm the Apps Script deployment URL and try Retry Sync.");
  }
}

function getRecoveryUnavailableMessage() {
  if (!connectionState.appsScriptUrl || !parseAppsScriptUrl(connectionState.appsScriptUrl)) {
    return "Save a valid Apps Script URL before using Sheets recovery actions.";
  }

  return "";
}

function renderSyncRecoveryActions(isBusy) {
  if (!syncRecoveryActions) {
    return;
  }

  const unavailableMessage = getRecoveryUnavailableMessage();
  const disableSheetsActions = Boolean(isBusy || unavailableMessage);

  if (syncState.status === syncStatuses.conflict) {
    syncRecoveryActions.hidden = false;
    syncRecoveryActions.innerHTML = `
      <div class="recovery-panel is-conflict" aria-label="Conflict recovery actions">
        <div>
          <p class="recovery-status">Conflict recovery</p>
          <p>Sheets changed since your last successful load or sync. Your current session is still saved locally, and Walmart-GC will not merge or overwrite anything automatically.</p>
          <p class="recovery-warning"><strong>Warning:</strong> using the current session will replace every card row in Sheets. Download a CSV backup before any destructive recovery action.</p>
          ${unavailableMessage ? `<p class="recovery-warning">${escapeHtml(unavailableMessage)}</p>` : ""}
        </div>
        <div class="recovery-action-grid">
          <button class="secondary-button" type="button" data-sync-recovery="download-backup">Download Session CSV Backup</button>
          <button class="primary-button" type="button" data-sync-recovery="refresh-from-sheets" ${disableSheetsActions ? "disabled" : ""}>Refresh from Sheets and Replace Local Session</button>
          <button class="danger-button" type="button" data-sync-recovery="use-current-session" ${disableSheetsActions ? "disabled" : ""}>Use Current Session to Overwrite Sheets</button>
        </div>
      </div>
    `;
    return;
  }

  if (syncState.status === syncStatuses.unsynced) {
    syncRecoveryActions.hidden = false;
    syncRecoveryActions.innerHTML = `
      <div class="recovery-panel is-unsynced" aria-label="Unsynced recovery actions">
        <div>
          <p class="recovery-status">Unsynced recovery</p>
          <p>Local changes are saved in this browser, but they have not been confirmed in Sheets yet. You can keep using the app offline and choose when to retry or reload.</p>
          <p>Refresh from Sheets replaces this local session only after you press the button. Download a CSV backup first if you want a copy of the current session.</p>
          ${unavailableMessage ? `<p class="recovery-warning">${escapeHtml(unavailableMessage)}</p>` : ""}
        </div>
        <div class="recovery-action-grid">
          <button class="primary-button" type="button" data-sync-recovery="retry-sync" ${disableSheetsActions ? "disabled" : ""}>Retry Sync</button>
          <button class="secondary-button" type="button" data-sync-recovery="refresh-from-sheets" ${disableSheetsActions ? "disabled" : ""}>Refresh from Sheets</button>
          <button class="secondary-button" type="button" data-sync-recovery="download-backup">Download Session CSV Backup</button>
        </div>
      </div>
    `;
    return;
  }

  syncRecoveryActions.hidden = true;
  syncRecoveryActions.innerHTML = "";
}

function renderConnectionState() {
  appsScriptUrlInput.value = connectionState.appsScriptUrl;
  const isBusy = [connectionStatuses.checking, connectionStatuses.loading].includes(connectionState.connectionStatus);
  testConnectionButton.disabled = isBusy;
  loadSheetsButton.disabled = isBusy;
  saveConnectionButton.disabled = isBusy;
  renderSyncRecoveryActions(isBusy);

  const statusClass = connectionState.connectionStatus === connectionStatuses.connected
    ? "connected"
    : connectionState.connectionStatus === connectionStatuses.error
      ? "error"
      : isBusy
        ? "checking"
        : "not-connected";

  const details = [
    renderDiagnosticRow("Spreadsheet", valueOrFallback(connectionState.spreadsheetName)),
    renderDiagnosticRow("Sheet", valueOrFallback(connectionState.sheetName)),
    renderDiagnosticRow("Schema version", valueOrFallback(connectionState.schemaVersion)),
    renderDiagnosticRow("Health Sheet version", valueOrFallback(connectionState.lastHealthSheetVersion)),
    renderDiagnosticRow("Health status", valueOrFallback(connectionState.healthStatus, "Not checked")),
    renderDiagnosticRow("Last health check", formatConnectionTimestamp(connectionState.lastHealthCheckAt)),
    renderDiagnosticRow("Sync status", getSyncStatusLabel()),
    renderDiagnosticRow("Last sync attempt", formatConnectionTimestamp(syncState.lastSyncAttemptTimestamp)),
    renderDiagnosticRow("Last successful sync", formatConnectionTimestamp(syncState.lastSyncTimestamp)),
    renderDiagnosticRow("Last known Sheet version", valueOrFallback(syncState.lastKnownSheetVersion)),
    renderDiagnosticRow("Last error", valueOrFallback(connectionState.lastErrorMessage || syncState.lastErrorMessage)),
  ];

  const syncClass = `sync-${syncState.status}`;
  connectionStatusArea.className = `connection-status is-${statusClass} ${syncClass}`;
  connectionStatusArea.innerHTML = `
    <div class="connection-status-header">
      <span class="connection-status-dot" aria-hidden="true"></span>
      <strong>${escapeHtml(connectionState.connectionStatus)}</strong>
      <span class="sync-badge">${escapeHtml(getSyncStatusLabel())}</span>
    </div>
    <p>${escapeHtml(connectionState.message || defaultConnectionState.message)}</p>
    ${syncState.message ? `<p class="sync-message">${escapeHtml(syncState.message)}</p>` : ""}
    ${details.length ? `<ul class="diagnostic-list">${details.join("")}</ul>` : ""}
  `;
}

function saveConnectionFromInput() {
  const appsScriptUrl = getConnectionInputUrl();

  if (!appsScriptUrl) {
    setConnectionState(cloneStateValue(defaultConnectionState));
    return;
  }

  if (!parseAppsScriptUrl(appsScriptUrl)) {
    setConnectionState({
      appsScriptUrl,
      connectionStatus: connectionStatuses.error,
      lastHealthCheckAt: "",
      healthStatus: "Invalid URL",
      spreadsheetName: "",
      sheetName: "",
      schemaVersion: "",
      lastHealthSheetVersion: "",
      message: "Enter a valid http(s) Apps Script Web App URL.",
      lastErrorMessage: "Invalid Apps Script URL format.",
    });
    return;
  }

  const urlChanged = appsScriptUrl !== connectionState.appsScriptUrl;
  if (urlChanged) {
    syncState = cloneStateValue(defaultSyncState);
  }

  setConnectionState({
    appsScriptUrl,
    connectionStatus: urlChanged ? connectionStatuses.notConnected : connectionState.connectionStatus,
    lastHealthCheckAt: urlChanged ? "" : connectionState.lastHealthCheckAt,
    healthStatus: urlChanged ? "Not checked" : connectionState.healthStatus,
    spreadsheetName: urlChanged ? "" : connectionState.spreadsheetName,
    sheetName: urlChanged ? "" : connectionState.sheetName,
    schemaVersion: urlChanged ? "" : connectionState.schemaVersion,
    lastHealthSheetVersion: urlChanged ? "" : connectionState.lastHealthSheetVersion,
    message: urlChanged
      ? "Connection saved locally. Run a health check, then load cards from Sheets."
      : "Connection saved locally.",
    lastErrorMessage: "",
  });
}


function validateLoadCardsEnvelope(responseBody) {
  if (!isPlainObject(responseBody)) {
    return { error: "Apps Script returned an unexpected response." };
  }

  if (responseBody.ok !== true) {
    return { error: getLoadErrorMessage(responseBody) };
  }

  if (!isPlainObject(responseBody.data) || !Array.isArray(responseBody.data.cards)) {
    return { error: "Apps Script did not include a valid cards list." };
  }

  if (!isPlainObject(responseBody.meta)) {
    return { error: "Apps Script did not include Sheet version metadata." };
  }

  const sheetVersion = String(responseBody.meta.sheetVersion || "").trim();
  if (!sheetVersion) {
    return { error: "Apps Script did not include a Sheet version." };
  }

  const normalizedCards = normalizeStoredCards(responseBody.data.cards);
  if (!normalizedCards) {
    return { error: "Apps Script returned card data that this app could not read." };
  }

  return { cards: normalizedCards, sheetVersion };
}

async function retrySyncCurrentSession() {
  const batchUpdateUrl = buildBatchUpdateUrl(connectionState.appsScriptUrl);
  const pendingOperation = normalizePendingSyncOperation(syncState.pendingOperation);

  if (syncState.status === syncStatuses.conflict) {
    setSyncState({
      status: syncStatuses.conflict,
      lastSyncAttemptTimestamp: new Date().toISOString(),
      message: "Conflict detected. The Sheet changed since this session loaded. Download a CSV backup before recovery.",
      lastErrorMessage: "Conflict detected. Retry Sync will not overwrite Sheet changes automatically.",
    });
    return;
  }

  if (!connectionState.appsScriptUrl || !batchUpdateUrl) {
    const message = "Sync failed: save a valid Apps Script Web App URL before retrying sync.";
    setConnectionState({
      connectionStatus: connectionStatuses.error,
      message,
      lastErrorMessage: message,
    });
    setSyncState({
      status: syncStatuses.unsynced,
      lastSyncAttemptTimestamp: new Date().toISOString(),
      message,
      lastErrorMessage: message,
    });
    return;
  }

  if (!syncState.lastKnownSheetVersion) {
    const message = "Load from Sheets before syncing so Walmart-GC can verify the current Sheet version.";
    setSyncState({
      status: syncStatuses.unsynced,
      lastSyncAttemptTimestamp: new Date().toISOString(),
      message,
      lastErrorMessage: message,
    });
    return;
  }

  if (!pendingOperation && sampleGiftCards.length === 0) {
    const message = "No pending sync operation found. Make a change or import data before retrying.";
    setSyncState({
      status: syncStatuses.unsynced,
      lastSyncAttemptTimestamp: new Date().toISOString(),
      message,
      lastErrorMessage: "",
    });
    return;
  }

  const operation = pendingOperation || {
    action: "batchUpdate",
    payload: { cards: cloneStateValue(sampleGiftCards) },
    successMessage: `Sync succeeded. Current local cards were saved to Sheets.`,
    description: "current local cards",
  };

  await postCompletedActionToSheets(
    operation.action,
    cloneStateValue(operation.payload),
    operation.successMessage || "Sync succeeded.",
    {
      pendingOperation: operation,
      startMessage: `Retrying sync to Sheets${operation.description ? ` for ${operation.description}` : ""}...`,
      noAutoSyncMessage: "Load from Sheets before syncing so Walmart-GC can verify the current Sheet version.",
    },
  );
}

async function useCurrentSessionToOverwriteSheets() {
  const replaceAllUrl = buildReplaceAllUrl(connectionState.appsScriptUrl);

  if (!connectionState.appsScriptUrl || !replaceAllUrl) {
    setConnectionState({
      connectionStatus: connectionStatuses.error,
      message: "Save a valid Apps Script Web App URL before overwriting Sheets.",
    });
    return;
  }

  const backupRecommended = window.confirm(
    "Use Current Session will replace every card row in Sheets with this browser session. Download a CSV backup before continuing. Press OK only if you already downloaded a backup or intentionally choose to continue without one.",
  );
  if (!backupRecommended) {
    return;
  }

  const confirmed = window.confirm(
    "Final confirmation: overwrite Sheets with the current local session now? This is destructive and Walmart-GC will not automatically merge Sheet changes.",
  );
  if (!confirmed) {
    return;
  }

  setConnectionState({
    connectionStatus: connectionStatuses.loading,
    message: "Overwriting Sheets with the current session...",
  });

  const envelope = buildWriteEnvelope({
    confirmReplaceAll: true,
    cards: cloneStateValue(sampleGiftCards),
  });

  try {
    const response = await postAppsScriptJson(replaceAllUrl, envelope);

    let responseBody;
    try {
      responseBody = await response.json();
    } catch {
      handleFailedWrite("Sheets may not have been overwritten because the replaceAll response was not valid JSON.");
      return;
    }

    if (!isPlainObject(responseBody)) {
      handleFailedWrite("Sheets may not have been overwritten because Apps Script returned an unexpected replaceAll response.");
      return;
    }

    if (!response.ok || responseBody.ok !== true) {
      handleFailedWrite(getWriteErrorMessage(responseBody), responseBody);
      return;
    }

    const sheetVersion = String(responseBody.meta?.sheetVersion || "").trim();
    if (!sheetVersion) {
      handleFailedWrite("Sheets may have been overwritten, but Apps Script did not return an updated Sheet version.", responseBody);
      return;
    }

    handleSuccessfulWrite(
      responseBody,
      `Overwrote Sheets with ${sampleGiftCards.length} current-session card${sampleGiftCards.length === 1 ? "" : "s"}.`,
    );
  } catch {
    handleFailedWrite("Sheets were not overwritten because Walmart-GC could not reach Apps Script. Your current session remains saved locally in this browser. Confirm the Apps Script deployment URL and try Retry Sync or recovery again.");
  }
}

async function handleSyncRecoveryAction(action) {
  if (action === "download-backup") {
    downloadSessionCsvBackup();
    return;
  }

  if (action === "retry-sync") {
    await retrySyncCurrentSession();
    return;
  }

  if (action === "refresh-from-sheets") {
    await loadCardsFromSheets();
    return;
  }

  if (action === "use-current-session") {
    await useCurrentSessionToOverwriteSheets();
  }
}

async function loadCardsFromSheets() {
  const savedAppsScriptUrl = connectionState.appsScriptUrl;
  const loadUrl = buildLoadCardsUrl(savedAppsScriptUrl);

  if (!savedAppsScriptUrl || !loadUrl) {
    setConnectionState({
      connectionStatus: connectionStatuses.error,
      message: "Save a valid Apps Script Web App URL before loading cards from Sheets.",
      lastErrorMessage: "Missing or invalid Apps Script URL for Load from Sheets.",
    });
    return;
  }

  setConnectionState({
    connectionStatus: connectionStatuses.loading,
    message: "Loading cards from the Sheet...",
  });
  setSyncState({
    lastSyncAttemptTimestamp: new Date().toISOString(),
    message: "Loading cards from Sheets...",
  });

  try {
    const response = await fetch(loadUrl, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    let responseBody;
    try {
      responseBody = await response.json();
    } catch {
      setConnectionState({
        connectionStatus: connectionStatuses.error,
        message: "The Sheet load response was not valid JSON. Confirm this is the Apps Script Web App /exec URL and the latest deployment is active.",
        lastErrorMessage: "Sheet load response was not valid JSON.",
      });
      setSyncState({
        status: syncStatuses.unsynced,
        lastErrorMessage: "Sheet load response was not valid JSON.",
      });
      return;
    }

    const loadedEnvelope = validateLoadCardsEnvelope(responseBody);
    if (!response.ok || loadedEnvelope.error) {
      const loadError = loadedEnvelope.error || getLoadErrorMessage(responseBody);
      setConnectionState({
        connectionStatus: connectionStatuses.error,
        message: loadError,
        lastErrorMessage: loadError,
      });
      setSyncState({
        status: syncStatuses.unsynced,
        lastErrorMessage: loadError,
      });
      return;
    }

    sampleGiftCards.splice(0, sampleGiftCards.length, ...loadedEnvelope.cards);
    selectedCardIndex = loadedEnvelope.cards.length > 0 ? 0 : -1;
    detailNumberRevealed = false;
    syncState = {
      ...syncState,
      status: syncStatuses.connected,
      lastSyncTimestamp: new Date().toISOString(),
      lastSyncAttemptTimestamp: new Date().toISOString(),
      lastKnownSheetVersion: loadedEnvelope.sheetVersion,
      message: "Loaded from Sheets. Completed actions will now auto-sync.",
      lastErrorMessage: "",
    };
    connectionState = {
      ...connectionState,
      connectionStatus: connectionStatuses.connected,
      spreadsheetName: String(responseBody.data?.spreadsheetName || connectionState.spreadsheetName || ""),
      sheetName: String(responseBody.data?.sheetName || connectionState.sheetName || "Cards"),
      lastHealthSheetVersion: connectionState.lastHealthSheetVersion || loadedEnvelope.sheetVersion,
      message: `Loaded ${loadedEnvelope.cards.length} card${loadedEnvelope.cards.length === 1 ? "" : "s"} from Sheets.`,
      lastErrorMessage: "",
    };
    saveAppState();
    renderConnectionState();
    refreshRawCardData(`Loaded ${loadedEnvelope.cards.length} card${loadedEnvelope.cards.length === 1 ? "" : "s"} from Sheets into this session.`);
    renderApp(selectedCardIndex);
  } catch {
    const loadError = "Unable to reach the Apps Script URL while loading. Check that the URL ends in /exec, deployment access is correct, and your device is online.";
    setConnectionState({
      connectionStatus: connectionStatuses.error,
      message: loadError,
      lastErrorMessage: loadError,
    });
    setSyncState({
      status: syncStatuses.unsynced,
      lastErrorMessage: loadError,
    });
  }
}

async function testConnection() {
  const appsScriptUrl = getConnectionInputUrl();
  const healthUrl = buildHealthCheckUrl(appsScriptUrl);

  if (!appsScriptUrl || !healthUrl) {
    setConnectionState({
      appsScriptUrl,
      connectionStatus: connectionStatuses.error,
      lastHealthCheckAt: "",
      spreadsheetName: "",
      sheetName: "",
      schemaVersion: "",
      lastHealthSheetVersion: "",
      healthStatus: "Invalid URL",
      message: "Enter a valid http(s) Apps Script Web App URL before testing.",
      lastErrorMessage: "Invalid Apps Script URL format.",
    });
    return;
  }

  setConnectionState({
    appsScriptUrl,
    connectionStatus: connectionStatuses.checking,
    healthStatus: "Checking",
    message: "Checking the Apps Script health endpoint...",
  });

  try {
    const response = await fetch(healthUrl, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    let responseBody;
    try {
      responseBody = await response.json();
    } catch {
      setConnectionState({
        connectionStatus: connectionStatuses.error,
        lastHealthCheckAt: new Date().toISOString(),
        spreadsheetName: "",
        sheetName: "",
        schemaVersion: "",
        lastHealthSheetVersion: "",
        healthStatus: "Invalid response",
        message: "The health check response was not valid JSON. Confirm this is the Apps Script Web App /exec URL and that the deployment returns JSON for ?action=health.",
        lastErrorMessage: "Health check response was not valid JSON.",
      });
      return;
    }

    const healthData = getHealthData(responseBody);
    if (!response.ok || !healthData) {
      setConnectionState({
        connectionStatus: connectionStatuses.error,
        lastHealthCheckAt: new Date().toISOString(),
        spreadsheetName: "",
        sheetName: "",
        schemaVersion: "",
        lastHealthSheetVersion: "",
        healthStatus: "Failed",
        message: getHealthErrorMessage(responseBody),
        lastErrorMessage: getHealthErrorMessage(responseBody),
      });
      return;
    }

    setConnectionState({
      connectionStatus: connectionStatuses.connected,
      lastHealthCheckAt: new Date().toISOString(),
      spreadsheetName: String(healthData.spreadsheetName || "Not provided"),
      sheetName: String(healthData.sheetName || "Not provided"),
      schemaVersion: String(healthData.schemaVersion || "Not provided"),
      lastHealthSheetVersion: String(healthData.sheetVersion || ""),
      healthStatus: healthData.schemaValid === false ? "Schema problem reported" : "Healthy",
      message: healthData.schemaValid === false
        ? "Health check reached Apps Script, but the Sheet schema needs attention before loading cards."
        : "Health check succeeded. You can now load cards from Sheets.",
      lastErrorMessage: healthData.schemaValid === false ? "Apps Script reported a Sheet schema problem." : "",
    });
  } catch {
    setConnectionState({
      connectionStatus: connectionStatuses.error,
      lastHealthCheckAt: new Date().toISOString(),
      spreadsheetName: "",
      sheetName: "",
      schemaVersion: "",
      lastHealthSheetVersion: "",
      healthStatus: "Unreachable",
      message: "Unable to reach the Apps Script URL. Check that the URL ends in /exec, your deployment access is correct, and your device is online.",
      lastErrorMessage: "Apps Script URL unreachable during health check.",
    });
  }
}

function getSortValue(card, mode) {
  switch (mode) {
    case "balance-desc":
    case "balance-asc":
      return card.currentBalance;
    case "date-added-desc":
    case "date-added-asc":
      return Date.parse(`${card.dateAdded}T00:00:00Z`);
    case "date-updated-desc":
    case "date-updated-asc":
      return Date.parse(`${card.dateUpdated}T00:00:00Z`);
    case "card-number":
      return card.cardNumber;
    default:
      return card.currentBalance;
  }
}

function sortCards(a, b) {
  const aValue = getSortValue(a.card, sortMode);
  const bValue = getSortValue(b.card, sortMode);
  let result = 0;

  if (typeof aValue === "string") {
    result = aValue.localeCompare(bValue);
  } else {
    result = aValue - bValue;
  }

  if (sortMode.endsWith("desc")) {
    result *= -1;
  }

  return result || a.index - b.index;
}

function getVisibleCardIndexes() {
  return sampleGiftCards
    .map((card, index) => ({ card, index }))
    .filter(({ card }) => !hideUsedCards || !card.used)
    .filter(({ card }) => !hideZeroBalanceCards || card.currentBalance !== 0)
    .sort(sortCards)
    .map(({ index }) => index);
}

function getSelectedVisiblePosition() {
  return getVisibleCardIndexes().indexOf(selectedCardIndex);
}

function ensureVisibleSelection(preferredIndex = selectedCardIndex) {
  const visibleIndexes = getVisibleCardIndexes();

  if (visibleIndexes.length === 0) {
    selectedCardIndex = -1;
    return;
  }

  if (visibleIndexes.includes(preferredIndex)) {
    selectedCardIndex = preferredIndex;
    return;
  }

  if (selectedCardIndex >= 0 && visibleIndexes.includes(selectedCardIndex)) {
    return;
  }

  selectedCardIndex = visibleIndexes[0];
}

function showPanel(panelName, options = {}) {
  if (panelName === "detail" && options.selectFirstVisible) {
    const firstVisibleIndex = getVisibleCardIndexes()[0];

    if (firstVisibleIndex !== undefined) {
      selectedCardIndex = firstVisibleIndex;
    }
  }

  panelSections.forEach((panel) => {
    panel.hidden = panel.dataset.panelName !== panelName;
  });

  navButtons.forEach((button) => {
    const isActive = button.dataset.panel === panelName;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });

  if (panelName === "detail") {
    renderCardDetail();
  }
}

function renderUsedIndicator(card) {
  return card.used ? '<span class="status-badge" data-used="true">Used</span>' : "";
}

function renderCardList() {
  const visibleIndexes = getVisibleCardIndexes();
  const countLabel = `${visibleIndexes.length}/${sampleGiftCards.length}`;

  const totalVisibleBalance = visibleIndexes.reduce(
    (total, cardIndex) => total + normalizeMoney(sampleGiftCards[cardIndex].currentBalance),
    0,
  );

  cardCount.textContent = countLabel;
  cardTotalBalance.textContent = formatBalance(totalVisibleBalance);
  cardList.innerHTML = "";

  if (visibleIndexes.length === 0) {
    cardList.innerHTML = '<p class="empty-state">No cards match the current settings.</p>';
    return;
  }

  visibleIndexes.forEach((cardIndex) => {
    const card = sampleGiftCards[cardIndex];
    const cardButton = document.createElement("button");
    cardButton.type = "button";
    cardButton.className = "card-button";
    cardButton.setAttribute("aria-pressed", String(cardIndex === selectedCardIndex));
    cardButton.addEventListener("click", () => selectCard(cardIndex));

    cardButton.innerHTML = `
      <div class="card-row-top">
        <span class="card-number">${maskCardNumber(card.cardNumber)}</span>
        ${renderUsedIndicator(card)}
      </div>
      <div class="card-row-bottom">
        <span class="card-note">Current balance</span>
        <span class="card-balance${card.used ? " is-used-balance" : ""}">${formatBalance(card.currentBalance)}</span>
      </div>
    `;

    cardList.appendChild(cardButton);
  });
}

function clearCardDetail() {
  detailStatus.textContent = "";
  detailStatus.dataset.used = "";
  detailStatus.hidden = true;
  detailNumber.textContent = "—";
  detailNumber.disabled = true;
  detailNumber.setAttribute("aria-label", "No card number selected");
  detailPin.textContent = "—";
  detailStartingBalance.textContent = "—";
  detailCurrentBalance.textContent = "—";
  detailDateAdded.textContent = "—";
  detailCurrentDateLabel.textContent = "Date Updated";
  detailCurrentDate.textContent = "—";
  currentBalanceCard.classList.remove("used-balance-card");
  detailNotes.textContent = "No cards match the current settings.";
  cardPosition.textContent = "Card 0 of 0";
  previousButton.disabled = true;
  nextButton.disabled = true;
  markUsedButton.disabled = true;
  openBalanceModalButton.disabled = true;
  barcodeOpenButton.disabled = true;
  clearRenderedBarcode(detailBarcodeRender, detailBarcodeStatus, detailBarcodeCaption);
  clearRenderedBarcode(fullscreenBarcodeRender, fullscreenBarcodeStatus, fullscreenBarcodeCaption);
  fullscreenCardNumber.textContent = "—";
  fullscreenPin.textContent = "—";
  fullscreenCurrentBalance.textContent = "—";
  fullscreenPosition.textContent = "Card 0 of 0";
  fullscreenPreviousButton.disabled = true;
  fullscreenNextButton.disabled = true;
  fullscreenMarkUsedButton.disabled = true;
  fullscreenUpdateBalanceButton.disabled = true;
}

function renderCardDetail() {
  const visibleIndexes = getVisibleCardIndexes();

  if (selectedCardIndex < 0 || visibleIndexes.length === 0) {
    clearCardDetail();
    return;
  }

  const card = sampleGiftCards[selectedCardIndex];
  const visiblePosition = getSelectedVisiblePosition();

  detailStatus.textContent = card.used ? "Used" : "";
  detailStatus.dataset.used = String(card.used);
  detailStatus.hidden = !card.used;
  detailNumber.textContent = detailNumberRevealed ? groupCardNumber(card.cardNumber) : maskCardNumber(card.cardNumber);
  detailNumber.disabled = false;
  detailNumber.setAttribute("aria-label", detailNumberRevealed ? "Mask card number" : "Reveal full card number");
  detailNumber.title = detailNumberRevealed ? "Tap to mask card number" : "Tap to reveal full card number";
  detailPin.textContent = card.pin;
  detailStartingBalance.textContent = formatBalance(card.startingBalance);
  detailCurrentBalance.textContent = formatBalance(card.currentBalance);
  detailDateAdded.textContent = formatDate(card.dateAdded);
  detailCurrentDateLabel.textContent = card.used ? "Date Used" : "Date Updated";
  detailCurrentDate.textContent = formatDate(card.used ? card.dateUsed : card.dateUpdated);
  currentBalanceCard.classList.toggle("used-balance-card", card.used);
  detailNotes.textContent = card.notes;
  cardPosition.textContent = `Card ${visiblePosition + 1} of ${visibleIndexes.length}`;
  previousButton.disabled = visiblePosition <= 0;
  nextButton.disabled = visiblePosition === visibleIndexes.length - 1;
  markUsedButton.disabled = false;
  markUsedButton.textContent = card.used ? "Unmark Used" : "Mark Used";
  openBalanceModalButton.disabled = false;
  barcodeOpenButton.disabled = false;
  renderBarcode(detailBarcodeRender, detailBarcodeStatus, detailBarcodeCaption, card, { height: 88 });
  renderBarcode(fullscreenBarcodeRender, fullscreenBarcodeStatus, fullscreenBarcodeCaption, card, { height: 132, moduleWidth: 3 });
  fullscreenPosition.textContent = `Card ${visiblePosition + 1} of ${visibleIndexes.length}`;
  fullscreenCardNumber.textContent = groupCardNumber(card.cardNumber);
  fullscreenPin.textContent = card.pin;
  fullscreenCurrentBalance.textContent = formatBalance(card.currentBalance);
  fullscreenPreviousButton.disabled = visiblePosition <= 0;
  fullscreenNextButton.disabled = visiblePosition === visibleIndexes.length - 1;
  fullscreenMarkUsedButton.disabled = false;
  fullscreenUpdateBalanceButton.disabled = false;
}


function renderApp(preferredIndex) {
  ensureVisibleSelection(preferredIndex);
  renderCardList();
  renderCardDetail();
}

function selectCard(index) {
  detailNumberRevealed = false;
  selectedCardIndex = index;
  renderApp(index);
  showPanel("detail");
}

function moveSelection(direction) {
  const visibleIndexes = getVisibleCardIndexes();
  const visiblePosition = getSelectedVisiblePosition();
  const nextPosition = visiblePosition + direction;

  if (nextPosition < 0 || nextPosition >= visibleIndexes.length) {
    return;
  }

  selectCard(visibleIndexes[nextPosition]);
}

function toggleSelectedUsed() {
  if (selectedCardIndex < 0) {
    return;
  }

  const card = sampleGiftCards[selectedCardIndex];
  const visibleIndexesBefore = getVisibleCardIndexes();
  const visiblePositionBefore = visibleIndexesBefore.indexOf(selectedCardIndex);

  card.used = !card.used;
  card.dateUsed = card.used ? todayString() : "";
  const updatedCard = cloneStateValue(card);
  saveAppState();

  if (card.used && advanceOnMarkUsed) {
    const nextPreferredIndex = visibleIndexesBefore[visiblePositionBefore + 1]
      ?? visibleIndexesBefore[visiblePositionBefore - 1]
      ?? selectedCardIndex;
    renderApp(nextPreferredIndex);
  } else {
    renderApp(selectedCardIndex);
  }

  postCompletedActionToSheets(
    "updateCard",
    { card: updatedCard },
    `Saved ${updatedCard.used ? "used" : "unused"} status to Sheets.`,
  );
}

function updateSelectedBalance(balance) {
  if (selectedCardIndex < 0) {
    return null;
  }

  const card = sampleGiftCards[selectedCardIndex];
  card.currentBalance = normalizeMoney(balance);
  card.dateUpdated = todayString();
  const updatedCard = cloneStateValue(card);
  saveAppState();
  renderApp(selectedCardIndex);
  return updatedCard;
}

function openBalanceModal() {
  balanceOpenedFromCheckout = !fullscreenBarcode.hidden;

  if (selectedCardIndex < 0) {
    return;
  }

  const card = sampleGiftCards[selectedCardIndex];
  amountUsedEditedLast = false;
  balanceModalContext.textContent = `Current balance: ${formatBalance(card.currentBalance)}`;
  amountUsedInput.value = "";
  remainingBalanceInput.value = card.currentBalance.toFixed(2);
  balanceModalError.textContent = "";
  balanceModal.hidden = false;
  amountUsedInput.focus();
}

function closeBalanceModal() {
  balanceModal.hidden = true;

  if (balanceOpenedFromCheckout && !fullscreenBarcode.hidden) {
    fullscreenUpdateBalanceButton.focus();
  } else {
    openBalanceModalButton.focus();
  }

  balanceOpenedFromCheckout = false;
}

function readMoneyInput(input) {
  if (input.value.trim() === "") {
    return null;
  }

  const value = Number.parseFloat(input.value);
  return Number.isNaN(value) ? NaN : value;
}

function setBalanceModalError(message) {
  balanceModalError.textContent = message;
}

function calculateModalCounterpart(source) {
  if (selectedCardIndex < 0) {
    return;
  }

  const card = sampleGiftCards[selectedCardIndex];
  const amountUsed = readMoneyInput(amountUsedInput);
  const remainingBalance = readMoneyInput(remainingBalanceInput);
  setBalanceModalError("");

  if (source === "amount-used") {
    amountUsedEditedLast = true;

    if (amountUsed === null || Number.isNaN(amountUsed)) {
      remainingBalanceInput.value = "";
      return;
    }

    remainingBalanceInput.value = normalizeMoney(card.currentBalance - amountUsed).toFixed(2);
    return;
  }

  amountUsedEditedLast = false;

  if (remainingBalance === null || Number.isNaN(remainingBalance)) {
    amountUsedInput.value = "";
    return;
  }

  amountUsedInput.value = normalizeMoney(card.currentBalance - remainingBalance).toFixed(2);
}

function validateBalanceUpdate() {
  if (selectedCardIndex < 0) {
    return null;
  }

  const card = sampleGiftCards[selectedCardIndex];
  const amountUsed = readMoneyInput(amountUsedInput);
  const remainingBalance = readMoneyInput(remainingBalanceInput);

  if (amountUsed === null && remainingBalance === null) {
    setBalanceModalError("Enter Amount Used or Remaining Balance.");
    return null;
  }

  if (Number.isNaN(amountUsed) || Number.isNaN(remainingBalance)) {
    setBalanceModalError("Enter valid dollar amounts.");
    return null;
  }

  const nextBalance = amountUsedEditedLast && amountUsed !== null
    ? normalizeMoney(card.currentBalance - amountUsed)
    : normalizeMoney(remainingBalance);

  if (nextBalance < 0) {
    setBalanceModalError("Remaining Balance cannot be negative.");
    return null;
  }

  return nextBalance;
}

function saveBalanceUpdate() {
  const nextBalance = validateBalanceUpdate();

  if (nextBalance === null) {
    return;
  }

  const updatedCard = updateSelectedBalance(nextBalance);
  closeBalanceModal();

  if (updatedCard) {
    postCompletedActionToSheets(
      "updateCard",
      { card: updatedCard },
      "Saved balance update to Sheets.",
    );
  }
}

function getZeroBalanceCardIndexes() {
  return sampleGiftCards
    .map((card, index) => ({ card, index }))
    .filter(({ card }) => card.currentBalance === 0 && !card.used)
    .map(({ index }) => index);
}

function openZeroBalanceConfirm() {
  const zeroBalanceIndexes = getZeroBalanceCardIndexes();

  if (zeroBalanceIndexes.length === 0) {
    confirmModalMessage.textContent = "There are no unmarked zero-balance cards to update.";
    confirmZeroUsedButton.disabled = true;
  } else {
    confirmModalMessage.textContent = `Mark ${zeroBalanceIndexes.length} zero-balance card${zeroBalanceIndexes.length === 1 ? "" : "s"} as Used?`;
    confirmZeroUsedButton.disabled = false;
  }

  confirmModal.hidden = false;
  cancelConfirmButton.focus();
}

function closeConfirmModal() {
  confirmModal.hidden = true;
  markZeroUsedButton.focus();
}

function markZeroBalanceCardsUsed() {
  const updatedCards = getZeroBalanceCardIndexes().map((cardIndex) => {
    sampleGiftCards[cardIndex].used = true;
    sampleGiftCards[cardIndex].dateUsed = todayString();
    return cloneStateValue(sampleGiftCards[cardIndex]);
  });

  saveAppState();
  closeConfirmModal();
  renderApp(selectedCardIndex);

  if (updatedCards.length > 0) {
    postCompletedActionToSheets(
      "batchUpdate",
      { cards: updatedCards },
      `Saved ${updatedCards.length} zero-balance card${updatedCards.length === 1 ? "" : "s"} as used to Sheets.`,
    );
  }
}

async function requestCheckoutWakeLock() {
  if (!("wakeLock" in navigator)) {
    return;
  }

  try {
    wakeLock = await navigator.wakeLock.request("screen");
  } catch {
    wakeLock = null;
  }
}

function releaseCheckoutWakeLock() {
  if (!wakeLock) {
    return;
  }

  wakeLock.release().catch(() => {});
  wakeLock = null;
}

function openFullscreenBarcode() {
  if (selectedCardIndex < 0) {
    return;
  }

  renderCardDetail();
  fullscreenBarcode.hidden = false;
  requestCheckoutWakeLock();
  barcodeCloseButton.focus();
}

function closeFullscreenBarcode() {
  fullscreenBarcode.hidden = true;
  releaseCheckoutWakeLock();
  barcodeOpenButton.focus();
}

function markUsedFromCheckout() {
  if (selectedCardIndex < 0) {
    return;
  }

  if (!sampleGiftCards[selectedCardIndex].used) {
    toggleSelectedUsed();
  }
}

function updateBalanceFromCheckout() {
  openBalanceModal();
}

function handleSwipeEnd(event, action) {
  const touch = event.changedTouches[0];
  const deltaX = touch.screenX - touchStartX;
  const deltaY = touch.screenY - touchStartY;

  if (Math.abs(deltaX) < 50 || Math.abs(deltaX) < Math.abs(deltaY)) {
    return;
  }

  action(deltaX < 0 ? 1 : -1);
}

navButtons.forEach((button) => {
  button.addEventListener("click", () => {
    showPanel(button.dataset.panel, { selectFirstVisible: button.dataset.panel === "detail" });
  });
});

previousButton.addEventListener("click", () => moveSelection(-1));
nextButton.addEventListener("click", () => moveSelection(1));
fullscreenPreviousButton.addEventListener("click", () => moveSelection(-1));
fullscreenNextButton.addEventListener("click", () => moveSelection(1));
advanceOnUsedCheckbox.addEventListener("change", (event) => {
  advanceOnMarkUsed = event.target.checked;
  saveAppState();
});
hideUsedCheckbox.addEventListener("change", (event) => {
  hideUsedCards = event.target.checked;
  saveAppState();
  renderApp(selectedCardIndex);
});
hideZeroBalanceCheckbox.addEventListener("change", (event) => {
  hideZeroBalanceCards = event.target.checked;
  saveAppState();
  renderApp(selectedCardIndex);
});
sortCardsSelect.addEventListener("change", (event) => {
  sortMode = event.target.value;
  saveAppState();
  renderApp(selectedCardIndex);
});
markUsedButton.addEventListener("click", toggleSelectedUsed);
openBalanceModalButton.addEventListener("click", openBalanceModal);
detailNumber.addEventListener("click", () => {
  if (selectedCardIndex < 0) {
    return;
  }
  detailNumberRevealed = !detailNumberRevealed;
  renderCardDetail();
});
fullscreenMarkUsedButton.addEventListener("click", markUsedFromCheckout);
fullscreenUpdateBalanceButton.addEventListener("click", updateBalanceFromCheckout);
amountUsedInput.addEventListener("input", () => calculateModalCounterpart("amount-used"));
remainingBalanceInput.addEventListener("input", () => calculateModalCounterpart("remaining-balance"));
cancelBalanceUpdateButton.addEventListener("click", closeBalanceModal);
saveBalanceUpdateButton.addEventListener("click", saveBalanceUpdate);
markZeroUsedButton.addEventListener("click", openZeroBalanceConfirm);
cancelConfirmButton.addEventListener("click", closeConfirmModal);
confirmZeroUsedButton.addEventListener("click", markZeroBalanceCardsUsed);
barcodeOpenButton.addEventListener("click", openFullscreenBarcode);
barcodeCloseButton.addEventListener("click", closeFullscreenBarcode);
toggleDataLockButton.addEventListener("click", () => setRawDataLocked(!rawDataLocked));
refreshCardDataButton.addEventListener("click", refreshRawCardData);
updateCardDataButton.addEventListener("click", updateRawCardData);
importCsvButton.addEventListener("click", () => csvFileInput.click());
csvFileInput.addEventListener("change", (event) => {
  importCsvFile(event.target.files[0]);
  event.target.value = "";
});
exportCsvButton.addEventListener("click", exportCurrentCardsCsv);
saveConnectionButton.addEventListener("click", saveConnectionFromInput);
testConnectionButton.addEventListener("click", testConnection);
loadSheetsButton.addEventListener("click", loadCardsFromSheets);
syncRecoveryActions.addEventListener("click", (event) => {
  const recoveryButton = event.target.closest("[data-sync-recovery]");
  if (!recoveryButton) {
    return;
  }

  handleSyncRecoveryAction(recoveryButton.dataset.syncRecovery);
});
fullscreenBarcode.addEventListener("click", (event) => {
  if (event.target === fullscreenBarcode) {
    closeFullscreenBarcode();
  }
});
balanceModal.addEventListener("click", (event) => {
  if (event.target === balanceModal) {
    closeBalanceModal();
  }
});
confirmModal.addEventListener("click", (event) => {
  if (event.target === confirmModal) {
    closeConfirmModal();
  }
});

document.addEventListener("keydown", (event) => {
  if (!fullscreenBarcode.hidden && event.key === "Escape") {
    closeFullscreenBarcode();
  }

  if (!balanceModal.hidden && event.key === "Escape") {
    closeBalanceModal();
  }

  if (!confirmModal.hidden && event.key === "Escape") {
    closeConfirmModal();
  }
});

cardDetail.addEventListener("touchstart", (event) => {
  const touch = event.changedTouches[0];
  touchStartX = touch.screenX;
  touchStartY = touch.screenY;
}, { passive: true });

cardDetail.addEventListener("touchend", (event) => {
  handleSwipeEnd(event, moveSelection);
}, { passive: true });

fullscreenBarcode.addEventListener("touchstart", (event) => {
  const touch = event.changedTouches[0];
  touchStartX = touch.screenX;
  touchStartY = touch.screenY;
}, { passive: true });

fullscreenBarcode.addEventListener("touchend", (event) => {
  handleSwipeEnd(event, moveSelection);
}, { passive: true });

applyAppState(loadAppState());
saveAppState();

hideUsedCheckbox.checked = hideUsedCards;
hideZeroBalanceCheckbox.checked = hideZeroBalanceCards;
sortCardsSelect.value = sortMode;
setRawDataLocked(true);
renderConnectionState();
refreshRawCardData("Loaded current session data into the textarea. Editing is locked.");
renderApp();
showPanel("list");
