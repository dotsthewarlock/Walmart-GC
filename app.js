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
const detailStatus = document.querySelector("#detail-status");
const detailNumber = document.querySelector("#detail-number");
const detailPin = document.querySelector("#detail-pin");
const detailBalance = document.querySelector("#detail-balance");
const detailStatusText = document.querySelector("#detail-status-text");
const detailNotes = document.querySelector("#detail-notes");

let selectedCardIndex = 0;

function formatBalance(balance) {
  return currencyFormatter.format(balance);
}

function renderCardList() {
  cardCount.textContent = `${sampleGiftCards.length} cards`;
  cardList.innerHTML = "";

  sampleGiftCards.forEach((card, index) => {
    const cardButton = document.createElement("button");
    cardButton.type = "button";
    cardButton.className = "card-button";
    cardButton.setAttribute("aria-pressed", String(index === selectedCardIndex));
    cardButton.addEventListener("click", () => selectCard(index));

    cardButton.innerHTML = `
      <div class="card-row-top">
        <span class="card-number">${card.cardNumber}</span>
        <span class="status-badge" data-status="${card.status}">${card.status}</span>
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
  const card = sampleGiftCards[selectedCardIndex];

  detailStatus.textContent = card.status;
  detailStatus.dataset.status = card.status;
  detailNumber.textContent = card.cardNumber;
  detailPin.textContent = card.pin;
  detailBalance.textContent = formatBalance(card.remainingBalance);
  detailStatusText.textContent = card.status;
  detailNotes.textContent = card.notes;
}

function selectCard(index) {
  selectedCardIndex = index;
  renderCardList();
  renderCardDetail();
}

renderCardList();
renderCardDetail();
