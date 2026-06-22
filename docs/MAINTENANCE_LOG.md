# Maintenance Log

Purpose: durable tracking for non-blocking cleanup, artifacts, validation gaps, and minor follow-ups that should not live only in chat memory.

This file is not the active architecture source of truth. Keep runtime architecture, OAuth/session rules, schema rules, and deployment constraints in `docs/CODEX_ACTIVE_CONTEXT.md`.

## How to use

When reviewing work, classify non-blocking concerns here if they should survive the current chat. Use GitHub Issues for assigned, blocking, or soon-actionable work. Use this log for low-friction tracking and garbage-collection planning.

Priority:

- P0: safety, data, auth, sync, schema, or deployment risk. Fix before continuing related work.
- P1: likely user-visible bug. Schedule soon.
- P2: maintainability or polish cleanup. Bundle with related PR.
- P3: harmless artifact or note. Revisit during garbage collection.

Risk:

- High: could affect user data, auth/session, sync/conflict, deployment, or recovery.
- Medium: could affect app behavior or accessibility.
- Low: CSS/docs/artifact cleanup with no expected runtime behavior change.

Garbage-collection triggers:

- Three to five P2/P3 items accumulate.
- Before major schema/auth/sync work.
- Before a release or stability checkpoint.
- After a feature batch with several small artifacts.
- When docs, branches, PRs, or implementation notes start drifting from repo reality.

## Outstanding items

### P2 / Medium / Workflow: resolve Phase 13 AI PR auto-create and dry-run lifecycle

- Source: PR #170 review, PR #172 auto-create update, PR #173 auto-merge re-evaluation update, PR #177 manual PR plus successful auto-merge, Codex no-origin verification on 2026-06-22, and the auto-create cleanup task.
- Status: Resolved for auto-create cleanup; green docs-only auto-merge remains proven for manually/platform-created `codex/*` -> `phase-13` PRs after PR #177.
- Context: Push-triggered AI PR auto-create was retired because Codex Cloud has no authenticated shell push path by default. The old auto-create workflows and unused `auto_pr` policy knob were removed; platform/manual `Create PR` is now the documented default PR path, and a confirmed GitHub PR URL/number is required before claiming that a PR exists. Auto-merge remains available only after a confirmed eligible `codex/*` -> `phase-13` PR exists and all gates pass.
- Follow-up: Watch only for stale references or accidental reintroduction of PR-creation automation. Do not add token/PAT remote injection, pull-based Codex API sync, or replacement auto-create workflows.
- Guardrails: do not change runtime files, Worker, OAuth/session, sync/conflict, schema/header mapping, CSV import/export, deployment routes, hosting, framework/build-step configuration, app-shell fingerprints, workflow permissions, or token/PAT handling in normal prompts.
- Acceptance: completed when active docs state that Codex Cloud platform/manual `Create PR` is the default, push-triggered auto-create is retired, and auto-merge remains guarded and available only after a confirmed PR URL/number exists.


### P2 / Low / Workflow: audit legacy GitHub Actions and PR-lane artifacts

- Source: Phase 13 Codex Cloud PR-path audit on 2026-06-22.
- Status: Open; audit only, no workflow deletions or permission changes in the audit PR.
- Context: Current Codex Cloud diagnostics show no normal authenticated push path (`git remote -v` empty, no `origin`, no remote Git config, no visible credential helper/askpass/insteadOf/authenticated GitHub push path, and no `gh`), so platform/manual `Create PR` is the default PR path. Workflow inspection found no `upload-artifact`, `download-artifact`, or `retention-days` usage in `.github/workflows/**`, so there are no workflow-generated artifact-retention settings to clean up. `.github/workflows/ai-pr-auto-create.yml` and `.github/workflows/ai-pr-create.yml` were removed in the auto-create cleanup. Remaining legacy or superseded candidates include `.github/workflows/ai-pr-merge.yml`, which overlaps with the newer guarded `.github/workflows/ai-pr-auto-merge.yml`; `.github/workflows/agent-low-risk-guard.yml` targets `main` and appears tied to an older low-risk lane; `.github/workflows/validate.yml` still targets `phase-11`, which is historical; `.github/workflows/ai-cleanup-report.yml` is report-only but still hardcodes `phase-12`; `docs/agent-auto-pr-lane-handoff.md` documents an old `agent-auto-pr-lane`/`main` workflow; `scripts/wg13-readonly-phase13.sh` is optional legacy local helper tooling.
- Suggested action: keep `.github/workflows/ai-pr-auto-merge.yml` because it remains the active eligible-green-PR auto-merge path after confirmed PR creation. Consider removing or archiving `.github/workflows/ai-pr-merge.yml`, `.github/workflows/agent-low-risk-guard.yml`, `docs/agent-auto-pr-lane-handoff.md`, and `scripts/wg13-readonly-phase13.sh` in a separate explicitly approved cleanup PR. Treat `.github/workflows/validate.yml` and `.github/workflows/ai-cleanup-report.yml` as risky cleanup candidates because changing branch targets or replacing validation/cleanup behavior affects workflow governance and should be explicitly approved.
- Guardrails: cleanup recommendations only until approved; do not change workflow permissions, create new workflows, add token/PAT remote injection, use undocumented Codex/ChatGPT backend APIs, alter runtime files, Worker, OAuth/session, sync/conflict, schema/header mapping, CSV recovery, hosting/deployment, framework/build-step configuration, or app-shell fingerprints.
- Acceptance: a follow-up cleanup PR either removes/archives the approved legacy docs/scripts/workflows or records why each item is intentionally retained; active docs continue to state that Codex Cloud platform/manual `Create PR` is the default PR path and that push-triggered auto-create is retired.

