# AGY prompt templates

Status: working reference
Last reviewed: 2026-06-26
Scope: Walmart-GC GPT to agy handoff prompts

Use these templates when GPT hands off bounded repo work to agy CLI. Agy does not have ChatGPT context, so each prompt must be self-contained.

## Milestone implementation batch

You are agy CLI working in ~/Walmart-GC.

Goal:
[Specific bounded goal]

Read first:
- docs/ACTIVE_CONTEXT.md
- docs/M3_DESIGN_DECISIONS.md
- docs/reference/M3_Core_Guidelines.md
- docs/agy/AGY_BOOTLOADER.md
- docs/agy/AGY_CLI_INTEGRATION_DOSSIER.md

Scope:
[Files/features in scope]

Do not change:
- sync/OAuth/data logic unless explicitly scoped
- CSV/storage/worker/package/vite/Tailwind config unless explicitly scoped
- barcode generation data/format/library unless explicitly scoped
- locked UI strings or removed legacy patterns

Verification:
- npm run build
- git diff --check
- git status --short

Handoff:
State files changed, docs updated, build/diff/status results, grep results if relevant, screenshot QA notes if relevant, and unresolved risks.

## Docs-only update

You are agy CLI working in ~/Walmart-GC.

Goal:
Update documentation only.

Read first:
- docs/ACTIVE_CONTEXT.md
- docs/agy/AGY_BOOTLOADER.md
- docs/agy/AGY_CLI_INTEGRATION_DOSSIER.md

Do not change:
- src/
- package files
- worker files
- config files
- app logic

Verification:
- git diff --check
- git status --short
