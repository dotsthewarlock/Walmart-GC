# Phase 13 Option D Stage 0: React + Tailwind + Material 3 Evidence Note

## Status

Stage 0 is evidence gathering and planning only. No runtime migration is approved yet, and this note does not authorize adopting React, Tailwind, Material 3 component libraries, package managers, build tooling, route changes, service-worker changes, hosting changes, Worker changes, OAuth/session changes, schema changes, sync changes, or CSV recovery changes.

## Current architecture constraints

- The active production and development URL remains `https://walmart-gc.dotsthewarlock.com`.
- The frontend is currently a GitHub Pages-hosted static app using plain HTML, CSS, and JavaScript with no framework and no build system.
- Cloudflare Worker routes are limited to same-origin `/auth/*` and `/api/*` paths while GitHub Pages serves the root static app.
- Worker-managed Google OAuth/session and Worker-backed Drive/Sheets sync are current architecture boundaries, not migration targets.
- Offline/local browser usability and CSV backup/recovery must remain available.
- Phase 13 may explore React, Tailwind, and Material 3 directionally, but the active runtime must not be replaced without explicit discussion, approval, and a focused implementation plan.

## Migration goals for a future approved stage

A future migration would be viable only if it can:

- Preserve static GitHub Pages delivery for the browser app.
- Preserve the existing Cloudflare Worker-managed auth/sync architecture.
- Improve maintainability by introducing clearer component boundaries without changing product behavior.
- Preserve mobile-first gift-card workflows, fast barcode access, and desktop usability.
- Preserve current data semantics, completed-action sync behavior, and CSV backup/recovery.
- Use Material 3 as a design-system lens for consistency, accessibility, state layers, spacing, typography, and component behavior rather than as permission for a broad redesign.

## Non-goals

Stage 0 and any near-term Stage 1 architecture planning should not:

- Migrate the active runtime.
- Add React, Tailwind, build tooling, package managers, component libraries, service workers, deployment changes, or route changes.
- Replace GitHub Pages or add new hosting.
- Introduce a Node backend, database, Firebase, Cloud Functions, Apps Script sync, or app-managed user accounts.
- Change Worker OAuth/session handling, OAuth scopes, cookies, same-origin API calls, schema/header mapping, sync/conflict behavior, CSV recovery, app-shell fingerprints, or Worker versioning.

## GitHub Pages and static hosting constraints

React and Tailwind are technically compatible with GitHub Pages only if a future stage introduces a static build output whose generated files can still be served at the site root. That future decision would require explicit approval because the current app intentionally has no package manager or build step.

Any future static build plan must answer:

- Where generated assets would live and whether source output is committed or built by CI.
- How cache/debug fingerprints would map to generated HTML, JavaScript, and CSS.
- How deep links or client-side routing would avoid breaking GitHub Pages root hosting. A no-router or hash-router approach is likely safer than path-based routing unless Pages fallback behavior is explicitly handled.
- How the app remains usable when loaded as static files and when the Worker is unreachable.
- How deployment keeps GitHub Pages at the root while Cloudflare routes only `/auth/*` and `/api/*` to the Worker.

## Worker OAuth/session and same-origin API boundaries

A future React app must treat auth and sync as external same-origin API boundaries, not as client-owned token flows.

Guardrails that must remain intact:

- Google OAuth starts and completes through Worker `/auth/*` routes.
- Auth state comes from `/api/status`.
- Logout uses `/api/logout`.
- Frontend API calls use same-origin `/api/*` paths with `credentials: "include"`.
- The browser must never store access tokens, refresh tokens, session IDs, OAuth secrets, or Google API credentials.
- The OAuth scope remains exactly `https://www.googleapis.com/auth/drive.file`.

React component state could model connection status and loading/error UI, but it must not bypass the Worker or create direct browser Drive/Sheets API access.

## Data, sync, schema, and CSV recovery guardrails

A future migration must preserve the current data contract:

- Spreadsheet name: `Walmart-GC Data`.
- Tabs: `Cards` and `_META`.
- Approved `Cards` schema: `cardNumber`, `pin`, `startingBalance`, `currentBalance`, `merchant`, `merchantInferred`, `dateAdded`, `dateUpdated`, `dateUsed`, `used`, `notes`.
- `merchant` remains an explicit user-entered/user-selected override only.
- `merchantInferred` remains system-derived from `cardNumber`.
- `effectiveMerchant = merchant || merchantInferred` remains runtime-only and must not be stored.
- Barcode payload remains derived only as `79936686504000 + cardNumber` and must not be stored.
- Sync remains Worker-backed and completed-action only.
- Conflict handling remains sheet-level optimistic concurrency via `_META.sheetVersion`, with no silent overwrite and no automatic merge.
- CSV backup must remain available before destructive recovery.

