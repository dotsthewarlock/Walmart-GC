# Decisions Log

Record of key decisions, architecture designs, user UX choices, and AI-made decisions for Walmart-GC. Recording these decisions ensures durability, debugging, audits, conflict detection, refinement, scalability, and token efficiency.

## Core Rules

1. All key architectural, database/schema, synchronization, and UX/UI decisions (especially deviations, constraints, or user preferences) must be documented in this log.
2. Future changes should check this log to avoid regressions and design conflicts.

---

## Logged Decisions

### 1. Update Balance Popup Modal (2026-06-23)
* **Context**: Legacy/early migration inline balance inputs in the Checkout sidebar were hard to access or hidden after barcode focus mode was triggered. Phase-12 expects a focused overlay.
* **Decision**: 
  - Restored a single, shared page-level overlay modal (`#balance-modal`) rendered outside normal Checkout panel and barcode focus mode.
  - Replaced inline inputs in the Checkout sidebar with a simple persistent "Update Balance" button.
* **UX/Interaction Details**:
  - Modal defaults to the **Amount Used** field and triggers `autoFocus`.
  - Dynamically calculates the **Remaining Balance** (`currentBalance - amountUsed`) in real-time, providing the remaining balance as a secondary editable field for bidirectional input updates.
  - On Save, applies the updated remaining balance and automatically closes the modal.
  - On Cancel/X/Escape, closes the modal without changes.
  - *Legacy Note*: If opened from the **Barcode Focus modal**, cancelling, closing, or escaping the Update Balance modal used to return the user back to the Barcode Focus overlay. *[SUPERSEDED on 2026-07-01]*: Since Focus Mode was deprecated and removed as a product concept, the Checkout view now serves as a single-screen, non-modal passive inline scanner. Therefore, this layered modal context return is no longer active in modern run-states. [User direction & AI review]

### 2. Card Detail Swipe & Navigation Boundary (2026-06-23)
* **Context**: Deciding card transition behaviors at the edge of the inventory index arrays during mobile swipe or button navigation.
* **Decision**: Enforce non-cycling swipe navigation. Swiping left/right or clicking Previous/Next halts when reaching the beginning or end of the visible card collection instead of wrapping around. [AI implementation review]

### 3. Ledger Layout & Metrics Banner (2026-06-23)
* **Context**: Retention of inventory grid structure and aggregated summary counters.
* **Decision**: Keep the dense Card Ledger grid layout and the Cards Summary metrics banner (displaying total active cards and sum balance values) at the top of the list panel. [User direction]

### 4. Checkout Operational Panel Structure (2026-06-23)
* **Context**: Formatting interface controls inside the secondary detail layout.
* **Decision**: Preserve the dedicated Checkout operational panel structure for managing single-card focus tools, sorting indicators, and diagnostic panels. [AI implementation review]

