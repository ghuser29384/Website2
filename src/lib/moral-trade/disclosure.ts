import {
  BACKGROUND_DISCLOSURE_FIELDS,
  DISCLOSURE_ACCESS_LEVELS,
  DISCLOSURE_AUDIENCE_STAGES,
  getDefaultGrantExpiryDays,
  validateDisclosureRequest,
  type BackgroundDisclosureFieldKey,
  type DisclosureAccessLevel,
  type DisclosureAudienceStage,
} from "@/lib/background-disclosure";
import {
  BACKGROUND_QUERY_COSTS,
  BACKGROUND_QUERY_DAILY_LIMITS,
} from "@/lib/background-query-budget";

export const MORAL_TRADE_DISCLOSURE_CONTRACT_VERSION =
  "moral-trade-disclosure-grants-v0.1";
export const MORAL_TRADE_DISCLOSURE_VALIDATOR_VERSION =
  "moral-trade-disclosure-grants-validator-v0.1";

export type MoralTradeDisclosureGrantStatus = "draft" | "granted" | "revoked";

export type MoralTradeDisclosureFactorCode =
  | "purpose_bound_disclosure"
  | "field_level_grant"
  | "stage_lattice_enforced"
  | "registry_broad_preview_only"
  | "mutual_consent_required"
  | "introduced_contact_only"
  | "raw_source_notes_redacted"
  | "owner_approval_required"
  | "no_private_feed_mining"
  | "non_mutating_evaluation"
  | "expiry_window_named";

export type MoralTradeDisclosureDecisionStatus =
  | "grant_ready"
  | "needs_purpose"
  | "needs_consent_stage"
  | "needs_redaction"
  | "unsupported_fields";

export interface MoralTradeDisclosureGrantInput {
  requestId: string;
  fieldKeys: string[];
  purpose: string;
  stage: DisclosureAudienceStage;
  accessLevel: DisclosureAccessLevel;
  status?: MoralTradeDisclosureGrantStatus;
  expiresInDays?: number | null;
  ownerProfileScoped?: boolean;
  counterpartyScoped?: boolean;
  matchScoped?: boolean;
  containsRawSourceNotes?: boolean;
  containsContactDetails?: boolean;
}

export interface MoralTradeDisclosureDecision {
  status: MoralTradeDisclosureDecisionStatus;
  allowedFields: BackgroundDisclosureFieldKey[];
  deniedFields: string[];
  factorCodes: MoralTradeDisclosureFactorCode[];
  ownerApprovalRequired: true;
  stateMutation: false;
  accessLevel: DisclosureAccessLevel;
  stage: DisclosureAudienceStage;
  grantStatus: MoralTradeDisclosureGrantStatus;
  expiryDays: number;
  privacyActions: string[];
  blockers: string[];
}

export interface MoralTradeDisclosureContractCheck {
  id: string;
  label: string;
  status: "pass" | "fail";
  evidence: string;
}

export interface MoralTradeDisclosureDecisionValidation {
  status: "pass" | "fail";
  validatorName: "moral-trade-disclosure-decision";
  validatorVersion: string;
  checks: MoralTradeDisclosureContractCheck[];
  blockers: string[];
}

export interface MoralTradeDisclosureContractValidation {
  status: "pass" | "fail";
  validatorName: "moral-trade-disclosure-grant-contract";
  validatorVersion: string;
  contractVersion: string;
  checks: MoralTradeDisclosureContractCheck[];
  blockers: string[];
}

export interface MoralTradeDisclosureSearchPrivacyControl {
  key: string;
  label: string;
  rule: string;
  cost?: number;
  dailyLimit?: number;
  minResultCount?: number;
  minSpecificity?: number;
  scope?: string;
}

export interface MoralTradeDisclosureContract {
  version: string;
  purpose: string;
  decisioningMode: "deterministic_disclosure_grant_scope_only";
  stateMutation: false;
  accessLevels: DisclosureAccessLevel[];
  audienceStages: DisclosureAudienceStage[];
  grantStatuses: MoralTradeDisclosureGrantStatus[];
  disclosureFields: typeof BACKGROUND_DISCLOSURE_FIELDS;
  redactedFields: string[];
  searchPrivacyControls: MoralTradeDisclosureSearchPrivacyControl[];
  approvedFactorCodes: MoralTradeDisclosureFactorCode[];
  invariants: string[];
  sampleInput: MoralTradeDisclosureGrantInput;
  sampleDecision: MoralTradeDisclosureDecision;
  contractTests: string[];
}

