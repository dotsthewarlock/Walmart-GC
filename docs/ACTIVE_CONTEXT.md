# Active Context (GC Wallet)

Read this document first for all current GC Wallet (Walmart-GC) tasks. This is the primary "Start Here" context file for human operators and AI agents, summarizing the active project state and current developer focus.

---

## AI Start Here / Fast Path

If you are an AI agent (Agy, GPT, Codex, etc.) starting a task:
1. **Operating Rules**: Read [AGENTS.md](../AGENTS.md) in the root to understand execution rules, the Chromebook/Agy stability rule (Phase A/B Split), and validation requirements.
2. **Current Goal**: Focus *strictly* on the active PR scope. Do not exceed authorized changes.
3. **Architecture & Schema**: Review [ARCHITECTURE.md](ARCHITECTURE.md) for data schemas, sync APIs, and session cookies.
4. **Design Authority**: Review [M3_DESIGN_DECISIONS.md](M3_DESIGN_DECISIONS.md) for Material 3 UI component layouts, typography, and visual rules.
5. **Future Plans**: Consult [ROADMAP.md](ROADMAP.md) for planned features and boundaries. Do not write code or create TODOs for Lane 3/4 items.
6. **Workflow Preference**: Prefer Codex CLI / Codex interactive for bounded repo implementation and verification work. Use T1 for lightweight exact commands, quick checks, emergency recovery, or user-requested terminal truth. Use Agy interactive only when GPT strongly recommends it or the user explicitly asks.
7. **Low-Friction Style**: Primary priority is low safe user friction. Batch commands where safe, use internally sliced tasks, include self-checks, and avoid microsteps or drip-fed commands. GPT should prefer one complete scoped Codex prompt per task or phase.

---

## Current Basics
- **Repository**: `dotsthewarlock/Walmart-GC`
- **Active Branch**: `main` (strict-M3 primitive milestone merged and audited; no active implementation branch)
- **Base Branch**: `main` (React 19 + Vite + Tailwind CSS production candidate)
- **Parity Reference**: `phase-12` (archival production baseline branch)
- **Live URL**: `https://walmart-gc.dotsthewarlock.com`
- **Verification Status**: React 19 + Vite + Tailwind CSS build on `main` is successfully deployed and verified live via GitHub Actions.
- **Current Design Direction**: strict-M3, project-owned React/Tailwind primitives. Use M3 and industry-standard terminology as design authority; treat current repo names, class clusters, and component names as implementation evidence only. shadcn has been removed and should not be reintroduced as a visual design-system layer.

---

## Active Development Focus & PR Phases

Our active development sequence is organized into highly structured Pull Request (PR) phases:
- **PR 1: Core Decisions Promotion** (Completed): Approved decisions (GC Wallet brand, passive inline barcode, no Focus Mode, privacy guardrails) successfully promoted into durable repository documentation.
- **PR 2: AI-First Documentation Cleanup** (Completed): Consolidating files, removing duplication, establishing clear document ownership, and maximizing AI-context token efficiency.
- **PR 3: Focus Mode Removal Implementation** (Completed): Refactoring `src/App.jsx` to completely remove Focus Mode state, event listeners, and scrim overlays, transitioning Checkout to the passive inline barcode display.
- **PR 4: Strict-M3 Primitive Migration** (Completed): Button, IconButton, Chip / StatusChip, form, containment, and list / navigation primitives are merged and audited on `main`.
- **PR 5: Near-Term Enhancements**: Next approved lane is production/source verification, smoke QA, and M3 polish for Cards/Settings. Schema, merchant-profile, camera-scan, balance-check, and infra rename work remain approval-gated.

---

## High-Level System Architecture

GC Wallet uses a static frontend backed by a serverless Cloudflare Worker proxy for security and private synchronization:
- **Frontend**: React 19 + Vite + Tailwind CSS hosted on GitHub Pages.
- **Backend Worker**: Handles Google OAuth 2.0 flow and acts as a CORS-safe proxy to Google Sheets / Google Drive APIs.
- **Data Synchronization**: Gift cards are stored in standard browser `localStorage` and synchronized with a private user-owned spreadsheet named `Walmart-GC Data`. No central databases or developer-owned card aggregation exists.

