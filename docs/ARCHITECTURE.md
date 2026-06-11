# Architecture

## Overview

Walmart-GC uses a lightweight static frontend plus Cloudflare Worker architecture that avoids databases, VPS hosting, build tooling, and app-managed user accounts.

## Current Phase 10 Auth Architecture

```text
GitHub Pages custom-domain frontend
https://walmart-gc.dotsthewarlock.com/
        ↕
Cloudflare Worker custom-domain session/API
https://walmart-gc-oauth.dotsthewarlock.com
        ↕
Google Drive/Sheets APIs (`drive.file`)
        ↕
User-owned Walmart-GC Data spreadsheet

Local browser storage and CSV backup/recovery remain available when offline or disconnected.
```

## Components

### Google Sheet

The user-owned Google Sheet is the online source of truth. The active workbook contains:

- `Cards`: the approved card data schema.
- `_META`: sheet metadata, including the optimistic `sheetVersion` value used for conflict detection.

### Google OAuth

Google account connection uses the Cloudflare Worker session backend with a Google Cloud OAuth backend client. The frontend redirects to the Worker for OAuth, checks `/api/status` with credentials included, and never stores Google tokens or session IDs. The Worker owns OAuth, refresh tokens, and the host-only HttpOnly session cookie.

### Google Sheets API

The frontend loads, ensures, and saves Sheets data only through Worker endpoints. The Worker performs the server-side Drive and Sheets API calls using only `drive.file`, including `_META.sheetVersion` conflict checks.

### Walmart-GC Web App

The static frontend provides:

- Card list.
- Card details.
- Barcode display.
- Balance, used-state, notes, and merchant edits.
- Worker-backed Google Sheet sync controls.
- CSV backup and recovery.
- Offline/local browser usability.

## Design Principles

- Mobile first.
- Minimal dependencies.
- Static hosting.
- Spreadsheet as source of truth.
- Explicit conflict recovery.
- Low maintenance.
