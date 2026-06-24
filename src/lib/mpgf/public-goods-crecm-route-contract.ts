import { createHash } from "node:crypto";

import {
  demoMpgfAssuranceRound,
  demoMpgfPublicGoodsCampaigns,
} from "./data";
import {
  getMpgfPublicGoodsAllocationReportApi,
  getMpgfPublicGoodsMatchPreviewApi,
  getMpgfPublicGoodsRoundApi,
} from "./public-goods-api";
import {
  MPGF_PUBLIC_GOODS_CRECM_V1125_PAYMENT_SNAPSHOT_KINDS,
  MPGF_PUBLIC_GOODS_CRECM_V1125_SPONSOR_BACKING_STATES,
  MPGF_PUBLIC_GOODS_CRECM_V1125_SPONSOR_POOL_TYPES,
  buildMpgfCrecV1125ClearingContractSummary,
  hashMpgfCrecV1125Value,
} from "./public-goods-crecm-v1125";

export const MPGF_PUBLIC_GOODS_CRECM_V1125_ROUTE_POLICY =
  "crecm_v1_125_section_14_exact_route_surface_fail_closed";

export const MPGF_PUBLIC_GOODS_CRECM_V1125_SECTION_14_ROUTES = [
  "GET /api/mpgf/rounds",
  "GET /api/mpgf/rounds/:roundId",
  "POST /api/mpgf/rounds/:roundId/common-ground-budget",
  "POST /api/mpgf/rounds/:roundId/common-ground-budget/cancel",
  "POST /api/mpgf/rounds/:roundId/support-stance",
  "POST /api/mpgf/rounds/:roundId/conditional-intent",
  "GET /api/mpgf/rounds/:roundId/settlement-preview",
  "POST /api/mpgf/pivotality-calculator",
  "GET /api/mpgf/rounds/:roundId/payment-commitment-snapshots",
  "POST /api/mpgf/rounds/:roundId/payment-commitment-snapshots",
  "POST /api/mpgf/rounds/:roundId/lock",
  "POST /api/mpgf/rounds/:roundId/clear",
  "POST /api/mpgf/rounds/:roundId/authorize",
  "POST /api/mpgf/rounds/:roundId/reconcile-authorizations",
  "GET /api/mpgf/rounds/:roundId/authorization-reconciliation-events",
  "POST /api/mpgf/rounds/:roundId/capture",
  "POST /api/mpgf/rounds/:roundId/freeze",
  "GET /api/mpgf/rounds/:roundId/sponsor-commitments",
  "POST /api/mpgf/rounds/:roundId/sponsor-commitments",
  "POST /api/mpgf/rounds/:roundId/release-failed",
  "GET /api/mpgf/rounds/:roundId/failure-bonus-claims",
  "POST /api/mpgf/rounds/:roundId/failure-bonus-claims/:claimId/resolve",
  "GET /api/mpgf/rounds/:roundId/success-reward-claims",
  "POST /api/mpgf/rounds/:roundId/success-reward-claims/:claimId/resolve",
  "GET /api/mpgf/rounds/:roundId/coordination-credits",
  "GET /api/mpgf/rounds/:roundId/impact-certificates",
  "GET /api/mpgf/rounds/:roundId/audit-bundle",
  "GET /api/mpgf/projects/:projectId/review-state",
  "POST /api/mpgf/projects/:projectId/challenge",
  "POST /api/mpgf/projects/:projectId/conflict-review",
  "GET /api/mpgf/recipient-registry",
  "POST /api/mpgf/recipient-registry",
] as const;

export type MpgfCrecV1125Section14Route =
  (typeof MPGF_PUBLIC_GOODS_CRECM_V1125_SECTION_14_ROUTES)[number];

export function buildMpgfCrecV1125RouteContractApi() {
  return {
    ok: true as const,
    policy: MPGF_PUBLIC_GOODS_CRECM_V1125_ROUTE_POLICY,
    sourceSpec: "moralpublicgoods131.md",
    userFacingLabel: "Common Ground Budget",
    technicalLabel: "CRECM v1.125",
    routes: [...MPGF_PUBLIC_GOODS_CRECM_V1125_SECTION_14_ROUTES],
    exactRouteSurface: true,
    stateChangingRoutesFailClosedUntilPrerequisitesPass: true,
    noEscrowClaimWithoutRecordedCustodyRoute: true,
    noSavedPaymentMethodAuthorizationClaim: true,
  };
}

function routeHash(value: unknown) {
  return `sha256:${createHash("sha256").update(JSON.stringify(value)).digest("hex")}`;
}

function knownRound(roundId: string) {
  return roundId === demoMpgfAssuranceRound.id;
}

