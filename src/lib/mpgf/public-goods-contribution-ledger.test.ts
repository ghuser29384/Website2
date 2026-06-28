import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { demoMpgfAssurancePledges } from "@/lib/mpgf/data";
import type { MpgfParticipantState } from "@/lib/mpgf/participant-types";
import {
  MPGF_CONTRIBUTION_SETTLEMENT_SUMMARY_GROUP_ORDER,
  buildMpgfContributionProofLedger,
  buildMpgfContributionSettlementSummary,
  MPGF_CONTRIBUTION_PROOF_LEDGER_SCHEMA_VERSION,
} from "@/lib/mpgf/public-goods-contribution-ledger";
import type { MpgfRealMoneyAccountState } from "@/lib/mpgf/real-money-types";

function participantStateWithPledge(): MpgfParticipantState {
  return {
    status: "authenticated",
    userId: "demo-supporter-alix",
    displayName: "Alix",
    pledges: [],
    recurringCommitments: [],
    publicGoodsPledges: [demoMpgfAssurancePledges[0]],
    publicGoodsSubscriptions: [],
    poolProposals: [],
    ballots: [],
    warnings: [],
  };
}

test("MPGF contribution proof ledger exposes the moraltrade60 participant fields", () => {
  const realMoneyAccountState: MpgfRealMoneyAccountState = {
    contributions: [],
    manualEvidence: [],
    refunds: [],
    billingPortalAvailable: false,
    warnings: [],
  };
  const ledger = buildMpgfContributionProofLedger({
    participantState: participantStateWithPledge(),
    realMoneyAccountState,
    now: new Date("2026-06-07T12:00:00.000Z"),
  });

  assert.equal(ledger.schemaVersion, MPGF_CONTRIBUTION_PROOF_LEDGER_SCHEMA_VERSION);
  assert.equal(ledger.maximumBudgetCents, demoMpgfAssurancePledges[0].amountCents);
  assert.equal(Object.hasOwn(ledger, "authorizedBudgetCents"), false);
  assert.equal(Object.hasOwn(ledger.rows[0], "authorizedBudgetCents"), false);
  assert.equal(ledger.currentlyRoutedAllocationsCents, demoMpgfAssurancePledges[0].amountCents);
  assert.equal(ledger.pendingThresholdAllocationsCents, 0);
  assert.equal(ledger.failedAllocationsCents, 0);
  assert.equal(ledger.failureBonusOrCarryForwardCreditCents, 0);
  assert.equal(ledger.identityStatus.tone, "passed");
  assert.equal(ledger.thresholdStatus.tone, "passed");
  assert.equal(ledger.destinationProofStatus.tone, "passed");
  assert.equal(ledger.challengeWindowStatus.tone, "passed");
  assert.equal(ledger.payoutMilestones.length, 3);
  assert.equal(ledger.rows[0].payoutMilestones.length, 3);
  assert.equal(ledger.accounting.grossCapturedCents, demoMpgfAssurancePledges[0].amountCents);
  assert.equal(ledger.accounting.feeCents, 0);
  assert.equal(ledger.accounting.netRecipientDisbursedCents, demoMpgfAssurancePledges[0].amountCents);
  assert.equal(ledger.accounting.actualContributionCents, demoMpgfAssurancePledges[0].amountCents);
  assert.equal(ledger.accounting.countedContributionCents, demoMpgfAssurancePledges[0].amountCents);
  assert.equal(ledger.accounting.matchEligibleContributionCents, demoMpgfAssurancePledges[0].amountCents);
  assert.equal(ledger.accounting.proofState, "verified_payment_proof");
  assert.deepEqual(ledger.settlementSummary.groupOrder, MPGF_CONTRIBUTION_SETTLEMENT_SUMMARY_GROUP_ORDER);
  assert.equal(ledger.settlementSummary.detailsDrawerRequired, true);
  assert.equal(ledger.settlementSummary.finalReceiptRequired, true);
  assert.equal(ledger.settlementSummary.summaryNumbersMustNotCombineChannels, true);
  assert.equal(ledger.settlementSummary.groups.charged.lines[0].technicalField, "grossCapturedCents");
  assert.equal(ledger.settlementSummary.groups.charged.lines[0].cents, demoMpgfAssurancePledges[0].amountCents);
  assert.equal(ledger.settlementSummary.groups.sent_to_projects.lines[0].technicalField, "netRecipientDisbursedCents");
  assert.equal(ledger.settlementSummary.groups.sent_to_projects.lines[0].includedInSentToProjects, true);
  assert.equal(ledger.settlementSummary.groups.counted_for_matching.lines[1].technicalField, "matchEligibleContributionCents");
  assert.equal(ledger.settlementSummary.groups.counted_for_matching.lines[1].includedInMatchEligibleDollars, true);
  assert.equal(ledger.settlementSummary.groups.sponsor_added.lines[0].technicalField, "sponsorBaseMatchCents");
  assert.equal(ledger.settlementSummary.groups.rewards_credits_certificates.lines[1].technicalField, "coordinationCreditCount");
  assert.equal(ledger.settlementSummary.groups.failed_carry_forward.lines[1].technicalField, "carryForwardCreditCents");
  assert.equal(ledger.rows[0].settlementSummary.groups.charged.lines[0].technicalField, "grossCapturedCents");
  assert.equal(ledger.rows[0].accounting.successRewardCents, 0);
  assert.equal(ledger.rows[0].accounting.coordinationCreditCount, 0);
  assert.equal(ledger.rows[0].accounting.impactCertificateCount, 0);
});

