# Manual Test Plan

## Purpose

This Phase 8B manual test plan verifies the Walmart-GC MVP end-to-end before Phase 8C hardening and diagnostics work begins.

The plan validates the approved MVP architecture without redesigning it:

```text
User Google Sheet ↔ Google Apps Script Web App ↔ Walmart-GC Web App
```

Use this plan to confirm that the documented setup and current implementation behavior work repeatably across the core MVP workflows:

- Fresh setup from an empty browser state.
- Google Sheet setup using the approved `Cards` schema.
- Google Apps Script Web App setup and Health Check.
- Connection workflow from the Data panel.
- Loading cards from Google Sheets.
- Syncing completed app actions back to Sheets.
- Offline behavior and local persistence.
- Sync failure, conflict detection, and recovery.
- CSV backup/export safety paths.
- Mobile checkout usability.
- Target-scale usage with 30-100 cards.

This is a verification plan only. Record issues found during testing and route product or implementation fixes to Phase 8C unless the fix is documentation-only.

## Reference Documents

Review these documents before running the plan:

- [Deployment Guide](DEPLOYMENT_GUIDE.md)
- [Apps Script Setup](APPS_SCRIPT_SETUP.md)
- [Google Sheet Setup](GOOGLE_SHEET_SETUP.md)
- [Troubleshooting](TROUBLESHOOTING.md)
- [Phase 6 Schema & API Decisions](PHASE_6_SCHEMA_API_DECISIONS.md)
- [Roadmap](ROADMAP.md)
- [AI Handoff](AI_HANDOFF.md)

## Test Environment

Record one environment row per test pass. Use additional rows when repeating the plan on another browser, device, or deployment.

| Field | Value |
| --- | --- |
| Tester name or initials |  |
| Test date |  |
| Browser and version |  |
| Device |  |
| Operating system |  |
| GitHub Pages URL |  |
| Apps Script Web App URL |  |
| Google Sheet name |  |
| Google account / Workspace type, if relevant |  |
| Notes |  |

### Environment Checklist

- [ ] Browser local storage is available and not blocked by privacy settings.
- [ ] Network access is available for initial setup and sync testing.
- [ ] Tester can edit the target Google Sheet.
- [ ] Tester can access the deployed Apps Script Web App URL.
- [ ] Tester can download files for CSV export/backup tests.
- [ ] Tester has a way to simulate offline mode or temporarily disable network access.
- [ ] Tester has access to a mobile device, browser device emulation, or narrow mobile viewport for checkout testing.

## Result Format

Use this result block for each test section.

```text
Status: Not Run / Pass / Fail / Blocked
Tester:
Date:
Environment:
Notes:
```

Suggested status definitions:

- **Not Run**: The test has not been attempted.
- **Pass**: Steps completed and expected results were observed.
- **Fail**: Steps completed, but actual behavior did not match expected results.
- **Blocked**: The test could not be completed because of an environment, access, deployment, or setup blocker.

## Pre-Test Setup

Complete setup using the existing guides rather than duplicating every setup step here.

Required before most tests:

- [ ] Walmart-GC is deployed and reachable. See [Deployment Guide](DEPLOYMENT_GUIDE.md).
- [ ] Google Sheet exists with the approved `Cards` headers. See [Google Sheet Setup](GOOGLE_SHEET_SETUP.md).
- [ ] Apps Script Web App is deployed from `apps-script/Code.gs`. See [Apps Script Setup](APPS_SCRIPT_SETUP.md).
- [ ] Valid Apps Script Web App `/exec` URL is available.
- [ ] At least one test gift card row exists for load and sync tests, unless running the empty-sheet test.
- [ ] Browser local storage is available.
- [ ] Tester has a backup path before destructive recovery tests, such as **Export CSV**, **Download Session CSV Backup**, or a copied Google Sheet.

Approved `Cards` header row:

```csv
cardNumber,pin,merchant,startingBalance,currentBalance,dateAdded,dateUpdated,dateUsed,used,notes
```

Recommended seed row for non-production testing:

```csv
6098765432101111,1111,walmart-ca,10.00,10.00,2026-06-10,2026-06-10,,false,Manual test seed card
```

