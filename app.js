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
const connectionStatusArea = document.querySelector("#connection-status");

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
  connected: "Connected",
  error: "Connection Error",
};

const defaultConnectionState = {
  appsScriptUrl: "",
  connectionStatus: connectionStatuses.notConnected,
  lastHealthCheckAt: "",
  spreadsheetName: "",
  sheetName: "",
  schemaVersion: "",
  message: "Enter and save an Apps Script URL, then test the connection.",
};

const defaultSyncState = {
  status: "unsynced",
  lastSyncTimestamp: "",
  lastKnownSheetVersion: "",
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

  return {
    cardNumber,
    pin,
    merchant: String(card.merchant || prototypeDefaultMerchant),
    startingBalance: normalizeMoney(startingBalance),
    currentBalance: normalizeMoney(currentBalance),
    dateAdded: String(card.dateAdded || todayString()),
    dateUpdated: String(card.dateUpdated || card.dateAdded || todayString()),
    dateUsed: String(card.dateUsed || ""),
    used: Boolean(card.used),
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
    spreadsheetName: String(connection.spreadsheetName || ""),
    sheetName: String(connection.sheetName || ""),
    schemaVersion: String(connection.schemaVersion || ""),
    message: String(connection.message || defaultConnectionState.message),
  };
}

function normalizeStoredSync(sync) {
  if (!isPlainObject(sync)) {
    return cloneStateValue(defaultSyncState);
  }

  return {
    status: String(sync.status || defaultSyncState.status),
    lastSyncTimestamp: String(sync.lastSyncTimestamp || ""),
    lastKnownSheetVersion: String(sync.lastKnownSheetVersion || ""),
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
  const template = document.createElement("template");
  template.textContent = String(value ?? "");
  return template.innerHTML;
}

function escapeCsvValue(value) {
  const text = String(value ?? "");

  if (/[",\n\r]/.test(text)) {
    return `"${text.replaceAll('"', '""')}"`;
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

function updateRawCardData() {
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

function exportCurrentCardsCsv() {
  const csvContent = cardsToCsv(sampleGiftCards);
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const downloadLink = document.createElement("a");

  downloadLink.href = url;
  downloadLink.download = "walmart-gift-cards-export.csv";
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

function buildHealthCheckUrl(rawUrl) {
  const parsedUrl = parseAppsScriptUrl(rawUrl);
  if (!parsedUrl) {
    return null;
  }

  parsedUrl.searchParams.set("action", "health");
  return parsedUrl.toString();
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

function getHealthErrorMessage(responseBody) {
  if (!isPlainObject(responseBody)) {
    return "The health check returned an unexpected response.";
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

  return "Apps Script reported that the connection is not ready.";
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

function setConnectionState(nextState) {
  connectionState = {
    ...connectionState,
    ...nextState,
  };
  saveAppState();
  renderConnectionState();
}

function renderConnectionState() {
  appsScriptUrlInput.value = connectionState.appsScriptUrl;
  testConnectionButton.disabled = connectionState.connectionStatus === connectionStatuses.checking;
  saveConnectionButton.disabled = connectionState.connectionStatus === connectionStatuses.checking;

  const statusClass = connectionState.connectionStatus === connectionStatuses.connected
    ? "connected"
    : connectionState.connectionStatus === connectionStatuses.error
      ? "error"
      : connectionState.connectionStatus === connectionStatuses.checking
        ? "checking"
        : "not-connected";

  const details = [];
  if (connectionState.spreadsheetName) {
    details.push(`<li><strong>Spreadsheet:</strong> ${escapeHtml(connectionState.spreadsheetName)}</li>`);
  }
  if (connectionState.sheetName) {
    details.push(`<li><strong>Sheet:</strong> ${escapeHtml(connectionState.sheetName)}</li>`);
  }
  if (connectionState.schemaVersion) {
    details.push(`<li><strong>Schema version:</strong> ${escapeHtml(connectionState.schemaVersion)}</li>`);
  }
  if (connectionState.lastHealthCheckAt) {
    details.push(`<li><strong>Last checked:</strong> ${escapeHtml(formatConnectionTimestamp(connectionState.lastHealthCheckAt))}</li>`);
  }

  connectionStatusArea.className = `connection-status is-${statusClass}`;
  connectionStatusArea.innerHTML = `
    <div class="connection-status-header">
      <span class="connection-status-dot" aria-hidden="true"></span>
      <strong>${escapeHtml(connectionState.connectionStatus)}</strong>
    </div>
    <p>${escapeHtml(connectionState.message || defaultConnectionState.message)}</p>
    ${details.length ? `<ul>${details.join("")}</ul>` : ""}
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
      spreadsheetName: "",
      sheetName: "",
      schemaVersion: "",
      message: "Enter a valid http(s) Apps Script Web App URL.",
    });
    return;
  }

  const urlChanged = appsScriptUrl !== connectionState.appsScriptUrl;
  setConnectionState({
    appsScriptUrl,
    connectionStatus: urlChanged ? connectionStatuses.notConnected : connectionState.connectionStatus,
    lastHealthCheckAt: urlChanged ? "" : connectionState.lastHealthCheckAt,
    spreadsheetName: urlChanged ? "" : connectionState.spreadsheetName,
    sheetName: urlChanged ? "" : connectionState.sheetName,
    schemaVersion: urlChanged ? "" : connectionState.schemaVersion,
    message: urlChanged
      ? "Connection saved locally. Run a health check before syncing in a future PR."
      : "Connection saved locally.",
  });
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
      message: "Enter a valid http(s) Apps Script Web App URL before testing.",
    });
    return;
  }

  setConnectionState({
    appsScriptUrl,
    connectionStatus: connectionStatuses.checking,
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
        message: "The health check response was not valid JSON.",
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
        message: getHealthErrorMessage(responseBody),
      });
      return;
    }

    setConnectionState({
      connectionStatus: connectionStatuses.connected,
      lastHealthCheckAt: new Date().toISOString(),
      spreadsheetName: String(healthData.spreadsheetName || "Not provided"),
      sheetName: String(healthData.sheetName || "Not provided"),
      schemaVersion: String(healthData.schemaVersion || "Not provided"),
      message: "Health check succeeded. Card loading and sync are not enabled yet.",
    });
  } catch {
    setConnectionState({
      connectionStatus: connectionStatuses.error,
      lastHealthCheckAt: new Date().toISOString(),
      spreadsheetName: "",
      sheetName: "",
      schemaVersion: "",
      message: "Unable to reach the Apps Script URL. Check the URL, deployment access, and network connection.",
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
  fullscreenCardNumber.textContent = "—";
  fullscreenPin.textContent = "—";
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
  fullscreenPosition.textContent = `Card ${visiblePosition + 1} of ${visibleIndexes.length}`;
  fullscreenCardNumber.textContent = groupCardNumber(card.cardNumber);
  fullscreenPin.textContent = card.pin;
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
  saveAppState();

  if (card.used && advanceOnMarkUsed) {
    const nextPreferredIndex = visibleIndexesBefore[visiblePositionBefore + 1]
      ?? visibleIndexesBefore[visiblePositionBefore - 1]
      ?? selectedCardIndex;
    renderApp(nextPreferredIndex);
    return;
  }

  renderApp(selectedCardIndex);
}

function updateSelectedBalance(balance) {
  if (selectedCardIndex < 0) {
    return;
  }

  const card = sampleGiftCards[selectedCardIndex];
  card.currentBalance = normalizeMoney(balance);
  card.dateUpdated = todayString();
  saveAppState();
  renderApp(selectedCardIndex);
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

  updateSelectedBalance(nextBalance);
  closeBalanceModal();
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
  getZeroBalanceCardIndexes().forEach((cardIndex) => {
    sampleGiftCards[cardIndex].used = true;
    sampleGiftCards[cardIndex].dateUsed = todayString();
  });

  saveAppState();
  closeConfirmModal();
  renderApp(selectedCardIndex);
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
