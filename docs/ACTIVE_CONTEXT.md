# Active context — GC Wallet

Start here, then read [agent rules](../AGENTS.md), [architecture](ARCHITECTURE.md),
[M3 decisions](M3_DESIGN_DECISIONS.md) and [QA](QA_TEST_CHECKLIST.md).

## Current development

- Repository: dotsthewarlock/Walmart-GC.
- Accepted production main baseline: `bbbc9334dd261b1a897b98a8012d9bb22fdf7e31`.
- Consolidated V0.3 release candidate: `feature/sync-foundation`, draft PR #231.
- V0.3A.1 reviewed foundation: `819eef8c9536042fceabbf1f9b41d2d8f0cf234f`.
- Reviewed release-readiness candidate: `4acbf6dfa2a241ed0294d89018a9b1d66912344c`.
- React 19 / Vite / Tailwind / M3; existing Pages and same-origin Worker hosting.
- Production activation is authorized by the operator's 2026-11-25 brief, after
  controlled Google verification. Device CSV/complete Sheet backups are confirmed
  and other editing is suspended. No merge before the activation gates pass.

V0.3 retains transactional IndexedDB, semantic operations, original migration
bytes, offline compartments, atomic Batch state and context generations. It adds
verified Google principal/exact owned Sheet binding, durable commit recovery,
per-Sheet coordination, conservative automatic reconciliation and fresh merchant
verification for balance uncertainty. Unbound/older unverified inventories remain
separate and recoverable; binding never automatically copies them to an account.

Automatic synchronization coalesces completed actions around two seconds and
checks the foreground about every minute, on launch, foreground and reconnect.
Pending work and in-flight identities survive closure. Closed-page execution is
not promised. Explicit controls use the same protected protocol; legacy whole-
inventory writes are fenced. Shared maintenance is required before direct edits.

## Release prerequisites

The code and synthetic adapters do not establish production readiness. Verify the
actual Durable Object runtime/binding/migration and service entitlement; Google
permissionId/owned-file checks under drive.file; session/secret binding integrity;
coordinated API routing; and the integrated browser cycle before release.
Local readiness includes acknowledgment-rebase and missing-row durability fixes,
patched build tools with a zero-finding dependency audit, the production Node suite,
actual workerd/SQLite restart/coordination tests with mocked Google, and integrated
Chromium mobile/desktop navigation and two-device conflicts.
Activation preparation verified existing production metadata without reading secret
values. Wrangler config now records verified resources/routes, the new SQLite
migration and preserved privacy settings. `SYNC_ACTIVATION_BLOCKED="true"` allows
Drive identity/ownership checks while blocking inventory reads, writes and setup.
Secure Wrangler sign-in and controlled Google proof are required before activation;
configuration preparation is not evidence of deployment. Never read secret values.
Prior native IndexedDB/restart acceptance is retained, not repeatedly rerun.

Use [QA](QA_TEST_CHECKLIST.md) for current commands and remaining integrated
acceptance. Use [Roadmap](ROADMAP.md) for scope, and [Architecture](ARCHITECTURE.md)
for contracts. Old explicit-sync phase briefs are historical, not active gates.
The [consolidated activation/recovery plan](V0.3_RELEASE_READINESS.md) owns the
ordered external steps, private backup, Google verification and safe rollback.
