import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  BLOCKING_REASON_ORDER,
  EVALUATOR_VERSION,
  evaluateOperationIntent,
  validateOperationIntentDecision,
  validateOperationIntentInput,
} from "./operation-intent-evaluator.mjs";

const PACKAGE_ROOT = new URL(
  "../../docs/moral-trade/reciprocal-trade-operation-intent-v1/",
  import.meta.url,
);
const FIXTURES = JSON.parse(
  readFileSync(new URL("synthetic-shadow-fixtures.v1.json", PACKAGE_ROOT), "utf8"),
);

function clone(value) {
  return structuredClone(value);
}

function deepMerge(base, patch) {
  if (patch === null || typeof patch !== "object" || Array.isArray(patch)) {
    return clone(patch);
  }
  const result =
    base && typeof base === "object" && !Array.isArray(base) ? clone(base) : {};
  for (const [key, value] of Object.entries(patch)) {
    result[key] =
      value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      result[key] &&
      typeof result[key] === "object" &&
      !Array.isArray(result[key])
        ? deepMerge(result[key], value)
        : clone(value);
  }
  return result;
}

function materialize(patch) {
  return deepMerge(FIXTURES.baseInput, patch);
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value)) deepFreeze(child);
  return value;
}

test("all valid fixtures are schema-valid, deterministic, and match exact reason codes", () => {
  for (const fixture of FIXTURES.cases) {
    const input = materialize(fixture.patch);
    assert.equal(validateOperationIntentInput(input), true, fixture.id);
    const first = evaluateOperationIntent(input);
    const second = evaluateOperationIntent(clone(input));
    assert.deepEqual(first, second, `${fixture.id}: nondeterministic decision`);
    assert.equal(validateOperationIntentDecision(first), true, fixture.id);
    assert.equal(
      first.candidatePolicySatisfied,
      fixture.expectedCandidatePolicySatisfied,
      fixture.id,
    );
    assert.deepEqual(
      first.candidateReasonCodes,
      fixture.expectedCandidateReasonCodes,
      fixture.id,
    );
    if (fixture.expectedObservationCodes) {
      assert.deepEqual(first.observationCodes, fixture.expectedObservationCodes, fixture.id);
    }
    for (const code of fixture.expectedGlobalIncludes ?? []) {
      assert.ok(first.globalBlockerReasonCodes.includes(code), `${fixture.id}: ${code}`);
    }
    assert.equal(first.liveEligible, false, fixture.id);
    assert.equal(first.executionDecision, "no_live_activation", fixture.id);
    assert.equal(first.syntheticOnly, true, fixture.id);
    assert.equal(first.evaluatorVersion, EVALUATOR_VERSION, fixture.id);
    assert.ok(first.globalBlockerReasonCodes.includes("DESIGN_SHADOW_ONLY"), fixture.id);
    assert.ok(
      first.globalBlockerReasonCodes.includes("LIVE_ACTIVATION_NOT_AUTHORIZED"),
      fixture.id,
    );
    assert.ok(
      first.globalBlockerReasonCodes.includes("PRODUCTION_MIGRATION_NOT_AUTHORIZED"),
      fixture.id,
    );
    const positions = first.candidateReasonCodes.map((code) =>
      BLOCKING_REASON_ORDER.indexOf(code),
    );
    assert.deepEqual(
      positions,
      [...positions].sort((left, right) => left - right),
      `${fixture.id}: reason ordering drifted`,
    );
  }
});

test("schema-invalid fixtures are rejected before semantic evaluation", () => {
  for (const fixture of FIXTURES.invalidInputCases) {
    const input = materialize(fixture.patch);
    assert.throws(
      () => evaluateOperationIntent(input),
      /input schema validation failed/,
      fixture.id,
    );
  }
});

test("fixture tags cover every owner-required adversarial family", () => {
  const observed = new Set(FIXTURES.cases.flatMap((fixture) => fixture.tags));
  for (const tag of FIXTURES.requiredCoverageTags) {
    assert.ok(observed.has(tag), `missing fixture coverage tag: ${tag}`);
  }
});

