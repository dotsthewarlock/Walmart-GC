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

Phase 7 sync implementation is complete. The current application uses the approved Google Sheet ↔ Apps Script ↔ Walmart-GC architecture, with Phase 8 focused on MVP hardening and deployment documentation.

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

- Phase 8 – MVP Hardening & Deployment Documentation

## Architecture Baseline

- The approved Phase 6 architecture summary is documented in `docs/PHASE_6_SCHEMA_API_DECISIONS.md`.
- Treat Phase 6 as the current architecture baseline and historical decision record.
- Do not change schema, Apps Script APIs, sync behavior, connection model, metadata architecture, or conflict handling without explicit discussion and approval.

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

Phase 8 is hardening and documentation work, not new feature expansion. Focus areas are:

- Deployment/setup documentation.
- Apps Script setup guide.
- Google Sheet setup guide.
- Sync diagnostics.
- Apps Script hardening.
- Manual end-to-end test plan.
- Mobile checkout verification.
- MVP troubleshooting guidance.
- Production-readiness review.

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
