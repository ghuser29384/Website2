import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const home = readFileSync("src/components/home/home-page.tsx", "utf8");
const start = readFileSync("src/app/start/page.tsx", "utf8");
const offers = readFileSync("src/app/offers/page.tsx", "utf8");
const status = readFileSync("src/app/status/page.tsx", "utf8");
const cohort = readFileSync("src/app/cohort/page.tsx", "utf8");
const onboarding = readFileSync("src/app/onboarding/page.tsx", "utf8");
const notFound = readFileSync("src/app/not-found.tsx", "utf8");
const site = readFileSync("src/lib/site.ts", "utf8");
const visitorPaths = readFileSync("src/lib/visitor-paths.ts", "utf8");
const legacyPilot = readFileSync("src/app/pilot/page.tsx", "utf8");
const marketplaceProxy = readFileSync("src/proxy.ts", "utf8");
const donate = readFileSync("src/app/donate/page.tsx", "utf8");
const donateButton = readFileSync(
  "src/components/donate/every-org-donate-button.tsx",
  "utf8",
);
const routeBaseline = readFileSync(
  "config/measurement/public-route-baseline.json",
  "utf8",
);

const primaryAcquisitionCopy = [
  home,
  start,
  offers,
  status,
  cohort,
  onboarding,
  visitorPaths,
].join("\n");

test("primary acquisition routes lead with real actions instead of pilot language", () => {
  assert.doesNotMatch(primaryAcquisitionCopy, /\bprototype\b/i);
  assert.doesNotMatch(primaryAcquisitionCopy, /founding-user pilot/i);
  assert.doesNotMatch(
    primaryAcquisitionCopy,
    /inspect (?:an |the |one )?(?:complete )?(?:worked )?example/i,
  );
  assert.match(site, /href: "\/start",\s*label: "Get started"/);
  assert.match(site, /href: "\/feed", label: "Feed"/);
  assert.match(site, /href: "\/discover", label: "Discover"/);
  assert.match(site, /href: "\/trades\/new", label: "Create"/);
  assert.match(start, /Make a financial contribution/);
  assert.match(legacyPilot, /permanentRedirect\("\/start"\)/);
});

test("the start route streams its critical action shell before optional live state", () => {
  assert.match(start, /export default function StartPage\(\)/);
  assert.doesNotMatch(start, /export default async function StartPage/);
  assert.match(start, /createUnavailableMarketplaceOverview\(\)/);
  assert.ok(
    start.indexOf("<h1>Choose a real first action.</h1>") <
      start.indexOf("<StartServiceSnapshot />"),
  );
});

test("the financial action has a real external payment handoff and explicit boundaries", () => {
  assert.match(donate, /EveryOrgDonateButton/);
  assert.match(donate, /complete payment on Every\.org/);
  assert.match(donate, /Moral Trade does not hold funds or decide tax treatment/);
  assert.match(donate, /No Moral Trade custody/);
  assert.match(donateButton, /getEveryOrgDonationHref\(target\)/);
  assert.match(donateButton, /everyDotOrgDonateButton/);
  assert.match(start, /No platform custody/);
});

test("the returning homepage keeps the action-first screenshot contract", () => {
  assert.doesNotMatch(home, /A trade worth considering\./);
  assert.match(home, /href="\/offers\?view=templates"/);
  assert.match(home, /Offer a trade/);
  assert.match(home, /Offer this trade/);
  assert.match(home, /Verifiable financial contribution/);
  assert.match(home, /Proof method/);
});

test("examples remain available only as a secondary learning resource", () => {
  assert.doesNotMatch(primaryAcquisitionCopy, /\/worked-examples/);
  assert.doesNotMatch(notFound, /\/worked-examples|View examples/);
  assert.doesNotMatch(offers, /CANONICAL_WORKED_CASE_OFFERS|view=examples|Inspect example/);
  assert.match(notFound, /href="\/offers\?view=live"/);
  assert.match(notFound, /href="\/donate"/);
  assert.match(site, /href: "\/worked-examples", label: "Worked examples"/);
  assert.doesNotMatch(routeBaseline, /"path": "\/worked-examples"/);
  assert.doesNotMatch(routeBaseline, /"path": "\/trust"/);
  assert.match(routeBaseline, /"path": "\/donate"/);
  assert.match(routeBaseline, /"path": "\/start"/);
  assert.match(routeBaseline, /"path": "\/offers\?view=live"/);
});

test("the unscoped marketplace route defaults to live participant records", () => {
  assert.match(marketplaceProxy, /searchParams\.has\("view"\)/);
  assert.match(marketplaceProxy, /searchParams\.set\("view", "live"\)/);
  assert.match(marketplaceProxy, /NextResponse\.redirect\(liveDirectoryUrl\)/);
});
