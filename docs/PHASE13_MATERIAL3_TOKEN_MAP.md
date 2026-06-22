# Phase 13 Material 3 Token Map

## Status

Stage 1B docs-only planning artifact.

This document translates the Stage 1A Material 3 token/design audit into candidate future token names and safe alias recommendations. It does **not** approve runtime migration, framework adoption, build tooling, CSS edits, or visual changes. It also does **not** approve React adoption, Tailwind adoption, package/dependency changes, generated assets, deployment changes, Worker changes, OAuth/session changes, sync/conflict changes, schema changes, CSV recovery changes, hosting changes, app-shell fingerprint changes, or any active app replacement.

The current runtime remains the plain HTML/CSS/JavaScript app served by GitHub Pages with same-origin Cloudflare Worker `/auth/*` and `/api/*` routes.

## Inputs inspected

### Planning and architecture inputs

- `docs/CODEX_ACTIVE_CONTEXT.md`
- `docs/AI_HANDOFF.md`
- `docs/PHASE13_MATERIAL3_TOKEN_AUDIT.md`
- `docs/PHASE13_REACT_TAILWIND_M3_ADR.md`

### Runtime files inspected read-only

These runtime files were inspected only to identify existing tokens, recurring raw values, and UI surfaces. They are **read-only inputs** for this planning artifact and are not approved for modification by this document.

- `styles.css` — read-only inspected for existing CSS custom properties, raw colors, type values, shape, elevation, motion, spacing, focus rings, and component surfaces.
- `index.html` — read-only inspected for app-shell metadata and static UI structure context.
- `app.js` — read-only inspected only as runtime context for component/state surfaces; no behavior changes are proposed or approved here.

## Token map principles

- Candidate names are intentionally Material 3-aligned but implementation-neutral.
- Names should improve semantic clarity without requiring exact Material 3 palettes, Tailwind theme configuration, React components, or a Material component library.
- Safe aliases should preserve computed values if implemented later.
- Any CSS implementation remains a future explicit approval gate because this Stage 1B map is docs-only.
- Checkout speed, barcode readability, high-contrast status communication, focus visibility, CSV recovery, offline/local usability, and Worker-backed sync must remain protected in any future visual work.

## Current-token to proposed-token map

### Color roles

| Current token or recurring value | Current use pattern | Candidate future token name | Material 3 relationship | Alias safety |
| --- | --- | --- | --- | --- |
| `--primary: #0071dc` | Primary action color, selected states, brand accent | `--m3-sys-color-primary` | Primary color role | Safe alias candidate if it points to the current value exactly. |
| `--primary-dark: #004f9a` | Stronger primary hover/active or gradient stops | `--m3-sys-color-primary-strong` or `--app-color-primary-strong` | Tonal primary variant; not a standard M3 role name unless deliberately project-scoped | Safe alias candidate if treated as project-specific tonal support. |
| `#ffffff` / `--panel: #ffffff` | Panels, cards, controls, barcode surfaces, on-primary text | `--m3-sys-color-surface` and `--m3-sys-color-on-primary` where context differs | Surface and on-primary roles | Alias is safe only when context is separated; one raw value maps to multiple semantic roles. |
| `--bg: #f5f7fb` | App page background | `--m3-sys-color-background` or `--m3-sys-color-surface-container-lowest` | Background / low surface container | Safe alias candidate if exact value is preserved. |
| `#eef4fb`, `#f5f6f8`, `#e6f2ff`, `#f2f8ff` | Soft surfaces, selected nav/card treatments, neutral containers | `--m3-sys-color-surface-container-low`, `--m3-sys-color-primary-container` | Surface containers and primary container | Requires visual review before consolidation because similar values carry different emphasis. |
| `--text: #172033` | Main text | `--m3-sys-color-on-surface` | On-surface text role | Safe alias candidate if exact value is preserved. |
| `--muted: #637083` | Secondary text/helper text | `--m3-sys-color-on-surface-variant` | On-surface variant role | Safe alias candidate if contrast remains acceptable. |
| `--border: #d8e0ea` | Default outlines and dividers | `--m3-sys-color-outline-variant` | Outline variant role | Safe alias candidate if exact value is preserved. |
| `rgba(0, 113, 220, 0.28-0.44)` | Primary outlines and selected borders | `--m3-sys-color-primary-outline` or `--app-color-primary-border-*` | Primary state/outline treatment | Alias candidate, but alpha levels should remain distinct until component review. |
| `--danger`, `--state-danger`, `--state-danger-bg`, `--danger-bg` | Error/destructive status and backgrounds | `--m3-sys-color-error`, `--m3-sys-color-error-container` | Error and error-container roles | Safe alias candidate for exact duplicates; visual review for any status palette change. |
| `--state-success`, `--state-success-bg`, success borders | Connected/available/success state | `--app-color-success`, `--app-color-success-container`, `--app-color-success-outline` | App status role; M3 has no dedicated success role in the core system palette | Safe alias candidate as project-scoped status tokens. |
| `--state-warning`, `--state-warning-bg`, warning borders | Warning/recovery/conflict-adjacent messaging | `--app-color-warning`, `--app-color-warning-container`, `--app-color-warning-outline` | App status role; project-scoped extension | Safe alias candidate as project-scoped status tokens, with contrast review before visual changes. |
| `--used: #6d7480` and `rgba(109, 116, 128, 0.14)` | Used-card state | `--app-color-used`, `--app-color-used-container` | Domain-specific state role | Safe alias candidate if domain semantics remain unchanged. |
| `#07111f`, `rgba(8, 16, 30, 0.86)` | Dark checkout/detail surfaces and scrim | `--m3-sys-color-inverse-surface`, `--m3-sys-color-scrim` | Inverse surface / scrim | Requires visual review before changing because barcode/detail readability depends on contrast. |
| `rgba(255, 255, 255, 0.72-0.95)` | Translucent surfaces on light/dark contexts | `--app-color-surface-translucent-*` | Surface container overlays | Defer consolidation until component inventory confirms contexts. |

