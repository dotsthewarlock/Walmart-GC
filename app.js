// Debug file fingerprint: app.js version 1.01.15 (cache/debug only, not a product release).
// These manually maintained values identify loaded static files for cache debugging; they are not product or release versions.
const DEBUG_VERSION_JS = "1.01.15";
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
const syncRecoveryActions = document.querySelector("#sync-recovery-actions");
const connectGoogleButton = document.querySelector("#connect-google");
const disconnectGoogleButton = document.querySelector("#disconnect-google");
const googleOAuthStatusArea = document.querySelector("#google-oauth-status");
const directSheetInput = document.querySelector("#direct-sheet-id");
const saveDirectSheetButton = document.querySelector("#save-direct-sheet");
const initializeDirectSheetButton = document.querySelector("#initialize-direct-sheet");
const openDirectSheetButton = document.querySelector("#open-direct-sheet");
const loadDirectSheetButton = document.querySelector("#load-direct-sheet");
const syncDirectSheetButton = document.querySelector("#sync-direct-sheet");
const directSheetStatusArea = document.querySelector("#direct-sheet-status");

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

const WORKER_BASE_URL = "https://walmart-gc-oauth.dotsthewarlock.com";
const googleDriveSpreadsheetMimeType = "application/vnd.google-apps.spreadsheet";
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
  notConfigured: "Not created",
  ready: "Connected",
  checking: "Finding sheet",
  creating: "Creating sheet",
  syncing: "Syncing",
  conflict: "Conflict",
  error: "Error",
};

const directSheetsSchemaVersion = "1";
const directSheetsCardsTab = "Cards";
const directSheetsMetaTab = "_META";
const directSheetsDefaultTab = "Sheet1";
const directSheetsAppName = "Walmart-GC";

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
        : "Imported data saved locally. Connect Google and load or initialize Walmart-GC Data before syncing so Walmart-GC can verify the current Sheet version.",
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

