import { hasSupabaseEnv } from "@/lib/supabase/config";
import { createServiceClient } from "@/lib/supabase/server";

import {
  demoMpgfAssurancePledges,
  demoMpgfAssuranceRound,
  demoMpgfMatchPool,
  demoMpgfPublicGoodsCampaigns,
  demoMpgfPublicGoodsPaymentProofs,
  demoMpgfPublicGoodsReviewCases,
  demoMpgfPublicGoodsSubscriptions,
} from "./data";
import {
  allocateMpgfAssuranceRound,
  summarizeMpgfPublicGoodsReviewConsole,
} from "./mechanism";
import {
  buildMpgfPublicGoodsKpiSnapshot,
  loadMpgfPublicGoodsKpiSnapshot,
  type MpgfPublicGoodsKpiSnapshot,
} from "./public-goods-kpis";
import type {
  MpgfPublicGoodsCampaign,
  MpgfPublicGoodsMatchPool,
  MpgfPublicGoodsPaymentProof,
  MpgfPublicGoodsPledge,
  MpgfPublicGoodsReviewCase,
  MpgfPublicGoodsRound,
  MpgfPublicGoodsRoundAllocation,
  MpgfPublicGoodsSubscription,
} from "./types";

type SupabaseServiceAny = ReturnType<typeof createServiceClient> & {
  from: (table: string) => any;
};

export type MpgfPublicGoodsOperationsStatus = "clear" | "watch" | "attention_required";

export type MpgfPublicGoodsOperationsAlertKind =
  | "payment_failure"
  | "webhook_replay_attempt"
  | "dispute_freeze";

export type MpgfPublicGoodsOperationsSeverity = "info" | "warning" | "critical";

export interface MpgfPublicGoodsOperationsWebhookEvent {
  id?: string;
  provider: string;
  providerEventId?: string;
  eventType: string;
  status: "received" | "processed" | "ignored" | "failed" | "already_processed";
  processed?: boolean;
  processingError?: string | null;
  replayAttemptCount?: number | null;
  lastReplayedAt?: string | null;
  createdAt?: string | null;
}

export interface MpgfPublicGoodsOperationsAlert {
  kind: MpgfPublicGoodsOperationsAlertKind;
  severity: MpgfPublicGoodsOperationsSeverity;
  title: string;
  summary: string;
  sourceCount: number;
  sourceRefs: string[];
  latestSeenAt: string | null;
  recommendedAction: string;
  runbookKey: string;
  alertChannels: string[];
  privacyClass: "operations_aggregate_no_raw_payloads";
  blocksPublicWidening: boolean;
  blocksPayoutRelease: boolean;
}

export interface MpgfPublicGoodsOperationsDashboard {
  generatedAt: string;
  status: MpgfPublicGoodsOperationsStatus;
  privacyPolicy: "private_admin_operations_no_raw_webhook_payloads";
  alerting: {
    configured: true;
    requiredAlertKinds: MpgfPublicGoodsOperationsAlertKind[];
    primarySink: "protected_admin_operations_route";
    optionalExternalSinksConfigured: {
      webhook: boolean;
      opsEmail: boolean;
    };
    secretPolicy: "secret_values_never_returned";
  };
  dashboardCounters: {
    reviewSlaHours: number | null;
    reviewSlaSampleReady: boolean;
    identityFlagRateBps: number | null;
    identityFlaggedPledgeCount: number;
    thresholdClearRateBps: number | null;
    thresholdClearedCampaignCount: number;
    payoutHoldCents: number;
    payoutHoldCampaignCount: number;
    paymentFailureCount: number;
    webhookReplayAttemptCount: number;
    disputeFreezeCount: number;
  };
  incidents: {
    alerts: MpgfPublicGoodsOperationsAlert[];
    paymentFailureEvents: number;
    replayAttemptEvents: number;
    disputeFreezeItems: number;
  };
  rolloutGate: {
    widensPublicAccessAutomatically: false;
    blocksPublicBetaReview: boolean;
    blockers: string[];
  };
  sourceSummary: {
    dataSource: MpgfPublicGoodsKpiSnapshot["dataSource"];
    webhookEventCount: number;
    reviewCaseCount: number;
    milestoneQueueCount: number;
  };
}

