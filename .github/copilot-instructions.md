# Walmart-GC Development Instructions

Project type:

Static website hosted on GitHub Pages with a Cloudflare Worker OAuth/session backend.

Active phase:

- Phase 11 is the active development phase.
- Active branch: `phase-11`.
- Protected branch: `main`.
- Phase 11 focus: fix OAuth/session flow until fully functional and durable.

Stack:

- HTML
- CSS
- JavaScript
- GitHub Pages
- Cloudflare Worker
- Workers KV
- Google OAuth
- Google Drive API / Google Sheets API

Do not introduce:

- React
- Vue
- Angular
- Node.js build systems
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
- Worker URL: `https://walmart-gc-oauth.dotsthewarlock.com`.
- OAuth scope remains `https://www.googleapis.com/auth/drive.file`.
- Frontend auth state comes from `/api/status`.
- Logout uses `/api/logout`.
- Worker API calls use `credentials: "include"`.
- Frontend never stores access tokens, refresh tokens, session IDs, OAuth secrets, or Google API credentials.
- Do not use localhost OAuth, alternate OAuth origins, `/Walmart-GC/`, session IDs in query parameters, Google Identity Services browser token flow, direct browser Drive API calls, or direct browser Sheets API calls.

Requirements:

- Mobile-first
- Fast loading
- Minimal dependencies
- Small PRs
- Maintainability over complexity
- Offline usability and CSV backup/recovery remain available
- Do not redesign core product behavior during Phase 11 unless it directly blocks OAuth, session management, Google Sheets access, or sync

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
