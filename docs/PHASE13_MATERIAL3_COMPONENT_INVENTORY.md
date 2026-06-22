# Phase 13 Material 3 Component Inventory

## Status

Stage 1C docs-only planning artifact.

This document maps current Walmart-GC UI surfaces to the Stage 1B component-scoped token candidates. It does **not** approve runtime migration, framework adoption, build tooling, CSS edits, visual changes, React adoption, Tailwind adoption, Material package adoption, dependency changes, generated assets, deployment changes, Worker changes, OAuth/session changes, sync/conflict changes, schema changes, CSV recovery changes, hosting changes, app-shell fingerprint changes, or active app replacement.

## Inputs inspected

Planning docs inspected:

- `docs/CODEX_ACTIVE_CONTEXT.md`
- `docs/AI_HANDOFF.md`
- `docs/PHASE13_MATERIAL3_TOKEN_AUDIT.md`
- `docs/PHASE13_MATERIAL3_TOKEN_MAP.md`
- `docs/PHASE13_REACT_TAILWIND_M3_ADR.md`

Runtime files inspected as read-only only:

- `index.html`
- `styles.css`
- `app.js`

No runtime file was modified for this inventory.

## Component-scoped token inventory principles

- Treat Material 3 as a consistency vocabulary, not as permission to add Material Web components, React components, Tailwind utilities, generated CSS, package files, or a build step.
- Prefer aliases that can point to current values exactly before considering any visual change.
- Preserve product-specific UI constraints: fast in-store checkout, barcode readability, large balance visibility, mobile-safe navigation, explicit sync/auth status, CSV backup/recovery clarity, and offline/local usability.
- Keep component-scoped tokens meaningful to current product surfaces. Generic system aliases are useful, but checkout, barcode, card state, sync status, CSV recovery, dialogs, and bottom navigation need product-specific names where semantics matter.

## Surface inventory

