# Walmart-GC Agent Instructions

## Current Source of Truth / Fast Path

### Chromebook / Agy Stability Rule

For any Agy/model-assisted task or broad repo cleanup, split work into two phases:

- Phase A may use Agy/model execution and may edit files, but it must stop after compact verification and writing handoff to `~/Project/AI_HANDOFF.md` (syncing to GitHub Issue #200 via `~/Project/bin/agy-handoff`); it must not commit or push.
- Phase B must be finish-only: no Agy/model execution, no broad edits, verify branch, changed-file allowlist, protected files, and `git diff --check`, then commit/push only if checks pass.

Never combine Agy/model execution with `git commit` or `git push` in the same batch. Keep visible Terminal output compact; write raw logs local to `~/Project/*.log`. GPT terminal instructions for Agy tasks should normally be provided as a single copy/paste executable block (writing prompt, running Agy, capturing logs, and running verification) that relies on Issue #200 sync, rather than separate blocks prompting the user to paste output back. Paste-back is a fallback if sync fails or local details are needed.


Start with `docs/ACTIVE_CONTEXT.md` for compact current context. Use this `AGENTS.md` for mandatory agent rules and hard guardrails, and `docs/ARCHITECTURE.md` for current architecture details. Use `docs/archive/` only for historical/regression tasks; do not read large historical docs for normal work.

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

## Current Branch and Hardening Context

`main` is the active/base branch. `phase-11` is historical/archival/protected and must not be used as the active base. OAuth/session durability and Google Sheets access/sync hardening are part of the current `main` architecture, not an active phase branch.

Active/base branch:

```text
main
```

Current hardening focus:

```text
Maintain durable OAuth/session flow and Google Sheets access/sync on main.
```

Core application functionality is considered satisfactory unless it directly blocks OAuth, session management, Google Sheets access, or sync. Do not redesign the product during this hardening work.

Historical references to Phase 9, `phase-9-oauth`, Phase 10, Phase 10E, `phase-11`, and the Apps Script MVP are historical only.

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

* GitHub Pages serves legacy `phase-12` / root with legacy build_type as the active public deploy.
* React 19 + Vite + Tailwind (`main` is the production-candidate target; tomorrow's planned work is the deployment switch to React/Vite. Do not claim React/Vite is live until verified after the switch).
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

## OAuth/Session/Sync Success Criteria

OAuth/session/sync hardening is successful when:

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

1. `docs/ACTIVE_CONTEXT.md` for compact current context
2. `AGENTS.md` for mandatory guardrails
3. `docs/ARCHITECTURE.md` for current architecture details
4. `docs/archive/AI_HANDOFF.md` or `docs/archive/ROADMAP.md` only when the task needs handoff/roadmap context

Historical Apps Script, Phase 6, AI handoff, and roadmap docs live under `docs/archive/` and are not current source of truth. Read archived docs only for exact old error strings, regression comparison, explicit historical requests, or migration/history tasks.

---

## Roles

ChatGPT is the product architect.

ChatGPT creates:

* Product logic
* Specifications
* Architecture guidance
* Data model guidance
* Dev AI / Agy briefs
* Acceptance criteria
* Review feedback

Antigravity (Agy) is the developer agent. The Agy-first guarded Terminal/Agy Low/Medium workflow replaces the retired Codex automation.

Agy writes code, edits repository files, runs checks, reviews diffs, and prepares GitHub changes.

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

## GitHub and PR Workflow (Phase A/B Split)

All Agy operations follow the Chromebook / Agy Stability Rule (Phase A / Phase B split):
- **Phase A (Agy/Model Execution)**: Agy edits files and performs local verification. Agy must NOT commit, push, or create/merge PRs. It writes its handoff to `~/Project/AI_HANDOFF.md` and runs `~/Project/bin/agy-handoff`.
- **Phase B (Human/Terminal Execution)**: Committing, pushing, PR creation, and merging are manually performed by the human operator using terminal commands or the GitHub web UI. Agy does not automate these steps.

GitHub Actions validation remains valuable for checking correctness on the remote repository. Squash auto-merge is optional and must be explicitly configured or initiated by the human operator, rather than being an automated default.

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

* `main` – Current architecture with Worker-managed OAuth/session and Google Sheets access/sync hardening

Historical/archival/protected:

* `phase-11` – Historical branch for OAuth/session durability and Google Sheets access/sync hardening

Upcoming:

* Post-MVP enhancements only after OAuth/session flow is fully functional and durable on `main`
