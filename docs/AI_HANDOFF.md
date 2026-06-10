# Walmart-GC AI Handoff

For full project instructions, workflow rules, and governance, see AGENTS.md.

## Repository

dotsthewarlock/Walmart-GC

## Stack

- HTML
- CSS
- JavaScript
- GitHub Pages

No frameworks.
No build tools.
No backend server.

## Product Summary

Walmart-GC is a mobile-first gift card management application for users managing dozens of Walmart gift cards.

## Current Architecture

User Google Sheet ↔ Google Apps Script ↔ Walmart-GC

Current implementation is prototype-only and does not yet include sync.

## Current Data Model

The current implemented data model is still prototype-only. Phase 6 has recorded the approved MVP Google Sheet schema and sync architecture for planning, but sync/schema implementation must follow `docs/PHASE_6_SCHEMA_API_DECISIONS.md`.

Current implemented prototype fields:

cardNumber
pin
startingBalance
currentBalance
dateAdded
dateUpdated
dateUsed
used

Phase 6 approved MVP schema:

cardNumber
pin
merchant
startingBalance
currentBalance
dateAdded
dateUpdated
dateUsed
used
notes

Assumptions:

- Used is independent of balance.
- Current Balance is authoritative.
- Starting Balance is historical.
- Negative Amount Used values are allowed.
- Current Balance may exceed Starting Balance.
- Current Balance may not go below zero.

## Current UI

- Card List
- Card Detail
- Settings
- Data
- Full-screen Checkout Mode

## Completed Phases

- Phase 1 – Static App Foundation
- Phase 2 – Checkout Workflow Improvements
- Phase 3 – Used Flag Model
- Phase 4 – Mobile Navigation Workflow

## Current Implementation Phase

- Phase 5B – Data Panel & Checkout Refinements

## Current Architecture Focus

- Phase 6 – Google Sheet Schema & Apps Script API Design
  - The approved Phase 6 architecture summary is documented in `docs/PHASE_6_SCHEMA_API_DECISIONS.md`.
  - Phase 7 sync implementation should follow that document; do not implement sync outside the approved architecture.

## Verification Rules

Do not install:
- Playwright
- Browser screenshot tooling
- npm packages
- Frameworks
- Build tools

Preferred verification:
- node --check
- git diff --check
- conflict-marker scan
- HTML parse validation
- DOM/hook validation
- local HTTP server + curl smoke test
