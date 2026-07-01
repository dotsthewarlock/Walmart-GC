import { storageKeys, loadJsonFromStorage, saveJsonToStorage } from "./storage.js";

export const defaultSettings = {
  advanceOnMarkUsed: true,
  hideUsedCards: true,
  hideZeroBalanceCards: false,
  sortMode: "balance-asc",
  themeMode: "system",
};

const allowedSortModes = [
  "balance-asc",
  "balance-desc",
  "date-added-asc",
  "date-added-desc",
  "date-updated-asc",
  "date-updated-desc",
  "card-number",
];

export function normalizeStoredSettings(settings) {
  if (!settings || typeof settings !== "object" || Array.isArray(settings)) {
    return { ...defaultSettings };
  }

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
    themeMode: ["light", "dark", "system"].includes(settings.themeMode)
      ? settings.themeMode
      : defaultSettings.themeMode,
  };
}

export function loadSettings() {
  const stored = loadJsonFromStorage(storageKeys.settings, null);
  return normalizeStoredSettings(stored);
}

export function saveSettings(settings) {
  const normalized = normalizeStoredSettings(settings);
  saveJsonToStorage(storageKeys.settings, normalized);
}
