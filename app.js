const sampleGiftCards = [
  {
    cardNumber: "•••• •••• •••• 1042",
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
    cardNumber: "•••• •••• •••• 2388",
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
    cardNumber: "•••• •••• •••• 7715",
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
    cardNumber: "•••• •••• •••• 4490",
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
    cardNumber: "•••• •••• •••• 8824",
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
const cardDetail = document.querySelector("#card-detail");

let selectedCardIndex = 0;
let advanceOnMarkUsed = true;
let hideUsedCards = true;
let hideZeroBalanceCards = false;
let sortMode = "balance-desc";
let amountUsedEditedLast = false;
let touchStartX = 0;
let touchStartY = 0;

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
        <span class="card-number">${card.cardNumber}</span>
        <span class="status-badge" data-used="${card.used}">Used: ${card.used}</span>
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
  detailStatus.textContent = "No cards";
  detailStatus.dataset.used = "";
  detailNumber.textContent = "—";
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
}

function renderCardDetail() {
  const visibleIndexes = getVisibleCardIndexes();

  if (selectedCardIndex < 0 || visibleIndexes.length === 0) {
    clearCardDetail();
    return;
  }

  const card = sampleGiftCards[selectedCardIndex];
  const visiblePosition = getSelectedVisiblePosition();

  detailStatus.textContent = `Used: ${card.used}`;
  detailStatus.dataset.used = String(card.used);
  detailNumber.textContent = card.cardNumber;
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
  fullscreenCardNumber.textContent = card.cardNumber;
}

function renderApp(preferredIndex) {
  ensureVisibleSelection(preferredIndex);
  renderCardList();
  renderCardDetail();
}

function selectCard(index) {
  selectedCardIndex = index;
  renderApp(index);
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

  if (amountUsed !== null && amountUsed < 0) {
    setBalanceModalError("Amount Used cannot be negative.");
    return null;
  }

  if (nextBalance < 0) {
    setBalanceModalError("Remaining Balance cannot be negative.");
    return null;
  }

  if (nextBalance > card.startingBalance) {
    setBalanceModalError("Remaining Balance cannot exceed Starting Balance.");
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

function openFullscreenBarcode() {
  if (selectedCardIndex < 0) {
    return;
  }

  fullscreenBarcode.hidden = false;
  barcodeCloseButton.focus();
}

function closeFullscreenBarcode() {
  fullscreenBarcode.hidden = true;
  barcodeOpenButton.focus();
}

previousButton.addEventListener("click", () => moveSelection(-1));
nextButton.addEventListener("click", () => moveSelection(1));
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
amountUsedInput.addEventListener("input", () => calculateModalCounterpart("amount-used"));
remainingBalanceInput.addEventListener("input", () => calculateModalCounterpart("remaining-balance"));
cancelBalanceUpdateButton.addEventListener("click", closeBalanceModal);
saveBalanceUpdateButton.addEventListener("click", saveBalanceUpdate);
markZeroUsedButton.addEventListener("click", openZeroBalanceConfirm);
cancelConfirmButton.addEventListener("click", closeConfirmModal);
confirmZeroUsedButton.addEventListener("click", markZeroBalanceCardsUsed);
barcodeOpenButton.addEventListener("click", openFullscreenBarcode);
barcodeCloseButton.addEventListener("click", closeFullscreenBarcode);
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
  const touch = event.changedTouches[0];
  const deltaX = touch.screenX - touchStartX;
  const deltaY = touch.screenY - touchStartY;

  if (Math.abs(deltaX) < 50 || Math.abs(deltaX) < Math.abs(deltaY)) {
    return;
  }

  moveSelection(deltaX < 0 ? 1 : -1);
}, { passive: true });

hideUsedCheckbox.checked = hideUsedCards;
hideZeroBalanceCheckbox.checked = hideZeroBalanceCards;
sortCardsSelect.value = sortMode;
renderApp();
