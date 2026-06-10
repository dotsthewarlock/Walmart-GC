# Walmart-GC Roadmap

> For full project instructions and governance, see AGENTS.md.

## Product Vision

Walmart-GC is a mobile-first gift card management application for users managing dozens of Walmart gift cards.

The application is designed around:

- Fast in-store checkout
- Barcode access
- Balance tracking
- Mobile usability
- Google Sheets as the source of truth

Architecture:

User Google Sheet ↔ Google Apps Script ↔ Walmart-GC Web App

## Completed

### Phase 1 – Static App Foundation
Completed.

### Phase 2 – Checkout Workflow Improvements
Completed.

### Phase 3 – Used Flag Model
Completed.

### Phase 4 – Mobile Navigation Workflow
Completed.

### Phase 5B – Data Panel & Checkout Refinements
Completed.

### Phase 6 – Google Sheet Schema & Apps Script API Design
Completed. Architecture decisions are documented in `docs/PHASE_6_SCHEMA_API_DECISIONS.md` and remain the approved MVP baseline.

### Phase 7 – Sync Implementation
Completed. Phase 7 implemented sync against the approved Phase 6 schema, endpoint strategy, connection model, and conflict strategy.

Delivered areas include:

- Frontend schema alignment with the approved MVP schema.
- Local persistence for cards, settings, connection details, and sync state.
- Apps Script API contract and connection health check.
- Loading cards from Google Sheets.
- Completed-action sync writes using `updateCard` for single-card actions.
- Accepted import and bulk-action writes using `batchUpdate`.
- Unsynced and conflict states with recovery workflow support.
- CSV backup as the emergency recovery path.
- Explicit `replaceAll` usage only for user-confirmed conflict recovery.

## Current Implementation Phase

### Final Phase 8 Cleanup – Stable MVP Baseline
Current. Phase 8 validation has confirmed the approved Google Sheet ↔ Google Apps Script ↔ Walmart-GC MVP architecture is complete and functional. Current activity is final Phase 8 UI/UX cleanup and documentation cleanup before any Phase 9 work begins.

Do not declare Phase 9 started. Phase 8 remains focused on hardening, deployment, documentation, verification, troubleshooting, diagnostics, setup guidance, and final UI/UX cleanup. It is not a feature-expansion or architecture phase. Architecture redesigns should not be proposed unless a concrete MVP blocker exists. Minor implementation decisions should be resolved by applying `docs/PHASE_6_SCHEMA_API_DECISIONS.md`, `AGENTS.md`, and this roadmap.

Phase 8 should proceed through three execution tracks:

#### Phase 8A – Documentation & Onboarding

Includes:

- Deployment documentation.
- Apps Script setup guide.
- Google Sheet setup guide.
- Troubleshooting guide.

#### Phase 8B – Verification & Testing

Includes:

- Manual test plan (`docs/MANUAL_TEST_PLAN.md`).
- Setup validation.
- Sync validation.
- Offline validation.
- Conflict validation.

#### Phase 8C – Hardening & Diagnostics

Includes:

- Diagnostics improvements.
- Validation review.
- Edge-case handling.
- Apps Script hardening.
- Large-sheet review.

Phase 8 PRs should be coherent rather than microscopic. Complete related documentation together, avoid repeated PRs against the same documentation files, and keep each PR logically complete while remaining reviewable.

#### Phase 8.5 – Barcode Rendering & Checkout Validation

Phase 8.5 is a pre-Phase-9 MVP completion step, not OAuth work. Walmart Canada checkout barcodes are generated in the frontend from the existing `merchant` and `cardNumber` fields. No Sheet schema, CSV header, Apps Script endpoint, sync behavior, conflict behavior, or local persistence change is required because the barcode payload is derived at render time as static Walmart Canada prefix plus normalized `cardNumber`.

## Validated MVP Notes

- Apps Script can initialize a blank Google Sheet by creating the `Cards` tab, approved headers, and hidden `_META` metadata sheet.
- Browser writes to Apps Script should continue using the CORS-safelisted simple POST transport. Do not switch write transport back to `Content-Type: application/json` if that triggers browser preflight failures before Apps Script receives the request.
- Accepted CSV import is treated as a completed local action with a pending `batchUpdate` operation until Apps Script confirms the write. Retry Sync must keep that accepted import writeable to Sheets and show clear feedback for retrying, success, failure, missing Sheet version, no pending operation, or conflict.

## Final Phase 8 Data Panel Cleanup Priorities

- Align diagnostics in a two-column/table-like label/value layout so mobile and desktop users can scan connection state quickly.
- Group Google Sheets controls together, including connection, health, refresh, Retry Sync, and open Sheet actions.
- Remove the obsolete or non-functional Upload Sheets button if it remains unused.
- Keep CSV backup/recovery controls separate from Google Sheets sync controls so backup/import actions are not confused with live Sheets synchronization.

## Debug File Version Protocol

`index.html`, `app.js`, and `styles.css` each have independent manual debug versions. Increment only the changed core files in a PR, and leave unchanged core-file versions unchanged. Codex final summaries for changes touching any core file must end with a `LIVE VERSION CHECK` block listing HTML, JS, and CSS values.

## MVP Sharing and Access Position

Walmart-GC operates against a Google Sheet but does not manage users, roles, or permissions. Google Sheets controls sharing and access, and shared Sheets are allowed when users have the necessary Google access.

The MVP is not designed for real-time collaboration workflows, live multi-client synchronization, presence indicators, activity history, or collaboration tooling. The approved sync and conflict-handling mechanisms remain the project solution when Sheet data changes independently.

## Post-MVP / Phase 9 Direction

Post-MVP enhancements should be considered only after MVP hardening is complete. Phase 9 has not started.

The likely Phase 9 preparation path is:

1. Tag the stable MVP, likely as `mvp-apps-script-final`.
2. Preserve `main` as the known-good Apps Script MVP.
3. Create a dedicated `phase-9-oauth` branch for future OAuth work.

Google Apps Script remains the approved MVP sync provider. Future Phase 9 OAuth work should move 100% to direct Google OAuth + Google Sheets API access. Apps Script does not require long-term support after the MVP baseline is preserved. No migration guarantee is required for future OAuth work; CSV export/import is an acceptable fallback path.
