import { validateInventory } from '../../src/lib/inventory.js';
import { syncProtocol, fingerprint, snapshotContent, emptyEvidence, validateEvidence, equal } from '../../src/lib/syncProtocol.js';
import { coordinate } from './syncCoordinator.js';
import {
  requiredCardHeaders as CARD_HEADERS, oldApprovedCsvHeaders as OLD_CARD_HEADERS,
  optionalCardHeaders, csvHeaders as APPROVED_CARD_HEADERS, readOptionalCardMetadata, schemaCapability,
} from "../../src/lib/csvSchema.js";

const OAUTH_SCOPE = "https://www.googleapis.com/auth/drive.file";
const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const SESSION_COOKIE = "walmart_gc_session";
const SESSION_COOKIE_ATTRIBUTES = "HttpOnly; Secure; SameSite=Lax; Path=/";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;
const OAUTH_STATE_TTL_SECONDS = 60 * 5;
const DEFAULT_SHEET_NAME = "Walmart-GC Data";
const GOOGLE_DRIVE_API = "https://www.googleapis.com/drive/v3";
const GOOGLE_SHEETS_API = "https://sheets.googleapis.com/v4/spreadsheets";
const GOOGLE_SPREADSHEET_MIME_TYPE = "application/vnd.google-apps.spreadsheet";
const CARDS_TAB = "Cards";
const CARDS_RANGE = `'${CARDS_TAB}'`;
const META_TAB = "_META";
const DEFAULT_TAB = "Sheet1";
const APP_NAME = "Walmart-GC";
const SCHEMA_VERSION = "1";
const WORKER_VERSION = "automatic-sync-v0.3";
const SCHEMA_MODE = "header-name";
const WALMART_GIFT_CARD_NUMBER_PATTERN = /^63\d{14}$/;

const DEFAULT_FRONTEND_ORIGIN = "https://walmart-gc.dotsthewarlock.com";
const DEFAULT_REDIRECT_URI = "https://walmart-gc.dotsthewarlock.com/auth/callback";
const FRONTEND_CONNECTED_PATH = "/?auth=connected";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const pathname = normalizePathname(url.pathname);

    if (request.method === "OPTIONS") {
      return handleOptions(request, env);
    }

    try {
      const response = await routeRequest(request, env, pathname);
      return withCors(request, response, env);
    } catch (error) {
      if (error instanceof HttpError) {
        return withCors(request, jsonResponse(error.body, error.status), env);
      }
      return withCors(request, jsonResponse({ ok: false, error: "server_error", message: safeErrorMessage(error) }, 500), env);
    }
  },
};

async function routeRequest(request, env, pathname) {
  if (pathname === "/") {
    return routeHealthRequest(request);
  }

  if (pathname.startsWith("/auth/")) {
    return routeAuthRequest(request, env, pathname);
  }

  if (pathname.startsWith("/api/")) {
    return routeApiRequest(request, env, pathname);
  }

  return jsonResponse({ error: "not_found" }, 404);
}

function routeHealthRequest(request) {
  if (request.method !== "GET") {
    return methodNotAllowed(["GET"]);
  }
  return jsonResponse({
    ok: true,
    service: "walmart-gc-oauth",
    workerVersion: WORKER_VERSION,
    schemaMode: SCHEMA_MODE,
    schemaCapability,
  });
}

async function routeAuthRequest(request, env, pathname) {
  if (request.method === "GET" && pathname === "/auth/init") {
    return handleAuthInit(request, env);
  }

  if (request.method === "GET" && pathname === "/auth/callback") {
    return handleAuthCallback(request, env);
  }

  return jsonResponse({ error: "not_found" }, 404);
}

async function routeApiRequest(request, env, pathname) {
  if(request.method==='POST'&&request.headers.get('Origin')&&request.headers.get('Origin')!==getFrontendOrigin(env))return jsonResponse({error:'Use the same-origin wallet API.'},403);
  if (request.method === "GET" && pathname === "/api/status") {
    return handleStatus(request, env);
  }

  if (request.method === "POST" && pathname === "/api/logout") {
    return handleLogout(request, env);
  }

  if (request.method === "POST" && ["/api/sync", "/api/sheet/ensure", "/api/cards/save"].includes(pathname)) {
    return handleProtectedSync(request, env, pathname);
  }

  if (request.method === "GET" && pathname === "/api/cards/load") {
    return handleProtectedSync(request, env, pathname);
  }



  return jsonResponse({ error: "not_found" }, 404);
}

function normalizePathname(pathname) {
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.slice(0, -1);
  }
  return pathname;
}

function methodNotAllowed(allowedMethods) {
  return jsonResponse(
    { error: "method_not_allowed" },
    405,
    { Allow: allowedMethods.join(", ") },
  );
}

async function handleAuthInit(request, env) {
  assertOAuthConfig(env);

  const existingSession = await getOptionalSession(request, env);
  const state = randomBase64Url(32);
  const verifier = randomBase64Url(64);
  const challenge = await sha256Base64Url(verifier);

  await env.OAUTH_STATE.put(
    oauthStateKey(state),
    JSON.stringify({
      verifier,
      createdAt: new Date().toISOString(),
      existingSessionKey: existingSession?.key || "",
    }),
    { expirationTtl: OAUTH_STATE_TTL_SECONDS },
  );

  const authUrl = new URL(GOOGLE_AUTH_URL);
  authUrl.searchParams.set("client_id", env.GOOGLE_CLIENT_ID);
  authUrl.searchParams.set("redirect_uri", getRedirectUri(env));
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("access_type", "offline");
  authUrl.searchParams.set("prompt", "consent");
  authUrl.searchParams.set("scope", OAUTH_SCOPE);
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("code_challenge", challenge);
  authUrl.searchParams.set("code_challenge_method", "S256");

  return Response.redirect(authUrl.toString(), 302);
}

