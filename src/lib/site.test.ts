import assert from "node:assert/strict";
import test from "node:test";

import { FOOTER_LINK_GROUPS, getPrimaryNavLinks } from "@/lib/site";
import { HEADER_UTILITY_LINKS } from "@/lib/refined-header";
import { SITE_SEARCH_ITEMS } from "@/lib/site-search";

test("exposes Feed and Discover as the first marketplace navigation entries", () => {
  const primaryLinks = getPrimaryNavLinks(false);
  const [feedLink, discoverLink] = primaryLinks;

  assert.deepEqual(feedLink, {
    href: "/feed",
    label: "Home",
  });

  assert.deepEqual(discoverLink, {
    href: "/discover",
    label: "Trades",
  });
  assert.ok(primaryLinks.every((link) => link.href !== "/evidence"));
  assert.ok(HEADER_UTILITY_LINKS.some((link) => link.href === "/evidence" && link.label === "Evidence"));
});

test("links to Feed and Discover from the marketplace footer group", () => {
  const marketplaceGroup = FOOTER_LINK_GROUPS.find((group) => group.title === "Explore");

  assert.ok(marketplaceGroup);
  assert.ok(
    marketplaceGroup.links.some(
      (link) => link.href === "/feed" && link.label === "Home",
    ),
  );
  assert.ok(
    marketplaceGroup.links.some(
      (link) => link.href === "/discover" && link.label === "Trades",
    ),
  );
});

test("Trade controls stays out of shared navigation while its directory entry remains", () => {
  assert.ok(FOOTER_LINK_GROUPS.every((group) => group.links.every((link) => link.href !== "/trade-controls")));
  assert.ok(getPrimaryNavLinks(false).every((link) => link.href !== "/trade-controls"));
  assert.ok(SITE_SEARCH_ITEMS.some((item) => item.href === "/trade-controls"));
});

test("makes all ten coordination and safety controls discoverable in site search", () => {
  const tradeControls = SITE_SEARCH_ITEMS.find((item) => item.href === "/trade-controls");

  assert.ok(tradeControls);
  assert.equal(tradeControls.label, "Safeguard demonstrations");

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
