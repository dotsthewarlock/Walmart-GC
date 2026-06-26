# Active Context

Read this document first for all current Walmart-GC tasks. It is the primary, compact source of truth for the codebase, active architecture, and developer workflows.

## Current Basics
- **Repository**: `dotsthewarlock/Walmart-GC`
- **Active Branch**: `main` (React 19 + Vite + Tailwind production candidate)
- **Parity Reference**: `phase-12` (archival production baseline branch)
- **Live URL**: `https://walmart-gc.dotsthewarlock.com`
- **Verification Status**: React/Vite production deployment is live and manually verified.
- **Rollback Path**: GitHub Pages config pointed back to branch `phase-12` / `/` root (using backup branch `backup/phase-12-before-react-vite-2026-06-24` and tag `prod-phase-12-pre-react-vite-2026-06-24`).

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

## Active Developer Workflow
1. **Agy-First Guarded Batch Workflow**: The automated Codex PR lanes are retired. All verification, formatting checks, and commits are done locally via standard commands.
2. **Model Usage**: Use `Gemini 3.5 Flash (Medium)` for coding/refactoring, and `Gemini 3.5 Flash (Low)` for mechanical/Git tasks. Pro models must not be used.
3. **Validation Commands**:
   - `git diff --check` & Conflict-marker scan
   - `npm run build` to verify the frontend compile
   - `node --check worker/src/index.js` for Worker syntax

## Documentation Index
- [Architecture](file:///home/godfreymiu/Walmart-GC/docs/ARCHITECTURE.md) — Main system architecture and data models.
- [Deployment Guide](file:///home/godfreymiu/Walmart-GC/docs/DEPLOYMENT_GUIDE.md) — Build, deployment, and pre-deployment checklists.
- [Google Sheet Setup](file:///home/godfreymiu/Walmart-GC/docs/GOOGLE_SHEET_SETUP.md) — Google Sheet configuration and schema details.
- [QA Test Checklist](file:///home/godfreymiu/Walmart-GC/docs/QA_TEST_CHECKLIST.md) — Combined QA check items and debugging scenarios.
- [Maintenance Log](file:///home/godfreymiu/Walmart-GC/docs/MAINTENANCE_LOG.md) — Active tracking for non-blocking cleanup and deferred items.
- [Decisions Log](file:///home/godfreymiu/Walmart-GC/docs/DECISIONS_LOG.md) — Broader design, UX, and architectural decisions.
- [Documentation Archive](file:///home/godfreymiu/Walmart-GC/docs/archive/README.md) — Retained historical references (including archived legacy active context and parity maps).

## Execution and Handoff Policy

### Chromebook / Agy stability rule

For any Agy/model-assisted task or broad repo cleanup, use two phases:

- Phase A: edit, verify, and write handoff to `~/Project/AI_HANDOFF.md`, then run the update helper `~/Project/bin/agy-handoff` to sync to GitHub Issue #200 "AI Handoff"; do not commit or push.
- Phase B: no Agy/model execution and no broad edits; verify branch, changed-file allowlist, protected files, and `git diff --check`, then commit/push only if checks pass.

Never combine Agy/model execution with `git commit` or `git push` in the same batch. Keep visible Terminal output compact.

### Durable AI Handoff Workflow

For Terminal/Agy work, use a durable, token-efficient handoff model:

- **AI Handoff local file**: `~/Project/AI_HANDOFF.md`
- **AI Handoff GitHub issue**: Issue #200 "AI Handoff"
- **Update helper**: `~/Project/bin/agy-handoff`
- **Execution rule**: Agy writes `~/Project/AI_HANDOFF.md` at the end of each run, then runs `~/Project/bin/agy-handoff`.
- **Initialization**: GPT reads Issue #200 first for the latest run state.
- **Log management**: Raw logs stay local in `~/Project/*.log` (e.g., `~/Project/durable-ai-handoff-docs.log`) and are used only for backup/debug/diagnostics.
- **Durability**: Durable decisions belong in repo docs, not only in Issue #200.
- Prefer `docs/MAINTENANCE_LOG.md` for dated durable result summaries (optional historical record, not mandatory default context).
- Prefer `docs/ACTIVE_CONTEXT.md` for current operating state and short-lived-but-important project context.
- Future GPT/Agy sessions must read `docs/ACTIVE_CONTEXT.md` before relying on chat memory.
- Keep terminal output Chromebook-safe: print changed-file lists, `git diff --stat`, build tails, and `tail -80` logs rather than full recursive diffs.
