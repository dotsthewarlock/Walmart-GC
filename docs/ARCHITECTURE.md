# Architecture

## Overview

Walmart-GC uses a lightweight static frontend plus Cloudflare Worker architecture that avoids databases, Firebase, Cloud Functions, Apps Script sync, Node backends, VPS hosting, build tooling, frameworks, and app-managed user accounts.

Phase 11 is the active development phase on `phase-11`; `main` is protected. Phase 11 is limited to fixing OAuth/session flow until fully functional and durable. Core product functionality should not be redesigned unless it directly blocks OAuth, session management, Google Sheets access, or sync.

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

### Walmart-GC Web App

The static frontend provides:

- Card list.
- Card details.
- Barcode display.
- Balance, used-state, notes, and merchant edits.
- Worker-backed Google Sheet sync controls.
- CSV backup and recovery.
- Offline/local browser usability.

The frontend is GitHub Pages-hosted plain HTML, CSS, and JavaScript. It has no framework and no build system.

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

The frontend never stores access tokens, refresh tokens, session IDs, OAuth secrets, or Google API credentials. Do not use Google Identity Services browser token flow, direct browser Drive API calls, direct browser Sheets API calls, localhost OAuth, alternate OAuth origins, `/Walmart-GC/`, or session IDs in query parameters.

### Google Sheet

The user-owned Google Sheet is the online source of truth. The active spreadsheet is named:

```text
Walmart-GC Data
```

Tabs:

- `Cards`: the approved card data schema.
- `_META`: sheet metadata, including the optimistic `sheetVersion` value used for conflict detection.

Approved `Cards` schema (header-name based; new Sheets use this preferred order):

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

Phase 9, Phase 10, Phase 10E, and Apps Script MVP documentation are historical only. Apps Script sync is retired from the active architecture and must not be recommended as the Phase 11 sync path.
