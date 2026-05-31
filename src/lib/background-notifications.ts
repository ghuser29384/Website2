import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";

import {
  BACKGROUND_DISCOVERY_NOTIFICATION_EVENTS,
  shouldSendBackgroundNotificationImmediately,
} from "@/lib/background-notification-policy";
import { getBackgroundNotificationEventKindForWishNotification } from "@/lib/background-privacy-controls";
import { getSiteUrl } from "@/lib/supabase/config";
import type { Database } from "@/lib/supabase/database.types";

type SupabaseDatabaseClient = SupabaseClient<Database>;
type WishNotificationInsert = Database["public"]["Tables"]["wish_notifications"]["Insert"];
type WishNotificationRow = Database["public"]["Tables"]["wish_notifications"]["Row"];
type EmailOutboxInsert = Database["public"]["Tables"]["email_outbox"]["Insert"];

type NotificationEmailSource = Pick<
  WishNotificationRow,
  "body" | "created_at" | "id" | "kind" | "match_id" | "profile_id" | "title"
>;

export interface SafeNotificationEmailCopy {
  body: string;
  subject: string;
}

export interface InsertWishNotificationsResult {
  emailError: PostgrestError | Error | null;
  emailsQueued: number;
  inserted: WishNotificationRow[];
  notificationError: PostgrestError | null;
}

const SAFE_EMAIL_SUBJECTS: Record<WishNotificationRow["kind"], string> = {
  consent: "Moral Trade: consent update",
  match: "Moral Trade: possible counterparty update",
  safety: "Moral Trade: review update",
  system: "Moral Trade: background networking update",
};

export function buildSafeWishNotificationEmailCopy(
  notification: Pick<NotificationEmailSource, "kind">,
  siteUrl = getSiteUrl(),
): SafeNotificationEmailCopy {
  const dashboardUrl = `${siteUrl.replace(/\/$/, "")}/dashboard`;
  const subject = SAFE_EMAIL_SUBJECTS[notification.kind];
  const body = [
    "A background networking update is waiting in your Moral Trade dashboard.",
    "",
    "For privacy, this email leaves out exact wishes, private asks, contact details, source notes, and sensitive constraints.",
    "",
    `Review it here: ${dashboardUrl}`,
  ].join("\n");

  return { body, subject };
}

