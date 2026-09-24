import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const appData = readFileSync("src/lib/app-data.ts", "utf8");
const publicOffersRoute = readFileSync("src/app/api/offers/route.ts", "utf8");
const discoverRoute = readFileSync("src/app/api/discover/search/route.ts", "utf8");
const peoplePage = readFileSync("src/app/people/page.tsx", "utf8");
const feedCreate = readFileSync("public/moral-trade-live-feed-create.js", "utf8");
const participantGroup = readFileSync(
  "src/components/marketplace/participant-offer-group.tsx",
  "utf8",
);

test("marketplace search reads the complete open-offer directory before filtering", () => {
  assert.match(appData, /listAllOpenOfferRows/);
  assert.match(appData, /OPEN_OFFER_DIRECTORY_BATCH_SIZE = 500/);
  assert.match(appData, /refusing to return a truncated inventory/);
  assert.match(appData, /listOpenOffersDirectory/);
  assert.match(publicOffersRoute, /listOpenOffersDirectory\(liveMode\)/);
  assert.match(discoverRoute, /listOpenOffersDirectory\(liveMode\)/);
  assert.doesNotMatch(publicOffersRoute, /listOpenOffersPreview\(/);
  assert.doesNotMatch(discoverRoute, /listOpenOffersPreview\(/);
});

test("feed-derived counteroffer action is visibly a private non-sendable draft", () => {
  assert.match(feedCreate, /Draft privately from this offer/);
  assert.match(feedCreate, /Private draft only · not sendable or convertible into an agreement/);
  assert.doesNotMatch(feedCreate, /Create a trade from this/);
});

test("People directory no longer exposes general credit sorting or filters", () => {
  assert.match(peoplePage, /Find people by what they can offer and what they are open to/);
  assert.match(peoplePage, /does not rank people by a general credibility score/);
  assert.doesNotMatch(peoplePage, /name="credit"/);
  assert.doesNotMatch(peoplePage, /Highest credit/);
  assert.doesNotMatch(peoplePage, /Credit score/);
});

test("offer directory groups exact alternatives by participant and offered action", () => {
  assert.match(participantGroup, /groupOffersByUnderlyingAction/);
  assert.match(participantGroup, /requested-action alternative/);
  assert.match(participantGroup, /Exact published proposal/);
});
