# Manual Test Plan

This manual test plan prioritizes the active Phase 11 Worker-managed OAuth/session flow before broader app validation.

```text
User Google Account
        ↕
Google OAuth
        ↕
Cloudflare Worker
        ↕
Google Drive API / Google Sheets API
        ↕
Walmart-GC Web App
```

## Test Environment

Use only the cloud app for production, development, and testing:

```text
https://walmart-gc.dotsthewarlock.com
```

Backend Worker:

```text
https://walmart-gc-oauth.dotsthewarlock.com
```

No localhost OAuth, alternate OAuth origin, `/Walmart-GC/` callback path, or session ID query parameter is supported.

Record:

| Item | Value |
| --- | --- |
| Browser/device |  |
| Walmart-GC URL | https://walmart-gc.dotsthewarlock.com |
| Worker URL | https://walmart-gc-oauth.dotsthewarlock.com |
| Frontend token/session storage absent? |  |
| Active Sheet name/ID |  |
| Starting card count |  |
| HTML/JS/CSS debug versions |  |

## Setup Checklist

- [ ] App loads from `https://walmart-gc.dotsthewarlock.com`.
- [ ] Debug fingerprint is visible in the header.
- [ ] Data panel shows Google Account, Google Sheet, CSV Backup & Recovery, and diagnostics/status output.
- [ ] No user-facing OAuth Client ID input appears.
- [ ] No normal first-run Sheet URL/ID input appears.
- [ ] No active Apps Script setup, URL field, health check, or Apps Script load button appears.
- [ ] CSV export is available before sync testing.
- [ ] Browser storage does not contain Google access tokens, refresh tokens, session IDs, OAuth secrets, or Google API credentials.

## Phase 11 OAuth and Session Success Criteria

OAuth is fixed when every item in this section passes:

- [ ] Select **Connect Google**.
- [ ] OAuth starts through the Worker.
- [ ] Consent requests only `https://www.googleapis.com/auth/drive.file`.
- [ ] Callback succeeds.
- [ ] Callback returns to `https://walmart-gc.dotsthewarlock.com/?auth=connected`.
- [ ] The URL cleans itself without any session query parameter.
- [ ] Worker sets an HttpOnly, Secure, SameSite=Lax, host-only session cookie.
- [ ] `/api/status` reports connected.
- [ ] Refresh preserves login.
- [ ] Browser restart preserves login while the session is valid.
- [ ] Logout uses `/api/logout` and clears the session.
- [ ] Reconnect works.
- [ ] Frontend Worker API calls use credentialed requests.
- [ ] Frontend never stores access tokens, refresh tokens, session IDs, OAuth secrets, or Google API credentials.

## Google Account and Sheet Lifecycle

- [ ] First-run blank user opens the app with no Google connection and no local cards.
- [ ] Diagnostics show Worker session **Disconnected**, Sheet proxy **Needs setup**, local card count, and offline/local availability.
- [ ] Complete the OAuth/session success criteria above.
- [ ] Select **Ensure Sheet**.
- [ ] Worker searches for `Walmart-GC Data`.
- [ ] If missing, app creates `Walmart-GC Data`.
- [ ] App stores the active Sheet ID locally.
- [ ] Worker initializes `Cards` headers.
- [ ] Worker initializes hidden `_META` metadata with `sheetVersion`.
- [ ] Diagnostics show Sheet proxy **Ready**, active Sheet ID/name, local sheetVersion, and remote sheetVersion if known.
- [ ] **Open Sheet** opens the active Google Sheet.
- [ ] **Load from Google Sheets** loads remote data through the Worker.
- [ ] Logout/disconnect clears the Worker session.
- [ ] Local cards and saved Sheet state remain available.
- [ ] Reconnect Google and confirm it reuses the saved/found Sheet.

## Approved Sheet Schema

Confirm `Cards` uses exactly:

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

Confirm tabs:

```text
Cards
_META
```

Confirm barcode payload remains derived only and is not stored:

```text
79936686504000 + cardNumber
```

## Sync Behavior

Completed actions sync through the Worker only:

- [ ] Balance save syncs after save.
- [ ] Used state change syncs after the state changes.
- [ ] Notes save syncs after save.
- [ ] Merchant change syncs after save/change completion.
- [ ] New card save syncs after save.
- [ ] Accepted CSV import syncs after acceptance.
- [ ] Ordinary typing does not sync every keystroke.

## Conflict Handling

- [ ] Sheet-level optimistic concurrency uses `_META.sheetVersion`.
- [ ] A stale local save is rejected instead of silently overwriting remote changes.
- [ ] No automatic merge occurs.
- [ ] User chooses recovery.
- [ ] CSV backup is offered before destructive recovery.

## First-Run Data Safety

- [ ] Blank remote Sheet with no meaningful local cards leaves the app ready with an empty card list.
- [ ] Blank remote Sheet with local cards does not erase local cards.
- [ ] Remote cards plus local cards require an explicit user choice before replacing either side.
- [ ] Local/offline data remains usable if OAuth, status, ensure, load, or save fails.

## Offline and CSV Recovery

- [ ] App remains usable with local cards while offline.
- [ ] CSV export works while disconnected.
- [ ] CSV import works while disconnected.
- [ ] Accepted CSV import can sync when reconnected.
- [ ] CSV backup/recovery remains separate from Google Sheets sync controls.

## Broader App Validation

After OAuth/session, Sheet, and sync checks pass, validate the existing product basics:

- [ ] Card list is usable on mobile and desktop.
- [ ] Card detail view shows barcode, PIN, balance, used state, merchant, and notes.
- [ ] Checkout mode remains fast for in-store barcode access.
- [ ] Balance and used-state display remain clear.
- [ ] Existing UI behavior is not redesigned as part of Phase 11 unless required for OAuth/session durability.
