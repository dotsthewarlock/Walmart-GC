#!/usr/bin/env python3
"""Classify AI automation PR risk from a small repository policy file.

The policy parser intentionally supports only the simple YAML subset used by
.github/ai-automation-policy.yml: top-level scalars, top-level lists, and one
level of nested mapping containing scalar values. It uses no external packages.
"""

from __future__ import annotations

import argparse
import fnmatch
import json
import os
import sys
from typing import Any


VALID_RISKS = {"green", "yellow", "red"}


def parse_scalar(value: str) -> Any:
    value = value.strip()
    if value in {"true", "True"}:
        return True
    if value in {"false", "False"}:
        return False
    if (value.startswith('"') and value.endswith('"')) or (value.startswith("'") and value.endswith("'")):
        return value[1:-1]
    return value


def parse_policy(path: str) -> dict[str, Any]:
    policy: dict[str, Any] = {}
    current_key: str | None = None

    with open(path, "r", encoding="utf-8") as handle:
        for line_number, raw_line in enumerate(handle, 1):
            line = raw_line.rstrip("\n")
            stripped = line.strip()
            if not stripped or stripped.startswith("#"):
                continue

            indent = len(line) - len(line.lstrip(" "))
            if indent == 0:
                if ":" not in stripped:
                    raise ValueError(f"Unsupported policy line {line_number}: {raw_line.rstrip()}")
                key, raw_value = stripped.split(":", 1)
                key = key.strip()
                raw_value = raw_value.strip()
                current_key = key
                if raw_value:
                    policy[key] = parse_scalar(raw_value)
                else:
                    policy[key] = []
                continue

            if current_key is None:
                raise ValueError(f"Nested policy line {line_number} has no parent key")

            if indent != 2:
                raise ValueError(f"Unsupported indentation on policy line {line_number}")

            if stripped.startswith("- "):
                if not isinstance(policy.get(current_key), list):
                    raise ValueError(f"Policy key '{current_key}' mixes list and mapping values")
                policy[current_key].append(parse_scalar(stripped[2:]))
                continue

            if ":" in stripped:
                if policy.get(current_key) == []:
                    policy[current_key] = {}
                if not isinstance(policy.get(current_key), dict):
                    raise ValueError(f"Policy key '{current_key}' mixes mapping and list values")
                nested_key, raw_value = stripped.split(":", 1)
                policy[current_key][nested_key.strip()] = parse_scalar(raw_value)
                continue

            raise ValueError(f"Unsupported policy line {line_number}: {raw_line.rstrip()}")

    return policy


def read_lines(path: str) -> list[str]:
    with open(path, "r", encoding="utf-8") as handle:
        return [line.strip() for line in handle if line.strip()]


def read_text(path: str | None) -> str:
    if not path:
        return ""
    with open(path, "r", encoding="utf-8") as handle:
        return handle.read()


def matches_any(value: str, patterns: list[str]) -> bool:
    normalized = value.replace(os.sep, "/")
    return any(fnmatch.fnmatchcase(normalized, pattern) for pattern in patterns)


def has_binary_extension(path: str, extensions: list[str]) -> bool:
    lowered = path.lower()
    return any(lowered.endswith(extension.lower()) for extension in extensions)


def classify(policy: dict[str, Any], changed_files: list[str], base: str, head: str, diff_text: str) -> dict[str, Any]:
    reasons: list[str] = []
    red_reasons: list[str] = []

    active_base = str(policy.get("active_base", ""))
    allowed_heads = [str(item) for item in policy.get("allowed_head_patterns", [])]
    low_risk_paths = [str(item) for item in policy.get("low_risk_paths", [])]
    blocked_paths = [str(item) for item in policy.get("blocked_paths", [])]
    blocked_keywords = [str(item) for item in policy.get("blocked_keywords", [])]
    binary_extensions = [str(item) for item in policy.get("binary_file_extensions", [])]

    if base != active_base:
        red_reasons.append(f"base '{base}' does not match active_base '{active_base}'")
    else:
        reasons.append(f"base matches active_base '{active_base}'")

    if not matches_any(head, allowed_heads):
        red_reasons.append(f"head '{head}' does not match allowed head patterns")
    else:
        reasons.append(f"head '{head}' matches allowed head patterns")

    blocked_file_hits = [path for path in changed_files if matches_any(path, blocked_paths)]
    if blocked_file_hits:
        red_reasons.append("blocked path changed: " + ", ".join(blocked_file_hits))

    binary_hits = [path for path in changed_files if has_binary_extension(path, binary_extensions)]
    if binary_hits:
        red_reasons.append("binary extension changed: " + ", ".join(binary_hits))

    all_changed_files_are_low_risk = bool(changed_files) and all(
        matches_any(path, low_risk_paths) for path in changed_files
    )

    keyword_hits = [keyword for keyword in blocked_keywords if keyword in diff_text]
    if keyword_hits:
        if all_changed_files_are_low_risk:
            reasons.append(
                "blocked keyword mention ignored because all changed files match low-risk paths: "
                + ", ".join(keyword_hits)
            )
        else:
            red_reasons.append("blocked keyword found in diff: " + ", ".join(keyword_hits))

    if red_reasons:
        risk = "red"
        reasons.extend(red_reasons)
    elif all_changed_files_are_low_risk:
        risk = "green"
        reasons.append("all changed files match low-risk paths")
    else:
        risk = "yellow"
        if changed_files:
            non_low = [path for path in changed_files if not matches_any(path, low_risk_paths)]
            reasons.append("changed files require review: " + ", ".join(non_low))
        else:
            reasons.append("no changed files supplied; requires review")

    auto_merge_policy = policy.get("auto_merge", {})
    auto_merge = bool(
        risk == "green"
        and isinstance(auto_merge_policy, dict)
        and auto_merge_policy.get("enabled") is True
        and auto_merge_policy.get("green") is True
    )

    return {
        "risk": risk,
        "auto_merge": auto_merge,
        "reasons": reasons,
        "changed_files": changed_files,
        "base": base,
        "head": head,
    }


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Classify AI PR automation risk.")
    parser.add_argument("--policy", required=True, help="Path to AI automation policy file")
    parser.add_argument("--changed-files", required=True, help="Newline-delimited changed-files list")
    parser.add_argument("--base", required=True, help="PR base branch")
    parser.add_argument("--head", required=True, help="PR head branch")
    parser.add_argument("--diff", help="Optional diff text file to scan for blocked keywords")
    parser.add_argument("--json-output", help="Optional path for JSON classification output")
    return parser.parse_args(argv)


def main(argv: list[str]) -> int:
    args = parse_args(argv)
    policy = parse_policy(args.policy)
    changed_files = read_lines(args.changed_files)
    diff_text = read_text(args.diff)
    result = classify(policy, changed_files, args.base, args.head, diff_text)

    if result["risk"] not in VALID_RISKS:
        raise RuntimeError(f"Unexpected risk classification: {result['risk']}")

    reason_text = "; ".join(result["reasons"])
    print(f"risk={result['risk']}")
    print(f"auto_merge={str(result['auto_merge']).lower()}")
    print(f"reasons={reason_text}")

    if args.json_output:
        with open(args.json_output, "w", encoding="utf-8") as handle:
            json.dump(result, handle, indent=2, sort_keys=True)
            handle.write("\n")

    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
