# Walmart-GC AI Handoff

For full project instructions, workflow rules, and governance, see AGENTS.md.

## Repository

dotsthewarlock/Walmart-GC

## Stack

- HTML
- CSS
- JavaScript
- GitHub Pages

No frameworks.
No build tools.
No backend server.

## Product Summary

Walmart-GC is a mobile-first gift card management application for users managing dozens of Walmart gift cards.

## Current Architecture

User Google Sheet ↔ Google Apps Script ↔ Walmart-GC

Phase 7 sync implementation is complete, and Phase 8 validation has confirmed the approved Google Sheet ↔ Apps Script ↔ Walmart-GC MVP architecture is complete and functional. Current activity is final Phase 8 UI/UX cleanup and documentation cleanup for a stable MVP baseline. Phase 9 has not started.

## Current Data Model

The frontend is aligned with the approved Phase 6 MVP Google Sheet schema. Phase 6 remains the architecture baseline and historical decision record in `docs/PHASE_6_SCHEMA_API_DECISIONS.md`.

Approved MVP schema:

cardNumber
pin
merchant
startingBalance
currentBalance
dateAdded
dateUpdated
dateUsed
used
notes

Assumptions:

- Used is independent of balance.
- Current Balance is authoritative.
- Starting Balance is historical.
- Negative Amount Used values are allowed.
- Current Balance may exceed Starting Balance.
- Current Balance may not go below zero.

## Current UI

- Card List
- Card Detail
- Settings
- Data
- Full-screen Checkout Mode

## Completed Phases

- Phase 1 – Static App Foundation
- Phase 2 – Checkout Workflow Improvements
- Phase 3 – Used Flag Model
- Phase 4 – Mobile Navigation Workflow
- Phase 5B – Data Panel & Checkout Refinements
- Phase 6 – Google Sheet Schema & Apps Script API Design
- Phase 7 – Sync Implementation

## Current Implementation Phase

- Final Phase 8 cleanup – MVP UI/UX cleanup and documentation cleanup; Phase 9 has not started
- Phase 8.5 – Barcode Rendering & Checkout Validation is pre-Phase-9 and derives Walmart Canada checkout barcodes in the frontend from static prefix plus `cardNumber`; it does not require schema, CSV, Apps Script, sync, conflict, persistence, or OAuth changes.

## Architecture Baseline

- The approved Phase 6 architecture summary is documented in `docs/PHASE_6_SCHEMA_API_DECISIONS.md`.
- Treat Phase 6 as the current architecture baseline and historical decision record.
- Do not change schema, Apps Script APIs, sync behavior, connection model, metadata architecture, or conflict handling without explicit discussion and approval.
- The MVP architecture is complete and functional.
- Phase 8 is not an architecture phase; current work is final UI/UX cleanup and documentation cleanup.
- Do not propose architecture redesigns unless a concrete MVP blocker exists.
- Resolve minor implementation questions using the approved Phase 6 decisions and current repository documentation.

## Phase 7 Delivered Summary

Phase 7 completed the MVP sync implementation while preserving the approved Phase 6 architecture. Delivered work includes:

- Frontend schema alignment with the approved MVP schema.
- Local persistence for cards, settings, connection details, and sync state.
- Apps Script API contract implementation support.
- Apps Script connection health check.
- Loading cards from Google Sheets.
- Completed-action sync writes.
- `updateCard` usage for single-card completed actions.
- `batchUpdate` usage for accepted imports and bulk actions.
- Unsynced state handling.
- Conflict state handling.
- Recovery workflow support.
- CSV backup as the emergency recovery path.
- Explicit `replaceAll` only for user-confirmed conflict recovery.

## Phase 8 Focus

Phase 8 is hardening and deployment work, not new feature expansion and not architecture redesign.

### Phase 8A – Documentation & Onboarding

Includes:

- Deployment documentation.
- Apps Script setup guide.
- Google Sheet setup guide.
- Troubleshooting guide.

### Phase 8B – Verification & Testing

Includes:

- Manual test plan (`docs/MANUAL_TEST_PLAN.md`).
- Setup validation.
- Sync validation.
- Offline validation.
- Conflict validation.

### Phase 8C – Hardening & Diagnostics

Current Phase 8C hardening keeps the approved Apps Script sync architecture and endpoints unchanged. The Data panel diagnostics now render stable visible values for Spreadsheet, Sheet, schema version, health status, last health check, health Sheet version, last sync attempt, last successful sync, last known Sheet version, and last actionable error, using `Not available` or `Never` fallbacks instead of blank rows. Apps Script request handling now returns clearer validation errors for missing or unsupported actions, malformed POST envelopes, invalid card arrays, duplicate card numbers, invalid balances, and invalid used values.

