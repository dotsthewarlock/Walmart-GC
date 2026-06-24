# Walmart-GC Development Instructions

Start with `docs/CODEX_ACTIVE_CONTEXT.md` for compact current Phase 12 context. Use `docs/archive/` only for historical/regression tasks, not normal implementation guidance.


Project type:

React 19 web app built with Vite and styled with Tailwind CSS, hosted on GitHub Pages with a Cloudflare Worker OAuth/session backend.

Active migration:

- React 19 + Vite + Tailwind migration on `agy-v1` is current.
- `phase-12` remains behavior source of truth and protected production baseline.
- The Agy-first guarded Terminal/Agy Low/Medium workflow replaces the retired Codex automation.

Stack:

- React 19
- Vite
- Tailwind CSS
- GitHub Pages
- Cloudflare Worker
- Workers KV
- Google OAuth
- Google Drive API / Google Sheets API

Do not introduce:

- Vue
- Angular
- Databases
- Firebase
- Cloud Functions
- Apps Script sync
- Backend servers beyond the existing Cloudflare Worker
- New hosting

Current architecture:

```text
User Google Account
        ↕
Google OAuth
        ↕
Cloudflare Worker
        ↕
Google Drive API / Google Sheets API
        ↕
Walmart-GC Web App
```

OAuth/session rules:

- Use `https://walmart-gc.dotsthewarlock.com` for production, development, and testing.
- Worker routes: same-origin `/auth/*` and `/api/*` on `https://walmart-gc.dotsthewarlock.com`; legacy `https://walmart-gc-oauth.dotsthewarlock.com` may remain fallback/legacy only.
- OAuth scope remains `https://www.googleapis.com/auth/drive.file`.
- Frontend auth state comes from `/api/status`.
- Logout uses `/api/logout`.
- Worker API calls use same-origin `/api/*` paths with `credentials: "include"`.
- Frontend never stores access tokens, refresh tokens, session IDs, OAuth secrets, or Google API credentials.
- Do not use localhost OAuth, alternate OAuth origins, `/Walmart-GC/`, session IDs in query parameters, Google Identity Services browser token flow, direct browser Drive API calls, or direct browser Sheets API calls.

Requirements:

- Mobile-first
- For UI/design decisions, follow the Material 3 governance guidance in `docs/CODEX_ACTIVE_CONTEXT.md`.
- Fast loading
- Minimal dependencies
- Small PRs
- Maintainability over complexity
- Offline usability and CSV backup/recovery remain available
- Do not redesign core product behavior during this migration unless it directly blocks OAuth, session management, Google Sheets access, or sync

Before making changes:

1. Inspect existing files.
2. Explain current implementation.
3. Recommend the smallest safe change.
4. Flag deployment, OAuth, session, schema, sync, or user-data risks.

Priorities:

1. OAuth/session durability
2. Google Sheets access and sync reliability
3. Barcode accessibility
4. Gift card management workflow
5. Mobile usability
