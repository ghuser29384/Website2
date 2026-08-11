import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");

function pageFiles(directory: string): string[] {
  const output: string[] = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) output.push(...pageFiles(path));
    if (entry.isFile() && entry.name === "page.tsx") output.push(path);
  }
  return output;
}

function isCoveredPage(source: string) {
  return [
    /className=["'][^"']*page-shell/,
    /<HomePage\b/,
    /<AuthPage\b/,
    /permanentRedirect\(/,
    /\bredirect\(/,
    /export \{ default.*from /,
    /<MpgfPageFrame\b/,
    /<CreateInterfaceFrame\b/,
    /<TradeControlsWorkspace\b/,
    /<ThresholdRadar\b/,
    /<ImmersiveWalkthrough\b/,
    /<WalkthroughPage\b/,
    /\.module\.css/,
    /moral-public-goods-labs\.module\.css/,
    /complete-profile\/page\.module\.css/,
    /connectors\.module\.css/,
    /commitments\.module\.css/,
    /pledge-swaps\.module\.css/,
    /redirects\/\[receiptId\]\/page\.module\.css/,
  ].some((pattern) => pattern.test(source));
}

test("the canonical Home tokens drive every shared Next.js route", () => {
  const layout = read("src/app/layout.tsx");
  const canonical = read("src/app/canonical-visual-system.css");
  const remediation = read("src/app/canonical-visual-system-remediation.css");
  const home = read("src/components/home/returning-home.module.css");
  const homePage = read("src/components/home/home-page.tsx");

  assert.match(layout, /import "\.\/canonical-visual-system\.css";/);
  assert.match(layout, /import "\.\/canonical-visual-system-remediation\.css";/);
  assert.ok(
    layout.indexOf('import "./canonical-visual-system.css";') >
      layout.indexOf('import "./search-bar-polish.css";'),
    "The canonical stylesheet must follow all legacy shared styles.",
  );
  assert.ok(
    layout.indexOf('import "./canonical-visual-system-remediation.css";') >
      layout.indexOf('import "./canonical-visual-system.css";'),
    "The rendered-audit remediation must be the final shared stylesheet.",
  );

  for (const token of [
    ["paper", "#f5f2e9"],
    ["black", "#050505"],
    ["ink", "#111111"],
    ["blue", "#2450ff"],
    ["orange", "#e66c17"],
  ] as const) {
    assert.match(canonical, new RegExp(`--mt-${token[0]}:\\s*${token[1]}`, "i"));
  }

  assert.match(home, /--paper:\s*#f3eee9|--paper:\s*#f5f2e9/);
  assert.match(home, /--black:\s*#030303|--black:\s*#050505/);
  assert.match(home, /--blue:\s*#2450ff/);
  assert.match(canonical, /\.mt-site-topbar\s*\{[\s\S]*background:\s*var\(--mt-black\)/);
  assert.match(canonical, /\.hero\s*>\s*\.hero-grid\s+\.hero-copy\s*\{[\s\S]*background:\s*var\(--mt-black\)/);
  assert.match(canonical, /\.mt-site-footer\s*\{[\s\S]*background:\s*var\(--mt-black\)/);
  assert.match(canonical, /background-image:[\s\S]*linear-gradient\(rgba\(17, 17, 17, 0\.035\)/);
  assert.match(canonical, /border-radius:\s*0\s*!important/);
  assert.equal(canonical.includes('[class*="card" i]'), false);
  assert.equal(canonical.includes('[class*="receipt" i]'), false);
  assert.match(homePage, /data-mt-canonical-home="true"/);
  assert.match(canonical, /body:not\(:has\(\[data-mt-canonical-home="true"\]\)\):not\(:has\(\.mtw-shell\)\)/);
  assert.match(remediation, /\.mt-v75-side-link\.is-active[\s\S]*background:\s*var\(--mt-black\)/);
  assert.match(remediation, /\.mt-v75-side-plan[\s\S]*border-radius:\s*0\s*!important/);
  assert.match(remediation, /\.commitments-center[\s\S]*border-radius:\s*0\s*!important/);
  assert.match(remediation, /\.dashboard-page[\s\S]*box-shadow:\s*none\s*!important/);
});

test("every Next.js page declares a shared or explicitly aligned visual shell", () => {
  const pagesRoot = join(root, "src/app");
  const uncovered = pageFiles(pagesRoot)
    .filter((path) => !isCoveredPage(readFileSync(path, "utf8")))
    .map((path) => relative(root, path));

  assert.deepEqual(uncovered, []);
});

test("custom module-driven pages expose stable canonical visual hooks", () => {
  const hooks = [
    ["src/components/auth/auth-card.tsx", "auth"],
    ["src/app/connectors/page.tsx", "connectors"],
    ["src/app/pledge-swaps/page.tsx", "pledge-swaps"],
    ["src/app/complete-profile/page.tsx", "complete-profile"],
    ["src/app/redirects/[receiptId]/page.tsx", "public-receipt"],
    ["src/app/labs/moral-public-goods/[poolSlug]/page.tsx", "mpgf-labs"],
  ] as const;

  const canonical = read("src/app/canonical-visual-system.css");
  for (const [path, value] of hooks) {
    assert.ok(read(path).includes(`data-mt-surface="${value}"`));
    assert.ok(canonical.includes(`[data-mt-surface="${value}"]`));
  }
});

test("the rendered gate rejects blank and overlay-only route captures", () => {
  const rendered = read("tests/sitewide-canonical-visual-system.spec.ts");

  assert.match(rendered, /waitForMeaningfulSurface/);
  assert.match(rendered, /#commitments-heading/);
  assert.match(rendered, /Application error: a client-side exception has occurred/);
  assert.equal(rendered.includes('page.locator("nextjs-portal")).toHaveCount(0)'), false);
  assert.equal(rendered.includes("#account-heading"), false);
  assert.match(rendered, /mt-v75-side-link\[aria-current="page"\]/);
  assert.match(rendered, /Dashboard guest route redirects to a substantive canonical auth surface/);
  assert.match(rendered, /returnTo=%2Fdashboard/);
  assert.match(rendered, /data-mt-surface="auth"/);
});

test("every standalone HTML shell is canonical or explicitly enhanced", () => {
  const publicRoot = join(root, "public");
  const htmlFiles = [
    "complete-verification.html",
    "moral-trade-create/index.html",
    "moral-trade-discover.html",
    "moral-trade-interactive-walkthroughs.html",
    "moral-trade-live.html",
    "moral-trade-production.html",
  ];

  for (const path of htmlFiles) {
    assert.ok(existsSync(join(publicRoot, path)), `${path} must remain present`);
  }

  assert.match(read("public/moral-trade-live.html"), /moral-trade-live-navigation\.js/);
  assert.match(read("public/moral-trade-discover.html"), /moral-trade-discover-navigation\.js/);
  assert.match(read("public/moral-trade-production.html"), /moral-trade-interactive-walkthroughs\.html|Interactive Walkthrough/);
});

test("standalone Create and verification shells load the same canonical stylesheet", () => {
  const create = read("public/moral-trade-create/index.html");
  const verification = read("public/complete-verification.html");
  const staticStyles = read("public/moral-trade-canonical-static.css");

  assert.match(create, /moral-trade-canonical-static\.css\?v=20260810/);
  assert.match(verification, /moral-trade-canonical-static\.css\?v=20260810/);
  assert.match(staticStyles, /\.topbar\s*\{[\s\S]*background:\s*#050505/);
  assert.match(staticStyles, /\.mt-verify-appbar\s*\{[\s\S]*background:\s*#050505/);
  assert.match(staticStyles, /\.intro\s*\{[\s\S]*background:\s*#050505/);
  assert.match(staticStyles, /\.mt-verify-hero\s*>\s*div:first-child[\s\S]*background:\s*#050505/);
  assert.ok(existsSync(join(root, "public/moral-trade-canonical-static.css")));
});
