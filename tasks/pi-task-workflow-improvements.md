# Pi Task Workflow Improvements

## Goal
- Improve task handling so the agent follows a structured spec-driven workflow without excessive ceremony.
- Reduce agent forgetting, stale task files, low-quality plans, and plan rewrites.
- Explore TypeScript-driven workflow helpers to save tokens and enforce task state.
- Integrate tasks with branch, commit, and PR workflows for solo and team use.

## Context
- User wants per-feature/per-bug structured tasks.
- Current task workflow is too manual: agents forget to update tasks, rewrite plans, and spend too many tokens.
- User prefers spec-driven development.
- User is open to Pi-native examples/extensions/skills, public agent workflow configs, and popular task-management patterns.
- User wants autonomy but still expects safe approvals for risky actions.

## Assumptions
- Prefer small, reversible changes.
- Research first, then propose concrete options before implementation.
- Avoid relying solely on model discipline where a TypeScript extension/script can enforce behavior.
- Keep task files compact and compaction-safe.

## Plan
1. Review Pi docs for prompt templates, skills, extensions, packages, and relevant examples.
   - Dependency: none
   - Verify: findings are summarized in this task file.
2. Review current config task-related files and prompts.
   - Dependency: step 1
   - Verify: gaps are identified.
3. Identify workflow patterns suitable for spec-driven task management.
   - Dependency: steps 1-2
   - Verify: options are compared by ceremony, enforcement, and token cost.
4. Propose a concrete Pi implementation plan.
   - Dependency: step 3
   - Verify: user can approve before edits.

## Checklist
- [x] Read relevant Pi docs and examples.
- [x] Audit current task prompts/skills/config.
- [x] Compare candidate workflow patterns.
- [x] Recommend a concrete workflow upgrade.
- [x] Pause for approval before implementation.
- [x] Implement local `taskflow` TypeScript extension.
- [x] Validate extension loads through Pi.

## Risks
- Too much workflow structure may slow coding down.
- Too little enforcement may not fix forgetfulness.
- Extensions can overreach if they block normal iteration.
- Extra task metadata can waste tokens if loaded repeatedly.

## Acceptance
- Clear recommendation for a better task workflow.
- Recommendation includes how tasks, branches, commits, and PRs connect.
- Recommendation minimizes token overhead.
- Any proposed automation is Pi-native and maintainable.

## Validation
- Confirm docs/examples were reviewed.
- Confirm recommendation directly addresses user pain points.
- If implementation is approved later, validate with JSON/TypeScript checks and `git diff --check`.

## Notes
- Keep this task file as the source of truth.
- Pi docs support three useful primitives for this workflow: prompt templates for slash commands, skills for progressive-disclosure guidance, and TypeScript extensions for enforceable state/tools/UI.
- The Pi `plan-mode` example is directly relevant: read-only planning mode, execution mode, extracted numbered plan steps, `[DONE:n]` markers, status/widget progress, and session persistence.
- The Pi `todo.ts` example is relevant but should not be copied directly because in-session todos are not a durable repo artifact; its state persistence/rendering pattern is useful.
- The Pi `dirty-repo-guard.ts`, `git-checkpoint.ts`, `session-name.ts`, and `bookmark.ts` examples are useful for session safety and resumability.
- GitHub Spec Kit is a strong model for spec-driven development: constitution → specify → plan → tasks → implement, with feature directories and task files organized by user story, dependencies, parallel markers, file paths, tests, and checkpoints.
- Public Pi package candidate: `@linimin/pi-letscook` appears closest to the use case because it uses canonical repo-local `.agent/**` state, confirm-first startup, resumability, review/audit flow, and verification helpers. Review source before installing.
- Public Pi package candidate: `@eko24ive/pi-ask` may improve clarification flow with a native ask_user tool. Review source before installing.
- Recommendation: build a small local TypeScript extension first instead of relying only on prompts or installing a third-party workflow package.
- Implemented `extensions/taskflow.ts` with commands: `/task-new`, `/task-current`, `/task-status`, `/task-approve`, `/task-revise`, `/task-next`, `/task-done`, `/task-branch`, and `/task-pr`.
- Implemented `taskflow` tool for compact task status/next/done/approve/branch/PR context updates without loading full task files.
- Implemented guard that asks before editing approved `spec.md`, `plan.md`, or `tasks.md`, blocking in non-interactive mode.
- Validation: `pi --extension extensions/taskflow.ts --list-models gpt-5.5` succeeds, proving the extension loads.
