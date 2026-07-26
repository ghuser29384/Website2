import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import {
  PLEDGE_SWAP_MANUAL_REVIEW_RELEASE_STAGE,
  PLEDGE_SWAP_MANUAL_REVIEW_SCHEMA_VERSION,
  buildPledgeSwapManualReviewPreview,
  createDemoPledgeSwapManualReviewPreview,
  summarizePledgeSwapManualReviewForNotes,
  validatePledgeSwapManualReviewInput,
  type PledgeSwapManualReviewInput,
} from "./pledge-swaps";

function makeInput(
  overrides: Partial<PledgeSwapManualReviewInput> = {},
): PledgeSwapManualReviewInput {
  return {
    offeredAction:
      "I will follow a vegetarian diet for 30 days with a simple public log of material exceptions.",
    requestedAction:
      "The counterparty will donate to an evidence-focused global health charity during the same period.",
    noTradeBaseline:
      "Without this trade, I would not make this short diet commitment during the next 30 days.",
    additionalityStatement:
      "The reciprocal donation creates the reason to try this commitment now rather than later.",
    maxObligationDays: 30,
    reciprocalReleaseRule:
      "Future obligations are reciprocally released if one side exits under the stated rule.",
    withdrawalBeforeLockRule:
      "Either side can withdraw before final lock without penalty or private-detail escalation.",
    challengeWindowDays: 14,
    neutralReviewRequired: true,
    evidencePlan: "Public log or dated receipt for the promised action.",
    leastIntrusiveAlternative:
      "Use a dated self-log before private messages, location history, or third-party exposure.",
    baselinePredatesOffer: true,
    baselineConfidence: "medium",
    compensatedMoralAction: false,
    compensationSummary: "",
    ordinaryServiceClassification: "not_ordinary_service_market",
    negativeCommitmentScope: "",
    actionReversibility: "continuing_but_suspendable",
    thirdPartyObligation: "none_known",
    representativeAuthority: "self_only",
    reportingIntegrity: "clear",
    civilRights: "clear",
    participantAutonomy: "clear",
    confidentialityPrivacy: "clear",
    evidenceAuthenticity: "possible_or_unknown",
    financialCrime: "clear",
    nonTransferability: "clear",
    regulatedGoodsHazardousActivity: "clear",
    cyberAbuseDigitalIntegrity: "clear",
    antiCorruptionProcessIntegrity: "clear",
    performanceBondPreviewEnabled: false,
    ...overrides,
  };
}

test("pledge-swap manual-review preview is non-reliance-bearing and lock-gated", () => {
  const preview = createDemoPledgeSwapManualReviewPreview();

  assert.equal(preview.schemaVersion, PLEDGE_SWAP_MANUAL_REVIEW_SCHEMA_VERSION);
  assert.equal(preview.releaseStage, PLEDGE_SWAP_MANUAL_REVIEW_RELEASE_STAGE);
  assert.equal(preview.matchCandidateCreatesDeal, false);
  assert.equal(preview.relianceBearing, false);
  assert.equal(preview.captureAllowed, false);
  assert.equal(preview.requiresFinalLockProposal, true);
  assert.equal(preview.requiresFreshConfirmations, true);
  assert.equal(preview.requiresAgreementAmendmentForPostLockChanges, true);
  assert.equal(preview.commitmentReservationRequiredBeforeLock, true);
  assert.equal(preview.doubleCountingAllowed, false);
  assert.equal(preview.atomicSettlementAtLockBoundary, true);
  assert.equal(preview.leastIntrusiveEvidenceRequired, true);
  assert.equal(preview.maxObligationDays, 30);
  assert.equal(preview.challengeWindowDays, 14);
  assert.equal(preview.readyForManualReview, true);
});

