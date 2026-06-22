#!/usr/bin/env python3
"""Lightweight validation for AI PR risk classification guardrails."""

from __future__ import annotations

import tempfile
from pathlib import Path

import ai_risk_classify


ROOT = Path(__file__).resolve().parents[2]
POLICY = ai_risk_classify.parse_policy(str(ROOT / ".github/ai-automation-policy.yml"))


def classify(changed_files: list[str], *, base: str = "phase-13", head: str = "codex/test", diff: str = "") -> dict[str, object]:
    return ai_risk_classify.classify(POLICY, changed_files, base, head, diff)


def assert_case(name: str, result: dict[str, object], *, risk: str, auto_merge: bool, reason_contains: str | None = None) -> None:
    assert result["risk"] == risk, f"{name}: expected risk={risk}, got {result}"
    assert result["auto_merge"] is auto_merge, f"{name}: expected auto_merge={auto_merge}, got {result}"
    if reason_contains is not None:
        reasons = "; ".join(result["reasons"])  # type: ignore[arg-type]
        assert reason_contains in reasons, f"{name}: missing reason {reason_contains!r}; got {reasons!r}"


def test_required_cases() -> None:
    assert_case(
        "docs-only blocked keyword",
        classify(["docs/CODEX_ACTIVE_CONTEXT.md"], diff="+OAuth guardrail text"),
        risk="green",
        auto_merge=True,
        reason_contains="blocked keyword mention ignored because all changed files match low-risk paths",
    )
    assert_case(
        "runtime blocked keyword",
        classify(["app.js"], diff="+OAuth runtime text"),
        risk="red",
        auto_merge=False,
        reason_contains="blocked keyword found in diff: OAuth",
    )
    assert_case(
        "mixed docs and non-low-risk blocked keyword",
        classify(["docs/CODEX_ACTIVE_CONTEXT.md", "scripts/example.sh"], diff="+OAuth mixed text"),
        risk="red",
        auto_merge=False,
        reason_contains="blocked keyword found in diff: OAuth",
    )
    assert_case(
        "docs-only no blocked keyword",
        classify(["docs/CODEX_ACTIVE_CONTEXT.md"], diff="+plain handoff text"),
        risk="green",
        auto_merge=True,
        reason_contains="all changed files match low-risk paths",
    )
    assert_case(
        "wrong base",
        classify(["docs/CODEX_ACTIVE_CONTEXT.md"], base="main", diff="+plain handoff text"),
        risk="red",
        auto_merge=False,
        reason_contains="base 'main' does not match active_base 'phase-13'",
    )
    assert_case(
        "blocked path no blocked keyword",
        classify([".github/workflows/validate.yml"], diff="+plain workflow text"),
        risk="red",
        auto_merge=False,
        reason_contains="blocked path changed: .github/workflows/validate.yml",
    )


def test_cli_smoke_json_shape() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        tmp_path = Path(tmp)
        changed = tmp_path / "changed.txt"
        diff = tmp_path / "diff.txt"
        output = tmp_path / "classification.json"
        changed.write_text("docs/CODEX_ACTIVE_CONTEXT.md\n", encoding="utf-8")
        diff.write_text("+OAuth guardrail text\n", encoding="utf-8")
        status = ai_risk_classify.main(
            [
                "--policy",
                str(ROOT / ".github/ai-automation-policy.yml"),
                "--changed-files",
                str(changed),
                "--base",
                "phase-13",
                "--head",
                "codex/test",
                "--diff",
                str(diff),
                "--json-output",
                str(output),
            ]
        )
        assert status == 0
        assert '"risk": "green"' in output.read_text(encoding="utf-8")


if __name__ == "__main__":
    test_required_cases()
    test_cli_smoke_json_shape()
    print("ai_risk_classify tests passed")
