# Active context — GC Wallet

Read [agent rules](../AGENTS.md), [architecture](ARCHITECTURE.md),
[M3 decisions](M3_DESIGN_DECISIONS.md), [roadmap](ROADMAP.md) and
[QA](QA_TEST_CHECKLIST.md). GitHub is the sole durable project authority.

## P2.0 — spent-card reconciliation and refund recovery

Received in this D-UX session from A-UX on 2026-11-28. Baseline and initial HEAD:
`ddf8236760de7c25b7410561d2338e6bee83f064`; main was clean. This session is the
sole writer on `feat/p20-spent-reconciliation`; investigations and independent
reviewers are read-only. Implementation, optional revision-bound zero-observation
evidence, compatibility validation, independent review, required CI, commit/push/PR,
normal protected merge, production Wallet publication, affected Worker deployment,
hosted synthetic verification and safe cleanup are explicitly authorized.

| Assignment | Route / scope | Session / writer | State / next action |
| --- | --- | --- | --- |
| P2.0 | Master/user → A-UX (milestone/assessment) → D-UX (implementation/release) → A-UX → Master | Current fresh Codespace D-UX session is sole writer; read-only independent review | AUTHORIZED; implement/validate, finalize canonical docs, independently review candidate, CI/release/verify, return clean main and hand back writer authority |

Execution: existing Codespace, fresh assigned session, required imp/go execution.
Requested model GPT-6.1 Sol, Medium, 500K context; exact effective model, thinking
and context capacity are not exposed and remain unknown. Workspace-write with
Auto-review is verified. Allowance is P2.0 and required corrections/review/CI/release;
no next milestone, runtime dependency, infrastructure, live account/merchant work
or Companion Stable promotion. Any material unresolved integrity/protocol issue
returns to A-UX. Native acceptance is separate from technical closure.
Independent read-only reviewer receipt was confirmed in this session; no writer
authority was transferred. After successful hosted verification, the milestone PR
records RETURNED/technical closure and explicit writer handback; this reservation
then ends. A-UX/Master own assessment/CLOSED disposition and native acceptance.

Scope: shared Manual/Companion selection gains spent reconciliation, 120-day
watch, day-120 final checks (30-day priority grace; missed checks remain eligible),
and bounded historical/missing-date recovery. Independent used state, IndexedDB,
pending work, R1/R2/P0.1 and privacy remain intact. Proof is optional protected
per-card evidence, never new Cards/CSV columns or a second authority. See
[Architecture](ARCHITECTURE.md), [M3](M3_DESIGN_DECISIONS.md) and preimplementation
failure acceptance in [QA](QA_TEST_CHECKLIST.md).

Source access: the supplied P2.0 assignment and applicable canonical authorities
were read; no local feasibility report was found or claimed read. GitHub access
and P0.1 merge SHA were verified. Master-supplied Revision 2 conventions are
consolidated in [agent rules](../AGENTS.md) and [Architecture](ARCHITECTURE.md#master-and-subordinate-architecture-streams).
The original Revision 2 attachment was not accessible and has not been read.

## P0.1 — released lifecycle correction and governance consolidation

Technical release closed at main `ddf8236760de7c25b7410561d2338e6bee83f064`,
[PR #259](https://github.com/dotsthewarlock/Walmart-GC/pull/259). The P2.0
assignment supersedes its stale active reservation. Native user acceptance and
A-UX/Master assessment remain separate; exact release evidence belongs in that PR.

Assigned by A-UX to D-UX from main
`6527173765650b99e95024af198d3b35cc53ceff` (released P1.1). Correct Checkout
cross-context transient state, late save/copy/timer feedback and contextual return
identity. Preserve same-context drafts, transactional fences, R2 continuity, shared
navigation and offline operation. No independent scroll redesign or subsequent
feature milestone is authorized. Acceptance is defined in [QA](QA_TEST_CHECKLIST.md).

Implementation, canonical governance consolidation, independent candidate review,
required CI, commit/push/PR, protected merge, Wallet production release, hosted
verification and safe cleanup are explicitly authorized. Preserve production
configuration, the unaffected Worker and Companion Stable. Reuse retained
`test-results/p01` investigation fixtures/logs; five scenarios already established
the defects and stale-save rejection. They are evidence input, not an authority.

Source limitation: `ai-first-arch-dev-cycle-handoff.md` Revision 2 was not supplied
at an accessible local path or attachment. Its contents have not been read or
claimed as migrated. The explicit conventions supplied in A-UX's assignment are
adopted in [agent rules](../AGENTS.md) and [Architecture](ARCHITECTURE.md#master-and-subordinate-architecture-streams),
preserving stronger GC Wallet safeguards. Source-dependent reconciliation remains
blocked pending access; it does not block the authorized privacy correction.

## P1.1 — released Unified Wallet Navigation

Authorized from main `3366acf` ([R2 correction #257](https://github.com/dotsthewarlock/Walmart-GC/pull/257)):
integrate Cards, Checkout and Balance Check in the shared M3 shell using existing
components and App-lifetime controllers. Preserve merchant totals, private sync
status/Settings, selection/filters/scroll, drafts/progress, contextual return,
explicit flagged entry, account fencing, offline operation and passive checkout.
Lifecycle failure acceptance is recorded in [QA](QA_TEST_CHECKLIST.md).

Implementation, independent review, required CI, commit/push/PR, normal protected
merge, Wallet production publication, hosted verification and safe cleanup are
explicitly authorized. Keep existing production configuration and the unaffected
Worker deployed; no Companion Stable promotion. Standalone A4, single-card check
enhancements, Checkout Undo, new stores/dependencies, schema/protocol/infrastructure
changes and unrelated redesign remain excluded. Exact candidate/release evidence
belongs in the milestone PR. Master Architecture assessment and native acceptance
remain separate from Codex's technical closure; see the
[stream handoff protocol](ARCHITECTURE.md#master-and-subordinate-architecture-streams).

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
