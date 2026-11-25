# Private wallet Sheet setup

V0.3 is a release candidate, not a deployed update. Protocol/schema authority is
[Architecture](ARCHITECTURE.md); infrastructure/release gates are in
[QA](QA_TEST_CHECKLIST.md) and [Deployment](DEPLOYMENT_GUIDE.md).

After release, use the existing custom-domain app and same-origin Worker OAuth.
End users never paste OAuth credentials or create app-owned accounts. Consent is
limited to drive.file. Actual principal/ownership behavior and coordinator
bindings must be independently validated before production writes are enabled.
Synthetic development acceptance uses mocked APIs, never localhost live OAuth.

1. Open Settings and connect Google. The Worker verifies the stable principal.
2. A unique app-accessible, privately owned `Walmart-GC Data` Sheet can be bound
   automatically. Only matching owners are accepted; emails are not identity.
3. If none exists, expand Connection and recovery → Create or initialize private
   Sheet. If discovery is ambiguous, enter the exact app-accessible Sheet ID.
4. Setup creates/initializes Cards and `_META` through protected coordination.
   It preserves existing rows, headers, other tabs and metadata. Unknown schema
   or occupied append targets block writes rather than overwriting them.
5. Unbound/older offline inventory remains separate. Export a private CSV/recovery
   backup, then explicitly recover it into the matching freshly verified account
   if desired. Ambiguous credentials do not merge automatically.
6. Completed actions synchronize automatically while open. Sync now checks pending
   work/commit proof. It cannot bypass an uncertain write or account mismatch.

Required and optional headers, historical layouts and CSV formats are specified
once in Architecture. V0.3 accepts pendingReconciliation absent/false/true and
retains date-only verification metadata. Do not manually backfill optional cells.

Before direct Card edits, pause shared maintenance and save a private backup.
Keep managed `_META` protocol, commit and recovery fields intact. Resume accepts
the observed contents and only explicitly confirmed deleted identities. Merely
removing a row does not authorize deletion or stale-device resurrection. Uncertain
balances require fresh merchant verification; conflicting credentials require
explicit review. Neither matching amounts nor missing markers establish success.

No Apps Script, extra OAuth scope, central card database or public Sheet is needed.
