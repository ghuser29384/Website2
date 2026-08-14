import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  CANDIDATE_REASON_CODES,
  DECISION_SCHEMA_VERSION,
  EVALUATOR_VERSION,
  GLOBAL_BLOCKER_CODES,
  POLICY_SOURCE_MANIFEST_HASH,
  REASON_CODES,
  evaluateReciprocalTradeResearchEligibility,
  validateEligibilityDecision,
  validateEligibilityInput
} from "./reciprocal-trade-research-eligibility.mjs";

const FIXTURE_URL = new URL("../../docs/commitments/impact-identification/study-candidates/trade-bilateral-encouragement-planning-v1/canonical-eligibility/synthetic-eligibility-fixtures.v1.json", import.meta.url);
const fixtures = JSON.parse(readFileSync(FIXTURE_URL, "utf8"));

function clone(value) {
  return structuredClone(value);
}

function applyOperations(base, operations) {
  const value = clone(base);
  for (const operation of operations) {
    const segments = operation.path.split(".");
    let parent = value;
    for (const segment of segments.slice(0, -1)) parent = parent[segment];
    const leaf = segments.at(-1);
    if (operation.op === "remove") delete parent[leaf];
    else if (operation.op === "set") parent[leaf] = clone(operation.value);
    else throw new Error(`Unsupported fixture operation: ${operation.op}`);
  }
  return value;
}

function inputFor(fixtureCase) {
  return applyOperations(fixtures.baseInput, fixtureCase.operations);
}

test("all documented synthetic and adversarial fixtures have exact stable decisions", () => {
  assert.equal(fixtures.syntheticOnly, true);
  assert.equal(fixtures.nonExecuting, true);
  assert.equal(fixtures.containsProductionOrQaRows, false);
  assert.ok(fixtures.cases.length >= 50);

  for (const fixtureCase of fixtures.cases) {
    const input = inputFor(fixtureCase);
    const before = JSON.stringify(input);
    const first = evaluateReciprocalTradeResearchEligibility(input);
    const second = evaluateReciprocalTradeResearchEligibility(input);
    const expectedGlobalBlockers = fixtureCase.expectedGlobalBlockerReasons ?? fixtures.expectedGlobalBlockerReasons;
    const expectedAllReasons = REASON_CODES.filter((code) => expectedGlobalBlockers.includes(code) || fixtureCase.expectedCandidateReasonCodes.includes(code));

    assert.equal(first.eligible, fixtureCase.expectedEligible, fixtureCase.id);
    assert.equal(first.eligible, false, `${fixtureCase.id}: public eligibility must remain fail-closed`);
    assert.equal(first.candidatePolicySatisfied, fixtureCase.expectedCandidateReasonCodes.length === 0, `${fixtureCase.id}: candidate result`);
    assert.deepEqual(first.candidateReasonCodes, fixtureCase.expectedCandidateReasonCodes, `${fixtureCase.id}: candidate reasons`);
    assert.deepEqual(first.globalBlockerReasons, expectedGlobalBlockers, `${fixtureCase.id}: global blockers`);
    assert.deepEqual(first.reasonCodes, expectedAllReasons, `${fixtureCase.id}: all reasons`);
    assert.equal(validateEligibilityInput(input), !fixtureCase.expectedCandidateReasonCodes.includes("INPUT_SCHEMA_INVALID"), `${fixtureCase.id}: input schema`);
    assert.equal(validateEligibilityDecision(first), true, `${fixtureCase.id}: decision schema`);
    assert.deepEqual(first.unknownBlockers, fixtureCase.expectedUnknownBlockers ?? [], `${fixtureCase.id}: unknown blockers`);
    assert.deepEqual(first.staleSourceBlockers, fixtureCase.expectedStaleSourceBlockers ?? [], `${fixtureCase.id}: stale blockers`);
    assert.deepEqual(first, second, `${fixtureCase.id}: deterministic output`);
    assert.equal(JSON.stringify(input), before, `${fixtureCase.id}: input immutability`);
    assert.equal(first.schemaVersion, DECISION_SCHEMA_VERSION);
    assert.equal(first.evaluatorVersion, EVALUATOR_VERSION);
    assert.equal(first.policySourceManifestHash, POLICY_SOURCE_MANIFEST_HASH);
    assert.equal(first.canonicalEligibilitySourceStatus, "blocked_source_conflict");
    assert.equal(first.realGraphDiagnosticsStatus, "blocked_not_run");
    assert.equal(first.protectedDataExportAuthorized, false);
    assert.equal(first.executionDecision, "no_launch");
    assert.equal(first.assignmentGenerated, false);
    assert.equal(first.assignmentSeedGenerated, false);
    assert.equal(first.participantLevelCausalClaim, null);

    const serialized = JSON.stringify(first);
    for (const canary of fixtureCase.decisionMustExclude ?? []) {
      assert.equal(serialized.includes(canary), false, `${fixtureCase.id}: leaked ${canary}`);
    }
  }
});

