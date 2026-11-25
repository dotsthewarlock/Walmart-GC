
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


const cooldownKey='walmartGc.syncRetryAfter';
let retryAt=0;
const limitedPath=path=>['/api/status','/api/sync','/api/sheet/ensure'].includes(path);
function rateError(until){return Object.assign(new Error('Synchronization temporarily limited. Local cards remain saved.'),{status:429,retryAt:until});}
export async function fetchWorkerJson(path, options = {}) {
  if(limitedPath(path)){
    try{retryAt=Math.max(retryAt,Number(globalThis.localStorage?.getItem(cooldownKey))||0);}catch{/* local preferences unavailable */}
    if(retryAt>Date.now())throw rateError(retryAt);
  }
  const response = await fetch(path, {
    ...options,
    signal:options.signal??AbortSignal.timeout(30000),
    credentials: "include",
    headers: {
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.headers || {}),
    },
  });

  const payload = await response.json().catch(error=>{if(error.name==='AbortError'||error.name==='TimeoutError')throw error;return {};});
  if(response.status===429&&limitedPath(path)){
    const header=response.headers.get('Retry-After');
    const until=header&&/^\d+$/.test(header)?Date.now()+Number(header)*1000:Date.parse(header||'');
    const daily=payload.code==='kv_daily_limit'&&Number(payload.retryAt)>Date.now();
    retryAt=Math.max(daily?Number(payload.retryAt):Date.now()+900000,Number(payload.retryAt)||0,Number.isFinite(until)?until:0);
    try{globalThis.localStorage?.setItem(cooldownKey,String(retryAt));}catch{/* in-memory cooldown remains */}
    throw rateError(retryAt);
  }
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

// Compatibility entry point for callers of the retired whole-inventory helper.
// It deliberately cannot issue network traffic; the transactional engine owns writes.
export async function saveWorkerCards() {
  throw new Error("Whole-inventory saves are retired. Use protected synchronization; local cards remain saved.");
}