async function handleAuthCallback(request, env) {
  assertOAuthConfig(env);

  const url = new URL(request.url);
  const state = url.searchParams.get("state") || "";
  const code = url.searchParams.get("code") || "";
  const oauthError = url.searchParams.get("error") || "";

  if (oauthError) {
    return textResponse("OAuth authorization was not completed.", 400);
  }

  if (!state || !code) {
    return textResponse("Missing OAuth state or code.", 400);
  }

  const stateKey = oauthStateKey(state);
  const storedState = await env.OAUTH_STATE.get(stateKey, { type: "json" });
  await env.OAUTH_STATE.delete(stateKey);

  if (!storedState?.verifier) {
    return textResponse("Invalid or expired OAuth state.", 400);
  }

  const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      code,
      code_verifier: storedState.verifier,
      grant_type: "authorization_code",
      redirect_uri: getRedirectUri(env),
    }),
  });

  const tokenPayload = await tokenResponse.json().catch(() => ({}));
  if (!tokenResponse.ok) {
    return textResponse("OAuth token exchange failed.", 502);
  }

  const existingSession = await loadSessionByKey(env, storedState.existingSessionKey);
  if (!tokenPayload.access_token) return textResponse("OAuth returned no usable access token.", 400);
  const user = await readGooglePrincipal(tokenPayload.access_token);
  const sameAccount = existingSession?.principal === user.permissionId;
  const refreshToken = tokenPayload.refresh_token || (sameAccount ? existingSession.refreshToken : "");
  if (!refreshToken) {
    return textResponse("OAuth did not return a refresh token. Revoke prior consent for this app, then connect again.", 400);
  }

  const grantedScope = String(tokenPayload.scope || OAUTH_SCOPE);
  if (!grantedScope.split(/\s+/).includes(OAUTH_SCOPE)) {
    return textResponse("OAuth grant is missing the required drive.file scope.", 400);
  }

  const sessionId = randomBase64Url(32);
  const session = {
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    principal: user.permissionId,
    email: user.emailAddress || "",
    name: user.displayName || "",
    sheetId: sameAccount ? existingSession.sheetId || "" : "",
    sheetName: sameAccount ? existingSession.sheetName || DEFAULT_SHEET_NAME : DEFAULT_SHEET_NAME,
    scope: OAUTH_SCOPE,
    accessToken: tokenPayload.access_token || "",
    refreshToken,
    tokenType: tokenPayload.token_type || "Bearer",
    expiresAt: tokenPayload.expires_in
      ? new Date(Date.now() + Number(tokenPayload.expires_in) * 1000).toISOString()
      : "",
  };

  const newSessionKey = await sessionKey(env, sessionId);
  await env.SESSIONS.put(newSessionKey, JSON.stringify(session), {
    expirationTtl: SESSION_TTL_SECONDS,
  });
  if (storedState.existingSessionKey && storedState.existingSessionKey !== newSessionKey) {
    await env.SESSIONS.delete(storedState.existingSessionKey);
  }

  const redirectTo = `${getFrontendOrigin(env)}${FRONTEND_CONNECTED_PATH}`;
  return new Response(null, {
    status: 302,
    headers: {
      Location: redirectTo,
      "Set-Cookie": buildSessionCookie(sessionId, SESSION_TTL_SECONDS),
      "Cache-Control": "no-store",
    },
  });
}

function sheetSetupRequired() {
  return new HttpError(409, {
    ok: false,
    error: "Use Fix Sheet to initialize Walmart-GC Data, then load it before syncing.",
  });
}

async function handleStatus(request, env) {
  const sessionCookie = readSessionCookie(request);
  const sessionContext = await getOptionalSession(request, env);
  if (!sessionContext) {
    return jsonResponse(
      { authenticated: false, workerVersion: WORKER_VERSION, schemaMode: SCHEMA_MODE, schemaCapability },
      200,
      sessionCookie ? { "Set-Cookie": buildSessionCookie("", 0) } : {},
    );
  }

  try {
    const token = await getGoogleAccessToken(env, sessionContext);
    await verifySessionPrincipal(env, sessionContext, token);
    const file = await findOwnedSheet(token, sessionContext.session.principal, sessionContext.session.sheetId).catch(error => {if(error instanceof HttpError && error.status!==401)return null;throw error;});
    await saveSession(env, sessionContext, {sheetId:file?.id||'',sheetName:file?.name||DEFAULT_SHEET_NAME});
  } catch (error) {
    if (!(error instanceof HttpError) || error.status !== 401) {
      throw error;
    }
    await env.SESSIONS.delete(sessionContext.key);
    return jsonResponse(
      { authenticated: false, workerVersion: WORKER_VERSION, schemaMode: SCHEMA_MODE, schemaCapability },
      200,
      { "Set-Cookie": buildSessionCookie("", 0) },
    );
  }

  return jsonResponse(
    {
      authenticated: true,
      principal: sessionContext.session.principal,
      ownershipVerified: true,
      syncProtocol,
      coordinationAvailable: Boolean(env.SHEET_COORDINATOR)&&env.SYNC_ACTIVATION_BLOCKED!=='true',
      activationBlocked: env.SYNC_ACTIVATION_BLOCKED==='true',
      email: sessionContext.session.email || "",
      name: sessionContext.session.name || "",
      sheetId: sessionContext.session.sheetId || "",
      sheetName: sessionContext.session.sheetName || DEFAULT_SHEET_NAME,
      sheetVersion: sessionContext.session.sheetVersion || "",
      scope: sessionContext.session.scope || OAUTH_SCOPE,
      workerVersion: WORKER_VERSION,
      schemaMode: SCHEMA_MODE,
      schemaCapability,
    },
    200,
    { "Set-Cookie": buildSessionCookie(sessionContext.sessionId, SESSION_TTL_SECONDS) },
  );
}

