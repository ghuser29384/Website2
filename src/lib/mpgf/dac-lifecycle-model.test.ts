import assert from "node:assert/strict";
import test from "node:test";

import {
  getMpgfDacLifecycleStage,
  isMpgfDacCampaignOpenForPledges,
  isMpgfDacProposalStatus,
  mapMpgfDacCreatorProposalRow,
  mapMpgfDacOutcomeRow,
  mapMpgfDacOwnPledgeRow,
  mapMpgfDacPledgeReceipt,
  mapMpgfDacPublishedTerms,
  mapMpgfDacPublicCampaignRow,
  toPublicMpgfDacCampaignApi,
} from "./dac-lifecycle-model";

const now = "2026-08-07T09:00:00.000Z";
const deadline = "2026-08-14T09:00:00.000Z";
const proposalId = "10000000-0000-4000-8000-000000000001";
const pledgeId = "10000000-0000-4000-8000-000000000002";
const intentId = "10000000-0000-4000-8000-000000000003";
const ownerId = "10000000-0000-4000-8000-000000000004";
const campaignId = "campaign-10000000000040008000000000000001";
const termsSha256 = "a".repeat(64);
const outcomeSha256 = "b".repeat(64);
const consentSha256 = "c".repeat(64);

function campaignRow(overrides: Record<string, unknown> = {}) {
  return {
    id: campaignId,
    round_id: "round-qa",
    slug: "qa-dac-campaign",
    title: "QA exact-version public good",
    destination_type: "external_charity",
    destination_ref: "qa-recipient",
    cause_tags: ["public health", "qa"],
    public_summary: "A synthetic campaign used only to prove the DAC product lifecycle.",
    threshold_amount_cents: 10_000,
    threshold_supporters: 2,
    deadline_at: deadline,
    verification_method: "Independent receipt review",
    baseline_rule: "Only incremental support counts.",
    exit_rule: "Pledges expire after lapse.",
    review_status: "approved",
    pool_proposal_id: proposalId,
    threshold_visibility: "public_exact",
    progress_visibility: "terminal_aggregate_only",
    published_terms_version: 3,
    published_terms_sha256: termsSha256,
    published_at: now,
    created_at: now,
    ...overrides,
  };
}


function publishedTermsRow(overrides: Record<string, unknown> = {}) {
  return {
    schemaVersion: "mpgf_dac_public_terms_v1",
    mechanism: "dominant_assurance_contract",
    campaignId,
    campaignSlug: "qa-dac-campaign",
    poolProposalId: proposalId,
    termsVersion: 3,
    termsSha256,
    threshold: {
      netRecipientAmountCents: 10_000,
      minimumSupporters: 2,
      deadlineAt: deadline,
    },
    failureBonus: {
      enabled: true,
      rateBps: 1_000,
      eligibilityPolicy: { policyVersion: "qa" },
      maxParticipants: 100,
      maxPerParticipantCents: 2_500,
      thresholdSchedule: { thresholds: [{ thresholdId: "threshold-1", premiumRateBps: 201 }] },
      scheduleStatus: "approved",
    },
    successPremium: {
      rateBps: 201,
      amountCents: 201,
      payer: "pool_creator_or_sponsor",
      includedInNetThreshold: false,
      provisional: false,
      grossSuccessRequirementCents: 10_201,
      pricing: { successProbabilityBps: 7_500 },
    },
    createPoolTerms: {
      thresholdAmountsCents: [10_000],
      failureBonusBaseType: "percentage",
      failureBonusBaseTerms: { rateBps: 1_000 },
      failureBonusTimingMode: "all",
      failureBonusTimingTerms: { appliesTo: "all_eligible_pledges" },
      formulaSource: null,
      formulaAst: null,
      formulaLanguageVersion: null,
      formulaHash: null,
      formulaVariables: null,
      continuationMode: "stop",
      moralTradeFailureBonusShareBps: 0,
      additionalActivationRule: "",
    },
    payoutMethod: "signed_intent",
    payment: {
      pledgeMode: "pledge_only",
      paymentMethodCollected: false,
      authorized: false,
      mandateCreated: false,
      charged: false,
      captured: false,
      settled: false,
      failureBonusPaid: false,
    },
    ...overrides,
  };
}

function publishedTerms() {
  return mapMpgfDacPublishedTerms(publishedTermsRow());
}

