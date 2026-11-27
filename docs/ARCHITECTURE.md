# GC Wallet architecture

This is the authority for data flow, persistence, APIs, session/account binding,
synchronization and recovery. UI authority is [M3](M3_DESIGN_DECISIONS.md).

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

Historical 10-column Sheets omit only merchantInferred. Recognized 11–14-column
headers may reorder fields. Unknown/duplicate/interior-blank headers and occupied
append targets, including blank-looking formulas, block writes. Header extension
is lazy and part of the inventory/commit batch, without eager row backfill.
CSV accepts legacy 8/10/11-column headered/headerless layouts and extended 12/13/14
headered layouts. Export includes all 14 fields. Invalid/ambiguous imports
abort atomically. Missing rows never delete local cards. Optional metadata loss
requires explicit backup-aware confirmation.

## Verification and Batch continuity

Manual verification always updates lastBalanceChecked, even unchanged; dateUpdated
changes only with the verified balance. Verification never reactivates used cards.
Batch TSV remains `WMGC-REQUEST<TAB>1` / `WMGC-RESULT<TAB>1` with exact UUID refs,
CAD cents and ISO UTC checkedAt. New verifications persist their exact UTC time;
historical date-only records remain valid without guessing a time.

Companion foreground checks require explicit start and a selected target of
10, 25 or 50. They use a fixed 1,400 ms delay and continue to the target or
queue exhaustion, without ten-card segmentation or rest. Foreground visibility,
challenge, timeout and manual fallback safeguards remain in force.

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
It shares Manual/Batch workflows and never reactivates used cards. Applicable new
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

App calls `useCheckout` unconditionally, preserving app-lifetime reveal state,
copy feedback/timer, balance/amount-used/error and notes drafts, editor visibility
and captured edit targets through conditional Settings and Balance Check views.
Previous/next still changes shared selection in App and explicitly resets
Checkout reveal/edit visibility. Other navigation retains the prior lifetime.
The shell reads editor visibility only to suppress swipe navigation during edits.

The controller receives the selected card, active Checkout visibility, the shared
clipboard writer and three commands: `captureTarget(card)`,
`saveBalance(target, value)` and `saveNotes(target, notes)`. Targets capture the
original inventory context/generation, card identity and version at editor open;
saves never recapture the current selection. App constructs the existing semantic
patches, dates and commit operations. Success closes editors only after the
transaction resolves; failed saves retain drafts and existing error presentation.
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

### Frontend module map after A3

| Module | Owner / remaining coupling |
| --- | --- |
| `src/App.jsx` | Shell/navigation, active inventory context, shared selection and derived inventory views, theme, wallet/sync lifetime and protected commands, shared clipboard writer and CSV editor rendering. |
| `src/features/checkout/CheckoutPanel.jsx`, `CheckoutOverlays.jsx`, `useCheckout.js` | Checkout rendering, app-lifetime exclusive workflow state, captured targets and passive wake lock; consumes shared selection and App-owned commands. |
| `src/features/cards/CardsPanel.jsx` | Stateless Cards view consuming shared inventory views and command callbacks. |
| `src/features/settings/SettingsPanel.jsx`, `useSettings.js` | Settings view, shared preferences and app-lifetime Settings drafts/disclosure. |
| `src/lib/cards.js` | Existing shared filtering, sorting, totals and card helpers. |
| `src/lib/inventory.js`, `syncEngine.js` | Existing transactional inventory and synchronization authorities. |
| `src/components/BalanceReview.jsx` | Existing Balance Check flow and captured command interfaces. |
| `src/components/`, `primitives/` | Existing shared UI components and primitives. |

## Installation and offline shell

The manifest exposes a standalone install with 192 and 512 pixel application icons. A production build generates a content-versioned service worker and an explicit precache containing only the root document, manifest, icons, favicon and generated application assets. Requests outside that allowlist, including API and OAuth traffic and non-root navigations, pass directly to the network and are never stored by the worker. Cached shell responses are checked against the active build digest. Missing or corrupt entries are repaired only with matching bytes fetched from the canonical public URL without credentials or query parameters. If repair fails, asset requests fail closed and root navigations show a recovery page directing the user to reconnect or close wallet tabs and reopen online; inventory is untouched. Root navigation queries remain in the browser URL while the matching shell is served. Successful installation requires the entire shell to be cached and each file to match its build digest, preventing a mixed deployment from activating.

The root cache entry is a verified copy of canonical `/index.html`; installation and root repair fetch that document rather than transformed CDN root HTML. Existing Cloudflare analytics/privacy configuration remains unchanged, and every cached response must still match the build digest.

A new worker waits until existing controlled tabs close before activation; it does not force a reload or interrupt in-flight work. On activation it removes obsolete shell caches. An open tab may therefore continue using the previous release until all tabs using it close. Inventory, pending operations and recovery remain in IndexedDB under the existing contracts; the shell cache is not an inventory authority. Offline launch requires a prior successful online shell installation.

Post-A3 architectural audits by Codex and GPT independently found no material architectural blocker. GPT confirmed main `0985eca`, A3 CI and deployment, and the source boundaries. Dedicated A4 is deferred indefinitely; refine the broad Balance Check session/command interface, App projections and CSV ownership alongside relevant functional work.
