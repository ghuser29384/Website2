import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const appData = readFileSync("src/lib/app-data.ts", "utf8");
const profilePage = readFileSync("src/app/people/[profileId]/page.tsx", "utf8");
const credibilityPage = readFileSync(
  "src/app/people/[profileId]/credibility/page.tsx",
  "utf8",
);
const credibilityApi = readFileSync(
  "src/app/api/credibility/profile/[profileId]/route.ts",
  "utf8",
);

test("credibility surfaces use the lightweight profile summary path", () => {
  assert.match(credibilityApi, /getPublicProfileSummary/);
  assert.doesNotMatch(credibilityApi, /getPublicProfilePageData/);
  assert.match(credibilityPage, /getPublicProfileSummary/);
  assert.doesNotMatch(credibilityPage, /getPublicProfilePageData/);
});

test("public profiles use bounded offer pages with truthful navigation", () => {
  assert.match(appData, /listPublicProfileOffersPage/);
  assert.match(appData, /\.range\(offset, offset \+ pageSize\)/);
  assert.match(appData, /offersPage: PaginatedResult<OfferRecord>/);
  assert.match(profilePage, /parsePublicProfileOfferPage/);
  assert.match(profilePage, /data\.offersPage\.hasNextPage/);
  assert.match(profilePage, /Showing \$\{/);
  assert.match(profilePage, /id="open-offers"/);
});

test("all offer hydration passes through bounded PostgREST chunks", () => {
  assert.match(appData, /chunkForPostgrestIn\(offers\)/);
  assert.match(appData, /hydrateOffersChunk\(offerChunk, viewerId\)/);
  assert.equal((appData.match(/async function hydrateOffersChunk/g) ?? []).length, 1);
});