const GRANT_STATUSES = ["draft", "granted", "revoked"] as const;

const REDACTED_FIELDS = [
  "exact_private_wishes_before_consent",
  "exact_asks_before_consent",
  "contact_details_before_introduction",
  "raw_source_notes",
  "sensitive_constraints_in_public_preview",
  "private_feed_payloads",
] as const;

const APPROVED_FACTOR_CODES = [
  "purpose_bound_disclosure",
  "field_level_grant",
  "stage_lattice_enforced",
  "registry_broad_preview_only",
  "mutual_consent_required",
  "introduced_contact_only",
  "raw_source_notes_redacted",
  "owner_approval_required",
  "no_private_feed_mining",
  "non_mutating_evaluation",
  "expiry_window_named",
] as const satisfies readonly MoralTradeDisclosureFactorCode[];

const REQUIRED_SEARCH_PRIVACY_CONTROLS = [
  "daily_registry_query_budget",
  "sparse_result_privacy_floor",
  "stable_query_fingerprint",
  "redacted_overlap_tokens",
  "risk_signal_logging",
] as const;

const SEARCH_PRIVACY_CONTROLS = [
  {
    key: "daily_registry_query_budget",
    label: "Daily registry query budget",
    scope: "registry_search",
    dailyLimit: BACKGROUND_QUERY_DAILY_LIMITS.registry_search,
    cost: BACKGROUND_QUERY_COSTS.registry_search,
    rule: "Every registry search spends a bounded daily query budget before broad previews are returned.",
  },
  {
    key: "sparse_result_privacy_floor",
    label: "Sparse-result privacy floor",
    minResultCount: 3,
    minSpecificity: 3,
    rule: "Highly specific searches with fewer than three results return no profiles and ask the user to broaden the query.",
  },
  {
    key: "stable_query_fingerprint",
    label: "Stable query fingerprint",
    rule: "Normalized query and filter tuples are hashed for budget accounting without storing raw query text as the budget identity.",
  },
  {
    key: "redacted_overlap_tokens",
    label: "Redacted overlap tokens",
    rule: "Search results expose broad overlap labels instead of exact matching words from private or semi-private wish text.",
  },
  {
    key: "risk_signal_logging",
    label: "Risk signal logging",
    rule: "Budget pressure and sparse searches are logged as redacted risk signals for operator review without revealing exact wishes.",
  },
] as const satisfies readonly MoralTradeDisclosureSearchPrivacyControl[];

const CONTRACT_TESTS = [
  "disclosure_grant_contract_validator",
  "disclosure_grant_evaluate_route_contract",
  "disclosure_query_budget_contract_smoke",
  "background_disclosure_lattice_smoke",
  "technical_spec_disclosure_grant_smoke",
] as const;

const SAMPLE_INPUT: MoralTradeDisclosureGrantInput = {
  requestId: "disclosure-sample-001",
  fieldKeys: ["exact_wish", "source_summary"],
  purpose: "Decide whether a specific, consent-stage introduction should proceed.",
  stage: "consent",
  accessLevel: "specific",
  status: "draft",
  ownerProfileScoped: true,
  counterpartyScoped: true,
  matchScoped: true,
};

function hasAll(values: readonly string[], required: readonly string[]) {
  return required.every((entry) => values.includes(entry));
}

function unique<T>(values: readonly T[]) {
  return Array.from(new Set(values));
}

function check(
  id: string,
  label: string,
  passed: boolean,
  evidence: string,
): MoralTradeDisclosureContractCheck {
  return {
    id,
    label,
    status: passed ? "pass" : "fail",
    evidence,
  };
}

function normalizeExpiryDays(input: MoralTradeDisclosureGrantInput) {
  if (typeof input.expiresInDays === "number" && Number.isFinite(input.expiresInDays)) {
    return Math.max(0, Math.round(input.expiresInDays));
  }

  return getDefaultGrantExpiryDays(input.stage);
}

