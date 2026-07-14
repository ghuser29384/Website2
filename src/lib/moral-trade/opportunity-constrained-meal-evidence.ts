import { createHash } from "node:crypto";

export const MORAL_TRADE_OPPORTUNITY_MEAL_EVIDENCE_CONTRACT_VERSION =
  "moral-trade-opportunity-constrained-meal-evidence-v0.1-2026-06";
export const MORAL_TRADE_OPPORTUNITY_MEAL_EVIDENCE_VALIDATOR_VERSION =
  "moral-trade-opportunity-constrained-meal-evidence-validator-v0.1";

const HASH_ALGORITHM = "sha256";

export type MealLabel = "breakfast" | "lunch" | "dinner" | "snack" | "other";
export type OrdinaryMealVenueType =
  | "school_cafeteria"
  | "employer_cafeteria"
  | "dining_hall"
  | "home"
  | "restaurant"
  | "other";
export type VenueAccessModel =
  | "swipe_based"
  | "meal_plan"
  | "cash_register"
  | "open_access"
  | "unknown"
  | "other";
export type PostMealCommitmentType =
  | "class"
  | "exam"
  | "work_shift"
  | "meeting"
  | "travel"
  | "appointment"
  | "other";
export type OpportunityMealBundleStatus =
  | "draft"
  | "submitted"
  | "under_review"
  | "accepted"
  | "partially_accepted"
  | "rejected"
  | "disputed";
export type MealWitnessRole =
  | "baseline_witness"
  | "co_diner_direct_observer"
  | "schedule_constraint_witness";
export type MealObservationCoverage = "whole_meal" | "most_of_meal" | "part_of_meal" | "not_observed";
export type MealWitnessReviewStatus =
  | "pending"
  | "accepted"
  | "rejected"
  | "needs_more_info"
  | "disputed";

