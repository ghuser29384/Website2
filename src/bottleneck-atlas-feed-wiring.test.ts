import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

function read(relativePath: string) {
  return readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

test("the authenticated feed merges generated possibilities into existing inventory", () => {
  const route = read("src/app/api/live-now/route.ts");
  assert.match(route, /synthesizeBottleneckAtlasRecommendations/);
  assert.match(route, /mergeExistingAndSynthesizedRecommendations/);
  assert.match(route, /isOpportunitySynthesisEnabled/);
  assert.match(route, /suggestedOpportunityCount/);
  assert.match(route, /opportunitySynthesisDiagnostics/);
});

test("the feed distinguishes generated possibilities from live opportunity inventory", () => {
  const feed = read("public/moral-trade-live-now.js");
  const styles = read("public/moral-trade-live-feed.css");
  assert.match(feed, /metadata\.origin === "platform_generated"/);
  assert.match(feed, /Potential trade/);
  assert.match(feed, /Opportunities for you/);
  assert.match(feed, /model\.feedOpportunityCount/);
  assert.match(feed, /generated \$\{/);
  assert.match(feed, /possibilities/);
  assert.match(styles, /mt-feed-card--suggested/);
});

test("synthesized interactions resolve locally without querying generated IDs as UUID offers", () => {
  const feedback = read("src/app/api/live-now/feedback/route.ts");
  assert.match(feedback, /parseSynthesizedOpportunityId/);
  assert.match(feedback, /SYNTHESIZED_OPPORTUNITY_PREFIX/);
  assert.match(feedback, /SYNTHESIZED_CANDIDATE_EVENT_TYPES/);
  assert.match(feedback, /UUID_PATTERN\.test\(event\.opportunityId\)/);
  assert.match(feedback, /model_version: OPPORTUNITY_SYNTHESIS_VERSION/);
});

test("the public atlas and candidate detail routes preserve the hypothesis boundary", () => {
  const atlas = read("src/app/bottleneck-atlas/page.tsx");
  const detail = read("src/app/suggested-opportunities/\[templateId\]/page.tsx");
  const api = read("src/app/api/bottleneck-atlas/route.ts");

  assert.match(atlas, /Field evidence is a search prior, not a live claim/);
  assert.match(atlas, /No public organization-specific weakness profiles/);
  assert.match(detail, /This is not an offer and not yet a moral trade/);
  assert.match(detail, /No counterparty confirmed/);
  assert.match(api, /does not establish a current organization-specific bottleneck/);
});

test("the Bottleneck Atlas is linked from the public navigation system", () => {
  const site = read("src/lib/site.ts");
  assert.match(site, /href: "\/bottleneck-atlas", label: "Bottleneck Atlas"/);
});
