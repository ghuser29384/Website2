import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();

function readRepoFile(path: string) {
  return readFileSync(join(root, path), "utf8");
}

const pageSource = readRepoFile("src/app/trade-controls/page.tsx");
const componentSource = readRepoFile(
  "src/components/trade-controls/trade-controls-workspace.tsx",
);
const styleSource = readRepoFile(
  "src/components/trade-controls/trade-controls-workspace.module.css",
);

test("Trade controls exposes all ten selected interactive mechanisms", () => {
  for (const label of [
    "Counterfactual Integrity Check",
    "Multi-party Trade Circles",
    "Resolution Center",
    "Pool Governance",
    "Threshold Settlement and Revalidation",
    "Verifier Governance",
    "Private Values Profile",
    "Evidence Integrations",
    "Affected-party Safeguards",
    "Team Authority",
  ]) {
    assert.match(componentSource, new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }

  assert.match(componentSource, /No durable state, payment, commitment/);
  assert.match(componentSource, /A preview never authorizes reliance/);
  assert.match(componentSource, /Interactive workspace preview/);
});

test("Trade controls hands preview decisions to existing live workflows", () => {
  for (const route of [
    "/trades/new",
    "/create",
    "/commitments",
    "/mpgf/governance",
    "/pools/radar",
    "/validation",
    "/complete-profile",
    "/background-networking",
    "/safety",
    "/team-and-governance",
  ]) {
    assert.match(componentSource, new RegExp(route.replaceAll("/", "\\/")));
  }

  assert.match(componentSource, /Review the actual record and permissions/);
});

test("Trade controls is noindex, contract-backed, responsive, and discoverable", () => {
  assert.match(pageSource, /canonical: "\/trade-controls"/);
  assert.match(pageSource, /robots:\s*\{/);
  assert.match(pageSource, /index: false/);
  assert.match(pageSource, /getProtocolSummaries/);
  assert.match(pageSource, /validateMoralTradeBaselineIntegrityContract/);
  assert.match(pageSource, /validateMoralTradeAuthorityObligationContract/);
  assert.match(styleSource, /@media \(max-width: 820px\)/);
  assert.match(styleSource, /background-image: url\("\/assets\/threshold-radar\/paper-grid\.png"\)/);

  const siteSource = readRepoFile("src/lib/site.ts");
  const searchSource = readRepoFile("src/lib/site-search.ts");
  const liveNavigationSource = readRepoFile("public/moral-trade-live-navigation.js");
  assert.match(siteSource, /href: "\/trade-controls", label: "Trade controls"/);
  assert.match(searchSource, /href: "\/trade-controls"/);
  assert.match(liveNavigationSource, /window\.location\.assign\("\/trade-controls"\)/);
});
