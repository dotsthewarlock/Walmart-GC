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

Phase 7 sync implementation is complete. The current application uses the approved Google Sheet ↔ Apps Script ↔ Walmart-GC architecture, with Phase 8 focused on MVP hardening, deployment, documentation, verification, troubleshooting, diagnostics, and setup guidance.

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

- Phase 8 – MVP Hardening & Deployment

## Architecture Baseline

- The approved Phase 6 architecture summary is documented in `docs/PHASE_6_SCHEMA_API_DECISIONS.md`.
- Treat Phase 6 as the current architecture baseline and historical decision record.
- Do not change schema, Apps Script APIs, sync behavior, connection model, metadata architecture, or conflict handling without explicit discussion and approval.
- The MVP architecture is complete.
- Phase 8 is not an architecture phase.
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

Current Phase 8C hardening keeps the approved Apps Script sync architecture and endpoints unchanged. The Data panel diagnostics now emphasize health status, last health check, health Sheet version, last sync attempt, last successful sync, last known Sheet version, and last actionable error. Apps Script request handling now returns clearer validation errors for missing or unsupported actions, malformed POST envelopes, invalid card arrays, duplicate card numbers, invalid balances, and invalid used values.

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

## Sync Provider Direction

Google Apps Script is the approved MVP sync provider. Future versions may evaluate direct Google OAuth + Google Sheets API access or additional sync providers, but OAuth is a post-MVP enhancement. OAuth work is not part of Phase 8, no OAuth setup or implementation tasks should be added for Phase 8, and contributors should not redesign the MVP around OAuth.

## Sheet Sharing and Collaboration Scope

Walmart-GC operates against a Google Sheet but does not manage users, roles, or permissions. Google Sheets controls sharing and access. Shared Sheets are allowed when Google Sheets grants the relevant access.

The MVP is not designed for real-time collaboration workflows, live multi-client synchronization, presence indicators, activity history, or collaboration tooling. The approved sync and conflict-handling mechanisms remain the project solution when Sheet data changes independently.

## Phase 8 PR Philosophy

Prefer coherent PRs over micro-PRs. Related documentation should be completed together, repeated PRs that touch the same documentation files should be avoided, and each Phase 8 PR should be logically complete while remaining reviewable.

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
