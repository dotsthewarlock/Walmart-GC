# Phase 13 Material 3 Token/Design Audit

## Status

Stage 1A docs-only audit / proposal.

This audit does **not** approve a runtime migration, framework adoption, build tooling, package manager adoption, dependency changes, generated assets, app-shell fingerprint changes, schema changes, authentication/session changes, OAuth scope changes, sync/conflict changes, CSV backup/recovery changes, hosting changes, deployment changes, Worker routing changes, GitHub workflow changes, or replacement of the current plain HTML/CSS/JavaScript runtime. Material 3 is used here only as a consistency lens for future planning.

## Source files inspected

| File | Inspection status | Notes |
| --- | --- | --- |
| `docs/CODEX_ACTIVE_CONTEXT.md` | Read-only inspected | Confirmed Phase 13 branch context, no-build runtime, Worker/OAuth/sync guardrails, PR/validation expectations, and Material 3 planning posture. |
| `docs/AI_HANDOFF.md` | Read-only inspected, then edited | Confirmed current handoff direction and added a compact pointer to this Stage 1A audit. |
| `docs/MAINTENANCE_LOG.md` | Read-only inspected | Checked durable unresolved-work guidance; no new durable unresolved issue required a log entry. |
| `docs/phase-13-react-tailwind-m3-stage-0.md` | Read-only inspected | Confirmed Stage 0 frontend direction constraints and Material 3 token gate. |
| `docs/PHASE13_REACT_TAILWIND_M3_ADR.md` | Read-only inspected | Confirmed the ADR recommends this docs-only Stage 1A audit as the next planning step. |
| `index.html` | Read-only inspected | Identified current app shell surfaces, component hooks, dialogs, data/sync/recovery surfaces, and barcode/detail surfaces. |
| `styles.css` | Read-only inspected | Inventoried current CSS custom properties, component selectors, raw values, state treatments, media queries, and one-off values. |
| `app.js` | Read-only inspected | Confirmed current DOM hooks, runtime surfaces, app-shell debug constants, and relevant state/status components without modifying behavior. |

No Worker files, package/build/dependency files, deployment files, or workflow files were modified by this audit.

## Current design-token inventory

### Color

Current root-level color tokens include:

- Base surfaces and text: `--bg`, `--panel`, `--text`, `--muted`, `--border`.
- Brand/action roles: `--primary`, `--primary-dark`.
- Danger aliases: `--danger`, `--danger-bg`, plus the newer `--state-danger*` family.
- State roles: `--state-success`, `--state-success-border`, `--state-success-border-soft`, `--state-success-bg`, `--state-success-bg-strong`, `--state-warning`, `--state-warning-strong`, `--state-warning-border`, `--state-warning-border-strong`, `--state-warning-bg`, `--state-warning-bg-strong`, `--state-danger`, `--state-danger-border`, `--state-danger-border-soft`, `--state-danger-bg`.
- Gift-card status aliases: `--unused` maps to success and `--used` is a gray status color.

Observed raw or one-off color values that could later be mapped without changing behavior:

- Multiple white/surface literals such as `#ffffff`, `#fbfcfe`, `#f8fbff`, `#f8fafc`, `#f5f6f8`, `#f2f8ff`, `#eef4fb`, and `#e6f2ff`.
- Dark overlay/fullscreen literals such as `#07111f`, `rgba(8, 16, 30, 0.86)`, and `rgba(0, 0, 0, 0.88)`.
- Repeated primary-state rgba values such as `rgba(0, 113, 220, ...)` and `rgba(0, 79, 154, ...)`.
- Repeated neutral-shadow rgba values such as `rgba(15, 23, 42, ...)` and `rgba(23, 32, 51, ...)`.
- Status text literals such as `#155f39`, `#446152`, `#118c4f`, and `#d92d20` that overlap with success/danger concepts.

Material 3 planning note: current tokens already express several semantic roles, but they are not yet organized as Material 3-like roles such as `primary`, `on-primary`, `primary-container`, `on-primary-container`, `surface`, `surface-container`, `outline`, `outline-variant`, `error`, and state-layer opacity tokens.

### Typography

Current root-level typography tokens include:

- `--font-sans` for the system font stack.
- Body role: `--type-body-size`, `--type-body-line-height`, `--type-body-weight`.
- Label role: `--type-label-size`, `--type-label-line-height`, `--type-label-weight`.
- Title role: `--type-title-size`, `--type-title-line-height`, `--type-title-weight`.
- Headline role: `--type-headline-size`, `--type-headline-line-height`, `--type-headline-weight`.
- Button weight: `--type-button-weight`.

