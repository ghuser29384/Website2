import { createHash } from "node:crypto";

import {
  demoMpgfAssurancePledges,
  demoMpgfAssuranceRound,
  demoMpgfPublicGoodsPaymentProofs,
  demoMpgfPublicGoodsReviewCases,
  demoMpgfPublicGoodsSubscriptions,
} from "./data";
import type {
  MpgfPublicGoodsPaymentProof,
  MpgfPublicGoodsPledge,
  MpgfPublicGoodsReviewCase,
  MpgfPublicGoodsSubscription,
} from "./types";

export const MPGF_PUBLIC_GOODS_PROCEDURAL_BADGE_POLICY =
  "record_based_procedural_badges_no_moral_karma";

export const MPGF_PUBLIC_GOODS_PROCEDURAL_BADGE_PRIVACY_POLICY =
  "badge_public_outputs_use_hashed_user_and_source_refs_only";

export type MpgfPublicGoodsProceduralBadgeType =
  | "verified_supporter"
  | "fulfilled_pledge"
  | "sponsor_contributor"
  | "appeal_cleared_contribution"
  | "early_supporter";

export interface MpgfPublicGoodsProceduralBadge {
  id: string;
  roundId: string;
  userRefHash: string;
  badgeType: MpgfPublicGoodsProceduralBadgeType;
  sourceRecordHash: string;
  status: "verified" | "pending_review" | "revoked";
  evidenceSummary: string;
  issuedAt: string;
  noScoreIssued: true;
}

export interface MpgfPublicGoodsProceduralBadgeLedger {
  ok: true;
  roundId: string;
  policy: typeof MPGF_PUBLIC_GOODS_PROCEDURAL_BADGE_POLICY;
  privacyPolicy: typeof MPGF_PUBLIC_GOODS_PROCEDURAL_BADGE_PRIVACY_POLICY;
  badges: MpgfPublicGoodsProceduralBadge[];
  counters: Record<MpgfPublicGoodsProceduralBadgeType, number>;
  hiddenSignals: {
    moralKarmaScore: false;
    followerScore: false;
    commentScore: false;
    transferableGovernanceWeight: false;
  };
  definitions: Array<{
    badgeType: MpgfPublicGoodsProceduralBadgeType;
    label: string;
    publicMeaning: string;
    notMeaning: string;
  }>;
  calcHash: string;
}

const badgeDefinitions: MpgfPublicGoodsProceduralBadgeLedger["definitions"] = [
  {
    badgeType: "verified_supporter",
    label: "Verified supporter",
    publicMeaning: "A contribution intent passed identity and eligibility checks for this MPGF round.",
    notMeaning: "This is not a claim that the supporter is morally better or has stronger voting weight.",
  },
  {
    badgeType: "fulfilled_pledge",
    label: "Fulfilled pledge",
    publicMeaning: "A pledge has verified payment or provider proof attached.",
    notMeaning: "This is not a guarantee of tax treatment, impact, escrow, or final payout.",
  },
  {
    badgeType: "sponsor_contributor",
    label: "Sponsor contributor",
    publicMeaning: "A sponsor-pool refill or recurring member tithe is active or verified.",
    notMeaning: "This does not let the sponsor direct campaign outcomes outside published rules.",
  },
  {
    badgeType: "appeal_cleared_contribution",
    label: "Appeal-cleared contribution",
    publicMeaning: "A challenged or appealed contribution was cleared through the published review process.",
    notMeaning: "This is not a permanent immunity from future evidence or coordination review.",
  },
  {
    badgeType: "early_supporter",
    label: "Early supporter",
    publicMeaning: "A contribution intent arrived early enough to help the assurance threshold form.",
    notMeaning: "This is not a social ranking, popularity score, or moral-karma signal.",
  },
];

function hashValue(value: unknown) {
  return `sha256:${createHash("sha256").update(JSON.stringify(value)).digest("hex")}`;
}

function isEligiblePledge(pledge: MpgfPublicGoodsPledge) {
  return pledge.eligibilityState === "eligible" && (pledge.status === "pledged" || pledge.status === "captured");
}

function badgeFor(input: {
  roundId: string;
  userId: string;
  badgeType: MpgfPublicGoodsProceduralBadgeType;
  source: unknown;
  status?: MpgfPublicGoodsProceduralBadge["status"];
  evidenceSummary: string;
  issuedAt: string;
}): MpgfPublicGoodsProceduralBadge {
  const userRefHash = hashValue(["mpgf-procedural-badge-user", input.userId]);
  const sourceRecordHash = hashValue(["mpgf-procedural-badge-source", input.source]);

  return {
    id: `mpgf-procedural-badge-${input.badgeType}-${sourceRecordHash.slice(7, 19)}`,
    roundId: input.roundId,
    userRefHash,
    badgeType: input.badgeType,
    sourceRecordHash,
    status: input.status ?? "verified",
    evidenceSummary: input.evidenceSummary,
    issuedAt: input.issuedAt,
    noScoreIssued: true,
  };
}

function earliestSupportCutoff(roundStartsAt: string) {
  const startsAt = Date.parse(roundStartsAt);

  if (!Number.isFinite(startsAt)) {
    return Date.parse("2026-05-07T00:00:00.000Z");
  }

  return startsAt + 7 * 24 * 60 * 60 * 1000;
}

