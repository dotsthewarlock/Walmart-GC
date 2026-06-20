# Walmart-GC Agent Instructions

## Current Source of Truth / Fast Path

Start with `docs/CODEX_ACTIVE_CONTEXT.md` for compact current Phase 11 context. Use this `AGENTS.md` for mandatory agent rules and hard guardrails, and `docs/ARCHITECTURE.md` for current architecture details. Use `docs/archive/` only for historical/regression tasks; do not read large historical docs for normal work.

Fast rules:

* Exact error string / live behavior outranks assumptions.
* Current repo files and active deployment/config outrank older docs.
* Do not assume Worker, Apps Script, Wrangler, or GitHub Pages deployment path without confirming active runtime.
* Do not change schema, OAuth scope, auth/session architecture, backend architecture, deployment system, sync behavior, or CSV backup/recovery without discussion.
* Preserve offline/local usability and CSV backup/recovery.
* For small UI/docs tasks, inspect only targeted files.
* Read only task-relevant files; prefer exact-string search over broad scans; avoid `docs/archive/` unless history is required.
* UI/UX recommendations should consider Material 3 guidance; identify likely conflicts and note tradeoffs for intentional deviations.

---

## Repository

Repository: `dotsthewarlock/Walmart-GC`

---

## Product Overview

Walmart-GC is a mobile-first web application for managing large numbers of Walmart gift cards.

Primary use case:

* Store and organize 30–100+ Walmart gift cards
* Display barcodes for fast in-store checkout
* Track balances and usage state
* Synchronize records between desktop and mobile devices
* Use Google Sheets as the source of truth

This is a gift card management system, not merely a barcode generator.

---

## Current Phase 11 Context

Phase 11 is the only active development phase.

Active branch:

```text
phase-11
```

Protected branch:

```text
main
```

Current goal:

```text
Fix OAuth/session flow until fully functional and durable.
```

Core application functionality is considered satisfactory unless it directly blocks OAuth, session management, Google Sheets access, or sync. Do not redesign the product during Phase 11.

Historical references to Phase 9, `phase-9-oauth`, Phase 10, Phase 10E, and the Apps Script MVP are historical only.

---

## Current Architecture

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

* GitHub Pages
* HTML
* CSS
* JavaScript
* No framework
* No build system
* Production and development/testing URL: `https://walmart-gc.dotsthewarlock.com`

Backend:

* Cloudflare Worker same-origin routes: `https://walmart-gc.dotsthewarlock.com/auth/*` and `https://walmart-gc.dotsthewarlock.com/api/*`
* Legacy Worker subdomain `https://walmart-gc-oauth.dotsthewarlock.com` may remain fallback/legacy only
* Workers KV

Do not introduce or recommend:

* Database
* Firebase
* Cloud Functions
* Apps Script sync
* Node backend
* Framework
* Build step
* New hosting

---

## OAuth Architecture

Authentication is Worker-managed Google OAuth.

Frontend must never store:

* Access tokens
* Refresh tokens
* Session IDs
* OAuth secrets
* Google API credentials

Session model:

* HttpOnly cookie
* Secure
* SameSite=Lax
* Host-only

Frontend auth state comes from:

```text
/api/status
```

Logout endpoint:

```text
/api/logout
```

OAuth scope:

```text
https://www.googleapis.com/auth/drive.file
```

Do not broaden scope.

Worker API calls must use same-origin `/api/*` paths with:

```js
credentials: "include"
```

---

## OAuth Deployment Rules

Use only:

```text
https://walmart-gc.dotsthewarlock.com
```

for production and development testing.

No localhost OAuth. No alternate development origin.

Google Cloud settings:

```text
Authorized JavaScript origin:
https://walmart-gc.dotsthewarlock.com

Authorized redirect URI:
https://walmart-gc.dotsthewarlock.com/auth/callback
```

Cloudflare must route these paths to the Worker while GitHub Pages serves static files at the root:

```text
walmart-gc.dotsthewarlock.com/auth/*
walmart-gc.dotsthewarlock.com/api/*
```

Worker callback must return to:

```text
https://walmart-gc.dotsthewarlock.com/?auth=connected
```

Never document or recommend:

* `/Walmart-GC/`
* `session_id` query parameters
* localhost OAuth
* alternate OAuth origins

---

## Google Sheet Model

Spreadsheet:

```text
Walmart-GC Data
```

Tabs:

```text
Cards
_META
```

Approved schema and preferred order:

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

Do not change schema.

Merchant model:

* `merchant` is explicit user-entered/user-selected override only.
* `merchantInferred` is system-derived from `cardNumber`; for valid Walmart Canada cards, it is `walmart-ca`.
* `effectiveMerchant = merchant || merchantInferred` is runtime-only.
* Do not store `effectiveMerchant`.
* Do not infer or default blank `merchant` values to `walmart-ca`.

