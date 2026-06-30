import assert from "node:assert/strict";
import test from "node:test";

import {
  MPGF_CRECM_DEFAULT_COPY_TERMINOLOGY_MAP,
  MPGF_CRECM_FINAL_REVIEW_REQUIRED_DISCLOSURES,
  MPGF_CRECM_PLAIN_LANGUAGE_COPY_MAP,
  MPGF_CRECM_REQUIRED_COPY_VALIDATION_SURFACE_KINDS,
  MPGF_CRECM_REQUIRED_FINAL_REVIEW_DISCLOSURE_KEYS,
  MPGF_CRECM_REQUIRED_PLAIN_LANGUAGE_COPY_LABELS,
  MPGF_CRECM_COPY_VALIDATION_POLICY,
  validateMpgfCrecCopyAgainstRecordedState,
  validateMpgfCrecPlainLanguageCopyMap,
  validateMpgfCrecPublishedCopyBundle,
  type MpgfCrecRecordedStateForCopy,
} from "./public-goods-crecm-copy";

function recordedState(
  overrides: Partial<MpgfCrecRecordedStateForCopy> = {},
): MpgfCrecRecordedStateForCopy {
  return {
    paymentCaptureAllowed: false,
    postClearPaymentAuthorizationRecorded: false,
    escrowClaimAllowed: false,
    custodyState: "awaiting_partner_or_fiscal_host_custody_confirmation",
    baseMatchPoolBacked: false,
    bonusMatchPoolBacked: false,
    successRewardPoolFullyBacked: false,
    coordinationCreditsEnabledForCapturedRows: true,
    impactCertificatesEnabledForCapturedRows: true,
    capturedContributionRowsAvailable: false,
    impactOutcomeClaimAllowed: false,
    donationInsuranceClaimAllowed: false,
    ...overrides,
  };
}

test("CRECM copy validation allows payment and custody disclaimers", () => {
  const result = validateMpgfCrecCopyAgainstRecordedState(
    {
      surface: "common-ground-budget-review",
      text:
        "No charge now; saved payment methods or JIT authorizations are not legal escrow, are not custody-backed, and are not payment protection.",
    },
    recordedState(),
  );

  assert.equal(result.ok, true);
  assert.equal(result.policy, MPGF_CRECM_COPY_VALIDATION_POLICY);
  assert.deepEqual(result.blockers, []);
});

test("CRECM copy validation blocks positive claims without recorded state", () => {
  const result = validateMpgfCrecCopyAgainstRecordedState(
    {
      surface: "public-round-page",
      text:
        "We charged your card now, authorized budget is ready, funds are held in escrow, base match guaranteed, matching is guaranteed, success reward, coordination credit issued, impact certificate issued, and guaranteed impact.",
    },
    recordedState(),
  );

  assert.equal(result.ok, false);
  assert.deepEqual(result.blockers, [
    "copy_claims_payment_capture_without_recorded_payment_state",
    "copy_uses_authorized_budget_without_recorded_authorization_state",
    "copy_claims_escrow_or_custody_without_recorded_approval",
    "copy_claims_matching_without_recorded_pool_backing",
    "copy_claims_reward_without_fully_backed_success_reward_pool",
    "copy_claims_coordination_credit_without_captured_contribution_row",
    "copy_claims_impact_certificate_without_captured_contribution_row",
    "copy_claims_impact_or_effectiveness_without_recorded_proof_state",
  ]);
});

test("CRECM copy bundle validation reports blocked surfaces and state hash", () => {
  const bundle = validateMpgfCrecPublishedCopyBundle(
    [
      {
        surface: "safe-review-copy",
        text: "No charge now; this page is not escrow and does not guarantee outcomes.",
      },
      {
        surface: "unsafe-benefits-copy",
        text: "Guaranteed reward, coordination credit issued, and impact certificate issued.",
      },
    ],
    recordedState(),
  );

  assert.equal(bundle.ok, false);
  assert.equal(bundle.policy, MPGF_CRECM_COPY_VALIDATION_POLICY);
  assert.deepEqual(bundle.terminologyMap, MPGF_CRECM_DEFAULT_COPY_TERMINOLOGY_MAP);
  assert.equal(bundle.plainLanguageCopyMap.ok, true);
  assert.deepEqual(bundle.requiredSurfaceKinds, MPGF_CRECM_REQUIRED_COPY_VALIDATION_SURFACE_KINDS);
  assert.deepEqual(bundle.surfaceKinds, ["primary_ui"]);
  assert.deepEqual(bundle.missingRequiredSurfaceKinds, [
    "email",
    "receipt",
    "public_page",
    "audit_adjacent_summary",
  ]);
  assert.match(bundle.stateHash, /^sha256:/);
  assert.equal(bundle.surfaceCount, 2);
  assert.equal(bundle.blockedSurfaceCount, 1);
  assert.ok(
    bundle.blockers.includes(
      "unsafe-benefits-copy:copy_claims_reward_without_fully_backed_success_reward_pool",
    ),
  );
  assert.ok(
    bundle.blockers.includes(
      "unsafe-benefits-copy:copy_claims_coordination_credit_without_captured_contribution_row",
    ),
  );
  assert.ok(
    bundle.blockers.includes(
      "unsafe-benefits-copy:copy_claims_impact_certificate_without_captured_contribution_row",
    ),
  );
  assert.ok(
    bundle.blockers.includes("copy_validation_missing_required_publication_surface_email"),
  );
});

