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

Apps Script remains preserved on `main` as the known-good MVP baseline and in historical documentation. Google account connection and online Sheet sync now use the Cloudflare Worker session backend; the frontend never stores Google tokens or session IDs.

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

### Phase 9B – Browser Direct Google Sheets Sync (retired)

Completed on `phase-9-oauth` and later retired from the active frontend path. Its `_META.sheetVersion` conflict model remains preserved through Worker-backed sync.

## Current Implementation Phase

### Phase 10E – Final OAuth/Sync Hardening & Documentation

Current. Walmart-GC uses a Cloudflare Worker session with `drive.file`; the Worker owns OAuth, refresh tokens, and server-side Drive/Sheets API calls. The frontend syncs only through Worker endpoints. Phase 10E is limited to reliability polish, diagnostics, source-of-truth cleanup, and concise documentation alignment; it is not a feature or architecture redesign phase.

Phase 10 goals:

- Keep normal users away from OAuth Client ID setup.
- Replace manual first-run Sheet URL/ID setup with automatic Worker-backed `Walmart-GC Data` find/create.
- Use Google Drive `drive.file` access instead of broad Sheets or Drive scopes.
- Route online load/save sync only through Worker endpoints while preserving conflict handling, local persistence, and CSV backup/recovery.
- Keep `main` preserved as the known-good Apps Script MVP.
- Keep Apps Script docs/code only as historical MVP reference material unless separately archived.
- Treat `worker/src/index.js` as the source of truth for the Cloudflare Worker and avoid Cloudflare Web IDE drift except emergency fixes.

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