function getDeniedFields(input: MoralTradeDisclosureGrantInput, allowedFields: readonly string[]) {
  return input.fieldKeys
    .map((field) => field.trim())
    .filter(Boolean)
    .filter((field, index, fields) => fields.indexOf(field) === index)
    .filter((field) => !allowedFields.includes(field));
}

function statusFromBlockers(blockers: readonly string[]): MoralTradeDisclosureDecisionStatus {
  if (blockers.some((blocker) => /narrow purpose/i.test(blocker))) {
    return "needs_purpose";
  }

  if (blockers.some((blocker) => /Unsupported disclosure field/i.test(blocker))) {
    return "unsupported_fields";
  }

  if (blockers.some((blocker) => /not available before|cannot be granted/i.test(blocker))) {
    return "needs_consent_stage";
  }

  if (blockers.some((blocker) => /raw source|contact detail|redact/i.test(blocker))) {
    return "needs_redaction";
  }

  return blockers.length ? "unsupported_fields" : "grant_ready";
}

export function evaluateMoralTradeDisclosureGrant(
  input: MoralTradeDisclosureGrantInput,
): MoralTradeDisclosureDecision {
  const validation = validateDisclosureRequest({
    accessLevel: input.accessLevel,
    fieldKeys: input.fieldKeys,
    purpose: input.purpose,
    stage: input.stage,
  });
  const blockers = [...validation.errors];
  const factorCodes: MoralTradeDisclosureFactorCode[] = [
    "purpose_bound_disclosure",
    "field_level_grant",
    "stage_lattice_enforced",
    "owner_approval_required",
    "no_private_feed_mining",
    "non_mutating_evaluation",
    "expiry_window_named",
  ];

  if (input.stage === "registry") {
    factorCodes.push("registry_broad_preview_only");
  }

  if (input.stage === "consent") {
    factorCodes.push("mutual_consent_required");
  }

  if (input.stage === "introduced" || input.fieldKeys.includes("contact_email")) {
    factorCodes.push("introduced_contact_only");
  }

  if (input.containsRawSourceNotes) {
    blockers.push("raw_source_notes_must_not_be_disclosed");
    factorCodes.push("raw_source_notes_redacted");
  }

  if (input.containsContactDetails && input.stage !== "introduced") {
    blockers.push("contact_details_require_introduced_stage");
  }

  return {
    status: statusFromBlockers(blockers),
    allowedFields: validation.allowedFields,
    deniedFields: getDeniedFields(input, validation.allowedFields),
    factorCodes: unique(factorCodes),
    ownerApprovalRequired: true,
    stateMutation: false,
    accessLevel: input.accessLevel,
    stage: input.stage,
    grantStatus: input.status ?? "draft",
    expiryDays: normalizeExpiryDays(input),
    privacyActions: blockers.length
      ? [
          "Keep exact wishes, exact asks, sensitive constraints, contact details, and raw source notes hidden until a valid purpose-bound grant exists.",
        ]
      : [
          "Return only the approved field keys for the named purpose, stage, counterparty, and match scope.",
        ],
    blockers,
  };
}