| Current UI surface | Current files/selectors/functions inspected | Current token/value families used | Relevant Stage 1B candidate component tokens | Material 3 concept alignment | Alias-only safety | Implementation risk notes |
| --- | --- | --- | --- | --- | --- | --- |
| App shell/page layout | `index.html` `.container`, `.app-shell`, `main.container.app-shell`; `styles.css` `body`, `.container`, `.app-shell`, `.panel`; `app.js` `appShell`, `panelSections`, panel navigation state | `--bg`, `--panel`, `--text`, `--border`, `--shadow`, `--elevation-panel`, content width `min(100% - 2rem, 68rem)`, page bottom safe-area padding, panel radius `1.25rem`, panel padding/gap | `--app-shell-background`, `--app-shell-content-max-width`, `--app-shell-page-padding-*`, `--app-card-container` where panels behave as cards | Background, surface, surface container, outline variant, elevation level, responsive layout container | Safe for exact aliases to current background, panel, text, outline, elevation, width, and padding values; needs visual review for spacing/radius normalization | Changing page width, panel spacing, or bottom padding can affect mobile density, safe-area behavior, and checkout reachability. No app-shell fingerprint change is approved by this docs artifact. |
| Header/hero | `index.html` `.app-header`, `.app-header-title-row`, `#open-settings`; `styles.css` `.app-header`, `.app-header h1`, `.settings-gear-button`; `app.js` `settingsOpenButton`, settings-panel toggle state | Primary gradient using `--primary` and `--primary-dark`, `#ffffff` text, headline type clamp, translucent gear background, primary/dark shadows, `--shape-md`, safe-area offsets | `--app-header-container`, `--app-header-on-container`, `--app-header-action-container`, `--app-header-action-outline`, `--app-header-action-elevation` | Primary container/on-primary, top app bar/hero treatment, high-emphasis action, shape/elevation | Exact aliases for primary gradient stops, on-primary text, gear radius, and current shadow are possible; needs visual review for translucent action colors and headline clamp | Header is brand/wayfinding. Gear placement uses fixed safe-area logic; any density/position change could reduce settings access or overlap content. |
| Bottom navigation | `index.html` `.top-nav`, `.nav-button`, `#nav-list`, `#nav-detail`; `styles.css` `.top-nav`, `.nav-button`, `.nav-button.is-active`, focus/hover states; `app.js` `navButtons`, panel selection routines | Fixed bottom nav, `env(safe-area-inset-*)`, translucent surface, nav shadow, `--primary`, `--primary-dark`, selected `#e6f2ff` / primary fill, `--shape-sm`, minimum height `3.2rem` | `--app-nav-container`, `--app-nav-on-container`, `--app-nav-selected-container`, `--app-nav-selected-on-container`, `--app-nav-elevation`, `--app-nav-safe-padding`, `--app-nav-item-height` | Navigation bar, selected destination, state layers, focus indicator, safe-area layout | Exact aliases for nav surface, selected fill, selected text, elevation, radius, min-height, and safe padding are safe candidates; sizing changes need visual review | Bottom nav is central to one-handed mobile use. Do not reduce touch targets, alter safe-area padding, or replace visible focus ring with subtle state layers without testing. |
| Card list/card rows | `index.html` `#card-list`, `.cards-toolbar`, `#sort-cards`, count/total badges; `styles.css` `.card-list`, `.card-button`, `.card-row-top`, `.card-row-bottom`, `.card-number`, `.card-balance`, `.card-note`, `.status-badge`; `app.js` `renderCards`, `getVisibleCards`, `sortCardsSelect`, `cardCount`, `cardTotalBalance`, card selection handlers | `--panel`, `--border`, `--primary`, `--primary-dark`, `--state-success*`, `--used`, selected gradients/shadows, `--shape-md`, `--shape-pill`, small label/body sizes, balance/card number clamps | `--app-card-container`, `--app-card-outline`, `--app-card-selected-container`, `--app-card-selected-outline`, `--app-card-selected-elevation`, `--app-card-used-content`, `--app-chip-*`, `--app-status-*` | Cards/lists, primary-container selected state, assist chips/status chips, on-surface/on-surface-variant, elevation/state layer | Alias-only safe for current surface, outline, status, used/unused, chip radius, and exact selected styles; needs visual review for selected gradients, shadows, compact type, and balance/card-number sizing | Card rows must support scanning through 30-100+ cards. Lower contrast, larger spacing, or weaker selected states could slow checkout. |
| Card detail / checkout / barcode surfaces | `index.html` `#detail-panel`, `#card-detail`, `.checkout-nav`, `#barcode-open`, `.barcode-placeholder`, `.barcode-render`, barcode metadata, `#fullscreen-barcode`; `styles.css` `.barcode-placeholder`, `.barcode-action`, `.barcode-render`, `.barcode-svg`, `.barcode-focus-backdrop`, `.barcode-focus-frame`, `.fullscreen-*`; `app.js` `getBarcodePayload`, `createCode128BarcodeSvg`, `renderBarcode`, `openFocusedBarcode`, checkout navigation/update handlers | Dark/inverse surfaces such as `#07111f`, scrim `rgba(8, 16, 30, 0.86)`, white barcode surface, black barcode SVG bars, `--primary`, `--danger`, `--focus-ring`, high-emphasis balance/PIN/card number type, action row spacing | `--app-checkout-container`, `--app-checkout-on-container`, `--app-barcode-surface`, `--app-barcode-on-surface`, `--app-barcode-bar-color`, `--app-checkout-value-type-*`, `--app-checkout-action-gap`, `--app-focused-barcode-scrim` | Inverse surface, surface/on-surface, modal/dialog overlay, high-emphasis display/type roles, primary/destructive actions | Defer most visual changes. Exact aliases for barcode white/black, scrim, dark container, and current type values could be no-visual-change candidates only after careful proof | Barcode readability is a hard gate. Any change to contrast, barcode dimensions, quiet zone, surface color, focus overlay, or action placement requires explicit visual/device review. |
| Forms and controls | `index.html` buttons, selects, checkboxes, numeric inputs, textareas, `.primary-button`, `.secondary-button`, `.danger-button`, compact sync buttons; `styles.css` control defaults, `.primary-button`, `.secondary-button`, `.danger-button`, `input/select/textarea`, focus-visible rules; `app.js` balance modal controls, notes controls, settings checkboxes, CSV buttons, sync buttons | `--control-height`, `--control-height-compact`, `--primary`, `--primary-dark`, `--danger`, `--border`, `--panel`, `--focus-ring*`, `--type-button-weight`, `--shape-sm`, compact padding | `--app-control-height`, `--app-control-height-compact`, `--app-control-container`, `--app-control-outline`, `--app-control-focus-ring`, `--app-button-filled-container`, `--app-button-outlined-container`, `--app-button-danger-container`, `--app-button-compact-height` | Filled button, outlined button, error/destructive button, text field/select outline, focus indicator, touch-target sizing | Safe for exact aliases to current control heights, focus rings, button colors, outline, radius, and typography weight; needs visual review for density/touch target changes | Controls drive checkout and data recovery. Compact controls are deliberate; do not reduce focus visibility or touch target reliability. |
| Dialogs/overlays | `index.html` `#balance-modal`, `#confirm-modal`, `#notes-modal`, `#raw-data-modal`, `#fullscreen-barcode`; `styles.css` `.modal-backdrop`, `.modal-card`, `.modal-actions`, `.form-error`, `.barcode-focus-backdrop`; `app.js` modal open/close/save functions and confirmation flow | Scrim/dim overlay, `--panel`, `--shadow`, `--elevation-panel`, `--shape-md`, `--border`, form spacing, status/error colors, modal max widths | `--app-dialog-scrim`, `--app-dialog-container`, `--app-dialog-on-container`, `--app-dialog-elevation`, `--app-dialog-shape`, `--app-dialog-action-gap`, `--app-form-error-color` | Dialog/scrim, surface/on-surface, elevation, shape, error text, action row | Exact aliases for scrim, dialog surface, radius, elevation, and error color are safe candidates; needs accessibility review for any visual/focus changes | Dialogs include destructive and data-edit actions. Any overlay/focus treatment change must preserve keyboard visibility, modal clarity, and error messaging. |
| Settings/diagnostics surfaces | `index.html` `#settings-panel`, `.settings-list`, `.setting-row`, `#backup-sync-section`, advanced diagnostics, raw CSV editor; `styles.css` `.settings-panel`, `.settings-list`, `.setting-row`, `.data-section`, `.data-card`, `.validation-card`, `.raw-data-input`, diagnostics styles; `app.js` settings persistence, diagnostics rendering, raw data lock/update functions | `--panel`, `--border`, `--muted`, `--state-warning*`, `--state-danger*`, `--state-success*`, compact rows, details/summary surfaces, raw text area monospace-ish browser default, compact action buttons | `--app-settings-container`, `--app-settings-row-container`, `--app-settings-row-outline`, `--app-diagnostics-container`, `--app-data-card-container`, `--app-validation-warning-container` | Lists, settings rows, expansion panels, cards, supporting text, warning/error containers | Safe for exact aliases to settings/data-section surfaces, row outlines, status colors, and compact row spacing; needs visual review for density and details/summary affordances | Settings holds backup/sync and diagnostics. Over-simplifying hierarchy can hide recovery tools or make debug/version state harder to find. |
| Sync/auth/status banners | `index.html` `#checkout-feedback`, `#google-oauth-status`, `#direct-sheet-status`, `#google-sync-helper`, `#google-sync-identity`, `#sync-recovery-actions`; `styles.css` `.checkout-feedback`, `.connection-status`, `.connection-status.is-*`, `.sync-badge`, `.sync-recovery-actions`, `.sync-overview`; `app.js` `refreshGoogleOAuthStatus`, `renderGoogleOAuthStatus`, `renderDirectSheetsStatus`, sync state transitions and recovery rendering | Success/warning/danger/status families, `--state-success*`, `--state-warning*`, `--state-danger*`, muted text, borders, compact badges, status fade `220ms ease` | `--app-banner-container`, `--app-banner-on-container`, `--app-banner-success-*`, `--app-banner-warning-*`, `--app-banner-error-*`, `--app-sync-status-*`, `--app-sync-recovery-action-gap` | Status banners, assist chips/badges, success/error/warning status containers, live region feedback | Exact aliases for status colors, borders, backgrounds, badges, and fade timing are safe; contrast/message hierarchy changes need review | Worker-backed sync visibility is product-critical. Status text must remain specific about connected, syncing, conflict, offline, reconnect, and recovery states. |
| CSV import/export/recovery surfaces | `index.html` CSV backup details, `#import-csv`, `#export-csv`, `#csv-file-input`, raw CSV modal, validation warnings, sync recovery actions; `styles.css` `.csv-backup-actions`, `.raw-data-modal-card`, `.raw-data-input`, `.validation-warnings`, `.sync-recovery-actions`; `app.js` CSV parsing/export/import, validation warnings, accepted import sync, recovery helpers | Warning/error/success families, `--border`, `--panel`, `--muted`, compact buttons, textarea surface, validation list spacing | `--app-csv-container`, `--app-csv-action-container`, `--app-recovery-container`, `--app-recovery-warning-container`, `--app-recovery-error-container`, `--app-recovery-outline`, `--app-validation-warning-*` | Data/recovery panels, warning/error containers, outlined controls, supporting text | Alias-only safe for exact status colors and surfaces; visual changes deferred unless separately approved because these surfaces protect user data | CSV backup/recovery is a data-safety gate. Do not obscure warnings, recovery choices, import/export affordances, or raw data lock state. |
| Empty states/error states | `index.html` `#card-list` container, `.empty-state` inserted by runtime, modal `.form-error`, validation/status containers; `styles.css` `.empty-state`, `.form-error`, `.validation-warnings`, `.connection-status.is-error`; `app.js` empty list rendering, form validation errors, fetch/status error paths | `--muted`, `--state-danger*`, `--state-warning*`, `--state-success*`, panel/surface backgrounds, small supporting text sizes | `--app-empty-state-on-container`, `--app-empty-state-container`, `--app-form-error-color`, `--app-status-error-*`, `--app-status-warning-*`, `--app-validation-warning-*` | Empty state/supporting text, error state, warning container, role/status feedback | Safe exact aliases for muted text, error text, and status containers; needs contrast review before any palette/type changes | Error and empty states must remain actionable. Avoid decorative-only state-layer treatment that weakens explicit problem/recovery messages. |