## Test 1: Fresh Setup Test

Verifies that a new user can start from an empty app state and connect to Apps Script.

### Steps

- [ ] Open Walmart-GC in a browser profile or tab with cleared site data for the deployed URL.
- [ ] Confirm the app loads without requiring a server, account, or build step.
- [ ] Confirm no cards are shown or the expected empty card state is shown.
- [ ] Open the **Data** panel with the `▦` navigation button.
- [ ] Optionally open **Settings** with the `⚙` navigation button and confirm settings are available.
- [ ] Enter the deployed Apps Script Web App `/exec` URL in **Apps Script URL**.
- [ ] Select **Save Connection**.
- [ ] Select **Test Connection**.

### Expected Result

- [ ] App accepts and saves the Apps Script URL.
- [ ] Health Check succeeds.
- [ ] Connection status displays as connected or equivalent success state.
- [ ] Connection details show Sheet/schema information when available.
- [ ] The app indicates that cards can be loaded from Sheets.

```text
Status: Not Run / Pass / Fail / Blocked
Tester:
Date:
Environment:
Notes:
```

## Test 2: Google Sheet Load Test

Verifies loading valid card rows from Google Sheets into the app.

### Steps

- [ ] Prepare the Google Sheet with approved headers and at least two valid card rows.
- [ ] Include varied values for `pin`, `merchant`, `startingBalance`, `currentBalance`, `notes`, and `used`.
- [ ] Open Walmart-GC and complete a successful **Test Connection** if needed.
- [ ] Select **Load from Sheets** in the Data panel.
- [ ] Confirm cards appear in the Card List.
- [ ] Open each loaded card in Card Detail.
- [ ] Compare visible card details against the Sheet values.
- [ ] Confirm balance, PIN, merchant, notes, and Used state display correctly.
- [ ] Return to the Data panel and check that Sheet version or sync metadata is shown when available.

### Expected Result

- [ ] Valid Sheet rows load correctly.
- [ ] No duplicate cards are created unexpectedly.
- [ ] Card Detail values match the Sheet data.
- [ ] The app stores Sheet version metadata for future safe writes.
- [ ] Sync state is connected/synced after a successful load.

```text
Status: Not Run / Pass / Fail / Blocked
Tester:
Date:
Environment:
Notes:
```

## Test 3: Empty Sheet Test

Verifies blank-sheet behavior when the schema is valid but no card rows exist.

### Steps

- [ ] Use a test Google Sheet with the approved header row and no card rows.
- [ ] Connect Walmart-GC to the Apps Script Web App for that Sheet.
- [ ] Select **Test Connection**.
- [ ] Select **Load from Sheets**.
- [ ] Confirm the app shows the empty card state.
- [ ] Add the first card from the app if the current UI exposes an app-based add/import path.

### Expected Result

- [ ] Load succeeds.
- [ ] App shows the empty card state.
- [ ] No error is shown for a valid empty Sheet.
- [ ] User can add or import the first card from the app using current exposed UI paths.

```text
Status: Not Run / Pass / Fail / Blocked
Tester:
Date:
Environment:
Notes:
```

## Test 4: New Card Sync Test

Verifies app-to-Sheet creation through the current UI. In the MVP UI, new card creation may be performed through the Data panel CSV/raw data import workflow rather than a dedicated Add Card form.

### Steps

- [ ] Start from a connected/synced app session loaded from Sheets.
- [ ] Export a CSV backup before changing data.
- [ ] Add a new card in Walmart-GC using the current exposed UI path, such as **Import CSV**, raw data **Unlock Editing** plus **Update Data**, or a dedicated add-card flow if present.
- [ ] Use a unique `cardNumber`.
- [ ] Leave `merchant` blank only if the current UI/import path allows testing the default behavior safely.
- [ ] Save or accept the card addition.
- [ ] Confirm the sync status after the completed action.
- [ ] Open the Google Sheet and find the new row.

### Expected Result

