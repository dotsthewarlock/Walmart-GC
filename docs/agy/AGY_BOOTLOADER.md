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
- GPT reads GitHub Issue #200 first for the latest run state.
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
- At the end of each run, agy writes the final handoff to the local file: `~/Project/AI_HANDOFF.md`
- Once written, agy runs the update helper script: `~/Project/bin/agy-handoff` to update GitHub Issue #200 "AI Handoff".
- Raw logs stay local in `~/Project/*.log` and are only for backup/debug.
- Durable decisions must be committed to repo docs (e.g. `docs/ACTIVE_CONTEXT.md`), not only captured in Issue #200.

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
