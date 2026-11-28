# GC Wallet architecture

This is the authority for data flow, persistence, APIs, session/account binding,
synchronization and recovery. UI authority is [M3](M3_DESIGN_DECISIONS.md).

The frontend is a modular monolith. Extract a cohesive responsibility when it
improves authorized functional work; do not pursue file-size targets, speculative
wrappers, a global store or wholesale rewrites. A module's public contract names
inputs, outputs/commands, captured context, invariants, effects, failure behavior
and meaningful tests. Use existing feature boundaries and complete vertical slices.

## Master and subordinate architecture streams

GitHub and the canonical authorities linked from [Active Context](ACTIVE_CONTEXT.md)
are the sole durable project authority. Master Architecture (GPT) owns architecture,
roadmap, cross-stream decisions and independent assessment. A subordinate stream
implements and verifies only its authorized milestone; it can make local,
evolutionary implementation decisions within the existing contracts. Independent
technical review is a release prerequisite, not Master architectural or native
user acceptance. Explicit user scope and release authorization govern execution.

Before implementation, confirm the exact baseline, affected ownership/contracts,
source access and lifecycle failure acceptance. Before candidate review, reconcile
unique decisions into the relevant existing authorities, rather than creating
parallel handoff documents. Reuse accepted baselines and review/release evidence;
do not reopen accepted R1 or repeat unaffected R2 audits.

Return to Master the implementation outcome, exact commits/PR/CI/deployment and
hosted evidence, material decisions, unresolved risks/blockers, cross-stream
implications and acceptance disposition. Distinguish sources actually read from
reported provenance, synthetic technical closure from native user acceptance,
and completed checks from unexecuted prerequisites. Escalate essential unavailable
access, consequential unresolved defects and substantial scope expansion; ordinary
authorized implementation/review/CI/release corrections continue autonomously.
Master reconciles architectural or roadmap consequences into these same authorities
before authorizing another milestone.

ARCH/DEV assignments are scope-gated: Master can delegate architecture/milestone
management to a named subordinate ARCH (A-UX here); DEV (D-UX) implements and
releases only the assigned scope. Local technical decisions remain evolutionary.
The compact assignment register in Active Context records route, scope, writer,
status and next action; do not create another registry. Only one DEV session may
write the checkout/branch. Prior investigation and independent review are read-only;
writer transfer must identify the releasing and receiving session and checkpoint.

Each assignment/continuation states session, action, model, thinking, permissions
and allowance (scope/cost/tool limits); unknown configuration stays explicitly
unknown. Intent shortcuts inherit those boundaries: continue/resume uses the last
checkpoint, review is read-only, and release requires existing explicit release
authorization. A pause/stop suspends further action until resumed; interruptions
require inspecting actual branch/files/processes/PR state before continuing.
No shortcut, model change or continuation authorizes another milestone.

Routed handoffs identify sender, recipient, action, baseline, deliverable/evidence,
blockers and acceptance/writer disposition. A copy control copies text only;
dispatch requires a supported authorized channel and receipt is established only
by actual acknowledgement. Do not report delivery from a copied prompt or infer
acceptance from dispatch. Existing chat continuation is sufficient; no runtime
command parser or custom HTML artifact is required. Return milestone evidence to A-UX
for independent assessment and onward report to Master.

Standalone disc/eval/stat is read-only. imp/go executes authorized work; send
prepares the routed handoff without dispatch; hold retains the reservation; rule
consolidates governance; done verifies closure. Assignment states are AUTHORIZED,
PAUSED, RETURNED, CLOSED and DORMANT. Recipient gates record expected/actual HEAD,
clean or explicitly retained work, source/contract access and sole writer.
Integration uses an expected candidate HEAD and never force-updates protected refs.
Writer handback is explicit. Both directions carry editable context with combined
copying, optional copy confirmation, manual dispatch confirmation and actual
recipient receipt as separate facts. Editing a payload resets local copy/dispatch/
receipt flags. Each action is required, optional or deferred and states existing
or new session, model, thinking, permissions and allowance. These are operating
conventions, not a product command parser or a new registry.

These conventions consolidate the explicit P0.1 and P2.0 assignments. The separately named
Revision 2 handoff source is unavailable and has not been read; no source-complete
migration claim is made. Repository safeguards and explicit user scope prevail.

## Components and ownership

React 19 / Vite / Tailwind uses existing Pages hosting and same-origin `/api/*`
and `/auth/*` Worker routes. The Worker owns OAuth, refresh grants and the Secure,
HttpOnly, SameSite=Lax, host-only `walmart_gc_session` cookie. The sole OAuth scope
is `https://www.googleapis.com/auth/drive.file`. No browser access/refresh tokens,
app-managed accounts, public card service or developer-owned card aggregation.

The private owner-controlled Google Sheet is the sole cloud inventory. Cards are
in `Cards`; protocol, commit proof and targeted recovery evidence are in `_META`.
A per-Sheet Durable Object serializes all app reads/reconcile/writes, including
external awaits. Its durable storage contains commit/request/operation hashes,
IDs, version proofs and bounded receipts only. Tokens/cards exist only transiently
in request processing. Setup creation has a separate principal-scoped durable
fence because the Sheet ID does not exist until Drive creation completes. Creation
uses a private Drive appProperty with the durable creation ID; a lost response is
resolved only by positive tagged owned-file discovery. Missing discovery never
authorizes another creation dispatch.

## Local transactional authority

Native IndexedDB `walmartGc.inventory`, store `state`, key `wallet` is the sole
writable local inventory authority. Inventory, semantic pending operations,
per-card/profile revisions, context generations, baseline, in-flight identity and
Batch observations/reference receipts commit atomically. Save success follows
`transaction.oncomplete`; aborts preserve the previous state and show failure.

Saved-compartment card operations, Manual verification and backup remain available
offline or during authentication/quota failure. They need no live identity or
cloud-version check. Synchronization confirms remote durability separately; a
cached identity never establishes ownership or permits cross-account inheritance.

