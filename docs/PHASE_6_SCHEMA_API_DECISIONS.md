# Phase 6 – Schema & API Decisions

Status: Planning; MVP architecture decisions recorded, API contract still open.

This document records approved Phase 6 decisions before implementation.

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

Phase 6 is a design and documentation phase. The decisions below must not be treated as permission to implement sync yet.

Do not implement until the Apps Script API contract decisions are finalized:

- Apps Script endpoints
- request and response payloads
- error payload format
- schema validation response format
- exact metadata storage location
- deployment instructions

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
- Avoiding frontend-created Sheets reduces MVP scope and support burden.

Risks:

- Apps Script deployment steps may be confusing and need careful documentation.
- Google permission settings can vary by account type and organization policy.
- Public deployments would create user-data risk and are not the preferred MVP path.

Implementation notes:

- Apps Script deployment instructions remain open.
- Frontend storage of the Apps Script URL must be designed later with security and privacy tradeoffs in mind.
- Do not write Apps Script code in this documentation phase.

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
- Implement setup/sync controls only after the API contract is approved.

## Open Decisions Still To Resolve Later

The following items are open and are not approved implementation details:

- exact Apps Script API endpoints
- request/response payloads
- error payload format
- schema validation response format
- exact metadata storage location
- exact conflict dialog copy
- whether timestamp-only versioning is sufficient or a revision counter is needed
- Apps Script deployment instructions
- whether Apps Script should auto-create headers on blank Sheet

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
- The Phase 6 MVP schema candidate is approved for planning, but implementation must wait until API and sync contract decisions are finalized.
