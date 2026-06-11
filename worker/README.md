# Walmart-GC OAuth Worker

Cloudflare Worker backend for the Phase 10A durable OAuth session contract. The GitHub Pages frontend stays at `https://dotsthewarlock.github.io/Walmart-GC/`; this Worker owns Google OAuth, stores refresh tokens server-side in KV, and exposes cookie-authenticated session status/logout endpoints.

## Endpoints

- `GET /` — health response.
- `GET /auth/init` — creates OAuth state plus PKCE verifier in `OAUTH_STATE` for 5 minutes and redirects to Google with `drive.file`.
- `GET /auth/callback` — validates state, exchanges the authorization code, stores the refresh token server-side in `SESSIONS`, sets the `walmart_gc_session` cookie, and redirects to GitHub Pages with `?auth=connected`.
- `GET /api/status` — returns `{ "authenticated": false }` without a valid cookie/session, or authenticated account/session metadata without tokens.
- `POST /api/logout` — deletes the KV session when present, clears the cookie, and returns `{ "ok": true }`.
- `OPTIONS *` — returns a clean CORS preflight response for the approved frontend origin.

## Required Cloudflare configuration

KV bindings:

- `SESSIONS`
- `OAUTH_STATE`

Secrets:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `SESSION_SECRET`

Vars:

- `FRONTEND_ORIGIN=https://dotsthewarlock.github.io`
- `REDIRECT_URI=https://walmart-gc-oauth.dotsthewarlock.workers.dev/auth/callback`

Google OAuth must allow this redirect URI exactly:

```text
https://walmart-gc-oauth.dotsthewarlock.workers.dev/auth/callback
```

The Worker requests only this scope:

```text
https://www.googleapis.com/auth/drive.file
```

## Cookie contract

Successful OAuth callback sets:

```text
walmart_gc_session=<sessionId>; HttpOnly; Secure; SameSite=None; Path=/; Max-Age=2592000
```

The cookie contains only an opaque random session ID. The KV key is HMAC-derived with `SESSION_SECRET`; refresh tokens remain server-side only and are never returned by API responses.

## CORS contract

Credentialed CORS headers are returned only when the request `Origin` is exactly:

```text
https://dotsthewarlock.github.io
```

Allowed CORS response headers:

```text
Access-Control-Allow-Origin: https://dotsthewarlock.github.io
Access-Control-Allow-Credentials: true
Access-Control-Allow-Methods: GET,POST,OPTIONS
Access-Control-Allow-Headers: Content-Type
Vary: Origin
```
