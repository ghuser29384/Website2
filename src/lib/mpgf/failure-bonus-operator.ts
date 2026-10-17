import { createServiceClient } from "@/lib/supabase/server";

import {
  isCurrentFailureBonusEligibilityPolicy,
  type FailureBonusEligibilityPolicy,
  type FailureBonusSuccessPremiumScheduleQuote,
} from "./failure-bonus-success-premium";
import { validateStoredFailureBonusSchedule } from "./failure-bonus-threshold-editor";

interface SupabaseServiceAny {
  from: (table: string) => any;
}

export interface MpgfPendingFailureBonusSchedule {
  proposalId: string;
  title: string;
  proposerId: string | null;
  proposalStatus: string;
  submittedAt: string | null;
  verifiedSupporterMinimum: number;
  failureBonusRateBps: number;
  eligibilityPolicy: FailureBonusEligibilityPolicy;
  schedule: FailureBonusSuccessPremiumScheduleQuote;
}

export interface MpgfBlockedFailureBonusSchedule {
  proposalId: string;
  title: string;
  proposalStatus: string;
  submittedAt: string | null;
  reason: string;
}

export interface MpgfFailureBonusScheduleReviewQueue {
  pending: MpgfPendingFailureBonusSchedule[];
  blocked: MpgfBlockedFailureBonusSchedule[];
}

function toSafeInteger(value: unknown, label: string) {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) {
    throw new Error(`${label} is not an exact integer.`);
  }
  return parsed;
}

function blockedRow(raw: Record<string, unknown>, error: unknown): MpgfBlockedFailureBonusSchedule {
  return {
    proposalId: String(raw.id),
    title: String(raw.title ?? "Untitled failure-bonus proposal"),
    proposalStatus: String(raw.status ?? "draft"),
    submittedAt: raw.submitted_at == null ? null : String(raw.submitted_at),
    reason: error instanceof Error ? error.message : "The stored schedule is malformed.",
  };
}

export type MpgfFailureBonusScheduleClassification =
  | { status: "pending"; value: MpgfPendingFailureBonusSchedule }
  | { status: "blocked"; value: MpgfBlockedFailureBonusSchedule };

export function classifyPendingMpgfFailureBonusScheduleRow(
  raw: Record<string, unknown>,
): MpgfFailureBonusScheduleClassification {
  try {
    const eligibilityPolicy = raw.public_goods_failure_bonus_eligibility_json;
    if (!isCurrentFailureBonusEligibilityPolicy(eligibilityPolicy)) {
      throw new Error("The pool-wide eligibility policy is missing, stale, or malformed.");
    }

    const schedule = validateStoredFailureBonusSchedule({
      submittedSchedule:
        raw.public_goods_threshold_schedule_json as FailureBonusSuccessPremiumScheduleQuote,
      separateEligibilityPolicy: eligibilityPolicy,
      failureBonusRateBps: toSafeInteger(
        raw.public_goods_failure_bonus_rate_bps,
        "Failure-bonus rate",
      ),
      requestedMaximumFundingCents: toSafeInteger(
        raw.requested_maximum_funding_cents,
        "Requested maximum funding",
      ),
      verifiedSupporterMinimum: toSafeInteger(
        raw.public_goods_threshold_supporters,
        "Verified supporter minimum",
      ),
      scheduleStatus: "pending_review",
    });

    return {
      status: "pending",
      value: {
        proposalId: String(raw.id),
        title: String(raw.title ?? "Untitled failure-bonus proposal"),
        proposerId: raw.proposer_id == null ? null : String(raw.proposer_id),
        proposalStatus: String(raw.status ?? "draft"),
        submittedAt: raw.submitted_at == null ? null : String(raw.submitted_at),
        verifiedSupporterMinimum: toSafeInteger(
          raw.public_goods_threshold_supporters,
          "Verified supporter minimum",
        ),
        failureBonusRateBps: toSafeInteger(
          raw.public_goods_failure_bonus_rate_bps,
          "Failure-bonus rate",
        ),
        eligibilityPolicy,
        schedule,
      },
    };
  } catch (error) {
    return { status: "blocked", value: blockedRow(raw, error) };
  }
}

export async function loadPendingMpgfFailureBonusSchedules(): Promise<MpgfFailureBonusScheduleReviewQueue> {
  const supabase = createServiceClient() as unknown as SupabaseServiceAny;
  const result = await supabase
    .from("mpgf_pool_proposals")
    .select([
      "id",
      "title",
      "proposer_id",
      "status",
      "submitted_at",
      "created_at",
      "requested_maximum_funding_cents",
      "public_goods_threshold_supporters",
      "public_goods_failure_bonus_rate_bps",
      "public_goods_failure_bonus_eligibility_json",
      "public_goods_failure_bonus_schedule_status",
      "public_goods_threshold_schedule_json",
    ].join(","))
    .eq("public_goods_failure_bonus_enabled", true)
    .eq("public_goods_failure_bonus_schedule_status", "pending_review")
    .order("submitted_at", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });

  if (result.error) {
    throw new Error(`Could not load pending failure-bonus schedules: ${result.error.message}`);
  }

  const queue: MpgfFailureBonusScheduleReviewQueue = { pending: [], blocked: [] };
  for (const raw of (result.data ?? []) as Record<string, unknown>[]) {
    const classification = classifyPendingMpgfFailureBonusScheduleRow(raw);
    queue[classification.status].push(classification.value as never);
  }

  return queue;
}