### Typography roles

| Current token or recurring value | Current use pattern | Candidate future token name | Material 3 relationship | Alias safety |
| --- | --- | --- | --- | --- |
| `--font-sans` | Global font stack | `--m3-sys-typescale-font-family-plain` | M3 type family role | Safe alias candidate if exact stack remains. |
| `--type-body-size`, `--type-body-line-height`, `--type-body-weight` | Body text | `--m3-sys-typescale-body-large-size`, `--m3-sys-typescale-body-large-line-height`, `--m3-sys-typescale-body-large-weight` | Body type scale | Safe alias candidate if computed values remain unchanged. |
| `--type-label-size`, `--type-label-line-height`, `--type-label-weight` | Labels, helper headings, metadata | `--m3-sys-typescale-label-medium-*` or `--m3-sys-typescale-label-large-*` | Label type scale | Safe alias candidate, but exact role choice should follow component inventory. |
| `--type-title-size`, `--type-title-line-height`, `--type-title-weight` | Card titles, section titles | `--m3-sys-typescale-title-medium-*` | Title type scale | Safe alias candidate. |
| `--type-headline-size`, `--type-headline-line-height`, `--type-headline-weight` | Large hero/balance display | `--m3-sys-typescale-display-small-*` or `--m3-sys-typescale-headline-large-*` | Display/headline type scale | Requires visual review before changing because current clamp values are product-specific. |
| `--type-button-weight: 600` | Button text | `--m3-sys-typescale-label-large-weight` | Label/button role | Safe alias candidate if value remains. |
| Raw `0.75rem`, `0.78rem`, `0.8rem`, `0.82rem`, `0.9rem`, `0.92rem` | Helper text, badges, metadata, status text | `--app-type-supporting-*` or mapped label/body small aliases | Label/body small roles | Requires inventory before consolidation to avoid reducing information hierarchy. |
| Raw `1.35rem`, `clamp(1rem, 4vw, 1.25rem)`, `clamp(1.35rem, 5vw, 1.85rem)`, larger clamps | Card identifiers, balance values, detail emphasis | `--app-type-card-number`, `--app-type-balance`, `--app-type-checkout-value` | Product-specific extensions aligned to M3 scale intent | Visual review required; barcode checkout and balance readability are critical. |

### Spacing and layout

