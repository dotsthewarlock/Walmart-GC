# MVP Definition

## Objective

Allow a user to manage Walmart gift cards from a mobile-friendly interface while maintaining Google Sheets as the source of truth.

## Required Features

### Card List

Display:

- Card Number
- Remaining Balance
- Status

### Card Detail

Display:

- Barcode
- PIN
- Remaining Balance
- Notes

### Status Tracking

Supported states:

- Unused
- Partial
- Used

### Synchronization

Changes made in the web app update the Google Sheet.

Changes made in the Google Sheet are reflected in the web app after refresh.

## Success Criteria

A user can:

1. Maintain cards in Google Sheets.
2. Access cards on mobile.
3. View barcodes quickly at checkout.
4. Update balances.
5. Track used and partially used cards.
6. Keep desktop and mobile synchronized.
