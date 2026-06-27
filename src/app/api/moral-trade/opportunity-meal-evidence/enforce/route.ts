import {
  buildMoralTradeApiJsonResponse,
  buildMoralTradeApiRateLimitResponse,
  takeMoralTradeApiRateLimitSlot,
} from "@/lib/moral-trade/api-rate-limit";
import {
  applyOpportunityConstraintAssessment,
  assessOpportunityConstraint,
  buildOpportunityMealPublicReportSummary,
  buildOpportunityMealReviewerPanel,
  createMealWitnessTestimonial,
  createOpportunityMealEvidenceBundle,
  getOpportunityMealEvidenceContract,
  validateOpportunityMealEvidenceContract,
  type MealLabel,
  type MealObservationCoverage,
  type MealWitnessRole,
  type OpportunityConstrainedMealEvidenceBundle,
  type OrdinaryMealVenueType,
  type PostMealCommitmentType,
  type VenueAccessModel,
} from "@/lib/moral-trade/opportunity-constrained-meal-evidence";

export const dynamic = "force-dynamic";

const OPERATIONS = new Set(["submit_bundle", "evaluate_bundle"]);
const MEAL_LABELS = new Set<MealLabel>(["breakfast", "lunch", "dinner", "snack", "other"]);
const VENUE_TYPES = new Set<OrdinaryMealVenueType>([
  "dining_hall",
  "employer_cafeteria",
  "home",
  "other",
  "restaurant",
  "school_cafeteria",
]);
const ACCESS_MODELS = new Set<VenueAccessModel>([
  "cash_register",
  "meal_plan",
  "open_access",
  "other",
  "swipe_based",
  "unknown",
]);
const COMMITMENT_TYPES = new Set<PostMealCommitmentType>([
  "appointment",
  "class",
  "exam",
  "meeting",
  "other",
  "travel",
  "work_shift",
]);
const WITNESS_ROLES = new Set<MealWitnessRole>([
  "baseline_witness",
  "co_diner_direct_observer",
  "schedule_constraint_witness",
]);
const OBSERVATION_COVERAGE = new Set<MealObservationCoverage>([
  "most_of_meal",
  "not_observed",
  "part_of_meal",
  "whole_meal",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function stringField(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function optionalStringField(value: unknown) {
  const text = stringField(value);
  return text.length ? text : null;
}

function booleanField(value: unknown, fallback = false) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.toLowerCase();
    if (["1", "true", "yes", "on"].includes(normalized)) return true;
    if (["0", "false", "no", "off"].includes(normalized)) return false;
  }
  return fallback;
}

function numberField(value: unknown, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim().length) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function decimalField(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim().length) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function enumField<T extends string>(value: unknown, values: Set<T>, fallback: T) {
  const text = stringField(value) as T;
  return values.has(text) ? text : fallback;
}

function fallbackIso(value: unknown, fallback: string) {
  const text = stringField(value);
  return Number.isFinite(Date.parse(text)) ? text : fallback;
}

function formBody(formData: FormData) {
  return {
    bundle: {
      actionTemplateId: stringField(formData.get("action_template_id")) || "action-template:one-meal-no-meat",
      cafeteriaOrVenueRecordRef: optionalStringField(formData.get("cafeteria_or_venue_record_ref")),
      mealLabel: stringField(formData.get("meal_label")) || "lunch",
      mealWindowEndAt: fallbackIso(formData.get("meal_window_end_at"), "2026-07-02T17:45:00.000Z"),
      mealWindowStartAt: fallbackIso(formData.get("meal_window_start_at"), "2026-07-02T17:10:00.000Z"),
      ordinaryMealVenueDescriptionPrivate: optionalStringField(
        formData.get("ordinary_meal_venue_description_private"),
      ),
      ordinaryMealVenueType: stringField(formData.get("ordinary_meal_venue_type")) || "school_cafeteria",
      participantClaimsUsuallyEatsOnceForMeal: booleanField(
        formData.get("participant_claims_usually_eats_once_for_meal"),
        true,
      ),
      participantClaimsUsualVenueForMeal: booleanField(
        formData.get("participant_claims_usual_venue_for_meal"),
        true,
      ),
      participantUserId: stringField(formData.get("participant_user_id")) || "participant-preview",
      pledgeSwapId: optionalStringField(formData.get("pledge_swap_id")),
      postMealCommitmentClaimed: booleanField(formData.get("post_meal_commitment_claimed"), false),
      postMealCommitmentEvidenceRef: optionalStringField(formData.get("post_meal_commitment_evidence_ref")),
      postMealCommitmentStartAt: optionalStringField(formData.get("post_meal_commitment_start_at")),
      postMealCommitmentType: optionalStringField(formData.get("post_meal_commitment_type")),
      purchaseEnvelopeId: optionalStringField(formData.get("purchase_envelope_id")),
      purchaseEnvelopeType: optionalStringField(formData.get("purchase_envelope_type")),
      venueAccessModel: stringField(formData.get("venue_access_model")) || "unknown",
    },
    currentFinalAdditionalityProbabilityDecimal: decimalField(
      formData.get("current_final_additionality_probability_decimal"),
    ),
    currentVerificationConfidenceDecimal: decimalField(formData.get("current_verification_confidence_decimal")),
    operation: stringField(formData.get("operation")) || "submit_bundle",
    testimonials: [
      {
        baselineCounterfactualCredenceDecimal: decimalField(
          formData.get("baseline_counterfactual_credence_decimal"),
        ),
        basisTextPrivate: stringField(formData.get("baseline_basis_private")),
        knowsUsuallyEatsOnceForMeal: booleanField(formData.get("baseline_knows_single_meal_habit")),
        knowsUsualVenueForMeal: booleanField(formData.get("baseline_knows_usual_venue")),
        witnessRole: "baseline_witness",
      },
      {
        basisTextPrivate: stringField(formData.get("co_diner_basis_private")),
        directlyObservedMeal: booleanField(formData.get("co_diner_directly_observed_meal")),
        noMeatFishCompletionCredenceDecimal: decimalField(
          formData.get("co_diner_no_meat_fish_completion_credence_decimal"),
        ),
        observationCoverage: stringField(formData.get("co_diner_observation_coverage")) || "not_observed",
        participantLeftAndReturnedDuringMeal: booleanField(
          formData.get("co_diner_participant_left_and_returned"),
        ),
        pressuredToSubmit: booleanField(formData.get("co_diner_pressured_to_submit")),
        reasonToThinkAteMeatFishBeforeOrAfter: booleanField(
          formData.get("co_diner_reason_to_think_ate_before_or_after"),
        ),
        sawParticipantEatMeatOrFish: booleanField(formData.get("co_diner_saw_meat_fish")),
        sidePaymentConcern: booleanField(formData.get("co_diner_side_payment_concern")),
        witnessRole: "co_diner_direct_observer",
      },
    ],
  };
}

async function requestBody(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    return (await request.json()) as unknown;
  }

  if (
    contentType.includes("application/x-www-form-urlencoded") ||
    contentType.includes("multipart/form-data")
  ) {
    return formBody(await request.formData());
  }

  return {};
}