### P3 / Low / Tooling: optional Lane 0 helper script superseded

- Source: Phase 13 Lane 0 workflow clarification on 2026-06-21.
- Status: Open.
- Context: `scripts/wg13-readonly-phase13.sh` was added as a connector-created helper for a user-local terminal path, then Phase 13 workflow was clarified so Lane 0 defaults to direct Codex Cloud terminal-command batches. The script is harmless but no longer the default path.
- Suggested action: during a low-risk docs/tooling cleanup, either remove the script or clearly mark it as optional legacy/local helper tooling.
- Guardrails: cleanup only; do not touch runtime files, Worker, OAuth/session, sync/conflict, schema/header mapping, CSV import/export, deployment config, workflow permissions, or framework/build-step configuration.
- Acceptance: active docs continue to define Lane 0 as Codex Cloud terminal batches by default, and no user-facing roadmap asks the user to run terminal commands unless local-only state must be verified.

### P3 / Low / Validation: conflict-marker scan false positive in workflow file

- Source: PR #153, merged to `phase-12` on 2026-06-20.
- Status: Open.
- Context: `grep -R "<<<<<<<\|=======\|>>>>>>>" .` reported a literal marker-like detector pattern inside `.github/workflows/validate.yml`, not an actual merge conflict marker.
- Suggested action: during the next validation cleanup, standardize future conflict-marker scans to an anchored pattern such as `grep -R -n -E '^(<<<<<<<|=======|>>>>>>>)' . --exclude-dir=.git` or an equivalent command that does not match the detector command itself.
- Guardrails: validation/docs cleanup only; do not touch runtime files, Worker, OAuth/session, sync/conflict, schema/header mapping, CSV import/export, deployment config, or automation permissions.
- Acceptance: validation reports no longer flag the conflict-marker detector command itself, while real conflict markers are still detected.

### P2 / Low / UI-CSS: consolidate Settings gear active CSS

- Source: PR #148, merged to `main` on 2026-06-20.
- Context: Settings gear behavior is correct after PR #148. `styles.css` contains an older grouped `.settings-gear-button.is-active` selector near the base gear styles and a stronger later `.settings-gear-button.is-active` override. The later rule wins, so this is harmless.
- Suggested action: bundle with the next UI-only CSS polish PR. Avoid standalone PR unless doing a cleanup sweep.
- Guardrails: do not touch Worker, OAuth/session, sync/conflict, schema/header mapping, CSV import/export, or deployment config.
- Acceptance: one clear active-state style path remains for Settings gear; visible behavior remains unchanged; `git diff --check` and conflict-marker scan pass.

### P3 / Low / Validation: browser visual check unavailable for Diagnostics helper

- Source: Task `Compact Diagnostics deploy/app-shell helper text` on 2026-06-20.
- Status: Open.
- Context: The Diagnostics helper was validated with static review, `node --check app.js`, `git diff --check`, conflict-marker scan, and a local HTTP/curl smoke check. No Chromium, Google Chrome, or Firefox binary was available in the container, so the requested desktop/mobile browser visual check could not be completed here.
- Suggested action: perform a quick manual browser check at desktop width and narrow mobile width before or after PR review.
- Guardrails: visual verification only; do not touch Worker, OAuth/session, sync/conflict, schema/header mapping, CSV import/export, or deployment config.
- Acceptance: Diagnostics heading shows `phase-12 · 1.01.77` in the normal case, wraps cleanly on narrow screens, and shows `phase-12 · shell mismatch` plus split HTML/JS/CSS technical detail when a fingerprint is unavailable or mismatched.

## Resolved items

### P3 / Low / Workflow validation: AI PR create and merge smoke test

- Source: Task `Create a tiny docs-only smoke test branch for AI workflow validation` and PR #160 on 2026-06-20.
- Status: Resolved.
- Context: Phase 12.1 AI workflow governance/progress: AI cleanup report workflow succeeds; AI PR create and squash merge workflows were smoke-tested successfully. PR #160 was created by the workflow and squash-merged into phase-12; merge correctly required the ai:auto-merge label.
