# Google Sheet Setup

This guide explains how to create a Google Sheet that Walmart-GC can use as its source of truth.

Walmart-GC stores gift card data in your own Google Sheet. The web app loads from that Sheet and saves completed local actions back to it through the Google Apps Script Web App.

## Create the Sheet

1. Open [Google Sheets](https://sheets.google.com/).
2. Select **Blank spreadsheet**.
3. Rename the spreadsheet to something easy to recognize, such as:
   - `Walmart Gift Cards`
   - `Walmart-GC Cards`
   - `Gift Card Tracker`
4. Rename the first tab to:

   ```text
   Cards
   ```

5. Add the required headers in row 1 exactly as shown below.

> Tip: The Apps Script setup can safely create or repair the basic structure for a blank workbook, but creating the Sheet yourself first makes setup easier to understand and verify.

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

## Header Setup Steps

1. In cell `A1`, enter `cardNumber`.
2. In cell `B1`, enter `pin`.
3. Continue across row 1 until `notes` is in cell `J1`.
4. Do not rename, reorder, or remove these headers.
5. Do not add extra required fields for MVP setup.

## Schema Rules

### `cardNumber`

- Required for every card row.
- Must be unique in the Sheet.
- Used as the MVP record ID.
- Duplicate card numbers will prevent Walmart-GC from loading or saving cleanly.

### `pin`

- Required for practical checkout use.
- Stored as Sheet data and displayed in the app detail view.

### `merchant`

- Use:

  ```text
  walmart-ca
  ```

- If imported CSV data omits merchant, the app's import flow defaults it to `walmart-ca` for prototype-compatible imports.

### `startingBalance`

- Historical starting value for the card.
- Keep this as the original card balance.
- Walmart-GC does not use this as the live remaining balance.

### `currentBalance`

- Authoritative remaining balance for MVP use.
- This is the balance Walmart-GC shows and updates.
- If a balance is changed in Walmart-GC, the app saves the new `currentBalance` back to Sheets after a successful Sheet load.

### `dateAdded`

- Date the card was added.
- Recommended format:

  ```text
  YYYY-MM-DD
  ```

### `dateUpdated`

- Date the current balance or card record was last updated.
- Recommended format:

  ```text
  YYYY-MM-DD
  ```

### `dateUsed`

- Date the card was marked used.
- Leave blank when the card is not used.

### `used`

- Use `true` for used cards.
- Use `false` for unused or partially used cards.
- The app treats this as the MVP archive/hidden state.
- `used` is independent of balance. A card can have a zero balance without being marked used until you mark it used.

### `notes`

- Optional free-text notes.
- Use for reminders such as purchase source, order number, or special handling.

## Example Rows

```csv
cardNumber,pin,merchant,startingBalance,currentBalance,dateAdded,dateUpdated,dateUsed,used,notes
6098765432101234,1234,walmart-ca,50.00,50.00,2026-06-01,2026-06-01,,false,New card
6098765432105678,5678,walmart-ca,100.00,37.42,2026-06-02,2026-06-09,,false,Partial balance after grocery trip
6098765432109999,9999,walmart-ca,25.00,0.00,2026-06-03,2026-06-08,2026-06-08,true,Fully used
```

## Shared Sheets

Shared Google Sheets are allowed when Google Sheets grants the relevant people access.

Important notes:

- Google controls Sheet sharing and permissions.
- Walmart-GC does not create user accounts.
- Walmart-GC does not manage roles or collaborators.
- Walmart-GC does not provide real-time collaboration features.
- If another person or browser changes the Sheet after your last load, Walmart-GC may detect a sync conflict and ask you to choose a recovery action.

## Common Mistakes

### Missing Headers

Symptom: Health Check or Load from Sheets reports a schema/setup problem.

Fix:

1. Open the Google Sheet.
2. Open the `Cards` tab.
3. Confirm row 1 contains all required headers.
4. Confirm headers start in cell `A1` and continue through `J1`.

### Modified Headers

Symptom: Walmart-GC reports `INVALID_SCHEMA` or cannot load cards.

Fix:

1. Compare row 1 to the approved header list.
2. Restore exact names and order.
3. Run **Test Connection** again from Walmart-GC.

### Duplicate Card Numbers

Symptom: Load or sync fails with a validation error.

Fix:

1. In the `cardNumber` column, look for duplicate values.
2. Keep only one row per card number.
3. If two rows represent the same card, manually combine the most accurate balance, used state, and notes.
4. Run **Load from Sheets** again.

### Extra Blank or Partial Rows

Symptom: A row appears populated but has no `cardNumber`, or a load fails because a card row is incomplete.

Fix:

1. Delete fully blank rows that accidentally contain spaces or formatting-only values.
2. Make sure each populated row has a `cardNumber`.
3. Make sure balances are valid numbers.

## Next Step

After the Sheet exists, deploy the Apps Script Web App using [Apps Script Setup](APPS_SCRIPT_SETUP.md).
