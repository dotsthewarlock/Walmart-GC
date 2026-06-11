# Walmart-GC

Mobile-first Walmart gift card manager.

Walmart-GC is a static web application that helps users manage large numbers of Walmart gift cards with barcode access, PIN lookup, balance tracking, used-state tracking, CSV backup/recovery, and direct Google Sheets sync.

## Features

- View Walmart gift cards on desktop or mobile.
- Display Walmart Canada checkout barcodes for in-store checkout.
- Display PINs.
- Track remaining balances and used state.
- Synchronize completed actions with an automatically located or created `Walmart-GC Data` spreadsheet through Google OAuth, Drive file access, and the Google Sheets API.
- Continue using local browser data when offline or disconnected.
- Export/import CSV backups.

## Architecture

Source of truth:

```text
User-owned Google Sheet
```

Online sync path:

```text
Google Account ↔ Google OAuth drive.file ↔ Google Drive/Sheets APIs ↔ Walmart-GC Web App
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
- Google Drive API
- Google Sheets API
- Google Sheets

## Documentation

- [Deployment Guide](docs/DEPLOYMENT_GUIDE.md)
- [Google Sheet Setup](docs/GOOGLE_SHEET_SETUP.md)
- [Manual Test Plan](docs/MANUAL_TEST_PLAN.md)
- [Troubleshooting](docs/TROUBLESHOOTING.md)
- [Historical Apps Script Setup](docs/APPS_SCRIPT_SETUP.md)

## Current Status

Phase 10D — Worker-backed durable Google session and Worker-only Sheet sync.

The preserved `main` branch remains the known-good Apps Script MVP. The `phase-9-oauth` branch uses a Cloudflare Worker for OAuth, refresh tokens, the HttpOnly session cookie, and server-side Drive/Sheets API calls. The frontend never stores Google tokens or session IDs. Apps Script is retained only as historical MVP reference material.

## Sheet Sharing

Walmart-GC operates against a Google Sheet. It does not manage users, roles, or permissions; Google Sheets controls sharing and access. Shared Sheets are allowed when the relevant users have Google Sheet access.

The app is not designed for real-time collaboration workflows, live multi-client synchronization, presence indicators, activity history, or collaboration tooling. Sheet-level optimistic conflict detection prevents silent overwrites when the Sheet changes outside the current session.