test("MPGF contribution settlement summary keeps plain groups separate from technical accounting", () => {
  const summary = buildMpgfContributionSettlementSummary({
    accounting: {
      grossCapturedCents: 1_200,
      feeCents: 100,
      netRecipientDisbursedCents: 1_100,
      actualContributionCents: 1_200,
      countedContributionCents: 1_000,
      matchEligibleContributionCents: 900,
      sponsorBaseMatchCents: 800,
      sponsorBonusMatchCents: 300,
      successRewardCents: 50,
      failureBonusOrCarryForwardCreditCents: 200,
      coordinationCreditCount: 2,
      impactCertificateCount: 1,
      proofState: "verified_payment_proof",
      proofDetail: "verified",
    },
    carryForwardCreditCents: 200,
    failedAllocationsCents: 400,
  });

  assert.deepEqual(summary.groupOrder, [
    "charged",
    "sent_to_projects",
    "counted_for_matching",
    "sponsor_added",
    "rewards_credits_certificates",
    "failed_carry_forward",
  ]);
  assert.equal(summary.groups.charged.lines[0].cents, 1_200);
  assert.equal(summary.groups.sent_to_projects.lines[0].cents, 1_100);
  assert.equal(summary.groups.sent_to_projects.lines[0].includedInSentToProjects, true);
  assert.equal(summary.groups.counted_for_matching.lines[0].cents, 1_000);
  assert.equal(summary.groups.counted_for_matching.lines[1].cents, 900);
  assert.equal(summary.groups.counted_for_matching.lines[1].includedInMatchEligibleDollars, true);
  assert.deepEqual(
    summary.groups.sponsor_added.lines.map((line) => line.technicalField),
    ["sponsorBaseMatchCents", "sponsorBonusMatchCents"],
  );
  assert.deepEqual(
    summary.groups.rewards_credits_certificates.lines.map((line) => line.technicalField),
    ["successRewardCents", "coordinationCreditCount", "impactCertificateCount"],
  );
  assert.equal(summary.groups.rewards_credits_certificates.lines[1].count, 2);
  assert.equal(summary.groups.failed_carry_forward.lines[0].technicalField, "failedAllocationsCents");
  assert.equal(summary.groups.failed_carry_forward.lines[1].technicalField, "carryForwardCreditCents");
  assert.equal(summary.technicalAccounting.feeCents, 100);
  assert.equal(summary.technicalAccounting.sponsorBaseMatchCents, 800);
  assert.equal(summary.technicalAccounting.successRewardCents, 50);
  assert.equal(summary.technicalAccounting.failedAllocationsCents, 400);
  assert.equal(summary.sentToProjectsExcludesFeesRewardsCreditsCertificatesAndSponsorMatch, true);
  assert.equal(summary.countedForMatchingUsesCountedAndMatchEligibleOnly, true);
  assert.equal(summary.rewardsCreditsCertificatesExcludedFromPublicGoodDollars, true);
});

