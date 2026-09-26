import { FUNNEL_EVENT_TYPES, type FunnelEventType } from "@/lib/growth";

import performanceBaselineConfig from "../../config/measurement/public-route-baseline.json";

export type MeasurementStage =
  | "orientation"
  | "activation"
  | "trust"
  | "performance"
  | "public_goods";

export interface MeasurementEventSpec {
  eventType: FunnelEventType;
  stage: MeasurementStage;
  question: string;
  allowedMetadata: string[];
  decisionUse: string;
}

export interface MeasurementGuardrail {
  title: string;
  rule: string;
}

export interface MeasurementRoadmapItem {
  title: string;
  status: "active" | "planned";
  detail: string;
}

export interface MeasurementBaselineDevice {
  key: string;
  label: string;
  userAgent: string;
  viewport: {
    height: number;
    width: number;
  };
}

export interface MeasurementBaselineRoute {
  family: string;
  path: string;
  stage: MeasurementStage;
}

export interface MeasurementPerformanceBaseline {
  baseUrlEnv: string;
  budgets: {
    maxDomContentLoadedMs: number;
    maxLoadMs: number;
    maxScriptTags: number;
    minBodyTextCharacters: number;
  };
  command: string;
  defaultOutputPath: string;
  devices: MeasurementBaselineDevice[];
  outputPathEnv: string;
  publicNonClaims: string[];
  purpose: string;
  requiredChecks: string[];
  routes: MeasurementBaselineRoute[];
  version: string;
}

