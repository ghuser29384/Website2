import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import {
  DEFAULT_OPPORTUNITY_CONSTRAINT_POLICY,
  applyOpportunityConstraintAssessment,
  assessOpportunityConstraint,
  buildOpportunityMealPublicReportSummary,
  buildOpportunityMealReviewerPanel,
  createMealWitnessTestimonial,
  createOneMealNoMeatOpportunityDemo,
  createOpportunityMealEvidenceBundle,
  getOpportunityMealEvidenceContract,
  validateOpportunityMealEvidenceContract,
  type MealWitnessTestimonial,
  type OpportunityConstrainedMealEvidenceBundle,
} from "./opportunity-constrained-meal-evidence";

const NOW = "2026-06-26T12:00:00.000Z";

function readRepoFile(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

function makeBundle(
  overrides: Partial<
    Parameters<typeof createOpportunityMealEvidenceBundle>[0]
  > = {},
) {
  const result = createOpportunityMealEvidenceBundle({
    actionTemplateId: "action-template:one-meal-no-meat-lunch",
    baselineWitnessCount: 1,
    cafeteriaOrVenueRecordRef: "private-ref:redacted-cafeteria-context",
    coDinerCount: 1,
    directObserverTestimonialCount: 1,
    mealLabel: "lunch",
    mealWindowEndAt: "2026-07-02T17:45:00.000Z",
    mealWindowStartAt: "2026-07-02T17:10:00.000Z",
    now: NOW,
    ordinaryMealVenueDescriptionPrivate: "Redacted school cafeteria",
    ordinaryMealVenueType: "school_cafeteria",
    participantClaimsUsuallyEatsOnceForMeal: true,
    participantClaimsUsualVenueForMeal: true,
    participantUserId: "participant-a",
    pledgeSwapId: "pledge-swap-a",
    postMealCommitmentClaimed: true,
    postMealCommitmentEvidenceRef: "private-ref:redacted-class",
    postMealCommitmentStartAt: "2026-07-02T18:00:00.000Z",
    postMealCommitmentType: "class",
    purchaseEnvelopeId: "purchase-envelope-a",
    purchaseEnvelopeType: "crowdfunded_pledge_swap_lot",
    venueAccessModel: "swipe_based",
    ...overrides,
  });

  assert.deepEqual(result.blockers, []);
  return result.bundle;
}

function baselineWitness(
  bundle: OpportunityConstrainedMealEvidenceBundle,
  overrides: Partial<Parameters<typeof createMealWitnessTestimonial>[0]> = {},
) {
  return createMealWitnessTestimonial({
    baselineCounterfactualCredenceDecimal: 0.82,
    basisTextPrivate: "I often eat this meal with the participant and know their ordinary choices.",
    evidenceBundleId: bundle.id,
    knowsUsuallyEatsOnceForMeal: true,
    knowsUsualVenueForMeal: true,
    mealLabel: bundle.mealLabel,
    now: NOW,
    participantUserId: bundle.participantUserId,
    witnessRole: "baseline_witness",
    ...overrides,
  }).testimonial;
}

function coDinerWitness(
  bundle: OpportunityConstrainedMealEvidenceBundle,
  overrides: Partial<Parameters<typeof createMealWitnessTestimonial>[0]> = {},
) {
  return createMealWitnessTestimonial({
    basisTextPrivate: "I ate with the participant for the whole meal and saw no meat or fish.",
    directlyObservedMeal: true,
    evidenceBundleId: bundle.id,
    mealLabel: bundle.mealLabel,
    noMeatFishCompletionCredenceDecimal: 0.92,
    now: NOW,
    observationCoverage: "whole_meal",
    observedMealVenuePrivate: "Redacted cafeteria",
    participantUserId: bundle.participantUserId,
    witnessRole: "co_diner_direct_observer",
    ...overrides,
  }).testimonial;
}

function scheduleWitness(bundle: OpportunityConstrainedMealEvidenceBundle) {
  return createMealWitnessTestimonial({
    basisTextPrivate: "I saw the participant go directly to class after lunch.",
    directlyObservedMeal: false,
    evidenceBundleId: bundle.id,
    mealLabel: bundle.mealLabel,
    now: NOW,
    observationCoverage: "not_observed",
    participantUserId: bundle.participantUserId,
    witnessRole: "schedule_constraint_witness",
  }).testimonial;
}

test("opportunity meal evidence contract validates roles, privacy, scoring policy, and seed demo", () => {
  const contract = getOpportunityMealEvidenceContract();
  const validation = validateOpportunityMealEvidenceContract(contract);

  assert.equal(validation.status, "pass");
  assert.deepEqual(validation.blockers, []);
  assert.ok(contract.modelNames.includes("OpportunityConstrainedMealEvidenceBundle"));
  assert.ok(contract.firstClassRecordTables.includes("moral_trade_opportunity_meal_evidence_bundles"));
  assert.ok(contract.witnessRoles.includes("baseline_witness"));
  assert.ok(contract.witnessRoles.includes("co_diner_direct_observer"));
  assert.match(contract.publicReportingRule, /must not expose cafeteria names/i);
  assert.equal(contract.scoringPolicy.seedPosteriorCompletionConfidenceDecimal, 0.85);
});

test("participant can submit an opportunity-constrained meal evidence bundle", () => {
  const bundle = makeBundle();

  assert.equal(bundle.bundleStatus, "submitted");
  assert.equal(bundle.mealLabel, "lunch");
  assert.equal(bundle.participantClaimsUsualVenueForMeal, true);
  assert.equal(bundle.participantClaimsUsuallyEatsOnceForMeal, true);
  assert.equal(bundle.postMealCommitmentType, "class");
});

test("co-diner testimony affects completion confidence, not baseline additionality by itself", () => {
  const bundle = makeBundle({ baselineWitnessCount: 0 });
  const assessment = assessOpportunityConstraint({
    bundle,
    now: NOW,
    testimonials: [coDinerWitness(bundle), scheduleWitness(bundle)],
  });

  assert.equal(assessment.acceptedForCompletionVerification, true);
  assert.equal(assessment.acceptedForAdditionality, false);
  assert.ok(assessment.proposedCompletionConfidenceDecimal > 0.7);
  assert.equal(assessment.proposedAdditionalityAdjustmentDecimal, null);
});

test("baseline witness testimony affects additionality, not completion by itself", () => {
  const bundle = makeBundle({ coDinerCount: 0, directObserverTestimonialCount: 0 });
  const assessment = assessOpportunityConstraint({
    bundle,
    now: NOW,
    testimonials: [baselineWitness(bundle)],
  });

  assert.equal(assessment.acceptedForAdditionality, true);
  assert.equal(assessment.acceptedForCompletionVerification, false);
  assert.ok((assessment.proposedAdditionalityAdjustmentDecimal ?? 0) > 0);
  assert.ok(assessment.proposedCompletionConfidenceDecimal <= 0.68);
});

test("swipe cafeteria, co-diner testimony, and post-meal commitment beat plain self-attestation", () => {
  const bundle = makeBundle();
  const assessment = assessOpportunityConstraint({
    bundle,
    now: NOW,
    testimonials: [baselineWitness(bundle), coDinerWitness(bundle), scheduleWitness(bundle)],
  });

  assert.ok(
    assessment.proposedCompletionConfidenceDecimal >
      DEFAULT_OPPORTUNITY_CONSTRAINT_POLICY.baseSelfAttestationCompletionConfidenceDecimal,
  );
  assert.equal(assessment.acceptedForCompletionVerification, true);
});

test("seed demo produces approximately 0.85 completion confidence under frozen policy", () => {
  const demo = createOneMealNoMeatOpportunityDemo();

  assert.equal(demo.consideration.amountMinor, 500);
  assert.equal(demo.consideration.fixedConsiderationLocked, true);
  assert.ok(demo.assessment.proposedCompletionConfidenceDecimal >= 0.84);
  assert.ok(demo.assessment.proposedCompletionConfidenceDecimal <= 0.86);
  assert.equal(demo.reviewerDecision.completionConfidenceDecimal, demo.assessment.proposedCompletionConfidenceDecimal);
  assert.equal(demo.publicReport.publicSummary, "Verification used reviewed meal-context evidence and private third-party testimony.");
});

test("0.85 is policy-configured and falls with weak access, independence, coverage, schedule, or consistency", () => {
  const demoAtCustomSeed = createOneMealNoMeatOpportunityDemo({
    ...DEFAULT_OPPORTUNITY_CONSTRAINT_POLICY,
    policyHash: "sha256:customseed000000000000000000000000000000000000000000000000000000000",
    seedPosteriorCompletionConfidenceDecimal: 0.81,
  });

  assert.ok(demoAtCustomSeed.assessment.proposedCompletionConfidenceDecimal <= 0.82);

  const weakBundle = makeBundle({
    cafeteriaOrVenueRecordRef: null,
    ordinaryMealVenueDescriptionPrivate: null,
    participantClaimsUsuallyEatsOnceForMeal: false,
    postMealCommitmentEvidenceRef: null,
    postMealCommitmentStartAt: "2026-07-02T22:30:00.000Z",
    venueAccessModel: "open_access",
  });
  const weakAssessment = assessOpportunityConstraint({
    bundle: weakBundle,
    now: NOW,
    testimonials: [
      baselineWitness(weakBundle, {
        baselineCounterfactualCredenceDecimal: 0.55,
        knowsUsuallyEatsOnceForMeal: false,
        knowsUsualVenueForMeal: false,
      }),
      coDinerWitness(weakBundle, {
        basisTextPrivate: "I saw only part of the meal and the participant left and returned.",
        noMeatFishCompletionCredenceDecimal: 0.65,
        observationCoverage: "part_of_meal",
        participantLeftAndReturnedDuringMeal: true,
      }),
    ],
  });

  assert.ok(weakAssessment.proposedCompletionConfidenceDecimal < 0.7);
  assert.ok(weakAssessment.coDinerObservationScoreDecimal < 0.4);
  assert.ok(weakAssessment.swipeOrAccessConstraintScoreDecimal < 0.3);
});

test("witness identities, cafeteria details, schedules, and raw testimony are suppressed from public reports", () => {
  const demo = createOneMealNoMeatOpportunityDemo();
  const publicReport = buildOpportunityMealPublicReportSummary({ assessment: demo.assessment });
  const serialized = JSON.stringify(publicReport);

  assert.equal(publicReport.privateFieldsSuppressed, true);
  assert.equal(publicReport.aggregateSmallCellSuppression, true);
  assert.equal(serialized.includes("Redacted school cafeteria"), false);
  assert.equal(serialized.includes("class calendar"), false);
  assert.equal(serialized.includes("I ate with the participant"), false);
  assert.equal(serialized.includes("witness"), true);
});

test("pressure, side-payment, and contrary reports route to risk review and reduce testimonial weight", () => {
  const bundle = makeBundle({ contraryReportCount: 1 });
  const riskyCoDiner = coDinerWitness(bundle, {
    basisTextPrivate: "Same words as another testimony template.",
    pressuredToSubmit: true,
    reasonToThinkAteMeatFishBeforeOrAfter: true,
    sidePaymentConcern: true,
    testimonialStatus: "disputed",
  });
  const assessment = assessOpportunityConstraint({
    bundle,
    now: NOW,
    testimonials: [baselineWitness(bundle), riskyCoDiner],
  });

  assert.equal(assessment.reviewStatus, "needs_more_info");
  assert.ok(assessment.privateNotesRef);
  assert.ok(assessment.collusionRiskScoreDecimal > 0.5);
  assert.ok(assessment.contraryEvidenceScoreDecimal > 0);
  assert.equal(assessment.acceptedForCompletionVerification, false);
  assert.ok(assessment.proposedCompletionConfidenceDecimal <= 0.35);
});

test("verification confidence updates are audit-traced and cannot override stronger contrary evidence", () => {
  const bundle = makeBundle();
  const assessment = assessOpportunityConstraint({
    bundle,
    now: NOW,
    testimonials: [baselineWitness(bundle), coDinerWitness(bundle), scheduleWitness(bundle)],
  });
  const applied = applyOpportunityConstraintAssessment({
    assessment,
    currentFinalAdditionalityProbabilityDecimal: 0.6,
    currentVerificationConfidenceDecimal: 0.45,
    fixedConsiderationLocked: true,
    now: NOW,
  });

  assert.equal(applied.status, "pass");
  assert.ok(applied.verificationConfidenceDeltaDecimal > 0);
  assert.ok(applied.finalAdditionalityProbabilityDeltaDecimal > 0);
  assert.equal(applied.auditTraceRequired, true);
  assert.match(applied.policyEvaluationTrace?.policyHash ?? "", /^sha256:/);
  assert.deepEqual(applied.policyEvaluationTrace?.materialEffects.sort(), [
    "additionality",
    "verification_confidence",
  ]);

  const blocked = applyOpportunityConstraintAssessment({
    assessment,
    currentFinalAdditionalityProbabilityDecimal: 0.6,
    currentVerificationConfidenceDecimal: 0.45,
    fixedConsiderationLocked: true,
    now: NOW,
    strongerContradictoryEvidence: true,
  });

  assert.equal(blocked.status, "blocked");
  assert.ok(blocked.blockers.includes("stronger_contradictory_evidence_controls_completion"));
  assert.equal(blocked.verificationConfidenceDecimal, 0.45);
});

test("fixed pledge-swap consideration is not retroactively reduced by opportunity scoring", () => {
  const demo = createOneMealNoMeatOpportunityDemo();

  assert.equal(demo.scoringApplication.fixedPostActionConsiderationAdjustmentMinor, 0);
  assert.equal(demo.scoringApplication.settlementAdjustmentAllowed, false);
  assert.match(demo.scoringApplication.policyEvaluationTrace?.effectSummary ?? "", /fixed consideration was not adjusted/i);
});

test("participants can choose less invasive options and are not forced to upload schedule or location data", () => {
  const bundle = makeBundle({
    cafeteriaOrVenueRecordRef: null,
    ordinaryMealVenueDescriptionPrivate: null,
    postMealCommitmentEvidenceRef: null,
  });
  const assessment = assessOpportunityConstraint({
    bundle,
    now: NOW,
    testimonials: [coDinerWitness(bundle)],
  });
  const panel = buildOpportunityMealReviewerPanel({ assessment, bundle });

  assert.equal(assessment.privacySensitivityScoreDecimal <= 0.2, true);
  assert.ok(panel.allowedDecisions.includes("partially_accept"));
  assert.equal(panel.requiresPolicyEvaluationTrace, true);
});

test("opportunity meal wiring covers API profile, route files, migration, schema, data model, and UI", () => {
  const apiContractSource = readRepoFile("src/lib/moral-trade/api-contract.ts");
  const apiProfile = readRepoFile("config/moral-trade/api-contract-profile.json");
  const rateLimitSource = readRepoFile("src/lib/moral-trade/api-rate-limit.ts");
  const operationsSource = readRepoFile("src/lib/moral-trade/operations.ts");
  const operationsProfile = readRepoFile("config/moral-trade/operations-profile.json");
  const databaseTypes = readRepoFile("src/lib/supabase/database.types.ts");
  const migration = readRepoFile(
    "supabase/migrations/20260626_moral_trade_opportunity_constrained_meal_evidence.sql",
  );
  const schema = readRepoFile("supabase/schema.sql");
  const dataModelProfile = readRepoFile("config/moral-trade/data-model-profile.json");
  const pledgeSwapsPage = readRepoFile("src/app/pledge-swaps/page.tsx");

  assert.match(apiContractSource, /moral_trade_opportunity_meal_evidence_contract/);
  assert.match(apiContractSource, /moral_trade_opportunity_meal_evidence_enforce/);
  assert.match(apiProfile, /opportunity_meal_evidence_contract_response/);
  assert.match(apiProfile, /opportunity_meal_evidence_enforce_request/);
  assert.match(apiProfile, /opportunity_meal_evidence_enforce_response/);
  assert.match(rateLimitSource, /opportunity_meal_evidence_enforce/);
  assert.match(operationsSource, /opportunity_meal_evidence_enforce/);
  assert.match(operationsProfile, /"key": "opportunity_meal_evidence_enforce"/);
  assert.match(databaseTypes, /moral_trade_opportunity_meal_evidence_bundles/);
  assert.match(databaseTypes, /moral_trade_opportunity_constraint_assessments/);
  assert.match(migration, /create table if not exists public\.moral_trade_opportunity_meal_evidence_bundles/);
  assert.match(migration, /participant_claims_usually_eats_once_for_meal_bool/);
  assert.match(migration, /create table if not exists public\.moral_trade_meal_witness_testimonials/);
  assert.match(migration, /co_diner_direct_observer/);
  assert.match(schema, /moral_trade_opportunity_constraint_assessments/);
  assert.match(dataModelProfile, /opportunity_constrained_meal_evidence_bundle/);
  assert.match(dataModelProfile, /meal_witness_testimonial/);
  assert.match(pledgeSwapsPage, /Add meal-context evidence/);
  assert.match(pledgeSwapsPage, /opportunity-constrained meal/);
  assert.match(pledgeSwapsPage, /Funders and public reports will not see witness names/);
});