function fulfilledPledgeBadges({
  roundId,
  pledges,
  paymentProofs,
}: {
  roundId: string;
  pledges: MpgfPublicGoodsPledge[];
  paymentProofs: MpgfPublicGoodsPaymentProof[];
}) {
  const pledgeById = new Map(pledges.map((pledge) => [pledge.id, pledge]));

  return paymentProofs
    .filter((proof) => proof.status === "verified" && proof.pledgeId)
    .flatMap((proof) => {
      const pledge = pledgeById.get(proof.pledgeId ?? "");

      return pledge
        ? [
            badgeFor({
              roundId,
              userId: pledge.userId,
              badgeType: "fulfilled_pledge",
              source: [proof.id, proof.pledgeId, proof.status],
              evidenceSummary: "Verified payment or provider proof is attached to this pledge.",
              issuedAt: proof.verifiedAt ?? proof.createdAt,
            }),
          ]
        : [];
    });
}

function appealClearedBadges({
  roundId,
  pledges,
  reviewCases,
}: {
  roundId: string;
  pledges: MpgfPublicGoodsPledge[];
  reviewCases: MpgfPublicGoodsReviewCase[];
}) {
  const clearedCampaignIds = new Set(
    reviewCases
      .filter((reviewCase) => reviewCase.appealStatus === "appeal_upheld" || reviewCase.reasonCode === "challenge_resolved")
      .map((reviewCase) => reviewCase.campaignId),
  );

  return pledges
    .filter((pledge) => isEligiblePledge(pledge) && clearedCampaignIds.has(pledge.campaignId))
    .map((pledge) =>
      badgeFor({
        roundId,
        userId: pledge.userId,
        badgeType: "appeal_cleared_contribution",
        source: [pledge.id, pledge.campaignId, "appeal_cleared"],
        evidenceSummary: "A challenge or appeal was resolved under the published MPGF review process.",
        issuedAt: pledge.createdAt,
      }),
    );
}

export function buildMpgfPublicGoodsProceduralBadgeLedger({
  round = demoMpgfAssuranceRound,
  pledges = demoMpgfAssurancePledges,
  paymentProofs = demoMpgfPublicGoodsPaymentProofs,
  reviewCases = demoMpgfPublicGoodsReviewCases,
  subscriptions = demoMpgfPublicGoodsSubscriptions,
}: {
  round?: typeof demoMpgfAssuranceRound;
  pledges?: MpgfPublicGoodsPledge[];
  paymentProofs?: MpgfPublicGoodsPaymentProof[];
  reviewCases?: MpgfPublicGoodsReviewCase[];
  subscriptions?: MpgfPublicGoodsSubscription[];
} = {}): MpgfPublicGoodsProceduralBadgeLedger {
  const earlyCutoffMs = earliestSupportCutoff(round.startsAt);
  const verifiedSupporterBadges = pledges.filter(isEligiblePledge).map((pledge) =>
    badgeFor({
      roundId: round.id,
      userId: pledge.userId,
      badgeType: "verified_supporter",
      source: [pledge.id, pledge.campaignId, pledge.eligibilityState],
      evidenceSummary: "Identity and eligibility checks passed for a counted MPGF contribution intent.",
      issuedAt: pledge.createdAt,
    }),
  );
  const earlySupporterBadges = pledges
    .filter((pledge) => isEligiblePledge(pledge) && Date.parse(pledge.createdAt) <= earlyCutoffMs)
    .map((pledge) =>
      badgeFor({
        roundId: round.id,
        userId: pledge.userId,
        badgeType: "early_supporter",
        source: [pledge.id, pledge.createdAt, "early_supporter"],
        evidenceSummary: "Contribution intent arrived in the early assurance window.",
        issuedAt: pledge.createdAt,
      }),
    );
  const sponsorContributorBadges = subscriptions
    .filter((subscription) => subscription.status === "active")
    .map((subscription) =>
      badgeFor({
        roundId: round.id,
        userId: subscription.userId,
        badgeType: "sponsor_contributor",
        source: [subscription.id, subscription.poolId, subscription.status],
        evidenceSummary: "Active sponsor-pool refill or recurring member tithe.",
        issuedAt: subscription.createdAt,
      }),
    );
  const badges = [
    ...verifiedSupporterBadges,
    ...fulfilledPledgeBadges({ roundId: round.id, pledges, paymentProofs }),
    ...sponsorContributorBadges,
    ...appealClearedBadges({ roundId: round.id, pledges, reviewCases }),
    ...earlySupporterBadges,
  ].sort((left, right) => left.issuedAt.localeCompare(right.issuedAt) || left.id.localeCompare(right.id));
  const counters = Object.fromEntries(
    badgeDefinitions.map((definition) => [
      definition.badgeType,
      badges.filter((badge) => badge.badgeType === definition.badgeType && badge.status === "verified").length,
    ]),
  ) as Record<MpgfPublicGoodsProceduralBadgeType, number>;
  const calcHash = hashValue(
    badges.map((badge) => [
      badge.roundId,
      badge.userRefHash,
      badge.badgeType,
      badge.sourceRecordHash,
      badge.status,
      badge.noScoreIssued,
    ]),
  );

  return {
    ok: true,
    roundId: round.id,
    policy: MPGF_PUBLIC_GOODS_PROCEDURAL_BADGE_POLICY,
    privacyPolicy: MPGF_PUBLIC_GOODS_PROCEDURAL_BADGE_PRIVACY_POLICY,
    badges,
    counters,
    hiddenSignals: {
      moralKarmaScore: false,
      followerScore: false,
      commentScore: false,
      transferableGovernanceWeight: false,
    },
    definitions: badgeDefinitions,
    calcHash,
  };
}

export function getMpgfPublicGoodsProceduralBadgesApi(roundId: string = demoMpgfAssuranceRound.id) {
  if (roundId !== demoMpgfAssuranceRound.id) {
    return null;
  }

  return buildMpgfPublicGoodsProceduralBadgeLedger();
}
