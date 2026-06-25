export const MORAL_TRADE_PUBLIC_PAGE_SIMPLIFICATION_VERSION =
  "moral-trade-public-page-simplification-v0.1-2026-06";
export const MORAL_TRADE_PUBLIC_PAGE_SIMPLIFICATION_VALIDATOR_VERSION =
  "moral-trade-public-page-simplification-validator-v0.1";

export type MoralTradePublicPageRouteKey =
  | "offers_new_offset"
  | "offers"
  | "donation_offsets"
  | "pledge_swaps"
  | "moral_trade"
  | "how_it_works"
  | "validation"
  | "paid_action_offers"
  | "worked_example_detail"
  | "create_similar";

export type MoralTradePublicPageQaContext =
  | "default_desktop"
  | "default_mobile"
  | "signed_out"
  | "signed_in_draft"
  | "empty_state"
  | "blocked_state"
  | "details_drawer"
  | "final_confirmation_or_publication";

export type MoralTradePublicPageStatus =
  | "live"
  | "preview_only"
  | "worked_example"
  | "demo"
  | "sign_in_required"
  | "manual_review_required"
  | "external_module";

export interface MoralTradePublicPageAuditRecord {
  routeKey: MoralTradePublicPageRouteKey;
  routePath: string;
  sourcePath: string;
  oneSentenceHero: string;
  primaryCta: string;
  secondaryCta: string | null;
  statusStrip: MoralTradePublicPageStatus[];
  qaContexts: MoralTradePublicPageQaContext[];
  evidenceArtifactRefs: string[];
  userFacingNextAction: string;
  correctionPath: string;
  detailsDrawerLabel: string;
  advancedDetailsCollapsedByDefault: boolean;
  factorCodesHiddenFromPrimaryCopy: boolean;
  internalEnumsHiddenFromPrimaryCopy: boolean;
  routeFallbackDiagnosticsHidden: boolean;
  noImpactScoreDefaultSurface: boolean;
  noLongDurationDefaultPledge: boolean;
  noCompetingPrimaryCtas: boolean;
  defaultCardsMaxFacts: number;
}

export interface MoralTradePublicPageSimplificationContract {
  version: typeof MORAL_TRADE_PUBLIC_PAGE_SIMPLIFICATION_VERSION;
  purpose: string;
  firstClassRecordTables: string[];
  requiredRouteKeys: MoralTradePublicPageRouteKey[];
  requiredQaContexts: MoralTradePublicPageQaContext[];
  approvedStatusLabels: MoralTradePublicPageStatus[];
  bannedPrimaryCopyPatterns: string[];
  fallbackCopy: {
    title: string;
    body: string;
    actions: string[];
  };
  routeAuditRecords: MoralTradePublicPageAuditRecord[];
  releaseGateTestHooks: string[];
  contractTests: string[];
}

export interface MoralTradePublicPageSimplificationValidation {
  status: "pass" | "fail";
  validatorName: "moral-trade-public-page-simplification";
  validatorVersion: typeof MORAL_TRADE_PUBLIC_PAGE_SIMPLIFICATION_VALIDATOR_VERSION;
  contractVersion: typeof MORAL_TRADE_PUBLIC_PAGE_SIMPLIFICATION_VERSION;
  blockers: string[];
  checks: Array<{
    id: string;
    label: string;
    status: "pass" | "fail";
    evidence: string;
  }>;
}

const REQUIRED_ROUTE_KEYS: MoralTradePublicPageRouteKey[] = [
  "offers_new_offset",
  "offers",
  "donation_offsets",
  "pledge_swaps",
  "moral_trade",
  "how_it_works",
  "validation",
  "paid_action_offers",
  "worked_example_detail",
  "create_similar",
];

const REQUIRED_QA_CONTEXTS: MoralTradePublicPageQaContext[] = [
  "default_desktop",
  "default_mobile",
  "signed_out",
  "signed_in_draft",
  "empty_state",
  "blocked_state",
  "details_drawer",
  "final_confirmation_or_publication",
];

const APPROVED_STATUS_LABELS: MoralTradePublicPageStatus[] = [
  "live",
  "preview_only",
  "worked_example",
  "demo",
  "sign_in_required",
  "manual_review_required",
  "external_module",
];

