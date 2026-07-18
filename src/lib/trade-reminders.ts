import { getSiteUrl } from "@/lib/supabase/config";
import { createServiceClient } from "@/lib/supabase/server";
import type { CoreAgreementDetail } from "@/lib/core-trade";

type SupabaseServiceAny = ReturnType<typeof createServiceClient> & {
  from: (table: string) => any;
  rpc: (fn: string, args?: Record<string, unknown>) => any;
};

export const REMINDER_OFFSET_OPTIONS = [
  { label: "3 days before", minutes: -4_320 },
  { label: "1 day before", minutes: -1_440 },
  { label: "3 hours before", minutes: -180 },
  { label: "1 hour before", minutes: -60 },
  { label: "At due time", minutes: 0 },
  { label: "1 hour after", minutes: 60 },
] as const;

export interface ReminderMilestone {
  key: string;
  label: string;
  dueAt: string;
  source: "agreement" | "custom";
}

export interface ReminderRule {
  id: string;
  agreementId: string;
  source: "agreement" | "custom";
  milestoneKey: string;
  milestoneLabel: string;
  dueAt: string;
  offsetMinutes: number;
  remindAt: string;
  enabled: boolean;
  inAppEnabled: boolean;
  emailEnabled: boolean;
  calendarEnabled: boolean;
}

export interface ReminderPreferences {
  timezone: string;
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  inAppEnabled: boolean;
  emailEnabled: boolean;
  paused: boolean;
}

export interface ReminderCalendarFeed {
  enabled: boolean;
  feedToken: string;
  includeCommitmentTitle: boolean;
}

export interface ReminderConfiguration {
  hasSavedPreferences: boolean;
  preferences: ReminderPreferences;
  rules: ReminderRule[];
  calendarFeed: ReminderCalendarFeed | null;
}

export interface SaveReminderRuleInput {
  source: "agreement" | "custom";
  milestoneKey: string;
  milestoneLabel: string;
  dueAt: string;
  offsetMinutes: number;
  enabled: boolean;
  inAppEnabled: boolean;
  emailEnabled: boolean;
  calendarEnabled: boolean;
}

export interface SaveReminderConfigurationInput {
  agreementId: string;
  preferences: ReminderPreferences;
  rules: SaveReminderRuleInput[];
}

const DEFAULT_PREFERENCES: ReminderPreferences = {
  timezone: "UTC",
  quietHoursEnabled: true,
  quietHoursStart: "22:00",
  quietHoursEnd: "07:00",
  inAppEnabled: true,
  emailEnabled: false,
  paused: false,
};

function parseTimestamp(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return null;
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? null : new Date(timestamp).toISOString();
}

function dateOnlyAtUtc(value: unknown, hour: number, minute: number) {
  if (typeof value !== "string" || !value.trim()) return null;
  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? `${value}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00.000Z`
    : value;
  return parseTimestamp(normalized);
}

function addMilestone(
  milestones: Map<string, ReminderMilestone>,
  milestone: ReminderMilestone | null,
) {
  if (!milestone) return;
  milestones.set(milestone.key, milestone);
}

export function deriveAgreementReminderMilestones(
  detail: CoreAgreementDetail,
): ReminderMilestone[] {
  const milestones = new Map<string, ReminderMilestone>();
  const { agreement, version } = detail;
  const lifecycleStatus = String(agreement.lifecycle_status ?? agreement.status ?? "proposed");

  if (!["completed", "cancelled", "expired"].includes(lifecycleStatus)) {
    const startAt = dateOnlyAtUtc(version?.start_date, 9, 0);
    addMilestone(
      milestones,
      startAt
        ? {
            key: "agreement_start",
            label: "Commitment starts",
            dueAt: startAt,
            source: "agreement",
          }
        : null,
    );

    const evidenceDueAt = dateOnlyAtUtc(
      version?.evidence_due_date ?? agreement.evidence_due_at,
      23,
      59,
    );
    addMilestone(
      milestones,
      evidenceDueAt
        ? {
            key: "verification_due",
            label: "Verification due",
            dueAt: evidenceDueAt,
            source: "agreement",
          }
        : null,
    );
  }

  for (const evidence of detail.evidence) {
    const challengeEndsAt = parseTimestamp(evidence.challenge_window_ends_at);
    if (!challengeEndsAt || ["accepted", "rejected"].includes(String(evidence.status))) {
      continue;
    }

    addMilestone(milestones, {
      key: `challenge_window:${String(evidence.id)}`,
      label: "Evidence challenge window closes",
      dueAt: challengeEndsAt,
      source: "agreement",
    });
  }

  return [...milestones.values()].sort(
    (left, right) => Date.parse(left.dueAt) - Date.parse(right.dueAt),
  );
}

