# Architecture

## Overview

Walmart-GC uses a lightweight static-web architecture that avoids dedicated servers and databases.

## Current Phase 9 Sync Architecture

```text
User Google Account
        ↕
Google OAuth
        ↕
Google Sheets API
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

The browser uses a user-provided Google OAuth Web Client ID to request Google Sheets access. Access tokens stay in memory and are not saved to local storage.

### Google Sheets API

Walmart-GC reads, initializes, and writes the configured Google Sheet directly through the Google Sheets API. Completed card actions sync after explicit saves, not on every keystroke.

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
