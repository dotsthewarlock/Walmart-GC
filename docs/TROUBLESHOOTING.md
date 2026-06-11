# Troubleshooting

This guide covers the active Phase 11 Worker-backed Google OAuth + `drive.file` sync path. Apps Script troubleshooting is historical only and does not apply to the active Phase 11 app.

## Active URLs

Frontend production/development/testing URL:

```text
https://walmart-gc.dotsthewarlock.com
```

Backend Worker:

```text
https://walmart-gc-oauth.dotsthewarlock.com
```

Do not use localhost OAuth, alternate OAuth origins, `/Walmart-GC/` callback paths, or session IDs in query parameters.


## Worker KV Binding Problems

The Worker must have Cloudflare KV bindings named exactly:

- `SESSIONS`
- `OAUTH_STATE`

If deploying from `worker/wrangler.toml`, replace the checked-in placeholder IDs with real KV namespace IDs for the target Cloudflare account, or configure equivalent bindings through the Cloudflare dashboard/deployment pipeline. Placeholder values such as `REPLACE_WITH_SESSIONS_KV_NAMESPACE_ID` and `REPLACE_WITH_OAUTH_STATE_KV_NAMESPACE_ID` are documentation placeholders only; they are not valid deployment IDs.

Symptoms of missing or placeholder KV bindings can include OAuth state failures, sessions that do not persist, `/api/status` returning disconnected after callback, or logout/status requests failing at the Worker.

## Connect Google Does Not Start OAuth

Check:

- The app is opened from `https://walmart-gc.dotsthewarlock.com`.
- The Worker URL is reachable.
- The Connect Google action points to the Worker OAuth init endpoint.
- No browser extension is blocking redirects or third-party authentication.

## Google Consent Shows the Wrong Scope

Expected scope:

```text
https://www.googleapis.com/auth/drive.file
```

If consent requests broader Drive or Sheets scopes, stop and fix the Worker OAuth configuration before continuing.

## Callback Fails

Required Google Cloud settings:

```text
Authorized JavaScript origin:
https://walmart-gc.dotsthewarlock.com

Authorized redirect URI:
https://walmart-gc-oauth.dotsthewarlock.com/auth/callback
```

Expected callback return:

```text
https://walmart-gc.dotsthewarlock.com/?auth=connected
```

The callback must not return to `/Walmart-GC/` and must not include a `session_id` query parameter.

## Connected State Does Not Persist After Refresh

Check:

- Worker callback set `walmart_gc_session`.
- Cookie is HttpOnly, Secure, SameSite=Lax, host-only, and has `Path=/`.
- Cookie does not set `Domain=`.
- If the KV session is missing, expired, invalid, or otherwise unusable, `/api/status` should return disconnected and clear the stale cookie with the same host-only cookie attributes.
- Frontend calls `/api/status` with `credentials: "include"`.
- Credentialed CORS allows exactly `https://walmart-gc.dotsthewarlock.com`.
- Browser settings are not blocking required cookies.

The frontend should never store access tokens, refresh tokens, session IDs, OAuth secrets, or Google API credentials. Do not work around cookie/session issues by adding browser token storage.

## Logout Does Not Clear Session

Expected endpoint:

```text
POST /api/logout
```

Check:

- Request uses `credentials: "include"`.
- Worker deletes the KV session when present.
- Worker clears the `walmart_gc_session` cookie.
- `/api/status` reports disconnected after logout.
- Reconnect starts a fresh OAuth flow and returns to the app.

## Ensure Sheet Fails

Expected Worker behavior:

- Use `drive.file` only.
- Search for an app-accessible spreadsheet named `Walmart-GC Data`.
- Create it if missing.
- Initialize `Cards` and `_META`.
- Return Sheet metadata.

Check that Google Drive API and Google Sheets API are enabled for the OAuth project.

## Load from Google Sheets Fails

Check:

- `/api/status` reports connected.
- The active Sheet ID refers to `Walmart-GC Data`.
- `Cards` exists with the approved schema.
- `_META.sheetVersion` exists.
- Worker API calls include credentials.
- Offline mode is not active.

## Save/Sync Fails

Expected sync model:

- Worker-backed sync only.
- Completed-action sync only.
- No sync on every keystroke.
- Conflict detection through `_META.sheetVersion`.

If a conflict is reported:

- Do not silently overwrite.
- Do not auto-merge.
- Export a CSV backup before destructive recovery.
- Let the user choose recovery.

## Offline or Disconnected Use

Offline behavior remains supported:

- Local cards remain available.
- CSV export/import remains available.
- Unsynced changes remain local until reconnection.
- Google sync actions should show readable reconnect/setup guidance rather than erasing data.

## Historical Apps Script Notes

Apps Script was part of the historical MVP and may appear in historical reference files. It is retired from the active Phase 11 architecture and should not be presented as an active setup, diagnostic, or sync path.
