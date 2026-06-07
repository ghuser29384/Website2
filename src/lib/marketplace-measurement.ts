import type { FunnelEventType } from "@/lib/growth";
import type { PublicOffersCollectionPayload } from "@/lib/public-offers";

export const MARKETPLACE_MEASUREMENT_VERSION =
  "marketplace-measurement-v0.1-2026-06";
export const MARKETPLACE_MEASUREMENT_VALIDATOR_VERSION =
  "marketplace-measurement-validator-v0.1";
export const MARKETPLACE_METRIC_MIN_PUBLIC_COUNT = 3;

export const MARKETPLACE_MEASUREMENT_FUNNEL_EVENTS = [
  "marketplace_tab_viewed",
  "marketplace_filter_applied",
  "marketplace_seed_template_selected",
  "marketplace_create_from_template_started",
] as const satisfies readonly FunnelEventType[];

export const MARKETPLACE_KPI_KEYS = [
  "live_offer_count",
  "reviewable_offer_count",
  "completed_agreement_count",
  "common_ground_budget_activation_rate",
  "common_ground_budget_project_set_reconfirmation_rate",
  "weak_support_to_counted_dollar_conversion",
  "strong_support_to_counted_dollar_conversion",
  "threshold_clear_rate",
  "average_active_clusters_per_cleared_project",
  "sponsor_leverage_ratio",
  "failure_bonus_utilization_rate",
  "time_from_budget_activation_to_counted_contribution",
  "time_from_counted_contribution_to_payout_release",
  "donor_retention_next_round",
  "share_of_projects_with_dissent_triggered_review",
  "duplicate_identity_flags",
  "reviewer_overturns",
  "reviewer_quality_audit_fail_rate",
  "inter_reviewer_disagreement_rate",
  "review_default_approval_block_count",
  "user_safety_report_open_count",
  "contact_consent_violation_block_count",
  "blocked_user_contact_attempt_count",
  "content_moderation_block_count",
  "content_moderation_false_positive_appeal_rate",
  "account_security_step_up_failure_count",
  "account_takeover_risk_block_count",
  "backup_recovery_checkpoint_missing_block_count",
  "backup_restore_test_failure_count",
  "deployment_config_drift_block_count",
  "unapproved_build_deployment_block_count",
  "schema_migration_dry_run_failure_count",
  "schema_migration_record_count_mismatch_block_count",
  "demo_data_live_mix_block_count",
  "test_mode_provider_event_block_count",
  "environment_data_promotion_block_count",
  "user_facing_status_missing_block_count",
  "opaque_blocker_support_contact_rate",
  "status_next_action_completion_rate",
  "status_copy_privacy_leakage_target_zero",
  "blocked_project_precision",
  "anti_threat_false_positive_rate",
  "challenge_window_reopen_rate",
  "privacy_leakage_incidents_target_zero",
  "false_match_rate",
  "cleared_trade_agreement_count",
  "participant_surplus_confirmation_rate",
  "privacy_grant_missing_block_count",
  "privacy_access_log_count",
  "impact_claim_review_block_count",
  "transfer_as_impact_claim_block_count",
  "participant_confirmation_expired_block_count",
  "participant_confirmation_supersession_count",
  "renewed_confirmation_completion_rate",
  "consent_quality_failure_block_count",
] as const;

export type MarketplaceKpiKey = (typeof MARKETPLACE_KPI_KEYS)[number];
export type MarketplaceKpiKind =
  | "average"
  | "count"
  | "median_hours"
  | "rate_bps"
  | "ratio_bps";
export type MarketplaceKpiStatus = "published" | "suppressed" | "contract_only";

export interface MarketplaceMeasurementEventSpec {
  allowedMetadata: string[];
  decisionUse: string;
  eventType: (typeof MARKETPLACE_MEASUREMENT_FUNNEL_EVENTS)[number];
  source: "browser_funnel";
}

export interface MarketplaceKpiDefinition {
  description: string;
  key: MarketplaceKpiKey;
  kind: MarketplaceKpiKind;
  label: string;
  liveMetricEligible: boolean;
  publicMetricReleaseRequired: true;
  sourceTables: string[];
}

export interface MarketplaceKpiInput {
  key: MarketplaceKpiKey;
  sampleSize?: number;
  source: string;
  value: number;
}

export interface MarketplacePublishedKpi extends MarketplaceKpiDefinition {
  displayValue: string;
  publishedValue: number | null;
  sampleSize: number;
  source: string;
  status: MarketplaceKpiStatus;
  suppressionReason: string | null;
}

