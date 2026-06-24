# Walmart-GC React, Tailwind, and Material 3 Migration Plan

This document outlines the step-by-step phases for migrating the Walmart-GC application from a static HTML/JS/CSS app to an isolated React 19 + Vite + Tailwind CSS + Material 3 codebase while preserving 100% of the stable `phase-12` runtime behaviors.

## Phase 1: Docs and Behavior Mapping
- **Goal**: Establish the active migration context, handoff rules, plan, and behavior mapping before modifying code.
- **Major Tasks**:
  - Create and clean migration docs: `docs/MIGRATION_ACTIVE_CONTEXT.md`, `docs/ANTIGRAVITY_HANDOFF.md`, `docs/REACT_TAILWIND_M3_MIGRATION_PLAN.md`, and `docs/STATIC_TO_REACT_BEHAVIOR_MAP.md`.
- **Success Criteria**: All four documentation files exist, are clean, and accurately reflect the project state.

## Phase 2: React Architecture
- **Goal**: Set up Vite, Tailwind CSS, and the React entry point structure.
- **Major Tasks**:
  - Verify Vite scaffolding, TS/JS config files, PostCSS config, and Tailwind CSS configuration.
- **Success Criteria**: Vite dev server runs, and the main app renders the basic UI shell without errors.

## Phase 3: Data Model and Local State Parity
- **Goal**: Map the internal `cards` and `settings` data models to React state.
- **Major Tasks**:
  - Port the local state management logic from `phase-12` (`app.js`).
  - Set up React state hook controls for active cards, filtering/sorting parameters, and UI status flags.
- **Success Criteria**: Local cards array and settings conform to the schema and update dynamically in state.

## Phase 4: Cards Panel Parity
- **Goal**: Replicate the card list view, card details, card cards rendering, and filtering/sorting logic.
- **Major Tasks**:
  - Port card grid/list component layout.
  - Implement search bar, merchant filtering, sort by balance/date, and total/active card counts.
- **Success Criteria**: Cards list behaves identically to `phase-12` sorting and filtering outputs.

## Phase 5: Checkout Panel Parity
- **Goal**: Port checkout session mode and card-scanning helpers.
- **Major Tasks**:
  - Replicate checkout navigation workflow, including the focused barcode view, swipe/tap transitions, and mark-used buttons.
- **Success Criteria**: Entering checkout displays active barcodes with exact match of scan mechanics.

## Phase 6: Modals Parity
- **Goal**: Implement all modals for updating balances, editing card notes, and configuring CSV data.
- **Major Tasks**:
  - Port details modal, balance editor modal, and notes editor modal.
- **Success Criteria**: Modals trigger and modify state exactly as they did in `phase-12`.

## Phase 7: CSV Backup/Recovery Parity
- **Goal**: Secure offline CSV backup, import, export, and overwrite recovery actions.
- **Major Tasks**:
  - Implement CSV parser and generator logic matching the `phase-12` implementation.
  - Add lock/unlock states for raw text edits.
- **Success Criteria**: Valid CSV files can be imported/exported; incorrect CSV blocks throw appropriate validations.

## Phase 8: Barcode Parity
- **Goal**: Parity on barcode rendering (JsBarcode).
- **Major Tasks**:
  - Port JsBarcode integration to a React-safe element lifecycle wrapper.
  - Ensure barcode payload calculation `79936686504000 + cardNumber` is preserved.
- **Success Criteria**: Barcode modals render scanned barcodes identical to the legacy implementation.

## Phase 9: Worker OAuth/session Parity
- **Goal**: Connect React app to Cloudflare Worker same-origin auth routes.
- **Major Tasks**:
  - Port authentication checks (`GET /api/status`) and logout calls (`POST /api/logout`).
  - Maintain `credentials: "include"` on all fetch calls.
- **Success Criteria**: App correctly reflects connection state and logs out sessions via Worker cookies.

## Phase 10: Google Sheet Load/Save Parity
- **Goal**: Perform sheet validation, auto-creation, loading, and saving via same-origin Worker calls.
- **Major Tasks**:
  - Port `/api/sheet/ensure`, `/api/cards/load`, and `/api/cards/save` triggers.
- **Success Criteria**: Sheet discovery, initialization, metadata retrieval, and manual pull/push flows work reliably.

## Phase 11: Conflict/Recovery Parity
- **Goal**: Replicate optimistic concurrency conflict resolution.
- **Major Tasks**:
  - Handle `_META.sheetVersion` validation errors.
  - Show recovery choice prompts to the user rather than auto-merging.
- **Success Criteria**: Version mismatches flag conflicts and display manual resolve choices to the user.

## Phase 12: Diagnostics/App-Shell Fingerprint Parity
- **Goal**: Provide the inline sync status bar, diagnostics view, and fingerprint caching query strings.
- **Major Tasks**:
  - Wire up diagnostics panel.
  - Ensure version fingerprint tags match standard cache-busting schemas.
- **Success Criteria**: App version status and diagnostics logs are fully transparent and accessible.

## Phase 13: Material 3 Refinement
- **Goal**: Polish visual styling to match Material 3 guidelines using Tailwind utility classes.
- **Major Tasks**:
  - Apply color system tokens, responsive padding, micro-animations, and typographic enhancements.
- **Success Criteria**: Visual appearance aligns with modern standards while maintaining identical behavior.
