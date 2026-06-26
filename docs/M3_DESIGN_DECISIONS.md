# Material 3 Design Decisions

This document serves as the durable repository documentation for locked design decisions and the strict phased Material 3 overhaul. It is the primary design source of truth.

> [!IMPORTANT]
> **Production Parity Rule**: Current production visuals are **NOT** the source of truth if and when they conflict with the locked Material 3 design decisions outlined below. Existing production visual layout is implementation history, not design truth.

---

## Agent Behavior Rules

1. **Role Division**:
   - **GPT** acts as the visual/design reviewer and decision framer.
   - **Agy CLI** acts as the local repo-aware implementer/verifier.
2. **Design Source of Truth**:
   - Agents must use [M3_DESIGN_DECISIONS.md](file:///home/godfreymiu/Walmart-GC/docs/M3_DESIGN_DECISIONS.md) and [M3_Core_Guidelines.md](file:///home/godfreymiu/Walmart-GC/docs/reference/M3_Core_Guidelines.md) as the absolute source of truth for UI decisions.
   - Current production UI styles are not the source of truth when they conflict with locked M3 decisions.
3. **Behavioral Integrity**:
   - Preserve application behavior and data logic unless a task explicitly authorizes behavior changes.
4. **Architectural UI Refactoring**:
   - For visual UI work, replace flawed visual architecture when authorized instead of micro-patching symptoms.
   - If multiple adjacent visual issues share one root cause, use the relevant M3 component architecture rather than one-off padding/label fixes.

---

## M3 Reference Source

* **Guidelines Reference**: [M3_Core_Guidelines.md](file:///home/godfreymiu/Walmart-GC/docs/reference/M3_Core_Guidelines.md) is the local Material 3 reference for agents.
* **Instruction**: Agents must read [M3_Core_Guidelines.md](file:///home/godfreymiu/Walmart-GC/docs/reference/M3_Core_Guidelines.md) before conducting any M3-sensitive implementation.

---

## Phased M3 Overhaul Plan

1. **Phase 1: Cards Final Polish** (Completed)
   - Refine card lists, metric values, and sync status elements.
   - Lock visual/typographic layout properties using semantic CSS class roles.
2. **Phase 2: Bottom Navigation / App Shell** (Current / Phase 2A)
   - Re-evaluate bottom navigation bar layouts and global outer padding/insets.
3. **Phase 3: Checkout Scanner**
   - Streamline scanner/scrim presentation logic.
4. **Phase 5: Diagnostics/Troubleshooting Cleanup**
   - Refactor diagnostics pane into a unified Troubleshooting container.
5. **Phase 4: Settings Hierarchy**
   - Complete reorganization of preferences controls.
6. **Phase 6: Final M3 Audit**
   - Conduct app-wide audit for responsive layout spacing, color tones, and accessibility targets.

---

## Phase 2A Authority

The next consolidated visual pass (Phase 2A) is authorized to change these components/styles together:
* **App shell visual structure**
* **Mobile Cards surface model**
* **Bottom navigation bar**
* **Cards metric strip**
* **Cards toolbar/status/sort row**
* **Cards list rows and selected state**
* **Content spacing/insets/safe-area handling**
* **Shared M3 class roles**

### Out of Scope for Phase 2A (Unless explicitly authorized)
* **Sync, OAuth, or data logic**
* **CSV / storage / worker / package / vite / Tailwind config** (except for the approved narrow mapping exception below)
* **Barcode generation**
* **Broad Settings hierarchy implementation**
* **Checkout scanner behavior overhaul**

### Approved Tailwind Config Exception
* **Narrow Mapping**: The user approved a narrow Tailwind config exception for semantic M3 token mapping:
  - `tailwind.config.js` may map the existing `m3` color family to CSS custom properties.
  - This exception does not authorize new dependencies, broad Tailwind config changes, package/build config changes, or design-system expansion.

### Reference and Visual Review Rules
* **Production Parity (Phase-12)**: Production `phase-12` may be used as a color-palette reference only, not layout/design authority.
* **Checkout/Barcode/Notes Reviews**: Checkout/barcode/notes color-only changes must be reviewed visually before commit if they appear in an app-shell/Cards color pass.

---

## Locked M3 Decisions

### 1. Cards Metrics: Strict M3 Labeled Pair
* **Metric Labels**: Use compact semantic labels: `Available balance` and `Visible cards` (low-emphasis, small font).
* **Metric Values**: Placed directly below or paired next to their respective labels clearly (e.g. `$247.24` and `17`).
* **Anti-Clutter Guardrail**: Do **NOT** restore legacy dashboard clutter labels (e.g. `Total Wallet Assets`, `Card Counts`, `displayed / registered`, or `17 / 21 on Cards`).

### 2. Mobile Surface Model: Strict M3 Mobile-First
* **No Outer Panels**: Avoid large desktop-style white backgrounds/panels wrapping the page on mobile viewports. No large outer panel on mobile.
* **Surface Hierarchy**: Page background (slate-100 or default surface) acts as the base canvas. The metrics strip, toolbar controls, and individual card rows serve as the elevated surfaces.
* **Desktop Centering**: Maintain a readable centered layout with bounded maximum width (`max-w-[60rem]`) on desktop views.

### 3. Bottom Navigation and Header Visual Identity
* **M3 Navigation Bar**: Overhaul to implement a strict M3 Navigation Bar layout. Bottom nav active state is styled with a subtle border highlight (`border border-m3-primary/20`) over the `m3-primary-container` fill for distinct visual recognition.
* **Top Header Visual Identity**: Header carries the primary container fill (`bg-m3-primary-container` and `text-m3-on-primary-container`) with custom properties referencing a production-inspired Walmart blue seed (#0071dc) to restore color identity while satisfying strict M3 semantic color roles.
* **Current Scope**: Authorized under Phase 2A for full alignment with M3 spacing and layout.

### 4. Cards Rows: Strict M3 List-Item Model
* **Dimensions**: Strict 48px to 56px touch targets.
* **Text Presentation**: Highly legible card number display without expanding the physical box height.
* **Amounts**: Right-aligned, tabular (mono) formatting with slight emphasis.
* **Selected Row State**: Restrained tonal primary-container highlight (`bg-[#d3e3fd]` in light theme) with subtle borders. No layout shift/jump or heavy shadows.

### 5. Sync & Status Identity: Privacy-First Chip
* **Status Pill**: Show privacy-safe, system-level labels on the Cards screen:
  - `Google sync on`
  - `Local only · Connect`
  - `Syncing…`
  - `Sync issue`
* **Account Info**: Do **NOT** show full Google emails, usernames, or account handles on the primary list screen. Defer detailed credential profiles/full account details strictly to Settings.

### 6. Checkout Scanner
* **Modal Scrim**: Strict non-modal M3 scrim, with a fallback to optimized no-darken or deliberate fullscreen scanner if warranted.

### 7. Settings Hierarchy
* **Restructuring**: Redesign of preferences, syncing options, and backup configurations to match a strict M3 hierarchy.

### 8. Diagnostics
* **Troubleshooting Pane**: Cleanup and grouping of app-level runtime diagnostics logs into a collapsed Troubleshooting container.

### 9. Typography: Strict M3 Type-Role System
* Use strict type rhythm, weight, contrast, and family settings (Outfit for sans-serif text, Roboto Mono/mono for tabular values/numbers).

### 10. Visual M3 Compliance Cleanup
* **Diagnostics/Technical Details**: Grouped diagnostics and logs under a collapsed `Troubleshooting` card pane. Removed versioning, fingerprints, and local device environment rows.
* **Checkout Overlay Overhaul**: Styled with `--md-sys-color-surface` base background, M3-rounded borders, and no darkened scrim. Removed brightness advice, Reveal/Hide label noise, and optimized button structure with high contrast update/mark states.
* **Google Privacy Guardrail**: Avoid displaying the Google account email or personal identifiers in main list, settings status, or checkout screens to maintain strict privacy compliance.
* **Low-Friction Tokens**: Swapped remaining raw colors (`slate`, `rose`, `amber`, `white`, `black` labels/cards/borders/toggles) for semantic `--md-sys-color-*` variables mapping standard light/dark modes.

---

## Reassessment and Guardrails (Reassessment Rule)

> [!CAUTION]
> **Pause and Report Rule**: Instead of forcing a change, agents must pause the workflow, log the conflict, and report to the user for reassessment if:
> 1. Strict M3 adherence worsens the real checkout/card-management task flow.
> 2. Implementation requires brittle fixed offsets or viewport hacks.
> 3. Privacy exposure would increase (such as showing account email on public Cards/Checkout views).
> 4. Sync, OAuth, data, CSV, storage, or barcode behavior would be touched unintentionally.
> 5. Visual changes exceed the authorized phase scope (e.g. editing elements outside of Phase 2A).
> 6. Screenshot QA shows the implementation is still visibly off despite passing build.
