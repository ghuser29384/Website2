import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const dashboard = readFileSync("src/app/dashboard/page.tsx", "utf8");
const layout = readFileSync("src/app/dashboard/layout.tsx", "utf8");
const routeCss = readFileSync("src/app/dashboard/dashboard-account-security.css", "utf8");
const globalCss = readFileSync("src/app/globals.css", "utf8");

test("dashboard loads the route-scoped account-security visibility repair", () => {
  assert.match(layout, /import\s+["']\.\/dashboard-account-security\.css["']/);
  assert.match(
    dashboard,
    /<BackgroundAccountSecurityPanel\s+initialSummary=\{accountSecuritySummary\}\s*\/>/,
  );
});

test("only account security is exposed from the otherwise hidden legacy workspace", () => {
  assert.match(
    globalCss,
    /\.marketplace-app-shell\s+#main-content\s*>\s*\.section\s*\{\s*display:\s*none;/,
  );
  assert.match(
    routeCss,
    /#main-content\s*>\s*#background-networking\s*\{[\s\S]*display:\s*block;/,
  );
  assert.match(routeCss, /#background-networking:not\(:has\(#account-security\)\)/);
  assert.match(routeCss, />\s*\.data-grid\s*>\s*:not\(#account-security\)/);
  assert.match(
    routeCss,
    /#background-networking\s+#account-security\s*\{[\s\S]*display:\s*grid;/,
  );
});
