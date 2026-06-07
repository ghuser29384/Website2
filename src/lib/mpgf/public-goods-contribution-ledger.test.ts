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
});

test("MPGF contribution page renders the moraltrade60 contribution state surface", () => {
  const page = readFileSync("src/app/mpgf/account/contributions/page.tsx", "utf8");
  const component = readFileSync("src/components/mpgf/mpgf-contribution-proof-ledger.tsx", "utf8");
  const helper = readFileSync("src/lib/mpgf/public-goods-contribution-ledger.ts", "utf8");

  assert.match(page, /MpgfContributionProofLedger/);
  assert.match(page, /buildMpgfContributionProofLedger/);
  assert.match(component, /Authorized budget/);
  assert.match(component, /Currently routed allocations/);
  assert.match(component, /Pending threshold allocations/);
  assert.match(component, /Failed allocations/);
  assert.match(component, /Failure bonus or carry-forward credit/);
  assert.match(component, /Identity status/);
  assert.match(component, /Threshold status/);
  assert.match(component, /Destination-proof status/);
  assert.match(component, /Challenge-window status/);
  assert.match(component, /Payout milestones/);
  assert.match(helper, /destinationProofStatusForPledge/);
  assert.match(helper, /challengeWindowStatusForCampaign/);
  assert.match(helper, /failureBonusOrCarryForwardCreditCents/);
});
