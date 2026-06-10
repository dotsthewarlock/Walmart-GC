> Historical MVP reference: this document describes the preserved Apps Script MVP on `main`. It is not the active Phase 9 OAuth sync path.

# Phase 6 – Schema & API Decisions

Status: Phase 6 approved MVP architecture consolidated. Phase 7 implemented sync against this baseline, and Phase 8 validation has confirmed the MVP architecture is complete and functional.

This document records approved Phase 6 decisions that remain the MVP architecture baseline.

For full project instructions, workflow rules, and governance, see AGENTS.md.

## Purpose

Track approved decisions for:

- Google Sheet schema
- Google Apps Script connection model
- Sync behavior
- Conflict handling
- Data panel setup direction
- Migration considerations
- User-data risks

## Implementation Boundary

Phase 6 is a design and documentation phase. The decisions below define the approved MVP architecture for Phase 7 planning, but they must not be treated as sync implementation.

Do not implement in Phase 6:

- Google Apps Script code
- frontend sync behavior
- frontend behavior changes
- data migrations
- dependencies or build tooling

Phase 7 implementation followed this document. Exact implementation details that remain deferred are listed in the Open / Deferred section.

The MVP architecture is complete and functional. Current activity is final Phase 8 UI/UX cleanup and documentation cleanup for a stable MVP baseline. Phase 8 is focused on documentation, deployment, setup guidance, testing, troubleshooting, diagnostics, hardening, and final UI/UX cleanup; it is not an architecture phase. Do not reinterpret deferred post-MVP possibilities as Phase 8 implementation work, and do not declare Phase 9 started.

Current application architecture remains:

```text
User Google Sheet
        ↕
Google Apps Script Web App
        ↕
Walmart-GC Web App
```

Frontend constraints remain unchanged:

- Plain HTML
- CSS
- JavaScript
- GitHub Pages-compatible
- No frameworks
- No build tools
- No dedicated backend server
- No user accounts

## Phase 6 Approved MVP Architecture Summary

The following decisions are approved for MVP sync planning and must guide Phase 7 implementation. They do not implement sync by themselves.

### 1. Access Model

MVP access is limited to:

- Google Sheet owner
- Invited Google Sheet editors

Shared Google Sheets are allowed when Google Sheets grants access. Walmart-GC does not manage users, roles, or permissions; Google Sheets controls sharing and access.

Do not support public unauthenticated access for MVP. View-only shared users are not part of MVP sync behavior. Broader sharing and role models are future scope.

The MVP is not designed for real-time collaboration workflows, live multi-client synchronization, presence indicators, activity history, or collaboration tooling. The approved sync and conflict-handling mechanisms remain the MVP solution when Sheet data changes independently.

### 2. Metadata & Sheet Discovery Model

Use `Cards` as the visible card data sheet.

Use `_META` as the hidden Apps Script-managed metadata sheet. Apps Script owns `_META`; users should not manually manage it.

Sheet discovery/setup behavior when connecting:

1. If `Cards` exists, use it and validate schema.
2. If `Cards` does not exist, search visible sheets for the approved schema.
3. If exactly one schema-matching sheet exists, rename it to `Cards` and continue.
4. If multiple matching sheets exist, do not rename; return a setup conflict requiring user choice or manual fix.
5. If no matching sheet exists and the workbook is blank, create or rename a sheet to `Cards`, generate the approved schema headers, create/hide `_META`, and return success with zero cards. This blank-Sheet initialization is an approved Apps Script structural setup path.
6. If no matching sheet exists and the workbook is not blank, do not overwrite user data; return setup guidance.

### 3. API Endpoint Strategy

Use one Apps Script Web App URL with action-based routing.

Approved MVP endpoints:

```text
GET  ?action=health
GET  ?action=load
POST ?action=updateCard
POST ?action=batchUpdate
POST ?action=replaceAll
```

Endpoint meanings:

- `health`: check connection, authorization, Sheet info, and schema/version status.
- `load`: validate/setup Sheet, load all cards, and return cards plus sheet version.
- `updateCard`: save one completed card action, including balance, used flag, notes, and merchant edits.
- `batchUpdate`: save multiple completed card actions, including bulk updates/import acceptance.
- `replaceAll`: overwrite the `Cards` sheet from the current session only for explicit conflict recovery / “Use Current Session”; requires confirmation, and the frontend should strongly recommend CSV backup first.

Deferred endpoints/features:

- `deleteCard`
- `createSheet`
- `selectSheet`
- Google Picker
- table editor
- OAuth picker
- direct Google OAuth + Google Sheets API access
- additional sync providers

