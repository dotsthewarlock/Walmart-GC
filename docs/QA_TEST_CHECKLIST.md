# GC Wallet integrated acceptance

Use this one cycle for the V0.3 product. No live credentials or merchant/Sheet
requests are needed for synthetic tests. Native IndexedDB and page-restart checks
already passed for the V0.3A.1 foundation; do not repeatedly rerun that old harness.

## Automated cycle

P0.2 lifecycle failure acceptance (before implementation):

- Changed compartment/generation clears credential-bearing selection, Manual
  drafts/progress, Batch packet/preview/transfer and feedback before paint.
  Changed credentials or credential ambiguity invalidate affected working state.
- Held selection, Manual save, Batch preview/apply, clipboard and transport
  success/failure cannot alter a newer workflow or release its busy ownership.
  Already committed inventory operations remain durable; rejected/aborted work
  retains valid drafts, preview and recovery evidence without progress.
- Navigation/unmount and mode changes in the same context retain working state;
  command execution belongs to the App-lifetime controller, not the view.
  Explicit reselection/flagged entry replaces the workflow. Persisted generation
  fences include away/back before notification, with no cross-account inheritance.
- Reuse synthetic wallet/transaction/Companion fixtures. Focus regressions on
  stale completion, credential changes, pre-paint fencing, continuity and abort;
  required integrated CI owns unchanged P2.0 monetary/protocol/offline coverage.

P0.2 baseline reproduction: held Manual and Batch preparation completion followed
by a cross-tab compartment switch left the new context's controls busy. Retained
as `tests/browser/p02.spec.mjs`; added old completion/new busy owner, frame-visible
privacy fencing, same-context unmounted copy, delayed abort, fallback focus and
late denied-copy coverage. `src/lib/verificationWorkflow.test.mjs` executes commands
without React and covers delayed selection/Manual/Batch/transport success/failure,
persisted away/back fencing, credential edits, owned read errors and abort/retry.
These are synthetic checks, not native/private-account acceptance. Exact final
review, CI, publication and hosted evidence belong in the P0.2 PR.


P2.0 failure acceptance (defined before implementation):

- Recorded/estimated zero after a prior positive check is unconfirmed. Only an
  accepted applicable zero observation creates revision-bound protected evidence;
  notes and used-state edits preserve it, monetary/credential changes, uncertainty,
  recovery and affected maintenance invalidate it. Missing/invalid proof degrades
  to unconfirmed. Encoding/compaction, older writers, stale clients, replay and
  rollback cannot manufacture confirmation. CSV backup carries history, not proof.
- Pending zero observations survive transaction completion, reload and compatible
  acknowledgment of earlier work. Abort preserves cards, evidence, outbox and
  drafts; interrupted/replayed operations do not advance twice. Account isolation,
  offline Manual/Batch work and R1/R2/P0.1 fences remain intact.
- Shared selection exposes reconciliation, 120-day refund watch, final checks due
  at day 120 (30-day priority grace, with missed checks still eligible afterwards),
  and explicit bounded historical recovery. Valid dateUsed only; no invented date
  or final completion. Freshness defaults to 60 days with 30/60/90 choices.
  Lifecycle/historical queues default to 20 and never exceed 50, including large
  histories. Uncertainty bypasses age/freshness while retaining credential fences.
- Positive recovery saves through existing verification commands without a refund
  cap or invented transaction. Used remains independent until explicit Mark Active.
  Changing selection preferences requires explicit reselection and retains working
  drafts/progress. No automatic merchant calls; hosted checks use synthetic data.

Worker/frontend ordering and compatible rollback must be established before
release. Independent candidate review and required integrated CI precede merge;
technical closure is separate from native acceptance.

P0.1 lifecycle correction acceptance (before implementation validation):

- Changing compartment or persistent context generation, including away and back,
  clears Checkout notes/balance/amount-used/error drafts, captured editor targets,
  credential reveal and copy feedback before the new context paints. A different
  selected card also resets this state; ordinary same-context destination changes
  preserve drafts and explicit reveal.
- Held save success/failure cannot close or alter a newer editor after context,
  card, cancel or reopen changes. Clipboard completion and feedback timers affect
  only their originating scope and latest copy action. Durable saves still wait
  for transaction completion and reject stale context/revisions.
- Balance Check Exit restores the exact originating Checkout card only within
  its original compartment/generation and current eligible collection, without
  credential ambiguity. Missing, filtered or changed-context origins return to
  Cards with heading focus and no substitute barcode. Reordering alone preserves
  identity. Existing R2 session, offline commands and navigation remain intact.

Convert the retained P0.1 investigation probes into durable synthetic regressions;
do not repeat the five-scenario investigation or add independent scroll redesign.
Required integrated CI retains unchanged protocol/Worker/Companion coverage.

