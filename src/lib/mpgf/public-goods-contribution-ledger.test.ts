import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { demoMpgfAssurancePledges } from "@/lib/mpgf/data";
import type { MpgfParticipantState } from "@/lib/mpgf/participant-types";
import {
  buildMpgfContributionProofLedger,
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
  assert.equal(ledger.authorizedBudgetCents, demoMpgfAssurancePledges[0].amountCents);
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
  assert.equal(ledger.rows[0].accounting.successRewardCents, 0);
  assert.equal(ledger.rows[0].accounting.coordinationCreditCount, 0);
  assert.equal(ledger.rows[0].accounting.impactCertificateCount, 0);
});

test("MPGF contribution page renders the moraltrade60 contribution state surface", () => {
  const page = readFileSync("src/app/mpgf/account/contributions/page.tsx", "utf8");
  const component = readFileSync("src/components/mpgf/mpgf-contribution-proof-ledger.tsx", "utf8");
  const helper = readFileSync("src/lib/mpgf/public-goods-contribution-ledger.ts", "utf8");

  assert.match(page, /MpgfContributionProofLedger/);
  assert.match(page, /buildMpgfContributionProofLedger/);
  assert.match(component, /Maximum this round/);
  assert.doesNotMatch(component, /Authorized budget/);
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
  assert.match(helper, /destinationProofStatusForPledge/);
  assert.match(helper, /challengeWindowStatusForCampaign/);
  assert.match(helper, /failureBonusOrCarryForwardCreditCents/);
  assert.doesNotMatch(helper, /Increase the authorized amount/);
  assert.match(helper, /Increase the maximum budget/);
});
