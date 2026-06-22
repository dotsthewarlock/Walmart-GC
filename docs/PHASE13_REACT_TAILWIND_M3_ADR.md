# Phase 13 Stage 1 ADR: Frontend Direction for React, Tailwind, and Material 3

## Status

Proposed / planning-only.

This architecture decision record is a docs-only Phase 13 planning artifact. It does **not** approve implementation, runtime migration, build tooling, package manager adoption, framework adoption, dependency installation, generated assets, routing changes, hosting changes, deployment changes, Worker changes, OAuth/session changes, sync/conflict changes, schema changes, CSV backup/recovery changes, service worker changes, app-shell fingerprint changes, or active app replacement.

## Decision question

Which frontend direction should Phase 13 pursue next, if any, while preserving GitHub Pages static hosting and the existing Worker-managed OAuth/session/sync architecture?

## Current constraints

The current source of truth is the plain static frontend plus same-origin Worker architecture. Any Phase 13 frontend direction must preserve these constraints unless a later, explicit implementation decision approves a scoped change after risk review:

- The frontend remains a static GitHub Pages application served from the site root.
- Cloudflare Worker boundaries remain same-origin `/auth/*` and `/api/*`; static frontend assets remain outside those Worker routes.
- All frontend API calls to the Worker must remain same-origin `/api/*` requests with `credentials: "include"`.
- Authentication remains Worker-managed Google OAuth/session only.
- The browser must not store Google access tokens, refresh tokens, session IDs, OAuth secrets, or Google API credentials.
- OAuth scope remains exactly `https://www.googleapis.com/auth/drive.file`.
- The approved Google Sheet schema and header-name mapping remain unchanged: `cardNumber`, `pin`, `startingBalance`, `currentBalance`, `merchant`, `merchantInferred`, `dateAdded`, `dateUpdated`, `dateUsed`, `used`, `notes`.
- The merchant model remains unchanged: `merchant` is explicit user input, `merchantInferred` is system-derived, and `effectiveMerchant = merchant || merchantInferred` is runtime-only and not stored.
- The barcode payload remains derived only and is not stored.
- Sync remains completed-action only: balance save, used-state change, notes save, merchant change, new card save, and accepted CSV import.
- Conflict handling remains sheet-level optimistic concurrency through `_META.sheetVersion`, with no silent overwrite and no automatic merge.
- CSV backup/export/import/recovery behavior remains unchanged.
- Offline/local usability remains a required capability.
- App-shell fingerprints remain unchanged unless separately approved with a runtime change.
- No routing, hosting, Cloudflare route, GitHub Pages, deployment, Worker, or custom-domain change is approved by this ADR.

## Options compared

### Option A — Current-runtime-in-place improvements

Keep the existing plain HTML/CSS/JavaScript runtime. Use Phase 13 to audit and strengthen design-token discipline, Material 3-inspired UI consistency, and component boundaries inside the current no-build architecture.

Potential benefits:

- Lowest operational risk because it preserves the current runtime, hosting, cache/fingerprint model, Worker route boundaries, and deployment path.
- No package manager, dependency graph, generated assets, CI build output, or new static-build failure mode.
- Material 3 can be applied as a design-system lens through existing CSS custom properties, typography roles, shape/elevation decisions, focus states, contrast checks, and touch-target review.
- Incremental improvements can focus on high-value in-store workflows such as card list scanning, barcode readability, balance visibility, used-state changes, and sync status clarity.
- Current code organization can still gain clearer boundaries through documentation, naming, CSS token consolidation, and small refactors that do not change runtime behavior.

Risks and tradeoffs:

- Plain JavaScript has weaker component encapsulation than React, so large future UI changes may remain harder to reason about.
- Without Tailwind, styling velocity stays dependent on hand-maintained CSS and token discipline.
- Material 3 alignment must be manually governed; the repo will not get library-enforced component behavior.
- Continued growth of plain runtime files could eventually make state and UI coupling harder to maintain.

Fit with constraints:

- Best fit for the current constraints because it requires no build step and no runtime replacement.
- Compatible with GitHub Pages root hosting and existing Worker `/auth/*` and `/api/*` boundaries.
- Does not affect OAuth/session, sync/conflict, schema/header mapping, CSV recovery, offline behavior, or app-shell fingerprints unless a later implementation PR intentionally touches runtime files.

### Option B — Static React without Tailwind

Introduce React only as a future static frontend build if explicitly approved later. Styling would remain CSS/token-driven rather than Tailwind utility-driven.

Potential benefits:

- Better componentization for card list, checkout/detail, barcode panel, settings, diagnostics, sync status, conflict recovery, CSV recovery, and import/export surfaces.
- A clearer state model could make auth status, pending saves, local/offline state, sheet metadata, and conflict prompts easier to isolate if parity is carefully defined first.
- Avoids Tailwind-specific generated CSS and utility governance questions while still allowing a future framework spike.
- Existing CSS tokens could be reused or migrated gradually with less risk of utility-class sprawl.

