# React UX Decisions Log

Record of direct user UX decisions and AI-made UX decisions for the React + Vite + Tailwind migration of Walmart-GC. Recording these decisions ensures durability, debugging, audits, conflict detection, refinement, scalability, and token efficiency.

## Core Rules

1. All key UX/UI modifications, deviations from legacy layout semantics, and interface behaviors (especially those requested by the user or derived by AI) must be documented in this log.
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
  - If opened from the **Barcode Focus modal**, cancelling, closing, or escaping the Update Balance modal returns the user back to the Barcode Focus overlay (preserving context). Saving the balance updates the value and cleanly closes both modals. [User direction & AI review]

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

---

## Manual QA Verification Passes

### Pass 1: React Visual Parity & Focus Modal (2026-06-23)
* **Status**: Passed (User-reported & verified)
* **Details**: Update Balance modal overlay flow, barcode focus stacking/layering, amount used calculations, and recent visual parity alignments look good with no observed runtime errors.
