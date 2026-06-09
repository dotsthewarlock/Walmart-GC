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

## Status

Planning / MVP Design
