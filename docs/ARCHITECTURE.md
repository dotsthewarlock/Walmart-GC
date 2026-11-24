# Architecture (GC Wallet)

## Overview

**GC Wallet** (deployed and tracked under repository identifier `Walmart-GC`) uses a React 19 + Vite + Tailwind CSS frontend environment plus a Cloudflare Worker backend architecture. It avoids databases, Firebase, Cloud Functions, Apps Script sync, Node backends, VPS hosting, and app-managed user accounts.

`main` is the active live branch. The application is built and deployed to GitHub Pages via GitHub Actions from `main` (React 19 + Vite + Tailwind CSS). The legacy `phase-12` branch remains preserved as the archival baseline. Core product behavior should not be redesigned unless it directly blocks OAuth, session management, Google Sheets access, or sync.


## Runtime Debugging Priority

The Cloudflare Worker remains the active runtime for OAuth, sessions, Drive, and Sheets access. For live incidents, do not let intended architecture override direct runtime evidence. Debug in this order:

1. Exact live error string / observed behavior
2. Current workspace/repo files
3. Active deployment/config
4. Repo docs / intended architecture
5. Prior assumptions

If an exact live error string exists only in `apps-script/Code.gs`, inspect and debug Apps Script first until the active runtime is disproven. This does not make Apps Script the active default architecture; it only prevents ignoring live evidence.

## Current React Migration Architecture

```text
User Google Account
        ↕
Google OAuth
        ↕
Cloudflare Worker
        ↕
Google Drive API / Google Sheets API
        ↕
GC Wallet (Static React 19 + Vite Web App)
```

Deployment URLs:

```text
Frontend production/development/testing:
https://walmart-gc.dotsthewarlock.com

Worker same-origin routes:
https://walmart-gc.dotsthewarlock.com/auth/*
https://walmart-gc.dotsthewarlock.com/api/*

Legacy Worker subdomain fallback:
https://walmart-gc-oauth.dotsthewarlock.com
```

Local browser storage and CSV backup/recovery remain available when offline or disconnected.

## Components

### GC Wallet Web App

The static frontend provides:

- Card list.
- Card details.
- Barcode display.
- Balance, used-state, notes, and merchant edits.
- Guided, manual balance review for Walmart Canada cards.
- Worker-backed Google Sheet sync controls.
- CSV backup and recovery.
- Offline/local browser usability.

The frontend is React 19 + Vite + Tailwind CSS. Local development assumes a default port alignment (e.g., port 5174) proxied to the Worker, which must be verified before local OAuth testing rather than treated as an approved package/config change. Production is compiled and hosted via GitHub Pages.

### Cloudflare Worker

The Worker owns:

- Google OAuth initiation and callback handling.
- Refresh tokens and server-side token refresh.
- HttpOnly, Secure, SameSite=Lax, host-only session cookie.
- `/api/status` auth state.
- `/api/logout` session clearing.
- Google Drive API calls.
- Google Sheets API calls.
- Sheet discovery, creation, initialization, metadata, and sync conflict checks.

Cloudflare routes `walmart-gc.dotsthewarlock.com/auth/*` and `walmart-gc.dotsthewarlock.com/api/*` to the Worker while GitHub Pages serves the static app at the root. Frontend Worker API calls use same-origin `/auth/*` and `/api/*` paths with `credentials: "include"`; CORS is retained only as a defensive fallback for legacy Worker-domain calls.

### Google OAuth

The OAuth scope is exactly:

```text
https://www.googleapis.com/auth/drive.file
```

Google Cloud settings:

```text
Authorized JavaScript origin:
https://walmart-gc.dotsthewarlock.com

Authorized redirect URI:
https://walmart-gc.dotsthewarlock.com/auth/callback
```

The Worker callback returns to:

```text
https://walmart-gc.dotsthewarlock.com/?auth=connected
```

The frontend never stores access tokens, refresh tokens, session IDs, OAuth secrets, or Google API credentials. Do not use Google Identity Services browser token flow, direct browser Drive API calls, direct browser Sheets API calls, alternate OAuth origins, `/Walmart-GC/`, or session IDs in query parameters. Production OAuth testing is cloud-only. For local development, the OAuth callback `http://127.0.0.1:5174/auth/callback` is the intended local dev/OAuth alignment that must be verified before local OAuth testing, not an approved package/config change.

### Google Sheet

The user-owned Google Sheet is the online source of truth. The active spreadsheet is named:

```text
Walmart-GC Data
```

Tabs:

- `Cards`: the approved card data schema.
- `_META`: sheet metadata, including the optimistic `sheetVersion` value used for conflict detection.

Required `Cards` fields (header-name based, in preferred creation order):

