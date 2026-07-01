# Codex Active Context (Agy Active Context)

> [!NOTE]
> This filename is kept for legacy compatibility, but the file remains active. For the compact, primary current-state summary, please refer to [ACTIVE_CONTEXT.md](docs/ACTIVE_CONTEXT.md).

Read this first for current Walmart-GC tasks. It is the compact source of truth for future Agy work. Note that the retired automated Codex workflow is historical, and the current active workflow is the Agy CLI plus Terminal guarded batch workflow. Preferred source-of-truth chain: `docs/ACTIVE_CONTEXT.md` -> `docs/CODEX_ACTIVE_CONTEXT.md` -> `AGENTS.md` -> `docs/ARCHITECTURE.md` -> task-specific docs -> `docs/archive/` only when history or regression evidence requires it.

## Current Basics

- Repo: `dotsthewarlock/Walmart-GC`
- Active branch: `main` (React 19 + Vite + Tailwind production app)
- Behavior parity source of truth: `phase-12` semantics (archival production baseline)
- Active production-candidate branch: `main`
- Historical/archival/protected branch: `phase-12` (formerly `phase-11` in older baseline descriptions)
- Live app and development/testing URL: `https://walmart-gc.dotsthewarlock.com`
- OAuth/session durability and Google Sheets access/sync hardening are part of the current `main` architecture.
- React 19 + Vite + Tailwind CSS frontend environment (merged on `main`).
- UX Decisions Log: [docs/REACT_UX_DECISIONS.md](docs/REACT_UX_DECISIONS.md)
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

## Latest Infrastructure Audit

Verified current infrastructure state:

- **Live Production**: GitHub Pages serves the built React/Vite artifact from `main` via the Pages workflow.
- **Pages Metadata Caveat**: The GitHub Pages API may still report legacy `phase-12 / /` metadata even while live HTML serves built Vite assets. Verify live HTML before changing Pages settings.
- **Archival Target**: `phase-12` remains the archival last-known-good baseline and behavior parity source.
- **Target Pages Deployment Model**: The target Pages model is GitHub Actions building from `main` and deploying the compiled `dist/` folder, not serving from a branch root. This deployment is pending explicit approval.
- **Deployment/Config Control**: Actual deployment/config modifications remain Red scope and are not yet approved.
- **Production Safety References (94c30c2536a63a721953fc3ea3e1dfc3cdd590b0)**:
  - Backup Branch: `backup/phase-12-before-react-vite-2026-06-24`
  - Backup Tag: `prod-phase-12-pre-react-vite-2026-06-24`
  - Both point directly to `origin/phase-12` at commit `94c30c2536a63a721953fc3ea3e1dfc3cdd590b0`.
- **App Shell Caching**: Legacy dynamic fingerprint diagnostics are deprecated and should not block React/Vite deployment unless explicitly reintroduced. Static build labels are used.
- **Worker Routes**: Cloudflare routes only same-origin `/api/*` and `/auth/*` to Worker `walmart-gc-oauth`.
- **No Wildcard Router**: No wildcard `/*` Worker route exists.
- **Worker Version**: `2026-06-18.merchant-inferred-schema.1`.
- **Schema Mode**: `header-name`.
- **Worker-managed OAuth/Session**: Active.

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

Merchant model: `merchant` is the explicit user-entered/user-selected override only and must not be inferred/defaulted to `walmart-ca` when blank; `merchantInferred` is app/Worker-derived from `cardNumber` and is `walmart-ca` for valid Walmart Canada cards; `effectiveMerchant = merchant || merchantInferred` is runtime-only and must not be stored. Existing old-schema Sheets missing only `merchantInferred` are safe additive migration candidates.

Barcode payload is derived only and must not be stored: `79936686504000 + cardNumber`. Conflict handling uses `_META.sheetVersion`: no silent overwrite, no automatic merge, user chooses recovery, CSV backup before destructive recovery.

## Hard Guardrails

Do not change schema, OAuth scope, auth/session architecture, backend architecture, deployment system, sync behavior, CSV import/export/recovery behavior, or app-shell debug versions unless the task explicitly requires it and the risk is discussed. Preserve offline/local usability and CSV backup/recovery. Do not introduce databases, Firebase, Cloud Functions, Apps Script sync, Node backends, or new hosting. Frameworks (React 19) and build steps (Vite) are authorized specifically under the migration scope on the `main` branch.

## Naming Conventions

