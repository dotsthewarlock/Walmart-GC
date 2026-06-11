# AI Handoff

## Current Branch Context

Active branch: `phase-9-oauth`.

Current implementation phase: Phase 10B — frontend auth/session UX migration to the Cloudflare Worker session backend.

The preserved `main` branch remains the known-good Apps Script MVP. Google account connection now redirects through the Worker OAuth session backend; the frontend no longer stores tokens or session IDs. Worker Sheets proxy endpoints remain future work before durable Sheet sync is complete.

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
- Google Sheet synchronization once Worker Sheets proxy endpoints are added; local/CSV flows remain available meanwhile.
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

The legacy direct browser Sheets code remains present but must not trigger Google Identity Services popups. Until Worker Sheets proxy endpoints are implemented, Google Sheet sync actions should explain that the durable session is connected but the Sheet sync proxy is not enabled in this build.

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
