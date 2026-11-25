# GC Wallet roadmap

## Released V0.3 foundation

V0.3 consolidates transactional local persistence, verified account/Sheet binding,
protected per-Sheet coordination, conservative automatic sync, targeted recovery,
shared maintenance and uncertainty verification. Preserve wallet navigation, CSV,
Batch TSV v1 and M3 primitives. See [Architecture](ARCHITECTURE.md) for contracts.

The synchronization foundation and subsequent Batch reliability release are in
production. Previously accepted Google and infrastructure checks and the synthetic
release cycle are recorded in [release readiness](V0.3_RELEASE_READINESS.md).
Ordinary-use production acceptance remains pending.

Batch uses explicit copy, paste, preview and application only. No passive clipboard
reads, focus-triggered result detection or clipboard permission prompts.

## V0.3 maintenance: lean synchronization and quota recovery

1. PR #240 supplies unchanged KV write suppression and explicit-only Batch clipboard transfer. PR #241 builds on that merge and supplies event-driven automatic sync (3s coalescing, 15s minimum, 5min freshness, no idle polling), manual-only mode, no-op suppression, local Batch preparation/preview and bounded timeout and quota recovery.
2. The matching Worker was deployed before Pages as version `062fca0a-95dc-4a8d-b49a-4fb4428724ef`, retaining the unpaused flag, existing secrets and bindings, migration and privacy configuration. The protected content read and durable commit evidence remain; no protocol or schema change, cache, leader election or added infrastructure is introduced.
3. Verify real KV usage over an ordinary-use day and comparable development test. Acceptance: zero redundant writes in steady state, no quota warnings, target under 50 writes/day for one development user, checkout and Batch unchanged. 50 daily users is a planning target (10 necessary writes/user/day with 50% headroom), not measured capacity. No further work without demonstrated need.

PR #239 released Batch reliability and synchronization visibility. PR #237
published Companion 1.0.3 Dev; Stable remains unpromoted. Ordinary-use companion
and native clipboard acceptance remain pending.

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
