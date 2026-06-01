import { hasSupabaseEnv } from "@/lib/supabase/config";
import { createServiceClient } from "@/lib/supabase/server";

export const MORAL_TRADE_TRANSPARENCY_REPORT_VERSION =
  "moral-trade-transparency-report-v0.1-2026-05";
export const MORAL_TRADE_TRANSPARENCY_REPORT_VALIDATOR_VERSION =
  "moral-trade-transparency-report-validator-v0.1";
export const MORAL_TRADE_TRANSPARENCY_MIN_PUBLIC_COUNT = 3;

export type MoralTradeTransparencyMetricKind = "count" | "median_hours" | "percent";

export interface MoralTradeTransparencyMetricDefinition {
  description: string;
  key: string;
  kind: MoralTradeTransparencyMetricKind;
  label: string;
  sourceTables: string[];
}

export interface MoralTradeTransparencyReportContract {
  contractTests: string[];
  metricDefinitions: MoralTradeTransparencyMetricDefinition[];
  minimumPublicCount: typeof MORAL_TRADE_TRANSPARENCY_MIN_PUBLIC_COUNT;
  privacyRules: string[];
  publicationCadence: "quarterly";
  purpose: string;
  version: typeof MORAL_TRADE_TRANSPARENCY_REPORT_VERSION;
}

export interface MoralTradeTransparencyMetricInput {
  key: string;
  sampleSize?: number;
  value: number;
}

export interface MoralTradeTransparencyPublishedMetric
  extends MoralTradeTransparencyMetricDefinition {
  displayValue: string;
  publishedValue: number | null;
  sampleSize: number;
  suppressed: boolean;
  suppressionReason: string | null;
}

export interface MoralTradeTransparencyReportSnapshot {
  generatedAt: string;
  metricErrors: string[];
  metrics: MoralTradeTransparencyPublishedMetric[];
  periodEnd: string;
  periodLabel: string;
  periodStart: string;
  privacyNote: string;
  reportMode: "live_aggregate" | "contract_only";
  version: typeof MORAL_TRADE_TRANSPARENCY_REPORT_VERSION;
}

export interface MoralTradeTransparencyReportValidation {
  blockers: string[];
  contractVersion: typeof MORAL_TRADE_TRANSPARENCY_REPORT_VERSION;
  status: "pass" | "fail";
  validatorName: "moral-trade-transparency-report";
  validatorVersion: typeof MORAL_TRADE_TRANSPARENCY_REPORT_VALIDATOR_VERSION;
}

export interface MoralTradeTransparencySourceTableAudit {
  checkedTables: string[];
  missingTables: string[];
  status: "pass" | "fail";
  validatorName: "moral-trade-transparency-source-tables";
}

type SupabaseServiceAny = ReturnType<typeof createServiceClient> & {
  from: (table: string) => any;
};

const REQUIRED_METRIC_KEYS = [
  "reviewed_match_suggestions",
  "opportunity_briefs_delivered",
  "opportunity_briefs_opened",
  "opportunity_feedback_submitted",
  "opportunity_briefs_dismissed",
  "opportunity_briefs_deferred",
  "opportunity_interest_marked",
  "intro_packets_created",
  "declined_intro_requests",
  "blocked_safety_records",
  "disclosure_grants_created",
  "participant_reports_submitted",
  "concierge_appeals_requested",
  "agreement_evidence_reviewed",
  "unresolved_disputes_current",
  "median_concierge_review_hours",
  "median_agreement_review_hours",
  "concierge_sla_attainment_percent",
] as const;

const CONTRACT_TESTS = [
  "transparency_report_contract_smoke",
  "transparency_report_threshold_suppression",
  "transparency_report_no_private_fields",
  "transparency_report_metric_source_schema_audit",
  "transparency_report_public_route_smoke",
] as const;

