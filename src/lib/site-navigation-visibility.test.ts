import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  getVisibleSiteNavLinks,
  isSiteNavigationHrefVisible,
} from "./site-navigation-visibility";

test("the Evidence index remains unpublished, including query and trailing-slash variants", () => {
  for (const href of ["/evidence", "/evidence/", "/evidence?page=2", "/evidence/#outcomes"]) {
    assert.equal(isSiteNavigationHrefVisible(href), false, href);
  }
});

test("trade-specific evidence and all other menu routes remain available", () => {
  for (const href of ["/feed", "/discover", "/trades/new", "/commitments", "/walkthrough", "/safety", "/evidence/agreement-id", "/trades/agreement-id/manage", undefined]) {
    assert.equal(isSiteNavigationHrefVisible(href), true, String(href));
  }
});

test("the visible primary menu preserves ordering without the Evidence entry", () => {
  const links = [
    { href: "/feed", label: "Feed" },
    { href: "/discover", label: "Discover" },
    { href: "/trades/new", label: "Trade" },
    { href: "/commitments", label: "Commitments" },
    { href: "/evidence", label: "Evidence" },
    { href: "/walkthrough", label: "Tour" },
  ];
  assert.deepEqual(getVisibleSiteNavLinks(links).map((link) => link.label), ["Feed", "Discover", "Trade", "Commitments", "Tour"]);
  assert.equal(links.length, 6, "the canonical registry must not be mutated");
});

test("nested Help and More links obey the same hold without deleting other items", () => {
  const help = {
    label: "Help",
    items: [
      { href: "/evidence", label: "Public evidence", section: "Trust" },
      { href: "/safety", label: "Safety", section: "Trust" },
    ],
  };
  const result = getVisibleSiteNavLinks([help]);
  assert.deepEqual(result[0].items, [{ href: "/safety", label: "Safety", section: "Trust" }]);
  assert.equal(help.items.length, 2, "do not mutate caller-owned submenu data");
  assert.deepEqual(getVisibleSiteNavLinks([{ label: "More", items: [help.items[0]] }]), []);
});

test("a parent route survives when its only submenu item was Evidence", () => {
  assert.deepEqual(getVisibleSiteNavLinks([{
    href: "/support",
    label: "Help",
    items: [{ href: "/evidence", label: "Evidence" }],
  }]), [{ href: "/support", label: "Help", items: [] }]);
});

test("both React menu renderers apply the visibility policy before rendering links", () => {
  const topbar = readFileSync("src/components/layout/site-topbar.tsx", "utf8");
  const footer = readFileSync("src/components/layout/site-footer.tsx", "utf8");
  assert.match(topbar, /getVisibleSiteNavLinks\(links\)\.map/);
  assert.match(footer, /group\.links\.filter\(\(link\) => isSiteNavigationHrefVisible\(link\.href\)\)\.map/);
});
