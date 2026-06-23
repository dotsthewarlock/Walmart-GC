import { storageKeys, loadJsonFromStorage, saveJsonToStorage } from "./storage.js";

const walmartCaMerchant = "walmart-ca";
const walmartGiftCardNumberPattern = /^63\d{14}$/;

export const bundledSampleGiftCards = [
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

export function normalizeCardNumber(cardNumber) {
  return String(cardNumber ?? "").replace(/\D/g, "");
}

export function isValidWalmartGiftCardNumber(cardNumber) {
  return walmartGiftCardNumberPattern.test(String(cardNumber ?? "").trim());
}

export function normalizePinValue(pin) {
  return String(pin ?? "").trim();
}

export function normalizeMerchantValue(merchant) {
  return String(merchant ?? "").trim();
}

export function inferMerchantFromCardNumber(cardNumber) {
  return isValidWalmartGiftCardNumber(cardNumber) ? walmartCaMerchant : "";
}

export function getEffectiveMerchant(card) {
  const explicitMerchant = normalizeMerchantValue(card?.merchant);
  const storedInferredMerchant = normalizeMerchantValue(card?.merchantInferred);
  return explicitMerchant || storedInferredMerchant || inferMerchantFromCardNumber(card?.cardNumber);
}

const walmartCaBarcodePrefix = "79936686504000";

export function getBarcodeFallbackMessage(card) {
  if (!normalizeCardNumber(card?.cardNumber)) {
    return "Barcode unavailable";
  }
  const merchant = getEffectiveMerchant(card);
  if (merchant !== walmartCaMerchant) {
    return "Barcode unavailable for this merchant";
  }
  return "Barcode unavailable";
}

export function getBarcodePayload(card) {
  const cardNumber = normalizeCardNumber(card?.cardNumber);
  const merchant = getEffectiveMerchant(card);
  if (merchant !== walmartCaMerchant || !isValidWalmartGiftCardNumber(cardNumber)) {
    return "";
  }
  return `${walmartCaBarcodePrefix}${cardNumber}`;
}


export function parseOptionalMoney(value) {
  if (value === null || value === undefined || String(value).trim() === "") {
    return null;
  }
  return Number(value);
}

export function todayString() {
  return new Date().toISOString().slice(0, 10);
}

export function normalizeMoney(value) {
  return Math.round(value * 100) / 100;
}

export function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function normalizeBooleanField(value, fallback = false) {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number") {
    if (value === 1) return true;
    if (value === 0) return false;
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

export function normalizeDateField(value, fallback = "") {
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

export function normalizeCard(card) {
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

export function normalizeCards(cards) {
  if (!Array.isArray(cards)) {
    return null;
  }
  const normalizedCards = cards.map(normalizeCard);
  return normalizedCards.includes(null) ? null : normalizedCards;
}

export function isCardUsed(card) {
  return Boolean(card?.used);
}

export function getCardBalance(card) {
  return Number(card?.currentBalance ?? 0);
}

function getSortValue(card, mode) {
  switch (mode) {
    case "balance-desc":
    case "balance-asc":
      return card.currentBalance;
    case "date-added-desc":
    case "date-added-asc":
      return Date.parse(`${card.dateAdded}T00:00:00Z`) || 0;
    case "date-updated-desc":
    case "date-updated-asc":
      return Date.parse(`${card.dateUpdated}T00:00:00Z`) || 0;
    case "card-number":
      return card.cardNumber;
    default:
      return card.currentBalance;
  }
}

export function calculateVisibleCards(cards, settings, sortMode) {
  if (!Array.isArray(cards)) return [];
  const hideUsedCards = settings?.hideUsedCards ?? true;
  const hideZeroBalanceCards = settings?.hideZeroBalanceCards ?? false;
  const activeSortMode = sortMode || settings?.sortMode || "balance-asc";

  return cards
    .map((card, index) => ({ card, index }))
    .filter(({ card }) => !hideUsedCards || !card.used)
    .filter(({ card }) => !hideZeroBalanceCards || card.currentBalance !== 0)
    .sort((a, b) => {
      const aValue = getSortValue(a.card, activeSortMode);
      const bValue = getSortValue(b.card, activeSortMode);
      let result = 0;

      if (typeof aValue === "string") {
        result = aValue.localeCompare(bValue);
      } else {
        result = aValue - bValue;
      }

      if (activeSortMode.endsWith("desc")) {
        result *= -1;
      }

      return result || a.index - b.index;
    })
    .map(({ index }) => index);
}

export function calculateCardSummary(cards, settings) {
  if (!Array.isArray(cards)) {
    return {
      totalCount: 0,
      activeCount: 0,
      totalBalance: 0,
      activeBalance: 0,
    };
  }

  const sortMode = settings?.sortMode ?? "balance-asc";

  const totalCount = cards.length;
  const totalBalance = cards.reduce((sum, card) => sum + (card.currentBalance || 0), 0);

  const visibleIndexes = calculateVisibleCards(cards, settings, sortMode);
  const activeCount = visibleIndexes.length;
  const activeBalance = visibleIndexes.reduce((sum, index) => sum + (cards[index].currentBalance || 0), 0);

  return {
    totalCount,
    activeCount,
    totalBalance: Math.round(totalBalance * 100) / 100,
    activeBalance: Math.round(activeBalance * 100) / 100,
  };
}

export function loadCards() {
  const stored = loadJsonFromStorage(storageKeys.cards, null);
  const normalized = normalizeCards(stored);
  return normalized ?? [...bundledSampleGiftCards];
}

export function saveCards(cards) {
  const normalized = normalizeCards(cards);
  if (normalized) {
    saveJsonToStorage(storageKeys.cards, normalized);
  }
}
