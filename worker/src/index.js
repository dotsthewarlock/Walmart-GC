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
const WORKER_VERSION = "balance-review-schema-v0.1";
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
    schemaCapability,
    hasCardRows: sheet.hasCardRows,
  });
}

async function handleCardsLoad(request, env) {
  const sessionContext = await requireSession(request, env);
  const token = await getGoogleAccessToken(env, sessionContext);
  const sheet = await getInitializedSpreadsheet(token, sessionContext.session);
  const baseMeta = await readSheetMeta(token, sheet.sheetId);
  if (!baseMeta.sheetVersion) throw sheetSetupRequired();
  const [headerRow, ...rows] = await readSheetValues(token, sheet.sheetId, CARDS_RANGE);
  const cards = cardsFromSheetRows(rows, validateCardHeaders(headerRow));
  const meta = await readSheetMeta(token, sheet.sheetId);
  if (baseMeta.sheetVersion !== meta.sheetVersion) {
    return jsonResponse({ ok: false, error: "The Sheet changed while loading. Load it again.", schemaCapability }, 409);
  }
  await saveSession(env, sessionContext, {
    sheetId: sheet.sheetId,
    sheetName: sheet.sheetName,
    sheetVersion: meta.sheetVersion || "",
  });

  return jsonResponse({
    ok: true,
    cards,
    schemaCapability,
    sheetId: sheet.sheetId,
    sheetName: sheet.sheetName,
    sheetVersion: meta.sheetVersion || "",
    lastUpdated: meta.lastUpdated || "",
  });
}

async function handleCardsSave(request, env) {
  const sessionContext = await requireSession(request, env);
  const body = await request.json().catch(() => null);
  const compatible = body?.schemaCapability === schemaCapability;
  const protectedInventory = body && Object.hasOwn(body, "cardsWithMetadata");
  if (protectedInventory && !compatible) throw cardCapabilityError();
  const inventory = protectedInventory ? body.cardsWithMetadata : body?.cards;
  if (!Array.isArray(inventory) || (protectedInventory && Object.hasOwn(body, "cards"))) {
    throw new HttpError(400, { ok: false, error: "Expected one cards array." });
  }

  const cards = validateCards(inventory);
  const populatedHeaders = optionalCardHeaders.filter((header) =>
    cards.some((card) => card[header] !== undefined)
  );
  if (populatedHeaders.length && !compatible) throw cardCapabilityError();

  const baseSheetVersion = String(body.baseSheetVersion || "").trim();
  const token = await getGoogleAccessToken(env, sessionContext);
  const sheet = await getInitializedSpreadsheet(token, sessionContext.session);
  const [currentHeaderRow, ...currentRows] = await readSheetValues(token, sheet.sheetId, CARDS_RANGE);
  const currentHeaders = validateCardHeaders(currentHeaderRow);
  const extended = optionalCardHeaders.some((header) => currentHeaders.has(header));
  if (extended && !compatible) throw cardCapabilityError();
  let removesMetadata = false;
  if (extended) {
    const savedCardsByNumber = new Map(cards.map((card) => [card.cardNumber, card]));
    const cardNumberColumn = currentHeaders.get("cardNumber");
    for (const [index, row] of currentRows.entries()) {
      const metadata = readSheetCardMetadata(row, currentHeaders, index);
      const replacement = savedCardsByNumber.get(String(row[cardNumberColumn] ?? "").trim());
      if (Object.keys(metadata).some((field) => replacement?.[field] === undefined)) {
        removesMetadata = true;
      }
    }
  }

  const headerRow = normalizeHeaderRow(currentHeaderRow).slice(0, currentHeaders.size);
  const appendedHeaders = [];
  if (!currentHeaders.has("merchantInferred")) appendedHeaders.push("merchantInferred");
  appendedHeaders.push(...populatedHeaders.filter((header) => !currentHeaders.has(header)));

  if (appendedHeaders.length) {
    const targetCells = await readSheetValues(token, sheet.sheetId, CARDS_RANGE, "FORMULA");
    checkAppendTargets(targetCells, headerRow.length, appendedHeaders.length);
  }

  // Compare the version after read-only validation and immediately before the batch.
  const metaRows = await readSheetValues(token, sheet.sheetId, `${META_TAB}!A:B`);
  const remoteSheetVersion = String(parseSheetMeta(metaRows).sheetVersion || "").trim();
  if (remoteSheetVersion !== baseSheetVersion) {
    return jsonResponse({ ok: false, conflict: true, remoteSheetVersion, schemaCapability }, 409);
  }
  if (!remoteSheetVersion) throw sheetSetupRequired();
  if (removesMetadata && body.acknowledgeMetadataRemoval !== true) {
    return jsonResponse({
      ok: false,
      conflict: true,
      errorType: "cards_metadata_loss",
      error: "Sync stopped because this session would remove saved balance-check metadata. Load the Sheet to keep it, or back up the Sheet before choosing Overwrite sheet with this session.",
      remoteSheetVersion,
      schemaCapability,
    }, 409);
  }

  const nextMeta = { sheetVersion: generateSheetVersion(), lastUpdated: new Date().toISOString() };
  await writeCardsSnapshot(token, sheet, cards, headerRow, appendedHeaders, metaRows, nextMeta);
  await saveSession(env, sessionContext, {
    sheetId: sheet.sheetId,
    sheetName: sheet.sheetName,
    sheetVersion: nextMeta.sheetVersion,
  });

  return jsonResponse({
    ok: true,
    schemaCapability,
    sheetId: sheet.sheetId,
    sheetName: sheet.sheetName,
    ...nextMeta,
  });
}

