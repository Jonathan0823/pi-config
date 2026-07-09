import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
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

async function runTaskNew(confirmResponses: boolean[]) {
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

  return { cwd, confirmMessages, editorTexts };
}

try {
  const first = await runTaskNew([false, false, true]);
  const taskDirs = await readdir(join(first.cwd, "tasks"), { withFileTypes: true });
  const taskDir = taskDirs.find((entry) => entry.isDirectory() && /^\d{3}-/.test(entry.name));
  assert(taskDir, "task directory should be created after approval");

  const taskPath = join(first.cwd, "tasks", taskDir!.name);
  const files = await readdir(taskPath);
  assert(files.includes("state.json"), "state.json should exist");
  assert(!files.includes("spec.md"), "spec.md should not exist before the approved draft is written");
  assert(!files.includes("plan.md"), "plan.md should not exist before the approved draft is written");

  const state = JSON.parse(await readFile(join(taskPath, "state.json"), "utf8"));
  assert.equal(state.phase, "spec");
  assert.equal(state.planApproved, false);

  assert.equal(first.confirmMessages.length, 3, "declines should loop until approval");
  assert.match(first.confirmMessages[0], /create spec\.md and plan\.md/i);
  assert.match(first.confirmMessages[2], /Include follow-up loop notes/);
  assert.match(first.editorTexts[0], /Approved clarifications:/);
  assert.match(first.editorTexts[0], /Add a testable summary/);
  assert.match(first.editorTexts[0], /Include follow-up loop notes/);

  await rm(first.cwd, { recursive: true, force: true });
  console.log("task-new confirmation flow ok");
} catch (error) {
  console.error(error);
  process.exitCode = 1;
}
