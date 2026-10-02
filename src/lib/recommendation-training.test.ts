import assert from "node:assert/strict";
import test from "node:test";

import {
  buildHeadExamples,
  loadTrainingData,
  reconcileOutcomes,
  type TrainingData,
} from "./recommendation-training";

const now = new Date("2026-09-01T00:00:00.000Z");
type Agreement = TrainingData["agreements"][number];
type Milestone = Agreement["milestones"][number];

function milestone(overrides: Partial<Milestone> = {}): Milestone {
  return {
    agreement_version_id: "current-version",
    final_review_id: "final-review",
    status: "paid",
    payout: { is_final: true, status: "confirmed" },
    ...overrides,
  };
}

function trainingData(overrides: Partial<Agreement> = {}): TrainingData {
  return {
    agreements: [{
      cancelled_at: null,
      completed_at: "2026-08-31T00:00:00.000Z",
      completion_state: "reviewed_complete",
      created_at: "2026-07-01T00:00:00.000Z",
      current_version_id: "current-version",
      id: "agreement",
      lifecycle_status: "completed",
      milestones: [milestone()],
      offer_id: "offer",
      proposer_id: "viewer",
      responder_id: "owner",
      status: "completed",
      ...overrides,
    }],
    completionConfirmations: [],
    evidence: [],
    exposures: [{
      assignment_arm: "treatment",
      feature_snapshot: {},
      id: "exposure",
      joint_propensity: 0.5,
      match_class: "near",
      occurred_at: "2026-07-01T00:00:00.000Z",
      opportunity_id: "offer",
      opportunity_type: "offer",
      owner_id: "owner",
      profile_id: "viewer",
      was_shown: true,
    }],
    feedback: [],
    interactions: [],
    interests: [],
    offers: [{ id: "offer", owner_id: "owner" }],
    ratings: [],
    reports: [],
    threads: [],
  };
}

function addLegacyProof(data: TrainingData) {
  data.evidence = [{ agreement_id: "agreement", status: "accepted" }];
  data.completionConfirmations = ["viewer", "owner"].map((user_id) => ({
    agreement_id: "agreement",
    user_id,
  }));
  return data;
}

function outcome(data: TrainingData) {
  return reconcileOutcomes(data, now)[0];
}

function assertUnverified(data: TrainingData) {
  const reconciled = outcome(data);
  assert.equal(reconciled.verifiedCompletion, false);
  assert.equal(buildHeadExamples([reconciled]).verifiedCompletion[0]?.label, 0);
}

for (const status of ["not_due", "confirmed", "adjudicated_paid"]) {
  test(`a reviewed milestone with final ${status} payment trains positively without legacy evidence or confirmations`, () => {
    const data = trainingData({
      milestones: [milestone({
        status: status === "not_due" ? "graded" : "paid",
        payout: { is_final: true, status },
      })],
    });
    const reconciled = outcome(data);
    assert.equal(reconciled.completed, true);
    assert.equal(reconciled.verifiedCompletion, true);
    assert.equal(buildHeadExamples([reconciled]).verifiedCompletion[0].label, 1);
  });
}

test("a milestone requires a final review and final payout", () => {
  for (const incomplete of [
    milestone({ final_review_id: null }),
    milestone({ payout: null }),
    milestone({ payout: { is_final: false, status: "confirmed" } }),
  ]) {
    assertUnverified(addLegacyProof(trainingData({ milestones: [incomplete] })));
  }
});

for (const status of [
  "provisional", "due", "reported_paid", "payment_review_pending", "correction_due",
  "corrected_reported", "payment_decision_pending", "payment_appeal_pending", "still_due",
]) {
  test(`a ${status} payment cannot be rescued by legacy confirmations`, () => {
    assertUnverified(addLegacyProof(trainingData({
      milestones: [milestone({ payout: { is_final: true, status } })],
    })));
  });
}

for (const status of ["terms", "evidence_due", "under_review", "replacement_due", "appeal_pending"]) {
  test(`an incomplete or rejected milestone in ${status} cannot train positively`, () => {
    // A final rejected review has a not_due payout but remains evidence_due.
    assertUnverified(addLegacyProof(trainingData({
      milestones: [milestone({ status, payout: { is_final: true, status: "not_due" } })],
    })));
  });
}

test("every current-version live milestone must be complete", () => {
  assertUnverified(trainingData({
    milestones: [milestone(), milestone({ payout: { is_final: true, status: "due" } })],
  }));
  assertUnverified(trainingData({ milestones: [milestone({ status: "cancelled" })] }));
  assert.equal(outcome(trainingData({ milestones: [
    milestone(),
    milestone({ status: "cancelled", final_review_id: null, payout: null }),
    milestone({ agreement_version_id: "old-version", status: "evidence_due", payout: null }),
  ] })).verifiedCompletion, true);
});

test("old-version milestones cannot establish completion of the current version", () => {
  assertUnverified(trainingData({
    milestones: [milestone({ agreement_version_id: "old-version" })],
  }));
  assertUnverified(trainingData({ current_version_id: null }));
});