| Current token or recurring value | Current use pattern | Candidate future token name | Material 3 relationship | Alias safety |
| --- | --- | --- | --- | --- |
| `--control-height: 3.25rem` | Primary control/touch target height | `--app-size-control-height` or `--m3-comp-button-container-height` | Component sizing / touch target | Safe alias candidate if exact value remains. |
| `--control-height-compact: 2.35rem` | Compact control height | `--app-size-control-height-compact` | Component sizing extension | Safe alias candidate; review touch target implications before wider use. |
| `gap: 1rem`, `padding: 1rem` | Common panel/card spacing | `--m3-sys-spacing-4` or `--app-space-md` | M3 does not mandate one spacing token scale; common design-system spacing role | Safe alias candidate if only aliases are added. |
| `0.35rem`, `0.45rem`, `0.5rem`, `0.55rem`, `0.62rem`, `0.65rem`, `0.75rem`, `0.8rem`, `0.85rem`, `0.9rem` | Dense control padding, badges, cards, helper surfaces | `--app-space-2xs` through `--app-space-sm` | Project spacing scale | Requires component inventory before consolidation because many values tune compact mobile layout. |
| `1.25rem`, `1.35rem`, `2rem`, `5rem` | Larger panel/header/page spacing | `--app-space-lg`, `--app-space-xl`, `--app-space-page-bottom` | Project spacing scale | Visual review before changing; aliases may be safe when exact. |
| `env(safe-area-inset-*)` combinations | Mobile safe-area navigation and overlays | `--app-space-safe-area-*` | Platform/layout safety extension | Defer to component-scoped aliases; do not abstract until nav/overlay inventory is complete. |
| `max-width` and responsive clamp patterns | Shell and content width constraints | `--app-layout-content-max`, `--app-layout-readable-max` | Layout tokens | Safe alias candidate only after exact values are inventoried by component. |

### Shape and radius

| Current token or recurring value | Current use pattern | Candidate future token name | Material 3 relationship | Alias safety |
| --- | --- | --- | --- | --- |
| `--shape-sm: 0.75rem` | Smaller controls/surfaces | `--m3-sys-shape-corner-small` | Shape corner scale | Safe alias candidate if exact value remains. |
| `--shape-md: 0.9rem` | Medium controls/surfaces | `--m3-sys-shape-corner-medium` | Shape corner scale | Safe alias candidate if exact value remains. |
| `--shape-pill: 999px` | Pills/chips/badges | `--m3-sys-shape-corner-full` | Full corner role | Safe alias candidate. |
| Raw `0.35rem`, `0.65rem`, `0.8rem`, `0.85rem`, `1rem`, `1.25rem` | Focusable inline elements, buttons, cards, dialogs, checkout surfaces | `--m3-sys-shape-corner-extra-small`, `--m3-sys-shape-corner-large`, `--m3-sys-shape-corner-extra-large` or project-scoped component tokens | M3 shape scale | Alias candidates only where exact component context is preserved; broad normalization requires visual review. |

### Elevation and shadow

| Current token or recurring value | Current use pattern | Candidate future token name | Material 3 relationship | Alias safety |
| --- | --- | --- | --- | --- |
| `--elevation-panel: 0 18px 45px rgba(23, 32, 51, 0.08)` | Main panels/dialog-like cards | `--m3-sys-elevation-level2` or `--app-elevation-panel` | Elevation role | Safe alias candidate if project-scoped; exact M3 elevation is not required. |
| `--elevation-subtle: 0 0.5rem 1.4rem rgba(23, 32, 51, 0.06)` | Low emphasis surfaces | `--m3-sys-elevation-level1` or `--app-elevation-subtle` | Elevation role | Safe alias candidate. |
| `--shadow: var(--elevation-panel)` | Legacy/general panel shadow alias | `--app-elevation-default` | Project default elevation | Could later remain as compatibility alias; no need to remove. |
| Raw primary shadows such as `rgba(0, 113, 220, 0.12-0.16)` | Selected/active card emphasis | `--app-elevation-primary-selected` | Component/state elevation extension | Requires visual review before any consolidation. |
| Bottom/top nav shadows with `rgba(15, 23, 42, 0.12)` | Fixed navigation separation | `--app-elevation-nav` | Component elevation | Safe alias candidate if exact. |
| Dark header/control shadows with `rgba(15, 23, 42, 0.22)` | Header icon/control prominence | `--app-elevation-on-image-or-dark` | Component elevation extension | Defer until component inventory; context-specific contrast matters. |

### Motion

| Current token or recurring value | Current use pattern | Candidate future token name | Material 3 relationship | Alias safety |
| --- | --- | --- | --- | --- |
| `--motion-interactive: 160ms ease` | Hover/focus/interactive transitions | `--m3-sys-motion-duration-short2` plus `--m3-sys-motion-easing-standard` or `--app-motion-interactive` | Duration/easing role | Safe alias candidate if exact shorthand remains through project token. |
| Raw `220ms ease` | Toast/status fade timing | `--app-motion-status-fade` | Component motion extension | Safe alias candidate if exact. |
| Transitions on `background`, `border-color`, `box-shadow`, `color`, `opacity`, `transform` | Interactive state changes | `--app-motion-property-interactive` | Component motion policy | Defer implementation until reduced-motion and component inventory are reviewed. |
| Any future ripple/state-layer animation | Not currently required | `--m3-sys-state-*` only if explicitly approved | M3 interaction pattern | Deferred; do not introduce motion/ripple behavior without visual and accessibility approval. |

