# Deployment Guide

This guide walks through deploying Walmart-GC, connecting it to Google Sheets, loading gift cards, and verifying that sync works.

Walmart-GC is intended for non-technical users who want a mobile-friendly gift card manager without running a dedicated server.

## Overview

Walmart-GC uses this MVP architecture:

```text
User Google Sheet ↔ Google Apps Script Web App ↔ Walmart-GC Web App
```

The parts are:

- **Google Sheet**: Your source of truth. Card records live here in the approved `Cards` schema.
- **Google Apps Script Web App**: The integration layer. It validates the Sheet, loads cards, writes completed card actions, and prevents silent overwrites.
- **Walmart-GC Web App**: The static frontend. It runs from GitHub Pages in your browser and stores local app data for offline use.

Walmart-GC does not require a dedicated backend server, database, or user account system.

## Prerequisites

You need:

- A Google account.
- Access to Google Sheets.
- A GitHub account if you want to host your own GitHub Pages copy.
- A modern browser on desktop or mobile.
- JavaScript enabled in the browser.
- Network access for initial loading, Health Check, Load from Sheets, and sync.

Recommended browsers:

- Current Chrome, Edge, Firefox, or Safari.
- Mobile Chrome or mobile Safari for phone checkout use.

## Deployment Checklist

Complete these in order:

1. Deploy Walmart-GC with GitHub Pages.
2. Create or verify the Google Sheet.
3. Deploy the Apps Script Web App.
4. Connect Walmart-GC to the Apps Script URL.
5. Run Health Check.
6. Load cards from Sheets.
7. Make a test update and confirm the Sheet changes.

## Deploy Walmart-GC

Walmart-GC is a static website made from plain HTML, CSS, and JavaScript. GitHub Pages can serve it directly from the repository.

### Option A: Fork and Host with GitHub Pages

Use this option if you want your own hosted copy.

1. Open the Walmart-GC repository on GitHub.
2. Select **Fork**.
3. Create the fork under your GitHub account.
4. Open your forked repository.
5. Go to **Settings** → **Pages**.
6. Under **Build and deployment**, choose **Deploy from a branch**.
7. Set the branch to:

   ```text
   main
   ```

8. Set the folder to:

   ```text
   / (root)
   ```

9. Select **Save**.
10. Wait for GitHub Pages to publish the site.

Expected result: GitHub Pages shows a site URL, usually similar to:

```text
https://YOUR-GITHUB-USERNAME.github.io/Walmart-GC/
```

### Option B: Clone for Local Review

Use this option if you only want to inspect or test files locally before hosting.

1. Clone the repository.
2. Open `index.html` in a browser, or serve the folder with a simple local static server.
3. For normal phone usage, deploy with GitHub Pages so the app has a stable URL accessible from your mobile device.

## Create the Google Sheet

Follow [Google Sheet Setup](GOOGLE_SHEET_SETUP.md).

At minimum, the `Cards` tab must use this approved header row:

```csv
cardNumber,pin,merchant,startingBalance,currentBalance,dateAdded,dateUpdated,dateUsed,used,notes
```

The Sheet remains the source of truth for MVP data.

## Deploy Apps Script

Follow [Apps Script Setup](APPS_SCRIPT_SETUP.md).

You will finish with a Web App URL like:

```text
https://script.google.com/macros/s/.../exec
```

Save this URL. You will paste it into Walmart-GC.

## Initial Application Launch

1. Open your GitHub Pages Walmart-GC URL.
2. Confirm the app loads and shows the main navigation:
   - **Card List**
   - **Card Detail**
   - **Settings** (`⚙`)
   - **Data** (`▦`)
3. Open **Settings** with the `⚙` button to review display preferences such as hiding used cards, hiding zero-balance cards, and sort order.
4. Open the **Data** panel with the `▦` button. This is the setup and sync control center.

The Data panel contains:

- Apps Script URL field.
- **Save Connection** button.
- **Test Connection** button.
- **Load from Sheets** button.
- Connection and sync status details.
- Raw CSV-style card data tools.
- CSV import/export actions.
- Recovery actions when the app is unsynced or in conflict.

## Connect Apps Script

1. Open the **Data** panel.
2. Paste the Apps Script Web App URL into **Apps Script URL**.
3. Select **Save Connection**.
4. Select **Test Connection**.

Expected Health Check success:

- The connection status shows connected.
- The message says the Health Check succeeded.
- Spreadsheet, Sheet, schema version, and last checked details appear when available.
- The app says you can now load cards from Sheets.

