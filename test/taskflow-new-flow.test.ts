import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import taskflow from "../extensions/taskflow.ts";

function makePi() {
  const commands = new Map<string, any>();
  return {
    commands,
    registerTool() {},
    registerCommand(name: string, definition: any) {
      commands.set(name, definition);
    },
    sendMessage() {},
    setSessionName() {},
    on() {},
  };
}

async function setupTask(confirmResponses: boolean[]) {
  const cwd = await mkdtemp(join(tmpdir(), "taskflow-new-"));
  const pi = makePi();
  taskflow(pi as any);

  const taskNew = pi.commands.get("task-new");
  assert(taskNew, "task-new command should be registered");

  const confirmMessages: string[] = [];
  const editorTexts: string[] = [];
  const inputQueue = ["Confirm before creation", "Add a testable summary", "Include follow-up loop notes"];
  const ctx = {
    cwd,
    ui: {
      select: async () => "Normal feature",
      input: async () => inputQueue.shift(),
      confirm: async (_title: string, message: string) => {
        confirmMessages.push(message);
        return confirmResponses.shift() ?? true;
      },
      notify() {},
      setEditorText(text: string) {
        editorTexts.push(text);
      },
    },
  };

  await taskNew.handler("", ctx);

  const taskDirs = await readdir(join(cwd, "tasks"), { withFileTypes: true });
  const taskDir = taskDirs.find((entry) => entry.isDirectory() && /^\d{3}-/.test(entry.name));
  assert(taskDir, "task directory should be created after approval");

  const taskPath = join(cwd, "tasks", taskDir!.name);
  return { cwd, taskPath, confirmMessages, editorTexts, pi, ctx };
}

void (async () => {
  try {
    const first = await setupTask([false, false, true]);
    const files = await readdir(first.taskPath);
    assert(files.includes("state.json"), "state.json should exist");
    assert(files.includes("spec.md"), "spec.md should exist after task creation");
    assert(files.includes("plan.md"), "plan.md should exist after task creation");

    const state = JSON.parse(await readFile(join(first.taskPath, "state.json"), "utf8"));
    assert.equal(state.phase, "spec");
    assert.equal(state.planApproved, false);

    assert.equal(first.confirmMessages.length, 3, "declines should loop until approval");
    assert.match(first.confirmMessages[0], /create spec\.md and plan\.md/i);
    assert.match(first.confirmMessages[2], /Include follow-up loop notes/);
    assert.match(first.editorTexts[0], /Do NOT write spec\.md or plan\.md yet\./);
    assert.match(first.editorTexts[0], /walk through the approach with the user/i);

    const specText = await readFile(join(first.taskPath, "spec.md"), "utf8");
    const planText = await readFile(join(first.taskPath, "plan.md"), "utf8");
    assert.match(specText, /## Objective/);
    assert.match(planText, /## Approach/);

    await rm(first.cwd, { recursive: true, force: true });

    const second = await setupTask([true]);
    const spec = `# Add generic /plan\n\n## Objective\n- Add generic /plan command\n\n## User stories\n- As an operator, I want a /plan command so I can brainstorm tasks.\n\n## Scope\n### In scope\n- Create the /plan command\n\n### Out of scope\n- TBD\n\n## Requirements\n- Capture approved clarifications\n- Produce a reviewable plan\n\n## Test cases\n- Input: /plan without args -> Expect: interactive intake\n\n## Validation / tests\n- Run taskflow tests\n\n## Acceptance criteria\n- [ ] The command creates a clear plan\n\n## Open questions\n- TBD\n`;
    await writeFile(join(second.taskPath, "spec.md"), spec, "utf8");

    const taskApprove = second.pi.commands.get("task-approve");
    assert(taskApprove, "task-approve command should be registered");

    await taskApprove.handler("", second.ctx);

    const generatedPlan = await readFile(join(second.taskPath, "plan.md"), "utf8");
    const generatedTasks = await readFile(join(second.taskPath, "tasks.md"), "utf8");
    const approvedState = JSON.parse(await readFile(join(second.taskPath, "state.json"), "utf8"));

    assert.equal(approvedState.planApproved, true);
    assert.equal(approvedState.phase, "implement");
    assert.match(generatedPlan, /## Implementation strategy/);
    assert.match(generatedTasks, /Generated from the approved plan/i);
    assert.match(generatedTasks, /T001 Confirm the approved plan and implementation approach/);
    assert.match(generatedTasks, /T002 Implement plan step: Review the approved spec and confirm the objective:/);
    assert.match(generatedTasks, /T003 Implement plan step: Implement the listed requirements:/);
    assert.match(generatedTasks, /T004 Implement plan step: Verify the acceptance criteria and keep out-of-scope items untouched\./);
    assert.match(generatedTasks, /T005 Implement plan step: Run the relevant validation and polish any follow-up fixes\./);
    assert.match(generatedTasks, /T006 Validate: Run taskflow tests/);

    await rm(second.cwd, { recursive: true, force: true });
    console.log("taskflow approval flow ok");
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  }
})();
