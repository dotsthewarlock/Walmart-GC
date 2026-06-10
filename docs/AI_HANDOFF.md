# Walmart-GC AI Handoff

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

cardNumber
pin
startingBalance
currentBalance
dateAdded
dateUpdated
dateUsed
used

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

- Phase 1 – Static Foundation
- Phase 2 – Checkout Workflow
- Phase 3 – Used Flag Model
- Phase 4 – Mobile Navigation

## Current Phase

- Phase 5B – Data Panel & Checkout Refinements

## Next Phase

- Phase 6 – Google Sheet Schema & Apps Script Design

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
