# GC Wallet agent operating rules

Read [Active Context](docs/ACTIVE_CONTEXT.md) first. The user's approved scope
supersedes historical requirements. Keep work focused, evolutionary and reviewable.

GitHub is the sole durable project authority. GPT retains architecture, roadmap
and independent assessment responsibilities; Codex implements and verifies the
authorized milestone. Consolidate unique decisions in the authorities below.
Project sources and chat are migration input, not parallel ongoing authorities.
The Master/subordinate architecture-stream handoff is defined in
[Architecture](docs/ARCHITECTURE.md#master-and-subordinate-architecture-streams).
Technical release closure and native user acceptance are separate dispositions.
ARCH frames scope and independently assesses; DEV implements and verifies only
that scope. Delegation requires an explicit assignment and may not expand scope.
One named DEV session owns writes; investigations/reviewers are read-only unless
writer authority is explicitly transferred. Keep the compact active assignment
register in Active Context, not a parallel registry. Route handoffs to the named
recipient with sender, action, baseline, scope, evidence and remaining disposition.
Intent shortcuts (resume, continue, review, release) inherit the current assignment
and its permissions; they never authorize the next milestone. Copying a handoff
is not dispatch, and dispatch is not receipt or acceptance. Record confirmed
receipt separately when available. Continuations reuse the existing checkpoint;
pause/stop instructions govern further action and resume restores only authorized
scope. State session/action/model/thinking/permissions/allowance configuration in
the assignment; mark unavailable settings unknown instead of inventing values.
Do not claim migration coverage for source documents that were not actually read.
Standalone disc/eval/stat is read-only; imp/go executes only authorized scope;
send prepares a routed handoff, not dispatch; hold retains the reservation; rule
consolidates governance; done verifies closure. Assignment states are AUTHORIZED,
PAUSED, RETURNED, CLOSED and DORMANT. Recipient gates confirm expected/actual HEAD,
clean or explicitly retained work and sole writer. Integration is expected-head,
non-force; closure includes explicit writer handback. Routed editable context may
be copied together, with optional copy confirmation and manual dispatch
confirmation; actual receipt remains separate. Payload edits reset local transfer
flags. State required/optional/deferred actions and existing/new session explicitly.
Verify essential external source access before expensive implementation; distinguish
sources actually read from another reviewer's reported ZIP or provenance checks.

## Authorities

- [Architecture](docs/ARCHITECTURE.md): data, persistence, API, account binding,
  synchronization, schema and recovery contracts.
- [M3 decisions](docs/M3_DESIGN_DECISIONS.md): navigation, privacy and visual intent.
- [Roadmap](docs/ROADMAP.md): approved work and explicitly deferred features.
- [QA](docs/QA_TEST_CHECKLIST.md): integrated acceptance and release prerequisites.

## Execution policy

Complete authorized milestones autonomously through implementation, self-check,
corrections, required independent review/CI, authorized merge, deployment
verification and cleanup. Deliver focused, reviewable vertical slices using
existing components; avoid speculative abstractions and wholesale rewrites.
One branch and PR per milestone is an efficiency preference, not a prohibition on
a necessary authorized corrective release. Reuse the existing session, branch,
review evidence and completed work; checkpoint interrupted work before continuing.

Prefer the least expensive sufficient approach. Before expensive or potentially
low-yield work, assess necessity, benefit, existing evidence and cheaper
alternatives; omit unnecessary work. Inspect affected code and contracts before
changes. Do not repeat completed audits or unaffected manual tests.
Use focused edits rather than brittle scripted replacements. Remember unavailable
tools and use the available alternative without retries or repeated discovery.
Read only relevant sections after initial source access; avoid full-document output
and redundant validation. Keep private backups and unrelated work intact.
Define lifecycle failure acceptance before implementation and reuse existing fixtures.
Confirm reviewer availability before waiting; use an authorized alternative when
unavailable. Bound asynchronous test and external-process waits. Prefer blocking CI watches;
avoid repeated unchanged status or log inspections. Finalize affected documentation
before submitting the release candidate; record subsequent release evidence in
the PR.

Seek authorization only for materially beneficial but costly discretionary work
or substantial scope expansion, briefly explaining cost, benefit and alternatives.
Reassess diminishing returns after failed attempts. Required safety checks,
mandated review, CI and routine corrections remain preauthorized within the task.
Flag material user-data, authentication, uncertain-write or migration risks.

## Safety and release boundaries

- Preserve card credentials, original migration bytes, pending work and conflict
  evidence. No absence-as-deletion, unsafe whole-array replacement, balance LWW,
  cross-account inheritance, KV locks or silent fallback around protocol fencing.
- IndexedDB is the sole writable local inventory authority. Success follows
  transaction completion. Legacy storage is migration/recovery input only.
- Worker-owned OAuth, drive.file only, same-origin requests, private owned Sheets.
  Never read/print secrets or introduce browser Google credentials.
- Use synthetic fixtures only. Do not put real card records, credentials or tokens
  into AI context, logs, tests, Git or developer-owned stores.
- Durable Object storage holds noncredential coordination metadata, not cards.
  An uncertain external write stays fenced until positive commit/content proof.
- No live OAuth/Sheet/merchant calls, provisioning, paid activation, deployment,
  protected-branch push or merge unless separately explicitly authorized.
- Feature commits, pushes, PR updates and release actions require task authorization.
  Obtain independent review before production release; a user's explicit release
  authorization governs merge and deployment without a repeated routine approval.

## Verification and communication

Run meaningful affected local tests, build, JavaScript syntax and `git diff --check`.
Reuse existing coverage, avoid concurrent timing-sensitive tests and redundant
validation, and leave unaffected suites to required CI. `npm test` and
`npm run test:browser` own the integrated synthetic cycle. Report actual results
separately from unexecuted prerequisites.
Development-only testing dependencies may be added when authorized and justified;
review lockfile impact. No new runtime dependencies without explicit approval.

Use compact progress/results and log verbose output locally. Prefer `rg`, or
`grep` if unavailable. Do not flood terminals with recursive diffs. No mandatory
Issue #200 updates or repetitive temporary handoffs. Durable decisions belong in
the appropriate authority above; historical rules are archived in
[pre-V0.3 governance](docs/archive/pre-v0.3-sync-governance.md).