test("pledge-swap preview exposes every moraltrade60 manual-review gate", () => {
  const preview = buildPledgeSwapManualReviewPreview(makeInput({
    compensatedMoralAction: true,
    compensationSummary: "Counterparty pays a bounded amount after neutral review.",
    negativeCommitmentScope:
      "The abstention scope is limited to the named action, 30-day window, affiliates, exclusions, and evidence standard.",
    performanceBondPreviewEnabled: true,
  }));
  const keys = new Set(preview.gates.map((gate) => gate.key));

  for (const key of [
    "baseline-integrity",
    "performance-terms",
    "compensated-moral-action",
    "negative-commitment-scope",
    "action-reversibility",
    "third-party-obligation",
    "representative-authority",
    "reporting-integrity",
    "civil-rights",
    "participant-autonomy",
    "confidentiality-privacy",
    "evidence-authenticity",
    "financial-crime",
    "non-transferability",
    "regulated-goods-hazardous-activity",
    "cyber-abuse-digital-integrity",
    "anti-corruption-process-integrity",
    "post-lock-amendment",
    "performance-bond-preview",
  ]) {
    assert.equal(keys.has(key), true, `missing gate ${key}`);
  }
});

test("pledge-swap validation rejects missing lock terms", () => {
  const errors = validatePledgeSwapManualReviewInput(makeInput({
    challengeWindowDays: null,
    evidencePlan: "",
    leastIntrusiveAlternative: "",
    maxObligationDays: null,
    neutralReviewRequired: false,
    reciprocalReleaseRule: "",
    withdrawalBeforeLockRule: "",
  }));

  assert.ok(errors.some((error) => /maximum obligation/i.test(error)));
  assert.ok(errors.some((error) => /reciprocally released/i.test(error)));
  assert.ok(errors.some((error) => /withdraw before final lock/i.test(error)));
  assert.ok(errors.some((error) => /challenge window/i.test(error)));
  assert.ok(errors.some((error) => /neutral review/i.test(error)));
  assert.ok(errors.some((error) => /least-intrusive evidence plan/i.test(error)));
  assert.ok(errors.some((error) => /less-intrusive evidence alternative/i.test(error)));
});

test("pledge-swap preview blocks reporting suppression and cyber abuse", () => {
  const reportingPreview = buildPledgeSwapManualReviewPreview(makeInput({
    requestedAction: "The counterparty will not report misconduct and will withdraw complaint filings.",
  }));
  const reportingGate = reportingPreview.gates.find((gate) => gate.key === "reporting-integrity");

  assert.equal(reportingGate?.status, "blocked");
  assert.ok(validatePledgeSwapManualReviewInput(makeInput({
    requestedAction: "The counterparty will not report misconduct and will withdraw complaint filings.",
  })).some((error) => /Reporting integrity/i.test(error)));

  const cyberPreview = buildPledgeSwapManualReviewPreview(makeInput({
    offeredAction: "I will hack a third-party system to prove the requested claim.",
  }));
  const cyberGate = cyberPreview.gates.find((gate) => gate.key === "cyber-abuse-digital-integrity");

  assert.equal(cyberGate?.status, "blocked");
});

test("pledge-swap summary records lock, amendment, and double-counting safeguards", () => {
  const summary = summarizePledgeSwapManualReviewForNotes(createDemoPledgeSwapManualReviewPreview());

  assert.match(summary, /Release stage: pledge_swap_preview_manual_review_only/);
  assert.match(summary, /Requires frozen matched-trade lock proposal and fresh confirmations: yes/);
  assert.match(summary, /Post-lock changes require amendment and renewed confirmations: yes/);
  assert.match(summary, /Double counting allowed: no/);
  assert.match(summary, /Atomic settlement at lock boundary: yes/);
});

test("pledge-swap public UI and server action preserve the manual-review contract", () => {
  const pageSource = readFileSync("src/app/pledge-swaps/page.tsx", "utf8");
  const formSource = readFileSync("src/components/offers/offer-create-form.tsx", "utf8");
  const actionSource = readFileSync("src/app/actions.ts", "utf8");

  assert.match(pageSource, /A suggested match is not a deal/);
  assert.match(pageSource, /Nothing becomes reliance-bearing/);
  assert.match(pageSource, /Review before trust/);
  assert.doesNotMatch(pageSource, /createDemoPledgeSwapManualReviewPreview/);
  assert.doesNotMatch(pageSource, /Manual-review preview/);
  assert.match(formSource, /pledge_swap_max_obligation_days/);
  assert.match(formSource, /pledgeSwapManualReviewPreview/);
  assert.match(formSource, /Least-intrusive evidence plan/);
  assert.match(actionSource, /validatePledgeSwapManualReviewInput/);
  assert.match(actionSource, /summarizePledgeSwapManualReviewForNotes/);
});
