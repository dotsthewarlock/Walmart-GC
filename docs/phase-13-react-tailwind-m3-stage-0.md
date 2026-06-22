# Phase 13 Option D Stage 0 / Stage 1: React + Tailwind + Material 3 Planning

## Status

This is a docs-only planning artifact for Phase 13 Option D. It records current evidence, candidate exploration goals, guardrails, and Stage 1 decision gates for a possible future React + Tailwind + Material 3 direction.

No runtime migration is approved by this document. This document does not authorize React, Tailwind, package-manager files, build tooling, dependency installation, generated assets, component libraries, route changes, service-worker changes, hosting changes, Worker changes, OAuth/session changes, OAuth scope changes, same-origin API behavior changes, schema/header mapping changes, sync/conflict changes, CSV recovery changes, app-shell fingerprint changes, or workflow changes.

## Current architecture inventory

Evidence from the current repository shows these active constraints:

- The app shell is static `index.html`, `styles.css`, and `app.js` served at the site root, with manually maintained cache/debug fingerprints.
- The frontend has no detected `package.json`, Vite config, Tailwind config, PostCSS config, or framework entrypoint in the repository root.
- The app uses a mobile-first static interface with list, checkout/detail, settings, diagnostics, sync status, barcode, balance, used-state, notes, merchant, CSV import/export, and local/offline flows implemented in plain browser JavaScript and CSS.
- GitHub Pages serves the static frontend root at `https://walmart-gc.dotsthewarlock.com`.
- Cloudflare routes only same-origin `https://walmart-gc.dotsthewarlock.com/auth/*` and `https://walmart-gc.dotsthewarlock.com/api/*` to the Worker while static files remain at the root.
- Worker-managed Google OAuth/session is the active auth model. The frontend must treat auth state as `/api/status`, logout as `/api/logout`, and all Worker API calls as same-origin `/api/*` requests with `credentials: "include"`.
- The browser must not store access tokens, refresh tokens, session IDs, OAuth secrets, or Google API credentials.
- The OAuth scope remains exactly `https://www.googleapis.com/auth/drive.file`.
- Worker-backed Google Sheets sync is the active data path. The Worker owns sheet discovery, creation, initialization, metadata, Google API access, and conflict checks.
- The approved Sheet schema and header-name model remain unchanged: `cardNumber`, `pin`, `startingBalance`, `currentBalance`, `merchant`, `merchantInferred`, `dateAdded`, `dateUpdated`, `dateUsed`, `used`, `notes`.
- Sync remains completed-action only: balance save, used-state change, notes save, merchant change, new card save, and accepted CSV import.
- Conflict handling remains sheet-level optimistic concurrency through `_META.sheetVersion`, with no silent overwrite and no automatic merge.
- Local/offline usability and CSV backup/recovery are required product capabilities, not optional migration details.

## Candidate exploration goals

A future approved Stage 1/Stage 2 exploration should be evidence-gathering first. Useful goals are:

1. Determine whether React can improve component boundaries for card list, checkout/detail, settings, diagnostics, barcode rendering, sync status, conflict recovery, CSV recovery, and data import/export without changing behavior.
2. Determine whether Tailwind can improve component-level styling velocity while preserving the current design-token discipline and avoiding arbitrary one-off utility sprawl.
3. Determine whether Material 3 can serve as a consistency lens for color roles, typography, shape, elevation, focus states, touch targets, state layers, and accessible status messaging.
4. Define a static-build strategy that remains compatible with GitHub Pages root hosting and Cloudflare Worker `/auth/*` and `/api/*` route boundaries.
5. Define a parity checklist that proves mobile checkout speed, offline/local state, CSV backup/recovery, OAuth/session durability, Google Sheets sync, and conflict recovery before any active runtime replacement.
6. Define rollback criteria that can restore the current plain HTML/CSS/JavaScript app shell if a migration regresses auth, sync, recovery, routing, performance, or checkout usability.

## Material 3 compliance opportunities and risks

Material 3 should be used as a planning and audit lens before any component-library decision.

Opportunities:

- Map existing CSS custom properties to Material 3-like color roles so success, warning, danger, primary, surface, outline, and focus states become easier to audit.
- Normalize typography roles for list rows, card balances, labels, form fields, section headings, diagnostics, and recovery prompts.
- Align shape and elevation tokens for panels, dialogs, cards, buttons, status banners, barcode containers, and settings surfaces.
- Improve touch-target consistency for high-frequency in-store actions such as previous/next card, barcode access, balance save, used toggle, and sync controls.
- Audit focus indicators, state layers, disabled states, contrast, status announcements, and keyboard navigation against Material 3 accessibility expectations.

Risks:

- A Material component library could introduce dependencies, bundle weight, generated CSS/JS, and behavior defaults that conflict with the current no-build static runtime.
- Material defaults may slow checkout flow or create visual churn if treated as a broad redesign instead of a consistency framework.
- Material forms/dialogs/navigation patterns may conflict with the existing local/offline and conflict-recovery flows unless parity-tested.
- Token migration could accidentally change accepted UI baselines if existing CSS variables are replaced too broadly.
- Material motion or state-layer effects must respect fast mobile use and should not obscure barcode or balance information during checkout.

## Tailwind exploration questions

Tailwind is not a runtime-free change in normal use. Before adoption, Stage 1 must answer:

