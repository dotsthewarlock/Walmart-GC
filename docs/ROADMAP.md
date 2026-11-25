# GC Wallet roadmap

## Approved current release candidate

V0.3 consolidates transactional local persistence, verified account/Sheet binding,
protected per-Sheet coordination, conservative automatic sync, targeted recovery,
shared maintenance and uncertainty verification. Preserve wallet navigation, CSV,
Batch TSV v1 and M3 primitives. See [Architecture](ARCHITECTURE.md) for contracts.

Independent review and [release acceptance](QA_TEST_CHECKLIST.md) precede merge or
deployment. Actual DO runtime/binding, stable Google principal/ownership behavior,
secret/session binding integrity and integrated browser QA remain prerequisites.

Batch uses explicit copy, paste, preview and application only. No passive clipboard
reads, focus-triggered result detection or clipboard permission prompts.

## V0.3 maintenance: lean synchronization and quota recovery

1. Release merged PR #240 (unchanged KV write suppression and explicit-only Batch clipboard transfer) using the existing production Worker and Pages; preserve the live false activation flag, secrets, bindings, migration and privacy configuration. Do not wait for the follow-up to resolve the primary KV defect.
2. One follow-up PR: event-driven automatic sync (3s coalescing, 15s minimum, 5min freshness, no idle polling), manual-only option and Sync now (5s cooldown), no-op suppression, local Batch preparation/preview with fresh checks for export/apply, timeout and quota backoff. Keep the full protected content read and durable commit evidence; no protocol or schema change, cache, leader election, quota service or additional infrastructure. Run existing regressions plus focused scheduling/quota and Batch tests. Publish only after passing validation and review. Deploy Worker before matching Pages. Preserve pending work and no blind retries.
3. Verify real KV usage over an ordinary-use day and comparable development test. Acceptance: zero redundant writes in steady state, no quota warnings, target under 50 writes/day for one development user, checkout and Batch unchanged. 50 daily users is a planning target (10 necessary writes/user/day with 50% headroom), not measured capacity. No further work without demonstrated need.

## Near term, only after synchronization foundation

Online-use reconciliation remains deferred. Full UTC verification timestamp
persistence is a separate approved design exercise; preserve date-only storage now.
Improve recovery evidence cleanup only when actual usage warrants it and safe
retention/backup requirements are established.

## Unapproved expansion

No central card database, generalized event sourcing, public account platform,
merchant automation, helper rewrite, new OAuth scopes or runtime dependencies.
No speculative abstractions, navigation redesign or unrelated features.

[Historical explicit-sync/phase requirements](archive/pre-v0.3-sync-governance.md)
are superseded by the consolidated V0.3 authorization and are not active gates.