P1.1 lifecycle failure acceptance (defined before implementation):

- Cards, Checkout and Balance Check share one accessible M3 shell, merchant total,
  privacy-safe sync status and Settings entry at 412 × 923 and desktop. Navigation
  and contextual return retain selection, filters, per-destination scroll, Settings
  and Checkout drafts, Manual progress and Companion result drafts/preview.
- Verification preparation/save/apply holds all shell exits and mode/selection
  controls until transaction completion. An aborted command reports failure,
  retains its draft/preview, advances no progress and remains retryable. Navigation
  never implies save, merchant execution or application of an observation.
- Settings returns to its calling destination; ordinary Balance Check entry resumes
  its session. Explicit flagged entry starts a fresh Manual queue from current
  flags and returns to Settings. Keyboard return restores the invoking control
  or an accessible destination heading when that control no longer exists.
- Account/context changes retain the existing generation and revision fences;
  stale verification/editor work cannot write into another compartment. Offline
  navigation and local commands remain available. Checkout wake locks release
  when inactive, including late grants. No credentials enter navigation storage.

Reuse affected Cards/Checkout/Settings, R2 preparation/atomic-abort/flagged-entry
and stale-context fixtures. Required integrated CI owns unchanged R1, protocol,
Worker, Companion transport and offline-shell coverage; native user acceptance
remains distinct from synthetic technical closure.

R2 focused coverage includes shared Manual/Companion filters, ordering and quantity,
draft/progress survival across mode/contextual navigation, offline preparation and
reconnect, read-only direct preview, injected atomic application failure and retry,
partial results/replay and interrupted transport with saved TSV fallback.
`companionTransport.test.mjs` tests strict origin/frame/document/type/version/session
validation, foreign/expired transfers, unknown refs, conflicting replay and atomic
partial-packet rejection. The native packaged MV3 browser scenario intercepts both
production origins with inert synthetic pages, verifies actual Chrome sender
context, explicit foreground start, observation return and reloaded-document fencing.
It does not contact merchant services. Build shared artifacts before this browser
scenario with `python3 companion/build.py`; CI performs that step. Existing R1
integrity and offline-shell regressions remain in the required integrated cycle.

Corrective R2 acceptance reuses these fixtures: Manual filter/quantity/reselection
and save must work while damaged Batch bytes remain quarantined intact and Batch
remains explicitly blocked. Settings flagged entry must return from Companion to
a fresh Manual queue on every invocation, including consecutive flagged visits;
eligible used/provisional-zero cards remain selectable and used state is preserved.
Manual selection creates no Batch ledger. Preparing the same queue retains drafts,
order and progress, excludes completed cards, and rejects stale context/revisions.
Reload restores export of the original pending selected refs; copying must neither
append requests nor generate fresh refs. A new Manual queue still requires preparation.
Hold transaction-completion notification deterministically: Manual amount/save/
confirm/skip, mode and selection controls stay disabled until preparation completes.
The reviewed asynchronous-control correction remains a regression requirement.

Define failure acceptance before implementation, run affected local scenarios,
and leave unaffected suites to integrated CI. Reuse existing transport-security,
replay, partial-result, interrupted-transfer, atomic-abort, offline/reconnect and
R1 integrity coverage; do not repeat accepted live checks or broad audits.

```sh
npm ci
npm test
npm run test:worker
npx playwright install chromium
npm run test:browser
npm run build
git diff --check
```

Playwright is development-only (three packages plus its optional platform helper;
no runtime dependency changes). Linux requires Chromium's system test libraries;
CI uses `playwright install --with-deps chromium`. In a restricted development
container, equivalent libraries may be extracted temporarily and supplied through
LD_LIBRARY_PATH; this does not change the product or deployment. No normal app
flow depends on Playwright or any test fixture.

`test:worker` uses development-only Miniflare/workerd, the production Worker module
graph and SQLite-backed coordinator storage. Local-runtime scenarios cover
protocol/account fencing, concurrent writes across external awaits and actual
runtime restart after uncertain dispatch and the fail-closed activation pause.
Frontend-generated control requests also traverse authenticated Worker HTTP routes:
setup creation/ensure, pause/resume, durable rejection/replay, historical UUID
controls and commits, saved pre-dispatch controls, and restart/late-write recovery
without redispatch. Invalid timestamp/UUID/action combinations are rejected, while
targetless saved setup remains fenced for operator recovery.
All Google responses are synthetic;
unmatched outbound network connections are denied. This is stronger than an
in-memory storage fake, but does not validate production bindings or live Google.
See the [activation/recovery plan](V0.3_RELEASE_READINESS.md) for advisory disposition
and the remaining external checks.

