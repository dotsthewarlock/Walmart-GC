# AI Handoff

Read `docs/CODEX_ACTIVE_CONTEXT.md` first, then this file, before any in-scope AI lane action. This file is the single active rolling cross-lane operational handoff and deferred-maintenance/backlog ledger for Phase 13. It should stay compact, current, and pruned.

## Current State

- Active branch: `phase-13`.
- Protected production branch: `main`.
- Phase direction: evaluate and stage a React + Tailwind + Material 3-aligned frontend migration while preserving the current Worker OAuth/session/sync architecture.
- Current app architecture remains GitHub Pages frontend plus Cloudflare Worker same-origin `/auth/*` and `/api/*` routes.
- Runtime guardrails remain unchanged: do not alter schema, OAuth scope, auth/session, sync/conflict behavior, CSV recovery, Worker routes, deployment, or hosting unless explicitly approved as a separate focused task.

## AI Handoff-First Rule

Before any in-scope action, all AI lanes must read:

1. `docs/CODEX_ACTIVE_CONTEXT.md`
2. `docs/AI_HANDOFF.md`

This applies to ChatGPT discussion/review, ChatGPT/GitHub connector edits, Codex prompts, Codex terminal batches, and GitHub Actions lifecycle work. If these docs disagree, treat `CODEX_ACTIVE_CONTEXT.md` as the compact rule source and this file as the current operational ledger.

## Result Handoff Rule

Codex, terminal, GitHub Actions, and connector tasks should write durable status into the repo when practical by updating `docs/AI_HANDOFF.md`. Use this file for current state, recent steps, current diagnostic, immediate roadmap, open risks, and deferred maintenance/backlog. Do not create or update a separate active maintenance log; the old maintenance log is archived at `docs/archive/maintenance/MAINTENANCE_LOG.md` for historical reference only.

Users do not paste task completion output by default. When the user says `next` or `next actions`, ChatGPT must determine prior task status from `docs/CODEX_ACTIVE_CONTEXT.md` and `docs/AI_HANDOFF.md` first, then ask for pasted output only if the repo docs are insufficient or contradictory.

## Rolling Ledger Rules

This file is not an append-only transcript. Update it by replacing stale section content with current facts.

Keep:

- current phase, branch, architecture direction, and guardrails
- last 5-10 meaningful recent steps
- latest diagnostic and validation result
- next 3-5 immediate roadmap items
- live risks that still affect the next decision

Keep in `## Deferred Maintenance / Backlog`:

- deferred cleanup
- non-immediate validation gaps
- stale branch/docs concerns
- unresolved risks that must not be forgotten but are not part of the next few steps

Prune from this file:

- old terminal tokens
- superseded prompts
- repeated status updates
- completed stale diagnostics
- duplicated architecture text already covered by `docs/ARCHITECTURE.md`
- historical phase details unless directly relevant to the current step

Target size: 100-180 lines. Recent steps max: 10. Immediate roadmap max: 5. Open risks max: 10.

## Phase 13 AI Lanes

- Lane 0 - Codex terminal batch: default terminal-command evidence lane. ChatGPT prepares compact command batches; Codex Cloud runs them in its workspace and reports results.
- Lane 1 - ChatGPT discussion/review/command drafting: architecture, risk, Material 3 guidance, Codex prompt design, and merge-safety review.
- Lane 2 - ChatGPT/GitHub connector: one-file or very small bounded docs/config edits where connector writes are safe and repeated user approval prompts are acceptable. The connector uses one-file contents API updates; do not treat it as an atomic multi-file commit/PR authoring lane.
- Lane 3 - Codex implementation: default lane for multi-file docs/config/workflow edits, coordinated implementation, validation-heavy changes, and approval-friction-sensitive work. Codex Cloud prepares file changes/diffs only; platform/manual `Create PR` is the default PR path.
- Lane 4 - GitHub Actions lifecycle: validation, eligible green auto-merge after a confirmed PR exists, and cleanup reporting. Push-triggered PR auto-create has been removed/retired; do not replace Codex edits with token/PAT remote injection, pull-based Codex API sync, or a broad workflow that writes arbitrary files.

Connector routing rules:

- Route multi-file docs, config, and workflow edits to Codex by default, even when the files are low-risk.
- Use Codex for coordinated edits, validation-heavy work, workflow edits, or any change where user approval friction matters.
- If a connector write blocks or fails, stop connector writes and route the remaining work to Codex instead of retrying repeatedly.

Lane 0 terminal convention:

```text
Codex terminal batch
```

Use compact terminal-command batches for repo inspection, validation evidence, dependency/build experiments, controlled migration spikes, and other cases where terminal evidence is needed. User-local terminal execution is not the default. Ask the user to run local terminal commands only when local-only state must be verified, such as uncommitted files, local branch state, local refs, private local environment, or machine-specific behavior.

Lane 0 mutation boundary:

- Strict Lane 0 means Codex terminal commands only, inspection/validation only, and no file edits, commits, dependency installs, branch resets, cleanup, or `docs/AI_HANDOFF.md` update.
- Lane 0 plus handoff update means Codex runs inspection-only terminal commands first, then may update only `docs/AI_HANDOFF.md` with result, validation, risks, and next action. This is not strictly read-only; call it “inspection plus docs-only handoff update.”
- Lane 0 must not modify runtime files, schema, OAuth/session, sync/conflict behavior, CSV recovery, Worker routes, deployment, hosting, workflow permissions, app-shell fingerprints, or framework/build-step configuration unless a separate task explicitly authorizes that scope.

Lane 0 PR lifecycle durability:

- Strict Lane 0 should not create a PR because it has no edits.
- Lane 0 plus handoff update may prepare a docs-only diff, normally touching only `docs/AI_HANDOFF.md`; Codex Cloud platform/manual `Create PR` is the default way to turn those prepared changes into a `codex/*` -> `phase-13` GitHub PR. A confirmed GitHub PR URL/number is required before reporting that a PR exists.
- Codex Cloud prompts must not include commit-creation instructions or commit-message guidance.
- Push-triggered auto-create has been removed/retired after PR #177 follow-up. Codex Cloud has no authenticated shell push path by default, so platform/manual `Create PR` is the operating model and a confirmed GitHub PR URL/number is required before reporting PR creation. Do not add token/PAT remote injection or pull-based Codex API sync to replace the retired path.
- Auto-merge may apply only to green-risk `codex/*` -> `phase-13` PRs that pass policy, classifier, branch/base, checks, conflict, label, changed-file, and `--match-head-commit` gates.
- AI PR auto-merge evaluates on pull request changes and also re-evaluates after completed validation signals: the existing `validate` `workflow_run` path and the less fragile `check_suite` completed path both resolve exactly one open PR by head branch and head SHA before reusing the same final gates.
- GitHub Actions UI `workflow_dispatch` registration may require workflow files on the default branch, but runtime policy/context reads and PR targets must remain active-branch scoped.

## Recent Steps

- Created branch `phase-13` from `phase-12` for contained future-direction discussion.
- Discussed React + Tailwind + Material 3 migration as a Phase 13 architecture direction, not a Phase 12 change.
- Updated active docs so Lane 0 now means Codex Cloud terminal-command batches by default, with user-local terminal only as an exception for local-only state.
- Retargeted AI PR lifecycle automation policy for Phase 13 and generalized workflow policy/classifier loading from the requested or resolved PR base branch instead of a stale hardcoded Phase 12 source.
- Reviewed PR #170 after merge and found no blocking issues in the active-phase automation retarget.
- Batched a docs-only durability update for Lane 0 PR lifecycle support, default-branch workflow-registration caveat, connector edit batching, and Markdown-only recommended-user-input formatting.
- Merged PR #172 to add pushed-`codex/**` auto-create support, but observed that the later Codex branch for PR #173 did not auto-create and required manual PR creation.
- Merged PR #173 to add a `check_suite` completed re-evaluation path for auto-merge after independent checks finish.
- PR #177 was manually created and then auto-merged successfully, proving green docs-only auto-merge after a confirmed `codex/*` -> `phase-13` PR exists; Codex Cloud platform/manual `Create PR` is now the default PR path, while pushed-branch auto-create has been removed/retired because the Codex Cloud workspace had no authenticated push path.

## Current Diagnostic

- Actor: Codex docs/audit update on `codex/document-codex-cloud-pr-path-and-audit-actions` after PR #177.
- Latest result: PR #177 was manually created and then auto-merged successfully, so green docs-only auto-merge is proven after a confirmed GitHub PR URL/number exists.
- Auto-create status: removed/retired. The prior controlled verification stopped before editing because the Codex Cloud workspace had no `origin` remote, no visible authenticated push path, no `gh`, and no push was attempted; therefore the repo now relies on platform/manual `Create PR` instead of push-triggered PR creation.
- Current operating model: Codex Cloud produces file changes/diffs only; commit creation is not part of the Codex Cloud workflow. Platform/manual `Create PR` is the default PR path for `codex/*` -> `phase-13`; a confirmed GitHub PR URL/number is required before claiming a PR exists; after a confirmed PR exists, GitHub Actions auto-merge may handle eligible green PRs.
- Workflow posture: keep auto-create retired. Do not add token/PAT remote injection, pull-based Codex API sync, or replacement PR-creation automation; keep auto-merge guarded and available after a confirmed PR exists.
- Scope: docs-only blocker recording and Phase 13 handoff resume; no app runtime, Worker, schema, OAuth/session, sync/conflict, CSV recovery, hosting, deployment route, policy, workflow permissions, framework/build-step configuration, or app-shell fingerprint changes.
- Automation baseline: policy `active_base` is `phase-13`; auto-create policy/workflows are retired; auto-merge reads policy/classifier from resolved PR `BASE_BRANCH` and remains eligible only after a confirmed PR URL/number and green gates.

## Immediate Roadmap