Risks and tradeoffs:

- React normally implies package files, dependencies, build tooling, generated assets, local development commands, and static output decisions; none are approved by this ADR.
- Client routing could conflict with GitHub Pages root hosting or Worker-owned `/auth/*` and `/api/*` paths if not explicitly constrained to no-router, hash-router, or another Pages-safe strategy.
- Bundle size, first-load performance, cache busting, and app-shell fingerprint rules would need new budgets and procedures.
- Rewriting stateful flows could accidentally change completed-action sync, offline/local behavior, CSV recovery, conflict handling, barcode behavior, merchant display, or auth status handling.
- A React migration would be a restricted-risk implementation track because it introduces framework/build-step adoption and could affect user-data workflows if parity is incomplete.

Fit with constraints:

- Plausible only as a later static-build spike with strict route-boundary proof, no browser token storage, same-origin `/api/*` calls with `credentials: "include"`, and committed or CI-built static output that remains compatible with GitHub Pages.
- Not appropriate as the immediate next implementation step until parity criteria, rollback, performance budgets, and static output ownership are documented.

### Option C — React + Tailwind with Material 3 token discipline

Introduce React and Tailwind only as a future static frontend build if explicitly approved later. Tailwind would be governed by a Material 3 token mapping rather than unconstrained utility usage.

Potential benefits:

- Combines React component boundaries with Tailwind's utility workflow for faster component-level layout and state styling after a build pipeline exists.
- Tailwind theme configuration could map to Material 3-like roles for color, typography, shape, elevation, spacing, focus, and state-layer behavior.
- A strict token policy could reduce ad hoc CSS additions if arbitrary values and one-off utilities are controlled.
- Could make future UI iteration faster once parity, build, and deployment decisions are solved.

Risks and tradeoffs:

- Highest planning complexity because it adds framework adoption, Tailwind compilation, generated CSS, package/tooling decisions, token mapping, and utility governance.
- Generated CSS size and purge/content configuration would need explicit measurement and mobile performance budgets.
- Utility sprawl could weaken semantic component boundaries, obscure Material 3 intent, and make accessibility/status states harder to audit.
- Tailwind's defaults are not Material 3 by themselves; without disciplined token mapping, the result could be a utility-styled redesign rather than a coherent design system.
- Broad redesign pressure could regress checkout speed, barcode readability, touch targets, contrast, focus indicators, state messaging, or offline/recovery flows.
- Build output, cache invalidation, and app-shell fingerprints would require a new policy before any runtime PR.

Fit with constraints:

- Viable only after the project has a written static-build strategy, generated CSS ownership policy, route compatibility proof, performance budget, rollback plan, and parity test plan.
- Too risky as an immediate implementation step because no runtime migration, build tooling, package manager, framework adoption, dependency installation, or generated assets are approved.

## Recommendation

Recommended path: **two-step conservative path, beginning with Stage 1A current-runtime-in-place Material 3 token/design audit**.

1. **Stage 1A — Current-runtime-in-place Material 3 token/design audit.** Keep the active runtime as plain HTML/CSS/JavaScript. Produce a docs/design audit that maps current CSS tokens and UI surfaces to Material 3-inspired roles, identifies gaps, defines visual/accessibility acceptance criteria, and proposes small future CSS/runtime improvements without changing runtime files in the audit PR.
2. **Later Stage 1B spike decision — React/Tailwind only after parity criteria are defined.** Keep React and Tailwind as possible later spikes. Do not approve package files, build tooling, generated assets, framework adoption, or dependency installation until the project has agreed parity gates, route proof, performance budgets, rollback criteria, and a scoped experiment plan.

Rationale:

- The repo's current architecture is intentionally static, no-build, GitHub Pages-hosted, and Worker-backed. Option A is the only option that improves design consistency without first changing the runtime or deployment model.
- The product's highest-risk workflows are not component styling in isolation; they are in-store checkout speed, barcode readability, Worker-managed auth/session durability, Google Sheets sync/conflict behavior, CSV backup/recovery, and offline/local usability. A token/design audit can improve UI consistency while preserving those workflows.
- React and Tailwind may still be valuable later, but the evidence needed before adoption is parity evidence rather than preference evidence. A future spike should start only after the project defines exactly what must remain unchanged and how rollback would work.

## Decision gates before any implementation

No implementation PR may add package/build/runtime files, generated assets, framework code, Tailwind configuration, routes, dependencies, or runtime migration until these gates are answered:

