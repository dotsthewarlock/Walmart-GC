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

Google account connection now uses the Cloudflare Worker session backend. The frontend redirects to the Worker for OAuth, checks `/api/status` with credentials included, and no longer stores tokens or session IDs.

### Google Sheets API

The previous direct browser Google Sheets code remains in the frontend as legacy code, but durable Worker session auth is now the source of truth. A Worker Sheets proxy is still required before Sheet load/save/sync can use the durable session.

### Walmart-GC Web App

The static frontend provides:

- Card list.
- Card details.
- Barcode display.
- Balance, used-state, notes, and merchant edits.
- Direct Google Sheet setup and sync controls.
- CSV backup and recovery.
- Offline/local browser usability.

## Design Principles

- Mobile first.
- Minimal dependencies.
- Static hosting.
- Spreadsheet as source of truth.
- Explicit conflict recovery.
- Low maintenance.
