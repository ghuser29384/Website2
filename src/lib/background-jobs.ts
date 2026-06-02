import type { SupabaseClient } from "@supabase/supabase-js";

import { getSiteUrl } from "@/lib/supabase/config";
import type { Database } from "@/lib/supabase/database.types";

type SupabaseDatabaseClient = SupabaseClient<Database>;
type BackgroundNotificationPreferenceRow =
  Database["public"]["Tables"]["background_notification_preferences"]["Row"];
type BackgroundOpportunityBriefRow =
  Database["public"]["Tables"]["background_opportunity_briefs"]["Row"];
type EmailOutboxInsert = Database["public"]["Tables"]["email_outbox"]["Insert"];

export const BACKGROUND_NETWORKING_JOB_VERSION = "background-networking-jobs-v1";
export const BACKGROUND_OPPORTUNITY_DIGEST_SOURCE_KIND = "background_opportunity_digest";

export interface BackgroundNetworkingMaintenanceResult {
  digestEmailsQueued: number;
  expiredGrantReceipts: number;
  expiredOpportunityBriefs: number;
  expiredProfileSignals: number;
  expiredSourceConnections: number;
  expiredSourceSummaries: number;
  privacySafe: true;
  version: typeof BACKGROUND_NETWORKING_JOB_VERSION;
}

export interface BackgroundOpportunityDigestCandidate {
  briefIds: string[];
  email: string;
  preference?: Pick<
    BackgroundNotificationPreferenceRow,
    "digest_cadence" | "enabled" | "last_digest_at"
  > | null;
  profileId: string;
}

function countValue(value: number | null) {
  return typeof value === "number" ? value : 0;
}

function startOfUtcDay(value: Date) {
  return Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate());
}

export function isBackgroundOpportunityDigestDue({
  now = new Date(),
  preference,
}: {
  now?: Date;
  preference?: Pick<
    BackgroundNotificationPreferenceRow,
    "digest_cadence" | "enabled" | "last_digest_at"
  > | null;
}) {
  if (!preference?.enabled || preference.digest_cadence === "none") {
    return false;
  }

  if (preference.digest_cadence === "immediate") {
    return true;
  }

  if (!preference.last_digest_at) {
    return true;
  }

  const lastDigestAt = new Date(preference.last_digest_at);

  if (!Number.isFinite(lastDigestAt.getTime())) {
    return true;
  }

  const elapsedMs = now.getTime() - lastDigestAt.getTime();
  const dayMs = 24 * 60 * 60 * 1000;

  return preference.digest_cadence === "weekly"
    ? elapsedMs >= 7 * dayMs
    : elapsedMs >= dayMs;
}

export function buildBackgroundOpportunityDigestEmailCopy({
  briefCount,
  siteUrl = getSiteUrl(),
}: {
  briefCount: number;
  siteUrl?: string;
}) {
  const dashboardUrl = `${siteUrl.replace(/\/$/, "")}/dashboard`;

  return {
    body: [
      `You have ${briefCount} background networking opportunity ${briefCount === 1 ? "brief" : "briefs"} waiting in your Moral Trade dashboard.`,
      "",
      "For privacy, this digest leaves out exact wishes, private asks, contact details, source notes, and sensitive constraints.",
      "",
      `Review them here: ${dashboardUrl}`,
    ].join("\n"),
    subject: "Moral Trade: background networking digest",
  };
}

export function buildBackgroundOpportunityDigestRows({
  candidates,
  now = new Date(),
  siteUrl = getSiteUrl(),
}: {
  candidates: BackgroundOpportunityDigestCandidate[];
  now?: Date;
  siteUrl?: string;
}) {
  const digestDay = new Date(startOfUtcDay(now)).toISOString().slice(0, 10);

  return candidates
    .filter((candidate) => candidate.email)
    .filter((candidate) => candidate.briefIds.length > 0)
    .filter((candidate) =>
      isBackgroundOpportunityDigestDue({
        now,
        preference: candidate.preference,
      }),
    )
    .map((candidate) => {
      const copy = buildBackgroundOpportunityDigestEmailCopy({
        briefCount: candidate.briefIds.length,
        siteUrl,
      });

      return {
        body: copy.body,
        profile_id: candidate.profileId,
        provider: "background-networking-digest",
        recipient_email: candidate.email,
        source_id: `${candidate.profileId}:${digestDay}`,
        source_kind: BACKGROUND_OPPORTUNITY_DIGEST_SOURCE_KIND,
        subject: copy.subject,
      } satisfies EmailOutboxInsert;
    });
}

