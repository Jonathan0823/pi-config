# Pi Taskflow Autonomous Mode

## Goal
- Make taskflow run the full task end-to-end in one shot instead of prompting slice-by-slice.
- Allow selecting current tasks by generated number instead of full task name/slug.
- Keep taskflow as the source of truth and still mark completion through taskflow.

## Context
- Current workflow lives in `extensions/taskflow.ts` and is already task-file driven.
- Today `task-next` prepares one slice at a time, and `task-current` expects a full task directory path.
- Task directories are numbered (`tasks/001-name`), so the numeric prefix should be enough for selection.
- `tasks/` remains the only task-tracking system.

## Assumptions
- Keep changes small and reversible.
- Preserve existing task state files and task numbering.
- Add an autonomous run path without removing the existing compact status/approve/branch/PR helpers.
- Keep safety guards for risky commands and approved task-file rewrites.

## Plan
1. Add a task selector that resolves tasks by numeric prefix.
   - Dependency: none
   - Verify: `/task-current 001` can resolve the matching `tasks/001-*` directory.
2. Add an end-to-end run mode for taskflow.
   - Dependency: step 1
   - Verify: `/task-run` or `taskflow action run` produces a full-task execution prompt instead of slice-by-slice guidance.
3. Ensure taskflow still records progress and completion.
   - Dependency: step 2
   - Verify: completed tasks are still marked through `/task-done` or the `taskflow` tool.
4. Validate the extension and update docs/prompts if needed.
   - Dependency: steps 1-3
   - Verify: extension loads and the workflow text matches the new behavior.

## Checklist
- [x] Update task selection to use numeric task ids/prefixes.
- [x] Add an autonomous end-to-end task run command/action.
- [x] Preserve taskflow completion marking.
- [x] Validate the extension and inspect the diff.

## Risks
- Fully automatic runs can hide intermediate mistakes until the end.
- Numeric selection must stay unambiguous if multiple directories share a prefix.
- Adding another command can increase workflow complexity if not documented clearly.

## Acceptance
- I can select a task with only its number.
- I can trigger a single end-to-end task run.
- Taskflow still marks done/completion when the run finishes.
- The workflow remains compaction-safe and source-of-truth driven.

## Validation
- Check the updated extension for path resolution and new command wiring.
- Run a config/diff sanity check after edits.
- Confirm taskflow state updates still work for done/approve/branch/PR.
- Result: `pi --extension extensions/taskflow.ts --list-models gpt-5.5` succeeded.
- Result: `git diff --check` passed.

## Notes
- Keep this file current while implementing.
- The new mode should favor autonomous completion, not one-slice prompts.
- `/task-current` now accepts a numeric task prefix (for example, `001`).
- `/task-run` is the new end-to-end path; `/task-next` remains the single-slice helper.
