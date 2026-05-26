import { StringEnum } from "@earendil-works/pi-ai";
import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { withFileMutationQueue } from "@earendil-works/pi-coding-agent";
import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import { Type } from "typebox";

type Phase = "spec" | "plan" | "tasks" | "implement" | "review" | "done";
type TaskStatus = "pending" | "in_progress" | "blocked" | "done";

interface TaskItem {
  id: string;
  title: string;
  status: TaskStatus;
  parallel?: boolean;
  notes?: string[];
}

interface TaskState {
  version: 1;
  name: string;
  taskDir: string;
  phase: Phase;
  branch: string;
  planApproved: boolean;
  createdAt: string;
  updatedAt: string;
  tasks: TaskItem[];
}

const TASKS_DIR = "tasks";
const CURRENT_FILE = ".taskflow-current";
const STATE_FILE = "state.json";
const TASK_DIR_RE = /^\d{3}-[a-z0-9][a-z0-9-]*$/;

const TaskflowParams = Type.Object({
  action: StringEnum(["status", "next", "done", "approve", "branch", "pr_context"] as const),
  id: Type.Optional(Type.String({ description: "Task id for done, e.g. T001" })),
  note: Type.Optional(Type.String({ description: "Optional note for task completion" })),
});

function nowIso(): string {
  return new Date().toISOString();
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "task";
}

function branchNameFromTaskDir(taskDir: string): string {
  const base = taskDir.split("/").pop() ?? taskDir;
  return `feat/${base.replace(/^\d{3}-/, "")}`;
}

async function exists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function nextTaskNumber(cwd: string): Promise<number> {
  const tasksPath = resolve(cwd, TASKS_DIR);
  if (!(await exists(tasksPath))) return 1;

  const entries = await readdir(tasksPath, { withFileTypes: true });
  const nums = entries
    .filter((entry) => entry.isDirectory() && /^\d{3}-/.test(entry.name))
    .map((entry) => Number(entry.name.slice(0, 3)))
    .filter(Number.isFinite);
  return nums.length ? Math.max(...nums) + 1 : 1;
}

function formatNumber(n: number): string {
  return String(n).padStart(3, "0");
}

async function setCurrentTask(cwd: string, taskDir: string): Promise<void> {
  const tasksPath = resolve(cwd, TASKS_DIR);
  await mkdir(tasksPath, { recursive: true });
  await writeFile(join(tasksPath, CURRENT_FILE), `${taskDir}\n`, "utf8");
}

async function getCurrentTaskDir(cwd: string): Promise<string | undefined> {
  const currentPath = resolve(cwd, TASKS_DIR, CURRENT_FILE);
  if (!(await exists(currentPath))) return undefined;
  const value = (await readFile(currentPath, "utf8")).trim();
  return value || undefined;
}

async function loadState(cwd: string, taskDir?: string): Promise<TaskState | undefined> {
  const dir = taskDir ?? (await getCurrentTaskDir(cwd));
  if (!dir) return undefined;

  const statePath = resolve(cwd, dir, STATE_FILE);
  if (!(await exists(statePath))) return undefined;
  return JSON.parse(await readFile(statePath, "utf8")) as TaskState;
}

async function saveState(cwd: string, state: TaskState): Promise<void> {
  state.updatedAt = nowIso();
  const statePath = resolve(cwd, state.taskDir, STATE_FILE);
  await withFileMutationQueue(statePath, async () => {
    await writeFile(statePath, `${JSON.stringify(state, null, 2)}\n`, "utf8");
  });
}

function specTemplate(name: string): string {
  return `# ${name}\n\n## Objective\n- TBD\n\n## User stories\n- As a <user>, I want <capability>, so that <outcome>.\n\n## Scope\n### In scope\n- TBD\n\n### Out of scope\n- TBD\n\n## Requirements\n- TBD\n\n## Acceptance criteria\n- [ ] TBD\n\n## Open questions\n- TBD\n`;
}