Observed raw or one-off typography values:

- Several component-level sizes such as `0.75rem`, `0.78rem`, `0.8rem`, `0.82rem`, `0.86rem`, `0.88rem`, `0.9rem`, `0.92rem`, `0.95rem`, `0.98rem`, `1rem`, `1.05rem`, `1.08rem`, `1.15rem`, and clamp-based barcode/headline values.
- Several component-level weights such as `500`, `600`, `650`, `700`, `800`.
- Letter-spacing values for headings, labels, card numbers, and PIN/card metadata.

Material 3 planning note: the current set resembles a small custom scale but does not yet map explicitly to Material 3 type roles such as display, headline, title, body, and label in small/medium/large sizes. A future docs mapping can name current roles before any CSS consolidation.

### Spacing/layout

Current layout uses direct values rather than root spacing tokens:

- Container width: `min(100% - 2rem, 68rem)`.
- App-shell and panel gaps around `0.5rem`, `0.55rem`, `0.62rem`, `0.65rem`, `0.7rem`, `0.75rem`, `0.8rem`, `0.85rem`, `0.9rem`, `1rem`, and `1.25rem`.
- Mobile-safe-area padding through `env(safe-area-inset-*)`.
- Responsive constraints through `min()`, `max()`, `clamp()`, and media queries at `22rem`, `24rem`, `34rem`, `36rem`, `42rem`, `48rem`, `420px`, and short landscape heights.
- Control sizing through `--control-height` and `--control-height-compact`.

Material 3 planning note: spacing is functional and mobile-focused but not tokenized into a consistent spacing scale. A future docs-only mapping could define candidate spacing steps such as compact, standard, relaxed, panel, and safe-area roles before any CSS-only consolidation.

### Radius/shape

Current root-level shape tokens include:

- `--shape-sm: 0.75rem`.
- `--shape-md: 0.9rem`.
- `--shape-pill: 999px`.

Observed raw or one-off radius values:

- `0.35rem`, `0.65rem`, `0.7rem`, `0.8rem`, `0.85rem`, `1rem`, `1.15rem`, and `1.25rem` are used across focusable text, barcode frames, controls, cards, settings groups, data sections, panels, and modals.

Material 3 planning note: current shape use is already rounded and touch-friendly, but future planning could name shape roles such as extra-small, small, medium, large, extra-large, and full/pill without changing visual output.

### Elevation/shadow

Current root-level elevation tokens include:

- `--elevation-panel`.
- `--elevation-subtle`.
- `--shadow` as an alias to `--elevation-panel`.

Observed raw or one-off shadows:

- Settings gear and barcode action use several custom shadows.
- Navigation uses top/bottom chrome shadows.
- Card toolbar select, global status banner, fullscreen done button, and focus states use one-off shadows or inset shadows.

Material 3 planning note: current elevation works visually but is not mapped to Material 3 elevation levels. Future docs can map existing shadows to level-like categories such as level 0, 1, 2, and overlay/backdrop before any CSS-only naming change.

### Motion/transition

Current root-level motion token:

- `--motion-interactive: 160ms ease`.

Observed raw or one-off motion values:

- Checkout feedback uses `opacity 220ms ease`.
- Active controls use `transform: scale(0.99)` or `scale(0.97)`.
- Many controls transition border, box-shadow, background, color, opacity, and transform through `--motion-interactive`.

Material 3 planning note: a future token map could distinguish state-layer transition, emphasized/standard duration, and reduced-motion expectations. This audit does not approve adding animation or ripple effects.

### State layers/interaction states

Current interaction-state treatment includes:

- Focus-visible rings through `--focus-ring`, `--focus-ring-strong`, `--focus-ring-success`, and `--focus-ring-danger`.
- Hover/focus/selected states for navigation buttons, card buttons, barcode action, settings compact rows, and settings gear.
- Pressed states through scale transforms.
- Disabled states through opacity and `cursor: not-allowed`.
- Status-state classes/attributes for sync status, connection status, global checkout feedback, recovery panels, used/unused cards, raw CSV lock state, and app-shell mismatch.

Observed gaps:

- State-layer opacity values are embedded as raw rgba values rather than named hover/focus/pressed/selected layer tokens.
- Disabled treatment is mostly opacity-based and may need later contrast/readability review before any visual change.
- Focus-visible treatment is generally explicit and should be preserved if future Material 3 state layers are added.