function isGoogleOAuthConfigured() {
  return Boolean(WORKER_BASE_URL);
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

function hasGoogleFileAccessInMemory() {
  return hasWorkerGoogleSession();
}

function getDirectSheetsDisplayUrl() {
  return directSheetsState.spreadsheetId
    ? `https://docs.google.com/spreadsheets/d/${directSheetsState.spreadsheetId}/edit`
    : "";
}

function renderDirectSheetsState() {
  if (!directSheetStatusArea) {
    return;
  }

  if (directSheetInput) {
    directSheetInput.value = directSheetsState.spreadsheetUrl || directSheetsState.spreadsheetId;
  }
  const isBusy = [directSheetsStatuses.checking, directSheetsStatuses.creating, directSheetsStatuses.syncing].includes(directSheetsState.status);
  if (saveDirectSheetButton) {
    saveDirectSheetButton.disabled = isBusy;
  }
  if (initializeDirectSheetButton) {
    initializeDirectSheetButton.disabled = isBusy;
  }
  if (openDirectSheetButton) {
    openDirectSheetButton.disabled = isBusy || !directSheetsState.spreadsheetId;
  }
  loadDirectSheetButton.disabled = isBusy || !hasWorkerGoogleSession();
  syncDirectSheetButton.disabled = isBusy || !hasWorkerGoogleSession();

  const details = [
    renderDiagnosticRow("Worker session", hasWorkerGoogleSession() ? "Connected" : "Disconnected"),
    renderDiagnosticRow("Connected account", valueOrFallback(googleOAuthState.connectedEmail || googleOAuthState.connectedName)),
    renderDiagnosticRow("Sheet proxy", directSheetsState.status === directSheetsStatuses.error ? "Error" : (directSheetsState.spreadsheetId ? "Ready" : "Not ready")),
    renderDiagnosticRow("Frontend token storage", "None"),
    renderDiagnosticRow("Active sheet ID configured", directSheetsState.spreadsheetId ? "Yes" : "No"),
    renderDiagnosticRow("Active sheet ID", valueOrFallback(directSheetsState.spreadsheetId)),
    renderDiagnosticRow("Active sheet name", valueOrFallback(directSheetsState.spreadsheetName)),
    renderDiagnosticRow("Cards sheet initialized", valueOrFallback(directSheetsState.cardsSheetInitialized)),
    renderDiagnosticRow("Local last known sheetVersion", valueOrFallback(syncState.lastKnownSheetVersion)),
    renderDiagnosticRow("Remote sheetVersion", valueOrFallback(directSheetsState.remoteSheetVersion)),
    renderDiagnosticRow("Sync state", getSyncStatusLabel()),
    renderDiagnosticRow("Unsynced changes", directSheetsState.pendingUnsynced || syncState.pendingOperation ? "Yes" : "No"),
    renderDiagnosticRow("Last successful sync", formatConnectionTimestamp(directSheetsState.lastSuccessfulSyncAt)),
    renderDiagnosticRow("Last Google API error", valueOrFallback(directSheetsState.lastErrorMessage)),
    renderDiagnosticRow("Local card count", String(sampleGiftCards.length)),
  ];

  const sheetLink = getDirectSheetsDisplayUrl();
  directSheetStatusArea.className = `connection-status is-${getDirectSheetsStatusClass()} sync-${syncState.status}`;
  directSheetStatusArea.innerHTML = `
    <div class="connection-status-header">
      <span class="connection-status-dot" aria-hidden="true"></span>
      <strong>${escapeHtml(directSheetsState.status)}</strong>
      <span class="sync-badge">${escapeHtml(getSyncStatusLabel())}</span>
    </div>
    <p>${escapeHtml(directSheetsState.message || defaultDirectSheetsState.message)}</p>
    ${sheetLink ? `<p><a href="${escapeHtml(sheetLink)}" target="_blank" rel="noopener">Open Sheet</a></p>` : ""}
    ${syncState.message ? `<p class="sync-message">${escapeHtml(syncState.message)}</p>` : ""}
    <ul class="diagnostic-list">${details.join("")}</ul>
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

function renderGoogleOAuthState() {
  if (!googleOAuthStatusArea) {
    return;
  }

  const isBusy = [googleOAuthStatuses.connecting, googleOAuthStatuses.restoring].includes(googleOAuthState.status);
  connectGoogleButton.disabled = isBusy;
  disconnectGoogleButton.disabled = isBusy;
  disconnectGoogleButton.hidden = googleOAuthState.status === googleOAuthStatuses.disconnected && !googleOAuthState.connectedEmail;

  const details = [
    renderDiagnosticRow("Worker session backend", WORKER_BASE_URL),
    renderDiagnosticRow("Connection state", googleOAuthState.status),
    renderDiagnosticRow("Connected account", valueOrFallback(googleOAuthState.connectedEmail || googleOAuthState.connectedName)),
    renderDiagnosticRow("Saved Sheet metadata", directSheetsState.spreadsheetId ? "Preserved locally" : "None saved"),
    renderDiagnosticRow("Frontend token storage", "None"),
    renderDiagnosticRow("Session ID storage", "Cookie only"),
    renderDiagnosticRow("Sheet proxy", directSheetsState.spreadsheetId ? "Ready" : "Not ready"),
    renderDiagnosticRow("Last connection error", valueOrFallback(googleOAuthState.lastErrorMessage)),
  ];

  googleOAuthStatusArea.className = `connection-status oauth-status is-${getGoogleOAuthStatusClass()}`;
  googleOAuthStatusArea.innerHTML = `
    <div class="connection-status-header">
      <span class="connection-status-dot" aria-hidden="true"></span>
      <strong>${escapeHtml(googleOAuthState.status)}</strong>
    </div>
    <p>${escapeHtml(googleOAuthState.message || defaultGoogleOAuthState.message)}</p>
    <ul class="diagnostic-list">${details.join("")}</ul>
  `;
}

function getWorkerApiUrl(path) {
  return `${WORKER_BASE_URL}${path}`;
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
    const error = new Error(message);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
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
      if (returnedSheetId && !directSheetsState.spreadsheetId) {
        setDirectSheetsState({
          spreadsheetId: returnedSheetId,
          spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${returnedSheetId}/edit`,
          spreadsheetName: String(status.sheetName || directSheetsState.spreadsheetName || walmartGcDataSheetName),
          status: directSheetsStatuses.ready,
          remoteSheetVersion: String(status.sheetVersion || directSheetsState.remoteSheetVersion || ""),
          message: "Saved Sheet metadata restored from the durable Google session.",
          lastErrorMessage: "",
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
        message: status.email || status.name
          ? `Connected as ${status.email || status.name}.`
          : "Google connected",
        lastErrorMessage: "",
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
    return "Connected/Synced";
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
          ? "Saved locally. Load or initialize Walmart-GC Data before syncing so Walmart-GC can verify the current Sheet version."
          : "Saved locally. Connect Google to sync.")
        : "Saved locally. Connect Google to enable durable sync before syncing.");
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
  const isBusy = [directSheetsStatuses.checking, directSheetsStatuses.syncing].includes(directSheetsState.status);
  renderSyncRecoveryActions(isBusy);
}

