import assert from "node:assert/strict";
import test from "node:test";

import { FOOTER_LINK_GROUPS, getPrimaryNavLinks } from "@/lib/site";
import { SITE_SEARCH_ITEMS } from "@/lib/site-search";

test("exposes Feed and Discover as the first marketplace navigation entries", () => {
  const primaryLinks = getPrimaryNavLinks(false);
  const [feedLink, discoverLink] = primaryLinks;

  assert.deepEqual(feedLink, {
    href: "/feed",
    label: "Feed",
  });
  assert.deepEqual(discoverLink, {
    href: "/discover",
    label: "Discover",
  });
  assert.ok(primaryLinks.some((link) => link.href === "/evidence" && link.label === "Evidence"));
});

test("links to Feed and Discover from the marketplace footer group", () => {
  const marketplaceGroup = FOOTER_LINK_GROUPS.find((group) => group.title === "Marketplace");

  assert.ok(marketplaceGroup);
  assert.ok(
    marketplaceGroup.links.some(
      (link) => link.href === "/feed" && link.label === "Personalized feed",
    ),
  );
  assert.ok(
    marketplaceGroup.links.some(
      (link) => link.href === "/discover" && link.label === "Discover opportunities",
    ),
  );
});

test("keeps the safeguards compatibility route out of primary navigation", () => {
  const safetyGroup = FOOTER_LINK_GROUPS.find(
    (group) => group.title === "Safety & transparency",
  );

  assert.ok(safetyGroup);
  assert.ok(
    safetyGroup.links.some(
      (link) =>
        link.href === "/trade-controls" && link.label === "Safeguards by workflow",
    ),
  );
  assert.ok(getPrimaryNavLinks(false).every((link) => link.href !== "/trade-controls"));
});

test("makes the contextual safeguard workflow map discoverable", () => {
  const safeguards = SITE_SEARCH_ITEMS.find((item) => item.href === "/trade-controls");

  assert.ok(safeguards);
  assert.equal(safeguards.label, "Safeguards by workflow");
  assert.match(safeguards.summary, /former Control simulator is retired/i);

  for (const keyword of [
    "counterfactual integrity",
    "multi-party trade circles",
    "trade circles unavailable",
    "pool governance",
    "threshold settlement",
    "verifier governance",
    "private values",
    "evidence integrations",
    "affected parties",
    "organizational authority",
  ]) {
    assert.ok(safeguards.keywords.includes(keyword), `missing search keyword: ${keyword}`);
  }
});
