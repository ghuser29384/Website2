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
const siteTopbar = readFileSync("src/components/layout/site-topbar.tsx", "utf8");
const siteFooter = readFileSync("src/components/layout/site-footer.tsx", "utf8");
const marketplaceComponents = readFileSync(
  "src/components/marketplace/marketplace-components.tsx",
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
  assert.match(accountSecurityPanel, />\s*Account security\s*</);
  assert.match(accountSecurityPanel, />\s*Create MFA setup\s*</);
  assert.match(accountSecurityPanel, /alt="Authenticator app setup QR code"/);
  assert.match(accountSecurityPanel, />\s*Verify MFA setup\s*</);
  assert.match(accountSecurityPanel, /autoComplete="one-time-code"/);
});

test("an optional priority summary cannot block the Account security surface", () => {
  assert.ok(
    dashboard.includes(
      [
        "  const priorityFundSummary =",
        "    viewer && supabaseReady && process.env.SUPABASE_SERVICE_ROLE_KEY",
        "      ? await getPriorityCorrectionSummary(viewer.authUser.id)",
        "      : null;",
      ].join("\n"),
    ),
  );
});

test("authenticator code inputs use a browser-valid pattern", () => {
  const validPattern = String.raw`[0-9 \-]{6,8}`;
  const patterns = [...accountSecurityPanel.matchAll(/pattern="([^"]+)"/g)].map(
    (match) => match[1],
  );

  assert.deepEqual(patterns, [validPattern, validPattern]);

  for (const pattern of patterns) {
    const compiled = new RegExp(`^(?:${pattern})$`, "v");
    assert.equal(compiled.test("123456"), true);
    assert.equal(compiled.test("123 456"), true);
    assert.equal(compiled.test("123-456"), true);
    assert.equal(compiled.test("12345a"), false);
  }
});

test("the stale Offers shortcut cannot prefetch a missing route", () => {
  assert.ok(
    dashboard.includes(
      [
        "              <Link",
        '                className="v72-shortcut-tile"',
        "                href={item.href}",
        "                key={item.label}",
        '                prefetch={item.href === "/offers" ? false : undefined}',
        "              >",
      ].join("\n"),
    ),
  );
});

test("shared navigation cannot prefetch document-backed routes as missing RSC pages", () => {
  const topbarLinks = siteTopbar.match(/<Link\b/g) ?? [];
  const footerLinks = siteFooter.match(/<Link\b/g) ?? [];

  assert.equal(topbarLinks.length, 4);
  assert.equal(footerLinks.length, 6);
  assert.equal(
    (siteTopbar.match(/<Link prefetch=\{false\}/g) ?? []).length,
    topbarLinks.length,
  );
  assert.equal(
    (siteFooter.match(/<Link prefetch=\{false\}/g) ?? []).length,
    footerLinks.length,
  );
});

test("shared Dashboard bottom navigation cannot prefetch the Offers compatibility redirect", () => {
  const bottomNavStart = marketplaceComponents.indexOf("export function MarketplaceBottomNav({");
  assert.ok(bottomNavStart >= 0);
  const bottomNav = marketplaceComponents.slice(bottomNavStart);
  assert.ok(
    bottomNav.includes(
      [
        "          href={item.href}",
        '          prefetch={item.href === "/offers" ? false : undefined}',
        "          key={item.key}",
      ].join("\n"),
    ),
  );
});
