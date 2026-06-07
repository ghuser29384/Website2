import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import {
  evaluateMoralTradeAgreementAmendment,
  getMoralTradeAgreementAmendmentContract,
  validateMoralTradeAgreementAmendmentContract,
  type MoralTradeAgreementAmendmentPolicyRecord,
  type MoralTradeAgreementAmendmentRecord,
} from "@/lib/moral-trade/agreement-amendments";

function readRepoFile(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

function policy(
  overrides: Partial<MoralTradeAgreementAmendmentPolicyRecord> = {},
): MoralTradeAgreementAmendmentPolicyRecord {
  return {
    policyId: "agreement-amendment-policy-offset-correction",
    subjectType: "locked_donation_offset",
    amendmentType: "correction",
    status: "passed",
    renewedConfirmationRequired: true,
    neutralReviewRequiredForBurdenShift: true,
    nonRetroactivityRequired: true,
    beforeAfterHashRequired: true,
    noticeRequired: true,
    reviewerQualityRequired: true,
    baselineIntegrityRequired: true,
    policyHash:
      "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    reviewedAt: "2026-06-01T00:00:00.000Z",
    supersededBy: null,
    maxAmendmentAgeDays: 45,
    ...overrides,
  };
}

function amendment(
  overrides: Partial<MoralTradeAgreementAmendmentRecord> = {},
): MoralTradeAgreementAmendmentRecord {
  return {
    amendmentId: "agreement-amendment-offset-correction",
    policyRef: "agreement-amendment-policy-offset-correction",
    subjectType: "locked_donation_offset",
    subjectRef: "locked-offset:sample",
    amendmentType: "correction",
    amendmentState: "approved",
    materialChange: true,
    burdenOrBenefitShift: false,
    parentRecordEditDetected: false,
    retroactivePerformanceChange: false,
    evidenceClaimRetyped: false,
    exposureIncreased: false,
    fundsRedirected: false,
    compensationChanged: false,
    cancellationRightsNarrowed: false,
    privacyDisclosureChanged: false,
    donorOfRecordChanged: false,
    thirdPartyObligationChanged: false,
    beforeTermsHash:
      "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    afterTermsHash:
      "sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
    policySnapshotBundleHash:
      "sha256:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
    renewedConfirmationRefs: [
      "participant-confirmation:affected-a",
      "participant-confirmation:affected-b",
    ],
    confirmationState: "passed",
    neutralReviewStatus: "not_required_for_stage",
    noticeStatus: "passed",
    reviewerQualityStatus: "passed",
    baselineIntegrityStatus: "passed",
    amendmentHash:
      "sha256:eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
    reviewedAt: "2026-06-01T00:00:00.000Z",
    expiresAt: "2026-06-20T00:00:00.000Z",
    appliedAt: null,
    supersededBy: null,
    ...overrides,
  };
}

test("agreement-amendment contract validates first-class append-only records", () => {
  const contract = getMoralTradeAgreementAmendmentContract();
  const validation = validateMoralTradeAgreementAmendmentContract(contract);

  assert.equal(validation.status, "pass");
  assert.ok(
    contract.firstClassRecordTables.includes(
      "moral_trade_agreement_amendment_policies",
    ),
  );
  assert.ok(
    contract.firstClassRecordTables.includes(
      "moral_trade_agreement_amendment_records",
    ),
  );
  assert.ok(contract.policySnapshotSubjects.includes("agreement_amendment"));
  assert.ok(contract.transitions.includes("donation_offset_material_change"));
  assert.ok(contract.transitions.includes("pledge_swap_material_change"));
  assert.ok(contract.subjectTypes.includes("locked_donation_offset"));
  assert.ok(contract.subjectTypes.includes("locked_pledge_swap"));
  assert.ok(contract.amendmentTypes.includes("compensation_change"));
  assert.ok(contract.amendmentStates.includes("approved"));
  assert.ok(contract.failClosedStatuses.includes("parent_record_edit_detected"));
  assert.ok(contract.failClosedStatuses.includes("renewed_confirmation_missing"));
  assert.ok(contract.failClosedStatuses.includes("neutral_review_missing"));
  assert.match(contract.failClosedRule, /Parent-record edits are not amendments/i);
});

test("missing policy and amendment fail closed before material change", () => {
  const evaluation = evaluateMoralTradeAgreementAmendment({
    transition: "donation_offset_material_change",
    subjectType: "locked_donation_offset",
    amendmentType: "correction",
    requiresAmendment: true,
    requiresAppliedAmendment: false,
    requiresRelianceBearingTransition: false,
    requiresRenewedConfirmations: true,
    requiresNeutralReview: false,
    checkedAt: "2026-06-02T00:00:00.000Z",
    policies: [],
    amendments: [],
  });

  assert.equal(evaluation.status, "blocked");
  assert.ok(evaluation.blockers.includes("policy_missing:correction"));
  assert.ok(
    evaluation.blockers.includes(
      "amendment_missing:donation_offset_material_change",
    ),
  );
});

test("parent edits, retroactive changes, and retyped evidence block amendments", () => {
  const blocked = evaluateMoralTradeAgreementAmendment({
    transition: "pledge_swap_material_change",
    subjectType: "locked_pledge_swap",
    amendmentType: "compensation_change",
    requiresAmendment: true,
    requiresAppliedAmendment: false,
    requiresRelianceBearingTransition: true,
    requiresRenewedConfirmations: true,
    requiresNeutralReview: true,
    checkedAt: "2026-06-02T00:00:00.000Z",
    policies: [
      policy({
        policyId: "agreement-amendment-policy-pledge-compensation",
        subjectType: "locked_pledge_swap",
        amendmentType: "compensation_change",
      }),
    ],
    amendments: [
      amendment({
        amendmentId: "agreement-amendment-pledge-compensation",
        policyRef: "agreement-amendment-policy-pledge-compensation",
        subjectType: "locked_pledge_swap",
        amendmentType: "compensation_change",
        amendmentState: "presented",
        burdenOrBenefitShift: true,
        parentRecordEditDetected: true,
        retroactivePerformanceChange: true,
        evidenceClaimRetyped: true,
        exposureIncreased: true,
        fundsRedirected: true,
        compensationChanged: true,
        cancellationRightsNarrowed: true,
        privacyDisclosureChanged: true,
        donorOfRecordChanged: true,
        thirdPartyObligationChanged: true,
        beforeTermsHash: null,
        afterTermsHash: null,
        policySnapshotBundleHash: null,
        renewedConfirmationRefs: [],
        confirmationState: "missing",
        neutralReviewStatus: "missing",
        noticeStatus: "missing",
        reviewerQualityStatus: "under_review",
        baselineIntegrityStatus: "missing",
        amendmentHash: "invalid-hash",
      }),
    ],
  });

  assert.equal(blocked.status, "blocked");
  assert.ok(
    blocked.blockers.includes(
      "amendment_unconfirmed:agreement-amendment-pledge-compensation",
    ),
  );
  assert.ok(
    blocked.blockers.includes(
      "amendment_not_approved:agreement-amendment-pledge-compensation",
    ),
  );
  assert.ok(
    blocked.blockers.includes(
      "parent_record_edit_detected:agreement-amendment-pledge-compensation",
    ),
  );
  assert.ok(
    blocked.blockers.includes(
      "retroactive_performance_change:agreement-amendment-pledge-compensation",
    ),
  );
  assert.ok(
    blocked.blockers.includes(
      "evidence_claim_retyped:agreement-amendment-pledge-compensation",
    ),
  );
  assert.ok(
    blocked.blockers.includes(
      "renewed_confirmation_missing:agreement-amendment-pledge-compensation",
    ),
  );
  assert.ok(
    blocked.blockers.includes(
      "exposure_increase_without_confirmation:agreement-amendment-pledge-compensation",
    ),
  );
  assert.ok(
    blocked.blockers.includes(
      "funds_redirect_without_confirmation:agreement-amendment-pledge-compensation",
    ),
  );
  assert.ok(
    blocked.blockers.includes(
      "compensation_change_without_confirmation:agreement-amendment-pledge-compensation",
    ),
  );
  assert.ok(
    blocked.blockers.includes(
      "cancellation_rights_narrowed:agreement-amendment-pledge-compensation",
    ),
  );
  assert.ok(
    blocked.blockers.includes(
      "privacy_change_without_confirmation:agreement-amendment-pledge-compensation",
    ),
  );
  assert.ok(
    blocked.blockers.includes(
      "donor_of_record_change_without_confirmation:agreement-amendment-pledge-compensation",
    ),
  );
  assert.ok(
    blocked.blockers.includes(
      "third_party_obligation_change_without_confirmation:agreement-amendment-pledge-compensation",
    ),
  );
  assert.ok(
    blocked.blockers.includes(
      "neutral_review_missing:agreement-amendment-pledge-compensation",
    ),
  );
  assert.ok(
    blocked.blockers.includes(
      "notice_missing:agreement-amendment-pledge-compensation",
    ),
  );
  assert.ok(
    blocked.blockers.includes(
      "reviewer_quality_missing:agreement-amendment-pledge-compensation",
    ),
  );
  assert.ok(
    blocked.blockers.includes(
      "baseline_integrity_missing:agreement-amendment-pledge-compensation",
    ),
  );
  assert.ok(
    blocked.blockers.includes(
      "before_terms_hash_missing:agreement-amendment-pledge-compensation",
    ),
  );
  assert.ok(
    blocked.blockers.includes(
      "after_terms_hash_missing:agreement-amendment-pledge-compensation",
    ),
  );
  assert.ok(
    blocked.blockers.includes(
      "policy_snapshot_bundle_missing:agreement-amendment-pledge-compensation",
    ),
  );
  assert.ok(
    blocked.blockers.includes(
      "invalid_amendment_hash:agreement-amendment-pledge-compensation",
    ),
  );
});

test("approved append-only amendment with renewed confirmations can pass", () => {
  const passed = evaluateMoralTradeAgreementAmendment({
    transition: "post_lock_correction",
    subjectType: "locked_donation_offset",
    amendmentType: "correction",
    requiresAmendment: true,
    requiresAppliedAmendment: false,
    requiresRelianceBearingTransition: false,
    requiresRenewedConfirmations: true,
    requiresNeutralReview: false,
    checkedAt: "2026-06-02T00:00:00.000Z",
    policies: [policy()],
    amendments: [amendment()],
  });

  assert.equal(passed.status, "pass");
  assert.deepEqual(passed.blockers, []);
});

test("agreement-amendment route, health, spec, API contract, and schema are wired", () => {
  const source = readRepoFile("src/lib/moral-trade/agreement-amendments.ts");
  const route = readRepoFile(
    "src/app/api/moral-trade/agreement-amendments/contract/route.ts",
  );
  const healthRoute = readRepoFile("src/app/api/moral-trade/health/route.ts");
  const technicalSpec = readRepoFile("src/app/moral-trade/technical-spec/page.tsx");
  const apiContractSource = readRepoFile("src/lib/moral-trade/api-contract.ts");
  const apiContractProfile = readRepoFile("config/moral-trade/api-contract-profile.json");
  const migration = readRepoFile(
    "supabase/migrations/20260607_zzzzzzzzzzzzz_moral_trade_agreement_amendment_records.sql",
  );
  const schema = readRepoFile("supabase/schema.sql");
  const databaseTypes = readRepoFile("src/lib/supabase/database.types.ts");

  assert.match(source, /getMoralTradeAgreementAmendmentContract/);
  assert.match(source, /evaluateMoralTradeAgreementAmendment/);
  assert.match(source, /Parent-record edits are not amendments/);
  assert.match(route, /public_contract_read/);
  assert.match(route, /agreementAmendmentSampleEvaluationStatuses/);
  assert.match(healthRoute, /agreementAmendmentValidation/);
  assert.match(healthRoute, /agreementAmendmentTransitionKeys/);
  assert.match(technicalSpec, /Agreement-amendment contract/);
  assert.match(technicalSpec, /Open agreement-amendment JSON/);
  assert.match(apiContractSource, /moral_trade_agreement_amendment_contract/);
  assert.match(apiContractProfile, /agreement_amendment_contract_response/);
  assert.match(apiContractProfile, /moral_trade_agreement_amendment_contract/);
  assert.match(migration, /moral_trade_agreement_amendment_policies/);
  assert.match(migration, /moral_trade_agreement_amendment_records/);
  assert.match(migration, /agreement_amendment/);
  assert.match(migration, /parent_record_edit_detected_bool/);
  assert.match(schema, /moral_trade_agreement_amendment_policies/);
  assert.match(schema, /moral_trade_agreement_amendment_records/);
  assert.match(schema, /agreement_amendment/);
  assert.match(databaseTypes, /moral_trade_agreement_amendment_policies/);
  assert.match(databaseTypes, /moral_trade_agreement_amendment_records/);
});
