import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const home = readFileSync("src/components/home/home-page.tsx", "utf8");
const start = readFileSync("src/app/start/page.tsx", "utf8");
const howItWorks = readFileSync("src/app/how-it-works/page.tsx", "utf8");
const site = readFileSync("src/lib/site.ts", "utf8");
const visitorPaths = readFileSync("src/lib/visitor-paths.ts", "utf8");
const legacyPilot = readFileSync("src/app/pilot/page.tsx", "utf8");
const donate = readFileSync("src/app/donate/page.tsx", "utf8");
const donateButton = readFileSync(
  "src/components/donate/every-org-donate-button.tsx",
  "utf8",
);
const routeBaseline = readFileSync(
  "config/measurement/public-route-baseline.json",
  "utf8",
);

test("primary acquisition routes lead with real actions instead of pilot language", () => {
  const primaryCopy = [home, start, howItWorks].join("\n");

  assert.doesNotMatch(primaryCopy, /\bprototype\b/i);
  assert.doesNotMatch(primaryCopy, /founding-user pilot/i);
  assert.doesNotMatch(primaryCopy, /inspect (?:an|the|one) (?:complete )?(?:worked )?example/i);
  assert.match(site, /href: "\/start",\s*label: "Get started"/);
  assert.match(site, /href: "\/donate", label: "Fund"/);
  assert.match(home, /Financial route available/);
  assert.match(start, /Make a financial contribution/);
  assert.match(legacyPilot, /permanentRedirect\("\/start"\)/);
});

test("the financial action has a real external payment handoff and explicit boundaries", () => {
  assert.match(donate, /EveryOrgDonateButton/);
  assert.match(donate, /The payment happens off-site/);
  assert.match(donate, /Moral Trade does not hold donations, provide escrow/);
  assert.match(donateButton, /getEveryOrgDonationHref\(target\)/);
  assert.match(donateButton, /everyDotOrgDonateButton/);
  assert.match(home, /No Moral Trade custody or escrow/);
  assert.match(start, /No platform custody/);
});

test("worked examples remain available only as a secondary learning resource", () => {
  for (const [name, source] of [
    ["home", home],
    ["start", start],
    ["how-it-works", howItWorks],
    ["visitor paths", visitorPaths],
  ] as const) {
    assert.doesNotMatch(source, /\/worked-examples/, `${name} must not route users to examples`);
  }

  assert.match(site, /href: "\/worked-examples", label: "Worked examples"/);
  assert.doesNotMatch(routeBaseline, /"path": "\/worked-examples"/);
  assert.match(routeBaseline, /"path": "\/donate"/);
  assert.match(routeBaseline, /"path": "\/start"/);
});