export async function queueSafeWishNotificationEmails({
  notifications,
  siteUrl = getSiteUrl(),
  supabase,
}: {
  notifications: NotificationEmailSource[];
  siteUrl?: string;
  supabase: SupabaseDatabaseClient;
}): Promise<{ emailError: PostgrestError | Error | null; emailsQueued: number }> {
  if (!notifications.length) {
    return { emailError: null, emailsQueued: 0 };
  }

  const profileIds = [...new Set(notifications.map((notification) => notification.profile_id))];
  const [{ data: profilePrefs, error: prefsError }, { data: profiles, error: profilesError }] =
    await Promise.all([
      supabase
        .from("wish_profiles")
        .select("profile_id, notification_email_enabled")
        .in("profile_id", profileIds),
      supabase.from("profiles").select("id, email").in("id", profileIds),
    ]);

  if (prefsError || profilesError) {
    return {
      emailError: prefsError ?? profilesError ?? new Error("Unable to load notification preferences."),
      emailsQueued: 0,
    };
  }

  const emailByProfileId = new Map((profiles ?? []).map((profile) => [profile.id, profile.email]));
  const emailEnabledProfileIds = new Set(
    (profilePrefs ?? [])
      .filter((profile) => profile.notification_email_enabled)
      .map((profile) => profile.profile_id),
  );
  const { data: channelPrefs, error: channelPrefsError } = await supabase
    .from("background_notification_preferences")
    .select(
      "id, profile_id, event_kind, channel, enabled, digest_cadence, quiet_until, quiet_hours_start, quiet_hours_end, daily_cap, source_cooldown_hours, last_discovery_sent_at",
    )
    .in("profile_id", profileIds)
    .eq("channel", "email_digest");

  if (channelPrefsError) {
    return {
      emailError: channelPrefsError,
      emailsQueued: 0,
    };
  }

  const emailPreferenceByKey = new Map(
    (channelPrefs ?? []).map((preference) => [
      `${preference.profile_id}:${preference.event_kind}`,
      preference,
    ]),
  );
  const now = new Date();
  const emailCandidates = notifications
    .flatMap((notification) => {
      const eventKind = getBackgroundNotificationEventKindForWishNotification(notification.kind);
      const preference = emailPreferenceByKey.get(`${notification.profile_id}:${eventKind}`);
      const discoveryPreferenceId =
        preference && BACKGROUND_DISCOVERY_NOTIFICATION_EVENTS.has(eventKind)
          ? preference.id
          : null;
      const recipientEmail = emailByProfileId.get(notification.profile_id) ?? "";
      const copy = buildSafeWishNotificationEmailCopy(notification, siteUrl);

      if (preference) {
        const sendNow = shouldSendBackgroundNotificationImmediately({
          channel: "email_digest",
          dailyCap: preference.daily_cap,
          digestCadence: preference.digest_cadence,
          enabled: preference.enabled,
          eventKind,
          lastSourceNotificationAt: preference.last_discovery_sent_at,
          now,
          quietHoursEnd: preference.quiet_hours_end,
          quietHoursStart: preference.quiet_hours_start,
          quietUntil: preference.quiet_until,
          sourceCooldownHours: preference.source_cooldown_hours,
        });

        return sendNow && recipientEmail
          ? [{
              discoveryPreferenceId,
              row: {
                body: copy.body,
                profile_id: notification.profile_id,
                provider: "background-networking",
                recipient_email: recipientEmail,
                subject: copy.subject,
              },
            }]
          : [];
      }

      const sendNow =
        emailEnabledProfileIds.has(notification.profile_id) &&
        shouldSendBackgroundNotificationImmediately({
          channel: "email_digest",
          digestCadence: eventKind === "match_suggestions" ? "daily" : "immediate",
          enabled: true,
          eventKind,
          now,
          quietHoursEnd: 8,
          quietHoursStart: 22,
          sourceCooldownHours: eventKind === "match_suggestions" ? 24 : null,
        });

      return sendNow && recipientEmail
        ? [{
            discoveryPreferenceId: null,
            row: {
              body: copy.body,
              profile_id: notification.profile_id,
              provider: "background-networking",
              recipient_email: recipientEmail,
              subject: copy.subject,
            },
          }]
        : [];
    });
  const emailRows: EmailOutboxInsert[] = emailCandidates.map((candidate) => candidate.row);

  if (!emailRows.length) {
    return { emailError: null, emailsQueued: 0 };
  }

  const { error } = await supabase.from("email_outbox").insert(emailRows);

  if (!error) {
    const discoveryPreferenceIds = [
      ...new Set(
        emailCandidates
          .map((candidate) => candidate.discoveryPreferenceId)
          .filter((id): id is string => Boolean(id)),
      ),
    ];

    if (discoveryPreferenceIds.length) {
      const { error: cooldownError } = await supabase
        .from("background_notification_preferences")
        .update({ last_discovery_sent_at: now.toISOString() })
        .in("id", discoveryPreferenceIds);

      if (cooldownError) {
        return {
          emailError: cooldownError,
          emailsQueued: 0,
        };
      }
    }
  }

  return {
    emailError: error,
    emailsQueued: error ? 0 : emailRows.length,
  };
}

export async function insertWishNotificationsWithSafeEmail({
  emailSupabase,
  notifications,
  siteUrl,
  supabase,
}: {
  emailSupabase?: SupabaseDatabaseClient;
  notifications: WishNotificationInsert | WishNotificationInsert[];
  siteUrl?: string;
  supabase: SupabaseDatabaseClient;
}): Promise<InsertWishNotificationsResult> {
  const notificationRows = Array.isArray(notifications) ? notifications : [notifications];

  if (!notificationRows.length) {
    return {
      emailError: null,
      emailsQueued: 0,
      inserted: [],
      notificationError: null,
    };
  }

  const { data, error } = await supabase
    .from("wish_notifications")
    .insert(notificationRows)
    .select("*");

  if (error) {
    return {
      emailError: null,
      emailsQueued: 0,
      inserted: [],
      notificationError: error,
    };
  }

  const inserted = (data ?? []) as WishNotificationRow[];
  const emailResult = await queueSafeWishNotificationEmails({
    notifications: inserted,
    siteUrl,
    supabase: emailSupabase ?? supabase,
  });

  return {
    inserted,
    notificationError: null,
    ...emailResult,
  };
}
