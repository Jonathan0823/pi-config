import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

void (async () => {
  try {
    const prompt = await readFile("prompts/plan.md", "utf8");

    assert.match(prompt, /plain-text draft plan/i);
    assert.match(prompt, /Request: \$1/);
    assert.match(prompt, /ask 1-3 short clarifying questions/i);
    assert.match(prompt, /do not write files/i);
    assert.match(prompt, /Goal:\n- \.{3}/);
    assert.match(prompt, /Open questions:\n- \.{3}/);
    assert.doesNotMatch(prompt, /tasks\/\$1\.md/i);
    assert.doesNotMatch(prompt, /approved spec/i);

    console.log("plan prompt ok");
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  }
})();
