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

Default command pattern:
- Load Node via nvm.
- Write prompt to /tmp/prompt.txt.
- Run agy in foreground print mode.
- Redirect output to ~/Project/<task>.log.

Required verification:
- npm run build
- git diff --check
- git status --short

Do not use:
- background or setsid agy runs
- unbounded rewrite prompts
- --dangerously-skip-permissions unless explicitly approved
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
