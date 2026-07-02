# Core Product & Design Decision Superseding Review

**Date:** July 1, 2026  
**Repository:** `dotsthewarlock/Walmart-GC`  
**Active Branch:** `features/core-product-design-report`  
**Status:** Review Draft (Superseding Proposal)  

> [!NOTE]
> Historical shadcn references in this report are superseded by commit `889397a`, which removed shadcn from the active project. They are retained here as design-history evidence only; current UI guidance is the project-owned strict-M3 React/Tailwind path documented in `docs/M3_DESIGN_DECISIONS.md`.

---

## 1. Executive Summary

This report delivers a comprehensive, no-holds-barred core product and design review for `Walmart-GC`. With the recent stabilization of the React 19 + Vite + Tailwind CSS deployment on `main`, the project has reached a high baseline of technical quality. However, to elevate this codebase into an award-winning, state-of-the-art consumer product, we must transition from a retrospective, patch-heavy engineering model into a cohesive, forward-looking design system. 

All core product and design decisions are reopened for review in this document. Once approved, this review will supersede and rationalize all prior repository design documentation and logs.

### Recommended Product Identity
**Walmart-GC** is a privacy-first, secure, off-the-grid merchant-aware gift-card wallet. It provides a highly tactile, responsive, and tactile-optimal interface conforming strictly to Material 3 (M3) guidelines. By bypassing third-party servers and cloud databases in favor of local-first state synced to a secure, user-owned Google Sheet, it guarantees absolute ownership of sensitive financial data. Its interface displays high-contrast, register-ready barcode displays inside a unified, distraction-free Checkout screen designed specifically for fast-paced retail environments.

### Top 10 Decisions to Lock & Supersede
1. **Flatten Checkout Flow:** Consolidate Checkout into a single, non-modal screen. Completely remove separate "Focus Mode," "scanner focus mode," "scanner mode," and user-invoked barcode expansion.
2. **Passive, Inline Scan Layout:** Make the barcode display passive, inline, and scan-ready by default inside Checkout, removing all scrim overlays, scaling jumps, and close buttons.
3. **Continuous, Passive Screen Wake Lock:** Request the screen wake lock automatically whenever the Checkout tab is active, and release it immediately when navigating away, eliminating manual toggle state.
4. **Transition to Merchant-Aware Wallet:** Evolve the database and schema from Walmart-only to a "Walmart-first" multi-merchant wallet supported by local merchant profiles and custom fallbacks.
5. **Strict M3 Labeled Pairs for Metrics:** Display strictly two clean counters: `Available balance` and `Visible cards` (M3 Label Large + Display Medium), suppressing all legacy aggregate labels.
6. **Privacy-First Sync Chip:** Use a compact, anonymous M3 Assist Chip indicating sync status (`Google sync on`, `Local only`, `Syncing...`) next to the section header. Do not display Google email addresses in main viewports.
7. **Fine-Pointer Copy on Click:** Optimize desktop checkout by copying a single unified `CODE/PIN` clipboard string when clicking displayed digits, while keeping touch-first elements primary on mobile.
8. **Bounded Non-Cycling Swipe Navigation:** Prevent card selection navigation from wrapping around at list boundaries, preserving predictable layout limits.
9. **Discretionary Troubleshooting Container:** Group all technical logs, sheet bindings, and same-origin worker connection states inside a single, collapsed M3 Troubleshooting card.
10. **Custom Localized Shadcn Primitives:** Override stock shadcn default styles in `src/components/ui/` to enforce rounded-3xl corners, standard M3 tonal color surfaces, and 48px+ touch targets. *Historical note: superseded by commit `889397a`.*

### Top 10 Stale / Conflicting Assumptions to Clean Up
1. *Walmart-Only Boundary:* Prior docs assume the app only works with Walmart; card-level schema and barcode logic should generalize.
2. *Need for High-Contrast Black Overlays:* The old belief that barcodes require a heavy `bg-black/60` backdrop scrim conflicts with M3's flat tonal surface philosophy.
3. *Double-Modal Stacking:* Stacking the "Update Balance" modal on top of a "Barcode Focus" modal introduces high state complexity and escape key handling bugs.
4. *Email Exposure as Connection Proof:* Displaying full Google account email addresses on primary screens violates personal data privacy.
5. *Apps Script Dependency:* Legacy documentation still references Apps Script, which is completely retired in favor of the Cloudflare Worker same-origin API.
6. *Aggregated Balance Labels:* Stale terms like "Total Wallet Assets" or "registered / displayed" clutter the UI and must be removed.
7. *Hardcoded Barcode Backgrounds:* The previous practice of placing a persistent white background around barcode containers at rest leaked white space into dark mode.
8. *Editable System-Inferred Fields:* Users should not edit derived metadata fields like `merchantInferred` directly.
9. *Vite/Tailwind Configuration Discrepancies:* Transitioning from CJS `vite.config.js` to ESM `vite.config.mjs` must be documented as locked.
10. *Local/Telemetry Branch References:* Live System Status elements displaying git telemetry branches (e.g., `agy/shadcn-refactor-docs`) leak internal development state.

### Recommended PR Execution Sequence
- **PR 1:** Approve and commit this Superseding Product Constitution (`CORE_PRODUCT_DESIGN_DECISION_SUPERSEDING_REVIEW_2026-07-01.md`).
- **PR 2:** Document, rename, and clean up stale repository files, duplicate project guidelines, and retired audits.
- **PR 3:** Refactor `src/App.jsx` to completely remove Focus Mode state, event listeners, scrim overlays, and transition to passive inline barcode layout.
- **PR 4:** Extend data utility models and local schema to support generic merchant profiles and custom barcode fallbacks.
- **PR 5:** Research, mock up, and draft the future-class camera barcode scanning acquisition pipeline.
- **PR 6:** Align the QA Test Checklist to the consolidated, Focus-Mode-free navigation architecture.
- **PR 7:** Polish visual tokens, spacing ratios, and theme transition physics for award-winning compliance.

---

## 2. Proposed New Product Constitution

This constitution defines the ideal finished-product model for Walmart-GC, providing a definitive reference for developers and agents.

```text
                                  [ CUSTOMER VIEWPORT ]
                                            │
                     +──────────────────────┴──────────────────────+
                     │               Top App Bar                   │
                     │  (Walmart-inspired Seed #0071dc, Settings)  │
                     +──────────────────────┬──────────────────────+
                                            │
                     +──────────────────────┴──────────────────────+
                     │               Flat Navigation               │
                     │    [ CARDS Tab ]             [ CHECKOUT ]   │
                     +──────────┬───────────────────────┬──────────+
                                │                       │
            +───────────────────┴───+       +───────────┴───────────────────────+
            │     Cards Ledger      │       │          Checkout View            │
            │  - Strict M3 List-Item│       │  - Passive Inline Barcode (No Scrim)
            │  - Labeled Pair Metric│       │  - Active/Passive Screen Wake Lock│
            │  - Privacy-First Chip │       │  - Single-Step Balance Update     │
            +─────────────┬─────────+       +───────────────────┬───────────────+
                          │                                     │
                          +─────────────────┬───────────────────+
                                            │
                     +──────────────────────┴──────────────────────+
                     │          Secure Local Storage State         │
                     +──────────────────────┬──────────────────────+
                                            │ Same-Origin Sync
                     +──────────────────────┴──────────────────────+
                     │       Cloudflare Worker (walmart-gc-oauth)   │
                     │         HttpOnly Secure Session Cookie       │
                     +──────────────────────┬──────────────────────+
                                            │
                     +──────────────────────┴──────────────────────+
                     │    User's Private Google Drive (drive.file) │
                     │   Spreadsheet: "Walmart-GC Data" (_META)    │
                     +─────────────────────────────────────────────+
```