export interface MarketplaceLiveMetricExclusion {
  count: number;
  includedInLiveMetrics: false;
  reason: string;
  source: "demo" | "rounds" | "seed_templates" | "worked_examples";
}

export interface MarketplaceKpiSnapshot {
  excludedNonLiveInputs: MarketplaceLiveMetricExclusion[];
  generatedAt: string;
  kpis: MarketplacePublishedKpi[];
  minPublicCount: typeof MARKETPLACE_METRIC_MIN_PUBLIC_COUNT;
  privacyNote: string;
  releasePolicy: {
    rule: string;
    smallCellThreshold: typeof MARKETPLACE_METRIC_MIN_PUBLIC_COUNT;
    version: string;
  };
  reportMode: "aggregate" | "contract_only";
  version: typeof MARKETPLACE_MEASUREMENT_VERSION;
}

export interface MarketplaceMeasurementValidation {
  blockers: string[];
  status: "pass" | "fail";
  validatorName: "marketplace-measurement";
  validatorVersion: typeof MARKETPLACE_MEASUREMENT_VALIDATOR_VERSION;
}

const MARKETPLACE_MEASUREMENT_EVENT_SPECS: MarketplaceMeasurementEventSpec[] = [
  {
    allowedMetadata: [
      "marketplaceTab",
      "queryLengthBucket",
      "queryPresent",
      "routeFamily",
      "searchParamKeys",
    ],
    decisionUse:
      "Measure which public marketplace lane visitors inspect without counting demo, rounds, worked examples, or seed templates as live liquidity.",
    eventType: "marketplace_tab_viewed",
    source: "browser_funnel",
  },
  {
    allowedMetadata: [
      "filterKeys",
      "marketplaceTab",
      "queryLengthBucket",
      "queryPresent",
      "routeFamily",
      "searchParamKeys",
    ],
    decisionUse:
      "Find confusing public filters using only parameter keys and query-length buckets, never raw search text.",
    eventType: "marketplace_filter_applied",
    source: "browser_funnel",
  },
  {
    allowedMetadata: [
      "liveMetricEligible",
      "routeFamily",
      "template",
      "templateKind",
    ],
    decisionUse:
      "Track which reviewed seed templates help visitors start drafts while explicitly excluding templates from live offer metrics.",
    eventType: "marketplace_seed_template_selected",
    source: "browser_funnel",
  },
  {
    allowedMetadata: [
      "generatedBy",
      "liveMetricEligible",
      "mode",
      "routeFamily",
      "template",
      "templateKind",
    ],
    decisionUse:
      "Measure template-backed draft starts as reviewable activity, not completed agreements or live volume.",
    eventType: "marketplace_create_from_template_started",
    source: "browser_funnel",
  },
];

const COUNT_KPI_KEYS = new Set<MarketplaceKpiKey>([
  "account_security_step_up_failure_count",
  "account_takeover_risk_block_count",
  "backup_recovery_checkpoint_missing_block_count",
  "backup_restore_test_failure_count",
  "blocked_user_contact_attempt_count",
  "cleared_trade_agreement_count",
  "completed_agreement_count",
  "consent_quality_failure_block_count",
  "contact_consent_violation_block_count",
  "content_moderation_block_count",
  "demo_data_live_mix_block_count",
  "deployment_config_drift_block_count",
  "duplicate_identity_flags",
  "environment_data_promotion_block_count",
  "impact_claim_review_block_count",
  "live_offer_count",
  "participant_confirmation_expired_block_count",
  "participant_confirmation_supersession_count",
  "privacy_access_log_count",
  "privacy_grant_missing_block_count",
  "review_default_approval_block_count",
  "reviewable_offer_count",
  "reviewer_overturns",
  "schema_migration_dry_run_failure_count",
  "schema_migration_record_count_mismatch_block_count",
  "test_mode_provider_event_block_count",
  "transfer_as_impact_claim_block_count",
  "unapproved_build_deployment_block_count",
  "user_facing_status_missing_block_count",
  "user_safety_report_open_count",
]);

const MEDIAN_HOUR_KPI_KEYS = new Set<MarketplaceKpiKey>([
  "time_from_budget_activation_to_counted_contribution",
  "time_from_counted_contribution_to_payout_release",
]);

const AVERAGE_KPI_KEYS = new Set<MarketplaceKpiKey>([
  "average_active_clusters_per_cleared_project",
]);

const RATIO_KPI_KEYS = new Set<MarketplaceKpiKey>(["sponsor_leverage_ratio"]);

