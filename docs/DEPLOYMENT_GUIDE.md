# Deployment Guide

Walmart-GC is a static GitHub Pages app. It uses plain HTML, CSS, and JavaScript with no build step, backend server, database, framework, or npm dependency.

## Active Phase 10B Deployment Model

```text
Custom-domain GitHub Pages static app
        ↕
Cloudflare Worker OAuth session
        ↕
Google Drive API using drive.file
        ↕
User-owned Walmart-GC Data spreadsheet
```

Normal users should only need to open the custom-domain app, select **Connect Google**, approve access, and return to Walmart-GC with a durable HttpOnly Worker session cookie.

## Maintainer OAuth Setup

The OAuth client secret stays in the Cloudflare Worker secret store. Do not add OAuth client secrets or Google access/refresh tokens to the frontend.

Required Google Cloud settings:

- OAuth app audience: External.
- OAuth status may be Testing while limited to configured test users.
- Enabled APIs: Google Drive API and Google Sheets API.
- Authorized JavaScript origin: `https://walmart-gc.dotsthewarlock.com`.
- Authorized redirect URI: `https://walmart-gc-oauth.dotsthewarlock.com/auth/callback`.
- Scope used by the app: `https://www.googleapis.com/auth/drive.file`.

The Worker callback redirects users to `https://walmart-gc.dotsthewarlock.com/?auth=connected` and carries the session only in the `walmart_gc_session` HttpOnly cookie.

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
5. Confirm consent requests only `drive.file`.
6. Confirm the return URL is `https://walmart-gc.dotsthewarlock.com/?auth=connected`, then cleans itself without a `session_id`.
7. Confirm the Worker session cookie exists on `walmart-gc-oauth.dotsthewarlock.com` and refresh keeps the connection.
8. Confirm Walmart-GC locates or creates `Walmart-GC Data` once Worker Sheet proxy support is enabled.
9. Confirm **Open Sheet** opens the active spreadsheet when a Sheet is configured.
10. Confirm local/offline data remains available if Google setup fails.