*For full details on data models, cookie specifications, and API routes, see [ARCHITECTURE.md](ARCHITECTURE.md).*

---

## Hard Guardrails
- **No Localhost OAuth**: All production and dev/testing OAuth is cloud-only via `https://walmart-gc.dotsthewarlock.com`.
- **No Schema Changes**: Do not change spreadsheet schemas, sync behaviors, or CSV recovery flow without discussion.
- **No Extra Dependencies**: Do not introduce databases, Firebase, Apps Script sync (Apps Script is retired), or extra NPM packages.
- **OAuth Scope Limit**: Never request Google scopes beyond `https://www.googleapis.com/auth/drive.file`.

---

## Three-Tier Developer Environment
- **T1 = Terminal Exact Truth (State & Integrity Authority)**: Use for running `git status`, `git diff`, `npm run build`, and targeted grep verifications.
- **T2 = Local Runtime (Dev Servers)**:
  - Frontend Vite Dev: `http://127.0.0.1:5174` (Proxied to local Worker).
  - Wrangler Dev Worker: `http://localhost:8787`.
  - Both dev servers can run together via:
    ```bash
    trap 'kill $(jobs -p)' EXIT
    (npm run dev & npx wrangler dev worker/src/index.js --port 8787 & wait)
    ```
- **T3 = AI Workspace (Codex CLI / interactive, Agy exception path)**: Scoped repo implementation, checking, documentation updates, and handoff work. Prefer Codex for normal bounded tasks; use Agy only when explicitly requested or when GPT recommends it.

---

## Run-State Handoff Ledger

Issue #200 is the active run-state handoff ledger for GPT/Codex/T1 coordination. It is not durable product, design, or implementation authority.

- Codex/T1 updates #200 after meaningful runs with timestamp, branch, PR status, checks, QA, risks, next step, and do-not-do guardrails.
- GPT reviews the latest #200 handoff before next-step implementation guidance only when GitHub connector use is explicitly allowed.
- If connector use is not allowed, the latest #200 handoff should be pasted into GPT.
- Default reading window: newest timestamped `Active Handoff` comment. If ambiguous, compare the latest 3; older comments are historical unless debugging prior branch, PR, or CI history.
- Durable decisions belong in repo docs, not in #200 or chat logs.
- Durable authority remains, in order: `origin/main` code, `docs/ACTIVE_CONTEXT.md`, `docs/M3_DESIGN_DECISIONS.md`, `docs/reference/M3_Core_Guidelines.md`.

---

## Documentation Index

Refer to these durable repository documents for specific domain details:

- **AI operating rules & workflow guidelines**: [AGENTS.md](../AGENTS.md) (Root)
- **Current state & start-here overview**: [ACTIVE_CONTEXT.md](ACTIVE_CONTEXT.md)
- **Durable roadmap & future intent**: [ROADMAP.md](ROADMAP.md)
- **System architecture, APIs, and data models**: [ARCHITECTURE.md](ARCHITECTURE.md)
- **UI/UX design authority & M3 compliance**: [M3_DESIGN_DECISIONS.md](M3_DESIGN_DECISIONS.md)
- **Historical decisions log**: [DECISIONS_LOG.md](DECISIONS_LOG.md)
- **Manual QA checklists & troubleshooting**: [QA_TEST_CHECKLIST.md](QA_TEST_CHECKLIST.md)
- **Build & deployment steps**: [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)
- **Google Sheet setup instructions**: [GOOGLE_SHEET_SETUP.md](GOOGLE_SHEET_SETUP.md)
- **Non-blocking hygiene & cleanup tracking**: [MAINTENANCE_LOG.md](MAINTENANCE_LOG.md)
- **Historical context & pre-React archive**: [Documentation Archive README](archive/README.md)
