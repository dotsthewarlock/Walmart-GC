# Active context — GC Wallet

Start here, then read [agent rules](../AGENTS.md), [architecture](ARCHITECTURE.md),
[M3 decisions](M3_DESIGN_DECISIONS.md) and [QA](QA_TEST_CHECKLIST.md).

## Current development

- Repository: dotsthewarlock/Walmart-GC.
- Accepted production main baseline: `bbbc9334dd261b1a897b98a8012d9bb22fdf7e31`.
- Consolidated V0.3 release candidate: `feature/sync-foundation`, draft PR #231.
- V0.3A.1 reviewed foundation: `819eef8c9536042fceabbf1f9b41d2d8f0cf234f`.
- React 19 / Vite / Tailwind / M3; existing Pages and same-origin Worker hosting.
- No merge or deployment is authorized by the consolidated development brief.

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
Local acceptance includes the production Node suite and an integrated Chromium
cycle with synthetic adapters, mobile/desktop navigation and two-device conflicts.
No live requests, secret reads or infrastructure changes are part of this work.
Prior native IndexedDB/restart acceptance is retained, not repeatedly rerun.

Use [QA](QA_TEST_CHECKLIST.md) for current commands and remaining integrated
acceptance. Use [Roadmap](ROADMAP.md) for scope, and [Architecture](ARCHITECTURE.md)
for contracts. Old explicit-sync phase briefs are historical, not active gates.