async function handleLogout(request, env) {
  const sessionId = readSessionCookie(request);
  if (sessionId) {
    assertSessionConfig(env);
    await env.SESSIONS.delete(await sessionKey(env, sessionId));
  }

  return jsonResponse(
    { ok: true },
    200,
    { "Set-Cookie": buildSessionCookie("", 0) },
  );
}

class HttpError extends Error {
  constructor(status, body) {
    super(typeof body?.error === "string" ? body.error : `HTTP ${status}`);
    this.status = status;
    this.body = body;
  }
}

async function requireSession(request, env) {
  const sessionContext = await getOptionalSession(request, env);
  if (!sessionContext) {
    throw new HttpError(401, { ok: false, error: "Not authenticated" });
  }
  return sessionContext;
}

async function getOptionalSession(request, env) {
  const sessionId = readSessionCookie(request);
  if (!sessionId) {
    return null;
  }

  assertSessionConfig(env);
  const key = await sessionKey(env, sessionId);
  const session = await loadSessionByKey(env, key);
  if (!session?.refreshToken) {
    return null;
  }

  return { sessionId, key, session };
}

function readSessionCookie(request) {
  return readCookie(request.headers.get("Cookie") || "", SESSION_COOKIE);
}

async function loadSessionByKey(env, key) {
  const safeKey = String(key || "").trim();
  if (!safeKey || !safeKey.startsWith("session:")) {
    return null;
  }

  try {
    return await env.SESSIONS.get(safeKey, { type: "json" });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return null;
    }
    throw error;
  }
}

async function saveSession(env, context, patch = {}) {
  const now = Date.now();
  const lastWrite = Date.parse(context.session.updatedAt || "");
  const changed = Object.entries(patch).some(([key, value]) => context.session[key] !== value);
  // Normal status and Sheet polls must not renew KV on every request. Keep
  // rolling session expiry with at most one unchanged renewal per day.
  if (!changed && Number.isFinite(lastWrite) && lastWrite <= now && now - lastWrite < 86400_000) {
    return;
  }
  const next = {
    ...context.session,
    ...patch,
    updatedAt: new Date(now).toISOString(),
  };
  await env.SESSIONS.put(context.key, JSON.stringify(next), { expirationTtl: SESSION_TTL_SECONDS });
  context.session = next;
}

async function getGoogleAccessToken(env, context) {
  assertOAuthConfig(env);
  const expiresAt = Date.parse(context.session.expiresAt || "");
  if (context.session.accessToken && Number.isFinite(expiresAt) && expiresAt > Date.now() + 60_000) {
    return context.session.accessToken;
  }

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      grant_type: "refresh_token",
      refresh_token: context.session.refreshToken,
    }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.access_token) {
    throw new HttpError(401, { ok: false, error: "Not authenticated" });
  }

  await saveSession(env, context, {
    accessToken: payload.access_token,
    tokenType: payload.token_type || "Bearer",
    expiresAt: payload.expires_in
      ? new Date(Date.now() + Number(payload.expires_in) * 1000).toISOString()
      : "",
  });
  return payload.access_token;
}