- Runtime files stay simple lowercase, for example `app.js`, `index.html`, and `styles.css`; Worker entrypoint is `worker/src/index.js`.
- Docs use conventional uppercase names, for example `README.md`, `AGENTS.md`, and `CODEX_ACTIVE_CONTEXT.md`; archive folders use lowercase kebab-case, for example `docs/archive/apps-script-retired/`.
- Branches use lowercase kebab-case, for example `phase-12-fix-sync-status`; PR/task names use imperative verb phrases, for example “Clarify Apps Script diagnostic docs”.
- JavaScript functions/variables use `camelCase`; JavaScript constants use `SCREAMING_SNAKE_CASE`.
- Preserve approved schema field names as existing `camelCase`; do not rename schema fields for style.

## Repo Workflow Safety

### Current Workflow: Agy CLI & Terminal Guarded Batch
- The active branch is `main` (React 19 + Vite + Tailwind CSS production app).
- The current workflow is Agy-first guarded batch: verify changes locally, run validation builds, inspect git diff, and run guarded commits/pushes.
- Avoid automatic or unchecked pushes or merges. Always check git status and run build validations before committing.
- Ensure only task-relevant files are edited and no guardrail risks are touched.

## Active Workflow & Automation Status

> [!NOTE]
> All automated Codex workflows and PR risk classification pipelines are retired. The current workflow is the Agy-first guarded batch workflow using the Agy CLI and Terminal commands.

Human review and local validation remain mandatory. Direct tool updates, local tests, and build validation replace all lane-based remote executions.

## Maintenance Log and Deferred Work

`docs/MAINTENANCE_LOG.md` is the durable repo location for unfinished cleanup, artifacts, validation gaps, and minor follow-up concerns that should not live only in chat or PR memory. It is not a changelog and must not duplicate completed PR summaries.

For every Agy task and ChatGPT review, inspect or update `docs/MAINTENANCE_LOG.md` when the task discovers or leaves unresolved work. Add concise entries only for deferred or unfinished concerns, including cleanup not done, artifacts left behind, validation gaps, stale docs/branches, garbage-collection candidates, or follow-up risks. Do not add an entry when the concern is fully resolved in the same PR.

Each maintenance entry should include priority/risk/area, source PR or task when known, status, concise context, suggested action, guardrails, and acceptance. Use GitHub Issues instead of the log for assigned, blocking, or soon-actionable work. During `next` checkpoints, ChatGPT should check this log and advise whether to continue feature work or run cleanup before drift accumulates.

## AI-First Workflow Guidance (Agy-First Guarded Workflow)

- **Terminal for Cheap Mechanical Checks**: Use terminal commands for quick, low-complexity actions (status checks, diff checks, basic building, syntactic check).
- **Agy Low/Medium Routing Only**: Use Gemini 3.5 Flash (Medium) for coding/refactoring, and Gemini 3.5 Flash (Low) for mechanical Git/build/docs tasks. No Pro tiers should be configured or invoked.
- **Guarded One-Shot Steps**: Take small, incremental, one-shot steps. Verify status and diffs at each step before making further changes.
- **Strict Guardrail Boundaries (Stop Condition)**: Stop execution immediately before attempting any Red-scope changes (deployment config, Cloudflare Worker files, KV bindings, Google Sheet schema changes, sync/conflict logic, CSV recovery/logic, auth/session changes, or package.json changes) and request explicit user confirmation.

## User-Facing Action Layout

When ChatGPT is ready for user input or approval, put the required action at the top of the response. Use this compact shape unless a deeper review is requested:

```text
Action needed: <what the user should do next, or none>
Who acts: <ChatGPT direct tool | Codex | Gemini/manual | user>
Why: <one short reason>
Reply with: <exact approval phrase or next instruction, when useful>
```

Shorthand: when the user says `next`, respond with a short, concise summary of the next user action items, who acts next, and confidence. When the next step is clear, low-risk, and covered by a discussed multi-step plan, ask the user to reply `y` or `n` to proceed. After completing a step, give a concise completion report, recommend follow-up action items, state confidence when useful, and ask for `y`/`n` approval to continue only when the next action is clear and safe.

Avoid report-style endings when the user needs to choose an action. Keep responses concise by default; offer or provide an expanded summary only when the user requests it or the risk warrants it.

## Design and CSS Governance

For design decisions, consult Material 3 guidance. UI/UX reviews and design reviews must evaluate Material 3 alignment, explain likely Material 3 conflicts, identify tradeoffs for intentional deviations, and ask for clarification when compliance is ambiguous.