const BANNED_PRIMARY_COPY_PATTERNS = [
  "factor-code",
  "factorCodes",
  "release_gate",
  "policy_snapshot_hash",
  "source_hash",
  "control_requirement_result",
  "counterfactual_trust_assessment",
  "route health baseline",
  "validator diagnostics",
  "impact score",
  "moral rank",
  "participant importance score",
];

function qaRefs(routeKey: MoralTradePublicPageRouteKey) {
  return [
    `qa://moraltrade82/public-page-simplification/${routeKey}/desktop`,
    `qa://moraltrade82/public-page-simplification/${routeKey}/mobile`,
    `qa://moraltrade82/public-page-simplification/${routeKey}/blocked`,
    `qa://moraltrade82/public-page-simplification/${routeKey}/details`,
  ];
}

function auditRecord(
  input: Omit<
    MoralTradePublicPageAuditRecord,
    | "advancedDetailsCollapsedByDefault"
    | "factorCodesHiddenFromPrimaryCopy"
    | "internalEnumsHiddenFromPrimaryCopy"
    | "routeFallbackDiagnosticsHidden"
    | "noImpactScoreDefaultSurface"
    | "noLongDurationDefaultPledge"
    | "noCompetingPrimaryCtas"
    | "defaultCardsMaxFacts"
    | "evidenceArtifactRefs"
    | "qaContexts"
  > &
    Partial<
      Pick<
        MoralTradePublicPageAuditRecord,
        "noLongDurationDefaultPledge" | "defaultCardsMaxFacts"
      >
    >,
): MoralTradePublicPageAuditRecord {
  return {
    advancedDetailsCollapsedByDefault: true,
    defaultCardsMaxFacts: input.defaultCardsMaxFacts ?? 6,
    evidenceArtifactRefs: qaRefs(input.routeKey),
    factorCodesHiddenFromPrimaryCopy: true,
    internalEnumsHiddenFromPrimaryCopy: true,
    noCompetingPrimaryCtas: true,
    noImpactScoreDefaultSurface: true,
    noLongDurationDefaultPledge: input.noLongDurationDefaultPledge ?? true,
    qaContexts: REQUIRED_QA_CONTEXTS,
    routeFallbackDiagnosticsHidden: true,
    ...input,
  };
}

