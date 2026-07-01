# GC Wallet (Walmart-GC)

Mobile-first, merchant-aware gift-card wallet (starting with Walmart optimization).

**GC Wallet** (under repository and deployment identifier `Walmart-GC`) is an offline-first static web application that helps users manage large numbers of gift cards with passive inline checkout barcodes, PIN lookup, balance tracking, used-state tracking, CSV backup/recovery, and Google Sheets sync via serverless Worker.

## Current Status

`main` is the active live deployment branch. Core application OAuth/session durability, Google Sheets access, and Material 3 design systems are fully functional.

## Features

- View gift cards on desktop or mobile widths with clean, touch-friendly Material 3 layouts.
- Display passive, inline checkout barcodes for in-store checkout (optimized for Walmart/Walmart Canada).
- Display PINs securely.
- Track remaining balances ("Available balance") and card counts ("Visible cards").
- Synchronize completed actions with an automatically located or created `Walmart-GC Data` spreadsheet through Google OAuth and the Google Sheets API.
- Offline-first: continue using local browser data when offline or disconnected.
- Export/import CSV backups.

## Architecture

Current active architecture:

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

```text
GitHub Pages static website at https://walmart-gc.dotsthewarlock.com/
- main: React 19 + Vite + Tailwind CSS production app
- Live GitHub Pages: serves the built React/Vite artifact; GitHub Pages API may still report legacy `phase-12 / /` metadata, so verify live HTML before changing Pages settings
```

Backend Worker:

```text
Cloudflare Worker on same-origin /auth/* and /api/* routes at https://walmart-gc.dotsthewarlock.com
Workers KV
Legacy Worker subdomain https://walmart-gc-oauth.dotsthewarlock.com may remain fallback/legacy only
```

Walmart-GC does not require a database, Firebase, Cloud Functions, Apps Script sync, Node backend, new hosting, VPS, or app-managed user account system. The React 19 / Vite frontend on `main` is compiled to static files for deployment. The Cloudflare Worker owns OAuth, refresh tokens, the HttpOnly session cookie, and server-side Drive/Sheets calls.


## Runtime Debugging Priority

Worker-backed OAuth and sync are the current `main` architecture. When debugging a live failure, however, evidence wins over architecture notes. Use this priority order:

1. Exact live error string / observed behavior
2. Current workspace/repo files
3. Active deployment/config
4. Repo docs / intended architecture
5. Prior assumptions

If an exact live error string exists only in `apps-script/Code.gs`, inspect and debug the Apps Script path first until the active runtime is disproven. Do not treat Apps Script as the active default architecture without that live evidence.

## OAuth and Session Contract

- Authentication is Worker-managed Google OAuth.
- The only OAuth scope is `https://www.googleapis.com/auth/drive.file`.
- The frontend never stores access tokens, refresh tokens, session IDs, or OAuth secrets.
- Frontend auth state comes from `GET /api/status`.
- Logout uses `POST /api/logout`.
- Worker API calls from the frontend use same-origin `/api/*` paths with `credentials: "include"`.
- Session cookies are HttpOnly, Secure, SameSite=Lax, host-only cookies.

## URLs and Testing

Production and development/testing use the same cloud URL:

```text
https://walmart-gc.dotsthewarlock.com
```

Active Worker routing:

```text
https://walmart-gc.dotsthewarlock.com/auth/*
https://walmart-gc.dotsthewarlock.com/api/*
```

Cloudflare must route `walmart-gc.dotsthewarlock.com/auth/*` and `walmart-gc.dotsthewarlock.com/api/*` to the Worker. The legacy Worker subdomain `https://walmart-gc-oauth.dotsthewarlock.com` may remain fallback/legacy only.

Production OAuth testing is cloud-only. Do not use localhost OAuth or alternate OAuth origins for production deployment testing. For local development under the React setup (which utilizes a Vite dev proxy to a local Worker), refer to the configuration details in the [Deployment Guide](docs/DEPLOYMENT_GUIDE.md) and historical [AGY Migration Runbook](docs/archive/AGY_MIGRATION_RUNBOOK.md).

## Documentation

Start with the [Active Context](docs/ACTIVE_CONTEXT.md) for the compact, first-read current context. Archived docs are historical references only and are not current setup guidance.

- [Active Context](docs/ACTIVE_CONTEXT.md) — Compact current-state summary (read this first).
- [Project Roadmap](docs/ROADMAP.md) — Canonical 4-lane roadmap (approved, near-term, future, and boundaries).
- [Material 3 Design Decisions](docs/M3_DESIGN_DECISIONS.md) — Durable repository documentation for locked design decisions and the strict Material 3 overhaul.
- [Architecture](docs/ARCHITECTURE.md) — Main system architecture and data models.
- [Deployment Guide](docs/DEPLOYMENT_GUIDE.md) — Frontend build and Worker deployment instructions.
- [Google Sheet Setup](docs/GOOGLE_SHEET_SETUP.md) — Dedicated sheet setup and schema rules.
- [QA Test Checklist](docs/QA_TEST_CHECKLIST.md) — Combined manual QA and troubleshooting guide.
- [Maintenance Log](docs/MAINTENANCE_LOG.md) — Open tracking for non-blocking cleanup.
- [Documentation Archive](docs/archive/README.md) — Retained historical references.

## Sheet Sharing

Walmart-GC operates against a Google Sheet. It does not manage users, roles, or permissions; Google Sheets controls sharing and access. Shared Sheets are allowed when the relevant users have Google Sheet access.

The app is not designed for real-time collaboration workflows, live multi-client synchronization, presence indicators, activity history, or collaboration tooling. Sheet-level optimistic conflict detection prevents silent overwrites when the Sheet changes outside the current session.
