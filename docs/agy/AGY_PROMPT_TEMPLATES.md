# AGY prompt templates

Status: working reference
Last reviewed: 2026-06-26
Scope: Walmart-GC GPT to agy handoff prompts

Use these templates when GPT hands off bounded repo work to agy CLI. Agy does not have ChatGPT context, so each prompt must be self-contained.

## Milestone implementation batch

```text
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
Write a concise summary to ~/Project/AI_HANDOFF.md, then run ~/Project/bin/agy-handoff. State files changed, docs updated, build/diff/status results, grep results if relevant, screenshot QA notes if relevant, and unresolved risks.

Stop/reassess if:
- brittle offsets or viewport hacks are needed
- strict M3 worsens the real task flow
- privacy exposure increases
- out-of-scope logic/config would be touched
- phase scope is exceeded
```

## Docs-only update

```text
You are agy CLI working in ~/Walmart-GC.

Goal:
Update documentation only.

Read first:
- docs/ACTIVE_CONTEXT.md
- docs/agy/AGY_BOOTLOADER.md
- docs/agy/AGY_CLI_INTEGRATION_DOSSIER.md

Scope:
[Docs to add/update]

Do not change:
- src/
- package files
- worker files
- config files
- app logic

Verification:
- git diff --check
- git status --short

Handoff:
Write a concise summary to ~/Project/AI_HANDOFF.md, then run ~/Project/bin/agy-handoff. State docs changed, durable decisions captured, diff-check result, git status, and unresolved risks.
```

## Verification-only pass

```text
You are agy CLI working in ~/Walmart-GC.

Goal:
Verify the current worktree only. Do not modify files.

Read first:
- docs/ACTIVE_CONTEXT.md
- docs/agy/AGY_BOOTLOADER.md

Run:
- npm run build
- git diff --check
- git status --short

If Cards work is in scope, grep for:
- Visible Balance|Total Wallet Assets|Card Counts|displayed / registered|Vault Inventory|✓ Sync ready|Sync ready

If Checkout work is in scope, grep for:
- Back to Inventory|Reveal|Hide|Turn brightness|scanner has trouble|barcode modal|isFullscreenBarcode|handleBarcodeTouch

Handoff:
Report command results only. Do not edit files.
```

## Screenshot QA remediation

```text
You are agy CLI working in ~/Walmart-GC.

Goal:
Address the specific screenshot QA findings below without changing business logic.

Read first:
- docs/ACTIVE_CONTEXT.md
- docs/M3_DESIGN_DECISIONS.md
- docs/reference/M3_Core_Guidelines.md
- docs/agy/AGY_BOOTLOADER.md

Screenshot findings:
[Paste exact findings]

Scope:
[Specific UI files/components]

Do not change:
- sync/OAuth/data logic
- barcode generation data/format/library
- CSV/storage/worker/package/vite/Tailwind config
- locked UI copy unless explicitly listed

Verification:
- npm run build
- git diff --check
- git status --short

Handoff:
Write a concise summary to ~/Project/AI_HANDOFF.md, then run ~/Project/bin/agy-handoff. State files changed, visual changes made, build/diff/status results, remaining QA risks, and whether docs need updating.
```