const ROUTE_AUDIT_RECORDS: MoralTradePublicPageAuditRecord[] = [
  auditRecord({
    routeKey: "offers_new_offset",
    routePath: "/offers/new?mode=offset",
    sourcePath: "src/app/offers/new/page.tsx",
    oneSentenceHero:
      "Draft a donation offset by comparing no trade with the reviewed redirect before sign-in or saving.",
    primaryCta: "Preview draft",
    secondaryCta: "Save after sign-in",
    statusStrip: ["preview_only", "sign_in_required", "manual_review_required"],
    userFacingNextAction: "Preview the draft shape before creating a live offer.",
    correctionPath: "Correct the intake route or request manual review before saving.",
    detailsDrawerLabel: "Review and safety details",
  }),
  auditRecord({
    routeKey: "offers",
    routePath: "/offers",
    sourcePath: "src/app/offers/page.tsx",
    oneSentenceHero:
      "Browse live offers, reviewed templates, worked examples, and demo data without moral-ranking defaults.",
    primaryCta: "Create a reviewed draft",
    secondaryCta: "View worked examples",
    statusStrip: ["live", "preview_only", "worked_example", "demo", "external_module"],
    userFacingNextAction: "Inspect examples or create a reviewed non-public-goods draft.",
    correctionPath: "Use filters or details drawers without exposing private counterparty data.",
    detailsDrawerLabel: "Why this is reviewable",
  }),
  auditRecord({
    routeKey: "donation_offsets",
    routePath: "/donation-offsets",
    sourcePath: "src/app/donation-offsets/page.tsx",
    oneSentenceHero:
      "Redirect opposed donations into a shared destination only after baseline, proof, and safety review.",
    primaryCta: "Draft an offset",
    secondaryCta: "View offset examples",
    statusStrip: ["preview_only", "manual_review_required"],
    userFacingNextAction: "Answer the plain-language offset questions before review.",
    correctionPath: "Use ordinary donation or manual review if no opposed baseline exists.",
    detailsDrawerLabel: "Offset review details",
  }),
  auditRecord({
    routeKey: "pledge_swaps",
    routePath: "/pledge-swaps",
    sourcePath: "src/app/pledge-swaps/page.tsx",
    oneSentenceHero:
      "Create a short, bounded pledge-swap preview with future lock, light proof, and manual review.",
    primaryCta: "Draft a micro-pledge",
    secondaryCta: "View pledge examples",
    statusStrip: ["preview_only", "manual_review_required"],
    userFacingNextAction: "Name the small action, reciprocal ask, timing, proof, and fallback.",
    correctionPath: "Longer pledge variants route to manual review before reliance.",
    detailsDrawerLabel: "Longer pledge review details",
  }),
  auditRecord({
    routeKey: "moral_trade",
    routePath: "/moral-trade",
    sourcePath: "src/app/moral-trade/page.tsx",
    oneSentenceHero:
      "Learn what changes if a conditional trade clears and what reviewers check first.",
    primaryCta: "Start a reviewed draft",
    secondaryCta: "Read examples",
    statusStrip: ["preview_only", "worked_example"],
    userFacingNextAction: "Compare no trade, cleared trade, and review checks.",
    correctionPath: "Open reviewer details only after the plain-language path.",
    detailsDrawerLabel: "Show reviewer details",
  }),
  auditRecord({
    routeKey: "how_it_works",
    routePath: "/how-it-works",
    sourcePath: "src/app/how-it-works/page.tsx",
    oneSentenceHero:
      "See what happens if nobody trades, what changes if it clears, and what must be checked.",
    primaryCta: "Create a draft",
    secondaryCta: "Browse examples",
    statusStrip: ["preview_only", "worked_example"],
    userFacingNextAction: "Read the three-step primer before opening technical details.",
    correctionPath: "Use details drawers for protocol gates and status-code walkthroughs.",
    detailsDrawerLabel: "Reviewer details",
  }),
  auditRecord({
    routeKey: "validation",
    routePath: "/validation",
    sourcePath: "src/app/validation/page.tsx",
    oneSentenceHero:
      "Reviewers verify specific claims and next actions, not moral worth.",
    primaryCta: "Check review status",
    secondaryCta: "Open reviewer details",
    statusStrip: ["preview_only", "manual_review_required"],
    userFacingNextAction: "Use draft, needs-info, in-review, challenge, verified, or disputed status.",
    correctionPath: "Open evidence schema details only after the status summary.",
    detailsDrawerLabel: "Reviewer details",
  }),
  auditRecord({
    routeKey: "paid_action_offers",
    routePath: "/paid-action-offers",
    sourcePath: "src/app/paid-action-offers/page.tsx",
    oneSentenceHero: "Paid action offers are not open to the public yet.",
    primaryCta: "Inspect a worked example",
    secondaryCta: "Create a donation offset",
    statusStrip: ["preview_only", "manual_review_required"],
    userFacingNextAction: "Use a safe alternative until invitation-only pilots expand.",
    correctionPath: "Join invitation-only review only when capacity and policies allow.",
    detailsDrawerLabel: "Labor, tax, and dispute details",
  }),
  auditRecord({
    routeKey: "worked_example_detail",
    routePath: "/offers/examples/[exampleId]",
    sourcePath: "src/app/offers/examples/[exampleId]/page.tsx",
    oneSentenceHero:
      "Inspect a teaching example without treating it as a live offer or default product shape.",
    primaryCta: "Create draft from example",
    secondaryCta: "Back to examples",
    statusStrip: ["worked_example", "preview_only"],
    userFacingNextAction: "Copy only reviewed, bounded terms into a new preview.",
    correctionPath: "Keep source examples separate from default micro-pledge products.",
    detailsDrawerLabel: "Source example details",
  }),
  auditRecord({
    routeKey: "create_similar",
    routePath: "/api/offers/[offerId]/create-similar",
    sourcePath: "src/app/api/offers/[offerId]/create-similar/route.ts",
    oneSentenceHero:
      "Create-similar requests return a draft template only; no review, match, payment, or live offer changes.",
    primaryCta: "Create draft",
    secondaryCta: "View source example",
    statusStrip: ["preview_only", "sign_in_required"],
    userFacingNextAction: "Review and edit every copied term before saving.",
    correctionPath: "Return to examples if the source is stale, unsafe, or not reviewable.",
    detailsDrawerLabel: "Copied-term safety details",
  }),
];