function parseSpreadsheetId(value) {
  const rawValue = String(value || "").trim();
  if (!rawValue) {
    return "";
  }

  const urlMatch = rawValue.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (urlMatch) {
    return urlMatch[1];
  }

  if (/^[a-zA-Z0-9-_]{20,}$/.test(rawValue)) {
    return rawValue;
  }

  return "";
}

function getDirectSheetInputValue() {
  return String(directSheetInput?.value || "").trim();
}

function saveDirectSheetFromInput() {
  const inputValue = getDirectSheetInputValue();
  const spreadsheetId = parseSpreadsheetId(inputValue);

  if (!inputValue) {
    setDirectSheetsState(cloneStateValue(defaultDirectSheetsState));
    return;
  }

  if (!spreadsheetId) {
    setDirectSheetsState({
      spreadsheetUrl: inputValue,
      spreadsheetId: "",
      status: directSheetsStatuses.error,
      cardsSheetInitialized: "unknown",
      message: "Enter a valid Google Sheet URL or spreadsheet ID.",
      lastErrorMessage: "Invalid Sheet URL or ID.",
    });
    return;
  }

  const changed = spreadsheetId !== directSheetsState.spreadsheetId;
  if (changed) {
    syncState = cloneStateValue(defaultSyncState);
  }

  setDirectSheetsState({
    spreadsheetId,
    spreadsheetUrl: inputValue,
    spreadsheetName: changed ? "" : directSheetsState.spreadsheetName,
    status: directSheetsStatuses.ready,
    cardsSheetInitialized: changed ? "unknown" : directSheetsState.cardsSheetInitialized,
    remoteSheetVersion: changed ? "" : directSheetsState.remoteSheetVersion,
    lastSuccessfulSyncAt: changed ? "" : directSheetsState.lastSuccessfulSyncAt,
    pendingUnsynced: false,
    message: "Advanced Sheet ID saved locally. Connect Google, then load the Sheet.",
    lastErrorMessage: "",
  });
}

function makeDirectSheetsError(message, status = "") {
  const error = new Error(message);
  error.status = status;
  return error;
}

function getDirectSheetsFriendlyHttpError(status, bodyText = "") {
  if (status === 401) {
    return "Google authorization expired or was rejected. Reconnect Google, then try again.";
  }
  if (status === 403) {
    return "Google file access was denied. Confirm Google Drive API and Google Sheets API are enabled, then reconnect Google.";
  }
  if (status === 404) {
    return "Google could not find this spreadsheet. Check the Sheet ID/URL and account permissions.";
  }
  if (status === 429) {
    return "Google Sheets is rate limiting requests. Wait a moment, then retry sync.";
  }
  if (status >= 500) {
    return "Google Sheets is temporarily unavailable. Local data remains saved; try again later.";
  }
  return bodyText ? `Google Sheets API request failed (${status}): ${bodyText.slice(0, 180)}` : `Google Sheets API request failed (${status}).`;
}

async function getGoogleAccessTokenForDriveFile() {
  if (!isGoogleOAuthConfigured()) {
    throw makeDirectSheetsError("Google OAuth is not configured for this deployment. Add the public OAuth Client ID before deployment.");
  }

  if (navigator.onLine === false) {
    throw makeDirectSheetsError("Google sync is unavailable while offline. Local data remains saved in this browser.");
  }

  throw makeDirectSheetsError(hasWorkerGoogleSession()
    ? "Worker Sheet proxy is ready; retry the sync action."
    : "Connect Google to sync.");
}

