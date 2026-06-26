# Antigravity CLI Integration Dossier

> [!NOTE]
> This dossier is the long-form reference. Day-to-day Agy usage should start with [AGY_BOOTLOADER.md](AGY_BOOTLOADER.md) and [AGY_PROMPT_TEMPLATES.md](AGY_PROMPT_TEMPLATES.md). Walmart-GC project workflow overrides generic Agy guidance where they conflict.

## Executive summary

Google’s **Antigravity CLI** (command `agy`) brings the core capabilities of Antigravity 2.0’s multi‑step reasoning, multi‑file editing and tool calling directly to the terminal.  It prioritizes keyboard efficiency and remote SSH workflows while sharing the same agent engine, settings and session history with the GUI product【44756431148211†L14-L41】.  The CLI is installed via a small installer script (`curl -fsSL https://antigravity.google/cli/install.sh | bash`) or equivalent Windows commands【44756431148211†L45-L60】 and authenticates through Google Sign‑In.  An official codelab published on 17 June 2026 provides the most detailed guidance on using the CLI.  It documents interactive commands, settings, permission modes and non‑interactive flags.  The versioned changelog on GitHub confirms feature additions such as `--model` selection, improved sandbox behaviour and conversation file formats【977256602485969†L488-L520】.

This report consolidates official information from the codelab, GitHub README and changelog into a self‑contained reference.  It outlines the command surface, non‑interactive options, interactive slash commands, permission and sandbox behaviour, workspace handling, plugin/skill architecture, models and quota management, local file paths, and best practices for integrating the CLI into a React /Vite /Tailwind + Cloudflare worker project.  Areas where official documentation is missing are clearly marked as **unknown** and accompanied by proposed local validation tests.

## Source inventory

| # | Source / document | Trust ranking | Notes |
|---|---|---|---|
|1|Google Antigravity CLI codelab (Hands‑on with Antigravity CLI) — updated 17 Jun 2026|**High**|Official tutorial describing installation, configuration, settings, command parameters (`-p/--print`, `--model`, `--dangerously‑skip‑permissions`), shell mode and permission modes. The codelab is treated as authoritative for the CLI behaviour.|
|2|Antigravity CLI GitHub README【44756431148211†L14-L41】【44756431148211†L45-L60】|**High**|Official repository with installation instructions, feature overview and warnings about AI security risks and data collection.|
|3|Antigravity CLI changelog (GitHub)【977256602485969†L488-L520】|**High**|Official release notes describing changes across versions (e.g., addition of `--model`, `agy models` subcommand, sandbox fixes, conversation formats).  Used to confirm features not covered in the codelab.|
|4|Google Developers Blog announcement “Transitioning Gemini CLI to Antigravity CLI”【203318192013127†L60-L73】|**High**|Official blog describing high‑level design goals: faster execution, asynchronous workflows and shared architecture with Antigravity 2.0.  Not used for flag details but provides context.|
|5|Third‑party tutorials, cheat‑sheets and forum posts (Medium, dev.to, Toolsbase, etc.)|**Low (not used)**|Mention flags such as `--add-dir`, `--continue`, `--prompt-interactive`, etc., but not official.  They are referenced only to identify unknowns and propose validation tests; their claims are **not** cited.

## Installed local CLI facts (evidence)

The container environment did not include the `agy` binary.  Attempting to run `agy --version` resulted in a `command not found` error.  Therefore local execution evidence is unavailable, and all operational behaviour must be verified by the user in their local environment.

## Verified official facts

### Command surface

* **Installation and invocation** – The CLI is installed via one‑line commands.  On macOS/Linux the recommended installer is `curl -fsSL https://antigravity.google/cli/install.sh | bash`; on Windows PowerShell `irm …install.ps1 | iex`; on Windows CMD download and run `install.cmd`【44756431148211†L45-L60】.  After installation the command `agy` is available.

  > [!CAUTION]
  > These installer, curl-pipe-bash, or --dangerously-skip-permissions examples are reference examples, not Walmart-GC defaults. Permission bypass must not be used unless explicitly approved.

* **Shared engine and session export** – Antigravity CLI shares the same core agent engine and settings as Antigravity 2.0, and sessions can be exported between them【44756431148211†L14-L41】.  Authentication uses Google Sign‑In and the system keyring【44756431148211†L65-L73】.

