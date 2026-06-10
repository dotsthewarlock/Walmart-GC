# Troubleshooting

This guide covers the active Phase 9 sync path: Google OAuth plus the direct Google Sheets API.

Apps Script troubleshooting is preserved only in historical MVP documentation and does not apply to the active Phase 9 app.

## Quick Checks

1. Open the **Data** panel.
2. Confirm **Google Account** shows connected.
3. Confirm diagnostics show **Sheets scope available**.
4. Confirm **Direct Google Sheet** has a saved Sheet ID.
5. Confirm **Cards sheet initialized** is `yes`.
6. Confirm local and remote `sheetVersion` values are visible after initialize/load/sync.
7. Export a CSV backup before destructive recovery.

## Google Account Will Not Connect

Common causes:

- OAuth Client ID was not saved.
- OAuth Client ID is for the wrong Google project or origin.
- Browser popup, third-party script, or content-blocking policy interfered with Google Identity Services.
- Network is offline.

Actions:

1. Confirm the OAuth Web Client ID is pasted exactly.
2. Confirm the deployed Walmart-GC URL is an authorized JavaScript origin for that OAuth client.
3. Reload the page.
4. Select **Connect Google** again.
5. If diagnostics say the Google script did not load, check network/content blockers.

## Sheets Scope Needs Reconnect

Google access tokens stay in memory and expire. This is expected.

Actions:

1. Select **Connect Google** again.
2. Complete the consent flow.
3. Retry **Load from Google Sheets**, **Initialize Sheet**, or **Sync Now**.

## Direct Sheet URL or ID Is Rejected

Actions:

1. Open the Sheet in Google Sheets.
2. Copy the full browser URL or the spreadsheet ID between `/d/` and `/edit`.
3. Paste it into **Google Sheet URL or ID**.
4. Select **Save Sheet**.

## Initialize Sheet Fails

Common causes:

- The Google account does not have edit access.
- The Sheets API is not enabled for the OAuth project.
- The workbook already contains incompatible data.
- Google returned a temporary API error.

Actions:

1. Confirm the connected Google account can edit the Sheet.
2. Confirm the Sheet is the intended workbook.
3. If the workbook has useful data, inspect it before initializing.
4. Retry after reconnecting Google.

## Load from Google Sheets Fails

Common causes:

- Missing or modified `Cards` headers.
- Duplicate `cardNumber` values.
- Invalid balances or used values.
- Google authorization expired.

Actions:

1. Open the `Cards` tab.
2. Confirm the header row matches the approved schema.
3. Remove duplicate card numbers.
4. Fix invalid balances or `used` values.
5. Reconnect Google and select **Load from Google Sheets** again.

## Sync Now or Completed-Action Sync Fails

Completed actions include balance save, used-state change, notes save, merchant change, new card save, and accepted CSV import.

If sync fails:

- Local data remains in the browser.
- Unsynced state remains visible.
- CSV export remains available.
- The Sheet is not assumed updated unless Walmart-GC reports success.

Actions:

1. Reconnect Google if Sheets scope is unavailable.
2. Confirm a direct Sheet ID is configured.
3. Confirm the Sheet was initialized or loaded so Walmart-GC has a safe local `sheetVersion`.
4. Select **Sync Now**.
5. If conflict appears, use conflict recovery instead of retrying repeatedly.

## Conflict Detected

A conflict means the remote Sheet version changed since the current session last loaded or synced.

Actions:

1. Export a CSV backup of the current local session if needed.
2. Choose **Refresh from Sheets** to replace local browser data with the remote Sheet.
3. Or choose **Use Current Session to Overwrite Sheets** only when you intentionally want to replace all card rows in the configured Sheet.

Walmart-GC does not automatically merge conflicts.

## CSV Backup and Recovery

Use CSV export before major changes, imports, or conflict recovery. CSV import updates the local browser session first; direct sync writes accepted imports only after authorization, configuration, and conflict checks succeed.