async function sheetsFetch(path, options = {}) {
  const accessToken = await getGoogleAccessTokenForDriveFile();
  const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${path}`, {
    ...options,
    headers: {
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.headers || {}),
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const bodyText = await response.text().catch(() => "");
    throw makeDirectSheetsError(getDirectSheetsFriendlyHttpError(response.status, bodyText), response.status);
  }

  if (response.status === 204) {
    return {};
  }

  return response.json();
}

function getDriveFriendlyHttpError(status, bodyText = "") {
  if (status === 401) {
    return "Google authorization expired or was rejected. Reconnect Google, then try again.";
  }
  if (status === 403) {
    return "Google Drive file access was denied. Confirm the Drive API is enabled and reconnect Google.";
  }
  if (status === 404) {
    return "Google Drive could not find the requested file. Reconnect Google, then try again.";
  }
  if (status === 429) {
    return "Google Drive is rate limiting requests. Wait a moment, then retry.";
  }
  if (status >= 500) {
    return "Google Drive is temporarily unavailable. Local data remains saved; try again later.";
  }
  return bodyText ? `Google Drive API request failed (${status}): ${bodyText.slice(0, 180)}` : `Google Drive API request failed (${status}).`;
}

async function driveFetch(path, options = {}) {
  const accessToken = await getGoogleAccessTokenForDriveFile();
  const response = await fetch(`https://www.googleapis.com/drive/v3/${path}`, {
    ...options,
    headers: {
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.headers || {}),
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const bodyText = await response.text().catch(() => "");
    throw makeDirectSheetsError(getDriveFriendlyHttpError(response.status, bodyText), response.status);
  }

  if (response.status === 204) {
    return {};
  }

  return response.json();
}

