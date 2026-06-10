# Troubleshooting

This guide helps recover from common Walmart-GC setup, connection, load, sync, conflict, and CSV issues.

Walmart-GC uses this MVP architecture:

```text
User Google Sheet ↔ Google Apps Script Web App ↔ Walmart-GC Web App
```

The Google Sheet is the source of truth. Apps Script is the integration layer. Walmart-GC is the browser frontend.

## Quick Diagnostic Checklist

Start here when something does not work:

1. Confirm the Google Sheet opens in the Google account that deployed Apps Script.
2. Confirm the Sheet has a `Cards` tab with the approved headers.
3. Confirm Apps Script is deployed as a Web App.
4. Confirm the URL in Walmart-GC ends in `/exec`.
5. In Walmart-GC, open **Data** and select **Save Connection**.
6. Select **Test Connection**.
7. If Health Check succeeds, select **Load from Sheets**.
8. If a write fails, check whether the app shows **Unsynced** or **Conflict**.

## Cannot Connect

### Symptoms

- The **Data** panel shows **Connection Error**.
- **Test Connection** fails.
- The app says it cannot reach the Apps Script URL.
- The health response is not valid JSON.
- The URL is rejected as invalid.

### Possible Causes

- The Apps Script URL was copied from the editor instead of the Web App deployment.
- The Web App URL does not end in `/exec`.
- The Web App was not deployed or authorization was not completed.
- The Web App access setting blocks the current browser.
- The network is offline or blocking Google Apps Script.
- The Apps Script deployment was changed and the app still has an old URL saved.

### Resolution Steps

1. Open Apps Script.
2. Select **Deploy** → **Manage deployments**.
3. Copy the **Web app URL** ending in `/exec`.
4. Open Walmart-GC.
5. Open **Data** (`▦`).
6. Paste the URL into **Apps Script URL**.
7. Select **Save Connection**.
8. Select **Test Connection**.
9. If it still fails, open this URL directly in a browser:

   ```text
   YOUR_WEB_APP_URL?action=health
   ```

10. If the direct URL does not return JSON, fix the Apps Script deployment or authorization first.

## Health Check Failure

### What Health Check Does

Health Check calls the Apps Script `health` action. It verifies that Apps Script can reach the spreadsheet, check or initialize safe structure, report schema status, and return Sheet metadata.

### Symptoms

- **Test Connection** fails.
- Health Check returns an error code such as `SETUP_REQUIRED`, `INVALID_SCHEMA`, or `NOT_AUTHORIZED`.
- The response is not JSON.

### Resolution Workflow

1. Confirm the Apps Script project is bound to the intended Google Sheet.
2. Confirm the script code is copied from:

   ```text
   apps-script/Code.gs
   ```

3. Confirm the deployment is a **Web app**.
4. Confirm it executes as **Me**.
5. Confirm the selected access option allows the browser to call the Web App URL.
6. Open the Sheet and confirm the intended tab is named:

   ```text
   Cards
   ```

7. Confirm row 1 matches:

   ```csv
   cardNumber,pin,merchant,startingBalance,currentBalance,dateAdded,dateUpdated,dateUsed,used,notes
   ```

8. If there are multiple visible tabs with the approved schema, rename the intended one to `Cards` and remove ambiguity.
9. Return to Walmart-GC and select **Test Connection** again.

## Cannot Load Cards

### Symptoms

- Health Check succeeds but **Load from Sheets** fails.
- The app reports card data could not be read.
- The app reports duplicate card numbers or a missing `cardNumber`.
- The card list stays empty after loading.

### Possible Causes

- The `Cards` headers are missing, renamed, or out of order.
- A populated row is missing `cardNumber`.
- Two rows use the same `cardNumber`.
- Balance cells contain invalid values.
- The Apps Script response does not include Sheet version metadata.

### Resolution Workflow

1. Open the Google Sheet.
2. Confirm the `Cards` tab exists.
3. Confirm headers exactly match the approved schema.
4. Check every populated row for a non-empty `cardNumber`.
5. Remove or merge duplicate card numbers.
6. Make sure `startingBalance` and `currentBalance` are numbers, such as `25.00`.
7. Use `true` or `false` for `used`.
8. Return to Walmart-GC.
9. Open **Data**.
10. Select **Load from Sheets** again.

## Sync Failure

### Symptoms

- A balance or used-state update is saved locally but not confirmed in Sheets.
- The Data panel shows **Unsynced**.
- The app says Sheets sync needs attention.
- **Retry Sync** appears.

### Possible Causes

- Network connection is unavailable.
- Apps Script URL is invalid or unreachable.
- Apps Script deployment permissions changed.
- Apps Script returned an unexpected response.
- Walmart-GC has not loaded from Sheets yet and does not have a Sheet version for safe writes.

### Resolution Workflow

1. Stay in the browser session if it contains unsynced changes.
2. Open **Data**.
3. Select **Download Session CSV Backup** if the local changes matter.
4. Confirm the Apps Script URL is still saved.
5. Select **Test Connection**.
6. If Health Check succeeds, select **Retry Sync**.
7. If Retry Sync succeeds, verify the relevant rows in the Google Sheet.
8. If you prefer to discard the browser's unsynced local changes, select **Refresh from Sheets** instead.

## Conflict State

### Why Conflicts Happen

Walmart-GC uses sheet-level optimistic concurrency for MVP write protection.

In plain language:

1. Walmart-GC loads cards from Sheets and stores the current Sheet version.
2. A card action later tries to write using that known version.
3. Apps Script checks whether the Sheet version is still the same.
4. If the Sheet changed elsewhere, Apps Script rejects the write with a conflict.
5. Walmart-GC saves your local session but pauses auto-sync so it does not silently overwrite the Sheet.

Common causes:

- You edited the Google Sheet directly after loading it in the app.
- Another browser or device synced changes first.
- Another person with Sheet access changed rows.
- A recovery or import action changed the Sheet version.

### Available Recovery Options

In **Conflict** state, the Data panel may show:

- **Download Session CSV Backup**.
- **Refresh from Sheets and Replace Local Session**.
- **Use Current Session to Overwrite Sheets**.

### Recommended Conflict Recovery

1. Select **Download Session CSV Backup**.
2. Open the Google Sheet in another tab.
3. Compare the Sheet with the local session backup if needed.
4. Decide which version should win.
5. If the Sheet should win, select **Refresh from Sheets and Replace Local Session**.
6. If the browser session should win, select **Use Current Session to Overwrite Sheets** only after reviewing the risks.

## ReplaceAll Recovery

### What ReplaceAll Does

**Use Current Session to Overwrite Sheets** uses the approved `replaceAll` recovery action.

It replaces every card row in the `Cards` sheet with the cards currently stored in this browser session.

It does not merge rows. It does not preserve Sheet-only changes that are not in the current browser session.

### When to Use

Use it only when:

- The app is in conflict or recovery is needed.
- You have reviewed the local session.
- You believe the current browser session is the correct version.
- You have downloaded a CSV backup.
- You understand the Sheet's card rows will be replaced.

### Risks

- Sheet edits made elsewhere can be overwritten.
- Rows added directly to the Sheet can be removed if they are not in the current browser session.
- Mistaken local imports can replace good Sheet data.

### Recovery Process

1. Open **Data**.
2. Select **Download Session CSV Backup**.
3. Optional but recommended: make a copy of the Google Sheet from Google Sheets.
4. Select **Use Current Session to Overwrite Sheets**.
5. Read the first confirmation prompt.
6. Read the final confirmation prompt.
7. Continue only if you are certain.
8. After success, open the Google Sheet and verify the `Cards` rows.

## CSV Recovery

CSV export is the safest lightweight backup before destructive recovery.

### Export

1. Open Walmart-GC.
2. Open **Data**.
3. Select **Export CSV** for a normal export, or **Download Session CSV Backup** when shown in recovery actions.
4. Save the file somewhere you can find it.

The CSV uses the approved header:

```csv
cardNumber,pin,merchant,startingBalance,currentBalance,dateAdded,dateUpdated,dateUsed,used,notes
```

### Backup Strategy

Before major recovery actions:

1. Download a session CSV backup from Walmart-GC.
2. Make a copy of the Google Sheet from Google Sheets.
3. Keep both until you confirm the recovered data is correct.

### Restore Process

To restore from a CSV into the browser session:

1. Open Walmart-GC.
2. Open **Data**.
3. Select **Import CSV**.
4. Choose the backup file.
5. Review the raw data area and validation warnings.
6. Select **Update Data**.
7. If connected with a known Sheet version, the import is saved through the batch update sync flow.
8. If the app becomes unsynced or conflicted, use the recovery actions.

To restore manually in Google Sheets:

1. Open the CSV file.
2. Copy the rows you want to restore.
3. Open the Google Sheet's `Cards` tab.
4. Preserve the approved header row.
5. Paste card rows below the header.
6. Remove duplicates and invalid rows.
7. Return to Walmart-GC and select **Load from Sheets**.

## Offline Behavior

### Expected Behavior

When temporarily offline:

- The app can still display cards already loaded in that browser.
- Settings remain available.
- Local changes are saved in browser storage.
- Apps Script Health Check, Load from Sheets, and sync writes cannot complete.
- The app may show **Unsynced** after a failed write.

### What To Do After Reconnecting

1. Open **Data**.
2. Select **Test Connection**.
3. If Health Check succeeds, select **Retry Sync** if shown.
4. If there is a conflict, follow the conflict recovery workflow.
5. Verify the Sheet after sync succeeds.

### Important Local Storage Warning

Offline data is stored in the current browser. It is not a replacement for the Google Sheet.

Avoid clearing browser storage or switching devices while important changes are unsynced. Download a CSV backup first.

## Common Error Codes

Walmart-GC and Apps Script use friendly messages, but you may see these codes in details:

- `NOT_AUTHORIZED`: Apps Script or Sheet authorization/access needs attention.
- `NETWORK_ERROR`: Network or Web App reachability problem.
- `INVALID_SCHEMA`: The `Cards` headers or structure do not match the approved schema.
- `SETUP_REQUIRED`: Apps Script cannot safely choose or create the right Sheet structure without your help.
- `SYNC_CONFLICT`: The Sheet changed since the app last loaded or synced.
- `VALIDATION_ERROR`: Submitted card data or request data is invalid.
- `INTERNAL_ERROR`: Apps Script hit an unexpected error.

## When in Doubt

Use this safe sequence:

1. Do not close the browser tab if it contains unsynced changes.
2. Download a session CSV backup.
3. Copy the Google Sheet as a backup.
4. Re-run **Test Connection**.
5. Re-run **Load from Sheets** only if you are comfortable replacing the local session with Sheet data.
6. Use **Use Current Session to Overwrite Sheets** only when you intentionally want the browser session to replace the Sheet rows.