### Component-specific tokens or one-off values

Important component-specific values include:

- Barcode sizing through clamp-based dimensions, barcode frame paddings, and fullscreen barcode-specific dimensions.
- Toolbar columns and card-row widths such as `5.5rem`, `6.9rem`, `3.25rem`, and `34rem`/`54rem` constraints.
- Settings density and sync button sizes with compact control values.
- Modal widths such as `26rem` and raw data modal `42rem`.
- Backdrop z-index layers including `30`, `35`, `40`, `45`, and `70`.

These values are not defects by themselves. They document product-specific constraints for checkout speed, barcode readability, settings density, and modal/recovery workflows. Future token work should preserve these constraints unless a separate visual change is approved.

## Current UI surface/component inventory

Based on static inspection of the current app shell, the major surfaces are:

- **Persistent navigation/header chrome:** fixed bottom/top `top-nav` with Cards and Checkout buttons, gradient app header, fixed settings gear, debug fingerprint surface hidden in the header and compact setting diagnostic display.
- **Card list surface:** Cards panel, sort select, card count badge, total balance display, global checkout/sync status banner, dynamic card list buttons, balance/status/card-number/note/date rows, empty state support.
- **Checkout/card detail surface:** Checkout panel, previous/next controls, position indicator, barcode action surface, balance and PIN metadata, reveal-card-number button, update balance action, mark-used action, notes button.
- **Barcode/focused checkout surface:** Focused barcode dialog/backdrop, barcode frame, full-screen/current balance metadata, card number/PIN metadata, update/mark-used actions, focused notes, archived fullscreen template retained for possible future reversion.
- **Forms and inputs:** Sort select, checkboxes, number inputs in balance modal, notes textarea, raw CSV textarea, file input for CSV import, and Google sync/settings controls.
- **Buttons/actions:** Primary, secondary, danger, compact sync buttons, settings compact row action, app reload/debug action, raw data lock/update buttons, CSV import/export buttons, Google connect/disconnect/setup/import/export buttons.
- **Dialogs/modals/sheets:** Balance update modal, confirm bulk update modal, raw CSV editor modal, notes modal, focused checkout barcode dialog/backdrop.
- **Settings surfaces:** Settings panel, hide used, hide zero-balance, auto-advance, mark zero-balance cards used, refresh/debug action, backup and sync details group, Google sync details group, CSV backup details group, advanced diagnostics details group.
- **Diagnostics surfaces:** App shell fingerprint, raw CSV editor card, validation warnings, technical diagnostics, connection status cards, diagnostic groups/rows, sync badges/messages.
- **Import/export/recovery surfaces:** CSV backup import/export actions, Google Sheet setup/open/import/export actions, sync recovery action area, recovery panels for unsynced/conflict conditions.
- **Empty/error/status states:** `checkout-feedback`, `detail-status`, modal form errors, connection status variants, validation warnings, sync conflict/unsynced/unavailable states, recovery warning/status messaging, disabled controls, local-only/offline-use status.

## Material 3 gap analysis

### Color roles

The app already has semantic colors for primary, danger, success, warning, surfaces, text, muted text, and borders. The main gap is that these are custom project tokens rather than Material 3-like role names. Later docs could map current values to roles such as primary, on-primary, primary-container, on-primary-container, surface, surface-container, surface-container-high, on-surface, on-surface-variant, outline, outline-variant, error, error-container, success, warning, and disabled. This should be a mapping exercise first, not an immediate visual retheme.

### Type scale

The app uses a compact tokenized body/label/title/headline set plus many one-off component sizes. A future Material 3-aligned type map could identify which current sizes behave like label, body, title, and headline roles. The gap is naming/consistency rather than an obvious need for a new font or heavier type system.

### Shape scale

The app is broadly rounded and touch-friendly, with root tokens for small, medium, and pill shapes. Several raw radii appear to encode meaningful component roles. Future shape mapping could group these into Material 3-like shape roles while retaining current values.

### Elevation levels

Panel, subtle, navigation, gear, barcode, and modal shadows exist, but they are not mapped to an elevation scale. Future docs can classify current shadows by role before any CSS-only variable extraction. Avoid broad elevation changes around barcode and checkout surfaces unless explicitly approved because visual hierarchy affects in-store speed.

### State layers/focus/hover/pressed/disabled treatment