For CSS cleanup, remove only confirmed-unused selectors. Consolidate duplicate or phase-layered overrides only when final behavior is clear. Preserve visual and behavior baselines unless the task explicitly requests a change.

## Current UI Baseline

- Settings gear: accepted placement and opacity behavior should remain stable.
- Cards toolbar: accepted alignment and sort dropdown presentation should remain stable.
- Barcode focus modal: accepted visible centered counter should remain stable.
- Raw CSV lock button: accepted lock/unlock state indicators should remain stable.
- Global status, sync, diagnostics, barcode, checkout, and CSV recovery behavior should not change during cleanup/refactor tasks unless explicitly requested.

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

## Token Discipline for Agy / Codex [HISTORICAL]

> [!NOTE]
> Historically used for Codex; adapted for Agy CLI task execution.

ChatGPT Project Settings own ChatGPT conversation behavior; repo docs own Agy/repo-agent behavior. Workflow shorthand: `discuss` means planning/recommendation only with no implementation prompt unless asked; `codex` (now `agy`) means token-efficient implementation prompt; `review` means merge-safety review; `verify` means current repo/live/source evidence first.

Read only files listed by the task unless evidence points elsewhere. Prefer exact-string search over broad scans. Do not paste full files into responses unless requested. Summarize findings briefly. Avoid `docs/archive/` unless the task requires history. For low-risk UI/copy/CSS changes, do not inspect backend files. For high-risk auth/sync/schema tasks, inspect the relevant runtime path before proposing changes. Report changed files, validation, and risk notes.

## Version-Bump Convention (App-Shell Version Bumping Deprecated)

- Frontend runtime changes: Dynamic version-bumping of HTML/JS/CSS cache-busting fingerprints is deprecated for the React migration. Legacy dynamic fingerprint diagnostics are deprecated and should not block React/Vite deployment unless explicitly reintroduced (assets report static build labels and verification is performed via Git/terminal builds).
- Worker runtime changes: Bump `WORKER_VERSION` in `worker/src/index.js`.
- Docs-only changes: Bump neither.


## Standard Validation Commands

- `git diff --check`
- Conflict-marker scan, for example with `git diff --check` plus targeted search when needed
- `find docs -maxdepth 4 -type f | sort`
- `node --check app.js` when frontend JavaScript changes
- `node --check worker/src/index.js` when Worker JavaScript changes

## Archive Policy

Historical docs live under `docs/archive/` and are retained for reference, not normal current-work context. Do not read archived docs for normal tasks. Consult them only for exact old error strings, historical regressions, explicit user requests, or migration/history tasks.

## Post-deployment status — 2026-06-24 19:34 UTC

React/Vite production deployment is live and manually verified as appearing to work.

Current deployment facts:
- `main` contains the React/Vite production app.
- `.github/workflows/deploy-pages.yml` successfully built and deployed the `dist` artifact.
- Production URL serves built Vite assets from `/assets/`.
- GitHub Pages API still reported `build_type: legacy` with source `phase-12 / /` during verification, even though live HTML served the React artifact. Preserve this as a known metadata inconsistency and verify before changing Pages settings again.
- Rollback path remains GitHub Pages legacy source `phase-12 / /`.

Current stop condition:
- No further deployment/settings changes without explicit approval.
- No cleanup of legacy root files, backup refs, or stale rulesets until production stability is confirmed and cleanup is separately approved.

## Execution and Handoff Policy

For Terminal/Agy work, use a durable, token-efficient handoff model:

- Use `/tmp/agy-task.txt` for local Agy prompts.
- Use `/tmp/agy-task.log` for verbose local Agy output.
- Do not commit raw logs or large terminal transcripts.
- Commit compact durable summaries only when results affect future work, production state, rollback safety, docs architecture, or user decisions.
- Prefer `docs/MAINTENANCE_LOG.md` for dated durable result summaries.
- Prefer `docs/ACTIVE_CONTEXT.md` for current operating state and short-lived-but-important project context.
- Future GPT/Agy sessions should read `docs/ACTIVE_CONTEXT.md` and recent `docs/MAINTENANCE_LOG.md` entries before relying on chat memory.
- If ChatGPT needs results without pasted terminal output, those results must be committed or otherwise pushed to GitHub in a compact form; local `/tmp` files and uncommitted diffs are not durable or remotely visible.
- Keep terminal output Chromebook-safe: print changed-file lists, `git diff --stat`, build tails, and `tail -80` logs rather than full recursive diffs or full raw logs.