* **Non‑interactive mode (`-p` / `--print`)** – The codelab explains that passing `-p` or `--print` followed by a string executes a prompt in non‑interactive mode and prints the agent’s response, then exits.  It is a stateless one‑shot execution: the conversation cannot be continued after the process exits【22364454756838†L439-L453】.  The codelab notes that this mode is ideal for CI environments and headless automation.

* **Model selection** – Version 1.0.5 of the CLI added a `--model` flag and an `agy models` subcommand to list available models【977256602485969†L488-L520】.  The codelab demonstrates using `--model` to select a specific model and shows `agy models` listing options such as **Gemini 3.5 Flash (Low/Medium/High)**, **Gemini 3.1 Pro**, **Claude Sonnet 4.6**, **Claude Opus 4.6** and **GPT‑OSS 120B**【22364454756838†L455-L484】.  In general, “Flash” models are suitable for quick responses; “Pro/Opus” models for careful reasoning; and “Flash High” or “Opus” for heavy multi‑file operations.

* **Dangerous permission flag** – The codelab describes a `--dangerously‑skip‑permissions` flag that automatically approves all permission requests, bypassing interactive confirmation【22364454756838†L489-L495】.  It warns that this should be used sparingly, as it allows the agent to run commands and modify files without human approval.

* **Settings file** – Settings are stored in `~/.gemini/antigravity-cli/settings.json`【22364454756838†L349-L366】.  Example keys include `colorScheme`, `model`, `trustedWorkspaces`, `notifications`, `requestTimeout`, `telemetry`, `useSandbox`, etc.  Changing settings via the `/config` or `/settings` slash commands in the TUI updates this file.

* **Permission modes** – The codelab lists four permission modes accessible via the `/permissions` UI:
  1. **request‑review** (default) – asks for confirmation before executing commands or writing to files.
  2. **proceed‑in‑sandbox** – automatically runs operations inside a sandbox; the agent cannot affect the outside environment.
  3. **always‑proceed** – auto‑approves actions (equivalent to `--dangerously‑skip‑permissions`).
  4. **strict** – denies all tool access【22364454756838†L377-L422】.
  
  Users can toggle these modes within interactive sessions or set them in the `settings.json` file.

* **Shell mode** – Toggled by pressing `!` in the TUI, shell mode allows running local shell commands (e.g., `pwd`, `ls`) from within the agent session.  Pressing `!` again or hitting `ESC` returns to the agent【22364454756838†L533-L547】.

* **Changelog insights** – Version 1.0.5 added `--model` and `agy models`, `/permissions` slash command and sandbox fixes【977256602485969†L488-L520】.  Version 1.0.4 added SQLite conversation support, LaTeX rendering and improved project discovery【977256602485969†L521-L534】.  Version 1.0.2 added the environment variable `AGY_CLI_HIDE_ACCOUNT_INFO` to hide the email/plan from the header【977256602485969†L589-L593】.

### Unknowns and unresolved claims

Because the official documentation is incomplete or gated, several aspects remain unclear:

* **Full list of CLI flags** – The codelab mentions `-p/--print`, `--model` and `--dangerously‑skip‑permissions`, but third‑party sources mention additional flags (`--prompt`, `--prompt‑interactive`, `-i`, `--continue`, `--conversation`, `--add‑dir`, `--sandbox`, `--print‑timeout`, `--log‑file`, `--yes`) that are not documented in official sources.  It is unknown whether these flags exist in the installed CLI or how they behave.  Local testing is required.

* **Slash command semantics** – The official codelab does not list all slash commands.  Third‑party cheat‑sheets mention commands such as `/goal`, `/grill-me`, `/context`, `/agents`, `/agent`, `/usage`, `/browser`, `/permissions`, `/config`, `/settings`, `/model`, `/skills`, `/mcp`, `/schedule`, `/export`, `/logout`.  Without official documentation or local CLI access we cannot confirm their purpose or whether slash commands included in `--print` prompts are parsed.  The safe assumption is that slash commands are only recognised within interactive TUI sessions.

* **Structured output** – Some agent platforms support JSON output; there is no official mention of a `--structured-json` or similar flag in the codelab or changelog.  We assume the CLI emits plain terminal text and diff outputs.

* **Workspace and context behaviour** – The README and codelab do not describe how the CLI discovers the “active workspace” or what constitutes a “trusted workspace.”  The changelog hints at workspace mappings and `.antigravitycli` directories【977256602485969†L530-L533】, but details remain unknown.  Flags such as `--add-dir` likely add directories to the workspace; this needs validation.

