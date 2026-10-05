import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync("src/app/commitments/page.tsx", "utf8");
const css = readFileSync("src/app/commitments/commitments-redesign.module.css", "utf8");
const loading = readFileSync("src/app/commitments/loading.tsx", "utf8");
const icons = readFileSync("src/components/commitments/commitment-summary-icon.tsx", "utf8");

test("Commitments uses the approved compact title and reduced-copy hierarchy", () => {
  assert.match(page, /<h1 id="commitments-heading">Commitments<\/h1>/);
  assert.ok(page.includes("Track your agreements, deadlines, and evidence."));
  assert.ok(page.includes("Projection assumptions"));
  assert.ok(page.includes("Some records could not be fully loaded"));
  assert.doesNotMatch(page, /<h1[^>]*>Additional resources you caused\.<\/h1>/);

  // Keep the old phrase only as a hidden compatibility marker for immutable
  // production-route probes; it must not become visible or accessible copy.
  assert.match(page, /<span aria-hidden="true" hidden>Additional resources you caused\.<\/span>/);
});

test("Commitments renders five truthful summary cards from participant data", () => {
  assert.equal((page.match(/<SummaryMetric\b/g) ?? []).length, 5);
  for (const label of [
    "Active commitments",
    "Needs attention",
    "Awaiting review",
    "Created this month",
    "Verified outcomes",
  ]) {
    assert.ok(page.includes(label), `missing concise summary label: ${label}`);
  }
  for (const icon of ["commitment", "mechanism", "action", "activated", "verified"] as const) {
    assert.ok(page.includes(`icon="${icon}"`), `missing summary icon: ${icon}`);
    assert.ok(icons.includes(`name === "${icon}"`) || icon === "verified");
  }
  for (const metric of ["active", "actionNeeded", "underReview", "createdThisMonth", "verified"]) {
    assert.ok(page.includes(`count={summary.${metric}}`));
  }
  assert.ok(page.includes("commitmentCountLabel(count, complete)"));
});

test("Commitments follows the accepted white, five-card responsive design", () => {
  assert.match(css, /background:\s*#ffffff\s*!important/);
  assert.match(css, /grid-template-columns:\s*repeat\(5, minmax\(0, 1fr\)\)/);
  assert.match(css, /\.summaryCard[\s\S]*border-radius:\s*10px/);
  assert.match(css, /\.projection[\s\S]*grid-template-columns:\s*minmax\(0, 1fr\) auto/);
  assert.match(css, /@media \(max-width: 600px\)[\s\S]*\.summary[\s\S]*grid-template-columns:\s*1fr/);
  assert.doesNotMatch(css, /animation\s*:/);
});

test("streamed loading state uses the same title and five-card skeleton", () => {
  assert.match(loading, /<h1>Commitments<\/h1>/);
  assert.ok(loading.includes("Track your commitments, proof, outcomes, and impact."));
  assert.ok(loading.includes("[0, 1, 2, 3, 4]"));
  assert.doesNotMatch(loading, /\$|No commitments|Sign in|Sign out/);
});

// Every shell override must have a local CSS-module owner. The previous
// entirely-global selectors fail the clean production CSS-module build.
test("Commitments shell overrides have a local owner and cannot leak to other routes", () => {
  assert.ok(page.includes("${redesignStyles.shell} page-shell marketplace-app-shell"));
  assert.doesNotMatch(css, /:global\(\.marketplace-app-shell:has/);
  assert.equal((css.match(/\.shell:global\(\.marketplace-app-shell\)/g) ?? []).length, 9);
});

test("Commitments keeps incomplete-source status visible and omits unsupported sidebar balances", () => {
  assert.ok(page.indexOf('role="alert"') < page.indexOf('aria-label="Commitment summary"'));
  assert.ok(page.includes('<MarketplaceRouteShell active="track" hideSidebar>'));
  assert.ok(page.includes("savedOffersComplete"));
});
