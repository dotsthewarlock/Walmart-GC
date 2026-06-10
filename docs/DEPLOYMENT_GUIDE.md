# Deployment Guide

This guide walks through deploying Walmart-GC, connecting it to Google Sheets, loading gift cards, and verifying that sync works.

Walmart-GC is intended for users who want a mobile-friendly gift card manager without running a dedicated server.

## Overview

Current Phase 9 architecture:

```text
User Google Account ↔ Google OAuth ↔ Google Sheets API ↔ Walmart-GC Web App
```

The parts are:

- **Google Sheet**: Your source of truth. Card records live in the approved `Cards` schema, with `_META` storing sync metadata.
- **Google OAuth**: Authorizes the browser to call Google Sheets for your account. Tokens stay in memory and are not saved.
- **Google Sheets API**: The only online sync path for Phase 9.
- **Walmart-GC Web App**: The static frontend. It runs from GitHub Pages and keeps local app data for offline use.

Walmart-GC does not require a dedicated backend server, database, framework, build tool, or app-managed user account system.

## Prerequisites

You need:

- A Google account.
- Access to Google Sheets.
- A Google OAuth Web Client ID configured for the deployed Walmart-GC origin.
- A GitHub account if you want to host your own GitHub Pages copy.
- A modern browser with JavaScript enabled.
- Network access for Google sign-in and Google Sheets sync.

## Deployment Checklist

Complete these in order:

1. Deploy Walmart-GC with GitHub Pages.
2. Create or verify the Google Sheet.
3. Save the Google OAuth Web Client ID in Walmart-GC.
4. Connect Google.
5. Save the direct Google Sheet URL or ID.
6. Initialize the Sheet if it is blank, or load from Google Sheets if it already has card rows.
7. Make a test update and confirm the Sheet changes.
8. Export a CSV backup after setup succeeds.

## Deploy Walmart-GC

Walmart-GC is a static website made from plain HTML, CSS, and JavaScript. GitHub Pages can serve it directly from the repository.

### Option A: Fork and Host with GitHub Pages

1. Open the Walmart-GC repository on GitHub.
2. Select **Fork**.
3. Create the fork under your GitHub account.
4. Open your forked repository.
5. Go to **Settings** → **Pages**.
6. Under **Build and deployment**, choose **Deploy from a branch**.
7. Set the branch to `phase-9-oauth` for Phase 9 testing, or to the branch you intentionally publish.
8. Set the folder to `/ (root)`.
9. Select **Save**.
10. Wait for GitHub Pages to publish the site.

### Option B: Clone for Local Review

1. Clone the repository.
2. Serve the folder with a simple local static server or open `index.html` for static review.
3. For normal phone usage, deploy with GitHub Pages so the app has a stable URL accessible from your mobile device.

## Create or Verify the Google Sheet

Use [Google Sheet Setup](GOOGLE_SHEET_SETUP.md). The Sheet must use the approved `Cards` schema:

```csv
cardNumber,pin,merchant,startingBalance,currentBalance,dateAdded,dateUpdated,dateUsed,used,notes
```

For a blank workbook, Walmart-GC can initialize the `Cards` and `_META` tabs from the Data panel.

## Connect Google Account

1. Open Walmart-GC.
2. Open the **Data** panel.
3. In **Google Account**, paste your Google OAuth Web Client ID.
4. Select **Save Client ID**.
5. Select **Connect Google**.
6. Complete the Google sign-in and consent flow.

Expected result: the Google Account status shows connected, and diagnostics show Sheets scope is available.

## Configure Direct Google Sheet

1. Copy the Google Sheet URL or spreadsheet ID.
2. In **Direct Google Sheet**, paste the URL or ID.
3. Select **Save Sheet**.
4. If the workbook is blank, select **Initialize Sheet**.
5. If the workbook already has card rows, select **Load from Google Sheets** before syncing local changes.

Expected result: diagnostics show a configured Sheet ID, initialized `Cards` sheet, local sheet version, and remote sheet version.

## Verify Sync

### Add a Test Card Locally

1. Export a CSV backup if you already have useful data.
2. Add a card through the app or accepted CSV import.
3. Confirm the app keeps the card locally.
4. Select **Sync Now** if auto-sync did not already complete.
5. Open the Google Sheet and confirm the row appears.

### Update an Existing Card

1. Open **Card Detail**.
2. Select **Update Balance**.
3. Save a new remaining balance or amount used.
4. Confirm Walmart-GC reports a successful direct sync.
5. Open the Google Sheet and confirm `currentBalance` and `dateUpdated` changed.

### Mark Used

1. Select a card.
2. Press **Mark Used**.
3. Confirm the Google Sheet row updates `used` and `dateUsed` after sync succeeds.

## Offline and Disconnected Behavior

If Google is disconnected, authorization expires, the direct Sheet is not configured, or the network is unavailable:

- Local changes remain saved in the browser.
- Unsynced state appears in diagnostics/recovery.
- CSV export remains available.
- Direct sync resumes only after reconnecting Google and retrying sync.
- The app must not erase local data because sync failed.

## Conflict Recovery

Walmart-GC uses sheet-level optimistic conflict detection through `_META.sheetVersion`.

If the remote Sheet changed since the current session last loaded or synced:

1. Auto-sync stops.
2. The app shows conflict recovery actions.
3. Download a CSV backup if you want a copy of the current session.
4. Choose either refresh from Google Sheets or explicitly overwrite the configured Sheet with the current session.

Walmart-GC does not silently merge or overwrite conflicts.