1. Use `docs/PHASE13_MATERIAL3_TOKEN_AUDIT.md` as the current Stage 1A Material 3 token/design planning artifact, with `docs/PHASE13_REACT_TAILWIND_M3_ADR.md` remaining the Phase 13 Stage 1 architecture decision record. Runtime migration, framework/build tooling adoption, and restricted architecture changes remain paused unless separately approved.
2. Keep runtime migration paused: no framework adoption, build tooling, hosting/deployment change, OAuth/session change, sync/conflict change, schema change, CSV recovery change, app-shell fingerprint change, or active app replacement is approved.
3. For future `codex/*` -> `phase-13` work, have Codex Cloud prepare changes/diffs only and use platform/manual `Create PR` by default; once a confirmed GitHub PR URL/number exists and checks are green, GitHub Actions auto-merge may proceed if all safety gates pass.
4. Finish cleaning stale commit-creation guidance from active prompts/docs as it is found; keep push-triggered auto-create retired and do not add token/PAT remote injection, pull-based Codex API sync, or replacement PR-creation automation.
5. Decide later whether to keep or remove `scripts/wg13-readonly-phase13.sh` as a low-priority tooling cleanup; it is not the default path.

## Open Risks

- Push-triggered AI PR auto-create is removed/retired; stale commit-creation guidance is being cleaned up so Codex Cloud prepares diffs only and uses platform/manual `Create PR` by default.
- Green docs-only auto-merge is proven for manually created `codex/*` -> `phase-13` PRs after PR #177, but auto-merge still requires a confirmed GitHub PR URL/number and all normal gates.
- Project settings may still point to Phase 12 until updated after repo docs land.
- React/Tailwind/M3 migration may affect GitHub Pages deployment, offline/local state behavior, bundle size, and UI parity if not staged carefully.
- `scripts/wg13-readonly-phase13.sh` is now optional/stale relative to the direct Codex Lane 0 default and may be removed in a cleanup pass.

## Deferred Maintenance / Backlog

Use this section as the single active deferred-maintenance ledger. Keep entries compact; preserve priority/risk/area labels when useful; remove resolved entries rather than duplicating completed PR summaries. Use GitHub Issues instead of this ledger for assigned, blocking, or soon-actionable work.

- P2 / Low / Workflow: audit legacy GitHub Actions and PR-lane artifacts. Current docs say Codex Cloud platform/manual `Create PR` is the default and push-triggered auto-create is retired. In a separately approved cleanup, consider removing or archiving `.github/workflows/ai-pr-merge.yml`, `.github/workflows/agent-low-risk-guard.yml`, `docs/agent-auto-pr-lane-handoff.md`, and `scripts/wg13-readonly-phase13.sh`; treat `.github/workflows/validate.yml` and `.github/workflows/ai-cleanup-report.yml` as riskier because branch-target or governance behavior changes need explicit approval. Do not change workflow permissions, runtime files, Worker, OAuth/session, sync/conflict, schema, CSV recovery, hosting/deployment, framework/build-step configuration, token/PAT handling, or app-shell fingerprints without separate approval.
- P3 / Low / Tooling: optional Lane 0 helper script `scripts/wg13-readonly-phase13.sh` is superseded by direct Codex Cloud terminal-command batches. During low-risk docs/tooling cleanup, remove it or mark it optional legacy/local helper tooling; preserve Lane 0 as Codex Cloud terminal batches by default.
- P3 / Low / Validation: future conflict-marker scans should use an anchored pattern such as `grep -R -n -E '^(<<<<<<<|=======|>>>>>>>)' . --exclude-dir=.git` or equivalent so detector commands do not match themselves.
- P2 / Low / UI-CSS: Settings gear active CSS has harmless duplicate/phase-layered selectors. Bundle consolidation with a UI-only CSS polish PR; preserve visible behavior and avoid Worker, OAuth/session, sync/conflict, schema, CSV, or deployment changes.
- P3 / Low / Validation: Diagnostics helper desktop/mobile browser visual check remains unperformed because no browser binary was available in the container. A quick manual browser check can confirm normal and shell-mismatch wrapping at desktop and narrow widths.

## Next Actions Behavior

For in-scope Walmart-GC project interactions, end with a concise next-actions block unless the user explicitly asks not to or the topic is outside project workflow:

```text
Next actions:
1. <immediate action>
2. <follow-up action>
Who acts: <ChatGPT | Codex Lane 0 terminal | Codex implementation | GitHub Actions | user>
Continue with: "<exact prompt or command>"
```

Exact user instruction prompts, including Codex-ready prompts and continuation prompts, should be provided as fenced Markdown code blocks.

Only the exact next recommended user input should be formatted as Markdown/fenced text. Do not format explanatory user-input summaries as Markdown.

Use `next` for a very short checkpoint. Use `next actions` for action items plus the exact continuation prompt. For both, first determine prior task status from `docs/CODEX_ACTIVE_CONTEXT.md` and `docs/AI_HANDOFF.md`; ask the user for pasted completion output only when the repo docs are missing, stale, or contradictory.

Keep ChatGPT connector edits intentionally small: one-file or very small bounded docs/config updates only when repeated approval prompts are acceptable. Route multi-file, workflow, coordinated, validation-heavy, or approval-friction-sensitive edits to Codex instead; if one connector write blocks or fails, stop connector writes and hand the remaining work to Codex.
