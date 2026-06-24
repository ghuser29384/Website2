import assert from "node:assert/strict";
import test from "node:test";

import {
  MPGF_CRECM_COPY_VALIDATION_POLICY,
  validateMpgfCrecCopyAgainstRecordedState,
  validateMpgfCrecPublishedCopyBundle,
  type MpgfCrecRecordedStateForCopy,
} from "./public-goods-crecm-copy";

function recordedState(
  overrides: Partial<MpgfCrecRecordedStateForCopy> = {},
): MpgfCrecRecordedStateForCopy {
  return {
    paymentCaptureAllowed: false,
    escrowClaimAllowed: false,
    custodyState: "awaiting_partner_or_fiscal_host_custody_confirmation",
    baseMatchPoolBacked: false,
    bonusMatchPoolBacked: false,
    successRewardPoolFullyBacked: false,
    coordinationCreditsEnabledForCapturedRows: true,
    impactCertificatesEnabledForCapturedRows: true,
    capturedContributionRowsAvailable: false,
    ...overrides,
  };
}

test("CRECM copy validation allows payment and custody disclaimers", () => {
  const result = validateMpgfCrecCopyAgainstRecordedState(
    {
      surface: "common-ground-budget-review",
      text:
        "No charge now; saved payment methods or JIT authorizations are not escrow, custody, funds held, or payment protection.",
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
        "We charged your card now, funds are held in escrow, matching is guaranteed, success reward, coordination credit issued, and impact certificate issued.",
    },
    recordedState(),
  );

  assert.equal(result.ok, false);
  assert.deepEqual(result.blockers, [
    "copy_claims_payment_capture_without_recorded_payment_state",
    "copy_claims_escrow_or_custody_without_recorded_approval",
    "copy_claims_matching_without_recorded_pool_backing",
    "copy_claims_reward_without_fully_backed_success_reward_pool",
    "copy_claims_coordination_credit_without_captured_contribution_row",
    "copy_claims_impact_certificate_without_captured_contribution_row",
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
  assert.match(bundle.stateHash, /^sha256:/);
  assert.equal(bundle.surfaceCount, 2);
  assert.equal(bundle.blockedSurfaceCount, 1);
  assert.deepEqual(bundle.blockers, [
    "unsafe-benefits-copy:copy_claims_reward_without_fully_backed_success_reward_pool",
    "unsafe-benefits-copy:copy_claims_coordination_credit_without_captured_contribution_row",
    "unsafe-benefits-copy:copy_claims_impact_certificate_without_captured_contribution_row",
  ]);
});
