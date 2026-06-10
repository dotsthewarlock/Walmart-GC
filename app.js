const sampleGiftCards = [
  {
    cardNumber: "•••• •••• •••• 1042",
    pin: "4821",
    startingBalance: 50,
    remainingBalance: 50,
    notes: "Sample card ready for checkout testing.",
    lastUpdated: "2026-06-09",
  },
  {
    cardNumber: "•••• •••• •••• 2388",
    pin: "9064",
    startingBalance: 100,
    remainingBalance: 37.42,
    notes: "Partially used sample card with a remaining balance.",
    lastUpdated: "2026-06-09",
  },
  {
    cardNumber: "•••• •••• •••• 7715",
    pin: "1138",
    startingBalance: 25,
    remainingBalance: 0,
    notes: "Used sample card retained for status visibility.",
    lastUpdated: "2026-06-09",
  },
];

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

const cardList = document.querySelector("#card-list");
const cardCount = document.querySelector("#card-count");
const hideUsedCheckbox = document.querySelector("#hide-used");
const detailStatus = document.querySelector("#detail-status");
const detailNumber = document.querySelector("#detail-number");
const detailPin = document.querySelector("#detail-pin");
const detailBalance = document.querySelector("#detail-balance");
const detailStatusText = document.querySelector("#detail-status-text");
const detailNotes = document.querySelector("#detail-notes");
const previousButton = document.querySelector("#prev-card");
const nextButton = document.querySelector("#next-card");
const cardPosition = document.querySelector("#card-position");
const balanceForm = document.querySelector("#balance-form");
const balanceInput = document.querySelector("#balance-input");
const markUsedButton = document.querySelector("#mark-used");
const barcodeOpenButton = document.querySelector("#barcode-open");
const fullscreenBarcode = document.querySelector("#fullscreen-barcode");
const barcodeCloseButton = document.querySelector("#barcode-close");
const fullscreenCardNumber = document.querySelector("#fullscreen-card-number");
const cardDetail = document.querySelector("#card-detail");

let selectedCardIndex = 0;
let hideUsedCards = false;
let touchStartX = 0;
let touchStartY = 0;

function formatBalance(balance) {
  return currencyFormatter.format(balance);
}

function deriveStatus(card) {
  if (card.remainingBalance <= 0) {
    return "Used";
  }

  if (card.remainingBalance >= card.startingBalance) {
    return "Unused";
  }

  return "Partial";
}

function getVisibleCardIndexes() {
  return sampleGiftCards
    .map((card, index) => ({ card, index }))
    .filter(({ card }) => !hideUsedCards || deriveStatus(card) !== "Used")
    .map(({ index }) => index);
}

function getSelectedVisiblePosition() {
  return getVisibleCardIndexes().indexOf(selectedCardIndex);
}

function ensureVisibleSelection() {
  const visibleIndexes = getVisibleCardIndexes();

  if (visibleIndexes.length === 0) {
    selectedCardIndex = -1;
    return;
  }

  if (!visibleIndexes.includes(selectedCardIndex)) {
    selectedCardIndex = visibleIndexes[0];
  }
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
    cardList.innerHTML = '<p class="empty-state">No active cards to show.</p>';
    return;
  }

  visibleIndexes.forEach((cardIndex) => {
    const card = sampleGiftCards[cardIndex];
    const status = deriveStatus(card);
    const cardButton = document.createElement("button");
    cardButton.type = "button";
    cardButton.className = "card-button";
    cardButton.setAttribute("aria-pressed", String(cardIndex === selectedCardIndex));
    cardButton.addEventListener("click", () => selectCard(cardIndex));

    cardButton.innerHTML = `
      <div class="card-row-top">
        <span class="card-number">${card.cardNumber}</span>
        <span class="status-badge" data-status="${status}">${status}</span>
      </div>
      <div class="card-row-bottom">
        <span class="card-note">Balance</span>
        <span class="card-balance">${formatBalance(card.remainingBalance)}</span>
      </div>
    `;

    cardList.appendChild(cardButton);
  });
}

function renderCardDetail() {
  const visibleIndexes = getVisibleCardIndexes();

  if (selectedCardIndex < 0 || visibleIndexes.length === 0) {
    detailStatus.textContent = "No cards";
    detailStatus.dataset.status = "";
    detailNumber.textContent = "—";
    detailPin.textContent = "—";
    detailBalance.textContent = "—";
    detailStatusText.textContent = "—";
    detailNotes.textContent = "No cards match the current filter.";
    cardPosition.textContent = "Card 0 of 0";
    balanceInput.value = "";
    previousButton.disabled = true;
    nextButton.disabled = true;
    markUsedButton.disabled = true;
    barcodeOpenButton.disabled = true;
    return;
  }

  const card = sampleGiftCards[selectedCardIndex];
  const status = deriveStatus(card);
  const visiblePosition = getSelectedVisiblePosition();

  detailStatus.textContent = status;
  detailStatus.dataset.status = status;
  detailNumber.textContent = card.cardNumber;
  detailPin.textContent = card.pin;
  detailBalance.textContent = formatBalance(card.remainingBalance);
  detailStatusText.textContent = status;
  detailNotes.textContent = card.notes;
  cardPosition.textContent = `Card ${visiblePosition + 1} of ${visibleIndexes.length}`;
  balanceInput.value = card.remainingBalance.toFixed(2);
  previousButton.disabled = visiblePosition <= 0;
  nextButton.disabled = visiblePosition === visibleIndexes.length - 1;
  markUsedButton.disabled = status === "Used";
  barcodeOpenButton.disabled = false;
  fullscreenCardNumber.textContent = card.cardNumber;
}

function renderApp() {
  ensureVisibleSelection();
  renderCardList();
  renderCardDetail();
}

function selectCard(index) {
  selectedCardIndex = index;
  renderApp();
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

function updateSelectedBalance(balance) {
  if (selectedCardIndex < 0) {
    return;
  }

  sampleGiftCards[selectedCardIndex].remainingBalance = Math.max(0, balance);
  renderApp();
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
hideUsedCheckbox.addEventListener("change", (event) => {
  hideUsedCards = event.target.checked;
  renderApp();
});

balanceForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const nextBalance = Number.parseFloat(balanceInput.value);

  if (Number.isNaN(nextBalance)) {
    return;
  }

  updateSelectedBalance(nextBalance);
});

markUsedButton.addEventListener("click", () => updateSelectedBalance(0));
barcodeOpenButton.addEventListener("click", openFullscreenBarcode);
barcodeCloseButton.addEventListener("click", closeFullscreenBarcode);
fullscreenBarcode.addEventListener("click", (event) => {
  if (event.target === fullscreenBarcode) {
    closeFullscreenBarcode();
  }
});

document.addEventListener("keydown", (event) => {
  if (!fullscreenBarcode.hidden && event.key === "Escape") {
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