function routeBase({
  method,
  operation,
  route,
  roundId,
}: {
  method: "GET" | "POST";
  operation: string;
  route: string;
  roundId?: string;
}) {
  return {
    ok: true,
    policy: MPGF_PUBLIC_GOODS_CRECM_V1125_ROUTE_POLICY,
    sourceSpec: "moralpublicgoods131.md",
    userFacingLabel: "Common Ground Budget",
    technicalLabel: "CRECM v1.125",
    method,
    route,
    roundId: roundId ?? null,
    operation,
    noGlobalMoralRanking: true,
    privacyPolicy: "aggregate_or_participant_owned_records_only",
    noEscrowClaimWithoutRecordedCustodyRoute: true,
    savedPaymentMethodIsNotAuthorizationOrHold: true,
    stateChangingSideEffectsAllowed: false,
  };
}

export function buildMpgfCrecV1125RoundNotFound(roundId: string) {
  return {
    ok: false as const,
    policy: MPGF_PUBLIC_GOODS_CRECM_V1125_ROUTE_POLICY,
    error: "MPGF CRECM v1.125 round not found.",
    roundId,
  };
}

export function buildMpgfCrecV1125NoSideEffectPostApi({
  claimId,
  operation,
  projectId,
  route,
  roundId,
}: {
  claimId?: string;
  operation: string;
  projectId?: string;
  route: string;
  roundId?: string;
}) {
  return {
    ...routeBase({ method: "POST", operation, route, roundId }),
    claimId: claimId ?? null,
    projectId: projectId ?? null,
    acceptedForReview: true,
    stateMutation: "none_fail_closed_contract_only",
    bindingContributionIntentCreated: false,
    paymentCaptureAllowed: false,
    finalReviewRequiredBeforeBindingSave: true,
    requiredBeforeAnyMutation: [
      "authenticated_participant",
      "current_rulebook_hash_final_review",
      "active_common_ground_budget",
      "explicit_project_stance",
      "explicit_conditional_intent",
      "provider_confirmed_payment_commitment_snapshot_if_binding",
      "eligible_round_close_clearing_input_bundle_if_final",
    ],
    routeReceiptHash: routeHash([MPGF_PUBLIC_GOODS_CRECM_V1125_ROUTE_POLICY, route, roundId, projectId, claimId, operation]),
  };
}

export function getMpgfCrecV1125SettlementPreviewApi(roundId: string) {
  if (!knownRound(roundId)) {
    return null;
  }

  return {
    ...routeBase({
      method: "GET",
      operation: "settlement_preview",
      route: "/api/mpgf/rounds/:roundId/settlement-preview",
      roundId,
    }),
    nonBindingSettlementPreview: true,
    bindingChannels: {
      grossCapturedCents: 0,
      feeCents: 0,
      netRecipientDisbursedCents: 0,
      actualExposureCents: 0,
      countedContributionCents: 0,
      matchEligibleCents: 0,
    },
    requiredSnapshotKindForBinding: "round_close",
    paymentCommitmentSnapshotRequiredForBinding: true,
    settlementPreviewCopy:
      "Non-binding preview only. Final clearing requires a provider-confirmed round-close payment-commitment snapshot and eligible clearing bundle.",
    round: getMpgfPublicGoodsRoundApi(roundId)?.round ?? null,
    matchPreview: getMpgfPublicGoodsMatchPreviewApi(roundId),
    allocationPreview: getMpgfPublicGoodsAllocationReportApi(roundId),
  };
}

export function getMpgfCrecV1125PaymentCommitmentSnapshotsApi(roundId: string) {
  if (!knownRound(roundId)) {
    return null;
  }

  return {
    ...routeBase({
      method: "GET",
      operation: "payment_commitment_snapshots",
      route: "/api/mpgf/rounds/:roundId/payment-commitment-snapshots",
      roundId,
    }),
    snapshots: [],
    supportedSnapshotKinds: [...MPGF_PUBLIC_GOODS_CRECM_V1125_PAYMENT_SNAPSHOT_KINDS],
    providerConfirmedStateRequiredForBinding: true,
    nonEmptyPaymentMethodRefRequiredForBinding: true,
    exactCutoffBindingRequired: true,
    bindingHashFields:
      buildMpgfCrecV1125ClearingContractSummary().paymentCommitmentSnapshots.bindingHashFields,
  };
}

export function getMpgfCrecV1125AuthorizationReconciliationEventsApi(roundId: string) {
  if (!knownRound(roundId)) {
    return null;
  }

  return {
    ...routeBase({
      method: "GET",
      operation: "authorization_reconciliation_events",
      route: "/api/mpgf/rounds/:roundId/authorization-reconciliation-events",
      roundId,
    }),
    events: [],
    eventHashBindingRequired: true,
    exactAmountAuthorizationRequired: true,
    monotoneReclearingRequired: true,
  };
}