const METRIC_DEFINITIONS: MoralTradeTransparencyMetricDefinition[] = [
  {
    description: "Match suggestions that left the initial suggested state during the report period.",
    key: "reviewed_match_suggestions",
    kind: "count",
    label: "Reviewed match suggestions",
    sourceTables: ["match_suggestions"],
  },
  {
    description: "Privacy-safe opportunity briefs created during the report period.",
    key: "opportunity_briefs_delivered",
    kind: "count",
    label: "Opportunity briefs delivered",
    sourceTables: ["background_opportunity_briefs"],
  },
  {
    description: "Opportunity briefs marked seen during the report period.",
    key: "opportunity_briefs_opened",
    kind: "count",
    label: "Opportunity briefs opened",
    sourceTables: ["background_opportunity_briefs"],
  },
  {
    description: "Closed-code relevance feedback updates recorded during the report period.",
    key: "opportunity_feedback_submitted",
    kind: "count",
    label: "Opportunity feedback submitted",
    sourceTables: ["background_match_feedback"],
  },
  {
    description: "Opportunity feedback rows marked dismissed during the report period.",
    key: "opportunity_briefs_dismissed",
    kind: "count",
    label: "Opportunity briefs dismissed",
    sourceTables: ["background_match_feedback"],
  },
  {
    description: "Opportunity feedback rows marked maybe-later during the report period.",
    key: "opportunity_briefs_deferred",
    kind: "count",
    label: "Opportunity briefs deferred",
    sourceTables: ["background_match_feedback"],
  },
  {
    description: "Opportunity feedback rows marked interested during the report period.",
    key: "opportunity_interest_marked",
    kind: "count",
    label: "Opportunity interest marks",
    sourceTables: ["background_match_feedback"],
  },
  {
    description: "Reviewed introduction packets requested during the report period.",
    key: "intro_packets_created",
    kind: "count",
    label: "Intro packets created",
    sourceTables: ["background_intro_packets"],
  },
  {
    description: "Introduction requests declined by operator review during the report period.",
    key: "declined_intro_requests",
    kind: "count",
    label: "Declined introduction requests",
    sourceTables: ["match_concierge_requests"],
  },
  {
    description: "Current blocked or flagged safety records across wish profiles and donation-offset offers.",
    key: "blocked_safety_records",
    kind: "count",
    label: "Blocked safety records",
    sourceTables: ["wish_profiles", "donation_offset_offers"],
  },
  {
    description: "Consent disclosure grants created during the report period.",
    key: "disclosure_grants_created",
    kind: "count",
    label: "Disclosure grants created",
    sourceTables: ["privacy_grants"],
  },
  {
    description: "Participant-submitted match reports during the report period.",
    key: "participant_reports_submitted",
    kind: "count",
    label: "Participant reports submitted",
    sourceTables: ["match_reports"],
  },
  {
    description: "Concierge appeals requested during the report period.",
    key: "concierge_appeals_requested",
    kind: "count",
    label: "Concierge appeals requested",
    sourceTables: ["match_concierge_requests"],
  },
  {
    description: "Agreement evidence items reaching reviewed or disputed outcomes during the report period.",
    key: "agreement_evidence_reviewed",
    kind: "count",
    label: "Agreement evidence reviewed",
    sourceTables: ["agreement_evidence_items"],
  },
  {
    description: "Open unresolved agreement disputes at report generation time.",
    key: "unresolved_disputes_current",
    kind: "count",
    label: "Unresolved disputes",
    sourceTables: ["agreement_review_cases"],
  },
  {
    description: "Median elapsed time from concierge request creation to operator review.",
    key: "median_concierge_review_hours",
    kind: "median_hours",
    label: "Median concierge review time",
    sourceTables: ["match_concierge_requests"],
  },
  {
    description: "Median elapsed time from agreement review-case opening to reviewed outcome.",
    key: "median_agreement_review_hours",
    kind: "median_hours",
    label: "Median agreement review time",
    sourceTables: ["agreement_review_cases"],
  },
  {
    description: "Share of reviewed concierge requests resolved before their SLA due time.",
    key: "concierge_sla_attainment_percent",
    kind: "percent",
    label: "Concierge SLA attainment",
    sourceTables: ["match_concierge_requests"],
  },
];

const PRIVACY_RULES = [
  "Publish aggregate counts, medians, and percentages only; no ids, emails, names, profile text, report bodies, source notes, or exact wishes.",
  "Suppress nonzero counts and derived metrics when the sample is below the minimum public count.",
  "Keep the report useful for trust and operations, not for ranking users, counterparties, or moral views.",
  "When live aggregate data is unavailable, publish the contract and fallback status rather than inventing numbers.",
] as const;

