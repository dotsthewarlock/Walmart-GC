# Google Sheet Setup

This guide describes the active Phase 11 Worker-backed Google Sheet flow.

Normal users do **not** create a Google Cloud project, paste an OAuth Client ID, deploy Apps Script, create a spreadsheet manually, or paste a Sheet URL/ID. Walmart-GC uses the Worker-owned OAuth flow and the `drive.file` permission to manage one app-created/app-accessible spreadsheet.

## Active URLs

Use only the cloud app for production, development, and testing:

```text
https://walmart-gc.dotsthewarlock.com
```

Active Worker routing:

```text
https://walmart-gc.dotsthewarlock.com/auth/*
https://walmart-gc.dotsthewarlock.com/api/*
```

Cloudflare must route `walmart-gc.dotsthewarlock.com/auth/*` and `walmart-gc.dotsthewarlock.com/api/*` to the Worker. The legacy Worker subdomain `https://walmart-gc-oauth.dotsthewarlock.com` may remain fallback/legacy only.

No localhost OAuth or alternate OAuth origin is supported.

## Normal First-Run Flow

1. Open Walmart-GC at `https://walmart-gc.dotsthewarlock.com`.
2. Open the **Data** panel.
3. Select **Connect Google**.
4. Approve only Google Drive file access (`https://www.googleapis.com/auth/drive.file`).
5. The Worker sets the HttpOnly session cookie and returns to `https://walmart-gc.dotsthewarlock.com/?auth=connected`.
6. Frontend auth state comes from same-origin `/api/status`; frontend Worker API calls use same-origin `/api/*` paths with `credentials: "include"`.
7. Select **Ensure Sheet** or **Load from Google Sheets**. The Worker searches Drive for an app-accessible spreadsheet named:

   ```text
   Walmart-GC Data
   ```

8. If the spreadsheet is not found, Walmart-GC creates it.
9. The Worker initializes the required `Cards` tab and hidden `_META` metadata tab.
10. Walmart-GC loads remote cards through the Worker when the user selects **Load from Google Sheets**.

## Dedicated Spreadsheet

Walmart-GC uses one dedicated spreadsheet by default:

```text
Walmart-GC Data
```

Use the **Open Sheet** button in the Data panel to view it in Google Sheets after connection.

## Required Schema

The `Cards` tab uses this exact header order:

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

As a CSV header row, that is:

```csv
cardNumber,pin,merchant,startingBalance,currentBalance,dateAdded,dateUpdated,dateUsed,used,notes
```

Do not change the schema during Phase 11.

## Schema Rules

- `cardNumber` is required, must be unique, and is the record ID.
- `pin` is required for practical checkout use.
- `merchant` defaults to `walmart-ca`.
- `startingBalance` is the historical starting value.
- `currentBalance` is the authoritative remaining balance.
- `dateAdded`, `dateUpdated`, and `dateUsed` should use `YYYY-MM-DD` when populated.
- `used` is independent of balance.
- `notes` is optional free text.
- Barcode payload is derived only and must not be stored: `79936686504000 + cardNumber`.

## Example Rows

```csv
cardNumber,pin,merchant,startingBalance,currentBalance,dateAdded,dateUpdated,dateUsed,used,notes
6098765432101234,1234,walmart-ca,50.00,50.00,2026-06-01,2026-06-01,,false,New card
6098765432105678,5678,walmart-ca,100.00,37.42,2026-06-02,2026-06-09,,false,Partial balance after grocery trip
6098765432109999,9999,walmart-ca,25.00,0.00,2026-06-03,2026-06-08,2026-06-08,true,Fully used
```

## Data Safety

Walmart-GC does not silently erase local data, silently overwrite remote Sheet rows, or automatically merge conflicts.

- If Google has cards and the browser also has local cards, Walmart-GC keeps local data until you explicitly choose **Load from Google Sheets** or **Sync Now**.
- If Google is empty and the browser has local cards, Walmart-GC keeps local data and lets you explicitly sync it.
- If the Sheet changes outside the current browser session, `_META.sheetVersion` conflict handling prevents silent overwrites.
- CSV backup/recovery remains available even while Google is disconnected or offline.

## Sync Model

Worker-backed sync only. Completed actions sync after:

- Balance save.
- Used state change.
- Notes save.
- Merchant change.
- New card save.
- Accepted CSV import.

Do not sync every keystroke.

## Maintainer-Only OAuth Configuration

OAuth client configuration is owned by the Cloudflare Worker deployment. End users should not see, paste, or manage OAuth client configuration, and the frontend must never store access tokens, refresh tokens, session IDs, OAuth secrets, or Google API credentials.

## Historical Note

Apps Script setup was part of the historical MVP and is not part of the active Phase 11 sync architecture.
