# Phase 13 Decision Checkpoint

## Status

Planning checkpoint after Stage 1C.

This document closes the current Phase 13 Material 3 planning ladder. It does not approve implementation, runtime migration, React adoption, Tailwind adoption, Material package adoption, build tooling, dependency changes, CSS/token changes, visual redesign, generated assets, routing changes, hosting/deployment changes, Worker changes, OAuth/session changes, sync/conflict changes, schema changes, CSV backup/recovery changes, app-shell fingerprint changes, or active app replacement.

The current runtime remains the plain HTML/CSS/JavaScript app served by GitHub Pages with same-origin Cloudflare Worker `/auth/*` and `/api/*` routes.

## Completed planning artifacts

The Phase 13 planning sequence is complete enough to stop here:

1. Stage 0 / Stage 1 planning artifact: established React + Tailwind + Material 3 as a contained future-direction track, not an approved migration.
2. Stage 1 ADR: `docs/PHASE13_REACT_TAILWIND_M3_ADR.md` records the frontend-direction decision question and keeps implementation unapproved.
3. Stage 1A audit: `docs/PHASE13_MATERIAL3_TOKEN_AUDIT.md` inventories the current token/design state as a docs-only proposal.
4. Stage 1B token map: `docs/PHASE13_MATERIAL3_TOKEN_MAP.md` maps current values to candidate Material 3-aligned token names and alias ideas.
5. Stage 1C component inventory: `docs/PHASE13_MATERIAL3_COMPONENT_INVENTORY.md` maps current UI surfaces to component-scoped token candidates and product-safety notes.

## Current decision

Planning has reached a useful decision point. Do not continue creating more planning documents unless a specific unresolved decision gap is identified.

Current decision state:

- Stop the Material 3 planning ladder after Stage 1C.
- No runtime migration is approved.
- No React, Tailwind, Material package, package manager, dependency, or build-tooling adoption is approved.
- No CSS/token implementation is approved yet, including alias-only CSS changes.
- No visual redesign is approved.
- The current plain HTML/CSS/JavaScript runtime remains unchanged.

## Protected guardrails

The following remain protected and require separate explicit approval before any implementation work touches them:

- Worker-managed OAuth/session architecture.
- OAuth scope: `https://www.googleapis.com/auth/drive.file` only.
- Same-origin `/api/*` frontend calls with `credentials: "include"`.
- Same-origin `/auth/*` and `/api/*` Worker routing only; static frontend remains served from GitHub Pages root.
- Approved Google Sheet schema and header-name mapping.
- Merchant model and derived-only barcode payload.
- Completed-action sync only.
- `_META.sheetVersion` conflict model with no silent overwrite and no automatic merge.
- CSV backup/export/import/recovery behavior.
- Offline/local usability.
- GitHub Pages compatibility.
- App-shell fingerprints.
- Deployment, hosting, custom-domain, Worker route, and workflow-permission behavior.

## Next choices

Choose one of these next steps:

1. Stop Phase 13 here and keep the planning docs as future reference.
2. Later, explicitly approve one tiny CSS-only no-visual-change alias pilot, limited to aliases that preserve current computed values exactly.

Do not proceed to React, Tailwind, build tooling, package changes, runtime migration, broad UI redesign, Worker/auth/sync/schema/CSV changes, deployment changes, or app-shell fingerprint changes from this checkpoint alone.

## Recommended default

Default to stopping here. If implementation is desired later, start with a separate explicit approval gate for a very narrow CSS alias pilot and require proof that computed visual output remains unchanged.
