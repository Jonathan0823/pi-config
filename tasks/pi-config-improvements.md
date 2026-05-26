# Pi Config Improvements

## Goal
- Improve this Pi config for coding speed, context handling, token efficiency, and accuracy.
- Keep `tasks/` as the only source of truth for todo/task tracking.
- Stay at medium autonomy: run safe validation steps (lint/typecheck/tests) without asking, but ask before risky changes.

## Context
- Current config lives in the repo root (`settings.json`, `AGENTS.md`, `APPEND_SYSTEM.md`, `prompts/`, `extensions/`).
- `settings.json` already enables compaction and a risky-command guard.
- `AGENTS.md` is the preferred canonical workflow file.
- The repo now includes a `tasks/` directory and a task template file for future work.
- Context7 MCP already exists in the related OpenCode config and is likely useful for docs access.
- `context-mode` appears to support Pi via `pi install npm:context-mode` plus `mcp.json`; it may be a strong fit for context handling.

## Assumptions
- Keep changes small and reversible.
- Do not add a separate todo system outside `tasks/`.
- Prefer `AGENTS.md` as the source of truth over `APPEND_SYSTEM.md`.
- Use MCP only where it clearly improves docs/context handling.

## Plan
1. Tighten the git commit prompt and skill so they always inspect the diff and repo state before drafting messages.
   - Dependency: none
   - Verify: the prompt/skill ask the model to discover repo context first and output conventional commit drafts.
2. Tighten the PR prompt and skill so they inspect remote/template context before asking for missing details.
   - Dependency: step 1
   - Verify: the prompt/skill look up remote, default branch, GH repo info, and PR templates before drafting.
3. Decide whether the default model should change for higher-quality git/PR drafting.
   - Dependency: steps 1-2
   - Verify: either the config is updated or the decision is documented here.
4. Run a final consistency pass on the task file and affected config files.
   - Dependency: steps 1-3
   - Verify: the repo instructions remain concise and aligned with medium autonomy.

## Checklist
- [x] Audit current config files and record findings.
- [x] Capture the git/PR workflow weakness in this task file.
- [x] Tighten the commit and PR prompt templates.
- [x] Tighten the matching git-commit and pr-writing skills.
- [x] Decide whether the default model should change.
- [x] Validate the final config for clarity and behavior.

## Risks
- Adding too many instructions can increase token usage and reduce clarity.
- Duplicate workflow files can cause conflicting behavior.
- Extra MCP/tools may add complexity without real benefit.
- Overly strict guards may block legitimate commands.

## Acceptance
- The config is simpler, clearer, and better aligned with medium autonomy.
- Context7 support status is documented; context-mode is wired in for Pi.
- `tasks/` is clearly the only todo source of truth.
- Duplicated instructions are reduced.
- Any added tool/extension has a clear reason to exist.

## Validation
- Inspect the diff for duplicated or conflicting instructions.
- Confirm the final config reflects medium autonomy.
- Confirm task tracking is only via `tasks/`.
- JSON files parse cleanly.
- `git diff --check` passes.
- If config changes are made, run the relevant validation or startup checks.

## Notes
- Keep this task file current as the work changes.
- Pause before any code/config edits until this task is approved.
- Context-mode is now included as the package + MCP pair needed for Pi.
- The implementation stays minimal: one package entry plus one MCP server entry.
- Review finding: the main weakness is git/PR prompting, not the base Pi shell config.
- Review finding: `prompts/commit.md` and `prompts/pr.md` were too thin; they now force repo discovery (`git remote -v`, `git branch -vv`, `gh repo view`, template lookup) before asking the user for missing info.
- Decision: keep the default model unchanged for now; the prompt/skill fixes were the high-impact change, and a model bump should wait for a known-good replacement.