## More concrete Stage 1B per-surface token mapping

### No-visual-change alias candidates for later approval

These candidates could be proposed later in a narrow CSS-only alias pilot if they point to current values exactly and do not replace selectors or change computed output:

- App shell aliases: `--app-shell-background`, `--app-shell-content-max-width`, `--app-shell-page-padding-block-end`.
- Header aliases: `--app-header-container`, `--app-header-on-container`, `--app-header-action-shape`.
- Navigation aliases: `--app-nav-container`, `--app-nav-elevation`, `--app-nav-item-height`, `--app-nav-safe-padding`.
- Card/list aliases: `--app-card-container`, `--app-card-outline`, `--app-card-used-content`, `--app-chip-shape-full`.
- Control aliases: `--app-control-height`, `--app-control-height-compact`, `--app-control-focus-ring`, `--app-button-label-weight`.
- Dialog aliases: `--app-dialog-container`, `--app-dialog-elevation`, `--app-dialog-shape`, `--app-dialog-scrim`.
- Status aliases: `--app-status-success-*`, `--app-status-warning-*`, `--app-status-error-*`, `--app-status-used-*`.
- CSV/recovery aliases: `--app-recovery-warning-*`, `--app-recovery-error-*`, `--app-validation-warning-*`.
- Barcode aliases, if proven exactly unchanged: `--app-barcode-surface`, `--app-barcode-on-surface`, `--app-barcode-bar-color`, `--app-focused-barcode-scrim`.

