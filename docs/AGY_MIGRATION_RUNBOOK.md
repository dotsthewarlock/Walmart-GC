# Walmart-GC React Migration — Execution Runbook (AGY CLI)

This document is the execution runbook for completing the remaining slices of the Walmart-GC React migration on the `agy-v1` branch.

## 1. Routing & Model Selection
* **Concise Low/Medium Routing**:
  * **Gemini 3.5 Flash (Medium)**: Required for all code writing, refactoring, and complex reasoning tasks.
  * **Gemini 3.5 Flash (Low)**: Acceptable ONLY for mechanical Git tasks (status, staging, commits, pushes), build checks (`npm run build`), and simple documentation edits.
  * **Pro Tier**: Do not configure or invoke Pro tiers.

## 2. Prompting & Communication Rules
* **Short Prompt Rules**: Input prompts and chat instructions must remain short, batch-focused, and direct to reduce context token bloat.
* **Lean Project Instructions**: Keep instructions inside the main ChatGPT/LLM system prompts lean, delegating specific implementation details to local repo documents (like this runbook).

## 3. Duplicate Guard Usage
* **Duplicate Guard**: Before writing or replacing any file content, always run `git status` and `git diff` to inspect current changes in the working tree. This prevents duplicate block insertions, conflict markers, or double declarations.

## 4. Rate-Limit & Quota Recovery Rules
* **Quota Recovery**: If a rate limit error is encountered, do not poll or loop in terminal commands. Stop executing immediately. Utilize the `schedule` timer tool to set a one-shot notification (e.g., waiting 30–60 seconds) before resuming execution.

## 5. Commit Gates (Green vs Yellow/Red)
* Stage only files related to the active slice.
* Commits must use semantic prefixes (e.g., `feat:`, `chore:`, `docs:`).
* **Green Commit Gate (Docs/Build changes only)**: Pushes can proceed automatically to `origin/agy-v1`.
* **Yellow/Red Commit Gate (CSV, Auth, Sync, Conflict, or Schema changes)**: NEVER push or commit directly. Stop execution and request explicit user confirmation first.

## 6. Terse Report Format
After each implementation slice, report:
* Commit Hash (if committed)
* Git Status output
* Files Included in change
* Confirmation that no forbidden structures (Worker, OAuth logic, sync hooks) were modified.

## 7. Hard Guardrails
* **No Network Broadening**: Keep all Worker endpoint calls same-origin (`/api/*` and `/auth/*`) with `credentials: "include"`.
* **Schema Integrity**: Retain the exact header-name schema and database keys (e.g., `cardNumber, pin, startingBalance, currentBalance, merchant, merchantInferred, dateAdded, dateUpdated, dateUsed, used, notes`).
* **Conflict Model**: Maintain version-controlled sheet version tracking (`_META.sheetVersion`) and user-resolved recovery.
* **No Direct APIs**: Do not write browser-side Google Identity or Sheets API calls.
* **No Package Expansion**: Do not introduce new runtime dependencies.

## 8. Per-Slice Stop Conditions
Each implementation slice must stop and verify before committing:
1. Complete code updates within designated modules.
2. Run standard syntax and build checks: `npm run build`.
3. Run code quality checking commands: `git diff --stat`.
4. Verify behavior does not drift from `phase-12` semantics.
5. Ensure no unintended file modifications occurred.

## 9. Remaining Slice Roadmap
1. **Fullscreen Barcode & Wake Lock**: Port high-contrast modal preview loops, wake lock requests, and gestures.
2. **Local Modals (Balance & Notes Dialogs)**: Replicate confirm overlays, zero-balance triggers, and inline note forms.
3. **CSV Backup/Recovery**: Port CSV parser/generator utility modules and raw CSV text locking. (Completed)
4. **Worker OAuth / Session**: Connect to `/api/status` status checks and logout handlers. (Completed)
5. **Google Sheets load/save**: Integrate `/api/sheet/ensure`, `/api/cards/load`, and `/api/cards/save` synchronization APIs. (Completed)
6. **Optimistic Locking Conflict Recovery**: Implement concurrency resolution recovery options panels. (Completed)

## 10. Local Development Settings
For local development and testing under the new React-based setup:
* **Local Dev/OAuth Port Alignment**: For local development, `http://127.0.0.1:5174` is the intended local dev/OAuth alignment (with redirect URI `http://127.0.0.1:5174/auth/callback`) that must be verified before local OAuth testing, not an approved package/config change.
* **Worker API (Local)**: `http://localhost:8787` (run via `wrangler@3`)
* **Production OAuth Redirect URI**: `https://walmart-gc.dotsthewarlock.com/auth/callback`
* **Vite Dev Proxies**: Proxies requests under `/api/*` and `/auth/*` directly to the local Cloudflare Worker.
* **Worker Environment Variables**: `worker/.dev.vars` contains local secrets and must remain uncommitted (tracked in `.gitignore`).

