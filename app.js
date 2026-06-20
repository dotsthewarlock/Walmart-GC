// Debug file fingerprint: app.js app-shell version 1.01.73 (cache/debug only, not a product release).
// These manually maintained values identify loaded static files for cache debugging; they are not product or release versions.
const DEBUG_VERSION_JS = "1.01.73";
const DEBUG_VERSION_CSS = "1.01.73";

function renderDebugVersionFingerprint() {
  const fingerprint = document.querySelector("#debug-version-fingerprint");
  const settingsFingerprint = document.querySelector("#settings-app-shell-fingerprint");
  const htmlVersion = fingerprint?.dataset.htmlVersion || "unknown";

  if (fingerprint) {
    fingerprint.textContent = `HTML ${htmlVersion} · JS ${DEBUG_VERSION_JS} · CSS ${DEBUG_VERSION_CSS}`;
  }

  if (settingsFingerprint) {
    settingsFingerprint.textContent = `App shell: HTML ${htmlVersion} · JS ${DEBUG_VERSION_JS} · CSS ${DEBUG_VERSION_CSS}`;
  }
}

renderDebugVersionFingerprint();

const bundledSampleGiftCards = [
  {
    cardNumber: "6351234567890123",
    pin: "4821",
    merchant: "walmart-ca",
    merchantInferred: "walmart-ca",
    startingBalance: 50,
    currentBalance: 50,
    dateAdded: "2026-06-01",
    dateUpdated: "2026-06-09",
    dateUsed: "",
    used: false,
    notes: "Sample card ready for checkout testing.",
  },
  {
    cardNumber: "6352234567890123",
    pin: "9064",
    merchant: "walmart-ca",
    merchantInferred: "walmart-ca",
    startingBalance: 100,
    currentBalance: 37.42,
    dateAdded: "2026-05-28",
    dateUpdated: "2026-06-08",
    dateUsed: "",
    used: false,
    notes: "Partially used sample card with a remaining balance.",
  },
  {
    cardNumber: "6353234567890123",
    pin: "1138",
    merchant: "walmart-ca",
    merchantInferred: "walmart-ca",
    startingBalance: 25,
    currentBalance: 0,
    dateAdded: "2026-05-20",
    dateUpdated: "2026-06-07",
    dateUsed: "2026-06-07",
    used: true,
    notes: "Zero-balance sample card retained for used flag visibility.",
  },
  {
    cardNumber: "6354234567890123",
    pin: "7205",
    merchant: "walmart-ca",
    merchantInferred: "walmart-ca",
    startingBalance: 75,
    currentBalance: 18.25,
    dateAdded: "2026-06-05",
    dateUpdated: "2026-06-10",
    dateUsed: "2026-06-10",
    used: true,
    notes: "Used flag is independent of balance so this card keeps its remaining value.",
  },
  {
    cardNumber: "6355234567890123",
    pin: "3349",
    merchant: "walmart-ca",
    merchantInferred: "walmart-ca",
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
const settingsOpenButton = document.querySelector("#open-settings");
const appShell = document.querySelector(".app-shell");
const panelSections = document.querySelectorAll("[data-panel-name]");
const cardList = document.querySelector("#card-list");
const appSyncSummary = document.querySelector("#app-sync-summary");
const cardCount = document.querySelector("#card-count");
const cardTotalBalance = document.querySelector("#card-total-balance");
const advanceOnUsedCheckbox = document.querySelector("#advance-on-used");
const hideUsedCheckbox = document.querySelector("#hide-used");
const hideZeroBalanceCheckbox = document.querySelector("#hide-zero-balance");
const sortCardsSelect = document.querySelector("#sort-cards");
const markZeroUsedButton = document.querySelector("#mark-zero-used");
const forceRefreshAppShellButton = document.querySelector("#force-refresh-app-shell");
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
const openNotesModalButton = document.querySelector("#open-notes-modal");
const previousButton = document.querySelector("#prev-card");
const nextButton = document.querySelector("#next-card");
const cardPosition = document.querySelector("#card-position");
const markUsedButton = document.querySelector("#mark-used");
const openBalanceModalButton = document.querySelector("#open-balance-modal");
const checkoutFeedback = document.querySelector("#checkout-feedback");
const balanceModal = document.querySelector("#balance-modal");
const balanceModalContext = document.querySelector("#balance-modal-context");
const amountUsedInput = document.querySelector("#amount-used-input");
const remainingBalanceInput = document.querySelector("#remaining-balance-input");
const balanceModalError = document.querySelector("#balance-modal-error");
const cancelBalanceUpdateButton = document.querySelector("#cancel-balance-update");
const saveBalanceUpdateButton = document.querySelector("#save-balance-update");
const confirmModal = document.querySelector("#confirm-modal");
const confirmModalTitle = document.querySelector("#confirm-modal-title");
const confirmModalMessage = document.querySelector("#confirm-modal-message");
const cancelConfirmButton = document.querySelector("#cancel-confirm");
const confirmZeroUsedButton = document.querySelector("#confirm-zero-used");
const notesModal = document.querySelector("#notes-modal");
const notesModalContext = document.querySelector("#notes-modal-context");
const notesInput = document.querySelector("#notes-input");
const cancelNotesUpdateButton = document.querySelector("#cancel-notes-update");
const saveNotesUpdateButton = document.querySelector("#save-notes-update");
const barcodeOpenButton = document.querySelector("#barcode-open");
const fullscreenBarcode = document.querySelector("#fullscreen-barcode");
const fullscreenCardNumber = document.querySelector("#fullscreen-card-number");
const fullscreenPin = document.querySelector("#fullscreen-pin");
const fullscreenCurrentBalance = document.querySelector("#fullscreen-current-balance");
const detailBarcodeStatus = document.querySelector("#detail-barcode-status");
const detailBarcodeRender = document.querySelector("#detail-barcode-render");
const detailBarcodeCaption = document.querySelector("#detail-barcode-caption");
const detailBarcodeActionLabel = document.querySelector("#detail-barcode-action-label");
const detailBarcodeBalance = document.querySelector("#detail-barcode-balance");
const detailBarcodePin = document.querySelector("#detail-barcode-pin");
const fullscreenBarcodeStatus = document.querySelector("#fullscreen-barcode-status");
const fullscreenBarcodeRender = document.querySelector("#fullscreen-barcode-render");
const fullscreenBarcodeCaption = document.querySelector("#fullscreen-barcode-caption");
const fullscreenPosition = document.querySelector("#fullscreen-position");
const fullscreenPreviousButton = document.querySelector("#fullscreen-prev");
const fullscreenNextButton = document.querySelector("#fullscreen-next");
const fullscreenMarkUsedButton = document.querySelector("#fullscreen-mark-used");
const fullscreenUpdateBalanceButton = document.querySelector("#fullscreen-update-balance");
const fullscreenNotes = document.querySelector("#fullscreen-notes");
const cardDetail = document.querySelector("#card-detail");
const rawDataModal = document.querySelector("#raw-data-modal");
const openRawDataModalButton = document.querySelector("#open-raw-data-modal");
const rawDataInput = document.querySelector("#raw-data-input");
const cancelRawDataUpdateButton = document.querySelector("#cancel-raw-data-update");
const doneRawDataUpdateButton = document.querySelector("#done-raw-data-update");
const toggleDataLockButton = document.querySelector("#toggle-data-lock");
const refreshCardDataButton = document.querySelector("#refresh-card-data");
const updateCardDataButton = document.querySelector("#update-card-data");
const importCsvButton = document.querySelector("#import-csv");
const exportCsvButton = document.querySelector("#export-csv");
const csvFileInput = document.querySelector("#csv-file-input");
const dataValidationWarnings = document.querySelector("#data-validation-warnings");
const dataCountSummary = document.querySelector("#data-count-summary");
const syncRecoveryActions = document.querySelector("#sync-recovery-actions");
const connectGoogleButton = document.querySelector("#connect-google");
const disconnectGoogleButton = document.querySelector("#disconnect-google");
const googleOAuthStatusArea = document.querySelector("#google-oauth-status");
const googleSyncIdentity = document.querySelector("#google-sync-identity");
const googleSyncHelper = document.querySelector("#google-sync-helper");
const advancedSyncDiagnostics = document.querySelector("#advanced-sync-diagnostics");
const initializeDirectSheetButton = document.querySelector("#initialize-direct-sheet");
const openDirectSheetButton = document.querySelector("#open-direct-sheet");
const loadDirectSheetButton = document.querySelector("#load-direct-sheet");
const syncDirectSheetButton = document.querySelector("#sync-direct-sheet");
const directSheetStatusArea = document.querySelector("#direct-sheet-status");
const googleSyncSection = document.querySelector("#google-sync-section");
const backupSyncSection = document.querySelector("#backup-sync-section");
const backupRestoreSection = document.querySelector("#backup-restore-section");

let selectedCardIndex = -1;
let advanceOnMarkUsed = true;
let hideUsedCards = true;
let checkoutFeedbackTimer = null;
let hideZeroBalanceCards = false;
let sortMode = "balance-asc";
let pendingConfirmAction = null;
let confirmReturnFocusElement = null;
let amountUsedEditedLast = false;
let rawDataLocked = true;
let rawDataModalInitialValue = "";
let detailNumberRevealed = false;
let wakeLock = null;
let balanceOpenedFromCheckout = false;
let lastBackupSyncAttentionSignature = "";

const dataPanelRowLimit = 100;
const csvHeaders = [
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
const expectedCardsHeaderRow = csvHeaders.join(", ");
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
const oldApprovedCsvHeaders = csvHeaders.filter((header) => header !== "merchantInferred");
const walmartCaMerchant = "walmart-ca";
const walmartCaBarcodePrefix = "79936686504000";
const walmartGiftCardNumberPattern = /^63\d{14}$/;
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
  sync: "walmartGc.sync",
  oauth: "walmartGc.oauth",
  directSheets: "walmartGc.directSheets",
};

const defaultSettings = {
  advanceOnMarkUsed: true,
  hideUsedCards: true,
  hideZeroBalanceCards: false,
  sortMode: "balance-asc",
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
  message: "Connect Google to find or create Walmart-GC Data and enable completed-action sync writes.",
  lastErrorMessage: "",
  pendingOperation: null,
};

const WORKER_ROUTE_DISPLAY = "Same-origin /auth/* and /api/*";
const walmartGcDataSheetName = "Walmart-GC Data";
const googleOAuthStatuses = {
  disconnected: "Disconnected",
  connecting: "Checking connection",
  restoring: "Checking connection",
  connected: "Connected",
  needsReconnect: "Disconnected",
  error: "Connection unavailable",
};


const directSheetsStatuses = {
  notConfigured: "Disconnected",
  ready: "Connected",
  checking: "Syncing",
  creating: "Syncing",
  syncing: "Syncing",
  conflict: "Conflict",
  error: "Connection unavailable",
  needsAttention: "Sheet needs attention",
};

const defaultDirectSheetsState = {
  spreadsheetId: "",
  spreadsheetUrl: "",
  spreadsheetName: "",
  status: directSheetsStatuses.notConfigured,
  cardsSheetInitialized: "unknown",
  remoteSheetVersion: "",
  lastSuccessfulSyncAt: "",
  pendingUnsynced: false,
  message: "Connect Google to find or create Walmart-GC Data.",
  lastErrorMessage: "",
  workerVersion: "",
  schemaMode: "",
};

const defaultGoogleOAuthState = {
  status: googleOAuthStatuses.disconnected,
  connectedEmail: "",
  connectedName: "",
  connectedAt: "",
  lastAuthorizedAt: "",
  tokenExpiresAt: "",
  userDisconnectedGoogle: false,
  message: "Checking Google account connection. Local cards remain usable without Google.",
  lastErrorMessage: "",
  workerVersion: "",
  schemaMode: "",
};

let sampleGiftCards = cloneStateValue(bundledSampleGiftCards);
let syncState = cloneStateValue(defaultSyncState);
let googleOAuthState = cloneStateValue(defaultGoogleOAuthState);
let directSheetsState = cloneStateValue(defaultDirectSheetsState);
let loadedCardsFromStorage = false;

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

function isValidWalmartGiftCardNumber(cardNumber) {
  return walmartGiftCardNumberPattern.test(String(cardNumber ?? "").trim());
}

function normalizePinValue(pin) {
  return String(pin ?? "").trim();
}

function normalizeMerchantValue(merchant) {
  return String(merchant ?? "").trim();
}

function inferMerchantFromCardNumber(cardNumber) {
  return isValidWalmartGiftCardNumber(cardNumber) ? walmartCaMerchant : "";
}

function getEffectiveMerchant(card) {
  const explicitMerchant = normalizeMerchantValue(card?.merchant);
  const storedInferredMerchant = normalizeMerchantValue(card?.merchantInferred);
  return explicitMerchant || storedInferredMerchant || inferMerchantFromCardNumber(card?.cardNumber);
}

function parseOptionalMoney(value) {
  if (value === null || value === undefined || String(value).trim() === "") {
    return null;
  }
  return Number(value);
}

function getBarcodeFallbackMessage(card) {
  if (!normalizeCardNumber(card?.cardNumber)) {
    return "Barcode unavailable";
  }

  const merchant = getEffectiveMerchant(card);
  if (merchant !== walmartCaMerchant) {
    return "Barcode unavailable for this merchant";
  }

  return "Barcode unavailable";
}

function getBarcodePayload(card) {
  const cardNumber = normalizeCardNumber(card?.cardNumber);
  const merchant = getEffectiveMerchant(card);

  if (merchant !== walmartCaMerchant || !isValidWalmartGiftCardNumber(cardNumber)) {
    return "";
  }

  // Walmart Canada Code 128 payloads are derived from scanned sample gift cards;
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
    statusElement.textContent = "Walmart Canada";
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
  captionElement.textContent = "Choose a card";
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
  const pin = normalizePinValue(card.pin);
  const startingBalance = parseOptionalMoney(card.startingBalance);
  const currentBalanceRaw = parseOptionalMoney(card.currentBalance);
  const currentBalance = currentBalanceRaw === null ? startingBalance : currentBalanceRaw;

  if (!cardNumber || pin.length < 4 || !Number.isFinite(startingBalance) || !Number.isFinite(currentBalance)) {
    return null;
  }

  const dateAdded = normalizeDateField(card.dateAdded, todayString());

  return {
    cardNumber,
    pin,
    merchant: normalizeMerchantValue(card.merchant),
    merchantInferred: inferMerchantFromCardNumber(cardNumber),
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

function normalizeStoredDirectSheets(directSheets) {
  if (!isPlainObject(directSheets)) {
    return cloneStateValue(defaultDirectSheetsState);
  }

  const allowedStatuses = Object.values(directSheetsStatuses);
  const status = allowedStatuses.includes(directSheets.status)
    ? directSheets.status
    : defaultDirectSheetsState.status;

  return {
    spreadsheetId: String(directSheets.spreadsheetId || ""),
    spreadsheetUrl: String(directSheets.spreadsheetUrl || ""),
    spreadsheetName: String(directSheets.spreadsheetName || ""),
    status,
    cardsSheetInitialized: ["yes", "no", "unknown"].includes(directSheets.cardsSheetInitialized)
      ? directSheets.cardsSheetInitialized
      : "unknown",
    remoteSheetVersion: String(directSheets.remoteSheetVersion || ""),
    lastSuccessfulSyncAt: String(directSheets.lastSuccessfulSyncAt || ""),
    pendingUnsynced: Boolean(directSheets.pendingUnsynced),
    message: String(directSheets.message || defaultDirectSheetsState.message),
    lastErrorMessage: String(directSheets.lastErrorMessage || ""),
    workerVersion: String(directSheets.workerVersion || ""),
    schemaMode: String(directSheets.schemaMode || ""),
  };
}

function normalizeStoredGoogleOAuth(oauth) {
  if (!isPlainObject(oauth)) {
    return cloneStateValue(defaultGoogleOAuthState);
  }

  const allowedStatuses = Object.values(googleOAuthStatuses);
  let status = allowedStatuses.includes(oauth.status)
    ? oauth.status
    : defaultGoogleOAuthState.status;

  const userDisconnectedGoogle = Boolean(oauth.userDisconnectedGoogle);
  const hasRememberedContext = Boolean(
    String(oauth.connectedEmail || oauth.connectedName || oauth.connectedAt || "").trim(),
  );

  if (userDisconnectedGoogle) {
    status = googleOAuthStatuses.disconnected;
  } else if (status === googleOAuthStatuses.connected || (status === googleOAuthStatuses.disconnected && hasRememberedContext)) {
    status = googleOAuthStatuses.needsReconnect;
  }

  return {
    status,
    connectedEmail: userDisconnectedGoogle ? "" : String(oauth.connectedEmail || ""),
    connectedName: userDisconnectedGoogle ? "" : String(oauth.connectedName || ""),
    connectedAt: userDisconnectedGoogle ? "" : String(oauth.connectedAt || ""),
    lastAuthorizedAt: String(oauth.lastAuthorizedAt || oauth.connectedAt || ""),
    tokenExpiresAt: "",
    userDisconnectedGoogle,
    message: userDisconnectedGoogle
      ? "Google account disconnected. Local cards and saved Sheet settings remain available."
      : String(oauth.message || (hasRememberedContext
        ? "Previously connected. Reconnect Google to sync."
        : defaultGoogleOAuthState.message)),
    lastErrorMessage: String(oauth.lastErrorMessage || ""),
    workerVersion: String(oauth.workerVersion || ""),
    schemaMode: String(oauth.schemaMode || ""),
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
  removeStoredJson("walmartGc.connection");
  const storedCardsRaw = readStoredJson(storageKeys.cards);
  const storedCards = normalizeStoredCards(storedCardsRaw);
  const storedSettings = normalizeStoredSettings(readStoredJson(storageKeys.settings));
  const storedSync = normalizeStoredSync(readStoredJson(storageKeys.sync));
  const storedGoogleOAuth = normalizeStoredGoogleOAuth(readStoredJson(storageKeys.oauth));
  const storedDirectSheets = normalizeStoredDirectSheets(readStoredJson(storageKeys.directSheets));
  loadedCardsFromStorage = Boolean(storedCards);

  return {
    cards: storedCards ?? cloneStateValue(bundledSampleGiftCards),
    settings: storedSettings,
    sync: storedSync,
    oauth: storedGoogleOAuth,
    directSheets: storedDirectSheets,
  };
}

function getPersistableGoogleOAuthState() {
  const { tokenExpiresAt, ...persistableOAuthState } = googleOAuthState;
  return persistableOAuthState;
}

function saveAppState() {
  writeStoredJson(storageKeys.cards, sampleGiftCards);
  writeStoredJson(storageKeys.settings, getCurrentSettings());
  writeStoredJson(storageKeys.sync, syncState);
  writeStoredJson(storageKeys.oauth, getPersistableGoogleOAuthState());
  writeStoredJson(storageKeys.directSheets, directSheetsState);
}

function clearAppState() {
  Object.values(storageKeys).forEach(removeStoredJson);
}

function applyAppState(appState) {
  sampleGiftCards = appState.cards;
  applySettings(appState.settings);
  syncState = appState.sync;
  googleOAuthState = appState.oauth;
  directSheetsState = appState.directSheets;
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
  const { rows } = normalizeCsvRows(rawCsv);
  return rows.length;
}

function updateDataCountSummary(displayedCount = 0) {
  dataCountSummary.textContent = `Total ${sampleGiftCards.length}`;
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
  toggleDataLockButton.textContent = rawDataLocked ? "Lock 🔒" : "Unlock 🔓";
  toggleDataLockButton.dataset.lockState = rawDataLocked ? "locked" : "unlocked";
  toggleDataLockButton.setAttribute("aria-label", rawDataLocked ? "Raw CSV editor locked" : "Raw CSV editor unlocked");
  toggleDataLockButton.title = rawDataLocked ? "Raw CSV editor locked" : "Raw CSV editor unlocked";
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

function getCsvHeaderMap(headerValues) {
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

function normalizeCsvRows(rawCsv) {
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

function parseRawCardData(rawCsv) {
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
    return false;
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
        ? "Imported data saved locally, but it is not ready to sync right now. Try sync again or download a backup CSV."
        : "Imported data saved locally. Connect Google and load or initialize Walmart-GC Data before syncing so Walmart-GC can verify the current sheet version.",
    },
  );
  return true;
}

function importCsvFile(file) {
  if (!file) {
    return;
  }

  const reader = new FileReader();
  reader.addEventListener("load", () => {
    rawDataModalInitialValue = cardsToCsv(sampleGiftCards, dataPanelRowLimit);
    rawDataInput.value = String(reader.result ?? "");
    setRawDataLocked(true);
    rawDataModal.hidden = false;
    renderValidationWarnings([], "CSV imported into the raw CSV editor. Press Update or Done to validate and load it into this session.");
    doneRawDataUpdateButton.focus();
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

function generateRequestId() {
  if (window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }

  return `wgc-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function setSyncState(nextState) {
  syncState = {
    ...syncState,
    ...nextState,
  };
  saveAppState();
  renderConnectionState();
  renderDirectSheetsState();
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

function renderAdvancedSyncDiagnostics(googleRows = [], sheetRows = []) {
  if (!advancedSyncDiagnostics) {
    return;
  }

  advancedSyncDiagnostics.innerHTML = `
    <div class="diagnostic-group">
      <h5>Google account diagnostics</h5>
      <ul class="diagnostic-list">${googleRows.join("")}</ul>
    </div>
    <div class="diagnostic-group">
      <h5>Google Sheet diagnostics</h5>
      <ul class="diagnostic-list">${sheetRows.join("")}</ul>
    </div>
  `;
}

function getGoogleOAuthDiagnosticRows() {
  return [
    renderDiagnosticRow("Worker backend", WORKER_ROUTE_DISPLAY),
    renderDiagnosticRow("Worker version", valueOrFallback(googleOAuthState.workerVersion || directSheetsState.workerVersion)),
    renderDiagnosticRow("Schema mode", valueOrFallback(googleOAuthState.schemaMode || directSheetsState.schemaMode)),
    renderDiagnosticRow("Worker session", getWorkerSessionDiagnosticStatus()),
    renderDiagnosticRow("Connection state", googleOAuthState.status),
    renderDiagnosticRow("Connected account", valueOrFallback(googleOAuthState.connectedEmail || googleOAuthState.connectedName)),
    renderDiagnosticRow("Saved sheet metadata", directSheetsState.spreadsheetId ? "Preserved locally" : "None saved"),
    renderDiagnosticRow("Frontend token storage", "None"),
    renderDiagnosticRow("Session storage", "HttpOnly same-origin cookie"),
    renderDiagnosticRow("Sheet proxy", getSheetProxyDiagnosticStatus()),
    renderDiagnosticRow("Last Worker/API error", getLastWorkerApiError()),
  ];
}

function getDirectSheetsDiagnosticRows() {
  return [
    renderDiagnosticRow("Worker session", getWorkerSessionDiagnosticStatus()),
    renderDiagnosticRow("Worker version", valueOrFallback(directSheetsState.workerVersion || googleOAuthState.workerVersion)),
    renderDiagnosticRow("Schema mode", valueOrFallback(directSheetsState.schemaMode || googleOAuthState.schemaMode)),
    renderDiagnosticRow("Sheet proxy", getSheetProxyDiagnosticStatus()),
    renderDiagnosticRow("Connected account", valueOrFallback(googleOAuthState.connectedEmail || googleOAuthState.connectedName)),
    renderDiagnosticRow("Active sheet ID", valueOrFallback(directSheetsState.spreadsheetId)),
    renderDiagnosticRow("Active sheet name", valueOrFallback(directSheetsState.spreadsheetName)),
    renderDiagnosticRow("Cards sheet initialized", valueOrFallback(directSheetsState.cardsSheetInitialized)),
    renderDiagnosticRow("Local sheetVersion", valueOrFallback(syncState.lastKnownSheetVersion)),
    renderDiagnosticRow("Remote sheetVersion", valueOrFallback(directSheetsState.remoteSheetVersion)),
    renderDiagnosticRow("Sync state", getSyncStatusLabel()),
    renderDiagnosticRow("Unsynced changes", directSheetsState.pendingUnsynced || syncState.pendingOperation ? "Yes" : "No"),
    renderDiagnosticRow("Last successful sync", formatConnectionTimestamp(directSheetsState.lastSuccessfulSyncAt)),
    renderDiagnosticRow("Last Worker/API error", getLastWorkerApiError()),
    renderDiagnosticRow("Local card count", String(sampleGiftCards.length)),
    renderDiagnosticRow("Offline/local availability", getOfflineAvailabilityStatus()),
  ];
}


function getWorkerSessionDiagnosticStatus() {
  if (googleOAuthState.status === googleOAuthStatuses.error) {
    return "Unavailable";
  }

  return hasWorkerGoogleSession() ? "Connected" : "Disconnected";
}

function getSheetProxyDiagnosticStatus() {
  if (directSheetsState.status === directSheetsStatuses.error || googleOAuthState.status === googleOAuthStatuses.error) {
    return "Error";
  }

  if (hasWorkerGoogleSession() && directSheetsState.spreadsheetId) {
    return "Ready";
  }

  return "Needs setup";
}

function getOfflineAvailabilityStatus() {
  return navigator.onLine === false
    ? "Available locally; browser is offline"
    : "Available locally";
}

function getLastWorkerApiError() {
  return valueOrFallback(directSheetsState.lastErrorMessage || syncState.lastErrorMessage || googleOAuthState.lastErrorMessage);
}

function isGoogleOAuthConfigured() {
  return true;
}

function hasWorkerGoogleSession() {
  return googleOAuthState.status === googleOAuthStatuses.connected;
}

function setGoogleOAuthState(nextState) {
  googleOAuthState = {
    ...googleOAuthState,
    ...nextState,
  };
  saveAppState();
  renderGoogleOAuthState();
  renderDirectSheetsState();
  renderAppSyncSummary();
}

function setDirectSheetsState(nextState) {
  directSheetsState = {
    ...directSheetsState,
    ...nextState,
  };
  saveAppState();
  renderDirectSheetsState();
  renderConnectionState();
}

function isDirectSheetsConfigured() {
  return Boolean(directSheetsState.spreadsheetId);
}

function getDirectSheetsStatusClass() {
  if (directSheetsState.status === directSheetsStatuses.needsAttention || isCardsHeaderError(directSheetsState.lastErrorMessage)) {
    return "needs-attention";
  }

  if (directSheetsState.status === directSheetsStatuses.ready) {
    return "connected";
  }
  if ([directSheetsStatuses.checking, directSheetsStatuses.creating, directSheetsStatuses.syncing].includes(directSheetsState.status)) {
    return "checking";
  }
  if (directSheetsState.status === directSheetsStatuses.conflict) {
    return "error";
  }
  if (directSheetsState.status === directSheetsStatuses.error) {
    return "error";
  }
  return "not-connected";
}

function isCardsHeaderError(message) {
  return /(?:Missing|Duplicate) required Cards header|Cards header row|Cards headers do not match|cards_header_schema/i.test(String(message || ""));
}

function formatDirectSheetsPanelMessage() {
  const message = directSheetsState.message || defaultDirectSheetsState.message;
  if (!isCardsHeaderError(directSheetsState.lastErrorMessage || message)) {
    return escapeHtml(message);
  }

  return `${escapeHtml(message)}<br><strong>Required Cards headers (any order):</strong> <code>${escapeHtml(expectedCardsHeaderRow)}</code><br><strong>Non-destructive guidance:</strong> Local data remains available. Export/download a CSV backup before any destructive recovery. Fix Cards row 1 manually or use a future safe repair flow; names must match exactly.`;
}

function hasGoogleFileAccessInMemory() {
  return hasWorkerGoogleSession();
}

function getDirectSheetsDisplayUrl() {
  return directSheetsState.spreadsheetId
    ? `https://docs.google.com/spreadsheets/d/${directSheetsState.spreadsheetId}/edit`
    : "";
}

function setDetailsOpen(detailsElement, shouldOpen) {
  if (detailsElement?.tagName === "DETAILS") {
    detailsElement.open = Boolean(shouldOpen);
  }
}

function updateBackupPanelOpenState() {
  const accountNeedsSetup = googleOAuthState.status !== googleOAuthStatuses.connected;
  const sheetNeedsAttention = hasWorkerGoogleSession() && directSheetsState.status !== directSheetsStatuses.ready;
  const hasUrgentSyncState = syncState.status === syncStatuses.conflict
    || googleOAuthState.status === googleOAuthStatuses.error
    || directSheetsState.status === directSheetsStatuses.error
    || directSheetsState.status === directSheetsStatuses.conflict
    || Boolean(syncState.pendingOperation || directSheetsState.pendingUnsynced);
  const syncNeedsAttention = accountNeedsSetup || sheetNeedsAttention || hasUrgentSyncState;
  const attentionSignature = syncNeedsAttention
    ? [
      googleOAuthState.status,
      directSheetsState.status,
      syncState.status,
      syncState.pendingOperation?.action || "",
      directSheetsState.pendingUnsynced ? "pending-unsynced" : "",
      directSheetsState.lastErrorMessage || googleOAuthState.lastErrorMessage || syncState.lastErrorMessage || "",
    ].join("|")
    : "";

  if (syncNeedsAttention && attentionSignature !== lastBackupSyncAttentionSignature) {
    setDetailsOpen(backupSyncSection, true);
    setDetailsOpen(googleSyncSection, true);
  }

  lastBackupSyncAttentionSignature = attentionSignature;
  renderAppSyncSummary();
}

function renderDirectSheetsState() {
  if (!directSheetStatusArea) {
    updateBackupPanelOpenState();
    return;
  }

  const isBusy = [directSheetsStatuses.checking, directSheetsStatuses.creating, directSheetsStatuses.syncing].includes(directSheetsState.status);
  if (initializeDirectSheetButton) {
    initializeDirectSheetButton.disabled = isBusy;
  }
  if (openDirectSheetButton) {
    openDirectSheetButton.disabled = isBusy || !directSheetsState.spreadsheetId;
  }
  loadDirectSheetButton.disabled = isBusy || !hasWorkerGoogleSession();
  syncDirectSheetButton.disabled = isBusy || !hasWorkerGoogleSession();

  renderAdvancedSyncDiagnostics(getGoogleOAuthDiagnosticRows(), getDirectSheetsDiagnosticRows());
  updateBackupPanelOpenState();

  const sheetLink = getDirectSheetsDisplayUrl();
  const hasSheetAttention = [
    directSheetsStatuses.needsAttention,
    directSheetsStatuses.conflict,
    directSheetsStatuses.error,
  ].includes(directSheetsState.status) || isCardsHeaderError(directSheetsState.lastErrorMessage);
  const hasSyncAttention = syncState.status === syncStatuses.conflict || Boolean(syncState.pendingOperation || directSheetsState.pendingUnsynced);
  directSheetStatusArea.hidden = !hasSheetAttention && !hasSyncAttention;
  directSheetStatusArea.className = `connection-status is-${getDirectSheetsStatusClass()} sync-${syncState.status}`;
  directSheetStatusArea.innerHTML = `
    <div class="connection-status-header">
      <span class="connection-status-dot" aria-hidden="true"></span>
      <strong>${escapeHtml(directSheetsState.status)}</strong>
      <span class="sync-badge">${escapeHtml(getSyncStatusLabel())}</span>
    </div>
    <p>${formatDirectSheetsPanelMessage()}</p>
    ${sheetLink ? `<p><a href="${escapeHtml(sheetLink)}" target="_blank" rel="noopener">Open Google sheet</a></p>` : ""}
    ${syncState.message ? `<p class="sync-message">${escapeHtml(syncState.message)}</p>` : ""}
  `;
}

function getGoogleOAuthStatusClass() {
  if (googleOAuthState.status === googleOAuthStatuses.connected) {
    return "connected";
  }

  if ([googleOAuthStatuses.connecting, googleOAuthStatuses.restoring].includes(googleOAuthState.status)) {
    return "checking";
  }

  if (googleOAuthState.status === googleOAuthStatuses.needsReconnect) {
    return "needs-reconnect";
  }

  if (googleOAuthState.status === googleOAuthStatuses.error) {
    return "error";
  }

  return "not-connected";
}


function getGoogleOAuthPanelSummaryText() {
  if ([googleOAuthStatuses.connecting, googleOAuthStatuses.restoring].includes(googleOAuthState.status)) {
    return "Checking connection";
  }

  if (googleOAuthState.status === googleOAuthStatuses.needsReconnect) {
    return "Reconnect to sync";
  }

  if (googleOAuthState.status === googleOAuthStatuses.error) {
    return "Sync needs attention";
  }

  if (googleOAuthState.status === googleOAuthStatuses.notConfigured) {
    return "Setup needed";
  }

  return "Not connected";
}

function renderGoogleOAuthState() {
  if (!googleOAuthStatusArea) {
    return;
  }

  const isBusy = [googleOAuthStatuses.connecting, googleOAuthStatuses.restoring].includes(googleOAuthState.status);
  const isConnected = googleOAuthState.status === googleOAuthStatuses.connected;
  connectGoogleButton.disabled = isBusy;
  connectGoogleButton.hidden = isConnected;
  disconnectGoogleButton.disabled = isBusy;
  disconnectGoogleButton.hidden = !isConnected;

  renderAdvancedSyncDiagnostics(getGoogleOAuthDiagnosticRows(), getDirectSheetsDiagnosticRows());
  updateBackupPanelOpenState();

  googleOAuthStatusArea.className = `connection-status oauth-status subtle-identity is-${getGoogleOAuthStatusClass()}`;
  const summaryIdentity = isConnected ? "Connected" : getGoogleOAuthPanelSummaryText();
  if (googleSyncIdentity) {
    googleSyncIdentity.hidden = false;
    googleSyncIdentity.textContent = summaryIdentity;
    googleSyncIdentity.title = summaryIdentity;
  }
  if (googleSyncHelper) {
    googleSyncHelper.hidden = true;
    googleSyncHelper.textContent = "";
  }
  googleOAuthStatusArea.hidden = isConnected;
  googleOAuthStatusArea.textContent = isConnected ? "" : googleOAuthState.message;
}

function getWorkerApiUrl(path) {
  return path;
}

async function fetchWorkerJson(path, options = {}) {
  const response = await fetch(getWorkerApiUrl(path), {
    ...options,
    credentials: "include",
    headers: {
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.headers || {}),
    },
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = typeof payload.error === "string" && payload.error.trim()
      ? payload.error.trim()
      : (typeof payload.message === "string" && payload.message.trim()
        ? payload.message.trim()
        : `Worker request failed (${response.status}).`);
    const error = new Error(formatWorkerApiErrorMessage(message, payload));
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
}

function formatWorkerApiErrorMessage(message, payload) {
  const details = [];
  if (Array.isArray(payload?.missingHeaders) && payload.missingHeaders.length) {
    details.push(`Missing: ${payload.missingHeaders.join(", ")}.`);
  }
  if (Array.isArray(payload?.duplicateHeaders) && payload.duplicateHeaders.length) {
    details.push(`Duplicates: ${payload.duplicateHeaders.join(", ")}.`);
  }
  if (Array.isArray(payload?.recognizedHeaders)) {
    details.push(`Recognized row 1 headers: ${payload.recognizedHeaders.length ? payload.recognizedHeaders.join(", ") : "none"}.`);
  }
  if (Array.isArray(payload?.expectedHeaders) && payload.expectedHeaders.length) {
    details.push(`Expected approved headers: ${payload.expectedHeaders.join(", ")}.`);
  }
  return [message, ...details].filter(Boolean).join(" ");
}

function consumeAuthReturnQuery() {
  const url = new URL(window.location.href);
  if (url.searchParams.get("auth") !== "connected") {
    return false;
  }

  url.searchParams.delete("auth");
  const nextUrl = `${url.pathname}${url.search}${url.hash}`;
  window.history.replaceState(window.history.state, document.title, nextUrl);
  return true;
}

async function refreshWorkerSessionStatus(options = {}) {
  const isAuthReturn = options.authReturn === true;
  setGoogleOAuthState({
    status: googleOAuthStatuses.connecting,
    userDisconnectedGoogle: false,
    message: isAuthReturn ? "Finishing Google connection..." : "Checking connection...",
    lastErrorMessage: "",
  });

  try {
    const status = await fetchWorkerJson("/api/status");
    if (status.authenticated) {
      const now = new Date().toISOString();
      const returnedSheetId = String(status.sheetId || "").trim();
      const workerVersion = String(status.workerVersion || "");
      const schemaMode = String(status.schemaMode || "");
      if (returnedSheetId && !directSheetsState.spreadsheetId) {
        setDirectSheetsState({
          spreadsheetId: returnedSheetId,
          spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${returnedSheetId}/edit`,
          spreadsheetName: String(status.sheetName || directSheetsState.spreadsheetName || walmartGcDataSheetName),
          status: directSheetsStatuses.ready,
          remoteSheetVersion: String(status.sheetVersion || directSheetsState.remoteSheetVersion || ""),
          message: "Saved sheet metadata restored from the durable Google session.",
          lastErrorMessage: "",
          workerVersion,
          schemaMode,
        });
      }
      setGoogleOAuthState({
        status: googleOAuthStatuses.connected,
        connectedEmail: String(status.email || googleOAuthState.connectedEmail || ""),
        connectedName: String(status.name || googleOAuthState.connectedName || ""),
        connectedAt: googleOAuthState.connectedAt || now,
        lastAuthorizedAt: now,
        tokenExpiresAt: "",
        userDisconnectedGoogle: false,
        message: "Google account connected.",
        lastErrorMessage: "",
        workerVersion,
        schemaMode,
      });
      return true;
    }

    setGoogleOAuthState({
      status: googleOAuthStatuses.disconnected,
      connectedEmail: "",
      connectedName: "",
      connectedAt: "",
      lastAuthorizedAt: "",
      tokenExpiresAt: "",
      userDisconnectedGoogle: false,
      message: "Connect Google to enable durable sync.",
      lastErrorMessage: "",
      workerVersion: String(status.workerVersion || googleOAuthState.workerVersion || ""),
      schemaMode: String(status.schemaMode || googleOAuthState.schemaMode || ""),
    });
    return false;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Worker session status is unavailable.";
    setGoogleOAuthState({
      status: googleOAuthStatuses.error,
      tokenExpiresAt: "",
      message: "Connection unavailable. Local data remains available.",
      lastErrorMessage: message,
    });
    return false;
  }
}

function connectGoogleAccount() {
  if (navigator.onLine === false) {
    setGoogleOAuthState({
      status: googleOAuthStatuses.error,
      message: "Connection unavailable. Local data remains available.",
      lastErrorMessage: "Browser is offline.",
    });
    return;
  }

  setGoogleOAuthState({
    status: googleOAuthStatuses.connecting,
    userDisconnectedGoogle: false,
    message: "Redirecting to Google sign-in...",
    lastErrorMessage: "",
  });
  window.location.href = getWorkerApiUrl("/auth/init");
}

async function disconnectGoogleAccount() {
  setGoogleOAuthState({
    status: googleOAuthStatuses.connecting,
    message: "Disconnecting Google...",
    lastErrorMessage: "",
  });

  try {
    await fetchWorkerJson("/api/logout", { method: "POST" });
    setGoogleOAuthState({
      status: googleOAuthStatuses.disconnected,
      connectedEmail: "",
      connectedName: "",
      connectedAt: "",
      lastAuthorizedAt: "",
      tokenExpiresAt: "",
      userDisconnectedGoogle: true,
      message: "Google account disconnected. Local cards and saved Sheet settings were not changed.",
      lastErrorMessage: "",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Worker logout is unavailable.";
    setGoogleOAuthState({
      status: googleOAuthStatuses.error,
      message: "Connection unavailable. Local data remains available.",
      lastErrorMessage: message,
    });
  }
}

function getSyncStatusLabel() {
  if (syncState.status === syncStatuses.connected) {
    return "Connected";
  }

  if (syncState.status === syncStatuses.conflict) {
    return "Conflict";
  }

  return "Unsynced";
}

function canAutoSyncToSheets() {
  return Boolean(
    hasWorkerGoogleSession()
      && syncState.lastKnownSheetVersion
      && syncState.status !== syncStatuses.conflict,
  );
}

function downloadSessionCsvBackup() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  exportCurrentCardsCsv(`walmart-gift-cards-session-backup-${timestamp}.csv`);
  renderValidationWarnings([], "Downloaded a CSV backup of the current local session.");
}

async function postCompletedActionToSheets(action, payload, successMessage, options = {}) {
  const pendingOperation = normalizePendingSyncOperation(options.pendingOperation ?? {
    action,
    payload,
    successMessage,
    description: action === "batchUpdate" ? "local card updates" : "card update",
  });

  if (!canAutoSyncToSheets()) {
    const message = options.noAutoSyncMessage
      || (isDirectSheetsConfigured()
        ? (hasWorkerGoogleSession()
          ? "Saved locally. Load or initialize Walmart-GC Data before syncing so Walmart-GC can verify the current sheet version."
          : "Saved locally. Connect Google to sync.")
        : "Saved locally. Connect Google before syncing through the Worker.");
    setSyncState({
      status: syncState.status === syncStatuses.conflict ? syncStatuses.conflict : syncStatuses.unsynced,
      lastSyncAttemptTimestamp: new Date().toISOString(),
      message,
      lastErrorMessage: message,
      pendingOperation,
    });
    setDirectSheetsState({
      status: syncState.status === syncStatuses.conflict ? directSheetsStatuses.conflict : directSheetsStatuses.error,
      pendingUnsynced: true,
      message,
      lastErrorMessage: message,
    });
    return;
  }

  await syncCardsToDirectSheets({
    pendingOperation,
    successMessage,
    startMessage: options.startMessage || "Syncing completed action to Google Sheets...",
  });
}

function getRecoveryUnavailableMessage() {
  if (!isDirectSheetsConfigured()) {
    return "Connect Google to create or locate Walmart-GC Data before using Sheets recovery actions.";
  }

  if (!hasGoogleFileAccessInMemory()) {
    return hasWorkerGoogleSession()
      ? "Load or initialize Walmart-GC Data before using Google Sheets recovery actions."
      : "Connect Google to sync.";
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
          <button class="secondary-button" type="button" data-sync-recovery="download-backup">Download backup CSV</button>
          <button class="primary-button" type="button" data-sync-recovery="refresh-from-sheets" ${disableSheetsActions ? "disabled" : ""}>Replace local data from Sheet</button>
          <button class="danger-button" type="button" data-sync-recovery="use-current-session" ${disableSheetsActions ? "disabled" : ""}>Overwrite sheet with this session</button>
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
          <p><strong>Replace local data from Sheet</strong> overwrites this browser session with the Sheet only after you press the button. Download a backup CSV first if you want a copy of the current session.</p>
          ${unavailableMessage ? `<p class="recovery-warning">${escapeHtml(unavailableMessage)}</p>` : ""}
        </div>
        <div class="recovery-action-grid">
          <button class="primary-button" type="button" data-sync-recovery="retry-sync" ${disableSheetsActions ? "disabled" : ""}>Try sync again</button>
          <button class="secondary-button" type="button" data-sync-recovery="refresh-from-sheets" ${disableSheetsActions ? "disabled" : ""}>Replace local data from Sheet</button>
          <button class="secondary-button" type="button" data-sync-recovery="download-backup">Download backup CSV</button>
        </div>
      </div>
    `;
    return;
  }

  syncRecoveryActions.hidden = true;
  syncRecoveryActions.innerHTML = "";
}


function getAppSyncSummaryState() {
  const isChecking = [googleOAuthStatuses.connecting, googleOAuthStatuses.restoring].includes(googleOAuthState.status)
    || [directSheetsStatuses.checking, directSheetsStatuses.creating, directSheetsStatuses.syncing].includes(directSheetsState.status);

  if (isChecking) {
    return {
      key: "checking",
      label: "Checking sync",
      help: "Local cards stay available",
    };
  }

  if (syncState.status === syncStatuses.conflict || directSheetsState.status === directSheetsStatuses.conflict) {
    return {
      key: "conflict",
      label: "Sync conflict",
      help: "Open backup and sync",
    };
  }

  const hasPendingLocalChanges = Boolean(syncState.pendingOperation || directSheetsState.pendingUnsynced);

  if (navigator.onLine === false || googleOAuthState.status === googleOAuthStatuses.error || directSheetsState.status === directSheetsStatuses.error) {
    return {
      key: "unavailable",
      label: "Sync unavailable",
      help: hasPendingLocalChanges ? "Open backup and sync" : "Local cards available",
    };
  }

  if (hasPendingLocalChanges || syncState.status === syncStatuses.unsynced && hasWorkerGoogleSession()) {
    return {
      key: "unsynced",
      label: "Unsynced changes",
      help: "Open backup and sync",
    };
  }

  if (hasWorkerGoogleSession() && directSheetsState.status === directSheetsStatuses.ready) {
    return {
      key: "connected",
      label: "Connected",
      help: "Google Sheets sync ready",
    };
  }

  return {
    key: "local-only",
    label: "Local only",
    help: "Connect in backup and sync",
  };
}

function renderAppSyncSummary() {
  const summary = getAppSyncSummaryState();

  if (appSyncSummary) {
    appSyncSummary.dataset.syncSummary = summary.key;
    appSyncSummary.setAttribute("aria-label", `${summary.label}. ${summary.help}. Open backup and sync.`);
    appSyncSummary.innerHTML = `
      <span class="app-sync-summary-label">${escapeHtml(summary.label)}</span>
      <span class="app-sync-summary-help">${escapeHtml(summary.help)}</span>
    `;
  }


  if (checkoutFeedback && checkoutFeedback.dataset.temporary !== "true") {
    checkoutFeedback.dataset.syncSummary = summary.key;
    checkoutFeedback.textContent = `${summary.label} · ${summary.help}`;
    checkoutFeedback.hidden = false;
  }
}


function renderConnectionState() {
  const isBusy = [directSheetsStatuses.checking, directSheetsStatuses.syncing].includes(directSheetsState.status);
  renderSyncRecoveryActions(isBusy);
  renderAppSyncSummary();
}

function makeDirectSheetsError(message, status = "") {
  const error = new Error(message);
  error.status = status;
  return error;
}


async function ensureWalmartGcDataSheet() {
  if (!hasWorkerGoogleSession()) {
    throw makeDirectSheetsError("Connect Google to sync.");
  }

  setDirectSheetsState({
    status: directSheetsStatuses.checking,
    message: `Asking Worker to find or create ${walmartGcDataSheetName}...`,
    lastErrorMessage: "",
  });

  const sheet = await fetchWorkerJson("/api/sheet/ensure", { method: "POST" });
  const spreadsheetId = String(sheet.sheetId || "").trim();
  if (!sheet.ok || !spreadsheetId) {
    throw makeDirectSheetsError("Worker did not return an active Walmart-GC Data sheet.");
  }

  setDirectSheetsState({
    spreadsheetId,
    spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
    spreadsheetName: String(sheet.sheetName || walmartGcDataSheetName),
    status: directSheetsStatuses.ready,
    cardsSheetInitialized: "yes",
    remoteSheetVersion: String(sheet.sheetVersion || ""),
    message: "Worker sync backend is ready.",
    lastErrorMessage: "",
  });
  return {
    id: spreadsheetId,
    name: String(sheet.sheetName || walmartGcDataSheetName),
    sheetVersion: String(sheet.sheetVersion || ""),
    lastUpdated: String(sheet.lastUpdated || ""),
  };
}

// Post-connect Sheet setup intentionally remains user-directed during Phase 11:
// after OAuth returns, users choose Fix Google Sheet, Import from Google, or Export to Google so
// local cards are never replaced or uploaded automatically.

function openActiveGoogleSheet() {
  const sheetUrl = getDirectSheetsDisplayUrl();
  if (!sheetUrl) {
    setDirectSheetsState({
      status: directSheetsStatuses.notConfigured,
      message: "Connect Google to create or locate Walmart-GC Data before opening the sheet.",
      lastErrorMessage: "No active Sheet ID configured.",
    });
    return;
  }
  window.open(sheetUrl, "_blank", "noopener");
}

async function initializeDirectSheetStructure() {
  setDirectSheetsState({
    status: directSheetsStatuses.checking,
    message: "Initializing Walmart-GC Data structure through the Worker...",
    lastErrorMessage: "",
  });

  try {
    const sheet = await ensureWalmartGcDataSheet();
    const now = new Date().toISOString();
    syncState = {
      ...syncState,
      status: syncStatuses.connected,
      lastSyncAttemptTimestamp: now,
      lastKnownSheetVersion: sheet.sheetVersion,
      message: "Walmart-GC Data initialized. Completed local actions can now sync through the Worker.",
      lastErrorMessage: "",
      pendingOperation: null,
    };
    setDirectSheetsState({
      spreadsheetName: sheet.name,
      status: directSheetsStatuses.ready,
      cardsSheetInitialized: "yes",
      remoteSheetVersion: sheet.sheetVersion,
      pendingUnsynced: false,
      message: "Walmart-GC Data initialized with Cards headers and metadata.",
      lastErrorMessage: "",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Walmart-GC Data initialization failed.";
    const isHeaderError = isCardsHeaderError(message);
    setDirectSheetsState({
      status: isHeaderError ? directSheetsStatuses.needsAttention : directSheetsStatuses.error,
      cardsSheetInitialized: "unknown",
      message: message === "Not authenticated" ? "Connect Google to sync." : message,
      lastErrorMessage: message,
    });
    setSyncState({ status: syncStatuses.unsynced, lastErrorMessage: message });
  }
}

async function loadCardsFromDirectSheets() {
  setDirectSheetsState({
    status: directSheetsStatuses.checking,
    message: "Loading cards from Google Sheets through the Worker...",
    lastErrorMessage: "",
  });
  setSyncState({
    lastSyncAttemptTimestamp: new Date().toISOString(),
    message: "Loading cards from Google Sheets through the Worker...",
  });

  try {
    const result = await fetchWorkerJson("/api/cards/load");
    const loadedCards = normalizeStoredCards(result.cards || []);
    const now = new Date().toISOString();
    const spreadsheetId = String(result.sheetId || "").trim();
    sampleGiftCards.splice(0, sampleGiftCards.length, ...loadedCards);
    loadedCardsFromStorage = true;
    selectedCardIndex = loadedCards.length > 0 ? 0 : -1;
    detailNumberRevealed = false;
    syncState = {
      ...syncState,
      status: syncStatuses.connected,
      lastSyncTimestamp: now,
      lastSyncAttemptTimestamp: now,
      lastKnownSheetVersion: String(result.sheetVersion || ""),
      message: "Loaded from Walmart-GC Data. Completed actions will now sync through the Worker.",
      lastErrorMessage: "",
      pendingOperation: null,
    };
    setDirectSheetsState({
      spreadsheetId,
      spreadsheetUrl: spreadsheetId ? `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit` : directSheetsState.spreadsheetUrl,
      spreadsheetName: String(result.sheetName || walmartGcDataSheetName),
      status: directSheetsStatuses.ready,
      cardsSheetInitialized: "yes",
      remoteSheetVersion: String(result.sheetVersion || ""),
      lastSuccessfulSyncAt: now,
      pendingUnsynced: false,
      message: `Loaded ${loadedCards.length} card${loadedCards.length === 1 ? "" : "s"} from Walmart-GC Data.`,
      lastErrorMessage: "",
    });
    saveAppState();
    refreshRawCardData(`Loaded ${loadedCards.length} card${loadedCards.length === 1 ? "" : "s"} from Walmart-GC Data into this session.`);
    renderApp(selectedCardIndex);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Worker Google Sheets load failed.";
    const isHeaderError = isCardsHeaderError(message);
    setDirectSheetsState({
      status: isHeaderError ? directSheetsStatuses.needsAttention : directSheetsStatuses.error,
      message: message === "Not authenticated" ? "Connect Google to sync." : message,
      lastErrorMessage: message,
    });
    setSyncState({ status: syncStatuses.unsynced, lastErrorMessage: message });
  }
}

async function detectDirectSheetsConflict(remoteVersion) {
  const localVersion = String(syncState.lastKnownSheetVersion || "").trim();
  if (!localVersion) {
    return false;
  }
  return !remoteVersion || remoteVersion !== localVersion;
}

async function syncCardsToDirectSheets(options = {}) {
  if (!hasWorkerGoogleSession()) {
    throw makeDirectSheetsError("Connect Google to sync.");
  }

  setDirectSheetsState({
    status: directSheetsStatuses.syncing,
    pendingUnsynced: true,
    message: options.startMessage || "Syncing current local cards to Google Sheets through the Worker...",
    lastErrorMessage: "",
  });
  setSyncState({
    lastSyncAttemptTimestamp: new Date().toISOString(),
    message: options.startMessage || "Syncing current local cards to Google Sheets through the Worker...",
    pendingOperation: options.pendingOperation || {
      action: "batchUpdate",
      payload: { cards: cloneStateValue(sampleGiftCards) },
      successMessage: options.successMessage || "Sync succeeded.",
      description: "current local cards",
    },
  });

  try {
    const baseSheetVersion = options.force
      ? String(directSheetsState.remoteSheetVersion || syncState.lastKnownSheetVersion || "")
      : String(syncState.lastKnownSheetVersion || "");
    const result = await fetchWorkerJson("/api/cards/save", {
      method: "POST",
      body: JSON.stringify({
        cards: sampleGiftCards,
        baseSheetVersion,
      }),
    });
    const now = new Date().toISOString();
    const spreadsheetId = String(result.sheetId || directSheetsState.spreadsheetId || "").trim();
    syncState = {
      ...syncState,
      status: syncStatuses.connected,
      lastSyncTimestamp: now,
      lastSyncAttemptTimestamp: now,
      lastKnownSheetVersion: String(result.sheetVersion || ""),
      message: options.successMessage || "Sync succeeded. Current local cards were saved to Google Sheets.",
      lastErrorMessage: "",
      pendingOperation: null,
    };
    setDirectSheetsState({
      spreadsheetId,
      spreadsheetUrl: spreadsheetId ? `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit` : directSheetsState.spreadsheetUrl,
      spreadsheetName: String(result.sheetName || walmartGcDataSheetName),
      status: directSheetsStatuses.ready,
      cardsSheetInitialized: "yes",
      remoteSheetVersion: String(result.sheetVersion || ""),
      lastSuccessfulSyncAt: now,
      pendingUnsynced: false,
      message: options.successMessage || `Synced ${sampleGiftCards.length} card${sampleGiftCards.length === 1 ? "" : "s"} through the secure Worker backend.`,
      lastErrorMessage: "",
    });
    return true;
  } catch (error) {
    const payload = error?.payload || {};
    if (payload.conflict) {
      const remoteVersion = String(payload.remoteSheetVersion || "");
      const message = "Conflict detected: the Google Sheet changed since your last successful load or sync. Nothing was overwritten.";
      setDirectSheetsState({
        status: directSheetsStatuses.conflict,
        cardsSheetInitialized: "yes",
        remoteSheetVersion: remoteVersion,
        pendingUnsynced: true,
        message,
        lastErrorMessage: message,
      });
      setSyncState({
        status: syncStatuses.conflict,
        message,
        lastErrorMessage: message,
      });
      return false;
    }

    const message = error instanceof Error ? error.message : "Worker Google Sheets sync failed.";
    const isHeaderError = isCardsHeaderError(message);
    setDirectSheetsState({
      status: isHeaderError ? directSheetsStatuses.needsAttention : directSheetsStatuses.error,
      pendingUnsynced: true,
      message: message === "Not authenticated" ? "Connect Google to sync." : message,
      lastErrorMessage: message,
    });
    setSyncState({
      status: syncStatuses.unsynced,
      message: "Saved locally, but Google Sheets sync failed. Local data remains in this browser.",
      lastErrorMessage: message,
    });
    return false;
  }
}

async function useCurrentSessionToOverwriteDirectSheets() {
  const backupRecommended = window.confirm(
    "Overwrite sheet with this session will replace every card row in the configured Google sheet with this browser session. Download a backup CSV before continuing. Press OK only if you already downloaded a backup or intentionally choose to continue without one.",
  );
  if (!backupRecommended) {
    return;
  }

  const confirmed = window.confirm(
    "Final confirmation: overwrite the configured Google sheet with the current local session now? Walmart-GC will not automatically merge sheet changes.",
  );
  if (!confirmed) {
    return;
  }

  await syncCardsToDirectSheets({
    force: true,
    successMessage: `Overwrote Walmart-GC Data with ${sampleGiftCards.length} current-session card${sampleGiftCards.length === 1 ? "" : "s"}.`,
    startMessage: "Overwriting Walmart-GC Data with the current session...",
  });
}

async function retrySyncCurrentSession() {
  const pendingOperation = normalizePendingSyncOperation(syncState.pendingOperation);

  if (!hasWorkerGoogleSession()) {
    const message = "Sync failed: Connect Google to sync.";
    setSyncState({
      status: syncStatuses.unsynced,
      lastSyncAttemptTimestamp: new Date().toISOString(),
      message,
      lastErrorMessage: message,
    });
    setDirectSheetsState({
      status: directSheetsStatuses.error,
      pendingUnsynced: Boolean(syncState.pendingOperation),
      message,
      lastErrorMessage: message,
    });
    return;
  }

  if (syncState.status === syncStatuses.conflict) {
    setSyncState({
      status: syncStatuses.conflict,
      lastSyncAttemptTimestamp: new Date().toISOString(),
      message: "Conflict detected. Load the remote Sheet or explicitly overwrite it with this session.",
      lastErrorMessage: "Conflict detected. Try sync again will not overwrite Sheet changes automatically.",
    });
    return;
  }

  if (!syncState.lastKnownSheetVersion) {
    const message = "Load or initialize Walmart-GC Data before syncing so Walmart-GC can verify the current sheet version.";
    setSyncState({
      status: syncStatuses.unsynced,
      lastSyncAttemptTimestamp: new Date().toISOString(),
      message,
      lastErrorMessage: message,
    });
    setDirectSheetsState({ status: directSheetsStatuses.error, pendingUnsynced: true, message, lastErrorMessage: message });
    return;
  }

  await syncCardsToDirectSheets({
    pendingOperation: pendingOperation || {
      action: "batchUpdate",
      payload: { cards: cloneStateValue(sampleGiftCards) },
      successMessage: "Sync succeeded. Current local cards were saved to Google Sheets.",
      description: "current local cards",
    },
    successMessage: pendingOperation?.successMessage || "Sync succeeded. Current local cards were saved to Google Sheets.",
    startMessage: `Retrying Google Sheets sync${pendingOperation?.description ? ` for ${pendingOperation.description}` : ""}...`,
  });
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
    await loadCardsFromDirectSheets();
    return;
  }

  if (action === "use-current-session") {
    await useCurrentSessionToOverwriteDirectSheets();
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

let currentPanelName = "list";
let previousPrimaryPanelName = "list";

function getActivePrimaryPanelName() {
  return currentPanelName === "detail" ? "detail" : "list";
}

function openSettingsPanel(options = {}) {
  previousPrimaryPanelName = getActivePrimaryPanelName();
  showPanel("settings", options);
}

function closeSettingsPanel() {
  showPanel(previousPrimaryPanelName || "list");
}

function openBackupAndSyncSettings() {
  openSettingsPanel({ focusBackupSync: true });
}

function showPanel(panelName, options = {}) {
  if (panelName === "detail" && options.selectFirstVisible) {
    const firstVisibleIndex = getVisibleCardIndexes()[0];

    if (firstVisibleIndex !== undefined) {
      selectedCardIndex = firstVisibleIndex;
    }
  }

  const nextPanelName = panelName === "data" ? "settings" : panelName;

  if (["list", "detail"].includes(nextPanelName)) {
    previousPrimaryPanelName = nextPanelName;
  }

  currentPanelName = nextPanelName;

  panelSections.forEach((panel) => {
    panel.hidden = panel.dataset.panelName !== nextPanelName;
  });


  navButtons.forEach((button) => {
    const isActive = button.dataset.panel === nextPanelName;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });

  if (nextPanelName === "detail") {
    renderCardDetail();
  }

  if (nextPanelName === "settings" && options.focusBackupSync) {
    setDetailsOpen(backupSyncSection, true);
    backupSyncSection?.scrollIntoView({ block: "start", behavior: "smooth" });
    backupSyncSection?.querySelector("summary")?.focus?.();
  }
}

function renderUsedIndicator(card) {
  return card.used ? '<span class="status-badge" data-used="true">Used</span>' : "";
}

function renderCardList() {
  const visibleIndexes = getVisibleCardIndexes();
  const visibleTotal = visibleIndexes.reduce((sum, cardIndex) => sum + sampleGiftCards[cardIndex].currentBalance, 0);

  cardCount.textContent = `${visibleIndexes.length}/${sampleGiftCards.length}`;
  if (cardTotalBalance) {
    cardTotalBalance.textContent = formatBalance(visibleTotal);
  }
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
        <span class="card-number card-list-text">${maskCardNumber(card.cardNumber)}</span>
        <span class="card-row-right">
          ${renderUsedIndicator(card)}
          <span class="money-value card-balance${card.used ? " is-used-balance" : ""}">${formatBalance(card.currentBalance)}</span>
        </span>
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
  detailPin && (detailPin.textContent = "—");
  detailStartingBalance && (detailStartingBalance.textContent = "—");
  detailCurrentBalance && (detailCurrentBalance.textContent = "—");
  detailDateAdded && (detailDateAdded.textContent = "—");
  detailCurrentDateLabel && (detailCurrentDateLabel.textContent = "Date updated");
  detailCurrentDate && (detailCurrentDate.textContent = "—");
  currentBalanceCard?.classList.remove("used-balance-card");
  detailNotes.textContent = "No card selected.";
  if (fullscreenNotes) {
    fullscreenNotes.textContent = "No notes";
  }
  if (openNotesModalButton) {
    openNotesModalButton.disabled = true;
  }
  cardPosition.textContent = "0/0";
  previousButton.disabled = true;
  nextButton.disabled = true;
  markUsedButton.disabled = true;
  openBalanceModalButton.disabled = true;
  barcodeOpenButton.disabled = true;
  detailBarcodeActionLabel.textContent = "Focus barcode";
  detailBarcodeBalance.textContent = "—";
  detailBarcodePin.textContent = "PIN —";
  clearRenderedBarcode(detailBarcodeRender, detailBarcodeStatus, detailBarcodeCaption);
  clearRenderedBarcode(fullscreenBarcodeRender, fullscreenBarcodeStatus, fullscreenBarcodeCaption);
  fullscreenCardNumber.textContent = "Card —";
  fullscreenPin.textContent = "PIN —";
  fullscreenCurrentBalance.textContent = "—";
  fullscreenPosition.textContent = "0/0";
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
  detailPin && (detailPin.textContent = card.pin);
  detailStartingBalance && (detailStartingBalance.textContent = formatBalance(card.startingBalance));
  detailCurrentBalance && (detailCurrentBalance.textContent = formatBalance(card.currentBalance));
  detailDateAdded && (detailDateAdded.textContent = formatDate(card.dateAdded));
  detailCurrentDateLabel && (detailCurrentDateLabel.textContent = card.used ? "Date used" : "Date updated");
  detailCurrentDate && (detailCurrentDate.textContent = formatDate(card.used ? card.dateUsed : card.dateUpdated));
  currentBalanceCard?.classList.toggle("used-balance-card", card.used);
  detailNotes.textContent = card.notes || "Add note";
  if (openNotesModalButton) {
    openNotesModalButton.disabled = false;
  }
  cardPosition.textContent = `${visiblePosition + 1}/${visibleIndexes.length}`;
  previousButton.disabled = visiblePosition <= 0;
  nextButton.disabled = visiblePosition === visibleIndexes.length - 1;
  markUsedButton.disabled = false;
  markUsedButton.textContent = card.used ? "Unmark used" : "Mark used";
  openBalanceModalButton.disabled = false;
  barcodeOpenButton.disabled = false;
  detailBarcodeActionLabel.textContent = "Focus barcode";
  detailBarcodeBalance.textContent = formatBalance(card.currentBalance);
  detailBarcodePin.textContent = `PIN ${card.pin}`;
  detailBarcodeCaption.textContent = maskCardNumber(card.cardNumber);
  renderBarcode(detailBarcodeRender, detailBarcodeStatus, detailBarcodeCaption, card, { height: 82 });
  detailBarcodeCaption.textContent = maskCardNumber(card.cardNumber);
  renderBarcode(fullscreenBarcodeRender, fullscreenBarcodeStatus, fullscreenBarcodeCaption, card, { height: 132, moduleWidth: 3 });
  fullscreenPosition.textContent = `${visiblePosition + 1}/${visibleIndexes.length}`;
  const fullscreenCardIdentifier = maskCardNumber(card.cardNumber);
  fullscreenCardNumber.textContent = fullscreenCardIdentifier;
  fullscreenBarcodeCaption.textContent = "";
  fullscreenBarcodeCaption.hidden = true;
  fullscreenPin.textContent = `PIN ${card.pin}`;
  fullscreenCurrentBalance.textContent = formatBalance(card.currentBalance);
  fullscreenPreviousButton.disabled = visiblePosition <= 0;
  fullscreenNextButton.disabled = visiblePosition === visibleIndexes.length - 1;
  fullscreenMarkUsedButton.disabled = card.used;
  fullscreenUpdateBalanceButton.disabled = false;
  if (fullscreenNotes) {
    fullscreenNotes.textContent = card.notes || "No notes";
  }
}


function renderApp(preferredIndex) {
  ensureVisibleSelection(preferredIndex);
  renderCardList();
  renderCardDetail();
}

function showCheckoutFeedback(message, options = {}) {
  if (!checkoutFeedback) {
    return;
  }

  window.clearTimeout(checkoutFeedbackTimer);
  checkoutFeedback.classList.remove("is-hiding");
  checkoutFeedback.dataset.temporary = "true";
  checkoutFeedback.textContent = message;
  checkoutFeedback.hidden = false;

  const dismissMs = options.dismissMs ?? 3000;
  if (dismissMs > 0) {
    checkoutFeedbackTimer = window.setTimeout(() => {
      checkoutFeedback.classList.add("is-hiding");
      checkoutFeedbackTimer = window.setTimeout(() => {
        checkoutFeedback.classList.remove("is-hiding");
        delete checkoutFeedback.dataset.temporary;
        renderAppSyncSummary();
      }, 240);
    }, dismissMs);
  }
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
  const feedbackMessage = updatedCard.used ? "Marked used locally." : "Marked unused locally.";
  saveAppState();

  if (card.used && advanceOnMarkUsed) {
    const nextPreferredIndex = visibleIndexesBefore[visiblePositionBefore + 1]
      ?? visibleIndexesBefore[visiblePositionBefore - 1]
      ?? selectedCardIndex;
    renderApp(nextPreferredIndex);
  } else {
    renderApp(selectedCardIndex);
  }
  showCheckoutFeedback(feedbackMessage);

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
    setBalanceModalError("Enter amount used or remaining balance.");
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
    setBalanceModalError("Remaining balance cannot be negative.");
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
    showCheckoutFeedback("Balance updated locally.");
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

function openConfirmModal({ title, message, confirmLabel = "Confirm", confirmClass = "danger-button compact-danger", onConfirm, returnFocusElement }) {
  pendingConfirmAction = typeof onConfirm === "function" ? onConfirm : null;
  confirmReturnFocusElement = returnFocusElement || null;
  confirmModalTitle.textContent = title;
  confirmModalMessage.textContent = message;
  confirmZeroUsedButton.textContent = confirmLabel;
  confirmZeroUsedButton.className = confirmClass;
  confirmZeroUsedButton.disabled = !pendingConfirmAction;
  confirmModal.hidden = false;
  cancelConfirmButton.focus();
}

function openZeroBalanceConfirm() {
  const zeroBalanceIndexes = getZeroBalanceCardIndexes();

  if (zeroBalanceIndexes.length === 0) {
    openConfirmModal({
      title: "Mark $0 cards used",
      message: "There are no unmarked zero-balance cards to update.",
      confirmLabel: "Mark",
      onConfirm: null,
      returnFocusElement: markZeroUsedButton,
    });
    return;
  }

  openConfirmModal({
    title: "Mark $0 cards used?",
    message: `Mark ${zeroBalanceIndexes.length} zero-balance card${zeroBalanceIndexes.length === 1 ? "" : "s"} as Used?`,
    confirmLabel: "Mark",
    onConfirm: markZeroBalanceCardsUsed,
    returnFocusElement: markZeroUsedButton,
  });
}

function closeConfirmModal() {
  confirmModal.hidden = true;
  const focusTarget = confirmReturnFocusElement;
  pendingConfirmAction = null;
  confirmReturnFocusElement = null;
  if (focusTarget && typeof focusTarget.focus === "function") {
    focusTarget.focus();
  }
}

async function runPendingConfirmAction() {
  const action = pendingConfirmAction;
  const focusTarget = confirmReturnFocusElement;
  if (!action) {
    closeConfirmModal();
    return;
  }
  confirmModal.hidden = true;
  pendingConfirmAction = null;
  confirmReturnFocusElement = null;
  await action();
  if (focusTarget && typeof focusTarget.focus === "function") {
    focusTarget.focus();
  }
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

function openNotesModal() {
  if (selectedCardIndex < 0) {
    return;
  }
  const card = sampleGiftCards[selectedCardIndex];
  notesModalContext.textContent = `${maskCardNumber(card.cardNumber)} · PIN ${card.pin}`;
  notesInput.value = card.notes || "";
  notesModal.hidden = false;
  notesInput.focus();
}

function closeNotesModal() {
  notesModal.hidden = true;
  if (openNotesModalButton && typeof openNotesModalButton.focus === "function") {
    openNotesModalButton.focus();
  }
}

function saveNotesUpdate() {
  if (selectedCardIndex < 0) {
    closeNotesModal();
    return;
  }
  const card = sampleGiftCards[selectedCardIndex];
  card.notes = notesInput.value.trim();
  const updatedCard = cloneStateValue(card);
  saveAppState();
  closeNotesModal();
  renderApp(selectedCardIndex);
  showCheckoutFeedback("Notes saved locally.");
  postCompletedActionToSheets(
    "updateCard",
    { card: updatedCard },
    "Saved notes update to Sheets.",
  );
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

// Archived fullscreen barcode dialog — retained for possible future reversion.
// The old full-screen dialog flow is inactive; this handler now opens compact barcode focus mode.
function openBarcodeFocusMode() {
  if (selectedCardIndex < 0) {
    return;
  }

  renderCardDetail();
  fullscreenBarcode.hidden = false;
  requestCheckoutWakeLock();
  fullscreenUpdateBalanceButton.focus();
}

function closeBarcodeFocusMode(options = {}) {
  fullscreenBarcode.hidden = true;
  releaseCheckoutWakeLock();

  if (!options.skipFocus) {
    barcodeOpenButton.focus();
  }
}

function openRawDataModal() {
  refreshRawCardData("Raw CSV editor opened with current local session data.");
  rawDataModalInitialValue = rawDataInput.value;
  setRawDataLocked(true);
  rawDataModal.hidden = false;
  toggleDataLockButton.focus();
}

function closeRawDataModal(options = {}) {
  rawDataModal.hidden = true;
  setRawDataLocked(true);
  rawDataModalInitialValue = "";

  if (!options.skipFocus) {
    openRawDataModalButton?.focus();
  }
}

function cancelRawDataModal() {
  if (rawDataInput.value === rawDataModalInitialValue) {
    closeRawDataModal();
    return;
  }

  openConfirmModal({
    title: "Discard raw CSV edits?",
    message: "Discard raw CSV edits and close the editor?",
    confirmLabel: "Discard",
    confirmClass: "danger-button",
    onConfirm: () => closeRawDataModal(),
    returnFocusElement: cancelRawDataUpdateButton,
  });
}

function doneRawDataModal() {
  if (rawDataInput.value === rawDataModalInitialValue) {
    closeRawDataModal();
    return;
  }

  openConfirmModal({
    title: "Apply raw CSV changes?",
    message: "Apply raw CSV changes using the existing validation and import path?",
    confirmLabel: "Apply",
    confirmClass: "secondary-button",
    onConfirm: async () => {
      const applied = await updateRawCardData();
      if (applied) {
        closeRawDataModal();
      }
    },
    returnFocusElement: doneRawDataUpdateButton,
  });
}

function markUsedFromCheckout() {
  if (selectedCardIndex < 0 || sampleGiftCards[selectedCardIndex].used) {
    return;
  }

  const wasFullscreenOpen = !fullscreenBarcode.hidden;
  toggleSelectedUsed();

  if (wasFullscreenOpen) {
    closeBarcodeFocusMode({ skipFocus: true });
    showPanel("detail");
    openBalanceModalButton.focus();
  }
}

async function forceRefreshAppShell() {
  try {
    if ("caches" in window) {
      const names = await caches.keys();
      await Promise.all(names.map((name) => caches.delete(name)));
    }

    if ("serviceWorker" in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));
    }
  } catch {
    // Cache cleanup is best-effort; always continue to a page reload.
  } finally {
    const url = new URL(window.location.href);
    url.searchParams.set("refresh", Date.now().toString());

    try {
      window.location.replace(url.toString());
    } catch {
      window.location.reload();
    }
  }
}

window.addEventListener("online", renderConnectionState);
window.addEventListener("offline", renderConnectionState);

function updateBalanceFromCheckout() {
  if (!fullscreenBarcode.hidden) {
    closeBarcodeFocusMode({ skipFocus: true });
    showPanel("detail");
  }

  openBalanceModal();
}

function isModalOpen() {
  return !balanceModal.hidden || !confirmModal.hidden || !notesModal.hidden || !rawDataModal.hidden;
}

function isEditableGestureTarget(target) {
  return Boolean(target.closest("input, textarea, select, [contenteditable='true']"));
}

let primarySwipeStart = null;

function shouldIgnorePrimarySwipe(target) {
  if (!["list", "detail", "settings"].includes(currentPanelName)) {
    return true;
  }

  if (isModalOpen() || !fullscreenBarcode.hidden) {
    return true;
  }

  return isEditableGestureTarget(target) || Boolean(target.closest(".modal-backdrop"));
}

function handlePrimarySwipeStart(event) {
  if (event.touches.length !== 1 || shouldIgnorePrimarySwipe(event.target)) {
    primarySwipeStart = null;
    return;
  }

  primarySwipeStart = {
    x: event.touches[0].clientX,
    y: event.touches[0].clientY,
    panel: currentPanelName,
  };
}

function handlePrimarySwipeEnd(event) {
  if (!primarySwipeStart || shouldIgnorePrimarySwipe(event.target)) {
    primarySwipeStart = null;
    return;
  }

  const touch = event.changedTouches[0];
  const deltaX = touch.clientX - primarySwipeStart.x;
  const deltaY = touch.clientY - primarySwipeStart.y;
  const swipePanel = primarySwipeStart.panel;
  primarySwipeStart = null;

  if (Math.abs(deltaX) < 80 || Math.abs(deltaY) > 55 || Math.abs(deltaY) > Math.abs(deltaX) * 0.7) {
    return;
  }

  if (deltaX < 0 && swipePanel === "list") {
    showPanel("detail", { selectFirstVisible: true });
  } else if (deltaX > 0 && swipePanel === "detail") {
    showPanel("list");
  } else if (swipePanel === "settings" && deltaX < 0) {
    showPanel("detail", { selectFirstVisible: true });
  } else if (swipePanel === "settings" && deltaX > 0) {
    showPanel("list");
  }
}

let barcodeFocusSwipeStart = null;

function handleBarcodeFocusSwipeStart(event) {
  if (event.touches.length !== 1 || fullscreenBarcode.hidden || isModalOpen() || isEditableGestureTarget(event.target)) {
    barcodeFocusSwipeStart = null;
    return;
  }

  barcodeFocusSwipeStart = {
    x: event.touches[0].clientX,
    y: event.touches[0].clientY,
  };
}

function handleBarcodeFocusSwipeEnd(event) {
  if (!barcodeFocusSwipeStart || fullscreenBarcode.hidden) {
    barcodeFocusSwipeStart = null;
    return;
  }

  const touch = event.changedTouches[0];
  const deltaX = touch.clientX - barcodeFocusSwipeStart.x;
  const deltaY = touch.clientY - barcodeFocusSwipeStart.y;
  barcodeFocusSwipeStart = null;

  if (Math.abs(deltaX) < 80 || Math.abs(deltaY) > 55 || Math.abs(deltaY) > Math.abs(deltaX) * 0.7) {
    return;
  }

  if (deltaX < 0) {
    moveSelection(1);
  } else if (deltaX > 0) {
    moveSelection(-1);
  }
}

appShell?.addEventListener("touchstart", handlePrimarySwipeStart, { passive: true });
appShell?.addEventListener("touchend", handlePrimarySwipeEnd, { passive: true });


navButtons.forEach((button) => {
  button.addEventListener("click", () => {
    showPanel(button.dataset.panel, { selectFirstVisible: button.dataset.panel === "detail" });
  });
});

settingsOpenButton?.addEventListener("click", () => {
  if (currentPanelName === "settings") {
    closeSettingsPanel();
    return;
  }

  openSettingsPanel();
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
openNotesModalButton.addEventListener("click", openNotesModal);
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
cancelNotesUpdateButton.addEventListener("click", closeNotesModal);
saveNotesUpdateButton.addEventListener("click", saveNotesUpdate);
markZeroUsedButton.addEventListener("click", openZeroBalanceConfirm);
forceRefreshAppShellButton.addEventListener("click", forceRefreshAppShell);
cancelConfirmButton.addEventListener("click", closeConfirmModal);
confirmZeroUsedButton.addEventListener("click", runPendingConfirmAction);
barcodeOpenButton.addEventListener("click", openBarcodeFocusMode);
openRawDataModalButton?.addEventListener("click", openRawDataModal);
toggleDataLockButton.addEventListener("click", () => setRawDataLocked(!rawDataLocked));
cancelRawDataUpdateButton.addEventListener("click", cancelRawDataModal);
doneRawDataUpdateButton.addEventListener("click", doneRawDataModal);
refreshCardDataButton.addEventListener("click", () => {
  refreshRawCardData();
  rawDataModalInitialValue = rawDataInput.value;
});
updateCardDataButton.addEventListener("click", () => openConfirmModal({
  title: "Import CSV?",
  message: "This may replace local card data after validation.",
  confirmLabel: "Import",
  confirmClass: "secondary-button",
  onConfirm: async () => {
    const applied = await updateRawCardData();
    if (applied) {
      rawDataModalInitialValue = rawDataInput.value;
      setRawDataLocked(true);
    }
  },
  returnFocusElement: updateCardDataButton,
}));
importCsvButton.addEventListener("click", () => openConfirmModal({
  title: "Import CSV?",
  message: "Importing CSV can replace this browser’s current cards. Export a backup first if needed.",
  confirmLabel: "Choose CSV",
  confirmClass: "primary-button",
  onConfirm: () => csvFileInput.click(),
  returnFocusElement: importCsvButton,
}));
csvFileInput.addEventListener("change", (event) => {
  importCsvFile(event.target.files[0]);
  event.target.value = "";
});
exportCsvButton.addEventListener("click", exportCurrentCardsCsv);
if (initializeDirectSheetButton) {
  initializeDirectSheetButton.addEventListener("click", initializeDirectSheetStructure);
}
if (openDirectSheetButton) {
  openDirectSheetButton.addEventListener("click", openActiveGoogleSheet);
}
loadDirectSheetButton.addEventListener("click", () => openConfirmModal({
  title: "Import from Google?",
  message: "This may replace local card data with Google Sheet data.",
  confirmLabel: "Import",
  confirmClass: "primary-button",
  onConfirm: loadCardsFromDirectSheets,
  returnFocusElement: loadDirectSheetButton,
}));
syncDirectSheetButton.addEventListener("click", () => openConfirmModal({
  title: "Export to Google?",
  message: "This may replace Google Sheet data with local card data.",
  confirmLabel: "Export",
  confirmClass: "primary-button",
  onConfirm: retrySyncCurrentSession,
  returnFocusElement: syncDirectSheetButton,
}));
connectGoogleButton.addEventListener("click", connectGoogleAccount);
disconnectGoogleButton.addEventListener("click", disconnectGoogleAccount);
if (appSyncSummary) {
  appSyncSummary.addEventListener("click", openBackupAndSyncSettings);
}

syncRecoveryActions.addEventListener("click", (event) => {
  const recoveryButton = event.target.closest("[data-sync-recovery]");
  if (!recoveryButton) {
    return;
  }

  handleSyncRecoveryAction(recoveryButton.dataset.syncRecovery);
});
fullscreenBarcode.addEventListener("click", (event) => {
  if (!event.target.closest(".barcode-focus-content")) {
    closeBarcodeFocusMode();
  }
});
fullscreenBarcode.addEventListener("touchstart", handleBarcodeFocusSwipeStart, { passive: true });
fullscreenBarcode.addEventListener("touchend", handleBarcodeFocusSwipeEnd, { passive: true });
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
notesModal.addEventListener("click", (event) => {
  if (event.target === notesModal) {
    closeNotesModal();
  }
});

document.addEventListener("keydown", (event) => {
  if (!fullscreenBarcode.hidden && event.key === "Escape") {
    closeBarcodeFocusMode();
  }

  if (!balanceModal.hidden && event.key === "Escape") {
    closeBalanceModal();
  }

  if (!notesModal.hidden && event.key === "Escape") {
    closeNotesModal();
  }

  if (!confirmModal.hidden && event.key === "Escape") {
    closeConfirmModal();
  }
});

applyAppState(loadAppState());
saveAppState();

hideUsedCheckbox.checked = hideUsedCards;
hideZeroBalanceCheckbox.checked = hideZeroBalanceCards;
sortCardsSelect.value = sortMode;
setRawDataLocked(true);
renderConnectionState();
renderGoogleOAuthState();
renderDirectSheetsState();
const authReturnDetected = consumeAuthReturnQuery();
void refreshWorkerSessionStatus({ authReturn: authReturnDetected });
refreshRawCardData("Loaded current session data into the textarea. Editing is locked.");
renderApp();
showPanel("list");
