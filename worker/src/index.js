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
const META_TAB = "_META";
const DEFAULT_TAB = "Sheet1";
const APP_NAME = "Walmart-GC";
const SCHEMA_VERSION = "1";
const WALMART_GIFT_CARD_NUMBER_PATTERN = /^63\d{14}$/;

const CARD_HEADERS = [
  "cardNumber",
  "pin",
  "merchant",
  "startingBalance",
  "currentBalance",
  "dateAdded",
  "dateUpdated",
  "dateUsed",
  "used",
  "notes",
];
const DEFAULT_MERCHANT = "walmart-ca";
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
  return jsonResponse({ ok: true, service: "walmart-gc-oauth" });
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
  if (request.method === "GET" && pathname === "/api/status") {
    return handleStatus(request, env);
  }

  if (request.method === "POST" && pathname === "/api/logout") {
    return handleLogout(request, env);
  }

  if (request.method === "POST" && pathname === "/api/sheet/ensure") {
    return handleSheetEnsure(request, env);
  }

  if (request.method === "GET" && pathname === "/api/cards/load") {
    return handleCardsLoad(request, env);
  }

  if (request.method === "POST" && pathname === "/api/cards/save") {
    return handleCardsSave(request, env);
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
  const refreshToken = tokenPayload.refresh_token || existingSession?.refreshToken || "";
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
    email: existingSession?.email || "",
    name: existingSession?.name || "",
    sheetId: existingSession?.sheetId || "",
    sheetName: existingSession?.sheetName || DEFAULT_SHEET_NAME,
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

async function handleSheetEnsure(request, env) {
  const sessionContext = await requireSession(request, env);
  const token = await getGoogleAccessToken(env, sessionContext);
  const sheet = await ensureSpreadsheetAndSchema(token, sessionContext.session);
  await saveSession(env, sessionContext, sheet.sessionPatch);

  return jsonResponse({
    ok: true,
    sheetId: sheet.sheetId,
    sheetName: sheet.sheetName,
    sheetVersion: sheet.sheetVersion,
    lastUpdated: sheet.lastUpdated,
  });
}

async function handleCardsLoad(request, env) {
  const sessionContext = await requireSession(request, env);
  const token = await getGoogleAccessToken(env, sessionContext);
  const sheet = await ensureSpreadsheetAndSchema(token, sessionContext.session);
  await saveSession(env, sessionContext, sheet.sessionPatch);

  const headerRows = await readSheetValues(token, sheet.sheetId, `${CARDS_TAB}!1:1`);
  const headerMap = validateCardHeaders(headerRows[0]);

  const rows = await readSheetValues(token, sheet.sheetId, `${CARDS_TAB}!A2:ZZ`);
  const cards = cardsFromSheetRows(rows, headerMap);
  const meta = await readSheetMeta(token, sheet.sheetId);

  return jsonResponse({
    ok: true,
    cards,
    sheetId: sheet.sheetId,
    sheetName: sheet.sheetName,
    sheetVersion: meta.sheetVersion || sheet.sheetVersion,
    lastUpdated: meta.lastUpdated || sheet.lastUpdated,
  });
}

async function handleCardsSave(request, env) {
  const sessionContext = await requireSession(request, env);
  const body = await request.json().catch(() => null);
  if (!body || !Array.isArray(body.cards)) {
    throw new HttpError(400, { ok: false, error: "Expected cards array." });
  }

  const cards = validateCards(body.cards);
  const baseSheetVersion = String(body.baseSheetVersion || "").trim();
  const token = await getGoogleAccessToken(env, sessionContext);
  const sheet = await ensureSpreadsheetAndSchema(token, sessionContext.session);
  await saveSession(env, sessionContext, sheet.sessionPatch);

  const remoteMeta = await readSheetMeta(token, sheet.sheetId);
  const remoteSheetVersion = String(remoteMeta.sheetVersion || sheet.sheetVersion || "").trim();
  if (remoteSheetVersion !== baseSheetVersion) {
    return jsonResponse({ ok: false, conflict: true, remoteSheetVersion }, 409);
  }

  const headerRows = await readSheetValues(token, sheet.sheetId, `${CARDS_TAB}!1:1`);
  const headerMap = validateCardHeaders(headerRows[0]);
  const headerRow = normalizeHeaderRow(headerRows[0]);
  const rows = cardsToSheetRows(cards, headerRow, headerMap);
  const lastColumn = columnNumberToA1(headerRow.length);
  await clearSheetValues(token, sheet.sheetId, `${CARDS_TAB}!A2:${lastColumn}`);
  if (cards.length > 0) {
    await writeSheetValues(token, sheet.sheetId, `${CARDS_TAB}!A2:${lastColumn}${cards.length + 1}`, rows);
  }
  const nextMeta = await writeSheetMeta(token, sheet.sheetId, { sheetVersion: generateSheetVersion() });
  await saveSession(env, sessionContext, {
    sheetId: sheet.sheetId,
    sheetName: sheet.sheetName,
    sheetVersion: nextMeta.sheetVersion,
  });

  return jsonResponse({
    ok: true,
    sheetId: sheet.sheetId,
    sheetName: sheet.sheetName,
    sheetVersion: nextMeta.sheetVersion,
    lastUpdated: nextMeta.lastUpdated,
  });
}

async function handleStatus(request, env) {
  const sessionCookie = readSessionCookie(request);
  const sessionContext = await getOptionalSession(request, env);
  if (!sessionContext) {
    return jsonResponse(
      { authenticated: false },
      200,
      sessionCookie ? { "Set-Cookie": buildSessionCookie("", 0) } : {},
    );
  }

  try {
    await getGoogleAccessToken(env, sessionContext);
  } catch (error) {
    if (!(error instanceof HttpError) || error.status !== 401) {
      throw error;
    }
    await env.SESSIONS.delete(sessionContext.key);
    return jsonResponse(
      { authenticated: false },
      200,
      { "Set-Cookie": buildSessionCookie("", 0) },
    );
  }

  return jsonResponse(
    {
      authenticated: true,
      email: sessionContext.session.email || "",
      name: sessionContext.session.name || "",
      sheetId: sessionContext.session.sheetId || "",
      sheetName: sessionContext.session.sheetName || DEFAULT_SHEET_NAME,
      sheetVersion: sessionContext.session.sheetVersion || "",
      scope: sessionContext.session.scope || OAUTH_SCOPE,
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
  const now = new Date().toISOString();
  context.session = {
    ...context.session,
    ...patch,
    updatedAt: now,
  };
  await env.SESSIONS.put(context.key, JSON.stringify(context.session), { expirationTtl: SESSION_TTL_SECONDS });
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

async function ensureSpreadsheetAndSchema(accessToken, session) {
  let file = null;
  if (session.sheetId) {
    file = await getDriveFile(accessToken, session.sheetId).catch(() => null);
  }
  if (!file) {
    file = await findWalmartGcSpreadsheet(accessToken);
  }
  if (!file) {
    file = await createWalmartGcSpreadsheet(accessToken);
  }

  const structure = await ensureSheetStructure(accessToken, file.id);
  let meta = await readSheetMeta(accessToken, file.id);
  const missingMeta = !meta.schemaVersion || !meta.sheetVersion || !meta.lastUpdated || !meta.appName;
  if (missingMeta) {
    meta = await writeSheetMeta(accessToken, file.id, {
      schemaVersion: meta.schemaVersion || SCHEMA_VERSION,
      sheetVersion: meta.sheetVersion || generateSheetVersion(),
      lastUpdated: meta.lastUpdated,
      appName: meta.appName || APP_NAME,
    });
  }

  return {
    sheetId: file.id,
    sheetName: structure.spreadsheetName || file.name || DEFAULT_SHEET_NAME,
    sheetVersion: meta.sheetVersion || "",
    lastUpdated: meta.lastUpdated || "",
    sessionPatch: {
      sheetId: file.id,
      sheetName: structure.spreadsheetName || file.name || DEFAULT_SHEET_NAME,
      sheetVersion: meta.sheetVersion || "",
    },
  };
}

async function googleFetch(url, accessToken, options = {}) {
  const response = await fetch(url, {
    ...options,
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
  const fields = encodeURIComponent("id,name,mimeType,webViewLink");
  const file = await googleFetch(`${GOOGLE_DRIVE_API}/files/${encodeURIComponent(fileId)}?fields=${fields}`, accessToken);
  return file?.mimeType === GOOGLE_SPREADSHEET_MIME_TYPE ? file : null;
}

function escapeDriveQueryValue(value) {
  return String(value ?? "").replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

async function findWalmartGcSpreadsheet(accessToken) {
  const query = [
    `name = '${escapeDriveQueryValue(DEFAULT_SHEET_NAME)}'`,
    `mimeType = '${GOOGLE_SPREADSHEET_MIME_TYPE}'`,
    "trashed = false",
  ].join(" and ");
  const params = new URLSearchParams({
    q: query,
    spaces: "drive",
    pageSize: "10",
    orderBy: "modifiedTime desc,name",
    fields: "files(id,name,mimeType,webViewLink,modifiedTime)",
  });
  const body = await googleFetch(`${GOOGLE_DRIVE_API}/files?${params.toString()}`, accessToken);
  return Array.isArray(body.files) ? body.files[0] || null : null;
}

async function createWalmartGcSpreadsheet(accessToken) {
  return googleFetch(`${GOOGLE_DRIVE_API}/files?fields=id,name,mimeType,webViewLink`, accessToken, {
    method: "POST",
    body: JSON.stringify({ name: DEFAULT_SHEET_NAME, mimeType: GOOGLE_SPREADSHEET_MIME_TYPE }),
  });
}

async function getSpreadsheetMetadata(accessToken, spreadsheetId) {
  return googleFetch(`${GOOGLE_SHEETS_API}/${spreadsheetId}?fields=properties.title,sheets.properties(sheetId,title,hidden)`, accessToken);
}

function getSheetProperties(metadata, title) {
  return metadata?.sheets?.find((sheet) => sheet?.properties?.title === title)?.properties || null;
}

async function ensureSheetStructure(accessToken, spreadsheetId) {
  let metadata = await getSpreadsheetMetadata(accessToken, spreadsheetId);
  let cardsProperties = getSheetProperties(metadata, CARDS_TAB);
  let metaProperties = getSheetProperties(metadata, META_TAB);
  const requests = [];

  if (!cardsProperties) {
    requests.push({ addSheet: { properties: { title: CARDS_TAB } } });
  }
  if (!metaProperties) {
    requests.push({ addSheet: { properties: { title: META_TAB, hidden: true } } });
  } else if (!metaProperties.hidden) {
    requests.push({ updateSheetProperties: { properties: { sheetId: metaProperties.sheetId, hidden: true }, fields: "hidden" } });
  }

  if (requests.length) {
    await googleFetch(`${GOOGLE_SHEETS_API}/${spreadsheetId}:batchUpdate`, accessToken, {
      method: "POST",
      body: JSON.stringify({ requests }),
    });
    metadata = await getSpreadsheetMetadata(accessToken, spreadsheetId);
    cardsProperties = getSheetProperties(metadata, CARDS_TAB);
    metaProperties = getSheetProperties(metadata, META_TAB);
  }

  const headerRows = await readSheetValues(accessToken, spreadsheetId, `${CARDS_TAB}!1:1`);
  if (!headerRows.length || headerRows[0].every((cell) => !String(cell || "").trim())) {
    await writeSheetValues(accessToken, spreadsheetId, `${CARDS_TAB}!A1:J1`, [CARD_HEADERS]);
  } else {
    validateCardHeaders(headerRows[0]);
  }

  const metaHeaderRows = await readSheetValues(accessToken, spreadsheetId, `${META_TAB}!A1:B1`);
  if (!metaHeaderRows.length || metaHeaderRows[0]?.[0] !== "key" || metaHeaderRows[0]?.[1] !== "value") {
    await writeSheetValues(accessToken, spreadsheetId, `${META_TAB}!A1:B1`, [["key", "value"]]);
  }

  await deleteEmptyDefaultSheetIfSafe(accessToken, spreadsheetId, metadata);

  return {
    spreadsheetName: String(metadata?.properties?.title || DEFAULT_SHEET_NAME),
    cardsSheetId: cardsProperties?.sheetId,
    metaSheetId: metaProperties?.sheetId,
  };
}

async function readSheetValues(accessToken, spreadsheetId, range) {
  const body = await googleFetch(`${GOOGLE_SHEETS_API}/${spreadsheetId}/values/${encodeRange(range)}?majorDimension=ROWS`, accessToken);
  return Array.isArray(body.values) ? body.values : [];
}

async function writeSheetValues(accessToken, spreadsheetId, range, values) {
  return googleFetch(`${GOOGLE_SHEETS_API}/${spreadsheetId}/values/${encodeRange(range)}?valueInputOption=RAW`, accessToken, {
    method: "PUT",
    body: JSON.stringify({ range, majorDimension: "ROWS", values }),
  });
}

async function clearSheetValues(accessToken, spreadsheetId, range) {
  return googleFetch(`${GOOGLE_SHEETS_API}/${spreadsheetId}/values/${encodeRange(range)}:clear`, accessToken, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

async function readSheetMeta(accessToken, spreadsheetId) {
  const values = await readSheetValues(accessToken, spreadsheetId, `${META_TAB}!A:B`);
  const meta = {};
  values.slice(1).forEach((row) => {
    const key = String(row?.[0] || "").trim();
    if (key) {
      meta[key] = String(row?.[1] || "");
    }
  });
  return meta;
}

async function writeSheetMeta(accessToken, spreadsheetId, nextMeta = {}) {
  const meta = {
    schemaVersion: nextMeta.schemaVersion || SCHEMA_VERSION,
    sheetVersion: nextMeta.sheetVersion || generateSheetVersion(),
    lastUpdated: nextMeta.lastUpdated || new Date().toISOString(),
    appName: nextMeta.appName || APP_NAME,
  };
  const rows = [["key", "value"], ...Object.entries(meta)];
  await clearSheetValues(accessToken, spreadsheetId, `${META_TAB}!A:B`);
  await writeSheetValues(accessToken, spreadsheetId, `${META_TAB}!A1:B${rows.length}`, rows);
  return meta;
}

function normalizeHeaderRow(row) {
  return Array.isArray(row) ? row.map((header) => String(header || "").trim()) : [];
}

function validateCardHeaders(row) {
  const headers = normalizeHeaderRow(row);
  const headerMap = new Map();
  const duplicates = new Set();

  headers.forEach((header, index) => {
    if (!header || !CARD_HEADERS.includes(header)) {
      return;
    }
    if (headerMap.has(header)) {
      duplicates.add(header);
      return;
    }
    headerMap.set(header, index);
  });

  if (duplicates.size > 0) {
    throw new HttpError(409, {
      ok: false,
      error: `Cards header row has duplicate required header(s): ${Array.from(duplicates).join(", ")}.`,
    });
  }

  const missing = CARD_HEADERS.filter((header) => !headerMap.has(header));
  if (missing.length > 0) {
    throw new HttpError(409, {
      ok: false,
      error: `Cards header row is missing required header(s): ${missing.join(", ")}.`,
    });
  }

  return headerMap;
}

function columnNumberToA1(columnNumber) {
  let number = Math.max(1, Number(columnNumber) || 1);
  let label = "";
  while (number > 0) {
    const remainder = (number - 1) % 26;
    label = String.fromCharCode(65 + remainder) + label;
    number = Math.floor((number - 1) / 26);
  }
  return label;
}

function normalizePinValue(pin) {
  return String(pin ?? "").trim();
}

function normalizeMerchantValue(merchant, cardNumber) {
  const normalizedMerchant = String(merchant ?? "").trim();
  if (normalizedMerchant) {
    return normalizedMerchant;
  }
  return WALMART_GIFT_CARD_NUMBER_PATTERN.test(String(cardNumber ?? "").trim()) ? DEFAULT_MERCHANT : "";
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
    normalized.merchant = normalizeMerchantValue(normalized.merchant, normalized.cardNumber);
    normalized.startingBalance = normalizeOptionalMoneyString(normalized.startingBalance);
    normalized.currentBalance = normalizeCurrentBalanceValue(normalized.currentBalance, normalized.startingBalance);
    if (seen.has(normalized.cardNumber)) {
      throw new HttpError(400, { ok: false, error: `Duplicate cardNumber ${normalized.cardNumber}.` });
    }
    seen.add(normalized.cardNumber);
    return normalized;
  });
}

function cardsFromSheetRows(rows, headerMap) {
  const cards = [];
  const seen = new Set();
  rows.forEach((row, index) => {
    if (!Array.isArray(row) || row.every((cell) => !String(cell || "").trim())) {
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
    card.merchant = normalizeMerchantValue(card.merchant, card.cardNumber);
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
    cards.push(card);
  });
  return cards;
}

function cardsToSheetRows(cards, headerRow, headerMap) {
  return cards.map((card) => headerRow.map((header) => {
    if (!headerMap.has(header)) {
      return "";
    }
    if (header === "used") {
      return card.used ? "TRUE" : "FALSE";
    }
    return card[header] ?? "";
  }));
}

function isSheetValuesEmpty(values) {
  return !Array.isArray(values) || values.every((row) => !Array.isArray(row) || row.every((cell) => String(cell ?? "").trim() === ""));
}

async function deleteEmptyDefaultSheetIfSafe(accessToken, spreadsheetId, metadata) {
  const sheets = Array.isArray(metadata?.sheets) ? metadata.sheets : [];
  const cardsSheet = getSheetProperties(metadata, CARDS_TAB);
  const metaSheet = getSheetProperties(metadata, META_TAB);
  const defaultSheet = getSheetProperties(metadata, DEFAULT_TAB);
  const defaultSheetId = defaultSheet?.sheetId;
  if (!cardsSheet || !metaSheet || !defaultSheet || sheets.length <= 1 || !Number.isInteger(defaultSheetId)) {
    return false;
  }

  const defaultValues = await readSheetValues(accessToken, spreadsheetId, `'${DEFAULT_TAB}'!A1:Z1000`).catch(() => null);
  if (!isSheetValuesEmpty(defaultValues)) {
    return false;
  }

  await googleFetch(`${GOOGLE_SHEETS_API}/${spreadsheetId}:batchUpdate`, accessToken, {
    method: "POST",
    body: JSON.stringify({ requests: [{ deleteSheet: { sheetId: defaultSheetId } }] }),
  }).catch(() => null);
  return true;
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
