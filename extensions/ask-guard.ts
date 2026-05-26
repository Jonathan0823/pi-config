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

export default function (pi: ExtensionAPI) {
  pi.on("tool_call", async (event, ctx) => {
    if (event.toolName === "bash") {
      const command = String((event.input as { command?: unknown }).command ?? "");
      if (dangerousBash.some((pattern) => pattern.test(command))) {
        const ok = await confirmOrBlock(ctx, "Risky command", `Allow this bash command?

${command}`);
        if (!ok) return { block: true, reason: "Blocked risky bash command" };
      }
    }

    if (event.toolName === "edit" || event.toolName === "write") {
      const path = String((event.input as { path?: unknown }).path ?? "");
      if (sensitivePaths.some((needle) => path.includes(needle))) {
        const ok = await confirmOrBlock(ctx, "Protected path", `Allow editing this path?

${path}`);
        if (!ok) return { block: true, reason: `Protected path blocked: ${path}` };
      }
    }
  });
}
