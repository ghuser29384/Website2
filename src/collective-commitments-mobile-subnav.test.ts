import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function source(path: string) {
  return readFile(path, "utf8");
}

test("Collective commitment record shell applies responsive shell and subnavigation classes", async () => {
  const shell = await source(
    "src/components/collective-commitments/collective-commitment-shell.tsx",
  );

  assert.match(shell, /collective-commitments-mobile\.module\.css/);
  assert.match(
    shell,
    /className=\{`page-shell \$\{styles\.shell\} \$\{mobileStyles\.responsiveShell\}`\}/,
  );
  assert.match(
    shell,
    /className=\{`\$\{styles\.subnav\} \$\{mobileStyles\.responsiveSubnav\}`\}/,
  );
  assert.match(shell, /href="\/trades\/new"/);
  assert.match(
    shell,
    /href="\/trades\/new\?mode=collective#collective-commitments-list"/,
  );
  assert.match(
    shell,
    /href="\/trades\/new\?mode=collective#collective-identity"/,
  );
  assert.match(shell, />\s*Collective commitments\s*<\/Link>/);
  assert.match(shell, />\s*Create\s*<\/Link>/);
  assert.match(shell, />\s*Identity verification\s*<\/Link>/);
});

test("narrow Collective commitment record shell wraps navigation and removes decorative overflow", async () => {
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
  assert.match(css, /\.mt-site-topbar[\s\S]*\.mt-wordmark-label[\s\S]*display: none/);
  assert.match(css, /\.mt-footer-mark[\s\S]*display: none/);
  assert.doesNotMatch(css, /overflow-x:\s*auto/);
  assert.doesNotMatch(css, /white-space:\s*nowrap/);
});
