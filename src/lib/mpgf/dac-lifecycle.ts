import "server-only";

import { hasSupabaseEnv } from "@/lib/supabase/config";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import {
  mapMpgfDacCreatorProposalRow,
  mapMpgfDacOutcomeRow,
  mapMpgfDacOwnPledgeRow,
  mapMpgfDacPublishedTerms,
  mapMpgfDacPublicCampaignRow,
  mapMpgfDacReviewPledgeRow,
  type MpgfDacCampaignOutcome,
  type MpgfDacCreatorProposal,
  type MpgfDacOwnPledge,
  type MpgfDacPublishedTerms,
  type MpgfDacPublicCampaign,
  type MpgfDacPublicationRound,
  type MpgfDacReviewerWorkspace,
  type MpgfDacReviewProposal,
} from "./dac-lifecycle-model";

interface SupabaseErrorLike {
  code?: string | null;
  message: string;
  details?: string | null;
  hint?: string | null;
}

type SupabaseAny = {
  from: (table: string) => any;
  rpc: (name: string, args?: Record<string, unknown>) => Promise<{
    data: unknown;
    error: SupabaseErrorLike | null;
  }>;
};

const publicCampaignColumns = [
  "id",
  "round_id",
  "slug",
  "title",
  "destination_type",
  "destination_ref",
  "cause_tags",
  "public_summary",
  "threshold_amount_cents",
  "threshold_supporters",
  "deadline_at",
  "verification_method",
  "baseline_rule",
  "exit_rule",
  "review_status",
  "pool_proposal_id",
  "threshold_visibility",
  "progress_visibility",
  "published_terms_version",
  "published_terms_sha256",
  "published_at",
  "created_at",
].join(",");

const outcomeColumns = [
  "id",
  "campaign_id",
  "pool_proposal_id",
  "terms_version",
  "terms_sha256",
  "outcome_status",
  "eligible_amount_cents",
  "eligible_supporter_count",
  "threshold_amount_cents",
  "threshold_supporters",
  "deadline_at",
  "evaluated_at",
  "outcome_sha256",
  "created_at",
].join(",");

const ownPledgeColumns = [
  "id",
  "pledge_intent_id",
  "campaign_id",
  "pool_proposal_id",
  "profile_id",
  "amount_cents",
  "currency",
  "visibility_mode",
  "supporter_reason",
  "eligibility_state",
  "human_score_bps",
  "status",
  "terms_version",
  "terms_sha256",
  "accepted_at",
  "expires_at",
  "created_at",
].join(",");

const creatorProposalColumns = [
  "id",
  "proposer_id",
  "title",
  "summary",
  "cause_area",
  "problem",
  "intervention",
  "moral_public_good_rationale",
  "requested_maximum_funding_cents",
  "minimum_viable_funding_cents",
  "public_goods_destination_type",
  "public_goods_destination_ref",
  "public_goods_threshold_amount_cents",
  "public_goods_threshold_supporters",
  "public_goods_failure_bonus_enabled",
  "public_goods_failure_bonus_rate_bps",
  "public_goods_failure_bonus_schedule_status",
  "public_goods_success_premium_cents",
  "public_goods_success_premium_provisional",
  "public_goods_deadline_at",
  "public_goods_verification_method",
  "public_goods_baseline_rule",
  "public_goods_exit_rule",
  "public_goods_payout_method",
  "status",
  "terms_version",
  "approved_terms_version",
  "operative_terms_sha256",
  "terms_locked_at",
  "reviewed_at",
  "review_reason",
  "supersedes_proposal_id",
  "created_at",
].join(",");

export function isMissingMpgfDacSchemaError(error: SupabaseErrorLike | null | undefined) {
  if (!error) return false;
  const text = `${error.code ?? ""} ${error.message ?? ""} ${error.details ?? ""}`.toLowerCase();
  return (
    error.code === "42P01" ||
    error.code === "42703" ||
    error.code === "PGRST202" ||
    error.code === "PGRST204" ||
    error.code === "PGRST205" ||
    text.includes("does not exist") ||
    text.includes("schema cache")
  );
}

function assertQuery(error: SupabaseErrorLike | null, context: string) {
  if (error) {
    throw new Error(`${context}: ${error.message}`);
  }
}

