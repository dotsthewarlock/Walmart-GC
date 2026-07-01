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

### Locked M3 Decisions

### 1. Cards Metrics: Strict M3 Labeled Pair
* **Metric Labels**: Use compact semantic labels: `Available balance` and `Visible cards` (low-emphasis, small font).
* **Metric Values**: Placed directly below or paired next to their respective labels clearly (e.g. `$247.24` and `17`).
* **Anti-Clutter Guardrail**: Avoid legacy dashboard jargon. Do **NOT** restore labels like `Total Wallet Assets`, `Card Counts`, `displayed / registered`, or a `17 / 21` denominator.

### 2. Mobile Surface Model: Strict M3 Mobile-First
* **No Outer Panels**: Avoid large desktop-style white backgrounds/panels wrapping the page on mobile viewports. No large outer panel on mobile.
* **Surface Hierarchy**: Page background (slate-100 or default surface) acts as the base canvas. The metrics strip, toolbar controls, and individual card rows serve as the elevated surfaces.
* **Desktop Centering**: Maintain a readable centered layout with bounded maximum width (`max-w-[60rem]`) on desktop views.

### 3. Bottom Navigation and Header Visual Identity
* **M3 Navigation Bar**: Overhaul to implement a strict M3 Navigation Bar layout. Bottom nav active state is styled with a subtle border highlight (`border border-m3-primary/20`) over the `m3-primary-container` fill. Standard destinations are flat, stable, and thumb-accessible: **Cards** (index/ledger) and **Checkout** (scanner panel). Settings is accessed via an IconButton in the top-right of the Header.
* **Top Header Visual Identity**: Header carries the primary container fill (`bg-m3-primary-container` and `text-m3-on-primary-container`) with custom properties referencing a production-inspired Walmart blue seed (#0071dc) to restore color identity while satisfying strict M3 semantic color roles.
* **Product Identity**: Target user-facing product branding is **GC Wallet**, while retaining `Walmart-GC` as the repository and deployment identifier.

### 4. Cards Rows: Strict M3 List-Item Model
* **Dimensions**: Strict 48px to 56px touch targets.
* **Text Presentation**: Highly legible card number display without expanding the physical box height.
* **Amounts**: Right-aligned, tabular (mono) formatting with slight emphasis.
* **Selected Row State**: Restrained tonal primary-container highlight (`bg-[#d3e3fd]` in light theme) with subtle borders. No layout shift/jump or heavy shadows.

### 5. Sync & Status Identity: Privacy-First Chip
* **Status Pill**: Show privacy-safe, system-level labels styled as a compact inline M3 Assist Chip next to the section heading rather than a full-width block banner:
  - `Google sync on`
  - `Local only · Connect`
  - `Syncing…`
  - `Sync issue`
* **Account Info**: Do **NOT** show full Google emails, usernames, or account handles on the primary list screen. Defer detailed credential profiles/full account details strictly to Settings.

### 6. Checkout Scanner: Passive & Inline
* **No Focus Mode**: Remove "Focus Mode," "scanner focus mode," "scanner mode," barcode modal, and separate fullscreen barcode state.
* **Passive Inline Layout**: The barcode container resides passively and inline directly inside the Checkout screen. It is scan-ready, high-contrast, and large enough for mobile/register scanners, resting in a stable surface-container (`bg-m3-surface-container`) and opening high-contrast scan-safe surfaces (`bg-white`) within its borders.
* **No Scrim Overlay**: Remove the artificial darkened scrim overlay (`bg-m3-on-surface/40`), spotlight scrim, and backdrop blurs on the checkout viewport.
* **Screen Wake Lock**: Allowed strictly as a passive, best-effort browser convenience that activates only while the Checkout tab is active and releases when navigating away.
* **Desktop Code/PIN Copy**: On desktop/fine-pointer checkout views, clicking the displayed card code or PIN display copies a single `CODE/PIN` clipboard value using the full digits-only card code and trimmed PIN. Barcode payload and generation remain unchanged.

### 7. Settings Hierarchy & Containers
* **Organization**: Preferences are grouped into clean, collapsible M3 Accordion container cards to prevent visual overload:
  - **Google Sync**: Session state controls and sheet binding actions.
  - **Preferences**: Display options, visual themes, and local defaults.
  - **Backup & CSV Actions**: Manual CSV import and export buttons (hidden from standard run-states).
  - **Troubleshooting**: Diagnostics console and connection verification.
  - **Account**: Active Google session credentials and privacy scopes.

### 8. Diagnostics & Privacy Protection
* **Diagnostics Pane**: Technical logs, sheet connection bindings, and diagnostic indicators are collapsed by default under the Troubleshooting section.
* **Zero Visual Noise**: Do not expose internal development git tracking (e.g., branch names, commit hashes), device fingerprints, or runtime file mismatches in normal Settings viewports.
* **Google Privacy Guardrail**: Google email addresses, names, and profile avatars must not leak into primary Cards or Checkout screens.

### 9. Typography: Strict M3 Type-Role System
* Use strict type rhythm, weight, contrast, and family settings (Outfit for sans-serif text, Google Sans Code/mono for tabular values/numbers).

### 10. Camera Permission Guardrail
* **Explicit Trigger Only**: Camera access is authorized only for explicit, user-initiated add-card barcode scanning. No camera permissions can be requested on application load, list pages, checkout views, or during passive navigation transitions. Standard fallback to manual entry must remain clean and functional.

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
