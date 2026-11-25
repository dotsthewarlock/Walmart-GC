# Active context — GC Wallet

Start here, then read [agent rules](../AGENTS.md), [architecture](ARCHITECTURE.md),
[M3 decisions](M3_DESIGN_DECISIONS.md) and [QA](QA_TEST_CHECKLIST.md).

## Current development

- Repository: dotsthewarlock/Walmart-GC.
- Production main: PR #231 merged as `56e20bce60149c661cbfb8d16303b6bbf13f4050`.
- Consolidated V0.3 source: `feature/sync-foundation` at `a73222a`.
- V0.3A.1 reviewed foundation: `819eef8c9536042fceabbf1f9b41d2d8f0cf234f`.
- Reviewed release-readiness candidate: `4acbf6dfa2a241ed0294d89018a9b1d66912344c`.
- React 19 / Vite / Tailwind / M3; existing Pages and same-origin Worker hosting.
- M1 is complete. M2 implementation is complete and automated validation passed;
  production acceptance through ordinary wallet use remains pending. Stop active
  V0.3 development. Companion development owns Batch selection refinements.
- Batch correction `a73222a9057465ea9374a8ddac42f5b9c5aff726` is independently
  accepted and CI passed. PR #231 merged as `56e20bce60149c661cbfb8d16303b6bbf13f4050`;
  the unpaused Worker is `01b61767-abad-41e8-a3de-137a51fc7d8f`. Production Batch
  request generation is user-confirmed working in the normal wallet UI.

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

## Acceptance and deployment context

The integrated cycle passed 154 Node tests, three local Worker/SQLite runtime tests,
four synthetic browser scenarios and the build. Previously accepted live Google
authentication and owned-Sheet verification remain accepted. Ordinary-use production
acceptance remains pending; synthetic tests do not establish it.

The checked-in Wrangler configuration retains `SYNC_ACTIVATION_BLOCKED="true"`;
the active deployment overrides it to false. Preserve that intent in any future
deployment. See [release readiness](V0.3_RELEASE_READINESS.md) for evidence and
recovery, and [Architecture](ARCHITECTURE.md) for data and synchronization contracts.
