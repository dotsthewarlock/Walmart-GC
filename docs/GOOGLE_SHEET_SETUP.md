# Google Sheet Setup

This guide explains how to create a Google Sheet that Walmart-GC can use as its source of truth.

Walmart-GC stores gift card data in your own Google Sheet. In Phase 9, the web app loads from and saves to that Sheet directly through Google OAuth and the Google Sheets API.

## Create the Sheet

1. Open [Google Sheets](https://sheets.google.com/).
2. Select **Blank spreadsheet**.
3. Rename the spreadsheet to something easy to recognize, such as:
   - `Walmart Gift Cards`
   - `Walmart-GC Cards`
   - `Gift Card Tracker`
4. You may leave the workbook blank and let Walmart-GC initialize it, or manually rename the first tab to:

   ```text
   Cards
   ```

5. If you create the `Cards` tab manually, add the required headers in row 1 exactly as shown below.

> Tip: **Initialize Sheet** in Walmart-GC can create the `Cards` headers and `_META` metadata tab for a blank workbook. It must not be used as a substitute for reviewing populated workbooks before syncing.

## Required Schema

The `Cards` tab must use this exact header order:

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

### `cardNumber`

- Required for every card row.
- Must be unique in the Sheet.
- Used as the record ID.
- Duplicate card numbers prevent clean loading or saving.

### `pin`

- Required for practical checkout use.
- Stored as Sheet data and displayed in the app detail view.

### `merchant`

- Defaults to:

  ```text
  walmart-ca
  ```

- CSV imports that omit merchant default to `walmart-ca`.

### `startingBalance`

- Historical starting value for the card.
- Keep this as the original card balance.

### `currentBalance`

- Authoritative remaining balance.
- This is the balance Walmart-GC shows and updates.

### `dateAdded`

- Date the card was added.
- Recommended format: `YYYY-MM-DD`.

### `dateUpdated`

- Date the current balance or card record was last updated.
- Recommended format: `YYYY-MM-DD`.

### `dateUsed`

- Date the card was marked used.
- Leave blank when the card is not used.

### `used`

- Use `true` for used cards.
- Use `false` for unused or partially used cards.
- Independent of balance.

### `notes`

- Optional free-text notes.

## Example Rows

```csv
cardNumber,pin,merchant,startingBalance,currentBalance,dateAdded,dateUpdated,dateUsed,used,notes
6098765432101234,1234,walmart-ca,50.00,50.00,2026-06-01,2026-06-01,,false,New card
6098765432105678,5678,walmart-ca,100.00,37.42,2026-06-02,2026-06-09,,false,Partial balance after grocery trip
6098765432109999,9999,walmart-ca,25.00,0.00,2026-06-03,2026-06-08,2026-06-08,true,Fully used
```

## Shared Sheets

Shared Google Sheets are allowed when Google Sheets grants the relevant people access. Walmart-GC does not create user accounts, manage roles, or provide real-time collaboration features.

If another person or browser changes the Sheet after your last load, Walmart-GC may detect a sync conflict and ask you to choose a recovery action.

## Common Mistakes

### Missing or Modified Headers

Fix:

1. Open the Google Sheet.
2. Open the `Cards` tab.
3. Confirm row 1 contains all required headers in the approved order.
4. Restore exact names and order if needed.
5. Use **Load from Google Sheets** again.

### Duplicate Card Numbers

Fix:

1. In the `cardNumber` column, look for duplicate values.
2. Keep only one row per card number.
3. Manually combine the most accurate balance, used state, and notes.
4. Use **Load from Google Sheets** again.

### Extra Blank or Partial Rows

Fix:

1. Delete fully blank rows that accidentally contain spaces or formatting-only values.
2. Make sure each populated row has a `cardNumber`.
3. Make sure balances are valid numbers.

## Next Step

After the Sheet exists, open Walmart-GC, save the Google OAuth Client ID, connect Google, paste the Sheet URL or ID, and use **Initialize Sheet** or **Load from Google Sheets**.
