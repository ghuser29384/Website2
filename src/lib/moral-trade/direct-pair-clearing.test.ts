import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { GET as getDirectPairContract } from "@/app/api/moral-trade/direct-pair-clearing/contract/route";
import {
  evaluateMoralTradeDirectPairClearing,
  getMoralTradeDirectPairClearingContract,
  validateMoralTradeDirectPairClearingContract,
  type MoralTradeDirectPairClearingRecord,
} from "@/lib/moral-trade/direct-pair-clearing";

const HASH_A = "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const HASH_B = "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
const HASH_C = "sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc";

function directPairRecord(
  overrides: Partial<MoralTradeDirectPairClearingRecord> = {},
): MoralTradeDirectPairClearingRecord {
  return {
    recordId: "direct-pair:test",
    tradeType: "donation_offset",
    sourceOfferIds: ["offset-offer:a", "offset-offer:b"],
    matchedTradeLockProposalRef: "matched-trade-lock-proposal:test",
    initiatorParticipantIdHash: HASH_A,
    invitedOrKnownCounterpartyIdHash: HASH_B,
    inviteOrKnownCounterpartyRef: "invite-link:test",
    directPairClearingPolicyRef: "policy-snapshot:direct-pair-clearing",
    policyStatus: "resolved_immutable",
    noBackgroundNetworking: true,
    twoPartyTermsSnapshotHash: HASH_C,
    finalConfirmationRecordRefs: ["participant-confirmation:a", "participant-confirmation:b"],
    privacyGrantRefs: ["privacy-grant:test"],
    userSafetyReviewState: "non_blocking",
    matchingClearingRunRef: "matching-clearing-run:test",
    directPairState: "both_confirmed",
    ordinaryLockReviewPaymentPrivacyGatesStatus: "passed",
    reviewerDecisionRef: "review-decision:direct-pair",
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-06-12T00:00:00.000Z",
    publicCounterpartyIdentity: false,
    publicDirectContactDetails: false,
    publicExactCaps: false,
    publicPrivateNotes: false,
    publicPrivateSurplus: false,
    autonomousOutreachAttempted: false,
    ...overrides,
  };
}

test("direct-pair clearing contract validates first-class two-party records", () => {
  const contract = getMoralTradeDirectPairClearingContract();
  const validation = validateMoralTradeDirectPairClearingContract(contract);

  assert.equal(validation.status, "pass");
  assert.ok(contract.firstClassRecordTables.includes("moral_trade_direct_pair_clearing_records"));
  assert.ok(contract.policySnapshotSubjects.includes("direct_pair_clearing"));
  assert.deepEqual(contract.allowedLaunchTradeTypes, ["donation_offset", "pledge_swap"]);
  assert.ok(contract.tradeTypes.includes("compensated_moral_action"));
  assert.ok(contract.directPairStates.includes("both_confirmed"));
  assert.ok(contract.transitionDefinitions.some((transition) => transition.key === "matched_trade_lock"));
  assert.ok(contract.transitionDefinitions.some((transition) => transition.key === "payment_capture"));
  assert.match(contract.failClosedRule, /not background networking/i);
  assert.match(contract.noAutonomousOutreachRule, /autonomous outreach/i);
  assert.match(contract.privacyBoundary, /direct contact details/i);
  assert.ok(
    contract.sampleEvaluations.some(
      (evaluation) => evaluation.directPairRequired && evaluation.status === "pass",
    ),
  );
});

test("governed donation-offset direct-pair record can pass lock, payment, metrics, and release gates", () => {
  const evaluation = evaluateMoralTradeDirectPairClearing({
    transition: "matched_trade_lock",
    directPairRequired: true,
    checkedAt: "2026-06-12T00:00:00.000Z",
    records: [directPairRecord()],
  });

  assert.equal(evaluation.status, "pass");
  assert.equal(evaluation.eligibleRecordCount, 1);
  assert.equal(evaluation.confirmedRecordCount, 1);
  assert.equal(evaluation.privacySafeRecordCount, 1);
  assert.equal(evaluation.noBackgroundNetworkingCount, 1);
  assert.deepEqual(evaluation.blockers, []);
});

test("missing direct-pair records fail closed when direct-pair mode is required", () => {
  const evaluation = evaluateMoralTradeDirectPairClearing({
    transition: "payment_capture",
    directPairRequired: true,
    checkedAt: "2026-06-12T00:00:00.000Z",
    records: [],
  });

  assert.equal(evaluation.status, "blocked");
  assert.ok(evaluation.blockers.includes("direct_pair_clearing_record_missing"));
  assert.ok(evaluation.blockers.includes("eligible_direct_pair_clearing_record_missing"));
});