function parseBundle(value: unknown) {
  const record = isRecord(value) ? value : {};

  return createOpportunityMealEvidenceBundle({
    actionTemplateId: stringField(record.actionTemplateId),
    baselineWitnessCount: numberField(record.baselineWitnessCount, 0),
    cafeteriaOrVenueRecordRef: optionalStringField(record.cafeteriaOrVenueRecordRef),
    coDinerCount: numberField(record.coDinerCount, 0),
    contraryReportCount: numberField(record.contraryReportCount, 0),
    directObserverTestimonialCount: numberField(record.directObserverTestimonialCount, 0),
    mealLabel: enumField(record.mealLabel, MEAL_LABELS, "lunch"),
    mealWindowEndAt: fallbackIso(record.mealWindowEndAt, "2026-07-02T17:45:00.000Z"),
    mealWindowStartAt: fallbackIso(record.mealWindowStartAt, "2026-07-02T17:10:00.000Z"),
    ordinaryMealVenueDescriptionPrivate: optionalStringField(record.ordinaryMealVenueDescriptionPrivate),
    ordinaryMealVenueType: enumField(record.ordinaryMealVenueType, VENUE_TYPES, "other"),
    participantActionCommitmentId: optionalStringField(record.participantActionCommitmentId),
    participantClaimsUsuallyEatsOnceForMeal: booleanField(record.participantClaimsUsuallyEatsOnceForMeal),
    participantClaimsUsualVenueForMeal: booleanField(record.participantClaimsUsualVenueForMeal),
    participantUserId: stringField(record.participantUserId),
    pledgeSwapId: optionalStringField(record.pledgeSwapId),
    postMealCommitmentClaimed: booleanField(record.postMealCommitmentClaimed),
    postMealCommitmentEvidenceRef: optionalStringField(record.postMealCommitmentEvidenceRef),
    postMealCommitmentStartAt: optionalStringField(record.postMealCommitmentStartAt),
    postMealCommitmentType: record.postMealCommitmentType
      ? enumField(record.postMealCommitmentType, COMMITMENT_TYPES, "other")
      : null,
    purchaseEnvelopeId: optionalStringField(record.purchaseEnvelopeId),
    purchaseEnvelopeType: optionalStringField(record.purchaseEnvelopeType),
    reviewerUserId: optionalStringField(record.reviewerUserId),
    venueAccessModel: enumField(record.venueAccessModel, ACCESS_MODELS, "unknown"),
  });
}

