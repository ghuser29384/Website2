import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const styles = readFileSync(new URL("../app/readability-cleanup.css", import.meta.url), "utf8");

test("text selection uses the subdued accent surface instead of fluorescent signal yellow", () => {
  const selections = [...styles.matchAll(/::selection\s*\{([^}]*)\}/g)];

  assert.equal(selections.length, 1, "Keep one global selection readability safeguard.");
  const declarations = selections[0][1];
  assert.match(declarations, /background:\s*var\(--accent-soft\);/);
  assert.match(declarations, /color:\s*var\(--ink\);/);
  assert.doesNotMatch(declarations, /--signal|transparent|#e1f65b/i);
});
