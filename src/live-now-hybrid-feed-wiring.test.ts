import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const route = readFileSync("src/app/api/live-now/route.ts", "utf8");
const hybrid = readFileSync("src/lib/live-now-hybrid-feed.ts", "utf8");
const concepts = readFileSync("src/lib/live-now-hybrid-concepts.ts", "utf8");
const embeddings = readFileSync("src/lib/public-semantic-embeddings.ts", "utf8");
const migration = readFileSync(
  "supabase/migrations/20260723132050_public_semantic_embedding_cache.sql",
  "utf8",
);
const loader = readFileSync("public/moral-trade-live.html", "utf8");
const layout = readFileSync("src/app/layout.tsx", "utf8");
const diagnostics = readFileSync("public/moral-trade-live-feed-diagnostics.js", "utf8");

test("the live endpoint uses the hybrid feed and reserves route planning for direct matches", () => {
  assert.match(route, /buildHybridLiveNowFeed/);
  assert.match(route, /recommendations:\s*hybridFeed\.directRecommendations/);
  assert.match(route, /feedDiagnostics:\s*hybridFeed\.diagnostics/);
  assert.match(route, /matchingOpportunityCount:\s*hybridFeed\.diagnostics\.directCount/);
  assert.match(route, /status:\s*recommendations\.length \? "ready" : "no_matches"/);
});

test("the external embedding boundary contains only public opportunities and fixed concepts", () => {
  assert.match(concepts, /Fixed public concepts are the privacy boundary/);
  assert.match(concepts, /kind:\s*"canonical"/);
  assert.match(concepts, /kind:\s*"opportunity"/);
  assert.match(concepts, /publicOpportunityText/);
  assert.doesNotMatch(`${hybrid}\n${concepts}`, /profile\.goal|otherwiseBaseline|otherwise_baseline/);
  assert.match(embeddings, /privateTextSentToProvider:\s*false/);
  assert.match(embeddings, /\/v1\/embeddings/);
  assert.doesNotMatch(embeddings, /route_recommendation_profiles|wish_profiles|profile_syntheses/);
});

test("the public semantic cache is service-only and explicitly excludes private profile prose", () => {
  assert.match(migration, /public_semantic_embeddings/);
  assert.match(migration, /Never store private profile prose/i);
  assert.match(migration, /revoke all[\s\S]*from anon, authenticated/);
  assert.match(migration, /grant all[\s\S]*to service_role/);
});

test("matching diagnostics load on both the static shell and Next surfaces", () => {
  assert.match(loader, /moral-trade-live-feed-diagnostics\.css/);
  assert.match(loader, /moral-trade-live-feed-diagnostics\.js/);
  assert.match(layout, /moral-trade-live-feed-diagnostics\.css/);
  assert.match(layout, /moral-trade-live-feed-diagnostics\.js/);
  assert.match(diagnostics, /No direct match currently clears your criteria/);
  assert.match(diagnostics, /Private profile prose stays inside Moral Trade/);
});
