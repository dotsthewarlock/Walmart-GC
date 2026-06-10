# Walmart-GC Agent Instructions

## Repository

Repository: `dotsthewarlock/Walmart-GC`

---

## Product Overview

Walmart-GC is a mobile-first web application for managing large numbers of Walmart gift cards.

Primary use case:

* Store and organize 30–100+ Walmart gift cards
* Display barcodes for fast in-store checkout
* Track balances and usage state
* Synchronize records between desktop and mobile devices
* Use Google Sheets as the source of truth

This is a gift card management system, not merely a barcode generator.

---

## Architecture

Source of Truth:

* User-owned Google Sheet

Integration Layer:

* Google Apps Script Web App

Frontend:

* GitHub Pages static website

Data Flow:

```text
User Google Sheet ↔ Google Apps Script ↔ Walmart-GC Web App
```

The application should never require a dedicated server.

Prefer simple, low-maintenance solutions compatible with GitHub Pages.

---

## Tech Stack

Frontend:

* Plain HTML
* CSS
* JavaScript

Hosting:

* GitHub Pages

Deployment:

```text
GitHub repository → main branch → GitHub Pages
```

Do not introduce:

* Frameworks
* Build tools
* Databases
* Dedicated backend infrastructure
* User accounts

unless explicitly approved.

---

## Documentation Authority

Before recommending architecture, schema, sync, onboarding, or implementation changes, review:

1. `AGENTS.md`
2. `docs/PHASE_6_SCHEMA_API_DECISIONS.md`
3. `docs/ROADMAP.md`
4. `docs/AI_HANDOFF.md`

Treat approved decisions in:

```text
docs/PHASE_6_SCHEMA_API_DECISIONS.md
```

as the current architecture baseline.

---

## Roles

ChatGPT is the product architect.

ChatGPT creates:

* Product logic
* Specifications
* Architecture guidance
* Data model guidance
* Dev AI / Codex briefs
* Acceptance criteria
* Review feedback

Codex is the coding agent.

Codex writes code, edits repository files, runs checks, reviews diffs, and prepares GitHub changes.

---

## Approved Phase 6 Architecture

The approved MVP architecture is documented in:

```text
docs/PHASE_6_SCHEMA_API_DECISIONS.md
```

Do not redesign approved decisions without discussion.

Changes affecting:

* Google Sheet schema
* Apps Script APIs
* Sync behavior
* Conflict handling
* Connection model
* Metadata architecture

are Major Changes.

---

## MVP Scope

Required:

* Gift card list view
* Gift card detail view
* Barcode rendering
* PIN display
* Remaining balance tracking
* Used flag tracking
* Google Sheet synchronization
* Mobile-friendly interface
* Desktop-friendly interface

---

## Non-Goals (v1)

Do not prioritize:

* User accounts
* Multi-user collaboration beyond shared sheet editors
* Shared databases
* Subscription systems
* Complex analytics
* Receipt scanning
* Camera barcode scanning
* Automated balance checks
* Native mobile apps

These may be future enhancements.

---

## Development Rules

* ChatGPT creates product logic, specifications, architecture guidance, and Dev AI briefs.
* Codex writes code.
* Keep changes small and PR-focused.
* Inspect current repository files before suggesting implementation changes.
* Explain current architecture before recommending modifications.
* Prefer the smallest safe change that achieves the goal.
* Flag security, deployment, schema, migration, sync, or user-data risks before implementation.
* Prioritize maintainability and simplicity.
* Prioritize mobile usability.
* Review all Codex-generated changes before merge.

Before proposing schema, sync, Apps Script, onboarding, or connection changes:

Review:

```text
docs/PHASE_6_SCHEMA_API_DECISIONS.md
```

and treat approved decisions as architecture.

---

## GitHub Update Discipline

Codex should minimize GitHub update interactions.

Before committing, pushing, or opening a PR:

1. Inspect current repository state.
2. Understand the full requested change.
3. Plan the complete implementation.
4. Make all related code changes locally.
5. Run available verification.
6. Review the complete diff.
7. Push one coherent change set.
8. Open one PR.

Avoid repeated small pushes unless fixing review feedback or failed verification.

