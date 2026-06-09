# Walmart-GC Agent Instructions

## Project Architecture

Walmart-GC is a mobile-first web application for managing large numbers of Walmart gift cards.

Primary use case:

- Store and organize 30-100+ Walmart gift cards
- Display barcodes for fast in-store checkout
- Track unused, partially used, and fully used cards
- Synchronize records between desktop and mobile devices
- Use Google Sheets as the source of truth

This is a gift card management system, not merely a barcode generator.

Architecture:

- Source of truth: user-owned Google Sheet
- Integration layer: Google Apps Script Web App
- Frontend: GitHub Pages static website
- Data flow: User Google Sheet <-> Google Apps Script <-> Walmart-GC Web App

The web app should never require a dedicated server.

Prefer simple, low-maintenance solutions compatible with GitHub Pages.

## Tech Stack

Frontend:

- Plain HTML
- CSS
- JavaScript

Hosting:

- GitHub Pages

Deployment:

- GitHub repository -> main branch -> GitHub Pages

Do not introduce frameworks, build tools, databases, backend infrastructure, user accounts, or paid services unless explicitly approved.

## Roles

ChatGPT is the product architect.

ChatGPT creates:

- Product logic
- Specifications
- Architecture guidance
- Data model guidance
- Dev AI / Codex briefs
- Acceptance criteria
- Review feedback

Codex is the coding agent.

Codex writes code, edits repository files, runs checks, reviews diffs, and prepares GitHub changes.

## MVP Scope

Required:

- Gift card list view
- Gift card detail view
- Barcode rendering
- PIN display
- Remaining balance tracking
- Status tracking:
  - Unused
  - Partial
  - Used
- Google Sheet synchronization
- Mobile-friendly interface
- Desktop-friendly interface

## Non-Goals v1

Do not prioritize:

- User accounts
- Multi-user collaboration
- Shared databases
- Subscription systems
- Complex analytics
- Receipt scanning
- Camera barcode scanning
- Automated balance checks
- Native mobile apps

These may be considered future enhancements.

## Development Rules

- ChatGPT creates product logic, specifications, architecture guidance, and Dev AI briefs.
- Codex writes code.
- Keep changes small and PR-focused.
- Inspect current repository files before suggesting implementation changes.
- Explain current architecture before recommending modifications.
- Prefer the smallest safe change that achieves the goal.
- Flag security, deployment, data-model, or migration risks before implementation.
- Prioritize maintainability and simplicity.
- Prioritize mobile usability.
- Review all Codex-generated changes before merge.

## GitHub Update Discipline

Codex should minimize GitHub update interactions.

Before committing, pushing, or opening a PR, Codex should:

1. Inspect the current repository state.
2. Understand the full requested change.
3. Plan the full implementation.
4. Make all related code changes locally.
5. Run available checks or manual verification.
6. Review the complete diff.
7. Push one coherent change set.

Avoid repeated small pushes unless fixing a failed check or responding to explicit review feedback.

## Minor vs Major Change Framework

Minor changes may proceed without extra user authorization once assigned.

Minor examples:

- Text edits
- Documentation updates
- CSS polish
- Small layout fixes
- Limited bug fixes
- Minor accessibility improvements
- Small validation improvements
- Refactoring that does not change behavior

Major changes require discussion, clarification, and confirmation before coding.

Major examples:

- Data model changes
- Google Sheet schema changes
- Google Apps Script API changes
- Barcode generation logic changes
- Sync behavior changes
- Authentication or security changes
- Large UI restructuring
- New major features
- Dependency, framework, build tool, backend, database, account, or hosting changes
- Anything that may affect deployed user data

When uncertain whether a change is minor or major, treat it as major.

After a major change is confirmed, Codex should complete all approved code changes locally, verify them, review the full diff, and then push one complete change set.

## Preferred Design Principles

- Mobile-first
- Fast loading
- Minimal dependencies
- Clear card status visibility
- Efficient in-store barcode access
- Simple synchronization workflow
- Spreadsheet-friendly data model
- Low operational cost
- Easy self-hosting via GitHub Pages

## Success Criteria

A user can:

1. Maintain gift card records in a Google Sheet.
2. Open Walmart-GC on desktop or mobile.
3. View barcodes and PINs quickly.
4. Update balances and status.
5. Have updates synchronized back to the same Google Sheet.
6. Manage dozens of gift cards without relying on a spreadsheet interface during checkout.
