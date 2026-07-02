# AI Operating Rules & Workflow Guidelines (AGENTS.md)

This file contains the mandatory operating rules, workflow guidelines, and execution guardrails for AI agents working on the GC Wallet project.

For current system state, architecture, design authority, and data schemas, follow the links in the [Documentation Index](#documentation-index).

---

## AI Start Here / Fast Path

1. **First Read**: Always read [ACTIVE_CONTEXT.md](ACTIVE_CONTEXT.md) at the start of any conversation to understand the current work state.
2. **Design Authority**: Use [M3_DESIGN_DECISIONS.md](M3_DESIGN_DECISIONS.md) as the absolute source of truth for UI, navigation, typography, and visual compliance.
3. **Architecture Authority**: Use [ARCHITECTURE.md](ARCHITECTURE.md) as the sole source of truth for data flow, APIs, session cookies, synchronization, and schemas.
4. **Task Scope Rules**:
   - Keep changes small and PR-focused.
   - Inspect current repository files before proposing implementation.
   - Prefer the smallest safe change that achieves the goal.
   - Flag security, deployment, OAuth, session, schema, migration, sync, or user-data risks before implementation.
5. **Workflow Preference**: Prefer Codex CLI / Codex interactive for bounded repo implementation and verification. Use T1 for lightweight exact commands, quick checks, emergency recovery, or user-requested terminal truth. Use interactive Agy only when GPT strongly recommends it or the user explicitly asks.

---

## Chromebook / Agy Stability Rule (Phase A/B Split)

To ensure workspace integrity and prevent terminal crashes or git corruptions on Chromebook-based environments, all agent tasks must split work into two separate phases:

### Phase A: Edit & Verify (Codex / Model Execution)
- AI agents edit files and perform local verification inside the workspace.
- **Scope**: Codex CLI / interactive is the preferred implementer/verifier. It may perform scoped sync, branch creation, edits, checks, commits, feature-branch pushes, PR creation, and Issue #200 updates when explicitly prompted and when the branch scope is clear.
- **Hard Stop**: Agents must NOT merge PRs, push `main`, start/stop T2, or touch worker/sync/storage/package/config files unless the task explicitly scopes them.
- **Handoff**: Agents must terminate their turn by writing the final run status to [~/Project/AI_HANDOFF.md](file:///home/godfreymiu/Project/AI_HANDOFF.md) and running the update helper `~/Project/bin/agy-handoff` to sync with GitHub Issue #200.

### Phase B: Review & Merge (Human Execution)
- The human operator reviews the git diff, statuses, and build success locally.
- Humans remain the final gate for risky scope approval, merge approval, UI/runtime QA, and protected-branch changes.
- Codex may prepare feature branches and PRs, but humans handle final merge decisions.

---

## Command Execution & Terminal Best Practices

- **Single Executable Block**: Provide GPT terminal instructions for Agy tasks as a single copy/paste terminal block (that writes the prompt, runs Agy in the foreground, captures local logs, and prints compact verification) rather than split across separate run and check steps.
- **Chromebook-Safe Terminal Output**: Avoid flooding the console. Print changed-file lists, `git status --short`, `git diff --stat`, build tails, and `tail -n 80` of logs instead of full recursive diffs.
- **Background Processes**: Do not background Agy or use `setsid` runs.
- **Log Management**: Write raw, verbose logs locally to `~/Project/*.log` (e.g., `~/Project/durable-ai-handoff-docs.log`) for backup and debugging; keep stdout output clean and summarized.

---

## Roles and Responsibilities

- **Planner / Reviewer (GPT)**:
  - Owns product logic, architectural guidance, data model specifications, and dev AI briefs.
  - Reviews implementation plans, diffs, and provides acceptance reviews.
- **Developer / Executor (Codex CLI / interactive; Agy exception path)**:
  - Local repo-aware implementer and verifier.
  - Writes code, edits files, runs checks, reviews diffs, prepares local handoffs, and can publish scoped feature branches / PRs when explicitly prompted.
  - Agy is an exception path for cases where GPT explicitly recommends it or the user asks for it.

---

## Minor vs Major Change Framework

### Minor Changes (Safe to execute without upfront confirmation)
- Documentation updates, CSS/UI polish, layout improvements, small bug fixes, or refactoring with no behavior changes.

### Major Changes (Require discussion and explicit human authorization)
- Data model or Google Sheet schema changes, Worker API/status endpoint changes, sync/conflict logic edits, authentication/cookie security changes, major UI restructurings, framework/build tool updates, or anything affecting user-session state.
- **If uncertain, always treat as Major.**

---

## Out-of-Sync Recovery Policy

If external git operations or terminal commands change the workspace state after the latest handoff:
1. Re-run local verification commands to check stability.
2. Update the local handoff file [~/Project/AI_HANDOFF.md](file:///home/godfreymiu/Project/AI_HANDOFF.md).
3. Execute `~/Project/bin/agy-handoff` to sync the state to GitHub Issue #200 before recommending further steps.

---

## Verification & Validation Rules

- **Strict Prohibitions**: Do NOT install Playwright, browser screenshot tooling, new npm packages, alternative CSS frameworks, or external build dependencies unless explicitly approved.
- **Mandatory Verification Checks**:
  - `git diff --check` (Spacing, carriage-returns, and merge-conflict markers).
  - `npm run build` (Ensures 100% stable static React compilation).
  - `node --check <file>` (Syntax checks for javascript files).
  - Targeted `grep` to verify no out-of-scope files or legacy terms were touched.

---

## Documentation Index

Refer to these authoritative documents for all development cycles:

- [Active Context](ACTIVE_CONTEXT.md) — Compact current development focus and "Start Here" context.
- [Architecture](ARCHITECTURE.md) — Canonical system design, data flows, APIs, and spreadsheet schemas.
- [Material 3 Design Decisions](M3_DESIGN_DECISIONS.md) — Absolute UI/UX design authority, visual compliance tokens, and component layout guidelines.
- [Roadmap](ROADMAP.md) — Canonical 4-lane roadmap (approved, near-term, future, and unapproved strategic intent).
- [Decisions Log](DECISIONS_LOG.md) — Durable record of past architectural and design decisions.
- [QA Test Checklist](QA_TEST_CHECKLIST.md) — Verification checklists and troubleshooting guides.
- [Deployment Guide](DEPLOYMENT_GUIDE.md) — Detailed build and Cloudflare Worker deployment steps.
- [Google Sheet Setup](GOOGLE_SHEET_SETUP.md) — Google Sheet configuration and metadata setup.
- [Maintenance Log](MAINTENANCE_LOG.md) — Active tracking for non-blocking cleanup and hygiene items.
- [Documentation Archive](archive/README.md) — Archived legacy audits and historical reference documents.