- [ ] New card appears in the Sheet.
- [ ] Required fields are preserved.
- [ ] `merchant` defaults appropriately, typically to `walmart-ca`, if not specified and the implementation supports defaulting on that path.
- [ ] `dateAdded` and `dateUpdated` behavior matches the implementation.
- [ ] App remains connected/synced if the write succeeds.

```text
Status: Not Run / Pass / Fail / Blocked
Tester:
Date:
Environment:
Notes:
```

## Test 5: Balance Update Sync Test

Verifies balance changes sync after completed card actions.

### Steps

- [ ] Start from a connected/synced app session loaded from Sheets.
- [ ] Open an existing card in Card Detail.
- [ ] Select **Update Balance**.
- [ ] Change the current balance using the supported balance update workflow.
- [ ] Save the balance update.
- [ ] Confirm sync status in the app.
- [ ] Open the Google Sheet and inspect the matching row.

### Expected Result

- [ ] `currentBalance` updates in the Sheet.
- [ ] `startingBalance` remains historical and is not changed by the balance update.
- [ ] `dateUpdated` updates according to the implementation.
- [ ] App remains in Connected/Synced state if sync succeeds.

```text
Status: Not Run / Pass / Fail / Blocked
Tester:
Date:
Environment:
Notes:
```

## Test 6: Used State Sync Test

Verifies Used state sync and confirms Used is independent of balance.

### Steps

- [ ] Start from a connected/synced app session loaded from Sheets.
- [ ] Open an existing non-used card.
- [ ] Select **Mark Used**.
- [ ] Confirm the action if prompted.
- [ ] Check the matching Sheet row.
- [ ] If the current UI supports unmarking, unmark the card as used.
- [ ] Check the Sheet row again.

### Expected Result

- [ ] `used` syncs correctly to the Sheet.
- [ ] `dateUsed` is set when `used` becomes true, according to the implementation.
- [ ] `dateUsed` is cleared or left blank when `used` is false, according to the implementation.
- [ ] Balance is not automatically forced unless the implementation explicitly does so.
- [ ] Used state remains independent of current balance.

```text
Status: Not Run / Pass / Fail / Blocked
Tester:
Date:
Environment:
Notes:
```

## Test 7: Notes and Merchant Sync Test

Verifies secondary editable fields that are part of the approved schema.

### Steps

- [ ] Start from a connected/synced app session loaded from Sheets.
- [ ] Edit `notes` through the current UI if exposed.
- [ ] Save the change.
- [ ] Verify the Sheet row updates.
- [ ] Edit `merchant` through the current UI if exposed.
- [ ] Save the change.
- [ ] Verify the Sheet row updates.
- [ ] If either field is not directly editable in Card Detail, test it through the supported Data panel import/raw data workflow and note the UI limitation.

### Expected Result

- [ ] Notes persist locally and sync to the Sheet when edited through a supported UI path.
- [ ] Merchant persists and syncs according to the approved schema when edited through a supported UI path.
- [ ] Unsupported direct-edit paths are documented as not applicable rather than treated as failures.

```text
Status: Not Run / Pass / Fail / Blocked
Tester:
Date:
Environment:
Notes:
```

## Test 8: Batch / Import Sync Test

Verifies accepted imports sync through the batch update path when import is exposed in the current UI.

### Applicability

The current Data panel exposes CSV/raw data tools. If the deployed UI being tested does not expose import, mark this test **Not Run** or **Blocked** and explain why.

### Steps

- [ ] Start from a connected/synced app session loaded from Sheets.
- [ ] Export a CSV backup.
- [ ] Prepare a CSV with multiple valid card rows and unique card numbers.
- [ ] Select **Import CSV**, or unlock and edit raw data if that is the chosen path.
- [ ] Accept or apply the import with **Update Data**.
- [ ] Confirm the local Card List reflects the accepted import.
- [ ] Open the Google Sheet and confirm expected rows exist.
- [ ] Repeat with a rejected or cancelled import path if the UI supports cancellation.
- [ ] Try an intentional duplicate card number only in a disposable test Sheet/session.

### Expected Result

