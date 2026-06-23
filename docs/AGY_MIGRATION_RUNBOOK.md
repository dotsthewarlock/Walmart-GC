# Walmart-GC React Migration — Execution Runbook (AGY CLI)

This document is the execution runbook for completing the remaining slices of the Walmart-GC React migration on the `agy-v1` branch.

## Model Selection Guidelines
* **Gemini 3.5 Flash (Medium)**: Required for all code writing, refactoring, and reasoning tasks.
* **Gemini 3.5 Flash (Low)**: Acceptable ONLY for mechanical Git tasks, build checks, and simple documentation additions.
* **Pro Tier**: Do not configure or invoke Pro tiers.

## Branch & Source of Truth
* **Migration Target Branch**: `agy-v1`
* **Stable Behavior Source of Truth**: `phase-12` (inspect files using git commands when writing React equivalents).
* **Reference Branch**: `phase-13` (experimental only; do not copy unless explicitly approved).

## Hard Guardrails
* **No Network Broadening**: Keep all Worker endpoint calls same-origin (`/api/*` and `/auth/*`) with `credentials: "include"`.
* **Schema Integrity**: Retain the exact header-name schema and database keys (e.g., `cardNumber, pin, startingBalance, currentBalance, merchant, merchantInferred, dateAdded, dateUpdated, dateUsed, used, notes`).
* **Conflict Model**: Maintain version-controlled sheet version tracking (`_META.sheetVersion`) and user-resolved recovery.
* **No Direct APIs**: Do not write browser-side Google Identity or Sheets API calls.
* **No Package Expansion**: Do not introduce new runtime dependencies (e.g., Playwright, frameworks, build tools).

## Per-Slice Stop Conditions
Each implementation slice must stop and verify before committing:
1. Complete code updates within designated modules.
2. Run standard syntax and build checks: `npm run build`.
3. Run code quality checking commands: `git diff --stat`.
4. Verify behavior does not drift from `phase-12` semantics (especially timestamp changes on `dateUpdated` and `dateUsed`).
5. Ensure no unintended file modifications occurred.

## Auto-Commit / Push Rules
* Stage only files related to the active slice. Do not bundle unrelated changes.
* Commits must use semantic message prefixes (e.g., `feat:`, `chore:`, `docs:`).
* **Pushes after Green-Risk slices (Docs/Build)**: Can proceed automatically to `origin/agy-v1`.
* **Pushes after Yellow/Red-Risk slices (CSV/Auth/Sync/Conflict/Schema changes)**: Do not push directly to the remote repository. Stop and request explicit user confirmation first.

## Required Report Format
After each implementation slice, output a report with:
* Commit Hash
* Git Status output
* Files Included in change
* Confirmation that no forbidden structures (Worker, OAuth logic, sync hooks) were modified.

## Remaining Slice Roadmap
1. **Fullscreen Barcode & Wake Lock**: Port high-contrast modal preview loops, wake lock requests, and gestures.
2. **Local Modals (Balance & Notes Dialogs)**: Replicate confirm overlays, zero-balance triggers, and inline note forms.
3. **CSV Backup/Recovery**: Port CSV parser/generator utility modules and raw CSV text locking.
4. **Worker OAuth / Session**: Connect to `/api/status` status checks and logout handlers.
5. **Google Sheets load/save**: Integrate `/api/sheet/ensure`, `/api/cards/load`, and `/api/cards/save` synchronization APIs.
6. **Optimistic Locking Conflict Recovery**: Implement concurrency resolution recovery options panels.
