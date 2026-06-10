# Walmart-GC

Mobile-first Walmart gift card manager.

Walmart-GC is a static web application that helps users manage large numbers of Walmart gift cards with barcode access, PIN lookup, balance tracking, used-state tracking, CSV backup/recovery, and direct Google Sheets sync.

## Features

- View Walmart gift cards on desktop or mobile.
- Display Walmart Canada checkout barcodes for in-store checkout.
- Display PINs.
- Track remaining balances and used state.
- Synchronize completed actions with a Google Sheet through Google OAuth and the Google Sheets API.
- Continue using local browser data when offline or disconnected.
- Export/import CSV backups.

## Architecture

Source of truth:

```text
User-owned Google Sheet
```

Online sync path:

```text
Google Account ↔ Google OAuth ↔ Google Sheets API ↔ Walmart-GC Web App
```

Frontend:

```text
GitHub Pages static website
```

Walmart-GC does not require a dedicated server, database, build step, framework, or app-managed user account system.

## Technology

- HTML
- CSS
- JavaScript
- GitHub Pages
- Google OAuth
- Google Sheets API
- Google Sheets

## Documentation

- [Deployment Guide](docs/DEPLOYMENT_GUIDE.md)
- [Google Sheet Setup](docs/GOOGLE_SHEET_SETUP.md)
- [Manual Test Plan](docs/MANUAL_TEST_PLAN.md)
- [Troubleshooting](docs/TROUBLESHOOTING.md)
- [Historical Apps Script Setup](docs/APPS_SCRIPT_SETUP.md)

## Current Status

Phase 9C — Apps Script removal and direct Google Sheets cleanup.

The preserved `main` branch remains the known-good Apps Script MVP. The `phase-9-oauth` branch uses Google OAuth plus the direct Google Sheets API as the only online sync path. Apps Script is retained only as historical MVP reference material.

## Sheet Sharing

Walmart-GC operates against a Google Sheet. It does not manage users, roles, or permissions; Google Sheets controls sharing and access. Shared Sheets are allowed when the relevant users have Google Sheet access.

The app is not designed for real-time collaboration workflows, live multi-client synchronization, presence indicators, activity history, or collaboration tooling. Sheet-level optimistic conflict detection prevents silent overwrites when the Sheet changes outside the current session.