### 5. Material 3 Audit Polish (2026-06-23)
* **Context**: Bounded audit of Material 3 compliance targeting local UI elements.
* **Decision**:
  - Polished close buttons (✕) in the Fullscreen Barcode Modal and Update Balance Modal to increase their touch targets to a minimum of 48x48px, adding circular hover/focus states to improve accessibility.
  - Added visible, high-contrast focus rings (focus-visible) to key interactive buttons (#nav-list, #nav-detail, #open-settings, #prev-card, #next-card, #barcode-open, #open-balance-modal, #mark-used, and fullscreen variants) to improve keyboard navigation and usability.
  - Extended high-contrast focus rings (focus-visible) to all remaining settings buttons (#connect-google, #disconnect-google, Google Sheet sync actions, CSV import/export, raw editor lock/refresh/update, and modal Cancel/Save/Done buttons) and increased vertical padding to 14px (py-3.5) on smaller interactive buttons to ensure a minimum 48px touch target height.

### 6. Material 3 Surface and Navigation Polish (2026-06-24)
* **Context**: One-shot bounded polish to refine surface hierarchy, icon button shapes, selection states, and navigation visual hierarchy.
* **Decision**:
  - Softened nested borders and background surfaces in card details and modals to reduce visual noise.
  - Circularized the settings gear icon button to align with circular close buttons (✕), normalizing icon button geometry.
  - Calibrated the selected card list item style to a subtle tonal tint (`border-[#0b57d0]/30 bg-[#0b57d0]/5`) to reduce high-contrast visual weight.
  - Lightened secondary navigation actions (Previous/Next, Back) to lower emphasis compared to primary triggers.

### 7. Product Identity & Core Scope (2026-07-01)
* **Context**: Redefining the user-facing branding and determining the app's structural boundaries to prevent scope creep.
* **Decision**:
  - Normalize target user-facing identity/branding to **GC Wallet**.
  - Keep `Walmart-GC` strictly as the current repository and deployment identifier (until a separate, dedicated infrastructure rename plan is executed).
  - Declare that the app is **NOT** a SaaS wallet, developer-owned card database, receipt tracker, shopping app, loyalty optimizer, payment app, general finance tracker, or barcode/fraud-enablement tool.
  - Define Walmart as the first optimized merchant profile, rather than a long-term product boundary; the app evolves into a Walmart-first, merchant-aware gift-card wallet.

### 8. Focus Mode Deprecation & Checkout Scanner Passive/Inline Conversion (2026-07-01)
* **Context**: Simplification of checkout workflow, elimination of stacked modal layers, and reduction of visual noise.
* **Decision**:
  - Completely deprecate "Focus Mode," "scanner focus mode," "scanner mode," and any separate fullscreen barcode modals.
  - Display the barcode passively and inline directly inside the Checkout screen. The container must be scan-ready, passive, resting in a stable surface-container (`bg-m3-surface-container`), and opening a white background (`bg-white`) within its borders.
  - Remove all darkened scrim overlays (`bg-m3-on-surface/40`), spotlight scrims, and backdrop blurring on the checkout viewport.
  - Allow Screen Wake Lock only as a passive, best-effort browser convenience that activates strictly when the Checkout tab is active and releases when navigating away.
  - Restrict camera access to explicit, user-initiated add-card barcode scan triggers. No camera requests are permitted on application load, list screens, checkout screens, or passive transitions.

### 9. Privacy, Account Exposure, and Security Boundaries (2026-07-01)
* **Context**: Aligning marketing/privacy claims with code reality and protecting personal user data.
* **Decision**:
  - Align all privacy and local-first claims strictly with actual code capabilities: card numbers, PINs, and balances are cached in standard, unencrypted client-side browser storage (`localStorage`) and synced directly to the user's private Google Sheet. Do not claim encrypted browser storage unless verified.
  - Enforce Google privacy guardrails: full Google account details, email addresses, names, and profile avatars must be restricted strictly to Settings/Account surfaces and must never leak into primary Cards or Checkout screens.
  - Keep the OAuth scope protected and narrow: use strictly `https://www.googleapis.com/auth/drive.file` via same-origin HttpOnly Worker session cookies; no frontend token exposure; no central card aggregation.

### 10. Design & Navigation Authority (2026-07-01)
* **Context**: Establishing Material 3 as the sole visual design authority and structuring settings.
* **Decision**:
  - Affirm Material 3 (M3) as the absolute design authority; project-owned strict-M3 React/Tailwind primitives are the visible UI path, and shadcn has been removed as a project component-system dependency.
  - Historical reports may still mention shadcn, but those references are superseded by commit `889397a` and are retained only as archive evidence.
  - Overhaul navigation to use a phone-first M3 Navigation Bar with stable, flat, thumb-accessible top-level destinations: **Cards** (index/ledger) and **Checkout** (scanner panel).
  - Lock metrics to strict M3 labeled pairs: `Available balance` and `Visible cards`. Do not restore stale dashboard terms like "Total Wallet Assets", "Card Counts", "displayed/registered", or "Vault Inventory".
  - Standardize row layouts using the M3 list-item model: compact, stable 48px to 56px height, right-aligned tabular (mono) balance values, and a tonal primary-container selected fill.
  - Group settings into clean, collapsible M3 Accordion container cards (Google Sync, Preferences, Backup & CSV Actions, Troubleshooting, Account) with diagnostics collapsed by default and zero git tracking/fingerprint version noise in normal UI.

### 11. Durable Roadmap Lanes & Strategic Intent (2026-07-01)
* **Context**: Outlining future roadmap features without authorizing immediate implementation or creating code TODOs.
* **Decision**:
  - Establish four clear roadmap lanes to segment strategic intent:
    1. *Approved Durable Decisions*: Removal of Focus Mode, passive inline barcode scanning, passive wake locks.
    2. *Near-Term*: Stale documentation and branch pruning, multi-merchant local profile schema helpers.
    3. *Future Beta*: Camera-based add-card barcode scanning, merchant-dependent gift-card balance-check assist (best-effort, manual fallback, no broad credential capture, no CAPTCHA/scraping), merchant profile architecture, schema vNext planning, optional dedicated phone-app/PWA/native-wrapper.
    4. *Not Approved*: CAPTCHA-bypassing scrapers, automated balance checks requiring raw credentials, central database storage.

---

## Manual QA Verification Passes

### Pass 1: React Visual Parity & Focus Modal (2026-06-23)
* **Status**: Passed (User-reported & verified)
* **Details**: Update Balance modal overlay flow, barcode focus stacking/layering, amount used calculations, and recent visual parity alignments look good with no observed runtime errors.