---

## Minor vs Major Change Framework

### Minor Changes

Minor changes may proceed without additional approval.

Examples:

* Documentation updates
* CSS/UI polish
* Layout improvements
* Small bug fixes
* Small UX enhancements
* Refactoring without behavior changes

### Major Changes

Major changes require discussion and confirmation first.

Examples:

* Data model changes
* Google Sheet schema changes
* Google Apps Script API changes
* Sync behavior changes
* Authentication/security changes
* Connection architecture changes
* Conflict handling changes
* Large UI restructuring
* New major features
* Framework/build tool introduction
* Hosting changes
* Anything affecting user data

When uncertain, treat as Major.

After approval, complete all related code changes locally before pushing.

---

## Codex Branch & PR Workflow

### Fresh Branch Requirement

For every implementation task:

1. Start a new Codex task/session.
2. Start from the latest `main`.
3. Create a new feature branch from current `main`.
4. Do not reuse:

   * stale branches
   * conflicted branches
   * previous feature branches
   * generic branches such as `work`

### Conflict Prevention

Before opening a PR:

* Verify branch is based on current `main`.
* Verify no conflict markers exist.
* Verify working tree is clean.
* Review complete diff.

### Push / Connectivity Failures

If GitHub access, push access, fetch access, or PR creation is blocked:

Examples:

* 403 proxy failures
* push failures
* GitHub access failures
* npm/package registry failures

Codex must:

1. Stop.
2. Clearly report the limitation.
3. Not claim a PR is ready.
4. Not claim a PR was created unless GitHub confirms it.
5. Not claim mergeability unless GitHub confirms it.
6. Not claim branch synchronization with remote `main` unless verified.

### Conflict Handling

Preferred workflow:

1. Close conflicted PR.
2. Delete conflicted branch.
3. Create fresh branch from current `main`.
4. Reimplement approved change.
5. Open clean replacement PR.

Avoid GitHub's web conflict editor unless explicitly approved.

### Repository Hygiene

Keep:

* `main`

Delete:

* merged feature branches
* abandoned branches
* replaced conflict branches

---

## Verification Rules

Codex environments may have limited:

* GitHub access
* Browser access
* npm access
* Proxy/network access

Do NOT install:

* Playwright
* Browser screenshot tooling
* npm packages
* Frameworks
* Build tools
* External dependencies

unless explicitly approved.

Preferred verification methods:

* `node --check`
* `git diff --check`
* conflict-marker scan
* HTML parse validation
* static DOM/hook checks
* local HTTP server + curl smoke test
* manual verification notes

Browser verification is optional.

If unavailable, skip it silently.

---

## Current Product Direction

Current UI architecture:

* Card List panel
* Card Detail panel
* Settings panel
* Data panel
* Full-screen Checkout Mode

Data Panel is the sync/setup control center.

Approved architecture, schema, sync behavior, and connection model are documented in:

```text
docs/PHASE_6_SCHEMA_API_DECISIONS.md
```

---

## Preferred Design Principles

* Mobile-first
* Fast loading
* Minimal dependencies
* Clear balance visibility
* Efficient in-store barcode access
* Simple synchronization workflow
* Spreadsheet-friendly data model
* Low operational cost
* Easy self-hosting via GitHub Pages

---

## Success Criteria

A user can:

1. Maintain gift card records in a Google Sheet.
2. Open Walmart-GC on desktop or mobile.
3. View barcodes and PINs quickly.
4. Update balances and Used state.
5. Have updates synchronized back to the same Google Sheet.
6. Continue using the app when temporarily offline.
7. Manage dozens of gift cards without relying on a spreadsheet interface during checkout.

---

## Current Roadmap Status

Completed:

* Phase 1 – Static app foundation
* Phase 2 – Checkout workflow improvements
* Phase 3 – Used flag model and settings
* Phase 4 – Mobile navigation workflow
* Phase 5B – Data panel and checkout refinements
* Phase 6 – Google Sheet schema, sync architecture, Apps Script API design
* Phase 7 – Sync implementation

Current:

* Phase 8 – MVP hardening and deployment documentation

Upcoming:

* Post-MVP enhancements only after MVP hardening