```text
cardNumber
pin
startingBalance
currentBalance
merchant
merchantInferred
dateAdded
dateUpdated
dateUsed
used
notes
```

Merchant model: `merchant` stores only the explicit user-entered/user-selected override and must not be inferred/defaulted to `walmart-ca` when blank; `merchantInferred` stores the app/Worker-derived merchant from `cardNumber` and is `walmart-ca` for valid Walmart Canada cards; runtime-only `effectiveMerchant = merchant || merchantInferred` must not be stored. Historical 10-column Sheets that omit only `merchantInferred` remain readable. The Worker derives it on load and appends its header on the next valid inventory save. Existing headers keep their positions.

V0.1 adds two optional fields. `lastBalanceChecked` is a valid UTC calendar date in `YYYY-MM-DD` form. `pendingReconciliation` can be absent or Boolean `false`. V0.1 rejects `true`. Empty Sheet and CSV cells become absent fields in card JSON. Existing rows receive no backfill, and historical dates do not supply `lastBalanceChecked`.

Bookmarklet protocol v1 returns `ref`, `balanceCAD`, and a full ISO UTC `checkedAt`. V0.1 provides storage for the calendar day only. Transfer parsing, the request ledger, the review UI, precise same-day ordering, and replay protection belong to V0.2.

Sheets accept 11, 12, or 13 headers with either optional column in any position. Reads leave data untouched. On a compatible, version-checked save, the Worker appends each missing optional header whose field has a value in the saved inventory. An explicit `false` counts as a value. Unknown or duplicate headers, interior blank names, and occupied append targets block the save. Blank-looking formulas also occupy an append target.

CSV exports use all 13 headers with empty cells for absent metadata. Historical 8-, 10-, and 11-column CSVs still import with their headers or in their historical headerless order. The 12- and 13-column formats require header names. A restore that would replace or remove existing balance-check metadata asks for confirmation and advises a CSV backup. Invalid rows and unsupported metadata block the entire import or Sheet load.

Barcode payload is derived only and must not be stored:

```text
79936686504000 + cardNumber
```

### Google Drive and Sheets APIs

The frontend loads, ensures, and saves Sheets data only through Worker endpoints. The Worker performs the server-side Drive and Sheets API calls using only `drive.file`, including `_META.sheetVersion` conflict checks.

## Sync Model

### Guided balance review

Cards opens a secondary review task with a session-only queue of eligible Walmart Canada cards, including used cards and cards with zero balances. The queue uses exact card numbers and starts with unverified cards. Previously verified cards follow in ascending verification-date order, with card number breaking ties. The Walmart Canada checker opens in a separate tab. The user copies credentials separately and enters the observed balance manually.

An explicit confirmation records the observation's UTC day. Only an actual balance change updates `currentBalance` and `dateUpdated`. Used state, optional flags, and unrelated fields are preserved. A checked local save validates the entire inventory and compares the stored snapshot immediately before writing. It detects observable competing changes without providing atomic cross-tab locking. Failed writes leave the review on the current card and retain the entered value.

Completed reviews persist on the device. The queue and unfinished inputs end when the task exits or the page reloads. Google Sheets updates still require the existing explicit export.

### Google Sheets synchronization

Worker-backed sync only. Completed actions sync after:

- Balance save.
- Used state change.
- Notes save.
- Merchant change.
- New card save.
- Accepted CSV import.

Do not sync every keystroke.

Conflict model:

- Sheet-level optimistic concurrency via `_META.sheetVersion`.
- No silent overwrite.
- No automatic merge.
- User chooses recovery.
- CSV backup before destructive recovery.
- A save checks the client capability, stored metadata, append targets and current version before changing the Sheet. One Sheets batch writes any new headers, the inventory and the new `sheetVersion`. A load checks the version on either side of the card read. These checks use the existing optimistic model. Manual edits that do not update `_META` and concurrent requests that both pass the version check can still race.
- The `schemaCapability` marker is `optional-card-metadata-v1`. The Worker advertises it in status, ensure, load and save responses. Saves include the marker. Once the Sheet has either optional header, legacy writes are rejected, including explicit overwrite requests and empty inventories. Before extension, the legacy `cards` payload still works. The updated frontend sends populated metadata in `cardsWithMetadata` without a `cards` array, which the baseline Worker rejects before calling Sheets.
- Ordinary saves that would drop a populated optional field for a card number return a conflict. This includes explicit `false`, removed cards, and an empty inventory. The existing overwrite recovery prompts the user to back up the Sheet and confirm removal, then sends `acknowledgeMetadataRemoval: true` with the current version. Capability and version checks still apply.
- Fix Sheet initializes a missing structure and fills missing `_META` entries in place. A new browser must load an existing populated Sheet to establish its sync version with a V0.1 Worker. Fix Sheet does not rebase a previously versioned inventory over remote changes. Explicit overwrite recovery uses the known remote version and remains subject to the same capability and version checks.
- Deploy the updated Worker before enabling metadata persistence in the client. A Worker rollback can still serve unextended Sheets. The baseline Worker rejects extended headers, and the updated client blocks metadata-bearing saves to it. An older frontend can drop optional values from browser storage during local edits. Preserve a 13-column CSV backup and use a compatible frontend before editing that data.

