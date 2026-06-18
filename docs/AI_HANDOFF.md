# AI Handoff

For compact current context, read `docs/CODEX_ACTIVE_CONTEXT.md` first. This handoff provides expanded Phase 11 guidance only when needed. Archived docs under `docs/archive/` are historical and should not be read for normal tasks.


## Current Branch Context

Active branch: `phase-11`.

Protected branch: `main`.

Current implementation phase: Phase 11 — OAuth/session durability and Google Sheets access hardening.

Phase 11 goal:

```text
Fix OAuth/session flow until fully functional and durable.
```

Phase 9, Phase 10, Phase 10E, and the Apps Script MVP are historical context only. Do not treat them as the active development phase or active sync architecture.

## Current Architecture

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

Frontend:

- GitHub Pages at `https://walmart-gc.dotsthewarlock.com`.
- Plain HTML, CSS, and JavaScript.
- No framework and no build system.

Backend:

- Cloudflare Worker on same-origin `https://walmart-gc.dotsthewarlock.com/auth/*` and `https://walmart-gc.dotsthewarlock.com/api/*` routes; `https://walmart-gc-oauth.dotsthewarlock.com` may remain fallback/legacy only.
- Workers KV for OAuth state and sessions.
- Worker owns Google OAuth, refresh tokens, session cookie, sheet discovery, sheet creation, schema initialization, metadata, and Google API calls.

Do not introduce or recommend a database, Firebase, Cloud Functions, Apps Script sync, Node backend, framework, build step, or new hosting.

## Active Product Scope

Required capabilities remain:

- Gift card list view.
- Gift card detail view.
- Barcode rendering.
- PIN display.
- Remaining balance tracking.
- Used flag tracking.
- Google Sheet synchronization through Worker endpoints; local/CSV flows remain available.
- Mobile-friendly interface.
- Desktop-friendly interface.
- CSV backup and recovery.
- Offline/local browser usability.

Core application functionality should not be redesigned during Phase 11 unless it directly blocks OAuth, session management, Google Sheets access, or sync.

## OAuth and Session Rules

Authentication is Worker-managed Google OAuth.

- Frontend auth state comes from `GET /api/status`.
- Logout uses `POST /api/logout`.
- Worker API calls must use same-origin `/api/*` paths with `credentials: "include"`.
- OAuth scope must remain `https://www.googleapis.com/auth/drive.file`.
- The frontend must never store access tokens, refresh tokens, session IDs, OAuth secrets, or Google API credentials.
- The session model is an HttpOnly, Secure, SameSite=Lax, host-only cookie.
- Do not use browser-side Google Identity Services token flow, direct browser Drive API calls, or direct browser Sheets API calls.

## Cloud-Only OAuth Deployment

Use only this frontend origin for production, development, and testing:

```text
https://walmart-gc.dotsthewarlock.com
```

Active Worker routing:

```text
https://walmart-gc.dotsthewarlock.com/auth/*
https://walmart-gc.dotsthewarlock.com/api/*
```

Required Cloudflare route rules:

```text
walmart-gc.dotsthewarlock.com/auth/*
walmart-gc.dotsthewarlock.com/api/*
```

Legacy Worker subdomain fallback:

```text
https://walmart-gc-oauth.dotsthewarlock.com
```

Google Cloud settings:

```text
Authorized JavaScript origin:
https://walmart-gc.dotsthewarlock.com

Authorized redirect URI:
https://walmart-gc.dotsthewarlock.com/auth/callback
```

Worker callback must return to:

```text
https://walmart-gc.dotsthewarlock.com/?auth=connected
```

Never document or recommend `/Walmart-GC/`, session IDs in query parameters, localhost OAuth, or alternate OAuth origins.

## Active Data Model

Spreadsheet name:

```text
Walmart-GC Data
```

Tabs:

```text
Cards
_META
```

Do not change the card schema without explicit approval. Sheets are mapped by header name; approved order:

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

Rules:

- `cardNumber` is the unique ID.
- `merchant` stores explicit user, Sheet, or import input only; blank merchant remains blank. Runtime barcode/UI behavior may infer Walmart Canada from valid Walmart Canada card numbers.
- `currentBalance` is authoritative.
- `startingBalance` is historical.
- `used` is independent of balance.
- Sort order is frontend-managed.
- Barcode payload is derived only and must not be stored: `79936686504000 + cardNumber`.

## Active Sync Behavior

Worker-backed sync only.

Completed actions should sync after:

- Balance save.
- Used-state change.
- Notes save.
- Merchant change.
- New card save.
- Accepted CSV import.

Do not sync on every keystroke.

If Walmart-GC Data is not configured yet, Google is disconnected, or the browser is offline:

- Keep local changes.
- Preserve cards/settings/saved Sheet configuration.
- Mark unsynced where appropriate.
- Show readable setup/reconnect guidance.
- Do not erase data.
- Keep CSV backup/recovery available.

## Conflict Handling

Preserve sheet-level optimistic concurrency through `_META.sheetVersion`:

- No silent overwrites.
- No automatic merge.
- User chooses recovery.
- CSV backup before destructive recovery.
- Remote load and local overwrite remain explicit actions.

## Phase 11 Success Criteria

OAuth is fixed when:

- Connect Google starts OAuth.
- Consent requests only `drive.file`.
- Callback succeeds.
- Worker sets the session cookie.
- `/api/status` reports connected.
- Refresh preserves login.
- Browser restart preserves login while the session is valid.
- Logout clears the session.
- Reconnect works.
- Ensure Sheet works.
- Load from Google Sheets works.
- Save/sync works.
- Offline behavior remains usable.
- CSV backup/recovery remains available.

## Retired/Historical Paths

Apps Script materials may remain only as historical MVP references, including `apps-script/Code.gs`, `docs/archive/apps-script-retired/APPS_SCRIPT_SETUP.md`, and `docs/archive/phase-6/PHASE_6_SCHEMA_API_DECISIONS.md`. Apps Script must not appear as the default/current setup path, the active sync path, or a normal user-facing option in Phase 11. Apps Script may still be inspected for diagnostics only when exact live behavior or an exact error string points to `apps-script/Code.gs`. Preserve the debugging priority: (1) exact error string or observed live behavior, (2) current workspace/repo files, (3) active deployment/config files, (4) project instructions, and (5) prior architecture assumptions.

Do not reintroduce:

- Apps Script sync.
- OAuth Client ID input for normal users.
- Browser-stored Google tokens.
- Browser-stored session IDs.
- Google Identity Services browser token flow.
- Direct browser Drive API access.
- Direct browser Sheets API access.
- Localhost OAuth.
- Alternate development origins.

## Verification Guidance

For documentation-only changes, prefer:

- Stale-reference search and review.
- `git diff --check`.
- Conflict-marker scan.

Run code validation only if code is touched.
