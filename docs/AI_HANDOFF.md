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

The current implemented data model is still prototype-only. Phase 6 has recorded an MVP Google Sheet schema candidate for planning, but sync/schema implementation must wait until API contract decisions are finalized.

Current implemented prototype fields:

cardNumber
pin
startingBalance
currentBalance
dateAdded
dateUpdated
dateUsed
used

Phase 6 MVP schema candidate:

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
  - MVP schema, Apps Script connection, sync timing, conflict-state, and Data panel setup directions are documented in `docs/PHASE_6_SCHEMA_API_DECISIONS.md`.
  - Apps Script API endpoints, payloads, error formats, and deployment instructions remain open; do not implement sync yet.

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
