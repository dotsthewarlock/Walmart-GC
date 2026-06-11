# Deployment Guide

Walmart-GC is a static GitHub Pages app. It uses plain HTML, CSS, and JavaScript with no build step, backend server, database, framework, or npm dependency.

## Active Phase 11 Deployment Model

```text
User Google Account
        ↕
Google OAuth
        ↕
Cloudflare Worker
        ↕
Google Drive API / Google Sheets API
        ↕
Walmart-GC Web App
```

Frontend production and development/testing URL:

```text
https://walmart-gc.dotsthewarlock.com
```

Active Worker routing:

```text
https://walmart-gc.dotsthewarlock.com/auth/*
https://walmart-gc.dotsthewarlock.com/api/*
```

GitHub Pages continues to serve static files at the custom-domain root. The legacy Worker subdomain `https://walmart-gc-oauth.dotsthewarlock.com` may remain available only as a fallback/legacy deployment endpoint; normal frontend OAuth and API calls use same-origin `/auth/*` and `/api/*` paths.

Normal users should only need to open the custom-domain app, select **Connect Google**, approve `drive.file` access, and return to Walmart-GC with a durable HttpOnly Worker session cookie.

## Branches

- Active development branch: `phase-11`.
- Protected branch: `main`.

Phase 9, Phase 10, Phase 10E, and the Apps Script MVP are historical context only. Do not deploy or document Apps Script sync as the active path.

## Maintainer OAuth Setup

The OAuth client secret, refresh tokens, access tokens, and session records stay in the Cloudflare Worker/Workers KV. Do not add OAuth client secrets, Google tokens, or session IDs to the frontend.

Required Google Cloud settings:

- OAuth app audience: External.
- OAuth status may be Testing while limited to configured test users.
- Enabled APIs: Google Drive API and Google Sheets API.
- Authorized JavaScript origin: `https://walmart-gc.dotsthewarlock.com`.
- Authorized redirect URI: `https://walmart-gc.dotsthewarlock.com/auth/callback`.
- Scope used by the app: `https://www.googleapis.com/auth/drive.file`.

Cloudflare must route these same-origin paths to the Worker:

```text
walmart-gc.dotsthewarlock.com/auth/*
walmart-gc.dotsthewarlock.com/api/*
```

The Worker callback redirects users to `https://walmart-gc.dotsthewarlock.com/?auth=connected` and carries the session only in the `walmart_gc_session` HttpOnly cookie. Frontend Worker API calls use same-origin paths with `credentials: "include"`.

Do not configure or recommend localhost OAuth, alternate development origins, `/Walmart-GC/` callback paths, session IDs in query parameters, OAuth Client ID inputs for normal users, Google Identity Services browser token flow, direct browser Drive API calls, or direct browser Sheets API calls.


## Cloudflare Worker KV Bindings

The Worker requires two KV bindings with exact binding names used by `worker/src/index.js`:

- `SESSIONS` — durable server-side session records and refresh tokens.
- `OAUTH_STATE` — short-lived OAuth state and PKCE verifier records.

The repository's `worker/wrangler.toml` intentionally contains placeholder KV namespace IDs. Real Cloudflare KV namespace IDs should not be invented or exposed in documentation. Before deploying with Wrangler, replace the placeholders with the real namespace IDs for the target Cloudflare account, or configure equivalent bindings in the Cloudflare dashboard/deployment pipeline. A deployment that leaves `REPLACE_WITH_SESSIONS_KV_NAMESPACE_ID` or `REPLACE_WITH_OAUTH_STATE_KV_NAMESPACE_ID` unchanged is not ready for production.

## Worker Source of Truth

The Worker code in this repository is the source of truth for the same-origin `/auth/*` and `/api/*` routes on `https://walmart-gc.dotsthewarlock.com`. The legacy Worker subdomain may remain available as fallback/legacy routing only. Avoid Cloudflare Web IDE edits because they can drift from reviewable source control. Use Web IDE changes only for emergency fixes, then immediately backport the exact change into `worker/src/index.js`, run verification, and redeploy from the repository.

Worker contract checks:

- OAuth callback redirects to `https://walmart-gc.dotsthewarlock.com/?auth=connected`.
- Callback does not append `/Walmart-GC/` or any `session_id` query parameter.
- Session cookie is host-only: `walmart_gc_session=<id>; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=2592000`.
- The cookie does not set `Domain=`.
- `/api/status` clears that same host-only cookie if the browser presents a stale session whose KV record is missing, expired, invalid, or otherwise unusable.
- Same-origin `/auth/*` and `/api/*` routing is active; credentialed CORS remains only as a defensive fallback for legacy Worker-domain calls from `https://walmart-gc.dotsthewarlock.com`.
- OAuth scope remains `https://www.googleapis.com/auth/drive.file`.

## Static Files

Deploy these frontend files through GitHub Pages from the selected branch:

- `index.html`
- `app.js`
- `styles.css`
- documentation files as needed

Deploy `worker/src/index.js` as the source of truth for the Cloudflare Worker.

## Pre-Deployment Checks

Run code validation only when code is touched. For docs-only changes, run documentation/reference checks and whitespace/conflict checks.

When code is touched, run:

```bash
node --check app.js
node --check worker/src/index.js
git diff --check
# Run a conflict-marker scan before committing.
```

Also confirm:

- The debug fingerprint versions match the intended deployment when core files changed.
- No user-facing OAuth Client ID input is present.
- No normal first-run Sheet URL/ID setup is present.
- Apps Script appears only in clearly labeled historical documentation.
- CSV export/import remains available.
- Offline behavior remains usable.

## Phase 11 OAuth/Session Smoke Test

1. Open `https://walmart-gc.dotsthewarlock.com`.
2. Confirm the debug fingerprint.
3. Open the **Data** panel.
4. Select **Connect Google**.
5. Confirm consent requests only `drive.file`.
6. Confirm the return URL is `https://walmart-gc.dotsthewarlock.com/?auth=connected`, then cleans itself without any session query parameter.
7. Confirm the same-origin `walmart_gc_session` cookie exists for `walmart-gc.dotsthewarlock.com` and refresh keeps the connection.
8. Restart the browser and confirm login persists while the session is valid.
9. Confirm `/api/status` reports connected.
10. Confirm logout clears the session.
11. Confirm reconnect works.
12. Confirm **Ensure Sheet** locates or creates `Walmart-GC Data` through the Worker.
13. Confirm **Load from Google Sheets** works.
14. Confirm save/sync works for completed actions.
15. Confirm local/offline data remains available if Google setup fails.
16. Confirm CSV backup/recovery remains available.
