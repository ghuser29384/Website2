import assert from "node:assert/strict";
import test from "node:test";
import { getDiscoverBrowseHref } from "./offer-browse-route";

test("ordinary legacy links preserve query, page and sorting in Discover", () => {
  const href = getDiscoverBrowseHref(new URLSearchParams("view=live&search=animal%20welfare&page=2&sort=lowest_cost"));
  const url = new URL(href!, "https://moraltrade.org");
  assert.equal(url.pathname, "/discover");
  assert.equal(url.searchParams.get("q"), "animal welfare");
  assert.equal(url.searchParams.get("sort"), "lowest-cost");
  assert.equal(url.searchParams.get("page"), "2");
});

test("unsupported constraints are not silently dropped or relaxed", () => {
  for (const query of ["mode=pledge", "cause=animal&view=live", "sort=highest_credit", "view=templates", "view=examples", "render=server"]) {
    assert.equal(getDiscoverBrowseHref(new URLSearchParams(query)), null, query);
  }
});
