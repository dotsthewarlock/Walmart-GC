# Architecture

## Overview

Walmart-GC uses a lightweight architecture that avoids dedicated servers and databases.

## Components

### Google Sheet

Stores:

- Card Number
- PIN
- Starting Balance
- Remaining Balance
- Status
- Notes
- Last Updated

### Google Apps Script

Acts as an API layer between the web application and Google Sheets.

Responsibilities:

- Read cards
- Update balances
- Update status
- Validate requests

### Walmart-GC Web App

Provides:

- Card list
- Card details
- Barcode display
- Mobile checkout workflow

## Data Flow

User Action
↓
Walmart-GC
↓
Apps Script
↓
Google Sheet

## Design Principles

- Mobile first
- Minimal dependencies
- Static hosting
- Spreadsheet as source of truth
- Low maintenance
