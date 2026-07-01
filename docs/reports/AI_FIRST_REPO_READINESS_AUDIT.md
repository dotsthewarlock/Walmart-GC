# AI-First Repo Readiness Audit (AI_FIRST_REPO_READINESS_AUDIT.md)

This document contains a comprehensive readiness audit evaluating whether the GC Wallet (`Walmart-GC`) repository is optimal for automated, AI-first development cycles (including Agy, GPT, and other LLM developer agents).

---

## 1. Executive Summary & Verdict

### Verdict: **Mostly Ready**

The repository exhibits an exceptionally high degree of readiness for AI-first development. The documentation structure is well-segregated, of extremely high density, and avoids the common pitfall of flooding LLM context windows with redundant system architecture. The introduction of the Phase A/B Split workflow completely solves the risk of Chromebook/Agy terminal instabilities or corrupted git operations by making actual writes to remote origins a strictly human-driven activity.

To achieve **100% full production readiness**, the repo requires minor documentation polish to resolve non-portable absolute local links (`file:///home/godfreymiu/...`) and promote newly merged PR 3 codebase reality (Focus Mode removal) into the active context.

---

## 2. Strengths

The repository has several world-class architectural strengths designed specifically for modern LLM development:

1. **Clear AI Start Path / Fast-Path Instruction**: 
   Both `AGENTS.md` and `docs/ACTIVE_CONTEXT.md` feature explicit, high-priority, and discoverable "AI Start Here" sections. This ensures that any LLM loaded into the workspace is immediately oriented to the correct files, roles, and constraints without hallucinating entrypoints.
2. **Explicit Authority Order & Clear File Boundaries**:
   The division of document ownership is extremely clean and prevents context clutter:
   * **Root `AGENTS.md`** owns developer instructions, Phase A/B boundaries, and local run rules.
   * **`docs/ACTIVE_CONTEXT.md`** owns current development status and base branch info.
   * **`docs/M3_DESIGN_DECISIONS.md`** owns the absolute, immutable visual styling rules.
   * **`docs/ARCHITECTURE.md`** owns system schemas, OAuth parameters, and cookie contracts.
   * **`docs/archive/` & `docs/reports/`** are properly demarcated as historical evidence only, preventing LLMs from confusing past iterations with current reality.
3. **Protected-Behavior Guardrails**:
   Major vs. minor changes are clearly defined, backed by the **Pause and Report Rule** (Reassessment Rule). This stops an AI developer from making destructive, silent modifications to critical operations like OAuth endpoints, session cookies, database-less storage patterns, or sync logic.
4. **Discoverable Verification Controls**:
   All mandatory local checks—including static syntax validation, standard production compilation (`npm run build`), spacing checks (`git diff --check`), and targeted `grep` strings—are centralized under `AGENTS.md` and `docs/QA_TEST_CHECKLIST.md`.
5. **Strict Roadmap Separation**:
   `docs/ROADMAP.md` uses a highly structured 4-lane framework. This ensures planned features (such as camera scanning or customizable merchant profiles) reside strictly as *strategic intent* and are not prematurely implemented or loaded with code `TODO`s by agents.

---

## 3. Findings

This section lists identified issues classified by severity (**Blocker**, **High**, **Medium**, **Low**).

### Finding 1: Absolute Local Link Leakage (Portability)
* **Severity**: **Medium**
* **Check**: Portable GitHub-readable docs / No local absolute paths.
* **Description**: Several report files in the repository contain hardcoded absolute local paths pointing to the developer's unique user home directory path (`...`). 
* **Affected Files**:
  * `docs/reports/DOCS_COHERENCE_AUDIT_2026-07-01.md` (Multiple lines)
  * `docs/archive/reports/M3_FULL_AUDIT_CLEANUP_REPORT_2026-06-30.md` (Multiple lines)
* **Impact**: These links are broken when viewed on GitHub or checked out on a different workstation. They increase token size and introduce visual noise during diff reviews.

### Finding 2: Out-of-Repository Paths in Active Durable Docs
* **Severity**: **Medium**
* **Check**: Portable GitHub-readable docs.
* **Description**: The root `AGENTS.md` contains absolute links pointing to paths outside the git repository structure itself:
  * `file:///home/godfreymiu/Project/AI_HANDOFF.md` (Lines 29 and 73)
* **Impact**: Other developers or CI servers will encounter broken links. These should be represented as portable, user-agnostic relative paths or local project folder references like `~/Project/AI_HANDOFF.md` without local file schemas.

### Finding 3: Stale Context/Current-State Mismatch (Post-PR 3 Merge)
* **Severity**: **Low**
* **Check**: Stale Focus Mode / current-state conflicts.
* **Description**: Since PR 3 ("Focus Mode Refactor") has successfully compiled and merged into the `main` branch (Commit `96151ab`), the active context documents are now slightly out-of-sync with codebase reality:
  * `docs/ACTIVE_CONTEXT.md` (Line 33) still lists PR 3 as "Upcoming".
  * `docs/M3_DESIGN_DECISIONS.md` (Line 36) still states that "Active UI work focuses on PR 3".
