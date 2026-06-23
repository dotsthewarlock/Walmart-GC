# Walmart-GC React Migration — Active Context

Last updated: 2026-06-22

## Purpose

This document is the active migration context for moving Walmart-GC from the stable `phase-12` static app into the React/Tailwind/Material 3 app on `agy-v1`.

The goal is behavior preservation first, visual modernization second.

## Repository context

- Repo: `dotsthewarlock/Walmart-GC`
- Stable source branch: `phase-12`
- Active migration branch: `agy-v1`
- Reference-only experimental branch: `phase-13`
- Target stack: React 19 + Vite + Tailwind CSS + Material 3
- Primary coding tool: Antigravity CLI connected to GitHub
- Codex workflow: retired for this migration track

## Current branch status

`agy-v1` is a React/Vite/Tailwind scaffold. It should not be treated as behavior-complete.

The stable behavior source remains `phase-12`.

## Non-negotiable preservation guardrails

Do not change any of the following without explicit approval:

- Worker-managed OAuth/session
- Same-origin `/api/*` and `/auth/*` routes
- `credentials: "include"` on Worker API calls
- Google `drive.file` scope model
- Approved Google Sheet header-name schema
- Completed-action sync only
- `_META.sheetVersion` conflict model
- CSV backup/recovery
- Worker routes
- Hosting/deployment flow
- Auth/session behavior
- Sync/conflict behavior
- App-shell fingerprints

## Canonical source of truth

Use `phase-12` as the canonical behavior source for:

- Card data model
- Card list behavior
- Checkout behavior
- Barcode behavior
- Settings behavior
- Local storage behavior
- CSV import/export behavior
- Google OAuth/session behavior
- Sheet setup/load/save behavior
- Conflict/recovery behavior
- Diagnostics behavior
- App-shell debug fingerprint behavior

Use `phase-13` only as a reference branch. Do not copy experimental behavior from `phase-13` unless explicitly approved.

## Current React target state

The active React app should be treated as a migration shell until runtime behavior is ported.

Known current-state notes:

- React entrypoint is `src/main.jsx`.
- Main app component is `src/App.jsx`.
- Current UI is placeholder/scaffold behavior.
- The active branch is `agy-v1`; any runtime label that says `ag-v1` should be treated as a cleanup issue, not as the canonical branch name.

## Migration principle

Prefer small, reviewable, behavior-preserving PRs.

Each PR should:

1. State which `phase-12` behavior it ports.
2. Identify files touched.
3. Include manual verification steps.
4. Confirm no forbidden route/schema/session/sync changes were made.
5. Preserve local-first usability.
6. Preserve user-directed sync actions.
7. Avoid automatic import/export/overwrite behavior.

## Runtime implementation order

Recommended order:

1. Documentation and migration map.
2. React state/data model matching `phase-12`.
3. Static UI shell parity: Cards, Checkout, Settings, modals.
4. Local storage and settings parity.
5. CSV import/export/recovery parity.
6. Barcode rendering parity.
7. Worker session/OAuth status parity.
8. Google Sheet setup/load/save parity.
9. Conflict and recovery parity.
10. Diagnostics and app-shell fingerprint parity.
11. Material 3/Tailwind refinement after behavior parity is verified.

## Definition of done for migration

Migration is not complete until the React app can pass a behavior parity review against `phase-12` for:

- Local card CRUD/update/use flows
- Sorting/filtering/count/total behavior
- Checkout navigation and barcode focus
- Balance update modal
- Notes modal
- Mark used and mark zero-balance cards used flows
- CSV import/export/recovery
- Google connect/disconnect
- Worker-backed status checks
- Sheet ensure/load/save
- Completed-action sync only
- Conflict detection and recovery
- Diagnostics visibility
- App-shell fingerprint/debug behavior
