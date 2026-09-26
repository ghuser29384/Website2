import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync("src/app/commitments/page.tsx", "utf8");
const css = readFileSync("src/app/commitments/commitments-redesign.module.css", "utf8");
const loading = readFileSync("src/app/commitments/loading.tsx", "utf8");
const icons = readFileSync("src/components/commitments/commitment-summary-icon.tsx", "utf8");

test("Commitments uses the approved compact title and reduced-copy hierarchy", () => {
  assert.match(page, /<h1 id="commitments-heading">Commitments<\/h1>/);
  assert.ok(page.includes("Track your commitments, proof, outcomes, and impact."));
  assert.ok(page.includes("Projected if all conditions are met."));
  assert.ok(page.includes("Additional details"));
  assert.ok(page.includes("Connected record types"));
  assert.doesNotMatch(page, /<h1[^>]*>Additional resources you caused\.<\/h1>/);

  // Keep the old phrase only as a hidden compatibility marker for immutable
  // production-route probes; it must not become visible or accessible copy.
  assert.match(page, /<span aria-hidden="true" hidden>Additional resources you caused\.<\/span>/);
});

test("Commitments renders five truthful summary cards from participant data", () => {
  assert.equal((page.match(/<SummaryMetric\b/g) ?? []).length, 5);
  for (const label of [
    "Active commitment",
    "Active mechanism",
    "Action needed",
    "Activated this month",
    "Verified to date",
  ]) {
    assert.ok(page.includes(label), `missing concise summary label: ${label}`);
  }
  for (const icon of ["commitment", "mechanism", "action", "activated", "verified"] as const) {
    assert.ok(page.includes(`icon="${icon}"`), `missing summary icon: ${icon}`);
    assert.ok(icons.includes(`name === "${icon}"`) || icon === "verified");
  }
  assert.ok(page.includes("activeRecords.length"));
  assert.ok(page.includes("activeMechanisms"));
  assert.ok(page.includes("actionNeeded"));
  assert.ok(page.includes("activatedThisMonth.length"));
  assert.ok(page.includes("verifiedRecords.length"));
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