test("adding a blocking structured fact cannot improve a passing decision", () => {
  const passing = materialize({});
  const blocked = deepMerge(passing, {
    structuredGates: { source: { validity: "blocked" } },
  });
  const before = evaluateOperationIntent(passing);
  const after = evaluateOperationIntent(blocked);
  assert.equal(before.candidatePolicySatisfied, true);
  assert.equal(after.candidatePolicySatisfied, false);
  assert.ok(after.candidateReasonCodes.includes("SOURCE_VALIDITY_NOT_CLEARED"));
});

test("the evaluator does not mutate frozen input", () => {
  const input = deepFreeze(materialize({}));
  assert.doesNotThrow(() => evaluateOperationIntent(input));
});

test("collation remains an input from PostgreSQL rather than an application emulation", () => {
  const source = readFileSync(new URL("./operation-intent-evaluator.mjs", import.meta.url), "utf8");
  assert.doesNotMatch(source, /\.toLowerCase\s*\(/);
  assert.doesNotMatch(source, /\.normalize\s*\(/);
  assert.doesNotMatch(source, /function\s+.*(?:like|ilike).*\{/i);
  const boundaryCases = FIXTURES.cases.filter((fixture) =>
    fixture.tags.includes("collation_boundary"),
  );
  assert.ok(boundaryCases.length >= 5);
});

test("the evaluator is synthetic-only and has no runtime, network, clock, random, or environment dependency", () => {
  const source = readFileSync(new URL("./operation-intent-evaluator.mjs", import.meta.url), "utf8");
  for (const prohibited of [
    /@\/lib\/supabase/,
    /createClient\s*\(/,
    /\bfetch\s*\(/,
    /process\.env/,
    /Date\.now\s*\(/,
    /new Date\s*\(/,
    /Math\.random\s*\(/,
    /randomUUID\s*\(/,
    /recommendation_graph_edges[\s\S]*\.from\s*\(/,
  ]) {
    assert.doesNotMatch(source, prohibited);
  }
});

test("cross-mechanism Feed fixtures never collapse independent mechanisms into reciprocal_trade", () => {
  const coAct = FIXTURES.cases.find((fixture) => fixture.id === "cross_feed_co_act_direct_pass");
  const donation = FIXTURES.cases.find(
    (fixture) => fixture.id === "cross_feed_donation_upgrade_pass",
  );
  assert.ok(coAct && donation);
  const coActDecision = evaluateOperationIntent(materialize(coAct.patch));
  const donationDecision = evaluateOperationIntent(materialize(donation.patch));
  assert.equal(coActDecision.mechanismFamily, "co_act");
  assert.equal(donationDecision.mechanismFamily, "donation_upgrade");
  assert.notEqual(coActDecision.mechanismFamily, "reciprocal_trade");
  assert.notEqual(donationDecision.mechanismFamily, "reciprocal_trade");
});

test("Paid Action live eligibility remains false even when the shadow contract passes", () => {
  const fixture = FIXTURES.cases.find(
    (item) => item.id === "paid_action_actor_compensation_shadow_pass",
  );
  assert.ok(fixture);
  const decision = evaluateOperationIntent(materialize(fixture.patch));
  assert.equal(decision.candidatePolicySatisfied, true);
  assert.equal(decision.liveEligible, false);
  assert.ok(
    decision.globalBlockerReasonCodes.includes(
      "PAYMENT_DESTINATION_LIVE_ENABLEMENT_DEFERRED",
    ),
  );
});

test("every opportunity-envelope identifier is synthetic-only", () => {
  const fixture = FIXTURES.cases.find(
    (item) => item.id === "cross_feed_co_act_direct_pass",
  );
  assert.ok(fixture);
  const input = materialize(fixture.patch);
  input.feed.opportunityEnvelope.authority.authorityId = "co_act_authority_v1";
  assert.throws(
    () => evaluateOperationIntent(input),
    /input schema validation failed/,
  );
});

test("Feed acceptance cannot remain true after any candidate gate fails", () => {
  const fixture = FIXTURES.cases.find(
    (item) => item.id === "cross_feed_co_act_direct_pass",
  );
  assert.ok(fixture);
  const input = materialize(fixture.patch);
  input.sourceOffer.operationalStatus = "closed";
  const decision = evaluateOperationIntent(input);
  assert.equal(decision.candidatePolicySatisfied, false);
  assert.equal(decision.opportunityEnvelopeAccepted, false);
  assert.ok(decision.candidateReasonCodes.includes("SOURCE_OFFER_NOT_CURRENT"));
});

test("Paid Action allocations enforce unique IDs and destination-specific nested types", () => {
  const nestedFixture = FIXTURES.cases.find(
    (item) => item.id === "paid_action_nested_cofund_pass",
  );
  const splitFixture = FIXTURES.cases.find(
    (item) => item.id === "exact_cent_split_pass",
  );
  assert.ok(nestedFixture && splitFixture);

  const wrongNestedType = materialize(nestedFixture.patch);
  wrongNestedType.paidAction.destinationClass = "threshold_pool_contribution";
  wrongNestedType.paidAction.allocations[0].destinationClass =
    "threshold_pool_contribution";
  const nestedDecision = evaluateOperationIntent(wrongNestedType);
  assert.deepEqual(nestedDecision.candidateReasonCodes, [
    "NESTED_DESTINATION_TYPE_MISMATCH",
  ]);

  const duplicateAllocation = materialize(splitFixture.patch);
  duplicateAllocation.paidAction.allocations[1].allocationId =
    duplicateAllocation.paidAction.allocations[0].allocationId;
  const allocationDecision = evaluateOperationIntent(duplicateAllocation);
  assert.deepEqual(allocationDecision.candidateReasonCodes, [
    "DUPLICATE_ALLOCATION_ID",
  ]);
});

test("nested contracts reject duplicate IDs and a non-root depth-one parent", () => {
  const paidFixture = FIXTURES.cases.find(
    (item) => item.id === "paid_action_nested_cofund_pass",
  );
  const coActFixture = FIXTURES.cases.find(
    (item) => item.id === "nested_co_act_milestone_exact_state_pass",
  );
  assert.ok(paidFixture && coActFixture);

  const duplicateNested = materialize(paidFixture.patch);
  const duplicate = clone(duplicateNested.nestedOpportunities[0]);
  duplicate.nestedTermsHash =
    "sha256:4444444444444444444444444444444444444444444444444444444444444444";
  duplicateNested.nestedOpportunities.push(duplicate);
  validateOperationIntentInput(duplicateNested);
  assert.deepEqual(evaluateOperationIntent(duplicateNested).candidateReasonCodes, [
    "NESTED_DUPLICATE_ID",
  ]);

  const wrongParent = materialize(coActFixture.patch);
  wrongParent.nestedOpportunities[0].parentOpportunityId =
    "synthetic:opportunity:not-the-root";
  assert.deepEqual(evaluateOperationIntent(wrongParent).candidateReasonCodes, [
    "NESTED_PARENT_MISMATCH",
  ]);
});

test("Co-Act direct and nested state contracts cannot be conflated", () => {
  const directFixture = FIXTURES.cases.find(
    (item) => item.id === "cross_feed_co_act_direct_pass",
  );
  const nestedFixture = FIXTURES.cases.find(
    (item) => item.id === "nested_co_act_milestone_exact_state_pass",
  );
  assert.ok(directFixture && nestedFixture);

  const conflatedDirect = materialize(directFixture.patch);
  conflatedDirect.coAct.roleId = "synthetic:role:unexpected";
  conflatedDirect.coAct.obligationLevel = "join";
  conflatedDirect.coAct.promisedState = "joined";
  conflatedDirect.coAct.promisedStateSatisfied = true;
  assert.ok(
    evaluateOperationIntent(conflatedDirect).candidateReasonCodes.includes(
      "CO_ACT_PRESENTATION_MISMATCH",
    ),
  );

  const mismatchedNested = materialize(nestedFixture.patch);
  mismatchedNested.coAct.obligationLevel = "join";
  assert.deepEqual(evaluateOperationIntent(mismatchedNested).candidateReasonCodes, [
    "CO_ACT_OBLIGATION_STATE_MISMATCH",
  ]);
});

test("Feed envelopes bind exact terms, revision, effective time, and snapshot", () => {
  const fixture = FIXTURES.cases.find(
    (item) => item.id === "cross_feed_co_act_direct_pass",
  );
  assert.ok(fixture);
  const input = materialize(fixture.patch);
  input.feed.opportunityEnvelope.terms.hash =
    "sha256:9999999999999999999999999999999999999999999999999999999999999999";
  const decision = evaluateOperationIntent(input);
  assert.deepEqual(decision.candidateReasonCodes, ["OPPORTUNITY_ENVELOPE_INVALID"]);
  assert.equal(decision.opportunityEnvelopeAccepted, false);
});

test("actor, counterparty, target mechanism, and outer family are source-bound", () => {
  const wrongActor = materialize({
    actor: { actorId: "synthetic:profile:not-source" },
  });
  assert.deepEqual(evaluateOperationIntent(wrongActor).candidateReasonCodes, [
    "ACTOR_NOT_AUTHORIZED",
  ]);

  const wrongCounterparty = materialize({
    counterparty: { profileId: "synthetic:profile:not-target" },
  });
  assert.deepEqual(evaluateOperationIntent(wrongCounterparty).candidateReasonCodes, [
    "COUNTERPARTY_BINDING_REQUIRED",
  ]);

  const wrongTargetOntology = materialize({
    targetOffer: {
      mechanismFamily: "co_act",
      outerContractFamily: null,
    },
  });
  const ontologyDecision = evaluateOperationIntent(wrongTargetOntology);
  assert.ok(
    ontologyDecision.candidateReasonCodes.includes("TARGET_MECHANISM_NOT_ALLOWED"),
  );
  assert.ok(
    ontologyDecision.candidateReasonCodes.includes(
      "TARGET_OUTER_CONTRACT_FAMILY_MISMATCH",
    ),
  );
});

test("private delivery compares actual source bindings and cannot carry a public envelope", () => {
  const privateFixture = FIXTURES.cases.find(
    (item) => item.id === "private_delivery_pass",
  );
  const publicFixture = FIXTURES.cases.find(
    (item) => item.id === "cross_feed_co_act_direct_pass",
  );
  assert.ok(privateFixture && publicFixture);

  const staleBinding = materialize(privateFixture.patch);
  staleBinding.privateDelivery.boundTermsHash =
    "sha256:9999999999999999999999999999999999999999999999999999999999999999";
  assert.deepEqual(evaluateOperationIntent(staleBinding).candidateReasonCodes, [
    "PRIVATE_DELIVERY_SOURCE_BINDING_REQUIRED",
  ]);

  const publicEnvelope = materialize(privateFixture.patch);
  publicEnvelope.feed.opportunityEnvelope = materialize(
    publicFixture.patch,
  ).feed.opportunityEnvelope;
  assert.deepEqual(evaluateOperationIntent(publicEnvelope).candidateReasonCodes, [
    "PRIVATE_DELIVERY_PUBLIC_MARKET_FORBIDDEN",
  ]);
});

test("research overlays remain separate from product intents", () => {
  const input = materialize({
    research: {
      applies: true,
      purposeBound: true,
    },
  });
  const decision = evaluateOperationIntent(input);
  assert.deepEqual(decision.candidateReasonCodes, [
    "RESEARCH_OVERLAY_INTENT_MISMATCH",
  ]);
  assert.ok(
    decision.globalBlockerReasonCodes.includes("RESEARCH_EXECUTION_NOT_AUTHORIZED"),
  );
});