* **Plugins, skills, MCP, hooks, subagents** – The codelab does not cover plugin or MCP features.  The changelog mentions improved MCP server initialization and `mcp_config.json` settings【977256602485969†L508-L512】 but not the schema.  Without official docs we cannot specify plugin installation commands or subagent concurrency limits.  Local exploration is needed.

* **Quota and credits** – Version 1.0.3 introduced G1 credits and a `/credits` panel【977256602485969†L559-L564】; beyond this there is no documentation on how to check or throttle quota in the CLI.

* **Local file paths and logs** – While `settings.json` path is documented【22364454756838†L349-L366】, there is no official statement about log files, keybindings, conversation history or plugin directories.  The changelog references `projects.json` and conversation files in SQLite【977256602485969†L523-L533】; exact paths are unknown.

## Practical implications for GPT + Agy integration

* **Need for careful prompt design** – In non‑interactive mode the prompt is executed as a single block with no opportunity for follow‑up; prompts must therefore include all necessary context, goals, constraints and verification steps.  Because slash commands are likely ignored in `--print` mode, headings should be plain language rather than relying on `/goal` etc.  To maintain readability, we can include slash‑style markers as structure but must assume they are treated as plain text.

* **Permission management** – For safe local development, the default **request‑review** mode is recommended.  `--dangerously‑skip‑permissions` should only be used in CI or test runs where the prompt is narrow and side effects are expected (e.g., code generation into a pre‑selected directory).  Sandbox mode should be enabled when exploring untrusted repositories or unknown tasks.

* **Model selection** – Use `agy --model "Gemini 3.5 Flash (Low)" --print "…"` for quick reviews or small tasks; `Gemini 3.5 Flash High` or `Claude Opus 4.6` for multi‑file editing or deeper reasoning.  Always list available models with `agy models` before selecting to ensure compatibility.

* **Workspace context** – If `--add-dir` is supported, each run should explicitly add relevant directories (e.g., project root and `docs/`) to ensure the agent can read files.  Without this, the agent may default to the current working directory only.

* **CI and headless execution** – Use `--print` plus a reasonable timeout (e.g., `--print-timeout 10m`) to prevent indefinite runs.  Redirect both stdout and stderr to capture the full response.  Avoid long pipelines; instead break tasks into milestone‑sized prompts to mitigate hallucinated changes.

## Recommended operating architecture

The project aims to implement features in a **React /Vite /Tailwind static web app** with a **Cloudflare Worker** backend.  The integration architecture defines roles:

1. **GPT (Planner/Reviewer)** – Writes structured prompts for `agy` and reviews agent outputs.  GPT determines milestones, selects models and ensures that prompts contain goals, context files, constraints, allowed scope and verification commands.  GPT also performs diff reviews and prepares documentation.
2. **Agy CLI (Implementer/Verifier)** – Executes GPT‑written prompts to make code changes, run builds/tests and generate documentation.  In interactive mode it can run slash commands (e.g., `/diff`, `/goal`) and shell mode.  In non‑interactive mode (`--print`) it performs one‑shot tasks.
3. **Terminal (Host)** – Provides the runtime environment, repository and network connectivity.  The terminal may run commands like `npm run build`, `git diff --check`, `git status --short` and grep searches to verify outcomes.  For safety the human or GPT must set permission mode to `request‑review` and monitor prompts.
4. **Human reviewer** – Oversees the session, approves or denies tool calls, interprets complex diffs and ensures that changes align with business logic.  The human may intervene when the agent proposes unscoped modifications.

### When to use interactive vs non‑interactive

| Scenario | Preferred mode | Rationale |
|---|---|---|
| **High‑level planning, documentation generation or asking the agent to explain code** | `agy --print` | No side effects; one‑shot responses; safe to run non‑interactive. |
| **Implementation of bounded feature or bug fix requiring multiple steps** | Interactive TUI | Allows reviewing agent proposals, approving file edits and running verification commands.  Slash commands like `/diff` and `/shell` are available. |
| **Long‑running processes (build, tests) or tasks that must not block terminal** | Interactive with asynchronous subagents (background tasks) | The CLI’s architecture supports asynchronous tasks in background (as per the developers blog【203318192013127†L60-L73】); this prevents terminal lock‑up.<br><br>**Walmart-GC Override Note:** For Walmart-GC, prefer foreground agy --print runs. Do not background Agy or use setsid unless explicitly approved. |
| **CI/automation** | `--print` with `--model`, optional `--add-dir` and `--print-timeout` | Avoids manual intervention; ensure prompts include all context and verification steps; run with caution. |