function defaultOffsetsForMilestone(key: string) {
  if (key === "agreement_start") return [-1_440, -60];
  if (key.startsWith("challenge_window:")) return [-1_440, -60];
  return [-1_440, -180, 0];
}

export function buildDefaultReminderRules(
  agreementId: string,
  milestones: ReminderMilestone[],
): ReminderRule[] {
  return milestones.flatMap((milestone) =>
    defaultOffsetsForMilestone(milestone.key).map((offsetMinutes) => ({
      id: `default:${milestone.key}:${offsetMinutes}`,
      agreementId,
      source: milestone.source,
      milestoneKey: milestone.key,
      milestoneLabel: milestone.label,
      dueAt: milestone.dueAt,
      offsetMinutes,
      remindAt: new Date(Date.parse(milestone.dueAt) + offsetMinutes * 60_000).toISOString(),
      enabled: true,
      inAppEnabled: true,
      emailEnabled: false,
      calendarEnabled: true,
    })),
  );
}

function mapPreferenceRow(row: Record<string, unknown> | null): ReminderPreferences {
  if (!row) return { ...DEFAULT_PREFERENCES };
  return {
    timezone: String(row.timezone ?? "UTC"),
    quietHoursEnabled: Boolean(row.quiet_hours_enabled),
    quietHoursStart: String(row.quiet_hours_start ?? "22:00").slice(0, 5),
    quietHoursEnd: String(row.quiet_hours_end ?? "07:00").slice(0, 5),
    inAppEnabled: Boolean(row.in_app_enabled),
    emailEnabled: Boolean(row.email_enabled),
    paused: Boolean(row.paused),
  };
}

function mapRuleRow(row: Record<string, unknown>): ReminderRule {
  const dueAt = String(row.due_at);
  const offsetMinutes = Number(row.offset_minutes ?? 0);
  const remindAt = row.remind_at
    ? String(row.remind_at)
    : new Date(Date.parse(dueAt) + offsetMinutes * 60_000).toISOString();

  return {
    id: String(row.id),
    agreementId: String(row.agreement_id),
    source: row.source === "custom" ? "custom" : "agreement",
    milestoneKey: String(row.milestone_key),
    milestoneLabel: String(row.milestone_label),
    dueAt,
    offsetMinutes,
    remindAt,
    enabled: Boolean(row.enabled),
    inAppEnabled: Boolean(row.in_app_enabled),
    emailEnabled: Boolean(row.email_enabled),
    calendarEnabled: Boolean(row.calendar_enabled),
  };
}

function mapFeedRow(row: Record<string, unknown> | null): ReminderCalendarFeed | null {
  if (!row) return null;
  return {
    enabled: Boolean(row.enabled),
    feedToken: String(row.feed_token),
    includeCommitmentTitle: Boolean(row.include_commitment_title),
  };
}

export async function loadTradeReminderConfiguration(
  agreementId: string,
  userId: string,
): Promise<ReminderConfiguration> {
  const supabase = createServiceClient() as SupabaseServiceAny;
  const [preferencesResult, rulesResult, feedResult] = await Promise.all([
    supabase
      .from("agreement_reminder_preferences")
      .select("*")
      .eq("agreement_id", agreementId)
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("agreement_reminder_rules")
      .select("*")
      .eq("agreement_id", agreementId)
      .eq("user_id", userId)
      .order("due_at", { ascending: true })
      .order("offset_minutes", { ascending: true }),
    supabase
      .from("reminder_calendar_feeds")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle(),
  ]);

  if (preferencesResult.error) {
    throw new Error(`Could not load reminder preferences: ${preferencesResult.error.message}`);
  }
  if (rulesResult.error) {
    throw new Error(`Could not load reminder rules: ${rulesResult.error.message}`);
  }
  if (feedResult.error) {
    throw new Error(`Could not load calendar integration: ${feedResult.error.message}`);
  }

  return {
    hasSavedPreferences: Boolean(preferencesResult.data),
    preferences: mapPreferenceRow(preferencesResult.data),
    rules: ((rulesResult.data ?? []) as Array<Record<string, unknown>>).map(mapRuleRow),
    calendarFeed: mapFeedRow(feedResult.data),
  };
}

