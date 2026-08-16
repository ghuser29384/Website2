import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const remediation = readFileSync(
  "src/app/canonical-visual-system-remediation.css",
  "utf8",
);
const renderedQaSpec = readFileSync(
  "tests/direct-spending-upgrade-authenticated.spec.ts",
  "utf8",
);

test("Spending Upgrade desktop QA keeps the fixed masthead navigation in one row", () => {
  assert.match(
    renderedQaSpec,
    /\{ name: "desktop", width: 1440, height: 1000 \}/,
  );
  assert.match(
    remediation,
    /\.mt-site-topbar \.topbar-links \{\s*flex-wrap: nowrap !important;\s*\}/,
  );
  assert.match(
    remediation,
    /@media \(min-width: 1181px\) and \(max-width: 1500px\)[\s\S]*?\.mt-site-topbar \.topbar-links > a,[\s\S]*?\.mt-site-topbar \.topbar-menu-trigger \{\s*padding-inline: 11px !important;/,
  );
});