### State layers and interactions

| Current token or recurring value | Current use pattern | Candidate future token name | Material 3 relationship | Alias safety |
| --- | --- | --- | --- | --- |
| `--focus-ring`, `--focus-ring-strong`, `--focus-ring-success`, `--focus-ring-danger` | Keyboard/focus indicators | `--app-state-focus-ring-primary`, `--app-state-focus-ring-strong`, `--app-state-focus-ring-success`, `--app-state-focus-ring-error` | M3 focus/state communication, project-specific visible ring | Safe alias candidate. Preserve visible outlines; do not replace with subtle state layers only. |
| Primary alpha backgrounds/borders | Hover/selected state layers | `--m3-sys-state-hover-state-layer-opacity`, `--m3-sys-state-focus-state-layer-opacity`, plus project color aliases | State layers | Requires visual review before changing alpha values. Exact aliases are safe. |
| Disabled/used muted values | Used/disabled/non-current card state | `--app-state-disabled-content`, `--app-state-used-content` | Disabled state plus domain-specific used state | Alias candidate if domain semantics stay clear. |
| Success/warning/danger status backgrounds | Sync/status/recovery feedback | `--app-state-success-container`, `--app-state-warning-container`, `--app-state-error-container` | Status state containers | Safe alias candidate if exact values remain; visual changes require contrast/status review. |
| Hover/transform effects | Card/control affordance | `--app-state-hover-transform`, `--app-state-pressed-transform` | Interaction state extension | Defer broad abstraction until inventory because motion can affect checkout speed. |

### Component-scoped tokens

Component-scoped tokens should be introduced only when a value is meaningfully tied to a product surface or flow. They can reference system tokens later while preserving visual output.

| Component/surface | Current value family | Candidate component tokens | Alias safety |
| --- | --- | --- | --- |
| App shell/page | `--bg`, page padding, content max widths | `--app-shell-background`, `--app-shell-content-max-width`, `--app-shell-page-padding-*` | Alias candidates after exact width/padding inventory. |
| Header/hero | Primary gradients, white text, icon-control surfaces | `--app-header-container`, `--app-header-on-container`, `--app-header-action-container` | Visual review before changes; exact aliases are possible. |
| Bottom navigation | Fixed safe-area padding, selected backgrounds, nav shadows | `--app-nav-container`, `--app-nav-selected-container`, `--app-nav-elevation`, `--app-nav-safe-padding` | Exact aliases safe; any sizing change needs mobile review. |
| Card rows/list items | Surface, outline, selected gradient/shadow, spacing | `--app-card-container`, `--app-card-outline`, `--app-card-selected-container`, `--app-card-selected-elevation` | Alias-only safe; selected styling changes require review. |
| Gift-card status chips | Used/unused/success/warning/danger palettes | `--app-chip-*` and `--app-status-*` | Exact aliases safe; palette changes require contrast review. |
| Barcode/detail panel | Dark inverse surface, barcode white surface, high-emphasis values | `--app-checkout-container`, `--app-checkout-on-container`, `--app-barcode-surface`, `--app-barcode-on-surface` | Defer visual changes; barcode readability is a hard gate. |
| Forms and controls | Control height, radius, border, focus rings | `--app-control-container`, `--app-control-outline`, `--app-control-height`, `--app-control-focus-ring` | Alias-only safe; density/touch target changes need review. |
| Dialogs/overlays | Scrim, panel surface, radius, elevation | `--app-dialog-scrim`, `--app-dialog-container`, `--app-dialog-elevation`, `--app-dialog-shape` | Exact aliases safe; visual changes require accessibility and focus review. |
| Sync/auth/status banners | Success/warning/error containers, text, borders | `--app-banner-*`, `--app-sync-status-*` | Exact aliases safe; message hierarchy and contrast require review before change. |
| CSV/recovery surfaces | Warning/error/success status families | `--app-recovery-*`, `--app-csv-*` | Defer visual changes unless separately approved because recovery is user-data safety critical. |

## Material 3 alignment notes

The candidate names use Material 3 concepts as a consistency vocabulary:

