# Walmart-GC Roadmap

> For full project instructions and governance, see AGENTS.md.

## Product Vision

Walmart-GC is a mobile-first gift card management application for users managing dozens of Walmart gift cards.

The application is designed around:

- Fast in-store checkout.
- Barcode access.
- Balance tracking.
- Mobile usability.
- Google Sheets as the source of truth.
- CSV backup and recovery.

## Current Phase 10 Auth Architecture

```text
User Google Account
        ↕
Cloudflare Worker OAuth session (`drive.file`)
        ↕
Walmart-GC Web App
        ↕
Local browser storage / CSV backup
```

Apps Script remains preserved on `main` as the known-good MVP baseline and in historical documentation. Google account connection now uses the Cloudflare Worker session backend; the frontend no longer stores tokens or session IDs. Worker Sheets proxy endpoints remain future work before durable Sheet sync is complete.

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

Completed for the MVP baseline. Historical architecture decisions are documented in `docs/PHASE_6_SCHEMA_API_DECISIONS.md`.

### Phase 7 – Apps Script Sync Implementation

Completed on the MVP line. The preserved `main` branch remains the known-good Apps Script MVP.

### Phase 8 – Stable MVP Hardening

Completed on the MVP line. Phase 8 focused on documentation, setup guidance, testing, troubleshooting, diagnostics, Apps Script hardening, CSV import sync reliability, and final MVP cleanup.

### Phase 8.5 – Barcode Rendering & Checkout Validation

Completed. Walmart Canada checkout barcodes are generated in the frontend from the existing `merchant` and `cardNumber` fields. No Sheet schema or CSV header change was required because the barcode payload is derived at render time.

### Phase 9A – Google OAuth Foundation

Completed on `phase-9-oauth`. Added Google Account setup, OAuth Client ID storage, Google Identity Services loading/status, and in-memory access token handling.

### Phase 9B – Direct Google Sheets Sync

Completed on `phase-9-oauth`. Added direct Sheet URL/ID setup, Sheet initialization, load, sync, `_META.sheetVersion`, and optimistic conflict detection while Apps Script remained as a temporary legacy fallback.

## Current Implementation Phase

### Phase 9.1 – Low-Friction OAuth + Sheet Lifecycle

Current. Walmart-GC uses Google OAuth with `drive.file`, the Google Drive API to find/create `Walmart-GC Data`, and the direct Google Sheets API as the only online sync path.

Phase 9.1 goals:

- Remove normal-user OAuth Client ID setup.
- Replace manual first-run Sheet URL/ID setup with automatic `Walmart-GC Data` find/create.
- Use Google Drive `drive.file` access instead of broad Sheets or Drive scopes.
- Keep direct Google Sheets sync, conflict handling, local persistence, and CSV backup/recovery intact.
- Keep `main` preserved as the known-good Apps Script MVP.
- Keep Apps Script docs/code only as historical MVP reference material unless separately archived.

## Active Sync Notes

- The approved card schema remains unchanged.
- `cardNumber` remains the unique ID.
- `currentBalance` remains authoritative.
- `used` remains independent of balance.
- Direct sync writes completed actions only, not every keystroke.
- `_META.sheetVersion` provides sheet-level optimistic conflict detection.
- Conflicts require explicit user recovery; there is no automatic merge or silent overwrite.
- CSV export/import remains the backup and recovery path.

## Debug File Version Protocol

`index.html`, `app.js`, and `styles.css` each have independent manual debug versions. Increment only the changed core files in a PR, and leave unchanged core-file versions unchanged. Codex final summaries for changes touching any core file must end with a `LIVE VERSION CHECK` block listing HTML, JS, and CSS values.

## Sharing and Access Position

Walmart-GC operates against a Google Sheet but does not manage users, roles, or permissions. Google Sheets controls sharing and access, and shared Sheets are allowed when users have the necessary Google access.

The app is not designed for real-time collaboration workflows, live multi-client synchronization, presence indicators, activity history, or collaboration tooling. Sheet-level optimistic conflict handling remains the project solution when Sheet data changes independently.
