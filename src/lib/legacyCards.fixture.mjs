// Frozen legacy localStorage contracts for the pre-IndexedDB regression suite.
// Not imported by the application. Production writes use inventory.js only.
import { bundledSampleGiftCards, normalizeCards, isPlainObject, serializeReviewInventory } from './cards.js';
import { storageKeys, saveJsonToStorage } from './storage.js';
import { readOptionalCardMetadata } from './csvSchema.js';
export function loadCards({ onEmptyStorage } = {}) {
  let raw;
  try {
    raw = localStorage.getItem(storageKeys.cards);
  } catch {
    // The app can still run in memory when browser storage is unavailable.
    return [...bundledSampleGiftCards];
  }
  if (raw === null) {
    const cards = [...bundledSampleGiftCards];
    onEmptyStorage?.(cards);
    return cards;
  }

  const invalidStorageMessage = "The stored cards could not be loaded. The original browser data is preserved.";
  let stored;
  try {
    stored = JSON.parse(raw);
  } catch {
    throw new Error(invalidStorageMessage);
  }
  if (Array.isArray(stored)) {
    for (const [index, card] of stored.entries()) {
      if (!isPlainObject(card)) continue;
      try {
        readOptionalCardMetadata(card);
      } catch (error) {
        throw new Error(`Stored card ${index + 1}: ${error.message} The original browser data is preserved.`);
      }
    }
  }
  const normalized = normalizeCards(stored);
  if (!normalized) {
    throw new Error(invalidStorageMessage);
  }
  return normalized;
}

export function saveCards(cards) {
  const normalized = normalizeCards(cards);
  if (normalized) {
    saveJsonToStorage(storageKeys.cards, normalized);
  }
}

function readReviewStorage() {
  try {
    return localStorage.getItem(storageKeys.cards);
  } catch {
    throw new Error("Browser storage is unavailable. Your balance has not been saved.");
  }
}

export function captureBalanceReviewStorage(cards, { allowEmptyStorage = false } = {}) {
  const raw = readReviewStorage();
  if (raw === null && allowEmptyStorage) return raw;

  let stored;
  try {
    stored = JSON.parse(raw);
  } catch {
    throw new Error("Stored card data is invalid. Balance review could not save it.");
  }
  if (raw === null || serializeReviewInventory(stored) !== serializeReviewInventory(cards)) {
    throw new Error("The saved inventory changed in this browser. Reload before continuing.");
  }
  return raw;
}

export function persistBalanceReviewCards(cards, expectedStorage) {
  const serialized = serializeReviewInventory(cards);
  if (readReviewStorage() !== expectedStorage) {
    throw new Error("The saved inventory changed in this browser. Reload before continuing.");
  }
  try {
    localStorage.setItem(storageKeys.cards, serialized);
  } catch {
    throw new Error("Could not save on this device. Free up browser storage or adjust its permissions, then retry.");
  }
  return serialized;
}