test("CRECM copy bundle validation requires all publication surface kinds", () => {
  const bundle = validateMpgfCrecPublishedCopyBundle(
    [
      {
        surface: "primary-review",
        surfaceKind: "primary_ui",
        text: "No charge now; this page is not legal escrow and is not custody-backed.",
      },
      {
        surface: "participant-email",
        surfaceKind: "email",
        text: "Your Common Ground Budget preview was saved; no money was charged or held.",
      },
      {
        surface: "contribution-receipt",
        surfaceKind: "receipt",
        text: "Receipt fields keep gross, fee, net recipient, match, reward, credit, and certificate records separate.",
      },
      {
        surface: "public-goods-entry-page",
        surfaceKind: "public_page",
        text: "Public Goods Fund pages explain matching without guaranteeing matching, impact, outcomes, escrow, custody, or payment protection.",
      },
      {
        surface: "final-audit-summary",
        surfaceKind: "audit_adjacent_summary",
        text: "Audit summaries report recorded payment and matching fields without guaranteeing outcomes.",
      },
    ],
    recordedState(),
  );

  assert.equal(bundle.ok, true);
  assert.deepEqual(bundle.requiredSurfaceKinds, MPGF_CRECM_REQUIRED_COPY_VALIDATION_SURFACE_KINDS);
  assert.deepEqual(bundle.surfaceKinds, [
    "primary_ui",
    "email",
    "receipt",
    "public_page",
    "audit_adjacent_summary",
  ]);
  assert.deepEqual(bundle.missingRequiredSurfaceKinds, []);
  assert.deepEqual(bundle.blockers, []);
});

test("CRECM plain-language copy map exposes every required canonical label", () => {
  const validation = validateMpgfCrecPlainLanguageCopyMap();
  const labels = MPGF_CRECM_PLAIN_LANGUAGE_COPY_MAP.map((entry) => entry.defaultUiText);

  assert.equal(validation.ok, true);
  assert.deepEqual(validation.requiredLabels, MPGF_CRECM_REQUIRED_PLAIN_LANGUAGE_COPY_LABELS);
  assert.deepEqual(labels, [
    "Maximum this round",
    "Maximum for this project",
    "Fund this",
    "Fund if different-view support joins",
    "Needs review",
    "Skip",
    "Condition",
    "Sent to project",
    "Counts for matching",
    "Sponsor added",
    "Contributor benefit",
  ]);
  assert.equal(
    validation.rows.find((row) => row.defaultUiText === "Maximum this round")?.canonicalMeaning,
    "CommonGroundBudget.totalBudgetCents",
  );
  assert.equal(
    validation.rows.find((row) => row.defaultUiText === "Fund if different-view support joins")?.canonicalValue,
    "weak",
  );
  assert.equal(
    validation.rows.find((row) => row.defaultUiText === "Counts for matching")?.canonicalField,
    "matchEligibleContributionCents",
  );
  assert.equal(validation.rows.every((row) => row.createsAlternateSemantics === false), true);
});

test("CRECM final review disclosure contract covers every simplified-UX required item", () => {
  assert.deepEqual(MPGF_CRECM_REQUIRED_FINAL_REVIEW_DISCLOSURE_KEYS, [
    "binding_project_caps",
    "cross_view_conditions",
    "counterpart_buckets",
    "fallback_rule",
    "payment_language",
    "fee_treatment",
    "reward_credit_certificate_opt_ins",
    "self_matching_exclusions",
    "sealed_progress_disclosure",
    "failure_bonus_denial_categories",
  ]);
  assert.deepEqual(
    MPGF_CRECM_FINAL_REVIEW_REQUIRED_DISCLOSURES.map((entry) => entry.label),
    [
      "Binding caps",
      "Cross-view conditions",
      "Counterpart buckets",
      "Fallback rule",
      "Payment language",
      "Fee treatment",
      "Reward, credit, and certificate opt-ins",
      "Self-matching exclusions",
      "Sealed-progress behavior",
      "Failure-bonus denial categories",
    ],
  );
  assert.equal(MPGF_CRECM_FINAL_REVIEW_REQUIRED_DISCLOSURES.length, 10);
  assert.equal(
    MPGF_CRECM_FINAL_REVIEW_REQUIRED_DISCLOSURES.every(
      (entry) =>
        entry.finalReviewRequired === true &&
        entry.createsAlternateSemantics === false &&
        entry.canonicalRecords.length > 0 &&
        entry.canonicalFields.length > 0,
    ),
    true,
  );
  assert.deepEqual(
    MPGF_CRECM_FINAL_REVIEW_REQUIRED_DISCLOSURES.map((entry) => entry.specRequirement),
    [
      "binding project caps",
      "explicit cross-view conditional pledge constraints",
      "counterparty buckets",
      "fallback rules",
      "payment language",
      "fee treatment",
      "reward/credit/certificate opt-ins",
      "self-matching exclusions",
      "sealed-progress disclosure",
      "failure-bonus denial categories",
    ],
  );
});

