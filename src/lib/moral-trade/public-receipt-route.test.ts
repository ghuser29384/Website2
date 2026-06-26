import assert from "node:assert/strict";
import test from "node:test";

import { GET as publicReceiptContractRoute } from "@/app/api/moral-trade/public-receipts/contract/route";
import { GET as verifyPublicReceiptRoute } from "@/app/api/moral-trade/public-receipts/[receiptId]/verify/route";

test("public receipt card contract route exposes safe claim-hygiene policy", async () => {
  const response = await publicReceiptContractRoute(
    new Request("http://localhost/api/moral-trade/public-receipts/contract"),
  );
  const body = await response.json();
  const serialized = JSON.stringify(body);

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  assert.equal(body.ok, true);
  assert.equal(body.validation.status, "pass");
  assert.ok(
    body.publicContract.firstClassRecordTables.includes(
      "moral_trade_public_receipt_cards",
    ),
  );
  assert.ok(
    body.publicContract.claimHygieneRules.includes(
      "trade_conditioned_wording_default",
    ),
  );
  assert.ok(
    body.publicContract.claimHygieneRules.includes(
      "publication_sidecar_only",
    ),
  );
  assert.ok(
    body.publicContract.claimHygieneRules.includes(
      "publication_gates_non_blocking_required",
    ),
  );
  assert.ok(body.publicContract.publicationGateKeys.includes("reconciliation"));
  assert.ok(body.publicContract.publicationGateKeys.includes("challenge_window"));
  assert.ok(body.publicContract.publicationGateKeys.includes("privacy_publication"));
  assert.ok(
    body.publicContract.publicationGateKeys.includes(
      "recipient_acceptance_adverse_association",
    ),
  );
  assert.ok(body.publicContract.publicationGateKeys.includes("content_moderation"));
  assert.ok(body.publicContract.publicationGateKeys.includes("public_metric_release"));
  assert.ok(body.publicContract.claimReviewKeys.includes("verified"));
  assert.ok(body.publicContract.claimReviewKeys.includes("matched"));
  assert.ok(body.publicContract.claimReviewKeys.includes("completed"));
  assert.ok(body.publicContract.claimReviewKeys.includes("impact"));
  assert.ok(
    body.publicContract.claimHygieneRules.includes(
      "direct_donation_parity_opt_in_non_preferential",
    ),
  );
  assert.ok(
    body.publicContract.claimHygieneRules.includes(
      "net_attribution_gross_reimbursement_side_benefit_and_net_lines_separated",
    ),
  );
  assert.equal(
    body.publicContract.defaultDirectDonationParityControls.preselected,
    false,
  );
  assert.equal(
    body.publicContract.defaultDirectDonationParityControls.affectsFutureMarketplaceAccess,
    false,
  );
  assert.ok(
    body.publicContract.netPersonalAttributionStates.includes(
      "verified_net_personal",
    ),
  );
  assert.ok(
    body.publicContract.netAttributionExclusionControls.includes(
      "counterpartyReimbursementsExcluded",
    ),
  );
  assert.ok(body.publicContract.sensitiveActionDisplayModes.includes("generic_action_label"));
  assert.ok(body.publicContract.sensitiveActionDisplayModes.includes("transfer_only"));
  assert.ok(body.publicContract.sensitiveActionDisplayModes.includes("exact_action_details"));
  assert.equal(
    body.publicContract.defaultPublicationControls.affectsMatchingOrReview,
    false,
  );
  assert.equal(
    body.publicContract.defaultPublicationControls.publicEngagementCounters,
    false,
  );
  assert.ok(body.publicContract.prohibitedPublicSignals.includes("leaderboards"));
  assert.ok(body.publicContract.prohibitedPublicSignals.includes("moral_scores"));
  assert.equal(
    body.publicContract.sampleEvaluationStatuses[
      "public-receipt-contract-sample-offset"
    ].status,
    "pass",
  );
  assert.equal(
    body.publicContract.sampleEvaluationStatuses[
      "public-receipt-contract-sample-offset"
    ].currentStatus,
    "current",
  );
  assert.equal(
    body.publicContract.sampleEvaluationStatuses[
      "public-receipt-contract-sample-offset"
    ].claimReviewStates.verified,
    "passed",
  );
  assert.equal(
    body.publicContract.sampleEvaluationStatuses[
      "public-receipt-contract-sample-offset"
    ].directDonationParityControls.preselected,
    false,
  );
  assert.equal(
    body.publicContract.sampleEvaluationStatuses[
      "public-receipt-contract-sample-offset"
    ].netAttributionState,
    "verified_net_personal",
  );
  assert.equal(
    body.publicContract.sampleEvaluationStatuses[
      "public-receipt-contract-sample-pledge"
    ].sensitiveActionDisplayMode,
    "generic_action_label",
  );
  assert.match(
    body.publicContract.sampleEvaluationStatuses[
      "public-receipt-contract-sample-offset"
    ].issuedAt,
    /^2026-06-25T/,
  );
  assert.equal(serialized.includes("private_note"), false);
  assert.equal(serialized.includes("raw_evidence"), false);
  assert.equal(serialized.includes("contact"), false);
});

