import {
  directDonationUpgradeRenderedQaNoServiceDataEnabled,
} from "@/lib/direct-donation-upgrade-data";
import {
  qaFixtureIdentities,
  type DirectDonationUpgradeEnvironment,
} from "@/lib/direct-donation-upgrade";
import {
  DIRECT_SPENDING_UPGRADE_MATCHER_COMMITMENT_VERSION,
  type DirectSpendingUpgradeBaselineSummary,
  type DirectSpendingUpgradeCandidateRow,
  type DirectSpendingUpgradeEvidenceSummary,
  type DirectSpendingUpgradeImpactCreditRow,
  type DirectSpendingUpgradeObligationSummary,
  type DirectSpendingUpgradePrivateOfferRow,
  type DirectSpendingUpgradeProposalRow,
  type DirectSpendingUpgradePublicOfferRow,
} from "@/lib/direct-spending-upgrade";
import { createServiceClient } from "@/lib/supabase/server";

export const DIRECT_SPENDING_UPGRADE_RENDERED_QA_OPEN_OFFER_ID =
  "e6000000-0000-4000-8000-000000000006";
export const DIRECT_SPENDING_UPGRADE_RENDERED_QA_CREATOR_OFFER_ID =
  "e7000000-0000-4000-8000-000000000007";

function serviceClient() {
  return createServiceClient() as any;
}

function requireRows<T>(
  data: T[] | null,
  error: { message?: string } | null,
  label: string,
) {
  if (error) {
    throw new Error(`${label} unavailable: ${error.message ?? "query failed"}`);
  }
  return data ?? [];
}

function renderedQaEnabled(input: {
  viewerId: string | null;
  environment: DirectDonationUpgradeEnvironment;
}) {
  const boundViewerId = renderedQaBoundViewerId();
  return (
    boundViewerId !== null &&
    input.viewerId?.trim().toLowerCase() === boundViewerId &&
    directDonationUpgradeRenderedQaNoServiceDataEnabled({
      viewerId: boundViewerId,
      environment: input.environment,
    })
  );
}

function renderedQaBoundViewerId() {
  const viewerId = process.env
    .DIRECT_SPENDING_UPGRADE_RENDERED_QA_VIEWER_ID
    ?.trim()
    .toLowerCase();
  return viewerId &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
      viewerId,
    )
    ? viewerId
    : null;
}

function fixturePublicOffer(input: {
  id: string;
  status: DirectSpendingUpgradePublicOfferRow["status"];
  creatorName: string;
  creatorAmount: number;
  plannedSpend: number;
  matcherAmount: number;
  spendingReview: DirectSpendingUpgradePublicOfferRow["spending_change_review_status"];
  matcherName?: string | null;
}): DirectSpendingUpgradePublicOfferRow {
  const upgradedRecipient = qaFixtureIdentities()[1];
  const retained = input.plannedSpend - input.creatorAmount;
  return {
    id: input.id,
    mechanism_subtype: "spending_upgrade",
    environment: "staging",
    status: input.status,
    privacy_mode: "public",
    category: "pending_order_or_upgrade",
    planned_action: "cancel",
    planned_spend_amount_cents: input.plannedSpend,
    creator_diversion_amount_cents: input.creatorAmount,
    retained_spending_amount_cents: retained,
    diversion_basis_points: Math.floor(
      (input.creatorAmount * 10_000 + Math.floor(input.plannedSpend / 2)) /
        input.plannedSpend,
    ),
    matcher_amount_cents: input.matcherAmount,
    currency: "USD",
    match_deadline_at: "2099-08-21T12:00:00.000Z",
    fulfillment_deadline_at:
      input.status === "matched" ? "2099-08-28T12:00:00.000Z" : null,
    webhook_grace_ends_at:
      input.status === "matched" ? "2099-08-29T12:00:00.000Z" : null,
    upgraded_recipient: upgradedRecipient,
    terms_hash: input.id === DIRECT_SPENDING_UPGRADE_RENDERED_QA_OPEN_OFFER_ID
      ? "7".repeat(64)
      : "8".repeat(64),
    baseline_review_status: "accepted",
    spending_change_review_status: input.spendingReview,
    created_at: "2026-08-14T12:00:00.000Z",
    completed_at: null,
    supersedes_offer_id: null,
    superseded_by_offer_id: null,
    creator_display_name: input.creatorName,
    matcher_display_name: input.matcherName ?? null,
    matcher_count: input.status === "matched" ? 1 : 0,
    verified_obligation_count: input.status === "matched" ? 1 : 0,
    verified_gross_amount_cents:
      input.status === "matched" ? input.matcherAmount : 0,
    verified_net_amount_cents:
      input.status === "matched" ? input.matcherAmount - 45 : 0,
    converted_spending_gross_amount_cents: 0,
    converted_spending_net_amount_cents: 0,
    incremental_gross_amount_cents:
      input.status === "matched" ? input.matcherAmount : 0,
    incremental_net_amount_cents:
      input.status === "matched" ? input.matcherAmount - 45 : 0,
  };
}

