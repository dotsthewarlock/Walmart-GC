# Manual Test Plan

This manual test plan validates the active Phase 10E Worker-backed architecture:

```text
User Google Account ↔ Cloudflare Worker OAuth session ↔ Google Drive/Sheets APIs ↔ Walmart-GC Web App
```

## Test Environment

Record:

| Item | Value |
| --- | --- |
| Browser/device |  |
| Walmart-GC URL |  |
| Frontend token/session storage absent? |  |
| Active Sheet name/ID |  |
| Starting card count |  |
| HTML/JS/CSS debug versions |  |

## Setup Checklist

- [ ] App loads from a static URL.
- [ ] Debug fingerprint is visible in the header.
- [ ] Data panel shows Google Account, Google Sheet, CSV Backup & Recovery, and diagnostics/status output.
- [ ] No user-facing OAuth Client ID input appears.
- [ ] No normal first-run Sheet URL/ID input appears.
- [ ] No active Apps Script setup, URL field, health check, or Apps Script load button appears.
- [ ] CSV export is available before sync testing.

## Google Account and Sheet Lifecycle

- [ ] First-run blank user opens the app with no Google connection and no local cards.
- [ ] Diagnostics show Worker session **Disconnected**, Sheet proxy **Needs setup**, local card count, and offline/local availability.
- [ ] Select **Connect Google**.
- [ ] Complete Google consent.
- [ ] OAuth requests `https://www.googleapis.com/auth/drive.file` and does not request broad `spreadsheets` or full `drive` scope.
- [ ] Callback returns to `https://walmart-gc.dotsthewarlock.com/?auth=connected` and then removes the query parameter from browser history.
- [ ] No `session_id` query parameter appears.
- [ ] Diagnostics show Worker session **Connected** and frontend token/session ID storage is absent.
- [ ] Refresh the app and confirm connection persists.
- [ ] Restart the browser and confirm the Worker session persists.
- [ ] Select **Ensure Sheet**.
- [ ] Worker searches for `Walmart-GC Data`.
- [ ] If missing, app creates `Walmart-GC Data`.
- [ ] App stores the active Sheet ID locally.
- [ ] Worker initializes `Cards` headers.
- [ ] Worker initializes hidden `_META` metadata with `sheetVersion`.
- [ ] Diagnostics show Sheet proxy **Ready**, active Sheet ID/name, local sheetVersion, and remote sheetVersion if known.
- [ ] **Open Sheet** opens the active Google Sheet.
- [ ] Logout/disconnect clears the Worker session.
- [ ] Local cards and saved Sheet state remain available.
- [ ] Reconnect Google and confirm it reuses the saved/found Sheet.

## First-Run Data Safety

- [ ] Blank remote Sheet with no meaningful local cards leaves the app ready with an empty card list.
- [ ] Blank remote Sheet with local cards does not upload local cards automatically; **Sync Now** is explicit.
- [ ] Remote Sheet with cards does not replace local unsynced cards automatically; **Load from Google Sheets** is explicit.

## Completed-Action Sync

Verify each action syncs only after the action is completed:

- [ ] Balance save updates `currentBalance` and `dateUpdated` in Google Sheets.
- [ ] Used-state change updates `used` and `dateUsed` in Google Sheets.
- [ ] Notes save syncs to Google Sheets.
- [ ] Merchant change syncs to Google Sheets.
- [ ] New card save syncs to Google Sheets.
- [ ] Accepted CSV import creates an unsynced pending operation if sync is not ready, then syncs after **Sync Now** when ready.
- [ ] No sync is attempted on every keystroke while editing fields.

## CSV Backup & Recovery

- [ ] Export CSV downloads the current local cards.
- [ ] Import CSV previews/loads accepted rows locally.
- [ ] Accepted CSV import preserves approved headers and schema.
- [ ] CSV remains available while Google is disconnected.

## Offline / Disconnected Behavior

- [ ] Disconnect Google or simulate offline/network unavailable.
- [ ] Make a local completed action.
- [ ] Local data remains visible after refresh.
- [ ] Unsynced guidance appears.
- [ ] Reconnect Google.
- [ ] Select **Sync Now**.
- [ ] Data syncs without erasing local changes.

## Conflict Handling

- [ ] Load the Sheet in Walmart-GC.
- [ ] Modify the Sheet externally so the remote sheet version changes.
- [ ] Make a local completed action.
- [ ] Confirm Walmart-GC detects conflict and does not silently overwrite.
- [ ] Download a CSV backup from conflict recovery.
- [ ] Choose **Refresh from Sheets** and confirm local data is replaced only after the explicit action.
- [ ] Repeat conflict setup and choose **Use Current Session to Overwrite Sheets** only after explicit confirmations.

## Diagnostics

Confirm diagnostics include readable compact label/value rows for:

- [ ] Worker session: **Connected**, **Disconnected**, or **Unavailable**.
- [ ] Sheet proxy: **Ready**, **Needs setup**, or **Error**.
- [ ] Active Sheet ID.
- [ ] Active Sheet name.
- [ ] Local sheetVersion.
- [ ] Remote sheetVersion, if known.
- [ ] Sync state.
- [ ] Unsynced changes.
- [ ] Last successful sync.
- [ ] Last Worker/API error.
- [ ] Local card count.
- [ ] Offline/local availability.

## Final Validation Checklist

- [ ] First-run blank user.
- [ ] OAuth connect.
- [ ] Refresh persistence.
- [ ] Browser restart persistence.
- [ ] Logout clears session.
- [ ] Ensure Sheet.
- [ ] Load cards.
- [ ] Edit balance sync.
- [ ] Used flag sync.
- [ ] Notes sync.
- [ ] Merchant sync.
- [ ] New card sync.
- [ ] Accepted CSV import sync.
- [ ] Conflict detection.
- [ ] CSV export.
- [ ] Offline/local behavior.
- [ ] Mobile Chrome smoke test.
- [ ] Mobile Safari smoke test.

## Regression Checks

- [ ] Existing local cards render.
- [ ] Barcode display still works for Walmart Canada cards.
- [ ] PIN display still works.
- [ ] Hide used / hide zero-balance settings still work.
- [ ] Mobile navigation between list/detail/settings/data still works.
