# Troubleshooting

This guide covers the active Worker-backed Google OAuth + `drive.file` sync path. Apps Script troubleshooting is preserved only in historical MVP documentation and does not apply to the active Phase 9 app.

## Connect Google Does Not Open

Check:

1. The browser is online.
2. The Worker backend is reachable.
3. Diagnostics show the Worker session as **Connected**, **Disconnected**, or **Connection unavailable**.

If connection is unavailable, verify the Cloudflare Worker deployment and OAuth environment/secrets before retrying.

## Consent Is Denied or Closed

Walmart-GC keeps local cards available. Select **Connect Google** again and approve Google Drive file access when ready.

## Google File Access Is Not Available

Check diagnostics for **Worker session** and **Worker sync backend**.

Fix:

1. Select **Disconnect**.
2. Select **Connect Google**.
3. Approve `drive.file` access.
4. Confirm diagnostics show the Worker session is connected.

## Walmart-GC Data Was Not Found or Created

Walmart-GC searches for an app-accessible Google spreadsheet named `Walmart-GC Data`. With `drive.file`, Google only exposes files this app created or that the user explicitly opened/authorized through the app.

Fix:

1. Reconnect Google.
2. Confirm the Google Drive API and Google Sheets API are enabled in the maintainer Google Cloud project.
3. Confirm the signed-in account is allowed to use the OAuth app while it is in Testing.
4. Try **Ensure Sheet** after reconnecting Google.

## Drive or Sheets API Error

Typical causes:

- Google Drive API is disabled in the maintainer project.
- Google Sheets API is disabled in the maintainer project.
- OAuth testing mode does not include the signed-in Google account as a test user.
- Browser/network/content blocker prevented Google API calls.

Local data remains available after these failures.

## Cards Headers Are Rejected

The `Cards` tab must use the approved schema exactly:

```csv
cardNumber,pin,merchant,startingBalance,currentBalance,dateAdded,dateUpdated,dateUsed,used,notes
```

Fix the header row in Google Sheets, then use **Load from Google Sheets** again.

## Local Cards Were Not Uploaded Automatically

This is intentional data safety behavior. If Walmart-GC connects to an empty Sheet while the browser already has local cards, it keeps the local cards unsynced until you explicitly select **Sync Now**.

## Remote Cards Did Not Replace Local Cards Automatically

This is intentional data safety behavior. If Google Sheets has cards and the browser also has local cards, Walmart-GC does not silently replace local data. Use **Load from Google Sheets** only when you intentionally want the Sheet to replace the local session.

## Sync Conflict

A conflict means `_META.sheetVersion` changed since the browser last loaded or synced.

Options:

1. Download a CSV backup.
2. Use **Refresh from Sheets** to replace the local session with Google Sheets data.
3. Use **Use Current Session to Overwrite Sheets** only after confirming the local browser session is the desired source of truth.

## Offline or Disconnected

When offline, disconnected, or expired:

- Local cards remain usable.
- Completed actions are saved locally.
- Unsynced guidance appears.
- Reconnect Google and use **Sync Now** when ready.
