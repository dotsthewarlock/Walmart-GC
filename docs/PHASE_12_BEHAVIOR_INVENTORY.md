# Walmart-GC Phase 12 Behavior Inventory

This inventory documents the canonical runtime behavior of the stable `phase-12` static application. It serves as the behavior source of truth for the React/Tailwind/Material 3 migration on the `agy-v1` branch.

## A. App Shell and Navigation

### Panels and Views
The app layout operates as a single-page application using three primary panel views controlled by `data-panel-name` attributes:
* **List Panel (`list-panel`)**: Displays the main gift cards list, search queries, filtering settings, and data summary.
* **Detail Panel (`detail-panel`)**: Displays individual card attributes, checkout tools, balance updates, card notes, and the inline barcode preview.
* **Settings Panel (`settings-panel`)**: Contains backup settings, Google OAuth synchronization panels, raw CSV text edits, and diagnostic outputs.

### Navigation Behavior
* **Top Navigation Bar**: Controlled via nav buttons (`nav-button`) targeting the list view (`nav-list`) or detail view (`nav-detail`). Clicking them toggles the `.active` class and activates the target panel via `showPanel()`.
* **Settings Access**: Access is controlled by the settings gear button (`#open-settings`), which opens the settings overlay panel.
* **Fullscreen Barcode Mode**: Triggered by `#barcode-open` when viewing a card. This opens a modal overlay (`#fullscreen-barcode`) that focuses the barcode using the screen wake lock API, hides layout headers, and enforces a high contrast background.
* **Swipe Gestures**: Swipe gestures on mobile devices navigate cards inside the detail panel and barcode focus views (`handlePrimarySwipeStart`, `handlePrimarySwipeEnd`).

### App-Shell Version Caching
Lightweight cache-busting fingerprints are embedded in index configurations:
* `DEBUG_DEPLOY_BRANCH = "phase-12"`
* `DEBUG_VERSION_JS = "1.01.77"`
* `DEBUG_VERSION_CSS = "1.01.77"`
* `data-html-version="1.01.77"` in `index.html`
* The application runs comparison checks inside `getAppShellDiagnostics()`. A shell version mismatch is flagged if HTML, JS, or CSS version headers do not align.

---

## B. Card Data Model

### Field Definitions
Every card entry conforms to the following schema structure:

| Field Name | Type | Validations / Defaults | Description |
| --- | --- | --- | --- |
| `cardNumber` | String | Validated by `/^63\d{14}$/` | Unique card number. Walmart CA prefix `79936686504000` is prepended at runtime only. |
| `pin` | String | String digits | Security PIN code. |
| `startingBalance` | Number | Non-negative numeric float | Original balance loaded. |
| `currentBalance` | Number | Non-negative numeric float | Remaining balance tracked. |
| `merchant` | String | String override value | Explicit useroverride merchant (e.g., `walmart-ca`). |
| `merchantInferred` | String | Auto-derived from number | System-inferred merchant identifier. |
| `dateAdded` | String | YYYY-MM-DD string | Date card was added to storage. |
| `dateUpdated` | String | YYYY-MM-DD string | Date card attributes were updated. |
| `dateUsed` | String | YYYY-MM-DD string | Date card was marked used. |
| `used` | Boolean | True / False | User-controlled flag indicating usage state. |
| `notes` | String | Text | Optional user notes. |

### Used/Unused State Rules
* A card's `used` boolean flag is independent of its `currentBalance`. A card can have a balance of `$0` and remain marked as `used: false`, or have a positive balance and be marked `used: true`.
* Date updates write to `dateUpdated` whenever current balances or notes are modified. Setting the `used` flag to `true` updates both `dateUsed` and `dateUpdated` using `todayString()`.

---

## C. Local Storage and Settings

### Storage Keys
The application stores cached states locally using the window `localStorage` API:

| LocalStorage Key | Schema Type | Description |
| --- | --- | --- |
| `walmartGc.cards` | Array of Cards | Cached card inventory list. Defaults to 5 bundled sample cards. |
| `walmartGc.settings` | Settings Object | Local UI configuration options. |
| `walmartGc.sync` | Sync Object | Concurrency metadata tracking latest synchronization results. |
| `walmartGc.oauth` | OAuth State Object | Cached authentication token expirations and session states. |
| `walmartGc.directSheets`| Spreadsheet Metadata | Configured backup sheet ID, file access status, and metadata. |

### Settings Defaults
* `advanceOnMarkUsed: true` (Auto-advance to the next card in checkout once marked used)
* `hideUsedCards: true` (Hides cards with the `used: true` flag from the list view)
* `hideZeroBalanceCards: false` (Filters out cards with a balance of `$0.00`)
* `sortMode: "balance-asc"` (Default sorting strategy)

---

## D. Cards Panel Behavior

