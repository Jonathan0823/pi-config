import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { readFile, writeFile } from "node:fs/promises";
import { basename, resolve } from "node:path";

const AGENT_FILES = ["AGENTS.md", "agents.md"] as const;
const TEMPLATE_BLOCK = `## context-mode is active
Use \`ctx_*\` tools. The extension injects routing rules — follow them.
`;

function hasTemplate(text: string): boolean {
  return (
    text.includes("## context-mode is active") &&
    text.includes(
      "Use `ctx_*` tools. The extension injects routing rules — follow them.",
    )
  );
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await readFile(path, "utf8");
    return true;
  } catch {
    return false;
  }
}

async function resolveAgentsPath(cwd: string): Promise<string> {
  for (const name of AGENT_FILES) {
    const candidate = resolve(cwd, name);
    if (await fileExists(candidate)) return candidate;
  }

  return resolve(cwd, AGENT_FILES[0]);
}

function appendBlock(text: string): string {
  const separator = text.endsWith("\n\n")
    ? ""
    : text.endsWith("\n")
      ? "\n"
      : "\n\n";
  return `${text}${separator}${TEMPLATE_BLOCK}`;
}

async function runInit(
  cwd: string,
  ctx: {
    hasUI: boolean;
    ui: {
      notify(message: string, level?: string): void;
      confirm(title: string, message: string): Promise<boolean>;
    };
  },
) {
  const agentsPath = await resolveAgentsPath(cwd);
  const fileName = basename(agentsPath);

  if (!(await fileExists(agentsPath))) {
    await writeFile(agentsPath, `${TEMPLATE_BLOCK}\n`, "utf8");
    ctx.ui.notify(`Created ${fileName}`, "info");
    return;
  }

  const current = await readFile(agentsPath, "utf8");
  if (hasTemplate(current)) {
    ctx.ui.notify(`${fileName} already has the context-mode block.`, "info");
    return;
  }

  if (!ctx.hasUI) {
    ctx.ui.notify(
      `Append requires confirmation in the UI before updating ${fileName}.`,
      "warning",
    );
    return;
  }

  const ok = await ctx.ui.confirm(
    "Append AGENTS.md block?",
    `Append the context-mode routing block to ${fileName}?`,
  );
  if (!ok) return;

  await writeFile(agentsPath, `${appendBlock(current)}\n`, "utf8");
  ctx.ui.notify(`Updated ${fileName}`, "info");
}

export default function initAgents(pi: ExtensionAPI) {
  pi.registerCommand("init", {
    description:
      "Create or append AGENTS.md with the context-mode routing block",
    handler: async (_args, ctx) => {
      await runInit(ctx.cwd, ctx);
    },
  });

  pi.registerCommand("init-agents", {
    description: "Alias for /init",
    handler: async (_args, ctx) => {
      await runInit(ctx.cwd, ctx);
    },
  });
}
