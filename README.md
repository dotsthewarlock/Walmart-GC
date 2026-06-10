# Walmart-GC

Mobile-first Walmart gift card manager.

Walmart-GC is a static web application that helps users manage large numbers of Walmart gift cards by providing a mobile-friendly interface for barcode access, PIN lookup, balance tracking, and status management.

## Features

- View Walmart gift cards on desktop or mobile
- Display barcodes for in-store checkout
- Display PINs
- Track remaining balances
- Track card status:
  - Unused
  - Partial
  - Used
- Synchronize with a Google Sheet

## Architecture

Source of Truth:

Google Sheet

Integration Layer:

Google Apps Script Web App

Frontend:

GitHub Pages static website

Data Flow:

Google Sheet ↔ Google Apps Script ↔ Walmart-GC

## Technology

- HTML
- CSS
- JavaScript
- GitHub Pages
- Google Sheets
- Google Apps Script

## Project Goals

The primary goal is to make management of dozens of Walmart gift cards practical on mobile devices while keeping Google Sheets as the source of truth.

## Documentation

- [Deployment Guide](docs/DEPLOYMENT_GUIDE.md)
- [Apps Script Setup](docs/APPS_SCRIPT_SETUP.md)
- [Google Sheet Setup](docs/GOOGLE_SHEET_SETUP.md)
- [Troubleshooting](docs/TROUBLESHOOTING.md)

## Current Status

Phase 8 — MVP Hardening & Deployment.

The MVP architecture is complete. Phase 8 is focused on documentation, deployment guidance, setup guidance, testing, troubleshooting, diagnostics, and hardening. It is not an architecture phase.

## MVP Sync Provider

Google Apps Script is the approved MVP sync provider between Walmart-GC and the user-owned Google Sheet. Future post-MVP versions may evaluate direct Google OAuth + Google Sheets API access or additional sync providers, but OAuth is not part of Phase 8 and the MVP should not be redesigned around OAuth.

## Sheet Sharing

Walmart-GC operates against a Google Sheet. It does not manage users, roles, or permissions; Google Sheets controls sharing and access. Shared Sheets are allowed when the relevant users have Google Sheet access.

The MVP is not designed for real-time collaboration workflows, live multi-client synchronization, presence indicators, activity history, or collaboration tooling. The approved sync and conflict-handling mechanisms are the MVP solution when underlying Sheet data changes independently.
