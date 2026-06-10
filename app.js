const sampleGiftCards = [
  {
    cardNumber: "6045782190348765",
    pin: "4821",
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

let selectedCardIndex = -1;
let advanceOnMarkUsed = true;
let hideUsedCards = true;
let hideZeroBalanceCards = false;
let sortMode = "balance-asc";
let amountUsedEditedLast = false;
let touchStartX = 0;
let touchStartY = 0;
let rawDataLocked = false;
let detailNumberRevealed = false;
let wakeLock = null;

const dataPanelRowLimit = 100;
const csvHeaders = [
  "cardNumber",
  "pin",
  "startingBalance",
  "currentBalance",
  "dateAdded",
  "dateUpdated",
  "dateUsed",
  "used",
];

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
  const hasHeader = firstRow && firstRow.map((value) => value.toLowerCase()).join(",") === csvHeaders.join(",").toLowerCase();
  return hasHeader ? rows.slice(1) : rows;
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

    if (!values || values.length !== csvHeaders.length) {
      warnings.push(`Row ${displayRow}: malformed row; expected ${csvHeaders.length} CSV fields.`);
      return;
    }

    const [
      cardNumber,
      pin,
      startingBalanceRaw,
      currentBalanceRaw,
      dateAddedRaw,
      dateUpdatedRaw,
      dateUsedRaw,
      usedRaw,
    ] = values;
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

    const startingBalance = readCsvMoney(startingBalanceRaw);
    if (startingBalance === null || Number.isNaN(startingBalance)) {
      warnings.push(`Row ${displayRow}: invalid starting balance.`);
      hasError = true;
    }

    const currentBalance = currentBalanceRaw === "" ? startingBalance : readCsvMoney(currentBalanceRaw);
    if (Number.isNaN(currentBalance)) {
      warnings.push(`Row ${displayRow}: invalid current balance.`);
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
      startingBalance,
      currentBalance,
      dateAdded,
      dateUpdated,
      dateUsed,
      used,
      notes: "Loaded from Data panel CSV prototype.",
    });
  });

  return { parsedCards, warnings };
}

function refreshRawCardData() {
  const displayedCount = Math.min(sampleGiftCards.length, dataPanelRowLimit);
  rawDataInput.value = cardsToCsv(sampleGiftCards, dataPanelRowLimit);
  updateDataCountSummary(displayedCount);

  const warnings = sampleGiftCards.length > dataPanelRowLimit
    ? [`Displaying first ${dataPanelRowLimit} cards only. Export CSV includes all ${sampleGiftCards.length} cards.`]
    : [];
  renderValidationWarnings(warnings, `Refreshed ${displayedCount} of ${sampleGiftCards.length} cards into the textarea.`);
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
  renderApp(selectedCardIndex);
}

function openBalanceModal() {
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
  openBalanceModalButton.focus();
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

  closeFullscreenBarcode();
  if (!sampleGiftCards[selectedCardIndex].used) {
    toggleSelectedUsed();
  }
  showPanel("detail", { selectFirstVisible: true });
}

function updateBalanceFromCheckout() {
  closeFullscreenBarcode();
  showPanel("detail", { selectFirstVisible: true });
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
});
hideUsedCheckbox.addEventListener("change", (event) => {
  hideUsedCards = event.target.checked;
  renderApp(selectedCardIndex);
});
hideZeroBalanceCheckbox.addEventListener("change", (event) => {
  hideZeroBalanceCards = event.target.checked;
  renderApp(selectedCardIndex);
});
sortCardsSelect.addEventListener("change", (event) => {
  sortMode = event.target.value;
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

hideUsedCheckbox.checked = hideUsedCards;
hideZeroBalanceCheckbox.checked = hideZeroBalanceCards;
sortCardsSelect.value = sortMode;
rawDataInput.value = "";
setRawDataLocked(false);
updateDataCountSummary(0);
renderApp();
showPanel("list");
