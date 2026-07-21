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

test("links to Trade controls without adding another primary navigation item", () => {
  const safetyGroup = FOOTER_LINK_GROUPS.find(
    (group) => group.title === "Safety & transparency",
  );

  assert.ok(safetyGroup);
  assert.ok(
    safetyGroup.links.some(
      (link) => link.href === "/trade-controls" && link.label === "Trade controls",
    ),
  );
  assert.ok(getPrimaryNavLinks(false).every((link) => link.href !== "/trade-controls"));
});

test("makes all ten coordination and safety controls discoverable in site search", () => {
  const tradeControls = SITE_SEARCH_ITEMS.find((item) => item.href === "/trade-controls");

  assert.ok(tradeControls);
  assert.equal(tradeControls.label, "Trade controls");

  for (const keyword of [
    "counterfactual integrity",
    "multi-party trade circles",
    "resolution center",
    "pool governance",
    "threshold failure",
    "verifier governance",
    "private values",
    "integration evidence hub",
    "affected parties",
    "organizational authority",
  ]) {
    assert.ok(tradeControls.keywords.includes(keyword), `missing search keyword: ${keyword}`);
  }
});