export function validateMoralTradeDisclosureDecision(
  decision: MoralTradeDisclosureDecision,
): MoralTradeDisclosureDecisionValidation {
  const factorCodes = decision.factorCodes.map(String);
  const checks = [
    check(
      "owner-approval-and-nonmutation",
      "Disclosure decisions require owner approval and never mutate live state",
      decision.ownerApprovalRequired === true && decision.stateMutation === false,
      `ownerApprovalRequired ${decision.ownerApprovalRequired}; stateMutation ${decision.stateMutation}`,
    ),
    check(
      "approved-factor-codes",
      "Decision uses only approved disclosure factor codes",
      factorCodes.every((code) => APPROVED_FACTOR_CODES.includes(code as MoralTradeDisclosureFactorCode)),
      factorCodes.join(", "),
    ),
    check(
      "required-factor-codes",
      "Decision preserves purpose, grant, stage, owner-approval, and non-mutating factors",
      hasAll(factorCodes, [
        "purpose_bound_disclosure",
        "field_level_grant",
        "stage_lattice_enforced",
        "owner_approval_required",
        "non_mutating_evaluation",
      ]),
      factorCodes.join(", "),
    ),
    check(
      "grant-ready-has-fields-and-no-blockers",
      "Ready grants have allowed fields and no blockers",
      decision.status !== "grant_ready" ||
        (decision.allowedFields.length > 0 && decision.blockers.length === 0),
      `${decision.status}; allowed ${decision.allowedFields.join(", ")}; blockers ${decision.blockers.length}`,
    ),
    check(
      "blocked-grants-name-privacy-action",
      "Blocked grants name privacy actions",
      decision.status === "grant_ready" || decision.privacyActions.length > 0,
      decision.privacyActions.join(" | "),
    ),
    check(
      "expiry-window",
      "Disclosure decisions name a bounded expiry window",
      Number.isInteger(decision.expiryDays) && decision.expiryDays >= 0 && decision.expiryDays <= 3650,
      String(decision.expiryDays),
    ),
  ];
  const blockers = checks
    .filter((entry) => entry.status === "fail")
    .map((entry) => `${entry.id}: ${entry.label}`);

  return {
    status: blockers.length ? "fail" : "pass",
    validatorName: "moral-trade-disclosure-decision",
    validatorVersion: MORAL_TRADE_DISCLOSURE_VALIDATOR_VERSION,
    checks,
    blockers,
  };
}

export function getMoralTradeDisclosureContract(): MoralTradeDisclosureContract {
  const sampleDecision = evaluateMoralTradeDisclosureGrant(SAMPLE_INPUT);

  return {
    version: MORAL_TRADE_DISCLOSURE_CONTRACT_VERSION,
    purpose:
      "Public contract for consent-gated disclosure and privacy grants: publish broad previews first, require purpose-bound field grants for exact wishes and source summaries, require introduced-stage contact disclosure, and keep raw source notes and private feeds out of public matching.",
    decisioningMode: "deterministic_disclosure_grant_scope_only",
    stateMutation: false,
    accessLevels: [...DISCLOSURE_ACCESS_LEVELS],
    audienceStages: [...DISCLOSURE_AUDIENCE_STAGES],
    grantStatuses: [...GRANT_STATUSES],
    disclosureFields: BACKGROUND_DISCLOSURE_FIELDS,
    redactedFields: [...REDACTED_FIELDS],
    searchPrivacyControls: [...SEARCH_PRIVACY_CONTROLS],
    approvedFactorCodes: [...APPROVED_FACTOR_CODES],
    invariants: [
      "Registry-stage disclosure is limited to broad previews such as cause areas and coarse location.",
      "Exact wishes, exact asks, capabilities, constraints, verification preferences, and source summaries require the consent stage and a narrow purpose.",
      "Contact details require the introduced stage and explicit owner approval.",
      "Raw source notes, private feed payloads, exact private wishes before consent, and sensitive constraints in public previews stay redacted.",
      "Disclosure grants are field-level, purpose-bound, stage-bound, expiry-aware, and scoped to owner, counterparty, or match context.",
      "Registry search must enforce query budgets, sparse-result privacy floors, redacted overlap tokens, and risk-signal logging before broad previews can be relied on.",
      "Evaluators cannot disclose, introduce, contact, approve, revoke, or mutate records; live grants require authenticated owner-controlled actions.",
    ],
    sampleInput: SAMPLE_INPUT,
    sampleDecision,
    contractTests: [...CONTRACT_TESTS],
  };
}

