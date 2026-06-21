# AI Handoff

Read `docs/CODEX_ACTIVE_CONTEXT.md` first, then this file, before any in-scope AI lane action. This file is the rolling cross-lane handoff ledger for Phase 13. It should stay compact, current, and pruned.

## Current State

- Active branch: `phase-13`.
- Protected production branch: `main`.
- Phase direction: evaluate and stage a React + Tailwind + Material 3-aligned frontend migration while preserving the current Worker OAuth/session/sync architecture.
- Current app architecture remains GitHub Pages frontend plus Cloudflare Worker same-origin `/auth/*` and `/api/*` routes.
- Runtime guardrails remain unchanged: do not alter schema, OAuth scope, auth/session, sync/conflict behavior, CSV recovery, Worker routes, deployment, or hosting unless explicitly approved as a separate focused task.

## AI Handoff-First Rule

Before any in-scope action, all AI lanes must read:

1. `docs/CODEX_ACTIVE_CONTEXT.md`
2. `docs/AI_HANDOFF.md`

This applies to ChatGPT discussion/review, ChatGPT/GitHub connector edits, Codex prompts, user terminal batches, and GitHub Actions lifecycle work. If these docs disagree, treat `CODEX_ACTIVE_CONTEXT.md` as the compact rule source and this file as the current operational ledger.

## Rolling Ledger Rules

This file is not an append-only transcript. Update it by replacing stale section content with current facts.

Keep:

- current phase, branch, architecture direction, and guardrails
- last 5-10 meaningful recent steps
- latest diagnostic and validation result
- next 3-5 immediate roadmap items
- live risks that still affect the next decision

Move to `docs/MAINTENANCE_LOG.md`:

- deferred cleanup
- non-immediate validation gaps
- stale branch/docs concerns
- unresolved risks that must not be forgotten but are not part of the next few steps

Prune from this file:

- old terminal tokens
- superseded prompts
- repeated status updates
- completed stale diagnostics
- duplicated architecture text already covered by `docs/ARCHITECTURE.md`
- historical phase details unless directly relevant to the current step

Target size: 100-180 lines. Recent steps max: 10. Immediate roadmap max: 5. Open risks max: 10.

## Phase 13 AI Lanes

- Lane 0 - User terminal batch: preferred for compact local inspection, validation, dependency/build experiments, and controlled migration spikes.
- Lane 1 - ChatGPT discussion/review/command drafting: architecture, risk, Material 3 guidance, Codex prompt design, and merge-safety review.
- Lane 2 - ChatGPT/GitHub connector: small, bounded docs/config edits where connector writes are safe.
- Lane 3 - Codex: broader implementation, coordinated multi-file migration work, and validation-heavy changes.
- Lane 4 - GitHub Actions lifecycle: PR creation, validation, merge, and cleanup automation when configured and eligible.

Lane 0 terminal convention:

```text
wg13 <human-readable-token>
```

Use one public function name, `wg13`, with exactly one armed token per iteration. The function should reject missing, wrong, stale, or already-used tokens; print its batch token; guard the expected repo/branch; mark the token used; run only the current iteration commands; and ask the user to paste output back before the next mutating step.

## Recent Steps

- Created branch `phase-13` from `phase-12` for contained future-direction discussion.
- Discussed React + Tailwind + Material 3 migration as a Phase 13 architecture direction, not a Phase 12 change.
- Agreed terminal-first AI lane is preferred when compact and safe.
- Designed durable Lane 0 terminal batch pattern: stable `wg13` command, human-readable token, single-use state, stale-token rejection, and ChatGPT-issued rearming.
- Agreed `next actions` behavior should provide concise action items, actor, and exact continuation prompt after in-scope project interactions unless explicitly suppressed.
- Current doc update scope: update `docs/AI_HANDOFF.md` first only; do not touch runtime files.

## Current Diagnostic

- Actor: ChatGPT/GitHub connector.
- Instruction: replace stale Phase 11 `docs/AI_HANDOFF.md` with a concise Phase 13 rolling handoff ledger.
- Scope: docs-only, `docs/AI_HANDOFF.md` only.
- Runtime files touched: none.
- Validation target: fetch the updated file and confirm Phase 13 handoff-first, rolling ledger, pruning, Lane 0, recent steps, current diagnostic, roadmap, and open risks are present.

## Immediate Roadmap

1. Verify this `docs/AI_HANDOFF.md` update on `phase-13`.
2. Update `docs/CODEX_ACTIVE_CONTEXT.md` with Phase 13 active context, AI handoff-first rule, Lane 0 terminal batch convention, and `next actions` behavior.
3. Review docs-only diff for accidental runtime/config changes.
4. Update project settings after repo docs are finalized so future ChatGPT behavior defaults to Phase 13 and handoff-first workflow.
5. Begin React/Tailwind/M3 exploration with a read-only or low-risk `wg13 <token>` terminal batch.

## Open Risks

- `docs/CODEX_ACTIVE_CONTEXT.md` still contains stale Phase 12 references until the next docs update.
- `docs/ARCHITECTURE.md` may still contain stale historical phase references and should be reviewed later, not in this step.
- Project settings may still point to Phase 12 until updated after repo docs land.
- Terminal lane depends on user running the exact pasted function and returning output; it cannot prevent manual bypass.
- React/Tailwind/M3 migration may affect GitHub Pages deployment, offline/local state behavior, bundle size, and UI parity if not staged carefully.

## Next Actions Behavior

For in-scope Walmart-GC project interactions, end with a concise next-actions block unless the user explicitly asks not to or the topic is outside project workflow:

```text
Next actions:
1. <immediate action>
2. <follow-up action>
Who acts: <user | ChatGPT | Codex | terminal>
Continue with: "<exact prompt or command>"
```

Use `next` for a very short checkpoint. Use `next actions` for action items plus the exact continuation prompt.