#!/usr/bin/env bash
set -u

expected_token="phase13-readonly-01"
token="${1:-}"

if [ "$token" != "$expected_token" ]; then
  echo "Rejected token. Expected: $expected_token" >&2
  exit 2
fi

echo "wg13 token: $token"
echo "Mode: read-only inspection only"
echo

echo "== Repo identity =="
pwd
git rev-parse --show-toplevel
git remote -v
echo

echo "== Branch state =="
current_branch="$(git branch --show-current)"
echo "$current_branch"
if [ "$current_branch" != "phase-13" ]; then
  echo "WARNING: expected local branch phase-13, found $current_branch" >&2
fi
git status --short --branch
echo

echo "== Recent commits =="
git log --oneline --decorate -8
echo

echo "== Required docs presence =="
ls -l docs/CODEX_ACTIVE_CONTEXT.md docs/AI_HANDOFF.md docs/MAINTENANCE_LOG.md
echo

echo "== Phase 13 source-of-truth excerpts =="
sed -n '1,35p' docs/CODEX_ACTIVE_CONTEXT.md
echo
sed -n '138,170p' docs/CODEX_ACTIVE_CONTEXT.md
echo
sed -n '1,35p' docs/AI_HANDOFF.md
echo
sed -n '60,105p' docs/AI_HANDOFF.md
echo

echo "== Guardrail keyword scan =="
grep -nE "phase-13|Phase 13|wg13|React|Tailwind|Material 3|next actions|Result Handoff|Phase 11|Phase 12|schema|OAuth|sync|Worker routes|deployment|hosting" \
  docs/CODEX_ACTIVE_CONTEXT.md docs/AI_HANDOFF.md docs/MAINTENANCE_LOG.md
echo

echo "== Local diff summary, if any =="
git diff --name-status
echo
git diff --stat
echo

echo "== Compare current HEAD to main, if local main exists =="
if git rev-parse --verify main >/dev/null 2>&1; then
  git diff --name-status main...HEAD
  echo
  git diff --stat main...HEAD
else
  echo "Local main ref not found; skipped main...HEAD comparison."
fi
echo

echo "== Read-only batch complete =="
echo "Paste output back only if asked, or if repo docs look missing, stale, contradictory, wrong-branch, or unexpectedly dirty."
