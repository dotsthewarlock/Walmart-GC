import { getEffectiveMerchant, isValidWalmartGiftCardNumber, normalizeMoney, normalizePinValue } from "./cards.js";
import { isCalendarDate } from "./csvSchema.js";

export function parseVerifiedBalance(value) {
  const text = typeof value === "number" || typeof value === "string" ? String(value).trim() : "";
  const match = /^(?:(\d+)(?:[.,](\d{1,2}))?|[.,](\d{1,2}))$/.exec(text);
  const invalid = "Enter a nonnegative CAD amount with up to two decimal places.";
  if (!match) throw new Error(invalid);

  const [, units = "0", fraction, leadingFraction] = match;
  const decimals = (fraction ?? leadingFraction ?? "").padEnd(2, "0");
  const cents = Number(units + decimals);
  const balance = cents / 100;
  const significantDecimals = decimals.replace(/0+$/, "");
  const canonical = significantDecimals ? `${Number(units)}.${significantDecimals}` : String(Number(units));
  // The wallet stores dollars as a Number. Both display and reload must retain the same cents.
  if (!Number.isSafeInteger(cents) || String(balance) !== canonical || balance.toFixed(2) !== `${Number(units)}.${decimals}`
      || normalizeMoney(balance) !== balance) {
    throw new Error("This amount is too large to store accurately in cents.");
  }
  return balance;
}

function observationDate(timestamp) {
  let date = timestamp;
  if (typeof timestamp === "string") {
    const isoTime = /^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,3})?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/;
    if (!isoTime.test(timestamp) || !isCalendarDate(timestamp.slice(0, 10))) {
      throw new Error("The observation needs a valid timestamp with a time zone.");
    }
    date = new Date(timestamp);
  }
  if (!(date instanceof Date) || !Number.isFinite(date.getTime())) {
    throw new Error("The observation needs a valid timestamp with a time zone.");
  }
  const day = date.toISOString().slice(0, 10);
  if (!isCalendarDate(day)) throw new Error("The observation needs a valid UTC calendar date.");
  return day;
}

function isEligible(card) {
  return typeof card?.cardNumber === "string" && card.cardNumber === card.cardNumber.trim()
    && isValidWalmartGiftCardNumber(card.cardNumber) && normalizePinValue(card.pin).length >= 4
    && Number.isFinite(card.currentBalance)
    && getEffectiveMerchant(card) === "walmart-ca";
}

export function createBalanceReviewQueue(cards) {
  const counts = new Map();
  for (const card of cards) {
    const cardNumber = card?.cardNumber;
    counts.set(cardNumber, (counts.get(cardNumber) ?? 0) + 1);
  }
  return cards.filter((card) => isEligible(card) && counts.get(card.cardNumber) === 1)
    .map((card) => ({ card, snapshot: { ...card } }))
    .sort(({ snapshot: a }, { snapshot: b }) =>
      (a.lastBalanceChecked || "").localeCompare(b.lastBalanceChecked || "")
      || a.cardNumber.localeCompare(b.cardNumber));
}

export function applyBalanceObservation(cards, { cardNumber, observedBalance, checkedAt, expected }) {
  const matches = cards.filter((card) => card?.cardNumber === cardNumber);
  if (matches.length !== 1 || !expected?.snapshot || expected.snapshot.cardNumber !== cardNumber) {
    throw new Error("This card is missing or ambiguous. Exit and restart the review.");
  }
  const [card] = matches;
  const { snapshot } = expected;
  if (!isEligible(card) || card !== expected.card || Object.keys(card).length !== Object.keys(snapshot).length
      || Object.keys(snapshot).some((field) => !Object.is(card[field], snapshot[field]))) {
    throw new Error("This card changed during review. Exit and restart the review.");
  }
  const currentBalance = parseVerifiedBalance(observedBalance);
  const lastBalanceChecked = observationDate(checkedAt);
  if (card.lastBalanceChecked && lastBalanceChecked < card.lastBalanceChecked) {
    throw new Error("This observation is older than the last verification.");
  }

  const verified = card.currentBalance === currentBalance
    ? { ...card, lastBalanceChecked }
    : { ...card, currentBalance, lastBalanceChecked, dateUpdated: lastBalanceChecked };
  return cards.map((entry) => entry === card ? verified : entry);
}