function cardCapabilityError() {
  return new HttpError(409, {
    ok: false,
    error: "This Sheet or save requires card metadata support. Reload an updated client before syncing. Export a CSV backup before destructive recovery.",
    errorType: "cards_schema_capability",
    schemaCapability,
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
    await getGoogleAccessToken(env, sessionContext);
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

async function getInitializedSpreadsheet(accessToken, session) {
  const file = await findSessionSpreadsheet(accessToken, session);
  if (!file) throw sheetSetupRequired();
  const metadata = await getSpreadsheetMetadata(accessToken, file.id);
  const cardsProperties = getSheetProperties(metadata, CARDS_TAB);
  const metaProperties = getSheetProperties(metadata, META_TAB);
  if (!cardsProperties || !metaProperties) throw sheetSetupRequired();
  return {
    sheetId: file.id,
    sheetName: metadata?.properties?.title || file.name || DEFAULT_SHEET_NAME,
    cardsProperties,
    metaProperties,
  };
}

async function findSessionSpreadsheet(accessToken, session) {
  const file = session.sheetId ? await getDriveFile(accessToken, session.sheetId).catch(() => null) : null;
  return file || findWalmartGcSpreadsheet(accessToken);
}

async function ensureSpreadsheetAndSchema(accessToken, session) {
  const file = await findSessionSpreadsheet(accessToken, session) || await createWalmartGcSpreadsheet(accessToken);

  const { metadata, hasCardRows } = await ensureSheetStructure(accessToken, file.id);
  const meta = await ensureSheetMeta(accessToken, file.id, getSheetProperties(metadata, META_TAB));
  await deleteEmptyDefaultSheetIfSafe(accessToken, file.id, metadata);
  const sheetName = metadata?.properties?.title || file.name || DEFAULT_SHEET_NAME;
  return {
    sheetId: file.id,
    sheetName,
    sheetVersion: meta.sheetVersion || "",
    lastUpdated: meta.lastUpdated || "",
    hasCardRows,
    sessionPatch: {
      sheetId: file.id,
      sheetName,
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
  return googleFetch(`${GOOGLE_SHEETS_API}/${spreadsheetId}?fields=properties.title,sheets.properties(sheetId,title,hidden,gridProperties(rowCount,columnCount))`, accessToken);
}

function getSheetProperties(metadata, title) {
  return metadata?.sheets?.find((sheet) => sheet?.properties?.title === title)?.properties || null;
}

async function ensureSheetStructure(accessToken, spreadsheetId) {
  let metadata = await getSpreadsheetMetadata(accessToken, spreadsheetId);
  const cardsProperties = getSheetProperties(metadata, CARDS_TAB);
  const metaProperties = getSheetProperties(metadata, META_TAB);
  const [headerRow] = cardsProperties
    ? await readSheetValues(accessToken, spreadsheetId, `${CARDS_RANGE}!1:1`, "FORMULA")
    : [];
  const initializeCards = isSheetValuesEmpty([headerRow]);
  let hasCardRows = false;
  if (!initializeCards) {
    const headers = validateCardHeaders(headerRow);
    const [, ...cardRows] = await readSheetValues(accessToken, spreadsheetId, CARDS_RANGE);
    cardRows.forEach((row, index) => readSheetCardMetadata(row, headers, index));
    hasCardRows = cardRows.some((row) => !isSheetValuesEmpty([row.slice(0, headers.size)]));
  } else if (cardsProperties) {
    const cardsCells = await readSheetValues(accessToken, spreadsheetId, CARDS_RANGE, "FORMULA");
    if (!isSheetValuesEmpty(cardsCells)) {
      throw new HttpError(409, buildCardsHeaderError("Cards has data without a usable header row. Fix row 1 manually before syncing."));
    }
  }
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
  }

  if (initializeCards) {
    await writeSheetValues(accessToken, spreadsheetId, `${CARDS_RANGE}!A1:K1`, [CARD_HEADERS]);
  }

  return { metadata, hasCardRows };
}

async function readSheetValues(accessToken, spreadsheetId, range, valueRenderOption = "FORMATTED_VALUE") {
  const body = await googleFetch(
    `${GOOGLE_SHEETS_API}/${spreadsheetId}/values/${encodeRange(range)}?majorDimension=ROWS&valueRenderOption=${valueRenderOption}`,
    accessToken,
  );
  return Array.isArray(body.values) ? body.values : [];
}

async function writeSheetValues(accessToken, spreadsheetId, range, values) {
  return googleFetch(`${GOOGLE_SHEETS_API}/${spreadsheetId}/values/${encodeRange(range)}?valueInputOption=RAW`, accessToken, {
    method: "PUT",
    body: JSON.stringify({ range, majorDimension: "ROWS", values }),
  });
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

async function ensureSheetMeta(accessToken, spreadsheetId, { sheetId, gridProperties }) {
  const rows = await readSheetValues(accessToken, spreadsheetId, `${META_TAB}!A:B`, "FORMULA");
  const [header] = rows;
  const requests = [];
  const writeRow = (rowIndex, values) => ({
    updateCells: {
      start: { sheetId, rowIndex, columnIndex: 0 },
      rows: [sheetCellData(values)],
      fields: "userEnteredValue",
    },
  });
  if (isSheetValuesEmpty([header])) {
    requests.push(writeRow(0, ["key", "value"]));
  } else if (header[0] !== "key" || header[1] !== "value") {
    throw new HttpError(409, { ok: false, error: "Fix the _META header to key,value before initializing the Sheet." });
  }

  const meta = parseSheetMeta(rows);
  const defaults = {
    schemaVersion: SCHEMA_VERSION,
    sheetVersion: generateSheetVersion(),
    lastUpdated: new Date().toISOString(),
    appName: APP_NAME,
  };
  let nextRow = Math.max(1, rows.length);
  for (const [key, value] of Object.entries(defaults)) {
    const indexes = findMetaRows(rows, key);
    if (indexes.length > 1) throw sheetSetupRequired();
    if (meta[key]) continue;
    requests.push(writeRow(indexes[0] ?? nextRow++, [key, value]));
    meta[key] = value;
  }
  if (requests.length) {
    const availableRows = gridProperties?.rowCount;
    if (Number.isInteger(availableRows) && nextRow > availableRows) {
      requests.unshift({ appendDimension: { sheetId, dimension: "ROWS", length: nextRow - availableRows } });
    }
    await googleFetch(`${GOOGLE_SHEETS_API}/${spreadsheetId}:batchUpdate`, accessToken, {
      method: "POST",
      body: JSON.stringify({ requests }),
    });
  }
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
  const requests = [];

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
  for (const [key, value] of Object.entries(nextMeta)) {
    const matchingRows = findMetaRows(metaRows, key);
    if (matchingRows.length !== 1) throw sheetSetupRequired();
    requests.push({
      updateCells: {
        start: { sheetId: metaProperties.sheetId, rowIndex: matchingRows[0], columnIndex: 1 },
        rows: [sheetCellData([value])],
        fields: "userEnteredValue",
      },
    });
  }
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

async function deleteEmptyDefaultSheetIfSafe(accessToken, spreadsheetId, metadata) {
  const sheets = Array.isArray(metadata?.sheets) ? metadata.sheets : [];
  const cardsSheet = getSheetProperties(metadata, CARDS_TAB);
  const metaSheet = getSheetProperties(metadata, META_TAB);
  const defaultSheet = getSheetProperties(metadata, DEFAULT_TAB);
  const defaultSheetId = defaultSheet?.sheetId;
  if (!cardsSheet || !metaSheet || !defaultSheet || sheets.length <= 1 || !Number.isInteger(defaultSheetId)) {
    return false;
  }

  const defaultValues = await readSheetValues(accessToken, spreadsheetId, `'${DEFAULT_TAB}'`, "FORMULA").catch(() => null);
  if (!defaultValues || !isSheetValuesEmpty(defaultValues)) {
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

export const workerTestInternals = {
  CARD_HEADERS,
  validateCardHeaders,
  inferMerchantFromCardNumber,
};
