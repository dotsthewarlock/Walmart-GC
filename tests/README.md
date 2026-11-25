# Transactional local foundation validation

Run the original 88 checks plus the focused production-adapter/reducer cases:

```sh
node --test --test-isolation=none --test-reporter=tap src/lib/*.test.mjs worker/*.test.mjs
```

This command was validated with Node 24. The existing Node 20 CI workflow remains
unchanged and does not automatically execute these test files.

The original assertions remain intact. Their old localStorage-specific APIs now
come from [legacy card fixtures](../src/lib/legacyCards.fixture.mjs) and
[legacy Batch fixtures](../src/lib/legacyTransfer.fixture.mjs), which the
application does not import. Protocol/review/schema logic remains production code.
The focused tests exercise the new [adapter and reducer](../src/lib/inventory.js),
including offline compartment selection and per-compartment CSV/recovery exports,
persistent context generations rejecting delayed responses and stale editors,
and unique migration IDs retained through abort/restart. UI copy/wiring checks
are source assertions, not React interaction tests.
[The Node transaction model](./syntheticIndexedDB.mjs) is explicitly synthetic;
passing it does not establish native browser correctness.

For native IndexedDB checks, start this isolated static test server from the repo:

```sh
python3 -m http.server 8123 --bind 0.0.0.0 --directory /workspaces/Walmart-GC
```

In Codespaces **Ports**, forward port 8123 with **Private** visibility. Open the
HTTPS forwarded address at `/tests/indexeddb.html`. Click **Run checks**, require
every check to pass, then click **Reload and verify** and require the restart
check to pass. Stop the server with Ctrl+C. No dependencies or OAuth are needed.
This harness imports the actual production adapter and injects an abort into a
real native transaction after put, before completion. It uses synthetic records
in uniquely named databases and sends no Worker or Sheet requests.

Separate-tab UI notifications, denied/full storage, eviction, process termination,
mobile/browser compatibility, and the React task flow still require browser QA.
The harness's concurrent connections establish storage scheduling, not tab UI QA.
Do not report native checks as passing unless the harness was actually executed.

## Review boundaries

- Cards, semantic pending operations, revisions and Batch state share one native
  transaction. No write success is reported before its completion event.
- Legacy bytes and quarantined records remain archived; the old keys are never
  written by the application. Fresh installations do not seed bundled samples.
- CSV recovery adds/updates explicit identities and retains omitted cards.
  Conflicting credentials and stale recovery previews reject atomically.
- A Sheet import creates/reopens an unverified Sheet compartment and preserves
  the unbound compartment. Reopening a changed compartment retains local cards,
  quarantines differing remote data and never acknowledges pending operations.
  These are access contexts, not authenticated
  account ownership: the existing Worker does not provide a verified principal.
- Sheet export, overwrite, retry and setup writes fail before network access.
  This intentional compatibility restriction prevents account-context uncertainty
  from crossing into writes. Worker/OAuth correction is a separate prerequisite
  for restoring those operations. Pending operations are never acknowledged away.
- Valid legacy outstanding Batch requests are invalidated because their cached
  context is unverified. Applied references remain preserved; interrupted/damaged
  ledgers are quarantined and require checked discard. New Batch requests use the
  unchanged v1 packet protocol and a freshly checked, imported Sheet context.
- Local rollback to an older frontend is unsafe: it would resume legacy writes
  against preserved, stale localStorage bytes. Keep the IndexedDB-capable client
  or use a read-only recovery build; do not attempt a dual-write bridge.
- Pending operations, local receipts and quarantine evidence are retained without
  compaction in this phase. Storage exhaustion rejects new saves explicitly;
  browser eviction/site-data deletion still requires external CSV/Sheet recovery.