### 4. API Request / Response Envelope

Use a consistent API envelope.

Browser write transport note: Apps Script write requests may send the JSON envelope as a CORS-safelisted simple POST body, using `Content-Type: text/plain;charset=utf-8`, so browser writes can reach Apps Script without an `application/json` preflight. Apps Script should parse `e.postData.contents` as JSON. Do not switch write transport back to `Content-Type: application/json` if that triggers preflight failures before Apps Script receives the request.

POST request envelope:

```json
{
  "requestId": "frontend-generated-id",
  "clientTimestamp": "2026-06-10T20:15:00.000Z",
  "lastKnownSheetVersion": "2026-06-10T20:14:00.000Z",
  "payload": {}
}
```

`requestId` is generated by the frontend.

Response envelope:

```json
{
  "ok": true,
  "data": {},
  "meta": {
    "sheetVersion": "2026-06-10T20:15:00.000Z"
  },
  "error": null
}
```

Approved error codes:

```text
NOT_AUTHORIZED
NETWORK_ERROR
INVALID_SCHEMA
SETUP_REQUIRED
SYNC_CONFLICT
VALIDATION_ERROR
INTERNAL_ERROR
```

### 5. Conflict Detection / Write Protection

Use sheet-level optimistic concurrency.

Rules:

- frontend stores `lastKnownSheetVersion`
- Apps Script owns current sheet version in `_META`
- write requests include `lastKnownSheetVersion`
- Apps Script compares versions before writing
- if versions match, write succeeds and new version is returned
- if versions differ, write is rejected with `SYNC_CONFLICT`

No silent overwrites. No automatic merge for MVP. Conflict resolution is user-directed.

`replaceAll` may support forced overwrite only when:

- user explicitly chooses “Use Current Session”
- frontend sends confirmation
- frontend strongly recommends CSV backup first

### 6. Error Handling & Recovery

Use user-friendly errors. Do not expose raw technical errors to users. The session must remain usable if sync fails.

Approved UX states:

```text
Connected
Unsynced
Conflict
```

Use a small persistent global sync status badge.

Badge behavior:

- Connected: informational.
- Unsynced: opens Data panel sync details.
- Conflict: opens Data panel conflict resolution.

Data panel contains detailed diagnostics and recovery actions.

Recovery actions include:

- retry
- retry Sheets version check
- refresh from Sheets
- write accepted CSV imports and other pending bulk operations through `batchUpdate` during Retry Sync
- download session CSV backup
- use current session to overwrite Sheets
- dismiss alert

### 7. Frontend Connection & Onboarding

Data panel is the setup/sync control center.

Approved onboarding direction:

- user provides Apps Script Web App URL
- frontend stores Apps Script URL locally
- frontend auto-reconnects on future visits
- card data persists locally
- settings persist locally
- app loads local cache immediately
- background reconnect attempts when possible

If no cards are loaded, future UI should suggest:

```text
No cards loaded. Check your data source.
[Open Data Panel]
```

When connected, Data panel should show:

- connection status
- connected Sheet name or URL
- link to open the Google Sheet
- last sync time
- sync status
- copy header template
- download CSV template
- refresh from Sheets
- download session CSV

Final Phase 8 Data Panel cleanup priorities:

- align diagnostics in a two-column/table-like label/value layout
- group Google Sheets connection, health, refresh, Retry Sync, and open Sheet controls together
- remove the obsolete/non-functional Upload Sheets button if it remains unused
- keep CSV backup/recovery controls separate from Google Sheets sync controls

### 8. Sheet Validation & Auto-Repair

Use safe auto-repair.

Apps Script may automatically:

- create `Cards`
- create `_META`
- hide `_META`
- create schema headers
- add missing schema columns
- rename a single schema-valid tab to `Cards`

Apps Script must not automatically:

- delete card rows
- modify balances
- modify used flags
- modify notes
- merge card data
- choose between multiple candidate card sheets
- overwrite populated tabs

Guiding rule:

```text
Auto-repair structure.
Never auto-repair user data.
```

### Approved MVP Schema

Phase 6 MVP Google Sheet schema:

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

Approved CSV header:

```csv
cardNumber,pin,merchant,startingBalance,currentBalance,dateAdded,dateUpdated,dateUsed,used,notes
```

Rules:

- `cardNumber` is the unique ID.
- No separate UUID/GUID for MVP.
- `merchant` default is `walmart-ca`.
- `notes` is optional.
- `used` also serves as archive/hidden state for MVP.
- Sort order is web-app-managed and not stored in the Sheet.
- Current balance remains authoritative.
- Starting balance remains historical.
- Used remains independent of balance.