async function googleFetch(url, accessToken, options = {}) {
  const response = await fetch(url, {
    ...options,
    signal: options.signal || AbortSignal.timeout(20000),
    headers: {
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.headers || {}),
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new HttpError(response.status === 401 ? 401 : 502, {
      ok: false,
      error: response.status === 401 ? "Not authenticated" : `Google API request failed (${response.status}).`,
      message: body.slice(0, 180),
    });
  }
  if (response.status === 204) {
    return {};
  }
  return response.json();
}

function encodeRange(range) {
  return encodeURIComponent(range).replace(/%21/g, "!");
}

async function getDriveFile(accessToken, fileId) {
  const fields = encodeURIComponent("id,name,mimeType,webViewLink,ownedByMe,owners(permissionId),trashed");
  const file = await googleFetch(`${GOOGLE_DRIVE_API}/files/${encodeURIComponent(fileId)}?fields=${fields}`, accessToken);
  return file?.mimeType === GOOGLE_SPREADSHEET_MIME_TYPE ? file : null;
}

async function createWalmartGcSpreadsheet(accessToken, creationId) {
  return googleFetch(`${GOOGLE_DRIVE_API}/files?fields=id,name,mimeType,webViewLink`, accessToken, {
    method: "POST",
    body: JSON.stringify({ name: DEFAULT_SHEET_NAME, mimeType: GOOGLE_SPREADSHEET_MIME_TYPE, ...(creationId?{appProperties:{gcWalletCreationId:creationId}}:{}) }),
  });
}

async function getSpreadsheetMetadata(accessToken, spreadsheetId) {
  return googleFetch(`${GOOGLE_SHEETS_API}/${spreadsheetId}?fields=properties.title,sheets.properties(sheetId,title,hidden,gridProperties(rowCount,columnCount))`, accessToken);
}

function getSheetProperties(metadata, title) {
  return metadata?.sheets?.find((sheet) => sheet?.properties?.title === title)?.properties || null;
}

async function readSheetValues(accessToken, spreadsheetId, range, valueRenderOption = "FORMATTED_VALUE") {
  const body = await googleFetch(
    `${GOOGLE_SHEETS_API}/${spreadsheetId}/values/${encodeRange(range)}?majorDimension=ROWS&valueRenderOption=${valueRenderOption}`,
    accessToken,
  );
  return Array.isArray(body.values) ? body.values : [];
}

async function readSheetMeta(accessToken, spreadsheetId) {
  return parseSheetMeta(await readSheetValues(accessToken, spreadsheetId, `${META_TAB}!A:B`));
}

function parseSheetMeta(values) {
  const meta = {};
  values.slice(1).forEach((row) => {
    const key = String(row?.[0] || "").trim();
    if (key) {
      meta[key] = String(row?.[1] || "");
    }
  });
  return meta;
}

function findMetaRows(rows, key) {
  return rows.slice(1).flatMap((row, index) => String(row[0] ?? "").trim() === key ? [index + 1] : []);
}

function normalizeHeaderRow(row) {
  return Array.isArray(row) ? row.map((header) => String(header ?? "").trim()) : [];
}

function validateCardHeaders(row) {
  const headers = normalizeHeaderRow(row);
  const headerMap = new Map();
  const duplicates = new Set();
  const unsupported = new Set();

  headers.forEach((header, index) => {
    if (!header) return;
    if (!APPROVED_CARD_HEADERS.includes(header)) {
      unsupported.add(header);
    } else if (headerMap.has(header)) {
      duplicates.add(header);
    } else {
      headerMap.set(header, index);
    }
  });

  const details = {
    expectedHeaders: CARD_HEADERS,
    recognizedHeaders: [...headerMap.keys()],
  };
  if (duplicates.size) {
    throw new HttpError(409, buildCardsHeaderError(
      `Duplicate Cards header(s): ${[...duplicates].join(", ")}. Keep each approved header exactly once; column order can be changed.`,
      { ...details, duplicateHeaders: [...duplicates] },
    ));
  }
  if (unsupported.size) {
    throw new HttpError(409, buildCardsHeaderError(
      `Unsupported Cards header(s): ${[...unsupported].join(", ")}. Use approved header names.`,
      { ...details, unsupportedHeaders: [...unsupported] },
    ));
  }
  if (!headerMap.size || headers.slice(0, headerMap.size).some((header) => !header)) {
    throw new HttpError(409, buildCardsHeaderError("Cards header row is blank or ambiguous. Fix Cards row 1 manually before syncing.", details));
  }

  if (headerMap.size === OLD_CARD_HEADERS.length && OLD_CARD_HEADERS.every((header) => headerMap.has(header))) {
    return headerMap;
  }
  const missing = CARD_HEADERS.filter((header) => !headerMap.has(header));
  if (missing.length) {
    throw new HttpError(409, buildCardsHeaderError(
      `Missing required Cards header(s): ${missing.join(", ")}. Add the missing header(s) to Cards row 1; column order can be changed.`,
      { ...details, missingHeaders: missing },
    ));
  }
  return headerMap;
}

function checkAppendTargets(rows, startColumn, count) {
  const occupied = rows.some((row) => row.slice(startColumn, startColumn + count)
    .some((cell) => cell !== "" && cell != null));
  if (occupied) {
    throw new HttpError(409, buildCardsHeaderError("Cannot append Cards headers because a target column already contains data. Back up and resolve the unlabelled cells before syncing."));
  }
}

async function writeCardsSnapshot(accessToken, sheet, cards, headerRow, appendedHeaders, metaRows, nextMeta) {
  const { cardsProperties, metaProperties } = sheet;
  const cardsId = cardsProperties.sheetId;
  const headers = [...headerRow, ...appendedHeaders];
  const requests = [...(sheet.pendingRequests || [])];

  // A Sheet can have been trimmed to its current used dimensions.
  for (const [dimension, needed, available] of [
    ["ROWS", cards.length + 1, cardsProperties.gridProperties?.rowCount],
    ["COLUMNS", headers.length, cardsProperties.gridProperties?.columnCount],
  ]) {
    if (Number.isInteger(available) && needed > available) {
      requests.push({ appendDimension: { sheetId: cardsId, dimension, length: needed - available } });
    }
  }
  if (appendedHeaders.length) {
    requests.push({
      updateCells: {
        start: { sheetId: cardsId, rowIndex: 0, columnIndex: headerRow.length },
        rows: [sheetCellData(appendedHeaders)],
        fields: "userEnteredValue",
      },
    });
  }
  requests.push({
    updateCells: {
      // Within this range, Sheets clears values not covered by rows, including
      // old trailing rows and an explicitly saved empty inventory.
      range: { sheetId: cardsId, startRowIndex: 1, startColumnIndex: 0, endColumnIndex: headers.length },
      rows: cards.map((card) => sheetCellData(headers.map((header) =>
        header === "used" ? (card.used ? "TRUE" : "FALSE") : card[header]
      ))),
      fields: "userEnteredValue",
    },
  });
  let metaNextRow = Math.max(1, metaRows.length);
  for (const [key, value] of Object.entries(nextMeta)) {
    const matchingRows = findMetaRows(metaRows, key);
    if (matchingRows.length > 1) throw sheetSetupRequired();
    const present = matchingRows.length === 1;
    requests.push({ updateCells: {
      start: {sheetId:metaProperties.sheetId,rowIndex:present ? matchingRows[0] : metaNextRow++,columnIndex:present ? 1 : 0},
      rows:[sheetCellData(present ? [value] : [key,value])],fields:"userEnteredValue"
    }});
  }
  if(metaNextRow > (metaProperties.gridProperties?.rowCount || 1000)) requests.unshift({appendDimension:{sheetId:metaProperties.sheetId,dimension:"ROWS",length:metaNextRow-metaProperties.gridProperties.rowCount}});
  await googleFetch(`${GOOGLE_SHEETS_API}/${sheet.sheetId}:batchUpdate`, accessToken, {
    method: "POST",
    body: JSON.stringify({ requests }),
  });
}

function sheetCellData(values) {
  return {
    values: values.map((value) => {
      if (value == null || value === "") return {};
      return { userEnteredValue: typeof value === "boolean" ? { boolValue: value } : { stringValue: value } };
    }),
  };
}

function buildCardsHeaderError(detail, details = {}) {
  return {
    ok: false,
    error: formatCardsHeaderError(detail),
    errorType: "cards_header_schema",
    schemaMode: SCHEMA_MODE,
    schemaCapability,
    ...details,
  };
}

function formatCardsHeaderError(detail) {
  return `${detail} Local data remains available. Export/download a CSV backup before any destructive Sheet recovery. Required headers may be in any order but names must match exactly.`;
}

function normalizePinValue(pin) {
  return String(pin ?? "").trim();
}

function normalizeMerchantValue(merchant) {
  return String(merchant ?? "").trim();
}

function inferMerchantFromCardNumber(cardNumber) {
  return WALMART_GIFT_CARD_NUMBER_PATTERN.test(String(cardNumber ?? "").trim()) ? "walmart-ca" : "";
}

function normalizeOptionalMoneyString(value) {
  const normalizedValue = String(value ?? "").trim();
  if (!normalizedValue) {
    return "";
  }
  const parsedValue = Number(normalizedValue);
  return Number.isFinite(parsedValue) ? String(Math.round(parsedValue * 100) / 100) : normalizedValue;
}

function normalizeCurrentBalanceValue(currentBalance, startingBalance) {
  const normalizedCurrentBalance = normalizeOptionalMoneyString(currentBalance);
  return normalizedCurrentBalance || normalizeOptionalMoneyString(startingBalance);
}

function validateCards(cards) {
  const seen = new Set();
  return cards.map((card, index) => {
    if (!card || typeof card !== "object" || Array.isArray(card)) {
      throw new HttpError(400, { ok: false, error: `Card ${index + 1} is invalid.` });
    }
    const normalized = {};
    CARD_HEADERS.forEach((header) => {
      if (header === "used") {
        normalized.used = card.used === true || String(card.used || "").toLowerCase() === "true";
      } else {
        normalized[header] = String(card[header] ?? "");
      }
    });
    normalized.cardNumber = normalized.cardNumber.trim();
    normalized.pin = normalizePinValue(normalized.pin);
    if (!normalized.cardNumber) {
      throw new HttpError(400, { ok: false, error: `Card ${index + 1} is missing cardNumber.` });
    }
    if (!WALMART_GIFT_CARD_NUMBER_PATTERN.test(normalized.cardNumber)) {
      throw new HttpError(400, { ok: false, error: `Card ${index + 1}: Card number must start with 63 and be exactly 16 digits.` });
    }
    if (normalized.pin.length < 4) {
      throw new HttpError(400, { ok: false, error: `Card ${index + 1}: PIN must be at least 4 characters.` });
    }
    normalized.merchant = normalizeMerchantValue(normalized.merchant);
    normalized.merchantInferred = inferMerchantFromCardNumber(normalized.cardNumber);
    normalized.startingBalance = normalizeOptionalMoneyString(normalized.startingBalance);
    normalized.currentBalance = normalizeCurrentBalanceValue(normalized.currentBalance, normalized.startingBalance);
    if (seen.has(normalized.cardNumber)) {
      throw new HttpError(400, { ok: false, error: `Duplicate cardNumber ${normalized.cardNumber}.` });
    }
    seen.add(normalized.cardNumber);
    try {
      return { ...normalized, ...readOptionalCardMetadata(card) };
    } catch (error) {
      throw new HttpError(400, { ok: false, error: `Card ${index + 1}: ${error.message}` });
    }
  });
}

function cardsFromSheetRows(rows, headerMap) {
  const cards = [];
  const seen = new Set();
  rows.forEach((row, index) => {
    if (isSheetValuesEmpty([row.slice(0, headerMap.size)])) {
      return;
    }
    const card = {};
    CARD_HEADERS.forEach((header) => {
      const headerIndex = headerMap.get(header);
      card[header] = header === "used"
        ? String(row[headerIndex] || "").toLowerCase() === "true"
        : String(row[headerIndex] ?? "");
    });
    card.cardNumber = card.cardNumber.trim();
    card.pin = normalizePinValue(card.pin);
    card.merchant = normalizeMerchantValue(card.merchant);
    card.merchantInferred = inferMerchantFromCardNumber(card.cardNumber);
    card.startingBalance = normalizeOptionalMoneyString(card.startingBalance);
    card.currentBalance = normalizeCurrentBalanceValue(card.currentBalance, card.startingBalance);
    if (!card.cardNumber) {
      throw new HttpError(409, { ok: false, error: `Cards row ${index + 2} is missing cardNumber.` });
    }
    if (!WALMART_GIFT_CARD_NUMBER_PATTERN.test(card.cardNumber)) {
      throw new HttpError(409, { ok: false, error: `Cards row ${index + 2}: Card number must start with 63 and be exactly 16 digits.` });
    }
    if (card.pin.length < 4) {
      throw new HttpError(409, { ok: false, error: `Cards row ${index + 2}: PIN must be at least 4 characters.` });
    }
    if (seen.has(card.cardNumber)) {
      throw new HttpError(409, { ok: false, error: `Cards row ${index + 2} duplicates cardNumber ${card.cardNumber}.` });
    }
    seen.add(card.cardNumber);
    cards.push({ ...card, ...readSheetCardMetadata(row, headerMap, index) });
  });
  return cards;
}

function readSheetCardMetadata(row, headerMap, index) {
  const metadata = Object.fromEntries(optionalCardHeaders.map((header) => [header, row[headerMap.get(header)]]));
  try {
    return readOptionalCardMetadata(metadata, { cellValues: true });
  } catch (error) {
    throw new HttpError(409, { ok: false, error: `Cards row ${index + 2}: ${error.message} The Sheet was left unchanged.` });
  }
}

function isSheetValuesEmpty(values) {
  return !Array.isArray(values) || values.every((row) => !Array.isArray(row) || row.every((cell) => String(cell ?? "").trim() === ""));
}

function generateSheetVersion() {
  return `${new Date().toISOString()}-${randomBase64Url(8)}`;
}

function handleOptions(request, env) {
  return withCors(request, new Response(null, { status: 204 }), env);
}

function withCors(request, response, env) {
  const origin = request.headers.get("Origin") || "";
  if (origin !== getFrontendOrigin(env)) {
    return response;
  }

  const headers = new Headers(response.headers);
  headers.set("Access-Control-Allow-Origin", origin);
  headers.set("Access-Control-Allow-Credentials", "true");
  headers.set("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type");
  headers.set("Vary", appendVary(headers.get("Vary"), "Origin"));

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function jsonResponse(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...headers,
    },
  });
}

