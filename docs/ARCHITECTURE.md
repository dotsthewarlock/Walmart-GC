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
invalid identities/metadata, bundled samples and damaged/interrupted ledgers are
quarantined, never guessed or uploaded. Later old-client writes/clears are
preserved as recovery evidence, never interpreted as deletion. Unreadable legacy
storage blocks initial migration; an existing migrated wallet remains usable.

Unbound, historical unverified Sheet and verified `account:principal:sheet:id`
compartments stay separate. A cached context never establishes authenticated
ownership. Verified binding does not merge old/unbound inventories. Explicit
unbound recovery preserves originals, blocks credential ambiguity and treats
conflicting recovered balances as uncertain. CSV backup is per selected
compartment; recovery JSON includes original/quarantined data and warns about
credentials. Persistent context generations fence async responses and editors,
including switching away and back. Tabs share atomic commands, not stale arrays.

Each verified profile holds its last acknowledged remote snapshot and exact
in-flight request. Acknowledgment requires the matching receipt/request hash and
verified snapshot fingerprint. Only submitted operation IDs are removed;
subsequent edits are reconciled and remain pending. Up to 128 operations are sent
per commit. Local operation receipts are bounded; Batch applied references and
unresolved recovery evidence remain preserved.

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

## Conservative three-way reconciliation

Independent additions and field edits combine. Pending field edits retain their
own original field baseline across acknowledgment of an earlier commit. The
confirmed remote baseline cannot make a competing later edit an unconditional
overwrite. Local acknowledgment reconciliation durably preserves alternatives;
the following protected commit writes targeted shared evidence. Unchanged local fields follow
remote changes; identical nonmonetary edits coalesce. Competing notes retain the
remote value provisionally plus targeted local/base alternatives. PIN, identity
and explicit-deletion conflicts require owner resolution. No deletion is inferred
from absence; missing remote rows preserve credentials, create durable recovery
operations and stay balance-uncertain until verified. Their targeted missing-row
evidence can be acknowledged after restoration; acknowledging it alone does not
verify the balance. Later acknowledgments cannot erase the recovered row.
Controlled explicit deletions create compact retained tombstones so
stale devices cannot resurrect them. Restore is explicit and balance-uncertain.
Date-only pending operations and historical CSV recovery cannot silently erase a
precise verification timestamp. Conflicting date-only proposals remain recoverable.

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
Resolved alternatives are retained for private recovery until controlled cleanup;
tombstones do not expire automatically. Evidence exceeding 38 KB blocks new
writes rather than dropping records. Controlled operator recovery is then required; automatic evidence compaction is intentionally not provided in this release candidate.

## Maintenance and direct edits

Cards and `_META` are app-managed during automatic sync. Pause shared maintenance
through the coordinator before direct editing; app writes then suspend across
sessions. Export a private backup. Resume explicitly accepts the observed contents
and optionally confirms exact deleted identities already absent from Cards. A
maintenance timestamp fences older monetary observations. Managed recovery
evidence/tombstones must stay intact even during maintenance; the coordinator
retains their hash and rejects external erasure.
The coordinator also retains bounded hashes of precise verification metadata at
pause; resume rejects changes or removal unless the card is explicitly deleted.
Absence alone never creates tombstones. Fingerprinting detects direct edits even
without a changed sheetVersion. Undeclared edits stop normal writes; an owner must
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
for that card, including unchanged same-day verifications. Shared maintenance also
invalidates outstanding requests. Protected synchronization continues to reconcile
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
