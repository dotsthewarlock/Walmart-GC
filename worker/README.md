# Walmart-GC OAuth Worker

Cloudflare Worker backend for the active Phase 11 durable OAuth/session and Sheets sync contract. The custom-domain GitHub Pages frontend stays at `https://walmart-gc.dotsthewarlock.com`; this Worker owns Google OAuth, stores refresh tokens server-side in KV, and exposes cookie-authenticated session status/logout and Sheet sync endpoints.

## Active Contract

- Authentication is Worker-managed Google OAuth.
- OAuth scope is exactly `https://www.googleapis.com/auth/drive.file`.
- The frontend never stores access tokens, refresh tokens, session IDs, OAuth secrets, or Google API credentials.
- Frontend auth state comes from `/api/status`.
- Logout uses `/api/logout`.
- Frontend Worker API calls use `credentials: "include"`.
- Session cookie is HttpOnly, Secure, SameSite=Lax, and host-only.
- Production and development/testing both use `https://walmart-gc.dotsthewarlock.com`.
- No localhost OAuth or alternate OAuth origin is supported.

## Endpoints

- `GET /` — health response.
- `GET /auth/init` — creates OAuth state plus PKCE verifier in `OAUTH_STATE` for 5 minutes and redirects to Google with `drive.file`.
- `GET /auth/callback` — validates state, exchanges the authorization code, stores the refresh token server-side in `SESSIONS`, sets the `walmart_gc_session` cookie, and redirects to the custom-domain app root with `?auth=connected`.
- `GET /api/status` — returns `{ "authenticated": false }` without a valid cookie/session, or authenticated account/session metadata without tokens.
- `POST /api/logout` — deletes the KV session when present, clears the cookie, and returns `{ "ok": true }`.
- `POST /api/sheet/ensure` — finds or creates `Walmart-GC Data`, initializes `Cards` and `_META`, and returns Sheet metadata.
- `GET /api/cards/load` — loads approved-schema cards plus `_META.sheetVersion`.
- `POST /api/cards/save` — saves completed local actions only when the submitted base `sheetVersion` matches the remote `_META.sheetVersion`.
- `OPTIONS *` — returns a clean CORS preflight response for the approved frontend origin.

## Source-of-Truth Rule

`worker/src/index.js` in this repository is the source of truth for the live Worker. Avoid Cloudflare Web IDE edits except emergency fixes; if an emergency edit is unavoidable, backport it into this repository before the next deploy.

## Required Cloudflare Configuration

KV bindings:

- `SESSIONS`
- `OAUTH_STATE`

Secrets:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `SESSION_SECRET`

Vars:

- `FRONTEND_ORIGIN=https://walmart-gc.dotsthewarlock.com`
- `REDIRECT_URI=https://walmart-gc-oauth.dotsthewarlock.com/auth/callback`

Google OAuth settings:

```text
Authorized JavaScript origin:
https://walmart-gc.dotsthewarlock.com

Authorized redirect URI:
https://walmart-gc-oauth.dotsthewarlock.com/auth/callback
```

The Worker requests only this scope:

```text
https://www.googleapis.com/auth/drive.file
```

The Worker callback returns to:

```text
https://walmart-gc.dotsthewarlock.com/?auth=connected
```

Do not use `/Walmart-GC/`, `session_id` query parameters, localhost OAuth, or alternate OAuth origins.

## Cookie Contract

Successful OAuth callback sets:

```text
walmart_gc_session=<sessionId>; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=2592000
```

The cookie contains only an opaque random session ID. The KV key is HMAC-derived with `SESSION_SECRET`; refresh tokens remain server-side only and are never returned by API responses. The frontend must not store tokens or session IDs.

## CORS Contract

Credentialed CORS headers are returned only when the request `Origin` is exactly:

```text
https://walmart-gc.dotsthewarlock.com
```

Allowed CORS response headers:

```text
Access-Control-Allow-Origin: https://walmart-gc.dotsthewarlock.com
Access-Control-Allow-Credentials: true
Access-Control-Allow-Methods: GET,POST,OPTIONS
Access-Control-Allow-Headers: Content-Type
Vary: Origin
```

## Sheet and Sync Contract

Spreadsheet:

```text
Walmart-GC Data
```

Tabs:

```text
Cards
_META
```

Approved `Cards` schema:

```text
cardNumber
pin
merchant
startingBalance
currentBalance
dateAdded
dateUpdated
dateUsed
used
notes
```

Completed-action sync only:

- Balance save.
- Used state change.
- Notes save.
- Merchant change.
- New card save.
- Accepted CSV import.

Conflict detection uses `_META.sheetVersion`; there is no silent overwrite or automatic merge.
