# M3 full audit and cleanup recommendations report

## 1. Executive summary
The `dotsthewarlock/Walmart-GC` React 19 + Vite + Tailwind CSS refactor is in an exceptionally strong state. Core layout patterns, mobile-first design choices, and locked interface decisions (such as the removal of dashboard clutter and full-screen modals) align remarkably well with a modern, responsive user experience. The Vite-backed build compile is incredibly fast and yields lightweight production assets (266 kB Javascript and 44 kB CSS) with zero compilation errors.

However, several notable concerns must be resolved to ensure complete architectural cleanliness, long-term maintainability, and strict adherence to the [M3_DESIGN_DECISIONS.md](docs/M3_DESIGN_DECISIONS.md) guidelines:
1. **Orphaned shadcn Primitives**: The custom shadcn elements under [components/ui/](src/components/ui) are currently completely unimported and unused in the active source tree, with the app continuing to rely entirely on native tags with long, inline utility classes.
2. **M3 Design Divergences (Spotlight Scrim)**: The checkout spotlight focus backdrop utilizes a darkened modal-like overlay (`bg-black/60`) in [App.jsx](src/App.jsx#L1941) which violates the strict non-modal surface specification in [M3_DESIGN_DECISIONS.md](docs/M3_DESIGN_DECISIONS.md#L113).
3. **Hardcoded Development Context**: The system diagnostics container displays a hardcoded Git branch string `agy/shadcn-refactor-docs` in [App.jsx](src/App.jsx#L1683), displaying misleading runtime data to production users.
4. **Stale Assets and Guidelines**: Legacy, non-React files ([app.js](app.js) and [styles.css](styles.css)) are lingering in the root directory, while legacy prompt guidelines in [AGENTS.md](AGENTS.md) still reference cache-busting fingerprints.

Addressing these minor discrepancies will elevate the project to a premium, production-ready, and maintainable standard.

---

## 2. High-importance findings

### Finding 1: Orphaned shadcn/ui components
* **Evidence**: File paths [badge.jsx](src/components/ui/badge.jsx), [button.jsx](src/components/ui/button.jsx), [card.jsx](src/components/ui/card.jsx), and [input.jsx](src/components/ui/input.jsx) exist but are never imported in [App.jsx](src/App.jsx).
* **Why it matters**: It increases repository clutter, leads to developer confusion regarding the active UI library, and compromises styling reuse. Interactive buttons and inputs continue to maintain duplicated, lengthy, inline Tailwind string signatures instead of inheriting a single customizable component layer.
* **M3 or project-rule violation**: Violates the "Primitive Customization / Reusable Semantic Roles" rule in [ACTIVE_CONTEXT.md](docs/ACTIVE_CONTEXT.md#L100-L102) which requires utilizing local custom components to govern shape-rounding, touch targets, and consistent tonal palettes.
* **Suggested fixes**:
  1. *Complete Integration*: Replace raw native elements (buttons, inputs) in [App.jsx](src/App.jsx) with the matching `<Button>` and `<Input>` shadcn primitives, customizing them to support the 48px touch targets and correct color mapping.
  2. *Archive / Prune*: Remove the unused custom components directory to guarantee a clean workspace, re-introducing them only when a full multi-page multi-component refactor pass is approved.
  3. *Declare Status*: Retain them in place but formally designate them as "staged for next phase integration" in the active context documentation.
* **Recommended fix**: **Fix 1 (Complete Integration)**. Integrating the components in a distinct, guarded implementation pass will enforce design-system consistency and reduce duplicate Tailwind utilities.
* **Risk level**: Low-Medium
* **Estimated scope**: Medium
* **Timing**: Later (in the next dedicated visual/component batch)

### Finding 2: Hardcoded Git branch name in Troubleshooting status
* **Evidence**: [App.jsx:L1683](src/App.jsx#L1683):
  ```jsx
  <span className="font-mono text-[10px] text-m3-on-surface font-bold">agy/shadcn-refactor-docs</span>
  ```
* **Why it matters**: This displays misleading runtime diagnostic information in the user-facing Troubleshooting card, implying that the application is running an active feature branch even on production instances.
* **M3 or project-rule violation**: Violates diagnostic integrity and the "clean developer/versioning values" requirement.
* **Suggested fixes**:
  1. *Automate Build-Time Injection*: Inject the actual branch or release tag dynamically using a Vite build env variable (such as `import.meta.env.VITE_GIT_BRANCH`).
  2. *Remove Internal Row*: Delete the "Active Git Branch" diagnostic row entirely, keeping with the M3 focus on removing non-actionable internal developer noise.
  3. *Static Placeholder*: Replace the feature branch string with a generic release indicator (e.g. `main` or `release-v1`) until dynamic injection is wired up.
* **Recommended fix**: **Fix 2 (Remove Internal Row)**. Active Git branches are internal development telemetry. They are not actionable for normal users and should be omitted from the user-facing diagnostics card per [M3_DESIGN_DECISIONS.md](docs/M3_DESIGN_DECISIONS.md#L127).
* **Risk level**: Low
* **Estimated scope**: Small
* **Timing**: Now (can be cleaned up immediately)

---

## 3. Material 3 violations

### Violation 1: Heavy darkened spotlight scrim overlay
* **Evidence**: [App.jsx:L1941](src/App.jsx#L1941) in the spotlight focus markup:
  ```jsx
  className="fixed inset-0 bg-black/60 z-45 transition-opacity duration-300 cursor-pointer animate-fade-in"
  ```
* **M3 concern**: Direct violation of the strict non-modal focus specification in [M3_DESIGN_DECISIONS.md:L113](docs/M3_DESIGN_DECISIONS.md#L113), which specifies: *"The backdrop uses the default light surface background (`bg-m3-surface`) with no darkened scrim overlay (`bg-black/60` or similar) or backdrop blurring."* The current `bg-black/60` behaves as a heavy, desktop-style modal darkened overlay.
* **Suggested fixes**:
  1. *Transition to Tonal Scrim*: Soften the overlay backdrop to a standard transparent state layer, such as `bg-m3-on-surface/10` or `bg-m3-on-surface-variant/8`.
  2. *Agnostic Outline Only*: Remove the scrim element entirely, relying on card-scaling, high-contrast borders (`border-m3-primary`), and subtle shadows to draw focus.
* **Recommended fix**: **Fix 1 (Transition to Tonal Scrim of `bg-m3-on-surface/10`)**. This isolates the scanned card and guarantees readability without introducing heavy modal overlays.

### Violation 2: Duplicated, manual switch controls in Settings
* **Evidence**: Duplicated absolute/translate divs in [App.jsx](src/App.jsx) on lines:
  - [App.jsx:L1378](src/App.jsx#L1378)
  - [App.jsx:L1392](src/App.jsx#L1392)
  - [App.jsx:L1406](src/App.jsx#L1406)
* **M3 concern**: Rather than using a reusable switch component, the complex relative M3 Switch slider markup and hover/active transitions are copy-pasted three times. This violates component hierarchy consistency and introduces brittle inline styling strings.
* **Suggested fixes**:
  1. *Extract to Reusable Component*: Create an inline or separate `M3Switch` React component inside the file and call it with props `checked` and `onChange`.
  2. *Adopt custom CSS classes*: Create an `.m3-switch` class set in [index.css](src/index.css) to encapsulate slider measurements and transitions.
* **Recommended fix**: **Fix 1 (Extract to a reusable Switch sub-component)**.

### Violation 3: Non-tabular figure balances on list-item rows
* **Evidence**: [App.jsx:L1350](src/App.jsx#L1350):
  ```jsx
  <span className="text-sm font-bold">
    ${card.currentBalance.toFixed(2)}
  </span>
  ```
* **M3 concern**: Currency values on list rows are displayed using standard proportional sans-serif styling. This causes minor layout shifts and alignment jitter on the right margins when values or card counts change, disobeying the locked Cards design rule: *"Amounts: Right-aligned, tabular (mono) formatting with slight emphasis."*
* **Suggested fixes**:
  1. *Apply Monospace Class*: Apply `font-mono` to the text container to match the card number's monospace styling.
  2. *Standard Tabular Numbers Class*: Apply `tabular-nums` class to force monospace figure widths within the sans-serif font family.
* **Recommended fix**: **Fix 1 (Add `font-mono` to balance text)**. This maintains consistency with the card number monospaced alignment and respects the M3 specification.

---

## 4. High-concern items
* **Single-File App.jsx Architecture**: [App.jsx](src/App.jsx) has ballooned to 2,150 lines. It encompasses the main App Shell, local offline state engine, Google Sync OAuth handling, CSV parsers, List View cards rendering, Settings forms, and Barcode spotlight focus overlays. This massive file size severely impacts readability and local navigation, although it keeps build paths simple.
* **Unused Legacy Root Files**: Unused legacy pre-React static assets ([app.js](app.js) and [styles.css](styles.css)) are sitting in the root project directory. Though explicitly marked in the [Maintenance Log](docs/MAINTENANCE_LOG.md#L82) as "deferred until production stability is established", they represent a continuous source of search noise and developer confusion.

---

## 5. Medium-concern items
* **Manual Button Tailwind Duplications**: Buttons in [App.jsx](src/App.jsx) (such as lines 1414, 1441, 1450, 1468, 1479, 1487) manually replicate a long string of focus-rings, scale transitions, and active animation behaviors (`transition-all active:scale-95 shadow-sm ... focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-m3-primary focus-visible:ring-offset-2`). They should be consolidated into a few reusable CSS classes in [index.css](src/index.css) (e.g., `.btn-m3-primary`, `.btn-m3-tonal`) or mapped directly using custom components.

---

## 6. Low-concern items
* **Agy-Handoff Script Execution Rule**: The handoff policy in [ACTIVE_CONTEXT.md](docs/ACTIVE_CONTEXT.md#L74) requires every terminal session to conclude by executing `~/Project/bin/agy-handoff` to update GitHub Issue #200. This is an excellent workflow habit but requires manual developer/agent diligence to avoid state drift.
* **Diagnostic Code Comments**: There are several scattered inline comments detailing old structural adjustments (e.g. [App.jsx:L1596](src/App.jsx#L1596) `{/* Data Panel / Backup Controls */}`) that could be cleaned up.

---

## 7. Stale, contradictory, or misaligned docs

### File 1: AGENTS.md
* **Problem**: [AGENTS.md:L453-455](AGENTS.md#L453-455) contains rules requiring agents to bump cache-busting fingerprints in `index.html`, `app.js`, and `styles.css` upon edits.
* **Current source of truth conflict**: [ACTIVE_CONTEXT.md:L91-92](docs/ACTIVE_CONTEXT.md#L91-L92) and [PHASE_12_BEHAVIOR_INVENTORY.md:L20](docs/archive/PHASE_12_BEHAVIOR_INVENTORY.md#L20) explicitly state that dynamic fingerprint versioning is **deprecated** and replaced by Vite's standard hash bundle output (`dist/assets/index-[hash].js`).
* **Recommended cleanup**: Edit [AGENTS.md](AGENTS.md) to strip these old cache-busting guidelines and align with the standard local Vite compile workflow.
* **Action**: Update.

### File 2: GOOGLE_SHEET_SETUP.md
* **Problem**: Contains historical MVP deployment guides referencing custom Google Apps Script projects at the bottom of the document.
* **Current source of truth conflict**: The project has fully transitioned to the same-origin Cloudflare Worker-backed Google Drive and Sheets REST API integration, making Apps Script completely retired.
* **Recommended cleanup**: Add a prominent `> [!NOTE]` callout at the top of [GOOGLE_SHEET_SETUP.md](docs/GOOGLE_SHEET_SETUP.md) reminding developers that Apps Script sections are for archived historical context only.
* **Action**: Keep with note.

---

## 8. Stale, orphaned, or confusing files/artifacts

| File/Artifact Path | Description | Recommended Treatment | Justification |
| :--- | :--- | :--- | :--- |
| [app.js](app.js) | Pre-React static app main script (3,500+ lines). | **Archive** (Move to `docs/archive/legacy-code/`) | Highly confusing when searching for UI variables; completely unused by the active Vite build. |
| [styles.css](styles.css) | Pre-React static app stylesheet. | **Archive** (Move to `docs/archive/legacy-code/`) | Replaced by `src/index.css`. Contributes to text search noise. |
| [components/ui/badge.jsx](src/components/ui/badge.jsx) | Unused shadcn primitive. | **Keep** | Reserved for future design polishing. |
| [components/ui/button.jsx](src/components/ui/button.jsx) | Unused shadcn primitive. | **Keep** | Highly useful for future refactoring of App.jsx buttons. |
| [components/ui/card.jsx](src/components/ui/card.jsx) | Unused shadcn primitive. | **Keep** | Ideal for standardizing container elevated layouts. |
| [components/ui/input.jsx](src/components/ui/input.jsx) | Unused shadcn primitive. | **Keep** | Necessary for clean text inputs in settings. |
| `apps-script/Code.gs` | Retired Apps Script sync logic. | **Keep** | Important historical reference in case of exact error diagnostics. |

---

## 9. Variable, naming, and architecture cleanup
* **Branch name variable in diagnostics**: The active Git branch value displays `agy/shadcn-refactor-docs` as a hardcoded static string in [App.jsx:L1683](src/App.jsx#L1683). This is outdated and misleading, and should be removed.
* **Switch control state markup**: The duplication of switch elements can be optimized by establishing a localized `<Switch checked={...} onChange={...} />` render wrapper, removing approximately 50 lines of duplicate Tailwind SVG strings.
* **Nav selector feedback**: The button click handlers on bottom navigation buttons (lines 1142, 1166) contain localized state assignments but do not utilize standard navigation primitives, which is perfectly functional but creates minor routing silos.

---

## 10. shadcn/Tailwind/M3 alignment review
* **Shadcn Alignment**: Currently, custom shadcn configuration files exist ([components.json](components.json)) and primitive assets are installed under `src/components/ui/`, but they are entirely **orphaned**. This means the app fails to benefit from shadcn's standard accessibility roles, keyboard focus tracking, or transition classes.
* **One-Off Tailwind Strings**: Standard elements heavily duplicate long classes instead of utilizing standard tailwind definitions. For instance, the transition modifiers and focus highlights (`transition-all active:scale-95 shadow-sm cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-m3-primary focus-visible:ring-offset-2`) are repeated on almost every interactive element in the settings pane.
* **Elevation & Borders**: Several elements utilize explicit heavy shadows (e.g. `shadow-2xl` on line 1953 and 1739) and hardcoded borders (`border-m3-outline-variant/30`). Under strict M3 guidelines, surface elevation is expressed primarily through **tonal color overlays** and subtle shadows rather than raw, dark dropshadows. Custom elevation CSS properties should be mapped within [index.css](src/index.css) to handle this dynamically.

---

## 11. Cards screen review
* **Locked Cards Decisions Compliance**:
  - `Total Wallet Assets` → **No instances found** (Fully removed).
  - `Card Counts` → **No instances found** (Fully removed).
  - `displayed / registered` denominator → **No instances found** (Fully removed).
  - `Vault Inventory` → **No instances found** (Fully removed).
  - Full-width `Sync ready` banner → **No instances found** (Replaced by compact inline Assist Chip).
  - Metrics are `Available balance` and `Visible cards` → **Perfect Adherence** (Lines 1206, 1210).
  - Mobile Cards avoid large desktop-style wrapping panel → **Perfect Adherence** (Utilizes standard flat elevated row layouts on mobile viewports).
  - Rows follow list-item model with right-aligned amount → **Adhered**, but amounts are not currently formatted as monospace/tabular figures (Missing `font-mono` on line 1350).

---

## 12. Checkout screen review
* **Locked Checkout Decisions Compliance**:
  - Barcode/register screen is inline → **Perfect Adherence** (No full-screen barcode modal is present).
  - `Back to Inventory` → **No instances found** (Successfully removed).
  - Helper warning text / brightness advice → **No instances found** (Successfully removed).
  - `Reveal` / `Hide` text labels → **Perfect Adherence** (Numbers are revealed inline upon touching the monospaced card button; no redundant toggle text is visible).
  - Large PIN badge → **No instances found** (PIN displays in a clean, compact code row).
  - Barcode primary layout → **Perfect Adherence** (Displays in a large, clean dedicated card frame).
  - Compact card/PIN row → **Perfect Adherence** (Rendered directly under the barcode on lines 1790-1823).
  - Update Balance and Mark Used are high-contrast buttons → **Perfect Adherence** (Lines 1831-1853).
  - Notes are low-emphasis → **Perfect Adherence** (Rendered as borderless details paragraph on lines 1912-1914).
  - Spotlight focus avoids modal/black-panel behavior → **Near-Miss / Minor Violation**: While the code spotlight focus container is styled inline inside the page flow, it still triggers a modal-like dark scrim (`bg-black/60`) on line 1941, violating the non-modal surface rule in [M3_DESIGN_DECISIONS.md](docs/M3_DESIGN_DECISIONS.md#L113).

---

## 13. Settings, nav, and diagnostics review
* **M3 Navigation Bar**: The bottom navigation implements an M3-inspired layout. Active indicator pills are correctly sized (`w-16 h-8`) and carry a subtle border highlight (`border border-m3-primary/20`) over the `bg-m3-primary-container` fill. It uses clean inline SVG icons, avoiding heavy dependency loads.
* **Settings Action Hierarchy**: Perfectly mapped with clearly divided containers for `Preferences`, `Google Synchronization`, and `CSV Backup & Recovery` options.
* **Unified Diagnostics**: Exposes all diagnostic metrics under a collapsed `<details>` Troubleshooting header (lines 1654-1692). This cleanly hides versioning, sheets status, and connection logs from general users unless intentionally opened.
* **Parity/Noise Check**: The Git branch `agy/shadcn-refactor-docs` (line 1683) is hardcoded and represents unnecessary internal parity noise. It should be removed.

---

## 14. Privacy review
* **Google Email Protection**: The main inventory list and checkout views contain **zero** instances of the user's personal Google Account information or email details.
* **Settings Placement**: The user's Google connection profile details (email/name) are strictly confined to the locked settings screen under the Google Sync Connection panel ([App.jsx:L1431](src/App.jsx#L1431)). This perfectly satisfies the privacy guardrail.

---

## 15. Key user decision questions

### Question 1: Should we fully integrate the custom shadcn primitives or delete them from the codebase?
* **Why this decision matters**: It dictates components consistency and development speed. Currently, we have unimported shadcn UI primitives in `src/components/ui/` but inline utility elements in `src/App.jsx`. Fully integrating them will standardize button focus-rings, active states, and input styles, while keeping them orphaned creates codebase bloat.
* **Options**:
  - *Option A*: **(Recommended)** Fully integrate the installed shadcn primitives (`button.jsx`, `input.jsx`, `badge.jsx`, `card.jsx`) into `src/App.jsx` in the next phase, tailoring them to M3 guidelines.
  - *Option B*: Prune the unused files and directories to keep the workspace 100% clean and lightweight, re-adding them only when needed.
* **Recommended Answer**: **Option A**. Standardizing buttons and inputs using these customized primitives will make styling adjustments much easier.

### Question 2: Should we replace the hardcoded "Active Git Branch" diagnostic row with dynamic injection, or remove it entirely?
* **Why this decision matters**: Ensures accuracy of diagnostic logs and keeps the Troubleshooting interface uncluttered.
* **Options**:
  - *Option A*: **(Recommended)** Remove the "Active Git Branch" diagnostic row entirely from user-facing Troubleshooting.
  - *Option B*: Wire it up dynamically using Vite build env variables (e.g. `import.meta.env.VITE_GIT_BRANCH`).
* **Recommended Answer**: **Option A**. The active Git branch is internal dev noise that does not help consumers troubleshoot local sheet issues, conforming to the M3 rule to strip developer-only telemetry.

### Question 3: How should we resolve the Spotlight Scrim modal-like background color divergence?
* **Why this decision matters**: Aligns the checkout spotlight behavior with the Material 3 non-modal visual layout.
* **Options**:
  - *Option A*: **(Recommended)** Soften the scrim background overlay to a subtle tonal state layer (`bg-m3-on-surface/10` or `bg-m3-on-surface-variant/8`).
  - *Option B*: Keep the dark scrim (`bg-black/60`) to maximize barcode scanning contrast in bright retail environments.
  - *Option C*: Remove the background scrim element entirely.
* **Recommended Answer**: **Option A**. Softening the scrim maintains standard M3 surface layers while highlighting the barcode container nicely.

---

## 16. Recommended project improvements
1. **Prune Stale Root Code**: Archive legacy static web files ([app.js](app.js) and [styles.css](styles.css)) into `docs/archive/legacy-code/` immediately to reduce text search noise and keep the active tree clean.
2. **Consolidate Switch Custom Controls**: Extract the duplicated slider markup into an inline `<Switch checked={...} onChange={...} />` component inside [App.jsx](src/App.jsx) to eliminate block redundancy.
3. **Establish Shared CSS Utility Roles**: Extract repetitive button/focus rings from [App.jsx](src/App.jsx) into clear CSS utilities in [index.css](src/index.css) (e.g. `.m3-btn-primary`, `.m3-btn-secondary-container`) to keep Tailwind classes manageable.
4. **Correct Tabular Balances**: Add `font-mono` to the list view balance numbers (line 1350) to ensure right-aligned column figures align perfectly with no layout drift.
5. **Update AGENTS.md Guidelines**: Strip out-of-date static fingerprint instructions from the prompt guidelines in [AGENTS.md](AGENTS.md).
6. **Integrate Customized shadcn Elements**: Wire up the button and input primitives to replace native counterparts in a separate, guarded visual cleanup pass.

---

## 17. Suggested next implementation batches

### Batch 1: Structural Cleanup, Diagnostics, & Balances
* **Goal**: Archive legacy root files, remove hardcoded dev Git branch diagnostics, correct tabular figure formatting on Card Row balances, and update stale `AGENTS.md` rules.
* **Files likely touched**:
  - `app.js` (Archive to `docs/archive/legacy-code/app.js`)
  - `styles.css` (Archive to `docs/archive/legacy-code/styles.css`)
  - [App.jsx](src/App.jsx) (Edit lines 1350, 1683)
  - [AGENTS.md](AGENTS.md) (Edit line 453)
* **Risks**: Extremely low; standard textual/move operations.
* **Verification commands**:
  - `npm run build`
* **Stop/reassess triggers**: Any build warning or compilation failure.

### Batch 2: M3 Spotlight Scrim & Custom Switch Consolidation
* **Goal**: Resolve spotlight scrim `bg-black/60` mismatch, and extract duplicated Settings Switch code blocks into a single reusable React sub-component.
* **Files likely touched**:
  - [App.jsx](src/App.jsx) (Edit lines 1370-1407, 1941)
* **Risks**: Visual/functional regression of Settings toggle checkboxes or Checkout spotlight rendering.
* **Verification commands**:
  - `npm run build`
  - Manual browser validation of settings and spotlight toggles.
* **Stop/reassess triggers**: Toggles fail to update settings state, or barcode spotlight layout breaks on mobile viewport tests.

### Batch 3: Button utility mapping & shadcn integration
* **Goal**: Consolidate repetitive Tailwind button strings into shared CSS utility classes or customize and import shadcn UI primitives to govern buttons/inputs.
* **Files likely touched**:
  - [App.jsx](src/App.jsx)
  - [index.css](src/index.css)
* **Risks**: Potential disruption of form layouts or focus ring aesthetics.
* **Verification commands**:
  - `npm run build`
* **Stop/reassess triggers**: Keyboard navigation outlines fail to show, or button sizing diverges from standard design targets.

---

## 18. Verification and commands run
The following audits, commands, and verification steps were successfully executed:
1. **Preflight Context Log**: Inspected all terminal outputs and historical checks inside `/home/godfreymiu/Project/m3_audit_terminal_context.log`.
2. **Active Guidelines Review**: Thoroughly inspected [docs/ACTIVE_CONTEXT.md](docs/ACTIVE_CONTEXT.md), [docs/M3_DESIGN_DECISIONS.md](docs/M3_DESIGN_DECISIONS.md), [docs/reference/M3_Core_Guidelines.md](docs/reference/M3_Core_Guidelines.md), [README.md](README.md), and [package.json](package.json).
3. **Source Tree Auditing**: Performed targeted grep checks on [src/App.jsx](src/App.jsx) to scan for legacy strings, "reveal/hide" occurrences, custom switch slider duplication, and troubleshooting status elements.
4. **Compile Integrity Check**: Ran `npm run build` inside the active workspace directory, confirming that the React 19 / Vite build compiles successfully with zero warnings or errors.

---

## Concise prioritized recommendations

### What should be fixed first:
1. **System Diagnostics Hardcoded Branch name**: Correct [App.jsx:L1683](src/App.jsx#L1683) by removing the active git branch indicator row to align with clean, noise-free Troubleshooting designs.
2. **Tabular Balances on List Items**: Add `font-mono` to the list item row balance span ([App.jsx:L1350](src/App.jsx#L1350)) to ensure right-aligned columns align cleanly with no layout drift.
3. **Archive Legacy Assets**: Move stale files [app.js](app.js) and [styles.css](styles.css) into a legacy-code archive subfolder to reduce search clutter.

### What should be decided first:
1. **Spotlight Scrim Overlay Background**: Resolve the divergence between the locked M3 non-modal specification (requires default light background/no dark scrim) and the current spotlight scrim overlay (`bg-black/60`). Confirm if the recommended tonal scrim of `bg-m3-on-surface/10` is approved.
2. **Shadcn Integration Strategy**: Confirm whether we should proceed with fully integrating the custom primitives under `src/components/ui/` to replace native elements (Recommended), or prune the directories.

### What should be deferred:
1. **Single-File App.jsx Modular Refactoring**: Splitting the 2,150-line [App.jsx](src/App.jsx) into smaller modular files should be deferred until all core Material 3 design and visual component cleanup milestones are fully stabilized.
