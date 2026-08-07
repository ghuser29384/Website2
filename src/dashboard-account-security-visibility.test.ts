import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const dashboard = readFileSync("src/app/dashboard/page.tsx", "utf8");
const layout = readFileSync("src/app/dashboard/layout.tsx", "utf8");
const routeCss = readFileSync(
  "src/app/dashboard/dashboard-account-security.css",
  "utf8",
);
const globalCss = readFileSync("src/app/globals.css", "utf8");
const accountSecurityPanel = readFileSync(
  "src/components/dashboard/background-account-security-panel.tsx",
  "utf8",
);

test("the dashboard loads the route-scoped Account security visibility repair", () => {
  assert.match(layout, /import\s+["']\.\/dashboard-account-security\.css["']/);
  assert.match(
    dashboard,
    /<div className="page-shell dashboard-page marketplace-app-shell">/,
  );
  assert.match(
    dashboard,
    /<BackgroundAccountSecurityPanel\s+initialSummary=\{accountSecuritySummary\}\s*\/>/,
  );
});

test("only Account security is exposed from the otherwise hidden legacy workspace", () => {
  assert.match(
    globalCss,
    /\.marketplace-app-shell\s+#main-content\s*>\s*\.section\s*\{\s*display:\s*none;/,
  );
  assert.match(
    routeCss,
    /#main-content\s*>\s*#background-networking:has\(#account-security\)\s*\{[\s\S]*display:\s*block;/,
  );
  assert.match(routeCss, />\s*\.data-grid\s*>\s*:not\(#account-security\)/);
  assert.match(
    routeCss,
    /#background-networking\s+#account-security\s*\{[\s\S]*display:\s*grid;/,
  );
});

test("the exposed card contains the complete authenticator enrollment flow", () => {
  assert.match(accountSecurityPanel, /id="account-security"/);
  assert.match(accountSecurityPanel, />Account security</);
  assert.match(accountSecurityPanel, />Create MFA setup</);
  assert.match(accountSecurityPanel, /alt="Authenticator app setup QR code"/);
  assert.match(accountSecurityPanel, />Verify MFA setup</);
  assert.match(accountSecurityPanel, /autoComplete="one-time-code"/);
});