function parseTestimonials(
  value: unknown,
  bundle: OpportunityConstrainedMealEvidenceBundle,
) {
  const entries = Array.isArray(value) ? value : [];

  return entries
    .filter(isRecord)
    .filter((record) => stringField(record.basisTextPrivate).length > 0)
    .map((record) =>
      createMealWitnessTestimonial({
        baselineCounterfactualCredenceDecimal: decimalField(record.baselineCounterfactualCredenceDecimal),
        basisTextPrivate: stringField(record.basisTextPrivate),
        directlyObservedMeal: booleanField(record.directlyObservedMeal),
        evidenceBundleId: bundle.id,
        knowsUsuallyEatsOnceForMeal:
          typeof record.knowsUsuallyEatsOnceForMeal === "boolean"
            ? record.knowsUsuallyEatsOnceForMeal
            : null,
        knowsUsualVenueForMeal:
          typeof record.knowsUsualVenueForMeal === "boolean" ? record.knowsUsualVenueForMeal : null,
        mealLabel: bundle.mealLabel,
        misleadingEvidenceConcern: booleanField(record.misleadingEvidenceConcern),
        noMeatFishCompletionCredenceDecimal: decimalField(record.noMeatFishCompletionCredenceDecimal),
        observationCoverage: enumField(record.observationCoverage, OBSERVATION_COVERAGE, "not_observed"),
        observedMealVenuePrivate: optionalStringField(record.observedMealVenuePrivate),
        participantLeftAndReturnedDuringMeal: booleanField(record.participantLeftAndReturnedDuringMeal),
        participantUserId: bundle.participantUserId,
        pressuredToSubmit: booleanField(record.pressuredToSubmit),
        reasonToThinkAteMeatFishBeforeOrAfter: booleanField(
          record.reasonToThinkAteMeatFishBeforeOrAfter,
        ),
        reviewerUserId: optionalStringField(record.reviewerUserId),
        sawParticipantEatMeatOrFish: booleanField(record.sawParticipantEatMeatOrFish),
        sidePaymentConcern: booleanField(record.sidePaymentConcern),
        testimonialStatus: stringField(record.testimonialStatus) === "disputed" ? "disputed" : undefined,
        witnessRole: enumField(record.witnessRole, WITNESS_ROLES, "baseline_witness"),
      }).testimonial,
    );
}

function blocked(status: number, blocker: string, extraBlockers: string[] = []) {
  return buildMoralTradeApiJsonResponse(
    {
      blocker,
      blockers: [blocker, ...extraBlockers],
      ok: false,
      opportunityMealEvidenceGateStatus: "blocked",
      stateMutation: false,
    },
    "private_no_store",
    { status },
  );
}

export async function POST(request: Request) {
  const rateLimit = takeMoralTradeApiRateLimitSlot(request, "opportunity_meal_evidence_enforce");
  if (rateLimit.limited) {
    return buildMoralTradeApiRateLimitResponse(
      rateLimit,
      "Rate-limited opportunity-constrained meal evidence requests create no evidence bundle, assessment, trace, public report, or settlement effect.",
      "private, no-store",
    );
  }

  let payload: unknown;
  try {
    payload = await requestBody(request);
  } catch {
    return blocked(400, "invalid_request_body");
  }

  const record = isRecord(payload) ? payload : {};
  const operation = stringField(record.operation);
  if (!OPERATIONS.has(operation)) {
    return blocked(400, "unsupported_opportunity_meal_operation");
  }

  const contract = getOpportunityMealEvidenceContract();
  const validation = validateOpportunityMealEvidenceContract(contract);
  if (validation.status !== "pass") {
    return blocked(500, "opportunity_meal_contract_invalid", validation.blockers);
  }

  const bundleResult = parseBundle(record.bundle);
  const testimonials = parseTestimonials(record.testimonials, bundleResult.bundle);
  const testimonialCounts = {
    baselineWitnessCount: testimonials.filter((testimonial) => testimonial.witnessRole === "baseline_witness").length,
    coDinerCount: testimonials.filter((testimonial) => testimonial.witnessRole === "co_diner_direct_observer").length,
    directObserverTestimonialCount: testimonials.filter(
      (testimonial) => testimonial.witnessRole === "co_diner_direct_observer" && testimonial.directlyObservedMeal,
    ).length,
  };
  const bundle: OpportunityConstrainedMealEvidenceBundle = {
    ...bundleResult.bundle,
    ...testimonialCounts,
  };
  const assessment = assessOpportunityConstraint({
    bundle,
    testimonials,
  });
  const application = applyOpportunityConstraintAssessment({
    assessment,
    currentFinalAdditionalityProbabilityDecimal: numberField(
      record.currentFinalAdditionalityProbabilityDecimal,
      0.5,
    ),
    currentVerificationConfidenceDecimal: numberField(record.currentVerificationConfidenceDecimal, 0.45),
    fixedConsiderationLocked: booleanField(record.fixedConsiderationLocked, true),
    strongerContradictoryEvidence: booleanField(record.strongerContradictoryEvidence),
  });
  const publicReport = buildOpportunityMealPublicReportSummary({ assessment });
  const reviewerPanel = buildOpportunityMealReviewerPanel({ assessment, bundle });
  const blockers = [...bundleResult.blockers];

  return buildMoralTradeApiJsonResponse({
    application,
    assessment,
    blockers,
    bundle,
    checkedAt: new Date().toISOString(),
    ok: blockers.length === 0,
    opportunityMealEvidenceGateStatus: blockers.length ? "blocked" : "pass",
    publicReport,
    reviewerPanel,
    stateMutation: false,
    testimonials,
  }, "private_no_store");
}