Legacy localStorage is immutable migration input. A durable migration seed
retains original bytes and a UUID namespace before migration. Retries cannot
replace an existing inventory or change published operation IDs. Duplicate or
invalid identities/metadata and bundled samples are quarantined. Damaged/interrupted
Batch ledgers are isolated intact; they cannot suspend unrelated card edits or
synchronization. Batch requires explicit discard before new requests/results.
Later old-client writes/clears are
preserved as recovery evidence, never interpreted as deletion. Unreadable legacy
storage blocks initial migration; an existing migrated wallet remains usable.

Unbound, historical unverified Sheet and verified `account:principal:sheet:id`
compartments stay separate. A cached context never establishes authenticated
ownership. Verified binding does not merge old/unbound inventories. Explicit
unbound recovery preserves originals, retains credential alternatives for affected
identities and treats conflicting recovered balances as uncertain. Compatible
records continue in the same atomic command. Ordinary CSV credential validation
remains strict. CSV backup is per selected
compartment; recovery JSON includes original/quarantined data and warns about
credentials. Persistent context generations fence async responses and editors,
including switching away and back. Tabs share atomic commands, not stale arrays.

Each verified profile holds its last acknowledged remote snapshot and exact
in-flight request. Acknowledgment requires the matching receipt/request hash and
verified snapshot fingerprint. Only submitted operation IDs are removed;
subsequent edits are reconciled and remain pending. Up to 128 operations are sent
per commit. Local command receipts retain 128 SHA-256 digests (legacy full-command
receipts remain readable). Batch retains pending requests plus the latest 128
completed references. Observation receipts follow retained ledgers; obsolete
references cannot match newly generated UUID requests. Unresolved recovery
evidence remains preserved.

## Account and exact Sheet binding

After token exchange, the Worker requests Drive `about.user.permissionId`, then
stores that stable principal. An older refresh grant or Sheet binding may be
inherited only on a verified same-principal match. Unknown/different accounts
require a new refresh grant and start without old Sheet context. Before protected
sync, the Worker verifies the token's principal and the exact file's MIME type,
`ownedByMe`, nontrashed state and matching `owners.permissionId`. Discovery accepts
only a unique owned app-accessible wallet Sheet; ambiguity needs an exact ID.
Shared Drive/nonowned files fail closed. No extra OAuth scope or email-as-identity.

