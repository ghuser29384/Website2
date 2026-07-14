import { createHash } from "node:crypto";

import {
  demoMpgfAssurancePledges,
  demoMpgfAssuranceRound,
  demoMpgfMatchPool,
  demoMpgfPublicGoodsCampaigns,
  demoMpgfPublicGoodsIdentityAttestations,
} from "./data";
import {
  countMpgfQfContributionCents,
  mpgfVerificationWeightFromHumanScoreBps,
} from "./mechanism";
import type {
  MpgfPublicGoodsCampaign,
  MpgfPublicGoodsIdentityAttestation,
  MpgfPublicGoodsMatchPool,
  MpgfPublicGoodsPledge,
  MpgfPublicGoodsRound,
} from "./types";

export const MPGF_PUBLIC_GOODS_IDENTITY_INTEGRITY_POLICY =
  "non_moral_identity_confidence_no_moral_reputation_v1";

export const MPGF_PUBLIC_GOODS_IDENTITY_INTEGRITY_PRIVACY_POLICY =
  "aggregate_only_no_raw_identity_evidence_or_contact_data";

export const MPGF_PUBLIC_GOODS_IDENTITY_QF_WEIGHT_POLICY =
  "identity_confidence_only_no_moral_reputation";

export const MPGF_PUBLIC_GOODS_UNIQUE_HUMANITY_POLICY =
  "duplicate_identity_review_and_non_moral_human_score_thresholds";

const MPGF_PUBLIC_GOODS_IDENTITY_PROVIDER_MODES = [
  {
    provider: "demo_self_attestation",
    mode: "pilot_self_attestation",
    productionUse: "fallback_review_signal_only",
    minimumHumanScoreBps: 5_000,
    rawProviderPayloadStored: false,
    contactDataStored: false,
  },
  {
    provider: "repository_profile",
    mode: "repository_account_consistency",
    productionUse: "platform_account_continuity_signal",
    minimumHumanScoreBps: 6_000,
    rawProviderPayloadStored: false,
    contactDataStored: false,
  },
  {
    provider: "external_proof_of_personhood",
    mode: "human_passport_or_equivalent_unique_humanity",
    productionUse: "preferred_for_breadth_amplified_rounds",
    minimumHumanScoreBps: 7_000,
    rawProviderPayloadStored: false,
    contactDataStored: false,
  },
] as const;

type IdentityProvider = MpgfPublicGoodsIdentityAttestation["provider"];
type ProviderCountKey = IdentityProvider | "unlinked_identity_score";

export interface MpgfPublicGoodsIdentityIntegrityCounters {
  activePledgeCount: number;
  eligiblePledgeCount: number;
  eligibleDistinctIdentityCount: number;
  pendingReviewCount: number;
  duplicateIdentityCount: number;
  belowMinimumCount: number;
  blockedIdentityCount: number;
  nonCountedPledgeCount: number;
  rawEligibleDirectCents: number;
  qfWeightedDirectCents: number;
  averageEligibleHumanScoreBps: number;
  perDonorCountedCapCents: number | null;
  externalProofEligibleCount: number;
  repositoryProfileEligibleCount: number;
  demoSelfAttestationEligibleCount: number;
  unlinkedIdentityScoreEligibleCount: number;
}

export interface MpgfPublicGoodsIdentityIntegrityRow {
  campaignId: string;
  activePledgeCount: number;
  eligiblePledgeCount: number;
  eligibleDistinctIdentityCount: number;
  pendingReviewCount: number;
  duplicateIdentityCount: number;
  belowMinimumCount: number;
  blockedIdentityCount: number;
  rawEligibleDirectCents: number;
  qfWeightedDirectCents: number;
  averageEligibleHumanScoreBps: number;
  sybilReviewRequired: boolean;
  calculationHash: string;
}

export interface MpgfPublicGoodsIdentityIntegrityReport {
  ok: true;
  roundId: string;
  policy: typeof MPGF_PUBLIC_GOODS_IDENTITY_INTEGRITY_POLICY;
  privacyPolicy: typeof MPGF_PUBLIC_GOODS_IDENTITY_INTEGRITY_PRIVACY_POLICY;
  qfWeightPolicy: typeof MPGF_PUBLIC_GOODS_IDENTITY_QF_WEIGHT_POLICY;
  uniqueHumanityPolicy: typeof MPGF_PUBLIC_GOODS_UNIQUE_HUMANITY_POLICY;
  noGlobalMoralRanking: true;
  noMoralReputationWeighting: true;
  identityCanAffectEligibilityOrWeight: true;
  commonGroundSignalsExcludedFromAllocationPower: true;
  supportSignalStrengthExcludedFromAllocationPower: true;
  rawProviderPayloadsExcluded: true;
  publicIndividualScoresExcluded: true;
  providerModes: typeof MPGF_PUBLIC_GOODS_IDENTITY_PROVIDER_MODES;
  counters: MpgfPublicGoodsIdentityIntegrityCounters;
  providerCounts: Record<ProviderCountKey, number>;
  rows: MpgfPublicGoodsIdentityIntegrityRow[];
  calcHash: string;
}