### Accepted CSV Import / Retry Sync Direction

- Accepted CSV import is a completed local action.
- Accepted imports should create a pending `batchUpdate` operation until Apps Script confirms the write.
- Retry Sync must be able to write accepted imports to Sheets when the connection/version state allows it.
- Retry Sync must show visible feedback for retrying, success, failure, missing Sheet version, no pending operation, or conflict.
- If sync fails, imported local cards remain available through browser state and CSV export/backup.

### Local Persistence Direction

- frontend should persist local card data
- frontend should persist settings
- frontend should persist Apps Script URL
- local cache should remain usable offline
- network/sync failure should not erase local session data
- CSV export remains the emergency backup path

### Table Editor Direction

- Raw CSV textarea remains the MVP data tool.
- Spreadsheet-style table editor is deferred.
- A future disabled button may be added later:

```text
Table Editor *
```

Tooltip/copy:

```text
Spreadsheet-style editor planned for a future phase
```

Do not implement the table editor in Phase 6.

## Open / Deferred

The following items are open, deferred, or not approved implementation details:

- exact Apps Script code structure
- exact payload details per endpoint
- exact UI copy for conflict dialogs
- exact metadata cell layout in `_META`
- whether timestamp-only versioning is sufficient long-term
- whether to later add a revision counter
- deployment instructions for Apps Script
- Google Picker / Sheet selection
- frontend-created Sheet flow beyond Apps Script blank-Sheet initialization
- table editor
- role-based permissions beyond owner/editor

## Decision Log

### 2026-06-10 – Phase 6A MVP Google Sheet schema candidate

Status: Approved for MVP planning; not yet implemented.

Decision:

Use the following Phase 6 MVP Google Sheet schema candidate:

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

Approved CSV header template:

```csv
cardNumber,pin,merchant,startingBalance,currentBalance,dateAdded,dateUpdated,dateUsed,used,notes
```

Field rules:

- `cardNumber`
  - Unique identifier for each gift card.
  - No separate UUID/GUID for MVP.
  - Required.
  - Treated as immutable after creation.
- `pin`
  - Required.
  - User-provided.
- `merchant`
  - Required.
  - Default value for existing/current entries: `walmart-ca`.
  - Added for future merchant flexibility.
  - MVP may treat all cards as Walmart Canada cards.
- `startingBalance`
  - Required.
  - Historical starting value.
  - Does not drive authority after creation.
- `currentBalance`
  - Required.
  - Authoritative current remaining balance.
  - May be greater than `startingBalance`.
  - May not be below zero.
- `dateAdded`
  - Required.
  - Date card was added.
- `dateUpdated`
  - Required.
  - Last date the card balance or editable card state changed.
- `dateUsed`
  - Optional.
  - Set when `used` becomes true.
  - Cleared or left blank when `used` is false.
- `used`
  - Required boolean.
  - Independent of balance.
  - Also serves as archive/hidden state for MVP.
  - No separate `archived` column for MVP.
- `notes`
  - Optional free-form user notes.

Explicit non-schema decisions:

- Sort order is managed by the web app and is not stored in the Google Sheet for MVP.
- `used` is the archive/hidden-state mechanism for MVP.
- The schema is now the Phase 6 MVP candidate but should not be implemented until API and sync decisions are also finalized.

Rationale:

- `cardNumber` is already central to the product and is sufficient as the MVP unique identifier.
- Adding `merchant` and `notes` keeps the Sheet flexible without introducing a complex data model.
- Keeping `currentBalance` authoritative preserves the current product direction.
- Avoiding a separate archive field keeps the MVP spreadsheet simple.

Risks:

- Using `cardNumber` as the unique identifier means duplicate card numbers must be rejected or resolved before sync writes.
- Treating `cardNumber` as immutable requires a clear future UX for correcting entry mistakes.
- `used` serving as archive/hidden state may need to be split from archival behavior in a later version.

Implementation notes:

- Do not change frontend behavior in Phase 6A.
- Do not migrate existing local/prototype data yet.
- Apps Script may later validate or create headers if the connected Sheet is blank, but that behavior remains an open decision.
- Frontend may later provide Copy Header Template and Download CSV Template controls.

### 2026-06-10 – Phase 6B MVP sync behavior and version direction

Status: Approved for MVP planning; not yet implemented.

Decision:

Initial load flow when the user connects Sheets:

```text
Connect Sheets
→ Fetch Sheet
→ Load cards
→ Render UI
```

Connected-session flow:

```text
Completed user action
→ Auto-sync to Apps Script
→ Apps Script updates Google Sheet
→ UI shows saved/error status
```

Auto-sync timing:

- Auto-sync after completed user actions, not every keystroke.
- Auto-sync after:
  - balance save
  - mark used / unmark used
  - notes save
  - merchant change
  - new card save
  - accepted data import
- Do not auto-sync while the user is merely typing.

Sheet version and conflict direction:

- Use a sheet-level sync version/timestamp owned by Apps Script.
- Preferred metadata concept:

```text
_META
lastSheetWriteAt
lastWriteSource
schemaVersion
```

Version rules:

- Frontend stores the last known sheet version after each successful load or sync.
- Before pushing a change, Apps Script compares the frontend's last known version with the current sheet version.
- If versions match, Apps Script applies the write and returns the new sheet version.
- If versions do not match, Apps Script rejects the write as a sync conflict.
- For MVP, timestamp-based versioning is acceptable.
- A revision counter may be considered later if needed.

Rationale:

- Syncing only completed actions reduces unnecessary writes and avoids saving incomplete text input.
- Apps Script-owned sheet metadata keeps the frontend simple and avoids direct Google Sheets access.
- Sheet-level version checks provide a straightforward MVP conflict boundary without adding per-card merge logic.

Risks:

- Timestamp-only versioning may be insufficient if two writes occur with indistinguishable timestamps.
- Sheet-level conflicts may reject changes that could theoretically be merged per card.
- Auto-sync failures can leave the session ahead of the Sheet and require clear user communication.

Implementation notes:

- Do not implement sync until the API contract and error payload format are finalized.
- A revision counter remains available as a future hardening option.
- The Data panel should expose version, unsynced, and conflict details in a user-friendly way when implemented.

### 2026-06-10 – Phase 6B unsynced and conflict handling states

Status: Approved for MVP planning; not yet implemented.

Decision:

Use two separate states: Unsynced State and Sync Conflict State.

#### Unsynced State

Use when:

- network is unavailable
- Apps Script cannot be reached
- save fails
- user session continues but changes are not confirmed in Sheets

Expected UX:

- session continues
- show unsynced badge/status
- show a small dismissible alert
- user can open details in the Data panel

Available actions:

- retry Sheets version check
- retry sync
- download session CSV backup
- dismiss alert

#### Sync Conflict State

Use when:

- Sheet changed since the frontend last loaded/synced
- frontend also has pending/current session changes

Expected UX:

- pause auto-sync
- show conflict badge/status
- show a small dismissible alert
- user can open details in the Data panel

Available actions:

- download session CSV backup
- pull from Sheets and overwrite current session
- use current session and overwrite Sheets
- abort sync / remain disconnected or unresolved

Recommended action:

- Recommend the action based on the most recent known data timestamp where possible.

Rationale:

- A failed save and an actual version conflict are different user problems and need different recovery actions.
- Downloading a session CSV backup gives users a low-tech safety path before destructive resolution.
- Pausing auto-sync during conflicts prevents repeated failed writes or accidental overwrites.

Risks:

- Conflict copy must be precise to avoid users overwriting newer Sheet data accidentally.
- CSV backup must preserve all MVP schema columns when implemented.
- The app must avoid implying that unsynced session data is safely stored in Sheets.

Implementation notes:

- Exact conflict dialog copy remains open.
- Exact API payloads for conflict and unsynced responses remain open.
- Do not implement conflict resolution UI until the sync contract is finalized.

### 2026-06-10 – Phase 6C Apps Script connection and access model

Status: Approved for MVP planning; not yet implemented.

Decision:

Connection model:

- The frontend does not directly access Google Sheets.
- The frontend connects to a user-provided Apps Script Web App URL.
- Apps Script is responsible for:
  - reading the Google Sheet
  - writing the Google Sheet
  - validating schema
  - maintaining sheet-level metadata/version
  - enforcing access through Google permissions

Preferred MVP access model:

```text
Owner + authorized Google users
```

Access goals:

- The same Sheet/App Script connection can be used from desktop and mobile.
- The same authorized user can connect from multiple devices.
- Authorized/shared users can access if granted Google access.
- Google Sheets owns sharing and permission management; Walmart-GC does not manage users, roles, or permissions.
- Avoid public unauthenticated Sheet access for MVP.

Sheet creation direction:

