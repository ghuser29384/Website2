import assert from "node:assert/strict";
import test from "node:test";

import {
  buildInitialProfilePriorityAllocation,
  buildPersistedProfilePriorities,
  buildProfilePriorityOrder,
  getAssignedProfilePrioritySparks,
  getRankedProfileCauseAreas,
  normalizeProfilePriorityAllocation,
  serializeProfilePriorityAllocation,
} from "@/lib/profile-priorities";

test("can seed Design 5 with eighty assigned points and the walkthrough priority first", () => {
  const order = buildProfilePriorityOrder("Factory farming", "Animal welfare");
  const allocation = buildInitialProfilePriorityAllocation(order);

  assert.equal(order[0], "factory-farming");
  assert.equal(allocation["factory-farming"], 3);
  assert.equal(getAssignedProfilePrioritySparks(allocation), 16);
});

test("round-trips a valid coarse allocation", () => {
  const allocation = buildInitialProfilePriorityAllocation();
  allocation["ai-safety"] += 2;
  allocation["global-health"] += 2;

  assert.deepEqual(
    normalizeProfilePriorityAllocation(serializeProfilePriorityAllocation(allocation)),
    allocation,
  );
});

test("rejects duplicate, unknown, fractional, empty, and over-budget allocations", () => {
  const allocation = buildInitialProfilePriorityAllocation();
  const parsed = JSON.parse(serializeProfilePriorityAllocation(allocation));

  assert.equal(normalizeProfilePriorityAllocation([]), null);
  assert.equal(
    normalizeProfilePriorityAllocation([...parsed.slice(0, -1), parsed[0]]),
    null,
  );
  assert.equal(
    normalizeProfilePriorityAllocation([
      ...parsed.slice(0, -1),
      { id: "unknown-priority", sparks: 1 },
    ]),
    null,
  );
  assert.equal(
    normalizeProfilePriorityAllocation(
      parsed.map((item: { id: string; sparks: number }, index: number) =>
        index === 0 ? { ...item, sparks: 1.5 } : item,
      ),
    ),
    null,
  );
  assert.equal(
    normalizeProfilePriorityAllocation(
      parsed.map((item: { id: string; sparks: number }, index: number) =>
        index === 0 ? { ...item, sparks: 20 } : item,
      ),
    ),
    null,
  );
});

test("preserves ties and aggregates detailed priorities into ranked cause areas", () => {
  const allocation = buildInitialProfilePriorityAllocation();
  const rows = buildPersistedProfilePriorities(allocation);

  assert.equal(rows[0].rank, 1);
  assert.equal(rows[1].rank, 1);
  assert.equal(rows[2].rank, 3);
  assert.deepEqual(getRankedProfileCauseAreas(allocation).slice(0, 2), [
    "Existential risk",
    "Public health",
  ]);
});
