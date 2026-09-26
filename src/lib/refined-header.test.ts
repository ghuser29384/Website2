import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { getPrimaryNavLinks } from "@/lib/site";
import { HEADER_UTILITY_LINKS, REFINED_HEADER_LINKS, usesDefaultHeader } from "./refined-header";

test("the default masthead has four destinations and priorities belong to Profile", () => {
  assert.deepEqual(REFINED_HEADER_LINKS.map((link) => link.label), ["Home", "Trades", "Commitments", "Profile"]);
  assert.deepEqual(REFINED_HEADER_LINKS.map((link) => link.href), ["/feed", "/discover", "/commitments", "/profile"]);
  assert.ok(HEADER_UTILITY_LINKS.some((link) => link.href === "/messages"));
  assert.ok(HEADER_UTILITY_LINKS.some((link) => link.href === "/trades/new"));
  assert.ok(usesDefaultHeader(getPrimaryNavLinks(false)));
  assert.ok(usesDefaultHeader(getPrimaryNavLinks(true)));
  assert.equal(usesDefaultHeader([{ href: "/example", label: "Example" }]), false);
  assert.equal(usesDefaultHeader([...getPrimaryNavLinks(), { href: "/example", label: "Example" }]), false);
  const profile = readFileSync("src/components/profile/profile-priorities-card.tsx", "utf8");
  assert.match(profile, /Adjust priorities/);
  assert.match(profile, /\/profile\/priorities/);
});

test("all three header implementations share the approved styles", () => {
  for (const file of ["src/app/layout.tsx", "public/moral-trade-live.html", "public/moral-trade-discover.html"]) {
    assert.match(readFileSync(file, "utf8"), /moral-trade-refined-header\.css/);
  }
  const native = readFileSync("src/components/layout/site-topbar.tsx", "utf8");
  assert.match(native, /refinedHeader \? REFINED_HEADER_LINKS : links/);
  assert.match(native, /aria-current=\{isActive \? "page" : undefined\}/);
});
