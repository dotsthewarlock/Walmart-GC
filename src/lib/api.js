export const googleOAuthStatuses = {
  disconnected: "disconnected",
  connecting: "connecting",
  connected: "connected",
  needsReconnect: "needs-reconnect",
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
