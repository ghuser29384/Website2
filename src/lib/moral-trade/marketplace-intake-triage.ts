import { MARKETPLACE_PUBLIC_GOODS_BOUNDARY } from "./marketplace-boundary";

export const MARKETPLACE_INTAKE_TRIAGE_VERSION =
  "moral-trade-marketplace-intake-triage-v0.2-2026-06";
export const MARKETPLACE_INTAKE_TRIAGE_CONTRACT_VERSION =
  "moral-trade-marketplace-intake-triage-contract-v0.2-2026-06";
export const MARKETPLACE_INTAKE_TRIAGE_CONTRACT_VALIDATOR_VERSION =
  "moral-trade-marketplace-intake-triage-contract-validator-v0.2";

export type MarketplaceIntakeRouteKey =
  | "donation_offset"
  | "bounded_pledge_swap"
  | "ordinary_donation"
  | "ordinary_matching_or_cofunding"
  | "ordinary_procurement_or_service"
  | "self_offset_bookkeeping"
  | "public_goods_module"
  | "background_networking_request"
  | "prohibited_or_unsupported";

export type MarketplaceIntakeRouteKind =
  | "non_public_goods_marketplace_preview"
  | "safe_external_path"
  | "manual_review_or_blocked";

export type MarketplaceIntakeInitialRoute =
  | "non_public_goods_moral_trade_candidate"
  | "ordinary_donation_or_matching"
  | "ordinary_procurement_or_service"
  | "self_offset_or_personal_bookkeeping"
  | "public_goods_candidate"
  | "background_networking_request"
  | "prohibited_or_unsupported"
  | "unclear_manual_review";

export type MarketplaceIntakeProhibitedReviewState =
  | "not_required"
  | "under_review"
  | "blocked"
  | "manual_review"
  | "superseded";

export type MarketplaceIntakeCorrectionState =
  | "not_requested"
  | "requested"
  | "accepted"
  | "rejected"
  | "manual_review"
  | "superseded";

export type MarketplaceIntakeVisibility =
  | "participant_only"
  | "reviewer_only"
  | "aggregate_only";

export type MarketplaceIntakeTriageState =
  | "draft"
  | "routed"
  | "corrected"
  | "manual_review"
  | "superseded"
  | "blocked";

export interface MarketplaceIntakeTriageRoute {
  correctionPath: string;
  href: string;
  key: MarketplaceIntakeRouteKey;
  label: string;
  nextAction: string;
  routeEligible: boolean;
  routeKind: MarketplaceIntakeRouteKind;
  safeReasonCategory: string;
  status: string;
  summary: string;
}

