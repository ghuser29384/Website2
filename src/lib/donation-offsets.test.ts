import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  assessDonationOffsetModeration,
  buildDemoDonationOffsetBatchClearingDryRun,
  buildDonationOffsetBatchClearingDryRun,
  calculateDonationOffsetPreview,
  calculateDonationOffsetPoolProgress,
  createDefaultDonationOffsetFields,
  validateDonationOffsetSubmissionGuards,
  validateDonationOffsetFields,
} from "@/lib/donation-offsets";
import {
  evidenceLocatorsConflict,
  getDonationOffsetEvidenceState,
  normalizeEvidenceLocator,
} from "@/lib/validation";

test("donation offset validation rejects missing required fields", () => {
  const draft = createDefaultDonationOffsetFields();
  const errors = validateDonationOffsetFields({
    ...draft,
    baselineAmountUsd: null,
    requestedMatchingAmountUsd: null,
    compromiseDestinationId: "",
    description: "",
  });

  assert.ok(errors.includes("Baseline donation amount must be a positive number."));
  assert.ok(errors.includes("Requested matching donation must be a positive number."));
  assert.ok(errors.includes("Choose a valid compromise destination."));
  assert.ok(errors.includes("Add a short description of the offset."));
});

test("moderation blocks illegal political destinations", () => {
  const draft = createDefaultDonationOffsetFields();
  const moderation = assessDonationOffsetModeration({
    ...draft,
    compromiseDestinationId: "campaign-example-prohibited",
    description: "I want to redirect this instead of cancelling out.",
    evidenceUrl: "https://example.com/receipt",
  });

  assert.equal(moderation.status, "blocked");
  assert.match(moderation.reasons[0] ?? "", /prohibited/i);
});

test("moderation blocks threat-like descriptions", () => {
  const draft = createDefaultDonationOffsetFields();
  const moderation = assessDonationOffsetModeration({
    ...draft,
    description: "Unless someone pays me, I will donate to the opposed harm cause.",
    evidenceUrl: "https://example.com/receipt",
  });

  assert.equal(moderation.status, "blocked");
  assert.match(moderation.reasons[0] ?? "", /threat|extortion/i);
});

test("moderation flags unverifiable baselines", () => {
  const draft = createDefaultDonationOffsetFields();
  const moderation = assessDonationOffsetModeration({
    ...draft,
    description: "I would otherwise make this opposed donation, but I am willing to redirect it.",
    evidenceUrl: "",
  });

  assert.equal(moderation.status, "flagged");
  assert.match(moderation.reasons[0] ?? "", /unverifiable|receipt|audit|payment/i);
});

test("ratio calculation correctly computes matched and unmatched portions", () => {
  const preview = calculateDonationOffsetPreview({
    baselineAmountUsd: 100,
    requestedMatchingAmountUsd: 120,
    offsetRatio: 1.5,
    unmatchedSurplusRule: "return_to_donors",
  });

  assert.equal(preview.matchedBaselineUsd, 80);
  assert.equal(preview.matchedCounterpartyUsd, 120);
  assert.equal(preview.compromiseTotalUsd, 200);
  assert.equal(preview.unmatchedBaselineUsd, 20);
  assert.equal(preview.unmatchedCounterpartyUsd, 0);
});

test("pool validation requires side, pool identity, and deadline", () => {
  const draft = createDefaultDonationOffsetFields();
  const errors = validateDonationOffsetFields({
    ...draft,
    participationMode: "pool",
    poolId: "",
    poolName: "",
    poolSide: "",
    assuranceMinimumUsd: null,
    assuranceDeadline: "",
    poolMaximumCapUsd: null,
  });

  assert.ok(errors.includes("Choose which side of the offset pool you are joining."));
  assert.ok(errors.includes("Choose an existing pool or name a new offset pool."));
  assert.ok(errors.includes("Assurance minimum threshold is required for pooled offsets."));
  assert.ok(errors.includes("Pool offsets should include an assurance deadline."));
  assert.ok(errors.includes("Pool maximum cap must be a positive number."));
});