function hashValue(value: unknown) {
  return `sha256:${createHash("sha256").update(JSON.stringify(value)).digest("hex")}`;
}

function isActivePledge(pledge: MpgfPublicGoodsPledge) {
  return pledge.status === "pledged" || pledge.status === "captured";
}

function isEligiblePledge(pledge: MpgfPublicGoodsPledge) {
  return isActivePledge(pledge) && pledge.eligibilityState === "eligible";
}

function perDonorCapCents(matchPool: MpgfPublicGoodsMatchPool) {
  const value = Number(matchPool.restrictionsJson.perDonorQfCapCents);

  return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : null;
}

function identityByUser(attestations: MpgfPublicGoodsIdentityAttestation[]) {
  return new Map(attestations.map((attestation) => [attestation.userId, attestation]));
}

function providerForPledge(
  pledge: MpgfPublicGoodsPledge,
  identitiesByUser: Map<string, MpgfPublicGoodsIdentityAttestation>,
): ProviderCountKey {
  const identity = identitiesByUser.get(pledge.userId);

  if (!identity || identity.status !== "active") {
    return "unlinked_identity_score";
  }

  return identity.provider;
}

function averageHumanScoreBps(pledges: MpgfPublicGoodsPledge[]) {
  if (!pledges.length) {
    return 0;
  }

  return Math.floor(pledges.reduce((sum, pledge) => sum + pledge.humanScoreBps, 0) / pledges.length);
}

function weightedDirectCents(pledges: MpgfPublicGoodsPledge[]) {
  const byUser = new Map<string, { grossCents: number; humanScoreBps: number }>();

  for (const pledge of pledges) {
    if (!isEligiblePledge(pledge)) {
      continue;
    }

    const existing = byUser.get(pledge.userId);

    if (!existing) {
      byUser.set(pledge.userId, {
        grossCents: pledge.amountCents,
        humanScoreBps: pledge.humanScoreBps,
      });
      continue;
    }

    existing.grossCents += pledge.amountCents;
    existing.humanScoreBps = Math.max(existing.humanScoreBps, pledge.humanScoreBps);
  }

  return [...byUser.values()].reduce((sum, row) => {
    const verificationWeight = mpgfVerificationWeightFromHumanScoreBps(row.humanScoreBps);

    return sum + Math.floor(countMpgfQfContributionCents(row.grossCents) * verificationWeight);
  }, 0);
}

function buildProviderCounts(
  eligiblePledges: MpgfPublicGoodsPledge[],
  attestations: MpgfPublicGoodsIdentityAttestation[],
) {
  const identitiesByUser = identityByUser(attestations);
  const providerCounts: Record<ProviderCountKey, number> = {
    demo_self_attestation: 0,
    repository_profile: 0,
    external_proof_of_personhood: 0,
    unlinked_identity_score: 0,
  };

  for (const pledge of eligiblePledges) {
    providerCounts[providerForPledge(pledge, identitiesByUser)] += 1;
  }

  return providerCounts;
}

function buildCounters({
  pledges,
  matchPool,
  attestations,
}: {
  pledges: MpgfPublicGoodsPledge[];
  matchPool: MpgfPublicGoodsMatchPool;
  attestations: MpgfPublicGoodsIdentityAttestation[];
}): MpgfPublicGoodsIdentityIntegrityCounters {
  const activePledges = pledges.filter(isActivePledge);
  const eligiblePledges = pledges.filter(isEligiblePledge);
  const providerCounts = buildProviderCounts(eligiblePledges, attestations);

  return {
    activePledgeCount: activePledges.length,
    eligiblePledgeCount: eligiblePledges.length,
    eligibleDistinctIdentityCount: new Set(eligiblePledges.map((pledge) => pledge.userId)).size,
    pendingReviewCount: activePledges.filter((pledge) => pledge.eligibilityState === "pending_review").length,
    duplicateIdentityCount: activePledges.filter((pledge) => pledge.eligibilityState === "duplicate_identity").length,
    belowMinimumCount: activePledges.filter((pledge) => pledge.eligibilityState === "below_minimum").length,
    blockedIdentityCount: activePledges.filter((pledge) => pledge.eligibilityState === "blocked").length,
    nonCountedPledgeCount: activePledges.length - eligiblePledges.length,
    rawEligibleDirectCents: eligiblePledges.reduce((sum, pledge) => sum + pledge.amountCents, 0),
    qfWeightedDirectCents: weightedDirectCents(eligiblePledges),
    averageEligibleHumanScoreBps: averageHumanScoreBps(eligiblePledges),
    perDonorCountedCapCents: perDonorCapCents(matchPool),
    externalProofEligibleCount: providerCounts.external_proof_of_personhood,
    repositoryProfileEligibleCount: providerCounts.repository_profile,
    demoSelfAttestationEligibleCount: providerCounts.demo_self_attestation,
    unlinkedIdentityScoreEligibleCount: providerCounts.unlinked_identity_score,
  };
}

