# AGY bootloader

Status: canonical operational reference
Last reviewed: 2026-06-26
Scope: Walmart-GC local agy workflow

Source of truth:
- docs/agy/AGY_CLI_INTEGRATION_DOSSIER.md

Role split:
- GPT/ChatGPT: planner, reviewer, QA interpreter, product decision framer, prompt writer
- agy CLI: local repo-aware implementer/verifier
- Terminal: cheap status/build/diff/grep checks
- Human reviewer: approves scope, risky actions, commits, and merges

Default local command shape:
- Load Node through nvm.
- For Walmart-GC operational work, GPT must review GitHub Issue #200 "AI Handoff" (the live temporary run state) before responding.
- Write the full prompt to /tmp/prompt.txt.
- Run agy in foreground print mode.
- Redirect output to `~/Project/<task>.log` (raw logs stay local in `~/Project/*.log` for backup/debug/diagnostics).
- Do not background agy or use setsid.

Required verification:
- npm run build
- git diff --check
- git status --short

Cards grep when relevant:
- Visible Balance|Total Wallet Assets|Card Counts|displayed / registered|Vault Inventory|✓ Sync ready|Sync ready

Checkout grep when relevant:
- Back to Inventory|Reveal|Hide|Turn brightness|scanner has trouble|barcode modal|isFullscreenBarcode|handleBarcodeTouch

Do not use:
- background or setsid agy runs
- unbounded rewrite prompts
- broad permission bypass unless explicitly approved
- dependency/framework/config changes unless explicitly scoped

Durable AI Handoff Workflow:
- For Walmart-GC operational work, GPT must review GitHub Issue #200 "AI Handoff" (the live temporary handoff state between Agy/CLI, GPT, and GitHub) before responding with next-step advice, prompts, commit/merge guidance, audit conclusions, or workflow recommendations.
- Every Agy run/call must end by writing the final handoff to the local file `~/Project/AI_HANDOFF.md` and running the update helper script `~/Project/bin/agy-handoff` to sync to GitHub Issue #200.
- If non-Agy terminal or GitHub actions materially change state after the latest handoff, update `~/Project/AI_HANDOFF.md` and sync Issue #200 before asking GPT for more next-step guidance.
- Raw logs stay local in `~/Project/*.log` and are only for backup/debug/diagnostics.
- **Durability & Cleanup**:
  - After each task, reassess whether the run created a durable decision and advise the user when durable repo docs should be updated.
  - Issue #200 is live run-state only, not durable design authority. Durable decisions must be captured in repo docs (not Issue #200, AI_HANDOFF.md, chat, or local logs).
  - Recovered/stale docs must be removed, archived, or explicitly promoted to active docs.
  - Routine cleanup of recovered/stale docs/references should follow workflow changes, recovered files, phase closures, or repeated AI confusion (not for tiny code changes).
- **Minimal GPT Review Checklist**:
  1. Did verification pass?
  2. Were only scoped files touched?
  3. Did this create a durable decision?
  4. Should stale docs/references be removed?
  5. Is Issue #200 only run-state, not source of truth?

Handoff contents must include:
- files changed
- docs updated
- build result
- diff-check result
- grep results where relevant
- git status
- screenshots captured, if visual work
- reassessment notes and unresolved risks

Stop/reassess if:
- brittle offsets or viewport hacks are needed
- strict M3 worsens real Cards/Checkout task flow
- privacy exposure increases
- out-of-scope logic/config would be touched
- phase scope is exceeded
- screenshot QA is visibly off despite build passing