- [ ] Accepted import syncs after completion when the app is connected with a known Sheet version.
- [ ] Rejected or cancelled import does not sync.
- [ ] Duplicate handling matches implementation behavior and does not silently corrupt data.
- [ ] The app reports validation issues clearly enough to route follow-up to Phase 8C if needed.

```text
Status: Not Run / Pass / Fail / Blocked
Tester:
Date:
Environment:
Notes:
```

## Test 9: Offline Mode Test

Verifies offline usability for previously loaded cards and expected Unsynced behavior for failed writes.

### Steps

- [ ] Load cards successfully while online.
- [ ] Confirm Card List, Card Detail, Data panel, and checkout mode are usable online.
- [ ] Disable network access or use browser offline mode.
- [ ] Continue using the current tab, or close and reopen the app if the browser/device supports doing so offline.
- [ ] View loaded cards.
- [ ] Open full-screen checkout mode.
- [ ] View a barcode and PIN.
- [ ] Modify a card if the current UI supports local edits while offline.
- [ ] Observe sync state after the attempted write.
- [ ] Restore network access.
- [ ] Run **Test Connection** and retry sync if the UI offers **Retry Sync** or another recovery action.

### Expected Result

- [ ] Previously loaded cards remain usable from local browser storage.
- [ ] App does not lose local data while offline.
- [ ] Checkout mode remains useful without spreadsheet access.
- [ ] Failed Sheet writes result in Unsynced or another relevant error state.
- [ ] User can retry or recover after reconnecting.

```text
Status: Not Run / Pass / Fail / Blocked
Tester:
Date:
Environment:
Notes:
```

## Test 10: Sync Failure Test

Verifies failed sync preserves local data and can recover when service availability is restored.

### Steps

- [ ] Start from a connected/synced app session loaded from Sheets.
- [ ] Export a CSV backup.
- [ ] Enter an invalid Apps Script URL, temporarily break network access, or otherwise make Apps Script unreachable.
- [ ] Make a completed local change, such as a balance update or used-state update.
- [ ] Observe sync status and any error details.
- [ ] Restore the valid Apps Script URL or network access.
- [ ] Select **Test Connection**.
- [ ] Select **Retry Sync** if shown, or follow the Data panel recovery path.
- [ ] Verify the Google Sheet after recovery.

### Expected Result

- [ ] Local change is preserved in the browser session.
- [ ] App shows Unsynced or a relevant error state.
- [ ] Error copy does not imply the data was lost.
- [ ] Retry can recover when the service is available and no conflict exists.

```text
Status: Not Run / Pass / Fail / Blocked
Tester:
Date:
Environment:
Notes:
```

## Test 11: Conflict Handling Test

Verifies optimistic concurrency behavior when Sheet data changes independently after the app loads.

### Steps

- [ ] Start from a connected/synced app session loaded from Sheets.
- [ ] Note the card and balance values currently loaded in the app.
- [ ] In the Google Sheet, modify the same card row externally, or sync a change from another browser/device.
- [ ] Return to the original app session without reloading from Sheets.
- [ ] Attempt a completed app sync from the stale state, such as updating balance or used state.
- [ ] Observe the sync status, error details, and available recovery actions.

### Expected Result

- [ ] No silent overwrite occurs.
- [ ] Conflict state appears when Apps Script detects the Sheet version changed.
- [ ] User is offered recovery options in the Data panel.
- [ ] Local browser data remains recoverable.
- [ ] The app does not automatically merge or automatically run `replaceAll`.

```text
Status: Not Run / Pass / Fail / Blocked
Tester:
Date:
Environment:
Notes:
```

## Test 12: Conflict Recovery Test

Verifies each recovery path that exists in the UI.

### Steps

- [ ] Put the app into Conflict state using Test 11 in a disposable test Sheet/session.
- [ ] Confirm **Download Session CSV Backup** or equivalent CSV backup action is available.
- [ ] Download the session CSV backup.
- [ ] Try **Retry Sync** if shown and record whether conflict remains or resolves.
- [ ] Choose the Sheet-wins path: **Refresh from Sheets and Replace Local Session**, then verify local cards match the Sheet.
- [ ] Recreate conflict if needed.
- [ ] Choose the browser-session-wins path only in a disposable test Sheet/session: **Use Current Session to Overwrite Sheets**.
- [ ] Confirm that explicit prompts or confirmations are required before overwrite.
- [ ] Verify the Sheet after successful recovery.