export async function expireBackgroundNetworkingSourceInfluence({
  now = new Date(),
  supabase,
}: {
  now?: Date;
  supabase: SupabaseDatabaseClient;
}) {
  const nowIso = now.toISOString();
  const [
    expiredConnections,
    expiredSummaries,
    expiredSignals,
    expiredReceipts,
    expiredBriefs,
  ] = await Promise.all([
    supabase
      .from("source_connections")
      .update(
        {
          access_status: "expired",
          ai_shadow_mode_allowed: false,
          allowed_field_keys: [],
          raw_ingestion_allowed: false,
          sync_frequency: "manual",
          updated_at: nowIso,
        },
        { count: "exact" },
      )
      .in("access_status", ["connected", "needs_review"])
      .not("retention_expires_at", "is", null)
      .lte("retention_expires_at", nowIso),
    supabase
      .from("background_source_summaries")
      .update({ status: "expired", updated_at: nowIso }, { count: "exact" })
      .in("status", ["active", "reviewed", "draft"])
      .lte("retention_expires_at", nowIso),
    supabase
      .from("background_profile_signals")
      .update({ status: "expired", updated_at: nowIso }, { count: "exact" })
      .in("status", ["active", "stale"])
      .not("expires_at", "is", null)
      .lte("expires_at", nowIso),
    supabase
      .from("background_grant_receipts")
      .update({ status: "expired" }, { count: "exact" })
      .eq("status", "active")
      .not("expires_at", "is", null)
      .lte("expires_at", nowIso),
    supabase
      .from("background_opportunity_briefs")
      .update(
        {
          delivery_state: "expired",
          status: "expired",
          updated_at: nowIso,
        },
        { count: "exact" },
      )
      .in("status", ["open", "opened", "packet_requested"])
      .lte("expires_at", nowIso),
  ]);

  return {
    expiredGrantReceipts: countValue(expiredReceipts.count),
    expiredOpportunityBriefs: countValue(expiredBriefs.count),
    expiredProfileSignals: countValue(expiredSignals.count),
    expiredSourceConnections: countValue(expiredConnections.count),
    expiredSourceSummaries: countValue(expiredSummaries.count),
  };
}

export async function queueBackgroundOpportunityDigestEmails({
  now = new Date(),
  siteUrl = getSiteUrl(),
  supabase,
}: {
  now?: Date;
  siteUrl?: string;
  supabase: SupabaseDatabaseClient;
}) {
  const { data: briefs, error: briefError } = await supabase
    .from("background_opportunity_briefs")
    .select("id, profile_id")
    .in("delivery_state", ["pending", "delivered"])
    .in("status", ["open", "opened"])
    .order("created_at", { ascending: false })
    .limit(500);

  if (briefError || !briefs?.length) {
    return 0;
  }

  const briefRows = briefs as Pick<BackgroundOpportunityBriefRow, "id" | "profile_id">[];
  const profileIds = [...new Set(briefRows.map((brief) => brief.profile_id))];
  const [{ data: profiles }, { data: wishProfiles }, { data: preferences }] = await Promise.all([
    supabase.from("profiles").select("id, email").in("id", profileIds),
    supabase
      .from("wish_profiles")
      .select("profile_id, notification_email_enabled")
      .in("profile_id", profileIds),
    supabase
      .from("background_notification_preferences")
      .select("profile_id, event_kind, channel, enabled, digest_cadence, last_digest_at")
      .in("profile_id", profileIds)
      .eq("event_kind", "match_suggestions")
      .eq("channel", "email_digest"),
  ]);
  const emailByProfileId = new Map((profiles ?? []).map((profile) => [profile.id, profile.email]));
  const emailEnabledProfileIds = new Set(
    (wishProfiles ?? [])
      .filter((profile) => profile.notification_email_enabled)
      .map((profile) => profile.profile_id),
  );
  const preferenceByProfileId = new Map(
    ((preferences ?? []) as BackgroundNotificationPreferenceRow[]).map((preference) => [
      preference.profile_id,
      preference,
    ]),
  );
  const briefIdsByProfileId = new Map<string, string[]>();

  for (const brief of briefRows) {
    briefIdsByProfileId.set(brief.profile_id, [
      ...(briefIdsByProfileId.get(brief.profile_id) ?? []),
      brief.id,
    ]);
  }

  const candidates = [...briefIdsByProfileId.entries()]
    .filter(([profileId]) => emailEnabledProfileIds.has(profileId))
    .map(([profileId, briefIds]) => ({
      briefIds,
      email: emailByProfileId.get(profileId) ?? "",
      preference: preferenceByProfileId.get(profileId),
      profileId,
    }));
  const rows = buildBackgroundOpportunityDigestRows({ candidates, now, siteUrl });

  if (!rows.length) {
    return 0;
  }

  const { data: queuedRows, error: queueError } = await supabase
    .from("email_outbox")
    .upsert(rows, {
      ignoreDuplicates: true,
      onConflict: "source_kind,source_id",
    })
    .select("id, profile_id");

  if (queueError || !queuedRows?.length) {
    return 0;
  }

  const queuedProfileIds = [
    ...new Set(queuedRows.map((row) => row.profile_id).filter((id): id is string => Boolean(id))),
  ];
  const deliveredBriefIds = candidates
    .filter((candidate) => queuedProfileIds.includes(candidate.profileId))
    .flatMap((candidate) => candidate.briefIds);

  await Promise.all([
    deliveredBriefIds.length
      ? supabase
          .from("background_opportunity_briefs")
          .update({ delivery_state: "delivered", updated_at: now.toISOString() })
          .in("id", deliveredBriefIds)
      : Promise.resolve(),
    queuedProfileIds.length
      ? supabase
          .from("background_notification_preferences")
          .update({ last_digest_at: now.toISOString() })
          .in("profile_id", queuedProfileIds)
          .eq("event_kind", "match_suggestions")
          .eq("channel", "email_digest")
      : Promise.resolve(),
  ]);

  return queuedRows.length;
}

export async function runBackgroundNetworkingMaintenanceJob({
  now = new Date(),
  siteUrl,
  supabase,
}: {
  now?: Date;
  siteUrl?: string;
  supabase: SupabaseDatabaseClient;
}): Promise<BackgroundNetworkingMaintenanceResult> {
  const expiry = await expireBackgroundNetworkingSourceInfluence({ now, supabase });
  const digestEmailsQueued = await queueBackgroundOpportunityDigestEmails({
    now,
    siteUrl,
    supabase,
  });

  return {
    ...expiry,
    digestEmailsQueued,
    privacySafe: true,
    version: BACKGROUND_NETWORKING_JOB_VERSION,
  };
}
