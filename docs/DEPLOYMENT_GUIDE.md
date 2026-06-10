# Deployment Guide

Walmart-GC is a static GitHub Pages app. It uses plain HTML, CSS, and JavaScript with no build step, backend server, database, framework, or npm dependency.

## Active Phase 9.1 Deployment Model

```text
GitHub Pages static app
        ↕
Google Identity Services OAuth
        ↕
Google Drive API + Google Sheets API
        ↕
User-owned Walmart-GC Data spreadsheet
```

Normal users should only need to open the app, select **Connect Google**, approve access, and use Walmart-GC.

## Maintainer OAuth Setup

The public OAuth Client ID must be embedded in `app.js` before deployment. It is browser configuration, not a client secret.

Required Google Cloud settings:

- OAuth app audience: External.
- OAuth status may be Testing while limited to configured test users.
- Enabled APIs: Google Drive API and Google Sheets API.
- Authorized JavaScript origin: `https://dotsthewarlock.github.io`.
- Authorized redirect URI: `https://dotsthewarlock.github.io/Walmart-GC/`.
- Scope used by the app: `https://www.googleapis.com/auth/drive.file`.

Do not add an OAuth client secret to the frontend.

## Static Files

Deploy these files through GitHub Pages from the selected branch:

- `index.html`
- `app.js`
- `styles.css`
- documentation files as needed

## Pre-Deployment Checks

Run:

```bash
node --check app.js
git diff --check
# Run a conflict-marker scan before committing.
```

Also confirm:

- The debug fingerprint versions match the intended deployment.
- No user-facing OAuth Client ID input is present.
- No normal first-run Sheet URL/ID setup is present.
- Apps Script appears only in historical documentation.
- CSV export/import remains available.

## Post-Deployment Smoke Test

1. Open the GitHub Pages URL.
2. Confirm the debug fingerprint.
3. Open the **Data** panel.
4. Select **Connect Google**.
5. Confirm consent requests `drive.file`.
6. Confirm Walmart-GC locates or creates `Walmart-GC Data`.
7. Confirm **Open Sheet** opens the active spreadsheet.
8. Confirm local/offline data remains available if Google setup fails.