## Recommended default command patterns

Below are recommended base command templates for running `agy` in non‑interactive mode.  They assume the CLI supports certain flags; unknown flags are in brackets and require validation.

```bash
# List available models (interactive or headless)
agy models

# Non‑interactive quick check or summary (safe default)
agy --model "Gemini 3.5 Flash (Low)" --print "<prompt>"

# Non‑interactive implementation run with context directories and timeout
# (Requires validation of --add-dir and --print-timeout flags)
agy --model "Gemini 3.5 Flash (High)" --add-dir ./src --add-dir ./worker \
    --print-timeout 10m --print "<prompt>"

# Interactive session with default permissions
agy

# Interactive session seeded with an initial prompt (if --prompt-interactive is supported)
agy --model "Gemini 3.5 Flash (High)" --prompt-interactive "<prompt>"
```

## Recommended prompt templates

For each prompt type, include plain‑language headings and slash‑style headings for readability while assuming they are treated as plain text.  Replace `<...>` placeholders with project‑specific information.

### 1. Implementation pass

*Goal*: implement a bounded feature or bug fix.

```
Goal: Implement <feature/bug fix> in the Walmart‑GC repository.

Context:
- Read README.md and relevant docs (e.g., docs/AGENTS.md, docs/ACTIVE_CONTEXT.md).
- Examine source files: <list of key files>.

Hard constraints:
- Do not change data sync/OAuth/storage logic.
- Do not modify CSV, Vite, Tailwind or worker config unless explicitly scoped.
- Preserve barcode generation library and data formats.
- Do not expose Google account information in UI.
- Follow Material 3 styles and reuse existing components.

Allowed scope:
- Modify React components and Tailwind classes to implement the feature.
- Update Cloudflare worker logic if the feature requires server changes.
- Create or update documentation and types.

Forbidden scope:
- Changing any unlisted files or external API routes.
- Deleting existing business logic.

Instructions:
1. Summarize the current implementation and propose a safe plan.
2. Make changes iteratively, requesting confirmation before each file edit.
3. After implementation, run verification commands:
   - `npm run build` in the frontend directory.
   - `git diff --check` to ensure no whitespace errors.
   - `git status --short` to list changed files.
   - `grep` the repository for banned strings related to cards and checkout.
4. Provide a concise summary of changes and next steps.

Stop conditions:
- If a verification command fails.
- If the changes conflict with hard constraints.
- If additional clarification is required.
```

### 2. Visual/UI polish pass

```
Goal: Polish the UI for <component/feature> according to Material 3 guidelines.

Context:
- Review the current component implementation and corresponding Tailwind classes.
- Reference docs on Material 3 typography, spacing and color palettes.

Hard constraints:
- Do not alter business logic or state management.
- Avoid adding brittle offsets or fixed positioning.
- Reuse existing utility classes where possible.

Instructions:
1. Identify UI inconsistencies and propose improvements (e.g., spacing, colours, responsive behaviour).
2. Update Tailwind classes and component structure accordingly.
3. Run `npm run build` and open the page via the dev server (`http://127.0.0.1:5174`) to ensure the UI renders correctly.
4. Provide before/after diff excerpts and screenshots (if supported by the CLI) for review.

Stop conditions:
- Build errors or failing tests.
- Deviations from Material 3 guidelines.
```

### 3. Diff review pass

```
Goal: Review and summarise the code changes from the last implementation pass.

Context:
- Use the `/diff` command (interactive mode) or run `git diff` in shell mode.

Instructions:
1. Describe each changed file, focusing on how it addresses the feature goals.
2. Highlight any potential side effects or deviations from constraints.
3. Suggest follow‑up tasks or improvements.

Verification:
- Ensure no banned strings remain in the code via `grep`.
- Confirm that `npm run build` still passes.

Stop conditions:
- Unexplained changes or failures in verification commands.
```

### 4. Docs‑only update pass

```
Goal: Update documentation without modifying any code.

Context:
- Identify new features or changes that require updates in docs/AGENTS.md, docs/ACTIVE_CONTEXT.md, docs/README.md, etc.

Instructions:
1. Summarise the new functionality or behaviour.
2. Edit the appropriate documentation files; propose new sections if needed.
3. Run `git diff` to show the updated docs and ensure no code files were touched.

