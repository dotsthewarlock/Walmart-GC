# Active Context

Read this document first for all current Walmart-GC tasks. It is the primary, compact source of truth for the codebase, active architecture, and developer workflows.

## Current Basics
- **Repository**: `dotsthewarlock/Walmart-GC`
- **Active Branch**: `main` (React 19 + Vite + Tailwind CSS)
- **Parity Reference**: `phase-12` (archival production baseline branch)
- **Live URL**: `https://walmart-gc.dotsthewarlock.com`
- **Verification Status**: The React 19 + Vite + Tailwind CSS build on `main` is successfully switched and verified live via GitHub Actions deployment.
- **Rollback Path**: Revert GitHub Pages source selection back to serving from branch `phase-12` / `/` root (using backup branch `backup/phase-12-before-react-vite-2026-06-24` and tag `prod-phase-12-pre-react-vite-2026-06-24`).

## Active Architecture
```text
User Google Account
        ↕
Google OAuth
        ↕
Cloudflare Worker (walmart-gc-oauth)
        ↕
Google Drive / Sheets API
        ↕
Walmart-GC Web App (Static React 19 + Vite)
```
- **Routing**: Cloudflare routes same-origin `https://walmart-gc.dotsthewarlock.com/auth/*` and `/api/*` to the Worker. GitHub Pages serves static files from the custom domain root.
- **Google OAuth**: Worker-managed Google OAuth using HttpOnly, Secure, SameSite=Lax, host-only session cookies. The authorization scope is strictly `https://www.googleapis.com/auth/drive.file`.
- **Google Sheet Model**: Dedicated spreadsheet `Walmart-GC Data` with tabs `Cards` and `_META`.
- **Approved Schema**:
  `cardNumber`, `pin`, `startingBalance`, `currentBalance`, `merchant`, `merchantInferred`, `dateAdded`, `dateUpdated`, `dateUsed`, `used`, `notes`
  *Note: `merchant` is user-entered; `merchantInferred` is system-derived. Concurrency checks use `_META.sheetVersion`.*

## Hard Guardrails
- **No Localhost OAuth**: All production and dev/testing OAuth is cloud-only via `https://walmart-gc.dotsthewarlock.com`.
- **No Schema Changes**: Do not change spreadsheet schema, sync behaviors, or CSV recovery flow without discussion.
- **No Extra Dependencies**: Do not introduce databases, Firebase, Apps Script sync (Apps Script is retired), or extra NPM packages.
- **Scope Limit**: Never request scopes beyond `drive.file`.

## Active Developer Workflow (Three-Tier Environment)

The development environment operates on three dedicated tiers (T1, T2, T3):

- **T1 = Terminal Exact Truth (State & Integrity Authority)**
  - Use for: `git status`, `git diff --stat`, `git diff --check`, `npm run build`, targeted greps.
  - Controls final `git commit`, `git push`, PRs, and merges.
- **T2 = Local Runtime (Environment)**
  - Frontend: Vite dev server running at `http://127.0.0.1:5174`.
  - Cloudflare Worker: Wrangler dev running at `http://localhost:8787`.
  - Both can run in one terminal in the background with a cleanup trap:
    ```bash
    trap 'kill $(jobs -p)' EXIT
    (npm run dev & npx wrangler dev worker/src/index.js --port 8787 & wait)
    ```
- **T3 = Agy CLI Persistent Interactive (AI Workspace)**
  - Repo-aware implementer, verifier, and report writer.
  - **Preferred Mode**: Interactive persistent sessions (allows rich terminal interaction/state maintenance). Do not use `agy --print` unless explicitly requested.

### Model Usage & Validation Guidelines
- Use `Gemini 3.5 Flash (Medium)` for coding/refactoring, and `Gemini 3.5 Flash (Low)` for mechanical/Git tasks. Do not use Pro models.
- **Validation Commands**:
  - `git diff --check` & Conflict-marker scan
  - `npm run build` to verify the frontend compile
  - `node --check worker/src/index.js` for Worker syntax

