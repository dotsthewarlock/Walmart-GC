# Retired Apps Script Reference

This folder is retained for historical/debugging reference only. Apps Script is not the active Phase 11 sync architecture.

Current sync is Worker-backed through `worker/src/index.js`. Do not use Apps Script as a default setup, sync, or user-facing path.

Inspect `apps-script/Code.gs` only when exact live behavior or an exact error string points to this path, or when explicitly investigating historical Apps Script behavior.

For current architecture and task context, start with `docs/ACTIVE_CONTEXT.md` and `docs/ARCHITECTURE.md`.
