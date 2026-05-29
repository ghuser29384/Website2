import type { OfferRecord } from "@/lib/app-data";
import type { OfferMode, PaymentIntervalUnit } from "@/lib/offers";
import { createDefaultDonationOffsetFields } from "@/lib/donation-offsets";
import type {
  DonationOffsetParticipationMode,
  DonationOffsetTimeHorizon,
  DonationOffsetUnmatchedSurplusRule,
  DonationOffsetVerificationMethod,
} from "@/lib/donation-offsets";
import { isPublicLiveOfferId } from "@/lib/offer-follows";

export const OFFER_CREATE_SIMILAR_CONTRACT_VERSION =
  "offer-create-similar-v0.1-2026-05";
export const OFFER_CREATE_SIMILAR_VALIDATOR_VERSION =
  "offer-create-similar-validator-v0.1";

export type OfferCreateSimilarMode =
  | "validated"
  | "auth_required"
  | "ready"
  | "source_unavailable";

export interface OfferCreateSimilarTemplate {
  title: string;
  description: string;
  mode: OfferMode;
  offeredCause: string;
  requestedCause: string;
  compromiseCause: string;
  offerAction: string;
  requestAction: string;
  baselineStatement: string;
  exitCondition: string;
  notes: string;
  offerImpact: string;
  minCounterpartyImpact: string;
  verification: string;
  duration: string;
  paymentIntervalUnit: PaymentIntervalUnit;
  paymentIntervalValue: string;
  trustLevel: string;
  offset?: {
    baselineAmountUsd: string;
    requestedMatchingAmountUsd: string;
    baselineOpposedCause: string;
    requestedOpposedCause: string;
    participationMode: DonationOffsetParticipationMode;
    compromiseDestinationId?: string;
    offsetRatio: string;
    timeHorizon?: DonationOffsetTimeHorizon;
    verificationMethod?: DonationOffsetVerificationMethod;
    unmatchedSurplusRule?: DonationOffsetUnmatchedSurplusRule;
  };
}

export interface OfferCreateSimilarPayload {
  contractVersion: string;
  mode: OfferCreateSimilarMode;
  offerId: string;
  draft: {
    sourceOfferId: string;
    sourceStatus: "unknown" | "live" | "not_live" | "missing";
    draftUrl: string;
    template: OfferCreateSimilarTemplate | null;
    copiedFields: string[];
    requiresReview: true;
    stateMutation: false;
  };
  signInUrl: string | null;
  publicContract: {
    version: string;
    sourceRoute: "/offers";
    publicApiRoute: "/api/offers/:id/create-similar";
    storageSurface: "none_draft_prefill";
    nonClaims: string[];
  };
}

export interface OfferCreateSimilarValidationCheck {
  id: string;
  label: string;
  status: "pass" | "fail";
  evidence: string;
}

export interface OfferCreateSimilarValidation {
  status: "pass" | "fail";
  validatorName: "offer-create-similar-api";
  validatorVersion: string;
  contractVersion: string;
  checks: OfferCreateSimilarValidationCheck[];
  blockers: string[];
}

const CREATE_SIMILAR_NON_CLAIMS = [
  "Create-similar returns a viewer-local draft prefill, not an offer publication, agreement, escrow, custody promise, or completed moral trade.",
  "No create-similar storage happens before authentication; the API only returns a sign-in draft URL for logged-out viewers.",
  "Templates copy only public offer terms and deliberately omit private wishes, contact details, raw source notes, personalized cart state, and evidence URLs.",
  "Every copied draft still requires human editing, provenance review, consent gates, and manual evidence review before publication or reliance.",
  "Create-similar does not contact counterparties, rank moral value globally, or expose public social-follow counts.",
] as const;

const PRIVATE_FIELD_PATTERN =
  /contactEmail|email|phone|owner_id|authUser|privateWish|rawSourceNotes|sourceNotes|cartState|password|token|evidenceUrl|moderation_notes/i;
const PRIVATE_TEXT_PATTERN =
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b|\b(?:\+?1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)\d{3}[-.\s]?\d{4}\b|contact me|call me|text me|private wish|source notes|raw source/i;
const PUBLIC_TEXT_LIMIT = 420;
const defaultOffsetFields = createDefaultDonationOffsetFields();

function validationCheck(
  id: string,
  label: string,
  passed: boolean,
  evidence: string,
): OfferCreateSimilarValidationCheck {
  return {
    id,
    label,
    status: passed ? "pass" : "fail",
    evidence,
  };
}

function sanitizePublicText(value: unknown, fallback: string, limit = PUBLIC_TEXT_LIMIT) {
  const normalized = String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized || PRIVATE_TEXT_PATTERN.test(normalized)) {
    return fallback;
  }

  return normalized.slice(0, limit);
}

