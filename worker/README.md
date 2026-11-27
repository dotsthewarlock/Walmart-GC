# GC Wallet synchronization Worker

The existing `walmart-gc-oauth` Worker owns Google OAuth/session handling and
same-origin `/auth/*` and `/api/*` on `https://walmart-gc.dotsthewarlock.com`.
GitHub Pages serves the static frontend. [Architecture](../docs/ARCHITECTURE.md)
is the authority for account binding, schema, protocol, recovery and rollback;
[QA](../docs/QA_TEST_CHECKLIST.md) owns acceptance and capacity workloads.

## Runtime contract

- OAuth uses only `https://www.googleapis.com/auth/drive.file`. Access/refresh
  tokens remain server-side. The frontend never receives browser Google credentials.
- The host-only session cookie is HttpOnly, Secure and SameSite=Lax. Session keys
  are HMAC-derived. Existing signing continuity and KV write suppression remain.
- Protected operations require the verified Google principal and exact private
  owned Sheet. Cached Sheet IDs, shared/nonowned files and email identity do not
  establish ownership.
- `GET /api/status` reports authentication, principal, binding/capabilities and
  coordination availability without tokens. `POST /api/logout` ends the session.
- `POST /api/sync` uses `gc-wallet-sync-v1` for pull, semantic commit and explicit
  shared maintenance. `POST /api/sheet/ensure` performs protected setup. Historical
  `/api/cards/save` cannot bypass protocol fencing; old writers receive 426.
- One SQLite Durable Object per Sheet serializes external reads/writes. Setup
  creation has a separate principal-scoped fence. DO persistence contains only
  coordination IDs, hashes, versions and bounded receipts, never card credentials.
- Possible external dispatch is persisted before writing. Only positive matching
  commit/content proof can confirm an uncertain write. Missing markers and timeouts
  never authorize redispatch or a new request identity.

## R1 recovery and evidence

Valid duplicate rows are projected deterministically. Matching credentials and
compatible fields consolidate; provisional conflicting balances are never summed.
Unresolved credential alternatives remain private recovery evidence and affect only
that card's checkout/verification. Compatible external edits use a retained hashed
baseline; otherwise explicit shared maintenance is required.

Logical v1 evidence and historical single-cell `_META.syncEvidence` remain readable.
New Sheet writes pack ordinary revisions into bounded `syncEvidence:N` cells with a
manifest in `syncEvidence`. Inventory, evidence parts and commit marker share one
Sheets batch. Missing/corrupt parts fail closed. Resolved alternatives compact;
monetary revisions, uncertainty/applicability fences and explicit deletion
identities remain. See Architecture for retention and final capacity bounds.

Shared maintenance temporarily preserves original cards in protected private Sheet
evidence. Resume restores accidentally missing records unless exact deletion was
explicitly confirmed, restores genuine verification times and marks only changed
monetary/credential/verification contexts uncertain. Temporary originals are removed
in the confirmed resume write. The DO retains only an aggregate evidence hash;
legacy in-progress maintenance proofs remain readable.

## Existing production configuration

[wrangler.toml](./wrangler.toml) records the existing account, two KV namespaces,
`SHEET_COORDINATOR` binding, original SQLite migration, compatibility date and
same-origin routes. Preserve all of them. The migration history is permanent.
`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` and `SESSION_SECRET` remain Worker secret
bindings; never read or print their values.

The checked-in activation flag is paused; the accepted production deployment is
unpaused. An authorized compatible deployment must preserve
`SYNC_ACTIVATION_BLOCKED=false`, existing bindings/namespace, session continuity,
query-string redaction and disabled invocation logs, traces, issues and Logpush.
Do not provision replacement resources or change privacy configuration.

Release only after independent review, required CI and explicit user release
scope. Deploy the compatible Worker before the frontend through the existing
release process. Record exact source, bundle/version/deployment identity and
configuration comparison in the PR. Verify the unauthenticated same-origin status
route and public hosted assets without cookies or private inventory. Actual private
inventory recovery remains a separate user-performed acceptance step.

Use a compatible forward fix or fenced recovery build for rollback. An older Worker
cannot read the new evidence manifest; never erase evidence, clear IndexedDB or
replace the coordination namespace to make an old writable build run.
