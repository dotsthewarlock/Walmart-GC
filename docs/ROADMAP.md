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

### Phase 8 – MVP Hardening & Deployment
Current. Phase 8 is focused on hardening, deployment, documentation, verification, troubleshooting, diagnostics, and setup guidance. It is not a feature-expansion or architecture phase.

The MVP architecture is complete. Architecture redesigns should not be proposed unless a concrete MVP blocker exists. Minor implementation decisions should be resolved by applying `docs/PHASE_6_SCHEMA_API_DECISIONS.md`, `AGENTS.md`, and this roadmap.

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

## MVP Sharing and Access Position

Walmart-GC operates against a Google Sheet but does not manage users, roles, or permissions. Google Sheets controls sharing and access, and shared Sheets are allowed when users have the necessary Google access.

The MVP is not designed for real-time collaboration workflows, live multi-client synchronization, presence indicators, activity history, or collaboration tooling. The approved sync and conflict-handling mechanisms remain the project solution when Sheet data changes independently.

## Post-MVP Direction

Post-MVP enhancements should be considered only after MVP hardening is complete.

Google Apps Script remains the approved MVP sync provider. Future versions may evaluate direct Google OAuth + Google Sheets API access or additional sync providers, but OAuth is a post-MVP enhancement. OAuth work is not part of Phase 8, and contributors should not redesign the MVP around OAuth.