function fixtureOffers() {
  return [
    fixturePublicOffer({
      id: DIRECT_SPENDING_UPGRADE_RENDERED_QA_OPEN_OFFER_ID,
      status: "open",
      creatorName: "QA Spending Creator",
      creatorAmount: 1_200,
      plannedSpend: 1_500,
      matcherAmount: 1_800,
      spendingReview: null,
    }),
    fixturePublicOffer({
      id: DIRECT_SPENDING_UPGRADE_RENDERED_QA_CREATOR_OFFER_ID,
      status: "matched",
      creatorName: "QA Viewer",
      creatorAmount: 2_400,
      plannedSpend: 3_000,
      matcherAmount: 2_000,
      spendingReview: "review_required",
      matcherName: "QA Independent Matcher",
    }),
  ];
}

function fixturePrivateOffer(
  publicOffer: DirectSpendingUpgradePublicOfferRow,
  creatorProfileId: string,
): DirectSpendingUpgradePrivateOfferRow {
  return {
    id: publicOffer.id,
    baseline_id: "e7100000-0000-4000-8000-000000000071",
    creator_profile_id: creatorProfileId,
    environment: "staging",
    status: publicOffer.status,
    privacy_mode: publicOffer.privacy_mode,
    creator_diversion_amount_cents:
      publicOffer.creator_diversion_amount_cents,
    retained_spending_amount_cents:
      publicOffer.retained_spending_amount_cents,
    diversion_basis_points: publicOffer.diversion_basis_points,
    matcher_amount_cents: publicOffer.matcher_amount_cents,
    currency: "USD",
    match_deadline_at: publicOffer.match_deadline_at,
    fulfillment_deadline_at: publicOffer.fulfillment_deadline_at,
    webhook_grace_ends_at: publicOffer.webhook_grace_ends_at,
    upgraded_recipient: publicOffer.upgraded_recipient,
    upgraded_recipient_hash: publicOffer.upgraded_recipient.identityHash,
    spending_change_review_status:
      publicOffer.spending_change_review_status,
    terms_hash: publicOffer.terms_hash,
    winning_candidate_id: "e7200000-0000-4000-8000-000000000072",
    supersedes_offer_id: null,
    superseded_by_offer_id: null,
    match_locked_at: "2026-08-14T13:00:00.000Z",
    completed_at: null,
    defaulted_at: null,
    cancellation_reason: "",
    failure_code: "",
    failure_message: "",
    created_at: publicOffer.created_at,
    updated_at: "2026-08-14T13:00:00.000Z",
  };
}

