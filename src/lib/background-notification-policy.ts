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

export const BACKGROUND_OPPORTUNITY_NOTIFICATION = {
  body:
    "A privacy-safe opportunity brief is ready for your review. Exact wishes and contact details remain hidden until the appropriate consent stage.",
  title: "New broad-overlap opportunity",
} as const;

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

export interface BackgroundOpportunityBriefNotificationInput {
  confidenceBand?: string | null;
  containsContactDetails?: boolean;
  containsPrivateWishText?: boolean;
  containsSensitiveConstraint?: boolean;
  dailyCap?: number | null;
  digestEnabled?: boolean;
  immediateHighConfidenceEnabled?: boolean;
  nowLocalTime?: string;
  quietHours?: { end: string; start: string } | null;
  reviewStatus?: string | null;
  riskLevel?: "low" | "medium" | "high";
  sentToday?: number;
}

export interface BackgroundOpportunityBriefNotificationDecision {
  allowed: boolean;
  deliveryMode: "digest" | "immediate" | "none";
  reason: string;
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

function parseHour(value: string) {
  const [rawHour] = value.split(":");
  const hour = Number(rawHour);

  return Number.isInteger(hour) && hour >= 0 && hour <= 23 ? hour : null;
}

function isLocalTimeInsideQuietHours({
  nowLocalTime,
  quietHours,
}: {
  nowLocalTime?: string;
  quietHours?: { end: string; start: string } | null;
}) {
  if (!nowLocalTime || !quietHours) {
    return false;
  }

  const hour = parseHour(nowLocalTime);
  const quietHoursStart = parseHour(quietHours.start);
  const quietHoursEnd = parseHour(quietHours.end);

  if (hour === null || quietHoursStart === null || quietHoursEnd === null) {
    return false;
  }

  return isQuietHour({ hour, quietHoursEnd, quietHoursStart });
}

function isHighConfidenceBand(value?: string | null) {
  return value === "high" || value === "High";
}

function digestDecision(reason: string): BackgroundOpportunityBriefNotificationDecision {
  return { allowed: true, deliveryMode: "digest", reason };
}

function denyBriefNotification(reason: string): BackgroundOpportunityBriefNotificationDecision {
  return { allowed: false, deliveryMode: "none", reason };
}

export function shouldSendBriefNow({
  confidenceBand = "medium",
  containsContactDetails = false,
  containsPrivateWishText = false,
  containsSensitiveConstraint = false,
  dailyCap = 3,
  digestEnabled = true,
  immediateHighConfidenceEnabled = false,
  nowLocalTime,
  quietHours = { end: "08:00", start: "22:00" },
  reviewStatus = "human_review_required",
  riskLevel = "medium",
  sentToday = 0,
}: BackgroundOpportunityBriefNotificationInput): BackgroundOpportunityBriefNotificationDecision {
  if (containsPrivateWishText || containsContactDetails || containsSensitiveConstraint) {
    return denyBriefNotification(
      "Opportunity brief notifications cannot include private wishes, contact details, or sensitive constraints.",
    );
  }

  if (reviewStatus !== "review_cleared") {
    return digestEnabled
      ? digestDecision("Human review is still required, so the brief can only appear in a digest.")
      : denyBriefNotification("Human review is still required before an immediate alert.");
  }

  if (riskLevel === "high") {
    return digestEnabled
      ? digestDecision("High-risk briefs are batched for review instead of sent immediately.")
      : denyBriefNotification("High-risk briefs are not eligible for immediate notification.");
  }

  if (isLocalTimeInsideQuietHours({ nowLocalTime, quietHours })) {
    return digestEnabled
      ? digestDecision("Quiet hours are active, so the brief is held for digest delivery.")
      : denyBriefNotification("Quiet hours are active.");
  }

  if (dailyCap !== null && sentToday >= dailyCap) {
    return digestEnabled
      ? digestDecision("Daily opportunity brief cap reached; the brief is held for digest delivery.")
      : denyBriefNotification("Daily opportunity brief cap reached.");
  }

  if (!isHighConfidenceBand(confidenceBand)) {
    return digestEnabled
      ? digestDecision("Only high-confidence, review-cleared briefs can be sent immediately.")
      : denyBriefNotification("Brief is below the immediate notification confidence threshold.");
  }

  if (!immediateHighConfidenceEnabled) {
    return digestEnabled
      ? digestDecision("Immediate high-confidence alerts are disabled; the brief is held for digest delivery.")
      : denyBriefNotification("Opportunity brief notifications are disabled.");
  }

  return {
    allowed: true,
    deliveryMode: "immediate",
    reason: "High-confidence, low-risk, review-cleared brief can be sent immediately.",
  };
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