function check(
  id: string,
  label: string,
  passed: boolean,
  evidence: string,
): MoralTradePublicPageSimplificationValidation["checks"][number] {
  return {
    id,
    label,
    status: passed ? "pass" : "fail",
    evidence,
  };
}

function defaultCopy(record: MoralTradePublicPageAuditRecord) {
  return [
    record.oneSentenceHero,
    record.primaryCta,
    record.secondaryCta ?? "",
    record.userFacingNextAction,
    record.correctionPath,
  ].join(" ");
}

function routeBlockers(
  record: MoralTradePublicPageAuditRecord,
  contract: MoralTradePublicPageSimplificationContract,
) {
  const blockers: string[] = [];
  const copy = defaultCopy(record).toLowerCase();

  if (!record.oneSentenceHero.trim()) blockers.push(`hero_required:${record.routeKey}`);
  if (!record.primaryCta.trim()) blockers.push(`primary_cta_required:${record.routeKey}`);
  if (/\b(pay|lock|capture|match me|publish)\b/i.test(record.primaryCta)) {
    blockers.push(`pre_gate_primary_cta:${record.routeKey}`);
  }
  if (record.defaultCardsMaxFacts > 6) {
    blockers.push(`too_many_default_card_facts:${record.routeKey}`);
  }
  if (!record.statusStrip.length) blockers.push(`status_strip_required:${record.routeKey}`);
  if (!record.statusStrip.every((status) => contract.approvedStatusLabels.includes(status))) {
    blockers.push(`unsupported_status_strip:${record.routeKey}`);
  }
  if (!contract.requiredQaContexts.every((context) => record.qaContexts.includes(context))) {
    blockers.push(`qa_context_missing:${record.routeKey}`);
  }
  if (record.evidenceArtifactRefs.length < 4) {
    blockers.push(`qa_artifact_refs_missing:${record.routeKey}`);
  }
  if (!record.detailsDrawerLabel.trim()) {
    blockers.push(`details_drawer_label_required:${record.routeKey}`);
  }

  const booleanChecks: Array<[keyof MoralTradePublicPageAuditRecord, string]> = [
    ["advancedDetailsCollapsedByDefault", "advanced_details_not_collapsed"],
    ["factorCodesHiddenFromPrimaryCopy", "factor_codes_primary_copy"],
    ["internalEnumsHiddenFromPrimaryCopy", "internal_enums_primary_copy"],
    ["routeFallbackDiagnosticsHidden", "route_fallback_diagnostics_primary_copy"],
    ["noImpactScoreDefaultSurface", "impact_score_default_surface"],
    ["noLongDurationDefaultPledge", "long_duration_default_pledge"],
    ["noCompetingPrimaryCtas", "competing_primary_ctas"],
  ];

  for (const [field, blocker] of booleanChecks) {
    if (record[field] !== true) blockers.push(`${blocker}:${record.routeKey}`);
  }

  for (const pattern of contract.bannedPrimaryCopyPatterns) {
    if (copy.includes(pattern.toLowerCase())) {
      blockers.push(`banned_primary_copy:${record.routeKey}:${pattern}`);
    }
  }

  return blockers;
}

