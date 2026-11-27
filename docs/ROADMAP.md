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

Batch uses explicit extension transfer or copy/paste, preview and application. No passive clipboard
reads, focus-triggered result detection or clipboard permission prompts.

## R1 — accepted

R1 is user-accepted at main `78175c7`, [PR #255](https://github.com/dotsthewarlock/Walmart-GC/pull/255). Preserve the released record-level MERGE / FLAG / QUARANTINE policy, conservative monetary verification, credentials, migration originals, pending work and uncertain-write fences. R1 is complete and is not reopened by R2. Architecture and QA retain the technical and regression contracts; release evidence stays in the PR.

## R2 — authorized unified verification and direct Companion

One branch/PR combines repository-first governance consolidation, shared Manual and Companion filters/quantity/order/session ownership, retained drafts/progress/navigation, and explicit extension request/result transport using Batch v1. Use the existing inventory commands, ledger, observation validation and R1 retirement. Preserve flagged used/zero selection, ephemeral credentials, strict origin/sender/version/session checks, explicit merchant initiation, foreground 10/25/50 targets and fixed 1,400 ms pacing. Results return to Wallet preview and explicit Apply; Manual and TSV/bookmarklet fallback remain recoverable.

Independent review and required CI precede the user-authorized protected merge, Wallet release and Dev Companion publication. Verify public shell digests, descriptor revision, both artifact hashes and inert transport compatibility. Preserve infrastructure/configuration and leave an unaffected Worker deployed. No Stable promotion, standalone A4, schema change, runtime dependency, background merchant execution, automatic retry or challenge bypass.

## V0.3 maintenance: lean synchronization and quota recovery

1. PR #240 supplies unchanged KV write suppression and explicit-only Batch clipboard transfer. PR #241 builds on that merge and supplies event-driven automatic sync (3s coalescing, 15s minimum, 5min freshness, no idle polling), manual-only mode, no-op suppression, local Batch preparation/preview and bounded timeout and quota recovery.
2. The matching Worker was deployed before Pages as version `062fca0a-95dc-4a8d-b49a-4fb4428724ef`, retaining the unpaused flag, existing secrets and bindings, migration and privacy configuration. The protected content read and durable commit evidence remain; no protocol or schema change, cache, leader election or added infrastructure is introduced.
3. Verify real KV usage over an ordinary-use day and comparable development test. Acceptance: zero redundant writes in steady state, no quota warnings, target under 50 writes/day for one development user, checkout and Batch unchanged. 50 daily users is a planning target (10 necessary writes/user/day with 50% headroom), not measured capacity. No further work without demonstrated need.

PR #239 released Batch reliability and synchronization visibility. PR #245
released Companion 1.0.5 Dev with a fixed 1,400 ms delay, selected targets of
10, 25 or 50, and no ten-card segmentation or rest. Stable remains unpromoted.
Ordinary-use companion and native clipboard acceptance remain pending.

## Incremental architecture: A1–A4

Each milestone is independently releasable. Functional development may occur
between milestones; this is not a freeze until all four are complete.

- **A1 — Settings and modularization pattern:** Settings rendering and its
  preference/draft/disclosure controller are extracted. App retains domain
  commands, navigation, theme application and inventory/sync lifetime. See the
  [module contract](ARCHITECTURE.md#a1-feature-module-boundary). Released in PR #247.
- **A2 — Cards / Inventory:** Cards rendering is extracted behind read-only views
  and existing command callbacks. No exclusively owned mutable state was present;
  shared preferences, selection, totals and inventory authority keep their owners.
  See the [contract and module map](ARCHITECTURE.md#a2-cards--inventory-feature-boundary).
  Implemented and independently reviewed in
  [PR #248](https://github.com/dotsthewarlock/Walmart-GC/pull/248), which records
  regression, CI and release verification evidence. A2 is released on main `ac0759b`.
- **A3 — Checkout:** rendering, balance/notes drafts, reveal/copy feedback and
  passive wake-lock lifecycle are extracted. Shared selection, contextual return,
  inventory context and durable commands retain their owners. See the
  [module contract](ARCHITECTURE.md#a3-checkout-feature-boundary). Released in PR #249.
- **A4 — Application shell and Balance Check convergence:** deferred indefinitely. Installation and offline-shell reliability are a separate, focused milestone and do not authorize A4 convergence.

Preserve local-first integrity, protocol/schema, Worker, companion and transfer
contracts at every milestone. No speculative store, new dependencies, mechanical
file reorganization or navigation redesign is included.

## Deferred and future work

Online-use reconciliation remains deferred. V0.4 adds precise UTC verification
timestamps while retaining historical date-only compatibility.
R1 supplies targeted recovery cleanup following the demonstrated capacity failures;
unresolved alternatives, deletion fences and uncertain writes remain preserved.

Merchant profiles, camera-initiated add-card scanning, schema vNext and optional native wrappers remain future possibilities, without implementation authorization. Existing merchant-aware card/CSV contracts remain authoritative.

## Unapproved expansion

No central card database, generalized event sourcing, public account platform,
merchant automation, helper rewrite, new OAuth scopes or runtime dependencies.
No speculative abstractions, navigation redesign or unrelated features.

[Historical explicit-sync/phase requirements](archive/pre-v0.3-sync-governance.md)
are superseded by the consolidated V0.3 authorization and are not active gates.

Post-A3 architectural audits by Codex and GPT independently found no material architectural blocker. GPT confirmed main `0985eca`, A3 CI and deployment, and the source boundaries. Dedicated A4 is deferred indefinitely; refine the broad Balance Check session/command interface, App projections and CSV ownership alongside relevant functional work.
