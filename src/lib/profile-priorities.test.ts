import assert from "node:assert/strict";
import test from "node:test";

import {
  buildInitialProfilePriorityAllocation,
  buildPersistedProfilePriorities,
  buildProfilePriorityOrder,
  getAssignedProfilePrioritySparks,
  getProfilePriorityResourceTypeForOpportunity,
  getRankedProfileCauseAreas,
  normalizeProfilePriorityAllocation,
  normalizePersistedProfilePriorityAllocation,
  normalizeProfilePriorityResourceAllocations,
  PROFILE_PRIORITY_RESOURCE_OPTIONS,
  resolveProfilePriorityAllocationForOpportunity,
  serializeProfilePriorityAllocation,
  serializeProfilePriorityResourceAllocations,
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

test("normalizes and serializes explicit resource overrides without synthetic inherited rows", () => {
  const money = buildInitialProfilePriorityAllocation();
  money["ai-safety"] += 1;
  money["global-health"] -= 1;
  const career = buildInitialProfilePriorityAllocation();
  career["future-flourishing"] += 1;
  career["global-health"] -= 1;

  const serialized = serializeProfilePriorityResourceAllocations({ money, career });
  assert.deepEqual(normalizeProfilePriorityResourceAllocations(serialized), {
    money,
    career,
  });
  assert.deepEqual(normalizeProfilePriorityResourceAllocations("[]"), {});
  assert.equal(JSON.parse(serialized).length, 2);
});

test("rejects unknown, duplicate, malformed, and over-budget resource overrides", () => {
  const allocation = JSON.parse(
    serializeProfilePriorityAllocation(buildInitialProfilePriorityAllocation()),
  );
  const valid = { resourceType: "money", allocation };

  assert.equal(
    normalizeProfilePriorityResourceAllocations([
      valid,
      { ...valid, resourceType: "money" },
    ]),
    null,
  );
  assert.equal(
    normalizeProfilePriorityResourceAllocations([
      { ...valid, resourceType: "attention" },
    ]),
    null,
  );
  assert.equal(
    normalizeProfilePriorityResourceAllocations([
      {
        resourceType: "career",
        allocation: allocation.map((item: { id: string; sparks: number }, index: number) =>
          index === 0 ? { ...item, sparks: 21 } : item,
        ),
      },
    ]),
    null,
  );
});

test("general edits flow through inheritance but never overwrite a customized snapshot", () => {
  const originalGeneral = buildInitialProfilePriorityAllocation();
  const customizedMoney = { ...originalGeneral };
  const editedGeneral = {
    ...originalGeneral,
    "ai-safety": originalGeneral["ai-safety"] + 1,
    "global-health": originalGeneral["global-health"] - 1,
  };

  const inherited = resolveProfilePriorityAllocationForOpportunity(
    editedGeneral,
    { money: customizedMoney },
    "behavioral_commitment",
  );
  const customized = resolveProfilePriorityAllocationForOpportunity(
    editedGeneral,
    { money: customizedMoney },
    "donation",
  );
  const reset = resolveProfilePriorityAllocationForOpportunity(
    editedGeneral,
    {},
    "donation",
  );

  assert.equal(inherited.source, "general");
  assert.equal(inherited.allocation["ai-safety"], editedGeneral["ai-safety"]);
  assert.equal(customized.source, "resource_override");
  assert.equal(customized.allocation["ai-safety"], originalGeneral["ai-safety"]);
  assert.equal(reset.source, "general");
  assert.equal(reset.allocation["ai-safety"], editedGeneral["ai-safety"]);
});

test("maps every opportunity resource type to one resolver path with a general fallback", () => {
  const expected = {
    donation: "money",
    funding: "money",
    payer_side: "money",
    behavioral_commitment: "ordinary_action",
    research: "skilled_work",
    software: "skilled_work",
    analysis: "skilled_work",
    operations: "skilled_work",
    skilled_contribution: "skilled_work",
    career: "career",
    long_duration_project: "career",
    other: null,
  } as const;

  for (const [resourceType, expectedOverride] of Object.entries(expected)) {
    assert.equal(
      getProfilePriorityResourceTypeForOpportunity(
        resourceType as keyof typeof expected,
      ),
      expectedOverride,
    );
  }
  assert.deepEqual(
    PROFILE_PRIORITY_RESOURCE_OPTIONS.map(({ id }) => id),
    ["money", "ordinary_action", "skilled_work", "career"],
  );
});

test("hydrates compact persisted allocations and rejects hidden malformed rows", () => {
  const allocation = buildInitialProfilePriorityAllocation();
  const persisted = buildPersistedProfilePriorities(allocation);
  assert.deepEqual(normalizePersistedProfilePriorityAllocation(persisted), allocation);
  assert.equal(
    normalizePersistedProfilePriorityAllocation([...persisted, persisted[0]]),
    null,
  );
  assert.equal(
    normalizePersistedProfilePriorityAllocation([
      { ...persisted[0], id: "unknown-priority" },
    ]),
    null,
  );
});