Includes:

- Diagnostics improvements.
- Validation review.
- Edge-case handling.
- Apps Script hardening.
- Large-sheet review.

### Phase 8C CSV Import Sync Bugfix

Live MVP validation found that CSV import plus **Update Data** could update local browser state without giving **Retry Sync** enough information to write the accepted import to Sheets. The frontend now treats an accepted import as a completed local action with a pending `batchUpdate` operation until Apps Script confirms the write. Retry Sync must always show visible feedback: retrying, success, failure, missing Sheet version, no pending operation, or conflict. Imported local cards remain available in the browser and through CSV export/backup if sync fails.

### Phase 8C Apps Script Write CORS Fix

Browser-based Apps Script writes intentionally use a CORS-safelisted simple POST transport: `Content-Type: text/plain;charset=utf-8` with the existing JSON request envelope in the body. This preserves `updateCard`, `batchUpdate`, and `replaceAll` endpoint contracts while avoiding the `application/json` preflight path that can be blocked before Apps Script receives the request. Apps Script continues to parse `e.postData.contents` as JSON. If a write cannot reach Apps Script, the UI must not claim the Sheet was updated; local browser data remains preserved and Retry Sync or explicit recovery should be used.

Do not switch write transport back to `Content-Type: application/json` if it reintroduces browser preflight failures before Apps Script receives the request.

### Blank Sheet Initialization

Apps Script can initialize a blank Google Sheet by creating the `Cards` tab, applying the approved MVP headers, and creating/hiding `_META`. This is safe structural setup only and must not overwrite populated user tabs or modify user card data.

### Final Phase 8 Data Panel Cleanup Priorities

- Align diagnostics in a two-column/table-like label/value layout.
- Group Google Sheets connection, health, refresh, Retry Sync, and open Sheet controls together.
- Remove the obsolete or non-functional Upload Sheets button if it remains unused.
- Keep CSV backup/recovery controls separate from Google Sheets sync controls.

## Sync Provider Direction

Google Apps Script is the approved MVP sync provider. OAuth work is not part of Phase 8, no OAuth setup or implementation tasks should be added for Phase 8, and contributors should not redesign the MVP around OAuth.

Future Phase 9 direction only: tag the stable MVP, likely as `mvp-apps-script-final`; preserve `main` as the known-good Apps Script MVP; create a dedicated `phase-9-oauth` branch; move future OAuth work 100% to direct Google OAuth + Google Sheets API; do not require Apps Script long-term support; do not require a migration guarantee; use CSV export/import as an acceptable fallback path.

## Sheet Sharing and Collaboration Scope

Walmart-GC operates against a Google Sheet but does not manage users, roles, or permissions. Google Sheets controls sharing and access. Shared Sheets are allowed when Google Sheets grants the relevant access.

The MVP is not designed for real-time collaboration workflows, live multi-client synchronization, presence indicators, activity history, or collaboration tooling. The approved sync and conflict-handling mechanisms remain the project solution when Sheet data changes independently.

## Phase 8 PR Philosophy

Prefer coherent PRs over micro-PRs. Related documentation should be completed together, repeated PRs that touch the same documentation files should be avoided, and each Phase 8 PR should be logically complete while remaining reviewable.

## Core File Debug Versions

- `index.html`, `app.js`, and `styles.css` each carry an independent manual debug file version in `#.##.##` format.
- The live app displays these versions near the top-right of the app header as a cache/debug fingerprint, for example `HTML 1.01.00 · JS 1.01.00 · CSS 1.01.00`.
- These values are only for confirming which static files GitHub Pages and the browser loaded; they are not release management or product version numbers.
- Increment only the core-file debug versions for core files changed in a PR; leave unchanged core-file versions at their current values.
- Future Codex prompts that modify `index.html`, `app.js`, or `styles.css` should specify the expected live debug versions after merge/deploy.
- Codex final summaries for changes touching any core file should end with this concise block at the very bottom, listing all three expected live values and keeping unchanged files at their current value:

```text
LIVE VERSION CHECK

HTML: x.xx.xx
JS:   x.xx.xx
CSS:  x.xx.xx
```

## Verification Rules

Do not install:
- Playwright
- Browser screenshot tooling
- npm packages
- Frameworks
- Build tools

Preferred verification:
- node --check
- git diff --check
- conflict-marker scan
- HTML parse validation
- DOM/hook validation
- local HTTP server + curl smoke test