function validPublishedCampaignRow(value: unknown) {
  const row = value as Record<string, unknown> | null;
  return Boolean(
    row &&
    typeof row.id === "string" &&
    typeof row.pool_proposal_id === "string" &&
    typeof row.published_terms_version === "number" &&
    typeof row.published_terms_sha256 === "string" &&
    typeof row.published_at === "string" &&
    (row.review_status === "approved" || row.review_status === "finalized"),
  );
}

async function findPublishedCampaign(
  supabase: SupabaseAny,
  campaignIdOrSlug: string,
): Promise<Record<string, unknown> | null> {
  const identifier = campaignIdOrSlug.trim();
  if (!identifier) return null;

  const byId = await supabase
    .from("mpgf_public_goods_campaigns")
    .select(publicCampaignColumns)
    .eq("id", identifier)
    .maybeSingle();

  if (byId.error && !isMissingMpgfDacSchemaError(byId.error)) {
    assertQuery(byId.error, "Could not load the DAC campaign");
  }
  if (validPublishedCampaignRow(byId.data)) {
    return byId.data as Record<string, unknown>;
  }

  if (byId.error && isMissingMpgfDacSchemaError(byId.error)) {
    return null;
  }

  const bySlug = await supabase
    .from("mpgf_public_goods_campaigns")
    .select(publicCampaignColumns)
    .eq("slug", identifier)
    .maybeSingle();

  if (bySlug.error && isMissingMpgfDacSchemaError(bySlug.error)) return null;
  assertQuery(bySlug.error, "Could not load the DAC campaign");
  return validPublishedCampaignRow(bySlug.data)
    ? bySlug.data as Record<string, unknown>
    : null;
}


async function loadPublishedTerms(
  supabase: SupabaseAny,
  campaignId: string,
): Promise<MpgfDacPublishedTerms | null> {
  const result = await supabase.rpc("mpgf_public_dac_campaign_terms", {
    p_campaign_id_or_slug: campaignId,
  });

  if (result.error && isMissingMpgfDacSchemaError(result.error)) return null;
  assertQuery(result.error, "Could not load the public exact DAC terms");
  if (!result.data) return null;
  return mapMpgfDacPublishedTerms(result.data);
}

function exactPublishedTermsMatch(
  campaignRow: Record<string, unknown>,
  publishedTerms: MpgfDacPublishedTerms,
) {
  return (
    publishedTerms.campaignId === campaignRow.id &&
    publishedTerms.poolProposalId === campaignRow.pool_proposal_id &&
    publishedTerms.termsVersion === campaignRow.published_terms_version &&
    publishedTerms.termsSha256 === campaignRow.published_terms_sha256 &&
    publishedTerms.threshold.netRecipientAmountCents === Number(campaignRow.threshold_amount_cents) &&
    publishedTerms.threshold.minimumSupporters === Number(campaignRow.threshold_supporters) &&
    Date.parse(publishedTerms.threshold.deadlineAt) === Date.parse(String(campaignRow.deadline_at)) &&
    publishedTerms.failureBonus.enabled === true &&
    publishedTerms.failureBonus.scheduleStatus === "approved" &&
    publishedTerms.successPremium.provisional === false &&
    publishedTerms.payoutMethod === "signed_intent"
  );
}

async function loadOutcome(
  supabase: SupabaseAny,
  campaignId: string,
): Promise<Record<string, unknown> | null> {
  const result = await supabase
    .from("mpgf_dac_campaign_outcomes")
    .select(outcomeColumns)
    .eq("campaign_id", campaignId)
    .maybeSingle();

  if (result.error && isMissingMpgfDacSchemaError(result.error)) return null;
  assertQuery(result.error, "Could not load the DAC terminal outcome");
  return result.data as Record<string, unknown> | null;
}