function escapeDriveQueryValue(value) {
  return String(value ?? "").replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

async function findWalmartGcDataSheet() {
  const query = [
    `name = '${escapeDriveQueryValue(walmartGcDataSheetName)}'`,
    `mimeType = '${googleDriveSpreadsheetMimeType}'`,
    "trashed = false",
  ].join(" and ");
  const searchParams = new URLSearchParams({
    q: query,
    spaces: "drive",
    pageSize: "10",
    orderBy: "modifiedTime desc,name",
    fields: "files(id,name,modifiedTime,webViewLink)",
  });
  const body = await driveFetch(`files?${searchParams.toString()}`);
  const files = Array.isArray(body.files) ? body.files : [];
  if (files.length > 1) {
    setDirectSheetsState({
      message: `Found ${files.length} app-accessible Walmart-GC Data spreadsheets. Using the most recently modified file.`,
    });
  }
  return files[0] || null;
}

async function createWalmartGcDataSheet() {
  return driveFetch("files?fields=id,name,modifiedTime,webViewLink", {
    method: "POST",
    body: JSON.stringify({
      name: walmartGcDataSheetName,
      mimeType: googleDriveSpreadsheetMimeType,
    }),
  });
}

function setActiveDirectSheet(file) {
  const spreadsheetId = String(file?.id || "").trim();
  if (!spreadsheetId) {
    throw makeDirectSheetsError("Google did not return a spreadsheet ID for Walmart-GC Data.");
  }

  const spreadsheetUrl = String(file?.webViewLink || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`);
  const changed = spreadsheetId !== directSheetsState.spreadsheetId;
  if (changed) {
    syncState = cloneStateValue(defaultSyncState);
  }
  setDirectSheetsState({
    spreadsheetId,
    spreadsheetUrl,
    spreadsheetName: String(file?.name || walmartGcDataSheetName),
    status: directSheetsStatuses.ready,
    cardsSheetInitialized: changed ? "unknown" : directSheetsState.cardsSheetInitialized,
    remoteSheetVersion: changed ? "" : directSheetsState.remoteSheetVersion,
    lastSuccessfulSyncAt: changed ? "" : directSheetsState.lastSuccessfulSyncAt,
    pendingUnsynced: changed ? false : directSheetsState.pendingUnsynced,
    message: `Using ${String(file?.name || walmartGcDataSheetName)} for Google Sheets sync.`,
    lastErrorMessage: "",
  });
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
    throw makeDirectSheetsError("Worker did not return an active Walmart-GC Data Sheet.");
  }

  setDirectSheetsState({
    spreadsheetId,
    spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
    spreadsheetName: String(sheet.sheetName || walmartGcDataSheetName),
    status: directSheetsStatuses.ready,
    cardsSheetInitialized: "yes",
    remoteSheetVersion: String(sheet.sheetVersion || ""),
    message: "Worker Sheet proxy is ready.",
    lastErrorMessage: "",
  });
  return {
    id: spreadsheetId,
    name: String(sheet.sheetName || walmartGcDataSheetName),
    sheetVersion: String(sheet.sheetVersion || ""),
    lastUpdated: String(sheet.lastUpdated || ""),
  };
}

function hasMeaningfulLocalCards() {
  if (sampleGiftCards.length === 0) {
    return false;
  }
  if (loadedCardsFromStorage) {
    return true;
  }
  return JSON.stringify(sampleGiftCards) !== JSON.stringify(bundledSampleGiftCards);
}

async function connectGoogleAndPrepareSheet() {
  try {
    const file = await ensureWalmartGcDataSheet();
    const loadResult = await fetchWorkerJson("/api/cards/load");
    const loadedCards = normalizeStoredCards(loadResult.cards || []);
    const localHasCards = hasMeaningfulLocalCards();
    const now = new Date().toISOString();
    const sheetVersion = String(loadResult.sheetVersion || file.sheetVersion || "");

    if (loadedCards.length > 0 && localHasCards) {
      syncState = {
        ...syncState,
        status: syncStatuses.unsynced,
        lastSyncAttemptTimestamp: now,
        lastKnownSheetVersion: sheetVersion,
        message: "Connected to Walmart-GC Data. Remote cards were found; press Load from Google Sheets to replace this local session, or Sync Now to save local cards after reviewing.",
        lastErrorMessage: "",
      };
      setDirectSheetsState({
        spreadsheetId: String(loadResult.sheetId || file.id),
        spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${String(loadResult.sheetId || file.id)}/edit`,
        spreadsheetName: String(loadResult.sheetName || file.name || walmartGcDataSheetName),
        status: directSheetsStatuses.ready,
        cardsSheetInitialized: "yes",
        remoteSheetVersion: sheetVersion,
        pendingUnsynced: true,
        message: "Connected. Remote cards exist, so Walmart-GC did not replace local cards automatically.",
        lastErrorMessage: "",
      });
      return;
    }

    if (loadedCards.length === 0 && localHasCards) {
      syncState = {
        ...syncState,
        status: syncStatuses.unsynced,
        lastSyncAttemptTimestamp: now,
        lastKnownSheetVersion: sheetVersion,
        message: "Connected to an empty Walmart-GC Data Sheet. Local cards were kept in this browser; press Sync Now to copy them to Google Sheets.",
        lastErrorMessage: "",
      };
      setDirectSheetsState({
        spreadsheetId: String(loadResult.sheetId || file.id),
        spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${String(loadResult.sheetId || file.id)}/edit`,
        spreadsheetName: String(loadResult.sheetName || file.name || walmartGcDataSheetName),
        status: directSheetsStatuses.ready,
        cardsSheetInitialized: "yes",
        remoteSheetVersion: sheetVersion,
        pendingUnsynced: true,
        message: "Connected to an empty Sheet. Local cards were not uploaded automatically.",
        lastErrorMessage: "",
      });
      return;
    }

    sampleGiftCards.splice(0, sampleGiftCards.length, ...loadedCards);
    loadedCardsFromStorage = true;
    selectedCardIndex = loadedCards.length > 0 ? 0 : -1;
    detailNumberRevealed = false;
    syncState = {
      ...syncState,
      status: syncStatuses.connected,
      lastSyncTimestamp: now,
      lastSyncAttemptTimestamp: now,
      lastKnownSheetVersion: sheetVersion,
      message: loadedCards.length
        ? "Loaded cards from Walmart-GC Data. Completed actions will now sync through the Worker."
        : "Connected to a blank Walmart-GC Data Sheet. Add or import cards when ready.",
      lastErrorMessage: "",
      pendingOperation: null,
    };
    setDirectSheetsState({
      spreadsheetId: String(loadResult.sheetId || file.id),
      spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${String(loadResult.sheetId || file.id)}/edit`,
      spreadsheetName: String(loadResult.sheetName || file.name || walmartGcDataSheetName),
      status: directSheetsStatuses.ready,
      cardsSheetInitialized: "yes",
      remoteSheetVersion: sheetVersion,
      lastSuccessfulSyncAt: now,
      pendingUnsynced: false,
      message: loadedCards.length
        ? `Connected and loaded ${loadedCards.length} card${loadedCards.length === 1 ? "" : "s"} from Walmart-GC Data.`
        : "Connected and initialized Walmart-GC Data. The Sheet is ready for cards.",
      lastErrorMessage: "",
    });
    saveAppState();
    refreshRawCardData(loadedCards.length
      ? `Loaded ${loadedCards.length} card${loadedCards.length === 1 ? "" : "s"} from Walmart-GC Data into this session.`
      : "Connected to a blank Walmart-GC Data Sheet. The local card list is empty and ready.");
    renderApp(selectedCardIndex);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Google Sheet setup failed.";
    setDirectSheetsState({
      status: directSheetsStatuses.error,
      message: message === "Not authenticated" ? "Connect Google to sync." : message,
      lastErrorMessage: message,
    });
    setSyncState({
      status: syncStatuses.unsynced,
      lastErrorMessage: message,
      message: "Google setup failed. Local cards remain available in this browser.",
    });
  }
}