test("frozen JSON Schemas drive input acceptance and decision fail-closed relationships", () => {
  const validInput = clone(fixtures.baseInput);
  assert.equal(validateEligibilityInput(validInput), true);

  const invalidInputs = [
    Object.assign(clone(validInput), { unexpected: true }),
    Object.assign(clone(validInput), { subjectMode: "unregistered" }),
    Object.assign(clone(validInput), { policySourceManifestHash: "not-a-hash" }),
    (() => { const value = clone(validInput); value.sourceOffer.causeCollation = "not-enumerated"; return value; })(),
    (() => { const value = clone(validInput); value.sourceOffer.gates.moderation.extra = true; return value; })()
  ];
  for (const input of invalidInputs) assert.equal(validateEligibilityInput(input), false);

  const validDecision = evaluateReciprocalTradeResearchEligibility(validInput);
  assert.equal(validateEligibilityDecision(validDecision), true);
  const invalidDecisions = [
    Object.assign(clone(validDecision), { eligible: true }),
    Object.assign(clone(validDecision), { globalBlockerReasons: [] }),
    Object.assign(clone(validDecision), { reasonCodes: [] }),
    Object.assign(clone(validDecision), { candidatePolicySatisfied: false })
  ];
  for (const decision of invalidDecisions) assert.equal(validateEligibilityDecision(decision), false);
});

test("adding a blocker never turns a fixture publicly eligible", () => {
  for (const fixtureCase of fixtures.cases) {
    const input = inputFor(fixtureCase);
    if (input.pair && typeof input.pair === "object") input.pair.blockStatus = "blocked_both";
    const decision = evaluateReciprocalTradeResearchEligibility(input);
    assert.equal(decision.eligible, false, fixtureCase.id);
  }
});

test("symmetric pair policy survives a source-target swap while roles remain directed", () => {
  const forward = clone(fixtures.baseInput);
  const reverse = clone(fixtures.baseInput);
  reverse.sourceOffer = clone(forward.targetOffer);
  reverse.targetOffer = clone(forward.sourceOffer);
  reverse.pair.sourceConsent = clone(forward.pair.targetConsent);
  reverse.pair.targetConsent = clone(forward.pair.sourceConsent);
  reverse.pair.sourceConsent.allowedRole = "source_only";
  reverse.pair.targetConsent.allowedRole = "target_only";
  reverse.pair.sourceRestriction = clone(forward.pair.targetRestriction);
  reverse.pair.targetRestriction = clone(forward.pair.sourceRestriction);

  assert.deepEqual(
    evaluateReciprocalTradeResearchEligibility(reverse).candidateReasonCodes,
    evaluateReciprocalTradeResearchEligibility(forward).candidateReasonCodes
  );
  assert.equal(evaluateReciprocalTradeResearchEligibility(reverse).candidatePolicySatisfied, true);
  assert.equal(evaluateReciprocalTradeResearchEligibility(reverse).eligible, false);

  reverse.pair.sourceConsent.allowedRole = "target_only";
  assert.deepEqual(
    evaluateReciprocalTradeResearchEligibility(reverse).candidateReasonCodes,
    ["SOURCE_ROLE_NOT_AUTHORIZED"]
  );
});

test("decisions are aggregate-safe and contain no input keys, causes, or causal claims", () => {
  const input = clone(fixtures.baseInput);
  const decision = evaluateReciprocalTradeResearchEligibility(input);
  const serialized = JSON.stringify(decision);
  const forbidden = [
    input.sourceOffer.offerKey,
    input.targetOffer.offerKey,
    input.sourceOffer.ownerKey,
    input.targetOffer.ownerKey,
    input.sourceOffer.offeredCause,
    input.sourceOffer.requestedCause,
    "expected_additional",
    "direct_causal_attribution"
  ];
  for (const value of forbidden) assert.equal(serialized.includes(value), false, value);
  assert.deepEqual(Object.keys(decision).sort(), [
    "assignmentGenerated",
    "assignmentSeedGenerated",
    "candidatePolicySatisfied",
    "candidateReasonCodes",
    "canonicalEligibilitySourceStatus",
    "effectiveAt",
    "eligible",
    "evaluatorVersion",
    "executionDecision",
    "globalBlockerReasons",
    "participantLevelCausalClaim",
    "policySourceManifestHash",
    "protectedDataExportAuthorized",
    "realGraphDiagnosticsStatus",
    "reasonCodes",
    "schemaVersion",
    "staleSourceBlockers",
    "subjectMode",
    "unknownBlockers"
  ]);
});

test("reason codes are frozen, unique, and all exercised by synthetic fixtures", () => {
  assert.equal(new Set(REASON_CODES).size, REASON_CODES.length);
  const exercisedCandidate = new Set(fixtures.cases.flatMap((fixtureCase) => fixtureCase.expectedCandidateReasonCodes));
  const exercisedGlobal = new Set(fixtures.cases.flatMap((fixtureCase) => fixtureCase.expectedGlobalBlockerReasons ?? fixtures.expectedGlobalBlockerReasons));
  assert.deepEqual([...exercisedCandidate].sort(), [...CANDIDATE_REASON_CODES].sort());
  assert.deepEqual([...exercisedGlobal].sort(), [...GLOBAL_BLOCKER_CODES].sort());
});
