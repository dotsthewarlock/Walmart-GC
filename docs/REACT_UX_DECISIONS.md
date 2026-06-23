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
  - If opened from the **Barcode Focus modal**, cancelling, closing, or escaping the Update Balance modal returns the user back to the Barcode Focus overlay (preserving context). Saving the balance updates the value and cleanly closes both modals.
