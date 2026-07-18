import { getSiteUrl } from "@/lib/supabase/config";
import { createServiceClient } from "@/lib/supabase/server";
import { formatReminderDate, offsetLabel } from "@/lib/trade-reminders";

type SupabaseServiceAny = ReturnType<typeof createServiceClient> & {
  from: (table: string) => any;
};

interface WorkerOptions {
  dryRun?: boolean;
  now?: Date;
}

interface ReminderWorkerResult {
  scannedConfiguredRules: number;
  configuredNotificationsCreated: number;
  configuredEmailsQueued: number;
  configuredQuietHoursDeferred: number;
  configuredAlreadyDelivered: number;
  configuredWithoutDeliveryChannels: number;
  legacyAgreementsScanned: number;
  legacyNotificationsCreated: number;
  legacyEmailsQueued: number;
  agreementsMarkedDue: number;
  dryRun: boolean;
  warnings: string[];
}

function dateOnly(value: Date) {
  return value.toISOString().slice(0, 10);
}

function normalizedTimestamp(value: unknown) {
  if (typeof value !== "string") return null;
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? null : new Date(timestamp).toISOString();
}

function minutesFromTime(value: unknown) {
  const match = String(value ?? "").match(/^(\d{2}):(\d{2})/);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

function localMinutes(date: Date, timezone: string) {
  try {
    const parts = new Intl.DateTimeFormat("en", {
      hour: "2-digit",
      hourCycle: "h23",
      minute: "2-digit",
      timeZone: timezone,
    }).formatToParts(date);
    const hour = Number(parts.find((part) => part.type === "hour")?.value ?? 0);
    const minute = Number(parts.find((part) => part.type === "minute")?.value ?? 0);
    return hour * 60 + minute;
  } catch {
    return date.getUTCHours() * 60 + date.getUTCMinutes();
  }
}

export function isWithinReminderQuietHours(input: {
  now: Date;
  timezone: string;
  enabled: boolean;
  start: string;
  end: string;
}) {
  if (!input.enabled) return false;
  const start = minutesFromTime(input.start);
  const end = minutesFromTime(input.end);
  if (start === null || end === null || start === end) return false;
  const current = localMinutes(input.now, input.timezone);
  return start < end ? current >= start && current < end : current >= start || current < end;
}

function reminderCopy(rule: Record<string, unknown>, timezone: string) {
  const label = String(rule.milestone_label ?? "Commitment milestone");
  const offset = Number(rule.offset_minutes ?? 0);
  const dueAt = String(rule.due_at);
  const title =
    offset < 0
      ? `${label} is approaching`
      : offset > 0
        ? `${label} may need follow-up`
        : `${label} is due`;
  const body = `${offsetLabel(offset)}. The milestone is due ${formatReminderDate(
    dueAt,
    timezone,
  )}. Open the private commitment to review its Deal Receipt and evidence rule.`;
  return { title, body };
}

async function loadEmailByProfileId(supabase: SupabaseServiceAny, userIds: string[]) {
  if (!userIds.length) return new Map<string, string>();
  const result = await supabase
    .from("profiles")
    .select("id,email")
    .in("id", [...new Set(userIds)]);
  if (result.error) {
    throw new Error(`Could not load reminder recipients: ${result.error.message}`);
  }
  return new Map<string, string>(
    (result.data ?? []).map((profile: Record<string, unknown>): [string, string] => [
      String(profile.id),
      String(profile.email ?? ""),
    ]),
  );
}

export async function processTradeReminders(
  options: WorkerOptions = {},
): Promise<ReminderWorkerResult> {
  const now = options.now ?? new Date();
  const dryRun = Boolean(options.dryRun);
  const supabase = createServiceClient() as SupabaseServiceAny;
  const warnings: string[] = [];
  const result: ReminderWorkerResult = {
    scannedConfiguredRules: 0,
    configuredNotificationsCreated: 0,
    configuredEmailsQueued: 0,
    configuredQuietHoursDeferred: 0,
    configuredAlreadyDelivered: 0,
    configuredWithoutDeliveryChannels: 0,
    legacyAgreementsScanned: 0,
    legacyNotificationsCreated: 0,
    legacyEmailsQueued: 0,
    agreementsMarkedDue: 0,
    dryRun,
    warnings,
  };

  const preferencesResult = await supabase
    .from("agreement_reminder_preferences")
    .select("*")
    .limit(5_000);
  if (preferencesResult.error) {
    throw new Error(`Could not load reminder preferences: ${preferencesResult.error.message}`);
  }

  const preferenceRows = (preferencesResult.data ?? []) as Array<Record<string, unknown>>;
  const preferenceByScope = new Map(
    preferenceRows.map((preference) => [
      `${String(preference.agreement_id)}:${String(preference.user_id)}`,
      preference,
    ]),
  );
  const configuredScopes = new Set(preferenceByScope.keys());

  const ruleWindowStart = new Date(now.getTime() - 36 * 60 * 60_000).toISOString();
  const ruleWindowEnd = now.toISOString();
  const configuredRulesResult = await supabase
    .from("agreement_reminder_rules")
    .select("*")
    .eq("enabled", true)
    .gte("remind_at", ruleWindowStart)
    .lte("remind_at", ruleWindowEnd)
    .order("remind_at", { ascending: true })
    .limit(2_000);
  if (configuredRulesResult.error) {
    throw new Error(`Could not load configured reminder rules: ${configuredRulesResult.error.message}`);
  }

  const configuredRules = (configuredRulesResult.data ?? []) as Array<Record<string, unknown>>;
  result.scannedConfiguredRules = configuredRules.length;
  const configuredAgreementIds = [
    ...new Set(configuredRules.map((rule) => String(rule.agreement_id))),
  ];
  const configuredAgreementResult = configuredAgreementIds.length
    ? await supabase
        .from("agreements")
        .select("id,lifecycle_status,status")
        .in("id", configuredAgreementIds)
    : { data: [] as Array<Record<string, unknown>>, error: null };
  if (configuredAgreementResult.error) {
    throw new Error(`Could not load configured reminder agreements: ${configuredAgreementResult.error.message}`);
  }
  const configuredAgreementById = new Map(
    ((configuredAgreementResult.data ?? []) as Array<Record<string, unknown>>).map((agreement) => [
      String(agreement.id),
      agreement,
    ]),
  );
  const configuredUserIds = [
    ...new Set(configuredRules.map((rule) => String(rule.user_id))),
  ];
  const configuredEmailByUser = await loadEmailByProfileId(supabase, configuredUserIds);

  for (const rule of configuredRules) {
    const agreementId = String(rule.agreement_id);
    const userId = String(rule.user_id);
    const scope = `${agreementId}:${userId}`;
    const preference = preferenceByScope.get(scope);
    if (!preference || Boolean(preference.paused)) continue;

    const agreement = configuredAgreementById.get(agreementId);
    const lifecycle = String(agreement?.lifecycle_status ?? agreement?.status ?? "proposed");
    if (["completed", "cancelled", "expired"].includes(lifecycle)) continue;

    const remindAt = normalizedTimestamp(rule.remind_at);
    if (!remindAt) continue;
    const lastSentRemindAt = normalizedTimestamp(rule.last_sent_remind_at);
    if (lastSentRemindAt === remindAt) {
      result.configuredAlreadyDelivered += 1;
      continue;
    }

    const timezone = String(preference.timezone ?? "UTC");
    if (
      isWithinReminderQuietHours({
        now,
        timezone,
        enabled: Boolean(preference.quiet_hours_enabled),
        start: String(preference.quiet_hours_start ?? "22:00"),
        end: String(preference.quiet_hours_end ?? "07:00"),
      })
    ) {
      result.configuredQuietHoursDeferred += 1;
      continue;
    }

    const inAppEnabled = Boolean(preference.in_app_enabled) && Boolean(rule.in_app_enabled);
    const emailEnabled = Boolean(preference.email_enabled) && Boolean(rule.email_enabled);
    const copy = reminderCopy(rule, timezone);
    const href = `/trade-agreements/${agreementId}/reminders?view=timeline`;
    const dedupeBase = `configured_reminder:${String(rule.id)}:${remindAt}`;
    let deliveryFailed = false;

    if (inAppEnabled && !dryRun) {
      const notification = await supabase
        .from("trade_notifications")
        .upsert(
          {
            user_id: userId,
            notification_type: "configured_commitment_reminder",
            title: copy.title,
            body: copy.body,
            href,
            dedupe_key: `${dedupeBase}:in_app`,
          },
          { onConflict: "dedupe_key", ignoreDuplicates: true },
        )
        .select("id");
      if (notification.error) {
        deliveryFailed = true;
        warnings.push(`In-app reminder ${String(rule.id)} failed: ${notification.error.message}`);
      } else if ((notification.data ?? []).length) {
        result.configuredNotificationsCreated += 1;
      }
    }

    if (emailEnabled && !dryRun) {
      const recipientEmail = configuredEmailByUser.get(userId)?.trim() ?? "";
      if (recipientEmail) {
        const absoluteUrl = new URL(href, getSiteUrl()).toString();
        const queued = await supabase.from("email_outbox").upsert(
          {
            profile_id: userId,
            recipient_email: recipientEmail,
            subject: `Moral Trade: ${copy.title}`.slice(0, 160),
            body: `A private Moral Trade reminder is ready. Sign in at ${absoluteUrl}. This email does not include participant names, private terms, payment information, or evidence.`,
            status: "queued",
            provider: "configured_trade_reminder",
            dedupe_key: `${dedupeBase}:email`,
          },
          { onConflict: "dedupe_key", ignoreDuplicates: true },
        ).select("id");
        if (queued.error) {
          deliveryFailed = true;
          warnings.push(`Email reminder ${String(rule.id)} failed: ${queued.error.message}`);
        } else if ((queued.data ?? []).length) {
          result.configuredEmailsQueued += 1;
        }
      }
    }

    if (!inAppEnabled && !emailEnabled) {
      result.configuredWithoutDeliveryChannels += 1;
    }

    if (!dryRun && !deliveryFailed) {
      const update = await supabase
        .from("agreement_reminder_rules")
        .update({
          last_sent_at: now.toISOString(),
          last_sent_remind_at: remindAt,
          updated_at: now.toISOString(),
        })
        .eq("id", rule.id)
        .eq("user_id", userId);
      if (update.error) {
        warnings.push(`Could not mark reminder ${String(rule.id)} delivered: ${update.error.message}`);
      }
    }
  }

  const today = dateOnly(now);
  const threeDaysFromNow = new Date(now);
  threeDaysFromNow.setUTCDate(threeDaysFromNow.getUTCDate() + 3);
  const dueThrough = dateOnly(threeDaysFromNow);
  const legacyAgreementResult = await supabase
    .from("agreements")
    .select("id,proposer_id,responder_id,evidence_due_at,lifecycle_status")
    .in("lifecycle_status", ["active", "evidence_due"])
    .not("evidence_due_at", "is", null)
    .lte("evidence_due_at", dueThrough)
    .order("evidence_due_at", { ascending: true })
    .limit(200);
  if (legacyAgreementResult.error) {
    throw new Error(`Could not load legacy trade reminders: ${legacyAgreementResult.error.message}`);
  }

  const legacyAgreements = (legacyAgreementResult.data ?? []) as Array<Record<string, unknown>>;
  result.legacyAgreementsScanned = legacyAgreements.length;
  const legacyUserIds = [
    ...new Set(
      legacyAgreements.flatMap((agreement) => [
        String(agreement.proposer_id),
        String(agreement.responder_id),
      ]),
    ),
  ];
  const legacyEmailByUser = await loadEmailByProfileId(supabase, legacyUserIds);

  for (const agreement of legacyAgreements) {
    const agreementId = String(agreement.id);
    const dueDate = String(agreement.evidence_due_at);
    const isOverdue = dueDate < today;
    const href = `/trade-agreements/${agreementId}`;
    const absoluteUrl = new URL(href, getSiteUrl()).toString();

    if (isOverdue && agreement.lifecycle_status === "active" && !dryRun) {
      const update = await supabase
        .from("agreements")
        .update({ lifecycle_status: "evidence_due", updated_at: now.toISOString() })
        .eq("id", agreementId)
        .eq("lifecycle_status", "active");
      if (!update.error) result.agreementsMarkedDue += 1;
    }

    for (const userId of [String(agreement.proposer_id), String(agreement.responder_id)]) {
      if (configuredScopes.has(`${agreementId}:${userId}`)) continue;
      if (dryRun) continue;
      const dedupeKey = `evidence_due:${agreementId}:${userId}:${dueDate}`;
      const notification = await supabase
        .from("trade_notifications")
        .insert({
          user_id: userId,
          notification_type: isOverdue ? "evidence_overdue" : "evidence_due_soon",
          title: isOverdue ? "Evidence is overdue" : "Evidence is due soon",
          body: isOverdue
            ? "The agreement evidence due date has passed. Submit evidence, amend the terms, or use the published exit rule."
            : `Evidence is due on ${dueDate}. Review the evidence rule and submit a file, link, or attestation.`,
          href,
          dedupe_key: dedupeKey,
        })
        .select("id")
        .maybeSingle();

      if (notification.error || !notification.data?.id) continue;
      result.legacyNotificationsCreated += 1;
      const recipientEmail = legacyEmailByUser.get(userId)?.trim() ?? "";
      if (!recipientEmail) continue;
      const queued = await supabase.from("email_outbox").insert({
        profile_id: userId,
        recipient_email: recipientEmail,
        subject: isOverdue
          ? "Moral Trade: evidence is overdue"
          : "Moral Trade: evidence is due soon",
        body: `A private agreement action needs review. Sign in at ${absoluteUrl}. This email does not include participant names, private terms, payment information, or evidence.`,
        status: "queued",
        provider: "core_trade_reminder",
      });
      if (!queued.error) result.legacyEmailsQueued += 1;
    }
  }

  if (dryRun) warnings.push("Dry run: no notifications, emails, lifecycle updates, or delivery markers were written.");
  return result;
}