Stop conditions:
- If code files appear in the diff.
```

### 5. Verification‑only pass

```
Goal: Verify that recent changes meet the project constraints and build cleanly.

Instructions:
1. Run `npm run build` and confirm no errors.
2. Run `git diff --check` to check for whitespace issues.
3. Run `git status --short` to list modified files.
4. Grep the codebase for banned strings (cards and checkout lists).
5. Report the outcomes; do not modify any files.
```

### 6. Second‑opinion pass

```
Goal: Provide an independent review of the last implementation or UI pass.

Instructions:
1. Describe what the previous agent did and evaluate whether it meets the stated goals.
2. Suggest alternative approaches or highlight potential oversights.
3. If improvements are needed, outline a plan for a follow‑up pass.

Stop conditions:
- If the previous work is satisfactory and no further action is required.
```

### 7. Stop/reassess report

```
Goal: When the agent encounters a blocker or uncertainty, produce a report for the human reviewer.

Instructions:
1. Describe the issue encountered, including any errors, missing context or conflicting instructions.
2. Summarise the progress made so far.
3. Ask specific questions or request additional guidance.
4. Do not proceed until the human responds.
```

### 8. GPT handoff to another GPT instance

```
Goal: Handoff context and progress to another GPT or human reviewer.

Instructions:
1. Summarise the current state of the project, including the feature being implemented, modified files and outstanding tasks.
2. Provide relevant diffs or files inlined as needed.
3. Highlight any pending decisions or unresolved questions.
4. Offer guidance on what the next steps should be.
```

## Local validation test matrix

Because many CLI behaviours are undocumented, a series of small local tests is recommended.  The following matrix specifies commands to run, expected outcomes and implications.

| Test | Command | Expected behaviour | Impact if different |
|---|---|---|---|
|**1. Slash commands in `--print`**|`agy --print "/goal\nSummarize the repository"`|The CLI should treat `/goal` as plain text and print the agent’s response.  It should not interpret slash commands in non‑interactive mode.|If slash commands are parsed in print mode, we could embed `/goal`, `/context`, etc., but we should document this surprising behaviour.|
|**2. `/grill-me` in `--print`**|`agy --print "/grill-me\nDescribe the file structure"`|Expected to be plain text; the agent returns a summary.|If `/grill-me` triggers interactive grilling in non‑interactive mode, update the prompt templates accordingly.|
|**3. Multi‑line prompt via file substitution**|`agy --print "$(cat /tmp/prompt.txt)"`|The CLI should accept multi‑line input and preserve formatting.|If newlines collapse or cause errors, embed newlines using `\n` or restructure prompts.|
|**4. Redirecting stdout/stderr**|`agy --print "List project files" > out.txt 2> err.txt`|All agent output should be captured in `out.txt`; `err.txt` should remain empty unless errors occur.|If output is split or truncated, adjust capture methods (e.g., piping through `script`).|
|**5. `--print-timeout`**|`agy --print-timeout 1m --print "Generate 1000 lines"`|Process should terminate after one minute with a timeout message.|If the timeout is ignored, consider using `timeout` command externally.|
|**6. `--model` in print mode**|`agy --model "Gemini 3.1 Pro" --print "Explain this function"`|Agent should use the specified model; `agy models` should list available models beforehand.|If the flag is ignored, treat model selection as interactive only.|
|**7. `--add-dir`**|`agy --add-dir src --add-dir docs --print "Summarize code"`|Agent should read files from listed directories; context should include files outside current working directory.|If not supported, rely on the current directory or interactive `/add-dir`.|
|**8. Permissions in headless mode**|`agy --print "Run ls"` (without `--dangerously-skip-permissions`)|CLI should prompt for permissions or refuse to run shell commands; in non‑interactive mode it may fail.|If commands execute without permission, treat headless runs as unsafe and avoid shell commands.|
|**9. Log file location**|Inspect `~/.gemini/antigravity-cli/logs` or `~/.cache` after a run.|Logs should contain the conversation and agent actions.|If logs are elsewhere or not written, update documentation.|
|**10. Conversation continuation**|`agy --print "Hello"` then `agy --continue` or `agy --conversation <id>`|If supported, the CLI should load the previous conversation and allow continuation.|If not supported, treat print runs as isolated sessions.|

## Auxiliary documentation recommendations

To maintain long‑term effectiveness of GPT + Agy integration, the project should include dedicated documentation files in the repository.  Each document should have a clear purpose, owner and update trigger.

| Document | Purpose | Owner | When to update | Minimum contents | Repo vs private |
|---|---|---|---|---|---|
|**docs/agy/AGY_CLI_SPEC.md**|Authoritative summary of CLI flags, slash commands, permission modes and known behaviours.|Technical lead or dev‑ops engineer.|Update when new CLI versions introduce changes.|Flag descriptions, default settings, sample commands, differences between interactive and non‑interactive modes.|Repository.|
|**docs/agy/GPT_AGY_WORKFLOW.md**|High‑level workflow for GPT + Agy integration, describing roles, prompt patterns and decision matrix.|GPT integrator.|Whenever workflow changes or new tasks are added.|Architecture diagram, prompt templates, when to use interactive vs print mode.|Repository.|
|**docs/agy/AGY_PROMPT_PATTERNS.md**|Library of proven prompt templates for different tasks.|Prompt architect or AI/UX writer.|After each successful milestone or when new patterns emerge.|Complete templates with examples, guidelines on including context, constraints, verification steps.|Repository.|
|**docs/agy/AGY_VALIDATION_RESULTS.md**|Record of local validation tests (see matrix above).|Dev‑ops engineer.|When tests are run or CLI updates occur.|Commands, dates, outputs, unexpected behaviours and mitigation.|Repository.|
|**docs/agy/AGY_FAILURE_MODES.md**|Known failure modes, workarounds and safe defaults.|All contributors.|Whenever a failure or bug is encountered.|Descriptions of timeouts, permission failures, model selection issues and recommended mitigations.|Repository.|
|**docs/agy/AGY_SECURITY_PRIVACY_GUARDRAILS.md**|Guidelines for handling sensitive data and preventing exfiltration.|Security lead.|When new data flows or third‑party integrations are introduced.|Explanation of permission modes, sandbox usage, restricted directories and monitoring logs.|Repository.|
|**docs/VISUAL_QA_WORKFLOW.md**|Process for screenshot‑based UI verification (if the CLI supports screenshot capture).|QA engineer.|Before each UI polish pass.|Steps for launching the dev server, capturing screenshots, comparing before/after images and reporting issues.|Repository.|
|**docs/M3_IMPLEMENTATION_GUARDRAILS.md**|Guidelines for implementing Material 3 components consistently.|Front‑end lead.|When design tokens or components change.|Use of typography scales, spacing, colours, states and responsive patterns.|Repository.|
|**docs/RELEASE_VERIFICATION_CHECKLIST.md**|Checklist for verifying builds before release.|Release manager.|Before each release.|List of commands (build, lint, tests), environment checks, diff reviews, banned string searches.|Repository.|
|**AGENTS.md**|High‑level description of available agents and subagents.|Agent architect.|Whenever new agents or skills are added.|Agent capabilities, triggers, limitations, dependencies.|Repository.|
|**docs/ACTIVE_CONTEXT.md**|Guidelines on what context files the agent should load and how to structure them.|Project maintainers.|Whenever new features or major refactors occur.|Mapping of context files, emphasising core business logic and UI components.|Repository.

## Final recommended repository doc changes

1. **Add `docs/agy/AGY_CLI_SPEC.md`** summarising the CLI flags, interactive commands and behaviours, using the information consolidated in this report.  Include a clear note on unknown flags and the need for local validation.
2. **Create `docs/agy/GPT_AGY_WORKFLOW.md`** to document the roles and processes for using GPT with Antigravity CLI.  Incorporate the recommended prompt templates and operating architecture.
3. **Update `AGENTS.md`** to explain how the CLI fits into the project’s agent architecture and how custom subagents or skills should be integrated.
4. **Add `docs/agy/AGY_VALIDATION_RESULTS.md`** with results from the local test matrix and update it regularly as new versions of the CLI are released.
5. **Include guidelines on model selection** in the README or a dedicated document so that developers understand when to use each model.
6. **Ensure sensitive information is protected** – emphasise the use of `AGY_CLI_HIDE_ACCOUNT_INFO` environment variable【977256602485969†L589-L593】 and the importance of trusted workspaces.

## Appendix: Raw command outputs and source links

* The container environment did not have the `agy` binary; running `agy --version` returned `command not found`.  Users must install the CLI locally.
* For additional context, refer to the codelab “Hands‑on with Antigravity CLI” and the GitHub changelog.  Key lines are cited throughout this report.

