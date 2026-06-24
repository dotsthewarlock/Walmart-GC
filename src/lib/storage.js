export const storageKeys = {
  cards: "walmartGc.cards",
  settings: "walmartGc.settings",
  sync: "walmartGc.sync",
  oauth: "walmartGc.oauth",
  directSheets: "walmartGc.directSheets",
};

export function loadJsonFromStorage(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value === null ? fallback : JSON.parse(value);
  } catch {
    return fallback;
  }
}

export function saveJsonToStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Keep the in-memory session usable if storage is unavailable or full.
  }
}