export const MEASUREMENT_EVENT_SPECS: MeasurementEventSpec[] = [
  {
    eventType: "page_view",
    stage: "orientation",
    question: "Which public routes do visitors reach before choosing a first pilot path?",
    allowedMetadata: ["path", "referrerPath", "navigationType"],
    decisionUse: "Find confusing entry points and improve navigation copy.",
  },
  {
    eventType: "hero_primary_cta_clicked",
    stage: "orientation",
    question: "Do visitors choose the worked-example route before signup pressure?",
    allowedMetadata: ["hrefPath", "label", "routeFamily"],
    decisionUse: "Tune the homepage and primer toward concrete, low-risk examples.",
  },
  {
    eventType: "worked_example_opened",
    stage: "orientation",
    question: "Which examples make the mechanism legible enough to inspect details?",
    allowedMetadata: ["exampleId", "template", "routeFamily"],
    decisionUse: "Prioritize clearer examples and remove misleading ones.",
  },
  {
    eventType: "signup_start",
    stage: "activation",
    question: "Where do visitors begin account creation after seeing the pilot boundaries?",
    allowedMetadata: ["path", "partnerSlug", "primaryGoal"],
    decisionUse: "Detect whether the site asks for accounts too early or from the wrong surfaces.",
  },
  {
    eventType: "signup_complete",
    stage: "activation",
    question: "Can serious participants finish a low-friction account setup?",
    allowedMetadata: ["partnerSlug", "primaryGoal"],
    decisionUse: "Identify account friction before widening the cohort.",
  },
  {
    eventType: "onboarding_complete",
    stage: "activation",
    question: "Do new users choose a role, cause area, and first action?",
    allowedMetadata: ["participantKind", "primaryGoal", "firstAction"],
    decisionUse: "Route new users toward one reviewable action instead of a blank marketplace.",
  },
  {
    eventType: "create_trade_started",
    stage: "activation",
    question: "Do users draft terms after inspecting examples and safety rules?",
    allowedMetadata: ["mode", "template", "generatedBy"],
    decisionUse: "Improve draft scaffolding when users stall before creating terms.",
  },
  {
    eventType: "marketplace_tab_viewed",
    stage: "activation",
    question: "Which public marketplace lane do visitors inspect before creating or cloning terms?",
    allowedMetadata: [
      "marketplaceTab",
      "queryLengthBucket",
      "queryPresent",
      "routeFamily",
      "searchParamKeys",
    ],
    decisionUse:
      "Separate live inventory, reviewed templates, worked examples, demo data, and moral public goods views without counting non-live lanes as liquidity.",
  },
  {
    eventType: "marketplace_filter_applied",
    stage: "activation",
    question: "Which public filter shapes cause users to narrow the marketplace?",
    allowedMetadata: [
      "filterKeys",
      "marketplaceTab",
      "queryLengthBucket",
      "queryPresent",
      "routeFamily",
      "searchParamKeys",
    ],
    decisionUse:
      "Improve filters using only parameter keys and query-length buckets, not raw search text or rare moral attributes.",
  },
  {
    eventType: "marketplace_seed_template_selected",
    stage: "activation",
    question: "Which reviewed seed templates help visitors start a draft?",
    allowedMetadata: [
      "liveMetricEligible",
      "routeFamily",
      "template",
      "templateKind",
    ],
    decisionUse:
      "Invest in seed templates that produce reviewable drafts while excluding them from live offer metrics.",
  },
  {
    eventType: "marketplace_create_from_template_started",
    stage: "activation",
    question: "Do reviewed seed templates become draft starts without implying completed trade volume?",
    allowedMetadata: [
      "generatedBy",
      "liveMetricEligible",
      "mode",
      "routeFamily",
      "template",
      "templateKind",
    ],
    decisionUse:
      "Measure template-backed activation as reviewable activity, not completed agreements or sponsor leverage.",
  },
  {
    eventType: "marketplace_intake_triage_routed",
    stage: "activation",
    question: "Which intake triage route do visitors choose before drafting terms?",
    allowedMetadata: ["intakeRoute", "liveMetricEligible", "routeFamily", "routeEligible"],
    decisionUse:
      "Improve routing with aggregate route buckets while excluding exact wishes, private notes, or contact details.",
  },
  {
    eventType: "marketplace_public_receipt_previewed",
    stage: "activation",
    question: "Do participants preview an opt-in public receipt before publication?",
    allowedMetadata: ["claimKind", "liveMetricEligible", "proofTier", "publicationState", "routeFamily"],
    decisionUse:
      "Measure public receipt interest without publishing receipt content or private evidence by default.",
  },
  {
    eventType: "marketplace_public_receipt_published",
    stage: "activation",
    question: "Do reviewed opt-in public receipts reach publication?",
    allowedMetadata: ["claimKind", "liveMetricEligible", "proofTier", "publicationState", "routeFamily"],
    decisionUse:
      "Count reviewed receipt publication as an aggregate claim-hygiene signal, not platform endorsement.",
  },
  {
    eventType: "marketplace_public_receipt_revoked",
    stage: "trust",
    question: "How often are opt-in public receipts revoked?",
    allowedMetadata: ["claimKind", "liveMetricEligible", "publicationState", "revocationReasonBucket", "routeFamily"],
    decisionUse:
      "Monitor revocation with bucketed reasons while preserving participant privacy.",
  },
  {
    eventType: "marketplace_claim_correction_requested",
    stage: "trust",
    question: "How often do participants request public claim correction?",
    allowedMetadata: ["claimKind", "correctionReasonBucket", "liveMetricEligible", "routeFamily"],
    decisionUse:
      "Find claim-copy issues without storing raw correction text in funnel metadata.",
  },
  {
    eventType: "marketplace_claim_correction_resolved",
    stage: "trust",
    question: "Are public claim corrections resolved cleanly?",
    allowedMetadata: ["claimKind", "correctionReasonBucket", "liveMetricEligible", "resolutionStatus", "routeFamily"],
    decisionUse:
      "Track correction resolution with aggregate status buckets only.",
  },
  {
    eventType: "marketplace_route_simplification_audited",
    stage: "trust",
    question: "Do public marketplace routes pass the simplification audit?",
    allowedMetadata: ["auditStage", "resultStatus", "routeFamily", "screenFamily"],
    decisionUse:
      "Measure route-simplification pass/fail outcomes without recording page text or screenshots.",
  },
  {
    eventType: "marketplace_plain_language_copy_blocked",
    stage: "trust",
    question: "How often does missing plain-language copy block release?",
    allowedMetadata: ["blockKind", "routeFamily", "screenFamily"],
    decisionUse:
      "Find participant-copy omissions using aggregate blocker buckets only.",
  },
  {
    eventType: "marketplace_internal_jargon_primary_copy_blocked",
    stage: "trust",
    question: "How often do internal terms appear in primary participant copy?",
    allowedMetadata: ["blockKind", "routeFamily", "screenFamily"],
    decisionUse:
      "Block internal-control jargon without storing the exact copy string.",
  },
  {
    eventType: "marketplace_signed_out_offset_builder_blocked",
    stage: "activation",
    question: "Does signed-out offset creation avoid dead ends?",
    allowedMetadata: ["blockKind", "resultStatus", "routeFamily", "screenFamily"],
    decisionUse:
      "Repair signed-out offset flows using route and status buckets.",
  },
  {
    eventType: "marketplace_route_fallback_diagnostics_blocked",
    stage: "trust",
    question: "Do route fallback diagnostics stay out of primary copy?",
    allowedMetadata: ["blockKind", "routeFamily", "screenFamily"],
    decisionUse:
      "Count diagnostic-copy blocks without logging diagnostics.",
  },
  {
    eventType: "marketplace_factor_code_primary_copy_blocked",
    stage: "trust",
    question: "Do factor codes or internal enums leak into primary copy?",
    allowedMetadata: ["blockKind", "routeFamily", "screenFamily"],
    decisionUse:
      "Count primary-copy leakage with safe route buckets only.",
  },
  {
    eventType: "marketplace_impact_score_default_surface_blocked",
    stage: "trust",
    question: "Are moral-looking impact-score default surfaces blocked?",
    allowedMetadata: ["blockKind", "routeFamily", "screenFamily"],
    decisionUse:
      "Prevent ranking-like marketplace defaults without recording scores.",
  },
  {
    eventType: "marketplace_advanced_filter_default_expanded_blocked",
    stage: "activation",
    question: "Are advanced filters collapsed by default?",
    allowedMetadata: ["blockKind", "routeFamily", "screenFamily"],
    decisionUse:
      "Count filter-complexity blockers without recording search text.",
  },
  {
    eventType: "marketplace_worked_example_card_overload_blocked",
    stage: "activation",
    question: "Are worked-example cards lightweight by default?",
    allowedMetadata: ["blockKind", "routeFamily", "screenFamily"],
    decisionUse:
      "Track overloaded cards without logging card copy.",
  },
  {
    eventType: "marketplace_long_duration_default_example_blocked",
    stage: "trust",
    question: "Are long-duration pledge defaults blocked?",
    allowedMetadata: ["blockKind", "routeFamily", "screenFamily"],
    decisionUse:
      "Keep micro-pledges as defaults using aggregate blocker counts.",
  },
  {
    eventType: "marketplace_task_card_primary_action_blocked",
    stage: "trust",
    question: "Do task cards keep one primary action?",
    allowedMetadata: ["blockKind", "routeFamily", "screenFamily"],
    decisionUse:
      "Count task-card action ambiguity without storing user choices.",
  },
  {
    eventType: "marketplace_safe_template_default_hidden_fact_blocked",
    stage: "trust",
    question: "Are material safe-template defaults disclosed before lock?",
    allowedMetadata: ["blockKind", "policyArea", "routeFamily", "screenFamily"],
    decisionUse:
      "Track hidden-default blockers by policy area without logging terms.",
  },
  {
    eventType: "marketplace_term_map_inconsistency_blocked",
    stage: "trust",
    question: "Does the participant-facing term map stay stable?",
    allowedMetadata: ["blockKind", "policyArea", "routeFamily", "screenFamily"],
    decisionUse:
      "Count term-map inconsistencies without storing free text.",
  },
  {
    eventType: "marketplace_next_action_corrected",
    stage: "activation",
    question: "How often do next-action labels need correction?",
    allowedMetadata: ["resultStatus", "routeFamily", "screenFamily"],
    decisionUse:
      "Improve participant task flow with aggregate correction rates.",
  },
  {
    eventType: "marketplace_recipient_association_blocked",
    stage: "trust",
    question: "How often does recipient association block publication?",
    allowedMetadata: ["claimKind", "policyArea", "routeFamily"],
    decisionUse:
      "Monitor association review without naming recipients.",
  },
  {
    eventType: "marketplace_causal_wording_blocked",
    stage: "trust",
    question: "How often is stronger causal wording blocked?",
    allowedMetadata: ["claimKind", "policyArea", "routeFamily"],
    decisionUse:
      "Keep receipt wording claim-safe using claim buckets.",
  },
  {
    eventType: "marketplace_personal_contribution_reuse_blocked",
    stage: "trust",
    question: "How often is reused personal contribution blocked?",
    allowedMetadata: ["claimKind", "displayBucket", "routeFamily"],
    decisionUse:
      "Avoid double-counted personal contribution claims without logging donation ids.",
  },
  {
    eventType: "marketplace_net_personal_contribution_displayed",
    stage: "trust",
    question: "Are net personal contribution displays attribution-safe?",
    allowedMetadata: ["claimKind", "displayBucket", "routeFamily"],
    decisionUse:
      "Track whether net-attribution-safe display paths are used.",
  },
  {
    eventType: "marketplace_reimbursement_subsidy_disclosure_blocked",
    stage: "trust",
    question: "How often are reimbursement or subsidy disclosures blocking?",
    allowedMetadata: ["claimKind", "displayBucket", "routeFamily"],
    decisionUse:
      "Improve attribution disclosures without recording amounts or payers.",
  },
  {
    eventType: "marketplace_direct_donation_parity_used",
    stage: "activation",
    question: "How often is direct-donation parity mode used?",
    allowedMetadata: ["parityMode", "routeFamily"],
    decisionUse:
      "Measure opt-in parity use without making it a ranking or priority signal.",
  },
  {
    eventType: "marketplace_direct_donation_parity_non_preference_blocked",
    stage: "trust",
    question: "How often is parity non-preference enforcement blocking?",
    allowedMetadata: ["blockKind", "parityMode", "routeFamily"],
    decisionUse:
      "Ensure parity mode stays opt-in and non-preferential.",
  },
  {
    eventType: "marketplace_sensitive_action_redacted",
    stage: "trust",
    question: "Are sensitive action details redacted from public receipts?",
    allowedMetadata: ["actionKind", "policyArea", "routeFamily"],
    decisionUse:
      "Track redaction outcomes using coarse action buckets.",
  },
  {
    eventType: "marketplace_exact_action_publication_confirmed",
    stage: "trust",
    question: "When exact action publication happens, was separate confirmation present?",
    allowedMetadata: ["actionKind", "policyArea", "routeFamily"],
    decisionUse:
      "Monitor exact-action publication confirmations without logging exact actions.",
  },
  {
    eventType: "marketplace_publication_pressure_reported",
    stage: "trust",
    question: "Are participants reporting pressure to publish receipts?",
    allowedMetadata: ["policyArea", "reasonBucket", "routeFamily"],
    decisionUse:
      "Detect publication pressure with bucketed reasons and no raw report text.",
  },
  {
    eventType: "marketplace_moral_score_language_blocked",
    stage: "trust",
    question: "Is moral-score or platform-endorsement language blocked?",
    allowedMetadata: ["blockKind", "routeFamily", "screenFamily"],
    decisionUse:
      "Prevent moral-status copy without storing the blocked copy.",
  },
  {
    eventType: "marketplace_anti_gamification_blocked",
    stage: "trust",
    question: "Are engagement and reputation mechanics blocked for receipt publication?",
    allowedMetadata: ["blockKind", "routeFamily", "screenFamily"],
    decisionUse:
      "Track likes, boosts, rankings, streaks, and priority blockers as aggregate counts.",
  },
  {
    eventType: "marketplace_publication_as_trade_term_blocked",
    stage: "trust",
    question: "Is public receipt publication blocked as a trade condition?",
    allowedMetadata: ["blockKind", "policyArea", "routeFamily"],
    decisionUse:
      "Ensure publication remains sidecar-only and optional.",
  },
  {
    eventType: "marketplace_verification_status_checked",
    stage: "trust",
    question: "Do public receipt verification handles resolve to safe statuses?",
    allowedMetadata: ["claimKind", "resultStatus", "routeFamily", "visibilityState"],
    decisionUse:
      "Measure verification status checks without storing receipt URLs or handles.",
  },
  {
    eventType: "clone_example_action",
    stage: "activation",
    question: "Which worked examples become editable first actions?",
    allowedMetadata: ["exampleId", "template"],
    decisionUse: "Invest in example formats that produce reviewable drafts.",
  },
  {
    eventType: "wish_profile_started",
    stage: "activation",
    question: "Do users start broad wish previews before requesting private introductions?",
    allowedMetadata: ["causeAreaCount", "fieldCount"],
    decisionUse: "Improve private matching onboarding while keeping exact wishes undisclosed.",
  },
  {
    eventType: "cohort_interest_started",
    stage: "activation",
    question: "Which cohort paths attract people willing to invite one serious counterparty?",
    allowedMetadata: ["partnerSlug", "primaryGoal"],
    decisionUse: "Prioritize cohort pages that create reviewable, consent-gated activity.",
  },
  {
    eventType: "privacy_grant_changed",
    stage: "trust",
    question: "Are people able to understand and change field-level sharing grants?",
    allowedMetadata: ["accessLevel", "fieldCount", "decision"],
    decisionUse: "Improve consent controls and privacy copy.",
  },
  {
    eventType: "detail_request_submitted",
    stage: "trust",
    question: "Do broad previews lead to explicit, consent-gated detail requests?",
    allowedMetadata: ["targetKind", "candidateBucket", "bothConsented"],
    decisionUse: "Measure whether staged disclosure is working without exposing exact wishes.",
  },
  {
    eventType: "detail_request_resolved",
    stage: "trust",
    question: "Can detail requests resolve without pressure or hidden disclosure?",
    allowedMetadata: ["targetKind", "decision", "stage"],
    decisionUse: "Improve resolution states and operator follow-up.",
  },
  {
    eventType: "safety_report_submitted",
    stage: "trust",
    question: "Where do visitors flag coercion, fraud, pressure, or externality concerns?",
    allowedMetadata: ["targetKind", "stage"],
    decisionUse: "Prioritize safety review and public rulebook clarifications.",
  },
  {
    eventType: "match_consent_recorded",
    stage: "trust",
    question: "Do proposed introductions record both-party consent before identity-specific disclosure?",
    allowedMetadata: ["bothConsented", "stage", "hasMatch"],
    decisionUse: "Audit whether the matching workflow remains consent-gated.",
  },
  {
    eventType: "background_scan_run",
    stage: "trust",
    question: "Can operators review broad matching signals without raw private text?",
    allowedMetadata: ["matchesCreated", "candidateBucket", "taskCount"],
    decisionUse: "Monitor operator queue quality, not user surveillance.",
  },
  {
    eventType: "performance_metric_recorded",
    stage: "performance",
    question: "Do core routes stay fast enough for mobile and first-time visitors?",
    allowedMetadata: ["metricName", "metricRating", "metricValueBucket"],
    decisionUse: "Fix LCP, INP, and CLS regressions on the heaviest public routes.",
  },
  {
    eventType: "donation_route_clicked",
    stage: "public_goods",
    question: "Do visitors reach external donation routes from clear non-custodial pages?",
    allowedMetadata: ["targetKind", "hasTargetUrl", "causeAreas"],
    decisionUse: "Improve route clarity without claiming escrow, custody, or tax handling.",
  },
  {
    eventType: "donation_logged",
    stage: "public_goods",
    question: "Can users record external-payment evidence for review?",
    allowedMetadata: ["causeAreas", "stage", "hasSession"],
    decisionUse: "Improve evidence workflows while avoiding payment custody claims.",
  },
  {
    eventType: "evidence_submission_started",
    stage: "public_goods",
    question: "Where do users begin proof submission for commitments or public-good actions?",
    allowedMetadata: ["targetKind", "stage"],
    decisionUse: "Improve proof scaffolding and reviewer triage.",
  },
  {
    eventType: "public_good_action_logged",
    stage: "public_goods",
    question: "Are shared public-good actions becoming reviewable records?",
    allowedMetadata: ["causeAreas", "stage", "taskCount"],
    decisionUse: "Track public-good pilot participation in aggregate.",
  },
];

