# GC Wallet agent operating rules

Read [Active Context](docs/ACTIVE_CONTEXT.md) first. The user's approved scope
supersedes historical requirements. Keep work focused, evolutionary and reviewable.

## Authorities

- [Architecture](docs/ARCHITECTURE.md): data, persistence, API, account binding,
  synchronization, schema and recovery contracts.
- [M3 decisions](docs/M3_DESIGN_DECISIONS.md): navigation, privacy and visual intent.
- [Roadmap](docs/ROADMAP.md): approved work and explicitly deferred features.
- [QA](docs/QA_TEST_CHECKLIST.md): integrated acceptance and release prerequisites.

Inspect actual code before changes. Do not repeat completed audits or unaffected
manual tests. Deliver complete vertical slices using existing components; avoid
speculative abstractions, wholesale rewrites and repeated approval/handoff gates.
Flag material user-data, authentication, uncertain-write or migration risks.
Resolve ordinary implementation failures within the authorized scope autonomously.

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

Run relevant regressions, meaningful focused tests, build, JavaScript syntax and
`git diff --check`. Use `npm test` and `npm run test:browser` for the integrated
synthetic cycle. Report actual results separately from unexecuted prerequisites.
Development-only testing dependencies may be added when authorized and justified;
review lockfile impact. No new runtime dependencies without explicit approval.

Use compact progress/results and log verbose output locally. Prefer `rg`, or
`grep` if unavailable. Do not flood terminals with recursive diffs. No mandatory
Issue #200 updates or repetitive temporary handoffs. Durable decisions belong in
the appropriate authority above; historical rules are archived in
[pre-V0.3 governance](docs/archive/pre-v0.3-sync-governance.md).