Worker owns sheet discovery, creation, initialization, metadata, and Google API access.

Barcode payload is derived only and must not be stored:

```text
79936686504000 + cardNumber
```

---

## Sync Model to Preserve

Worker-backed sync only.

Completed-action sync only:

* Balance save
* Used state change
* Notes save
* Merchant change
* New card save
* Accepted CSV import

Do not sync every keystroke.

Conflict model:

```text
Sheet-level optimistic concurrency via _META.sheetVersion
```

Rules:

* No silent overwrite
* No automatic merge
* User chooses recovery
* CSV backup before destructive recovery

---

## Phase 11 Success Criteria

OAuth is fixed when:

* Connect Google starts OAuth
* Consent requests only `drive.file`
* Callback succeeds
* Worker sets session cookie
* `/api/status` reports connected
* Refresh preserves login
* Browser restart preserves login while session is valid
* Logout clears session
* Reconnect works
* Ensure Sheet works
* Load from Google Sheets works
* Save/sync works
* Offline behavior remains usable
* CSV backup/recovery remains available

---

## Documentation Authority

Before recommending architecture, schema, sync, onboarding, or implementation changes, review only the current files needed for the task:

1. `docs/CODEX_ACTIVE_CONTEXT.md` for compact current context
2. `AGENTS.md` for mandatory guardrails
3. `docs/ARCHITECTURE.md` for current architecture details
4. `docs/AI_HANDOFF.md` or `docs/ROADMAP.md` only when the task needs handoff/roadmap context

Historical Apps Script and Phase 6 docs live under `docs/archive/` and are not current source of truth. Read archived docs only for exact old error strings, regression comparison, explicit historical requests, or migration/history tasks.

---

## Roles

ChatGPT is the product architect.

ChatGPT creates:

* Product logic
* Specifications
* Architecture guidance
* Data model guidance
* Dev AI / Codex briefs
* Acceptance criteria
* Review feedback

Codex is the coding agent.

Codex writes code, edits repository files, runs checks, reviews diffs, and prepares GitHub changes.

---

## MVP Scope

Required:

* Gift card list view
* Gift card detail view
* Barcode rendering
* PIN display
* Remaining balance tracking
* Used flag tracking
* Google Sheet synchronization
* Mobile-friendly interface
* Desktop-friendly interface
* Offline usability
* CSV backup/recovery

---

## Non-Goals

Do not prioritize:

* User accounts managed by Walmart-GC
* Real-time collaboration workflows
* Live multi-client synchronization
* Presence indicators
* Activity history
* Collaboration tooling beyond Google Sheet sharing
* Shared databases
* Subscription systems
* Complex analytics
* Receipt scanning
* Camera barcode scanning
* Automated balance checks
* Native mobile apps

Shared Google Sheets are allowed when Google Sheets grants access. Walmart-GC operates against a Google Sheet but does not manage users, roles, or permissions; Google Sheets remains responsible for sharing and access control.

---

## Development Rules

* Keep changes small and PR-focused.
* Inspect current repository files before suggesting implementation changes.
* Explain current architecture before recommending modifications.
* Prefer the smallest safe change that achieves the goal.
* Flag security, deployment, OAuth, session, schema, migration, sync, or user-data risks before implementation.
* Prioritize maintainability and simplicity.
* Prioritize mobile usability.
* Review all generated changes before merge or before enabling GitHub auto-merge.
* Do not change app behavior, Worker behavior, schema, OAuth scope, or sync behavior unless explicitly requested.

---

## Minor vs Major Change Framework

### Minor Changes

Minor changes may proceed without additional approval.

Examples:

* Documentation updates
* CSS/UI polish
* Layout improvements
* Small bug fixes
* Small UX enhancements
* Refactoring without behavior changes

### Major Changes

Major changes require discussion and confirmation first.

Examples:

* Data model changes
* Google Sheet schema changes
* Worker API changes
* Sync behavior changes
* Authentication/security changes
* Connection architecture changes
* Conflict handling changes
* Large UI restructuring
* New major features
* Framework/build tool introduction
* Hosting changes
* Anything affecting user data

When uncertain, treat as Major.

---

## Review Outcome Taxonomy

For review-mode responses, use one of these outcomes:

* `merge` — safe to merge as-is.
* `fix first` — potentially mergeable after specific blocking fixes.
* `reject` — not safe or not aligned with project direction.

Before recommending `merge`, flag schema, OAuth/session, sync, deployment, and user-data safety risks.

---

## GitHub Update Discipline

Codex should minimize GitHub update interactions.

