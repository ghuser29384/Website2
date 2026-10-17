import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

function read(relativePath: string) {
  return readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

test("the authenticated feed uses current inventory without Atlas template injection", () => {
  const route = read("src/app/api/live-now/route.ts");
  assert.doesNotMatch(route, /opportunity-synthesis|synthesizeBottleneckAtlasRecommendations|mergeExistingAndSynthesizedRecommendations/);
  assert.match(route, /suggestedOpportunityCount: 0/);
  assert.match(route, /opportunitySynthesisDiagnostics: null/);
});

test("the feed rejects legacy generated possibilities instead of rendering them", () => {
  const feed = read("public/moral-trade-live-now.js");
  assert.match(feed, /metadata\.origin === "platform_generated"/);
  assert.match(feed, /id\.startsWith\("synth:"\)/);
  assert.doesNotMatch(feed, /Potential trade/);
  assert.match(feed, /Opportunities for you/);
  assert.match(feed, /model\.feedOpportunityCount/);
  assert.doesNotMatch(feed, /generated \$\{/);
});

test("synthesized interactions resolve locally without querying generated IDs as UUID offers", () => {
  const feedback = read("src/app/api/live-now/feedback/route.ts");
  assert.match(feedback, /parseSynthesizedOpportunityId/);
  assert.match(feedback, /SYNTHESIZED_OPPORTUNITY_PREFIX/);
  assert.match(feedback, /SYNTHESIZED_CANDIDATE_EVENT_TYPES/);
  assert.match(feedback, /UUID_PATTERN\.test\(event\.opportunityId\)/);
  assert.match(feedback, /model_version: OPPORTUNITY_SYNTHESIS_VERSION/);
});

test("atlas suggestions hand off to a private, role-specific, fail-closed draft", () => {
  const detail = read("src/app/suggested-opportunities/[templateId]/page.tsx");
  const create = read("src/app/trades/new/page.tsx");
  assert.match(detail, /role", "first_party"/);
  assert.match(detail, /role", "counterparty"/);
  assert.match(detail, /not an offer or introduction/);
  assert.match(create, /buildSynthesizedTradeDraftPrefill/);
  assert.match(create, /A Bottleneck Atlas hypothesis cannot be combined/);
  assert.match(create, /Bottleneck Atlas hypothesis/);
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
