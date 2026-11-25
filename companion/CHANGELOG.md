# 1.0.1 candidate

- Fix restart after ten-card rest: cleanup is idempotent.
- Restore compact Check/Queue/Results controls, count labels, fixed status, visible rest countdown, and exclusive adjacent drawers.
- Close icon only when minimized; recovery controls in Queue.
- Add 12-card synthetic restart and layout regression. No protocol, permissions or production changes.

# 0.12.0 assisted candidate

- Explicit per-card overlay Check balance action, one submission per action, no automatic retries or subsequent submission.
- 30-second response deadline; five-second dialog/readiness deadline with 1.2-second stable-form wait.
- Version shown in overlay; removed unnecessary iframe clipboard delegation, retained extension-worker clipboard and keyboard fallback.
- 58 Node and 15 offline fixture checks passed; native result application and clipboard unverified.

# 0.11.0 assisted candidate

- Explicit overlay clipboard writes routed to extension worker on Chrome 157+, no new permissions.
- Saved exact-match dialog dismissal and next-card preparation; user submits each card.
- Fail-closed transition on mismatch, challenge, cancellation or timeout.
- Native Chrome 157+ acceptance and wallet result application pending.

# 0.10.0 assisted candidate

- User-triggered exact form fill, capture after trusted merchant submit, matched autosave, next-card fill action.
- Scoped same-tab bridge, timeout and cancellation; no automatic submission.
- Clipboard write permission and iframe delegation, manual fallback.
- Staged hosted bookmarklet preserving baseline workflow, not published.
- Full batch parity and native integration still pending.

# 0.5.0
- Unified synthetic operational session: Batch v1 and legacy import, exact reference rules, explicit start, pause/resume/abort/skip, retained history, restored linked exports, fresh reference handling and failure fencing.
- Shared compact M3-style controls and exclusive queue/results panel; integrated synthetic acceptance using isolated storage.
- Stable ID and existing permissions. Production merchant code unchanged; no real credentials or live merchant workflow. Old diagnostics retained for regression.

# 0.4.0
- Shared wire parser, synthetic queue and UI, generated distributions and release metadata. No production parity or actual hosted compatibility established.

## 0.6.0
- Shared manual review engine and UI for extension and standalone web candidate; explicit user observation only.
- Compatible legacy history reader and empty-store-only local restore; no production migration.
- One isolated synthetic acceptance for new manual path; sanitized pass/fail report.
- Same extension key and permissions; generated extension-only ZIP; no publication.
- Complete merchant adapter and production bookmarklet parity remain outstanding.

## 0.7.0
- Compact context-aware action popup; persistent compact review window with reuse, direct ordinary site navigation and collapsed diagnostics.
- Exact-checker passive isolated launcher. New origin-wide host grants for the requested wallet and Walmart Canada origins; no checkout or wallet script injection. No PWA bridge changes, no form interaction.
- Shared manual engine unchanged. Updated acceptance version, 6 navigation/scope test groups, popup mock and manual browser regressions. Native UX acceptance outstanding.

## 0.7.1
- Exact-checker non-blocking dock, starts as a single 48px icon. Drag launcher or header, keyboard-accessible corner cycle and reset; normalized local position, viewport clamping.
- Minimize or hide without destroying the in-memory review frame; toolbar restores it. Refresh/navigate discards pending credentials as before. Abort explicitly discards the queue.
- Dedicated extension-origin review frame uses shared manual UI/engine; gate checks exact checker tab, extension sender and embedded context before showing it. No merchant DOM interaction; no credential messages to host. Fallback separate review remains in Diagnostics and on frame-load failure. Native frame rendering remains unverified.
- No new host or named permissions; narrowly scoped web-accessible overlay.html entry. 55 Node tests and mocked browser overlay, popup and manual layout tests pass.

## 0.8.0
- Accessible review progress bar with verified/skipped distinction; explicit per-field copy with selection fallback; import-first empty state; smaller overlay, reduced diagnostic prominence.
- Shared manual engine and UI, stable ID, no added permissions, no merchant DOM automation. 56 Node tests and current mocked manual and overlay browser checks pass. Native clipboard and layout acceptance pending.

## 0.9.0
- User-triggered direct clipboard copy for wallet results and legacy TSV, with selectable packet fallback on denial.
- Reproducible extension-only ZIP and staged release descriptor with SHA-256, size and explicit unpublished candidate state.
- V0.8 native checker overlay rendering and clipboard import user-confirmed. No live card observation acceptance inferred.
- No permission changes, merchant form access, automatic requests or PWA deployment.

## 1.0.0 candidate
- Optional, explicit foreground batch start; default individual mode. Preserve baseline batch cap, delay, cooldown, response timeout, and stop behavior.
- Share batch policy constants and delay function with staged baseline bookmarklet; no change to published script or protocol.
- Fixed-height status row; visible version; preserve existing clipboard fallback and private queue.
- Node and offline browser regression coverage for explicit start, automatic progression, pause cancellation and package integrity. Native merchant compatibility and result roundtrip not yet accepted.
