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

### Phase 8 – MVP Hardening & Deployment Documentation
Current. Phase 8 is focused on hardening and documentation, not feature expansion or architecture changes.

Focus areas:

- Phase 8A – Deployment and setup documentation.
- Phase 8B – Sync diagnostics and MVP troubleshooting guidance.
- Phase 8C – Apps Script hardening.
- Phase 8D – Manual end-to-end test plan and mobile checkout verification.
- Production-readiness review.

## Future

Post-MVP enhancements should be considered only after MVP hardening is complete.
