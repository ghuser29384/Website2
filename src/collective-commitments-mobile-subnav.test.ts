import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function source(path: string) {
  return readFile(path, "utf8");
}

test("Collective Commitments shell applies the responsive subnavigation class", async () => {
  const shell = await source(
    "src/components/collective-commitments/collective-commitment-shell.tsx",
  );

  assert.match(shell, /collective-commitments-mobile\.module\.css/);
  assert.match(
    shell,
    /className=\{`\$\{styles\.subnav\} \$\{mobileStyles\.responsiveSubnav\}`\}/,
  );
  assert.match(shell, />Collective commitments<\/Link>/);
  assert.match(shell, />Create<\/Link>/);
  assert.match(shell, />Identity verification<\/Link>/);
});

test("narrow Collective Commitments navigation wraps instead of scrolling horizontally", async () => {
  const css = await source(
    "src/components/collective-commitments/collective-commitments-mobile.module.css",
  );

  assert.match(css, /@media \(max-width: 820px\)/);
  assert.match(css, /flex-wrap: wrap/);
  assert.match(css, /overflow-x: visible/);
  assert.match(css, /white-space: normal/);
  assert.match(css, /@media \(max-width: 360px\)/);
  assert.match(css, /grid-template-columns: minmax\(0, 1fr\) auto/);
  assert.match(css, /\.responsiveSubnav a:last-child[\s\S]*grid-column: 1 \/ -1/);
  assert.doesNotMatch(css, /overflow-x:\s*auto/);
  assert.doesNotMatch(css, /white-space:\s*nowrap/);
});
