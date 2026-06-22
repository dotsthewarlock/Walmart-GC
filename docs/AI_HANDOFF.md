# AI Handoff

Read `docs/CODEX_ACTIVE_CONTEXT.md` first, then this file, before any in-scope AI lane action. This file is the rolling cross-lane handoff ledger for Phase 13. It should stay compact, current, and pruned.

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

Codex, terminal, GitHub Actions, and connector tasks should write durable status into the repo when practical, preferably by updating `docs/AI_HANDOFF.md` and using `docs/MAINTENANCE_LOG.md` only for deferred or unresolved follow-up.

Users do not paste task completion output by default. When the user says `next` or `next actions`, ChatGPT must determine prior task status from `docs/CODEX_ACTIVE_CONTEXT.md` and `docs/AI_HANDOFF.md` first, then ask for pasted output only if the repo docs are insufficient or contradictory.

## Rolling Ledger Rules

This file is not an append-only transcript. Update it by replacing stale section content with current facts.

Keep:

- current phase, branch, architecture direction, and guardrails
- last 5-10 meaningful recent steps
- latest diagnostic and validation result
- next 3-5 immediate roadmap items
- live risks that still affect the next decision

Move to `docs/MAINTENANCE_LOG.md`:

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
- Lane 2 - ChatGPT/GitHub connector: small, bounded docs/config edits where connector writes are safe.
- Lane 3 - Codex implementation: broader implementation, coordinated multi-file migration work, validation-heavy changes, and workspace commits.
- Lane 4 - GitHub Actions lifecycle: PR creation, validation, merge, and cleanup automation when configured and eligible.

Lane 0 terminal convention:

```text
Codex terminal batch
```

Use compact terminal-command batches for repo inspection, validation evidence, dependency/build experiments, controlled migration spikes, and other cases where terminal evidence is needed. User-local terminal execution is not the default. Ask the user to run local terminal commands only when local-only state must be verified, such as uncommitted files, local branch state, local refs, private local environment, or machine-specific behavior.

Lane 0 mutation boundary:

- Strict Lane 0 means Codex terminal commands only, inspection/validation only, and no file edits, commits, dependency installs, branch resets, cleanup, or `docs/AI_HANDOFF.md` update.
- Lane 0 plus handoff update means Codex runs inspection-only terminal commands first, then may update only `docs/AI_HANDOFF.md` with result, validation, risks, and next action. This is not strictly read-only; call it “inspection plus docs-only handoff update.”
- Lane 0 must not modify runtime files, schema, OAuth/session, sync/conflict behavior, CSV recovery, Worker routes, deployment, hosting, workflow permissions, app-shell fingerprints, or framework/build-step configuration unless a separate task explicitly authorizes that scope.

## Recent Steps

- Created branch `phase-13` from `phase-12` for contained future-direction discussion.
- Discussed React + Tailwind + Material 3 migration as a Phase 13 architecture direction, not a Phase 12 change.
- Agreed terminal-first AI lane is preferred when compact and safe.
- Designed durable Lane 0 terminal batch pattern with stable `wg13` command and token discipline; later narrowed Phase 13 default to Codex Cloud terminal batches rather than user-local terminal execution.
- Agreed `next actions` behavior should provide concise action items, actor, and exact continuation prompt after in-scope project interactions unless explicitly suppressed.
- Updated and reviewed both `docs/AI_HANDOFF.md` and `docs/CODEX_ACTIVE_CONTEXT.md` for Phase 13 handoff-first workflow, hierarchy, Lane 0, and next-actions consistency.
- Clarified the result handoff workflow: task results should be durable in repo docs when practical, and users do not paste completion output by default.
- Added `scripts/wg13-readonly-phase13.sh` on `phase-13` as a connector-created helper, then superseded it as the default path by adopting direct Codex Cloud Lane 0 terminal batches.
- Updated active docs so Lane 0 now means Codex Cloud terminal-command batches by default, with user-local terminal only as an exception for local-only state.
- Retargeted AI PR lifecycle automation policy for Phase 13 and generalized workflow policy/classifier loading from the requested or resolved PR base branch instead of a stale hardcoded Phase 12 source.

