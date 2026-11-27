# GC Wallet (Walmart-GC)

GC Wallet is a mobile-first, merchant-aware gift-card wallet, optimized first for
Walmart Canada. It provides passive checkout barcodes, PIN lookup, balance and
used-state tracking, CSV backup/recovery, and optional private Google Sheets sync.

`main` builds the live React 19 / Vite / Tailwind application at
https://walmart-gc.dotsthewarlock.com/. R1 is user-accepted at main
`78175c7f542d1928217bad30a2a70711c2508b6e`, [PR #255](https://github.com/dotsthewarlock/Walmart-GC/pull/255).
Read [Active Context](docs/ACTIVE_CONTEXT.md) first for current development.

## Data and privacy

IndexedDB is the sole writable local inventory authority. Local edits remain
available offline and synchronize through the existing protected protocol when
connected. Original migration inputs, pending work and unresolved recovery evidence
are preserved. Browser storage is not encrypted by the application; do not claim
otherwise. CSV backup and explicit recovery remain available.

The private, owned Google Sheet is the sole cloud card inventory. Only the matching
verified principal and exact owned Sheet can bind an inventory; shared/nonowned
Sheets are rejected. Account details and exceptional diagnostics stay in Settings.

The same-origin Cloudflare Worker owns Google OAuth, refresh grants and the
HttpOnly session cookie. Its only Google scope is `drive.file`. Frontend requests
use `/auth/*` and `/api/*`; no Google credentials or direct Drive/Sheets calls exist
in the browser. Existing KV stores session state; the Durable Object stores only
noncredential coordination metadata. See [Architecture](docs/ARCHITECTURE.md).

## Verification and Companion

Manual and Companion / Batch share selection filters, quantity and ordering,
including flagged-card priority, eligible used cards and provisional zero balances.
Mode changes and contextual exits retain the current UI session, drafts and
progress. Explicit selection replaces it; account/context changes fence it.

The extension supports explicit request/result transfer using Batch TSV v1.
Send selected requests from Wallet, receive them in the extension on the official
checker, then explicitly start checking. Return observations and receive them in
Wallet for preview and explicit application. Transport credentials remain in memory;
worker restart or interrupted transfer may require the saved TSV fallback. Manual
verification and the bookmarklet remain available. See the
[Companion guide](companion/README.md) and [distribution contract](companion/DISTRIBUTION.md).
Dev publication does not promote Stable.

## Development and release

```sh
npm ci
npm run dev
npm test
npm run test:browser
npm run build
npm run test:shell
git diff --check
```

Build the shared Companion artifacts before browser acceptance with
`python3 companion/build.py`. The integrated CI also runs the existing real
Worker/SQLite tests. Synthetic tests use invented data and intercepted services;
they do not establish native production merchant acceptance.

GitHub Actions builds and publishes Wallet and Dev Companion on authorized merges
to `main`. Preserve existing production routes, bindings, privacy and unpaused
activation. Do not redeploy an unaffected Worker. Rollback must preserve the
protected protocol, local inventory and recovery contracts; the old writable
Phase 12 client is not a safe rollback.

## Repository authorities

GitHub is the sole durable project authority. Consolidate decisions in their
existing owner; chat, Project source documents and historical reports are input,
not parallel live authorities.

- [Agent rules](AGENTS.md) — execution, ownership and release boundaries.
- [Active Context](docs/ACTIVE_CONTEXT.md) — accepted baseline and current work.
- [Architecture](docs/ARCHITECTURE.md) — data, API, persistence, transfer and recovery contracts.
- [M3 decisions](docs/M3_DESIGN_DECISIONS.md) — navigation, privacy and visual intent.
- [Roadmap](docs/ROADMAP.md) — approved work and deferred scope.
- [QA](docs/QA_TEST_CHECKLIST.md) — integrated acceptance and release prerequisites.
- [Deployment](docs/DEPLOYMENT_GUIDE.md) — existing hosting and release operation.
- [Sheet setup](docs/GOOGLE_SHEET_SETUP.md) — schema and owned-Sheet setup.
- [Archive](docs/archive/README.md) — historical evidence, not active instructions.
