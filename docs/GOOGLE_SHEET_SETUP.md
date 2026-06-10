# Google Sheet Setup

This guide describes the active Phase 9.1 Google Sheet flow.

Normal users do **not** create a Google Cloud project, paste an OAuth Client ID, deploy Apps Script, create a spreadsheet manually, or paste a Sheet URL/ID. Walmart-GC uses the maintainer-provided public OAuth browser client and the `drive.file` permission to manage one app-created/app-accessible spreadsheet.

## Normal First-Run Flow

1. Open Walmart-GC.
2. Open the **Data** panel.
3. Select **Connect Google**.
4. Approve Google Drive file access.
5. Walmart-GC searches Drive for an app-accessible spreadsheet named:

   ```text
   Walmart-GC Data
   ```

6. If the spreadsheet is not found, Walmart-GC creates it.
7. Walmart-GC initializes the required `Cards` tab and hidden `_META` metadata tab.
8. Walmart-GC loads remote cards when it can do so without silently replacing local unsynced data.

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

## Schema Rules

- `cardNumber` is required, must be unique, and is the record ID.
- `pin` is required for practical checkout use.
- `merchant` defaults to `walmart-ca`.
- `startingBalance` is the historical starting value.
- `currentBalance` is the authoritative remaining balance.
- `dateAdded`, `dateUpdated`, and `dateUsed` should use `YYYY-MM-DD` when populated.
- `used` is independent of balance.
- `notes` is optional free text.

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

## CSV Backup

CSV export/import remains available even while Google is disconnected or offline. Export a CSV backup before destructive recovery choices.

## Maintainer-Only OAuth Configuration

The public OAuth Client ID is static browser configuration maintained in the app source before deployment. It is not a secret. End users should not need to see, paste, or manage OAuth client configuration.