Focus-visible rings are explicit and should be preserved. Hover/focus/active states are mostly clear on interactive components. The main Material 3 gap is the absence of named state-layer opacity tokens and a formal disabled contrast/readability policy. Any future state-layer work should not replace visible focus outlines with subtle effects that are harder to see.

### Component roles and hierarchy

The app already has clear semantic component classes for panels, cards, buttons, status badges, data sections, modals, barcode frames, settings, diagnostics, and recovery. The gap is not lack of components; it is inconsistent token naming and repeated overrides from iterative compact UI polish. Future planning should identify stable component roles before consolidating CSS.

### Responsive layout/adaptive behavior

Current layout is mobile-first, with bottom navigation on small screens, top navigation on wider screens, safe-area handling, barcode-focused dialog sizing, and compact settings density. This aligns with Material 3 adaptive concerns. Future changes should preserve one-handed checkout access, barcode size/readability, and mobile touch target usability.

### Accessibility/readability/contrast concerns visible from static inspection

Static inspection suggests several positive patterns: focus-visible states, `aria-live` status regions, modal dialog roles, labels, hidden states, and explicit button labels/aria labels. Areas to review before visual implementation include:

- Disabled opacity-only treatment and whether disabled text remains readable.
- Status text colors on pale success/warning/danger backgrounds.
- Muted and small text at `0.8rem`-`0.9rem` sizes in diagnostics/settings/status contexts.
- Fullscreen barcode overlay contrast for secondary metadata.
- Reliance on color for sync/status meaning where text should remain explicit.

This audit does not claim contrast failures; it identifies static-inspection candidates for later manual/browser verification.

## Risk classification

### Safe docs/design-token planning

Green-risk work that can proceed later without runtime behavior change if scoped carefully:

- Create a docs-only token map from current project tokens to candidate Material 3-aligned categories.
- Document component-role names and current values before any CSS edit.
- Inventory raw values and duplicated declarations as potential consolidation candidates.
- Define visual-drift limits and accessibility checks for future CSS-only polish.
- Create a CSS-only refactor plan that extracts names while preserving computed values.

### Likely safe later CSS-only/token-only work, with normal review

These may be feasible as future small PRs if they preserve computed output and avoid runtime changes:

- Add alias custom properties for `on-primary`, `surface`, `surface-container`, `outline`, and state-layer opacities while keeping existing values.
- Replace repeated raw surface/status colors with aliases only where computed values remain identical.
- Normalize repeated radius/shadow/spacing values into aliases without changing rendered values.
- Add comments grouping tokens by role.
- Preserve current focus rings while optionally naming focus/state-layer tokens more clearly.

### Requires explicit approval before implementation

The following remain restricted-risk and are **not** approved by this audit:

- Runtime migration.
- React adoption.
- Tailwind adoption.
- Vite, PostCSS, package managers, build tooling, generated assets, or dependency installation.
- Broad UI redesign or component-library adoption.
- Client routing, hosting, deployment, Cloudflare route, GitHub Pages, workflow permission, or app-shell fingerprint changes.
- OAuth/session architecture changes, OAuth scope changes, browser token storage, direct browser Google API calls, or Worker API/auth/cookie changes.
- Google Sheet schema/header mapping changes, merchant model changes, barcode storage changes, sync timing changes, conflict model changes, CSV import/export/recovery changes, or offline/local usability changes.

## Recommended next steps

1. Treat this audit as the current Stage 1A planning artifact for Material 3 token/design work.
2. Create a follow-up docs-only token map that assigns candidate Material 3-like names to current values and identifies which aliases could be added with no computed visual change.
3. If desired after that mapping, prepare one small CSS-only token-consolidation PR that adds aliases or comments while preserving current computed values, app-shell fingerprints only if a runtime CSS change is explicitly approved, and all restricted guardrails.
4. Defer React/Tailwind/build-tool decisions to a separate future approval gate with parity, route, static-output, rollback, and performance criteria from the Phase 13 ADR.
5. Before any visual/runtime implementation, define validation for checkout speed, barcode readability, touch target behavior, focus visibility, contrast, status messaging, CSV recovery, offline/local use, and sync/conflict messaging.

### Not approved by this audit

- No runtime migration.
- No framework adoption.
- No Tailwind/build tooling/package/dependency adoption.
- No generated assets.
- No redesign mandate.
- No Worker, OAuth/session, schema, sync/conflict, CSV recovery, hosting/deployment, workflow, or app-shell fingerprint change.
- No token/PAT remote injection.
- No pull-based Codex API sync.

