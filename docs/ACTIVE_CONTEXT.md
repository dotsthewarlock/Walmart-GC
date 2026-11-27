# Active context — GC Wallet

Start here, then read [agent rules](../AGENTS.md), [architecture](ARCHITECTURE.md),
[M3 decisions](M3_DESIGN_DECISIONS.md) and [QA](QA_TEST_CHECKLIST.md).

## Current development

- Repository: dotsthewarlock/Walmart-GC.
- V0.4 / PR #243 adds offline balance checking, selection-independent request
  references, precise verification timestamps and Companion 1.0.4 Dev. Release
  evidence is recorded in the PR and deployment checks; Stable is not promoted.
- PR #245 released Companion 1.0.5 Dev from main `c740f0d1710efb7eecf058343ffda82ce1026d8a`.
  Foreground checks use a fixed 1,400 ms delay and continue to the selected
  target of 10, 25 or 50, or until the queue is empty, without ten-card
  segmentation or rest. Stable remains unpromoted.
- The compatible V0.4 Worker from source `1653373b0cf523a4bed63f54da239015f7bc50f8`
  is deployed at 100% as `6fe91b40-c301-44ea-9637-452598c8d20a`, retaining
  the unpaused activation state, bindings, routes and privacy settings. The
  matching frontend and Dev companion are delivered by the main Pages workflow.
- PR #240 merged as `dc67a0092d099e5f7e4d128583a79f1b581d5532` (KV write suppression and passive clipboard removal). The previous lean sync Worker from PR #241 was `062fca0a-95dc-4a8d-b49a-4fb4428724ef`; V0.4 replaced it with the deployed version above.
- PR #239 released Batch reliability and synchronization visibility. PR #237
  published Companion 1.0.3 Dev through Pages; its release baseline is main
  `d6b8ccbc23f8667bdbfa7efd69ec9f1a08465a98`. Stable has not been promoted.
- Consolidated V0.3 source: `a73222a`.
- V0.3A.1 reviewed foundation: `819eef8c9536042fceabbf1f9b41d2d8f0cf234f`.
- Reviewed release-readiness candidate: `4acbf6dfa2a241ed0294d89018a9b1d66912344c`.
- React 19 / Vite / Tailwind / M3; existing Pages and same-origin Worker hosting.
- M1 is complete. M2 implementation is complete and automated validation passed;
  production acceptance through ordinary wallet use remains pending.
- Batch correction `a73222a9057465ea9374a8ddac42f5b9c5aff726` is independently
  accepted and CI passed. PR #231 merged as `56e20bce60149c661cbfb8d16303b6bbf13f4050`;
  the then-active Worker was `01b61767-abad-41e8-a3de-137a51fc7d8f`. Production Batch
  request generation is user-confirmed working in the normal wallet UI.

V0.3 retains transactional IndexedDB, semantic operations, original migration
bytes, offline compartments, atomic Batch state and context generations. It adds
verified Google principal/exact owned Sheet binding, durable commit recovery,
per-Sheet coordination, conservative automatic reconciliation and fresh merchant
verification for balance uncertainty. Unbound/older unverified inventories remain
separate and recoverable; binding never automatically copies them to an account.

Lean maintenance in PR #241 follows the bounded roadmap:
change-driven sync, no idle polling, manual mode, no-op suppression, local Batch
preparation/preview and bounded retry/timeout/quota recovery. Pending work and in-flight identities survive
closure; the existing protected protocol, shared maintenance and recovery remain.

## Acceptance and deployment context

The lean sync cycle passed 165 Node tests, three local Worker/SQLite runtime tests,
five synthetic browser scenarios, the build and PR CI. Previously accepted live Google
authentication and owned-Sheet verification remain accepted. Ordinary-use production
acceptance, including real KV usage and companion/native clipboard behavior, remains
pending; synthetic tests and the inert hosted-loader check do not establish it.

The checked-in Wrangler configuration retains `SYNC_ACTIVATION_BLOCKED="true"`;
the active deployment overrides it to false. Preserve that intent in any future
deployment. See [release readiness](V0.3_RELEASE_READINESS.md) for evidence and
recovery, and [Architecture](ARCHITECTURE.md) for data and synchronization contracts.