export interface OpportunityConstrainedMealEvidenceBundle {
  id: string;
  participantUserId: string;
  pledgeSwapId: string | null;
  purchaseEnvelopeType: string | null;
  purchaseEnvelopeId: string | null;
  participantActionCommitmentId: string | null;
  actionTemplateId: string;
  mealLabel: MealLabel;
  mealWindowStartAt: string;
  mealWindowEndAt: string;
  ordinaryMealVenueType: OrdinaryMealVenueType;
  ordinaryMealVenueDescriptionPrivate: string | null;
  venueAccessModel: VenueAccessModel;
  participantClaimsUsualVenueForMeal: boolean;
  participantClaimsUsuallyEatsOnceForMeal: boolean;
  postMealCommitmentClaimed: boolean;
  postMealCommitmentType: PostMealCommitmentType | null;
  postMealCommitmentStartAt: string | null;
  postMealCommitmentEvidenceRef: string | null;
  cafeteriaOrVenueRecordRef: string | null;
  coDinerCount: number;
  baselineWitnessCount: number;
  directObserverTestimonialCount: number;
  contraryReportCount: number;
  bundleStatus: OpportunityMealBundleStatus;
  reviewerUserId: string | null;
  participantVisibleSummary: string | null;
  privateReviewerNotesRef: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MealWitnessTestimonial {
  id: string;
  evidenceBundleId: string;
  participantUserId: string;
  witnessRole: MealWitnessRole;
  mealLabel: MealLabel;
  observedMealVenuePrivate: string | null;
  observationCoverage: MealObservationCoverage;
  directlyObservedMeal: boolean;
  participantLeftAndReturnedDuringMeal: boolean;
  sawParticipantEatMeatOrFish: boolean;
  reasonToThinkAteMeatFishBeforeOrAfter: boolean;
  noMeatFishCompletionCredenceDecimal: number | null;
  baselineCounterfactualCredenceDecimal: number | null;
  knowsUsualVenueForMeal: boolean | null;
  knowsUsuallyEatsOnceForMeal: boolean | null;
  basisTextPrivate: string;
  pressuredToSubmit: boolean;
  sidePaymentConcern: boolean;
  misleadingEvidenceConcern: boolean;
  testimonialStatus: "submitted" | "under_review" | "accepted" | "partially_accepted" | "rejected" | "disputed";
  reviewerUserId: string | null;
  participantVisibleSummary: string | null;
  privateReviewerNotesRef: string | null;
  submittedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface OpportunityConstraintPolicy {
  id: string;
  policyVersion: string;
  policyHash: string;
  status: "draft" | "active" | "superseded";
  baseSelfAttestationCompletionConfidenceDecimal: number;
  seedPosteriorCompletionConfidenceDecimal: number;
  maxCompletionConfidenceDecimal: number;
  maxCompletionConfidenceWithContraryEvidenceDecimal: number;
  maxCompletionConfidenceWithoutDirectObserverDecimal: number;
  maxAdditionalityAdjustmentDecimal: number;
  privacyInvasiveEvidenceOverrewardCapDecimal: number;
  weights: {
    ordinaryVenueSupport: number;
    accessConstraint: number;
    coDinerObservation: number;
    postMealCommitment: number;
    singleMealHabit: number;
    baselineWitness: number;
    independence: number;
    consistency: number;
  };
  requiredForSeedPosterior: {
    preDeclaredMealContext: true;
    directCoDinerObservation: true;
    postMealCommitmentSupport: true;
    noContraryEvidence: true;
  };
  fixedConsiderationAdjustmentAllowed: false;
}

export interface OpportunityConstraintAssessment {
  id: string;
  evidenceBundleId: string;
  participantUserId: string;
  sourceType: string;
  sourceId: string;
  ordinaryVenueSupportScoreDecimal: number;
  swipeOrAccessConstraintScoreDecimal: number;
  coDinerObservationScoreDecimal: number;
  postMealCommitmentScoreDecimal: number;
  usualSingleMealHabitScoreDecimal: number;
  baselineWitnessScoreDecimal: number;
  independenceScoreDecimal: number;
  consistencyScoreDecimal: number;
  collusionRiskScoreDecimal: number;
  contraryEvidenceScoreDecimal: number;
  privacySensitivityScoreDecimal: number;
  proposedCompletionConfidenceDecimal: number;
  proposedAdditionalityAdjustmentDecimal: number | null;
  capAppliedDecimal: number | null;
  acceptedForCompletionVerification: boolean;
  acceptedForAdditionality: boolean;
  reviewerId: string | null;
  reviewStatus: MealWitnessReviewStatus;
  participantVisibleSummary: string | null;
  privateNotesRef: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OpportunityMealPolicyEvaluationTrace {
  id: string;
  subjectType: "opportunity_constrained_meal_evidence_bundle";
  subjectId: string;
  policyHash: string;
  materialEffects: Array<"verification_confidence" | "additionality" | "risk_review">;
  effectSummary: string;
  createdAt: string;
}

export interface OpportunityMealEvidenceApplication {
  status: "pass" | "blocked";
  verificationConfidenceDecimal: number;
  finalAdditionalityProbabilityDecimal: number;
  verificationConfidenceDeltaDecimal: number;
  finalAdditionalityProbabilityDeltaDecimal: number;
  fixedPostActionConsiderationAdjustmentMinor: 0;
  settlementAdjustmentAllowed: false;
  auditTraceRequired: true;
  policyEvaluationTrace: OpportunityMealPolicyEvaluationTrace | null;
  blockers: string[];
}

export interface OpportunityMealPublicReportSummary {
  publicSummary: string | null;
  reviewedMealContextEvidenceUsed: boolean;
  aggregateSmallCellSuppression: true;
  privateFieldsSuppressed: true;
  suppressedFields: string[];
}

export interface OpportunityMealReviewerPanel {
  bundleId: string;
  sections: Array<{
    key:
      | "baseline_support"
      | "direct_meal_observation_support"
      | "venue_access_constraint"
      | "post_meal_commitment_constraint"
      | "single_meal_habit_support"
      | "consistency_across_evidence"
      | "collusion_pressure_risk"
      | "proposed_verification_confidence"
      | "proposed_additionality_adjustment"
      | "cap_and_rationale";
    label: string;
    value: string;
    score: number | null;
  }>;
  allowedDecisions: Array<"accept" | "partially_accept" | "reject" | "escalate">;
  requiresPolicyEvaluationTrace: boolean;
}

export interface OpportunityMealEvidenceContract {
  version: typeof MORAL_TRADE_OPPORTUNITY_MEAL_EVIDENCE_CONTRACT_VERSION;
  purpose: string;
  modelNames: string[];
  firstClassRecordTables: string[];
  witnessRoles: MealWitnessRole[];
  coDinerTestimonialQuestions: string[];
  baselineWitnessQuestions: string[];
  participantEvidenceFlowPrompts: string[];
  privacyWarnings: string[];
  reviewerPanelFields: string[];
  publicReportingRule: string;
  integrationRules: string[];
  scoringPolicy: OpportunityConstraintPolicy;
  seedDemo: ReturnType<typeof createOneMealNoMeatOpportunityDemo>;
  contractTests: string[];
}

export interface OpportunityMealEvidenceValidation {
  status: "pass" | "fail";
  validatorName: "moral-trade-opportunity-constrained-meal-evidence-contract";
  validatorVersion: typeof MORAL_TRADE_OPPORTUNITY_MEAL_EVIDENCE_VALIDATOR_VERSION;
  contractVersion: typeof MORAL_TRADE_OPPORTUNITY_MEAL_EVIDENCE_CONTRACT_VERSION;
  checks: Array<{
    id: string;
    label: string;
    status: "pass" | "fail";
    evidence: string;
  }>;
  blockers: string[];
}

const FIRST_CLASS_RECORD_TABLES = [
  "moral_trade_opportunity_constraint_policies",
  "moral_trade_opportunity_meal_evidence_bundles",
  "moral_trade_meal_witness_testimonials",
  "moral_trade_opportunity_constraint_assessments",
  "moral_trade_opportunity_meal_audit_events",
] as const;

const MODEL_NAMES = [
  "OpportunityConstrainedMealEvidenceBundle",
  "MealWitnessTestimonial",
  "OpportunityConstraintPolicy",
  "OpportunityConstraintAssessment",
  "OpportunityMealPolicyEvaluationTrace",
] as const;

export const CO_DINER_TESTIMONIAL_QUESTIONS = [
  "Did you eat with or directly observe the participant during this meal?",
  "What meal did you observe?",
  "Where did the meal happen?",
  "Did you see the participant eat meat/fish?",
  "Did you observe the participant for the whole meal, most of the meal, or only part of the meal?",
  "Did the participant leave and return during the meal?",
  "Do you have any reason to think they ate meat/fish before or after the observed meal?",
  "What is your credence that the participant did not eat meat/fish for this pledged meal?",
  "What is the basis for your credence?",
  "Were you pressured to submit this testimony?",
  "Do you have any concern about side payments, pressure, or misleading evidence?",
] as const;

export const BASELINE_WITNESS_QUESTIONS = [
  "How often do you observe or eat with this participant for this type of meal?",
  "What is your credence that the participant would have eaten meat/fish for this meal if not for the pledge-swap?",
  "What is the basis for that credence?",
  "Do you know whether the participant normally eats at this cafeteria/venue for this meal?",
  "Do you know whether the participant usually eats more than once for this meal?",
  "Do you have any reason to think their baseline is overstated?",
] as const;

export const PARTICIPANT_EVIDENCE_FLOW_PROMPTS = [
  "Where did you usually eat this meal?",
  "Was it a swipe-based cafeteria/dining hall?",
  "Who ate with you?",
  "Did you have a class, exam, work shift, meeting, travel, or appointment soon after?",
  "Do you usually eat more than once for this meal?",
  "Invite co-diners or baseline witnesses.",
] as const;

export const OPPORTUNITY_MEAL_PRIVACY_WARNINGS = [
  "Do not upload class schedules, IDs, location records, or meal-plan records unless necessary.",
  "Redact unrelated personal information.",
  "Witness testimony is private by default.",
  "Funders and public reports will not see witness names, schedules, or raw testimony.",
] as const;

const CONTRACT_TESTS = [
  "opportunity_meal_bundle_submission",
  "co_diner_testimony_completion_not_baseline",
  "baseline_testimony_additionality_not_completion",
  "swipe_cafeteria_observer_schedule_confidence_lift",
  "seed_demo_approximately_085_under_frozen_policy",
  "seed_value_configurable_and_weak_inputs_lower_score",
  "privacy_safe_public_and_funder_reporting",
  "pressure_side_payment_contrary_reports_route_risk_review",
  "verification_confidence_policy_trace",
  "fixed_consideration_not_retroactively_reduced",
  "less_invasive_optional_evidence_flow",
] as const;

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((entry) => stableStringify(entry)).join(",")}]`;

  return `{${Object.entries(value as Record<string, unknown>)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, entry]) => `${JSON.stringify(key)}:${stableStringify(entry)}`)
    .join(",")}}`;
}

function hashJson(value: unknown) {
  return `${HASH_ALGORITHM}:${createHash(HASH_ALGORITHM).update(stableStringify(value)).digest("hex")}`;
}

function idFromParts(prefix: string, ...parts: unknown[]) {
  return `${prefix}:${createHash(HASH_ALGORITHM)
    .update(stableStringify(parts))
    .digest("hex")
    .slice(0, 24)}`;
}

function clampDecimal(value: number, min = 0, max = 1) {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function round(value: number) {
  return Math.round(value * 10_000) / 10_000;
}

function hasText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isIsoDate(value: unknown): value is string {
  return hasText(value) && Number.isFinite(Date.parse(value));
}

function minutesBetween(startAt: string, endAt: string) {
  return (Date.parse(startAt) - Date.parse(endAt)) / 60_000;
}

const DEFAULT_POLICY_CANONICAL = {
  baseSelfAttestationCompletionConfidenceDecimal: 0.45,
  fixedConsiderationAdjustmentAllowed: false,
  maxAdditionalityAdjustmentDecimal: 0.12,
  maxCompletionConfidenceDecimal: 0.9,
  maxCompletionConfidenceWithContraryEvidenceDecimal: 0.35,
  maxCompletionConfidenceWithoutDirectObserverDecimal: 0.68,
  privacyInvasiveEvidenceOverrewardCapDecimal: 0.04,
  requiredForSeedPosterior: {
    directCoDinerObservation: true,
    noContraryEvidence: true,
    postMealCommitmentSupport: true,
    preDeclaredMealContext: true,
  },
  seedPosteriorCompletionConfidenceDecimal: 0.85,
  weights: {
    accessConstraint: 0.16,
    baselineWitness: 0.08,
    coDinerObservation: 0.24,
    consistency: 0.11,
    independence: 0.11,
    ordinaryVenueSupport: 0.1,
    postMealCommitment: 0.13,
    singleMealHabit: 0.07,
  },
} as const;

export const DEFAULT_OPPORTUNITY_CONSTRAINT_POLICY: OpportunityConstraintPolicy = {
  ...DEFAULT_POLICY_CANONICAL,
  id: "opportunity-constraint-policy:one-meal-no-meat:v1",
  policyHash: hashJson(DEFAULT_POLICY_CANONICAL),
  policyVersion: "opportunity-constraint-policy.one-meal-no-meat.v1",
  status: "active",
};

function accessConstraintScore(model: VenueAccessModel) {
  const scores: Record<VenueAccessModel, number> = {
    cash_register: 0.42,
    meal_plan: 0.76,
    open_access: 0.18,
    other: 0.36,
    swipe_based: 1,
    unknown: 0.28,
  };

  return scores[model];
}

function coverageWeight(coverage: MealObservationCoverage) {
  const weights: Record<MealObservationCoverage, number> = {
    most_of_meal: 0.78,
    not_observed: 0,
    part_of_meal: 0.36,
    whole_meal: 1,
  };

  return weights[coverage];
}

function average(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function check(id: string, label: string, passed: boolean, evidence: string) {
  return {
    evidence,
    id,
    label,
    status: passed ? ("pass" as const) : ("fail" as const),
  };
}

export function createOpportunityMealEvidenceBundle(input: {
  participantUserId: string;
  pledgeSwapId?: string | null;
  purchaseEnvelopeType?: string | null;
  purchaseEnvelopeId?: string | null;
  participantActionCommitmentId?: string | null;
  actionTemplateId: string;
  mealLabel: MealLabel;
  mealWindowStartAt: string;
  mealWindowEndAt: string;
  ordinaryMealVenueType: OrdinaryMealVenueType;
  ordinaryMealVenueDescriptionPrivate?: string | null;
  venueAccessModel: VenueAccessModel;
  participantClaimsUsualVenueForMeal: boolean;
  participantClaimsUsuallyEatsOnceForMeal: boolean;
  postMealCommitmentClaimed: boolean;
  postMealCommitmentType?: PostMealCommitmentType | null;
  postMealCommitmentStartAt?: string | null;
  postMealCommitmentEvidenceRef?: string | null;
  cafeteriaOrVenueRecordRef?: string | null;
  coDinerCount?: number;
  baselineWitnessCount?: number;
  directObserverTestimonialCount?: number;
  contraryReportCount?: number;
  bundleStatus?: OpportunityMealBundleStatus;
  reviewerUserId?: string | null;
  now?: string;
}) {
  const blockers: string[] = [];
  const now = input.now ?? new Date().toISOString();

  if (!hasText(input.participantUserId)) blockers.push("participant_user_id_required");
  if (!hasText(input.actionTemplateId)) blockers.push("action_template_id_required");
  if (!isIsoDate(input.mealWindowStartAt) || !isIsoDate(input.mealWindowEndAt)) {
    blockers.push("meal_window_invalid");
  } else if (Date.parse(input.mealWindowStartAt) >= Date.parse(input.mealWindowEndAt)) {
    blockers.push("meal_window_start_must_precede_end");
  }
  if (input.postMealCommitmentClaimed && !input.postMealCommitmentType) {
    blockers.push("post_meal_commitment_type_required_when_claimed");
  }

  const bundle: OpportunityConstrainedMealEvidenceBundle = {
    actionTemplateId: input.actionTemplateId,
    baselineWitnessCount: input.baselineWitnessCount ?? 0,
    bundleStatus: blockers.length ? "draft" : (input.bundleStatus ?? "submitted"),
    cafeteriaOrVenueRecordRef: input.cafeteriaOrVenueRecordRef ?? null,
    coDinerCount: input.coDinerCount ?? 0,
    contraryReportCount: input.contraryReportCount ?? 0,
    createdAt: now,
    directObserverTestimonialCount: input.directObserverTestimonialCount ?? 0,
    id: idFromParts(
      "opportunity-meal-bundle",
      input.participantUserId,
      input.pledgeSwapId,
      input.mealLabel,
      input.mealWindowStartAt,
    ),
    mealLabel: input.mealLabel,
    mealWindowEndAt: input.mealWindowEndAt,
    mealWindowStartAt: input.mealWindowStartAt,
    ordinaryMealVenueDescriptionPrivate: input.ordinaryMealVenueDescriptionPrivate ?? null,
    ordinaryMealVenueType: input.ordinaryMealVenueType,
    participantActionCommitmentId: input.participantActionCommitmentId ?? null,
    participantClaimsUsuallyEatsOnceForMeal: input.participantClaimsUsuallyEatsOnceForMeal,
    participantClaimsUsualVenueForMeal: input.participantClaimsUsualVenueForMeal,
    participantUserId: input.participantUserId,
    participantVisibleSummary: blockers.length
      ? "Meal-context evidence is still a draft."
      : "Meal-context evidence was submitted for private review.",
    pledgeSwapId: input.pledgeSwapId ?? null,
    postMealCommitmentClaimed: input.postMealCommitmentClaimed,
    postMealCommitmentEvidenceRef: input.postMealCommitmentEvidenceRef ?? null,
    postMealCommitmentStartAt: input.postMealCommitmentStartAt ?? null,
    postMealCommitmentType: input.postMealCommitmentType ?? null,
    privateReviewerNotesRef: null,
    purchaseEnvelopeId: input.purchaseEnvelopeId ?? null,
    purchaseEnvelopeType: input.purchaseEnvelopeType ?? null,
    reviewerUserId: input.reviewerUserId ?? null,
    updatedAt: now,
    venueAccessModel: input.venueAccessModel,
  };

  return {
    blockers,
    bundle,
    ok: blockers.length === 0,
  };
}

export function createMealWitnessTestimonial(input: {
  evidenceBundleId: string;
  participantUserId: string;
  witnessRole: MealWitnessRole;
  mealLabel: MealLabel;
  observedMealVenuePrivate?: string | null;
  observationCoverage?: MealObservationCoverage;
  directlyObservedMeal?: boolean;
  participantLeftAndReturnedDuringMeal?: boolean;
  sawParticipantEatMeatOrFish?: boolean;
  reasonToThinkAteMeatFishBeforeOrAfter?: boolean;
  noMeatFishCompletionCredenceDecimal?: number | null;
  baselineCounterfactualCredenceDecimal?: number | null;
  knowsUsualVenueForMeal?: boolean | null;
  knowsUsuallyEatsOnceForMeal?: boolean | null;
  basisTextPrivate: string;
  pressuredToSubmit?: boolean;
  sidePaymentConcern?: boolean;
  misleadingEvidenceConcern?: boolean;
  testimonialStatus?: MealWitnessTestimonial["testimonialStatus"];
  reviewerUserId?: string | null;
  now?: string;
}) {
  const blockers: string[] = [];
  const now = input.now ?? new Date().toISOString();

  if (!hasText(input.basisTextPrivate)) blockers.push("witness_basis_required");
  for (const [key, value] of [
    ["no_meat_fish_completion_credence_decimal", input.noMeatFishCompletionCredenceDecimal],
    ["baseline_counterfactual_credence_decimal", input.baselineCounterfactualCredenceDecimal],
  ] as const) {
    if (value != null && (!Number.isFinite(value) || value < 0 || value > 1)) {
      blockers.push(`${key}_out_of_bounds`);
    }
  }
  if (input.witnessRole === "co_diner_direct_observer" && input.directlyObservedMeal === false) {
    blockers.push("co_diner_must_directly_observe_meal");
  }

  const concern =
    Boolean(input.pressuredToSubmit) ||
    Boolean(input.sidePaymentConcern) ||
    Boolean(input.misleadingEvidenceConcern);
  const testimonial: MealWitnessTestimonial = {
    baselineCounterfactualCredenceDecimal: input.baselineCounterfactualCredenceDecimal ?? null,
    basisTextPrivate: input.basisTextPrivate,
    createdAt: now,
    directlyObservedMeal: input.directlyObservedMeal ?? input.witnessRole === "co_diner_direct_observer",
    evidenceBundleId: input.evidenceBundleId,
    id: idFromParts(
      "meal-witness-testimonial",
      input.evidenceBundleId,
      input.witnessRole,
      input.basisTextPrivate,
      now,
    ),
    knowsUsualVenueForMeal: input.knowsUsualVenueForMeal ?? null,
    knowsUsuallyEatsOnceForMeal: input.knowsUsuallyEatsOnceForMeal ?? null,
    mealLabel: input.mealLabel,
    misleadingEvidenceConcern: Boolean(input.misleadingEvidenceConcern),
    noMeatFishCompletionCredenceDecimal: input.noMeatFishCompletionCredenceDecimal ?? null,
    observationCoverage: input.observationCoverage ?? "not_observed",
    observedMealVenuePrivate: input.observedMealVenuePrivate ?? null,
    participantLeftAndReturnedDuringMeal: Boolean(input.participantLeftAndReturnedDuringMeal),
    participantUserId: input.participantUserId,
    participantVisibleSummary: concern
      ? "A private meal-context concern was submitted for reviewer use."
      : "A private meal-context witness statement was submitted.",
    pressuredToSubmit: Boolean(input.pressuredToSubmit),
    privateReviewerNotesRef: concern
      ? idFromParts("meal-witness-private-review", input.evidenceBundleId, input.witnessRole)
      : null,
    reasonToThinkAteMeatFishBeforeOrAfter: Boolean(input.reasonToThinkAteMeatFishBeforeOrAfter),
    reviewerUserId: input.reviewerUserId ?? null,
    sawParticipantEatMeatOrFish: Boolean(input.sawParticipantEatMeatOrFish),
    sidePaymentConcern: Boolean(input.sidePaymentConcern),
    submittedAt: now,
    testimonialStatus:
      input.testimonialStatus ?? (concern || blockers.length ? "under_review" : "submitted"),
    updatedAt: now,
    witnessRole: input.witnessRole,
  };

  return {
    blockers,
    ok: blockers.length === 0,
    testimonial,
  };
}

export function assessOpportunityConstraint(input: {
  bundle: OpportunityConstrainedMealEvidenceBundle;
  testimonials: MealWitnessTestimonial[];
  policy?: OpportunityConstraintPolicy;
  sourceType?: string;
  sourceId?: string;
  reviewerId?: string | null;
  now?: string;
}): OpportunityConstraintAssessment {
  const policy = input.policy ?? DEFAULT_OPPORTUNITY_CONSTRAINT_POLICY;
  const now = input.now ?? new Date().toISOString();
  const bundle = input.bundle;
  const coDinerTestimonials = input.testimonials.filter(
    (testimonial) => testimonial.witnessRole === "co_diner_direct_observer",
  );
  const baselineTestimonials = input.testimonials.filter(
    (testimonial) => testimonial.witnessRole === "baseline_witness",
  );
  const scheduleTestimonials = input.testimonials.filter(
    (testimonial) => testimonial.witnessRole === "schedule_constraint_witness",
  );
  const ordinaryVenueSupport = clampDecimal(
    (bundle.participantClaimsUsualVenueForMeal ? 0.55 : 0) +
      (bundle.cafeteriaOrVenueRecordRef ? 0.25 : 0) +
      (baselineTestimonials.some((testimonial) => testimonial.knowsUsualVenueForMeal) ? 0.2 : 0),
  );
  const swipeOrAccessConstraint = accessConstraintScore(bundle.venueAccessModel);
  const coDinerObservation = clampDecimal(
    average(
      coDinerTestimonials.map((testimonial) => {
        const directObservation = testimonial.directlyObservedMeal ? 1 : 0;
        const noMeatCredence = testimonial.noMeatFishCompletionCredenceDecimal ?? 0.5;
        const coverage = coverageWeight(testimonial.observationCoverage);
        const leftPenalty = testimonial.participantLeftAndReturnedDuringMeal ? 0.22 : 0;
        const sawMeatPenalty = testimonial.sawParticipantEatMeatOrFish ? 1 : 0;
        const beforeAfterPenalty = testimonial.reasonToThinkAteMeatFishBeforeOrAfter ? 0.35 : 0;

        return clampDecimal(directObservation * noMeatCredence * coverage - leftPenalty - sawMeatPenalty - beforeAfterPenalty);
      }),
    ),
  );
  const commitmentGapMinutes =
    bundle.postMealCommitmentClaimed && bundle.postMealCommitmentStartAt
      ? minutesBetween(bundle.postMealCommitmentStartAt, bundle.mealWindowEndAt)
      : Number.POSITIVE_INFINITY;
  const postMealCommitment = clampDecimal(
    bundle.postMealCommitmentClaimed
      ? (bundle.postMealCommitmentEvidenceRef ? 0.72 : 0.42) +
          (commitmentGapMinutes >= 0 && commitmentGapMinutes <= 90 ? 0.22 : 0) +
          (scheduleTestimonials.length > 0 ? 0.12 : 0)
      : 0,
  );
  const usualSingleMealHabit = clampDecimal(
    (bundle.participantClaimsUsuallyEatsOnceForMeal ? 0.65 : 0.2) +
      (baselineTestimonials.some((testimonial) => testimonial.knowsUsuallyEatsOnceForMeal) ? 0.2 : 0),
  );
  const baselineWitnessScore = clampDecimal(
    average(
      baselineTestimonials.map((testimonial) =>
        (testimonial.baselineCounterfactualCredenceDecimal ?? 0) *
        (testimonial.knowsUsualVenueForMeal || testimonial.knowsUsuallyEatsOnceForMeal ? 0.9 : 0.55),
      ),
    ),
  );
  const concernCount = input.testimonials.filter(
    (testimonial) =>
      testimonial.pressuredToSubmit ||
      testimonial.sidePaymentConcern ||
      testimonial.misleadingEvidenceConcern,
  ).length;
  const contraryEvidence = clampDecimal(
    bundle.contraryReportCount * 0.34 +
      input.testimonials.filter(
        (testimonial) =>
          testimonial.sawParticipantEatMeatOrFish ||
          testimonial.reasonToThinkAteMeatFishBeforeOrAfter,
      ).length *
        0.4,
  );
  const collusionRisk = clampDecimal(
    concernCount * 0.25 +
      input.testimonials.filter((testimonial) => testimonial.testimonialStatus === "disputed").length * 0.22 +
      input.testimonials.filter((testimonial) => /same words|template|reciprocal/i.test(testimonial.basisTextPrivate)).length *
        0.18,
  );
  const independence = clampDecimal(1 - collusionRisk);
  const consistency = clampDecimal(
    0.92 -
      contraryEvidence * 0.55 -
      collusionRisk * 0.3 -
      (coDinerTestimonials.some((testimonial) => testimonial.observationCoverage === "part_of_meal") ? 0.1 : 0),
  );
  const privacySensitivity = clampDecimal(
    (bundle.ordinaryMealVenueDescriptionPrivate ? 0.2 : 0) +
      (bundle.cafeteriaOrVenueRecordRef ? 0.22 : 0) +
      (bundle.postMealCommitmentEvidenceRef ? 0.26 : 0) +
      (input.testimonials.some((testimonial) => hasText(testimonial.observedMealVenuePrivate)) ? 0.16 : 0),
  );
  const weightedSupport =
    ordinaryVenueSupport * policy.weights.ordinaryVenueSupport +
    swipeOrAccessConstraint * policy.weights.accessConstraint +
    coDinerObservation * policy.weights.coDinerObservation +
    postMealCommitment * policy.weights.postMealCommitment +
    usualSingleMealHabit * policy.weights.singleMealHabit +
    baselineWitnessScore * policy.weights.baselineWitness +
    independence * policy.weights.independence +
    consistency * policy.weights.consistency;
  const weightTotal = Object.values(policy.weights).reduce((sum, value) => sum + value, 0);
  const normalizedSupport = clampDecimal(weightedSupport / weightTotal);
  const riskPenalty = contraryEvidence * 0.42 + collusionRisk * 0.2;
  const uncappedConfidence = clampDecimal(
    policy.baseSelfAttestationCompletionConfidenceDecimal +
      (policy.maxCompletionConfidenceDecimal - policy.baseSelfAttestationCompletionConfidenceDecimal) *
        normalizedSupport -
      riskPenalty,
  );
  const candidateCaps = [policy.maxCompletionConfidenceDecimal];

  if (contraryEvidence > 0) {
    candidateCaps.push(policy.maxCompletionConfidenceWithContraryEvidenceDecimal);
  }
  if (!coDinerTestimonials.some((testimonial) => testimonial.directlyObservedMeal)) {
    candidateCaps.push(policy.maxCompletionConfidenceWithoutDirectObserverDecimal);
  }
  if (
    ordinaryVenueSupport >= 0.75 &&
    swipeOrAccessConstraint >= 0.75 &&
    coDinerObservation >= 0.7 &&
    postMealCommitment >= 0.7 &&
    usualSingleMealHabit >= 0.65 &&
    consistency >= 0.75 &&
    contraryEvidence === 0
  ) {
    candidateCaps.push(policy.seedPosteriorCompletionConfidenceDecimal);
  }

  const cap = Math.min(...candidateCaps);
  const proposedCompletionConfidence = round(Math.min(uncappedConfidence, cap));
  const additionalityAdjustment =
    baselineWitnessScore > 0
      ? round(policy.maxAdditionalityAdjustmentDecimal * baselineWitnessScore * independence * consistency)
      : null;
  const riskReviewRequired = concernCount > 0 || collusionRisk >= 0.35 || contraryEvidence > 0;

  return {
    acceptedForAdditionality:
      baselineWitnessScore >= 0.45 && consistency >= 0.55 && contraryEvidence < 0.8,
    acceptedForCompletionVerification:
      coDinerObservation >= 0.35 &&
      proposedCompletionConfidence > policy.baseSelfAttestationCompletionConfidenceDecimal &&
      contraryEvidence === 0 &&
      collusionRisk < 0.5,
    baselineWitnessScoreDecimal: round(baselineWitnessScore),
    capAppliedDecimal: cap < uncappedConfidence ? round(cap) : null,
    coDinerObservationScoreDecimal: round(coDinerObservation),
    collusionRiskScoreDecimal: round(collusionRisk),
    consistencyScoreDecimal: round(consistency),
    contraryEvidenceScoreDecimal: round(contraryEvidence),
    createdAt: now,
    evidenceBundleId: bundle.id,
    id: idFromParts("opportunity-constraint-assessment", bundle.id, policy.policyHash, now),
    independenceScoreDecimal: round(independence),
    ordinaryVenueSupportScoreDecimal: round(ordinaryVenueSupport),
    participantUserId: bundle.participantUserId,
    participantVisibleSummary: riskReviewRequired
      ? "Meal-context evidence is under private risk review."
      : "Meal-context evidence can support private verification review.",
    postMealCommitmentScoreDecimal: round(postMealCommitment),
    privacySensitivityScoreDecimal: round(privacySensitivity),
    privateNotesRef: riskReviewRequired ? idFromParts("opportunity-meal-private-notes", bundle.id) : null,
    proposedAdditionalityAdjustmentDecimal: additionalityAdjustment,
    proposedCompletionConfidenceDecimal: proposedCompletionConfidence,
    reviewStatus: riskReviewRequired ? "needs_more_info" : "accepted",
    reviewerId: input.reviewerId ?? null,
    sourceId: input.sourceId ?? bundle.id,
    sourceType: input.sourceType ?? "opportunity_constrained_meal_evidence_bundle",
    swipeOrAccessConstraintScoreDecimal: round(swipeOrAccessConstraint),
    updatedAt: now,
    usualSingleMealHabitScoreDecimal: round(usualSingleMealHabit),
  };
}

export function applyOpportunityConstraintAssessment(input: {
  assessment: OpportunityConstraintAssessment;
  currentVerificationConfidenceDecimal: number;
  currentFinalAdditionalityProbabilityDecimal: number;
  policy?: OpportunityConstraintPolicy;
  fixedConsiderationLocked: boolean;
  strongerContradictoryEvidence?: boolean;
  now?: string;
}): OpportunityMealEvidenceApplication {
  const policy = input.policy ?? DEFAULT_OPPORTUNITY_CONSTRAINT_POLICY;
  const now = input.now ?? new Date().toISOString();
  const blockers: string[] = [];

  if (policy.status !== "active" || !policy.policyHash.startsWith("sha256:")) {
    blockers.push("frozen_active_opportunity_constraint_policy_required");
  }
  if (input.strongerContradictoryEvidence || input.assessment.contraryEvidenceScoreDecimal > 0) {
    blockers.push("stronger_contradictory_evidence_controls_completion");
  }

  const additionalityDelta =
    input.assessment.acceptedForAdditionality && input.assessment.proposedAdditionalityAdjustmentDecimal != null
      ? input.assessment.proposedAdditionalityAdjustmentDecimal
      : 0;
  const verificationConfidence = blockers.length
    ? input.currentVerificationConfidenceDecimal
    : Math.max(
        input.currentVerificationConfidenceDecimal,
        input.assessment.acceptedForCompletionVerification
          ? input.assessment.proposedCompletionConfidenceDecimal
          : input.currentVerificationConfidenceDecimal,
      );
  const additionalityProbability = blockers.includes("frozen_active_opportunity_constraint_policy_required")
    ? input.currentFinalAdditionalityProbabilityDecimal
    : clampDecimal(input.currentFinalAdditionalityProbabilityDecimal + additionalityDelta);
  const materialEffects: OpportunityMealPolicyEvaluationTrace["materialEffects"] = [];

  if (verificationConfidence !== input.currentVerificationConfidenceDecimal) {
    materialEffects.push("verification_confidence");
  }
  if (additionalityProbability !== input.currentFinalAdditionalityProbabilityDecimal) {
    materialEffects.push("additionality");
  }
  if (input.assessment.reviewStatus === "needs_more_info") {
    materialEffects.push("risk_review");
  }

  return {
    auditTraceRequired: true,
    blockers,
    finalAdditionalityProbabilityDecimal: round(additionalityProbability),
    finalAdditionalityProbabilityDeltaDecimal: round(
      additionalityProbability - input.currentFinalAdditionalityProbabilityDecimal,
    ),
    fixedPostActionConsiderationAdjustmentMinor: 0,
    policyEvaluationTrace: blockers.includes("frozen_active_opportunity_constraint_policy_required")
      ? null
      : {
          createdAt: now,
          effectSummary:
            "Opportunity-constrained meal evidence affected verification or additionality only through the frozen review policy; fixed consideration was not adjusted.",
          id: idFromParts("policy-evaluation-trace", input.assessment.id, policy.policyHash, now),
          materialEffects,
          policyHash: policy.policyHash,
          subjectId: input.assessment.evidenceBundleId,
          subjectType: "opportunity_constrained_meal_evidence_bundle",
        },
    settlementAdjustmentAllowed: false,
    status: blockers.length ? "blocked" : "pass",
    verificationConfidenceDecimal: round(verificationConfidence),
    verificationConfidenceDeltaDecimal: round(
      verificationConfidence - input.currentVerificationConfidenceDecimal,
    ),
  };
}

export function buildOpportunityMealPublicReportSummary(input: {
  assessment: OpportunityConstraintAssessment;
  policyAllowsCoarseSummary?: boolean;
}): OpportunityMealPublicReportSummary {
  const used =
    Boolean(input.policyAllowsCoarseSummary ?? true) &&
    (input.assessment.acceptedForCompletionVerification || input.assessment.acceptedForAdditionality);

  return {
    aggregateSmallCellSuppression: true,
    privateFieldsSuppressed: true,
    publicSummary: used
      ? "Verification used reviewed meal-context evidence and private third-party testimony."
      : null,
    reviewedMealContextEvidenceUsed: used,
    suppressedFields: [
      "cafeteria name",
      "class schedule",
      "witness names",
      "relationship details",
      "raw testimony",
      "private location context",
    ],
  };
}

export function buildOpportunityMealReviewerPanel(input: {
  bundle: OpportunityConstrainedMealEvidenceBundle;
  assessment: OpportunityConstraintAssessment;
}): OpportunityMealReviewerPanel {
  const { assessment, bundle } = input;

  return {
    allowedDecisions: ["accept", "partially_accept", "reject", "escalate"],
    bundleId: bundle.id,
    requiresPolicyEvaluationTrace: true,
    sections: [
      {
        key: "baseline_support",
        label: "Baseline support",
        score: assessment.baselineWitnessScoreDecimal,
        value: `${bundle.baselineWitnessCount} baseline witness input(s)`,
      },
      {
        key: "direct_meal_observation_support",
        label: "Direct meal observation support",
        score: assessment.coDinerObservationScoreDecimal,
        value: `${bundle.directObserverTestimonialCount || bundle.coDinerCount} co-diner/direct observer input(s)`,
      },
      {
        key: "venue_access_constraint",
        label: "Venue/access constraint",
        score: assessment.swipeOrAccessConstraintScoreDecimal,
        value: bundle.venueAccessModel.replaceAll("_", " "),
      },
      {
        key: "post_meal_commitment_constraint",
        label: "Post-meal commitment constraint",
        score: assessment.postMealCommitmentScoreDecimal,
        value: bundle.postMealCommitmentType?.replaceAll("_", " ") ?? "not claimed",
      },
      {
        key: "single_meal_habit_support",
        label: "Single-meal habit support",
        score: assessment.usualSingleMealHabitScoreDecimal,
        value: bundle.participantClaimsUsuallyEatsOnceForMeal ? "participant reports usually eating once" : "not supported",
      },
      {
        key: "consistency_across_evidence",
        label: "Consistency across evidence",
        score: assessment.consistencyScoreDecimal,
        value: assessment.contraryEvidenceScoreDecimal > 0 ? "contrary evidence present" : "no contrary report recorded",
      },
      {
        key: "collusion_pressure_risk",
        label: "Collusion/pressure risk",
        score: assessment.collusionRiskScoreDecimal,
        value: assessment.reviewStatus === "needs_more_info" ? "risk review required" : "ordinary review",
      },
      {
        key: "proposed_verification_confidence",
        label: "Proposed verification confidence",
        score: assessment.proposedCompletionConfidenceDecimal,
        value: `${Math.round(assessment.proposedCompletionConfidenceDecimal * 100)}%`,
      },
      {
        key: "proposed_additionality_adjustment",
        label: "Proposed additionality adjustment",
        score: assessment.proposedAdditionalityAdjustmentDecimal,
        value:
          assessment.proposedAdditionalityAdjustmentDecimal == null
            ? "none"
            : `${Math.round(assessment.proposedAdditionalityAdjustmentDecimal * 100)} percentage point(s)`,
      },
      {
        key: "cap_and_rationale",
        label: "Cap and rationale",
        score: assessment.capAppliedDecimal,
        value:
          assessment.capAppliedDecimal == null
            ? "no cap applied"
            : `capped at ${Math.round(assessment.capAppliedDecimal * 100)}% under frozen policy`,
      },
    ],
  };
}

export function createOneMealNoMeatOpportunityDemo(policy = DEFAULT_OPPORTUNITY_CONSTRAINT_POLICY) {
  const now = "2026-06-26T12:00:00.000Z";
  const bundleResult = createOpportunityMealEvidenceBundle({
    actionTemplateId: "action-template:one-meal-no-meat-lunch",
    baselineWitnessCount: 2,
    cafeteriaOrVenueRecordRef: "private-ref:redacted-cafeteria-context",
    coDinerCount: 1,
    directObserverTestimonialCount: 1,
    mealLabel: "lunch",
    mealWindowEndAt: "2026-07-02T17:45:00.000Z",
    mealWindowStartAt: "2026-07-02T17:10:00.000Z",
    now,
    ordinaryMealVenueDescriptionPrivate: "Redacted school cafeteria name",
    ordinaryMealVenueType: "school_cafeteria",
    participantClaimsUsuallyEatsOnceForMeal: true,
    participantClaimsUsualVenueForMeal: true,
    participantUserId: "participant:meal-demo",
    pledgeSwapId: "pledge-swap:one-meal-no-meat-demo",
    postMealCommitmentClaimed: true,
    postMealCommitmentEvidenceRef: "private-ref:redacted-class-calendar",
    postMealCommitmentStartAt: "2026-07-02T18:00:00.000Z",
    postMealCommitmentType: "class",
    purchaseEnvelopeId: "purchase-envelope:simulated-donation-5",
    purchaseEnvelopeType: "crowdfunded_pledge_swap_lot",
    venueAccessModel: "swipe_based",
  });
  const bundle = bundleResult.bundle;
  const testimonials = [
    createMealWitnessTestimonial({
      baselineCounterfactualCredenceDecimal: 0.86,
      basisTextPrivate:
        "I often eat weekday lunch with the participant and they usually choose a meat or fish entree.",
      evidenceBundleId: bundle.id,
      knowsUsualVenueForMeal: true,
      knowsUsuallyEatsOnceForMeal: true,
      mealLabel: "lunch",
      now,
      participantUserId: bundle.participantUserId,
      witnessRole: "baseline_witness",
    }).testimonial,
    createMealWitnessTestimonial({
      baselineCounterfactualCredenceDecimal: 0.82,
      basisTextPrivate:
        "I have seen their ordinary lunch choices at this dining hall and believe meat/fish was likely absent the pledge.",
      evidenceBundleId: bundle.id,
      knowsUsualVenueForMeal: true,
      knowsUsuallyEatsOnceForMeal: true,
      mealLabel: "lunch",
      now,
      participantUserId: bundle.participantUserId,
      witnessRole: "baseline_witness",
    }).testimonial,
    createMealWitnessTestimonial({
      basisTextPrivate:
        "I ate with the participant for the whole lunch and saw no meat or fish. They did not leave and return.",
      directlyObservedMeal: true,
      evidenceBundleId: bundle.id,
      mealLabel: "lunch",
      noMeatFishCompletionCredenceDecimal: 0.94,
      now,
      observationCoverage: "whole_meal",
      observedMealVenuePrivate: "Redacted school cafeteria",
      participantUserId: bundle.participantUserId,
      witnessRole: "co_diner_direct_observer",
    }).testimonial,
    createMealWitnessTestimonial({
      basisTextPrivate: "I saw the participant go directly to an important class after lunch.",
      directlyObservedMeal: false,
      evidenceBundleId: bundle.id,
      mealLabel: "lunch",
      now,
      observationCoverage: "not_observed",
      participantUserId: bundle.participantUserId,
      witnessRole: "schedule_constraint_witness",
    }).testimonial,
  ];
  const assessment = assessOpportunityConstraint({
    bundle,
    policy,
    sourceId: bundle.id,
    sourceType: "seed_demo",
    testimonials,
    now,
  });
  const application = applyOpportunityConstraintAssessment({
    assessment,
    currentFinalAdditionalityProbabilityDecimal: 0.62,
    currentVerificationConfidenceDecimal: 0.45,
    fixedConsiderationLocked: true,
    now,
    policy,
  });

  return {
    assessment,
    bundle,
    consideration: {
      amountMinor: 500,
      currency: "USD",
      description: "$5 simulated donation to an approved effective charity",
      fixedConsiderationLocked: true,
    },
    publicReport: buildOpportunityMealPublicReportSummary({ assessment }),
    reviewerPanel: buildOpportunityMealReviewerPanel({ assessment, bundle }),
    reviewerDecision: {
      completionConfidenceDecimal: assessment.proposedCompletionConfidenceDecimal,
      decision: "accepted",
      policyHash: policy.policyHash,
    },
    scoringApplication: application,
    testimonials,
  };
}

export function getOpportunityMealEvidenceContract(): OpportunityMealEvidenceContract {
  return {
    baselineWitnessQuestions: [...BASELINE_WITNESS_QUESTIONS],
    coDinerTestimonialQuestions: [...CO_DINER_TESTIMONIAL_QUESTIONS],
    contractTests: [...CONTRACT_TESTS],
    firstClassRecordTables: [...FIRST_CLASS_RECORD_TABLES],
    integrationRules: [
      "Opportunity-constrained meal evidence can feed verification_confidence after review.",
      "Baseline witness evidence can feed final_additionality_probability when accepted for additionality.",
      "Post-hoc score changes cannot reduce fixed consideration after the participant acted under frozen terms.",
      "This mechanism does not override stronger contradictory evidence.",
      "Participants can use less invasive evidence options; schedule, location, and school/employer records are optional.",
    ],
    modelNames: [...MODEL_NAMES],
    participantEvidenceFlowPrompts: [...PARTICIPANT_EVIDENCE_FLOW_PROMPTS],
    privacyWarnings: [...OPPORTUNITY_MEAL_PRIVACY_WARNINGS],
    publicReportingRule:
      "Public and funder reports may say verification used reviewed meal-context evidence and private third-party testimony, but must not expose cafeteria names, schedules, witness names, relationship details, raw testimony, or private context.",
    purpose:
      "Support optional one-meal or one-day no-meat pledge-swap verification using private meal-context evidence about realistic opportunity to secretly eat meat after an observed meal.",
    reviewerPanelFields: [
      "baseline support",
      "direct meal observation support",
      "venue/access constraint",
      "post-meal commitment constraint",
      "single-meal habit support",
      "consistency across evidence",
      "collusion/pressure risk",
      "proposed verification confidence",
      "proposed additionality adjustment",
      "cap and rationale",
    ],
    scoringPolicy: DEFAULT_OPPORTUNITY_CONSTRAINT_POLICY,
    seedDemo: createOneMealNoMeatOpportunityDemo(),
    version: MORAL_TRADE_OPPORTUNITY_MEAL_EVIDENCE_CONTRACT_VERSION,
    witnessRoles: ["baseline_witness", "co_diner_direct_observer", "schedule_constraint_witness"],
  };
}

function hasAll(values: readonly string[], required: readonly string[]) {
  return required.every((entry) => values.includes(entry));
}

export function validateOpportunityMealEvidenceContract(
  contract: OpportunityMealEvidenceContract = getOpportunityMealEvidenceContract(),
): OpportunityMealEvidenceValidation {
  const checks = [
    check(
      "persistent_models",
      "Contract names the bundle, witness testimonial, assessment, policy, and trace models.",
      hasAll(contract.modelNames, [
        "OpportunityConstrainedMealEvidenceBundle",
        "MealWitnessTestimonial",
        "OpportunityConstraintAssessment",
        "OpportunityConstraintPolicy",
        "OpportunityMealPolicyEvaluationTrace",
      ]) &&
        hasAll(contract.firstClassRecordTables, [
          "moral_trade_opportunity_meal_evidence_bundles",
          "moral_trade_meal_witness_testimonials",
          "moral_trade_opportunity_constraint_assessments",
        ]),
      contract.modelNames.join(","),
    ),
    check(
      "separate_witness_roles",
      "Baseline witnesses and co-diner observers are separate roles with separate questions.",
      contract.witnessRoles.includes("baseline_witness") &&
        contract.witnessRoles.includes("co_diner_direct_observer") &&
        contract.coDinerTestimonialQuestions.some((question) => /directly observe/i.test(question)) &&
        contract.baselineWitnessQuestions.some((question) => /would have eaten meat\/fish/i.test(question)),
      contract.witnessRoles.join(","),
    ),
    check(
      "configurable_policy",
      "Seed posterior and scoring weights live in the active policy rather than unversioned code.",
      contract.scoringPolicy.status === "active" &&
        contract.scoringPolicy.policyHash.startsWith("sha256:") &&
        contract.scoringPolicy.seedPosteriorCompletionConfidenceDecimal >= 0.8 &&
        contract.scoringPolicy.seedPosteriorCompletionConfidenceDecimal <= 0.9 &&
        Object.values(contract.scoringPolicy.weights).every((weight) => weight > 0),
      contract.scoringPolicy.policyHash,
    ),
    check(
      "seed_demo",
      "Seed demo reaches approximately 0.85 completion confidence under the frozen policy.",
      contract.seedDemo.assessment.proposedCompletionConfidenceDecimal >= 0.84 &&
        contract.seedDemo.assessment.proposedCompletionConfidenceDecimal <= 0.86 &&
        contract.seedDemo.consideration.amountMinor === 500,
      String(contract.seedDemo.assessment.proposedCompletionConfidenceDecimal),
    ),
    check(
      "privacy_public_reporting",
      "Public reporting suppresses cafeteria, schedule, witness, relationship, raw testimony, and private context.",
      /must not expose cafeteria names/i.test(contract.publicReportingRule) &&
        contract.privacyWarnings.some((warning) => /Do not upload class schedules/i.test(warning)) &&
        contract.seedDemo.publicReport.privateFieldsSuppressed,
      contract.publicReportingRule,
    ),
    check(
      "integration_boundaries",
      "Integration rules preserve fixed consideration, optional evidence, and contradictory evidence priority.",
      contract.integrationRules.some((rule) => /cannot reduce fixed consideration/i.test(rule)) &&
        contract.integrationRules.some((rule) => /does not override stronger contradictory evidence/i.test(rule)) &&
        contract.integrationRules.some((rule) => /less invasive evidence options/i.test(rule)),
      contract.integrationRules.join(" | "),
    ),
  ];
  const blockers = checks
    .filter((entry) => entry.status === "fail")
    .map((entry) => `${entry.id}: ${entry.label}`);

  return {
    blockers,
    checks,
    contractVersion: contract.version,
    status: blockers.length ? "fail" : "pass",
    validatorName: "moral-trade-opportunity-constrained-meal-evidence-contract",
    validatorVersion: MORAL_TRADE_OPPORTUNITY_MEAL_EVIDENCE_VALIDATOR_VERSION,
  };
}
