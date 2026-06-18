# Roadmap

## Current Phase

Phase 11 is the only active development phase.

Active branch:

```text
phase-11
```

Protected branch:

```text
main
```

Phase 11 goal:

```text
Fix OAuth/session flow until fully functional and durable.
```

Core application functionality is considered satisfactory unless it directly blocks OAuth, session management, Google Sheets access, or sync. Do not redesign the product during Phase 11.

## Current Phase 11 Architecture

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

- `https://walmart-gc.dotsthewarlock.com`
- GitHub Pages
- HTML, CSS, JavaScript
- No framework
- No build system

Backend:

- Same-origin `https://walmart-gc.dotsthewarlock.com/auth/*` and `https://walmart-gc.dotsthewarlock.com/api/*` routes
- Cloudflare Worker
- Workers KV
- Legacy Worker subdomain `https://walmart-gc-oauth.dotsthewarlock.com` may remain fallback/legacy only

Do not introduce or recommend a database, Firebase, Cloud Functions, Apps Script sync, Node backend, framework, build step, new hosting, localhost OAuth, alternate OAuth origins, `/Walmart-GC/`, or session IDs in query parameters.

## Phase 11 Success Criteria

OAuth is fixed when:

- Connect Google starts OAuth.
- Consent requests only `drive.file`.
- Callback succeeds.
- Worker sets the session cookie.
- `/api/status` reports connected.
- Refresh preserves login.
- Browser restart preserves login while session is valid.
- Logout clears session.
- Reconnect works.
- Ensure Sheet works.
- Load from Google Sheets works.
- Save/sync works.
- Offline behavior remains usable.
- CSV backup/recovery remains available.

## Preserved Constraints

- OAuth scope remains `https://www.googleapis.com/auth/drive.file`.
- Frontend never stores access tokens, refresh tokens, session IDs, OAuth secrets, or Google API credentials.
- Frontend auth state comes from `/api/status`.
- Logout uses `/api/logout`.
- Worker API calls use same-origin `/api/*` paths with `credentials: "include"`.
- Session cookie is HttpOnly, Secure, SameSite=Lax, and host-only.
- Google Sheet schema remains unchanged.
- Worker owns sheet discovery, creation, initialization, metadata, and Google API access.
- Offline usability and CSV backup/recovery remain available.

## Sheet Model

Spreadsheet:

```text
Walmart-GC Data
```

Tabs:

```text
Cards
_META
```

Approved schema (header-name based; new Sheets use this preferred order):

```text
cardNumber
pin
startingBalance
currentBalance
merchant
dateAdded
dateUpdated
dateUsed
used
notes
```

Barcode payload is derived only and must not be stored:

```text
79936686504000 + cardNumber
```

## Sync Model

Worker-backed sync only. Completed actions sync after:

- Balance save.
- Used state change.
- Notes save.
- Merchant change.
- New card save.
- Accepted CSV import.

Do not sync every keystroke.

Conflict model:

- Sheet-level optimistic concurrency via `_META.sheetVersion`.
- No silent overwrite.
- No automatic merge.
- User chooses recovery.
- CSV backup before destructive recovery.

## Historical Phases

The following are historical context only and are not the active development phase:

- Phase 1 — Static app foundation.
- Phase 2 — Checkout workflow improvements.
- Phase 3 — Used flag model and settings.
- Phase 4 — Mobile navigation workflow.
- Phase 5B — Data panel and checkout refinements.
- Phase 6 — Google Sheet schema and Apps Script API design for the historical MVP.
- Phase 7 — Apps Script sync implementation for the historical MVP.
- Phase 8 — MVP cleanup, diagnostics, setup guidance, and verification.
- Phase 9 / phase-9-oauth — OAuth exploration and transition work.
- Phase 10 / Phase 10E — Worker-backed OAuth/sync hardening before Phase 11.
- Apps Script MVP — preserved historical reference only; Apps Script sync is retired from the active architecture.

Historical docs may remain when clearly labeled historical. They must not be read as active Phase 11 setup or sync guidance.