1. **Mobile checkout parity:** card selection, previous/next flow, checkout/detail access, high-frequency controls, and one-handed use are at least as fast and clear as the current app.
2. **Barcode speed/readability parity:** barcode rendering, payload derivation, sizing, contrast, and in-store scan readiness are unchanged or improved.
3. **Auth/session parity:** `/api/status`, `/api/logout`, same-origin `/api/*` calls, `credentials: "include"`, HttpOnly cookie assumptions, refresh persistence, logout, reconnect, and no browser token storage are preserved.
4. **Sync and conflict parity:** completed-action sync, pending-save messaging, `_META.sheetVersion`, no silent overwrite, no automatic merge, and user-chosen recovery are preserved.
5. **CSV backup/recovery parity:** export, import, accepted CSV import sync, backup-before-destructive-recovery expectations, and recovery messaging are preserved.
6. **Offline/local behavior parity:** local app use, disconnected state, local data continuity, and later sync/recovery behavior remain usable.
7. **GitHub Pages + Worker route compatibility:** static output is served from the GitHub Pages root and cannot capture Worker-owned `/auth/*` or `/api/*` paths.
8. **Performance/bundle-size budget:** first load, JS size, CSS size, generated asset size, barcode access latency, and mobile interaction responsiveness have explicit budgets.
9. **Rollback plan:** the project can restore the current plain HTML/CSS/JavaScript app shell quickly if auth, sync, recovery, routing, performance, or checkout usability regresses.
10. **Visual and accessibility acceptance criteria:** contrast, focus indicators, touch targets, status messages, reduced-motion expectations, keyboard use, and screen-reader-relevant state changes are defined before visual changes ship.

## Material 3 review

Material 3 should be used first as a design-system review lens, not as permission to add a component library.

Likely Material 3 wins:

- Map existing CSS custom properties to clearer roles for primary actions, surfaces, outlines, focus, success, warning, danger, and disabled states.
- Normalize typography roles for balances, card identifiers, labels, helper text, section headings, dialogs, diagnostics, and recovery prompts.
- Audit shape, elevation, and spacing consistency for card rows, panels, dialogs, settings surfaces, barcode containers, status banners, and controls.
- Improve touch-target consistency for checkout-critical controls such as barcode access, card navigation, balance save, used toggle, sync actions, and recovery actions.
- Strengthen accessible state communication for pending sync, offline mode, conflicts, errors, success messages, and disabled controls.

Material 3 violation or regression risks:

- Broad redesign could make the app feel more Material-like while reducing checkout speed, information density, or barcode prominence.
- Touch targets could become inconsistent if compact desktop-oriented controls are mixed with mobile Material patterns without a clear minimum size policy.
- Contrast could regress if tonal surfaces, disabled colors, or status colors are adopted without checking current readability needs.
- Focus states could become less visible if state-layer effects replace explicit outlines or high-contrast indicators.
- Status messaging could become less actionable if banners/snackbars are restyled without preserving sync/conflict/recovery specificity.
- State-layer, ripple, hover, or motion behavior could distract from barcode scanning or slow high-frequency in-store actions.
- Component-library defaults could introduce dependency weight, behavior assumptions, generated assets, or accessibility tradeoffs that conflict with the current no-build static runtime.

## Stage 2 non-goals

This ADR does not authorize, and the next Stage 2 planning/design work must not add, any of the following without a separate explicit approval:

- `package.json` or package-manager lockfiles.
- Vite, React, Tailwind, PostCSS, or other build configuration.
- React files, JSX/TSX files, framework entrypoints, generated assets, generated CSS, or bundled JavaScript.
- Dependencies or dependency installation.
- New routes, client routing, service workers, manifests, hosting changes, Cloudflare route changes, GitHub Pages changes, or deployment changes.
- OAuth/session changes, Worker API changes, OAuth scope changes, browser token storage, or direct browser Google API calls.
- Sync timing changes, conflict model changes, schema/header mapping changes, merchant model changes, barcode storage changes, CSV backup/recovery changes, or offline/local behavior changes.
- App-shell fingerprint changes.

## Proposed next PR after this ADR

Recommended next PR: **docs-only Phase 13 Stage 1A Material 3 token/design audit**.

Scope:

- Inventory current design tokens and major UI surfaces in docs only.
- Map existing tokens and surfaces to Material 3-inspired roles where helpful.
- Identify gaps in color roles, typography, shape, elevation, spacing, focus states, touch targets, status messaging, and accessibility.
- Define proposed acceptance criteria for later small runtime/UI polish PRs.
- Keep React, Tailwind, package/build files, generated assets, dependency installation, routing, hosting, Worker, OAuth/session, sync/conflict, schema, CSV, offline behavior, deployment, and app-shell fingerprints unchanged.

Acceptance criteria for that next PR:

- It is docs-only.
- It cites the current runtime and architecture constraints.
- It separates Material 3-aligned recommendations from actual implementation approval.
- It names the checkout, barcode, auth/session, sync/conflict, CSV recovery, and offline/local parity risks for any future visual change.
- It provides a prioritized list of small follow-up UI/token improvements that can be reviewed independently.
- Validation confirms no runtime, package/build, dependency, generated asset, Worker, workflow, deployment, schema, sync, CSV, or app-shell fingerprint files changed.
