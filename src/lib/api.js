import { readOptionalCardMetadata, schemaCapability } from "./csvSchema.js";

export const googleOAuthStatuses = {
  disconnected: "disconnected",
  connecting: "connecting",
  connected: "connected",
  needsReconnect: "needs-reconnect",
  error: "error",
};

export const syncStatuses = {
  unsynced: "unsynced",
  syncing: "syncing",
  connected: "connected",
  conflict: "conflict",
};

export const directSheetsStatuses = {
  notConfigured: "not-configured",
  checking: "checking",
  ready: "ready",
  syncing: "syncing",
  needsAttention: "needs-attention",
  conflict: "conflict",
  error: "error",
};


export async function fetchWorkerJson(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    credentials: "include",
    headers: {
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.headers || {}),
    },
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = typeof payload.error === "string" && payload.error.trim()
      ? payload.error.trim()
      : (typeof payload.message === "string" && payload.message.trim()
        ? payload.message.trim()
        : `Worker request failed (${response.status}).`);
    const error = new Error(formatWorkerApiErrorMessage(message, payload));
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
}

function formatWorkerApiErrorMessage(message, payload) {
  const details = [];
  if (Array.isArray(payload?.missingHeaders) && payload.missingHeaders.length) {
    details.push(`Missing: ${payload.missingHeaders.join(", ")}.`);
  }
  if (Array.isArray(payload?.duplicateHeaders) && payload.duplicateHeaders.length) {
    details.push(`Duplicates: ${payload.duplicateHeaders.join(", ")}.`);
  }
  if (Array.isArray(payload?.recognizedHeaders)) {
    details.push(`Recognized row 1 headers: ${payload.recognizedHeaders.length ? payload.recognizedHeaders.join(", ") : "none"}.`);
  }
  if (Array.isArray(payload?.expectedHeaders) && payload.expectedHeaders.length) {
    details.push(`Expected approved headers: ${payload.expectedHeaders.join(", ")}.`);
  }
  return [message, ...details].filter(Boolean).join(" ");
}

// Older Workers reject requests without the legacy cards array before touching
// Sheets. The protected payload keeps metadata safe across a Worker rollback.
export async function saveWorkerCards(cards, baseSheetVersion, { acknowledgeMetadataRemoval = false } = {}) {
  const metadata = cards.map((card) => readOptionalCardMetadata(card));
  const hasMetadata = metadata.some((fields) => Object.keys(fields).length > 0);
  const inventory = hasMetadata ? { cardsWithMetadata: cards } : { cards };
  const request = { ...inventory, baseSheetVersion, schemaCapability };
  if (acknowledgeMetadataRemoval === true) request.acknowledgeMetadataRemoval = true;

  try {
    const result = await fetchWorkerJson("/api/cards/save", {
      method: "POST",
      body: JSON.stringify(request),
    });
    if (hasMetadata && result.schemaCapability !== schemaCapability) {
      throw new Error("The Worker did not confirm card metadata support. Keep a CSV backup and check the Sheet before retrying.");
    }
    return result;
  } catch (error) {
    if (hasMetadata && error.status === 400 && error.payload?.error === "Expected cards array.") {
      throw new Error("The connected Worker does not support card metadata. Update the Worker before syncing. Your local cards remain available for CSV backup.");
    }
    throw error;
  }
}
