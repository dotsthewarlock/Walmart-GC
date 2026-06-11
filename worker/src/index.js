const OAUTH_SCOPE = "https://www.googleapis.com/auth/drive.file";
const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const SESSION_COOKIE = "walmart_gc_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;
const OAUTH_STATE_TTL_SECONDS = 60 * 5;
const DEFAULT_SHEET_NAME = "Walmart-GC Data";
const FRONTEND_ORIGIN = "https://walmart-gc.dotsthewarlock.com";
const FRONTEND_CONNECTED_PATH = "/?auth=connected";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return handleOptions(request, env);
    }

    try {
      if (request.method === "GET" && url.pathname === "/") {
        return withCors(request, jsonResponse({ ok: true, service: "walmart-gc-oauth" }), env);
      }

      if (request.method === "GET" && url.pathname === "/auth/init") {
        return handleAuthInit(env);
      }

      if (request.method === "GET" && url.pathname === "/auth/callback") {
        return handleAuthCallback(request, env);
      }

      if (request.method === "GET" && url.pathname === "/api/status") {
        return withCors(request, await handleStatus(request, env), env);
      }

      if (request.method === "POST" && url.pathname === "/api/logout") {
        return withCors(request, await handleLogout(request, env), env);
      }

      return withCors(request, jsonResponse({ error: "not_found" }, 404), env);
    } catch (error) {
      return withCors(request, jsonResponse({ error: "server_error", message: safeErrorMessage(error) }, 500), env);
    }
  },
};

async function handleAuthInit(env) {
  assertOAuthConfig(env);

  const state = randomBase64Url(32);
  const verifier = randomBase64Url(64);
  const challenge = await sha256Base64Url(verifier);

  await env.OAUTH_STATE.put(
    oauthStateKey(state),
    JSON.stringify({ verifier, createdAt: new Date().toISOString() }),
    { expirationTtl: OAUTH_STATE_TTL_SECONDS },
  );

  const authUrl = new URL(GOOGLE_AUTH_URL);
  authUrl.searchParams.set("client_id", env.GOOGLE_CLIENT_ID);
  authUrl.searchParams.set("redirect_uri", env.REDIRECT_URI);
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
      redirect_uri: env.REDIRECT_URI,
    }),
  });

  const tokenPayload = await tokenResponse.json().catch(() => ({}));
  if (!tokenResponse.ok) {
    return textResponse("OAuth token exchange failed.", 502);
  }

  if (!tokenPayload.refresh_token) {
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
    email: "",
    name: "",
    sheetId: "",
    sheetName: DEFAULT_SHEET_NAME,
    scope: OAUTH_SCOPE,
    accessToken: tokenPayload.access_token || "",
    refreshToken: tokenPayload.refresh_token,
    tokenType: tokenPayload.token_type || "Bearer",
    expiresAt: tokenPayload.expires_in
      ? new Date(Date.now() + Number(tokenPayload.expires_in) * 1000).toISOString()
      : "",
  };

  await env.SESSIONS.put(await sessionKey(env, sessionId), JSON.stringify(session), {
    expirationTtl: SESSION_TTL_SECONDS,
  });

  const redirectTo = `${FRONTEND_ORIGIN}${FRONTEND_CONNECTED_PATH}`;
  return new Response(null, {
    status: 302,
    headers: {
      Location: redirectTo,
      "Set-Cookie": buildSessionCookie(sessionId, SESSION_TTL_SECONDS),
      "Cache-Control": "no-store",
    },
  });
}

async function handleStatus(request, env) {
  const sessionId = readCookie(request.headers.get("Cookie") || "", SESSION_COOKIE);
  if (!sessionId) {
    return jsonResponse({ authenticated: false });
  }

  assertSessionConfig(env);
  const session = await env.SESSIONS.get(await sessionKey(env, sessionId), { type: "json" });
  if (!session?.refreshToken) {
    return jsonResponse({ authenticated: false });
  }

  return jsonResponse({
    authenticated: true,
    email: session.email || "",
    name: session.name || "",
    sheetId: session.sheetId || "",
    sheetName: session.sheetName || DEFAULT_SHEET_NAME,
    scope: session.scope || OAUTH_SCOPE,
  });
}

async function handleLogout(request, env) {
  const sessionId = readCookie(request.headers.get("Cookie") || "", SESSION_COOKIE);
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

function handleOptions(request, env) {
  return withCors(request, new Response(null, { status: 204 }), env);
}

function withCors(request, response, env) {
  const origin = request.headers.get("Origin") || "";
  if (origin !== FRONTEND_ORIGIN) {
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
  const required = ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "REDIRECT_URI", "OAUTH_STATE"];
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

function oauthStateKey(state) {
  return `oauth-state:${state}`;
}

async function sessionKey(env, sessionId) {
  return `session:${await hmacSha256Base64Url(env.SESSION_SECRET, sessionId)}`;
}

function buildSessionCookie(value, maxAge) {
  return `${SESSION_COOKIE}=${value}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${maxAge}`;
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
