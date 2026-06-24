# Antigravity Handoff — Walmart-GC React Migration

## 1. Quick Resume Protocol
If a migration batch or execution session is truncated or interrupted:
1. **Identify the Active Branch**: Confirm you are on `agy-v1` using `git status`.
2. **Inspect Current Tree Status**: Run `git status` and `git diff --stat` to find files with unsaved/uncommitted modifications.
3. **Verify Existing Build**: Run `npm run build` to confirm if the working tree currently compiles successfully.
4. **Locate Roadmaps & Runbook Stop Conditions**: Review the target slice instructions in `docs/AGY_MIGRATION_RUNBOOK.md` to identify what step is active or next.
5. **Determine Recovery Actions**: Continue editing or ask the user for confirmation of next steps.

## 2. Role
Antigravity is the primary coding agent for the `agy-v1` React migration.
The migration target is React 19 + Vite + Tailwind CSS + Material 3.

## 3. Branches
- Work on: `agy-v1`
- Behavior source: `phase-12`
- Reference only: `phase-13`
Do not use `phase-13` as the source of truth.

## 4. Required first step for every task
Before editing code, inspect the relevant `phase-12` files and the matching `agy-v1` files.
For behavior work, always identify:
- Source behavior in `phase-12`
- Target files in `agy-v1`
- Guardrails affected
- Verification steps

## 5. Hard guardrails
Do not change any of these without explicit approval:
- Worker routes (`/api/*` and `/auth/*`)
- OAuth/session ownership
- Cookie/session strategy
- `credentials: "include"` on same-origin calls
- Google scope model
- Sheet schema/header names
- `_META.sheetVersion` conflict model
- CSV backup/recovery semantics
- Completed-action sync semantics
- Deployment/hosting setup
- App-shell fingerprint semantics

## 6. Required API behavior
All Worker calls must remain same-origin.
Correct pattern:
```js
fetch("/api/example", {
  credentials: "include",
});
```