function boundedScore(value: unknown, fallback: number) {
  const numeric = Number(value);

  if (!Number.isFinite(numeric)) {
    return String(fallback);
  }

  return String(Math.min(10, Math.max(1, Math.round(numeric))));
}

function centsToUsd(value: unknown, fallback: number) {
  const numeric = Number(value);

  if (!Number.isFinite(numeric) || numeric <= 0) {
    return String(fallback);
  }

  return String(Math.round(numeric) / 100);
}

function coercePaymentIntervalUnit(value: unknown): PaymentIntervalUnit {
  if (value === "day" || value === "month" || value === "year") {
    return value;
  }

  return "none";
}

function coercePositiveInteger(value: unknown, fallback: number) {
  const numeric = Number(value);

  if (!Number.isFinite(numeric) || numeric < 1) {
    return String(fallback);
  }

  return String(Math.round(numeric));
}

function createSimilarDraftUrl(offerId: string, mode?: OfferMode) {
  const params = new URLSearchParams({
    source_offer: offerId,
  });

  if (mode) {
    params.set("mode", mode);
  }

  return `/offers/new?${params.toString()}`;
}

export function buildCreateSimilarTemplateFromLiveOffer(
  offer: OfferRecord,
): OfferCreateSimilarTemplate | null {
  if (offer.status !== "open") {
    return null;
  }

  const paymentIntervalUnit = coercePaymentIntervalUnit(offer.payment_interval_unit);
  const offset = offer.mode === "offset" && offer.donationOffset
    ? {
        baselineAmountUsd: centsToUsd(
          offer.donationOffset.baseline_amount_cents,
          defaultOffsetFields.baselineAmountUsd ?? 1000,
        ),
        requestedMatchingAmountUsd: centsToUsd(
          offer.donationOffset.requested_matching_amount_cents,
          defaultOffsetFields.requestedMatchingAmountUsd ?? 1000,
        ),
        baselineOpposedCause: sanitizePublicText(
          offer.donationOffset.baseline_opposed_cause,
          defaultOffsetFields.baselineOpposedCause,
          80,
        ),
        requestedOpposedCause: sanitizePublicText(
          offer.donationOffset.requested_opposed_cause,
          defaultOffsetFields.requestedOpposedCause,
          80,
        ),
        participationMode: "direct" as const,
        compromiseDestinationId:
          offer.donationOffset.compromise_charity_id ||
          defaultOffsetFields.compromiseDestinationId,
        offsetRatio: String(offer.donationOffset.offset_ratio || defaultOffsetFields.offsetRatio || 1),
        timeHorizon: offer.donationOffset.time_horizon,
        verificationMethod:
          offer.donationOffset.verification_method === "funds_in_escrow"
            ? defaultOffsetFields.verificationMethod
            : offer.donationOffset.verification_method,
        unmatchedSurplusRule: offer.donationOffset.unmatched_surplus_rule,
      }
    : undefined;

  return {
    title: "Create similar offer",
    description: `Prefilled from live public offer ${offer.id}.`,
    mode: offer.mode,
    offeredCause: sanitizePublicText(offer.offered_cause, "Animal welfare", 80),
    requestedCause: sanitizePublicText(offer.requested_cause, "Global poverty", 80),
    compromiseCause: sanitizePublicText(offer.compromise_cause, "Not needed", 80),
    offerAction: sanitizePublicText(
      offer.offer_action,
      "I will take a bounded, reviewable action for the offered cause.",
    ),
    requestAction: sanitizePublicText(
      offer.request_action,
      "The counterparty will take a bounded, reviewable reciprocal action.",
    ),
    baselineStatement:
      offer.mode === "offset"
        ? "I have a real baseline intention matching the opposed donation described below; this similar draft must be edited before publication."
        : "Without this trade, I would not expect this specific reciprocal action to happen on the stated timeline.",
    exitCondition:
      "If evidence is missing, either side declines, or the copied facts no longer fit, the proposal stays unresolved until edited or reviewed.",
    notes: `Inspired by public offer ${offer.id}. Edit causes, amounts, dates, evidence, and counterparties before publishing. Do not rely on copied evidence or contact details.`,
    offerImpact: boundedScore(offer.offer_impact, 7),
    minCounterpartyImpact: boundedScore(offer.min_counterparty_impact, 6),
    verification: sanitizePublicText(offer.verification, "Manual review required", 120),
    duration: sanitizePublicText(offer.duration, "30 days", 80),
    paymentIntervalUnit,
    paymentIntervalValue: paymentIntervalUnit === "none"
      ? "1"
      : coercePositiveInteger(offer.payment_interval_value, 1),
    trustLevel: boundedScore(offer.trust_level, 3),
    offset,
  };
}

