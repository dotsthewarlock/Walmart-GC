# Active context — GC Wallet

Read [agent rules](../AGENTS.md), [architecture](ARCHITECTURE.md),
[M3 decisions](M3_DESIGN_DECISIONS.md), [roadmap](ROADMAP.md) and
[QA](QA_TEST_CHECKLIST.md). GitHub is the sole durable project authority.

## Accepted baseline

R1 is user-accepted at main `78175c7f542d1928217bad30a2a70711c2508b6e`,
[PR #255](https://github.com/dotsthewarlock/Walmart-GC/pull/255). Do not reopen R1.
Its record-level MERGE / FLAG / QUARANTINE correction and evidence retirement are
preserved. Exact R1 review, integrated CI, Worker and hosted release evidence are
in that PR. The synthetic 621-card/285-entry fixture is not private inventory data.

Released boundaries remain: Settings A1 (#247), Cards A2 (#248), Checkout A3 (#249),
installation/offline shell (#250), and R1 recovery (#251–255). Dedicated A4 is
indefinitely deferred. React 19 / Vite / Tailwind, one IndexedDB inventory authority,
one synchronization engine, the existing same-origin Worker/DO and private owned
Sheet remain. No new infrastructure or runtime dependencies are approved.

## R2 — unified verification and direct Companion integration

R2 shipped at main `bf6aed0`, [PR #256](https://github.com/dotsthewarlock/Walmart-GC/pull/256).
The authorized corrective release preserves `77c93ee` (Manual controls locked
until asynchronous selection completes), isolates Manual reselection from damaged
Batch state, refreshes flagged entry and completes source consolidation. One PR
is the preferred release unit; necessary authorized corrections remain allowed.
The R2 scope remains repository-first documentation
consolidation, shared Manual/Companion selection and App-lifetime session state,
and narrowly scoped explicit extension transport using Batch v1. Preserve flagged
priority, eligible used cards, provisional zeros, drafts/progress/contextual return,
transaction completion, existing observation validation and R1 retirement.

Direct requests/results remain explicit. Validate authorized origin, sender frame
and document, message type/version and session correlation. Credentials stay
in memory, never URLs/logs/persistent transport storage. Import never starts a
merchant check. Existing foreground start, targets 10/25/50, 1,400 ms pacing,
challenge/timeout/visibility stops, Manual and TSV/bookmarklet fallback remain.
Wallet previews and explicitly applies verified observations through existing commands.
The shared source and Dev distribution remain; no Stable promotion.

Implementation, independent technical review, required CI, commit/push/PR,
protected merge, Wallet production and Dev Companion release, hosted verification
and safe cleanup are user-authorized. Preserve production configuration and avoid
redeploying an unaffected Worker. Exact candidate, release and migration-source
coverage evidence belongs in the R2 PR, not a parallel handoff.

The user substituted the accepted repository/PR #255, explicit R1 acceptance,
permanent Project instructions and five existing Project source documents for the
unavailable separately named snapshot. Only actually accessed source input can
establish migration completeness; preserve newer repository contracts over older
source requirements. All five source documents were read in full through the
temporary ChatGPT Space Page supplied by the user: Project instructions,
architect handoff, architecture, roadmap and transfer contract. The user reports
GPT matched the original ZIP; Codex read the Page, not that ZIP. Their unique
durable decisions are consolidated into the existing authorities, with deferred
product/UX decisions restored in Roadmap/M3. The Page is historical input, not
an ongoing authority. Exact coverage and release evidence belong in the corrective
PR. GPT retains architecture, roadmap and independent assessment;
Codex implements and verifies the authorized milestone.

## Production continuity and acceptance

R1 Worker version: `65f12ad3-ff4e-46c6-8b4f-7fd4206b2eb7`, with existing namespace,
bindings, migration and privacy preserved. Checked-in Wrangler activation stays
fail-closed (`SYNC_ACTIVATION_BLOCKED="true"`); the existing active deployment is
unpaused (`false`). Do not replace that deployed configuration during unrelated work.
The existing Pages workflow publishes the Wallet and matching Dev Companion.

Previously accepted Google principal/ownership and infrastructure checks remain
accepted. R1 private acceptance is user-confirmed. R2 genuine merchant/clipboard,
native browser/device acceptance remains user-performed; synthetic and inert
hosted checks establish only their stated scope. No live OAuth/Sheet/merchant calls
are authorized for synthetic verification.
