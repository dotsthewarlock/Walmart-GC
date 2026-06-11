> Historical reference only: Apps Script belonged to the retired MVP path. It is not part of the active Phase 11 architecture, sync path, setup flow, diagnostics, or user-facing guidance. Active Phase 11 sync is Worker-managed Google OAuth through `https://walmart-gc-oauth.dotsthewarlock.com` from `https://walmart-gc.dotsthewarlock.com` only.

> Historical MVP reference: this document describes the retired Apps Script MVP. It is not the active Phase 11 OAuth/session or sync path.

# Apps Script Setup

This guide explains how to deploy the Google Apps Script Web App used by Walmart-GC.

The Apps Script Web App is the integration layer between your Google Sheet and the static Walmart-GC frontend. Walmart-GC sends requests to one deployed Apps Script URL, and Apps Script reads or writes your Sheet.

## Overview

Walmart-GC uses this MVP architecture:

```text
User Google Sheet ↔ Google Apps Script Web App ↔ Walmart-GC Web App
```

Apps Script is responsible for:

- Checking that the connected spreadsheet is usable.
- Creating or repairing safe structural pieces such as the `Cards` headers and hidden `_META` sheet when allowed.
- Loading card rows from the `Cards` sheet.
- Saving completed card actions back to the Sheet.
- Rejecting writes when the Sheet changed since the app last loaded it.

Apps Script is not a separate server that you maintain. It runs in your Google account as a Google Web App deployment.


## Sheet Schema Used by Apps Script

Apps Script validates and writes the approved MVP `Cards` schema:

```csv
cardNumber,pin,merchant,startingBalance,currentBalance,dateAdded,dateUpdated,dateUsed,used,notes
```

If Health Check or Load from Sheets reports a schema issue, compare the Sheet to [Google Sheet Setup](GOOGLE_SHEET_SETUP.md).

## Before You Start

You need:

- A Google account.
- A compatible Google Sheet. See [Google Sheet Setup](GOOGLE_SHEET_SETUP.md).
- Access to the Walmart-GC repository files.
- The Apps Script source file from this repository:

  ```text
  apps-script/Code.gs
  ```

## Create the Apps Script Project

The recommended MVP setup is to bind the script to the Google Sheet.

1. Open your Walmart gift card Google Sheet.
2. In the Google Sheets menu, select **Extensions** → **Apps Script**.
3. A new Apps Script project opens in a new tab.
4. Rename the Apps Script project to something recognizable, such as:

   ```text
   Walmart-GC Sync
   ```

5. In the default script file, select all existing code and delete it.
6. Open this repository file:

   ```text
   apps-script/Code.gs
   ```

7. Copy the full contents of `Code.gs`.
8. Paste the code into the Apps Script editor.
9. Select **Save project**.

## Deploy the Web App

1. In the Apps Script editor, select **Deploy** → **New deployment**.
2. Select the deployment type gear icon or selector.
3. Choose **Web app**.
4. Enter a description, for example:

   ```text
   Walmart-GC MVP sync deployment
   ```

5. Set **Execute as** to:

   ```text
   Me
   ```

6. Set **Who has access** to the option that allows your Walmart-GC frontend to call the Web App URL.

   For most personal MVP testing, use the broadest option your Google account allows, commonly named:

   ```text
   Anyone
   ```

   Some Google Workspace accounts may show different labels or may restrict this choice. If your organization blocks public Web App access, use an account or Workspace policy that allows the Web App URL to be reached by your browser.

7. Select **Deploy**.

## Authorize the Script

Google will ask you to authorize the script the first time it is deployed or run.

1. Select **Authorize access** when prompted.
2. Choose the Google account that owns or can edit the Sheet.
3. Review the requested permissions.
4. Continue through Google's warning screens if shown for your own unpublished script.
5. Approve the deployment.

Expected result: Apps Script finishes deployment and displays a Web App URL.

## Obtain the Web App URL

