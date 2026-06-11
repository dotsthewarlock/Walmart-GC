# AI Handoff

## Current Branch Context

Active branch: `phase-9-oauth`.

Current implementation phase: Phase 10E — final OAuth/sync hardening and documentation alignment after Worker-only durable sync.

The preserved `main` branch remains the known-good Apps Script MVP. Google account connection and Sheet sync run through the Worker backend; the frontend no longer stores Google tokens or session IDs.

## Current Architecture

```text
User Google Account
        ↕
Cloudflare Worker OAuth session (`drive.file`)
        ↕
Walmart-GC Web App
        ↕
Local browser storage / CSV backup
```

## Active Product Scope

Required capabilities remain:

- Gift card list view.
- Gift card detail view.
- Barcode rendering.
- PIN display.
- Remaining balance tracking.
- Used flag tracking.
- Google Sheet synchronization through Worker `/api/sheet/ensure`, `/api/cards/load`, and `/api/cards/save`; local/CSV flows remain available.
- Mobile-friendly interface.
- Desktop-friendly interface.
- CSV backup and recovery.
- Offline/local browser usability.

## Active Data Model

Do not change the card schema without explicit approval:

```text
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
```

Rules:

- `cardNumber` is the unique ID.
- `merchant` defaults to `walmart-ca`.
- `currentBalance` is authoritative.
- `startingBalance` is historical.
- `used` is independent of balance.
- Sort order is frontend-managed.

## Active Sync Behavior

Online auth path:

```text
Cloudflare Worker OAuth session + HttpOnly `walmart_gc_session` cookie
```

The active frontend must not use Google Identity Services popup token flow, browser-side access tokens, or direct browser Drive/Sheets API calls. Online sync uses Worker endpoints with credentials included; the Worker owns OAuth, refresh tokens, and Drive/Sheets calls.

Completed actions should sync after:

- Balance save.
- Used-state change.
- Notes save.
- Merchant change.
- New card save.
- Accepted CSV import.

Do not sync on every keystroke.

If Walmart-GC Data is not configured yet, Google is disconnected, or the browser is offline:

- Keep local changes.
- Preserve cards/settings/saved Sheet configuration.
- Mark unsynced where appropriate.
- Show readable setup/reconnect guidance.
- Do not erase data.

## Conflict Handling

Preserve Phase 9B conflict behavior:

- Sheet-level optimistic concurrency through `_META.sheetVersion`.
- No silent overwrites.
- No automatic merge.
- User chooses recovery.
- Remote load and local overwrite remain explicit actions.

## Current Data Panel Direction

Preferred order:

1. Google Account.
2. Google Sheet.
3. CSV Backup & Recovery.
4. Diagnostics/status output.

Apps Script must not appear as an active setup, sync, diagnostic, or user-facing option on the Phase 9 OAuth branch.

Diagnostics should focus on:

- Worker backend configured.
- Google connection state.
- Worker session connected / disconnected.
- Active Sheet ID configured.
- Cards sheet initialized.
- Local sheetVersion.
- Remote sheetVersion.
- Sync state.
- Unsynced changes.
- Last successful sync.
- Last Worker/API error.
- Local card count where useful.
- Offline/local availability.

## Historical MVP References

Historical Apps Script materials may remain for the preserved MVP baseline, including `apps-script/Code.gs`, `docs/APPS_SCRIPT_SETUP.md`, and `docs/PHASE_6_SCHEMA_API_DECISIONS.md`. Treat them as historical unless the user explicitly asks for MVP Apps Script maintenance.

## Constraints

Do not add:

- Frameworks.
- Build tools.
- Databases.
- Dedicated backend services.
- App-managed user accounts.
- Schema changes.
- Real-time collaboration features.
- Migration wizard.

Preferred verification:

- `node --check app.js`.
- `node --check worker/src/index.js`.
- `git diff --check`.
- Conflict-marker scan.
- Static UI/copy searches for retired browser-token/OAuth Client ID/active Apps Script copy.
- Local HTTP server + curl smoke test when useful.
