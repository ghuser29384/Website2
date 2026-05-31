import { createServiceClient } from "@/lib/supabase/server";

import { getMpgfCampaignAssuranceStatus } from "./mechanism";
import {
  hashMpgfPublicGoodsAnalyticsUserRef,
  recordMpgfPublicGoodsAnalyticsEvent,
} from "./public-goods-analytics";
import type {
  MpgfPublicGoodsCampaign,
  MpgfPublicGoodsPledge,
  MpgfPublicGoodsVisibilityMode,
} from "./types";

type SupabaseServiceAny = ReturnType<typeof createServiceClient> & {
  from: (table: string) => any;
};

export type MpgfPublicGoodsReminderKind =
  | "deadline_72h"
  | "deadline_24h"
  | "threshold_near"
  | "threshold_met_next_step";

export interface MpgfPublicGoodsReminderContact {
  profileId?: string;
  userRef: string;
  email?: string | null;
}

export interface MpgfPublicGoodsReminderPlan {
  reminderKey: string;
  kind: MpgfPublicGoodsReminderKind;
  campaignId: string;
  campaignTitle: string;
  recipientProfileId?: string;
  recipientUserRef: string;
  recipientEmail?: string;
  analyticsUserRefHash: string | null;
  subject: string;
  body: string;
  privacyPolicy: "aggregate_progress_no_private_amounts_or_reasons";
}

export interface QueueMpgfPublicGoodsReminderEmailsResult {
  ok: true;
  processedCampaigns: number;
  plannedReminders: number;
  queuedEmails: number;
  skippedWithoutEmail: number;
  skippedAlreadyQueued: number;
  warnings: string[];
}

function clampPercentFromBps(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round(value / 100)));
}

function hoursUntil(deadlineAt: string, now: Date) {
  const deadlineMs = Date.parse(deadlineAt);

  if (!Number.isFinite(deadlineMs)) {
    return Number.POSITIVE_INFINITY;
  }

  return (deadlineMs - now.getTime()) / 3_600_000;
}

function isActiveReminderPledge(pledge: MpgfPublicGoodsPledge) {
  return (
    pledge.status === "pledged" &&
    pledge.amountCents > 0 &&
    pledge.eligibilityState !== "blocked" &&
    pledge.eligibilityState !== "duplicate_identity"
  );
}

function reminderSubjectFor(kind: MpgfPublicGoodsReminderKind) {
  if (kind === "threshold_met_next_step") {
    return "MoralTrade public-goods threshold update";
  }

  return "MoralTrade public-goods campaign reminder";
}

function reminderBodyFor(input: {
  kind: MpgfPublicGoodsReminderKind;
  campaign: MpgfPublicGoodsCampaign;
  amountProgressPercent: number;
  verifiedSupporterCount: number;
  thresholdSupporters: number;
}) {
  const progressLine =
    `It is at ${input.amountProgressPercent}% of its funding threshold and ` +
    `${input.verifiedSupporterCount}/${input.thresholdSupporters} verified supporters.`;

  if (input.kind === "threshold_met_next_step") {
    return [
      `${input.campaign.title} has crossed its public-goods threshold.`,
      "The next step is review, proof, or external-handoff completion before any support counts as verified.",
      "MoralTrade does not take custody in the public-goods pilot; sign in to review the evidence plan and visibility settings.",
    ].join(" ");
  }

  if (input.kind === "deadline_24h") {
    return [
      `${input.campaign.title} is inside its final day before the public-goods deadline.`,
      progressLine,
      "Your pledge remains conditional: no payment is captured by MoralTrade unless threshold, review, and proof gates pass.",
    ].join(" ");
  }

  if (input.kind === "threshold_near") {
    return [
      `${input.campaign.title} is close to its public-goods threshold.`,
      progressLine,
      "Sign in to review the campaign, evidence plan, or your visibility setting; donor amounts and private reasons stay private by default.",
    ].join(" ");
  }

  return [
    `${input.campaign.title} is approaching its public-goods deadline.`,
    progressLine,
    "Sign in to review the campaign or update your conditional pledge before the deadline.",
  ].join(" ");
}