export interface MarketplaceIntakeTriageRecord {
  id: string;
  participantIdHash: string;
  intakeSurfaceRef: string;
  userStatedGoalHash: string;
  initialRoute: MarketplaceIntakeInitialRoute;
  routeReasonCodes: string[];
  moralTradeCandidate: boolean;
  publicGoodsOrCrecMBoundary: boolean;
  backgroundNetworkingBoundary: boolean;
  prohibitedOrUnsupportedReviewState: MarketplaceIntakeProhibitedReviewState;
  userCorrectionOrAppealState: MarketplaceIntakeCorrectionState;
  triageVisibility: MarketplaceIntakeVisibility;
  ideologyInferenceProhibited: boolean;
  willingnessToPayInferenceProhibited: boolean;
  triageState: MarketplaceIntakeTriageState;
  reviewerDecisionRef: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MarketplaceIntakeTriageRecordEvaluation {
  status: "pass" | "blocked";
  recordId: string;
  initialRoute: MarketplaceIntakeInitialRoute;
  mappedRouteKey: MarketplaceIntakeRouteKey | null;
  blockers: string[];
}

export interface MarketplaceIntakeTriageContract {
  version: typeof MARKETPLACE_INTAKE_TRIAGE_CONTRACT_VERSION;
  purpose: string;
  firstClassRecordTables: string[];
  privacyBoundary: string;
  initialRoutes: MarketplaceIntakeInitialRoute[];
  routeAwayInitialRoutes: MarketplaceIntakeInitialRoute[];
  prohibitedReviewStates: MarketplaceIntakeProhibitedReviewState[];
  correctionStates: MarketplaceIntakeCorrectionState[];
  visibilityStates: MarketplaceIntakeVisibility[];
  triageStates: MarketplaceIntakeTriageState[];
  inferenceProhibitions: string[];
  requiredRecordFields: string[];
  sampleRecords: MarketplaceIntakeTriageRecord[];
  sampleEvaluations: MarketplaceIntakeTriageRecordEvaluation[];
  contractTests: string[];
}

export interface MarketplaceIntakeTriageContractValidation {
  status: "pass" | "fail";
  validatorName: "marketplace-intake-triage-contract";
  validatorVersion: typeof MARKETPLACE_INTAKE_TRIAGE_CONTRACT_VALIDATOR_VERSION;
  contractVersion: typeof MARKETPLACE_INTAKE_TRIAGE_CONTRACT_VERSION;
  blockers: string[];
  checks: Array<{
    id: string;
    label: string;
    status: "pass" | "fail";
    evidence: string;
  }>;
}

export const MARKETPLACE_INTAKE_ROUTE_AWAY_KEYS: MarketplaceIntakeRouteKey[] = [
  "ordinary_donation",
  "ordinary_matching_or_cofunding",
  "ordinary_procurement_or_service",
  "self_offset_bookkeeping",
  "public_goods_module",
  "background_networking_request",
  "prohibited_or_unsupported",
];

export const MARKETPLACE_LOCK_PATH_KEYS: MarketplaceIntakeRouteKey[] = [
  "donation_offset",
  "bounded_pledge_swap",
];

export const MARKETPLACE_INTAKE_TRIAGE_ROUTES: MarketplaceIntakeTriageRoute[] = [
  {
    key: "donation_offset",
    label: "Donation offset",
    href: "/offers/new?mode=offset",
    status: "Marketplace preview",
    routeEligible: true,
    routeKind: "non_public_goods_marketplace_preview",
    safeReasonCategory: "non-public-goods donation offset",
    nextAction: "Create a preview draft",
    correctionPath: "Use manual review if this is not an opposed-baseline donation trade.",
    summary:
      "Use when two opposed baseline donations may redirect into a reviewed compromise destination.",
  },
  {
    key: "bounded_pledge_swap",
    label: "Bounded pledge swap",
    href: "/offers/new?template=reciprocal-mixed",
    status: "Marketplace preview",
    routeEligible: true,
    routeKind: "non_public_goods_marketplace_preview",
    safeReasonCategory: "bounded pledge swap",
    nextAction: "Create a preview draft",
    correctionPath: "Use manual review for off-template, long-duration, or high-burden pledges.",
    summary:
      "Use for one meal, a few meals, one day, or a few days with substitutes, health boundaries, and pre-performance lock.",
  },
  {
    key: "ordinary_donation",
    label: "Ordinary donation",
    href: "/donate",
    status: "Route away",
    routeEligible: false,
    routeKind: "safe_external_path",
    safeReasonCategory: "ordinary donation",
    nextAction: "Use the direct donation path",
    correctionPath: "Request review only if a distinct counterparty and moral-trade baseline exist.",
    summary:
      "Use direct giving when no opposed baseline, counterparty condition, or trade-specific redirect is needed.",
  },
  {
    key: "ordinary_matching_or_cofunding",
    label: "Ordinary matching or co-funding",
    href: "/donation-offsets",
    status: "Route away",
    routeEligible: false,
    routeKind: "safe_external_path",
    safeReasonCategory: "ordinary matching",
    nextAction: "Use ordinary donation or matching guidance",
    correctionPath:
      "Request review only if moral disagreement or indexical obligations are necessary to explain the exchange.",
    summary:
      "Ordinary matching gifts and same-view co-funding do not enter the non-public-goods lock path.",
  },
  {
    key: "ordinary_procurement_or_service",
    label: "Ordinary service or procurement",
    href: "/paid-action-offers",
    status: "Route away",
    routeEligible: false,
    routeKind: "safe_external_path",
    safeReasonCategory: "ordinary service",
    nextAction: "Use paid-action guidance without moral-trade counting",
    correctionPath: "Request manual review for a narrow compensated moral-action exception.",
    summary:
      "Ordinary work, paid services, and procurement are not counted as Toby-Ord moral trade.",
  },
  {
    key: "self_offset_bookkeeping",
    label: "Personal self-offset bookkeeping",
    href: "/donation-offsets",
    status: "Route away",
    routeEligible: false,
    routeKind: "safe_external_path",
    safeReasonCategory: "self-offset",
    nextAction: "Use personal planning or external donation evidence",
    correctionPath: "Request review only if a distinct counterparty or represented moral perspective joins.",
    summary:
      "Personal self-offsets can be useful records, but they do not count as interpersonal moral-trade agreements.",
  },
  {
    key: "public_goods_module",
    label: `${MARKETPLACE_PUBLIC_GOODS_BOUNDARY.userFacingLabel} public-goods module`,
    href: MARKETPLACE_PUBLIC_GOODS_BOUNDARY.href,
    status: "Separate module",
    routeEligible: false,
    routeKind: "safe_external_path",
    safeReasonCategory: "moral public goods public goods",
    nextAction: "Open Public Goods Fund",
    correctionPath: "Return to this page only for non-public-goods donation offsets or pledge swaps.",
    summary: MARKETPLACE_PUBLIC_GOODS_BOUNDARY.sourceOfTruthNote,
  },
  {
    key: "background_networking_request",
    label: "Background-networking request",
    href: "/background-networking",
    status: "Route away",
    routeEligible: false,
    routeKind: "safe_external_path",
    safeReasonCategory: "background networking",
    nextAction: "Use the consent-gated background-networking path",
    correctionPath: "Return only if the request is a bounded non-public-goods trade draft.",
    summary:
      "Contact discovery, introductions, and autonomous outreach are outside the marketplace lock path.",
  },
  {
    key: "prohibited_or_unsupported",
    label: "Unsupported or safety review",
    href: "/anti-threat-rules",
    status: "Review first",
    routeEligible: false,
    routeKind: "manual_review_or_blocked",
    safeReasonCategory: "safety or prohibited use",
    nextAction: "Read the safety boundary or request neutral review",
    correctionPath: "Use appeal or correction only for a specific misunderstood safe trade.",
    summary:
      "Threat creation, unsafe abstention, coercion, contact pressure, exact private wishes, or prohibited requests cannot draft into a lock path.",
  },
];

const HASH_PATTERN = /^sha256:[a-f0-9]{64}$/;

const MARKETPLACE_INTAKE_INITIAL_ROUTES: MarketplaceIntakeInitialRoute[] = [
  "non_public_goods_moral_trade_candidate",
  "ordinary_donation_or_matching",
  "ordinary_procurement_or_service",
  "self_offset_or_personal_bookkeeping",
  "public_goods_candidate",
  "background_networking_request",
  "prohibited_or_unsupported",
  "unclear_manual_review",
];

const MARKETPLACE_INTAKE_ROUTE_AWAY_INITIAL_ROUTES: MarketplaceIntakeInitialRoute[] = [
  "ordinary_donation_or_matching",
  "ordinary_procurement_or_service",
  "self_offset_or_personal_bookkeeping",
  "public_goods_candidate",
  "background_networking_request",
  "prohibited_or_unsupported",
  "unclear_manual_review",
];

const PROHIBITED_REVIEW_STATES: MarketplaceIntakeProhibitedReviewState[] = [
  "not_required",
  "under_review",
  "blocked",
  "manual_review",
  "superseded",
];

const CORRECTION_STATES: MarketplaceIntakeCorrectionState[] = [
  "not_requested",
  "requested",
  "accepted",
  "rejected",
  "manual_review",
  "superseded",
];

const VISIBILITY_STATES: MarketplaceIntakeVisibility[] = [
  "participant_only",
  "reviewer_only",
  "aggregate_only",
];

const TRIAGE_STATES: MarketplaceIntakeTriageState[] = [
  "draft",
  "routed",
  "corrected",
  "manual_review",
  "superseded",
  "blocked",
];

const INITIAL_ROUTE_TO_ROUTE_KEY: Record<
  MarketplaceIntakeInitialRoute,
  MarketplaceIntakeRouteKey | null
> = {
  non_public_goods_moral_trade_candidate: "donation_offset",
  ordinary_donation_or_matching: "ordinary_donation",
  ordinary_procurement_or_service: "ordinary_procurement_or_service",
  self_offset_or_personal_bookkeeping: "self_offset_bookkeeping",
  public_goods_candidate: "public_goods_module",
  background_networking_request: "background_networking_request",
  prohibited_or_unsupported: "prohibited_or_unsupported",
  unclear_manual_review: null,
};

const SAMPLE_TRIAGE_RECORDS: MarketplaceIntakeTriageRecord[] = [
  {
    id: "marketplace-intake-triage:sample:donation-offset",
    participantIdHash:
      "sha256:1111111111111111111111111111111111111111111111111111111111111111",
    intakeSurfaceRef: "/offers/new",
    userStatedGoalHash:
      "sha256:2222222222222222222222222222222222222222222222222222222222222222",
    initialRoute: "non_public_goods_moral_trade_candidate",
    routeReasonCodes: ["opposed_baseline", "counterparty_condition", "preview_only"],
    moralTradeCandidate: true,
    publicGoodsOrCrecMBoundary: false,
    backgroundNetworkingBoundary: false,
    prohibitedOrUnsupportedReviewState: "not_required",
    userCorrectionOrAppealState: "not_requested",
    triageVisibility: "participant_only",
    ideologyInferenceProhibited: true,
    willingnessToPayInferenceProhibited: true,
    triageState: "routed",
    reviewerDecisionRef: null,
    createdAt: "2026-06-25T00:00:00.000Z",
    updatedAt: "2026-06-25T00:00:00.000Z",
  },
  {
    id: "marketplace-intake-triage:sample:public-goods-boundary",
    participantIdHash:
      "sha256:3333333333333333333333333333333333333333333333333333333333333333",
    intakeSurfaceRef: "/offers/new",
    userStatedGoalHash:
      "sha256:4444444444444444444444444444444444444444444444444444444444444444",
    initialRoute: "public_goods_candidate",
    routeReasonCodes: ["public_goods_module", "public_goods_boundary"],
    moralTradeCandidate: false,
    publicGoodsOrCrecMBoundary: true,
    backgroundNetworkingBoundary: false,
    prohibitedOrUnsupportedReviewState: "not_required",
    userCorrectionOrAppealState: "not_requested",
    triageVisibility: "participant_only",
    ideologyInferenceProhibited: true,
    willingnessToPayInferenceProhibited: true,
    triageState: "routed",
    reviewerDecisionRef: null,
    createdAt: "2026-06-25T00:00:00.000Z",
    updatedAt: "2026-06-25T00:00:00.000Z",
  },
  {
    id: "marketplace-intake-triage:sample:unsupported-manual-review",
    participantIdHash:
      "sha256:5555555555555555555555555555555555555555555555555555555555555555",
    intakeSurfaceRef: "/offers/new",
    userStatedGoalHash:
      "sha256:6666666666666666666666666666666666666666666666666666666666666666",
    initialRoute: "prohibited_or_unsupported",
    routeReasonCodes: ["safety_boundary", "manual_review_or_blocked"],
    moralTradeCandidate: false,
    publicGoodsOrCrecMBoundary: false,
    backgroundNetworkingBoundary: false,
    prohibitedOrUnsupportedReviewState: "manual_review",
    userCorrectionOrAppealState: "requested",
    triageVisibility: "reviewer_only",
    ideologyInferenceProhibited: true,
    willingnessToPayInferenceProhibited: true,
    triageState: "manual_review",
    reviewerDecisionRef: "review-decision:sample:triage-manual-review",
    createdAt: "2026-06-25T00:00:00.000Z",
    updatedAt: "2026-06-25T00:00:00.000Z",
  },
];

function isIsoTimestamp(value: string) {
  return Number.isFinite(Date.parse(value));
}

function check(
  id: string,
  label: string,
  passed: boolean,
  evidence: string,
): MarketplaceIntakeTriageContractValidation["checks"][number] {
  return {
    id,
    label,
    status: passed ? "pass" : "fail",
    evidence,
  };
}

export interface MarketplaceIntakeTriageValidation {
  blockers: string[];
  status: "pass" | "fail";
  version: typeof MARKETPLACE_INTAKE_TRIAGE_VERSION;
}

export function validateMarketplaceIntakeTriageRoutes(
  routes = MARKETPLACE_INTAKE_TRIAGE_ROUTES,
): MarketplaceIntakeTriageValidation {
  const blockers: string[] = [];
  const keys = new Set(routes.map((route) => route.key));

  for (const key of [...MARKETPLACE_LOCK_PATH_KEYS, ...MARKETPLACE_INTAKE_ROUTE_AWAY_KEYS]) {
    if (!keys.has(key)) blockers.push(`missing_route:${key}`);
  }

  for (const route of routes) {
    if (!route.summary || !route.nextAction || !route.safeReasonCategory) {
      blockers.push(`plain_language_fields_missing:${route.key}`);
    }

    if (!route.correctionPath) {
      blockers.push(`correction_path_missing:${route.key}`);
    }

    if (MARKETPLACE_LOCK_PATH_KEYS.includes(route.key) && !route.routeEligible) {
      blockers.push(`lock_path_route_not_eligible:${route.key}`);
    }

    if (MARKETPLACE_INTAKE_ROUTE_AWAY_KEYS.includes(route.key)) {
      if (route.routeEligible) blockers.push(`route_away_marked_eligible:${route.key}`);
      if (route.href.startsWith("/offers/new")) blockers.push(`route_away_points_to_lock_path:${route.key}`);
    }

    if (/willingness to pay|ideology|moral theory|moral rank|moral score/i.test(route.summary)) {
      blockers.push(`triage_infers_private_moral_profile:${route.key}`);
    }
  }

  return {
    blockers,
    status: blockers.length ? "fail" : "pass",
    version: MARKETPLACE_INTAKE_TRIAGE_VERSION,
  };
}

export function evaluateMarketplaceIntakeTriageRecord(
  record: MarketplaceIntakeTriageRecord,
): MarketplaceIntakeTriageRecordEvaluation {
  const blockers: string[] = [];
  const mappedRouteKey = INITIAL_ROUTE_TO_ROUTE_KEY[record.initialRoute] ?? null;

  if (!record.id.trim()) blockers.push("record_id_required");
  if (!HASH_PATTERN.test(record.participantIdHash)) {
    blockers.push("participant_id_hash_required");
  }
  if (!HASH_PATTERN.test(record.userStatedGoalHash)) {
    blockers.push("user_stated_goal_hash_required");
  }
  if (!record.intakeSurfaceRef.trim()) blockers.push("intake_surface_ref_required");
  if (!record.routeReasonCodes.length) blockers.push("route_reason_codes_required");
  if (!isIsoTimestamp(record.createdAt) || !isIsoTimestamp(record.updatedAt)) {
    blockers.push("triage_record_timestamp_invalid");
  }
  if (!MARKETPLACE_INTAKE_INITIAL_ROUTES.includes(record.initialRoute)) {
    blockers.push(`unsupported_initial_route:${record.initialRoute}`);
  }
  if (!PROHIBITED_REVIEW_STATES.includes(record.prohibitedOrUnsupportedReviewState)) {
    blockers.push(`unsupported_prohibited_review_state:${record.prohibitedOrUnsupportedReviewState}`);
  }
  if (!CORRECTION_STATES.includes(record.userCorrectionOrAppealState)) {
    blockers.push(`unsupported_correction_state:${record.userCorrectionOrAppealState}`);
  }
  if (!VISIBILITY_STATES.includes(record.triageVisibility)) {
    blockers.push(`unsupported_visibility:${record.triageVisibility}`);
  }
  if (!TRIAGE_STATES.includes(record.triageState)) {
    blockers.push(`unsupported_triage_state:${record.triageState}`);
  }
  if (!record.ideologyInferenceProhibited) {
    blockers.push("ideology_inference_not_prohibited");
  }
  if (!record.willingnessToPayInferenceProhibited) {
    blockers.push("willingness_to_pay_inference_not_prohibited");
  }

  const expectedCandidate =
    record.initialRoute === "non_public_goods_moral_trade_candidate";
  if (record.moralTradeCandidate !== expectedCandidate) {
    blockers.push(`moral_trade_candidate_mismatch:${record.initialRoute}`);
  }
  if (
    record.publicGoodsOrCrecMBoundary !==
    (record.initialRoute === "public_goods_candidate")
  ) {
    blockers.push(`public_goods_boundary_mismatch:${record.initialRoute}`);
  }
  if (
    record.backgroundNetworkingBoundary !==
    (record.initialRoute === "background_networking_request")
  ) {
    blockers.push(`background_networking_boundary_mismatch:${record.initialRoute}`);
  }
  if (
    record.initialRoute === "prohibited_or_unsupported" &&
    !["under_review", "blocked", "manual_review"].includes(
      record.prohibitedOrUnsupportedReviewState,
    )
  ) {
    blockers.push("prohibited_route_requires_review_or_blocked_state");
  }
  if (
    record.initialRoute === "unclear_manual_review" &&
    record.triageState !== "manual_review"
  ) {
    blockers.push("unclear_route_requires_manual_review_state");
  }

  return {
    status: blockers.length ? "blocked" : "pass",
    recordId: record.id,
    initialRoute: record.initialRoute,
    mappedRouteKey,
    blockers,
  };
}

export function getMarketplaceIntakeTriageContract(): MarketplaceIntakeTriageContract {
  const sampleEvaluations = SAMPLE_TRIAGE_RECORDS.map((record) =>
    evaluateMarketplaceIntakeTriageRecord(record),
  );

  return {
    version: MARKETPLACE_INTAKE_TRIAGE_CONTRACT_VERSION,
    purpose:
      "First-class marketplace-intake triage contract for routing ordinary donations, matching, services, self-offsets, public-goods candidates, background-networking requests, and unsupported requests away from the non-public-goods moral-trade lock path unless corrected and reviewed.",
    firstClassRecordTables: [
      "moral_trade_marketplace_intake_triage_records",
      "moral_trade_marketplace_intake_triage_correction_records",
    ],
    privacyBoundary:
      "Triage stores hashed participant and goal references, participant/reviewer/aggregate visibility only, explicit correction state, and prohibitions on ideology, willingness-to-pay, or private moral-theory inference.",
    initialRoutes: [...MARKETPLACE_INTAKE_INITIAL_ROUTES],
    routeAwayInitialRoutes: [...MARKETPLACE_INTAKE_ROUTE_AWAY_INITIAL_ROUTES],
    prohibitedReviewStates: [...PROHIBITED_REVIEW_STATES],
    correctionStates: [...CORRECTION_STATES],
    visibilityStates: [...VISIBILITY_STATES],
    triageStates: [...TRIAGE_STATES],
    inferenceProhibitions: [
      "ideology_inference_prohibited",
      "willingness_to_pay_inference_prohibited",
      "private_moral_theory_inference_prohibited",
    ],
    requiredRecordFields: [
      "participantIdHash",
      "intakeSurfaceRef",
      "userStatedGoalHash",
      "initialRoute",
      "routeReasonCodes",
      "moralTradeCandidate",
      "publicGoodsOrCrecMBoundary",
      "backgroundNetworkingBoundary",
      "prohibitedOrUnsupportedReviewState",
      "userCorrectionOrAppealState",
      "triageVisibility",
      "ideologyInferenceProhibited",
      "willingnessToPayInferenceProhibited",
      "triageState",
      "reviewerDecisionRef",
    ],
    sampleRecords: [...SAMPLE_TRIAGE_RECORDS],
    sampleEvaluations,
    contractTests: [
      "marketplace_intake_triage_route_family",
      "marketplace_intake_triage_record_contract",
      "marketplace_intake_triage_contract_route",
      "marketplace_intake_triage_inference_prohibition",
    ],
  };
}

export function validateMarketplaceIntakeTriageContract(
  contract: MarketplaceIntakeTriageContract = getMarketplaceIntakeTriageContract(),
): MarketplaceIntakeTriageContractValidation {
  const routeValidation = validateMarketplaceIntakeTriageRoutes();
  const checks = [
    check(
      "route-family",
      "Static route family passes safe route-away validation",
      routeValidation.status === "pass",
      routeValidation.blockers.join(", ") || "pass",
    ),
    check(
      "first-class-records",
      "Triage and correction records are first-class record tables",
      [
        "moral_trade_marketplace_intake_triage_records",
        "moral_trade_marketplace_intake_triage_correction_records",
      ].every((table) => contract.firstClassRecordTables.includes(table)),
      contract.firstClassRecordTables.join(", "),
    ),
    check(
      "initial-route-coverage",
      "Initial routes include all moraltrade82 route-away categories and manual review",
      [
        "non_public_goods_moral_trade_candidate",
        "ordinary_donation_or_matching",
        "ordinary_procurement_or_service",
        "self_offset_or_personal_bookkeeping",
        "public_goods_candidate",
        "background_networking_request",
        "prohibited_or_unsupported",
        "unclear_manual_review",
      ].every((route) => contract.initialRoutes.includes(route as MarketplaceIntakeInitialRoute)),
      contract.initialRoutes.join(", "),
    ),
    check(
      "inference-prohibitions",
      "Contract forbids ideology, willingness-to-pay, and private moral-theory inference",
      [
        "ideology_inference_prohibited",
        "willingness_to_pay_inference_prohibited",
        "private_moral_theory_inference_prohibited",
      ].every((rule) => contract.inferenceProhibitions.includes(rule)),
      contract.inferenceProhibitions.join(", "),
    ),
    check(
      "sample-records-pass",
      "Sample records satisfy fail-closed record evaluator",
      contract.sampleEvaluations.every((evaluation) => evaluation.status === "pass"),
      contract.sampleEvaluations
        .map((evaluation) => `${evaluation.recordId}:${evaluation.status}`)
        .join(", "),
    ),
    check(
      "contract-tests",
      "Contract test hooks are named",
      [
        "marketplace_intake_triage_route_family",
        "marketplace_intake_triage_record_contract",
        "marketplace_intake_triage_contract_route",
        "marketplace_intake_triage_inference_prohibition",
      ].every((testName) => contract.contractTests.includes(testName)),
      contract.contractTests.join(", "),
    ),
  ];
  const blockers = [
    ...routeValidation.blockers,
    ...checks
      .filter((entry) => entry.status === "fail")
      .map((entry) => `${entry.id}: ${entry.label}`),
  ];

  return {
    status: blockers.length ? "fail" : "pass",
    validatorName: "marketplace-intake-triage-contract",
    validatorVersion: MARKETPLACE_INTAKE_TRIAGE_CONTRACT_VALIDATOR_VERSION,
    contractVersion: MARKETPLACE_INTAKE_TRIAGE_CONTRACT_VERSION,
    checks,
    blockers,
  };
}
