# Codex Active Context — Phase 11

Read this first for current Walmart-GC tasks. It is the compact Phase 11 source-of-truth for future Codex work; use `AGENTS.md` for mandatory agent rules and `docs/ARCHITECTURE.md` for deeper current architecture.

## Current Basics

- Repo: `dotsthewarlock/Walmart-GC`
- Active branch: `phase-11`; protected branch: `main`
- Live app and development/testing URL: `https://walmart-gc.dotsthewarlock.com`
- Phase 11 goal: fix OAuth/session durability and Google Sheets access/sync hardening.
- Plain HTML/CSS/JavaScript frontend, no framework, no build system.
- Do not redesign core product behavior unless it directly blocks OAuth, session, Google Sheets access, or sync.

## Active Architecture

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

Cloudflare routes same-origin `https://walmart-gc.dotsthewarlock.com/auth/*` and `/api/*` to the Worker while GitHub Pages serves static files at the root. The legacy Worker subdomain may exist only as fallback/legacy.

## Runtime Confirmation Rule

Exact live error strings and observed behavior outrank assumptions. Current repo files and active deployment/config outrank older docs. Do not assume Worker, Apps Script, Wrangler, or GitHub Pages deployment details without confirming the active runtime/config path relevant to the task.

## Auth and Sync Source of Truth

- Worker-managed Google OAuth only.
- OAuth scope: `https://www.googleapis.com/auth/drive.file` only.
- Session: HttpOnly, Secure, SameSite=Lax, host-only cookie.
- Frontend auth state: `GET /api/status`.
- Logout: `POST /api/logout`.
- Frontend Worker calls: same-origin `/api/*` with `credentials: "include"`.
- Worker owns refresh tokens, session state, Drive/Sheets API calls, sheet discovery/creation/initialization, metadata, and conflict checks.
- Completed-action sync only: balance save, used-state change, notes save, merchant change, new card save, accepted CSV import. Do not sync every keystroke.

## Google Sheet Model

Spreadsheet: `Walmart-GC Data`. Tabs: `Cards`, `_META`.

Approved `Cards` schema is header-name based and must not change without explicit discussion:

```text
cardNumber
pin
merchant
startingBalance
currentBalance
dateAdded
dateUpdated
dateUsed
used
notes
```

Barcode payload is derived only and must not be stored: `79936686504000 + cardNumber`. Conflict handling uses `_META.sheetVersion`: no silent overwrite, no automatic merge, user chooses recovery, CSV backup before destructive recovery.

## Hard Guardrails

Do not change schema, OAuth scope, auth/session architecture, backend architecture, deployment system, sync behavior, CSV import/export/recovery behavior, or app-shell debug versions unless the task explicitly requires it and the risk is discussed. Preserve offline/local usability and CSV backup/recovery. Do not introduce databases, Firebase, Cloud Functions, Apps Script sync, Node backends, frameworks, build steps, or new hosting.

## Task Routing Table

| Task type | Inspect first | Avoid |
| --- | --- | --- |
| Frontend UI/copy/CSS | `index.html`, `styles.css`, `app.js` only as needed | Backend files unless UI hooks prove relevant |
| Worker OAuth/session | `worker/src/index.js`, `worker/README.md`, `app.js` auth/status calls, `docs/ARCHITECTURE.md` | Changing scope/session model without discussion |
| Sheets/schema/header | Search exact error string first, then active sync path; inspect `apps-script/Code.gs` only if exact deployed behavior or error strings point there | Treating Apps Script docs as active setup |
| Docs/copy | Target docs and referenced docs only | Runtime files unless necessary to verify names |
| Deployment/config | Current deployment/config files first, then `worker/README.md` and `docs/DEPLOYMENT_GUIDE.md` | Assuming Wrangler, Apps Script, or GitHub Pages path without evidence |

## Token Discipline for Codex

Read only files listed by the task unless evidence points elsewhere. Prefer exact-string search over broad scans. Do not paste full files into responses unless requested. Summarize findings briefly. Avoid `docs/archive/` unless the task requires history. For low-risk UI/copy/CSS changes, do not inspect backend files. For high-risk auth/sync/schema tasks, inspect the relevant runtime path before proposing changes.

## Standard Validation Commands

- `git diff --check`
- Conflict-marker scan, for example with `git diff --check` plus targeted search when needed
- `find docs -maxdepth 4 -type f | sort`
- `node --check app.js` when frontend JavaScript changes
- `node --check worker/src/index.js` when Worker JavaScript changes

## Archive Policy

Historical docs live under `docs/archive/` and are retained for reference, not normal Phase 11 context. Do not read archived docs for normal tasks. Consult them only for exact old error strings, historical regressions, explicit user requests, or migration/history tasks.