export function getMpgfCrecV1125SponsorCommitmentsApi(roundId: string) {
  if (!knownRound(roundId)) {
    return null;
  }

  const zeroByPoolType = Object.fromEntries(
    MPGF_PUBLIC_GOODS_CRECM_V1125_SPONSOR_POOL_TYPES.map((poolType) => [poolType, 0]),
  );

  return {
    ...routeBase({
      method: "GET",
      operation: "sponsor_commitments",
      route: "/api/mpgf/rounds/:roundId/sponsor-commitments",
      roundId,
    }),
    commitments: [],
    sponsorBackedCentsForPreviewByPoolType: zeroByPoolType,
    positiveBackingStates: [...MPGF_PUBLIC_GOODS_CRECM_V1125_SPONSOR_BACKING_STATES],
    poolTypes: [...MPGF_PUBLIC_GOODS_CRECM_V1125_SPONSOR_POOL_TYPES],
    donorFacingAdvertisableOnlyWhenBacked: true,
    finalClearingMustUseFrozenBundleInputs: true,
  };
}

export function getMpgfCrecV1125FailureBonusClaimsApi(roundId: string) {
  if (!knownRound(roundId)) {
    return null;
  }

  return {
    ...routeBase({
      method: "GET",
      operation: "failure_bonus_claims",
      route: "/api/mpgf/rounds/:roundId/failure-bonus-claims",
      roundId,
    }),
    claims: [],
    claimCreationRequiresFullQualifiedPredicate: true,
    payoutRequiresPayableRoundAndBackedFailureBonusPool: true,
    settlementStates: ["pending", "approved", "denied", "expired", "paid", "credited"],
  };
}

export function getMpgfCrecV1125ContributorBenefitApi({
  benefitKind,
  roundId,
  route,
}: {
  benefitKind: "success_reward_claims" | "coordination_credits" | "impact_certificates";
  roundId: string;
  route: string;
}) {
  if (!knownRound(roundId)) {
    return null;
  }

  return {
    ...routeBase({
      method: "GET",
      operation: benefitKind,
      route,
      roundId,
    }),
    records: [],
    contributorOnly: true,
    neverCountsAsPublicGoodDollars: true,
    neverCountsForMatchingOrCounterpartyVolume: true,
    requiresCapturedSuccessfulContributionRow: true,
  };
}

export function getMpgfCrecV1125AuditBundleApi(roundId: string) {
  if (!knownRound(roundId)) {
    return null;
  }

  const summary = buildMpgfCrecV1125ClearingContractSummary();

  return {
    ...routeBase({
      method: "GET",
      operation: "audit_bundle",
      route: "/api/mpgf/rounds/:roundId/audit-bundle",
      roundId,
    }),
    clearingContract: summary,
    routeContractHash: hashMpgfCrecV1125Value(buildMpgfCrecV1125RouteContractApi()),
    publicAuditBundleRequiresFinalRoundCloseBundle: true,
    mutableLiveInputsCannotChangeFinalAllocation: true,
  };
}

export function getMpgfCrecV1125ProjectReviewStateApi(projectId: string) {
  const project = demoMpgfPublicGoodsCampaigns.find((campaign) => campaign.id === projectId || campaign.slug === projectId);

  if (!project) {
    return {
      ok: false as const,
      policy: MPGF_PUBLIC_GOODS_CRECM_V1125_ROUTE_POLICY,
      error: "MPGF CRECM v1.125 project not found.",
      projectId,
    };
  }

  return {
    ...routeBase({
      method: "GET",
      operation: "project_review_state",
      route: "/api/mpgf/projects/:projectId/review-state",
    }),
    projectId: project.id,
    title: project.title,
    reviewStatus: project.reviewStatus,
    externalityState: "clear",
    challengeState: "clear_or_non_blocking_required",
    conflictReviewState: "clear_required",
    fiscalHostConflictCovered: true,
    payableRequiresHardGates: true,
  };
}

export function getMpgfCrecV1125RecipientRegistryApi() {
  return {
    ...routeBase({
      method: "GET",
      operation: "recipient_registry",
      route: "/api/mpgf/recipient-registry",
    }),
    recipients: demoMpgfPublicGoodsCampaigns.map((campaign) => ({
      projectId: campaign.id,
      title: campaign.title,
      destinationType: campaign.destinationType,
      destinationRouteValidRequired: true,
      privateContactDataIncluded: false,
    })),
    projectScopeRequired: "valid_moral_public_good",
    politicalCampaignTradesAllowed: false,
    privateBenefitProjectsAllowed: false,
  };
}