test("a completion timestamp or reviewed marker alone cannot establish a milestone success", () => {
  assertUnverified(trainingData({
    status: "active", lifecycle_status: "active", completed_at: null,
  }));
  for (const completion_state of ["pending_evidence", "under_review", "challenge_window_open"]) {
    assertUnverified(trainingData({ completion_state }));
  }
  for (const lifecycle_status of ["draft", "proposed", "cancelled", "expired", "disputed"]) {
    assertUnverified(trainingData({ lifecycle_status }));
  }
  assertUnverified(trainingData({ status: "cancelled" }));
  assertUnverified(trainingData({ cancelled_at: "2026-08-31T01:00:00.000Z" }));
  assertUnverified(trainingData({ completion_state: "disputed_unresolved" }));
});

test("legacy completed agreements still require accepted evidence and both participants", () => {
  for (const current_version_id of [null, "legacy-frozen-version"]) {
    const data = addLegacyProof(trainingData({
      current_version_id, milestones: [], completion_state: "pending_evidence",
    }));
    assert.equal(outcome(data).verifiedCompletion, true);
    assert.equal(buildHeadExamples([outcome(data)]).verifiedCompletion[0].label, 1);
    data.evidence[0].status = "challenged";
    assertUnverified(data);
    data.evidence[0].status = "accepted";
    data.completionConfirmations.pop();
    assertUnverified(data);
    data.completionConfirmations.push({ agreement_id: "agreement", user_id: "unrelated-person" });
    assertUnverified(data);
    data.completionConfirmations[1].user_id = "viewer";
    assertUnverified(data);
  }
});

test("a backfilled reviewed_complete marker does not bypass legacy evidence", () => {
  assertUnverified(trainingData({ milestones: [], current_version_id: null }));
  const data = addLegacyProof(trainingData({ milestones: [] }));
  data.agreements[0].milestones = undefined as unknown as Milestone[];
  assertUnverified(data);
});

test("immature incomplete agreements remain unlabeled rather than premature negatives", () => {
  const data = trainingData({ status: "active", lifecycle_status: "active", completed_at: null });
  data.exposures[0].occurred_at = "2026-08-31T00:00:00.000Z";
  const reconciled = outcome(data);
  assert.equal(reconciled.verifiedCompletion, false);
  assert.deepEqual(buildHeadExamples([reconciled]).verifiedCompletion, []);
});

test("completion never substitutes for either participant's own-lights gain", () => {
  const data = trainingData();
  assert.equal(outcome(data).viewerGainPositive, null);
  assert.equal(outcome(data).counterpartyGainPositive, null);
  assert.deepEqual(buildHeadExamples([outcome(data)]).viewerGain, []);
  assert.deepEqual(buildHeadExamples([outcome(data)]).counterpartyGain, []);
  data.feedback = [
    { profile_id: "viewer", own_lights_gain: 4 },
    { profile_id: "owner", own_lights_gain: 3 },
  ].map((feedback) => ({
    ...feedback,
    agreement_id: "agreement",
    externality_concern: "none",
    satisfaction: 5,
    would_happen_without_trade_percent: 0,
  }));
  assert.equal(outcome(data).viewerGainPositive, true);
  assert.equal(outcome(data).counterpartyGainPositive, false);
  const examples = buildHeadExamples([outcome(data)]);
  assert.equal(examples.verifiedCompletion[0].label, 1);
  assert.equal(examples.viewerGain[0].label, 1);
  assert.equal(examples.counterpartyGain[0].label, 0);
  data.feedback[0].own_lights_gain = 3;
  data.feedback[1].own_lights_gain = 4;
  assert.equal(outcome(data).viewerGainPositive, false);
  assert.equal(outcome(data).counterpartyGainPositive, true);
});

function mockService(agreement: Agreement, queryError: string | null = null) {
  const selects = new Map<string, string>();
  return {
    selects,
    from(table: string) {
      const query = {
        select(columns: string) { selects.set(table, columns); return query; },
        gte() { return query; },
        order() { return query; },
        limit() {
          return Promise.resolve({
            data: table === "agreements" ? [agreement] : [],
            error: table === "agreements" && queryError ? { message: queryError } : null,
          });
        },
      };
      return query;
    },
  };
}

test("training loads canonical completion and nested milestone/payment facts in the agreement snapshot", async () => {
  const agreement = trainingData().agreements[0];
  const service = mockService(agreement);
  const loaded = await loadTrainingData(service, "2025-09-01T00:00:00.000Z");
  assert.deepEqual(loaded.agreements, [agreement]);
  const select = service.selects.get("agreements") ?? "";
  assert.match(select, /completion_state,current_version_id/);
  assert.match(select, /milestones:trade_agreement_milestones\(agreement_version_id,status,final_review_id,payout:trade_milestone_payouts\(is_final,status\)\)/);
  loaded.exposures = trainingData().exposures;
  assert.equal(outcome(loaded).verifiedCompletion, true);
});

test("unavailable milestone/payment data fails the training query rather than falling back to legacy labels", async () => {
  const service = mockService(trainingData().agreements[0], "milestone relationship unavailable");
  await assert.rejects(
    loadTrainingData(service, "2025-09-01T00:00:00.000Z"),
    /Training data query failed for agreements: milestone relationship unavailable/,
  );
});