function planTemplate(name: string): string {
  return `# ${name} Plan\n\n> Taskflow rule: after approval, execute this plan instead of rewriting it. Revise only with explicit user approval.\n\n## Approach\n- TBD\n\n## Dependencies\n- TBD\n\n## Implementation strategy\n1. TBD\n\n## Validation strategy\n- TBD\n\n## Risks\n- TBD\n`;
}

function tasksTemplate(name: string): string {
  return `# ${name} Tasks\n\n> Use stable task ids. Mark progress with \`/task-done T001\` or the \`taskflow\` tool.\n> Format: \`- [ ] T001 [P] Optional parallel marker and task text\`\n\n## Setup\n- [ ] T001 Confirm spec acceptance criteria and implementation plan\n\n## Implementation\n- [ ] T002 Implement the first focused slice\n\n## Validation\n- [ ] T003 Run relevant validation and record results\n`;
}

function parseTasks(markdown: string): TaskItem[] {
  const tasks: TaskItem[] = [];
  const pattern = /^- \[([ xX])\]\s+(T\d{3,})\s+(\[P\]\s+)?(.+)$/gm;

  for (const match of markdown.matchAll(pattern)) {
    tasks.push({
      id: match[2],
      title: match[4].trim(),
      status: match[1].toLowerCase() === "x" ? "done" : "pending",
      parallel: Boolean(match[3]),
    });
  }

  return tasks;
}

async function syncTaskCheckbox(cwd: string, state: TaskState, id: string): Promise<void> {
  const tasksPath = resolve(cwd, state.taskDir, "tasks.md");
  if (!(await exists(tasksPath))) return;

  await withFileMutationQueue(tasksPath, async () => {
    const current = await readFile(tasksPath, "utf8");
    const escapedId = id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const next = current.replace(new RegExp(`^- \\[ \\] ${escapedId} `, "m"), `- [x] ${id} `);
    if (next !== current) await writeFile(tasksPath, next, "utf8");
  });
}

function nextItems(state: TaskState, limit = 3): TaskItem[] {
  const inProgress = state.tasks.filter((task) => task.status === "in_progress");
  if (inProgress.length) return inProgress.slice(0, limit);
  return state.tasks.filter((task) => task.status === "pending").slice(0, limit);
}

function formatState(state: TaskState): string {
  const done = state.tasks.filter((task) => task.status === "done").length;
  const total = state.tasks.length;
  const next = nextItems(state, 3);
  return [
    `Task: ${state.name}`,
    `Dir: ${state.taskDir}`,
    `Phase: ${state.phase}${state.planApproved ? " (approved)" : ""}`,
    `Branch: ${state.branch}`,
    `Progress: ${done}/${total}`,
    "",
    "Next:",
    ...(next.length ? next.map((task) => `- ${task.id}: ${task.title}`) : ["- none"]),
  ].join("\n");
}

function compactContext(state: TaskState): string {
  const next = nextItems(state, 3).map((task) => `- ${task.id}: ${task.title}`).join("\n") || "- none";
  const done = state.tasks.filter((task) => task.status === "done").length;
  return `[TASKFLOW]\nTask: ${state.name}\nDir: ${state.taskDir}\nPhase: ${state.phase}\nPlan approved: ${state.planApproved}\nProgress: ${done}/${state.tasks.length}\nSuggested branch: ${state.branch}\nNext steps:\n${next}\n\nRules:\n- Execute the current plan; do not rewrite spec/plan/tasks during implementation unless the user explicitly asks.\n- Use the taskflow tool or /task-done to mark completed task ids.\n- Keep responses focused on the next step and validation.`;
}