export const MEASUREMENT_GUARDRAILS: MeasurementGuardrail[] = [
  {
    title: "Measure pilot clarity, not moral worth",
    rule:
      "Funnel events may show whether visitors find the right pilot path; they must not score users, causes, offers, or counterparties by moral value.",
  },
  {
    title: "Keep raw private content out",
    rule:
      "Exact wishes, source notes, private constraints, contact details, emails, receipts, prompts, and counterparty-specific messages are forbidden in analytics payloads.",
  },
  {
    title: "Use aggregate evidence for product decisions",
    rule:
      "Measurement should improve copy, route order, review operations, and performance; it must not create engagement feeds, hidden ranking, or autonomous outreach.",
  },
  {
    title: "Separate live metrics from demos and templates",
    rule:
      "Marketplace analytics may count reviewed seed-template and demo interactions as activation signals, but they must not inflate live offers, completed agreements, sponsor leverage, or moral-trade volume.",
  },
  {
    title: "Strip location-bearing URL detail",
    rule:
      "Analytics may keep route paths and coarse referrer paths, but query strings, hashes, raw search text, and UTM detail are sanitized or bucketed before storage.",
  },
  {
    title: "Bucket performance data",
    rule:
      "Web Vitals are recorded as metric name, rating, and value bucket, not raw traces or user-identifying diagnostic detail.",
  },
  {
    title: "Honor analytics objection",
    rule:
      "If the analytics opt-out cookie is present, optional attribution is cleared and funnel ingestion exits without writing a row; safety, security, payment, and rights-request records remain separately governed.",
  },
];

