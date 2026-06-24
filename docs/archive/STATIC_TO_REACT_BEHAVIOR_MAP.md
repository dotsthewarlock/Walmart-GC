# Static to React Behavior Parity Map

This map traces runtime behavior from the stable `phase-12` codebase to the React-based `agy-v1` codebase. All status settings are marked as "Not ported" until target components have been successfully integrated and verified against the stable source.

## Component & Flow Map

| Feature / Panel | stable (`phase-12`) Source | React (`agy-v1`) Target | Current Status |
| --- | --- | --- | --- |
| **App shell** | `index.html` structure, version indicator | `src/App.jsx` container, basic container layout | Not ported |
| **Cards panel** | Grid renderer, search query, active/total counters | `src/components/CardsPanel.jsx` (or similar App sub-state) | Not ported |
| **Checkout panel** | Barcode modal, swipe navigators, use counter | `src/components/CheckoutPanel.jsx` (or similar App sub-state) | Not ported |
| **Settings panel** | Accordion UI, sync buttons, local storage keys | `src/components/SettingsPanel.jsx` (or similar App sub-state) | Not ported |
| **Card data model** | `cardNumber`, `pin`, `startingBalance`, `currentBalance`, `merchant`, `merchantInferred`, `dateAdded`, `dateUpdated`, `dateUsed`, `used`, `notes` | React state model conforming to same schema headers | Not ported |
| **CSV behavior** | CSV parser/generator with raw edit text lock | `src/utils/csv.js` or matching state handler | Not ported |
| **Barcode behavior** | `JsBarcode` rendering, derived payload: `79936686504000 + cardNumber` | React JsBarcode element wrapper | Not ported |
| **Worker API behavior** | same-origin `/api/*` and `/auth/*` endpoint fetchers | `src/utils/api.js` wrapper with `credentials: "include"` | Not ported |
| **OAuth/session behavior** | Status checks, connect/disconnect UI states | Auth hook or state machine querying `/api/status` | Not ported |
| **Google Sheet behavior** | Drive sheet discovery and `/api/sheet/ensure` flow | Sync service integration using same-origin Worker | Not ported |
| **Sync/conflict behavior** | `_META.sheetVersion` validation and concurrency checks | Concurrency state engine handling status updates | Not ported |
| **Recovery behavior** | Choice prompts for remote overwrite or local push | Prompt modals triggering overwrite or push actions | Not ported |
| **Diagnostics behavior** | Diagnostician panel, debug logs, status indicators | Diagnostics output overlay | Not ported |
| **Material 3 mapping** | Traditional CSS theme overrides | Tailwind CSS token/class utility mappings | Not ported |

## Local Storage Keys to Preserve

| Key | Description | Current Status |
| --- | --- | --- |
| `walmartGc.cards` | Stores the active cached array of gift cards | Not ported |
| `walmartGc.settings` | Stores theme, display preference, and diagnostic options | Not ported |
| `walmartGc.sync` | Stores local sheet version state and pending sync logs | Not ported |
| `walmartGc.oauth` | Caches basic non-sensitive authentication status | Not ported |
| `walmartGc.directSheets` | Legacy metadata configuration references | Not ported |

## Worker Routes to Preserve

| Route | Method | Description | Current Status |
| --- | --- | --- | --- |
| `/api/status` | GET | Returns connection status, version info, and configurations | Not ported |
| `/auth/init` | GET | Triggers OAuth flow redirect back to origin callback | Not ported |
| `/api/logout` | POST | Clears session cookie and invalidates authentication | Not ported |
| `/api/sheet/ensure`| POST | Discovers, creates, or validates the backup spreadsheet | Not ported |
| `/api/cards/load` | GET | Pulls the active spreadsheet data | Not ported |
| `/api/cards/save` | POST | Saves new dataset updates with sheetVersion tracking | Not ported |