## Documentation Index
- [Architecture](file:///home/godfreymiu/Walmart-GC/docs/ARCHITECTURE.md) — Main system architecture and data models.
- [Material 3 Design Decisions](file:///home/godfreymiu/Walmart-GC/docs/M3_DESIGN_DECISIONS.md) — Durable repository documentation for locked design decisions and the strict Material 3 overhaul.
- [Deployment Guide](file:///home/godfreymiu/Walmart-GC/docs/DEPLOYMENT_GUIDE.md) — Build, deployment, and pre-deployment checklists.
- [Google Sheet Setup](file:///home/godfreymiu/Walmart-GC/docs/GOOGLE_SHEET_SETUP.md) — Google Sheet configuration and schema details.
- [QA Test Checklist](file:///home/godfreymiu/Walmart-GC/docs/QA_TEST_CHECKLIST.md) — Combined QA check items and debugging scenarios.
- [Maintenance Log](file:///home/godfreymiu/Walmart-GC/docs/MAINTENANCE_LOG.md) — Active tracking for non-blocking cleanup and deferred items.
- [Decisions Log](file:///home/godfreymiu/Walmart-GC/docs/DECISIONS_LOG.md) — Broader design, UX, and architectural decisions.
- [Documentation Archive](file:///home/godfreymiu/Walmart-GC/docs/archive/README.md) — Retained historical references (including archived legacy active context and parity maps).

## Execution and Handoff Policy

### Phase A/B Stability (Commit Guard)
- **Phase A**: Edit, verify, and write handoff to `~/Project/AI_HANDOFF.md`, then run the update helper `~/Project/bin/agy-handoff` to sync to GitHub Issue #200. Do not commit or push.
- **Phase B**: No Agy/model execution, no broad edits. Verify branch, changed-file allowlist, protected files, and `git diff --check`. Commit/push only after manual review.
- **Rule**: Do not commit, push, or open a PR in the same Agy batch unless explicitly approved by the user.

### Agy Autonomous Batches & Stop Triggers
- **Prompts**: User passes compact prompts ordered strictly by document/context authority.
- **Batch Execution**: Agy executes approved guarded batches without requiring unnecessary microsteps.
- **Stop Triggers**: Agy must pause and report to the user immediately upon encountering:
  - Verification failures.
  - Scope creep or protected behavior risks (e.g., modifying OAuth, sync, schema, package files, Vite/Tailwind configs).
  - Unclear instructions or direct document/guideline conflicts.
  - Visibly incorrect or broken UI/UX during visual/screenshot QA.

### Low-Verbosity Agy Response Format
When terminating a run or presenting final progress, Agy must strictly use the following low-verbosity format:
```text
Changed
Not changed
Verification
Risks
Next
```

### Durable Handoff Workflow
- **Handoff Target**: `~/Project/AI_HANDOFF.md` synced to GitHub Issue #200 via `~/Project/bin/agy-handoff`.
- **Execution rule**: Every Agy session must end by writing `~/Project/AI_HANDOFF.md` and executing `~/Project/bin/agy-handoff`.
- **Durable Decisions**: All durable decisions and system rules belong exclusively in repo docs under `docs/`. Issue #200, `AI_HANDOFF.md`, chats, and logs are temporary run-state/evidence only.
- **Single Executable Block Default**: GPT terminal instructions for Agy tasks should normally be provided as a single copy/paste terminal block (that writes the prompt, runs Agy, captures logs, and prints compact verification/log tail) rather than split across separate run and paste-back/check-output blocks. GPT should rely on Issue #200 for follow-up review instead of asking the user to paste output back. Paste-back instructions should only be used if sync fails, Issue #200 is stale/unavailable, or local-only failure details are needed. This is a practical default, not an absolute rule.
- **Initialization**: GPT must review GitHub Issue #200 before recommending actions or next steps.
- **Out-of-Sync Recovery**: If state changes externally, update `~/Project/AI_HANDOFF.md` and sync Issue #200 before resuming advice.
- **Log Management**: Raw logs stay local in `~/Project/*.log` (e.g., `~/Project/durable-ai-handoff-docs.log`) and are used only for backup/debug/diagnostics.
- **Durability & Cleanup Policy**:
  - After each task, reassess whether the run created a durable decision and advise the user when durable repo docs should be updated.
  - Recovered/stale docs must be removed, archived, or explicitly promoted to active docs.
  - Routine cleanup follows workflow changes, recovered files, stale references, phase/milestone closures, or repeated AI confusion. Do not run after every tiny code change.
  - Prefer `docs/MAINTENANCE_LOG.md` for dated durable summaries and `docs/ACTIVE_CONTEXT.md` for current operating state/short-lived context.
- **Minimal GPT Review Checklist**:
  - [ ] Did verification pass?
  - [ ] Were only scoped files touched?
  - [ ] Did this create a durable decision?
  - [ ] Should stale docs/references be removed?
  - [ ] Is Issue #200 only run-state, not source of truth?
- Future GPT/Agy sessions must read `docs/ACTIVE_CONTEXT.md` before relying on chat memory.
- Keep terminal output Chromebook-safe: print changed-file lists, `git diff --stat`, build tails, and `tail -80` logs rather than full recursive diffs.

## Shadcn / M3 Refactoring Guardrails (Setup Phase)

1. **Design Authority**:
   The Material 3 (M3)-inspired Walmart-GC design remains the visual source of truth. Shadcn/ui is approved only as an accessibility/implementation primitive, not the visual style guide.

2. **Primitive Customization**:
   All installed shadcn components must be customized locally in `src/components/ui/` to:
   * Preserve larger rounded shapes (e.g. `rounded-3xl` or `rounded-2xl`).
   * Match existing tonal surface and outline token/class roles. If a needed reusable class does not exist, propose or add it deliberately as part of the primitive layer rather than scattering one-off Tailwind strings.
   * Retain mobile-first touch targets (minimum `48px` height for interactive regions).

3. **Phase-Scoped State Constraint**:
   Preserve the existing state flow. Do not move card data, preferences, modal controls, sync state, or checkout state into a new state-management architecture during setup.

4. **Phase-Scoped Feature Constraint**:
   Do not migrate or redesign the Cards list or Checkout/detail layout during this setup pass.

5. **Icon Strategy**:
   Lucide icons are permitted only within newly added or directly touched shadcn components. Do not perform an app-wide icon migration.