export function reconcileReminderRules(
  configuration: ReminderConfiguration,
  agreementId: string,
  milestones: ReminderMilestone[],
) {
  if (!configuration.hasSavedPreferences) {
    return buildDefaultReminderRules(agreementId, milestones);
  }

  const milestoneByKey = new Map(milestones.map((milestone) => [milestone.key, milestone]));
  return configuration.rules
    .flatMap((rule) => {
      if (rule.source === "custom") return [rule];
      const milestone = milestoneByKey.get(rule.milestoneKey);
      if (!milestone) return [];
      return [
        {
          ...rule,
          milestoneLabel: milestone.label,
          dueAt: milestone.dueAt,
          remindAt: new Date(
            Date.parse(milestone.dueAt) + rule.offsetMinutes * 60_000,
          ).toISOString(),
        },
      ];
    })
    .sort((left, right) => Date.parse(left.remindAt) - Date.parse(right.remindAt));
}

export function offsetLabel(offsetMinutes: number) {
  const match = REMINDER_OFFSET_OPTIONS.find((option) => option.minutes === offsetMinutes);
  if (match) return match.label;
  if (offsetMinutes === 0) return "At due time";

  const absolute = Math.abs(offsetMinutes);
  const direction = offsetMinutes < 0 ? "before" : "after";
  if (absolute % 1_440 === 0) {
    const days = absolute / 1_440;
    return `${days} day${days === 1 ? "" : "s"} ${direction}`;
  }
  if (absolute % 60 === 0) {
    const hours = absolute / 60;
    return `${hours} hour${hours === 1 ? "" : "s"} ${direction}`;
  }
  return `${absolute} minute${absolute === 1 ? "" : "s"} ${direction}`;
}

export function formatReminderDate(value: string, timezone = "UTC") {
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return "Date unavailable";
  try {
    return new Intl.DateTimeFormat("en", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: timezone,
    }).format(timestamp);
  } catch {
    return new Intl.DateTimeFormat("en", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "UTC",
    }).format(timestamp);
  }
}

function escapeIcsText(value: string) {
  return value
    .replaceAll("\\", "\\\\")
    .replaceAll("\r\n", "\\n")
    .replaceAll("\n", "\\n")
    .replaceAll(",", "\\,")
    .replaceAll(";", "\\;");
}

function foldIcsLine(line: string) {
  const segments: string[] = [];
  let remaining = line;
  while (Buffer.byteLength(remaining, "utf8") > 73) {
    let end = Math.min(73, remaining.length);
    while (end > 1 && Buffer.byteLength(remaining.slice(0, end), "utf8") > 73) {
      end -= 1;
    }
    segments.push(remaining.slice(0, end));
    remaining = remaining.slice(end);
  }
  segments.push(remaining);
  return segments.join("\r\n ");
}

function toIcsDate(value: string) {
  const date = new Date(value);
  return date
    .toISOString()
    .replaceAll("-", "")
    .replaceAll(":", "")
    .replace(/\.\d{3}Z$/, "Z");
}

export interface ReminderCalendarItem {
  agreementId: string;
  ruleId: string;
  milestoneLabel: string;
  dueAt: string;
  remindAt: string;
  agreementTitle: string | null;
}