const REQUIRED_BASELINE_ROUTES = [
  "/",
  "/start",
  "/donate",
  "/offers?view=live",
  "/create",
  "/offsets",
  "/pools",
  "/safety",
  "/evidence",
  "/signup",
  "/login",
  "/background-networking",
  "/mpgf",
  "/status",
] as const;

const REQUIRED_BASELINE_CHECKS = [
  "http_status_ok",
  "main_content_present",
  "nonblank_body",
  "no_framework_overlay",
  "dom_content_loaded_budget",
  "load_budget",
  "script_count_budget",
] as const;

export const MEASUREMENT_PERFORMANCE_BASELINE =
  performanceBaselineConfig as MeasurementPerformanceBaseline;

export const MEASUREMENT_BASELINE_ROUTES =
  MEASUREMENT_PERFORMANCE_BASELINE.routes.map((route) => route.path);

export const MEASUREMENT_ROADMAP: MeasurementRoadmapItem[] = [
  {
    title: "Privacy-safe event taxonomy",
    status: "active",
    detail:
      "Record only the approved funnel events and sanitized metadata listed on this page.",
  },
  {
    title: "Core route performance baseline",
    status: "active",
    detail:
      "Run the public route-baseline command on the home, offers, cohort, signup, login, Moral Trade, private matching, and public-goods routes on mobile and desktop before optimizing.",
  },
  {
    title: "Browser-level analytics objection",
    status: "active",
    detail:
      "Expose an opt-out control that clears the attribution cookie and suppresses optional funnel-event inserts for the current browser.",
  },
  {
    title: "Aggregate search visibility",
    status: "planned",
    detail:
      "Use Search Console only for aggregate query, indexing, and crawl diagnostics; do not merge search-console data into private wish or offer records.",
  },
  {
    title: "Monthly public aggregate",
    status: "planned",
    detail:
      "Publish cohort-scale counts for route clarity, review queues, safety reports, performance health, and disclosure resolution without exposing individual records.",
  },
  {
    title: "Marketplace KPI aggregation",
    status: "active",
    detail:
      "Publish only thresholded marketplace counts, rates, ratios, and medians, with demo records, worked examples, and reviewed seed templates excluded from live metrics.",
  },
];

