import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();

function readRepoFile(path: string) {
  return readFileSync(join(root, path), "utf8");
}

const compatibilityPage = readRepoFile("src/app/trade-controls/page.tsx");
const safeguardsLogic = readRepoFile("src/lib/trade-safeguards.ts");
const safeguardsPanel = readRepoFile(
  "src/components/core-trade/trade-safeguards-panel.tsx",
);
const agreementStage = readRepoFile(
  "src/components/core-trade/trade-agreement-stage.tsx",
);
const teamPage = readRepoFile("src/app/team/page.tsx");
const siteSource = readRepoFile("src/lib/site.ts");
const searchSource = readRepoFile("src/lib/site-search.ts");
const liveNavigationSource = readRepoFile(
  "public/moral-trade-live-navigation.js",
);

test("the former Control route is a noindex workflow guide, not an authorization simulator", () => {
  assert.match(compatibilityPage, /title: "Safeguards by workflow"/);
  assert.match(compatibilityPage, /canonical: "\/trade-controls"/);
  assert.match(compatibilityPage, /robots:\s*\{/);
  assert.match(compatibilityPage, /index: false/);
  assert.match(compatibilityPage, /former Control simulator has been retired/i);
  assert.match(compatibilityPage, /No detached authorization/i);
  assert.match(compatibilityPage, /Use persisted context/i);
  assert.doesNotMatch(compatibilityPage, /TradeControlsWorkspace/);
  assert.doesNotMatch(compatibilityPage, /getProtocolSummaries/);
  assert.doesNotMatch(compatibilityPage, /Interactive workspace preview/);
});

test("the compatibility route maps safeguards to their operational workflows", () => {
  for (const route of [
    "/trades/new",
    "/commitments",
    "/evidence",
    "/validation",
    "/mpgf/governance",
    "/pools/radar",
    "/complete-profile",
    "/privacy",
    "/safety",
    "/team-and-governance#organizational-authority",
  ]) {
    assert.match(
      compatibilityPage,
      new RegExp(route.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
    );
  }

  assert.match(compatibilityPage, /Trade Circles/);
  assert.match(compatibilityPage, /does not currently offer durable multi-party Trade Circles/i);
  assert.match(compatibilityPage, /It will not[\s\S]*appear in Create unless/i);
  assert.doesNotMatch(compatibilityPage, /Run preview/);
  assert.doesNotMatch(compatibilityPage, /A complete circle is available/);
});

test("every bilateral agreement renders safeguards from persisted agreement state", () => {
  assert.match(agreementStage, /buildTradeSafeguardItems/);
  assert.match(agreementStage, /TradeSafeguardsPanel/);
  assert.match(agreementStage, /acceptedEvidenceCount: props\.acceptedEvidenceCount/);
  assert.match(agreementStage, /confirmationCount: props\.confirmationCount/);
  assert.match(agreementStage, /lifecycleStatus: props\.lifecycleStatus/);
  assert.match(agreementStage, /noTradeBaseline: props\.version\.noTradeBaseline/);

  for (const id of [
    "baseline",
    "consent",
    "evidence",
    "review",
    "affected_parties",
    "authority",
    "custody",
    "settlement",
  ]) {
    assert.match(safeguardsLogic, new RegExp(`id: "${id}"`));
  }

  assert.match(safeguardsPanel, /not a safety certificate/);
  assert.match(safeguardsLogic, /no persisted affected-party sign-off/i);
  assert.match(safeguardsLogic, /does not grant authority to bind an organization/i);
  assert.match(safeguardsLogic, /does not hold funds or create a financial reservation/i);
});

test("navigation removes Control while preserving the compatibility link outside primary navigation", () => {
  assert.match(siteSource, /href: "\/trade-controls", label: "Safeguards by workflow"/);
  assert.match(searchSource, /label: "Safeguards by workflow"/);
  assert.match(searchSource, /former Control simulator is retired/);
  assert.match(liveNavigationSource, /function removeLegacyControls/);
  assert.doesNotMatch(liveNavigationSource, /function openControls/);
  assert.doesNotMatch(liveNavigationSource, /createControlsControl/);
  assert.doesNotMatch(liveNavigationSource, /location\.assign\("\/trade-controls"\)/);
});

test("team governance states the current individual-only authority boundary", () => {
  assert.match(teamPage, /id="organizational-authority"/);
  assert.match(teamPage, /current agreement flow does not confer organizational authority/i);
  assert.match(teamPage, /Individual-only/);
  assert.match(teamPage, /Fail closed/);
  assert.match(teamPage, /distinct-person approval/i);
});