- Do not make frontend-created Google Sheets part of MVP.
- For MVP:
  - user creates or copies a Sheet
  - user deploys/configures Apps Script
  - user pastes Apps Script Web App URL into Walmart-GC
- Future enhancements may include:
  - Google Picker
  - select existing Sheet
  - create new Sheet from a frontend-assisted flow

Rationale:

- A user-provided Apps Script Web App URL keeps the frontend static and GitHub Pages-compatible.
- Google permissions provide access control without adding Walmart-GC accounts.
- Keeping Apps Script as the MVP sync provider avoids adding OAuth implementation and setup burden to Phase 8.
- Avoiding frontend-created Sheets reduces MVP scope and support burden.

Risks:

- Apps Script deployment steps may be confusing and need careful documentation.
- Google permission settings can vary by account type and organization policy.
- Public deployments would create user-data risk and are not the preferred MVP path.

Implementation notes:

- Apps Script deployment instructions remain open.
- Frontend storage of the Apps Script URL must be designed later with security and privacy tradeoffs in mind.
- Do not write Apps Script code in this documentation phase.
- Do not add OAuth setup or implementation tasks for Phase 8.

### 2026-06-10 – Data panel setup and MVP data tooling direction

Status: Approved for MVP planning; not yet implemented.

Decision:

The Data panel should become the setup/sync control center in a future implementation.

Planned MVP controls:

- connection status
- connected Sheet name or URL
- link to open the connected Google Sheet
- Connect Sheets button
- Copy CSV Header Template button
- Download CSV Template button
- Refresh from Sheets
- Download Session CSV
- sync status / unsynced badge details
- conflict resolution actions

If the Card List is empty, future UX should suggest:

```text
No cards loaded. Check your data source.
[Open Data Panel]
```

Template direction:

- Approved header template:

```csv
cardNumber,pin,merchant,startingBalance,currentBalance,dateAdded,dateUpdated,dateUsed,used,notes
```

- Frontend may later provide:
  - Copy Header Template
  - Download CSV Template
- Apps Script may later validate or create headers if the connected Sheet is blank.

Table editor direction:

- Raw CSV textarea remains the active MVP data tool.
- Spreadsheet-style Table Editor is deferred.
- A disabled future button may be added later:

```text
Table Editor *
```

- Suggested tooltip/copy:

```text
Spreadsheet-style editor planned for a future phase
```

- Do not implement the table editor in Phase 6.

Rationale:

- The Data panel is the natural place for source-of-truth setup, sync status, backups, and recovery actions.
- Keeping the raw CSV textarea avoids adding a complex editor before sync is defined.
- Template controls help users prepare Sheets without adding frontend Sheet creation to MVP.

Risks:

- A dense Data panel may be confusing on mobile if controls are not grouped clearly.
- A disabled Table Editor button must not imply the feature is available.

Implementation notes:

- Do not change Data panel behavior in this documentation task.
- Implement setup/sync controls only in Phase 7 or later following the approved architecture summary.

## Historical Open Decisions

The historical decision log above may mention items that were open at the time. The current approved and deferred state is consolidated in the **Phase 6 Approved MVP Architecture Summary** and **Open / Deferred** sections above.

## Decision Template

Use this format for each approved decision:

```md
### YYYY-MM-DD – Decision title

Status: Approved

Decision:
- ...

Rationale:
- ...

Risks:
- ...

Implementation notes:
- ...
```

## Phase 6 Rules

- Treat schema changes as major changes.
- Treat Google Apps Script API contract changes as major changes.
- Treat sync behavior changes as major changes.
- Record approvals before implementation.
- Keep Current Balance authoritative unless a future approved decision changes that.
- Keep Used as an independent boolean unless a future approved decision changes that.
- The Phase 6 MVP architecture is complete, functional, and remains the baseline after Phase 7 sync implementation and Phase 8 validation.
- Phase 8 must focus on documentation, deployment, verification, troubleshooting, diagnostics, hardening, and final UI/UX cleanup, not architecture redesign.
- For core-file changes, `index.html`, `app.js`, and `styles.css` use independent manual debug versions; increment only changed core files and end Codex final summaries with `LIVE VERSION CHECK`.
- OAuth is a future Phase 9 direction only and is not started.
- Before future OAuth work begins, tag the stable MVP, likely as `mvp-apps-script-final`; preserve `main` as the known-good Apps Script MVP; and create a dedicated `phase-9-oauth` branch.
- Future OAuth should move 100% to direct Google OAuth + Google Sheets API access. Apps Script has no long-term support requirement after the MVP is preserved. No migration guarantee is required; CSV export/import is an acceptable fallback path.
