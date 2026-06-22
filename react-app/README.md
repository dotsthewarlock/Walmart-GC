# Walmart-GC React Scaffold

This directory is an isolated Phase 13 exploration scaffold for a possible future React, Tailwind, and Material 3 direction.

## Scope

- The production app remains the repository root `index.html`, `app.js`, and `styles.css` files.
- This scaffold does not change Worker routes, OAuth/session handling, Google Sheets sync, CSV backup/recovery, schema, deployment, or GitHub Pages runtime behavior.
- The scaffold is not wired into production hosting.

## Dependency hygiene

Runtime dependencies are limited to:

- `react`
- `react-dom`

Development dependencies are limited to:

- `vite`
- `@vitejs/plugin-react`
- `typescript`
- `tailwindcss`
- `postcss`
- `autoprefixer`

All versions are pinned to explicit non-`latest` values in `package.json`.

## Local commands

From this directory:

```sh
npm install
npm run build
npm run dev
```

If package installation fails with a registry/proxy `403`, treat it as an environment limitation rather than an application build failure.
