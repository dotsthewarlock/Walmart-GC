const sampleGiftCards = [
  {
    id: "card-1042",
    cardNumber: "•••• •••• •••• 1042",
    pin: "4821",
    startingBalance: 50,
    currentBalance: 50,
    dateAdded: "2026-06-01",
    dateUpdated: "2026-06-01",
    used: false,
    notes: "Sample card ready for checkout testing.",
  },
  {
    id: "card-2388",
    cardNumber: "•••• •••• •••• 2388",
    pin: "9064",
    startingBalance: 100,
    currentBalance: 37.42,
    dateAdded: "2026-05-24",
    dateUpdated: "2026-06-09",
    used: false,
    notes: "Partially used sample card with a remaining balance.",
  },
  {
    id: "card-7715",
    cardNumber: "•••• •••• •••• 7715",
    pin: "1138",
    startingBalance: 25,
    currentBalance: 0,
    dateAdded: "2026-05-18",
    dateUpdated: "2026-06-08",
    dateUsed: "2026-06-08",
    used: true,
    notes: "Used sample card retained for prototype filtering.",
  },
  {
    id: "card-6209",
    cardNumber: "•••• •••• •••• 6209",
    pin: "5570",
    startingBalance: 75,
    currentBalance: 12.5,
    dateAdded: "2026-06-05",
    dateUpdated: "2026-06-07",
    used: false,
    notes: "Low-balance card for checkout navigation testing.",
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
});

const cardList = document.querySelector("#card-list");
const cardCount = document.querySelector("#card-count");
const usedState = document.querySelector("#used-state");
const detailNumber = document.querySelector("#detail-number");
const detailPin = document.querySelector("#detail-pin");
const startingBalance = document.querySelector("#starting-balance");
const currentBalance = document.querySelector("#current-balance");
const currentBalanceTile = document.querySelector("#current-balance-tile");
const dateAdded = document.querySelector("#date-added");
const dateUpdated = document.querySelector("#date-updated");
const currentDateLabel = document.querySelector("#current-date-label");
const detailNotes = document.querySelector("#detail-notes");
const previousButton = document.querySelector("#prev-card");
const nextButton = document.querySelector("#next-card");
const cardPosition = document.querySelector("#card-position");
const markUsedButton = document.querySelector("#mark-used");
const updateBalanceButton = document.querySelector("#update-balance");
const advanceOnUsedToggle = document.querySelector("#advance-on-used");
const hideUsedToggle = document.querySelector("#hide-used");
const hideZeroToggle = document.querySelector("#hide-zero");
const sortCardsSelect = document.querySelector("#sort-cards");
const markZeroUsedButton = document.querySelector("#mark-zero-used");
const barcodeOpenButton = document.querySelector("#barcode-open");
const fullscreenBarcode = document.querySelector("#fullscreen-barcode");
const barcodeCloseButton = document.querySelector("#barcode-close");
const fullscreenCardNumber = document.querySelector("#fullscreen-card-number");
const cardDetail = document.querySelector("#card-detail");
const balanceModal = document.querySelector("#balance-modal");
const balanceForm = balanceModal.querySelector(".modal-card");
const amountUsedInput = document.querySelector("#amount-used-input");
const remainingBalanceInput = document.querySelector("#remaining-balance-input");
const balanceCancelButton = document.querySelector("#balance-cancel");
const balanceError = document.querySelector("#balance-error");
const confirmModal = document.querySelector("#confirm-modal");
const confirmForm = confirmModal.querySelector(".modal-card");
const confirmCancelButton = document.querySelector("#confirm-cancel");
const confirmMessage = document.querySelector("#confirm-message");

const settings = {
  advanceOnUsed: true,
  hideUsed: true,
  hideZero: false,
  sortBy: "balance-desc",
};

let selectedCardId = sampleGiftCards[0].id;
let touchStartX = 0;
let touchStartY = 0;
let modalStartingBalance = 0;
let modalCurrentBalance = 0;
let lastEditedBalanceField = "remaining";

function formatBalance(balance) {
  return currencyFormatter.format(balance);
}

function formatDate(dateValue) {
  return dateFormatter.format(new Date(`${dateValue}T00:00:00`));
}

function getTodayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function roundCurrency(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function parseMoney(value) {
  if (value.trim() === "") {
    return null;
  }

  const numberValue = Number.parseFloat(value);
  return Number.isNaN(numberValue) ? null : numberValue;
}

function getSelectedCard() {
  return sampleGiftCards.find((card) => card.id === selectedCardId) || null;
}

function getCardSortValue(card) {
  const visibleDigits = card.cardNumber.replace(/\D/g, "");
  return Number.parseInt(visibleDigits, 10) || 0;
}

function sortCards(cards) {
  return [...cards].sort((cardA, cardB) => {
    switch (settings.sortBy) {
      case "balance-asc":
        return cardA.currentBalance - cardB.currentBalance || getCardSortValue(cardA) - getCardSortValue(cardB);
      case "added-desc":
        return cardB.dateAdded.localeCompare(cardA.dateAdded) || getCardSortValue(cardA) - getCardSortValue(cardB);
      case "added-asc":
        return cardA.dateAdded.localeCompare(cardB.dateAdded) || getCardSortValue(cardA) - getCardSortValue(cardB);
      case "updated-desc":
        return cardB.dateUpdated.localeCompare(cardA.dateUpdated) || getCardSortValue(cardA) - getCardSortValue(cardB);
      case "updated-asc":
        return cardA.dateUpdated.localeCompare(cardB.dateUpdated) || getCardSortValue(cardA) - getCardSortValue(cardB);
      case "card-number":
        return getCardSortValue(cardA) - getCardSortValue(cardB);
      case "balance-desc":
      default:
        return cardB.currentBalance - cardA.currentBalance || getCardSortValue(cardA) - getCardSortValue(cardB);
    }
  });
}

function getVisibleCards() {
  return sortCards(sampleGiftCards.filter((card) => {
    if (settings.hideUsed && card.used) {
      return false;
    }

    if (settings.hideZero && card.currentBalance === 0) {
      return false;
    }

    return true;
  }));
}

function getSelectedVisiblePosition() {
  return getVisibleCards().findIndex((card) => card.id === selectedCardId);
}

function ensureVisibleSelection() {
  const visibleCards = getVisibleCards();

  if (visibleCards.length === 0) {
    selectedCardId = null;
    return;
  }

  if (!visibleCards.some((card) => card.id === selectedCardId)) {
    selectedCardId = visibleCards[0].id;
  }
}

function renderCardList() {
  const visibleCards = getVisibleCards();
  const hiddenCount = sampleGiftCards.length - visibleCards.length;
  cardCount.textContent = hiddenCount > 0
    ? `${visibleCards.length} of ${sampleGiftCards.length} cards`
    : `${sampleGiftCards.length} cards`;
  cardList.innerHTML = "";

  if (visibleCards.length === 0) {
    cardList.innerHTML = '<p class="empty-state">No cards match the current settings.</p>';
    return;
  }

  visibleCards.forEach((card) => {
    const cardButton = document.createElement("button");
    cardButton.type = "button";
    cardButton.className = "card-button";
    cardButton.setAttribute("aria-pressed", String(card.id === selectedCardId));
    cardButton.addEventListener("click", () => selectCard(card.id));

    cardButton.innerHTML = `
      <div class="card-row-top">
        <span class="card-number">${card.cardNumber}</span>
        <span class="used-badge" data-used="${card.used}">${card.used ? "Used" : "Active"}</span>
      </div>
      <div class="card-row-bottom">
        <span class="card-note">Current balance</span>
        <span class="card-balance${card.used ? " is-used" : ""}">${formatBalance(card.currentBalance)}</span>
      </div>
    `;

    cardList.appendChild(cardButton);
  });
}

function renderEmptyDetail() {
  usedState.textContent = "No cards";
  usedState.dataset.used = "";
  detailNumber.textContent = "—";
  detailPin.textContent = "—";
  startingBalance.textContent = "—";
  currentBalance.textContent = "—";
  dateAdded.textContent = "—";
  dateUpdated.textContent = "—";
  currentDateLabel.textContent = "Date Updated";
  detailNotes.textContent = "No cards match the current settings.";
  cardPosition.textContent = "Card 0 of 0";
  currentBalanceTile.classList.remove("is-used");
  previousButton.disabled = true;
  nextButton.disabled = true;
  markUsedButton.disabled = true;
  updateBalanceButton.disabled = true;
  barcodeOpenButton.disabled = true;
}

function renderCardDetail() {
  const visibleCards = getVisibleCards();
  const card = getSelectedCard();

  if (!card || visibleCards.length === 0) {
    renderEmptyDetail();
    return;
  }

  const visiblePosition = getSelectedVisiblePosition();
  usedState.textContent = card.used ? "Used" : "Active";
  usedState.dataset.used = String(card.used);
  detailNumber.textContent = card.cardNumber;
  detailPin.textContent = card.pin;
  startingBalance.textContent = formatBalance(card.startingBalance);
  currentBalance.textContent = formatBalance(card.currentBalance);
  dateAdded.textContent = formatDate(card.dateAdded);
  const displayedCurrentDate = card.used ? card.dateUsed || card.dateUpdated : card.dateUpdated;

  dateUpdated.textContent = formatDate(displayedCurrentDate);
  dateAdded.dateTime = card.dateAdded;
  dateUpdated.dateTime = displayedCurrentDate;
  currentDateLabel.textContent = card.used ? "Date Used" : "Date Updated";
  detailNotes.textContent = card.notes;
  cardPosition.textContent = `Card ${visiblePosition + 1} of ${visibleCards.length}`;
  currentBalanceTile.classList.toggle("is-used", card.used);
  previousButton.disabled = visiblePosition <= 0;
  nextButton.disabled = visiblePosition === visibleCards.length - 1;
  markUsedButton.disabled = false;
  markUsedButton.textContent = card.used ? "Unmark Used" : "Mark Used";
  updateBalanceButton.disabled = false;
  barcodeOpenButton.disabled = false;
  fullscreenCardNumber.textContent = card.cardNumber;
}

function renderSettings() {
  advanceOnUsedToggle.checked = settings.advanceOnUsed;
  hideUsedToggle.checked = settings.hideUsed;
  hideZeroToggle.checked = settings.hideZero;
  sortCardsSelect.value = settings.sortBy;
}

function renderApp() {
  ensureVisibleSelection();
  renderSettings();
  renderCardList();
  renderCardDetail();
}

function selectCard(cardId) {
  selectedCardId = cardId;
  renderApp();
}

function moveSelection(direction) {
  const visibleCards = getVisibleCards();
  const visiblePosition = getSelectedVisiblePosition();
  const nextPosition = visiblePosition + direction;

  if (nextPosition < 0 || nextPosition >= visibleCards.length) {
    return;
  }

  selectCard(visibleCards[nextPosition].id);
}

function toggleSelectedCardUsed() {
  const card = getSelectedCard();
  if (!card) {
    return;
  }

  const visibleCardsBeforeToggle = getVisibleCards();
  const currentPosition = getSelectedVisiblePosition();
  const nextCard = visibleCardsBeforeToggle[currentPosition + 1] || visibleCardsBeforeToggle[currentPosition - 1] || null;
  const markingUsed = !card.used;

  card.used = markingUsed;

  if (markingUsed) {
    card.dateUsed = getTodayIsoDate();
  }

  if (markingUsed && settings.advanceOnUsed && nextCard) {
    selectedCardId = nextCard.id;
  }

  renderApp();
}

function validateBalance(remainingBalance, amountUsed) {
  if (remainingBalance === null || amountUsed === null) {
    return "Enter an amount used or remaining balance.";
  }

  if (remainingBalance < 0 || amountUsed < 0) {
    return "Amounts cannot be negative.";
  }

  if (remainingBalance > modalStartingBalance) {
    return "Remaining balance cannot be greater than the starting balance.";
  }

  if (remainingBalance > modalCurrentBalance) {
    return "Remaining balance cannot be greater than the current balance for this update.";
  }

  return "";
}

function syncBalanceFields(sourceField) {
  const amountUsed = parseMoney(amountUsedInput.value);
  const remainingBalance = parseMoney(remainingBalanceInput.value);

  if (sourceField === "used") {
    if (amountUsed === null) {
      remainingBalanceInput.value = "";
      return;
    }

    remainingBalanceInput.value = roundCurrency(modalCurrentBalance - amountUsed).toFixed(2);
    return;
  }

  if (remainingBalance === null) {
    amountUsedInput.value = "";
    return;
  }

  amountUsedInput.value = roundCurrency(modalCurrentBalance - remainingBalance).toFixed(2);
}

function openBalanceModal() {
  const card = getSelectedCard();
  if (!card) {
    return;
  }

  modalStartingBalance = card.startingBalance;
  modalCurrentBalance = card.currentBalance;
  lastEditedBalanceField = "remaining";
  amountUsedInput.value = "";
  remainingBalanceInput.value = card.currentBalance.toFixed(2);
  balanceError.textContent = "";
  balanceModal.hidden = false;
  amountUsedInput.focus();
}

function closeBalanceModal() {
  balanceModal.hidden = true;
  updateBalanceButton.focus();
}

function saveBalanceUpdate() {
  const card = getSelectedCard();
  if (!card) {
    return;
  }

  if (lastEditedBalanceField === "used") {
    syncBalanceFields("used");
  } else {
    syncBalanceFields("remaining");
  }

  const nextRemainingBalance = parseMoney(remainingBalanceInput.value);
  const nextAmountUsed = parseMoney(amountUsedInput.value);
  const validationMessage = validateBalance(nextRemainingBalance, nextAmountUsed);

  if (validationMessage) {
    balanceError.textContent = validationMessage;
    return;
  }

  card.currentBalance = roundCurrency(nextRemainingBalance);
  card.dateUpdated = getTodayIsoDate();
  closeBalanceModal();
  renderApp();
}

function openFullscreenBarcode() {
  const card = getSelectedCard();
  if (!card) {
    return;
  }

  fullscreenCardNumber.textContent = card.cardNumber;
  fullscreenBarcode.hidden = false;
  barcodeCloseButton.focus();
}

function closeFullscreenBarcode() {
  fullscreenBarcode.hidden = true;
  barcodeOpenButton.focus();
}

function getZeroBalanceCards() {
  return sampleGiftCards.filter((card) => card.currentBalance === 0);
}

function openConfirmModal() {
  const zeroBalanceCount = getZeroBalanceCards().length;
  confirmMessage.textContent = `Mark ${zeroBalanceCount} zero-balance cards as Used?`;
  confirmModal.hidden = false;
  confirmCancelButton.focus();
}

function closeConfirmModal() {
  confirmModal.hidden = true;
  markZeroUsedButton.focus();
}

function markZeroBalanceCardsUsed() {
  getZeroBalanceCards().forEach((card) => {
    card.used = true;
  });
  closeConfirmModal();
  renderApp();
}

previousButton.addEventListener("click", () => moveSelection(-1));
nextButton.addEventListener("click", () => moveSelection(1));
markUsedButton.addEventListener("click", toggleSelectedCardUsed);
updateBalanceButton.addEventListener("click", openBalanceModal);
barcodeOpenButton.addEventListener("click", openFullscreenBarcode);
barcodeCloseButton.addEventListener("click", closeFullscreenBarcode);
markZeroUsedButton.addEventListener("click", openConfirmModal);

advanceOnUsedToggle.addEventListener("change", (event) => {
  settings.advanceOnUsed = event.target.checked;
  renderApp();
});

hideUsedToggle.addEventListener("change", (event) => {
  settings.hideUsed = event.target.checked;
  renderApp();
});

hideZeroToggle.addEventListener("change", (event) => {
  settings.hideZero = event.target.checked;
  renderApp();
});

sortCardsSelect.addEventListener("change", (event) => {
  settings.sortBy = event.target.value;
  renderApp();
});

amountUsedInput.addEventListener("input", () => {
  lastEditedBalanceField = "used";
  syncBalanceFields("used");
});

remainingBalanceInput.addEventListener("input", () => {
  lastEditedBalanceField = "remaining";
  syncBalanceFields("remaining");
});

balanceForm.addEventListener("submit", (event) => {
  event.preventDefault();
  saveBalanceUpdate();
});

balanceCancelButton.addEventListener("click", closeBalanceModal);
balanceModal.addEventListener("click", (event) => {
  if (event.target === balanceModal) {
    closeBalanceModal();
  }
});

confirmForm.addEventListener("submit", (event) => {
  event.preventDefault();
  markZeroBalanceCardsUsed();
});

confirmCancelButton.addEventListener("click", closeConfirmModal);
confirmModal.addEventListener("click", (event) => {
  if (event.target === confirmModal) {
    closeConfirmModal();
  }
});

fullscreenBarcode.addEventListener("click", (event) => {
  if (event.target === fullscreenBarcode) {
    closeFullscreenBarcode();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") {
    return;
  }

  if (!balanceModal.hidden) {
    closeBalanceModal();
  } else if (!confirmModal.hidden) {
    closeConfirmModal();
  } else if (!fullscreenBarcode.hidden) {
    closeFullscreenBarcode();
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

renderApp();