export function getMeasurementEventKeys() {
  return MEASUREMENT_EVENT_SPECS.map((spec) => spec.eventType);
}

function splitMetadataKeyTokens(key: string) {
  return key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
}

function isSensitiveMeasurementMetadataKey(key: string) {
  const sensitiveTerms = new Set([
    "ask",
    "constraint",
    "contact",
    "counterparty",
    "email",
    "evidence",
    "message",
    "note",
    "phone",
    "private",
    "prompt",
    "raw",
    "receipt",
    "source",
    "text",
    "wish",
  ]);

  return splitMetadataKeyTokens(key).some((token) => sensitiveTerms.has(token));
}

function findDuplicateStrings(values: readonly string[]) {
  return values.filter((value, index) => values.indexOf(value) !== index);
}

export function validateMeasurementPlan() {
  const supportedEvents = new Set<FunnelEventType>(FUNNEL_EVENT_TYPES);
  const invalidEvents = MEASUREMENT_EVENT_SPECS.filter(
    (spec) => !supportedEvents.has(spec.eventType),
  ).map((spec) => spec.eventType);
  const duplicateEvents = findDuplicateStrings(getMeasurementEventKeys());
  const sensitiveMetadata = MEASUREMENT_EVENT_SPECS.flatMap((spec) =>
    spec.allowedMetadata
      .filter(isSensitiveMeasurementMetadataKey)
      .map((key) => `${spec.eventType}:${key}`),
  );
  const baselineRoutePaths = MEASUREMENT_PERFORMANCE_BASELINE.routes.map(
    (route) => route.path,
  );
  const baselineChecks = new Set(MEASUREMENT_PERFORMANCE_BASELINE.requiredChecks);
  const duplicateBaselineRoutes = findDuplicateStrings(baselineRoutePaths);
  const missingBaselineRoutes = REQUIRED_BASELINE_ROUTES.filter(
    (route) => !baselineRoutePaths.includes(route),
  );
  const missingBaselineChecks = REQUIRED_BASELINE_CHECKS.filter(
    (check) => !baselineChecks.has(check),
  );
  const invalidBaselineDevices = MEASUREMENT_PERFORMANCE_BASELINE.devices
    .filter(
      (device) =>
        !device.key ||
        !device.label ||
        !device.userAgent ||
        device.viewport.width < 320 ||
        device.viewport.height < 480,
    )
    .map((device) => device.key || "missing-device-key");
  const invalidBaselineBudgets = Object.entries(
    MEASUREMENT_PERFORMANCE_BASELINE.budgets,
  )
    .filter(([, value]) => typeof value !== "number" || value <= 0)
    .map(([key]) => key);
  const baselineCommandErrors = [
    MEASUREMENT_PERFORMANCE_BASELINE.command.includes("npm run measure:routes")
      ? null
      : "missing-measure-routes-command",
    MEASUREMENT_PERFORMANCE_BASELINE.baseUrlEnv === "MORALTRADE_BASE_URL"
      ? null
      : "missing-base-url-env",
    MEASUREMENT_PERFORMANCE_BASELINE.outputPathEnv === "MORALTRADE_BASELINE_OUTPUT"
      ? null
      : "missing-output-path-env",
  ].filter((entry): entry is string => Boolean(entry));

  return {
    baselineCommandErrors,
    duplicateEvents,
    duplicateBaselineRoutes,
    invalidBaselineBudgets,
    invalidBaselineDevices,
    invalidEvents,
    missingBaselineChecks,
    missingBaselineRoutes,
    sensitiveMetadata,
  };
}
