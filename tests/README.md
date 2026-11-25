# Product validation

Run `npm test`, `npm run test:browser`, `npm run build` and `git diff --check`.
The [integrated QA checklist](../docs/QA_TEST_CHECKLIST.md) owns setup, acceptance
and release prerequisites; do not duplicate historical phase checklists here.

The Node suites cover production reducers/adapters/protocols with synthetic
Google and IndexedDB fixtures. Browser acceptance uses actual React/IndexedDB
and production reconciliation/coordinator modules, with all API traffic mocked.
No native IndexedDB harness rerun is required when its accepted foundation is
unaffected. [indexeddb.html](./indexeddb.html) is retained for targeted future
native regression diagnosis only; do not claim an unexecuted check passed.

Legacy localStorage fixture modules exercise historical import preservation;
the app does not import their writers. Production has no dual-write bridge.