The browser suite starts normal Vite on local 5178, blocks external traffic and
mocks every API/auth route. It uses synthetic cards ending 0042 (100.00) and 0084
(50.00), synthetic principal/Sheet IDs and the real coordinator/reconciliation
modules. There is no second temporary launcher. Original sources remain the app
under test. Font requests are blocked and use local fallbacks. Browser contexts
provide device isolation; tabs in one context share IndexedDB and notifications.

For the A2 Cards boundary, the focused browser regression covers fully filtered
reset, sorting, visible-balance totals, used labels, keyboard selection, selection
and review-focus survival across navigation, reload and the empty-state CSV file
chooser. It captures 412 × 923 and desktop views. The Settings regression covers
shared preference/draft lifetime; unaffected protocol/Worker suites run in required
CI. The shared hidden CSV input stays mounted in App for both feature views.

For A3, focused Checkout coverage exercises passive barcode rendering, mobile
reveal and desktop CODE/PIN copy, previous/next selection and editor reset,
notes draft survival through Settings, balance amount-used arithmetic/Escape,
contextual return and late/active wake-lock release. It captures mobile and desktop
Checkout views. Reuse the integrated durable-edit/transaction-abort and stale-tab
editor scenarios plus Settings lifetime regression; unaffected suites run in CI.

The integrated scenarios cover migration/startup/reload; balance/notes/used saves;
manual verification and precise timestamp persistence; Batch v1 create/preview/partial
apply/exact replay; independent devices and stale/obsolete tabs; offline inventory
selection and CSV/recovery warnings; injected transaction abort with unchanged
committed state; 412 × 923 and desktop navigation; protected explicit controls,
setup and shared maintenance. Node tests cover uncertain/late writes, restart,
marker/content mismatch, account isolation, bounded receipts/old retries,
reconciliation/tombstones, legacy CSV and every recognized Sheet header mapping.
Focused readiness regressions also retain competing nonmonetary edits across
ACK rebasing and persist missing-row recovery intent across subsequent ACKs.

Old regression assertions that required dormant pendingReconciliation=true to be
rejected, uncoordinated whole-inventory writes, or unrelated-change Batch
invalidation are superseded. The schema compiler and contracts remain directly
covered by the coordinated Google adapter fixtures, not by a legacy write bypass.

## Minimal independent review cycle

The R1 completion fixture in `tests/recoveryFixture.mjs` models 621 existing cards
and 285 persisted entries: 65 dateAdded, 65 dateUpdated, 72 missing-remote,
63 repeated balance and 20 verification disagreements, with no pending operations.
`recordReconciliation.test.mjs` checks automatic repair, atomic abort/restart,
unchanged baselines/pending identities/migration bytes, flagged used/zero selection,
local Manual/Batch retirement, deletion/credential/merchant quarantine, mixed
Batch reference isolation after evidence-only quarantine, lost repair
acknowledgements and repeat no-op sync. The Worker runtime fixture exercises the
actual frontend engine through authenticated synthetic Worker HTTP, including
fresh unchanged used-card verification; the browser fixture checks the concise
summary and dedicated Manual/Batch scope. No real account or private inventory is
accessed. Broad architecture audits remain accepted and are not repeated.

Completion measurements: 285 persisted entries become 72 flagged cards with zero
individual decisions; 41 consolidated advanced details retain distinct monetary
and verification alternatives. Logical evidence falls from 99,253 to 18,572 bytes
(17,243 bytes including the encoded metadata object). One repair write, five
snapshot reads across pull/commit/repeated pull, zero writes on repeated sync.
Existing R1 621-card/16-cycle, partition capacity, uncertain dispatch, maintenance,
credential, replay and Batch retention tests remain required. These figures are
synthetic evidence, not a claim of completed private inventory acceptance.

R1 reuses the existing fixtures and adds focused recovery/capacity cases in
`src/lib/r1Recovery.test.mjs`. Acceptance covers 621 cards and 80 duplicate pairs,
row-order-independent repair, preserved credential alternatives, mixed unbound
recovery and original pending identities, uncertainty-first verification including
provisional zero, applicable fresh clearance and later-conflict fencing. Sixteen
full-inventory verification cycles retain monetary revisions without retaining
resolved conflict history. Exact rejected-control proofs, 140 rejected controls,
cutoff fencing after eviction/restart, retained success before rejection cutoffs,
genuine verification under stale-baseline notes drift, distinct conflict identities
across compaction, newest legacy dates, stale baselines, simultaneous edits, lost
responses and late writes retain their existing protocol tests.

