export const OFFER_FOLLOW_CONTRACT_VERSION = "offer-follow-v0.1-2026-05";
export const OFFER_FOLLOW_VALIDATOR_VERSION = "offer-follow-validator-v0.1";

export type OfferFollowAction = "follow" | "unfollow" | "toggle";
export type OfferFollowMode =
  | "validated"
  | "auth_required"
  | "followed"
  | "already_followed"
  | "unfollowed"
  | "not_following";

export interface OfferFollowPayload {
  contractVersion: string;
  mode: OfferFollowMode;
  offerId: string;
  action: OfferFollowAction;
  savedOffer: {
    offerId: string;
    viewerOwned: true;
    isFollowing: boolean;
    createdAt: string | null;
  };
  signInUrl: string | null;
  publicContract: {
    version: string;
    sourceRoute: "/offers";
    publicApiRoute: "/api/offers/:id/follow";
    storageSurface: "offer_carts";
    nonClaims: string[];
  };
}

export interface OfferFollowValidationCheck {
  id: string;
  label: string;
  status: "pass" | "fail";
  evidence: string;
}

export interface OfferFollowValidation {
  status: "pass" | "fail";
  validatorName: "offer-follow-api";
  validatorVersion: string;
  contractVersion: string;
  checks: OfferFollowValidationCheck[];
  blockers: string[];
}

const NON_CLAIMS = [
  "Offer follow records are viewer-owned saved-offer records, not public social follows.",
  "Following an offer does not disclose private wishes, contact details, cart state, or source notes.",
  "Following an offer does not create escrow, custody, agreement formation, autonomous outreach, or platform moral ranking.",
  "A followed offer can still require sign-in, consent, evidence review, and manual review before any reliance.",
] as const;
const PRIVATE_FIELD_PATTERN =
  /contactEmail|email|phone|owner_id|authUser|privateWish|rawSourceNotes|sourceNotes|cartState|password|token/i;

function normalizeToken(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

export function normalizeOfferFollowAction(value: unknown): OfferFollowAction {
  const normalized = normalizeToken(value);

  if (normalized === "unfollow" || normalized === "remove") return "unfollow";
  if (normalized === "toggle") return "toggle";
  return "follow";
}

export function isPublicLiveOfferId(value: unknown) {
  const offerId = String(value ?? "").trim();

  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    offerId,
  );
}

function validationCheck(
  id: string,
  label: string,
  passed: boolean,
  evidence: string,
): OfferFollowValidationCheck {
  return {
    id,
    label,
    status: passed ? "pass" : "fail",
    evidence,
  };
}

export function buildOfferFollowPayload({
  action,
  createdAt = null,
  isFollowing = false,
  mode,
  offerId,
}: {
  action: OfferFollowAction;
  createdAt?: string | null;
  isFollowing?: boolean;
  mode: OfferFollowMode;
  offerId: string;
}): OfferFollowPayload {
  return {
    contractVersion: OFFER_FOLLOW_CONTRACT_VERSION,
    mode,
    offerId,
    action,
    savedOffer: {
      offerId,
      viewerOwned: true,
      isFollowing,
      createdAt,
    },
    signInUrl:
      mode === "auth_required"
        ? `/login?returnTo=${encodeURIComponent(`/offers/${offerId}`)}`
        : null,
    publicContract: {
      version: OFFER_FOLLOW_CONTRACT_VERSION,
      sourceRoute: "/offers",
      publicApiRoute: "/api/offers/:id/follow",
      storageSurface: "offer_carts",
      nonClaims: [...NON_CLAIMS],
    },
  };
}

export function validateOfferFollowPayload(
  payload: OfferFollowPayload,
): OfferFollowValidation {
  const serialized = JSON.stringify(payload);
  const checks = [
    validationCheck(
      "contract-shape",
      "Offer follow contract route and version are published",
      payload.contractVersion === OFFER_FOLLOW_CONTRACT_VERSION &&
        payload.publicContract.publicApiRoute === "/api/offers/:id/follow" &&
        payload.publicContract.storageSurface === "offer_carts",
      `${payload.publicContract.publicApiRoute}; ${payload.publicContract.storageSurface}`,
    ),
    validationCheck(
      "live-offer-id",
      "Follow endpoint accepts only live-offer ids, not worked-example slugs",
      isPublicLiveOfferId(payload.offerId),
      payload.offerId,
    ),
    validationCheck(
      "viewer-owned-record",
      "Follow state is represented as a viewer-owned saved-offer record",
      payload.savedOffer.viewerOwned &&
        payload.savedOffer.offerId === payload.offerId &&
        (payload.mode !== "auth_required" || Boolean(payload.signInUrl)),
      payload.signInUrl ?? payload.mode,
    ),
    validationCheck(
      "action-shape",
      "Follow action is bounded to follow, unfollow, or toggle",
      ["follow", "unfollow", "toggle"].includes(payload.action),
      payload.action,
    ),
    validationCheck(
      "privacy-and-nonclaims",
      "Payload omits private fields and preserves non-claims",
      !PRIVATE_FIELD_PATTERN.test(serialized) &&
        payload.publicContract.nonClaims.some((claim) => /not public social follows/i.test(claim)) &&
        payload.publicContract.nonClaims.some((claim) => /does not disclose private wishes/i.test(claim)) &&
        payload.publicContract.nonClaims.some((claim) => /agreement formation|autonomous outreach|platform moral ranking/i.test(claim)),
      payload.publicContract.nonClaims.join(" | "),
    ),
  ];
  const blockers = checks
    .filter((check) => check.status === "fail")
    .map((check) => `${check.id}: ${check.label}`);

  return {
    status: blockers.length ? "fail" : "pass",
    validatorName: "offer-follow-api",
    validatorVersion: OFFER_FOLLOW_VALIDATOR_VERSION,
    contractVersion: payload.contractVersion,
    checks,
    blockers,
  };
}