After deployment, copy the URL labeled **Web app URL**.

It usually looks like this:

```text
https://script.google.com/macros/s/.../exec
```

Use the `/exec` Web App URL in Walmart-GC. Do not use the Apps Script editor URL.

### Find the URL Later

If you need the URL again:

1. Open the Apps Script project.
2. Select **Deploy** → **Manage deployments**.
3. Select the active Web App deployment.
4. Copy the **Web app URL**.

## Connect Walmart-GC to the Web App

1. Open Walmart-GC in your browser.
2. Open the **Data** panel using the `▦` navigation button.
3. Paste the Apps Script Web App URL into **Apps Script URL**.
4. Select **Save Connection**.
5. Select **Test Connection**.

Walmart-GC automatically appends `?action=health` for the Health Check. You do not need to edit the URL manually.

## Verify Deployment

Use the app's Health Check first:

1. Open Walmart-GC.
2. Open the **Data** panel.
3. Confirm the Apps Script URL is saved.
4. Select **Test Connection**.

Expected success indicators:

- The status changes to connected.
- The message says Health Check succeeded.
- The connection details show spreadsheet name, sheet name, schema version, and last checked time when available.
- The app says you can now load cards from Sheets.

You can also test manually in a browser by opening:

```text
YOUR_WEB_APP_URL?action=health
```

A successful response is JSON with `ok` set to `true` and data about the spreadsheet and schema.


## Browser Write Compatibility

Walmart-GC sends write requests to `updateCard`, `batchUpdate`, and `replaceAll` as simple browser POST requests for Apps Script Web App compatibility. The request body remains the approved JSON envelope, and Apps Script reads it from `e.postData.contents`. If a browser reports a network or CORS-style failure during a write, treat the Sheet update as unconfirmed: the app keeps local data in the current browser, and you should confirm the deployment URL/access settings before using **Retry Sync**.

## Common Errors

### Authorization Failure

Symptoms:

- Health Check fails.
- The manual `?action=health` URL asks for sign-in or shows an authorization/access error.
- Apps Script reports that authorization is required.

Resolution:

1. Open the Apps Script editor.
2. Confirm you are signed in as the account that owns or can edit the Sheet.
3. Redeploy or run through authorization again.
4. Confirm the deployment executes as **Me**.
5. Return to Walmart-GC and select **Test Connection** again.

### Incorrect URL

Symptoms:

- Walmart-GC says the URL is invalid.
- Health Check cannot reach Apps Script.
- Browser test does not return JSON.

Resolution:

1. In Apps Script, open **Deploy** → **Manage deployments**.
2. Copy the **Web app URL** ending in `/exec`.
3. Paste that URL into Walmart-GC's **Apps Script URL** field.
4. Select **Save Connection**.
5. Select **Test Connection**.

### Permission Problems

Symptoms:

- Health Check fails even though the URL looks correct.
- Other browsers or devices cannot reach the Web App URL.
- A Google Workspace policy blocks access.

Resolution:

1. Confirm the deployment access setting allows the browser to call the Web App URL.
2. Confirm the script owner has edit access to the Sheet.
3. If using a Workspace account, check whether your organization restricts Web App deployments.
4. Redeploy after changing access settings.
5. Copy the current Web App URL again if Apps Script gives you a new one.

### Schema or Setup Problems

Symptoms:

- Health Check reaches Apps Script but returns setup guidance or a schema error.
- Load from Sheets fails with `INVALID_SCHEMA` or `SETUP_REQUIRED`.

Resolution:

1. Open the Sheet.
2. Confirm there is a `Cards` tab or a blank workbook Apps Script can initialize.
3. Confirm the headers match the approved schema.
4. Make sure there are not multiple visible tabs with the same valid schema unless the intended tab is named `Cards`.
5. Run **Test Connection** again.

## Next Step

After Health Check succeeds, continue with [Deployment Guide](DEPLOYMENT_GUIDE.md) to load cards and verify sync.
