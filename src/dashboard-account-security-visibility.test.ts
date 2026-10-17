import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const dashboard = readFileSync("src/app/dashboard/page.tsx", "utf8");
const layout = readFileSync("src/app/dashboard/layout.tsx", "utf8");
const routeCss = readFileSync("src/app/dashboard/dashboard-account-security.css", "utf8");
const globalCss = readFileSync("src/app/globals.css", "utf8");
const accountSecurityPanel = readFileSync("src/components/dashboard/background-account-security-panel.tsx", "utf8");
const siteTopbar = readFileSync("src/components/layout/site-topbar.tsx", "utf8");
const siteFooter = readFileSync("src/components/layout/site-footer.tsx", "utf8");

test("the explicit controls view keeps the route-scoped Account security repair", () => {
  assert.match(layout, /import\s+["']\.\/dashboard-account-security\.css["']/);
  assert.match(dashboard, /<div className="page-shell dashboard-page marketplace-app-shell">/);
  assert.match(dashboard, /<BackgroundAccountSecurityPanel\s+initialSummary=\{accountSecuritySummary\}\s*\/>/);
});

test("the requested controls view exposes its sections without rendering them on priorities", () => {
  assert.match(globalCss, /\.marketplace-app-shell\s+#main-content\s*>\s*\.section\s*\{\s*display:\s*none;/);
  assert.match(routeCss, /\.dashboard-page\.marketplace-app-shell\s+#main-content\s*>\s*\.section\s*\{\s*display:\s*block;/);
  assert.doesNotMatch(routeCss, /display:\s*none/);
  assert.match(routeCss, /#background-networking\s+#account-security\s*\{\s*display:\s*grid;/);
  const priorities = dashboard.indexOf('if (readDashboardView(resolvedSearchParams.view) === "priorities")');
  const authentication = dashboard.indexOf('await requireViewer("/dashboard?view=controls")');
  const controls = dashboard.indexOf('<DashboardTools active="controls"');
  assert.ok(priorities >= 0 && authentication > priorities && controls > authentication);
  assert.match(dashboard.slice(priorities, authentication), /return <ProfilePrioritiesView/);
});

test("the exposed card contains the complete authenticator enrollment flow", () => {
  assert.match(accountSecurityPanel, /id="account-security"/);
  assert.match(accountSecurityPanel, />\s*Account security\s*</);
  assert.match(accountSecurityPanel, />\s*Create MFA setup\s*</);
  assert.match(accountSecurityPanel, /alt="Authenticator app setup QR code"/);
  assert.match(accountSecurityPanel, />\s*Verify MFA setup\s*</);
  assert.match(accountSecurityPanel, /autoComplete="one-time-code"/);
});

test("the optional priority summary remains gated within parallel authenticated controls reads", () => {
  const authentication = dashboard.indexOf('await requireViewer("/dashboard?view=controls")');
  const parallel = dashboard.indexOf("const [dashboardData, accountSecuritySummary, priorityFundSummary] = await Promise.all([");
  assert.ok(authentication >= 0 && parallel > authentication);
  const reads = dashboard.slice(parallel, parallel + 550);
  assert.match(reads, /viewer \? loadBackgroundAccountSecuritySummary\(\) : null/);
  assert.match(reads, /viewer && supabaseReady && process\.env\.SUPABASE_SERVICE_ROLE_KEY\s*\? getPriorityCorrectionSummary\(viewer\.authUser\.id\)\s*: null/);
});

test("authenticator code inputs use a browser-valid pattern", () => {
  const validPattern = String.raw`[0-9 \-]{6,8}`;
  const patterns = [...accountSecurityPanel.matchAll(/pattern="([^"]+)"/g)].map((match) => match[1]);
  assert.deepEqual(patterns, [validPattern, validPattern]);
  for (const pattern of patterns) {
    const compiled = new RegExp(`^(?:${pattern})$`, "v");
    assert.equal(compiled.test("123456"), true);
    assert.equal(compiled.test("123 456"), true);
    assert.equal(compiled.test("123-456"), true);
    assert.equal(compiled.test("12345a"), false);
  }
});

test("the Offers shortcut does not prefetch a document-backed route", () => {
  assert.match(dashboard, /prefetch=\{item\.href === "\/offers" \? false : undefined\}/);
});

test("every shared navigation Link disables document-backed RSC prefetching", () => {
  for (const source of [siteTopbar, siteFooter]) {
    const links = source.match(/<Link\b/g) ?? [];
    assert.ok(links.length > 0);
    assert.equal((source.match(/<Link\s+prefetch=\{false\}/g) ?? []).length, links.length);
  }
});