The official [about.get scope documentation](https://developers.google.com/workspace/drive/api/reference/rest/v3/about/get)
includes drive.file; [Drive User](https://developers.google.com/workspace/drive/api/reference/rest/v3/User)
defines permissionId. These support the proposed checks, not proof of actual grant
behavior in this deployment. Live verification and secret/session binding review
remain release prerequisites; secret values must never be printed.

## Protected synchronization protocol

`gc-wallet-sync-v1` fences every write endpoint. `POST /api/sync` handles pull,
commit and shared maintenance. `POST /api/sheet/ensure` uses coordinated setup.
Old `/api/cards/save` callers without this protocol receive 426 before Google
requests; the old client helper cannot issue network writes. There is no
uncoordinated legacy export/overwrite or fallback when the DO binding is absent.
`GET /api/cards/load` also requires the new protocol and a verified binding.
Status advertises principal, exact Sheet context, protocol and binding availability.

A commit carries an immutable ID, exact principal/Sheet, acknowledged base plus
fingerprint, and semantic operations. The server derives changes from operations,
never treats a submitted whole-array omission as deletion, and reconciles inside
the coordinator. True operation replays compare ID/content hashes. Equal amounts
from different actions are not deduplicated. Receipts retain 64 confirmed commits
and their operation hashes; old/unknown baselines stop before writes. Separate
hash groups keep each DO storage value within a conservative 128 KiB per-value budget. No KV
locking is used.

Before external dispatch, durable storage records possible dispatch, request hash,
commit ID and target content fingerprint. A single Sheets batch writes inventory,
lazy headers, new sheetVersion, protocol, commit ID, content fingerprint, targeted
evidence and maintenance state. Confirmation reads the marker and independently
hashes the content. Successful write/lost response is recovered with the SAME ID.
Missing markers after failure are inconclusive: affected writes stay suspended.
Restart never clears uncertainty or authorizes blind retries. An expired baseline can be explicitly recovered only after the server has fenced it
as not-dispatched: original requests/operations are archived, a fresh verified
read establishes the new baseline, and recovered monetary/field proposals stay
conservative. This recovery cannot bypass an uncertain dispatched flight.
Older confirmed
receipts can acknowledge their original operation set with a freshly validated
current snapshot; evicted or unknown retries require explicit recovery.

The DO uses an explicit promise queue for the full external sequence, rather than
assuming input gates make fetch transactional. Receipt/hash indexes commit in a
DO storage transaction. Google API timeouts are treated as uncertain after
possible dispatch. Actual Cloudflare runtime/binding compatibility remains a
release gate. Production modules and the HTTP DO class are also exercised in local
workerd with SQLite persistence and denied/unmatched outbound traffic. This proves
local queue/storage/restart behavior, not deployed bindings or Google semantics.
No production configuration was provisioned by this development.

## Record-level three-way reconciliation

Independent additions and field edits combine. Pending field edits retain their
own original field baseline across acknowledgment of an earlier commit. Unchanged
local fields follow remote changes. Reconciliation has three dispositions:

- **MERGE:** identical/compatible records and low-risk metadata disagreements.
  Competing metadata uses the earliest nonempty dateAdded, latest dateUpdated/dateUsed,
  maximum recorded startingBalance (never a sum), used=true if either competing
  record is used, and a sorted union of distinct note lines. A deliberate later
  used-state edit still applies against its baseline. Subsequent explicit edits
  supersede old metadata evidence; no field-by-field decisions are required.
- **FLAG:** monetary or verification uncertainty retains the card and its recorded
  provisional balance, with pendingReconciliation and bounded alternatives. It
  continues synchronizing independently of merchant verification.
- **QUARANTINE:** conflicting credentials, merchant/identity, explicit deletion or
  unclassified integrity evidence preserves necessary alternatives. Only affected
  identities are excluded from checkout and verification. Unrelated records sync.

`reconciliationPolicy.js` owns these deterministic defaults, persisted evidence
repair, eligibility, verification retirement and derived recovery counts. The same
policy runs during transactional local initialization and Worker projection, as
well as new reconciliation. It never rewrites a saved flight, pending operation,
baseline or original migration bytes. No deletion is inferred
from absence; missing remote rows preserve credentials, create durable recovery
operations and stay balance-uncertain until verified. Matching recovered rows
need no manual acknowledgement; their obsolete missing-row evidence retires.
Credential alternatives and explicit tombstones prevent that automatic retirement.
Later acknowledgments cannot erase the recovered row.
Controlled explicit deletions create compact retained tombstones so
stale devices cannot resurrect them. Restore is explicit and balance-uncertain.
Date-only pending operations and historical CSV recovery cannot silently erase a
precise verification timestamp. Conflicting date-only proposals become one
verification uncertainty, retaining the actual alternatives until fresh verification.

Monetary operations carry semantic identities and per-card monetary revisions.
When independent monetary changes conflict, the remote recorded balance remains
provisional. `_META.syncEvidence` retains competing balances, operation identities
and uncertainty time; `pendingReconciliation=true` routes the card to verification.
Unrelated cards continue syncing. A fresh applicable manual/Batch observation can
clear uncertainty, including when the verified amount is unchanged. Ordinary
balance edits and CSV imports cannot silently clear an uncertain balance. Checkout
shows a warning; monetary uncertainty alone creates no mandatory hold. Existing
used-card/credential protections stay intact.

Recovery evidence is targeted, not a second card database or generalized event
log. Credential alternatives are retained only for affected identity conflicts.
Resolved alternatives are removed after an applicable explicit choice or fresh
verification. Repeated monetary conflicts consolidate to one card-level balance
detail with distinct numeric alternatives; repeated verification disagreements
retain distinct field/value alternatives in one detail. Historical operation IDs
in monetary warnings retire; durable semantic operations and coordinator receipts
still fence dispatch/replay. Per-card monetary revisions, applicability times and tombstones
remain; stale baselines and operation receipts fence replay after compaction.
Tombstones do not expire automatically.

`syncEvidence.js` owns the Sheet encoding and compaction. Saved/API v1 evidence
remains a logical object. `_META.syncEvidence` is a manifest for up to 128 fixed
`syncEvidence:N` parts, each at most 38,000 UTF-8 bytes; ordinary revisions use
compact tuples. All parts, Cards and the commit marker change in one Sheets batch.
Missing/damaged parts fail closed; obsolete part values are cleared and keys reused.
Legacy single-cell evidence remains readable. An older Worker rejects the new
manifest rather than ignoring evidence; rollback must use a compatible build.
The 4,864,000-byte encoded capacity is a final recovery bound, not an ordinary
card-count ceiling. Exhaustion preserves pending work and requires private recovery.

## P2.0 spent-card zero evidence and lifecycle selection

Used state remains independent of balance, verification and refund recovery.
An estimated or recorded zero, even with retained positive verification history,
is unconfirmed. The sole optional protected per-card `zeroObservation` is
`{checkedAt, money}`: a canonical precise accepted zero observation and the
acknowledged monetary revision. Local pending proof additionally names its exact
`operationId`; it applies only while that accepted zero operation is the latest
pending monetary action, with matching current credentials, value and timestamp
and no reconciliation requirement. It survives transaction completion/reload and
compatible earlier acknowledgments; the server replaces it with acknowledged
proof. No Cards/CSV columns, separate inventory authority or refund ledger.

Only applicable accepted Manual/Batch observations establish proof. Money changes,
credential/merchant changes, uncertainty, affected maintenance, tombstones and
recovery invalidate inapplicable proof; notes and independent used changes preserve
it. Readers validate shape, timestamp/date, revision, zero value, uncertainty,
unresolved conflicts and pending identity. Missing/invalid evidence degrades to
unconfirmed; it never derives from dateUpdated, used or retained check dates.
Proof packs into the existing bounded evidence representation and compacts with
ordinary entries. CSV restores history without creating proof; recovery JSON
preserves original bytes/evidence as recovery input, never automatic authority.

New local monetary operations without observations carry canonical `performedAt`
inside the existing semantic pending operation. Reconciliation validates canonical
time and the existing 60-second future tolerance, retaining the maximum previous
monetary applicability time. Genuine verification uses its observation time;
legacy/malformed operation times retain the conservative commit-time fence.
An unknown earlier action time in a legacy mixed-operation flight cannot establish
zero proof. Pending action times fence local Manual acceptance and Batch preview/
application as well as shared reconciliation; proof cannot predate moneyAt.
Uncertainty/conflicts and maintenance retain their existing fences. This additive
operation detail prevents transport latency from invalidating a later accepted
local observation after an earlier action's ACK. Stale baselines/revision changes
and operation receipts still govern applicability and replay. Local evidence is
cloned independently of hashed baselines, including saved profiles from older builds.

Deploy the compatible Worker before publishing the P2.0 frontend. The new Worker
accepts older v1 clients and establishes proof only from applicable observations;
old set-balance operations increment the revision and cannot reuse proof. An older
frontend continues ordinary verification without interpreting proof. A P2.0
frontend paired with an older Worker can lose confirmation conservatively; this
is not the supported publication order. Once evidence exists, Worker rollback
must retain P2.0 reconciliation/invalidation (a compatible corrective build), never
roll back to a proof-unaware writer. Frontend rollback is compatible while keeping
that Worker. No protocol/version, schema, binding, activation or privacy changes.

Shared selection offers general verification, spent reconciliation (used cards
without applicable zero), recent refund watch, final checks and historical sweeps.
Use only valid nonfuture dateUsed. Watch covers age <120 days; freshness defaults
to 60 days with 30/60/90 choices. Final checks are due at age >=120 until an
applicable zero at/after the anniversary; age 120–149 has priority, and missed
checks remain eligible indefinitely. Historical sweeps explicitly recover used
cards with missing/invalid dates or age >=120, subject to chosen freshness.
Zero without proof is never treated as fresh. Positive verification history can
order work but never completes a zero final check. Lifecycle selection defaults
to 20, caps at 50, and orders uncertainty, priority due work, other due work,
never applicable checked, oldest applicable checked, then identity. Uncertainty
bypasses age/freshness and used-state scope but retains credential/account fences.
Historical growth cannot enlarge a routine working selection. The watch horizon
is a workload heuristic, never refund eligibility. Cards remain indefinitely.

Positive observations (including above starting balance) use existing commands,
preserve used status and require explicit Mark Active. No automatic reactivation,
refund cap, invented transaction, scheduler, retries or live merchant execution.
Explicit reselection and existing R2 drafts/progress, transactional fences,
account isolation, offline continuity and P0.1 lifecycle safeguards remain.

## Maintenance and direct edits

R1 keeps Settings responsible for masked diagnostics and explicit
owner actions, `syncEngine` for binding/control/recovery orchestration, inventory
for transactional transitions, the Worker adapter for row validation, and the
coordinator for dispatch fences. Initial binding intent survives failed reads;
Sync now can retry it. Explicit unbound recovery first establishes the connected
account's verified destination, then uses the existing conservative CSV recovery
command. Original compartments, operations and credentials remain intact.

`inventoryRecovery.js` owns deterministic duplicate projection, explicit recovery
planning, quarantined-record eligibility and optional Batch isolation/receipt retention.
Individually valid duplicate rows consolidate independent of row order. Matching
credentials combine compatible fields; conflicting balances use the minimum
recorded amount provisionally, never a sum, and require fresh verification. The
latest genuine precise timestamp survives as history. Used state is preserved.
The newest supported legacy date survives too; if a newer date-only record
supersedes older precise history, the original precise pair remains in targeted
evidence until a fresh verification replaces it. Distinct repair episodes have
distinct conflict identities, so stale resolutions cannot retire new alternatives.
Low-risk metadata follows the record-level defaults. Distinct credential and
integrity alternatives remain in targeted evidence until an explicit choice;
other cards continue. Settings separates synchronization (synchronized, pending or
blocked), balance confidence and record integrity, with a concise derived summary
and a flagged-card verification action. Exceptional details and owner recovery
controls remain under advanced disclosure. Uncertainty/quarantine alone is not a
synchronization error. Genuine ownership, shared integrity and uncertain-dispatch
failures remain Sheet-wide fences.

Pulls return a verified projection and a repair flag. The existing engine uses a
durable ordinary commit to persist repair, preserving confirmation/retry fencing.
Retained, independently hashed baselines and a constant-size hash of the positively
committed monetary/credential/verification context classify compatible external edits.
That aggregate proof preserves genuine current verification even for stale clients;
unprovable monetary drift from a stale baseline requires explicit maintenance.
Classifiable monetary/verification drift becomes local uncertainty rather than a
wallet-wide stop. Missing rows are restored, never deleted by omission.
Unclassifiable edits require explicit shared maintenance. Invalid headers/rows and damaged
managed evidence remain blocked; this is not generalized schema repair.

Control rejection is distinct from dispatch uncertainty. Within the existing
serialized coordinator, a failed control can receive an exact ID/request-hash
non-dispatch proof only after durable rejection fencing and in the absence of any
possible dispatch or retained confirmation. Rejected IDs cannot later dispatch,
including from stale tabs. New control IDs contain an immutable UTC creation time.
The Worker HTTP boundary accepts `control:<canonical UTC ISO milliseconds>:<UUIDv4>`
only for `ensure`, `pause`, `resume` and the internal setup-creation hop. Ordinary
commits retain standalone UUIDv4 identities; historical UUIDv4 controls remain valid.
Timestamp age/cutoff policy remains in the coordinator, after positive recovery.
An exact-Sheet saved control rejected by the former UUID-only HTTP gate can retry
its original identity through Sync now without clearing local state. Previously
possible-dispatch controls still require matching commit/content proof.
The coordinator retains at most 64 dated rejection hashes and a monotonic cutoff;
evicted IDs stay fenced by that cutoff, including when their action is changed.
Positive possible-dispatch recovery and exact retained successful receipts take
precedence over the rejection cutoff.
Existing undated rejections remain readable and fenced (at most 64); further legacy
controls require an upgraded client at that bound. The client preserves the latest
64 rejected-control records before retiring them. Transport failures, setup creation uncertainty, errors before
coordinator proof, mismatched proofs and uncertain flights keep the same request.
Sync now checks that request; a different control cannot silently replace it.
An unresolved targetless setup cannot be redirected or retired using a later
per-Sheet proof: it remains preserved for operator recovery, including after a
session destination change. Recovering that case automatically would require
principal-scoped immutable destination proof and is outside this focused slice.
No new store, protocol version, dependency or automatic destructive repair.

Cards and `_META` are app-managed during automatic sync. Pause shared maintenance
through the coordinator before direct editing; app writes then suspend across
sessions. Export a private backup. Resume explicitly accepts the observed contents
and optionally confirms exact deleted identities already absent from Cards. A
maintenance timestamp fences older monetary observations. Managed recovery
evidence/tombstones must stay intact even during maintenance; the coordinator
retains their hash and rejects external erasure.
At pause, temporary original cards are retained in protected, partitioned private
Sheet evidence, with only an aggregate hash in the DO. Resume restores accidentally
missing cards unless their exact deletion was explicitly confirmed. It restores
genuine original verification times after timestamp edits and preserves conflicting
credentials. Only changed monetary/credential/verification context gains a per-card
revision, uncertainty and applicability fence; notes-only maintenance preserves
unaffected Batch requests. Temporary originals are removed in the confirmed resume
batch. Existing in-progress legacy maintenance proofs remain supported. The
global historical maintenance fence is retained as the compatibility floor when
transitioning to per-card maintenance fences.
Absence alone never creates tombstones. Fingerprinting detects direct edits even
without a changed sheetVersion. Unclassifiable edits stop normal writes; an owner must
pause/review/accept them. The app cannot prevent an external editor ignoring the
pause protocol or making concurrent edits during a batch. This operational limit
must be explained and exercised before release.

## Preserved card / CSV contract

Required headers, in preferred creation order:

```text
cardNumber,pin,startingBalance,currentBalance,merchant,merchantInferred,dateAdded,dateUpdated,dateUsed,used,notes
```

Optional fields: UTC date-only `lastBalanceChecked` (`YYYY-MM-DD`), precise UTC
`lastBalanceCheckedAt` (canonical ISO timestamp matching that date), and Boolean
`pendingReconciliation` (absent/false/true). Empty optional cells become absent.
Merchant is explicit override; inferred merchant is derived from identity; runtime
effectiveMerchant and barcode payload are never persisted.
Money must be finite, nonnegative and accurate in safe integer cents; a refund
may exceed the starting balance. Used state is independent of balance and
verification. Walmart Canada barcode payload is `79936686504000` followed by
the full card number; do not substitute a display mask or persist that payload.

Historical 10-column Sheets omit only merchantInferred. Recognized 11–14-column
headers may reorder fields. Unknown/duplicate/interior-blank headers and occupied
append targets, including blank-looking formulas, block writes. Header extension
is lazy and part of the inventory/commit batch, without eager row backfill.
CSV accepts legacy 8/10/11-column headered/headerless layouts and extended 12/13/14
headered layouts. Export includes all 14 fields. Invalid/ambiguous imports
abort atomically. Missing rows never delete local cards. Optional metadata loss
requires explicit backup-aware confirmation.

## Verification and Batch continuity

P0.2 gives each App its own `features/verification/verificationWorkflow.js`
controller, subscribed through `useVerificationSession`. It owns ephemeral state
and reusable selection, Manual save/skip/copy, Batch prepare/export/preview/apply
and explicit Companion commands. Views render snapshots and own only focus/scroll
effects. This is no global store or second persistence authority: IndexedDB,
inventory commands, saved Batch ledger and protected synchronization remain intact.

The controller accepts the current wallet snapshot, saved-wallet reader,
transactional commit, transfer-availability guard and explicit clipboard/transport
writers. Commands capture compartment/generation, workflow selection identity,
operation identity and their inputs. Saved context is checked across asynchronous
boundaries, including notifications that lag away/back generation changes.
Only the owning command can publish progress, preview, correlation, feedback or
release busy state. Superseded completions leave legitimately committed operations
durable without changing newer UI state; abort retains valid drafts/previews and
recovery evidence. No automatic merchant execution/retry or credential persistence
is introduced. P2.0 zero proof, performedAt and proof-aware Worker rollback remain.

The hook resets sensitive transient state and command ownership in a layout
effect before changed context/credentials paint. Missing/ambiguous or edited
selected credentials invalidate the working workflow, including pending copies;
commands also validate saved credentials before export. Same-context view mounting,
navigation and mode changes preserve drafts/progress. Explicit reselection and
flagged entry replace the workflow; preparing remaining cards preserves Manual
draft/progress. Old transfer cancellation is best effort and never clears a newer
correlation. Failures remain local to their originating command; optional damaged
Batch state still cannot block Manual selection.

R2 keeps shared verification UI state at App lifetime in
`features/verification/useVerificationSession.js`. Manual and Companion / Batch
use `selectTransferCards` and `VerificationSelection` for scope, status, balance,
date, quantity and ordering. Explicit selection replaces the working queue.
Manual selection reads only saved inventory and context; damaged optional Batch
state cannot block it. Companion selection uses the existing `set-batch` command;
switching a Manual queue to Companion offers explicit Prepare selected cards,
checks the captured context/per-card revisions and saves requests for remaining
cards in the same order, without clearing the Manual draft/progress. UI-owned refs
limit export to that prepared queue; historical results still resolve against the
inventory ledger. Outstanding historical references remain saved.
Mode changes and contextual exits retain relevant drafts,
progress and preview. A changed inventory/context generation resets this ephemeral
UI state and fences outstanding responses. Reload retains preferences and the
saved ledger, restoring its pending selected refs and available cards for explicit
export without issuing new refs. Explicit flagged entry instead uses current flags.
No credential-bearing UI session is persisted.

`verificationCommands.js` owns the cohesive local session checks, foreign-ledger
isolation and affected reference validation shared by Batch preparation/export/preview.
Domain commands, R1 retirement and transaction ownership remain in inventory.
Manual verification invalidates its affected outstanding references; applicable
Batch observations contribute to the shared working-selection progress only after
the atomic application commits.

The direct extension protocol uses explicit `wallet-transfer-*` messages, version
1 and a fresh UUID session, carrying unchanged Batch v1 packets. Only the exact
production HTTPS Wallet root, a top-level browser tab and its sender document ID
can own an external session. Other extensions, subframes, unexpected fields/types,
versions and uncorrelated sessions fail closed. Only an authorized extension-origin
merchant overlay can receive credentials and return observations, bound to that
receiver tab/frame/document. Requests are delivered once; results admit only the
issued refs, valid amounts/timestamps and identical replays. A conflicting replay
or malformed partial packet rejects atomically, retaining earlier observations.

The extension broker holds one bounded transfer in worker memory for up to 30
minutes. It writes no transport storage, logs or credential URLs, and clears the
credential packet after delivery. Closing the Wallet tab, expiration or worker
restart ends transport; no automatic retry/resume exists. Requests already saved
in Wallet and noncredential Companion observation history support explicit TSV
recovery. Opening/importing a request never starts a merchant check. Receive in
Wallet creates the existing validated preview; only explicit Apply changes cards.
No Worker/API, database schema, OAuth, infrastructure or Stable-channel change
is part of this frontend/Companion boundary.

Manual verification always updates lastBalanceChecked, even unchanged; dateUpdated
changes only with the verified balance. Verification never reactivates used cards.
Batch TSV remains `WMGC-REQUEST<TAB>1` / `WMGC-RESULT<TAB>1` with exact UUID refs,
CAD cents and ISO UTC checkedAt. New verifications persist their exact UTC time;
historical date-only records remain valid without guessing a time.

The exact TSV headers are `WMGC-REQUEST<TAB>1` then
`ref<TAB>cardNumber<TAB>pin`, and `WMGC-RESULT<TAB>1` then
`ref<TAB>balanceCAD<TAB>checkedAt`. Refs are lowercase canonical UUIDv4 strings,
credentials are unconverted 16-digit card/4-digit PIN strings, and balances are
plain CAD decimals with exactly two fractional digits. Use UTF-8 and LF/CRLF;
an initial BOM and trailing blank lines are accepted. Headers/version are exact
and case-sensitive; embedded tabs/newlines are invalid. Packet shape alone never
establishes issuance. Reuse a ref only to resume/reimport the same request; a new
check gets a fresh ref. Do not pass packets through spreadsheet coercion,
formulas, quoting or thousands separators. Results contain only successful actual
observations: ref, balance and canonical UTC timestamp, with no credentials,
last-four/fingerprint/token, failed-check rows or invented balances. They are
validated observations, not signed financial proof.

Companion credentials stay in a memory-only queue; noncredential observation
history supports explicit backup and legacy recovery. Salted linkage fingerprints
are deduplication aids, not identity proof or a security boundary. Fresh refs may
recheck a card without deleting saved results; never relabel old result history.
Reject malformed/ambiguous packets or conflicting ref/identity mappings atomically;
omit identical duplicates and retain one current ref per card. An unlinked pending
row can link only by exact card/PIN match before observation. Completed replays
remain exportable from history; unlinked legacy history is not Wallet results.
Preserve skipped/unfinished rows, the existing `wmgc-helper:verified-results:v1`
history where applicable, walletRef linkage, and slash/CSV/TSV fallback. Site-origin
storage is not a security boundary; never silently discard or downgrade linkage.
Clearing cards and clearing results are separate guarded actions while checking.
No passive clipboard reads or focus-triggered import.

Companion foreground checks require explicit start and a selected target of
10, 25 or 50. They use a fixed 1,400 ms delay and continue to the target or
queue exhaustion, without ten-card segmentation or rest. Foreground visibility,
challenge, 30-second timeout and manual fallback safeguards remain in force.
Stop on error/mismatch or merchant rejection; no unlimited/full-queue target,
quantity/pacing expansion, automatic retry, inactive-tab checking or challenge
bypass. These are product settings, not evidence of merchant permission.

Ledger requests are retained per inventory across selections, with per-card relevance
snapshots and salted PIN digests (no cleartext PIN). A selection identifies which
references to export; results resolve against the inventory ledger. Unrelated notes/other cards and compatible sync acknowledgments
preserve outstanding requests. Relevant identity, balance, used or verification
changes invalidate affected requests; context/account switches are fenced.
Missing cards and changed credentials invalidate only their own references. A
ledger found in the wrong inventory is quarantined intact rather than reused;
it does not prevent a new selection in the current inventory. Result eligibility
is determined before selecting the newest applicable observation for a card.
An outstanding request captures the card state before its full UTC creation time.
An observation at or after that time may be accepted on the same UTC day as a
legacy date-only verification, provided the captured card state remains relevant.
A subsequent manual verification invalidates that card's request even when its
amount and calendar date are unchanged. Precise timestamps order new observations;
legacy date-only values do not establish ordering within a day. Equal-time
conflicting observations are rejected.
On a protected pull or acknowledgment, a change in the per-card monetary evidence
revision beyond the acknowledged local operations invalidates outstanding requests
for that card, including unchanged same-day verifications. Shared maintenance
invalidates only affected requests. Uncertain active cards, including provisional
zero balances and recent verification dates, precede the normal default Batch
filters; explicit used-card selection still applies in the normal selection.
A dedicated Flagged only scope derives from current inventory and bypasses normal
status/balance/date filters, including eligible used cards and provisional zeros.
It shares Manual/Batch workflows and never reactivates used cards.
Settings flagged entry always starts a fresh Manual queue from current flags;
ordinary contextual return preserves the working session. Applicable new
observations retire monetary and verification evidence in the same local
transaction, then reconcile through the existing protected protocol. Monetary,
uncertainty and scoped maintenance times bound applicability. Protected synchronization continues to reconcile
concurrent monetary operations that have not yet been observed locally.
Partial apply atomically saves accepted observations, inventory, semantic pending
operations and applied references. Exact replay is a no-op; conflicting replay is
rejected. Legacy damaged/interrupted applications remain quarantined for checked
recovery. Freshness cannot be inferred from a matching amount or date alone.

## Scheduling, deployment and rollback

Local saves are immediate. Automatic mode coalesces meaningful pending work at
3 seconds (15-second minimum between cycles, 30-second normal batching cap).
Launch and foreground/reconnect check remote state when needed (five-minute
freshness for a clean compartment); no periodic idle, hidden or closed-page
polling. Manual mode does not initiate automatic inventory sync. Sync now uses
the same protected engine with a five-second manual cooldown. Explicit connection,
setup and recovery actions remain available. One 60-second transport retry in
automatic mode reuses the durable identity. Client request timeout is 30 seconds;
quota responses suspend affected requests through the indicated reset/backoff.
Unchanged local edits and identical verified pulls do not create inventory writes.
Keep full Sheet content verification: metadata alone cannot detect direct edits.
Batch preparation, export, preview and application use the saved compartment
locally, including the unbound inventory. Protected synchronization independently
verifies the account and exact Sheet before any remote write. No server cache or additional infrastructure.

Deploy only after independent review and the [QA gates](QA_TEST_CHECKLIST.md).
The production Worker config records verified resource IDs/routes, the SQLite
coordinator migration and operator-corrected observability settings. During
activation `SYNC_ACTIVATION_BLOCKED="true"` reports coordination unavailable and
blocks inventory reads, writes and setup after verified Drive ownership lookup.
Authentication/status and controlled Drive checks remain available. Clear the pause
only after the activation plan's Google gates pass. A coordinated Worker must
precede enabling the matching frontend in production. Configuration alone does not
prove the binding/migration was deployed; preserve its migration history.
Rollback must keep indexedDB, protocol/evidence and fencing readable. An old
writable frontend/Worker is unsafe; use a compatible read-only recovery build and
private CSV/Sheet backups, never a localStorage dual-write bridge.

## A1 feature module boundary

`src/features/settings/SettingsPanel.jsx` owns Settings rendering, account masking,
preference controls, connection/recovery disclosure and backup/troubleshooting UI.
It uses the existing primitives and shared `components/ActionButton.jsx` (also used
by Checkout). Markup, accessible labels, confirmation text and navigation remain.

`useSettings` owns preferences, best-effort persistence through `lib/settings.js`,
connection disclosure state and the exact-Sheet/deleted-identities drafts. App
calls it unconditionally: drafts survive Settings, Checkout and Balance Check
navigation, but reset on page reload. App initializes preferences at the existing
wallet-open boundary. The controller provides `settings`, a live `current` ref for
the sync scheduler, `initialize`, `resetFilters`, and a `panel` interface containing
preference `change`/`toggle` and draft/disclosure setters. Enabling automatic sync
updates the live preference before invoking App's foreground callback. Connection
disclosure defaults are applied before the native accordion mounts, preventing a
queued toggle from undoing the entry/error state. Failed
preference storage retains the in-memory session; it never writes inventory.

The panel receives only that panel interface plus read-only `connection`,
`synchronization` (summary, messages, diagnostic flags) and `inventory` (selected
compartment metadata, pending/confirmation state, recovery evidence and zero count)
views. Its `commands` callbacks cover connection, protected sync/setup/maintenance,
recovery/conflict resolution, compartment selection, CSV import/export, recovery
export and zero-card marking; `onBack` preserves the previous primary destination.
Setup takes the draft Sheet ID; maintenance takes an action and deletion draft.
App trims/parses them and retains every existing confirmation, transaction/context
fence, failure message and uncertain-write protection.

App still owns wallet/sync engine lifetime, authoritative snapshots, domain
commands, error presentation, navigation/active context and theme application.
CSV editor transactions remain in App because they share captured inventory
context with import and save. Settings has no inventory store, engine or network
client. This is a local feature pattern, with no global store or new runtime
boundary for the protected protocol. Checkout is extracted in A3 below; the conditional shell remains in App.

## A2 Cards / Inventory feature boundary

`src/features/cards/CardsPanel.jsx` owns Cards rendering: the balance-review
entry, empty inventory and fully filtered states, masked rows, selection styling,
used labels and amounts. It reuses existing primitives and receives read-only
`cards`, `visibleIndexes`, `selectedCardIndex`, `loaded`, `googleConnected` and
the shared `maskCardNumber` formatter. Its `commands` callbacks request balance
review, Google connection, CSV import, filter reset, Settings and card selection.
App adapts these to the existing handlers; the panel has no store or network client.
DOM structure, labels, focus behavior and styling are preserved.

There is no Cards-exclusive mutable state to extract. Shared selection and its
identity ref stay in App, including context-change reconciliation, Checkout
navigation and advance-on-used behavior. Filtering/sorting preferences remain in
`useSettings`; App uses existing `lib/cards.js` selectors for both Cards and
Checkout and for the persistent balance strip. No duplicate derived inventory,
feature controller or state initialization is introduced. Conditional Cards
unmounts during Settings, Checkout and Balance Check do not reset shared state.

The hidden CSV file input is mounted in App alongside its existing import handler,
so Cards' empty-state import and Settings share it across conditional panels.
Previously it was inside Settings and unavailable to Cards. The handler still
captures inventory context and opens the same protected recovery editor.

Inventory authority, snapshots, active context, domain commands and all captured
transaction/context fences remain with App and the existing inventory/sync
modules. CSV input ownership and connection commands remain shared with Settings;
the view only invokes callbacks. No protocol, schema, Worker, companion, transfer
or storage contract changes are part of A2.

## A3 Checkout feature boundary

`src/features/checkout/CheckoutPanel.jsx` owns the existing Checkout markup,
barcode presentation, credential controls, card navigation controls, balance/used
actions and notes UI. `CheckoutOverlays.jsx` owns the balance dialog and copy
feedback. Existing primitives, labels, layout and barcode helpers are reused.

App calls `useCheckout` unconditionally, preserving same-context app-lifetime reveal state,
copy feedback/timer, balance/amount-used/error and notes drafts, editor visibility
and captured edit targets through conditional Settings and Balance Check views.
Previous/next still changes shared selection in App and explicitly resets
Checkout transient state. Ordinary same-card/context panel navigation retains the
prior lifetime. P0.1 binds all sensitive transient state to compartment, persistent
context generation and selected card, clearing drafts/reveal/feedback/targets
before a changed scope paints, including switching away and back.
The shell reads editor visibility only to suppress swipe navigation during edits.

The controller receives the selected card, active Checkout visibility, the shared
clipboard writer, context identity and commands: `captureTarget(card)`, `isContextCurrent(target)`,
`saveBalance(target, value, isCurrent)` and `saveNotes(target, notes, isCurrent)`.
The completion predicate also fences App's save-error feedback without changing
the transactional command or committed inventory. Targets capture the
original inventory context/generation, card identity and version at editor open;
saves never recapture the current selection. App constructs the existing semantic
patches, dates and commit operations. Success closes editors only after the
transaction resolves and only while the same editor instance and context remain.
Cancel/reopen invalidates editor identity; stale completion cannot close or alter
a newer editor. Failed current saves retain drafts and existing error presentation.
Copy completion and its timer require the original scope and latest action identity;
neither stale success nor stale failure changes current feedback.
Used/active actions and advance-on-used remain App-owned shared commands.

The controller owns best-effort wake-lock acquisition and cleanup while Checkout
is active, including immediate release of grants arriving after navigation.
Desktop/fine-pointer clicks still copy full digits-only CODE/trimmed PIN through
the existing clipboard writer; mobile code clicks toggle reveal. No clipboard
reads or camera requests are introduced. Barcode payload/generation is unchanged.

App retains shared selection/identity reconciliation, filtering/sorting and totals,
settings/theme, contextual navigation and Balance Check return/focus, CSV editor,
wallet/sync lifetime, inventory authority, context fencing and protected commands.
The shared clipboard writer also serves Balance Check. These intentional couplings
remain; no global store or duplicate inventory is added. A4 shell/Balance Check
convergence remains deferred. A3 included no core, protocol, schema, Worker, companion,
transfer, PWA/service-worker, dependency or UX changes.

## P1.1 shared navigation boundary

App retains shell/navigation and the existing inventory, selection and command
owners. Cards, Checkout and Balance Check are stable primary destinations; private
Settings returns to the destination that opened it. Balance Check now renders
inside the shared header, merchant total, privacy-safe sync strip and navigation.
Sync assistance opens Settings rather than initiating OAuth from a status chip.
No feature extraction or new state store is required.

App keeps per-destination scroll offsets and contextual return panel/control IDs
in ephemeral refs. A Checkout review origin also captures a SHA-256 card identity
digest and exact compartment/generation. Exit reads IndexedDB and resolves that
card in the current eligible collection, resolves its index/eligibility against
the latest saved snapshot after hashing and abandons late navigation if the user
has changed destination or started a verification command;
revision changes retry resolution at most three times, then return safely to
Cards under continuous inventory activity rather than waiting indefinitely;
missing/filtered/credential-blocked or changed-context origins fall back to Cards
with heading focus, never another card's barcode. Reordering preserves identity.
No credentials are stored in these refs. Heading focus announces a destination; contextual return
restores the invoking control with a heading fallback and restores scroll without
focus scrolling. Settings opened inside Balance Check does not replace its return
origin. Ordinary entry preserves the R2 session; explicit Settings flagged entry
still refreshes current flags in Manual mode. Verification busy state disables
shell exits until the existing command completes, preserving R2 transaction order.

Settings, Checkout and verification controllers retain their App lifetime and
captured targets/context fences. Checkout wake lock and overlays are active only
on Checkout; notes/reveal/drafts survive same-card/context navigation. Verification heading focus
does not override restored scroll. Navigation neither writes inventory nor starts
checks, transport or result application. The existing generation-change reset,
saved Batch ledger and offline shell remain authoritative. No schema/protocol,
Worker, Companion source, infrastructure or dependency changes are included.

### Frontend and Companion module map after P1.1

| Module | Owner / remaining coupling |
| --- | --- |
| `src/App.jsx` | Shell/navigation, active inventory context, shared selection and derived inventory views, theme, wallet/sync lifetime and protected commands, shared clipboard writer and CSV editor rendering. |
| `src/features/checkout/CheckoutPanel.jsx`, `CheckoutOverlays.jsx`, `useCheckout.js` | Checkout rendering, app-lifetime exclusive workflow state, captured targets and passive wake lock; consumes shared selection and App-owned commands. |
| `src/features/cards/CardsPanel.jsx` | Stateless Cards view consuming shared inventory views and command callbacks. |
| `src/features/settings/SettingsPanel.jsx`, `useSettings.js` | Settings view, shared preferences and app-lifetime Settings drafts/disclosure. |
| `src/lib/cards.js` | Existing shared filtering, sorting, totals and card helpers. |
| `src/lib/inventory.js`, `syncEngine.js` | Existing transactional inventory and synchronization authorities. |
| `src/features/verification/useVerificationSession.js`, `verificationWorkflow.js` | App-lifetime subscription and reusable verification workflow commands/state; pre-paint context/credential fencing and owned asynchronous completions. No second inventory authority. |
| `src/features/verification/VerificationSelection.jsx` | Shared scope/filter/quantity/order controls; explicit reselection with asynchronous action locking. |
| `src/components/BalanceReview.jsx` | Captures Manual queue/context/revisions independently of Batch; prepares selected requests through existing commands and owns Manual observation orchestration. |
| `src/features/verification/verificationCommands.js` | Batch session/context checks, foreign-ledger isolation and affected-reference validation; no new persistence authority. |
| `src/components/BalanceTransfer.jsx` | Existing Batch preview/apply/TSV workflow and explicit transport actions, using inventory commands and prepared selection refs. |
| `src/lib/balanceTransfer.js`, `balanceTransferLedger.js`, `companionTransport.js` | Pure Batch v1 selection/validation/ledger model and bounded extension client; no merchant checking or persistent transport storage. |
| `companion/src/core/wallet-transport.js`, extension adapter | In-memory correlated request/result broker with origin/sender/document/version validation; shared core remains the source for extension/bookmarklet builds. |
| `src/components/`, `primitives/` | Existing shared UI components and primitives. |

## Installation and offline shell

The manifest exposes a standalone install with 192 and 512 pixel application icons. A production build generates a content-versioned service worker and an explicit precache containing only the root document, manifest, icons, favicon and generated application assets. Requests outside that allowlist, including API and OAuth traffic and non-root navigations, pass directly to the network and are never stored by the worker. Cached shell responses are checked against the active build digest. Missing or corrupt entries are repaired only with matching bytes fetched from the canonical public URL without credentials or query parameters. If repair fails, asset requests fail closed and root navigations show a recovery page directing the user to reconnect or close wallet tabs and reopen online; inventory is untouched. Root navigation queries remain in the browser URL while the matching shell is served. Successful installation requires the entire shell to be cached and each file to match its build digest, preventing a mixed deployment from activating.

The root cache entry is a verified copy of canonical `/index.html`; installation and root repair fetch that document rather than transformed CDN root HTML. Existing Cloudflare analytics/privacy configuration remains unchanged, and every cached response must still match the build digest.

A new worker waits until existing controlled tabs close before activation; it does not force a reload or interrupt in-flight work. On activation it removes obsolete shell caches. An open tab may therefore continue using the previous release until all tabs using it close. Inventory, pending operations and recovery remain in IndexedDB under the existing contracts; the shell cache is not an inventory authority. Offline launch requires a prior successful online shell installation.

Post-A3 architectural audits by Codex and GPT independently found no material architectural blocker. GPT confirmed main `0985eca`, A3 CI and deployment, and the source boundaries. Dedicated A4 is deferred indefinitely; refine the broad Balance Check session/command interface, App projections and CSV ownership alongside relevant functional work.