export function buildOfferCreateSimilarPayload({
  mode,
  offer = null,
  offerId,
  sourceStatus,
}: {
  mode: OfferCreateSimilarMode;
  offer?: OfferRecord | null;
  offerId: string;
  sourceStatus?: OfferCreateSimilarPayload["draft"]["sourceStatus"];
}): OfferCreateSimilarPayload {
  const template = offer ? buildCreateSimilarTemplateFromLiveOffer(offer) : null;
  const resolvedStatus =
    sourceStatus ?? (template ? "live" : mode === "source_unavailable" ? "missing" : "unknown");
  const draftUrl = createSimilarDraftUrl(offerId, template?.mode ?? offer?.mode);

  return {
    contractVersion: OFFER_CREATE_SIMILAR_CONTRACT_VERSION,
    mode,
    offerId,
    draft: {
      sourceOfferId: offerId,
      sourceStatus: resolvedStatus,
      draftUrl,
      template,
      copiedFields: template
        ? [
            "mode",
            "causes",
            "actions",
            "duration",
            "verification",
            "impact scores",
            ...(template.offset ? ["public offset terms"] : []),
          ]
        : [],
      requiresReview: true,
      stateMutation: false,
    },
    signInUrl:
      mode === "auth_required"
        ? `/login?returnTo=${encodeURIComponent(draftUrl)}`
        : null,
    publicContract: {
      version: OFFER_CREATE_SIMILAR_CONTRACT_VERSION,
      sourceRoute: "/offers",
      publicApiRoute: "/api/offers/:id/create-similar",
      storageSurface: "none_draft_prefill",
      nonClaims: [...CREATE_SIMILAR_NON_CLAIMS],
    },
  };
}

export function validateOfferCreateSimilarPayload(
  payload: OfferCreateSimilarPayload,
): OfferCreateSimilarValidation {
  const serialized = JSON.stringify(payload);
  const templateSerialized = JSON.stringify(payload.draft.template ?? {});
  const checks = [
    validationCheck(
      "contract-shape",
      "Create-similar contract route and version are published",
      payload.contractVersion === OFFER_CREATE_SIMILAR_CONTRACT_VERSION &&
        payload.publicContract.publicApiRoute === "/api/offers/:id/create-similar" &&
        payload.publicContract.storageSurface === "none_draft_prefill",
      `${payload.publicContract.publicApiRoute}; ${payload.publicContract.storageSurface}`,
    ),
    validationCheck(
      "live-offer-id",
      "Create-similar endpoint accepts only live-offer ids, not worked-example slugs",
      isPublicLiveOfferId(payload.offerId) &&
        payload.draft.sourceOfferId === payload.offerId,
      payload.offerId,
    ),
    validationCheck(
      "draft-boundary",
      "Create-similar returns a review-required draft prefill without storage",
      payload.draft.requiresReview &&
        payload.draft.stateMutation === false &&
        payload.draft.draftUrl.startsWith("/offers/new?") &&
        payload.draft.draftUrl.includes("source_offer=") &&
        (payload.mode !== "auth_required" || Boolean(payload.signInUrl)),
      payload.signInUrl ?? payload.draft.draftUrl,
    ),
    validationCheck(
      "template-safety",
      "Ready mode includes only public-safe draft fields",
      payload.mode === "ready"
        ? payload.draft.sourceStatus === "live" &&
            Boolean(payload.draft.template) &&
            !PRIVATE_FIELD_PATTERN.test(templateSerialized)
        : payload.draft.template === null || !PRIVATE_FIELD_PATTERN.test(templateSerialized),
      payload.draft.template ? payload.draft.copiedFields.join(", ") : payload.draft.sourceStatus,
    ),
    validationCheck(
      "privacy-and-nonclaims",
      "Payload omits private fields and preserves non-claims",
      !PRIVATE_FIELD_PATTERN.test(serialized) &&
        payload.publicContract.nonClaims.some((claim) => /No create-similar storage happens before authentication/i.test(claim)) &&
        payload.publicContract.nonClaims.some((claim) => /omit private wishes, contact details, raw source notes/i.test(claim)) &&
        payload.publicContract.nonClaims.some((claim) => /does not contact counterparties|rank moral value globally/i.test(claim)),
      payload.publicContract.nonClaims.join(" | "),
    ),
  ];
  const blockers = checks
    .filter((check) => check.status === "fail")
    .map((check) => `${check.id}: ${check.label}`);

  return {
    status: blockers.length ? "fail" : "pass",
    validatorName: "offer-create-similar-api",
    validatorVersion: OFFER_CREATE_SIMILAR_VALIDATOR_VERSION,
    contractVersion: payload.contractVersion,
    checks,
    blockers,
  };
}
