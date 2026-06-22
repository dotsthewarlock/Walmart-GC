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
- Lane 2 - ChatGPT/GitHub connector: one-file or very small bounded docs/config edits where connector writes are safe and repeated user approval prompts are acceptable. The connector uses one-file contents API updates; do not treat it as an atomic multi-file commit/PR authoring lane.
- Lane 3 - Codex implementation: default lane for multi-file docs/config/workflow edits, coordinated implementation, validation-heavy changes, approval-friction-sensitive work, and workspace commits. Codex Cloud prepares work; platform/manual `Create PR` is the default PR path.
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

- Strict Lane 0 should not create a PR because it has no edits or commits.
- Lane 0 plus handoff update may create a docs-only workspace commit, normally touching only `docs/AI_HANDOFF.md`; Codex Cloud platform/manual `Create PR` is the default way to turn that prepared work into a `codex/*` -> `phase-13` GitHub PR. A confirmed GitHub PR URL/number is required before reporting that a PR exists.
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
- Current operating model: Codex Cloud prepares work; platform/manual `Create PR` is the default PR path for `codex/*` -> `phase-13`; a confirmed GitHub PR URL/number is required before claiming a PR exists; after a confirmed PR exists, GitHub Actions auto-merge may handle eligible green PRs.
- Workflow posture: keep auto-create retired. Do not add token/PAT remote injection, pull-based Codex API sync, or replacement PR-creation automation; keep auto-merge guarded and available after a confirmed PR exists.
- Scope: docs-only blocker recording and Phase 13 handoff resume; no app runtime, Worker, schema, OAuth/session, sync/conflict, CSV recovery, hosting, deployment route, policy, workflow permissions, framework/build-step configuration, or app-shell fingerprint changes.
- Automation baseline: policy `active_base` is `phase-13`; auto-create policy/workflows are retired; auto-merge reads policy/classifier from resolved PR `BASE_BRANCH` and remains eligible only after a confirmed PR URL/number and green gates.

## Immediate Roadmap

1. Continue Phase 13 Option D with a docs-only Stage 1 architecture decision record based on `docs/phase-13-react-tailwind-m3-stage-0.md`: compare current-runtime-in-place improvements, static React, and React + Tailwind options; include parity and rollback criteria before any runtime or tooling implementation.
2. Keep runtime migration paused: no framework adoption, build tooling, hosting/deployment change, OAuth/session change, sync/conflict change, schema change, CSV recovery change, or active app replacement is approved.
3. For future `codex/*` -> `phase-13` work, use Codex Cloud platform/manual `Create PR` by default; once a confirmed GitHub PR URL/number exists and checks are green, GitHub Actions auto-merge may proceed if all safety gates pass.
4. Keep push-triggered auto-create retired; do not add token/PAT remote injection, pull-based Codex API sync, or replacement PR-creation automation.
5. Decide later whether to keep or remove `scripts/wg13-readonly-phase13.sh` as a low-priority tooling cleanup; it is not the default path.

## Open Risks

- Push-triggered AI PR auto-create is removed/retired; the current risk is stale references or attempts to reintroduce PR-creation automation despite Codex Cloud using platform/manual `Create PR` by default.
- Green docs-only auto-merge is proven for manually created `codex/*` -> `phase-13` PRs after PR #177, but auto-merge still requires a confirmed GitHub PR URL/number and all normal gates.
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

Only the exact next recommended user input should be formatted as Markdown/fenced text. Do not format explanatory user-input summaries as Markdown.

Use `next` for a very short checkpoint. Use `next actions` for action items plus the exact continuation prompt. For both, first determine prior task status from `docs/CODEX_ACTIVE_CONTEXT.md` and `docs/AI_HANDOFF.md`; ask the user for pasted completion output only when the repo docs are missing, stale, or contradictory.

Keep ChatGPT connector edits intentionally small: one-file or very small bounded docs/config updates only when repeated approval prompts are acceptable. Route multi-file, workflow, coordinated, validation-heavy, or approval-friction-sensitive edits to Codex instead; if one connector write blocks or fails, stop connector writes and hand the remaining work to Codex.
