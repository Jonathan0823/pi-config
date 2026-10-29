import assert from "node:assert/strict";
import { mock, test } from "bun:test";

mock.module("@earendil-works/pi-tui", () => ({
  Key: {},
  matchesKey() { return false; },
  truncateToWidth: (_text: string, _width: number, _ellipsis?: string, _preserveWords?: boolean) => _text,
  wrapTextWithAnsi: (text: string) => [text],
}));

test("snippet menu uses an overlay from both entry points to preserve pasted text", async () => {
  const { default: promptSnippets } = await import("../extensions/prompt-snippets/index.ts");
  const shortcuts = new Map<string, any>();
  const commands = new Map<string, any>();
  promptSnippets({
    on() {},
    registerShortcut(key: string, definition: any) {
      shortcuts.set(key, definition);
    },
    registerCommand(name: string, definition: any) {
      commands.set(name, definition);
    },
  } as any);

  const customOptions: any[] = [];
  const ctx = {
    mode: "tui",
    hasUI: true,
    ui: {
      theme: { fg: (_color: string, text: string) => text },
      async custom(_factory: unknown, options: unknown) {
        customOptions.push(options);
        return false;
      },
      setWidget() {},
      notify() {},
    },
  };

  await shortcuts.get("alt+s").handler(ctx);
  await commands.get("snippets").handler("", ctx);

  assert.equal(customOptions.length, 2, "both menu entry points should open the custom UI");
  for (const options of customOptions) {
    assert.equal(options.overlay, true, "menu must not replace and reset editor text");
    assert.deepEqual(options.overlayOptions, { width: "100%" });
  }
});