test("direct-pair records fail closed on autonomous outreach, missing consent, and ordinary-gate bypass", () => {
  const evaluation = evaluateMoralTradeDirectPairClearing({
    transition: "matched_trade_lock",
    directPairRequired: true,
    checkedAt: "2026-06-12T00:00:00.000Z",
    records: [
      directPairRecord({
        tradeType: "compensated_moral_action",
        sourceOfferIds: ["offset-offer:single", "offset-offer:extra", "offset-offer:third"],
        matchedTradeLockProposalRef: null,
        policyStatus: "mutable",
        noBackgroundNetworking: false,
        finalConfirmationRecordRefs: ["participant-confirmation:one-side"],
        privacyGrantRefs: [],
        userSafetyReviewState: "under_review",
        matchingClearingRunRef: null,
        directPairState: "invited",
        ordinaryLockReviewPaymentPrivacyGatesStatus: "under_review",
        reviewerDecisionRef: null,
        autonomousOutreachAttempted: true,
      }),
    ],
  });

  assert.equal(evaluation.status, "blocked");
  assert.ok(
    evaluation.blockers.includes(
      "direct_pair_trade_type_not_allowed:direct-pair:test:compensated_moral_action",
    ),
  );
  assert.ok(evaluation.blockers.includes("direct_pair_source_offer_scope_invalid:direct-pair:test"));
  assert.ok(evaluation.blockers.includes("direct_pair_lock_proposal_missing:direct-pair:test"));
  assert.ok(evaluation.blockers.includes("direct_pair_policy_not_immutable:direct-pair:test:mutable"));
  assert.ok(evaluation.blockers.includes("direct_pair_background_networking_not_blocked:direct-pair:test"));
  assert.ok(evaluation.blockers.includes("direct_pair_both_party_confirmation_missing:direct-pair:test"));
  assert.ok(evaluation.blockers.includes("direct_pair_privacy_grant_missing:direct-pair:test"));
  assert.ok(
    evaluation.blockers.includes(
      "direct_pair_user_safety_not_non_blocking:direct-pair:test:under_review",
    ),
  );
  assert.ok(evaluation.blockers.includes("direct_pair_matching_clearing_run_missing:direct-pair:test"));
  assert.ok(evaluation.blockers.includes("direct_pair_state_not_confirmed_or_locked:direct-pair:test:invited"));
  assert.ok(
    evaluation.blockers.includes(
      "direct_pair_ordinary_gate_status_not_passed:direct-pair:test:under_review",
    ),
  );
  assert.ok(evaluation.blockers.includes("direct_pair_reviewer_decision_missing:direct-pair:test"));
  assert.ok(evaluation.blockers.includes("direct_pair_autonomous_outreach_attempted:direct-pair:test"));
});

test("inactive direct-pair stage passes only when private direct-pair details do not leak", () => {
  const clean = evaluateMoralTradeDirectPairClearing({
    transition: "direct_pair_preview",
    directPairRequired: false,
    checkedAt: "2026-06-12T00:00:00.000Z",
    records: [],
  });
  const leaking = evaluateMoralTradeDirectPairClearing({
    transition: "direct_pair_preview",
    directPairRequired: false,
    checkedAt: "2026-06-12T00:00:00.000Z",
    records: [
      directPairRecord({
        publicCounterpartyIdentity: true,
        publicDirectContactDetails: true,
        publicPrivateSurplus: true,
      }),
    ],
  });

  assert.equal(clean.status, "pass");
  assert.equal(leaking.status, "blocked");
  assert.ok(leaking.blockers.includes("direct_pair_counterparty_identity_public:direct-pair:test"));
  assert.ok(leaking.blockers.includes("direct_pair_contact_details_public:direct-pair:test"));
  assert.ok(leaking.blockers.includes("direct_pair_private_surplus_public:direct-pair:test"));
});

test("direct-pair clearing route exposes only public contract metadata", async () => {
  const response = await getDirectPairContract(
    new Request("http://localhost/api/moral-trade/direct-pair-clearing/contract"),
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.ok, true);
  assert.equal(body.validation.status, "pass");
  assert.ok(body.publicContract.firstClassRecordTables.includes("moral_trade_direct_pair_clearing_records"));
  assert.ok(body.publicContract.allowedLaunchTradeTypes.includes("donation_offset"));
  assert.match(body.publicContract.noAutonomousOutreachRule, /known counterparty/i);
  assert.match(body.publicContract.privacyBoundary, /exact caps/i);
});

test("direct-pair clearing contract is wired through route, health, spec, API profile, and schema", () => {
  const route = readFileSync(
    "src/app/api/moral-trade/direct-pair-clearing/contract/route.ts",
    "utf8",
  );
  const health = readFileSync("src/app/api/moral-trade/health/route.ts", "utf8");
  const spec = readFileSync("src/app/moral-trade/technical-spec/page.tsx", "utf8");
  const apiProfile = readFileSync("config/moral-trade/api-contract-profile.json", "utf8");
  const migration = readFileSync(
    "supabase/migrations/20260612_moral_trade_direct_pair_clearing_records.sql",
    "utf8",
  );
  const schema = readFileSync("supabase/schema.sql", "utf8");
  const databaseTypes = readFileSync("src/lib/supabase/database.types.ts", "utf8");

  assert.match(route, /getMoralTradeDirectPairClearingContract/);
  assert.match(health, /directPairClearingValidation/);
  assert.match(spec, /\/api\/moral-trade\/direct-pair-clearing\/contract/);
  assert.match(apiProfile, /direct_pair_clearing_contract_response/);
  assert.match(apiProfile, /moral_trade_direct_pair_clearing_contract/);
  assert.match(migration, /moral_trade_direct_pair_clearing_records/);
  assert.match(migration, /direct_pair_clearing/);
  assert.match(schema, /moral_trade_direct_pair_clearing_records/);
  assert.match(schema, /direct_pair_clearing/);
  assert.match(databaseTypes, /moral_trade_direct_pair_clearing_records/);
  assert.match(databaseTypes, /direct_pair_clearing/);
});
