# AGY bootloader

Status: canonical operational reference
Last reviewed: 2026-06-26
Scope: Walmart-GC local agy workflow

Source of truth:
- docs/AGY_CLI_INTEGRATION_DOSSIER.md

Role split:
- GPT/ChatGPT: planner, reviewer, QA interpreter, product decision framer, prompt writer
- agy CLI: local repo-aware implementer/verifier
- Terminal: cheap status/build/diff/grep checks
- Human reviewer: approves scope, risky actions, commits, and merges

Default local command shape:
- Load Node through nvm.
- Write the full prompt to /tmp/prompt.txt.
- Run agy in foreground print mode.
- Redirect output to ~/Project/<task>.log.
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

Handoff must include:
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
