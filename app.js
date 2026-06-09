const sampleGiftCards = [
  {
    cardNumber: "•••• •••• •••• 1042",
    pin: "4821",
    startingBalance: 50,
    remainingBalance: 50,
    status: "Unused",
    notes: "Sample card ready for checkout testing.",
    lastUpdated: "2026-06-09",
  },
  {
    cardNumber: "•••• •••• •••• 2388",
    pin: "9064",
    startingBalance: 100,
    remainingBalance: 37.42,
    status: "Partial",
    notes: "Partially used sample card with a remaining balance.",
    lastUpdated: "2026-06-09",
  },
  {
    cardNumber: "•••• •••• •••• 7715",
    pin: "1138",
    startingBalance: 25,
    remainingBalance: 0,
    status: "Used",
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
const hideUsedToggle = document.querySelector("#hide-used-toggle");
const previousCardButton = document.querySelector("#previous-card");
const nextCardButton = document.querySelector("#next-card");
const cardPosition = document.querySelector("#card-position");
const updateBalanceButton = document.querySelector("#update-balance");
const markUsedButton = document.querySelector("#mark-used");
const openFullscreenButton = document.querySelector("#open-fullscreen");
const closeFullscreenButton = document.querySelector("#close-fullscreen");
const fullscreenBarcode = document.querySelector("#fullscreen-barcode");
const cardDetail = document.querySelector("#card-detail");
const detailStatus = document.querySelector("#detail-status");
const detailNumber = document.querySelector("#detail-number");
const detailPin = document.querySelector("#detail-pin");
const detailBalance = document.querySelector("#detail-balance");
const detailStatusText = document.querySelector("#detail-status-text");
const detailNotes = document.querySelector("#detail-notes");
const fullscreenNumber = document.querySelector("#fullscreen-number");
const fullscreenPin = document.querySelector("#fullscreen-pin");
const fullscreenBalance = document.querySelector("#fullscreen-balance");

let selectedCardIndex = 0;
let hideUsedCards = false;
let touchStartX = 0;
let touchStartY = 0;

function formatBalance(balance) {
  return currencyFormatter.format(balance);
}

function getDerivedStatus(card) {
  if (card.remainingBalance === 0) {
    return "Used";
  }

  if (card.remainingBalance === card.startingBalance) {
    return "Unused";
  }

  return "Partial";
}

function syncDerivedStatus(card) {
  card.status = getDerivedStatus(card);
}

function getVisibleCardIndices() {
  return sampleGiftCards
    .map((card, index) => ({ card, index }))
    .filter(({ card }) => !hideUsedCards || card.status !== "Used")
    .map(({ index }) => index);
}

function getCurrentVisiblePosition(visibleCardIndices = getVisibleCardIndices()) {
  return visibleCardIndices.indexOf(selectedCardIndex);
}

function getSelectedCard() {
  return sampleGiftCards[selectedCardIndex];
}

function normalizeSelection() {
  const visibleCardIndices = getVisibleCardIndices();

  if (visibleCardIndices.length === 0) {
    selectedCardIndex = -1;
    return visibleCardIndices;
  }

  if (!visibleCardIndices.includes(selectedCardIndex)) {
    selectedCardIndex = visibleCardIndices[0];
  }

  return visibleCardIndices;
}


function createStatusBadge(status) {
  const badge = document.createElement("span");
  badge.className = "status-badge";
  badge.dataset.status = status;
  badge.textContent = status;
  return badge;
}

function createCardButton(card, index) {
  const cardButton = document.createElement("button");
  cardButton.type = "button";
  cardButton.className = "card-button";
  cardButton.setAttribute("aria-pressed", String(index === selectedCardIndex));
  cardButton.addEventListener("click", () => selectCard(index));

  const rowTop = document.createElement("div");
  rowTop.className = "card-row-top";

  const cardNumber = document.createElement("span");
  cardNumber.className = "card-number";
  cardNumber.textContent = card.cardNumber;

  rowTop.append(cardNumber, createStatusBadge(card.status));

  const rowBottom = document.createElement("div");
  rowBottom.className = "card-row-bottom";

  const balanceLabel = document.createElement("span");
  balanceLabel.className = "card-note";
  balanceLabel.textContent = "Balance";

  const cardBalance = document.createElement("span");
  cardBalance.className = "card-balance";
  cardBalance.textContent = formatBalance(card.remainingBalance);

  rowBottom.append(balanceLabel, cardBalance);
  cardButton.append(rowTop, rowBottom);

  return cardButton;
}

function renderCardList() {
  const visibleCardIndices = normalizeSelection();
  cardCount.textContent = `${visibleCardIndices.length} of ${sampleGiftCards.length} cards`;
  cardList.textContent = "";

  if (visibleCardIndices.length === 0) {
    const emptyState = document.createElement("p");
    emptyState.className = "empty-state";
    emptyState.textContent = "No visible cards. Turn off Hide used cards to view used cards.";
    cardList.appendChild(emptyState);
    return visibleCardIndices;
  }

  visibleCardIndices.forEach((index) => {
    cardList.appendChild(createCardButton(sampleGiftCards[index], index));
  });

  return visibleCardIndices;
}

function renderCardDetail(visibleCardIndices = getVisibleCardIndices()) {
  const card = getSelectedCard();
  const currentPosition = getCurrentVisiblePosition(visibleCardIndices);
  const hasCards = Boolean(card) && currentPosition >= 0;

  previousCardButton.disabled = !hasCards || currentPosition === 0;
  nextCardButton.disabled = !hasCards || currentPosition === visibleCardIndices.length - 1;
  updateBalanceButton.disabled = !hasCards;
  markUsedButton.disabled = !hasCards;
  openFullscreenButton.disabled = !hasCards;

  if (!hasCards) {
    cardPosition.textContent = "Card 0 of 0";
    detailStatus.textContent = "Status";
    delete detailStatus.dataset.status;
    detailNumber.textContent = "—";
    detailPin.textContent = "—";
    detailBalance.textContent = "—";
    detailStatusText.textContent = "—";
    detailNotes.textContent = "No card selected.";
    renderFullscreenDetail(null);
    return;
  }

  cardPosition.textContent = `Card ${currentPosition + 1} of ${visibleCardIndices.length}`;
  detailStatus.textContent = card.status;
  detailStatus.dataset.status = card.status;
  detailNumber.textContent = card.cardNumber;
  detailPin.textContent = card.pin;
  detailBalance.textContent = formatBalance(card.remainingBalance);
  detailStatusText.textContent = card.status;
  detailNotes.textContent = card.notes;
  renderFullscreenDetail(card);
}

function renderFullscreenDetail(card = getSelectedCard()) {
  if (!card) {
    fullscreenNumber.textContent = "—";
    fullscreenPin.textContent = "—";
    fullscreenBalance.textContent = "—";
    return;
  }

  fullscreenNumber.textContent = card.cardNumber;
  fullscreenPin.textContent = card.pin;
  fullscreenBalance.textContent = formatBalance(card.remainingBalance);
}

function renderApp() {
  sampleGiftCards.forEach(syncDerivedStatus);
  const visibleCardIndices = renderCardList();
  renderCardDetail(visibleCardIndices);
}

function selectCard(index) {
  selectedCardIndex = index;
  renderApp();
}

function navigateCard(direction) {
  const visibleCardIndices = getVisibleCardIndices();
  const currentPosition = getCurrentVisiblePosition(visibleCardIndices);
  const nextPosition = currentPosition + direction;

  if (nextPosition < 0 || nextPosition >= visibleCardIndices.length) {
    return;
  }

  selectedCardIndex = visibleCardIndices[nextPosition];
  renderApp();
}

function promptForBalance() {
  const card = getSelectedCard();

  if (!card) {
    return;
  }

  const response = window.prompt(
    "Enter the new remaining balance:",
    card.remainingBalance.toFixed(2),
  );

  if (response === null) {
    return;
  }

  const newBalance = Number.parseFloat(response.trim());

  if (!Number.isFinite(newBalance) || newBalance < 0 || newBalance > card.startingBalance) {
    window.alert(`Enter a balance from 0 to ${formatBalance(card.startingBalance)}.`);
    return;
  }

  card.remainingBalance = Number(newBalance.toFixed(2));
  syncDerivedStatus(card);
  renderApp();
}

function markSelectedCardUsed() {
  const card = getSelectedCard();

  if (!card) {
    return;
  }

  const visibleCardIndices = getVisibleCardIndices();
  const currentPosition = getCurrentVisiblePosition(visibleCardIndices);

  card.remainingBalance = 0;
  syncDerivedStatus(card);

  if (hideUsedCards) {
    const remainingVisibleCardIndices = getVisibleCardIndices();
    const nextPosition = Math.min(currentPosition, remainingVisibleCardIndices.length - 1);
    selectedCardIndex = remainingVisibleCardIndices[nextPosition] ?? -1;
  }

  renderApp();
}

function toggleHideUsedCards() {
  hideUsedCards = hideUsedToggle.checked;
  renderApp();
}

function openFullscreenBarcode() {
  if (!getSelectedCard()) {
    return;
  }

  renderFullscreenDetail();
  fullscreenBarcode.classList.add("is-open");
  fullscreenBarcode.setAttribute("aria-hidden", "false");
  document.body.classList.add("fullscreen-open");
  closeFullscreenButton.focus();
}

function closeFullscreenBarcode() {
  fullscreenBarcode.classList.remove("is-open");
  fullscreenBarcode.setAttribute("aria-hidden", "true");
  document.body.classList.remove("fullscreen-open");
  openFullscreenButton.focus();
}

function handleTouchStart(event) {
  const touch = event.changedTouches[0];
  touchStartX = touch.screenX;
  touchStartY = touch.screenY;
}

function handleTouchEnd(event) {
  const touch = event.changedTouches[0];
  const deltaX = touch.screenX - touchStartX;
  const deltaY = touch.screenY - touchStartY;
  const minimumSwipeDistance = 50;

  if (Math.abs(deltaX) < minimumSwipeDistance || Math.abs(deltaX) < Math.abs(deltaY)) {
    return;
  }

  if (deltaX < 0) {
    navigateCard(1);
  } else {
    navigateCard(-1);
  }
}

previousCardButton.addEventListener("click", () => navigateCard(-1));
nextCardButton.addEventListener("click", () => navigateCard(1));
hideUsedToggle.addEventListener("change", toggleHideUsedCards);
updateBalanceButton.addEventListener("click", promptForBalance);
markUsedButton.addEventListener("click", markSelectedCardUsed);
openFullscreenButton.addEventListener("click", openFullscreenBarcode);
closeFullscreenButton.addEventListener("click", closeFullscreenBarcode);
cardDetail.addEventListener("touchstart", handleTouchStart, { passive: true });
cardDetail.addEventListener("touchend", handleTouchEnd, { passive: true });
fullscreenBarcode.addEventListener("touchstart", handleTouchStart, { passive: true });
fullscreenBarcode.addEventListener("touchend", handleTouchEnd, { passive: true });

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && fullscreenBarcode.classList.contains("is-open")) {
    closeFullscreenBarcode();
  }
});

renderApp();
