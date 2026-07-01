# Architecture (GC Wallet)

## Overview

**GC Wallet** (deployed and tracked under repository identifier `Walmart-GC`) uses a React 19 + Vite + Tailwind CSS frontend environment plus a Cloudflare Worker backend architecture. It avoids databases, Firebase, Cloud Functions, Apps Script sync, Node backends, VPS hosting, and app-managed user accounts.

`main` is the active live branch. The application is built and deployed to GitHub Pages via GitHub Actions from `main` (React 19 + Vite + Tailwind CSS). The legacy `phase-12` branch remains preserved as the archival baseline. Core product behavior should not be redesigned unless it directly blocks OAuth, session management, Google Sheets access, or sync.


## Runtime Debugging Priority

The Cloudflare Worker remains the active runtime for OAuth, sessions, Drive, and Sheets access. For live incidents, do not let intended architecture override direct runtime evidence. Debug in this order:

1. Exact live error string / observed behavior
2. Current workspace/repo files
3. Active deployment/config
4. Repo docs / intended architecture
5. Prior assumptions

If an exact live error string exists only in `apps-script/Code.gs`, inspect and debug Apps Script first until the active runtime is disproven. This does not make Apps Script the active default architecture; it only prevents ignoring live evidence.

## Current React Migration Architecture

```text
User Google Account
        ↕
Google OAuth
        ↕
Cloudflare Worker
        ↕
Google Drive API / Google Sheets API
        ↕
GC Wallet (Static React 19 + Vite Web App)
```

Deployment URLs:

```text
Frontend production/development/testing:
https://walmart-gc.dotsthewarlock.com

Worker same-origin routes:
https://walmart-gc.dotsthewarlock.com/auth/*
https://walmart-gc.dotsthewarlock.com/api/*

Legacy Worker subdomain fallback:
https://walmart-gc-oauth.dotsthewarlock.com
```

Local browser storage and CSV backup/recovery remain available when offline or disconnected.

## Components

### GC Wallet Web App

The static frontend provides:

- Card list.
- Card details.
- Barcode display.
- Balance, used-state, notes, and merchant edits.
- Worker-backed Google Sheet sync controls.
- CSV backup and recovery.
- Offline/local browser usability.

The frontend is React 19 + Vite + Tailwind CSS. Local development assumes a default port alignment (e.g., port 5174) proxied to the Worker, which must be verified before local OAuth testing rather than treated as an approved package/config change. Production is compiled and hosted via GitHub Pages.

### Cloudflare Worker

The Worker owns:

- Google OAuth initiation and callback handling.
- Refresh tokens and server-side token refresh.
- HttpOnly, Secure, SameSite=Lax, host-only session cookie.
- `/api/status` auth state.
- `/api/logout` session clearing.
- Google Drive API calls.
- Google Sheets API calls.
- Sheet discovery, creation, initialization, metadata, and sync conflict checks.

Cloudflare routes `walmart-gc.dotsthewarlock.com/auth/*` and `walmart-gc.dotsthewarlock.com/api/*` to the Worker while GitHub Pages serves the static app at the root. Frontend Worker API calls use same-origin `/auth/*` and `/api/*` paths with `credentials: "include"`; CORS is retained only as a defensive fallback for legacy Worker-domain calls.

### Google OAuth

The OAuth scope is exactly:

```text
https://www.googleapis.com/auth/drive.file
```

Google Cloud settings:

```text
Authorized JavaScript origin:
https://walmart-gc.dotsthewarlock.com

Authorized redirect URI:
https://walmart-gc.dotsthewarlock.com/auth/callback
```

The Worker callback returns to:

```text
https://walmart-gc.dotsthewarlock.com/?auth=connected
```

The frontend never stores access tokens, refresh tokens, session IDs, OAuth secrets, or Google API credentials. Do not use Google Identity Services browser token flow, direct browser Drive API calls, direct browser Sheets API calls, alternate OAuth origins, `/Walmart-GC/`, or session IDs in query parameters. Production OAuth testing is cloud-only. For local development, the OAuth callback `http://127.0.0.1:5174/auth/callback` is the intended local dev/OAuth alignment that must be verified before local OAuth testing, not an approved package/config change.

### Google Sheet

The user-owned Google Sheet is the online source of truth. The active spreadsheet is named:

```text
Walmart-GC Data
```

Tabs:

- `Cards`: the approved card data schema.
- `_META`: sheet metadata, including the optimistic `sheetVersion` value used for conflict detection.

Approved `Cards` schema (header-name based; preferred creation/CSV order only):

```text
cardNumber
pin
startingBalance
currentBalance
merchant
merchantInferred
dateAdded
dateUpdated
dateUsed
used
notes
```

Merchant model: `merchant` stores only the explicit user-entered/user-selected override and must not be inferred/defaulted to `walmart-ca` when blank; `merchantInferred` stores the app/Worker-derived merchant from `cardNumber` and is `walmart-ca` for valid Walmart Canada cards; runtime-only `effectiveMerchant = merchant || merchantInferred` must not be stored. Old Sheets missing only `merchantInferred` can be additively migrated by header name.

Barcode payload is derived only and must not be stored:

```text
79936686504000 + cardNumber
```

### Google Drive and Sheets APIs

The frontend loads, ensures, and saves Sheets data only through Worker endpoints. The Worker performs the server-side Drive and Sheets API calls using only `drive.file`, including `_META.sheetVersion` conflict checks.

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

## Design Principles

- Mobile first.
- Minimal dependencies.
- Static hosting.
- Spreadsheet as source of truth.
- Explicit conflict recovery.
- Durable Worker-managed OAuth sessions.
- Offline usability and CSV backup/recovery.
- Low maintenance.

## Historical Context

Current active architecture is Worker-managed OAuth/session and Worker-backed Drive/Sheets access. Apps Script is retired as the active sync path. Historical Apps Script and Phase 6 docs live under `docs/archive/` and should be consulted only when an exact live error string points there, a regression requires historical comparison, the user asks for history, or the task is specifically about migration/history.

Phase 9, Phase 10, Phase 10E, and Apps Script MVP documentation are historical only. Apps Script sync is retired from the active architecture and must not be recommended as the active sync path.