async function loadOwnPledges(
  supabase: SupabaseAny,
  campaignId: string,
  viewerId: string,
): Promise<MpgfDacOwnPledge[]> {
  const pledgeResult = await supabase
    .from("mpgf_public_goods_pledges")
    .select(ownPledgeColumns)
    .eq("campaign_id", campaignId)
    .eq("profile_id", viewerId)
    .not("pledge_intent_id", "is", null)
    .order("created_at", { ascending: false });

  if (pledgeResult.error && isMissingMpgfDacSchemaError(pledgeResult.error)) return [];
  assertQuery(pledgeResult.error, "Could not load your DAC pledge receipts");

  const rows = (pledgeResult.data ?? []) as Array<Record<string, unknown>>;
  const intentIds = rows
    .map((row) => typeof row.pledge_intent_id === "string" ? row.pledge_intent_id : null)
    .filter((value): value is string => Boolean(value));
  const consentHashByIntent = new Map<string, string>();

  if (intentIds.length > 0) {
    const intentResult = await supabase
      .from("mpgf_dac_pledge_intents")
      .select("id,consent_sha256")
      .eq("profile_id", viewerId)
      .in("id", intentIds);

    if (intentResult.error && !isMissingMpgfDacSchemaError(intentResult.error)) {
      assertQuery(intentResult.error, "Could not load your immutable DAC consent hashes");
    }

    for (const value of (intentResult.data ?? []) as Array<Record<string, unknown>>) {
      if (typeof value.id === "string" && typeof value.consent_sha256 === "string") {
        consentHashByIntent.set(value.id, value.consent_sha256);
      }
    }
  }

  return rows.map((row) => {
    const intentId = typeof row.pledge_intent_id === "string" ? row.pledge_intent_id : "";
    return mapMpgfDacOwnPledgeRow(row, consentHashByIntent.get(intentId) ?? null);
  });
}

export async function loadMpgfDacPublicCampaign(input: {
  campaignIdOrSlug: string;
  viewerId?: string;
}): Promise<MpgfDacPublicCampaign | null> {
  if (!hasSupabaseEnv()) return null;

  const supabase = await createClient() as unknown as SupabaseAny;
  const campaignRow = await findPublishedCampaign(supabase, input.campaignIdOrSlug);
  if (!campaignRow) return null;

  const campaignId = String(campaignRow.id);
  const [publishedTerms, outcomeRow, ownPledges] = await Promise.all([
    loadPublishedTerms(supabase, campaignId),
    loadOutcome(supabase, campaignId),
    input.viewerId ? loadOwnPledges(supabase, campaignId, input.viewerId) : Promise.resolve([]),
  ]);

  if (!publishedTerms || !exactPublishedTermsMatch(campaignRow, publishedTerms)) {
    return null;
  }

  return mapMpgfDacPublicCampaignRow({
    campaign: campaignRow,
    publishedTerms,
    outcome: outcomeRow,
    ownPledges,
  });
}

export async function loadMpgfDacCreatorProposal(input: {
  proposalId: string;
  userId: string;
}): Promise<MpgfDacCreatorProposal | null> {
  if (!hasSupabaseEnv()) return null;

  const supabase = await createClient() as unknown as SupabaseAny;
  const proposalResult = await supabase
    .from("mpgf_pool_proposals")
    .select(creatorProposalColumns)
    .eq("id", input.proposalId)
    .eq("proposer_id", input.userId)
    .maybeSingle();

  if (proposalResult.error && isMissingMpgfDacSchemaError(proposalResult.error)) return null;
  assertQuery(proposalResult.error, "Could not load your pool proposal");
  if (!proposalResult.data) return null;

  const [versionsResult, eventsResult, campaignResult] = await Promise.all([
    supabase
      .from("mpgf_pool_proposal_versions")
      .select("proposal_id,terms_version,terms_sha256,recorded_reason,recorded_at")
      .eq("proposal_id", input.proposalId)
      .order("terms_version", { ascending: true }),
    supabase
      .from("mpgf_pool_lifecycle_events")
      .select("id,event_sequence,proposal_id,terms_version,event_type,actor_user_id,from_status,to_status,terms_sha256,reason,metadata_json,created_at")
      .eq("proposal_id", input.proposalId)
      .order("event_sequence", { ascending: true }),
    supabase
      .from("mpgf_public_goods_campaigns")
      .select(publicCampaignColumns)
      .eq("pool_proposal_id", input.proposalId)
      .maybeSingle(),
  ]);

  if (versionsResult.error && !isMissingMpgfDacSchemaError(versionsResult.error)) {
    assertQuery(versionsResult.error, "Could not load proposal versions");
  }
  if (eventsResult.error && !isMissingMpgfDacSchemaError(eventsResult.error)) {
    assertQuery(eventsResult.error, "Could not load proposal lifecycle events");
  }
  if (campaignResult.error && !isMissingMpgfDacSchemaError(campaignResult.error)) {
    assertQuery(campaignResult.error, "Could not load the proposal's public campaign");
  }

  let campaign: MpgfDacPublicCampaign | null = null;
  if (validPublishedCampaignRow(campaignResult.data)) {
    const campaignRow = campaignResult.data as Record<string, unknown>;
    const campaignId = String(campaignRow.id);
    const [publishedTerms, outcomeRow] = await Promise.all([
      loadPublishedTerms(supabase, campaignId),
      loadOutcome(supabase, campaignId),
    ]);
    if (publishedTerms && exactPublishedTermsMatch(campaignRow, publishedTerms)) {
      campaign = mapMpgfDacPublicCampaignRow({
        campaign: campaignRow,
        publishedTerms,
        outcome: outcomeRow,
      });
    }
  }

  return mapMpgfDacCreatorProposalRow({
    proposal: proposalResult.data,
    versions: (versionsResult.data ?? []) as unknown[],
    lifecycleEvents: (eventsResult.data ?? []) as unknown[],
    campaign,
  });
}