function openActiveGoogleSheet() {
  const sheetUrl = getDirectSheetsDisplayUrl();
  if (!sheetUrl) {
    setDirectSheetsState({
      status: directSheetsStatuses.notConfigured,
      message: "Connect Google to create or locate Walmart-GC Data before opening the Sheet.",
      lastErrorMessage: "No active Sheet ID configured.",
    });
    return;
  }
  window.open(sheetUrl, "_blank", "noopener");
}

function encodeSheetRange(range) {
  return encodeURIComponent(range).replace(/%21/g, "!");
}

async function getDirectSpreadsheetMetadata() {
  if (!directSheetsState.spreadsheetId) {
    throw makeDirectSheetsError("Connect Google to create or locate Walmart-GC Data before using sync.");
  }

  return sheetsFetch(`${directSheetsState.spreadsheetId}?fields=properties.title,sheets.properties(sheetId,title,hidden)`);
}

function getSheetProperties(metadata, title) {
  return getSheetByTitle(metadata, title)?.properties || null;
}

function getSheetByTitle(metadata, title) {
  return metadata?.sheets?.find((sheet) => sheet?.properties?.title === title) || null;
}

async function readSheetValues(spreadsheetId, range) {
  const encodedRange = encodeSheetRange(range);
  const body = await sheetsFetch(`${spreadsheetId}/values/${encodedRange}?majorDimension=ROWS`);
  return Array.isArray(body.values) ? body.values : [];
}

async function writeSheetValues(spreadsheetId, range, values) {
  const encodedRange = encodeSheetRange(range);
  return sheetsFetch(`${spreadsheetId}/values/${encodedRange}?valueInputOption=RAW`, {
    method: "PUT",
    body: JSON.stringify({ range, majorDimension: "ROWS", values }),
  });
}