## Current Diagnostic

- Actor: Codex implementation in Codex Cloud workspace.
- Latest result: Phase 13 AI PR lifecycle automation was retargeted and generalized on 2026-06-22.
- Scope: workflow/policy/docs update only; no app runtime, Worker, schema, OAuth/session, sync/conflict, CSV recovery, hosting, or deployment route changes.
- Workspace identity: repository root was `/workspace/Walmart-GC`; local working branch was `work`; intended active PR base is `phase-13` and eligible AI PR heads remain `codex/*`.
- Files touched: `.github/ai-automation-policy.yml`, `.github/workflows/ai-pr-auto-create.yml`, `.github/workflows/ai-pr-auto-merge.yml`, and `docs/AI_HANDOFF.md`.
- Policy result: `.github/ai-automation-policy.yml` now sets `active_base: phase-13` while keeping `auto_pr.enabled`, `auto_merge.enabled`, `auto_merge.green`, `codex/**` heads, blocked paths, blocked keywords, binary extensions, and restricted labels conservative.
- Workflow result: PR auto-create now reads policy from the requested `BASE_BRANCH`; PR auto-merge now reads policy and classifier from the resolved PR `BASE_BRANCH`; stale `POLICY_SOURCE_BRANCH: phase-12` constants were removed.
- Preserved guards: no automation into `main`, base must match policy `active_base`, create flow checks `docs/CODEX_ACTIVE_CONTEXT.md`, heads must be `codex/*`, duplicate open PRs are reported instead of recreated, draft/conflicted/restricted-label/non-green/pending-or-failed-check PRs do not auto-merge, and squash merge still uses `--match-head-commit`.
- Validation performed: exact-reference inspection, classifier smoke tests for Phase 13 green/red and wrong-base cases, `git diff --check`, and targeted diff review. No real auto-create or auto-merge was triggered.
- GitHub Actions UI note: `workflow_dispatch` entries may require the workflow files to exist on the default branch before appearing in the Actions UI; workflow source branch visibility and target branch runtime guards are separate concerns.
- Remaining risk: workflow changes are safety-sensitive and should be reviewed carefully before relying on unattended PR creation/merge; Actions UI availability may still depend on default-branch workflow registration.
- Next action: open/review a `codex/*` -> `phase-13` PR for this change; after merge, use only controlled dry-run or non-destructive inspection before any real lifecycle automation test.

## Immediate Roadmap

1. Review and merge the Phase 13 AI PR lifecycle automation update into `phase-13`.
2. If GitHub Actions UI entries are missing, confirm whether these workflow files also need to exist on the default branch for `workflow_dispatch` visibility while keeping runtime guards pointed at the active phase branch.
3. Continue with Phase 13 project-settings alignment or React/Tailwind/M3 exploration planning after automation policy is settled.
4. Decide later whether to keep or remove `scripts/wg13-readonly-phase13.sh` as a low-priority tooling cleanup; it is not the default path.

## Open Risks

- GitHub Actions UI registration may still depend on default-branch workflow presence even when Phase 13 runtime guards are correct.
- Project settings may still point to Phase 12 until updated after repo docs land.
- React/Tailwind/M3 migration may affect GitHub Pages deployment, offline/local state behavior, bundle size, and UI parity if not staged carefully.
- `scripts/wg13-readonly-phase13.sh` is now optional/stale relative to the direct Codex Lane 0 default and may be removed in a cleanup pass.

## Next Actions Behavior

For in-scope Walmart-GC project interactions, end with a concise next-actions block unless the user explicitly asks not to or the topic is outside project workflow:

```text
Next actions:
1. <immediate action>
2. <follow-up action>
Who acts: <ChatGPT | Codex Lane 0 terminal | Codex implementation | GitHub Actions | user>
Continue with: "<exact prompt or command>"
```

Use `next` for a very short checkpoint. Use `next actions` for action items plus the exact continuation prompt. For both, first determine prior task status from `docs/CODEX_ACTIVE_CONTEXT.md` and `docs/AI_HANDOFF.md`; ask the user for pasted completion output only when the repo docs are missing, stale, or contradictory.
