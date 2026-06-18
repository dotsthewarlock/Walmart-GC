# Codex Active Context — Phase 11

Read this first for current Walmart-GC tasks. It is the compact Phase 11 source-of-truth for future Codex work. Preferred source-of-truth chain: `docs/CODEX_ACTIVE_CONTEXT.md` -> `AGENTS.md` -> `docs/ARCHITECTURE.md` -> task-specific docs -> `docs/archive/` only when history or regression evidence requires it.

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


## Worker Route Operations

Active Worker name: `walmart-gc-oauth`. Cloudflare must route only these custom-domain paths to the Worker:

```text
walmart-gc.dotsthewarlock.com/api/*
walmart-gc.dotsthewarlock.com/auth/*
```

Do not route `walmart-gc.dotsthewarlock.com/*` to the Worker because GitHub Pages serves the static frontend at the root. Required Worker KV bindings are `SESSIONS` and `OAUTH_STATE`; required secrets are `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `SESSION_SECRET`.

Smoke test the live same-origin status route:

```sh
curl -sS https://walmart-gc.dotsthewarlock.com/api/status
```

Expected diagnostics include `workerVersion` and `schemaMode: "header-name"`. If the frontend version is current but Worker version/schema mode are unavailable, check Worker routes before changing app code.

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
startingBalance
currentBalance
merchant
merchantInferred
dateAdded
dateUpdated
dateUsed
used
notes
```

Merchant model: `merchant` is the explicit user-entered/user-selected override only; `merchantInferred` is app/Worker-derived from `cardNumber`; `effectiveMerchant` is runtime-only (`merchant || merchantInferred`) and must not be stored. Existing old-schema Sheets missing only `merchantInferred` are safe additive migration candidates.

Barcode payload is derived only and must not be stored: `79936686504000 + cardNumber`. Conflict handling uses `_META.sheetVersion`: no silent overwrite, no automatic merge, user chooses recovery, CSV backup before destructive recovery.

## Hard Guardrails

Do not change schema, OAuth scope, auth/session architecture, backend architecture, deployment system, sync behavior, CSV import/export/recovery behavior, or app-shell debug versions unless the task explicitly requires it and the risk is discussed. Preserve offline/local usability and CSV backup/recovery. Do not introduce databases, Firebase, Cloud Functions, Apps Script sync, Node backends, frameworks, build steps, or new hosting.

## Naming Conventions

- Runtime files stay simple lowercase, for example `app.js`, `index.html`, and `styles.css`; Worker entrypoint is `worker/src/index.js`.
- Docs use conventional uppercase names, for example `README.md`, `AGENTS.md`, and `CODEX_ACTIVE_CONTEXT.md`; archive folders use lowercase kebab-case, for example `docs/archive/apps-script-retired/`.
- Branches use lowercase kebab-case, for example `phase-11-fix-sync-status`; PR/task names use imperative verb phrases, for example “Clarify Apps Script diagnostic docs”.
- JavaScript functions/variables use `camelCase`; JavaScript constants use `SCREAMING_SNAKE_CASE`.
- Preserve approved schema field names as existing `camelCase`; do not rename schema fields for style.

## Docs Update Authority

When project architecture or context changes, update `docs/CODEX_ACTIVE_CONTEXT.md` first. Update `README.md`, `docs/ARCHITECTURE.md`, `docs/AI_HANDOFF.md`, and `.github/copilot-instructions.md` only when user-facing, expanded, or tool-specific details also need to change. Avoid duplicating long architecture blocks across active docs. Keep historical material in `docs/archive/`, and keep active docs compact and current.

## Future Auth Hardening Note

Future auth hardening may consider a `__Host-`-prefixed session cookie. Do not implement that in this PR; treat it as an auth/session behavior change requiring a separate focused task and live OAuth/session testing.

## Deferred Asset/PWA Work

P5 — Install Icon & PWA Asset Readiness is deferred. A prior icon-assets PR attempted to add PNG/ICO files and failed because binary files are not supported in the current Codex PR workflow. Do not ask Codex to generate, stage, or commit binary assets such as `.png`, `.ico`, `.jpg`, `.jpeg`, `.webp`, or files under `assets/icons/` until binary handling is confirmed safe. If raster install icons are needed later, use a local Git workflow, GitHub upload, or another binary-capable workflow, then review text references separately. P5 scope is limited to raster install icons, `favicon.ico`, `apple-touch-icon.png`, `assets/icons/*.png`, manifest icon references, and `index.html` head links; it must not include service workers, offline caching, routing, OAuth/session, sync, schema, CSV, Worker, or deployment changes.

## Task Routing Table

| Task type | Inspect first | Avoid |
| --- | --- | --- |
| Frontend UI/copy/CSS | `index.html`, `styles.css`, `app.js` only as needed | Backend files unless UI hooks prove relevant |
| Worker OAuth/session | `worker/src/index.js`, `worker/README.md`, `app.js` auth/status calls, `docs/ARCHITECTURE.md` | Changing scope/session model without discussion |
| Sheets/schema/header | Search exact error string first, then active sync path; inspect `apps-script/Code.gs` only if exact deployed behavior or error strings point there | Treating Apps Script docs as active setup |
| Docs/copy | Target docs and referenced docs only | Runtime files unless necessary to verify names |
| Deployment/config | Current deployment/config files first, then `worker/README.md` and `docs/DEPLOYMENT_GUIDE.md` | Assuming Wrangler, Apps Script, or GitHub Pages path without evidence |

## Token Discipline for Codex

ChatGPT Project Settings own ChatGPT conversation behavior; repo docs own Codex/repo-agent behavior. Workflow shorthand: `discuss` means planning/recommendation only with no implementation prompt unless asked; `codex` means token-efficient implementation prompt; `review` means merge-safety review; `verify` means current repo/live/source evidence first.

Read only files listed by the task unless evidence points elsewhere. Prefer exact-string search over broad scans. Do not paste full files into responses unless requested. Summarize findings briefly. Avoid `docs/archive/` unless the task requires history. For low-risk UI/copy/CSS changes, do not inspect backend files. For high-risk auth/sync/schema tasks, inspect the relevant runtime path before proposing changes. Report changed files, validation, and risk notes.

## Version-Bump Convention

- Frontend runtime changes: bump all app-shell cache/debug fingerprints together in `index.html`, `app.js`, and `styles.css`, including CSS/JS query strings.
- Worker runtime changes: bump `WORKER_VERSION` in `worker/src/index.js`.
- Frontend plus Worker changes: bump both the frontend app-shell fingerprints and `WORKER_VERSION`.
- Docs-only changes: bump neither.
- App-shell fingerprints are lightweight cache/debug aids, not product release numbers.

## Standard Validation Commands

- `git diff --check`
- Conflict-marker scan, for example with `git diff --check` plus targeted search when needed
- `find docs -maxdepth 4 -type f | sort`
- `node --check app.js` when frontend JavaScript changes
- `node --check worker/src/index.js` when Worker JavaScript changes

## Archive Policy

Historical docs live under `docs/archive/` and are retained for reference, not normal Phase 11 context. Do not read archived docs for normal tasks. Consult them only for exact old error strings, historical regressions, explicit user requests, or migration/history tasks.
