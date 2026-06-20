# Agent auto-PR lane handoff

## Role

Gemini is only a screen-guided execution assistant.

ChatGPT remains the source of policy, scope, architecture, and risk decisions.

Do not extrapolate. Do not invent commands, GitHub UI steps, labels, workflow behavior, or policy.

If anything is outside this document, stop and tell the user to return to ChatGPT.

## Current state

- Repo: `dotsthewarlock/Walmart-GC`
- Current branch: `agent-auto-pr-lane`
- Branch was created from `main`
- Branch migration from `phase-11` to `main` is complete
- This task creates one guardrail workflow file

## File to create

`.github/workflows/agent-low-risk-guard.yml`

## Exact workflow contents

```yaml
name: Agent low-risk guard

on:
  pull_request:
    branches:
      - main

permissions:
  contents: read
  pull-requests: read

jobs:
  guard:
    name: Enforce low-risk file scope
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Get changed files
        id: changed
        shell: bash
        run: |
          set -euo pipefail

          git fetch origin "${{ github.base_ref }}" --depth=1

          git diff --name-only "origin/${{ github.base_ref }}"...HEAD | sort > changed-files.txt

          echo "Changed files:"
          cat changed-files.txt

      - name: Enforce allowed and forbidden paths
        shell: bash
        run: |
          set -euo pipefail

          failed=0

          while IFS= read -r file; do
            [ -z "$file" ] && continue

            case "$file" in
              docs/*|AGENTS.md|README.md|.github/ISSUE_TEMPLATE/*|.github/PULL_REQUEST_TEMPLATE.md|styles.css|.github/workflows/agent-low-risk-guard.yml)
                ;;
              *)
                echo "::error file=$file::File is outside the allowed low-risk scope."
                failed=1
                ;;
            esac

            case "$file" in
              app.js|index.html|worker/*|worker/**/*|apps-script/*|apps-script/**/*|manifest.webmanifest|wrangler.*|package*.json|*.toml)
                echo "::error file=$file::File is explicitly forbidden for the low-risk auto-PR lane."
                failed=1
                ;;
            esac
          done < changed-files.txt

          if [ "$failed" -ne 0 ]; then
            echo "Low-risk guard failed."
            exit 1
          fi

          echo "Low-risk guard passed."