### Expected Result

- [ ] User action is required for destructive recovery.
- [ ] `replaceAll` is not automatic.
- [ ] CSV backup can be produced before risky recovery.
- [ ] Refresh-from-Sheets replaces the local session with Sheet data only after user action.
- [ ] Use-current-session overwrite replaces Sheet card rows only after explicit confirmation.
- [ ] App returns to Connected/Synced or the expected state after successful recovery.

```text
Status: Not Run / Pass / Fail / Blocked
Tester:
Date:
Environment:
Notes:
```

## Test 13: CSV Backup / Export Test

Verifies emergency backup and normal export paths.

### Steps

- [ ] Load cards into Walmart-GC.
- [ ] Open the Data panel.
- [ ] Select **Export CSV**.
- [ ] Confirm a CSV file downloads.
- [ ] Open the downloaded CSV in a text editor or spreadsheet tool.
- [ ] Confirm the header row matches the approved schema.
- [ ] Confirm expected card data is present.
- [ ] If in Unsynced or Conflict state, select **Download Session CSV Backup** if shown and repeat the file checks.

### Expected Result

- [ ] CSV contains expected schema and card data.
- [ ] Export works during normal operation.
- [ ] Session CSV backup works during recovery scenarios when exposed by the UI.
- [ ] Exported data is sufficient to support emergency manual recovery.

```text
Status: Not Run / Pass / Fail / Blocked
Tester:
Date:
Environment:
Notes:
```

## Test 14: Mobile Checkout Test

Verifies mobile-first checkout usability.

### Steps

- [ ] Open Walmart-GC on a mobile device, or use a narrow mobile viewport.
- [ ] Load cards from Sheets or confirm previously loaded cards are available locally.
- [ ] Enter full-screen checkout mode.
- [ ] Navigate between cards.
- [ ] View barcode for a selected card.
- [ ] View PIN for the selected card.
- [ ] Mark as used or update balance if supported in checkout mode.
- [ ] Rotate the device or test another small viewport if practical.
- [ ] Record any obvious layout blockers, clipped controls, unreadable text, or tap-target issues.

### Expected Result

- [ ] Barcode and PIN are quickly accessible.
- [ ] Navigation is usable on small screens.
- [ ] Checkout mode does not require spreadsheet access during checkout.
- [ ] No obvious layout blockers prevent checkout use.
- [ ] Any usability concerns are recorded for Phase 8C rather than fixed in this test-plan PR.

```text
Status: Not Run / Pass / Fail / Blocked
Tester:
Date:
Environment:
Notes:
```

## Test 15: Persistence Test

Verifies local persistence for cards, settings, connection details, and sync metadata.

### Steps

- [ ] Load cards successfully from Sheets.
- [ ] Save the Apps Script URL if not already saved.
- [ ] Change a non-destructive setting, such as display/sort preferences.
- [ ] Confirm current sync state and Sheet version details are visible when available.
- [ ] Close the browser tab.
- [ ] Reopen Walmart-GC at the same URL in the same browser profile.
- [ ] Confirm cards remain available.
- [ ] Confirm the Apps Script URL remains saved.
- [ ] Confirm settings remain saved.
- [ ] Confirm sync state metadata remains available or the app accurately indicates what must be refreshed.

### Expected Result

- [ ] Cards persist locally.
- [ ] Settings persist locally.
- [ ] Apps Script URL persists locally.
- [ ] Sync state metadata persists sufficiently for the current implementation.
- [ ] User does not need to reconnect every session in the same browser profile.

```text
Status: Not Run / Pass / Fail / Blocked
Tester:
Date:
Environment:
Notes:
```

## Test 16: Schema Validation Test

Verifies invalid Sheet setup fails clearly and does not silently corrupt local state.

Use a disposable test Sheet for these cases.

### Test Cases