async function createTask(cwd: string, rawName: string): Promise<TaskState> {
  const name = rawName.trim();
  if (!name) throw new Error("Task name is required");

  const taskDir = `${TASKS_DIR}/${formatNumber(await nextTaskNumber(cwd))}-${slugify(name)}`;
  const absDir = resolve(cwd, taskDir);
  await mkdir(absDir, { recursive: true });

  const state: TaskState = {
    version: 1,
    name,
    taskDir,
    phase: "spec",
    branch: branchNameFromTaskDir(taskDir),
    planApproved: false,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    tasks: [],
  };

  await writeFile(join(absDir, "spec.md"), specTemplate(name), "utf8");
  await writeFile(join(absDir, "plan.md"), planTemplate(name), "utf8");
  await writeFile(join(absDir, "tasks.md"), tasksTemplate(name), "utf8");
  await saveState(cwd, state);
  await setCurrentTask(cwd, taskDir);
  return state;
}

async function approveTask(cwd: string, state: TaskState): Promise<TaskState> {
  const tasksPath = resolve(cwd, state.taskDir, "tasks.md");
  const parsed = parseTasks(await readFile(tasksPath, "utf8"));
  if (parsed.length === 0) {
    throw new Error(`No task rows found in ${relative(cwd, tasksPath)}. Use: - [ ] T001 Task text`);
  }

  state.tasks = parsed;
  state.planApproved = true;
  state.phase = "implement";
  await saveState(cwd, state);
  return state;
}

async function markDone(cwd: string, state: TaskState, id?: string, note?: string): Promise<TaskState> {
  const targetId = id ?? nextItems(state, 1)[0]?.id;
  if (!targetId) throw new Error("No pending task to mark done");

  const task = state.tasks.find((item) => item.id.toLowerCase() === targetId.toLowerCase());
  if (!task) throw new Error(`Task not found: ${targetId}`);

  task.status = "done";
  if (note?.trim()) task.notes = [...(task.notes ?? []), note.trim()];
  if (state.tasks.length > 0 && state.tasks.every((item) => item.status === "done")) {
    state.phase = "review";
  }

  await syncTaskCheckbox(cwd, state, task.id);
  await saveState(cwd, state);
  return state;
}

function isProtectedTaskPath(cwd: string, filePath: string, state?: TaskState): boolean {
  if (!state?.planApproved) return false;
  const abs = resolve(cwd, filePath.replace(/^@/, ""));
  const rel = relative(cwd, abs).replace(/\\/g, "/");
  if (!rel.startsWith(`${state.taskDir}/`)) return false;
  return rel.endsWith("/plan.md") || rel.endsWith("/tasks.md") || rel.endsWith("/spec.md");
}

async function gitOutput(pi: ExtensionAPI, args: string[]): Promise<string> {
  const result = await pi.exec("git", args, { timeout: 8000 });
  return (result.stdout || result.stderr || "").trim();
}