export function selectMpgfPublicGoodsReminderKind(input: {
  campaign: MpgfPublicGoodsCampaign;
  pledges: MpgfPublicGoodsPledge[];
  now?: Date;
}): MpgfPublicGoodsReminderKind | undefined {
  const now = input.now ?? new Date();
  const status = getMpgfCampaignAssuranceStatus(input.campaign, input.pledges, now);
  const remainingHours = hoursUntil(input.campaign.deadlineAt, now);

  if (status.status === "blocked" || status.status === "expired" || status.deadlinePassed) {
    return undefined;
  }

  if (status.thresholdPassed) {
    return "threshold_met_next_step";
  }

  if (remainingHours <= 24 && remainingHours > 0) {
    return "deadline_24h";
  }

  if (status.amountProgressBps >= 8_000 || status.supporterProgressBps >= 8_000) {
    return "threshold_near";
  }

  if (remainingHours <= 72 && remainingHours > 24) {
    return "deadline_72h";
  }

  return undefined;
}

export function buildMpgfPublicGoodsReminderPlans(input: {
  campaign: MpgfPublicGoodsCampaign;
  pledges: MpgfPublicGoodsPledge[];
  contacts: MpgfPublicGoodsReminderContact[];
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const kind = selectMpgfPublicGoodsReminderKind({
    campaign: input.campaign,
    pledges: input.pledges,
    now,
  });

  if (!kind) {
    return [];
  }

  const status = getMpgfCampaignAssuranceStatus(input.campaign, input.pledges, now);
  const contactsByUserRef = new Map(input.contacts.map((contact) => [contact.userRef, contact]));
  const seenUserRefs = new Set<string>();

  return input.pledges
    .filter((pledge) => pledge.campaignId === input.campaign.id)
    .filter(isActiveReminderPledge)
    .filter((pledge) => {
      if (seenUserRefs.has(pledge.userId)) {
        return false;
      }

      seenUserRefs.add(pledge.userId);
      return true;
    })
    .map((pledge): MpgfPublicGoodsReminderPlan => {
      const contact = contactsByUserRef.get(pledge.userId);
      const reminderKey = `${input.campaign.id}:${kind}`;

      return {
        reminderKey,
        kind,
        campaignId: input.campaign.id,
        campaignTitle: input.campaign.title,
        recipientProfileId: contact?.profileId,
        recipientUserRef: pledge.userId,
        recipientEmail: contact?.email?.trim() || undefined,
        analyticsUserRefHash: hashMpgfPublicGoodsAnalyticsUserRef(pledge.userId),
        subject: reminderSubjectFor(kind),
        body: reminderBodyFor({
          kind,
          campaign: input.campaign,
          amountProgressPercent: clampPercentFromBps(status.amountProgressBps),
          verifiedSupporterCount: status.verifiedSupporterCount,
          thresholdSupporters: input.campaign.thresholdSupporters,
        }),
        privacyPolicy: "aggregate_progress_no_private_amounts_or_reasons",
      };
    });
}

export function buildMpgfPublicGoodsReminderEmailRows(plans: MpgfPublicGoodsReminderPlan[]) {
  return plans
    .filter((plan) => plan.recipientEmail)
    .map((plan) => ({
      profile_id: plan.recipientProfileId ?? null,
      recipient_email: plan.recipientEmail as string,
      subject: plan.subject,
      body: plan.body,
      provider: "mpgf_public_goods_reminder_worker",
    }));
}

function mapCampaignRow(row: Record<string, unknown>): MpgfPublicGoodsCampaign {
  return {
    id: String(row.id),
    slug: String(row.slug),
    poolAlternativeId: typeof row.pool_alternative_id === "string" ? row.pool_alternative_id : undefined,
    title: String(row.title),
    destinationType:
      row.destination_type === "fiscal_host" ||
      row.destination_type === "internal_demo_pool" ||
      row.destination_type === "signed_sponsor_route"
        ? row.destination_type
        : "external_charity",
    destinationRef: String(row.destination_ref ?? ""),
    causeTags: Array.isArray(row.cause_tags) ? row.cause_tags.map(String) : [],
    publicSummary: String(row.public_summary ?? ""),
    thresholdAmountCents: Number(row.threshold_amount_cents ?? 0),
    thresholdSupporters: Number(row.threshold_supporters ?? 0),
    deadlineAt: String(row.deadline_at),
    verificationMethod: String(row.verification_method ?? ""),
    baselineRule: String(row.baseline_rule ?? ""),
    exitRule: String(row.exit_rule ?? ""),
    reviewStatus:
      row.review_status === "approved" ||
      row.review_status === "blocked" ||
      row.review_status === "challenge_window" ||
      row.review_status === "finalized" ||
      row.review_status === "needs_evidence"
        ? row.review_status
        : "submitted",
    challengeWindowEndsAt:
      typeof row.challenge_window_ends_at === "string" ? row.challenge_window_ends_at : undefined,
  };
}

function mapPledgeRow(row: Record<string, unknown>): MpgfPublicGoodsPledge {
  return {
    id: String(row.id),
    campaignId: String(row.campaign_id),
    userId: String(row.user_ref ?? row.profile_id),
    amountCents: Number(row.amount_cents ?? 0),
    visibilityMode:
      row.visibility_mode === "public_supporter" || row.visibility_mode === "public_reason"
        ? (row.visibility_mode as MpgfPublicGoodsVisibilityMode)
        : "private_amount",
    isRecurring: Boolean(row.is_recurring),
    captureMode:
      row.capture_mode === "stored_payment_method" || row.capture_mode === "signed_intent"
        ? row.capture_mode
        : "external_handoff",
    paymentIntentRef: typeof row.payment_intent_ref === "string" ? row.payment_intent_ref : undefined,
    eligibilityState:
      row.eligibility_state === "pending_review" ||
      row.eligibility_state === "duplicate_identity" ||
      row.eligibility_state === "below_minimum" ||
      row.eligibility_state === "blocked"
        ? row.eligibility_state
        : "eligible",
    humanScoreBps: Number(row.human_score_bps ?? 0),
    status:
      row.status === "captured" || row.status === "voided" || row.status === "expired" ? row.status : "pledged",
    supporterReason: typeof row.supporter_reason === "string" ? row.supporter_reason : undefined,
    createdAt: String(row.created_at),
  };
}

function planDedupeId(plan: MpgfPublicGoodsReminderPlan) {
  return `${plan.analyticsUserRefHash ?? "anonymous"}:${plan.campaignId}:${plan.kind}`;
}

function existingReminderDedupeIds(rows: Array<Record<string, unknown>>) {
  return new Set(
    rows
      .map((row) => {
        const eventJson = row.event_json as Record<string, unknown> | null;
        const reminderKey = typeof eventJson?.reminderKey === "string" ? eventJson.reminderKey : undefined;
        const reminderKind = typeof eventJson?.reminderKind === "string" ? eventJson.reminderKind : undefined;
        const campaignId = typeof row.campaign_id === "string" ? row.campaign_id : undefined;
        const userRefHash = typeof row.user_ref_hash === "string" ? row.user_ref_hash : undefined;

        return userRefHash && campaignId && reminderKind && reminderKey === `${campaignId}:${reminderKind}`
          ? `${userRefHash}:${campaignId}:${reminderKind}`
          : undefined;
      })
      .filter((value): value is string => Boolean(value)),
  );
}

export async function queueMpgfPublicGoodsReminderEmails(input: {
  now?: Date;
  dryRun?: boolean;
} = {}): Promise<QueueMpgfPublicGoodsReminderEmailsResult> {
  const now = input.now ?? new Date();
  const supabase = createServiceClient() as SupabaseServiceAny;
  const campaignResult = await supabase
    .from("mpgf_public_goods_campaigns")
    .select("id, slug, pool_alternative_id, title, destination_type, destination_ref, cause_tags, public_summary, threshold_amount_cents, threshold_supporters, deadline_at, verification_method, baseline_rule, exit_rule, review_status, challenge_window_ends_at")
    .in("review_status", ["submitted", "needs_evidence", "challenge_window", "approved", "finalized"])
    .order("deadline_at", { ascending: true })
    .limit(100);

  if (campaignResult.error) {
    throw new Error(`Could not load MPGF public-goods campaigns for reminders: ${campaignResult.error.message}`);
  }

  const campaigns = ((campaignResult.data ?? []) as Array<Record<string, unknown>>).map(mapCampaignRow);
  const campaignIds = campaigns.map((campaign) => campaign.id);

  if (campaignIds.length === 0) {
    return {
      ok: true,
      processedCampaigns: 0,
      plannedReminders: 0,
      queuedEmails: 0,
      skippedWithoutEmail: 0,
      skippedAlreadyQueued: 0,
      warnings: [],
    };
  }

  const pledgeResult = await supabase
    .from("mpgf_public_goods_pledges")
    .select("id, campaign_id, profile_id, user_ref, amount_cents, visibility_mode, is_recurring, capture_mode, payment_intent_ref, eligibility_state, human_score_bps, status, supporter_reason, created_at")
    .in("campaign_id", campaignIds)
    .eq("status", "pledged")
    .limit(1_000);

  if (pledgeResult.error) {
    throw new Error(`Could not load MPGF public-goods pledges for reminders: ${pledgeResult.error.message}`);
  }

  const pledgeRows = (pledgeResult.data ?? []) as Array<Record<string, unknown>>;
  const pledges = pledgeRows.map(mapPledgeRow);
  const profileIds = [
    ...new Set(
      pledgeRows
        .map((row) => (typeof row.profile_id === "string" ? row.profile_id : undefined))
        .filter((value): value is string => Boolean(value)),
    ),
  ];
  const profileResult = profileIds.length
    ? await supabase.from("profiles").select("id, email").in("id", profileIds)
    : { data: [] as Array<Record<string, unknown>>, error: null };

  if (profileResult.error) {
    throw new Error(`Could not load MPGF public-goods reminder contacts: ${profileResult.error.message}`);
  }

  const profilesById = new Map(
    ((profileResult.data ?? []) as Array<Record<string, unknown>>).map((profile) => [
      String(profile.id),
      typeof profile.email === "string" ? profile.email : null,
    ]),
  );
  const contacts: MpgfPublicGoodsReminderContact[] = pledgeRows.map((row) => {
    const profileId = typeof row.profile_id === "string" ? row.profile_id : undefined;

    return {
      profileId,
      userRef: String(row.user_ref ?? row.profile_id),
      email: profileId ? profilesById.get(profileId) : undefined,
    };
  });
  const plans = campaigns.flatMap((campaign) =>
    buildMpgfPublicGoodsReminderPlans({
      campaign,
      pledges,
      contacts,
      now,
    }),
  );
  const since = new Date(now.getTime() - 14 * 24 * 3_600_000).toISOString();
  const existingResult = await supabase
    .from("mpgf_public_goods_analytics_events")
    .select("campaign_id, user_ref_hash, event_json")
    .eq("event_type", "reminder_queued")
    .in("campaign_id", campaignIds)
    .gte("created_at", since)
    .limit(2_000);

  if (existingResult.error) {
    throw new Error(`Could not load MPGF public-goods reminder dedupe events: ${existingResult.error.message}`);
  }

  const existingIds = existingReminderDedupeIds((existingResult.data ?? []) as Array<Record<string, unknown>>);
  const dedupedPlans = plans.filter((plan) => !existingIds.has(planDedupeId(plan)));
  const emailRows = buildMpgfPublicGoodsReminderEmailRows(dedupedPlans);

  if (!input.dryRun && emailRows.length > 0) {
    const emailResult = await supabase.from("email_outbox").insert(emailRows);

    if (emailResult.error) {
      throw new Error(`Could not queue MPGF public-goods reminder emails: ${emailResult.error.message}`);
    }

    await Promise.all(
      emailRows.map((row) => {
        const plan = dedupedPlans.find(
          (candidate) =>
            candidate.recipientEmail === row.recipient_email &&
            candidate.subject === row.subject &&
            candidate.body === row.body,
        );

        return plan
          ? recordMpgfPublicGoodsAnalyticsEvent({
              eventType: "reminder_queued",
              userId: plan.recipientUserRef,
              campaignId: plan.campaignId,
              eventJson: {
                reminderKind: plan.kind,
                reminderKey: plan.reminderKey,
                surface: "protected_job",
              },
            })
          : Promise.resolve();
      }),
    );
  }

  return {
    ok: true,
    processedCampaigns: campaigns.length,
    plannedReminders: plans.length,
    queuedEmails: emailRows.length,
    skippedWithoutEmail: dedupedPlans.length - emailRows.length,
    skippedAlreadyQueued: plans.length - dedupedPlans.length,
    warnings: input.dryRun ? ["Dry run: no reminder emails were queued."] : [],
  };
}