- [ ] Missing required header.
- [ ] Renamed header.
- [ ] Header order changed.
- [ ] Duplicate `cardNumber`.
- [ ] Invalid `startingBalance` or `currentBalance` value.
- [ ] Invalid `used` value, if Apps Script/UI validation applies on the tested path.
- [ ] Multiple visible schema-valid sheets without a clear `Cards` sheet, if practical.

### Steps

- [ ] Start with a known-good Sheet and confirm Health Check/Load succeeds.
- [ ] Introduce one invalid setup case at a time.
- [ ] Run **Test Connection** and/or **Load from Sheets**.
- [ ] Record the message, error code, and whether troubleshooting guidance is actionable.
- [ ] Restore the Sheet to a valid state before testing the next case.

### Expected Result

- [ ] App or Apps Script reports a clear setup or validation issue.
- [ ] User can resolve the issue using setup and troubleshooting docs.
- [ ] Invalid data does not silently corrupt local state.
- [ ] Any unclear diagnostics are recorded as Phase 8C candidates.

```text
Status: Not Run / Pass / Fail / Blocked
Tester:
Date:
Environment:
Notes:
```

## Test 17: Large Sheet Smoke Test

Verifies the MVP target scale of 30-100 gift cards. Do not optimize as part of this test; record findings only.

### Steps

- [ ] Prepare a test Sheet with 30-100 valid card rows.
- [ ] Include a mix of unused, partial-balance, zero-balance, and used cards.
- [ ] Run **Test Connection**.
- [ ] Select **Load from Sheets** and record approximate load time.
- [ ] Scroll and use the Card List.
- [ ] Open several Card Detail views.
- [ ] Enter checkout mode and navigate through several cards.
- [ ] Sync one card update.
- [ ] Export CSV.
- [ ] Record any performance, usability, or readability issues.

### Expected Result

- [ ] App remains usable at MVP target scale.
- [ ] List and detail interactions remain practical.
- [ ] Checkout navigation remains usable.
- [ ] One-card sync succeeds.
- [ ] CSV export succeeds.
- [ ] No major performance blockers are found, or blockers are recorded for Phase 8C.

```text
Status: Not Run / Pass / Fail / Blocked
Tester:
Date:
Environment:
Notes:
```

## Known Issues and Findings

Record findings discovered while running this plan. Actual fixes belong in Phase 8C unless the follow-up is documentation-only and safe to correct immediately.

| ID | Area | Severity | Description | Suggested follow-up | Phase 8C candidate? |
| --- | --- | --- | --- | --- | --- |
|  |  | Low / Medium / High / Critical |  |  | Yes / No |
|  |  | Low / Medium / High / Critical |  |  | Yes / No |
|  |  | Low / Medium / High / Critical |  |  | Yes / No |

Suggested severity definitions:

- **Critical**: Data loss, silent overwrite, or inability to complete MVP setup.
- **High**: Core sync, load, conflict recovery, or checkout workflow fails.
- **Medium**: Important workflow is confusing, unreliable, or requires unclear workarounds.
- **Low**: Cosmetic, wording, minor usability, or documentation follow-up.

## Phase 8C Handoff

At the end of a test pass, summarize findings for Phase 8C.

Recommended handoff checklist:

- [ ] Attach or reference completed test result blocks.
- [ ] Include environment details for each failure or blocker.
- [ ] Include screenshots or copied error messages when available.
- [ ] Include CSV backups or sample rows only if they do not expose sensitive real gift card data.
- [ ] Separate documentation-only corrections from implementation hardening work.
- [ ] Prioritize data safety, setup reliability, and checkout usability issues.

Examples of Phase 8C candidates:

- Unclear diagnostics.
- Weak error messages.
- Apps Script validation edge cases.
- Large-sheet performance issues.
- Missing Health Check details.
- Confusing conflict recovery UX.
- Recovery actions that need clearer warnings.
- Offline or retry flows that preserve data but do not explain the next step clearly.

Phase 8C should use these findings to harden the existing MVP architecture. It should not redesign the schema, Apps Script API, sync provider, conflict strategy, or connection model unless a concrete MVP blocker is confirmed and explicitly approved.