## Material 3 implications

Material 3 is useful for planning if it is treated as a guidance layer rather than an automatic component-library mandate.

Likely useful areas:

- Clear hierarchy for list, detail, settings, diagnostics, and sync states.
- Consistent color roles, typography scale, shape, elevation, focus indicators, and state layers.
- Better mobile ergonomics for high-frequency checkout actions.
- Accessibility checks for contrast, touch targets, keyboard focus, and status messaging.

Risks:

- A full Material component library could add significant dependencies and bundle size.
- Material defaults may conflict with the current fast in-store checkout workflow if applied as a broad redesign.
- Material 3 theming may require a token bridge from existing CSS variables to avoid visual churn.

## Tailwind implications

Tailwind could be viable in a future static build if it is introduced as compiled CSS only and if generated output remains GitHub Pages-compatible.

Potential benefits:

- Faster component-level layout iteration.
- More explicit responsive and state styling near component markup.
- Easier tokenization if mapped carefully to Material 3-style design tokens.

Risks and questions:

- Tailwind requires build tooling in normal use, which is currently outside the active runtime model.
- Uncontrolled utility usage can create noisy markup and weaken the existing design-token discipline.
- A migration needs a policy for preserving current CSS custom properties, avoiding arbitrary one-off values, and preventing visual regressions.

## React implications

React could be viable only as a static frontend layer that continues to call the existing Worker APIs and preserves local/offline behavior.

Potential benefits:

- Clearer component boundaries for card list, card detail, barcode display, data panel, settings, diagnostics, and sync status.
- More predictable state management for auth state, card edits, pending saves, conflict prompts, and offline states.
- Better testable separation between view components and existing data/sync logic if migration is staged carefully.

Risks and questions:

- Introducing React normally implies package management and a build step, both currently out of scope.
- Rewriting state flows may accidentally change completed-action sync, conflict prompts, or CSV recovery behavior.
- Bundle size and initial load performance must remain acceptable for mobile in-store use.
- Any client-side routing must avoid breaking GitHub Pages root hosting and Worker route boundaries.

## Biggest risks

1. Build/deployment drift from the current no-build GitHub Pages model.
2. Accidental OAuth/session boundary violations, especially direct browser token handling or missing `credentials: "include"`.
3. Sync behavior regressions from changing local state and save timing.
4. Schema or CSV compatibility regressions during data-layer refactoring.
5. Material 3 or Tailwind causing a broad UI redesign instead of targeted consistency improvements.
6. Bundle-size and performance regressions on mobile devices.
7. Route conflicts with Cloudflare Worker `/auth/*` and `/api/*` paths or GitHub Pages root hosting.

## Recommended Stage 1 architecture-document questions

Before any runtime migration spike, Stage 1 should answer these questions in architecture docs only:

1. What is the approved static build strategy, and does it commit generated assets, build in CI, or remain only a proposal?
2. What branch and PR policy gates are required before adding package-manager or build-tool files?
3. Will the future app use no router, hash routing, or another Pages-safe navigation model?
4. What is the exact compatibility contract for Worker endpoints, cookies, and `credentials: "include"` calls?
5. How will existing local storage, offline behavior, and CSV backup/recovery be parity-tested before runtime replacement?
6. How will Material 3 tokens map to existing CSS variables and current accepted UI baselines?
7. How will Tailwind utility usage be constrained to preserve maintainability and avoid arbitrary values?
8. What minimum parity checklist must pass before replacing the active app shell?
9. What rollback plan restores the current plain HTML/CSS/JavaScript runtime if a migration regresses auth, sync, CSV recovery, or mobile checkout usability?
10. What bundle-size and load-performance budgets are acceptable for mobile-first checkout use?

## Stage 0 conclusion

A future React + Tailwind + Material 3 migration appears directionally viable for Walmart-GC only as a static frontend migration that preserves GitHub Pages root hosting and the existing Cloudflare Worker-managed OAuth/session/sync architecture. The migration is not approved by this note. The safest next step is a Stage 1 architecture-only document that defines build/static-hosting strategy, routing constraints, API/auth boundaries, data parity requirements, design-token strategy, validation gates, and rollback criteria before any runtime files or tooling are changed.