If Health Check fails, use [Troubleshooting](TROUBLESHOOTING.md) and [Apps Script Setup](APPS_SCRIPT_SETUP.md#common-errors).

## Load From Sheets

After Health Check succeeds:

1. Stay in the **Data** panel.
2. Select **Load from Sheets**.
3. Wait for the app to finish loading.

Expected behavior:

- Walmart-GC calls the Apps Script `load` action.
- Apps Script validates or safely initializes the Sheet structure.
- Cards from the `Cards` tab replace the current local session.
- The app stores the current Sheet version for safe future writes.
- The sync status changes to connected/synced.
- The message says completed actions will now auto-sync.

Success indicators:

- Card count updates in the **Card List** panel.
- Card details are available in the **Card Detail** panel.
- The **Data** panel shows a Sheet version and last sync time.
- Raw card data refreshes from the loaded cards.

## Load Cards with CSV Tools

The Data panel also supports CSV-style import for preparing or replacing the local session.

1. Open **Data**.
2. Use **Import CSV** or unlock and edit the raw data area.
3. Select **Update Data** to validate and load the rows into the app.
4. If the app has already loaded from Sheets and has a Sheet version, the completed import action is saved through the batch update sync flow.

For larger safety backups, use **Export CSV** before destructive recovery actions.

## Verify Sync

Use this simple validation workflow after loading from Sheets.

### Test by Creating a Card in Walmart-GC

Use this only with a small test Sheet or after downloading a CSV backup. The raw data editor is intended for CSV-style setup and import work.

1. Open **Data**.
2. Select **Download Session CSV Backup** if recovery actions are visible, or **Export CSV** for a normal backup.
3. Select **Unlock Editing** in the raw data area.
4. Add one new CSV row using a unique `cardNumber`, for example:

   ```csv
   6098765432101111,1111,walmart-ca,10.00,10.00,2026-06-10,2026-06-10,,false,Sync test card
   ```

5. Select **Update Data**.
6. Wait for the Data panel to report that the imported cards were saved to Sheets.
7. Open the Google Sheet.
8. Confirm the new `cardNumber` row appears.

Expected result: the app remains connected/synced and the new card row is visible in the Sheet.

### Test with an Existing Card

1. In Walmart-GC, open **Card List**.
2. Select a card.
3. Open **Card Detail**.
4. Select **Update Balance**.
5. Enter a new remaining balance or amount used.
6. Save the balance update.
7. Open the Google Sheet.
8. Confirm the matching `cardNumber` row has the updated `currentBalance` and `dateUpdated`.

Expected result: Walmart-GC shows a connected/synced status after the write succeeds.

### Test by Adding a Card to the Sheet

1. Open the Google Sheet.
2. Add a new card row using the approved schema.
3. Return to Walmart-GC.
4. Open **Data**.
5. Select **Load from Sheets**.
6. Confirm the new card appears in the app.

This validates the Sheet-to-app direction.

## Offline Behavior

Walmart-GC stores app data, settings, sync state, and the Apps Script URL locally in the browser.

Expected offline behavior:

- Previously loaded local cards remain usable in the browser.
- Settings remain available locally.
- The app can continue showing cards for checkout when temporarily offline.
- Local changes are saved in the browser.
- Sheet writes cannot complete while the network or Apps Script URL is unavailable.
- The sync status may become **Unsynced** until recovery succeeds.

Important: Offline local data is browser-specific. If you switch devices or clear browser storage, that local session may not be available. Keep the Google Sheet and CSV backups as your durable records.

## Sync Statuses

Walmart-GC uses three MVP sync states.

### Connected / Synced

Meaning:

- The app has loaded from Sheets or successfully saved a completed action.
- The app has a known Sheet version.
- Completed actions can auto-sync unless a future write fails.

What to do:

- Continue using the app normally.
- Update balances and used state from the card detail actions.

### Unsynced

Meaning:

- Local data is saved in this browser.
- The latest local state has not been confirmed in Sheets.
- Common causes include being offline, an invalid URL, Apps Script being unreachable, or a write response problem.

Recovery options shown in the Data panel may include:

- **Retry Sync**.
- **Refresh from Sheets**.
- **Download Session CSV Backup**.

Recommended recovery:

1. Download a CSV backup if the local session has changes you care about.
2. Check network and Apps Script URL.
3. Select **Retry Sync**.
4. If you want to discard local changes and return to Sheet data, select **Refresh from Sheets**.

### Conflict

Meaning:

- The Sheet changed after Walmart-GC last loaded or synced.
- Apps Script rejected the write to prevent silent overwrites.
- Walmart-GC does not automatically merge conflicting changes for MVP.

Recovery options shown in the Data panel may include:

- **Download Session CSV Backup**.
- **Refresh from Sheets and Replace Local Session**.
- **Use Current Session to Overwrite Sheets**.

Recommended recovery:

1. Download a session CSV backup first.
2. Decide which data should win:
   - Choose **Refresh from Sheets and Replace Local Session** if the Sheet should win.
   - Choose **Use Current Session to Overwrite Sheets** only if the current browser session should replace the Sheet card rows.
3. Re-check the Sheet after recovery.

## Conflict Recovery Warnings

Use **Use Current Session to Overwrite Sheets** carefully.

That action calls the approved `replaceAll` recovery flow and replaces every card row in the `Cards` sheet with the current browser session. It is intended only for explicit conflict recovery when you have decided the local browser session is the correct version.

Before using it:

1. Download a session CSV backup.
2. Consider manually copying the current Google Sheet as an additional backup.
3. Confirm you are connected to the intended Sheet.
4. Read the confirmation prompts.

## Common Setup Path

For a new user, the shortest successful path is:

1. Fork repository.
2. Enable GitHub Pages from `main` and `/ (root)`.
3. Create a Google Sheet named `Walmart Gift Cards`.
4. Create a `Cards` tab with the approved headers.
5. Open **Extensions** → **Apps Script** from the Sheet.
6. Paste `apps-script/Code.gs` into Apps Script.
7. Deploy as a Web App.
8. Copy the Web App URL ending in `/exec`.
9. Open Walmart-GC.
10. Open **Data**.
11. Save the Apps Script URL.
12. Run **Test Connection**.
13. Run **Load from Sheets**.
14. Update one card and verify the Sheet row changes.

## Related Guides

- [Google Sheet Setup](GOOGLE_SHEET_SETUP.md)
- [Apps Script Setup](APPS_SCRIPT_SETUP.md)
- [Troubleshooting](TROUBLESHOOTING.md)