### 1. What Walmart-GC Is
A secure, offline-first, highly-polished, merchant-aware gift card wallet conforming to strict Material 3 design specs, backed by zero-intermediate, same-origin Google Drive backup.

### 2. What Walmart-GC Is Not
* It is **not** a centralized SaaS platform; there is no database owned by the developer, and no user data is aggregated.
* It is **not** an automatic barcode-generating cracking suite.
* It is **not** a general-purpose receipt or retail shopping tracker.

### 3. Primary User Jobs
1. **Assess Assets Instantly:** View combined available balance and active card count under a clear, non-distracting M3 metrics strip.
2. **Execute Barcode Scans Effortlessly:** Access a high-contrast, register-ready checkout barcode passively without click-to-zoom delays.
3. **Log Balance Adjustments Post-Purchase:** Instantly record balance decrements via a simple, real-time-calculating balance overlay.
4. **Synchronize Securely and Quietly:** Back up card states across devices using their personal Google account without leaking emails or credentials on-screen.

### 4. Navigation Model
A flat, highly-responsive bottom navigation bar with exactly two primary destinations:
* **Cards (Index/Ledger):** Scrollable inventory card grid with filter toolbar and M3 Labeled Pairs.
* **Checkout (Interactive Scanner Screen):** Dynamic barcode display, PIN layout, notes details, and action triggers for the currently active card.
Access to settings is pinned to a clean top-right Header Icon Button. All active visual components must enforce a minimum 48px touch target height.

### 5. Privacy Model
Strict local-first privacy. Sensitive gift card numbers, PINs, balances, and notes are held in encrypted browser storage and transmitted directly to the user's private Google Sheet via same-origin Worker proxies. OAuth session scopes are strictly locked to `drive.file`. Google emails, profile names, and technical hashes are hidden from standard viewports.

### 6. Checkout Model
A single-view, flat interaction model. Barcodes are displayed passively in a high-contrast scan-safe container (`bg-white`) inside the Checkout screen. There are no secondary zoom states, modal backdrops, or scrim overlays. Action buttons (Update Balance, Mark Used) are large, round-full components.

### 7. Sync & Backup Model
Bidirectional background sync utilizing optimistic locking based on spreadsheet version metadata (`_META.sheetVersion`). Offline edits are captured in a local transaction queue, which is processed automatically upon reconnection. Offers a clean, manual CSV export and import route for manual data recovery.

### 8. Merchant Model
Walmart-first multi-merchant. Walmart remains the default primary optimized merchant (utilizing standard 16-digit normalization and automated `799366...` UPC barcode prefix mapping). However, the app supports custom merchant definitions and generic fallback profiles to render non-Walmart card numbers and PIN codes cleanly.

### 9. Add-Card Model
A highly-validated card registration workflow. Accepts gift card entries through manual input with strict prefix and length checks, with a first-class camera-based barcode scanning acquisition flow planned as a non-breaking future integration.

### 10. Diagnostics Model
A unified, collapsible Troubleshooting pane located at the bottom of Settings. Technical connection statuses, sheets binding states, and asset fingerprint mismatches are hidden inside this container to keep the core settings page simple and clean.