const KpiSourceTablesByPrefix: Array<[RegExp, string[]]> = [
  [/^live_offer_count$|^reviewable_offer_count$/, ["public_offer_listings"]],
  [/agreement|participant_confirmation|surplus/, ["cleared_trade_agreements", "participant_confirmation_records"]],
  [/common_ground|support|threshold|project|donor|sponsor|failure_bonus/, ["marketplace_rounds", "matching_clearing_runs"]],
  [/reviewer|review_default/, ["review_decisions", "review_quality_audits"]],
  [/safety|contact|blocked_user|content_moderation/, ["abuse_report_records", "contact_interaction_records"]],
  [/account|takeover/, ["account_security_events"]],
  [/backup|deployment|schema_migration|environment|demo_data|provider_event|user_facing_status/, ["release_gates", "environment_data_isolation_records"]],
  [/privacy/, ["privacy_grants", "privacy_access_logs"]],
  [/impact_claim|transfer_as_impact/, ["impact_claim_records", "payout_milestones"]],
  [/blocked_project|anti_threat|false_match|challenge_window/, ["dispute_cases", "appeal_cases"]],
  [/status_|opaque_blocker/, ["marketplace_state_events"]],
  [/consent_quality|renewed_confirmation/, ["consent_quality_records", "participant_confirmation_records"]],
];

