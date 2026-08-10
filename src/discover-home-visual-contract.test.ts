import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function read(path: string) {
  return readFile(new URL(path, root), "utf8");
}

test("Discover reuses the canonical home navigation and hard-edged visual language", async () => {
  const [navigation, styles] = await Promise.all([
    read("public/moral-trade-discover-navigation.js"),
    read("public/moral-trade-discover-home-alignment.css"),
  ]);

  for (const [label, path] of [
    ["Feed", "/feed"],
    ["Discover", "/discover"],
    ["Controls", "/trade-controls"],
    ["Trade", "/trades/new"],
    ["Commitments", "/commitments"],
    ["Evidence", "/evidence"],
  ]) {
    assert.match(
      navigation,
      new RegExp(`label: \\"${label}\\", path: \\"${path.replaceAll("/", "\\/")}\\"`),
    );
  }

  assert.match(navigation, /moral-trade-discover-home-alignment\.css\?v=20260810/);
  assert.match(navigation, /Focus Discover command/);
  assert.match(navigation, /document\.getElementById\("command-input"\)/);
  assert.match(navigation, /MutationObserver\(schedulePatch\)/);

  assert.match(styles, /--paper:\s*#f5f2e9/);
  assert.match(styles, /--blue:\s*#154cff/);
  assert.match(styles, /\.app-header\s*\{[^}]*background:\s*#050505/s);
  assert.match(styles, /\.top-nav a\.active,[\s\S]*background:\s*var\(--paper-strong\)/);
  assert.match(styles, /\.left-rail\s*\{[^}]*grid-column:\s*1\s*\/\s*-1/s);
  assert.match(styles, /\.full-rail\s*\{[^}]*display:\s*flex/s);
  assert.match(
    styles,
    /\.rail-tab\[aria-selected="true"\]::after\s*\{[^}]*background:\s*var\(--blue\)/s,
  );
  assert.match(styles, /\.command-form\s*\{[^}]*border:\s*1px solid var\(--ink\)/s);
  assert.match(styles, /border-radius:\s*0\s*!important/);
  assert.match(styles, /Preserve circles only when they encode a graph/);
});
