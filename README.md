# Walmart-GC

Mobile-first Walmart gift card manager.

Walmart-GC is a static web application that helps users manage large numbers of Walmart gift cards with barcode access, PIN lookup, balance tracking, used-state tracking, CSV backup/recovery, offline usability, and Worker-backed Google Sheets sync.

## Current Status

`main` is the active/base branch. `phase-11` is historical/archival/protected and must not be used as the active base.

OAuth/session durability and Google Sheets access/sync hardening are part of the current `main` architecture, not an active phase branch.

Core application functionality is considered satisfactory unless it directly blocks OAuth, session management, Google Sheets access, or sync. Phase 9, Phase 10, Phase 10E, `phase-11`, and the Apps Script MVP are historical context only.

## Features

- View Walmart gift cards on desktop or mobile.
- Display Walmart Canada checkout barcodes for in-store checkout.
- Display PINs.
- Track remaining balances and used state.
- Synchronize completed actions with an automatically located or created `Walmart-GC Data` spreadsheet through Google OAuth, Drive file access, and the Google Sheets API.
- Continue using local browser data when offline or disconnected.
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
- main: React 19 + Vite + Tailwind CSS (production-candidate, awaiting deployment approval)
- Live GitHub Pages: serves the legacy phase-12 branch root (no framework, no build system) as the archival production baseline
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

Production OAuth testing is cloud-only. Do not use localhost OAuth or alternate OAuth origins for production deployment testing. For local development under the React migration (which utilizes a Vite dev proxy to a local Worker), refer to the configuration details in the [AGY Migration Runbook](docs/AGY_MIGRATION_RUNBOOK.md).

## Documentation

Start with [Codex Active Context](docs/CODEX_ACTIVE_CONTEXT.md) for compact current context. Archived docs are historical references only and are not current setup guidance.

- [Architecture](docs/ARCHITECTURE.md)
- [Deployment Guide](docs/DEPLOYMENT_GUIDE.md)
- [Google Sheet Setup](docs/GOOGLE_SHEET_SETUP.md)
- [Manual Test Plan](docs/MANUAL_TEST_PLAN.md)
- [Troubleshooting](docs/TROUBLESHOOTING.md)
- [Roadmap](docs/ROADMAP.md)
- [AI Handoff](docs/AI_HANDOFF.md)
- [Documentation Archive](docs/archive/README.md)

## Sheet Sharing

Walmart-GC operates against a Google Sheet. It does not manage users, roles, or permissions; Google Sheets controls sharing and access. Shared Sheets are allowed when the relevant users have Google Sheet access.

The app is not designed for real-time collaboration workflows, live multi-client synchronization, presence indicators, activity history, or collaboration tooling. Sheet-level optimistic conflict detection prevents silent overwrites when the Sheet changes outside the current session.
