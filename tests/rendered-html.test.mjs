import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

test("renders development preview metadata", async () => {
  const layout = await readFile(new URL("../app/layout.tsx", import.meta.url), "utf8");
  assert.match(layout, /["']codex-preview["']\s*:\s*["']development["']/i);
});