export function buildReminderCalendarIcs(input: {
  items: ReminderCalendarItem[];
  generatedAt?: Date;
}) {
  const generatedAt = input.generatedAt ?? new Date();
  const siteUrl = getSiteUrl();
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Moral Trade//Commitment reminders//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Moral Trade reminders",
    "X-WR-CALDESC:Read-only reminders for private Moral Trade commitments.",
  ];

  for (const item of input.items) {
    const start = new Date(item.remindAt);
    const end = new Date(start.getTime() + 15 * 60_000);
    const titleSuffix = item.agreementTitle ? ` · ${item.agreementTitle}` : "";
    const summary = `Moral Trade: ${item.milestoneLabel}${titleSuffix}`;
    const href = new URL(
      `/trade-agreements/${encodeURIComponent(item.agreementId)}/reminders?view=timeline`,
      siteUrl,
    ).toString();
    const description = [
      `Reminder for ${item.milestoneLabel}.`,
      `Milestone due ${formatReminderDate(item.dueAt, "UTC")} UTC.`,
      "Open Moral Trade to review the private commitment. No private terms or evidence are included in this feed.",
    ].join(" ");

    lines.push(
      "BEGIN:VEVENT",
      `UID:${escapeIcsText(`${item.ruleId}@moraltrade.org`)}`,
      `DTSTAMP:${toIcsDate(generatedAt.toISOString())}`,
      `DTSTART:${toIcsDate(start.toISOString())}`,
      `DTEND:${toIcsDate(end.toISOString())}`,
      `SUMMARY:${escapeIcsText(summary)}`,
      `DESCRIPTION:${escapeIcsText(description)}`,
      `URL:${escapeIcsText(href)}`,
      "STATUS:CONFIRMED",
      "TRANSP:TRANSPARENT",
      "BEGIN:VALARM",
      "ACTION:DISPLAY",
      "TRIGGER:PT0M",
      `DESCRIPTION:${escapeIcsText(summary)}`,
      "END:VALARM",
      "END:VEVENT",
    );
  }

  lines.push("END:VCALENDAR");
  return `${lines.map(foldIcsLine).join("\r\n")}\r\n`;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function loadReminderCalendarItemsByToken(token: string) {
  if (!UUID_PATTERN.test(token)) return null;
  const supabase = createServiceClient() as SupabaseServiceAny;
  const feedResult = await supabase
    .from("reminder_calendar_feeds")
    .select("user_id, enabled, include_commitment_title")
    .eq("feed_token", token)
    .maybeSingle();

  if (feedResult.error || !feedResult.data || !feedResult.data.enabled) return null;
  const userId = String(feedResult.data.user_id);
  const now = new Date();
  const rangeStart = new Date(now.getTime() - 90 * 24 * 60 * 60_000).toISOString();
  const rangeEnd = new Date(now.getTime() + 366 * 24 * 60 * 60_000).toISOString();
  const rulesResult = await supabase
    .from("agreement_reminder_rules")
    .select("id, agreement_id, milestone_label, due_at, remind_at")
    .eq("user_id", userId)
    .eq("enabled", true)
    .eq("calendar_enabled", true)
    .gte("remind_at", rangeStart)
    .lte("remind_at", rangeEnd)
    .order("remind_at", { ascending: true })
    .limit(1_000);

  if (rulesResult.error) {
    throw new Error(`Could not load calendar reminder rules: ${rulesResult.error.message}`);
  }

  const rows = (rulesResult.data ?? []) as Array<Record<string, unknown>>;
  const agreementIds = [...new Set(rows.map((row) => String(row.agreement_id)))];
  let titleByAgreement = new Map<string, string>();

  if (feedResult.data.include_commitment_title && agreementIds.length) {
    const agreementsResult = await supabase
      .from("agreements")
      .select("id, offer_id")
      .in("id", agreementIds);
    const offerIds = [
      ...new Set(
        ((agreementsResult.data ?? []) as Array<Record<string, unknown>>)
          .map((agreement) => String(agreement.offer_id ?? ""))
          .filter(Boolean),
      ),
    ];
    const offersResult = offerIds.length
      ? await supabase
          .from("offers")
          .select("id, offered_cause, requested_cause")
          .in("id", offerIds)
      : { data: [] as Array<Record<string, unknown>>, error: null };
    const offerTitleById = new Map(
      ((offersResult.data ?? []) as Array<Record<string, unknown>>).map((offer) => [
        String(offer.id),
        `${String(offer.offered_cause ?? "Commitment")} ↔ ${String(
          offer.requested_cause ?? "Commitment",
        )}`,
      ]),
    );
    titleByAgreement = new Map(
      ((agreementsResult.data ?? []) as Array<Record<string, unknown>>).map((agreement) => [
        String(agreement.id),
        offerTitleById.get(String(agreement.offer_id)) ?? "Private Moral Trade agreement",
      ]),
    );
  }

  return rows.map(
    (row): ReminderCalendarItem => ({
      agreementId: String(row.agreement_id),
      ruleId: String(row.id),
      milestoneLabel: String(row.milestone_label),
      dueAt: String(row.due_at),
      remindAt: String(row.remind_at),
      agreementTitle: titleByAgreement.get(String(row.agreement_id)) ?? null,
    }),
  );
}

export function calendarFeedUrl(token: string) {
  return new URL(`/api/calendar/reminders/${encodeURIComponent(token)}.ics`, getSiteUrl()).toString();
}

export function calendarWebcalUrl(token: string) {
  const url = new URL(calendarFeedUrl(token));
  url.protocol = "webcal:";
  return url.toString();
}
