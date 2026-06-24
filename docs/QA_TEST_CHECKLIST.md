# QA Test Checklist & Troubleshooting Guide

This document combines the manual QA test plan and troubleshooting guidance for the Walmart-GC application. Use it to verify releases, debug active incidents, and ensure OAuth, session, and synchronization behaviors conform to approved specifications.

---

## Part 1: Manual QA Checklist

### 1. Test Environment Validation
Ensure testing is conducted on the official custom domain. Localhost OAuth or alternate OAuth origins are not supported.
- **Production/Dev/Testing URL**: `https://walmart-gc.dotsthewarlock.com`
- **Worker Routing**: Same-origin `/auth/*` and `/api/*` routed via Cloudflare to the Worker (`walmart-gc-oauth`).

| Item | Expected Status | Checked |
| --- | --- | --- |
| App URL | Must load from `https://walmart-gc.dotsthewarlock.com` | [ ] |
| Security | Secure HTTPS context | [ ] |
| Frontend token storage | NO access tokens, refresh tokens, session IDs, or Google credentials in local/session storage or cookies other than `walmart_gc_session` | [ ] |
| Legacy references | No Apps Script health checks, legacy Apps Script URLs, or OAuth Client ID input fields visible to normal users | [ ] |

### 2. OAuth & Session Persistence
- [ ] **Google Connection**: Select **Connect Google**.
- [ ] **Initiation URL**: Redirection starts via same-origin `/auth/init`.
- [ ] **Google Scope Check**: Consent screen requests *only* `https://www.googleapis.com/auth/drive.file`.
- [ ] **Successful Redirect**: Redirects back to `https://walmart-gc.dotsthewarlock.com/?auth=connected`.
- [ ] **URL Cleanup**: App removes the `?auth=connected` query parameter cleanly; no session tokens are visible in the address bar.
- [ ] **HttpOnly Session Cookie**: Worker sets a host-only, Secure, SameSite=Lax, HttpOnly cookie named `walmart_gc_session`.
- [ ] **Session Check**: Same-origin `/api/status` returns connected.
- [ ] **Page Refresh**: Refreshing the page preserves the login/connection state.
- [ ] **Browser Restart**: Closing and reopening the browser preserves the login state (while the session remains valid).
- [ ] **CORS Isolation**: All frontend Worker API calls use same-origin `/api/*` paths with `{ credentials: "include" }`.
- [ ] **Logout Flow**: Selecting Logout calls same-origin `POST /api/logout`, deletes the KV session on the backend, clears the local cookie, and updates status to disconnected.

### 3. Google Account & Sheet Lifecycle
- [ ] **First-run State**: Logged-out user with no local data sees diagnostics indicating **Disconnected**, Sheet proxy **Needs setup**, and card count `0`.
- [ ] **Sheet Creation**: Connect Google, then click **Ensure Sheet**. The Worker searches for `Walmart-GC Data` in Drive and automatically creates it if missing.
- [ ] **Header Initialization**: The newly created Sheet is initialized with tabs `Cards` and `_META` containing the correct schema and metadata headers.
- [ ] **Sheet URL Resolution**: **Open Sheet** correctly opens the active spreadsheet in Google Sheets.
- [ ] **Data Fetching**: Selecting **Load from Google Sheets** fetches data from the remote Sheet and updates local state.
- [ ] **Persistent Sheet Binding**: Reconnecting after logout correctly matches and reuses the existing `Walmart-GC Data` sheet without duplicate creation.

### 4. Input Normalization & Validation
- [ ] **Accepted Card Prefix**: Card number `6351234567890123` (starts with `635`, exactly 16 digits) is accepted.
- [ ] **Non-635 Rejection**: A 16-digit card number not starting with `635` is rejected.
- [ ] **Invalid Length**: Card numbers shorter or longer than 16 digits are rejected.
- [ ] **Non-Numeric Characters**: Alphabetic characters or symbols are rejected or correctly normalized depending on validation context.
- [ ] **Barcode Checksum**: Barcode renders correctly matching `79936686504000 + cardNumber`.
- [ ] **CSV Multi-Card Warning**: Importing a CSV with mixed valid/invalid rows continues to warn or reject invalid rows while allowing recovery.

