import assert from "node:assert/strict";
import test from "node:test";
import { discoverOffersAvailability, discoverPageNumber, discoverResultPage } from "@/lib/discover-live-directory";

test("all-trades availability requires every requested source, including empty ones", () => {
  assert.equal(discoverOffersAvailability("live", "live", "all"), "live");
  assert.equal(discoverOffersAvailability("live", "unavailable", "all"), "partial");
  assert.equal(discoverOffersAvailability("unavailable", "live", "all"), "partial");
  assert.equal(discoverOffersAvailability("unavailable", "unavailable", "all"), "unavailable");
});

test("a type filter does not require the unrelated directory to be available", () => {
  assert.equal(discoverOffersAvailability("live", "not_requested", "individual"), "live");
  assert.equal(discoverOffersAvailability("not_requested", "live", "co-fund"), "live");
  assert.equal(discoverOffersAvailability("live", "unavailable", "co-fund"), "unavailable");
  assert.equal(discoverOffersAvailability("unavailable", "live", "individual"), "unavailable");
});

test("pagination is bounded, complete and does not mutate the inventory", () => {
  const items = Object.freeze(Array.from({ length: 101 }, (_, id) => ({ id })));
  const first = discoverResultPage(items, 1);
  const second = discoverResultPage(items, 2);
  const third = discoverResultPage(items, 3);
  assert.equal(first.total, 101);
  assert.equal(first.items.length, 50);
  assert.equal(first.hasMore, true);
  assert.equal(second.items[0].id, 50);
  assert.equal(second.hasMore, true);
  assert.deepEqual(third.items, [{ id: 100 }]);
  assert.equal(third.hasMore, false);
  assert.deepEqual([...first.items, ...second.items, ...third.items], items);
  assert.equal(discoverResultPage([], 1).hasMore, false);
});

test("invalid and unbounded page requests normalize safely", () => {
  for (const value of [null, undefined, "2", -1, 0, Infinity, NaN, 2.5]) {
    assert.equal(discoverPageNumber(value), 1);
  }
  assert.equal(discoverPageNumber(2), 2);
  assert.equal(discoverPageNumber(1000), 100);
});