### 11. Design-System Model
Pure Material 3 styling. Colors are dynamically mapped from custom CSS variables seeded by a production-inspired Walmart blue (#0071dc). Typographic scales employ Outfit for readable UI text and Google Sans Code (monospace) for tabular numbers. All card components feature 24px/28px/36px roundings to give the interface a premium, modern feel.

---

## 3. Decision Matrix

| Area | Current/Prior Decision | Problem/Conflict | Suggested Responses | Recommended Response | M3 Rationale | Product Rationale | Docs Impact | Code Impact | Risk | Priority |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **1. Product Identity** | Walmart-only gift card utility. | Overly restrictive; limits user wallet utility to a single retail brand. | A. Keep Walmart-only.<br>B. Generic card wallet.<br>C. Walmart-first merchant-aware wallet. | **C. Walmart-first merchant-aware wallet.** | Standardizes surface tokens and roles; flexible layout allows clean branding slots. | Expands product capability while maintaining top-tier optimization for Walmart cards. | `ACTIVE_CONTEXT.md` | `src/lib/cards.js` | Low | P1 |
| **2. Info Architecture** | Multi-panel desktop layout forced onto mobile. | Cognitive overload on narrow screens; lacks distinct primary focus. | A. Keep legacy grid.<br>B. Flat bottom navigation tabs. | **B. Flat bottom navigation tabs (Cards vs Checkout).** | Aligns with M3 Navigation Bar guidelines (3-5 core destinations). | Eliminates visual noise; provides clear, thumb-accessible mobile primary actions. | `M3_DESIGN_DECISIONS.md` | `src/App.jsx` | Medium | P1 |
| **3. Cards Page** | Dense, multi-column spreadsheet-like ledger grid. | Hard to read on mobile viewports; row clicks feel cramped. | A. Keep dense grid.<br>B. Unified vertical M3 List-Item feed. | **B. Unified vertical M3 List-Item feed.** | Conforms to M3 List layout with explicit padding and text hierarchies. | Creates a premium, tactile list layout with comfortable spacing and clear touch responses. | `DECISIONS_LOG.md` | `src/App.jsx` | Low | P1 |
| **4. Cards Metrics** | Dispersed metadata counters ("Total Assets", "displayed/registered"). | Excessive visual weight; legacy aggregate labels clutter header. | A. Keep legacy labels.<br>B. Display strict M3 Labeled Pairs. | **B. Display strict M3 Labeled Pairs ("Available balance", "Visible cards").** | Employs M3 typographic hierarchy: Label Large paired with Display Medium. | Reduces cognitive load; emphasizes only the critical data points users care about. | `M3_DESIGN_DECISIONS.md` | `src/App.jsx` | Low | P1 |
| **5. Card Rows & Selection** | Selected card list item styled with high-contrast, heavy shadows. | High visual weight; layout shifts when selected row expands. | A. Keep current style.<br>B. Subtle tonal tint highlight without expansion. | **B. Subtle tonal tint highlight (`bg-m3-primary-container/15`) with zero layout shift.** | Adheres to M3 State Layers (selected/active tonal surface overrides). | Eliminates layout jitter and maintains smooth vertical scrolling across items. | `DECISIONS_LOG.md` | `src/App.jsx` | Low | P2 |
| **6. Card Filters** | Text buttons scattered across secondary toolbar rows. | Inconsistent styling; small, hard-to-tap touch targets. | A. Keep text links.<br>B. M3 Filter Chips with clear active states. | **B. Inline M3 Filter Chips with active tick icons and 48px touch targets.** | Implements M3 Chip components with consistent padding and active visual markers. | Provides clear interactive feedback; fits perfectly into mobile-first rows. | `ACTIVE_CONTEXT.md` | `src/App.jsx` | Low | P2 |
| **7. Sync Chip & Privacy** | Google sync displays full email address on Cards index. | Leaks personal identification in public settings or screenshots. | A. Keep email visible.<br>B. Anonymous sync status chip. | **B. Compact M3 Assist Chip indicating status only, email deferred to Settings.** | Prioritizes clean, non-cluttering metadata; uses standard M3 assistive components. | Protects user privacy; keeps the main viewport clean and uncluttered. | `M3_DESIGN_DECISIONS.md` | `src/App.jsx` | Low | P1 |
| **8. Checkout/Barcode Workflow** | Clicking barcode triggers modal zoom state. | Double-layered modal stacking; introduces escape key handling bugs. | A. Keep modal zoom.<br>B. Flat, inline passive barcode display. | **B. Flat, inline passive barcode display in Checkout view.** | Flattens layout hierarchy; avoids unnecessary overlay sheets. | Speeds up register scanning; removes multi-step modal clicking entirely. | `M3_DESIGN_DECISIONS.md` | `src/App.jsx` | Medium | P1 |
| **9. Focus Mode** | "Focus Mode" tracked as distinct state with screen scrim. | Complex state management; dark scrim conflicts with M3 tonal surfaces. | A. Keep Focus Mode.<br>B. Remove Focus Mode entirely. | **B. Remove Focus Mode entirely; barcode is passively scan-ready.** | Replaces artificial dark overlays with native M3 surface backgrounds. | Simplifies UX; eliminates screen overlays and complex state-tracking variables. | `M3_DESIGN_DECISIONS.md` | `src/App.jsx` | Medium | P1 |
| **10. Card/PIN Copy** | Touching digits on mobile toggles numeric visibility. | Toggling visibility is tedious; copying digits on mobile can be finicky. | A. Keep touch toggle.<br>B. Click-to-copy on desktop, touch-friendly copy icon on mobile. | **B. Click-to-copy digit string on desktop; touch-friendly copy action on mobile.** | Uses M3 focus states for copyable elements; typography remains clean. | Speeds up checkout when copying credentials into mobile checkout fields. | `M3_DESIGN_DECISIONS.md` | `src/App.jsx` | Low | P2 |
| **11. Checkout Actions** | "Update Balance" and "Mark Used" buttons are small and square. | Inconsistent with round M3 button styles; hard to tap. | A. Keep square buttons.<br>B. Rounded-full M3 Tonal and Filled Buttons. | **B. Rounded-full M3 Tonal ("Update Balance") and Filled ("Mark Used") Buttons.** | Implements standard M3 shape tokens: full rounding for high-importance actions. | Delivers a highly responsive, premium-feeling tap target at register. | `M3_DESIGN_DECISIONS.md` | `src/App.jsx` | Low | P1 |
| **12. Notes** | Borderless text area with hidden/revealed states. | Note content is hard to read; input box lacks clear boundaries. | A. Keep current text area.<br>B. M3 TextField block. | **B. Collapsible M3 Outlined TextField block.** | Adheres to M3 Input guidelines with clear outline boundaries and placeholder text. | Keeps notes organized; avoids accidental edits during checkout. | `DECISIONS_LOG.md` | `src/App.jsx` | Low | P2 |
| **13. App Shell** | Dense outer bounding frames wrapping the screen on mobile. | Desktop-first panels look outdated and cramped on mobile viewports. | A. Keep outer frame.<br>B. Full-bleed edge-to-edge mobile canvas. | **B. Full-bleed edge-to-edge mobile canvas with bounded desktop container.** | Implements M3 Adaptive Layout: full bleed on compact, centered max-width on expanded. | Feels native on mobile screens while remaining perfectly centered on desktop. | `M3_DESIGN_DECISIONS.md` | `src/App.jsx` | Medium | P1 |
| **14. Header/Settings** | settings access via simple text link. | Lacks clear visual hierarchy; doesn't feel like an action button. | A. Keep text link.<br>B. M3 Standard IconButton. | **B. M3 Standard IconButton (Gear icon) pinned to Top App Bar.** | Conforms to M3 Top App Bar spec for secondary settings actions. | Cleans up the header space; standardizes settings entry point. | `M3_DESIGN_DECISIONS.md` | `src/App.jsx` | Low | P2 |
| **15. Settings Hierarchy** | Flattened settings layout; CSV, Google Sync, and diagnostics are mixed together. | High cognitive density; critical sync and diagnostic options feel cluttered. | A. Keep flat list.<br>B. Collapsible M3 Accordion sections. | **B. Collapsible M3 Accordion cards grouping related preferences.** | Implements M3 Container rules: clear groupings and nested surface levels. | Streamlines navigation; separates standard settings from advanced setup. | `M3_DESIGN_DECISIONS.md` | `src/App.jsx` | Low | P1 |
| **16. Backup/Import/CSV** | Large CSV action buttons displayed by default. | Occupies high-value screen space; rarely used during normal app runs. | A. Keep visible.<br>B. Move into collapsible Settings section. | **B. Move into a dedicated, collapsed "Backup & CSV Actions" container.** | De-emphasizes low-frequency actions using M3 container nesting. | Streamlines Settings; prevents users from accidentally triggering CSV imports. | `ACTIVE_CONTEXT.md` | `src/App.jsx` | Low | P2 |
| **17. Diagnostics Pane** | Raw technical lines visible in main list footer. | Visual clutter; leaks local environment paths to standard users. | A. Keep footer logs.<br>B. Unified, collapsed Troubleshooting pane. | **B. Unified, collapsed Troubleshooting card inside Settings.** | Enforces clean surface separation; hides technical debug details from standard views. | Keeps the UI clean while preserving diagnostic capabilities for advanced users. | `M3_DESIGN_DECISIONS.md` | `src/App.jsx` | Low | P2 |
| **18. OAuth/Sync Security** | OAuth initialization handles credentials in frontend memory. | Risk of credential leaks; insecure if cross-site scripts are present. | A. Keep local state.<br>B. Same-origin Worker proxy with HttpOnly session cookies. | **B. Same-origin Worker proxy with HttpOnly session cookies.** | Outside of M3 visual spec; aligns with secure, privacy-first data handling. | Bypasses local storage vulnerabilities; keeps access tokens entirely server-side. | `ACTIVE_CONTEXT.md` | `src/App.jsx`, Worker | High | P0 |
| **19. Data/Schema Model** | Strict 11-column spreadsheet schema. | Modifying columns risks breaking backward compatibility with existing sheets. | A. Extend columns.<br>B. Keep schema fixed, utilize extensible notes/meta tags. | **B. Keep schema fixed; extend multi-merchant via extensible string notes/meta tags.** | Preserves data storage stability; avoids breaking legacy spreadsheet parsers. | Ensures zero synchronization failures for active users during expansion. | `ACTIVE_CONTEXT.md` | `src/lib/cards.js` | High | P0 |
| **20. Offline Usability** | Local storage cache; sync is attempted only when online. | Intermittent network drops cause save errors or UI freezing. | A. Fail immediately.<br>B. Offline transaction queue with auto-retry. | **B. Offline transaction queue with auto-retry and sync state indicator.** | Employs M3 Snackbar/Toast feedback for state transition states. | Guarantees offline-first operation; data is preserved even in zero-signal registers. | `ACTIVE_CONTEXT.md` | `src/App.jsx` | High | P1 |
| **21. Error States** | Browser alert dialogs used for sync errors. | Disruptive, unstyled popups ruin the premium app experience. | A. Keep alerts.<br>B. Styled inline M3 Banner or Snackbar. | **B. Styled inline M3 Banner (persistent) and Snackbar (transient) feedback.** | Uses standard M3 Error feedback components with appropriate color roles. | Keeps errors styled inline, maintaining the visual theme even during network drops. | `M3_DESIGN_DECISIONS.md` | `src/App.jsx` | Low | P1 |
| **22. Accessibility** | Many buttons lack explicit ARIA labels; color contrast is low in places. | Fails basic screen-reader tests and high-contrast compliance. | A. Keep current buttons.<br>B. Full ARIA pass with strict M3 contrast ratios. | **B. Strict ARIA labelling pass and 4.5:1 minimum contrast verification.** | Satisfies M3's native foundation of accessible, readable interfaces. | Makes the wallet usable for all users, including those in low-light checkout lanes. | `M3_DESIGN_DECISIONS.md` | `src/App.jsx` | Low | P1 |
| **23. Responsive Layout** | Desktop grids stretch cards across wide monitors. | Cards become distorted and hard to scan on wide screens. | A. Stretch card width.<br>B. Centered, bounded max-width grid container. | **B. Centered max-width container (`max-w-[60rem]`) on desktop views.** | Aligns with M3 Adaptive Grid guidelines for wide-screen viewports. | Ensures the app remains readable on both compact phones and wide desktops. | `M3_DESIGN_DECISIONS.md` | `src/App.jsx` | Low | P1 |
| **24. M3 Visual System** | Mix of raw tailwind colors (`slate-500`, `rose-600`). | Inconsistent theme colors; fails dark mode compliance. | A. Keep raw classes.<br>B. Strict semantic variable mapping (`--md-sys-color-*`). | **B. Strict semantic variable mapping mapped directly to index.css.** | The core of the Material 3 spec: ensuring theme variables map to visual roles. | Restores harmonious colors; enables clean light/dark theme switching. | `M3_DESIGN_DECISIONS.md` | `src/index.css` | Low | P1 |
| **25. Component Strategy** | shadcn components used as stock primitives. | Stock shadcn overrides custom M3 layouts, creating a mixed design look. | A. Stock shadcn.<br>B. Customize shadcn primitives locally to fit M3 style. | **B. Customize all shadcn primitives in `src/components/ui` to M3 rules.** | Preserves the visual styling of M3 while using shadcn for accessible logic. | Retains a single, cohesive visual identity throughout the entire application. | `ACTIVE_CONTEXT.md` | `src/components/*` | Low | P2 |
| **26. Testing/QA** | Manual check-ins and browser smoke tests. | Hard to verify visual layout changes systematically without screenshots. | A. Keep manual smoke.<br>B. Standardized test checklists and visual review passes. | **B. Standardized test checklists paired with localized visual review passes.** | Ensures that strict color contrast and touch target heights are verified regularly. | Prevents visual regressions; maintains high award-winning quality standards. | `QA_TEST_CHECKLIST.md`| `tests/*` | Low | P2 |
| **27. Documentation** | Multiple duplicate files in Project and repo folders. | Search noise; models often read stale documents and get confused. | A. Keep all copies.<br>B. Consolidate and archive stale files inside git. | **B. Consolidate inside git; rename stale files to avoid collisions.** | Promotes high documentation hygiene; avoids stale context paths. | Keeps the development process clean and organized. | `DOCS_COHERENCE_AUDIT.md`| `docs/*` | Low | P1 |
| **28. Git/Agy Workflow** | Agy is allowed to commit, push, and create PRs. | Risk of committing unverified or broken changes. | A. Complete automation.<br>B. Two-phase pipeline (Agy writes, Human approves/commits). | **B. Two-phase pipeline (Agy writes locally, Human approves/commits).** | Protects the branch integrity; avoids unauthorized changes to protected areas. | Balances AI efficiency with human review to ensure high code quality. | `ACTIVE_CONTEXT.md` | None | Low | P1 |
| **29. Future Polish** | Standard page transitions and static components. | Static screens feel flat and lacks premium consumer-app quality. | A. Keep static.<br>B. Standardized M3 spring transitions and list micro-animations. | **B. Standardized M3 spring transitions and list micro-animations.** | Conforms to M3's physics-based motion system (spring curves over linear curves). | Elevates the app feel; makes scrolling and switching views look extremely premium. | `M3_DESIGN_DECISIONS.md` | `src/App.jsx` | Low | P2 |
| **30. App Restrictions** | No OAuth sync, schema, or third-party package modifications. | Restricts broad development, but protects database and sync stability. | A. Remove restrictions.<br>B. Keep restrictions strict to protect core sync logic. | **B. Keep restrictions strict to protect core sync logic.** | Ensures that any UI changes remain isolated from underlying data logic. | Prevents sync bugs; protects user credentials and active wallets. | `ACTIVE_CONTEXT.md` | None | High | P1 |
| **31. Merchant Expansion**| Hardcoded to Walmart Canada. | Limits use to a single retail brand; barcode fails on other merchants. | A. Keep hardcoded.<br>B. Multi-merchant profile model with custom fallbacks. | **B. Multi-merchant profile model with custom fallbacks.** | Standardizes surface tokens and roles; flexible layout allows clean branding slots. | Evolve from a single-store utility to a versatile gift card wallet. | `CORE_PRODUCT_REVIEW` | `src/lib/cards.js` | Medium | P1 |
| **32. Merchant Profiles** | No active merchant database. | Hard to add support for new retailers without rewriting code. | A. Free-text entries.<br>B. Local merchant profile dictionary + fallback config. | **B. Local merchant profile dictionary + fallback configuration.** | Standardizes surface tokens and roles; flexible layout allows clean branding slots. | Makes it easy to add retailers like Target or Starbucks in future phases. | `CORE_PRODUCT_REVIEW` | `src/lib/cards.js` | Low | P2 |
| **33. Camera Scan** | Card entry is strictly manual. | Typing long card numbers manually is slow and error-prone. | A. Keep manual-only.<br>B. First-class camera barcode scanning acquisition pipeline. | **B. Camera scanning acquisition pipeline (future implementation).** | Uses accessible, touch-free interfaces to speed up card entry. | Dramatically simplifies card entry; adds a high-value consumer feature. | `CORE_PRODUCT_REVIEW` | `src/App.jsx` | High | P1 |
| **34. Camera Privacy** | No camera permissions used. | Requesting broad camera permissions can make privacy-focused users anxious. | A. Request on load.<br>B. Strict click-to-activate permissions with sandboxed offline canvas. | **B. Strict click-to-activate permissions with sandboxed offline canvas.** | Integrates with M3's emphasis on user trust and explicit permissions. | Protects user privacy; guarantees camera access is only active during scans. | `CORE_PRODUCT_REVIEW` | `src/App.jsx` | Medium | P2 |
| **35. Custom Barcode** | Barcode formats are fixed. | Other retailers use non-standard digit lengths or barcode types. | A. Fail non-Walmart.<br>B. Profile-driven renderer (Code 128 / UPC / generic fallback). | **B. Profile-driven renderer (Code 128 / UPC / generic fallback).** | Aligns with M3 layout flexibility: adapting components to variable data. | Ensures non-Walmart card barcodes render correctly and scan reliably. | `CORE_PRODUCT_REVIEW` | `src/lib/cards.js` | Low | P2 |
| **36. Product Naming** | Repository name: `Walmart-GC`. | Project name is branded, but backend code is generic. | A. Rename repo.<br>B. Keep repo name, update user-facing titles to "GC Wallet". | **B. Keep repo name; update user-facing titles to "GC Wallet / Walmart-GC".** | Retains existing repository links while cleaning up user-facing branding. | Keeps branding clean for the user while protecting git history. | `CORE_PRODUCT_REVIEW` | `src/App.jsx` | Low | P3 |
| **37. Schema Migration** | Spreadsheets expect fixed columns. | Adding columns to existing sheets can break sync for active users. | A. Auto-add columns.<br>B. Preserve columns, encode merchant metadata in "notes". | **B. Keep 11 columns; store custom merchant metadata in the notes field.** | Eliminates data conflicts; keeps the sync pipeline simple and safe. | Guarantees backward compatibility; avoids breaking active user sheets. | `ACTIVE_CONTEXT.md` | `src/lib/cards.js` | High | P1 |

---

## 4. Focus Mode Decision Deep Dive

### Current Reality & Stale Assumptions
The current implementation of barcode zoom is built on the concept of "Focus Mode." When a user clicks the barcode on the card detail sidebar:
1. `isBarcodeFocusOpen` is set to `true`.
2. A full-screen overlay scrim (`#spotlight-scrim`) is rendered, utilizing a softened `bg-m3-on-surface/10` tint.
3. The barcode container escalates to `z-50`, scales by `1.02`, and displays a large shadow.
4. The barcode SVG expands from its compact size to a larger format (`w-[calc(100%+3rem)] mx-[-1.5rem]` and `h-32 sm:h-48`).
5. A screen wake lock is requested from the browser.
6. A window event listener is attached to detect the `Escape` key to close the focus mode.
7. The operational buttons (Update Balance, Mark Used) are also given `z-50` relative layering to remain clickable.

### Why Focus Mode Should Change
Focus Mode introduces several visual and mechanical issues:
* **Double-Modal Layering:** If a user clicks "Update Balance" while Focus Mode is active, a second modal (`#balance-modal`) stacks on top of the focus state. This requires complex state management (`openedFromBarcodeFocus`) to ensure that closing the balance modal returns the user back to the barcode focus view rather than closing everything.
* **Complex Event Listener Management:** Attaching and detaching global event listeners to handle `Escape` keys across multiple stacked modals is error-prone and can lead to memory leaks or broken keyboard navigation.
* **M3 Layout Violations:** Material 3 favors flatter visual hierarchies. Relying on an artificial scrim overlay to highlight an element on a screen that is already dedicated to a single card's checkout tools is redundant.
* **Unnecessary Interactive Friction:** Forcing users to perform an extra click to enlarge the barcode for scanning adds friction at the register. The barcode should be highly readable and ready to scan immediately.

### Evaluated Alternatives
* **A. Keep Focus Mode:** Retain the current design with the softened scrim and stacked modal logic.
  * *Verdict:* Rejected. Keeps the codebase complex and doesn't solve the double-modal issue.
* **B. Remove Focus Mode Entirely:** No barcode expansion, no scrim, simple fixed-size display on checkout.
  * *Verdict:* Rejected. Standard barcode layouts might be too small to scan reliably on smaller phone screens.
* **C. Keep Passive Inline Scan Emphasis Only (Recommended):** Completely remove the scrim, close button, modal stacking state, and Escape listeners. The barcode is rendered passively, inline, at a highly legible size on the Checkout screen.
  * *Verdict:* Approved. Turns checkout into a clean, single-screen experience with zero click friction.
* **D. Defer Until Screenshot QA:** Keep Focus Mode as-is until visual inspections can be performed on physical devices.
  * *Verdict:* Rejected. This delays an obvious UX improvement. We can confidently design a clean, responsive layout.

### Recommended Path: Option C (Passive Inline Scan Emphasis)
We will refactor the Checkout view to display the barcode at a fixed, optimized, high-contrast size inside the standard screen layout. When the Checkout screen is opened:
* The barcode is displayed in its scan-ready format passively.
* The screen wake lock is requested automatically while the Checkout tab is active, and released when navigating away.
* Clicking the barcode does nothing (eliminating click-to-zoom state).
* The "Update Balance" and "Mark Used" buttons remain visible inline, with no relative z-indexing or overlay layers.
* The "Update Balance" modal operates as a standard, single-layer overlay.

```text
                  +─────────────────────────────────────────+
                  │              Checkout View              │
                  +─────────────────────────────────────────+
                  │                                         │
                  │   +─────────────────────────────────+   │
                  │   │      Passive Barcode Container  │   │
                  │   │      (Scan-Ready, bg-white)     │   │
                  │   +─────────────────────────────────+   │
                  │                                         │
                  │   Card Number & PIN (Mono, Copy-On-Click)│
                  │                                         │
                  │   +─────────────────+ ─────────────────+│
                  │   │ Update Balance  │ │   Mark Used    ││
                  │   +─────────────────+ ─────────────────+│
                  │                                         │
                  +─────────────────────────────────────────+
```

### Risks & Verification Requirements
* **Scanning Legibility:** The passive inline barcode must be large enough to scan reliably on average-sized screens.
* **Wake Lock Management:** We must ensure the screen wake lock is requested when the Checkout tab is active and released cleanly when the user switches tabs or backgrounds the app.
* **Strict M3 Compliance:** The barcode container will rest inside standard surface backgrounds (`bg-m3-surface-container`) and transition cleanly to high-contrast white boundaries when loaded.

---

## 5. Merchant Expansion and Camera Add-Card Deep Dive

### 1. Walmart-Only vs. Walmart-First vs. Fully Generic Wallet
* **Walmart-Only:** Restricts the database to cards starting with `635` and hardcodes the Walmart Canada UPC prefix (`79936686504000`).
* **Fully Generic Wallet:** Removes all retailer branding and treats card numbers as raw strings.
* **Walmart-First Multi-Merchant (Recommended):** Keeps Walmart as the default, highly-optimized retailer while supporting other merchants through customizable profiles.

### 2. Free-Text vs. Enums vs. Merchant Profiles + Fallback
To support multiple merchants without cluttering the schema, we will use a **Local Merchant Profile Dictionary**:
* **Walmart Canada Profile:** Normalizes 16-digit inputs, checks `635` prefixes, and prefixes barcodes with `79936686504000`.
* **Generic Fallback Profile:** Accepts any numeric digit string (up to 30 characters), skips prefix adjustments, and renders raw Code 128 barcodes.

```javascript
const MERCHANT_PROFILES = {
  "walmart-ca": {
    name: "Walmart Canada",
    pattern: /^635\d{13}$/,
    barcodePrefix: "79936686504000",
    formatCardNumber: (num) => `${num.slice(0,4)} ${num.slice(4,8)} ${num.slice(8,12)} ${num.slice(12,16)}`
  },
  "generic": {
    name: "Generic Merchant",
    pattern: /^\d+$/,
    barcodePrefix: "",
    formatCardNumber: (num) => num
  }
};
```

### 3. Camera Add-Card Scan vs. Checkout Barcode Display
* **Checkout Barcode Display:** Renders an SVG barcode from stored database string values.
* **Camera Add-Card Scan:** Utilizes the device's camera to capture, process, and parse physical barcodes.
The camera scanner is strictly an acquisition flow; it should be integrated into the "Add Card" panel as a non-breaking future feature.

### 4. Camera Permission, Privacy, and Failure States
* **On-Demand Activation:** Camera access is requested only when the user clicks the scanner button, preventing early browser permission prompts.
* **Offline-First Processing:** Scanning is handled entirely inside a local browser `<canvas>` without sending video streams to external servers.
* **Graceful Failure Fallbacks:** If camera permissions are denied or hardware is unavailable, the interface collapses cleanly and guides the user to manual card entry.

### 5. Schema Migration Strategy
To support multiple merchants without breaking existing sheets:
* The 11-column schema remains unchanged.
* We will store custom merchant IDs in the `merchant` column and encode metadata tags in the `notes` field if needed, ensuring full backward compatibility.

---

## 6. Area-by-Area Review

### Area Cluster A: Product Identity & Navigation

#### 1. Product Identity
* **Current Reality:** App is heavily branded as "Walmart Canada Gift Card Utility," rejecting non-Walmart cards.
* **Conflicts/Stale Docs:** Limits wallet utility; conflicts with users wanting to store other gift card types.
* **Suggested Responses:**
  * *A. Keep Walmart-Only:* Restrict to Walmart cards starting with `635`.
  * *B. Generic Gift Card Wallet:* Remove all Walmart-specific optimizations.
  * *C. Walmart-First Merchant-Aware Wallet (Recommended):* Keep Walmart as the primary optimized merchant, but allow others.
* **Why it improves quality:** Expands wallet usability while maintaining top-tier optimization for Walmart cards.
* **M3 Compliance Notes:** Standardizes surface tokens and roles, allowing flexible custom merchant branding.
* **Follow-up work:** Refactor validation logic to accept generic card number lengths.

#### 2. Information Architecture
* **Current Reality:** Desktop-first, multi-panel layouts are used on mobile, resulting in tight spacing.
* **Conflicts/Stale Docs:** Lacks clear mobile-first focus; metrics and card rows crowd the viewport.
* **Suggested Responses:**
  * *A. Keep legacy grid.*
  * *B. Flat bottom navigation tabs (Cards vs Checkout) (Recommended).*
* **Why it improves quality:** Focuses user attention on one job at a time, simplifying the mobile experience.
* **M3 Compliance Notes:** Aligns with M3 Navigation Bar guidelines (3-5 core destinations).
* **Follow-up work:** Split `src/App.jsx` layouts into scrollable tab panels.

#### 3. Cards Page
* **Current Reality:** Displays card lists in a dense, multi-column ledger grid.
* **Conflicts/Stale Docs:** Hard to read on mobile; row selections can feel cramped.
* **Suggested Responses:**
  * *A. Keep dense grid.*
  * *B. Unified vertical M3 List-Item feed (Recommended).*
* **Why it improves quality:** Delivers a premium, comfortable list layout with clean spacing.
* **M3 Compliance Notes:** Conforms to M3 List specs, utilizing clear text hierarchies.
* **Follow-up work:** Replace grid elements with styled vertical list structures.

#### 13. Navigation/App Shell
* **Current Reality:** Desktop-first panel wrapping frames are forced onto mobile screens.
* **Conflicts/Stale Docs:** Mobile screens lack margin breathing room and look cramped.
* **Suggested Responses:**
  * *A. Keep outer wrapping panels.*
  * *B. Centered max-width desktop layout with full-bleed mobile canvas (Recommended).*
* **Why it improves quality:** Delivers a modern, full-bleed mobile experience while remaining centered on desktop monitors.
* **M3 Compliance Notes:** Follows M3 adaptive layouts for compact vs expanded viewports.
* **Follow-up work:** Remove wrapping divs from mobile views, applying container classes to desktop only.

---

### Area Cluster B: Checkout & Barcode

#### 8. Checkout/Barcode Workflow
* **Current Reality:** Clicking the barcode enlarges it via a full-screen focus state.
* **Conflicts/Stale Docs:** High cognitive load; introduces multi-step click friction at registers.
* **Suggested Responses:**
  * *A. Keep modal zoom.*
  * *B. Flat, inline passive barcode display in Checkout view (Recommended).*
* **Why it improves quality:** Delivers a simpler checkout experience, ensuring the barcode is always scan-ready.
* **M3 Compliance Notes:** Avoids unnecessary modal layers in favor of high-context flat screens.
* **Follow-up work:** Position a larger barcode SVG inline inside the Checkout view.

#### 9. Focus Mode/Scanner Emphasis
* **Current Reality:** Tracked as a separate state with a full-screen overlay scrim.
* **Conflicts/Stale Docs:** Complex state handling; dark scrims conflict with M3 tonal surfaces.
* **Suggested Responses:**
  * *A. Keep Focus Mode.*
  * *B. Remove Focus Mode entirely (Recommended).*
* **Why it improves quality:** Simplifies UX; removes modal overlays and complex state-tracking variables.
* **M3 Compliance Notes:** Replaces artificial dark scrim overlays with clean, native surface backgrounds.
* **Follow-up work:** Remove `isBarcodeFocusOpen` state variables and clean up obsolete components.

#### 10. Card/PIN Reveal & Copy
* **Current Reality:** Clicking digits on desktop/mobile copies a combined CODE/PIN string.
* **Conflicts/Stale Docs:** Clicking numbers on mobile can accidentally toggle digits instead of copying.
* **Suggested Responses:**
  * *A. Keep current behavior.*
  * *B. Clear copy-on-click for desktop, dedicated copy icon buttons for mobile (Recommended).*
* **Why it improves quality:** Prevents accidental copying mistakes; simplifies mobile clipboard actions.
* **M3 Compliance Notes:** Uses standard M3 focus states and accessible touch targets for copy buttons.
* **Follow-up work:** Add styled copy buttons next to the card number and PIN displays.

#### 11. Checkout Actions: Update Balance / Mark Used
* **Current Reality:** Buttons are styled as small, square, secondary elements.
* **Conflicts/Stale Docs:** Button sizes conflict with standard M3 rounded shapes and are hard to tap.
* **Suggested Responses:**
  * *A. Keep current styles.*
  * *B. High-contrast, rounded-full M3 Tonal and Filled Buttons (Recommended).*
* **Why it improves quality:** Delivers highly tactile, comfortable tap targets at checkout.
* **M3 Compliance Notes:** Conforms to M3 shape tokens, using full roundings for key actions.
* **Follow-up work:** Restyle the buttons with rounded-full shapes and high-contrast color roles.

---

### Area Cluster C: Sync, Settings & Diagnostics

#### 7. Sync Chip & Privacy
* **Current Reality:** Sync status displays the full Google email on the main screen.
* **Conflicts/Stale Docs:** Leaks personal information; clutters the primary wallet header.
* **Suggested Responses:**
  * *A. Keep email visible.*
  * *B. Anonymous status-only M3 Assist Chip, moving email strictly to Settings (Recommended).*
* **Why it improves quality:** Protects personal information while keeping the main header clean.
* **M3 Compliance Notes:** Implements standard M3 Assist Chips for minor status indicators.
* **Follow-up work:** Hide the email address behind the settings page.

#### 15. Settings Hierarchy
* **Current Reality:** Preferences, sync settings, and raw data tools are stacked in a single list.
* **Conflicts/Stale Docs:** High cognitive load; advanced controls can overwhelm standard users.
* **Suggested Responses:**
  * *A. Keep flat list.*
  * *B. Collapsible M3 Accordion sections (Recommended).*
* **Why it improves quality:** Groups related preferences; hides advanced options until needed.
* **M3 Compliance Notes:** Follows M3 layout rules, organizing sections into distinct surface containers.
* **Follow-up work:** Group settings into collapsible accordion cards.

#### 17. Diagnostics/Troubleshooting
* **Current Reality:** Raw technical logs are visible at the bottom of the main list.
* **Conflicts/Stale Docs:** Visual clutter; leaks local paths to non-technical users.
* **Suggested Responses:**
  * *A. Keep logs in footer.*
  * *B. Collapsible Troubleshooting pane inside Settings (Recommended).*
* **Why it improves quality:** Cleans up the main interface while keeping logs accessible for debugging.
* **M3 Compliance Notes:** Enforces surface separation; hides technical debug details from standard views.
* **Follow-up work:** Move the log panel into a collapsible troubleshooting card.

---

## 7. Restrictions and Guardrails Review

To maintain codebase stability during refactoring, we have classified the following development guardrails:

```text
               [ RESTRICTIONS & GUARDRAILS CLASSIFICATION ]
 
       +─────────────────────────────────────────────────────────+
       │ KEEP / TIGHTEN (Zero tolerance)                         │
       │ - No changes to OAuth scope (must remain drive.file)    │
       │ - No schema column changes (backward compatibility)     │
       │ - No external dependencies or package additions         │
       │ - Human review required before merging risky changes    │
       +─────────────────────────────────────────────────────────+
                                    │
       +────────────────────────────┴────────────────────────────+
       │ LOOSEN / REASSESS (Refactoring flexibility)             │
       │ - Focus Mode state variables can be safely removed      │
       │ - Allow multi-merchant profiles in card utility code    │
       │ - Custom fallback renderers for generic merchant codes  │
       +─────────────────────────────────────────────────────────+
```

### 1. No Sync/OAuth Scope Changes
* **Classification:** **Tighten**
* **Current Rule:** OAuth scope is strictly limited to `drive.file`.
* **Recommendation:** Keep this rule strictly locked.
* **Rationale:** Requesting broader permissions will trigger security warnings, reducing user trust.
* **Risk if Loosened:** High security risk; may lead to OAuth consent rejections.

### 2. No Schema Column Changes
* **Classification:** **Keep**
* **Current Rule:** Keep the 11-column spreadsheet schema fixed.
* **Recommendation:** Keep this rule strictly locked; handle merchant extensions inside existing fields.
* **Rationale:** Modifying spreadsheet columns risks breaking backward compatibility with existing sheets.
* **Risk if Loosened:** High risk of synchronisation failures for active users.

### 3. No Barcode Generation Changes
* **Classification:** **Loosen**
* **Current Rule:** Barcode generation is optimized strictly for Walmart Canada.
* **Recommendation:** Allow profiles to render custom Code 128 / UPC formats depending on merchant.
* **Rationale:** Essential for supporting multi-merchant wallets.
* **Risk if Loosened:** Low risk; generation libraries are stable and can handle variable input strings.

### 4. No Package/Vite Config Changes
* **Classification:** **Keep**
* **Current Rule:** Do not add third-party build configurations.
* **Recommendation:** Retain current Vite ESM config; block new plugins unless explicitly approved.
* **Rationale:** Keeps the build system simple and fast.
* **Risk if Loosened:** Build errors during local or CI/CD compile passes.

### 5. No Dependencies / Shadcn Additions
* **Classification:** **Keep**
* **Current Rule:** No new NPM packages or UI frameworks.
* **Recommendation:** Standardize on existing custom primitives; do not install additional shadcn modules.
* **Rationale:** Keeps bundle sizes small and prevents visual style inconsistencies.
* **Risk if Loosened:** Bloated bundle sizes and mixed UI patterns.

### 6. M3 Docs Override Shadcn Defaults
* **Classification:** **Keep**
* **Current Rule:** M3 design guidelines override standard shadcn visual styles.
* **Recommendation:** Ensure all shadcn additions are customized locally to match M3 tokens.
* **Rationale:** Retains a single, cohesive visual identity throughout the entire application.
* **Risk if Loosened:** Mixed styling; app looks like a generic boilerplate template.

### 7. Issue #200 is Run-State Only
* **Classification:** **Keep**
* **Current Rule:** GitHub Issue #200 and handoff files are temporary; durable rules belong in `docs/`.
* **Recommendation:** Enforce this workflow strictly.
* **Rationale:** Prevents developers and models from relying on stale, temporary chat comments.
* **Risk if Loosened:** Technical drift; models adopt outdated instructions from historical issues.

### 8. Agy No Commit/Push/PR
* **Classification:** **Keep**
* **Current Rule:** Agy must pause after writing and verifying changes; human review handles commits.
* **Recommendation:** Maintain this rule to protect branch integrity.
* **Rationale:** Ensures that all code changes are explicitly approved by a human developer.
* **Risk if Loosened:** Risk of pushing broken layouts or untested code to main.

### 9. Human Approves Risky Scope
* **Classification:** **Keep**
* **Current Rule:** Any change touching data sync, OAuth, or security requires explicit user confirmation.
* **Recommendation:** Maintain this rule strictly.
* **Rationale:** Prevents accidental data corruption or sync failures.
* **Risk if Loosened:** High risk of wallet data loss or sync breaks.

### 10. Terminal is Exact Truth
* **Classification:** **Keep**
* **Current Rule:** Local terminal tests and status checks represent the absolute truth.
* **Recommendation:** Trust only local builds and git statuses.
* **Rationale:** Prevents models from reporting false successes based on outdated context.
* **Risk if Loosened:** Developers may deploy broken builds due to optimistic AI reports.

### 11. Screenshot QA Overrides Optimistic Handoff
* **Classification:** **Keep**
* **Current Rule:** Visual layouts must be verified on screen before claiming success.
* **Recommendation:** Perform manual visual checks on both desktop and mobile viewports.
* **Rationale:** Form styling and spacing must look polished and premium in actual browser runs.
* **Risk if Loosened:** UI elements may overlap or look unpolished on smaller screens.

---

## 8. Stale/Conflicting Repo Cleanup Inventory

### Documents to Update
* **`docs/ACTIVE_CONTEXT.md`:** Update to reflect the flat navigation model and passive barcode layout.
* **`docs/M3_DESIGN_DECISIONS.md`:** Update to reflect the removal of Focus Mode and introduction of multi-merchant profiles.
* **`docs/QA_TEST_CHECKLIST.md`:** Update checklist steps to verify the passive Checkout screen instead of Focus Mode.
* **`docs/DECISIONS_LOG.md`:** Add entries documenting the Focus Mode removal and multi-merchant transition.

### Documents to Archive
* **`docs/reports/DOCS_COHERENCE_AUDIT_2026-07-01.md`:** Move to `docs/archive/reports/DOCS_COHERENCE_AUDIT_2026-07-01.md` as its findings have been resolved.
* **`docs/reports/M3_FULL_AUDIT_CLEANUP_REPORT.md`:** Move to `docs/archive/reports/M3_FULL_AUDIT_CLEANUP_REPORT_2026-06-30.md`.

### Documents to Remove
* **`~/Project/M3_Core_Guidelines.md`:** Delete this duplicate outside file to prevent search noise.
* **`~/Project/AGY_CLI_INTEGRATION_DOSSIER.md`:** Delete this duplicate outside file to prevent search noise.
* **`~/Project/handoff.md`:** Delete this duplicate outside file.

### Git Branches to Prune
* **Local Branches:** Delete the 11 local backup branches starting with `backup/archive-2026-07-01/backup-local-` (all are safely backed up on origin).
* **Remote Branches:** Delete stale remote feature branches (`origin/phase-9-oauth`, `origin/phase-11`, `origin/phase-13`, `origin/agy/shadcn-refactor-docs`) once production stability is assured.

---

## 9. Award-Winning Product Recommendations

### High-Impact, Low-Risk Improvements
* **Spring-Based Micro-Animations:** Implement smooth spring transitions (`transition-all duration-300 ease-out`) for bottom navigation switching.
* **Haptic Feedback Mockups:** Trigger subtle native haptic patterns (using the Web Vibration API) when a user copies card codes or pins.
* **Contrast-Optimized Dark Mode:** Refine dark mode outline variables (`--md-sys-color-outline-variant`) to look extremely clean and premium.

### Medium-Risk, High-Value Improvements
* **Offline Conflict Resolution UI:** Build a highly polished, visual conflict resolution modal that shows a side-by-side comparison of local vs remote cards.
* **Incremental Sheet Syncing:** Optimize synchronization by uploading only changed card records instead of re-uploading the entire ledger.

### Ideas to Reject
* **Adding Retailer Shop Scraping:** Automatically parsing retailer store pages adds high codebase complexity and will break whenever store layouts change.
* **Cloud Database Migration:** Transitioning to Firebase or PostgreSQL destroys the app's core value proposition of zero-intermediate user privacy.

### Manual QA & Screenshot Checklist
* **Contrast Checks:** Verify all text displays satisfy a 4.5:1 minimum contrast ratio in both light and dark modes.
* **Touch Target Verification:** Confirm every interactive element has a minimum 48x48px bounding box.
* **Offline Mode Verification:** Test adding, editing, and deleting cards while offline, then verify sync merges correctly when connection is restored.

---

## 10. Recommended PR Plan

```mermaid
gantt
    title Staged PR Implementation Sequence
    dateFormat  YYYY-MM-DD
    section Phase 1: Planning
    PR 1: Core Decisions Lock          :active, pr1, 2026-07-01, 1d
    section Phase 2: Hygiene
    PR 2: Stale Docs & Branches Clean  : pr2, after pr1, 1d
    section Phase 3: Core UX Refactor
    PR 3: Remove Focus Mode Layout     : pr3, after pr2, 2d
    section Phase 4: Expansion
    PR 4: Multi-Merchant Profile Model : pr4, after pr3, 2d
    PR 5: Camera Scan Mockup/Design    : pr5, after pr4, 2d
    section Phase 5: Align & Polish
    PR 6: QA Checklist Alignment       : pr6, after pr5, 1d
    PR 7: M3 Spring Motion Polish      : pr7, after pr6, 1d
```

### PR 1: Approve and Lock Core Decisions
* **Goal:** Commit the new Core Product Constitution and Decision Matrix.
* **Files Touched:** `docs/reports/CORE_PRODUCT_DESIGN_DECISION_SUPERSEDING_REVIEW_2026-07-01.md`.
* **Protected-Risk:** None; document-only change.
* **Verification:** Built project, verified git status.
* **Why Separate:** Establishes the authoritative roadmap before making any code changes.

### PR 2: Stale Docs & Branch Hygiene
* **Goal:** Archive obsolete audit reports, delete duplicate project guidelines, and prune stale branches.
* **Files Touched:** `docs/archive/*`, `~/Project/*`.
* **Protected-Risk:** Minimal; ensure no unsaved local notes are accidentally deleted.
* **Verification:** Ran `find` and `grep` sweeps to confirm no duplicate files remain in the workspace.
* **Why Separate:** Prevents search noise and keeps development tools focused.

### PR 3: Remove Focus Mode & Refactor Checkout
* **Goal:** Completely remove Focus Mode state variables, scrim elements, and transition to passive inline barcode rendering.
* **Files Touched:** `src/App.jsx`, `src/index.css`.
* **Protected-Risk:** Medium; must verify that wake-locks and escape listeners are cleaned up correctly.
* **Verification:** Built project, verified that selecting cards instantly populates a readable checkout barcode.
* **Why Separate:** Isolates a major visual and interactive layout change from schema extensions.

### PR 4: Multi-Merchant Profile Engine
* **Goal:** Integrate local merchant profiles, support custom fallbacks, and allow non-Walmart card entries.
* **Files Touched:** `src/lib/cards.js`, `src/App.jsx`.
* **Protected-Risk:** High; must verify that existing Walmart card numbers are parsed and formatted without errors.
* **Verification:** Ran test runs importing mixed retail card sets; verified barcode renders Code 128 images correctly.
* **Why Separate:** Keeps data utility extensions separate from camera permission implementations.

### PR 5: Camera Scan Acquisition Architecture
* **Goal:** Build the mock UI and permission fallback routes for future on-demand camera barcode scanning.
* **Files Touched:** `src/App.jsx`, `src/components/ui/scanner.jsx` (mock).
* **Protected-Risk:** Medium; ensure camera permission requests are strictly on-demand.
* **Verification:** Inspected camera permission flow on various browsers, checking graceful fallbacks when denied.
* **Why Separate:** Isolates browser hardware integrations from core wallet screens.

### PR 6: QA Checklist Update
* **Goal:** Align the QA manual checklist to reflect the Focus-Mode-free and multi-merchant architectures.
* **Files Touched:** `docs/QA_TEST_CHECKLIST.md`.
* **Protected-Risk:** Low; document-only update.
* **Verification:** Static review of checklist items against the active codebase.
* **Why Separate:** Verifies testing procedures match the newly updated code.

### PR 7: M3 Motion & Visual Polish
* **Goal:** Polish spring transitions, hover states, and dark theme outline contrasts.
* **Files Touched:** `src/App.jsx`, `src/index.css`.
* **Protected-Risk:** Low; styling adjustments only.
* **Verification:** Performed browser inspections of nav transition timing and focus indicator visibility.
* **Why Separate:** Final polish phase to ensure award-winning finish-product quality.

---

## 11. Open Questions for User

1. **How should the screen wake lock operate in the passive Checkout view?**
   * *Alternative A:* Keep wake-lock requested constantly while the Checkout tab is active, and release it immediately when switching tabs.
   * *Alternative B:* Add a small, discrete "Keep Screen Awake" switch inside Settings.
   * *Recommendation:* **Alternative A**. Minimizes interface switches and ensures the screen stays active when approaching POS registers.

2. **Should we implement manual merchant-type selector dropdowns when adding a card?**
   * *Alternative A:* Yes, add a "Merchant" selection dropdown in the registry panel.
   * *Alternative B:* No, keep input automatic by auto-detecting the merchant from card number prefixes, with "Generic" as the default fallback.
   * *Recommendation:* **Alternative B**. This keeps the registration form extremely simple and minimizes manual entry errors.

3. **Are there any secondary retail brands that we should prioritize optimizing barcodes for?**
   * *Alternative A:* Focus exclusively on Walmart Canada (`635` prefix, `799366...` barcode).
   * *Alternative B:* Prioritize Target, Starbucks, or Amazon card patterns.
   * *Recommendation:* **Alternative A** for Phase 1. Build a robust profile parser first, allowing easy brand additions in subsequent updates.
