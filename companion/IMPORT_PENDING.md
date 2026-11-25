# Companion distribution — development checkpoint, acceptance pending

The 68 V1.0.2 source files were imported at `47f0f07bf840210b6e865a95974034787fe9601c` and verified against the repository-import archive. No archive is needed. This branch also merges main at `3af66fdd5f28577484e68167d41470bf01168976`. Work only in `companion/`; PWA clipboard handling belongs to a parallel stream.

## Checkpoint contents

- The extension manual session has a Clear Results action that commits an empty history under the existing storage lock, retains pending queue entries and clears the displayed export. Its reusable native confirmation dialog is used for close, abort, clear queue and clear results, with basic Material 3 styling. The bookmarklet still uses its separate legacy UI and confirmation behavior. Browser accessibility and behavior remain unvalidated.
- The extension manual UI has an Off/10/25/50 selector and the batch policy tracks a target across explicitly started segments of at most ten submissions. The existing pacing and cooldown constants are unchanged. This is a partial implementation: validate the complete UI and merchant workflow, including interruptions, target changes and cooldowns, and implement the same behavior in the shared distribution.
- The version authority remains `1.0.2`. No V1.0.3 release candidate or synchronized Dev artifacts have been produced. `build.py` still builds the merchant bookmarklet from `BASELINE-bookmarklet.js`; shared merchant fields and timing do not constitute shared core/UI parity. Do not describe this checkpoint as release-ready.

## Validation performed

After these changes, `python3 build.py` succeeded and the six Node test files `tests/test.mjs`, `tests/session.mjs`, `tests/manual.mjs`, `tests/navigation.mjs`, `tests/clipboard.mjs` and `tests/batch-policy.mjs` passed under Node 24 using `node --test`. The policy test covers a 25-card target across 10/10/5 segments and cooldowns; the manual-session test covers clearing results and concurrent history changes. JavaScript syntax and `git diff --check` passed during the checkpoint work.

The Python browser harness did not run: the configured `/usr/bin/python3` lacks Playwright and `/usr/bin/chromium` is absent. The modified browser tests have not been executed. Integrated synthetic tests, accessibility checks, extension and bookmarklet parity, and native hosted launcher loading are outstanding. The unpublished hosted Dev and Stable endpoints returned 404, which is expected before publication. Existing ignored build output is local and is not a verified release artifact.

## Remaining milestone

1. Consolidate bookmarklet and extension into one shared core and UI with only necessary platform adapters. Audit functionality and UX against `BASELINE-bookmarklet.js` (original V0.3.1), correcting material omissions and preserving its merchant-interaction safeguards, credential isolation and result integrity. Preserve legacy history and recovery evidence.
2. Finish and validate Clear Results, accessible reusable destructive confirmations, and Off/10/25/50 Auto proceed across both distributions. Preserve the established ten-card submission boundary, explicit restart and cooldown. Review the partial extension changes above as part of that work.
3. Add optional clipboard request detection on focus with strict Batch v1 validation, explicit import confirmation and duplicate suppression. Add optional automatic copying of verified WMGC-RESULT v1 packets after each batch, plus manual fallback and accurate copy success/failure feedback. Keep Batch v1 unchanged and do not write directly to the wallet.
4. Reconcile any newer main changes without disturbing the PWA stream. Set a single V1.0.3 version authority, test and build both distributions together, commit the checked-in source, and stage synchronized Dev artifacts with the exact source revision. Stable remains unchanged. Validate hosted launcher compatibility independently where possible; do not bypass merchant CSP.
5. Run relevant focused tests, integrated `npm test` and `npm run test:browser`, build, JavaScript syntax and `git diff --check`; document actual results and unexecuted prerequisites. Remove this marker only after successful integrated validation. Stop at integrated acceptance for independent review; no merge or deployment without separate authorization.
