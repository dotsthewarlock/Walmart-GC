# Manual Test Plan

This manual test plan validates the active Phase 9 architecture:

```text
User Google Account ↔ Google OAuth ↔ Google Sheets API ↔ Walmart-GC Web App
```

## Test Environment

Record:

| Item | Value |
| --- | --- |
| Browser/device |  |
| Walmart-GC URL |  |
| OAuth Client ID configured |  |
| Google Sheet URL/ID |  |
| Starting card count |  |
| HTML/JS/CSS debug versions |  |

## Setup Checklist

- [ ] App loads from a static URL.
- [ ] Debug fingerprint is visible in the header.
- [ ] Data panel shows sections in this order: Google Account, Direct Google Sheet, CSV Backup & Recovery, Diagnostics/status output.
- [ ] No active Apps Script setup, URL field, health check, or load button appears.
- [ ] CSV export is available before sync testing.

## Google Account

- [ ] Paste a Google OAuth Web Client ID.
- [ ] Select **Save Client ID**.
- [ ] Select **Connect Google**.
- [ ] Complete Google consent.
- [ ] Diagnostics show OAuth configured.
- [ ] Diagnostics show Google connection is connected.
- [ ] Diagnostics show Sheets scope is available.
- [ ] Disconnect Google.
- [ ] Local cards and direct Sheet settings remain available.
- [ ] Reconnect Google.

## Direct Google Sheet

- [ ] Paste a valid Google Sheet URL or ID.
- [ ] Select **Save Sheet**.
- [ ] Diagnostics show Direct Sheet ID configured.
- [ ] Select **Initialize Sheet** on a blank workbook.
- [ ] Confirm `Cards` headers exist.
- [ ] Confirm `_META` exists and stores a sheet version.
- [ ] Select **Load from Google Sheets**.
- [ ] Existing rows load into the app.

## Completed-Action Sync

Verify each action syncs only after the action is completed:

- [ ] Balance save updates `currentBalance` and `dateUpdated` in Google Sheets.
- [ ] Used-state change updates `used` and `dateUsed` in Google Sheets.
- [ ] Notes save syncs to Google Sheets.
- [ ] Merchant change syncs to Google Sheets.
- [ ] New card save syncs to Google Sheets.
- [ ] Accepted CSV import creates an unsynced pending operation if direct sync is not ready, then syncs after **Sync Now** when ready.
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

Confirm diagnostics include readable label/value rows for:

- [ ] OAuth configured.
- [ ] Google script loaded.
- [ ] Google connection state.
- [ ] Sheets scope available / needs reconnect.
- [ ] Direct Sheet ID configured.
- [ ] Cards sheet initialized.
- [ ] Local sheetVersion.
- [ ] Remote sheetVersion, if known.
- [ ] Sync state.
- [ ] Unsynced changes.
- [ ] Last successful sync.
- [ ] Last direct Sheets error.
- [ ] Local card count where useful.

## Regression Checks

- [ ] Existing local cards render.
- [ ] Barcode display still works for Walmart Canada cards.
- [ ] PIN display still works.
- [ ] Hide used / hide zero-balance settings still work.
- [ ] Mobile navigation between list/detail/settings/data still works.