async function clearSheetValues(spreadsheetId, range) {
  const encodedRange = encodeSheetRange(range);
  return sheetsFetch(`${spreadsheetId}/values/${encodedRange}:clear`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

function isSheetValuesEmpty(values) {
  if (!Array.isArray(values) || values.length === 0) {
    return true;
  }

  return values.every((row) => {
    if (!Array.isArray(row) || row.length === 0) {
      return true;
    }
    return row.every((cell) => String(cell ?? "").trim() === "");
  });
}

async function readSheetValuesForCleanup(spreadsheetId, sheetTitle) {
  return readSheetValues(spreadsheetId, `'${sheetTitle}'!A1:Z1000`);
}

async function deleteEmptyDefaultSheetIfSafe(spreadsheetId, metadata) {
  const sheets = Array.isArray(metadata?.sheets) ? metadata.sheets : [];
  const cardsSheet = getSheetByTitle(metadata, directSheetsCardsTab);
  const metaSheet = getSheetByTitle(metadata, directSheetsMetaTab);
  const defaultSheet = getSheetByTitle(metadata, directSheetsDefaultTab);

  const defaultSheetId = defaultSheet?.properties?.sheetId;
  if (!cardsSheet || !metaSheet || !defaultSheet || sheets.length <= 1 || !Number.isInteger(defaultSheetId)) {
    return false;
  }

  let defaultSheetValues;
  try {
    defaultSheetValues = await readSheetValuesForCleanup(spreadsheetId, directSheetsDefaultTab);
  } catch (_) {
    return false;
  }

  if (!isSheetValuesEmpty(defaultSheetValues)) {
    return false;
  }

  try {
    await sheetsFetch(`${spreadsheetId}:batchUpdate`, {
      method: "POST",
      body: JSON.stringify({
        requests: [
          { deleteSheet: { sheetId: defaultSheetId } },
        ],
      }),
    });
    return true;
  } catch (_) {
    return false;
  }
}

async function cleanupDefaultSheetAfterInitialization(spreadsheetId, metadata) {
  return deleteEmptyDefaultSheetIfSafe(spreadsheetId, metadata);
}

function areHeadersValid(row) {
  return csvHeaders.every((header, index) => String(row?.[index] || "").trim() === header);
}

async function ensureCardsSheet() {
  const spreadsheetId = directSheetsState.spreadsheetId;
  let metadata = await getDirectSpreadsheetMetadata();
  const requests = [];
  let cardsProperties = getSheetProperties(metadata, directSheetsCardsTab);
  let metaProperties = getSheetProperties(metadata, directSheetsMetaTab);

  if (!cardsProperties) {
    requests.push({ addSheet: { properties: { title: directSheetsCardsTab } } });
  }
  if (!metaProperties) {
    requests.push({ addSheet: { properties: { title: directSheetsMetaTab, hidden: true } } });
  } else if (!metaProperties.hidden) {
    requests.push({ updateSheetProperties: { properties: { sheetId: metaProperties.sheetId, hidden: true }, fields: "hidden" } });
  }

  if (requests.length) {
    await sheetsFetch(`${spreadsheetId}:batchUpdate`, {
      method: "POST",
      body: JSON.stringify({ requests }),
    });
    metadata = await getDirectSpreadsheetMetadata();
    cardsProperties = getSheetProperties(metadata, directSheetsCardsTab);
    metaProperties = getSheetProperties(metadata, directSheetsMetaTab);
  }

  const headerRows = await readSheetValues(spreadsheetId, `${directSheetsCardsTab}!A1:J1`);
  if (!headerRows.length || headerRows[0].every((cell) => !String(cell || "").trim())) {
    await writeSheetValues(spreadsheetId, `${directSheetsCardsTab}!A1:J1`, [csvHeaders]);
  } else if (!areHeadersValid(headerRows[0])) {
    throw makeDirectSheetsError("The Cards tab headers do not match the approved Walmart-GC schema. No data was changed.");
  }

  const metaHeaderRows = await readSheetValues(spreadsheetId, `${directSheetsMetaTab}!A1:B1`);
  if (!metaHeaderRows.length || metaHeaderRows[0][0] !== "key" || metaHeaderRows[0][1] !== "value") {
    await writeSheetValues(spreadsheetId, `${directSheetsMetaTab}!A1:B1`, [["key", "value"]]);
  }

  await cleanupDefaultSheetAfterInitialization(spreadsheetId, metadata);

  return {
    spreadsheetName: String(metadata?.properties?.title || ""),
    cardsSheetId: cardsProperties?.sheetId,
    metaSheetId: metaProperties?.sheetId,
  };
}

async function readSheetMeta() {
  const values = await readSheetValues(directSheetsState.spreadsheetId, `${directSheetsMetaTab}!A:B`);
  const meta = {};
  values.slice(1).forEach((row) => {
    const key = String(row?.[0] || "").trim();
    if (key) {
      meta[key] = String(row?.[1] || "");
    }
  });
  return meta;
}

async function writeSheetMeta(nextMeta = {}) {
  const mergedMeta = {
    schemaVersion: directSheetsSchemaVersion,
    sheetVersion: nextMeta.sheetVersion || generateRequestId(),
    lastUpdated: new Date().toISOString(),
    appName: directSheetsAppName,
  };
  const rows = [["key", "value"], ...Object.entries(mergedMeta)];
  await clearSheetValues(directSheetsState.spreadsheetId, `${directSheetsMetaTab}!A:B`);
  await writeSheetValues(directSheetsState.spreadsheetId, `${directSheetsMetaTab}!A1:B${rows.length}`, rows);
  return mergedMeta;
}

function cardsToSheetRows(cards) {
  return [csvHeaders, ...cards.map((card) => csvHeaders.map((header) => {
    if (header === "used") {
      return card.used ? "TRUE" : "FALSE";
    }
    return card[header] ?? "";
  }))];
}

function cardsFromSheetRows(rows) {
  const cards = [];
  const seenCardNumbers = new Set();
  rows.forEach((row, index) => {
    const hasAnyValue = row.some((cell) => String(cell || "").trim());
    if (!hasAnyValue) {
      return;
    }

    const rawCard = {};
    csvHeaders.forEach((header, headerIndex) => {
      rawCard[header] = row[headerIndex] ?? "";
    });
    const normalizedCard = normalizeStoredCard(rawCard);
    if (!normalizedCard) {
      throw makeDirectSheetsError(`Cards row ${index + 2} contains malformed card data. Local data was not changed.`);
    }
    if (seenCardNumbers.has(normalizedCard.cardNumber)) {
      throw makeDirectSheetsError(`Cards row ${index + 2} duplicates cardNumber ${normalizedCard.cardNumber}. Local data was not changed.`);
    }
    seenCardNumbers.add(normalizedCard.cardNumber);
    cards.push(normalizedCard);
  });
  return cards;
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
    setDirectSheetsState({
      status: directSheetsStatuses.error,
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
    setDirectSheetsState({
      status: directSheetsStatuses.error,
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
      message: options.successMessage || `Synced ${sampleGiftCards.length} card${sampleGiftCards.length === 1 ? "" : "s"} through the Worker Sheet proxy.`,
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
    setDirectSheetsState({
      status: directSheetsStatuses.error,
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
    "Use Current Session will replace every card row in the configured Google Sheet with this browser session. Download a CSV backup before continuing. Press OK only if you already downloaded a backup or intentionally choose to continue without one.",
  );
  if (!backupRecommended) {
    return;
  }

  const confirmed = window.confirm(
    "Final confirmation: overwrite the configured Google Sheet with the current local session now? Walmart-GC will not automatically merge Sheet changes.",
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
      lastErrorMessage: "Conflict detected. Retry Sync will not overwrite Sheet changes automatically.",
    });
    return;
  }

  if (!syncState.lastKnownSheetVersion) {
    const message = "Load or initialize Walmart-GC Data before syncing so Walmart-GC can verify the current Sheet version.";
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
  const hiddenCount = sampleGiftCards.length - visibleIndexes.length;
  const countLabel = hiddenCount > 0
    ? `${visibleIndexes.length} of ${sampleGiftCards.length} cards`
    : `${sampleGiftCards.length} cards`;

  cardCount.textContent = countLabel;
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
if (saveDirectSheetButton) {
  saveDirectSheetButton.addEventListener("click", saveDirectSheetFromInput);
}
if (initializeDirectSheetButton) {
  initializeDirectSheetButton.addEventListener("click", initializeDirectSheetStructure);
}
if (openDirectSheetButton) {
  openDirectSheetButton.addEventListener("click", openActiveGoogleSheet);
}
loadDirectSheetButton.addEventListener("click", loadCardsFromDirectSheets);
syncDirectSheetButton.addEventListener("click", retrySyncCurrentSession);
connectGoogleButton.addEventListener("click", connectGoogleAccount);
disconnectGoogleButton.addEventListener("click", disconnectGoogleAccount);
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
renderGoogleOAuthState();
renderDirectSheetsState();
const authReturnDetected = consumeAuthReturnQuery();
void refreshWorkerSessionStatus({ authReturn: authReturnDetected });
refreshRawCardData("Loaded current session data into the textarea. Editing is locked.");
renderApp();
showPanel("list");
