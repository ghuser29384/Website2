import assert from "node:assert/strict";
import test from "node:test";

import { FOOTER_LINK_GROUPS, getPrimaryNavLinks } from "@/lib/site";

test("exposes Discover as the primary marketplace navigation entry", () => {
  const [discoverLink] = getPrimaryNavLinks(false);

  assert.deepEqual(discoverLink, {
    href: "/discover",
    label: "Discover",
  });
});

test("links to Discover from the marketplace footer group", () => {
  const marketplaceGroup = FOOTER_LINK_GROUPS.find((group) => group.title === "Marketplace");

  assert.ok(marketplaceGroup);
  assert.ok(
    marketplaceGroup.links.some(
      (link) => link.href === "/discover" && link.label === "Discover opportunities",
    ),
  );
});