### Values requiring visual review before implementation

These values should not be changed or consolidated without future visual/device review and explicit approval:

- Barcode dimensions, quiet zones, barcode foreground/background, checkout dark surfaces, and focused barcode overlay contrast.
- Header gradient and translucent settings gear treatment.
- Bottom navigation selected backgrounds, safe-area padding, item height, and fixed-position shadow.
- Card selected gradients, selected shadows, balance/card-number type clamps, and dense row spacing.
- Large type clamps for hero, checkout values, card numbers, balances, and PIN display.
- Compact spacing values used by settings, sync actions, CSV actions, and checkout actions.
- Status/error/warning/success palettes and alpha borders where contrast or severity hierarchy could shift.
- Focus rings, especially if a future Material 3 state-layer treatment is considered.
- Motion, hover transforms, active scale, fade timing, ripple, or any new state-layer animation.

### Deferred until separately approved redesign or migration

- Exact Material 3 tonal palette replacement.
- Material component library adoption.
- React component migration.
- Tailwind theme/config adoption.
- Vite, PostCSS, package managers, dependency graph, generated CSS, generated assets, or build pipeline adoption.
- Client routing, service worker, manifest, hosting, deployment, or Cloudflare route changes.
- Auth/session, Worker API, OAuth scope, sync/conflict model, schema/header mapping, merchant model, CSV recovery, or offline/local behavior changes.

