import type {
  BackgroundNotificationChannel,
  BackgroundNotificationDigestCadence,
  BackgroundNotificationEventKind,
} from "@/lib/background-privacy-controls";

export const BACKGROUND_DISCOVERY_NOTIFICATION_EVENTS = new Set<BackgroundNotificationEventKind>([
  "match_suggestions",
]);

export const BACKGROUND_STATE_CHANGE_NOTIFICATION_EVENTS = new Set<BackgroundNotificationEventKind>([
  "consent_decisions",
  "grant_activity",
  "introduction_updates",
  "operator_review",
  "safety_review",
]);

export interface BackgroundNotificationPolicyInput {
  channel: BackgroundNotificationChannel;
  dailyCap?: number | null;
  digestCadence: BackgroundNotificationDigestCadence;
  enabled: boolean;
  eventKind: BackgroundNotificationEventKind;
  immediateSentToday?: number;
  lastSourceNotificationAt?: string | null;
  now?: Date;
  quietHoursEnd?: number | null;
  quietHoursStart?: number | null;
  quietUntil?: string | null;
  sourceCooldownHours?: number | null;
}

function isQuietHour({
  hour,
  quietHoursEnd,
  quietHoursStart,
}: {
  hour: number;
  quietHoursEnd?: number | null;
  quietHoursStart?: number | null;
}) {
  if (
    quietHoursStart === null ||
    quietHoursStart === undefined ||
    quietHoursEnd === null ||
    quietHoursEnd === undefined ||
    quietHoursStart === quietHoursEnd
  ) {
    return false;
  }

  if (quietHoursStart > quietHoursEnd) {
    return hour >= quietHoursStart || hour < quietHoursEnd;
  }

  return hour >= quietHoursStart && hour < quietHoursEnd;
}

function isInsideSourceCooldown({
  lastSourceNotificationAt,
  now,
  sourceCooldownHours,
}: {
  lastSourceNotificationAt?: string | null;
  now: Date;
  sourceCooldownHours?: number | null;
}) {
  if (!lastSourceNotificationAt || !sourceCooldownHours || sourceCooldownHours <= 0) {
    return false;
  }

  const lastSentAt = Date.parse(lastSourceNotificationAt);

  if (!Number.isFinite(lastSentAt)) {
    return false;
  }

  return now.getTime() - lastSentAt < sourceCooldownHours * 60 * 60 * 1000;
}

export function shouldSendBackgroundNotificationImmediately({
  channel,
  dailyCap = 1,
  digestCadence,
  enabled,
  eventKind,
  immediateSentToday = 0,
  lastSourceNotificationAt,
  now = new Date(),
  quietHoursEnd,
  quietHoursStart,
  quietUntil,
  sourceCooldownHours,
}: BackgroundNotificationPolicyInput) {
  if (!enabled || digestCadence === "none") {
    return false;
  }

  if (quietUntil && Date.parse(quietUntil) > now.getTime()) {
    return false;
  }

  const isDiscovery = BACKGROUND_DISCOVERY_NOTIFICATION_EVENTS.has(eventKind);

  if (
    isDiscovery &&
    isQuietHour({
      hour: now.getHours(),
      quietHoursEnd,
      quietHoursStart,
    })
  ) {
    return false;
  }

  if (isDiscovery && dailyCap !== null && immediateSentToday >= dailyCap) {
    return false;
  }

  if (
    isDiscovery &&
    isInsideSourceCooldown({
      lastSourceNotificationAt,
      now,
      sourceCooldownHours,
    })
  ) {
    return false;
  }

  if (channel === "in_app") {
    return true;
  }

  if (isDiscovery) {
    return digestCadence === "immediate";
  }

  return BACKGROUND_STATE_CHANGE_NOTIFICATION_EVENTS.has(eventKind);
}