function labelFromKey(key: string) {
  return key
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function kindForKpiKey(key: MarketplaceKpiKey): MarketplaceKpiKind {
  if (COUNT_KPI_KEYS.has(key)) return "count";
  if (MEDIAN_HOUR_KPI_KEYS.has(key)) return "median_hours";
  if (AVERAGE_KPI_KEYS.has(key)) return "average";
  if (RATIO_KPI_KEYS.has(key)) return "ratio_bps";
  return "rate_bps";
}

function sourceTablesForKpiKey(key: MarketplaceKpiKey) {
  return KpiSourceTablesByPrefix.find(([pattern]) => pattern.test(key))?.[1] ?? [
    "marketplace_state_events",
  ];
}

export const MARKETPLACE_KPI_DEFINITIONS: MarketplaceKpiDefinition[] =
  MARKETPLACE_KPI_KEYS.map((key) => ({
    description:
      "Aggregate marketplace KPI subject to public metric release policy, small-cell suppression, and live/demo/template separation.",
    key,
    kind: kindForKpiKey(key),
    label: labelFromKey(key),
    liveMetricEligible: !/^demo_data|^test_mode|^environment_data/.test(key),
    publicMetricReleaseRequired: true,
    sourceTables: sourceTablesForKpiKey(key),
  }));

const MARKETPLACE_PRIVACY_RULES = [
  "Publish marketplace counts, rates, ratios, averages, and medians only after applying the public metric release policy.",
  "Suppress, bucket, or delay nonzero metrics when the sample is below the public threshold or could reveal a rare moral cluster, jurisdiction, exact wish, or sensitive constraint.",
  "Never include ids, emails, names, contact details, raw wishes, private evidence, source notes, receipts, prompts, or counterparty-specific messages in marketplace analytics.",
  "Exclude demo records, worked examples, seed templates, sandbox provider events, and test-mode records from live offer, completed agreement, sponsor leverage, and moral-trade volume metrics unless reviewed for live promotion.",
] as const;

const MARKETPLACE_CONTRACT_TESTS = [
  "marketplace_measurement_event_taxonomy_privacy_safe",
  "marketplace_kpi_required_key_coverage",
  "marketplace_kpi_threshold_suppression",
  "marketplace_live_metric_exclusion",
  "marketplace_snapshot_no_private_fields",
] as const;

const SENSITIVE_TOKEN_PATTERN =
  /(profile_id|user_id|email_address|phone_number|contact_email|contact_phone|raw_wish|wish_text|private_evidence|source_note|receipt_url|prompt_text|counterparty_message)/i;

function formatValue(kind: MarketplaceKpiKind, value: number) {
  if (kind === "rate_bps" || kind === "ratio_bps") {
    return `${Math.round(value) / 100}%`;
  }

  if (kind === "median_hours") {
    return `${Math.round(value * 10) / 10}h`;
  }

  if (kind === "average") {
    return `${Math.round(value * 10) / 10}`;
  }

  return new Intl.NumberFormat("en-US").format(value);
}

function shouldSuppressKpi(definition: MarketplaceKpiDefinition, value: number, sampleSize: number) {
  if (definition.kind === "count" && value === 0) {
    return false;
  }

  return sampleSize > 0 && sampleSize < MARKETPLACE_METRIC_MIN_PUBLIC_COUNT;
}

function buildPublicOfferMetricInputs(
  payload: PublicOffersCollectionPayload,
): MarketplaceKpiInput[] {
  return [
    {
      key: "live_offer_count",
      sampleSize: payload.meta.liveOfferCount,
      source: "public_offers_api",
      value: payload.meta.liveOfferCount,
    },
    {
      key: "reviewable_offer_count",
      sampleSize: payload.meta.liveOfferCount,
      source: "public_offers_api",
      value: payload.meta.liveOfferCount,
    },
  ];
}

function buildNonLiveExclusions(
  payload: PublicOffersCollectionPayload | null,
): MarketplaceLiveMetricExclusion[] {
  if (!payload) {
    return [];
  }

  const tabCounts = new Map(
    payload.meta.availableTabs.map((tab) => [tab.value, tab.count]),
  );

  return [
    {
      count: payload.meta.reviewedSeedTemplateCount,
      includedInLiveMetrics: false,
      reason: "Reviewed seed templates are draft scaffolds and cannot count as live offers.",
      source: "seed_templates",
    },
    {
      count: payload.meta.workedExampleCount,
      includedInLiveMetrics: false,
      reason: "Worked examples are educational records and cannot count as live liquidity.",
      source: "worked_examples",
    },
    {
      count: tabCounts.get("rounds") ?? 0,
      includedInLiveMetrics: false,
      reason: "Rounds are no-capture public-good previews until they clear release policy.",
      source: "rounds",
    },
    {
      count: tabCounts.get("demo") ?? 0,
      includedInLiveMetrics: false,
      reason: "Demo records stay environment-isolated from live marketplace metrics.",
      source: "demo",
    },
  ];
}

export function getMarketplaceMeasurementEventSpecs() {
  return MARKETPLACE_MEASUREMENT_EVENT_SPECS.map((spec) => ({
    ...spec,
    allowedMetadata: [...spec.allowedMetadata],
  }));
}

export function getMarketplaceMeasurementContract() {
  return {
    contractTests: [...MARKETPLACE_CONTRACT_TESTS],
    eventSpecs: getMarketplaceMeasurementEventSpecs(),
    kpiDefinitions: MARKETPLACE_KPI_DEFINITIONS.map((definition) => ({
      ...definition,
      sourceTables: [...definition.sourceTables],
    })),
    minimumPublicCount: MARKETPLACE_METRIC_MIN_PUBLIC_COUNT,
    privacyRules: [...MARKETPLACE_PRIVACY_RULES],
    purpose:
      "Measure marketplace liquidity, review throughput, public-good activation, safety blockers, and release readiness without exposing private wishes or inflating live metrics with demo/template records.",
    version: MARKETPLACE_MEASUREMENT_VERSION,
  };
}

export function buildMarketplaceKpiSnapshot({
  generatedAt = new Date().toISOString(),
  metricInputs = [],
  publicOffersPayload = null,
}: {
  generatedAt?: string;
  metricInputs?: MarketplaceKpiInput[];
  publicOffersPayload?: PublicOffersCollectionPayload | null;
} = {}): MarketplaceKpiSnapshot {
  const inputs = new Map<MarketplaceKpiKey, MarketplaceKpiInput>();

  if (publicOffersPayload) {
    buildPublicOfferMetricInputs(publicOffersPayload).forEach((input) => {
      inputs.set(input.key, input);
    });
  }

  metricInputs.forEach((input) => {
    inputs.set(input.key, input);
  });

  const kpis = MARKETPLACE_KPI_DEFINITIONS.map((definition) => {
    const input = inputs.get(definition.key);

    if (!input) {
      return {
        ...definition,
        displayValue: "Not yet instrumented for this release stage",
        publishedValue: null,
        sampleSize: 0,
        source: "contract_only",
        status: "contract_only" as const,
        suppressionReason: "No aggregate input is wired for this KPI in the current release stage.",
      };
    }

    const sampleSize = input.sampleSize ?? input.value;
    const suppressed = shouldSuppressKpi(definition, input.value, sampleSize);

    return {
      ...definition,
      displayValue: suppressed
        ? `Below publication threshold (${MARKETPLACE_METRIC_MIN_PUBLIC_COUNT})`
        : formatValue(definition.kind, input.value),
      publishedValue: suppressed ? null : input.value,
      sampleSize,
      source: input.source,
      status: suppressed ? ("suppressed" as const) : ("published" as const),
      suppressionReason: suppressed
        ? `Sample size ${sampleSize} is below the public reporting threshold.`
        : null,
    };
  });

  return {
    excludedNonLiveInputs: buildNonLiveExclusions(publicOffersPayload),
    generatedAt,
    kpis,
    minPublicCount: MARKETPLACE_METRIC_MIN_PUBLIC_COUNT,
    privacyNote:
      "Marketplace KPI snapshots are aggregate-only. They exclude ids, names, contact details, raw wishes, source notes, private evidence, receipts, prompts, and counterparty-specific messages.",
    releasePolicy: {
      rule:
        "Apply public metric release policy before publication; suppress small cells and exclude non-live/demo/template records from live metrics.",
      smallCellThreshold: MARKETPLACE_METRIC_MIN_PUBLIC_COUNT,
      version: "public-metric-release-policy-v0.1",
    },
    reportMode: publicOffersPayload || metricInputs.length ? "aggregate" : "contract_only",
    version: MARKETPLACE_MEASUREMENT_VERSION,
  };
}

function findDuplicateStrings(values: readonly string[]) {
  return values.filter((value, index) => values.indexOf(value) !== index);
}

export function validateMarketplaceMeasurementContract(): MarketplaceMeasurementValidation {
  const contract = getMarketplaceMeasurementContract();
  const kpiKeys = contract.kpiDefinitions.map((definition) => definition.key);
  const eventTypes = contract.eventSpecs.map((spec) => spec.eventType);
  const metadataKeys = contract.eventSpecs.flatMap((spec) => spec.allowedMetadata);
  const blockers = [
    ...MARKETPLACE_KPI_KEYS.filter((key) => !kpiKeys.includes(key)).map(
      (key) => `missing_kpi:${key}`,
    ),
    ...MARKETPLACE_MEASUREMENT_FUNNEL_EVENTS.filter((eventType) => !eventTypes.includes(eventType)).map(
      (eventType) => `missing_event:${eventType}`,
    ),
    ...findDuplicateStrings(kpiKeys).map((key) => `duplicate_kpi:${key}`),
    ...findDuplicateStrings(eventTypes).map((eventType) => `duplicate_event:${eventType}`),
  ];

  if (contract.minimumPublicCount < 3) {
    blockers.push("minimum_public_count_too_low");
  }

  if (metadataKeys.some((key) => SENSITIVE_TOKEN_PATTERN.test(key))) {
    blockers.push("sensitive_event_metadata_key");
  }

  if (!contract.privacyRules.some((rule) => /raw wishes, private evidence, source notes/i.test(rule))) {
    blockers.push("private_field_exclusion_missing");
  }

  if (!contract.privacyRules.some((rule) => /Suppress, bucket, or delay/i.test(rule))) {
    blockers.push("suppression_rule_missing");
  }

  if (!contract.contractTests.includes("marketplace_live_metric_exclusion")) {
    blockers.push("live_metric_exclusion_test_missing");
  }

  return {
    blockers,
    status: blockers.length ? "fail" : "pass",
    validatorName: "marketplace-measurement",
    validatorVersion: MARKETPLACE_MEASUREMENT_VALIDATOR_VERSION,
  };
}

export function validateMarketplaceKpiSnapshot(
  snapshot: MarketplaceKpiSnapshot,
): MarketplaceMeasurementValidation {
  const metricKeys = snapshot.kpis.map((metric) => metric.key);
  const blockers = MARKETPLACE_KPI_KEYS.filter((key) => !metricKeys.includes(key)).map(
    (key) => `snapshot_missing_kpi:${key}`,
  );

  for (const metric of snapshot.kpis) {
    if (
      metric.sampleSize > 0 &&
      metric.sampleSize < MARKETPLACE_METRIC_MIN_PUBLIC_COUNT &&
      metric.status !== "suppressed"
    ) {
      blockers.push(`small_sample_not_suppressed:${metric.key}`);
    }
  }

  if (snapshot.excludedNonLiveInputs.some((entry) => entry.includedInLiveMetrics !== false)) {
    blockers.push("non_live_input_included_in_live_metrics");
  }

  if (SENSITIVE_TOKEN_PATTERN.test(JSON.stringify(snapshot))) {
    blockers.push("private_field_leak");
  }

  return {
    blockers,
    status: blockers.length ? "fail" : "pass",
    validatorName: "marketplace-measurement",
    validatorVersion: MARKETPLACE_MEASUREMENT_VALIDATOR_VERSION,
  };
}