function fixtureObligations(
  offer: DirectSpendingUpgradePrivateOfferRow,
): DirectSpendingUpgradeObligationSummary[] {
  const common = {
    offer_id: offer.id,
    environment: "staging" as const,
    expected_recipient: offer.upgraded_recipient,
    expected_currency: "USD" as const,
    due_at: "2099-08-28T12:00:00.000Z",
    webhook_grace_ends_at: "2099-08-29T12:00:00.000Z",
  };
  return [
    {
      ...common,
      id: "e7300000-0000-4000-8000-000000000073",
      candidate_id: null,
      participant_profile_id: offer.creator_profile_id,
      participant_role: "creator",
      branch: "matched",
      obligation_kind: "creator_converted_spending",
      expected_amount_cents: offer.creator_diversion_amount_cents,
      status: "pending",
      provider_gross_amount_cents: null,
      provider_net_amount_cents: null,
      verified_at: null,
    },
    {
      ...common,
      id: "e7400000-0000-4000-8000-000000000074",
      candidate_id: "e7200000-0000-4000-8000-000000000072",
      participant_profile_id: "e7500000-0000-4000-8000-000000000075",
      participant_role: "matcher",
      branch: "matched",
      obligation_kind: "matcher_incremental",
      expected_amount_cents: offer.matcher_amount_cents,
      status: "verified",
      provider_gross_amount_cents: offer.matcher_amount_cents,
      provider_net_amount_cents: offer.matcher_amount_cents - 45,
      verified_at: "2026-08-14T14:00:00.000Z",
    },
  ];
}

export async function loadDirectSpendingUpgradePageData(input: {
  viewerId: string | null;
  environment: DirectDonationUpgradeEnvironment;
}) {
  const renderedQaViewerId = renderedQaEnabled(input)
    ? renderedQaBoundViewerId()
    : null;
  if (renderedQaViewerId) {
    const publicOffers = fixtureOffers();
    const creator = fixturePrivateOffer(publicOffers[1], renderedQaViewerId);
    return {
      publicOffers,
      creatorOffers: [creator],
      viewerCandidates: [] as DirectSpendingUpgradeCandidateRow[],
      viewerObligations: fixtureObligations(creator).filter(
        (obligation) => obligation.participant_profile_id === input.viewerId,
      ),
      viewerProposals: [] as DirectSpendingUpgradeProposalRow[],
    };
  }

  const supabase = serviceClient();
  const [publicResult, creatorResult, candidateResult, obligationResult, proposalResult] =
    await Promise.all([
      supabase
        .from("direct_spending_upgrade_public_offers")
        .select("*")
        .eq("environment", input.environment)
        .order("created_at", { ascending: false })
        .limit(40),
      input.viewerId
        ? supabase
            .from("direct_spending_upgrade_offers")
            .select("*")
            .eq("environment", input.environment)
            .eq("creator_profile_id", input.viewerId)
            .order("created_at", { ascending: false })
            .limit(40)
        : Promise.resolve({ data: [], error: null }),
      input.viewerId
        ? supabase
            .from("direct_spending_upgrade_candidates")
            .select(
              "*, offer_scope:direct_spending_upgrade_offers!offer_id!inner()",
            )
            .eq("offer_scope.environment", input.environment)
            .eq("profile_id", input.viewerId)
            .order("created_at", { ascending: false })
            .limit(40)
        : Promise.resolve({ data: [], error: null }),
      input.viewerId
        ? supabase
            .from("direct_spending_upgrade_obligations")
            .select(
              "id, offer_id, branch, candidate_id, participant_profile_id, participant_role, obligation_kind, environment, expected_recipient, expected_amount_cents, expected_currency, status, due_at, webhook_grace_ends_at, provider_gross_amount_cents, provider_net_amount_cents, verified_at",
            )
            .eq("environment", input.environment)
            .eq("participant_profile_id", input.viewerId)
            .order("created_at", { ascending: false })
            .limit(40)
        : Promise.resolve({ data: [], error: null }),
      input.viewerId
        ? supabase
            .from("direct_spending_upgrade_proposals")
            .select(
              "*, offer_scope:direct_spending_upgrade_offers!offer_id!inner()",
            )
            .eq("offer_scope.environment", input.environment)
            .eq("proposer_profile_id", input.viewerId)
            .order("created_at", { ascending: false })
            .limit(40)
        : Promise.resolve({ data: [], error: null }),
    ]);
  return {
    publicOffers: requireRows<DirectSpendingUpgradePublicOfferRow>(
      publicResult.data,
      publicResult.error,
      "Spending Upgrade public projection",
    ),
    creatorOffers: requireRows<DirectSpendingUpgradePrivateOfferRow>(
      creatorResult.data,
      creatorResult.error,
      "Spending Upgrade creator offers",
    ),
    viewerCandidates: requireRows<DirectSpendingUpgradeCandidateRow>(
      candidateResult.data,
      candidateResult.error,
      "Spending Upgrade matcher commitments",
    ),
    viewerObligations: requireRows<DirectSpendingUpgradeObligationSummary>(
      obligationResult.data,
      obligationResult.error,
      "Spending Upgrade donation obligations",
    ),
    viewerProposals: requireRows<DirectSpendingUpgradeProposalRow>(
      proposalResult.data,
      proposalResult.error,
      "Spending Upgrade counteroffers",
    ),
  };
}