Before any task requiring PR creation or auto-merge, follow the PR capability preflight rule in `docs/CODEX_ACTIVE_CONTEXT.md`: verify intended `phase-11` base, intended `codex/*` head, and GitHub auth / PR creation availability before editing files; for local/CLI workflows verify `origin`, but do not treat missing local `origin` as a universal Codex Cloud blocker. In Codex Cloud, distinguish workspace commits/PR metadata from confirmed GitHub PRs; confirm a PR URL/number before saying a PR exists or before auto-merge, then report the confirmed PR state and actual head branch. Otherwise stop with `blocked: PR creation unavailable` unless local-only or PR-ready output is explicitly approved.

Before committing, pushing, or opening a PR:

1. Inspect current repository state.
2. Understand the full requested change.
3. Plan the complete implementation.
4. Make all related code changes locally.
5. Run available verification.
6. Review the complete diff.
7. Push one coherent change set.
8. Open one PR.

Avoid repeated small pushes unless fixing review feedback or failed verification.

---

## Auto-Merge Discipline

Repository settings allow GitHub squash auto-merge into `phase-11` when the required `static-checks` GitHub Actions check passes and branch rules are satisfied.

Codex may enable GitHub squash auto-merge only when all of the following are true:

* The task explicitly authorizes auto-merge, or the task is clearly low-risk under the Minor Changes framework.
* The PR targets `phase-11`.
* The PR uses squash merge.
* Confidence is >=80%.
* Required GitHub Actions checks pass.
* The branch is up to date with `phase-11`.
* No merge conflicts exist.
* All PR conversations are resolved.
* The final diff has been reviewed once by Codex.
* Changed files match the requested scope.
* No restricted-risk area is touched.

Restricted-risk areas must not be auto-merged unless the user explicitly approves auto-merge for that specific task. Restricted-risk areas include:

* Schema changes
* OAuth/session behavior
* Worker auth/cookies
* Sync/conflict handling
* Google Sheet migration/recovery
* CSV import/export/recovery
* Deployment/routes/hosting
* Cloudflare Worker replacement
* Framework/build-system changes
* Broad UI redesign
* Destructive cleanup
* Anything that could cause user-data loss

When auto-merge is allowed, Codex should enable GitHub squash auto-merge rather than direct-merging. Do not repeatedly poll checks. If checks are still pending, enable auto-merge if GitHub allows it, or report that checks are pending.

When auto-merge is blocked, Codex should leave the PR open and briefly report the blocker.

---

## App-Shell Debug Version Convention

- Frontend runtime changes bump all app-shell cache/debug fingerprints together in `index.html`, `app.js`, and `styles.css`, including CSS/JS query strings.
- Worker runtime changes bump `WORKER_VERSION` in `worker/src/index.js`.
- Frontend plus Worker changes bump both the frontend app-shell fingerprints and `WORKER_VERSION`.
- Docs-only changes bump neither.
- App-shell fingerprints are lightweight cache/debug aids for confirming which static files GitHub Pages and the browser loaded; they are not product release numbers.

---

## Verification Rules

Do NOT install:

* Playwright
* Browser screenshot tooling
* npm packages
* Frameworks
* Build tools
* External dependencies

unless explicitly approved.

Preferred verification methods:

* Stale-reference search and review for docs-only changes
* `node --check` when code is touched
* `git diff --check`
* Conflict-marker scan
* HTML parse validation when HTML is touched
* Static DOM/hook checks when UI hooks are touched
* Local HTTP server + curl smoke test when useful
* Manual verification notes

Browser verification is optional.

---

## Preferred Design Principles

* Mobile-first
* Fast loading
* Minimal dependencies
* Clear balance visibility
* Efficient in-store barcode access
* Simple synchronization workflow
* Spreadsheet-friendly data model
* Low operational cost
* Easy self-hosting via GitHub Pages
* Durable Worker-managed OAuth session
* Offline usability and CSV backup/recovery

---

## Current Roadmap Status

Completed/historical:

* Phase 1 – Static app foundation
* Phase 2 – Checkout workflow improvements
* Phase 3 – Used flag model and settings
* Phase 4 – Mobile navigation workflow
* Phase 5B – Data panel and checkout refinements
* Phase 6 – Google Sheet schema and Apps Script API design for historical MVP
* Phase 7 – Apps Script sync implementation for historical MVP
* Phase 8 – MVP cleanup and hardening
* Phase 9 / `phase-9-oauth` – OAuth transition work
* Phase 10 / Phase 10E – Worker-backed OAuth/sync hardening before Phase 11
* Apps Script MVP – historical reference only

Current:

* Phase 11 – OAuth/session durability and Google Sheets access/sync hardening

Upcoming:

* Post-MVP enhancements only after Phase 11 OAuth/session flow is fully functional and durable
