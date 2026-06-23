import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

const dangerousBash = [
  /\brm\s+(-rf|--recursive)\b/i,
  /\bsudo\b/i,
  /\bchmod\b.*\b777\b/i,
  /\bchown\b.*\b777\b/i,
  /\bgit\s+push\b.*(--force|-f)\b/i,
  /\bgit\s+reset\s+--hard\b/i,
  /\bdd\s+if=/i,
  /\bmkfs\./i,
];

const sensitivePaths = [
  ".env",
  ".secrets/",
  ".ssh/",
  ".git/",
  "id_rsa",
  ".pem",
  ".key",
  ".secret",
];

async function confirmOrBlock(ctx: any, title: string, message: string) {
  if (!ctx.hasUI) return false;
  return await ctx.ui.confirm(title, message);
}

async function handleBashCall(event: any, ctx: any) {
  const rawCmd = (event.input as { command?: unknown }).command;
  const command = typeof rawCmd === "string" ? rawCmd : "";
  if (dangerousBash.some((pattern) => pattern.test(command))) {
    const ok = await confirmOrBlock(ctx, "Risky command", `Allow this bash command?

${command}`);
    if (!ok) return { block: true, reason: "Blocked risky bash command" };
  }
}

async function handleEditWriteCall(event: any, ctx: any) {
  const rawPath = (event.input as { path?: unknown }).path;
  const path = typeof rawPath === "string" ? rawPath : "";
  if (sensitivePaths.some((needle) => path.includes(needle))) {
    const ok = await confirmOrBlock(ctx, "Protected path", `Allow editing this path?

${path}`);
    if (!ok) return { block: true, reason: `Protected path blocked: ${path}` };
  }
}

export default function askGuard(pi: ExtensionAPI) {
  pi.on("tool_call", async (event, ctx) => {
    if (event.toolName === "bash") return handleBashCall(event, ctx);
    if (event.toolName === "edit" || event.toolName === "write") return handleEditWriteCall(event, ctx);
  });
}