test("pooled offset submission guards require anti-threat and verification metadata", () => {
  const errors = validateDonationOffsetSubmissionGuards({
    participationMode: "pool",
    antiThreatCertification: false,
    verificationMetadataAcknowledged: false,
    evidenceUrl: "",
  });

  assert.ok(errors.some((error) => /anti-threat/i.test(error)));
  assert.ok(errors.some((error) => /verification metadata/i.test(error)));

  assert.deepEqual(
    validateDonationOffsetSubmissionGuards({
      participationMode: "pool",
      antiThreatCertification: true,
      verificationMetadataAcknowledged: true,
      evidenceUrl: "https://example.com/reviewable-evidence",
    }),
    [],
  );
});

test("pool progress reaches assurance once matched compromise exceeds threshold", () => {
  const progress = calculateDonationOffsetPoolProgress({
    sideATotalUsd: 600,
    sideBTotalUsd: 650,
    offsetRatio: 1,
    assuranceMinimumUsd: 1000,
    deadlineAt: "2099-01-01T00:00:00.000Z",
  });

  assert.equal(progress.assuranceReached, true);
  assert.equal(progress.status, "assurance_met");
  assert.equal(progress.matchedCompromiseUsd, 1200);
  assert.equal(progress.assuranceProgressPct, 100);
});

test("donation offset batch dry run creates commitment reservations and no-capture lock proposal", () => {
  const dryRun = buildDemoDonationOffsetBatchClearingDryRun();

  assert.equal(dryRun.schemaVersion, "donation-offset-batch-clearing-dry-run-v1");
  assert.equal(dryRun.releaseStage, "donation_offset_preview_no_capture");
  assert.equal(dryRun.ratioBoundStatus, "within_bounds");
  assert.equal(dryRun.assuranceReached, true);
  assert.equal(dryRun.atomicSettlementGroup.status, "ready_for_final_lock_confirmation");
  assert.equal(dryRun.atomicSettlementGroup.allOrNone, true);
  assert.equal(dryRun.atomicSettlementGroup.captureAllowed, false);
  assert.equal(dryRun.atomicSettlementGroup.relianceBearing, false);
  assert.equal(dryRun.finalLockProposal.status, "preview_only_no_capture");
  assert.equal(dryRun.finalLockProposal.noCapture, true);
  assert.equal(dryRun.finalLockProposal.createsPaymentCapture, false);
  assert.equal(dryRun.finalLockProposal.relianceBearing, false);
  assert.equal(dryRun.finalLockProposal.requiredFreshConfirmations, 4);
  assert.equal(dryRun.compromiseTotalUsd, 2000);
  assert.ok(dryRun.commitmentInventory.every((reservation) => reservation.reservedUsd > 0));
});

test("donation offset batch dry run fails closed when ratio bounds reject clearing", () => {
  const dryRun = buildDonationOffsetBatchClearingDryRun({
    poolId: "test-pool",
    poolName: "Test pool",
    offsetRatio: 2,
    assuranceMinimumUsd: 100,
    assuranceDeadline: "2099-01-01T00:00:00.000Z",
    destinationLabel: "Test compromise charity",
    verificationMethod: "proof_of_past_donations",
    commitments: [
      {
        id: "side-a",
        participantLabel: "Side A",
        side: "side_a",
        amountUsd: 100,
        ratioMinimum: 0.5,
        ratioMaximum: 1,
        status: "active",
      },
      {
        id: "side-b",
        participantLabel: "Side B",
        side: "side_b",
        amountUsd: 200,
        ratioMinimum: 0.5,
        ratioMaximum: 3,
        status: "active",
      },
    ],
    now: new Date("2026-06-07T12:00:00.000Z"),
  });

  assert.equal(dryRun.ratioBoundStatus, "out_of_bounds");
  assert.equal(dryRun.atomicSettlementGroup.status, "blocked_preview_only");
  assert.equal(dryRun.finalLockProposal.status, "blocked");
  assert.ok(dryRun.atomicSettlementGroup.blockerCodes.includes("clearing_ratio_outside_participant_bounds"));
  assert.ok(dryRun.atomicSettlementGroup.blockerCodes.includes("missing_counterparty_side"));
  assert.ok(
    dryRun.commitmentInventory.some((reservation) =>
      reservation.blockerCodes.includes("clearing_ratio_outside_participant_bounds"),
    ),
  );
});