export async function loadDirectSpendingUpgradeDetail(input: {
  offerId: string;
  viewerId: string | null;
  environment: DirectDonationUpgradeEnvironment;
}) {
  const renderedQaViewerId = renderedQaEnabled(input)
    ? renderedQaBoundViewerId()
    : null;
  if (renderedQaViewerId) {
    const publicOffer = fixtureOffers().find(
      (offer) => offer.id === input.offerId,
    ) ?? null;
    if (!publicOffer) {
      return {
        publicOffer: null,
        offer: null,
        baseline: null,
        candidates: [],
        proposals: [],
        obligations: [],
        evidence: [],
        impactCredits: [],
        isParticipant: false,
      };
    }
    const isCreator =
      input.offerId === DIRECT_SPENDING_UPGRADE_RENDERED_QA_CREATOR_OFFER_ID;
    const offer = isCreator
      ? fixturePrivateOffer(publicOffer, renderedQaViewerId)
      : null;
    const baseline = offer
      ? ({
          id: offer.baseline_id,
          creator_profile_id: offer.creator_profile_id,
          schema_version: "direct-spending-upgrade-baseline-v1-2026-08-14",
          category: publicOffer.category,
          planned_spend_amount_cents:
            publicOffer.planned_spend_amount_cents,
          planned_action: publicOffer.planned_action,
          review_status: "accepted",
          reviewed_at: "2026-08-14T12:30:00.000Z",
          failure_code: "",
          failure_message: "",
          created_at: "2026-08-14T12:00:00.000Z",
          updated_at: "2026-08-14T12:30:00.000Z",
        } satisfies DirectSpendingUpgradeBaselineSummary)
      : null;
    return {
      publicOffer,
      offer,
      baseline,
      candidates: [] as DirectSpendingUpgradeCandidateRow[],
      proposals: [] as DirectSpendingUpgradeProposalRow[],
      obligations: offer ? fixtureObligations(offer) : [],
      evidence: offer
        ? ([
            {
              id: "e7600000-0000-4000-8000-000000000076",
              offer_id: offer.id,
              evidence_kind: "spending_change",
              status: "review_required",
              captured_at: "2026-08-14T14:30:00.000Z",
              created_at: "2026-08-14T14:30:00.000Z",
            },
          ] satisfies DirectSpendingUpgradeEvidenceSummary[])
        : [],
      impactCredits: offer
        ? ([
            {
              id: "e7700000-0000-4000-8000-000000000077",
              offer_id: offer.id,
              obligation_id: "e7400000-0000-4000-8000-000000000074",
              profile_id: "e7500000-0000-4000-8000-000000000075",
              credit_kind: "matcher_incremental",
              verified_gross_amount_cents: offer.matcher_amount_cents,
              verified_net_amount_cents: offer.matcher_amount_cents - 45,
              converted_spending_gross_amount_cents: 0,
              converted_spending_net_amount_cents: 0,
              incremental_gross_amount_cents: offer.matcher_amount_cents,
              incremental_net_amount_cents: offer.matcher_amount_cents - 45,
              evidence_decision_id: null,
              verified_at: "2026-08-14T14:00:00.000Z",
              created_at: "2026-08-14T14:00:00.000Z",
            },
          ] satisfies DirectSpendingUpgradeImpactCreditRow[])
        : [],
      isParticipant: isCreator,
    };
  }

  const supabase = serviceClient();
  const { data: publicOfferData, error: publicError } = await supabase
    .from("direct_spending_upgrade_public_offers")
    .select("*")
    .eq("id", input.offerId)
    .eq("environment", input.environment)
    .maybeSingle();
  if (publicError) {
    throw new Error(`Spending Upgrade detail unavailable: ${publicError.message}`);
  }
  const publicOffer =
    (publicOfferData as DirectSpendingUpgradePublicOfferRow | null) ?? null;
  if (!input.viewerId) {
    return {
      publicOffer,
      offer: null,
      baseline: null,
      candidates: [],
      proposals: [],
      obligations: [],
      evidence: [],
      impactCredits: [],
      isParticipant: false,
    };
  }

  const [offerResult, candidateResult, proposalResult, obligationResult] =
    await Promise.all([
      supabase
        .from("direct_spending_upgrade_offers")
        .select("*")
        .eq("id", input.offerId)
        .eq("environment", input.environment)
        .maybeSingle(),
      supabase
        .from("direct_spending_upgrade_candidates")
        .select("*")
        .eq("offer_id", input.offerId)
        .eq("profile_id", input.viewerId)
        .in("status", ["primary", "fulfilled"]),
      supabase
        .from("direct_spending_upgrade_proposals")
        .select("*")
        .eq("offer_id", input.offerId)
        .eq("proposer_profile_id", input.viewerId),
      supabase
        .from("direct_spending_upgrade_obligations")
        .select(
          "id, offer_id, branch, candidate_id, participant_profile_id, participant_role, obligation_kind, environment, expected_recipient, expected_amount_cents, expected_currency, status, due_at, webhook_grace_ends_at, provider_gross_amount_cents, provider_net_amount_cents, verified_at",
        )
        .eq("offer_id", input.offerId)
        .eq("participant_profile_id", input.viewerId),
    ]);
  if (offerResult.error) {
    throw new Error(`Spending Upgrade private detail unavailable: ${offerResult.error.message}`);
  }
  const privateOffer =
    (offerResult.data as DirectSpendingUpgradePrivateOfferRow | null) ?? null;
  const ownCandidates = requireRows<DirectSpendingUpgradeCandidateRow>(
    candidateResult.data,
    candidateResult.error,
    "Spending Upgrade participant check",
  );
  const ownProposals = requireRows<DirectSpendingUpgradeProposalRow>(
    proposalResult.data,
    proposalResult.error,
    "Spending Upgrade proposal check",
  );
  const ownObligations = requireRows<DirectSpendingUpgradeObligationSummary>(
    obligationResult.data,
    obligationResult.error,
    "Spending Upgrade obligation check",
  );
  const isCreator = privateOffer?.creator_profile_id === input.viewerId;
  const isParticipant = Boolean(
    isCreator || ownCandidates.length || ownObligations.length,
  );
  if (!privateOffer || !isParticipant) {
    return {
      publicOffer,
      offer: null,
      baseline: null,
      candidates: [],
      proposals: [],
      obligations: [],
      evidence: [],
      impactCredits: [],
      isParticipant: false,
    };
  }

  const [baselineResult, candidatesResult, proposalsResult, obligationsResult, evidenceResult, creditsResult] =
    await Promise.all([
      supabase
        .from("direct_spending_upgrade_baselines")
        .select(
          "id, creator_profile_id, schema_version, category, planned_spend_amount_cents, planned_action, review_status, reviewed_at, failure_code, failure_message, created_at, updated_at",
        )
        .eq("id", privateOffer.baseline_id)
        .maybeSingle(),
      isCreator
        ? supabase
            .from("direct_spending_upgrade_candidates")
            .select("*")
            .eq("offer_id", input.offerId)
        : Promise.resolve({ data: ownCandidates, error: null }),
      isCreator
        ? supabase
            .from("direct_spending_upgrade_proposals")
            .select("*")
            .eq("offer_id", input.offerId)
            .order("created_at", { ascending: false })
        : Promise.resolve({ data: ownProposals, error: null }),
      supabase
        .from("direct_spending_upgrade_obligations")
        .select(
          "id, offer_id, branch, candidate_id, participant_profile_id, participant_role, obligation_kind, environment, expected_recipient, expected_amount_cents, expected_currency, status, due_at, webhook_grace_ends_at, provider_gross_amount_cents, provider_net_amount_cents, verified_at",
        )
        .eq("offer_id", input.offerId),
      isCreator
        ? supabase
            .from("direct_spending_upgrade_evidence_records")
            .select("id, offer_id, evidence_kind, status, captured_at, created_at")
            .eq("offer_id", input.offerId)
            .order("created_at", { ascending: false })
        : Promise.resolve({ data: [], error: null }),
      supabase
        .from("direct_spending_upgrade_impact_credits")
        .select(
          "id, offer_id, obligation_id, profile_id, credit_kind, verified_gross_amount_cents, verified_net_amount_cents, converted_spending_gross_amount_cents, converted_spending_net_amount_cents, incremental_gross_amount_cents, incremental_net_amount_cents, evidence_decision_id, verified_at, created_at",
        )
        .eq("offer_id", input.offerId),
    ]);
  if (baselineResult.error) {
    throw new Error(`Spending Upgrade baseline summary unavailable: ${baselineResult.error.message}`);
  }
  return {
    publicOffer,
    offer: privateOffer,
    baseline:
      baselineResult.data as DirectSpendingUpgradeBaselineSummary | null,
    candidates: requireRows<DirectSpendingUpgradeCandidateRow>(
      candidatesResult.data,
      candidatesResult.error,
      "Spending Upgrade candidates",
    ),
    proposals: requireRows<DirectSpendingUpgradeProposalRow>(
      proposalsResult.data,
      proposalsResult.error,
      "Spending Upgrade proposals",
    ),
    obligations: requireRows<DirectSpendingUpgradeObligationSummary>(
      obligationsResult.data,
      obligationsResult.error,
      "Spending Upgrade obligations",
    ),
    evidence: requireRows<DirectSpendingUpgradeEvidenceSummary>(
      evidenceResult.data,
      evidenceResult.error,
      "Spending Upgrade evidence summaries",
    ),
    impactCredits: requireRows<DirectSpendingUpgradeImpactCreditRow>(
      creditsResult.data,
      creditsResult.error,
      "Spending Upgrade impact credits",
    ),
    isParticipant,
  };
}

export function directSpendingUpgradeRenderedQaViewerFixture(input: {
  viewerId: string;
  environment: DirectDonationUpgradeEnvironment;
}) {
  const renderedQaViewerId = renderedQaEnabled(input)
    ? renderedQaBoundViewerId()
    : null;
  if (!renderedQaViewerId) return null;
  const publicOffers = fixtureOffers();
  const creator = fixturePrivateOffer(publicOffers[1], renderedQaViewerId);
  return {
    publicOffers,
    creatorOffers: [creator],
    viewerCandidates: [] as DirectSpendingUpgradeCandidateRow[],
    viewerObligations: fixtureObligations(creator).filter(
      (obligation) => obligation.participant_profile_id === input.viewerId,
    ),
    viewerProposals: [] as DirectSpendingUpgradeProposalRow[],
  };
}

export function directSpendingUpgradeFixtureCommitmentVersion() {
  return DIRECT_SPENDING_UPGRADE_MATCHER_COMMITMENT_VERSION;
}
