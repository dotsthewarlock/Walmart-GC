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