export function getMoralTradePublicPageSimplificationContract(): MoralTradePublicPageSimplificationContract {
  return {
    version: MORAL_TRADE_PUBLIC_PAGE_SIMPLIFICATION_VERSION,
    purpose:
      "Route-level public-page simplification contract for non-public-goods Moral Trade pages, keeping safety controls while moving internal policy detail behind task cards and details drawers.",
    firstClassRecordTables: [
      "moral_trade_route_simplification_audit_records",
      "moral_trade_public_page_qa_artifacts",
      "moral_trade_public_page_plain_language_copy_policies",
      "moral_trade_route_fallback_copy_records",
    ],
    requiredRouteKeys: REQUIRED_ROUTE_KEYS,
    requiredQaContexts: REQUIRED_QA_CONTEXTS,
    approvedStatusLabels: APPROVED_STATUS_LABELS,
    bannedPrimaryCopyPatterns: BANNED_PRIMARY_COPY_PATTERNS,
    fallbackCopy: {
      title: "This page did not load.",
      body: "No draft was submitted and no review state changed.",
      actions: ["Retry", "Go to examples", "Go to start", "Contact support"],
    },
    routeAuditRecords: ROUTE_AUDIT_RECORDS,
    releaseGateTestHooks: [
      "public_moral_trade_page_simplification_test",
      "participant_task_card_simplification_test",
      "technical_detail_progressive_disclosure_test",
      "offset_creation_route_happy_path_test",
      "worked_example_card_simplification_test",
    ],
    contractTests: [
      "src/lib/moral-trade/public-page-simplification.test.ts",
      "src/app/api/moral-trade/public-page-simplification/contract/route.ts",
    ],
  };
}

export function validateMoralTradePublicPageSimplificationContract(
  contract: MoralTradePublicPageSimplificationContract =
    getMoralTradePublicPageSimplificationContract(),
): MoralTradePublicPageSimplificationValidation {
  const routeKeys = new Set(contract.routeAuditRecords.map((record) => record.routeKey));
  const routeLevelBlockers = contract.routeAuditRecords.flatMap((record) =>
    routeBlockers(record, contract),
  );
  const checks = [
    check(
      "required-routes",
      "All moraltrade82 public marketplace routes have route-level audit records",
      contract.requiredRouteKeys.every((routeKey) => routeKeys.has(routeKey)),
      `routes=${contract.routeAuditRecords.map((record) => record.routeKey).join(",")}`,
    ),
    check(
      "first-class-records",
      "Route audit records, QA artifacts, plain-language policy, and fallback copy are first-class",
      [
        "moral_trade_route_simplification_audit_records",
        "moral_trade_public_page_qa_artifacts",
        "moral_trade_public_page_plain_language_copy_policies",
        "moral_trade_route_fallback_copy_records",
      ].every((table) => contract.firstClassRecordTables.includes(table)),
      contract.firstClassRecordTables.join(", "),
    ),
    check(
      "route-audits-pass",
      "Each route hides internal details from primary copy and supplies QA context artifacts",
      routeLevelBlockers.length === 0,
      routeLevelBlockers.join(", ") || "pass",
    ),
    check(
      "fallback-copy",
      "Fallback route copy is short, action-oriented, and states no state changed",
      contract.fallbackCopy.title === "This page did not load." &&
        /No draft was submitted and no review state changed\./.test(
          contract.fallbackCopy.body,
        ) &&
        contract.fallbackCopy.actions.length === 4,
      `${contract.fallbackCopy.title} ${contract.fallbackCopy.actions.join(",")}`,
    ),
    check(
      "release-gate-hooks",
      "Release gate hooks cover public simplification, task cards, details, offset route, and examples",
      [
        "public_moral_trade_page_simplification_test",
        "participant_task_card_simplification_test",
        "technical_detail_progressive_disclosure_test",
        "offset_creation_route_happy_path_test",
        "worked_example_card_simplification_test",
      ].every((hook) => contract.releaseGateTestHooks.includes(hook)),
      contract.releaseGateTestHooks.join(", "),
    ),
    check(
      "contract-tests",
      "Contract route and focused test are named",
      [
        "src/lib/moral-trade/public-page-simplification.test.ts",
        "src/app/api/moral-trade/public-page-simplification/contract/route.ts",
      ].every((testName) => contract.contractTests.includes(testName)),
      contract.contractTests.join(", "),
    ),
  ];
  const blockers = [
    ...routeLevelBlockers,
    ...checks
      .filter((entry) => entry.status === "fail")
      .map((entry) => `${entry.id}: ${entry.label}`),
  ];

  return {
    status: blockers.length ? "fail" : "pass",
    validatorName: "moral-trade-public-page-simplification",
    validatorVersion: MORAL_TRADE_PUBLIC_PAGE_SIMPLIFICATION_VALIDATOR_VERSION,
    contractVersion: contract.version,
    blockers,
    checks,
  };
}
