# Architecture

## Overview

Walmart-GC uses a lightweight static-web architecture that avoids dedicated servers and databases.

## Current Phase 10 Auth Architecture

```text
User Google Account
        ↕
Cloudflare Worker OAuth session
        ↕
Walmart-GC Web App
        ↕
Local browser storage / CSV backup
```

## Components

### Google Sheet

The user-owned Google Sheet is the online source of truth. The active workbook contains:

- `Cards`: the approved card data schema.
- `_META`: sheet metadata, including the optimistic `sheetVersion` value used for conflict detection.

### Google OAuth

Google account connection uses the Cloudflare Worker session backend. The frontend redirects to the Worker for OAuth, checks `/api/status` with credentials included, and never stores Google tokens or session IDs. The Worker owns OAuth, refresh tokens, and the HttpOnly session cookie.

### Google Sheets API

The frontend loads, ensures, and saves Sheets data only through Worker endpoints. The Worker performs the server-side Drive and Sheets API calls, including `_META.sheetVersion` conflict checks.

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