test("CRECM plain-language copy map rejects missing, duplicate, or alternate-semantics rows", () => {
  const duplicateAndMissing = [
    ...MPGF_CRECM_PLAIN_LANGUAGE_COPY_MAP.filter((row) => row.defaultUiText !== "Condition"),
    {
      ...MPGF_CRECM_PLAIN_LANGUAGE_COPY_MAP[0],
      createsAlternateSemantics: true,
    },
  ];
  const validation = validateMpgfCrecPlainLanguageCopyMap(duplicateAndMissing);

  assert.equal(validation.ok, false);
  assert.ok(validation.blockers.includes("plain_copy_map_missing_condition"));
  assert.ok(validation.blockers.includes("plain_copy_map_duplicate_maximum_this_round"));
  assert.ok(validation.blockers.includes("plain_copy_map_alternate_semantics_maximum_this_round"));
});

test("CRECM copy validation treats negated matching and impact guarantees as safe disclaimers", () => {
  const result = validateMpgfCrecCopyAgainstRecordedState(
    {
      surface: "public-goods-entry-page",
      text:
        "The Public Goods Fund explains maximum budget records without guaranteeing matching, impact, outcomes, effectiveness, escrow, custody, or payment protection. Maximum budget is not an authorization.",
    },
    recordedState(),
  );

  assert.equal(result.ok, true);
  assert.deepEqual(result.blockers, []);
});

test("CRECM copy validation allows impact claims only with recorded proof state", () => {
  const unsafe = validateMpgfCrecCopyAgainstRecordedState(
    {
      surface: "receipt",
      text: "Certified impact and effectiveness are guaranteed.",
    },
    recordedState(),
  );
  const recorded = validateMpgfCrecCopyAgainstRecordedState(
    {
      surface: "receipt",
      text: "Certified impact and effectiveness are guaranteed.",
    },
    recordedState({
      capturedContributionRowsAvailable: true,
      impactOutcomeClaimAllowed: true,
      impactCertificatesEnabledForCapturedRows: true,
    }),
  );

  assert.equal(unsafe.ok, false);
  assert.deepEqual(unsafe.blockers, [
    "copy_claims_impact_certificate_without_captured_contribution_row",
    "copy_claims_impact_or_effectiveness_without_recorded_proof_state",
  ]);
  assert.equal(recorded.ok, true);
});

test("CRECM copy validation allows authorized-budget language only after recorded authorization", () => {
  const unsafe = validateMpgfCrecCopyAgainstRecordedState(
    {
      surface: "contribution-state",
      text: "Your authorized budget is ready.",
    },
    recordedState(),
  );
  const recorded = validateMpgfCrecCopyAgainstRecordedState(
    {
      surface: "post-clear-payment-receipt",
      text: "Your authorized budget is ready.",
    },
    recordedState({ postClearPaymentAuthorizationRecorded: true }),
  );

  assert.equal(unsafe.ok, false);
  assert.deepEqual(unsafe.blockers, [
    "copy_uses_authorized_budget_without_recorded_authorization_state",
  ]);
  assert.equal(recorded.ok, true);
  assert.deepEqual(recorded.blockers, []);
});

test("CRECM copy validation blocks the full default-copy forbidden terminology map", () => {
  const result = validateMpgfCrecCopyAgainstRecordedState(
    {
      surface: "default-copy-style-guide",
      text:
        "Funds held, matched impact, and insured donation language are available on this public page.",
    },
    recordedState(),
  );

  assert.equal(result.ok, false);
  assert.deepEqual(result.blockers, [
    "copy_claims_escrow_or_custody_without_recorded_approval",
    "copy_claims_matched_impact_without_recorded_matching_and_impact_state",
    "copy_claims_insured_donation_without_recorded_insurance_state",
  ]);
  assert.equal(
    MPGF_CRECM_DEFAULT_COPY_TERMINOLOGY_MAP.some((entry) => entry.term === "matched impact"),
    true,
  );
  assert.equal(
    MPGF_CRECM_DEFAULT_COPY_TERMINOLOGY_MAP.some((entry) => entry.term === "insured donation"),
    true,
  );
});

test("CRECM copy validation allows matched-impact and insured-donation terms only with recorded state", () => {
  const recorded = validateMpgfCrecCopyAgainstRecordedState(
    {
      surface: "final-audit-summary",
      text:
        "Matched impact and insured donation terms are shown in this recorded final audit summary.",
    },
    recordedState({
      baseMatchPoolBacked: true,
      bonusMatchPoolBacked: true,
      impactOutcomeClaimAllowed: true,
      donationInsuranceClaimAllowed: true,
    }),
  );

  assert.equal(recorded.ok, true);
  assert.deepEqual(recorded.blockers, []);
});
