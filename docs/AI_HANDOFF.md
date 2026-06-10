# AI Handoff

## Current Branch Context

Active branch: `phase-9-oauth`.

Current implementation phase: Phase 9.1 — low-friction OAuth and automatic `Walmart-GC Data` Sheet lifecycle.

The preserved `main` branch remains the known-good Apps Script MVP. Phase 9 work uses Google OAuth with `drive.file`, Google Drive file lifecycle calls, and the direct Google Sheets API as the only online sync path.

## Current Architecture

```text
User Google Account
        ↕
Google OAuth (`drive.file`)
        ↕
Google Drive API + Google Sheets API
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
- Google Sheet synchronization through direct Google Sheets API.
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

Online sync path:

```text
Google OAuth `drive.file` + Google Drive API + Direct Google Sheets API only
```

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

- OAuth configured.
- Google script loaded.
- Google connection state.
- Google file access available / needs reconnect.
- Active Sheet ID configured.
- Cards sheet initialized.
- Local sheetVersion.
- Remote sheetVersion.
- Sync state.
- Unsynced changes.
- Last successful sync.
- Last Google API error.
- Local card count where useful.

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
- `git diff --check`.
- Conflict-marker scan.
- Static UI/copy searches.
- Local HTTP server + curl smoke test when useful.