## Batch balance transfer

Batch mode under Review balances works alongside offline Manual mode. It prepares a request for the existing Walmart Canada bookmarklet and imports results through the clipboard. The wallet opens the [official checker](https://www.walmart.ca/en/account/giftcards/balance) in a separate tab. The user controls merchant submissions and explicitly exports saved results to Google Sheets from Settings.

### Clipboard protocol v1

The first line of a request is `WMGC-REQUEST<TAB>1`, followed by `ref<TAB>cardNumber<TAB>pin`. Rows contain a cryptographically random lowercase UUID v4, 16 ASCII digits, and a four-digit ASCII PIN. Resume reconstructs pending rows from the current inventory with their original references.

Results begin with `WMGC-RESULT<TAB>1`, followed by `ref<TAB>balanceCAD<TAB>checkedAt`. Rows contain the request UUID, a nonnegative CAD amount with exactly two fractional digits, and a UTC ISO timestamp in `Date.toISOString()` format. Literal tabs and LF or CRLF delimit the packet. The reader accepts an initial UTF-8 BOM and trailing empty lines. Headers and version are case-sensitive. Validation checks every row before preview. Identical duplicates collapse, while conflicting duplicates or malformed rows reject the packet. Unknown references cannot be applied.

### Identity, continuity, and recovery

- Batch requires a secure browser context with Web Crypto and Web Locks. Fresh same-origin `/api/status` responses must confirm authentication, the optional metadata capability, and the same nonempty Sheet ID and session-known version held in the wallet's established local sync context. Status does not read current remote `_META`.
- The wallet stores one versioned ledger per origin in `walmartGc.balanceTransfer`. It records Sheet context, request references, exact card numbers, creation timestamps, non-PIN snapshots, applied values and times, and an interruption marker. A batch-salted SHA-256 fingerprint detects changes in the saved inventory across reloads and is cleared when no requests remain pending. The ledger contains no cleartext PINs, request packets, or OAuth credentials. The fingerprint is a continuity check and provides no protection against an attacker with local access.
- Wallet edits and Sheet or connection actions invalidate pending requests before a conflicting mutation. Unchanged manual confirmations also invalidate them. An observable context switch or saved inventory change invalidates pending requests on the next Batch check. Invalidation failure blocks the conflicting action while the ledger needs recovery.
- An observation must be at least as new as its request and no more than 60 seconds ahead of the browser clock. The wallet rejects an observation on or before a previous date-only UTC verification since the order cannot be established. Applied references retain exact times and amounts for identifying replays or rejecting conflicting replays.
- Apply rechecks the preview, context, and saved state. It writes and verifies the exact proposed observations in the ledger, writes the complete inventory once, then finalizes the references. After an interrupted apply or ledger damage, displayed balances may be stale. Discard requires the displayed inventory to match valid persisted cards. If that check fails, recovery stays protected until a wallet reload and a successful check. The wallet never infers an interrupted outcome from a verification date.
- Web Locks serialize cooperating Batch actions. Ledger and inventory writes use separate storage keys with comparison and readback checks. Older clients or external writes can bypass local invalidation, exact-value changes and reversals can go undetected, and browser or remote operations are not atomic across tabs or devices. The first production metadata-bearing export remains subject to normal Sheet version and schema checks.

## Design Principles

- Mobile first.
- Minimal dependencies.
- Static hosting.
- Spreadsheet as source of truth.
- Explicit conflict recovery.
- Durable Worker-managed OAuth sessions.
- Offline usability and CSV backup/recovery.
- Low maintenance.

## Historical Context

Current active architecture is Worker-managed OAuth/session and Worker-backed Drive/Sheets access. Apps Script is retired as the active sync path. Historical Apps Script and Phase 6 docs live under `docs/archive/` and should be consulted only when an exact live error string points there, a regression requires historical comparison, the user asks for history, or the task is specifically about migration/history.

Phase 9, Phase 10, Phase 10E, and Apps Script MVP documentation are historical only. Apps Script sync is retired from the active architecture and must not be recommended as the active sync path.