export function validateMoralTradeDisclosureContract(
  contract: MoralTradeDisclosureContract = getMoralTradeDisclosureContract(),
): MoralTradeDisclosureContractValidation {
  const sampleDecisionValidation = validateMoralTradeDisclosureDecision(
    contract.sampleDecision,
  );
  const fieldKeys = contract.disclosureFields.map((field) => field.key);
  const searchPrivacyControlKeys = contract.searchPrivacyControls.map((control) => control.key);
  const queryBudgetControl = contract.searchPrivacyControls.find(
    (control) => control.key === "daily_registry_query_budget",
  );
  const sparseResultControl = contract.searchPrivacyControls.find(
    (control) => control.key === "sparse_result_privacy_floor",
  );
  const checks = [
    check(
      "lattice-coverage",
      "Contract publishes disclosure stages, access levels, and grant statuses",
      hasAll(contract.accessLevels, DISCLOSURE_ACCESS_LEVELS) &&
        hasAll(contract.audienceStages, DISCLOSURE_AUDIENCE_STAGES) &&
        hasAll(contract.grantStatuses, GRANT_STATUSES),
      `${contract.accessLevels.join(", ")} | ${contract.audienceStages.join(", ")} | ${contract.grantStatuses.join(", ")}`,
    ),
    check(
      "field-contract-coverage",
      "Contract publishes field-level disclosure boundaries",
      hasAll(fieldKeys, [
        "cause_areas",
        "exact_wish",
        "exact_ask",
        "constraints",
        "verification_preferences",
        "source_summary",
        "contact_email",
      ]) &&
        contract.disclosureFields.every((field) => field.key && field.minStage && field.maxLevel),
      fieldKeys.join(", "),
    ),
    check(
      "sample-decision-validation",
      "Sample disclosure decision validates",
      sampleDecisionValidation.status === "pass" &&
        contract.sampleDecision.status === "grant_ready" &&
        contract.sampleDecision.allowedFields.includes("exact_wish") &&
        contract.sampleDecision.stateMutation === false,
      `${contract.sampleDecision.status}; blockers ${sampleDecisionValidation.blockers.length}`,
    ),
    check(
      "stage-and-contact-invariants",
      "Contract preserves broad preview, consent, and introduced-stage boundaries",
      contract.invariants.some((entry) => /Registry-stage disclosure is limited to broad previews/i.test(entry)) &&
        contract.invariants.some((entry) => /Exact wishes.*require the consent stage/i.test(entry)) &&
        contract.invariants.some((entry) => /Contact details require the introduced stage/i.test(entry)),
      contract.invariants.join(" | "),
    ),
    check(
      "redaction-invariants",
      "Contract preserves raw-source and private-field redactions",
      hasAll(contract.redactedFields, REDACTED_FIELDS) &&
        contract.invariants.some((entry) => /Raw source notes.*stay redacted/i.test(entry)),
      contract.redactedFields.join(", "),
    ),
    check(
      "search-privacy-controls",
      "Contract publishes query budget, sparse-result, fingerprint, overlap-token, and risk controls",
      hasAll(searchPrivacyControlKeys, REQUIRED_SEARCH_PRIVACY_CONTROLS) &&
        queryBudgetControl?.scope === "registry_search" &&
        queryBudgetControl.dailyLimit === BACKGROUND_QUERY_DAILY_LIMITS.registry_search &&
        queryBudgetControl.cost === BACKGROUND_QUERY_COSTS.registry_search &&
        sparseResultControl?.minResultCount === 3 &&
        sparseResultControl.minSpecificity === 3 &&
        contract.invariants.some((entry) =>
          /query budgets.*sparse-result privacy floors.*redacted overlap tokens/i.test(entry),
        ),
      searchPrivacyControlKeys.join(", "),
    ),
    check(
      "nonmutating-owner-control",
      "Contract evaluator is non-mutating and owner-controlled",
      contract.stateMutation === false &&
        contract.decisioningMode === "deterministic_disclosure_grant_scope_only" &&
        contract.invariants.some((entry) => /authenticated owner-controlled actions/i.test(entry)),
      `${contract.decisioningMode}; stateMutation ${contract.stateMutation}`,
    ),
    check(
      "approved-factor-codes",
      "Contract publishes approved disclosure factor codes",
      hasAll(contract.approvedFactorCodes, APPROVED_FACTOR_CODES),
      contract.approvedFactorCodes.join(", "),
    ),
    check(
      "contract-tests",
      "Disclosure contract test hooks are named",
      CONTRACT_TESTS.every((hook) => contract.contractTests.includes(hook)),
      contract.contractTests.join(", "),
    ),
  ];
  const blockers = checks
    .filter((entry) => entry.status === "fail")
    .map((entry) => `${entry.id}: ${entry.label}`);

  return {
    status: blockers.length ? "fail" : "pass",
    validatorName: "moral-trade-disclosure-grant-contract",
    validatorVersion: MORAL_TRADE_DISCLOSURE_VALIDATOR_VERSION,
    contractVersion: contract.version,
    checks,
    blockers,
  };
}