### Rendering List Grid
* Card rendering builds index cards showing the masked card number (e.g., `•••• 1234`), inferred merchant badge, current balance formatted as currency, and a color-coded usage indicator.
* **Count Summary**: Computes both active cards on display and total balances matching the filtered list selection.
* **Sort Strategies**: Implements array sorting functions (`sortCards`) based on selections:
  * `balance-asc` / `balance-desc`
  * `date-added-asc` / `date-added-desc`
  * `date-updated-asc` / `date-updated-desc`
  * `card-number`

---

## E. Checkout Behavior

### Fullscreen Focus Mechanics
* Displays active barcodes using Code 128 rendering via JsBarcode (`createCode128BarcodeSvg`).
* Prepend prefix `79936686504000` to the card number for barcode values only if inferred merchant is `walmart-ca` (`getBarcodePayload`).
* **Visual Parity**: Provides previous (`#fullscreen-prev`) and next (`#fullscreen-next`) nav buttons, current index position indicators, masked card numbers, PIN reveal selectors, and quick-toggle used switches (`#fullscreen-mark-used`).
* **Wake Lock**: Requests wake lock (`navigator.wakeLock.request`) on activation to prevent screens from dimming during in-store scanning, and releases it on modal exit.

---

## F. CSV Backup & Recovery Behavior

### Header Parity
* **Approved Headers**: `cardNumber, pin, startingBalance, currentBalance, merchant, merchantInferred, dateAdded, dateUpdated, dateUsed, used, notes`
* **Legacy Supported Headers**: `cardNumber, pin, startingBalance, currentBalance, dateAdded, dateUpdated, dateUsed, used`
* **Backup Filename Syntax**: `walmart-gift-cards-session-backup-YYYY-MM-DDTHH-MM-SS-MS.csv`

### Editor Actions
* **Raw CSV Editor**: Displayed inside settings via `#raw-data-modal`. The editor includes a lock switch (`#toggle-data-lock`). Staging is disabled when locked. Unlocking prompts manual CSV text edits and runs parsing validations (`normalizeCsvRows`) before updating cached states.

---

## G. Worker OAuth and Session Behavior

### Security Context
* Same-origin endpoints are enforced; all endpoints must call `/auth/*` and `/api/*` against the root domain.
* Requests must pass `credentials: "include"` options to ensure HTTP-only cookie headers are attached.
* No access/refresh tokens are stored in the browser. Auth states are retrieved dynamically via `/api/status`.

### Endpoint Definitions
* `GET /api/status`: Returns current Worker version and Google connection profile status.
* `GET /auth/init`: Initiates connection workflows routing to Google OAuth consent.
* `POST /api/logout`: Removes session cookie configurations.
* `POST /api/sheet/ensure`: Matches or initializes backups sheet structures on Drive.
* `GET /api/cards/load`: Pulls spreadsheet contents down to the client app.
* `POST /api/cards/save`: Saves active cards payload with version mappings.

---

## H. Google Sheet Sync Behavior

### Concurrency Concurrency Controls
* Concurrency tracking uses optimistic locking via `_META.sheetVersion`.
* **Sync Triggers**: Syncing occurs only when completed actions finish (e.g., manual balance save, used state toggle, notes update, CSV import completion).
* **Conflict Resolutions**: If a remote version mismatch is detected (`detectDirectSheetsConflict`), synchronization halts, and recovery choices are displayed (`renderSyncRecoveryActions`):
  * **Download backup CSV**: Allows saving local unsynced states.
  * **Replace local data from Sheet**: Wipes local changes and pulls sheet values.
  * **Overwrite sheet with this session**: Pushes local states up, updating version values.

---

## I. Diagnostics Behavior

### Diagnostics Information
Located within Settings, the diagnostics panel outputs structured metrics including:
* Active CSS, JS, and HTML versions (validation match outputs).
* Google OAuth credentials and expiry statuses.
* Worker status outputs, schema configurations, and connection timestamps.
* Google Sheets direct link URLs and sync connection statistics.

---

## J. React Migration Notes

### Preserved Semantics (DO NOT MODIFY)
* Barcode prefix rendering logic (`79936686504000 + cardNumber`).
* All same-origin worker routes, options, and httpOnly cookie parameters.
* Concurrency version comparisons using `sheetVersion`.
* The key names mapped to `localStorage` objects.

### Refactoring Allowances (React Cleanups)
* Replace manual DOM manipulation queries (`document.querySelector`) with React state hooks (`useState`, `useEffect`).
* Standardize UI modals (e.g., details, notes, CSV editor) into reusable React components.
* Route application settings via a Context Provider.

### Modernization Candidates
* Modernize panel layouts and navigation bars using Tailwind-style Material 3 components.
* Introduce smooth micro-animations for card transitions and sorting filters.
