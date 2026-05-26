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
1. Audit the current config surface (`settings.json`, `AGENTS.md`, `APPEND_SYSTEM.md`, `prompts/`, `extensions/`) and note duplication or missing pieces.
   - Dependency: none
   - Verify: list of concrete issues/opportunities is captured in this task file.
2. Make `AGENTS.md` the canonical workflow file and reduce overlap in `APPEND_SYSTEM.md`.
   - Dependency: step 1
   - Verify: only one clear source of workflow truth remains.
3. Check whether Context7 MCP is actually supported by Pi config; add it only if the settings surface supports it.
   - Dependency: step 1
   - Verify: support status is recorded and the smallest useful setup is chosen.
4. Add `context-mode` for Pi support, context protection, and session continuity.
   - Dependency: step 1
   - Verify: package + MCP config are in place and the rationale is documented.
5. Add a `tasks/` starter/template file so future work follows the same source-of-truth flow.
   - Dependency: steps 1-2
   - Verify: template exists and matches the task-first workflow.
6. Keep the risky-command guard, and tune it only if it improves safety without blocking normal work.
   - Dependency: step 1
   - Verify: guard remains balanced and predictable.
7. Final pass: check token overhead, instruction clarity, and alignment with medium autonomy.
   - Dependency: steps 2-6
   - Verify: config is simpler and ready for use.

## Checklist
- [x] Audit current config files and record findings.
- [x] Consolidate workflow instructions so `AGENTS.md` is the primary source.
- [x] Reduce or reframe `APPEND_SYSTEM.md` if it duplicates content.
- [x] Confirm or document the Context7 MCP support status.
- [x] Decide whether `context-mode` is worth adding.
- [x] Add `context-mode` package and MCP config.
- [x] Create a `tasks/` starter/template file for future work.
- [x] Preserve the risky-command guard and only adjust if necessary.
- [x] Validate the final config for clarity, token overhead, and medium autonomy.

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
