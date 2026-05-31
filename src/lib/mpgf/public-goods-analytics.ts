import { createHash } from "node:crypto";

import { hasSupabaseEnv } from "@/lib/supabase/config";
import { createServiceClient } from "@/lib/supabase/server";

import type {
  MpgfPublicGoodsCaptureMode,
  MpgfPublicGoodsPledge,
  MpgfPublicGoodsReviewReasonCode,
  MpgfPublicGoodsVisibilityMode,
} from "./types";

type SupabaseServiceAny = ReturnType<typeof createServiceClient> & {
  from: (table: string) => any;
};

export type MpgfPublicGoodsAnalyticsEventType =
  | "campaign_viewed"
  | "pledge_intent_recorded"
  | "threshold_status_evaluated"
  | "external_handoff_reconciled"
  | "allocation_finalized"
  | "subscription_refill_recorded";

export type MpgfPublicGoodsAnalyticsAmountBucket =
  | "under_10"
  | "10_to_49"
  | "50_to_249"
  | "250_to_999"
  | "1000_plus";

export interface MpgfPublicGoodsAnalyticsEventJson {
  amountBucket?: MpgfPublicGoodsAnalyticsAmountBucket;
  visibilityMode?: MpgfPublicGoodsVisibilityMode;
  captureMode?: MpgfPublicGoodsCaptureMode;
  isRecurring?: boolean;
  eligibilityState?: MpgfPublicGoodsPledge["eligibilityState"];
  campaignStatus?: string;
  thresholdPassed?: boolean;
  reviewStatus?: string;
  reasonCode?: MpgfPublicGoodsReviewReasonCode;
  proofStatus?: string;
  publicEvidenceSource?: string;
  surface?: "public_campaign_page" | "mpgf_participant_action" | "protected_job" | "review_console";
  cohort?: string;
  variant?: string;
}

export interface MpgfPublicGoodsAnalyticsEventRow {
  user_ref_hash: string | null;
  experiment_assignment_id: string | null;
  event_type: MpgfPublicGoodsAnalyticsEventType;
  campaign_id: string | null;
  event_json: MpgfPublicGoodsAnalyticsEventJson;
  created_at: string;
}

export interface RecordMpgfPublicGoodsAnalyticsEventResult {
  ok: boolean;
  status: "recorded" | "dry_run" | "not_configured";
  row: MpgfPublicGoodsAnalyticsEventRow;
  warning?: string;
}

const allowedEventTypes = new Set<MpgfPublicGoodsAnalyticsEventType>([
  "campaign_viewed",
  "pledge_intent_recorded",
  "threshold_status_evaluated",
  "external_handoff_reconciled",
  "allocation_finalized",
  "subscription_refill_recorded",
]);

const forbiddenAnalyticsKeyPattern =
  /email|phone|contact|private[_-]?wish|raw[_-]?evidence|raw[_-]?text|source[_-]?note|receipt[_-]?text|supporter[_-]?reason|payment[_-]?secret|provider[_-]?payload|token|password|private[_-]?key/i;

function hasServiceRoleEnv() {
  return Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function assertNoForbiddenAnalyticsContent(value: unknown, path = "event_json") {
  if (value == null) {
    return;
  }

  if (typeof value === "string" && /@|^\+?\d[\d\s().-]{6,}$/.test(value)) {
    throw new Error(`MPGF public-goods analytics field ${path} looks like contact data.`);
  }

  if (Array.isArray(value)) {
    value.forEach((entry, index) => assertNoForbiddenAnalyticsContent(entry, `${path}[${index}]`));
    return;
  }

  if (typeof value !== "object") {
    return;
  }

  for (const [key, entry] of Object.entries(value)) {
    if (forbiddenAnalyticsKeyPattern.test(key)) {
      throw new Error(`MPGF public-goods analytics cannot store raw or sensitive field ${path}.${key}.`);
    }

    assertNoForbiddenAnalyticsContent(entry, `${path}.${key}`);
  }
}

export function hashMpgfPublicGoodsAnalyticsUserRef(userId: string) {
  const trimmed = userId.trim();

  if (!trimmed) {
    return null;
  }

  return `sha256:${createHash("sha256").update(`mpgf-public-goods:${trimmed}`).digest("hex")}`;
}

export function bucketMpgfPublicGoodsAmountCents(amountCents: number): MpgfPublicGoodsAnalyticsAmountBucket {
  const amountDollars = Math.max(0, Math.floor(amountCents / 100));

  if (amountDollars < 10) {
    return "under_10";
  }

  if (amountDollars < 50) {
    return "10_to_49";
  }

  if (amountDollars < 250) {
    return "50_to_249";
  }

  if (amountDollars < 1000) {
    return "250_to_999";
  }

  return "1000_plus";
}

export function buildMpgfPublicGoodsAnalyticsEvent(input: {
  eventType: MpgfPublicGoodsAnalyticsEventType;
  userId?: string | null;
  campaignId?: string | null;
  eventJson?: MpgfPublicGoodsAnalyticsEventJson;
  experimentAssignmentId?: string | null;
  createdAt?: string;
}): MpgfPublicGoodsAnalyticsEventRow {
  if (!allowedEventTypes.has(input.eventType)) {
    throw new Error(`Unsupported MPGF public-goods analytics event type: ${input.eventType}.`);
  }

  const eventJson = input.eventJson ?? {};
  assertNoForbiddenAnalyticsContent(eventJson);

  return {
    user_ref_hash: input.userId ? hashMpgfPublicGoodsAnalyticsUserRef(input.userId) : null,
    experiment_assignment_id: input.experimentAssignmentId?.trim() || null,
    event_type: input.eventType,
    campaign_id: input.campaignId?.trim() || null,
    event_json: eventJson,
    created_at: input.createdAt ?? new Date().toISOString(),
  };
}

export async function recordMpgfPublicGoodsAnalyticsEvent(input: {
  eventType: MpgfPublicGoodsAnalyticsEventType;
  userId?: string | null;
  campaignId?: string | null;
  eventJson?: MpgfPublicGoodsAnalyticsEventJson;
  experimentAssignmentId?: string | null;
  createdAt?: string;
  dryRun?: boolean;
}): Promise<RecordMpgfPublicGoodsAnalyticsEventResult> {
  const row = buildMpgfPublicGoodsAnalyticsEvent(input);

  if (input.dryRun) {
    return {
      ok: true,
      status: "dry_run",
      row,
    };
  }

  if (!hasSupabaseEnv() || !hasServiceRoleEnv()) {
    return {
      ok: false,
      status: "not_configured",
      row,
      warning: "Supabase service-role configuration is required to persist MPGF public-goods analytics.",
    };
  }

  const supabase = createServiceClient() as SupabaseServiceAny;
  const result = await supabase.from("mpgf_public_goods_analytics_events").insert(row).select("id").single();

  if (result.error) {
    throw new Error(`Could not persist MPGF public-goods analytics event: ${result.error.message}`);
  }

  return {
    ok: true,
    status: "recorded",
    row,
  };
}