test("donation offset page renders the moraltrade60 batch-clearing preview surface", () => {
  const page = readFileSync("src/app/donation-offsets/page.tsx", "utf8");
  const helper = readFileSync("src/lib/donation-offsets.ts", "utf8");

  assert.match(page, /Batch clearing dry run/);
  assert.match(page, /commitment inventory/i);
  assert.match(page, /Final lock proposal/);
  assert.match(page, /No capture in preview/);
  assert.match(page, /buildDonationOffsetBatchClearingDryRun/);
  assert.match(helper, /AtomicSettlementPreview/);
  assert.match(helper, /ready_for_final_lock_confirmation/);
  assert.match(helper, /createsPaymentCapture: false/);
});

test("pool moderation flags missing deadline when pool mode is selected", () => {
  const draft = createDefaultDonationOffsetFields();
  const moderation = assessDonationOffsetModeration({
    ...draft,
    participationMode: "pool",
    poolName: "Example pooled offset",
    poolSide: "side_a",
    description: "Pool commitments redirect opposed donations toward a shared compromise charity.",
    evidenceUrl: "https://example.com/proof",
    assuranceDeadline: "",
  });

  assert.equal(moderation.status, "flagged");
  assert.match(moderation.reasons.join(" "), /deadline/i);
});

test("evidence locators normalize URLs for one-proof-one-claim checks", () => {
  assert.equal(
    normalizeEvidenceLocator(" HTTPS://Example.com/receipt/?b=2&a=1#section "),
    "https://example.com/receipt?a=1&b=2",
  );
  assert.equal(
    evidenceLocatorsConflict(
      "https://example.com/receipt/?b=2&a=1#section",
      "https://example.com/receipt?a=1&b=2",
    ),
    true,
  );
  assert.equal(
    evidenceLocatorsConflict("https://example.com/receipt/one", "https://example.com/receipt/two"),
    false,
  );
});

test("donation offset evidence states expose challenge and badge eligibility", () => {
  const reviewedEightDaysAgo = "2026-05-15T12:00:00.000Z";
  const now = new Date("2026-05-23T12:00:00.000Z");

  const cleared = getDonationOffsetEvidenceState({
    moderationStatus: "clear",
    evidenceUrl: "https://example.com/receipt",
    moderationReviewedAt: reviewedEightDaysAgo,
    createdAt: reviewedEightDaysAgo,
    now,
  });

  assert.equal(cleared.label, "Review-cleared evidence");
  assert.equal(cleared.badgeEligible, true);
  assert.equal(cleared.challengeWindowActive, false);

  const flagged = getDonationOffsetEvidenceState({
    moderationStatus: "flagged",
    evidenceUrl: "",
    moderationReviewedAt: null,
    createdAt: "2026-05-23T12:00:00.000Z",
    now,
  });

  assert.equal(flagged.label, "Needs evidence");
  assert.equal(flagged.badgeEligible, false);

  const unreviewed = getDonationOffsetEvidenceState({
    moderationStatus: "clear",
    evidenceUrl: "https://example.com/receipt",
    moderationReviewedAt: null,
    createdAt: "2026-05-01T12:00:00.000Z",
    now,
  });

  assert.equal(unreviewed.label, "Challenge window");
  assert.equal(unreviewed.badgeEligible, false);
});
