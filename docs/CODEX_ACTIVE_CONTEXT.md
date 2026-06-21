# Codex Active Context

Read this first for current Walmart-GC tasks. It is the compact source of truth for future Codex work. Preferred source-of-truth chain: `docs/CODEX_ACTIVE_CONTEXT.md` -> `AGENTS.md` -> `docs/ARCHITECTURE.md` -> task-specific docs -> `docs/archive/` only when history or regression evidence requires it.

## Current Basics

- Repo: `dotsthewarlock/Walmart-GC`
- Active phase branch: `phase-12`
- Protected production base branch: `main`
- Historical/archival/protected branch: `phase-11`
- Live app and development/testing URL: `https://walmart-gc.dotsthewarlock.com`
- OAuth/session durability and Google Sheets access/sync hardening are part of the current `main` architecture, not an active phase branch.
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

## Latest Infrastructure Audit

Verified current infrastructure state:

- GitHub Pages serves the frontend root from `main`.
- App shell fingerprint: `1.01.74`.
- Cloudflare routes only `/api/*` and `/auth/*` to Worker `walmart-gc-oauth`.
- No wildcard `/*` Worker route.
- Worker version: `2026-06-18.merchant-inferred-schema.1`.
- Schema mode: `header-name`.
- Worker-managed OAuth/session is active.

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

Do not change schema, OAuth scope, auth/session architecture, backend architecture, deployment system, sync behavior, CSV import/export/recovery behavior, or app-shell debug versions unless the task explicitly requires it and the risk is discussed. Preserve offline/local usability and CSV backup/recovery. Do not introduce databases, Firebase, Cloud Functions, Apps Script sync, Node backends, frameworks, build steps, or new hosting.

## Naming Conventions

- Runtime files stay simple lowercase, for example `app.js`, `index.html`, and `styles.css`; Worker entrypoint is `worker/src/index.js`.
- Docs use conventional uppercase names, for example `README.md`, `AGENTS.md`, and `CODEX_ACTIVE_CONTEXT.md`; archive folders use lowercase kebab-case, for example `docs/archive/apps-script-retired/`.
- Branches use lowercase kebab-case, for example `phase-11-fix-sync-status`; PR/task names use imperative verb phrases, for example “Clarify Apps Script diagnostic docs”.
- JavaScript functions/variables use `camelCase`; JavaScript constants use `SCREAMING_SNAKE_CASE`.
- Preserve approved schema field names as existing `camelCase`; do not rename schema fields for style.

## Repo Workflow Safety

