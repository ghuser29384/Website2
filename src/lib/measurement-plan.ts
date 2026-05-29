import { FUNNEL_EVENT_TYPES, type FunnelEventType } from "@/lib/growth";

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
    title: "Strip location-bearing URL detail",
    rule:
      "Analytics may keep route paths and coarse referrer paths, but query strings, hashes, raw search text, and UTM detail are sanitized or bucketed before storage.",
  },
  {
    title: "Bucket performance data",
    rule:
      "Web Vitals are recorded as metric name, rating, and value bucket, not raw traces or user-identifying diagnostic detail.",
  },
];

export const MEASUREMENT_BASELINE_ROUTES = [
  "/",
  "/moral-trade",
  "/offers",
  "/offers?view=examples",
  "/cohort",
  "/signup",
  "/login",
  "/background-networking",
  "/wish-registry",
  "/mpgf",
] as const;

export const MEASUREMENT_ROADMAP: MeasurementRoadmapItem[] = [
  {
    title: "Privacy-safe event taxonomy",
    status: "active",
    detail:
      "Record only the approved funnel events and sanitized metadata listed on this page.",
  },
  {
    title: "Core route performance baseline",
    status: "planned",
    detail:
      "Run Lighthouse or PageSpeed-style checks on the home, offers, cohort, signup, login, Moral Trade, private matching, and public-goods routes on mobile and desktop.",
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

export function validateMeasurementPlan() {
  const supportedEvents = new Set<FunnelEventType>(FUNNEL_EVENT_TYPES);
  const invalidEvents = MEASUREMENT_EVENT_SPECS.filter(
    (spec) => !supportedEvents.has(spec.eventType),
  ).map((spec) => spec.eventType);
  const duplicateEvents = getMeasurementEventKeys().filter(
    (eventType, index, events) => events.indexOf(eventType) !== index,
  );
  const sensitiveMetadata = MEASUREMENT_EVENT_SPECS.flatMap((spec) =>
    spec.allowedMetadata
      .filter(isSensitiveMeasurementMetadataKey)
      .map((key) => `${spec.eventType}:${key}`),
  );

  return {
    duplicateEvents,
    invalidEvents,
    sensitiveMetadata,
  };
}
