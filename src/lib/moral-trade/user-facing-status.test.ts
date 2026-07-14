import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import { GET as userFacingStatusContractRoute } from "@/app/api/moral-trade/user-facing-status/contract/route";

import {
  evaluateMoralTradeUserFacingStatus,
  getMoralTradeUserFacingStatusContract,
  validateMoralTradeUserFacingStatusContract,
  type MoralTradeUserFacingStatusRecord,
  type MoralTradeUserFacingStatusSubjectType,
} from "./user-facing-status";

function readRepoFile(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

function fullDisclosures() {
  return {
    evidenceBurdenShown: true,
    failureRefundBehaviorShown: true,
    maximumExposureShown: true,
    noTradeComparisonShown: true,
    privacyChangeShown: true,
    remainingUncertaintyShown: true,
  };
}

function record(
  subjectType: MoralTradeUserFacingStatusSubjectType,
  overrides: Partial<MoralTradeUserFacingStatusRecord> = {},
): MoralTradeUserFacingStatusRecord {
  return {
    appealPath: null,
    correctionPath: null,
    detailsDrawerAvailable: true,
    forbiddenTermsPresent: [],
    keyFacts: [
      "No money can move from this status.",
      "Private evidence is summarized without counterparty identity.",
    ],
    materialDisclosures: fullDisclosures(),
    moneyEffect: "none",
    nextAction: "Review the preview and choose whether to continue.",
    obligationEffect: "draft_only",
    policySnapshotStatus: "resolved_immutable",
    privateDetailsRedacted: true,
    safeReasonCategory: "Ready for preview",
    sourceControlRefs: [`control:${subjectType}`],
    status: "ready_to_preview",
    statusPolicyRef: "user-facing-status-policy:v0.1",
    statusRecordRef: `user-facing-status:${subjectType}`,
    subjectRef: `${subjectType}:sample`,
    subjectType,
    summary: "This item is ready for a non-binding preview.",
    ...overrides,
  };
}

test("moraltrade82 user-facing status contract validates first-class records and public vocabulary", () => {
  const contract = getMoralTradeUserFacingStatusContract();
  const validation = validateMoralTradeUserFacingStatusContract(contract);

  assert.equal(validation.status, "pass");
  assert.deepEqual(validation.blockers, []);
  assert.ok(contract.firstClassRecordTables.includes("moral_trade_user_facing_status_policies"));
  assert.ok(contract.firstClassRecordTables.includes("moral_trade_user_facing_status_records"));
  assert.ok(contract.allowedStatuses.includes("payment_not_authorized"));
  assert.ok(contract.allowedStatuses.includes("blocked_safety_legal_privacy"));
  assert.ok(contract.moneyEffects.includes("authorization_blocked"));
  assert.ok(contract.obligationEffects.includes("locked_but_not_releasable"));
  assert.ok(contract.policySnapshotSubjects.includes("user_facing_status"));
  assert.ok(contract.releaseGateTestHooks.includes("plain_language_copy_contract_test"));
  assert.ok(contract.releaseGateTestHooks.includes("participant_task_card_simplification_test"));
  assert.match(contract.plainLanguageRule, /internal control codes/i);
  assert.match(contract.materialDisclosureRule, /maximum exposure/i);
  assert.match(contract.materialDisclosureRule, /remaining uncertainty/i);
});

test("required participant-facing status subjects can pass together", () => {
  const evaluation = evaluateMoralTradeUserFacingStatus({
    checkedAt: "2026-06-30T09:00:00.000Z",
    records: [
      record("offset_offer"),
      record("pledge_swap_offer"),
      record("cleared_trade_agreement"),
      record("payout_milestone", {
        appealPath: "/dashboard/payouts/test/appeal",
        correctionPath: "/dashboard/payouts/test/correct",
        moneyEffect: "captured_not_releasable",
        nextAction: "Wait for the scheduled payout review or request a correction.",
        obligationEffect: "locked_but_not_releasable",
        safeReasonCategory: "Payout not releasable yet",
        status: "payout_not_releasable_yet",
        summary: "The payout is locked but not yet releasable.",
      }),
      record("evidence_record"),
      record("dispute_case", {
        appealPath: "/dashboard/disputes/test/appeal",
        correctionPath: "/dashboard/disputes/test/correct",
        nextAction: "Upload the missing non-private evidence or appeal the review.",
        safeReasonCategory: "Waiting for review",
        status: "waiting_for_review",
        summary: "This dispute is waiting for neutral review.",
      }),
      record("payment_event", {
        appealPath: "/dashboard/payments/test/appeal",
        correctionPath: "/dashboard/payments/test/correct",
        moneyEffect: "authorization_pending",
        nextAction: "Confirm the payment authorization before any capture can be considered.",
        obligationEffect: "confirmation_required",
        safeReasonCategory: "Needs your confirmation",
        status: "needs_your_confirmation",
        summary: "Payment authorization still needs your confirmation.",
      }),
      record("privacy_grant", {
        nextAction: "Review the privacy change before continuing.",
        safeReasonCategory: "Privacy change requires confirmation",
        status: "needs_your_confirmation",
        summary: "This action changes what reviewers can see.",
      }),
    ],
  });

  assert.equal(evaluation.status, "pass");
  assert.equal(evaluation.blockedRecordCount, 0);
  assert.deepEqual(evaluation.blockers, []);
  assert.deepEqual(evaluation.coveredSubjectTypes, [
    "cleared_trade_agreement",
    "dispute_case",
    "evidence_record",
    "offset_offer",
    "payment_event",
    "payout_milestone",
    "pledge_swap_offer",
    "privacy_grant",
  ]);
});

test("blocked payment and obligation statuses fail closed without plain-language safeguards", () => {
  const evaluation = evaluateMoralTradeUserFacingStatus({
    checkedAt: "2026-06-30T09:00:00.000Z",
    records: [
      record("payment_event", {
        appealPath: null,
        correctionPath: null,
        detailsDrawerAvailable: false,
        forbiddenTermsPresent: ["reviewer_note"],
        keyFacts: [],
        materialDisclosures: {
          evidenceBurdenShown: false,
          failureRefundBehaviorShown: false,
          maximumExposureShown: false,
          noTradeComparisonShown: false,
          privacyChangeShown: false,
          remainingUncertaintyShown: false,
        },
        moneyEffect: "authorization_blocked",
        nextAction: "",
        obligationEffect: "locked_but_not_releasable",
        policySnapshotStatus: "mutable",
        privateDetailsRedacted: false,
        safeReasonCategory: "reviewer_note",
        sourceControlRefs: [],
        status: "payment_not_authorized",
        summary: "reviewer_note source_hash policy_snapshot_json",
      }),
    ],
    requiredSubjectTypes: ["payment_event"],
  });

  assert.equal(evaluation.status, "blocked");
  assert.ok(
    evaluation.blockers.includes(
      "user_facing_status_policy_not_immutable:user-facing-status:payment_event:mutable",
    ),
  );
  assert.ok(
    evaluation.blockers.includes(
      "user_facing_status_next_action_missing:user-facing-status:payment_event",
    ),
  );
  assert.ok(
    evaluation.blockers.includes(
      "user_facing_status_key_fact_count_invalid:user-facing-status:payment_event",
    ),
  );
  assert.ok(
    evaluation.blockers.includes(
      "user_facing_status_details_drawer_missing:user-facing-status:payment_event",
    ),
  );
  assert.ok(
    evaluation.blockers.includes(
      "user_facing_status_source_controls_missing:user-facing-status:payment_event",
    ),
  );
  assert.ok(
    evaluation.blockers.includes(
      "user_facing_status_private_details_unredacted:user-facing-status:payment_event",
    ),
  );
  assert.ok(
    evaluation.blockers.includes(
      "user_facing_status_forbidden_terms_present:user-facing-status:payment_event",
    ),
  );
  assert.ok(
    evaluation.blockers.some((blocker) =>
      blocker.startsWith(
        "user_facing_status_forbidden_primary_copy:user-facing-status:payment_event:",
      ),
    ),
  );
  assert.ok(
    evaluation.blockers.includes(
      "user_facing_status_correction_path_missing:user-facing-status:payment_event",
    ),
  );
  assert.ok(
    evaluation.blockers.includes(
      "user_facing_status_appeal_path_missing:user-facing-status:payment_event",
    ),
  );
  assert.ok(
    evaluation.blockers.includes(
      "user_facing_status_material_disclosure_incomplete:user-facing-status:payment_event",
    ),
  );
  assert.ok(
    evaluation.userFacingBlockerCategories.includes(
      "Status explanation would expose private or internal details",
    ),
  );
});

test("user-facing status contract route exposes safe public metadata", async () => {
  const response = await userFacingStatusContractRoute(
    new Request("http://localhost/api/moral-trade/user-facing-status/contract"),
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.ok, true);
  assert.equal(body.validation.status, "pass");
  assert.ok(
    body.publicContract.firstClassRecordTables.includes(
      "moral_trade_user_facing_status_records",
    ),
  );
  assert.ok(body.publicContract.allowedStatuses.includes("payment_not_authorized"));
  assert.ok(body.publicContract.forbiddenPrimaryCopyTerms.includes("source_hash"));
  assert.equal(body.publicContract.sampleEvaluationStatuses.sample_1.status, "pass");
  assert.equal(body.publicContract.sampleEvaluationStatuses.sample_2.status, "blocked");
  const serialized = JSON.stringify(body);
  assert.equal(serialized.includes("raw evidence"), true);
  assert.equal(serialized.includes("raw_evidence_payload"), false);
  assert.equal(serialized.includes("participant-specific status rows"), true);
});

test("user-facing status migration creates policy and record tables with fail-closed checks", () => {
  const migration = readRepoFile(
    "supabase/migrations/20260630_moral_trade_user_facing_status_records.sql",
  );

  assert.match(migration, /moral_trade_user_facing_status_policies/);
  assert.match(migration, /moral_trade_user_facing_status_records/);
  assert.match(migration, /resolved_immutable/);
  assert.match(migration, /payment_not_authorized/);
  assert.match(migration, /private_details_redacted_bool = true/);
  assert.match(migration, /details_drawer_available_bool = true/);
  assert.match(migration, /maximum_exposure_shown_bool/);
  assert.match(migration, /failure_refund_behavior_shown_bool/);
  assert.match(migration, /remaining_uncertainty_shown_bool/);
  assert.match(migration, /primary_copy_contains_internal_codes_bool = false/);
});