function buildCampaignRow(campaign: MpgfPublicGoodsCampaign, pledges: MpgfPublicGoodsPledge[]) {
  const campaignPledges = pledges.filter((pledge) => pledge.campaignId === campaign.id);
  const activePledges = campaignPledges.filter(isActivePledge);
  const eligiblePledges = campaignPledges.filter(isEligiblePledge);
  const pendingReviewCount = activePledges.filter((pledge) => pledge.eligibilityState === "pending_review").length;
  const duplicateIdentityCount = activePledges.filter((pledge) => pledge.eligibilityState === "duplicate_identity").length;
  const belowMinimumCount = activePledges.filter((pledge) => pledge.eligibilityState === "below_minimum").length;
  const blockedIdentityCount = activePledges.filter((pledge) => pledge.eligibilityState === "blocked").length;
  const rawEligibleDirectCents = eligiblePledges.reduce((sum, pledge) => sum + pledge.amountCents, 0);
  const qfWeightedDirectCents = weightedDirectCents(eligiblePledges);
  const averageEligibleHumanScoreBps = averageHumanScoreBps(eligiblePledges);
  const eligibleDistinctIdentityCount = new Set(eligiblePledges.map((pledge) => pledge.userId)).size;
  const sybilReviewRequired =
    duplicateIdentityCount > 0 ||
    blockedIdentityCount > 0 ||
    belowMinimumCount > 0 ||
    pendingReviewCount > 0;
  const calculationHash = hashValue([
    campaign.id,
    activePledges.length,
    eligiblePledges.length,
    eligibleDistinctIdentityCount,
    pendingReviewCount,
    duplicateIdentityCount,
    belowMinimumCount,
    blockedIdentityCount,
    rawEligibleDirectCents,
    qfWeightedDirectCents,
    averageEligibleHumanScoreBps,
    sybilReviewRequired,
  ]);

  return {
    campaignId: campaign.id,
    activePledgeCount: activePledges.length,
    eligiblePledgeCount: eligiblePledges.length,
    eligibleDistinctIdentityCount,
    pendingReviewCount,
    duplicateIdentityCount,
    belowMinimumCount,
    blockedIdentityCount,
    rawEligibleDirectCents,
    qfWeightedDirectCents,
    averageEligibleHumanScoreBps,
    sybilReviewRequired,
    calculationHash,
  };
}

export function buildMpgfPublicGoodsIdentityIntegrityReport({
  campaigns = demoMpgfPublicGoodsCampaigns,
  pledges = demoMpgfAssurancePledges,
  round = demoMpgfAssuranceRound,
  matchPool = demoMpgfMatchPool,
  attestations = demoMpgfPublicGoodsIdentityAttestations,
}: {
  campaigns?: MpgfPublicGoodsCampaign[];
  pledges?: MpgfPublicGoodsPledge[];
  round?: MpgfPublicGoodsRound;
  matchPool?: MpgfPublicGoodsMatchPool;
  attestations?: MpgfPublicGoodsIdentityAttestation[];
} = {}): MpgfPublicGoodsIdentityIntegrityReport {
  const eligiblePledges = pledges.filter(isEligiblePledge);
  const providerCounts = buildProviderCounts(eligiblePledges, attestations);
  const rows = campaigns.map((campaign) => buildCampaignRow(campaign, pledges));
  const counters = buildCounters({ pledges, matchPool, attestations });
  const calcHash = hashValue([
    round.id,
    MPGF_PUBLIC_GOODS_IDENTITY_INTEGRITY_POLICY,
    MPGF_PUBLIC_GOODS_IDENTITY_QF_WEIGHT_POLICY,
    providerCounts,
    counters,
    rows.map((row) => [
      row.campaignId,
      row.eligibleDistinctIdentityCount,
      row.duplicateIdentityCount,
      row.blockedIdentityCount,
      row.qfWeightedDirectCents,
      row.calculationHash,
    ]),
  ]);

  return {
    ok: true,
    roundId: round.id,
    policy: MPGF_PUBLIC_GOODS_IDENTITY_INTEGRITY_POLICY,
    privacyPolicy: MPGF_PUBLIC_GOODS_IDENTITY_INTEGRITY_PRIVACY_POLICY,
    qfWeightPolicy: MPGF_PUBLIC_GOODS_IDENTITY_QF_WEIGHT_POLICY,
    uniqueHumanityPolicy: MPGF_PUBLIC_GOODS_UNIQUE_HUMANITY_POLICY,
    noGlobalMoralRanking: true,
    noMoralReputationWeighting: true,
    identityCanAffectEligibilityOrWeight: true,
    commonGroundSignalsExcludedFromAllocationPower: true,
    supportSignalStrengthExcludedFromAllocationPower: true,
    rawProviderPayloadsExcluded: true,
    publicIndividualScoresExcluded: true,
    providerModes: MPGF_PUBLIC_GOODS_IDENTITY_PROVIDER_MODES,
    counters,
    providerCounts,
    rows,
    calcHash,
  };
}

export function getMpgfPublicGoodsIdentityIntegrityReportApi(roundId: string = demoMpgfAssuranceRound.id) {
  if (roundId !== demoMpgfAssuranceRound.id) {
    return null;
  }

  return buildMpgfPublicGoodsIdentityIntegrityReport();
}