* **Impact**: New AI agents starting a task will believe Focus Mode is still in the process of being removed, causing them to re-attempt edits that have already been fully resolved and merged.
* **Resolution**: The durable docs must be updated to reflect PR 3 as "Completed" and transition the active scope to "PR 4: Near-Term Enhancements" or subsequent roadmap items.

### Finding 4: Stale Element Reference in Decisions Log
* **Severity**: **Low**
* **Check**: Stale Focus Mode conflicts.
* **Description**: `docs/DECISIONS_LOG.md` (Line 42) refers to high-contrast focus rings on `#barcode-open`. Since PR 3 refactored the barcode container into a passive, non-button `div`, the ID element `#barcode-open` no longer exists in `src/App.jsx`.
* **Impact**: Minor. Since `DECISIONS_LOG.md` is a historical record of past decisions (Decision #5 was locked on 2026-06-23 before PR 3), keeping it is valid context, but adding a short parenthetical update note prevents agents from searching for `#barcode-open` in the active code.

---

## 4. Risk Assessment

### Token-Efficiency Risks
> [!TIP]
> **Current Context Volume**: Excellent. The entire active durable suite sits well under 3,000 tokens combined, making it extremely inexpensive and fast for LLMs to consume.
* **Risk**: Low. However, if historical reports in `docs/reports/` are routinely ingested by the agent during every single file operation, they can waste tokens. 
* **Mitigation**: Root `AGENTS.md` must clearly state that historical files under `docs/reports/` and `docs/archive/` should *only* be read on-demand when historical evidence is explicitly requested by the user, rather than loaded as default active context.

### Durable-Doc Risks
* **Risk**: Medium. The main risk is **Durable Doc Desynchronization**. When a feature PR (like PR 3) is merged, the active context and design decision logs can easily become out-of-sync if there is no explicit step to promote the completed milestones.
* **Mitigation**: Every feature branch workflow MUST mandate a short "Durable Docs Promotion Step" immediately before or after merging, moving the completed PR item from "Upcoming/In-Progress" to "Completed" in `ACTIVE_CONTEXT.md`, `ROADMAP.md`, and `M3_DESIGN_DECISIONS.md`.

---

## 5. Recommended Follow-Up PRs

To achieve flawless AI-first readiness, we recommend executing the following two highly-targeted, zero-code-change documentation PRs:

### PR A: Project Portability & Path Normalization (Docs-only)
* **Goal**: Eliminate hardcoded absolute local home directory schemes to ensure 100% portable repository files.
* **Scope**:
  * Edit `AGENTS.md`: Change `file:///home/godfreymiu/Project/AI_HANDOFF.md` to `~/Project/AI_HANDOFF.md` (relative project-level path).
  * Edit `docs/reports/DOCS_COHERENCE_AUDIT_2026-07-01.md`: Convert all `...` links to standard repo-relative markdown links (e.g., `[M3_DESIGN_DECISIONS.md](M3_DESIGN_DECISIONS.md)`).
  * Edit `docs/archive/reports/M3_FULL_AUDIT_CLEANUP_REPORT_2026-06-30.md`: Replace all `...` links with repo-relative paths.

### PR B: Phase 3 Promotion & Active Context Alignment (Docs-only)
* **Goal**: Promote completed PR 3 status into durable docs and align active context with the current `main` branch reality.
* **Scope**:
  * Edit `docs/ACTIVE_CONTEXT.md`: 
    * Mark **PR 3: Focus Mode Removal** as Completed.
    * Mark **PR 4: Near-Term Enhancements** (Local Branch Pruning, Multi-Merchant Schema Helpers) as Current/Active.
    * Update branch name status row if we transition from documentation cleanup to the next development branch.
  * Edit `docs/M3_DESIGN_DECISIONS.md`: 
    * Update Section 3 "Current Development Scope" to focus on PR 4 near-term enhancements instead of PR 3.
  * Edit `docs/DECISIONS_LOG.md`:
    * Add a parenthetical note on line 42 indicating `#barcode-open` was deleted in PR 3's passive conversion.
  * Update `README.md` and root files as needed to reflect stable production baseline alignment.

---

## 6. Do-Not-Touch List (Active Operational Guardrails)

To prevent breaking changes, any agent working in this workspace is strictly prohibited from modifying the following components without explicit human authorization:

* **No CSS Framework Overhauls**: Do not replace Vanilla CSS / custom Tailwind utility configs with shadcn, Bootstrap, or custom styling frameworks.
* **No Client-Side Token Storage**: Never modify Google OAuth flow to cache refresh tokens or session keys in `localStorage`/`sessionStorage`. They must remain strictly HttpOnly within the Worker-managed session cookie (`walmart_gc_session`).
* **No Localhost OAuth Configurations**: Google Cloud origins are strictly locked to `https://walmart-gc.dotsthewarlock.com`. Local development testing is proxied.
* **No Database Additions**: The application must remain 100% serverless and offline-first, relying exclusively on client browser cache (`localStorage`) and private, user-owned Google Sheets.
* **No CAPTCHA-Bypassing Scrapers**: Scraping or automated balance checking utilizing harvested user credentials is strictly rejected.
* **No Phase B Git/Deploy Executions by AI**: AI agents must never run `git commit`, `git push`, or attempt remote production deployments.