test("public receipt verification route returns contract-only validation without private claim data", async () => {
  const response = await verifyPublicReceiptRoute(
    new Request("http://localhost/api/moral-trade/public-receipts/receipt-card-1/verify"),
    {
      params: Promise.resolve({
        receiptId: "receipt-card-1",
      }),
    },
  );
  const body = await response.json();
  const serialized = JSON.stringify(body);

  assert.equal(response.status, 200);
  assert.equal(body.ok, true);
  assert.equal(body.receiptId, "receipt-card-1");
  assert.equal(body.verificationStatus, "contract_only_no_public_claim_loaded");
  assert.equal(body.verification.authoritativeSource, "privacy_safe_verification_url");
  assert.equal(body.verification.currentStatus, "current");
  assert.equal(body.verification.correctionStatus, "none");
  assert.equal(body.verification.correctionOrRevocationState, "none");
  assert.equal(body.verification.staticImageAuthoritative, false);
  assert.match(body.verification.issuedAt, /^1970-01-01T00:00:00\.000Z$/);
  assert.equal(body.publicContract.participantOptInRequired, true);
  assert.equal(body.publicContract.publicationGatesMustBeNonBlocking, true);
  assert.equal(body.publicContract.currentStatusRequired, true);
  assert.equal(body.publicContract.issuedAtRequired, true);
  assert.equal(body.publicContract.correctionRevocationStateRequired, true);
  assert.equal(body.publicContract.directDonationParityControlsRequired, true);
  assert.equal(body.publicContract.netAttributionControlsRequired, true);
  assert.equal(body.publicContract.netPersonalContributionExcludesThirdPartyFunds, true);
  assert.ok(
    body.publicContract.netPersonalAttributionStates.includes(
      "uncertain_qualified",
    ),
  );
  assert.equal(
    body.publicContract.sensitiveActionExactDetailsRequireSeparateConsentAndReview,
    true,
  );
  assert.ok(body.publicContract.sensitiveActionDisplayModes.includes("exact_action_details"));
  assert.ok(body.publicContract.publicationGateKeys.includes("reconciliation"));
  assert.ok(body.publicContract.publicationGateKeys.includes("public_metric_release"));
  assert.equal(body.publicContract.gamificationAndRankingAllowed, false);
  assert.equal(body.publicContract.tradeConditionedWordingDefault, true);
  assert.equal(body.publicContract.strongerTradeUnlockedWordingRequiresReviewedCausalSupport, true);
  assert.equal(body.publicContract.publicationCanBeTradeTerm, false);
  assert.equal(body.publicContract.publicationAffectsMatchingOrReview, false);
  assert.equal(body.publicContract.publicEngagementCountersAllowed, false);
  assert.equal(serialized.includes("private_note"), false);
  assert.equal(serialized.includes("raw_evidence"), false);
  assert.equal(serialized.includes("contact"), false);
});

test("public receipt verification route rejects invalid receipt ids", async () => {
  const response = await verifyPublicReceiptRoute(
    new Request("http://localhost/api/moral-trade/public-receipts/bad/verify"),
    {
      params: Promise.resolve({
        receiptId: "bad",
      }),
    },
  );
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(body.ok, false);
  assert.ok(body.blockers.includes("invalid_receipt_id"));
});
