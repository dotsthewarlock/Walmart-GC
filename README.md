# Walmart-GC

Mobile-first Walmart gift card manager.

Walmart-GC is a static web application that helps users manage large numbers of Walmart gift cards with barcode access, PIN lookup, balance tracking, used-state tracking, CSV backup/recovery, offline usability, and Worker-backed Google Sheets sync.

## Current Status

Phase 11 is the active development phase on the `phase-11` branch. The protected branch is `main`.

Phase 11 focus:

```text
Fix OAuth/session flow until fully functional and durable.
```

Core application functionality is considered satisfactory unless it directly blocks OAuth, session management, Google Sheets access, or sync. Phase 9, Phase 10, Phase 10E, and the Apps Script MVP are historical context only.

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
HTML + CSS + JavaScript
No framework
No build system
```

Backend Worker:

```text
Cloudflare Worker on same-origin /auth/* and /api/* routes at https://walmart-gc.dotsthewarlock.com
Workers KV
Legacy Worker subdomain https://walmart-gc-oauth.dotsthewarlock.com may remain fallback/legacy only
```

Walmart-GC does not require a database, Firebase, Cloud Functions, Apps Script sync, Node backend, framework, build step, new hosting, VPS, or app-managed user account system. The Cloudflare Worker owns OAuth, refresh tokens, the HttpOnly session cookie, and server-side Drive/Sheets calls.


## Runtime Debugging Priority

Worker-backed OAuth and sync are the intended Phase 11 architecture. When debugging a live failure, however, evidence wins over architecture notes. Use this priority order:

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

OAuth testing is cloud-only. Do not document or use localhost OAuth, alternate OAuth origins, `/Walmart-GC/` callback paths, or session IDs in query parameters.

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Deployment Guide](docs/DEPLOYMENT_GUIDE.md)
- [Google Sheet Setup](docs/GOOGLE_SHEET_SETUP.md)
- [Manual Test Plan](docs/MANUAL_TEST_PLAN.md)
- [Troubleshooting](docs/TROUBLESHOOTING.md)
- [Roadmap](docs/ROADMAP.md)
- [AI Handoff](docs/AI_HANDOFF.md)
- [Historical Apps Script Setup](docs/APPS_SCRIPT_SETUP.md)

## Sheet Sharing

Walmart-GC operates against a Google Sheet. It does not manage users, roles, or permissions; Google Sheets controls sharing and access. Shared Sheets are allowed when the relevant users have Google Sheet access.

The app is not designed for real-time collaboration workflows, live multi-client synchronization, presence indicators, activity history, or collaboration tooling. Sheet-level optimistic conflict detection prevents silent overwrites when the Sheet changes outside the current session.