- Which build tool would compile Tailwind, and where would generated CSS live?
- Would generated CSS be committed, built by CI, or produced only in an experimental branch?
- How would Tailwind theme tokens map to existing CSS variables and Material 3-style roles?
- What policy prevents arbitrary values and duplicated utilities from weakening maintainability?
- How would responsive, dark-mode, focus, and state variants be constrained for readability?
- How would CSS output size be measured and kept acceptable for mobile-first checkout use?

## React exploration questions

React can be considered only as a static frontend layer that preserves existing Worker and data contracts. Before adoption, Stage 1 must answer:

- What component boundaries map to the current app without changing user-visible behavior?
- What state model preserves completed-action sync instead of syncing every keystroke?
- How are auth status, sheet status, pending saves, conflicts, offline mode, CSV recovery, and diagnostics represented without bypassing Worker APIs?
- How are barcode rendering, card ordering, merchant inference display, and runtime-only `effectiveMerchant` behavior parity-tested?
- Is navigation implemented without client-side path routing, or with a Pages-safe strategy that cannot capture `/auth/*` or `/api/*` paths?
- What bundle-size and first-load budgets are acceptable for mobile in-store use?

## Hard migration guardrails

Any future implementation PR must preserve these guardrails unless the user explicitly approves a specific change after risk discussion:

- No OAuth/session architecture change.
- No OAuth scope broadening beyond `drive.file`.
- No frontend token, session ID, secret, or Google credential storage.
- No direct browser Drive API or Sheets API calls.
- No same-origin `/api/*` behavior change and no missing `credentials: "include"` on Worker API calls.
- No Worker route, hosting, GitHub Pages, Cloudflare, or deployment change.
- No schema/header mapping change.
- No stored `effectiveMerchant` field and no barcode payload storage.
- No sync timing change away from completed-action sync.
- No conflict model change away from `_META.sheetVersion`, no silent overwrite, and no automatic merge.
- No CSV backup/recovery removal or weakening.
- No local/offline usability regression.
- No app-shell fingerprint changes in docs-only planning PRs.
- No dependency, package-manager, framework, build-step, or generated-asset change in Stage 0.
- No GitHub workflow or PR-lifecycle automation change in this planning track.

## Stage 0 deliverables: no build and no runtime changes

Stage 0 is complete when the repository contains a docs-only plan that:

- Inventories the current static frontend, Worker-managed OAuth/session boundary, Worker-backed sync boundary, schema constraints, CSV recovery, and offline/local requirements.
- Names React, Tailwind, and Material 3 opportunities without choosing an implementation stack.
- Lists migration risks and guardrails that protect user data, auth/session durability, sync/conflict safety, and static hosting.
- Defines Stage 1 decision gates before any runtime or tooling implementation.
- Recommends a next PR that remains docs-only unless the user explicitly approves a scoped experiment.

Stage 0 must not modify `index.html`, `app.js`, `styles.css`, Worker files, manifests/assets, package/dependency files, generated output, hosting config, workflow files, app-shell fingerprints, schema docs, or runtime behavior.

## Stage 1 decision gates before implementation

Before any implementation or tooling PR, Stage 1 should produce an architecture-only decision record that answers these gates:

1. **Static hosting gate:** exact build/static-output strategy for GitHub Pages root hosting, including whether generated assets are committed or built by CI.
2. **Route boundary gate:** proof that `/auth/*` and `/api/*` remain Worker-owned and cannot be captured by client routing.
3. **Auth/session gate:** API contract for `/api/status`, `/api/logout`, and all `/api/*` calls with `credentials: "include"` and no browser token storage.
4. **Data parity gate:** schema/header mapping, `merchant`/`merchantInferred`, runtime-only `effectiveMerchant`, barcode derivation, and date/balance/used-state behavior remain unchanged.
5. **Sync parity gate:** completed-action sync, pending-save UI, conflict prompts, `_META.sheetVersion`, and no-silent-overwrite behavior remain unchanged.
6. **CSV/offline gate:** CSV backup/export/import/recovery and disconnected local usability have a written parity test plan.
7. **Material 3 token gate:** existing CSS variables are mapped or intentionally retained, with clear visual-drift limits.
8. **Tailwind governance gate:** theme, arbitrary-value, generated-size, and utility-style policies are defined.
9. **React state gate:** component and state boundaries are documented before rewriting flows.
10. **Performance gate:** mobile bundle-size, initial-load, and barcode-access budgets are set.
11. **Validation gate:** static checks, manual parity checks, and rollback checks are defined before code migration.
12. **PR policy gate:** implementation branch/base, risk tier, review requirements, and auto-merge eligibility are explicit before package/build/runtime files are touched.

## Recommended next PR after planning

The recommended next PR is still docs-only: create a Stage 1 architecture decision record that compares at least three possible approaches:

1. Keep the current plain HTML/CSS/JavaScript runtime and incrementally improve Material 3-aligned tokens/components in place.
2. Add a future static React build with a strict no-router or hash-router strategy and committed/generated static output plan.
3. Add a future React + Tailwind static build with explicit token mapping, generated CSS governance, and bundle/performance budgets.

That PR should include a parity checklist and a rollback plan, but it should not add package files, dependencies, generated assets, build commands, workflow changes, or runtime edits unless separately approved.

## Risk classification

This Stage 0/1 planning artifact is green risk because it is docs-only and intentionally avoids runtime files, Worker files, OAuth/session behavior, sync/conflict behavior, schema/header mapping, CSV recovery behavior, hosting/deployment, workflow automation, app-shell fingerprints, framework/tooling adoption, dependencies, and generated assets.