## Acceptance criteria for the audit

- A docs-only audit exists at `docs/PHASE13_MATERIAL3_TOKEN_AUDIT.md`.
- Runtime files remain unchanged: `app.js`, `index.html`, `styles.css`, and Worker files are not modified.
- Restricted guardrails are preserved: OAuth/session, Worker routing, `drive.file` scope, same-origin `/api/*` with `credentials: "include"`, schema/header mapping, sync/conflict model, CSV recovery, hosting/deployment, app-shell fingerprints, workflow permissions, packages, dependencies, and build tooling remain unchanged.
- Validation commands pass or any limitation is reported explicitly.
- Final report identifies the changed-file validation path used and confirms no restricted file changed.

## Appendix: current observations to possible future Material 3-aligned categories

| Current observation | Possible future Material 3-aligned category/name | Implementation-neutral note |
| --- | --- | --- |
| `--primary`, `--primary-dark` | `color.primary`, `color.on-primary`, `color.primary-container`, `color.on-primary-container` | Map values first; do not retheme immediately. |
| `--bg`, `--panel`, `#ffffff`, `#f8fbff`, `#fbfcfe`, `#f8fafc` | `color.background`, `color.surface`, `color.surface-container-low`, `color.surface-container`, `color.surface-container-high` | Preserve current contrast and density if aliases are added. |
| `--text`, `--muted`, `#344054`, overlay metadata colors | `color.on-surface`, `color.on-surface-variant`, `color.inverse-on-surface` | Needs readability review for small/muted text. |
| `--border`, rgba outline values | `color.outline`, `color.outline-variant` | Could reduce repeated border literals later. |
| `--state-danger*`, `--danger`, `--danger-bg` | `color.error`, `color.error-container`, `color.on-error-container` | Avoid semantic duplication in a future map. |
| `--state-success*`, `--unused` | `color.success`, `color.success-container`, `color.on-success-container` | Material 3 does not standardize success like error; keep project-specific role acceptable. |
| `--state-warning*` | `color.warning`, `color.warning-container`, `color.on-warning-container` | Project-specific status role; useful for sync/offline warnings. |
| `--focus-ring*` | `state.focus-indicator`, `state.focus-ring-primary/success/danger` | Preserve explicit focus visibility. |
| Repeated primary rgba hover/selected backgrounds | `state.hover-layer`, `state.focus-layer`, `state.selected-container` | Do not add ripple/motion by default. |
| `--type-body-*`, `--type-label-*`, `--type-title-*`, `--type-headline-*` | `type.body`, `type.label`, `type.title`, `type.headline` | Current token names can be mapped before CSS edits. |
| Many small component font sizes | `type.label-small`, `type.body-small`, `type.title-small` | Inventory first; avoid reducing readability. |
| `--control-height`, `--control-height-compact` | `size.touch-target`, `size.control`, `size.control-compact` | Maintain mobile usability and checkout speed. |
| Direct gap/padding values | `space.xs/sm/md/lg`, `space.panel`, `space.compact` | Only consolidate after proving no visual drift. |
| `--shape-sm`, `--shape-md`, `--shape-pill` plus raw radii | `shape.small`, `shape.medium`, `shape.large`, `shape.extra-large`, `shape.full` | Current rounded visual language aligns with Material-style shape. |
| `--elevation-panel`, `--elevation-subtle`, custom nav/gear/barcode shadows | `elevation.level0-level3`, `elevation.focused-checkout`, `elevation.chrome` | Keep barcode and checkout hierarchy stable. |
| `--motion-interactive`, raw `220ms ease`, active scale transforms | `motion.duration.short`, `motion.easing.standard`, `motion.pressed-scale` | Do not introduce extra motion without reduced-motion review. |
| Panels, data sections, settings list, modals | `component.surface.card`, `component.surface.dialog`, `component.surface.sheet/settings` | Component role naming can guide future CSS organization. |
| Barcode action/focused barcode frame | `component.checkout.barcode-surface`, `component.checkout.focused-barcode` | Product-critical; preserve scan readability. |
| Global sync/status banner and recovery panels | `component.status.banner`, `component.status.recovery-panel` | Preserve explicit status text and recovery choices. |
| Primary/secondary/danger buttons and compact sync buttons | `component.button.filled`, `component.button.outlined`, `component.button.tonal-danger`, `component.button.compact` | Current class names already express hierarchy. |
