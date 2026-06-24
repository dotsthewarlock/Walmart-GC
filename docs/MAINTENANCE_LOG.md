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

### P3 / Low / Validation: conflict-marker scan false positive in workflow file

- Source: PR #153, merged to `phase-12` on 2026-06-20.
- Status: Open.
- Context: `grep -R "<<<<<<<\\|=======\\|>>>>>>>" .` reported a literal marker-like detector pattern inside `.github/workflows/validate.yml`, not an actual merge conflict marker.
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

### P2 / Low / Hygiene: Pre-merge repo hygiene cleanup on agy-v1

- Source: Pre-merge hygiene cleanup on branch agy-v1 before merging PR #198.
- Status: Resolved on 2026-06-24.
- Context: Performed pre-merge cleanup of stale Codex-era automation/policy files, archived deprecated documentation to `docs/archive/`, deleted empty/redundant context files, and removed `react-app/` orphaned scaffold.
- Guidance:
  - React 19 + Vite + Tailwind migration on `agy-v1` is current.
  - `phase-12` remains behavior source of truth and protected production baseline.
  - Agy-first guarded Terminal/Agy Low/Medium workflow replaces the retired Codex automation.

### P2 / Low / Workflow: retire legacy Codex workflows

- Source: Pre-merge safety cleanup on branch agy-v1.
- Status: Resolved on 2026-06-24.
- Context: Removed retired Codex-era workflows (`ai-cleanup-report.yml`, `ai-pr-create.yml`, `ai-pr-merge.yml`) to prevent add/add conflicts during merge to main.

### P3 / Low / Workflow validation: AI PR create and merge smoke test

- Source: Task `Create a tiny docs-only smoke test branch for AI workflow validation` and PR #160 on 2026-06-20.
- Status: Resolved.
- Context: Phase 12.1 AI workflow governance/progress: AI cleanup report workflow succeeds; AI PR create and squash merge workflows were smoke-tested successfully. PR #160 was created by the workflow and squash-merged into phase-12; merge correctly required the ai:auto-merge label.
