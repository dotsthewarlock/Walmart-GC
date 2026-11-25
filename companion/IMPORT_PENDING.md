# Companion distribution migration — draft, not deployable

The local V1.0.2 repository-import bundle contains the V1.0.1-derived source, synchronized build, Dev staging and explicit Stable promotion scripts, and regression tests. This draft branch holds the version authority and channel launcher only until the complete bundle is imported. No public assets yet. Import the bundle into this branch, verify its contents, run the existing and new tests, then remove this marker. Do not merge or publish a partial import.

Both distributions must use one version and exact checked-in source revision. Stable promotion copies accepted Dev bytes without rebuilding. The original standalone bookmarklet remains a separate recovery fallback. Native hosted loading and full workflow parity remain unverified. No new merchant behavior, permissions or infrastructure is authorized by this migration.
