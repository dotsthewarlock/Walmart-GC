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

## R2 — unified verification and direct Companion

One branch/PR combines repository-first governance consolidation, shared Manual and Companion filters/quantity/order/session ownership, retained drafts/progress/navigation, and explicit extension request/result transport using Batch v1. Use the existing inventory commands, ledger, observation validation and R1 retirement. Preserve flagged used/zero selection, ephemeral credentials, strict origin/sender/version/session checks, explicit merchant initiation, foreground 10/25/50 targets and fixed 1,400 ms pacing. Results return to Wallet preview and explicit Apply; Manual and TSV/bookmarklet fallback remain recoverable.

Released in [PR #256](https://github.com/dotsthewarlock/Walmart-GC/pull/256), with
an authorized corrective release for asynchronous reselection, Manual independence,
fresh flagged entry and complete historical-source consolidation. A necessary
corrective release is compatible with the one-PR efficiency preference.

Independent review and required CI precede the user-authorized protected merge, Wallet release and Dev Companion publication. Verify public shell digests, descriptor revision, both artifact hashes and inert transport compatibility. Preserve infrastructure/configuration and leave an unaffected Worker deployed. No Stable promotion, standalone A4, schema change, runtime dependency, background merchant execution, automatic retry or challenge bypass.

## V0.3 maintenance: lean synchronization and quota recovery

1. PR #240 supplies unchanged KV write suppression and explicit-only Batch clipboard transfer. PR #241 builds on that merge and supplies event-driven automatic sync (3s coalescing, 15s minimum, 5min freshness, no idle polling), manual-only mode, no-op suppression, local Batch preparation/preview and bounded timeout and quota recovery.
2. The matching Worker was deployed before Pages as version `062fca0a-95dc-4a8d-b49a-4fb4428724ef`, retaining the unpaused flag, existing secrets and bindings, migration and privacy configuration. The protected content read and durable commit evidence remain; no protocol or schema change, cache, leader election or added infrastructure is introduced.
3. Ordinary-use KV observation remains user-performed: zero redundant writes in steady state, no quota warnings, historical target under 50 writes/day for one development user, checkout and Batch unchanged. 50 daily users is a planning target (10 necessary writes/user/day with 50% headroom), not measured capacity or a service promise. This is not authorization for a new live audit; no further work without demonstrated need.

PR #239 released Batch reliability and synchronization visibility. PR #245
released Companion 1.0.5 Dev with a fixed 1,400 ms delay, selected targets of
10, 25 or 50, and no ten-card segmentation or rest. Stable remains unpromoted.
R2 publishes Companion 1.0.6 Dev using the same safeguards and shared source.
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

## Product priorities and deferred work

These preserve product decisions from the historical sources; they do not
authorize implementation in the current corrective release. Version labels are
planning labels, not dependencies or a requirement to finish architecture first.

| Priority / label | Scope and disposition |
| --- | --- |
| Released V0.1–V0.4 foundation | Card/CSV schema, Manual/Batch verification, protected V0.3 sync, resilient checks and precise UTC verification with date-only compatibility. Installation/offline shell shipped in PR #250; R1 is accepted and R2 is released with the current correction. |
| P0 | Ordinary-use acceptance and demonstrated consequential defects; preserve R1 recovery, pending work and uncertain-write fences. |
| P1 — unified Wallet UX | Plan a shared Cards / Checkout / Balance Check shell, contextual return and limited Checkout Undo; see [M3 decisions](M3_DESIGN_DECISIONS.md#deferred-product-interactions). Requires separate functional authorization. |
| P2 / V0.5 — online use | Spending, partial redemption and refund reconciliation through existing pendingReconciliation plus merchant verification; no accounting subsystem. |
| P3 / V0.6 — acquisition and management | Manual add, bulk paste/import, duplicate handling and card lifecycle; explicit camera scanning only when useful, with manual fallback. |
| Later / V0.7+ — merchants | The next real merchant vertical slice when demand exists, retaining currency, identity and barcode differences; no speculative plugin framework. |

Checkout Undo is planned as a snackbar after a durable Mark Used/Active or Update
Balance, backed by at most five session-only eligible actions in sequential LIFO
order (a sixth evicts the oldest). Undo creates a corrective operation restoring
only the relevant fields; unrelated edits, verification and uncertainty survive.
Stale context or intervening activity fences it. No Batch/CSV/notes undo, generic
event history, persisted/synced undo stack or cross-account inheritance. Dismissal
and the next successful action govern the snackbar; totals and selection remain
consistent. These are deferred requirements, not R2 implementation scope.

The old Companion 1.0.4 duplicate-helper / “Loading Dev” report needs reproduction
on the current release before corrective work. The cosmetic Queue-to-Cards rename
is deferred. Neither authorizes an additional investigation now. Schema vNext and
optional native wrappers remain possibilities without implementation authorization.
Existing merchant-aware card/CSV contracts remain authoritative.

## Unapproved expansion

No central card database, generalized event sourcing, public account platform,
merchant automation, helper rewrite, new OAuth scopes or runtime dependencies.
No speculative abstractions, navigation redesign or unrelated features.

[Historical explicit-sync/phase requirements](archive/pre-v0.3-sync-governance.md)
are superseded by the consolidated V0.3 authorization and are not active gates.

Post-A3 architectural audits by Codex and GPT independently found no material architectural blocker. GPT confirmed main `0985eca`, A3 CI and deployment, and the source boundaries. Dedicated A4 is deferred indefinitely; refine the broad Balance Check session/command interface, App projections and CSV ownership alongside relevant functional work.