### 5. Synchronization & Concurrency
- [ ] **Action-Triggered Sync**: Changes sync to Google Sheets immediately after:
  - Saving a balance update
  - Changing card used state
  - Editing notes
  - Modifying card merchant
  - Creating/saving a new card
  - Accepting a CSV import
- [ ] **No Keystroke Flooding**: Editing notes or balance fields does not trigger sync requests until the save action is completed.
- [ ] **Optimistic Locking**: Stale local saves are blocked by comparing local `sheetVersion` with `_META.sheetVersion` on the Sheet.
- [ ] **No Silent Overwrites**: App alerts the user of version conflicts rather than overwriting remote changes.
- [ ] **Recovery Dialog**: Version conflicts display clear choices to either overwrite remote, pull remote, or cancel.
- [ ] **Pre-recovery CSV Option**: User is offered to download a CSV backup before committing a destructive conflict resolution.

### 6. Offline Usability & CSV Import/Export
- [ ] **Offline Execution**: App remains fully interactive with local data when offline.
- [ ] **CSV Export**: Click Export CSV while disconnected; backup download compiles and prompts.
- [ ] **CSV Import (Offline)**: Valid CSV can be imported and stored locally while disconnected.
- [ ] **Queue on Reconnect**: Offline changes are preserved and sync to Google Sheets when connection is restored.

---

## Part 2: Troubleshooting Guide

### 1. Runtime Debugging Priority
If an error or failure is reported:
1. Check the exact **live error string / observed behavior**.
2. Inspect **current workspace/repo files**.
3. Inspect **active deployment/config**.
4. Consult **repo docs / intended architecture**.
5. Disprove **prior assumptions**.
*Note: If an error matches retired Apps Script endpoints, inspect Apps Script deploys first to verify if the client is calling a stale backend.*

### 2. Common Scenarios & Diagnostics

#### A. "Connect Google" does not initiate OAuth
- **Cause**: Browser extensions (e.g., ad-blockers, tracking protection) blocking redirect, or invalid origin.
- **Fix**: Confirm the app is loaded from `https://walmart-gc.dotsthewarlock.com`. Ensure Cloudflare is routing `/auth/init` correctly. Turn off conflicting extensions.

#### B. Connected state does not persist after reload
- **Cause**: The HttpOnly cookie `walmart_gc_session` was not set, or frontend did not include credentials in status requests.
- **Fix**: Open Developer Tools -> Application -> Cookies. Ensure `walmart_gc_session` is present, marked `HttpOnly`, `Secure`, `SameSite=Lax`, and is tied to `walmart-gc.dotsthewarlock.com` (no `Domain=` parameter set). Verify `/api/status` calls specify `{ credentials: "include" }`.

#### C. Google Consent requests broad permissions
- **Cause**: Worker OAuth initiation is requesting a broader scope than `drive.file`.
- **Fix**: Inspect the scopes requested by the Cloudflare Worker in `worker/src/index.js`. It must request *only* `https://www.googleapis.com/auth/drive.file`.

#### D. Google Sheet setup / "Ensure Sheet" fails
- **Cause**: Google Drive/Sheets APIs are disabled on the developer console project, or scope authorization has expired.
- **Fix**: Confirm Google Drive API and Google Sheets API are enabled in the Google Cloud Console for the active client ID. Verify the session is still valid via `/api/status`.

#### E. Cloudflare KV Bindings error on deployment
- **Cause**: Deployed worker contains placeholder KV IDs in its configurations.
- **Fix**: Ensure that real KV IDs are bound to `SESSIONS` and `OAUTH_STATE` in the Cloudflare Worker settings (either via dashboard or by editing `worker/wrangler.toml` before running wrangler commands).

#### F. Apps Script Fallback Note
- **Cause**: Historical code or configurations may point to retired Apps Script scripts.
- **Fix**: If an exact live error string is found only in `apps-script/Code.gs`, it indicates the client is calling legacy infrastructure. Debug that runtime, but do not promote it to the active default architecture.

---

## Reference: Active Data Schemas

### Google Sheet & CSV Schema
Columns must be named exactly (case-sensitive) as follows:
```text
cardNumber,pin,startingBalance,currentBalance,merchant,merchantInferred,dateAdded,dateUpdated,dateUsed,used,notes
```
- **Tab 1**: `Cards` (Contains the gift cards database)
- **Tab 2**: `_META` (Contains sheet version metadata, specifically key `sheetVersion`)