The real workerd/SQLite HTTP fixture pauses 621 precisely verified cards, restarts
the runtime and restores an edited genuine timestamp with uncertainty confined to
that card. Temporary originals live only in protected private Sheet evidence;
resume removes them. Adapter tests cover multi-part encoding, legacy evidence,
unrelated `_META`, duplicate repair, occupied headers and atomic write confirmation.
Notes-only maintenance preserves unaffected Batch requests and applicable older
observations. Existing Batch partial-apply, exact replay, account and offline tests
remain acceptance evidence. The mobile R1 scenario verifies credential disclosure,
affected-card checkout blocking, explicit resolution and successful unrelated edits
and manual review after injected Batch damage. Production private inventory is
never test input.

Synthetic capacity baseline and R1 measurements (UTF-8 bytes):

| Workload | Before | R1 |
| --- | ---: | ---: |
| 621 ordinary monetary revision entries | 51,570 in one cell; rejected | 31,129 encoded, one 38,000-byte-bounded part plus manifest |
| After 16 complete verification cycles | Ordinary history already exceeded the old limit | 31,750 encoded; only counter digit growth, zero retained resolved alternatives |
| 621 precise maintenance records | 83,215-byte DO proof; rejected at 64,000 | 722-byte DO metadata; 211,241 bytes of temporary private evidence across bounded cells |
| 80 duplicate pairs plus same-ID replay | Ordinary read rejected duplicates | One repair write; five snapshot reads total (pull + three commit reads + replay), zero replay writes |

The 128-part final evidence bound preserves all unresolved alternatives and
tombstones; it does not silently truncate to fit. Pending Batch work is retained;
completed references are bounded to 128 and receipts follow retained ledgers.
Unknown-baseline external edits and damaged managed metadata still require
explicit recovery. These are synthetic capacity measurements, not production
inventory inspection, cost projections or private recovery acceptance.

After automated tests, review the same synthetic browser scenario in headed mode:

```sh
npm run test:browser -- --headed --workers=1
```

Use `--debug` to pause for inspection. Verify Cards → Checkout → Settings, the
passive barcode/credential controls, keyboard focus/scroll and legibility at
412 × 923 and desktop. Confirm warnings do not impose a monetary hold, and that
full account/Sheet details remain confined to Settings. Do not open real merchant
or Sheet pages from a synthetic run. No separate repeated phase acceptance gates.

## Infrastructure and release gates — not established by mocks

- Deployed Cloudflare module/DO class compatibility, storage transactions, namespace,
  binding and migration, service entitlement/cost and deployment route identity.
  The production config records operator-verified resources and retains an activation
  pause until controlled Google checks pass. Required binding: SHEET_COORDINATOR exported
  class SheetCoordinator, with an approved new_sqlite_classes migration. This is
  a review prerequisite, not authorization to provision it. Local workerd/SQLite
  validation does not establish deployed configuration or entitlement.
- Actual Drive about.user.permissionId visibility/stability and exact file owner
  permissionId checks using only drive.file. Test different accounts and a shared /
  nonowned Sheet before enabling production writes.
- Secret binding NAMES/presence, account/environment placement and session signing
  continuity; never read/print secret values. KV session/OAuth state bindings and
  existing compatibility-date drift need environment review before deployment.
- Controlled direct-edit maintenance across sessions, backup/restore procedures,
  and deliberate ambiguous-outcome operator recovery. A missing marker does not
  authorize resending a timed-out write.
- Cross-browser/mobile/device and real scanner usability, browser storage eviction,
  genuine merchant verification and accepted bookmarklet transfer compatibility.
  Existing unrelated manual acceptance stays valid; run one focused release cycle.

No merge, provisioning or deployment follows automatically from passing tests.
Rollback must keep protocol fencing, IndexedDB/outbox and recovery evidence
readable; use a compatible read-only recovery client rather than an older writable
frontend/Worker. [Architecture](ARCHITECTURE.md) is the protocol authority.
Use the ordered [activation and recovery plan](V0.3_RELEASE_READINESS.md) for rollout;
the external items above are not repeated development phase gates.

## Installation and offline shell

Run `npm run build` then `npm run test:shell` against the built shell and the local release fixture. Verify manifest and icons, complete shell installation, offline reload, and that private routes are absent from Cache Storage. The integrated synthetic cycle remains responsible for local edits, pending operations and reconnect. The serial shell regression exercises an existing controlled tab, rejected mixed and incomplete installs, matching cache repair, unavailable matching assets, OAuth return queries, changed release bytes, offline activation, durable pending/in-flight work and eligible reconnect against synthetic services. Installation and offline launch depend on browser support and a successful initial online visit.

The fixture transforms root HTML like the production CDN. Installation and root repair must use matching canonical `/index.html` bytes; transformed or mixed bytes must never enter the shell. Hosted verification includes a fresh empty browser, successful service-worker readiness and offline reload, alongside public asset digest checks.