test("MPGF contribution page renders the moraltrade60 contribution state surface", () => {
  const page = readFileSync("src/app/mpgf/account/contributions/page.tsx", "utf8");
  const component = readFileSync("src/components/mpgf/mpgf-contribution-proof-ledger.tsx", "utf8");
  const helper = readFileSync("src/lib/mpgf/public-goods-contribution-ledger.ts", "utf8");

  assert.match(page, /MpgfContributionProofLedger/);
  assert.match(page, /buildMpgfContributionProofLedger/);
  assert.match(component, /Maximum this round/);
  assert.doesNotMatch(component, /Authorized budget/);
  assert.doesNotMatch(component, /authorizedBudgetCents/);
  assert.match(component, /Your moral public goods/);
  assert.match(component, /Current state/);
  assert.match(component, /pending final review/);
  assert.match(component, /no charge/);
  assert.match(component, /Plain summary/);
  assert.match(component, /ledger\.settlementSummary\.groupOrder/);
  assert.match(component, /settlementGroupText/);
  assert.match(helper, /Charged from you/);
  assert.match(helper, /Sent to projects/);
  assert.match(helper, /Counted for matching/);
  assert.match(helper, /Sponsor added/);
  assert.match(helper, /Rewards, credits, and certificates/);
  assert.match(helper, /Failed or carried forward/);
  assert.match(component, /Summary numbers keep accounting channels separate/);
  assert.match(component, /sent-to-project dollars exclude fees/);
  assert.match(component, /Technical accounting details/);
  assert.match(component, /final receipt uses this same separated technical ledger/);
  assert.match(component, /Actual\/gross exposure/);
  assert.match(component, /Base-match claim and paid amount/);
  assert.match(component, /Bonus-score units and bonus-match paid amount/);
  assert.match(component, /Failure-bonus claim state and denial reason, if any/);
  assert.match(component, /Success-reward \/ coordination-credit \/ impact-certificate state/);
  assert.match(component, /Review, threshold, challenge, payment, and authorization reconciliation states/);
  assert.match(component, /Currently routed allocations/);
  assert.match(component, /Pending threshold allocations/);
  assert.match(component, /Failed allocations/);
  assert.match(component, /Failure bonus or carry-forward credit/);
  assert.match(component, /Plain-language contribution summary/);
  assert.match(component, /Separated accounting proof ledger/);
  assert.match(component, /Gross captured/);
  assert.match(component, /Fees/);
  assert.match(component, /Net recipient-disbursed/);
  assert.match(component, /Actual contribution/);
  assert.match(component, /Counted contribution/);
  assert.match(component, /Match-eligible contribution/);
  assert.match(component, /Sponsor base match/);
  assert.match(component, /Sponsor bonus match/);
  assert.match(component, /Success rewards/);
  assert.match(component, /Coordination credits/);
  assert.match(component, /Impact certificates/);
  assert.match(component, /Route separated accounting proof ledger/);
  assert.match(component, /never merged into one unlabeled impact number/);
  assert.match(component, /Identity status/);
  assert.match(component, /Threshold status/);
  assert.match(component, /Destination-proof status/);
  assert.match(component, /Challenge-window status/);
  assert.match(component, /Payout milestones/);
  assert.match(helper, /grossCapturedCents/);
  assert.match(helper, /feeCents/);
  assert.match(helper, /netRecipientDisbursedCents/);
  assert.match(helper, /actualContributionCents/);
  assert.match(helper, /countedContributionCents/);
  assert.match(helper, /matchEligibleContributionCents/);
  assert.match(helper, /sponsorBaseMatchCents/);
  assert.match(helper, /sponsorBonusMatchCents/);
  assert.match(helper, /successRewardCents/);
  assert.match(helper, /coordinationCreditCount/);
  assert.match(helper, /impactCertificateCount/);
  assert.match(helper, /settlementSummary/);
  assert.match(helper, /MPGF_CONTRIBUTION_SETTLEMENT_SUMMARY_GROUP_ORDER/);
  assert.match(helper, /summaryNumbersMustNotCombineChannels/);
  assert.match(helper, /sentToProjectsExcludesFeesRewardsCreditsCertificatesAndSponsorMatch/);
  assert.match(helper, /destinationProofStatusForPledge/);
  assert.match(helper, /challengeWindowStatusForCampaign/);
  assert.match(helper, /failureBonusOrCarryForwardCreditCents/);
  assert.match(helper, /maximumBudgetCents/);
  assert.doesNotMatch(helper, /authorizedBudgetCents/);
  assert.doesNotMatch(helper, /Increase the authorized amount/);
  assert.match(helper, /Increase the maximum budget/);
});