function nullableString(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function nullableNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

export async function loadMpgfDacReviewerWorkspace(reviewerId: string): Promise<MpgfDacReviewerWorkspace> {
  const supabase = createServiceClient() as unknown as SupabaseAny;
  const [reviewerResult, proposalResult] = await Promise.all([
    supabase
      .from("mpgf_pool_reviewers")
      .select("reviewer_id,active,rationale,authorized_at,expires_at")
      .eq("reviewer_id", reviewerId)
      .maybeSingle(),
    supabase
      .from("mpgf_pool_proposals")
      .select(creatorProposalColumns)
      .in("status", [
        "submitted",
        "under_review",
        "changes_requested",
        "approved_as_candidate",
        "succeeded",
        "lapsed",
      ])
      .order("created_at", { ascending: false })
      .limit(100),
  ]);
  assertQuery(reviewerResult.error, "Could not load DAC reviewer authorization");
  assertQuery(proposalResult.error, "Could not load the DAC proposal review queue");

  const proposalRows = (proposalResult.data ?? []) as Array<Record<string, unknown>>;
  const proposalIds = proposalRows.map((row) => String(row.id));
  const campaignResult = proposalIds.length > 0
    ? await supabase
        .from("mpgf_public_goods_campaigns")
        .select("id,slug,pool_proposal_id,review_status,published_terms_version,published_terms_sha256,published_at")
        .in("pool_proposal_id", proposalIds)
    : { data: [], error: null };
  assertQuery(campaignResult.error, "Could not load published DAC campaigns for review");

  const campaignRows = (campaignResult.data ?? []) as Array<Record<string, unknown>>;
  const campaignIds = campaignRows.map((row) => String(row.id));
  const [outcomeResult, pledgeResult, roundResult] = await Promise.all([
    campaignIds.length > 0
      ? supabase
          .from("mpgf_dac_campaign_outcomes")
          .select("campaign_id,outcome_status")
          .in("campaign_id", campaignIds)
      : Promise.resolve({ data: [], error: null }),
    supabase
      .from("mpgf_public_goods_pledges")
      .select(ownPledgeColumns)
      .eq("eligibility_state", "pending_review")
      .eq("status", "pledged")
      .not("pledge_intent_id", "is", null)
      .order("created_at", { ascending: true })
      .limit(200),
    supabase
      .from("mpgf_public_goods_rounds")
      .select("id,name,starts_at,ends_at,status,supporter_gate")
      .in("status", ["scheduled", "open"])
      .order("starts_at", { ascending: true })
      .limit(50),
  ]);

  assertQuery(outcomeResult.error, "Could not load DAC terminal outcomes for review");
  assertQuery(pledgeResult.error, "Could not load pending DAC pledge eligibility reviews");
  assertQuery(roundResult.error, "Could not load eligible publication rounds");

  const campaignByProposal = new Map<string, Record<string, unknown>>();
  for (const row of campaignRows) {
    if (typeof row.pool_proposal_id === "string") {
      campaignByProposal.set(row.pool_proposal_id, row);
    }
  }
  const outcomeByCampaign = new Map<string, "succeeded" | "lapsed">();
  for (const row of (outcomeResult.data ?? []) as Array<Record<string, unknown>>) {
    if (typeof row.campaign_id === "string" && (row.outcome_status === "succeeded" || row.outcome_status === "lapsed")) {
      outcomeByCampaign.set(row.campaign_id, row.outcome_status);
    }
  }

  const proposals: MpgfDacReviewProposal[] = proposalRows.map((row) => {
    const campaign = campaignByProposal.get(String(row.id));
    const campaignId = nullableString(campaign?.id);
    return {
      id: String(row.id),
      proposerId: nullableString(row.proposer_id),
      title: String(row.title ?? "Untitled pool proposal"),
      summary: String(row.summary ?? ""),
      causeArea: String(row.cause_area ?? ""),
      status: [
        "submitted",
        "under_review",
        "changes_requested",
        "approved_as_candidate",
        "succeeded",
        "lapsed",
      ].includes(String(row.status))
        ? row.status as MpgfDacReviewProposal["status"]
        : "draft",
      termsVersion: nullableNumber(row.terms_version) ?? 1,
      approvedTermsVersion: nullableNumber(row.approved_terms_version),
      operativeTermsSha256: nullableString(row.operative_terms_sha256),
      termsLockedAt: nullableString(row.terms_locked_at),
      reviewedAt: nullableString(row.reviewed_at),
      reviewReason: nullableString(row.review_reason),
      thresholdAmountCents: nullableNumber(row.public_goods_threshold_amount_cents),
      thresholdSupporters: nullableNumber(row.public_goods_threshold_supporters),
      deadlineAt: nullableString(row.public_goods_deadline_at),
      failureBonusEnabled: Boolean(row.public_goods_failure_bonus_enabled),
      failureBonusScheduleStatus: nullableString(row.public_goods_failure_bonus_schedule_status),
      successPremiumProvisional:
        typeof row.public_goods_success_premium_provisional === "boolean"
          ? row.public_goods_success_premium_provisional
          : null,
      createdAt: String(row.created_at ?? ""),
      campaignId,
      campaignSlug: nullableString(campaign?.slug),
      campaignReviewStatus: nullableString(campaign?.review_status),
      outcomeStatus: campaignId ? outcomeByCampaign.get(campaignId) ?? null : null,
    };
  });

  const publicationRounds: MpgfDacPublicationRound[] = ((roundResult.data ?? []) as Array<Record<string, unknown>>)
    .map((row) => ({
      id: String(row.id),
      name: String(row.name ?? row.id),
      startsAt: String(row.starts_at ?? ""),
      endsAt: String(row.ends_at ?? ""),
      status: String(row.status ?? ""),
      supporterGate: String(row.supporter_gate ?? ""),
    }));

  const reviewerRow = reviewerResult.data as Record<string, unknown> | null;
  const reviewerExpiresAt = reviewerRow ? nullableString(reviewerRow.expires_at) : null;
  const reviewerCurrentlyAuthorized = Boolean(
    reviewerRow?.active &&
    (!reviewerExpiresAt || Date.parse(reviewerExpiresAt) > Date.now()),
  );

  return {
    reviewerAuthorization: reviewerRow ? {
      reviewerId: String(reviewerRow.reviewer_id),
      active: Boolean(reviewerRow.active),
      currentlyAuthorized: reviewerCurrentlyAuthorized,
      rationale: String(reviewerRow.rationale ?? ""),
      authorizedAt: String(reviewerRow.authorized_at ?? ""),
      expiresAt: reviewerExpiresAt,
    } : null,
    proposals,
    pendingPledges: ((pledgeResult.data ?? []) as unknown[]).map(mapMpgfDacReviewPledgeRow),
    publicationRounds,
  };
}

export async function loadPublicMpgfDacOutcome(campaignId: string): Promise<MpgfDacCampaignOutcome | null> {
  if (!hasSupabaseEnv()) return null;
  const supabase = await createClient() as unknown as SupabaseAny;
  const outcome = await loadOutcome(supabase, campaignId);
  return outcome ? mapMpgfDacOutcomeRow(outcome) : null;
}