export default function taskflow(pi: ExtensionAPI) {
  pi.registerTool({
    name: "taskflow",
    label: "Taskflow",
    description: "Read or update the current spec-driven task state without loading full task files.",
    promptSnippet: "Manage compact spec-driven task state: status, next, done, approve, branch, or PR context.",
    promptGuidelines: [
      "Use taskflow to read or update task progress instead of rewriting task markdown during implementation.",
      "Use taskflow action next before implementation work when a current task exists.",
      "Use taskflow action done after completing a stable task id.",
    ],
    parameters: TaskflowParams,
    async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
      const state = await loadState(ctx.cwd);
      if (!state) throw new Error("No current taskflow task. Run /task-new <name> first.");

      if (params.action === "approve") {
        const approved = await approveTask(ctx.cwd, state);
        return { content: [{ type: "text", text: `Approved task plan.\n\n${formatState(approved)}` }], details: approved };
      }

      if (params.action === "done") {
        const updated = await markDone(ctx.cwd, state, params.id, params.note);
        return { content: [{ type: "text", text: `Marked done.\n\n${formatState(updated)}` }], details: updated };
      }

      if (params.action === "next") {
        return { content: [{ type: "text", text: compactContext(state) }], details: { next: nextItems(state) } };
      }

      if (params.action === "branch") {
        return { content: [{ type: "text", text: state.branch }], details: { branch: state.branch } };
      }

      if (params.action === "pr_context") {
        const status = await gitOutput(pi, ["status", "-sb"]);
        const statText = await gitOutput(pi, ["diff", "--stat"]);
        const text = `${formatState(state)}\n\nGit status:\n${status}\n\nDiff stat:\n${statText || "No unstaged diff"}`;
        return { content: [{ type: "text", text }], details: { state, status, stat: statText } };
      }

      return { content: [{ type: "text", text: formatState(state) }], details: state };
    },
  });

  pi.registerCommand("task-new", {
    description: "Create a spec-driven task folder (usage: /task-new <feature-or-bug-name>)",
    handler: async (args, ctx) => {
      const name = args.trim();
      if (!name) {
        ctx.ui.notify("Usage: /task-new <feature-or-bug-name>", "warning");
        return;
      }
      const state = await createTask(ctx.cwd, name);
      pi.setSessionName(state.name);
      pi.sendMessage({ customType: "taskflow", content: `Created taskflow task.\n\n${formatState(state)}`, display: true }, { triggerTurn: false });
      ctx.ui.setEditorText(`Fill the spec for ${state.taskDir}/spec.md. Ask up to 3 clarifying questions if needed. Do not implement yet.`);
    },
  });

  pi.registerCommand("task-current", {
    description: "Set current task directory (usage: /task-current tasks/001-name)",
    handler: async (args, ctx) => {
      const taskDir = args.trim();
      if (!TASK_DIR_RE.test(taskDir.split("/").pop() ?? "")) {
        ctx.ui.notify("Usage: /task-current tasks/001-name", "warning");
        return;
      }
      const state = await loadState(ctx.cwd, taskDir);
      if (!state) {
        ctx.ui.notify(`No state found for ${taskDir}`, "error");
        return;
      }
      await setCurrentTask(ctx.cwd, taskDir);
      pi.setSessionName(state.name);
      pi.sendMessage({ customType: "taskflow", content: `Current task set.\n\n${formatState(state)}`, display: true }, { triggerTurn: false });
    },
  });

  pi.registerCommand("task-status", {
    description: "Show compact current task state",
    handler: async (_args, ctx) => {
      const state = await loadState(ctx.cwd);
      pi.sendMessage({ customType: "taskflow", content: state ? formatState(state) : "No current taskflow task.", display: true }, { triggerTurn: false });
    },
  });

  pi.registerCommand("task-approve", {
    description: "Approve spec/plan/tasks and enter implementation mode",
    handler: async (_args, ctx) => {
      const state = await loadState(ctx.cwd);
      if (!state) return ctx.ui.notify("No current taskflow task.", "error");
      const approved = await approveTask(ctx.cwd, state);
      pi.sendMessage({ customType: "taskflow", content: `Approved implementation plan.\n\n${formatState(approved)}`, display: true }, { triggerTurn: false });
    },
  });

  pi.registerCommand("task-revise", {
    description: "Explicitly reopen the current task for spec/plan/task revision",
    handler: async (_args, ctx) => {
      const state = await loadState(ctx.cwd);
      if (!state) return ctx.ui.notify("No current taskflow task.", "error");
      state.phase = "plan";
      state.planApproved = false;
      await saveState(ctx.cwd, state);
      pi.sendMessage({ customType: "taskflow", content: `Task reopened for revision.\n\n${formatState(state)}`, display: true }, { triggerTurn: false });
    },
  });

  pi.registerCommand("task-next", {
    description: "Prepare the next implementation prompt from compact task state",
    handler: async (_args, ctx) => {
      const state = await loadState(ctx.cwd);
      if (!state) return ctx.ui.notify("No current taskflow task.", "error");
      const next = nextItems(state, 1)[0];
      if (!next) {
        pi.sendMessage({ customType: "taskflow", content: "No pending taskflow tasks.", display: true }, { triggerTurn: false });
        return;
      }
      const prompt = `Implement ${next.id}: ${next.title}\n\nUse ${state.taskDir} as source of truth. Do not rewrite the plan. Validate the change, then mark ${next.id} done with taskflow.`;
      pi.sendMessage({ customType: "taskflow", content: compactContext(state), display: true }, { triggerTurn: false });
      ctx.ui.setEditorText(prompt);
    },
  });

  pi.registerCommand("task-done", {
    description: "Mark a taskflow task done (usage: /task-done T001 [note])",
    handler: async (args, ctx) => {
      const state = await loadState(ctx.cwd);
      if (!state) return ctx.ui.notify("No current taskflow task.", "error");
      const [id, ...rest] = args.trim().split(/\s+/).filter(Boolean);
      const updated = await markDone(ctx.cwd, state, id, rest.join(" "));
      pi.sendMessage({ customType: "taskflow", content: `Marked ${id ?? "next task"} done.\n\n${formatState(updated)}`, display: true }, { triggerTurn: false });
    },
  });

  pi.registerCommand("task-branch", {
    description: "Show or create the suggested task branch (usage: /task-branch [--create])",
    handler: async (args, ctx) => {
      const state = await loadState(ctx.cwd);
      if (!state) return ctx.ui.notify("No current taskflow task.", "error");
      if (!args.includes("--create")) {
        pi.sendMessage({ customType: "taskflow", content: `Suggested branch: ${state.branch}`, display: true }, { triggerTurn: false });
        return;
      }
      if (ctx.hasUI) {
        const ok = await ctx.ui.confirm("Create task branch?", `Run git checkout -b ${state.branch}?`);
        if (!ok) return;
      }
      const result = await pi.exec("git", ["checkout", "-b", state.branch], { timeout: 10000 });
      pi.sendMessage({ customType: "taskflow", content: result.stdout || result.stderr || `Created ${state.branch}`, display: true }, { triggerTurn: false });
    },
  });

  pi.registerCommand("task-pr", {
    description: "Prepare a PR drafting prompt from current task state and git context",
    handler: async (_args, ctx) => {
      const state = await loadState(ctx.cwd);
      if (!state) return ctx.ui.notify("No current taskflow task.", "error");
      const status = await gitOutput(pi, ["status", "-sb"]);
      const statText = await gitOutput(pi, ["diff", "--stat"]);
      const prompt = `Draft a review-ready PR for ${state.name}.\n\nTask context:\n${formatState(state)}\n\nGit status:\n${status}\n\nDiff stat:\n${statText || "No unstaged diff"}\n\nUse repository PR template if one exists. Include summary, scope, testing, reviewer focus, risks, and out-of-scope items.`;
      ctx.ui.setEditorText(prompt);
    },
  });

  pi.on("before_agent_start", async (_event, ctx) => {
    const state = await loadState(ctx.cwd);
    if (!state) return;
    return {
      message: {
        customType: "taskflow-context",
        content: compactContext(state),
        display: false,
      },
    };
  });

  pi.on("tool_call", async (event, ctx: ExtensionContext) => {
    if (event.toolName !== "edit" && event.toolName !== "write") return;
    const input = event.input as { path?: unknown };
    const path = typeof input.path === "string" ? input.path : undefined;
    if (!path) return;

    const state = await loadState(ctx.cwd);
    if (!isProtectedTaskPath(ctx.cwd, path, state)) return;

    if (!ctx.hasUI) {
      return { block: true, reason: "Taskflow blocks task spec/plan/tasks rewrites after approval. Run /task-revise first." };
    }

    const ok = await ctx.ui.confirm(
      "Revise approved task?",
      `Taskflow is in implementation mode. Allow editing ${path}?\n\nPrefer executing the next task instead of rewriting the plan.`,
    );
    if (!ok) {
      return { block: true, reason: "Taskflow blocked approved task rewrite. Use /task-revise to reopen planning." };
    }
  });
}
