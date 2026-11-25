# GC Wallet Companion — Dev/Stable distribution candidate

Version is defined in `version.json`. See `DISTRIBUTION.md` for build and release policy. The underlying workflow is the V1.0.1 candidate; this revision adds synchronized versioning and staging.

This is an unpublished correction to 1.0.0, not a production release. Keep the original bookmarklet available.

## Install

Replace the contents of the existing unpacked `gc-wallet-companion` directory with the included directory. Keep its location and extension ID (`gmmgofgdleacbpalihfehpllgbbgjooo`). Reload the extension in chrome://extensions once, then refresh the Walmart checker. Confirm the overlay header reads GC Wallet 1.0.2. No new permissions. Refreshing discards the ephemeral queue; saved observations remain. Export any needed results before replacing the files.

## Review workflow

Check, Queue and Results use the compact bookmarklet layout. Queue and Results open a single adjacent scrollable panel on wide screens and a stacked panel on narrow screens. The control area stays stable on wide screens. Use Queue or Add cards to import. Import never submits a check. In individual mode select/fill, then explicitly check. Recovery controls and credential copying are in Queue. Auto proceed defaults off; an explicit Start batch initiates the existing bounded foreground workflow. After ten checks the ten-second rest is visible and another explicit Start next batch is required. Pending cards and results remain; no automatic restart. Stop on challenge, unexpected dialog, mismatch, storage failure or timeout. No new merchant requests, automatic retries, background checking or challenge bypass. Use only authorized cards privately. Keep card numbers and PINs out of AI, logs and backups. Clear credential clipboard history after transfer.

The restart defect was caused by calling stop() during preparation of a new batch with the old count still at ten. Only a transition from running to stopped can initiate rest now. Repeated cleanup cannot extend it. Production timing is unchanged. The extension-origin frame and noncredential persistent result history are retained. Batch v1 unchanged. Clipboard writes still use the extension worker with a selected-text Ctrl+C fallback; native clipboard acceptance remains outstanding.

## Verification

62 Node tests; 15 offline merchant fixture checks; mock assisted UI and clipboard checks; mock overlay shell tests at three viewports; new 12-card offline UI regression crossing the ten-card limit, waiting through rest, explicitly starting the remaining two cards, and checking no duplicate submission and stable primary drawer geometry. The new UI test uses shortened synthetic-only intervals, with unchanged production timing checked by Node. No live merchant requests or inventory reads/writes. Native Chrome extension acceptance remains required. The staged hosted bookmarklet is unpublished; hosted loading and complete shared-engine parity remain unverified. No production changes.

Build: `python3 build.py`. Regressions: `node --experimental-default-type=module --test tests/test.mjs tests/session.mjs tests/manual.mjs tests/navigation.mjs tests/clipboard.mjs tests/batch-policy.mjs`; `python tests/assisted-fixture.py`; `python tests/assisted-ui.py`; `python tests/overlay-browser.py`; `python tests/restart-ui.py`; `python tests/release-package.py`.