function formatQuarterLabel(start: Date) {
  const quarter = Math.floor(start.getUTCMonth() / 3) + 1;

  return `${start.getUTCFullYear()} Q${quarter}`;
}

export function getMoralTradeTransparencyReportPeriod(now = new Date()) {
  const quarterStartMonth = Math.floor(now.getUTCMonth() / 3) * 3;
  const start = new Date(Date.UTC(now.getUTCFullYear(), quarterStartMonth, 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), quarterStartMonth + 3, 1));

  return {
    end,
    label: formatQuarterLabel(start),
    start,
  };
}

export function getMoralTradeTransparencyReportContract(): MoralTradeTransparencyReportContract {
  return {
    contractTests: [...CONTRACT_TESTS],
    metricDefinitions: METRIC_DEFINITIONS,
    minimumPublicCount: MORAL_TRADE_TRANSPARENCY_MIN_PUBLIC_COUNT,
    privacyRules: [...PRIVACY_RULES],
    publicationCadence: "quarterly",
    purpose:
      "Publish count-only, thresholded trust and review metrics so participants can inspect safety, disclosure, appeals, and operator throughput without exposing private cases.",
    version: MORAL_TRADE_TRANSPARENCY_REPORT_VERSION,
  };
}

function formatMetricValue(kind: MoralTradeTransparencyMetricKind, value: number) {
  if (kind === "percent") {
    return `${Math.round(value)}%`;
  }

  if (kind === "median_hours") {
    return `${Math.round(value * 10) / 10}h`;
  }

  return new Intl.NumberFormat("en-US").format(value);
}

function shouldSuppressMetric(
  definition: MoralTradeTransparencyMetricDefinition,
  value: number,
  sampleSize: number,
) {
  if (value === 0 && definition.kind === "count") {
    return false;
  }

  return sampleSize < MORAL_TRADE_TRANSPARENCY_MIN_PUBLIC_COUNT;
}

export function buildMoralTradeTransparencyReportSnapshot({
  generatedAt = new Date().toISOString(),
  metricErrors = [],
  metricInputs,
  period = getMoralTradeTransparencyReportPeriod(new Date(generatedAt)),
  reportMode,
}: {
  generatedAt?: string;
  metricErrors?: string[];
  metricInputs: MoralTradeTransparencyMetricInput[];
  period?: ReturnType<typeof getMoralTradeTransparencyReportPeriod>;
  reportMode: MoralTradeTransparencyReportSnapshot["reportMode"];
}): MoralTradeTransparencyReportSnapshot {
  const metricInputMap = new Map(metricInputs.map((metric) => [metric.key, metric]));
  const metrics = METRIC_DEFINITIONS.map((definition) => {
    const metric = metricInputMap.get(definition.key) ?? { key: definition.key, value: 0 };
    const sampleSize = metric.sampleSize ?? metric.value;
    const suppressed = shouldSuppressMetric(definition, metric.value, sampleSize);

    return {
      ...definition,
      displayValue: suppressed
        ? `Below publication threshold (${MORAL_TRADE_TRANSPARENCY_MIN_PUBLIC_COUNT})`
        : formatMetricValue(definition.kind, metric.value),
      publishedValue: suppressed ? null : metric.value,
      sampleSize,
      suppressed,
      suppressionReason: suppressed
        ? `Sample size ${sampleSize} is below the public reporting threshold.`
        : null,
    };
  });

  return {
    generatedAt,
    metricErrors,
    metrics,
    periodEnd: period.end.toISOString(),
    periodLabel: period.label,
    periodStart: period.start.toISOString(),
    privacyNote:
      "This report is aggregate-only. It intentionally excludes participant ids, profile text, exact wishes, contact details, report bodies, source notes, and private evidence artifacts.",
    reportMode,
    version: MORAL_TRADE_TRANSPARENCY_REPORT_VERSION,
  };
}