function textResponse(body, status = 200, headers = {}) {
  return new Response(body, {
    status,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      ...headers,
    },
  });
}

function assertOAuthConfig(env) {
  assertSessionConfig(env);
  const required = ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "OAUTH_STATE"];
  const missing = required.filter((name) => !env[name]);
  if (missing.length) {
    throw new Error(`Missing required OAuth configuration: ${missing.join(", ")}`);
  }
}

function assertSessionConfig(env) {
  const required = ["SESSIONS", "SESSION_SECRET"];
  const missing = required.filter((name) => !env[name]);
  if (missing.length) {
    throw new Error(`Missing required session configuration: ${missing.join(", ")}`);
  }
}


function getFrontendOrigin(env) {
  return String(env.FRONTEND_ORIGIN || DEFAULT_FRONTEND_ORIGIN).replace(/\/$/, "");
}

function getRedirectUri(env) {
  return String(env.REDIRECT_URI || DEFAULT_REDIRECT_URI);
}

function oauthStateKey(state) {
  return `oauth-state:${state}`;
}

async function sessionKey(env, sessionId) {
  return `session:${await hmacSha256Base64Url(env.SESSION_SECRET, sessionId)}`;
}

function buildSessionCookie(value, maxAge) {
  return `${SESSION_COOKIE}=${value}; ${SESSION_COOKIE_ATTRIBUTES}; Max-Age=${maxAge}`;
}

