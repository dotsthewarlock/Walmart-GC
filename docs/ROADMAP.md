# GC Wallet Project Roadmap (ROADMAP.md)

This is the canonical project roadmap for GC Wallet (Walmart-GC). This document organizes planned features, near-term goals, and future strategic intent into distinct lanes. 

> [!IMPORTANT]
> **Roadmap Governance**: Listing an item in a future lane represents strategic intent and alignment, **NOT** implementation authorization. Future items must not be developed, nor have code TODOs written, until they are promoted to an approved development phase.

---

## Strategy & Product Vision
GC Wallet is a mobile-first, local-first, merchant-aware gift-card wallet. 
- **Walmart** is the default, highly optimized profile, but the system is engineered to easily support customizable local merchant profiles and custom overrides.
- **Privacy & Ownership**: The system is offline-first. Card numbers, PINs, and balances are cached in standard, unencrypted client-side browser storage (`localStorage`) and synced directly to the user's private Google Sheet via Worker proxy. There is no central server, database, or developer-owned card aggregation.

---

## Roadmap Lanes

### Lane 1: Approved Durable Decisions (Authorized & Completed/In-Progress)
These features represent the active, approved design and core product decisions:
- **Focus Mode Deprecation**: Complete removal of "Focus Mode," "scanner focus mode," separate modal screens, and stacked dialog logic.
- **Passive Inline Barcode Layout**: Barcode containers reside passively and inline directly inside the Checkout screen. They are scan-ready, high-contrast, and sized for standard mobile/register scanners, resting in a stable surface-container and opening a white scan-safe background.
- **Screen Wake Lock Helper**: Allowed strictly as a passive checkout browser convenience that requests lock only when the Checkout tab is active and releases on navigation away.
- **Google Account Email Privacy**: Full Google emails, names, or profile avatars are deferred strictly to Settings/Account screens and must never leak onto primary list or checkout views.

### Lane 2: Near-Term Implementation (Active Development Phase)
Cleanups and helper foundations approved for immediate execution:
- **Documentation Coherence & Cleanup (Current PR 2)**: Pruning stale audits, renaming conflict files, resolving duplication, and optimizing documents for AI-first development cycles.
- **Local Branch Pruning**: Pruning local-only backup and archival branches to keep the workspace clean.
- **Multi-Merchant Local Profile Schema Helpers**: Code foundations supporting local overrides for card merchants and system-derived merchant properties.

### Lane 3: Future Beta Roadmap (Planned Strategic Intent - NOT Authorized for Code Changes)
Features planned for future iterations, pending user-testing and explicit phase scope authorization:
- **Camera-Based Add-Card Barcode Scanner Beta**: Explicit, user-initiated add-card scanner trigger (no camera request on load, Cards, Checkout, or passive navigation transitions).
- **Merchant-Dependent Gift Card Balance-Check Assist Beta**: Best-effort manual balance check assistant with manual fallback. Strictly no broad credential capture, no CAPTCHA/hostile scraping, and no backend data aggregation.
- **Custom Merchant Profile Architecture**: Support for customizable merchant logos, colors, barcode checksum behaviors, and custom merchant entries in UI.
- **Schema vNext Planning**: Preparing future-proof local schema definitions for advanced card categories.
- **Dedicated Phone App / Progressive Web App (PWA) Wrappers**: Optional native wrapping or standalone manifest capabilities for better mobile integrations.

### Lane 4: Not Approved for Implementation (Explicit Boundaries)
The following concepts are explicitly out of scope, unauthorized, and rejected:
- **SaaS platform or Multi-Tenant database**: No user registrations, central logins, or shared tables.
- **Developer-Owned Card Database**: No central card aggregation or developer visibility into user inventories.
- **Automated CAPTCHA-Bypassing Scrapers**: No automated balance scrapers that violate third-party terms or require credential harvesting.
- **General Finance Tracker / Shopping / Loyalty Optimizer**: GC Wallet is strictly a gift card management tool.