export function validateMoralTradeTransparencyReportContract(
  contract: MoralTradeTransparencyReportContract = getMoralTradeTransparencyReportContract(),
): MoralTradeTransparencyReportValidation {
  const metricKeys = contract.metricDefinitions.map((metric) => metric.key);
  const blockers = [
    ...REQUIRED_METRIC_KEYS.filter((key) => !metricKeys.includes(key)).map(
      (key) => `missing_metric:${key}`,
    ),
  ];

  if (contract.minimumPublicCount < 3) {
    blockers.push("minimum_public_count_too_low");
  }

  if (!contract.privacyRules.some((rule) => /no ids, emails, names/i.test(rule))) {
    blockers.push("private_field_exclusion_missing");
  }

  if (!contract.privacyRules.some((rule) => /Suppress nonzero counts/i.test(rule))) {
    blockers.push("small_sample_suppression_missing");
  }

  if (!contract.contractTests.includes("transparency_report_threshold_suppression")) {
    blockers.push("threshold_suppression_test_missing");
  }

  if (!contract.contractTests.includes("transparency_report_metric_source_schema_audit")) {
    blockers.push("metric_source_schema_audit_test_missing");
  }

  return {
    blockers,
    contractVersion: MORAL_TRADE_TRANSPARENCY_REPORT_VERSION,
    status: blockers.length ? "fail" : "pass",
    validatorName: "moral-trade-transparency-report",
    validatorVersion: MORAL_TRADE_TRANSPARENCY_REPORT_VALIDATOR_VERSION,
  };
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function auditMoralTradeTransparencyMetricSourceTables({
  contract = getMoralTradeTransparencyReportContract(),
  schemaSql,
}: {
  contract?: MoralTradeTransparencyReportContract;
  schemaSql: string;
}): MoralTradeTransparencySourceTableAudit {
  const checkedTables = Array.from(
    new Set(contract.metricDefinitions.flatMap((metric) => metric.sourceTables)),
  ).sort();
  const missingTables = checkedTables.filter((table) => {
    const tablePattern = new RegExp(
      `create table(?: if not exists)? public\\.${escapeRegExp(table)}\\b`,
      "i",
    );

    return !tablePattern.test(schemaSql);
  });

  return {
    checkedTables,
    missingTables,
    status: missingTables.length ? "fail" : "pass",
    validatorName: "moral-trade-transparency-source-tables",
  };
}

export function validateMoralTradeTransparencyReportSnapshot(
  snapshot: MoralTradeTransparencyReportSnapshot,
): MoralTradeTransparencyReportValidation {
  const metricKeys = snapshot.metrics.map((metric) => metric.key);
  const blockers = REQUIRED_METRIC_KEYS.filter((key) => !metricKeys.includes(key)).map(
    (key) => `snapshot_missing_metric:${key}`,
  );

  for (const metric of snapshot.metrics) {
    if (
      metric.sampleSize > 0 &&
      metric.sampleSize < MORAL_TRADE_TRANSPARENCY_MIN_PUBLIC_COUNT &&
      !metric.suppressed
    ) {
      blockers.push(`small_sample_not_suppressed:${metric.key}`);
    }

    if (/profile_id|reporter_profile_id|requester_profile_id|details|notes|summary/i.test(
      JSON.stringify(metric),
    )) {
      blockers.push(`private_field_leak:${metric.key}`);
    }
  }

  return {
    blockers,
    contractVersion: MORAL_TRADE_TRANSPARENCY_REPORT_VERSION,
    status: blockers.length ? "fail" : "pass",
    validatorName: "moral-trade-transparency-report",
    validatorVersion: MORAL_TRADE_TRANSPARENCY_REPORT_VALIDATOR_VERSION,
  };
}

function median(values: number[]) {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);

  if (!sorted.length) {
    return 0;
  }

  const mid = Math.floor(sorted.length / 2);

  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

async function countRows({
  apply,
  label,
  supabase,
}: {
  apply?: (query: any) => any;
  label: string;
  supabase: SupabaseServiceAny;
}) {
  let query = supabase.from(label).select("id", { count: "exact", head: true });

  if (apply) {
    query = apply(query);
  }

  const { count, error } = await query;

  if (error) {
    throw new Error(`${label}:${error.message}`);
  }

  return count ?? 0;
}

function periodFilter(period: ReturnType<typeof getMoralTradeTransparencyReportPeriod>, column = "created_at") {
  return (query: any) => query.gte(column, period.start.toISOString()).lt(column, period.end.toISOString());
}

async function loadReviewHourMetrics({
  period,
  supabase,
}: {
  period: ReturnType<typeof getMoralTradeTransparencyReportPeriod>;
  supabase: SupabaseServiceAny;
}) {
  const conciergeRows = await supabase
    .from("match_concierge_requests")
    .select("created_at, reviewed_at, sla_due_at")
    .not("reviewed_at", "is", null)
    .gte("reviewed_at", period.start.toISOString())
    .lt("reviewed_at", period.end.toISOString())
    .limit(1000);
  const agreementRows = await supabase
    .from("agreement_review_cases")
    .select("created_at, reviewed_at")
    .not("reviewed_at", "is", null)
    .gte("reviewed_at", period.start.toISOString())
    .lt("reviewed_at", period.end.toISOString())
    .limit(1000);

  if (conciergeRows.error) {
    throw new Error(`match_concierge_requests:${conciergeRows.error.message}`);
  }

  if (agreementRows.error) {
    throw new Error(`agreement_review_cases:${agreementRows.error.message}`);
  }

  const conciergeDurations = (conciergeRows.data ?? []).flatMap((row: any) => {
    const createdAt = Date.parse(row.created_at ?? "");
    const reviewedAt = Date.parse(row.reviewed_at ?? "");

    return Number.isFinite(createdAt) && Number.isFinite(reviewedAt)
      ? [(reviewedAt - createdAt) / (60 * 60 * 1000)]
      : [];
  });
  const agreementDurations = (agreementRows.data ?? []).flatMap((row: any) => {
    const createdAt = Date.parse(row.created_at ?? "");
    const reviewedAt = Date.parse(row.reviewed_at ?? "");

    return Number.isFinite(createdAt) && Number.isFinite(reviewedAt)
      ? [(reviewedAt - createdAt) / (60 * 60 * 1000)]
      : [];
  });
  const conciergeSlaRows = (conciergeRows.data ?? []).filter((row: any) => {
    const reviewedAt = Date.parse(row.reviewed_at ?? "");
    const slaDueAt = Date.parse(row.sla_due_at ?? "");

    return Number.isFinite(reviewedAt) && Number.isFinite(slaDueAt);
  });
  const slaMetCount = conciergeSlaRows.filter(
    (row: any) => Date.parse(row.reviewed_at) <= Date.parse(row.sla_due_at),
  ).length;

  return {
    agreementDurations,
    conciergeDurations,
    conciergeSlaSampleSize: conciergeSlaRows.length,
    conciergeSlaValue: conciergeSlaRows.length
      ? (slaMetCount / conciergeSlaRows.length) * 100
      : 0,
  };
}

export async function loadMoralTradeTransparencyReportSnapshot(now = new Date()) {
  const period = getMoralTradeTransparencyReportPeriod(now);

  if (!hasSupabaseEnv() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return buildMoralTradeTransparencyReportSnapshot({
      generatedAt: now.toISOString(),
      metricErrors: ["live_aggregate_source_unavailable"],
      metricInputs: [],
      period,
      reportMode: "contract_only",
    });
  }

  const supabase = createServiceClient() as SupabaseServiceAny;
  const metricErrors: string[] = [];

  async function safeCount(input: Parameters<typeof countRows>[0]) {
    try {
      return await countRows(input);
    } catch (error) {
      metricErrors.push(error instanceof Error ? error.message : `count_failed:${input.label}`);
      return 0;
    }
  }

  const [
    reviewedMatches,
    declinedIntros,
    blockedWishProfiles,
    blockedDonationOffsets,
    disclosureGrants,
    reportsSubmitted,
    appealsRequested,
    opportunityBriefs,
    opportunityBriefOpens,
    opportunityFeedback,
    opportunityDismissals,
    opportunityDeferrals,
    opportunityInterest,
    introPackets,
    evidenceReviewed,
    unresolvedDisputes,
    reviewHourMetrics,
  ] = await Promise.all([
    safeCount({
      apply: (query) =>
        periodFilter(period, "updated_at")(query).in("status", [
          "dismissed",
          "introduced",
          "archived",
        ]),
      label: "match_suggestions",
      supabase,
    }),
    safeCount({
      apply: (query) => periodFilter(period, "updated_at")(query).eq("status", "declined"),
      label: "match_concierge_requests",
      supabase,
    }),
    safeCount({
      apply: (query) => query.in("safety_status", ["flagged", "blocked"]),
      label: "wish_profiles",
      supabase,
    }),
    safeCount({
      apply: (query) => query.in("moderation_status", ["flagged", "blocked"]),
      label: "donation_offset_offers",
      supabase,
    }),
    safeCount({
      apply: (query) => periodFilter(period)(query).eq("status", "granted"),
      label: "privacy_grants",
      supabase,
    }),
    safeCount({
      apply: periodFilter(period),
      label: "match_reports",
      supabase,
    }),
    safeCount({
      apply: (query) =>
        query
          .not("appealed_at", "is", null)
          .gte("appealed_at", period.start.toISOString())
          .lt("appealed_at", period.end.toISOString()),
      label: "match_concierge_requests",
      supabase,
    }),
    safeCount({
      apply: periodFilter(period),
      label: "background_opportunity_briefs",
      supabase,
    }),
    safeCount({
      apply: (query) =>
        periodFilter(period, "seen_at")(query).not("seen_at", "is", null),
      label: "background_opportunity_briefs",
      supabase,
    }),
    safeCount({
      apply: periodFilter(period, "updated_at"),
      label: "background_match_feedback",
      supabase,
    }),
    safeCount({
      apply: (query) => periodFilter(period, "updated_at")(query).eq("outcome", "dismissed"),
      label: "background_match_feedback",
      supabase,
    }),
    safeCount({
      apply: (query) => periodFilter(period, "updated_at")(query).eq("outcome", "maybe_later"),
      label: "background_match_feedback",
      supabase,
    }),
    safeCount({
      apply: (query) => periodFilter(period, "updated_at")(query).eq("outcome", "interested"),
      label: "background_match_feedback",
      supabase,
    }),
    safeCount({
      apply: periodFilter(period),
      label: "background_intro_packets",
      supabase,
    }),
    safeCount({
      apply: (query) =>
        periodFilter(period, "updated_at")(query).in("status", [
          "reviewed_complete",
          "disputed_unresolved",
        ]),
      label: "agreement_evidence_items",
      supabase,
    }),
    safeCount({
      apply: (query) => query.eq("status", "disputed_unresolved"),
      label: "agreement_review_cases",
      supabase,
    }),
    loadReviewHourMetrics({ period, supabase }).catch((error) => {
      metricErrors.push(error instanceof Error ? error.message : "review_hour_metrics_failed");

      return {
        agreementDurations: [],
        conciergeDurations: [],
        conciergeSlaSampleSize: 0,
        conciergeSlaValue: 0,
      };
    }),
  ]);

  return buildMoralTradeTransparencyReportSnapshot({
    generatedAt: now.toISOString(),
    metricErrors,
    metricInputs: [
      { key: "reviewed_match_suggestions", value: reviewedMatches },
      { key: "opportunity_briefs_delivered", value: opportunityBriefs },
      { key: "opportunity_briefs_opened", value: opportunityBriefOpens },
      { key: "opportunity_feedback_submitted", value: opportunityFeedback },
      { key: "opportunity_briefs_dismissed", value: opportunityDismissals },
      { key: "opportunity_briefs_deferred", value: opportunityDeferrals },
      { key: "opportunity_interest_marked", value: opportunityInterest },
      { key: "intro_packets_created", value: introPackets },
      { key: "declined_intro_requests", value: declinedIntros },
      {
        key: "blocked_safety_records",
        value: blockedWishProfiles + blockedDonationOffsets,
      },
      { key: "disclosure_grants_created", value: disclosureGrants },
      { key: "participant_reports_submitted", value: reportsSubmitted },
      { key: "concierge_appeals_requested", value: appealsRequested },
      { key: "agreement_evidence_reviewed", value: evidenceReviewed },
      { key: "unresolved_disputes_current", value: unresolvedDisputes },
      {
        key: "median_concierge_review_hours",
        sampleSize: reviewHourMetrics.conciergeDurations.length,
        value: median(reviewHourMetrics.conciergeDurations),
      },
      {
        key: "median_agreement_review_hours",
        sampleSize: reviewHourMetrics.agreementDurations.length,
        value: median(reviewHourMetrics.agreementDurations),
      },
      {
        key: "concierge_sla_attainment_percent",
        sampleSize: reviewHourMetrics.conciergeSlaSampleSize,
        value: reviewHourMetrics.conciergeSlaValue,
      },
    ],
    period,
    reportMode: "live_aggregate",
  });
}