- The expected phase branch for active feature and UX polish work is `phase-12`; `main` is the protected production base and `phase-11` is historical/archival/protected. Determine the expected base branch from active project context, confirm the local working branch before implementation, review, audit, verification, or PR tasks, and alert the user when it appears to differ from the intended workflow. Do not assume branch changes are intentional; if branch intent is unclear, ask before proceeding.
- Distinguish the local working branch from GitHub PR branches. Codex may use a local/internal staging branch such as `work`; a local `work` branch is not by itself a blocker when it is only internal staging. Before PR creation or auto-merge, report all three branch identities: local working branch, GitHub PR head branch, and GitHub PR base branch.
- Before any task requiring PR creation or auto-merge during Phase 12, confirm the intended PR base is `phase-12`, the intended PR head is a `codex/*` branch, and a GitHub PR creation mechanism is available. For local/CLI workflows, `git remote get-url origin` may be used as a push preflight and should point to `dotsthewarlock/Walmart-GC`; do not require local `origin` as a universal Codex Cloud preflight because Codex Cloud may use platform-managed PR creation. If no PR path exists, stop before implementation and report `blocked: PR creation unavailable` unless local-only output is explicitly approved; if Codex Cloud can commit/prepare changes but requires the user to manually click `Create PR`, continue the task and finish with PR-ready output.
- Distinguish Codex Cloud workspace commits and PR metadata from GitHub PRs. A commit reported by Codex Cloud is not enough to prove a branch was pushed to GitHub. In Codex Cloud, “Created PR metadata” is not a successful PR creation result; if changes are committed/prepared but no GitHub PR URL/number exists, or the UI still shows `Create PR`, Codex must report `PR not created; PR-ready only` and tell the user to click `Create PR`; this is a normal handoff state, not a failed task.
- PR creation is allowed when local `work` is only internal staging, changes are pushed or platform-submitted to a proper `codex/*` GitHub head branch, the PR base is `phase-12`, and a confirmed GitHub PR URL/number exists before reporting that a PR exists.
- Auto-merge is allowed only when an actual GitHub PR URL/number is confirmed, the PR base is `phase-12`, the PR head is the intended `codex/*` branch, checks/validation pass, no conflicts exist, confidence is >=80%, and no restricted-risk gates are triggered. No confirmed PR URL/number means no auto-merge.
- When the primary development branch or phase changes, update active branch references in active docs first; preserve historical branch or phase references only when intentionally historical.
- Confidence reports should include score, rationale, files touched, validation performed, remaining uncertainty, and the local working branch / PR head / PR base when PR or merge actions are involved. PR creation is allowed at confidence >=60%; auto-merge is allowed at confidence >=80% only when all safety gates pass.
- Block auto-merge when no confirmed PR URL/number exists, merge conflicts exist, validation fails, checks/CI fail, local/PR branch identities are ambiguous, the PR base/head does not match the intended workflow, scope is unclear, or restricted-risk areas are touched. Restricted-risk areas require explicit user approval before implementation or merge: schema changes, OAuth/session, Worker auth/cookies, sync/conflict handling, deployment/routes, migration/recovery, broad UI redesign, and destructive cleanup. Approval may be provided in chat or task follow-up.
- Report merged or stale `codex/*` branches. Auto-delete only verified merged `codex/*` branches while retaining the 5 most recent merged Codex branches and any merged Codex branch newer than 30 days. Never auto-delete failed, conflicted, abandoned, unresolved, or ambiguous branches.
- Keep the 5 most recent completed Codex instances visible and archive older completed instances. Never auto-archive failed/error tasks, blocked tasks, unresolved reviews, active investigations, or ambiguous-status tasks. Never auto-delete Codex instances.
- Prefer existing CSS tokens and component/layout patterns before introducing new raw values or variants. Minimize one-off styling values, consolidate duplicates only when computed output remains unchanged, preserve accepted UI baselines unless visual change is requested, and use Material 3 as a consistency lens rather than a redesign mandate.



## AI Automation Risk Classifier Foundation

- Automation risk knobs live in `.github/ai-automation-policy.yml`.
- `.github/scripts/ai_risk_classify.py` is the shared deterministic classifier for future `codex/*` PR risk checks.
- PR 1 only adds the classifier and policy foundation.
- Auto PR creation and auto-merge wiring are intentionally deferred to PR 2.
- Human intervention remains required until PR 2 is implemented and reviewed; no new auto-create or auto-merge behavior is enabled by this foundation.

## Phase 12 AI Workflow Handshake

Phase 12 plans repository automation only; it must not alter app architecture, OAuth/session, sync/conflict, schema, deployment, or CSV recovery behavior. Prefer the ChatGPT/GitHub connector for small, bounded, connector-friendly edits where the PR path is clear. Use Codex Cloud for broader implementation, multi-file changes, local validation-heavy work, or edits the connector cannot safely apply. GitHub-native automation owns PR lifecycle steps. ChatGPT quick-fix is a fallback only for tiny safe edits. Codex local is out of scope. The active phase branch (`phase-12`) is the automation target; `main` is never an automation target. Automation work branches use `codex/*` unless a ChatGPT connector branch is explicitly used for a small docs/config fix.


GitHub Actions UI registration note: Phase 12 AI workflows may need workflow files present on the default branch so `workflow_dispatch` entries appear in the Actions UI, but their runtime guards must still target `phase-12` and never `main`. Treat the workflow source branch (where GitHub loads the workflow definition) and the workflow target branch (the PR base or cleanup base the workflow acts on) as separate concepts; active-context lookups must read `docs/CODEX_ACTIVE_CONTEXT.md` from the intended target branch.

Workflow lanes:

- Lane A — Codex Cloud implementation: prepare repo edits and workspace commits for `codex/*` -> `phase-12` PRs.
- Lane B — ChatGPT/GitHub connector small edits: use for compact low-risk changes when the file shape is connector-friendly and a PR path is clear.
- Lane C — ChatGPT quick-fix fallback: tiny safe edits only; avoid runtime, security, data, or workflow-permission changes.
- Lane D — GitHub-native PR lifecycle automation: create PRs, validate, squash-merge when approved/eligible, report cleanup.

Risk tiers:

- Green: docs, copy, and tiny safe edits.
- Yellow: small runtime changes.
- Red: auth/session, sync/conflict, schema, deployment, destructive cleanup, or workflow-permission changes.

PR lifecycle states: changes prepared, workspace commit created, GitHub PR created, PR-ready only, validation passed, validation failed, merged, merge blocked, prune completed, prune skipped.

Staged roadmap: (1) docs handshake, (2) auto-create PR workflow, (3) auto-squash merge workflow, (4) cleanup reporting, (5) prune verified merged `codex/*` branches.

Cleanup policy: report stale or merged `codex/*` branches first. Later pruning may delete only verified merged `codex/*` branches. Never delete failed, conflicted, abandoned, unresolved, ambiguous, unmerged, or non-`codex/*` branches.

## Maintenance Log and Deferred Work

`docs/MAINTENANCE_LOG.md` is the durable repo location for unfinished cleanup, artifacts, validation gaps, and minor follow-up concerns that should not live only in chat or PR memory. It is not a changelog and must not duplicate completed PR summaries.

For every Codex task and ChatGPT review, inspect or update `docs/MAINTENANCE_LOG.md` when the task discovers or leaves unresolved work. Add concise entries only for deferred or unfinished concerns, including cleanup not done, artifacts left behind, validation gaps, stale docs/branches, garbage-collection candidates, or follow-up risks. Do not add an entry when the concern is fully resolved in the same PR.

Each maintenance entry should include priority/risk/area, source PR or task when known, status, concise context, suggested action, guardrails, and acceptance. Use GitHub Issues instead of the log for assigned, blocking, or soon-actionable work. During `next` checkpoints, ChatGPT should check this log and advise whether to continue feature work or run cleanup before drift accumulates.

## Execution Lane Selection

Prefer the lowest-friction safe lane for each task. These rules apply across Walmart-GC branches and workflows unless the user explicitly supersedes them for a specific task.

1. ChatGPT direct tool or connector action for small, bounded, connector-friendly edits, especially docs/copy/config text and metadata-only actions. Batch safe connector steps when possible: inspect, branch, edit, open PR, then review.
2. Before connector writes, check file suitability. Avoid connector writes for large embedded shell workflow files, auth/session logic, destructive scripts, generated/minified files, binary assets, or safety-sensitive blocks.
3. If one connector write attempt is blocked or fails, stop connector writes, report any partial state such as a no-op branch, and switch to Codex or another safer method. Do not keep retrying connector writes against the same risky file shape.
4. Use Codex for broader implementation, multi-file changes, local validation-heavy work, workflow files with large scripts, and any file edit the connector cannot safely apply.
5. If Codex reports no diff but live GitHub evidence or exact error strings disagree, trust live evidence first. Force exact raw branch/path inspection and exact-string checks before accepting a no-op result.
6. Gemini markdown handoff only for user-intervention tasks such as GitHub/Cloudflare UI settings, local terminal actions, or environment access that ChatGPT and Codex cannot safely perform.
7. ChatGPT retains architecture, risk, branch policy, task routing, and review decisions.

Do not use Gemini for actions ChatGPT can safely complete directly. Do not use long terminal scripts as the default; prefer small command chunks, direct tooling, connector actions, or Codex. Gemini handoffs must ask Gemini to return a markdown report to ChatGPT and to stop rather than extrapolate when settings, permissions, or task scope are unclear.

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

Historical docs live under `docs/archive/` and are retained for reference, not normal current-work context. Do not read archived docs for normal tasks. Consult them only for exact old error strings, historical regressions, explicit user requests, or migration/history tasks.