## Accessibility and product-safety notes

- Barcode readability: barcode foreground/background contrast, dimensions, quiet zones, and focused barcode framing are checkout-critical. Treat barcode visual changes as deferred until explicit visual/device testing is approved.
- Checkout speed: preserve bottom navigation reachability, fast previous/next/update/mark-used controls, focused barcode access, and high-emphasis balance/PIN/card-number visibility.
- Focus visibility: current explicit focus rings are safety features. Future Material 3 state-layer naming must not replace visible keyboard focus with subtle-only effects.
- Touch target density: `--control-height`, `--control-height-compact`, bottom nav height, checkout action sizing, and compact sync/CSV buttons need mobile review before any density change.
- Status/error/warning contrast: success, warning, danger/error, used, disabled, and muted states must keep readable contrast and clear severity hierarchy.
- CSV recovery/data-safety surfaces: import/export, validation warnings, raw CSV lock state, recovery actions, and destructive recovery prompts must remain obvious and text-forward.
- Offline/local usability: local-only and disconnected states must remain understandable; visual simplification must not imply data is synced when it is only local.
- Worker-backed sync visibility: auth, connected identity, same-origin Worker status, syncing, conflict, reconnect, import/export, and recovery states must remain visible and specific.

## Risk gates requiring explicit future approval

The following are not approved by this inventory and require explicit future approval:

- CSS token implementation, including alias-only CSS changes.
- Visual redesign or Material component restyling.
- React adoption.
- Tailwind, Vite, PostCSS, package managers, build tooling, generated assets, package files, lockfiles, or dependency changes.
- Deployment, hosting, GitHub Pages, Cloudflare routes, service worker, client routing, manifest, workflow permission, or app-shell fingerprint changes.
- Worker, auth/session, OAuth scope, same-origin `/api/*` behavior with `credentials: "include"`, sync/conflict model, Google Sheet schema/header mapping, merchant model, barcode storage/derivation, CSV backup/import/export/recovery, or offline/local behavior changes.

## Recommended next steps

Smallest next safe action: prepare a docs-only **CSS alias pilot proposal** that chooses a very narrow alias set, defines exact computed-value preservation criteria, and lists validation commands before any CSS edit is approved.

If implementation is explicitly approved after that proposal, the narrowest possible runtime step would be a CSS-only no-visual-change alias PR for a small subset of safe aliases. That future PR should preserve computed values, avoid restricted architecture areas, and handle app-shell fingerprint rules only if the project explicitly approves a runtime CSS edit.