function ownPledgeRow(overrides: Record<string, unknown> = {}) {
  return {
    id: pledgeId,
    pledge_intent_id: intentId,
    campaign_id: campaignId,
    pool_proposal_id: proposalId,
    profile_id: ownerId,
    amount_cents: 6_000,
    currency: "usd",
    visibility_mode: "private_amount",
    supporter_reason: "Synthetic browser proof",
    eligibility_state: "eligible",
    human_score_bps: 10_000,
    status: "pledged",
    terms_version: 3,
    terms_sha256: termsSha256,
    accepted_at: now,
    expires_at: deadline,
    created_at: now,
    ...overrides,
  };
}

function outcomeRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "10000000-0000-4000-8000-000000000005",
    campaign_id: campaignId,
    pool_proposal_id: proposalId,
    terms_version: 3,
    terms_sha256: termsSha256,
    outcome_status: "succeeded",
    eligible_amount_cents: 11_000,
    eligible_supporter_count: 2,
    threshold_amount_cents: 10_000,
    threshold_supporters: 2,
    deadline_at: deadline,
    evaluated_at: now,
    outcome_sha256: outcomeSha256,
    created_at: now,
    ...overrides,
  };
}

test("DAC row mappers preserve exact proposal, terms, pledge, and terminal bindings", () => {
  const pledge = mapMpgfDacOwnPledgeRow(ownPledgeRow(), consentSha256);
  const outcome = mapMpgfDacOutcomeRow(outcomeRow());
  const campaign = mapMpgfDacPublicCampaignRow({
    campaign: campaignRow({ review_status: "finalized" }),
    publishedTerms: publishedTerms(),
    outcome: outcomeRow(),
    ownPledges: [pledge],
  });

  assert.equal(pledge.pledgeIntentId, intentId);
  assert.equal(pledge.poolProposalId, proposalId);
  assert.equal(pledge.termsVersion, 3);
  assert.equal(pledge.termsSha256, termsSha256);
  assert.equal(pledge.consentSha256, consentSha256);
  assert.equal(pledge.amountCents, 6_000);
  assert.equal(pledge.eligibilityState, "eligible");

  assert.equal(outcome.campaignId, campaignId);
  assert.equal(outcome.status, "succeeded");
  assert.equal(outcome.eligibleAmountCents, 11_000);
  assert.equal(outcome.eligibleSupporterCount, 2);

  assert.equal(campaign.reviewStatus, "finalized");
  assert.equal(campaign.publishedTermsVersion, 3);
  assert.equal(campaign.publishedTermsSha256, termsSha256);
  assert.equal(campaign.publishedTerms.failureBonus.rateBps, 1_000);
  assert.equal(campaign.publishedTerms.successPremium.grossSuccessRequirementCents, 10_201);
  assert.equal(campaign.publishedTerms.createPoolTerms?.failureBonusTimingMode, "all");
  assert.equal(campaign.outcome?.outcomeSha256, outcomeSha256);
  assert.deepEqual(campaign.ownPledges, [pledge]);
});

test("public DAC API strips owner pledge and immutable consent evidence", () => {
  const campaign = mapMpgfDacPublicCampaignRow({
    campaign: campaignRow({ review_status: "finalized" }),
    publishedTerms: publishedTerms(),
    outcome: outcomeRow(),
    ownPledges: [mapMpgfDacOwnPledgeRow(ownPledgeRow(), consentSha256)],
  });
  const api = toPublicMpgfDacCampaignApi(campaign);
  const serialized = JSON.stringify(api);

  assert.equal(api.schemaVersion, "mpgf_dac_campaign_public_v1");
  assert.equal(api.disclosure.pledgeMode, "pledge_only");
  assert.equal(api.disclosure.paymentAuthorized, false);
  assert.equal(api.disclosure.paymentMethodCollected, false);
  assert.equal(api.disclosure.chargeCreated, false);
  assert.equal(api.disclosure.privatePledgeEvidenceIncluded, false);
  assert.equal(api.disclosure.progressPolicy, "terminal_aggregate_only");
  assert.equal("ownPledges" in api.campaign, false);
  assert.equal(serialized.includes(pledgeId), false);
  assert.equal(serialized.includes(intentId), false);
  assert.equal(serialized.includes(ownerId), false);
  assert.equal(serialized.includes(consentSha256), false);
  assert.equal(api.campaign.outcome?.eligibleAmountCents, 11_000);
  assert.equal(api.campaign.publishedTerms.failureBonus.scheduleStatus, "approved");
  assert.equal(api.campaign.publishedTerms.payment.authorized, false);
});


