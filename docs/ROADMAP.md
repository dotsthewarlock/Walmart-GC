# GC Wallet roadmap

## Approved current release candidate

V0.3 consolidates transactional local persistence, verified account/Sheet binding,
protected per-Sheet coordination, conservative automatic sync, targeted recovery,
shared maintenance and uncertainty verification. Preserve wallet navigation, CSV,
Batch TSV v1 and M3 primitives. See [Architecture](ARCHITECTURE.md) for contracts.

Independent review and [release acceptance](QA_TEST_CHECKLIST.md) precede merge or
deployment. Actual DO runtime/binding, stable Google principal/ownership behavior,
secret/session binding integrity and integrated browser QA remain prerequisites.

Optional clipboard detection can surface applicable copied Batch results for explicit
review, including when returning to an open Batch review. A one-time explicit
permission action is offered where supported; detection uses only granted access.
Manual paste and explicit application remain available.

## Near term, only after synchronization foundation

Online-use reconciliation remains deferred. Full UTC verification timestamp
persistence is a separate approved design exercise; preserve date-only storage now.
Improve recovery evidence cleanup only when actual usage warrants it and safe
retention/backup requirements are established.

## Unapproved expansion

No central card database, generalized event sourcing, public account platform,
merchant automation, helper rewrite, new OAuth scopes or runtime dependencies.
No speculative abstractions, navigation redesign or unrelated features.

[Historical explicit-sync/phase requirements](archive/pre-v0.3-sync-governance.md)
are superseded by the consolidated V0.3 authorization and are not active gates.
