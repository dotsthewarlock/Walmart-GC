# Phase 13 React Scaffold

This directory is an isolated React + Tailwind + Material 3-aligned scaffold for Phase 13 migration experiments. It does not replace the active production runtime.

## Scope

- Scaffold location: `react-app/`.
- Active production files (`index.html`, `app.js`, and `styles.css`) remain unchanged.
- Worker, OAuth/session, `/api/*` contracts, Google Sheet schema, sync/conflict behavior, CSV recovery, Cloudflare routes, GitHub Pages hosting, and app-shell fingerprints remain unchanged.
- No build output should be committed from this scaffold.

## Commands

From the repository root:

```sh
cd react-app
npm install
npm run build
npm run dev
```

`npm run dev` starts a local Vite preview for scaffold development only. It is not the production deployment path.

## Token direction

The scaffold uses Tailwind theme entries backed by CSS custom properties named with Material 3-style roles, including primary, primary container, surface, surface container, outline, error, shape, and elevation tokens. Project-specific success and warning roles remain explicit extensions because Material 3 does not define first-class success/warning system colors.

## Migration guardrails

Future Phase 13 migration work should keep this scaffold isolated until a separate cutover plan proves parity for checkout speed, barcode readability, auth/session behavior, sync/conflict handling, CSV backup/recovery, offline/local usability, static output ownership, rollback, and deployment safety.