test("public exact-term mapping preserves failure-bonus timing while asserting no payment", () => {
  const terms = publishedTerms();

  assert.equal(terms.mechanism, "dominant_assurance_contract");
  assert.equal(terms.threshold.netRecipientAmountCents, 10_000);
  assert.equal(terms.failureBonus.rateBps, 1_000);
  assert.deepEqual(terms.createPoolTerms?.thresholdAmountsCents, [10_000]);
  assert.equal(terms.createPoolTerms?.failureBonusTimingMode, "all");
  assert.equal(terms.successPremium.amountCents, 201);
  assert.equal(terms.successPremium.includedInNetThreshold, false);
  assert.equal(terms.payment.paymentMethodCollected, false);
  assert.equal(terms.payment.failureBonusPaid, false);
});

test("pledge receipts expose exact consent binding without claiming payment", () => {
  const receipt = mapMpgfDacPledgeReceipt({
    pledge_intent_id: intentId,
    pledge_id: pledgeId,
    campaign_id: campaignId,
    pool_proposal_id: proposalId,
    terms_version: "3",
    terms_sha256: termsSha256,
    amount_cents: "6000",
    currency: "usd",
    eligibility_state: "pending_review",
    pledge_status: "pledged",
    accepted_at: now,
    expires_at: deadline,
  });

  assert.deepEqual(receipt, {
    pledgeIntentId: intentId,
    pledgeId,
    campaignId,
    poolProposalId: proposalId,
    termsVersion: 3,
    termsSha256,
    amountCents: 6_000,
    currency: "usd",
    eligibilityState: "pending_review",
    pledgeStatus: "pledged",
    acceptedAt: now,
    expiresAt: deadline,
  });
  assert.equal("paymentIntentId" in receipt, false);
  assert.equal("authorized" in receipt, false);
  assert.equal("captured" in receipt, false);
});

test("creator proposal mapping retains terminal and requested-revision states", () => {
  for (const status of ["changes_requested", "succeeded", "lapsed"] as const) {
    const proposal = mapMpgfDacCreatorProposalRow({
      proposal: {
        id: proposalId,
        proposer_id: ownerId,
        title: "QA proposal",
        summary: "Exact lifecycle fixture",
        cause_area: "public health",
        problem: "Synthetic problem",
        intervention: "Synthetic intervention",
        moral_public_good_rationale: "Synthetic public-good rationale",
        requested_maximum_funding_cents: 10_000,
        status,
        terms_version: 3,
        approved_terms_version: status === "changes_requested" ? null : 3,
        operative_terms_sha256: status === "changes_requested" ? null : termsSha256,
        created_at: now,
      },
    });
    assert.equal(proposal.status, status);
    assert.equal(isMpgfDacProposalStatus(status), true);
  }
  assert.equal(isMpgfDacProposalStatus("approved"), false);
});

test("lifecycle stage and pledge-open policy are terminal-aware", () => {
  const open = mapMpgfDacPublicCampaignRow({ campaign: campaignRow(), publishedTerms: publishedTerms() });
  const succeeded = mapMpgfDacPublicCampaignRow({
    campaign: campaignRow({ review_status: "finalized" }),
    publishedTerms: publishedTerms(),
    outcome: outcomeRow(),
  });
  const lapsed = mapMpgfDacPublicCampaignRow({
    campaign: campaignRow({ review_status: "finalized" }),
    publishedTerms: publishedTerms(),
    outcome: outcomeRow({ outcome_status: "lapsed" }),
  });

  assert.equal(isMpgfDacCampaignOpenForPledges(open, new Date("2026-08-08T00:00:00Z")), true);
  assert.equal(isMpgfDacCampaignOpenForPledges(open, new Date("2026-08-15T00:00:00Z")), false);
  assert.equal(isMpgfDacCampaignOpenForPledges(succeeded), false);
  assert.equal(getMpgfDacLifecycleStage({ proposalStatus: "submitted" }), "submitted");
  assert.equal(getMpgfDacLifecycleStage({ proposalStatus: "under_review" }), "under_review");
  assert.equal(getMpgfDacLifecycleStage({ proposalStatus: "changes_requested" }), "changes_requested");
  assert.equal(getMpgfDacLifecycleStage({ proposalStatus: "approved_as_candidate" }), "approved_frozen");
  assert.equal(getMpgfDacLifecycleStage({ campaignReviewStatus: "approved" }), "published");
  assert.equal(getMpgfDacLifecycleStage({ outcomeStatus: succeeded.outcome?.status }), "succeeded");
  assert.equal(getMpgfDacLifecycleStage({ outcomeStatus: lapsed.outcome?.status }), "lapsed");
});