- **System color roles** such as primary, surface, background, on-surface, outline, error, inverse surface, and scrim describe why a color exists rather than where it happens to appear.
- **Container roles** such as primary container, error container, and surface container help distinguish filled surfaces from text/icon colors.
- **Type scale roles** such as body, label, title, headline, and display align existing text hierarchy with a reusable naming model without requiring exact Material 3 sizes.
- **Shape roles** such as small, medium, large, extra-large, and full describe corner-radius intent.
- **Elevation roles** name depth and separation consistently while allowing current shadow values to remain project-specific.
- **State roles** name focus, hover, selected, disabled, success, warning, error, and used states so the app can preserve explicit visible feedback.
- **Component tokens** are appropriate where product workflows need stable semantics beyond generic system roles, especially checkout, barcode, sync, CSV recovery, card status, and bottom navigation.

This map does not require exact Material 3 token values, Material Web components, Tailwind tokens, React components, CSS generation, or a component library. It preserves the current plain HTML/CSS/JavaScript runtime and treats Material 3 as a design-system lens.

## Alias strategy

### Safe future CSS aliases with no computed visual change

The following candidates could later be introduced as CSS aliases if they reference existing values exactly and no selectors or computed outputs change:

- Core color aliases for `--m3-sys-color-primary`, `--m3-sys-color-background`, `--m3-sys-color-surface`, `--m3-sys-color-on-surface`, `--m3-sys-color-on-surface-variant`, and `--m3-sys-color-outline-variant`.
- Project status aliases for success, warning, danger/error, and used-card state tokens.
- Typography aliases for the existing `--font-sans`, body, label, title, headline, and button-weight tokens.
- Shape aliases for existing `--shape-sm`, `--shape-md`, and `--shape-pill`.
- Elevation aliases for `--elevation-panel`, `--elevation-subtle`, and `--shadow` compatibility.
- Motion aliases for `--motion-interactive` and exact status fade timing.
- Focus-ring aliases that preserve the current visible focus shadows exactly.
- Component aliases that only point to current system/project tokens without replacing raw values yet.

A future alias PR should be CSS-only, preserve computed values, include before/after diff review, and avoid app-shell fingerprint changes unless explicitly approved for a runtime CSS edit under the project convention.

### Candidates requiring visual review before implementation

These candidates need component-level review before any CSS change, even if the change appears small:

- Consolidating similar surface colors such as `#eef4fb`, `#f5f6f8`, `#e6f2ff`, and `#f2f8ff`.
- Changing primary alpha borders, selected-state backgrounds, or selected-card shadows.
- Changing large type clamps for balances, card numbers, checkout values, or hero text.
- Normalizing dense spacing values that currently tune mobile layout.
- Changing bottom navigation height, safe-area padding, or touch density.
- Changing dark checkout/detail surfaces or barcode container contrast.
- Changing status banner colors, recovery/CSV warning colors, or error/success contrast.
- Replacing explicit focus rings with subtler state-layer-only treatment.
- Adding ripple, animated state-layer, or other motion behavior.

### Deferred until separately approved redesign or migration

These should remain deferred unless a later task explicitly approves a redesign or migration plan with parity, rollback, route, performance, and accessibility gates:

- Exact Material 3 palette generation or tonal palette replacement.
- Broad visual redesign to match Material components.
- React component migration.
- Tailwind theme/config adoption.
- Material component library adoption.
- Build tooling, package manager, dependency, generated CSS, or bundled asset adoption.
- Client routing changes or static output restructuring.
- Any redesign of auth/session, sync/conflict, CSV recovery, schema, Worker API, or deployment behavior.

## Risk gates

Docs-only planning is separate from implementation. This document is safe only because it adds planning guidance and does not change runtime files.

The following require explicit future approval before any implementation:

- CSS token implementation, including alias-only CSS changes.
- Broad UI redesign or Material component restyling.
- React adoption.
- Tailwind, Vite, PostCSS, package managers, build tooling, generated assets, or dependency changes.
- Deployment, hosting, Cloudflare route, GitHub Pages, workflow permission, app-shell fingerprint, or routing changes.
- Auth/session, OAuth scope, Worker route/API/cookie, browser token storage, or Google API access changes.
- Sync timing, conflict model, Google Sheet schema/header mapping, merchant model, barcode storage, CSV backup/import/export/recovery, or offline/local behavior changes.

## Recommended next steps

Smallest next safe action:

1. Keep this Stage 1B token map as the current Material 3 token planning artifact.
2. If more planning is desired, create a docs-only visual/component inventory refinement that maps each major UI surface to the component-scoped token candidates above.
3. If implementation is explicitly approved later, prepare a small CSS-only no-visual-change alias proposal that adds aliases for a narrow subset of existing tokens and proves computed values remain unchanged.
4. Do not recommend or start immediate runtime migration, React adoption, Tailwind adoption, package/build changes, deployment changes, or Worker/auth/sync/schema/CSV changes from this map.