function readCookie(header, name) {
  return header
    .split(";")
    .map((cookie) => cookie.trim())
    .map((cookie) => cookie.split("="))
    .find(([key]) => key === name)?.slice(1).join("=") || "";
}


function appendVary(existing, value) {
  if (!existing) {
    return value;
  }
  const values = existing.split(",").map((item) => item.trim().toLowerCase());
  return values.includes(value.toLowerCase()) ? existing : `${existing}, ${value}`;
}

function randomBase64Url(byteLength) {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return base64UrlEncode(bytes);
}

async function sha256Base64Url(value) {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return base64UrlEncode(new Uint8Array(digest));
}

async function hmacSha256Base64Url(secret, value) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return base64UrlEncode(new Uint8Array(signature));
}

function base64UrlEncode(bytes) {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function safeErrorMessage(error) {
  const message = error instanceof Error ? error.message : "Unexpected server error";
  if (/secret|token|client_secret|refresh/i.test(message)) {
    return "Server configuration error.";
  }
  return message;
}

export const workerTestInternals = {
  CARD_HEADERS,
  validateCardHeaders,
  inferMerchantFromCardNumber,
};

// Only Google account metadata is read to establish identity; no additional scope.
export async function readGooglePrincipal(token) {
  const result = await googleFetch(`${GOOGLE_DRIVE_API}/about?fields=user(permissionId,emailAddress,displayName)`,token);
  if(typeof result.user?.permissionId!=='string'||!result.user.permissionId||result.user.permissionId.length>128) throw new HttpError(401,{error:'Google account identity could not be verified.'});
  return result.user;
}
export function ownedByPrincipal(file,principal) {
  return Boolean(file&&file.mimeType===GOOGLE_SPREADSHEET_MIME_TYPE&&!file.trashed&&file.ownedByMe===true
    &&file.owners?.some(owner=>owner.permissionId===principal));
}
async function verifySessionPrincipal(env,context,token) {
  const user=await readGooglePrincipal(token);
  if(context.session.principal&&context.session.principal!==user.permissionId)throw new HttpError(401,{error:'Account identity changed. Reconnect Google.'});
  const patch={principal:user.permissionId,email:user.emailAddress||'',name:user.displayName||''};
  if(!context.session.principal)Object.assign(patch,{sheetId:'',sheetVersion:''});
  await saveSession(env,context,patch);
  return user.permissionId;
}
async function findOwnedSheet(token,principal,exactId) {
  if(exactId){
    const file=await getDriveFile(token,exactId);
    if(!ownedByPrincipal(file,principal))throw new HttpError(403,{error:'The exact Sheet is not privately owned by this Google account.'});
    return file;
  }
  const params=new URLSearchParams({q:`name = '${DEFAULT_SHEET_NAME}' and mimeType = '${GOOGLE_SPREADSHEET_MIME_TYPE}' and trashed = false and 'me' in owners`,fields:'files(id,name,mimeType,ownedByMe,owners(permissionId),trashed)',pageSize:'100'});
  const body=await googleFetch(`${GOOGLE_DRIVE_API}/files?${params}`,token);
  const files=(body.files??[]).filter(file=>ownedByPrincipal(file,principal));
  if(files.length>1)throw new HttpError(409,{error:'Multiple owned wallet Sheets exist. Enter the exact Sheet ID in Settings.'});
  return files[0]??null;
}

async function handleProtectedSync(request,env,pathname) {
  const body=request.method==='GET'?{protocol:new URL(request.url).searchParams.get('protocol'),action:'pull'}:await request.json().catch(()=>({}));
  if(body.protocol!==syncProtocol)throw new HttpError(426,{error:'This wallet requires the protected synchronization protocol. Reload the app.',syncProtocol});
  if(!env.SHEET_COORDINATOR)throw new HttpError(503,{error:'Protected synchronization is not configured. Local cards remain saved.'});
  const context=await requireSession(request,env),token=await getGoogleAccessToken(env,context);
  const principal=await verifySessionPrincipal(env,context,token);
  if(body.principal&&body.principal!==principal)throw new HttpError(409,{error:'Account context changed.'});
  if(body.action!=='pull'&&pathname!=='/api/cards/load'){
    const setup=env.SHEET_COORDINATOR.get(env.SHEET_COORDINATOR.idFromName('setup:'+principal));
    const inspected=await setup.fetch(new Request('https://coordinator/setup',{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({protocol:syncProtocol,principal,action:'inspect-setup'})}));
    if(!inspected.ok)return jsonResponse(await inspected.json(),inspected.status);
  }
  let file=await findOwnedSheet(token,principal,body.sheetId||context.session.sheetId);
  // Allow exact Drive identity/ownership checks while every inventory read/write
  // and setup creation remains blocked during controlled production activation.
  if(env.SYNC_ACTIVATION_BLOCKED==='true')throw new HttpError(503,{code:'activation_pending',error:'Protected inventory synchronization is paused for activation. Local work remains saved.'});
  if(!file){
    if(pathname!=='/api/sheet/ensure')throw sheetSetupRequired();
    if(!body.id)throw new HttpError(400,{error:'Missing durable setup identity.'});
    const stub=env.SHEET_COORDINATOR.get(env.SHEET_COORDINATOR.idFromName('setup:'+principal));
    const response=await stub.fetch(new Request('https://coordinator/create',{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({...body,principal,action:'create'})}));
    const result=await response.json();if(!response.ok)return jsonResponse(result,response.status);
    file=await findOwnedSheet(token,principal,result.sheetId);
  }
  await saveSession(env,context,{sheetId:file.id,sheetName:file.name});
  const stub=env.SHEET_COORDINATOR.get(env.SHEET_COORDINATOR.idFromName('sheet:'+file.id));
  const action=pathname==='/api/sheet/ensure'?'ensure':body.action||'commit';
  const response=await stub.fetch(new Request('https://coordinator/sync',{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({...body,action,principal,sheetId:file.id})}));
  return jsonResponse({...await response.json(),principal,sheetId:file.id},response.status);
}

export function googleSheetAdapter(token,sheetId) {
  return {
    async read(){
      const metadata=await getSpreadsheetMetadata(token,sheetId);
      const cardsProperties=getSheetProperties(metadata,CARDS_TAB),metaProperties=getSheetProperties(metadata,META_TAB);
      const metaRows=metaProperties?await readSheetValues(token,sheetId,'_META!A:B'):[];
      for(const key of ['schemaVersion','appName','lastUpdated','sheetVersion','syncProtocol','commitId','contentFingerprint','syncEvidence','maintenance'])if(findMetaRows(metaRows,key).length>1)throw sheetSetupRequired();
      if(metaRows.length && (metaRows[0]?.[0]!=='key'||metaRows[0]?.[1]!=='value'))throw sheetSetupRequired();
      const meta=parseSheetMeta(metaRows);
      const cells=cardsProperties?await readSheetValues(token,sheetId,CARDS_RANGE):[];
      const header=isSheetValuesEmpty(cells)?[]:cells[0];
      const cards=header.length?validateInventory(cardsFromSheetRows(cells.slice(1),validateCardHeaders(header))):[];
      validateCards(cards);
      const after=metaProperties?await readSheetMeta(token,sheetId):meta;
      if(meta.sheetVersion!==after.sheetVersion)throw new HttpError(409,{error:'Sheet changed during read.'});
      let evidence;
      try{evidence=validateEvidence(meta.syncEvidence?JSON.parse(meta.syncEvidence):emptyEvidence());}catch{throw new HttpError(409,{error:'Synchronization recovery evidence is damaged. Preserve a Sheet backup.'});}
      return {cards,evidence,version:meta.sheetVersion||'',protocol:meta.syncProtocol||'',commitId:meta.commitId||'',fingerprint:meta.contentFingerprint||'',maintenance:meta.maintenance==='paused',
        internal:{metadata,cardsProperties,metaProperties,metaRows,header}};
    },
    async prepare(snapshot,previous){
      const cards=validateCards(snapshot.cards),data=previous.internal,header=normalizeHeaderRow(data.header).filter(Boolean);
      const appended=[...CARD_HEADERS.filter(h=>!header.includes(h)),...optionalCardHeaders.filter(h=>!header.includes(h)&&cards.some(c=>c[h]!==undefined))];
      if(data.cardsProperties&&appended.length)checkAppendTargets(await readSheetValues(token,sheetId,CARDS_RANGE,'FORMULA'),header.length,appended.length);
    },
    async write(snapshot,id,hash,previous){
      const cards=validateCards(snapshot.cards),data=previous.internal;
      const taken=new Set(data.metadata.sheets?.map(s=>s.properties.sheetId));
      const properties=title=>{let id=1;while(taken.has(id))id++;taken.add(id);return {title,sheetId:id,gridProperties:{rowCount:1000,columnCount:26},...(title===META_TAB?{hidden:true}:{})};};
      const sheet={sheetId,cardsProperties:data.cardsProperties??properties(CARDS_TAB),metaProperties:data.metaProperties??properties(META_TAB),pendingRequests:[]};
      if(!data.cardsProperties)sheet.pendingRequests.push({addSheet:{properties:sheet.cardsProperties}});
      if(!data.metaProperties)sheet.pendingRequests.push({addSheet:{properties:sheet.metaProperties}});
      const rows=data.metaRows.length?data.metaRows:[['key','value']];
      if(!data.metaRows.length)sheet.pendingRequests.push({updateCells:{start:{sheetId:sheet.metaProperties.sheetId,rowIndex:0,columnIndex:0},rows:[sheetCellData(['key','value'])],fields:'userEnteredValue'}});
      const header=normalizeHeaderRow(data.header).filter(Boolean);
      const appended=[...CARD_HEADERS.filter(h=>!header.includes(h)),...optionalCardHeaders.filter(h=>!header.includes(h)&&cards.some(c=>c[h]!==undefined))];
      await writeCardsSnapshot(token,sheet,cards,header,appended,rows,{schemaVersion:SCHEMA_VERSION,appName:APP_NAME,sheetVersion:generateSheetVersion(),lastUpdated:new Date().toISOString(),syncProtocol,commitId:id,contentFingerprint:hash,syncEvidence:JSON.stringify(snapshot.evidence),maintenance:snapshot.maintenance?'paused':'active'});
    }
  };
}

export class SheetCoordinator {
  constructor(ctx){this.ctx=ctx;this.tail=Promise.resolve();}
  fetch(request){const next=this.tail.then(()=>this.handle(request));this.tail=next.then(()=>undefined,()=>undefined);return next;}
  async handle(request){
    try{
      const body=await request.json();
      const token=(request.headers.get('Authorization')||'').replace(/^Bearer /,'');
      if(!['pull','inspect-setup'].includes(body.action)&&!/^([0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/.test(body.id||''))return jsonResponse({error:'A UUID commit identity is required.'},400);
      if(!token||!body.principal||body.protocol!==syncProtocol)return jsonResponse({error:'Invalid internal synchronization request.'},403);
      if(['create','inspect-setup'].includes(body.action)){
        let setup=await this.ctx.storage.get('setup');
        if(setup&&!setup.sheetId){
          const params=new URLSearchParams({q:`appProperties has { key='gcWalletCreationId' and value='${setup.id}' } and trashed=false`,fields:'files(id,mimeType,ownedByMe,owners(permissionId),appProperties,trashed)',pageSize:'100'});
          const found=await googleFetch(`${GOOGLE_DRIVE_API}/files?${params}`,token);
          const files=(found.files??[]).filter(file=>ownedByPrincipal(file,body.principal)&&file.appProperties?.gcWalletCreationId===setup.id);
          if(files.length===1){setup={...setup,sheetId:files[0].id,phase:'confirmed'};await this.ctx.storage.put('setup',setup);}
        }
        if(body.action==='inspect-setup'&&!setup)return jsonResponse({ok:true});
        if(setup?.sheetId)return jsonResponse({sheetId:setup.sheetId});
        if(setup)throw Object.assign(Error('Sheet creation is uncertain. Do not retry creation; inspect app-owned files before operator recovery.'),{code:'uncertain'});
        await this.ctx.storage.put('setup',{id:body.id,phase:'possible-dispatch'});
        const file=await createWalmartGcSpreadsheet(token,body.id);
        if(!file.id)throw Object.assign(Error('Sheet creation outcome is uncertain.'),{code:'uncertain'});
        await this.ctx.storage.put('setup',{id:body.id,sheetId:file.id,phase:'confirmed'});
        return jsonResponse({sheetId:file.id});
      }
      if(body.action==='commit'){
        if(!equal(body.cards,validateInventory(body.cards))||!equal(body.base.cards,validateInventory(body.base.cards)))throw Error('Canonical card data is required for synchronization.');
        if(!Array.isArray(body.operations)||body.operations.length>128)throw Error('Unsupported pending operation set.');
        const ids=new Set();
        for(const op of body.operations){
          if(typeof op.id!=='string'||op.id.length>160||ids.has(op.id)||!/^63\d{14}$/.test(op.cardNumber)||!['legacy-recovery','set-balance','set-notes','set-used','patch','mark-zero-used','csv-recovery','manual-verification','batch-verification','resolve-conflict','unbound-recovery'].includes(op.kind))throw Error('Invalid or repeated pending operation identity.');
          ids.add(op.id);if(op.after&&!equal(op.after,validateInventory([op.after])[0]))throw Error('Invalid pending card representation.');if(op.before&&!equal(op.before,validateInventory([op.before])[0]))throw Error('Invalid pending baseline representation.');
        }
      }
      return jsonResponse(await coordinate(this.ctx.storage,googleSheetAdapter(token,body.sheetId),body));
    }catch(error){return jsonResponse({error:error.message,code:error.code||'sync_error',notDispatched:error.code==='baseline_expired'},error.code==='uncertain'?503:409);}
  }
}