export interface LoadMpgfPublicGoodsOperationsDashboardResult {
  ok: boolean;
  status: "loaded" | "dry_run" | "not_configured";
  dashboard: MpgfPublicGoodsOperationsDashboard;
  warnings: string[];
}

type ReviewConsole = ReturnType<typeof summarizeMpgfPublicGoodsReviewConsole>;

const requiredAlertKinds: MpgfPublicGoodsOperationsAlertKind[] = [
  "payment_failure",
  "webhook_replay_attempt",
  "dispute_freeze",
];

function hasServiceRoleEnv() {
  return Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function clampNonNegativeInteger(value: number) {
  return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
}

function rateBps(numerator: number, denominator: number) {
  if (denominator <= 0) {
    return null;
  }

  return Math.max(0, Math.round((numerator / denominator) * 10_000));
}

function latestTimestamp(values: Array<string | null | undefined>) {
  const parsed = values
    .map((value) => {
      if (!value) {
        return null;
      }

      const time = Date.parse(value);

      return Number.isFinite(time) ? time : null;
    })
    .filter((value): value is number => value != null)
    .sort((left, right) => right - left)[0];

  return parsed == null ? null : new Date(parsed).toISOString();
}

function readString(row: Record<string, unknown>, key: string, fallback = "") {
  const value = row[key];

  return typeof value === "string" && value.trim() ? value : fallback;
}

function readBoolean(row: Record<string, unknown>, key: string, fallback = false) {
  const value = row[key];

  return typeof value === "boolean" ? value : fallback;
}

function readNumber(row: Record<string, unknown>, key: string, fallback = 0) {
  const value = row[key];

  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
}

function normalizeWebhookStatus(value: string): MpgfPublicGoodsOperationsWebhookEvent["status"] {
  if (
    value === "received" ||
    value === "processed" ||
    value === "ignored" ||
    value === "failed" ||
    value === "already_processed"
  ) {
    return value;
  }

  return "received";
}

function mapWebhookEventRow(row: Record<string, unknown>): MpgfPublicGoodsOperationsWebhookEvent {
  return {
    id: readString(row, "id") || undefined,
    provider: readString(row, "provider", "stripe"),
    providerEventId: readString(row, "provider_event_id") || readString(row, "stripe_event_id") || undefined,
    eventType: readString(row, "event_type", "unknown"),
    status: normalizeWebhookStatus(readString(row, "status", "received")),
    processed: readBoolean(row, "processed"),
    processingError: readString(row, "processing_error") || null,
    replayAttemptCount: clampNonNegativeInteger(readNumber(row, "replay_attempt_count")),
    lastReplayedAt: readString(row, "last_replayed_at") || null,
    createdAt: readString(row, "created_at") || null,
  };
}

function isPaymentFailureEvent(event: MpgfPublicGoodsOperationsWebhookEvent) {
  return (
    event.status === "failed" ||
    event.eventType === "checkout.session.async_payment_failed" ||
    Boolean(event.processingError)
  );
}

function isReplayAttemptEvent(event: MpgfPublicGoodsOperationsWebhookEvent) {
  return event.status === "already_processed" || clampNonNegativeInteger(event.replayAttemptCount ?? 0) > 0;
}

function sourceRefs(prefix: string, count: number) {
  return Array.from({ length: Math.min(5, count) }, (_, index) => `${prefix}:${index + 1}`);
}

function buildAlert(input: {
  kind: MpgfPublicGoodsOperationsAlertKind;
  severity: MpgfPublicGoodsOperationsSeverity;
  title: string;
  summary: string;
  sourceCount: number;
  sourceRefs: string[];
  latestSeenAt: string | null;
  recommendedAction: string;
  runbookKey: string;
  blocksPayoutRelease: boolean;
}): MpgfPublicGoodsOperationsAlert {
  return {
    ...input,
    alertChannels: ["protected_admin_operations_route", "ops_email_if_configured", "external_webhook_if_configured"],
    privacyClass: "operations_aggregate_no_raw_payloads",
    blocksPublicWidening: true,
  };
}

function buildAlertingConfig() {
  return {
    configured: true as const,
    requiredAlertKinds,
    primarySink: "protected_admin_operations_route" as const,
    optionalExternalSinksConfigured: {
      webhook: Boolean(process.env.MPGF_PUBLIC_GOODS_INCIDENT_ALERT_WEBHOOK_URL),
      opsEmail: Boolean(process.env.MPGF_PUBLIC_GOODS_OPS_EMAIL),
    },
    secretPolicy: "secret_values_never_returned" as const,
  };
}

function emptyReviewConsole(): ReviewConsole {
  return {
    reasonCodes: [],
    queue: [],
    conflictCheckBanner: {
      status: "clear",
      message: "No database review-console rows were loaded for the operations dashboard.",
    },
    rubric: [],
    milestoneReleaseQueue: [],
    disputeQueue: [],
    auditTrail: [],
    openCaseCount: 0,
    challengedCampaignCount: 0,
    activeSponsorSubscriptionCount: 0,
    verifiedPaymentProofCount: 0,
    privacySafeAnalyticsOnly: true,
    rawPrivateTextStoredInAnalytics: false,
  };
}

function buildOperationsAlerts(input: {
  paymentFailures: MpgfPublicGoodsOperationsWebhookEvent[];
  replayAttempts: MpgfPublicGoodsOperationsWebhookEvent[];
  disputeFreezeCount: number;
  frozenCampaignIds: string[];
}) {
  const alerts: MpgfPublicGoodsOperationsAlert[] = [];

  if (input.paymentFailures.length > 0) {
    alerts.push(
      buildAlert({
        kind: "payment_failure",
        severity: "warning",
        title: "Payment failure alert",
        summary: `${input.paymentFailures.length} MPGF payment webhook event(s) require payment-ops review.`,
        sourceCount: input.paymentFailures.length,
        sourceRefs: sourceRefs("payment_failure_webhook", input.paymentFailures.length),
        latestSeenAt: latestTimestamp(input.paymentFailures.map((event) => event.createdAt)),
        recommendedAction: "Review provider state, mark failed contributions ineligible for matching, and publish aggregate incident status if donor-facing behavior changed.",
        runbookKey: "mpgf_payment_failure_ops_review",
        blocksPayoutRelease: true,
      }),
    );
  }

  if (input.replayAttempts.length > 0) {
    alerts.push(
      buildAlert({
        kind: "webhook_replay_attempt",
        severity: "critical",
        title: "Webhook replay attempt alert",
        summary: `${input.replayAttempts.length} MPGF provider event(s) were observed after already being processed.`,
        sourceCount: input.replayAttempts.length,
        sourceRefs: sourceRefs("webhook_replay", input.replayAttempts.length),
        latestSeenAt: latestTimestamp(
          input.replayAttempts.map((event) => event.lastReplayedAt ?? event.createdAt),
        ),
        recommendedAction: "Confirm signature verification, preserve idempotency records, and keep public widening paused until the replay source is understood.",
        runbookKey: "mpgf_webhook_replay_lockdown",
        blocksPayoutRelease: true,
      }),
    );
  }

  if (input.disputeFreezeCount > 0 || input.frozenCampaignIds.length > 0) {
    alerts.push(
      buildAlert({
        kind: "dispute_freeze",
        severity: "critical",
        title: "Dispute freeze alert",
        summary: `${Math.max(input.disputeFreezeCount, input.frozenCampaignIds.length)} campaign payout lane(s) are frozen by dispute, challenge window, or incident status.`,
        sourceCount: Math.max(input.disputeFreezeCount, input.frozenCampaignIds.length),
        sourceRefs:
          input.frozenCampaignIds.length > 0
            ? input.frozenCampaignIds.slice(0, 5).map((campaignId) => `campaign:${campaignId}`)
            : sourceRefs("dispute_freeze", input.disputeFreezeCount),
        latestSeenAt: null,
        recommendedAction: "Keep unreleased milestones paused, assign human review, publish aggregate dispute state, and require dual-control release after resolution.",
        runbookKey: "mpgf_dispute_freeze_release_hold",
        blocksPayoutRelease: true,
      }),
    );
  }

  return alerts;
}

export function buildMpgfPublicGoodsOperationsDashboard({
  campaigns = demoMpgfPublicGoodsCampaigns,
  pledges = demoMpgfAssurancePledges,
  reviewCases = demoMpgfPublicGoodsReviewCases,
  paymentProofs = demoMpgfPublicGoodsPaymentProofs,
  subscriptions = demoMpgfPublicGoodsSubscriptions,
  round = demoMpgfAssuranceRound,
  matchPool = demoMpgfMatchPool,
  allocation,
  snapshot,
  reviewConsole,
  webhookEvents = [],
  frozenCampaignIds = [],
  generatedAt = new Date("2026-05-29T12:00:00.000Z").toISOString(),
}: {
  campaigns?: MpgfPublicGoodsCampaign[];
  pledges?: MpgfPublicGoodsPledge[];
  reviewCases?: MpgfPublicGoodsReviewCase[];
  paymentProofs?: MpgfPublicGoodsPaymentProof[];
  subscriptions?: MpgfPublicGoodsSubscription[];
  round?: MpgfPublicGoodsRound;
  matchPool?: MpgfPublicGoodsMatchPool;
  allocation?: MpgfPublicGoodsRoundAllocation;
  snapshot?: MpgfPublicGoodsKpiSnapshot;
  reviewConsole?: ReviewConsole;
  webhookEvents?: MpgfPublicGoodsOperationsWebhookEvent[];
  frozenCampaignIds?: string[];
  generatedAt?: string;
} = {}): MpgfPublicGoodsOperationsDashboard {
  const roundAllocation =
    allocation ??
    allocateMpgfAssuranceRound({
      campaigns,
      pledges,
      round,
      matchPool,
      now: new Date(generatedAt),
    });
  const kpiSnapshot =
    snapshot ??
    buildMpgfPublicGoodsKpiSnapshot({
      campaigns,
      pledges,
      reviewCases,
      paymentProofs,
      subscriptions,
      round,
      matchPool,
      allocation: roundAllocation,
      generatedAt,
    });
  const consoleSummary =
    reviewConsole ??
    (kpiSnapshot.dataSource === "database"
      ? emptyReviewConsole()
      : summarizeMpgfPublicGoodsReviewConsole({
          campaigns,
          reviewCases,
          subscriptions,
          paymentProofs,
          now: new Date(generatedAt),
        }));
  const paymentFailures = webhookEvents.filter(isPaymentFailureEvent);
  const replayAttempts = webhookEvents.filter(isReplayAttemptEvent);
  const payoutHoldItems = consoleSummary.milestoneReleaseQueue.filter(
    (item) => item.status === "paused_by_dispute" || item.status === "not_payable" || item.blockers.length > 0,
  );
  const disputeFreezeItems = consoleSummary.milestoneReleaseQueue.filter(
    (item) =>
      item.status === "paused_by_dispute" ||
      item.blockers.includes("open_dispute_or_challenge_window") ||
      item.blockers.includes("incident_frozen"),
  );
  const disputeFreezeCount = Math.max(
    disputeFreezeItems.length,
    frozenCampaignIds.length,
    kpiSnapshot.review.disputeCaseCount,
  );
  const activePledgeCount = kpiSnapshot.coordination.eligiblePledgeCount + kpiSnapshot.safety.excludedPledgeCount;
  const alerts = buildOperationsAlerts({
    paymentFailures,
    replayAttempts,
    disputeFreezeCount,
    frozenCampaignIds,
  });
  const status: MpgfPublicGoodsOperationsStatus = alerts.some((alert) => alert.severity === "critical")
    ? "attention_required"
    : alerts.length > 0
      ? "watch"
      : "clear";
  const rolloutBlockers = [
    ...kpiSnapshot.rolloutGate.blockers,
    ...alerts.map((alert) => `active_${alert.kind}`),
  ];

  return {
    generatedAt,
    status,
    privacyPolicy: "private_admin_operations_no_raw_webhook_payloads",
    alerting: buildAlertingConfig(),
    dashboardCounters: {
      reviewSlaHours: kpiSnapshot.review.reviewerMedianHoursToClose,
      reviewSlaSampleReady: kpiSnapshot.rolloutGate.reviewerTimingSampleReady,
      identityFlagRateBps: rateBps(kpiSnapshot.safety.duplicateOrBlockedPledgeCount, activePledgeCount),
      identityFlaggedPledgeCount: kpiSnapshot.safety.duplicateOrBlockedPledgeCount,
      thresholdClearRateBps: kpiSnapshot.coordination.thresholdClearRateBps,
      thresholdClearedCampaignCount: kpiSnapshot.coordination.thresholdClearedCampaignCount,
      payoutHoldCents: payoutHoldItems.reduce((sum, item) => sum + clampNonNegativeInteger(item.releaseAmountCents), 0),
      payoutHoldCampaignCount: Math.max(payoutHoldItems.length, frozenCampaignIds.length),
      paymentFailureCount: paymentFailures.length,
      webhookReplayAttemptCount: replayAttempts.length,
      disputeFreezeCount,
    },
    incidents: {
      alerts,
      paymentFailureEvents: paymentFailures.length,
      replayAttemptEvents: replayAttempts.length,
      disputeFreezeItems: disputeFreezeCount,
    },
    rolloutGate: {
      widensPublicAccessAutomatically: false,
      blocksPublicBetaReview: rolloutBlockers.length > 0,
      blockers: [...new Set(rolloutBlockers)],
    },
    sourceSummary: {
      dataSource: kpiSnapshot.dataSource,
      webhookEventCount: webhookEvents.length,
      reviewCaseCount: kpiSnapshot.review.reviewCaseCount,
      milestoneQueueCount: consoleSummary.milestoneReleaseQueue.length,
    },
  };
}

async function selectRows(supabase: SupabaseServiceAny, table: string, columns: string) {
  const result = await supabase.from(table).select(columns).order("created_at", { ascending: false }).limit(100);

  if (result.error) {
    throw new Error(`Could not load MPGF public-goods operations data from ${table}: ${result.error.message}`);
  }

  return ((result.data ?? []) as unknown[]).filter((row): row is Record<string, unknown> => Boolean(row && typeof row === "object"));
}

async function loadWebhookEventsFromDatabase(supabase: SupabaseServiceAny) {
  const rows = await selectRows(
    supabase,
    "mpgf_payment_webhook_events",
    "id, provider, provider_event_id, stripe_event_id, event_type, status, processed, processing_error, replay_attempt_count, last_replayed_at, created_at",
  );

  return rows.map(mapWebhookEventRow);
}

async function loadFrozenCampaignIdsFromDatabase(supabase: SupabaseServiceAny) {
  const result = await supabase
    .from("mpgf_public_goods_campaigns")
    .select("id, incident_status")
    .eq("incident_status", "frozen")
    .limit(100);

  if (result.error) {
    throw new Error(`Could not load MPGF public-goods frozen campaigns: ${result.error.message}`);
  }

  return ((result.data ?? []) as unknown[])
    .filter((row): row is Record<string, unknown> => Boolean(row && typeof row === "object"))
    .map((row) => readString(row, "id"))
    .filter(Boolean);
}

export async function loadMpgfPublicGoodsOperationsDashboard({
  dryRun = false,
  generatedAt = new Date().toISOString(),
}: {
  dryRun?: boolean;
  generatedAt?: string;
} = {}): Promise<LoadMpgfPublicGoodsOperationsDashboardResult> {
  const warnings: string[] = [];
  const kpiResult = await loadMpgfPublicGoodsKpiSnapshot({ dryRun, generatedAt });

  if (dryRun || !hasSupabaseEnv() || !hasServiceRoleEnv()) {
    return {
      ok: kpiResult.ok,
      status: dryRun ? "dry_run" : kpiResult.status,
      dashboard: buildMpgfPublicGoodsOperationsDashboard({
        snapshot: kpiResult.snapshot,
        generatedAt,
      }),
      warnings: [...kpiResult.warnings, "MPGF public-goods operations dashboard used demo webhook and incident inputs."],
    };
  }

  try {
    const supabase = createServiceClient() as SupabaseServiceAny;
    const [webhookEvents, frozenCampaignIds] = await Promise.all([
      loadWebhookEventsFromDatabase(supabase),
      loadFrozenCampaignIdsFromDatabase(supabase),
    ]);

    return {
      ok: kpiResult.ok,
      status: kpiResult.status,
      dashboard: buildMpgfPublicGoodsOperationsDashboard({
        snapshot: kpiResult.snapshot,
        webhookEvents,
        frozenCampaignIds,
        generatedAt,
      }),
      warnings: kpiResult.warnings,
    };
  } catch (error) {
    warnings.push(error instanceof Error ? error.message : "MPGF public-goods operations inputs could not be loaded.");

    return {
      ok: false,
      status: "not_configured",
      dashboard: buildMpgfPublicGoodsOperationsDashboard({
        snapshot: kpiResult.snapshot,
        generatedAt,
      }),
      warnings: [...kpiResult.warnings, ...warnings],
    };
  }
}
