# GC Wallet agent operating rules

Read [Active Context](docs/ACTIVE_CONTEXT.md) first. The user's approved scope
supersedes historical requirements. Keep work focused, evolutionary and reviewable.

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

Prefer the least expensive sufficient approach. Before expensive or potentially
low-yield work, assess necessity, benefit, existing evidence and cheaper
alternatives; omit unnecessary work. Inspect affected code and contracts before
changes. Do not repeat completed audits or unaffected manual tests.
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
