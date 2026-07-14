export const MORAL_TRADE_TEMPLATE_CONFORMANCE_CONTRACT_VERSION =
  "moral-trade-template-conformance-v0.1-2026-06";
export const MORAL_TRADE_TEMPLATE_CONFORMANCE_VALIDATOR_VERSION =
  "moral-trade-template-conformance-validator-v0.1";

export type MoralTradeTemplateConformanceTransition =
  | "draft_preview"
  | "live_offer_publication"
  | "matched_trade_lock"
  | "payment_capture"
  | "reliance_bearing_transition"
  | "public_metric_publication"
  | "release_gate_promotion";

export type MoralTradeTemplateTradeType =
  | "donation_offset"
  | "pledge_swap"
  | "compensated_moral_action"
  | "performance_bond_condition"
  | "side_agreement";

export type MoralTradeTemplateSubjectType =
  | "offset_offer"
  | "pledge_swap_offer"
  | "matched_trade_lock_proposal"
  | "cleared_trade_agreement"
  | "seed_template"
  | "worked_example";

export type MoralTradeTemplateState =
  | "draft"
  | "active"
  | "deprecated"
  | "superseded"
  | "blocked";

export type MoralTradeTemplateParameterPolicyStatus =
  | "resolved_immutable"
  | "missing"
  | "mutable"
  | "stale"
  | "superseded";

export type MoralTradeTemplateOffTemplateBehavior =
  | "block"
  | "preview_only"
  | "manual_review";

export type MoralTradeTemplateConformanceState =
  | "draft"
  | "conforms"
  | "off_template_preview_only"
  | "off_template_manual_review"
  | "blocked"
  | "superseded";

export interface MoralTradeApprovedTradeTemplateRecord {
  templateId: string;
  templateSlug: string;
  templateVersion: string;
  tradeType: MoralTradeTemplateTradeType;
  templateState: MoralTradeTemplateState;
  parameterPolicyHash: string;
  parameterPolicyStatus: MoralTradeTemplateParameterPolicyStatus;
  allowedRecipientDestinationClasses: string[];
  eligibleCauseBucketRefs: string[];
  allowedEvidenceClaimTypes: string[];
  challengeWindowPolicyRef: string | null;
  cancellationRuleRef: string | null;
  requiredControlPackRef: string | null;
  prohibitedParameterCodes: string[];
  offTemplateBehavior: MoralTradeTemplateOffTemplateBehavior;
  reviewedAt: string;
  expiresAt: string | null;
  supersededBy: string | null;
}

export interface MoralTradeTemplateInstanceRecord {
  instanceId: string;
  approvedTemplateRef: string;
  subjectType: MoralTradeTemplateSubjectType;
  subjectRef: string;
  submittedParameterHash: string;
  normalizedParameterHash: string;
  templateParameterPolicyRef: string;
  conformanceState: MoralTradeTemplateConformanceState;
  offTemplateReasonCodes: string[];
  freeTextCreatesNewObligations: boolean;
  freeTextCreatesNewEvidenceStandards: boolean;
  freeTextCreatesSidePayments: boolean;
  freeTextCreatesNewCounterparties: boolean;
  neutralReviewerApproved: boolean;
  renewedParticipantConfirmationRef: string | null;
  reviewedAt: string;
  expiresAt: string | null;
  supersededBy: string | null;
}

export interface MoralTradeTemplateConformanceTransitionDefinition {
  key: MoralTradeTemplateConformanceTransition;
  label: string;
  requiresTemplateInstance: boolean;
  requiresActiveTemplate: boolean;
  allowsOffTemplateException: boolean;
  userFacingBlockerCategory: string;
}

export interface MoralTradeTemplateConformanceEvaluationInput {
  transition: MoralTradeTemplateConformanceTransition;
  checkedAt?: string;
  templates: MoralTradeApprovedTradeTemplateRecord[];
  instances: MoralTradeTemplateInstanceRecord[];
}

export interface MoralTradeTemplateConformanceEvaluation {
  status: "pass" | "blocked";
  transition: MoralTradeTemplateConformanceTransition;
  checkedAt: string;
  requiredInstanceCount: number;
  passingInstanceCount: number;
  conformingInstanceCount: number;
  offTemplateExceptionCount: number;
  blockers: string[];
  userFacingBlockerCategories: string[];
}

export interface MoralTradeTemplateConformanceCheck {
  id: string;
  label: string;
  status: "pass" | "fail";
  evidence: string;
}

export interface MoralTradeTemplateConformanceValidation {
  status: "pass" | "fail";
  validatorName: "moral-trade-template-conformance-contract";
  validatorVersion: string;
  contractVersion: string;
  checks: MoralTradeTemplateConformanceCheck[];
  blockers: string[];
}

export interface MoralTradeTemplateConformanceContract {
  version: string;
  purpose: string;
  failClosedRule: string;
  privacyBoundary: string;
  firstClassRecordTables: string[];
  policySnapshotSubjects: string[];
  tradeTypes: MoralTradeTemplateTradeType[];
  subjectTypes: MoralTradeTemplateSubjectType[];
  templateStates: MoralTradeTemplateState[];
  conformanceStates: MoralTradeTemplateConformanceState[];
  offTemplateBehaviors: MoralTradeTemplateOffTemplateBehavior[];
  failClosedStatuses: Array<
    | MoralTradeTemplateState
    | MoralTradeTemplateConformanceState
    | MoralTradeTemplateParameterPolicyStatus
  >;
  transitionDefinitions: MoralTradeTemplateConformanceTransitionDefinition[];
  sampleEvaluations: MoralTradeTemplateConformanceEvaluation[];
  contractTests: string[];
}

const HASH_PATTERN = /^sha256:[a-f0-9]{64}$/;
const MAX_REVIEW_AGE_DAYS = 120;

const FIRST_CLASS_RECORD_TABLES = [
  "moral_trade_approved_trade_templates",
  "moral_trade_template_parameter_policies",
  "moral_trade_template_instance_records",
] as const;

const POLICY_SNAPSHOT_SUBJECTS = [
  "approved_trade_template",
  "template_parameter",
] as const;

const TRADE_TYPES: MoralTradeTemplateTradeType[] = [
  "donation_offset",
  "pledge_swap",
  "compensated_moral_action",
  "performance_bond_condition",
  "side_agreement",
];

const SUBJECT_TYPES: MoralTradeTemplateSubjectType[] = [
  "offset_offer",
  "pledge_swap_offer",
  "matched_trade_lock_proposal",
  "cleared_trade_agreement",
  "seed_template",
  "worked_example",
];

const TEMPLATE_STATES: MoralTradeTemplateState[] = [
  "draft",
  "active",
  "deprecated",
  "superseded",
  "blocked",
];

const CONFORMANCE_STATES: MoralTradeTemplateConformanceState[] = [
  "draft",
  "conforms",
  "off_template_preview_only",
  "off_template_manual_review",
  "blocked",
  "superseded",
];

const OFF_TEMPLATE_BEHAVIORS: MoralTradeTemplateOffTemplateBehavior[] = [
  "block",
  "preview_only",
  "manual_review",
];

const FAIL_CLOSED_STATUSES = [
  "draft",
  "deprecated",
  "superseded",
  "blocked",
  "missing",
  "mutable",
  "stale",
] as const;

const FORBIDDEN_OFF_TEMPLATE_REASON_CODES = [
  "new_obligation",
  "new_evidence_standard",
  "new_side_payment",
  "new_counterparty",
] as const;

const TRANSITION_DEFINITIONS: MoralTradeTemplateConformanceTransitionDefinition[] = [
  {
    key: "draft_preview",
    label: "Draft preview",
    requiresTemplateInstance: false,
    requiresActiveTemplate: false,
    allowsOffTemplateException: false,
    userFacingBlockerCategory: "Template conformance is preview-only",
  },
  {
    key: "live_offer_publication",
    label: "Live offer publication",
    requiresTemplateInstance: true,
    requiresActiveTemplate: true,
    allowsOffTemplateException: true,
    userFacingBlockerCategory: "Offer needs an approved template or reviewed exception",
  },
  {
    key: "matched_trade_lock",
    label: "Matched-trade lock",
    requiresTemplateInstance: true,
    requiresActiveTemplate: true,
    allowsOffTemplateException: true,
    userFacingBlockerCategory: "Lock needs approved template conformance",
  },
  {
    key: "payment_capture",
    label: "Payment capture",
    requiresTemplateInstance: true,
    requiresActiveTemplate: true,
    allowsOffTemplateException: true,
    userFacingBlockerCategory: "Payment needs approved template conformance",
  },
  {
    key: "reliance_bearing_transition",
    label: "Reliance-bearing transition",
    requiresTemplateInstance: true,
    requiresActiveTemplate: true,
    allowsOffTemplateException: true,
    userFacingBlockerCategory: "Reliance needs approved template conformance",
  },
  {
    key: "public_metric_publication",
    label: "Public metric publication",
    requiresTemplateInstance: true,
    requiresActiveTemplate: true,
    allowsOffTemplateException: true,
    userFacingBlockerCategory:
      "Public metrics need template-bounded completed-trade evidence",
  },
  {
    key: "release_gate_promotion",
    label: "Release-gate promotion",
    requiresTemplateInstance: true,
    requiresActiveTemplate: true,
    allowsOffTemplateException: true,
    userFacingBlockerCategory:
      "Release promotion needs template-conformance governance",
  },
];

const CONTRACT_TESTS = [
  "template_conformance_contract_validator",
  "approved_trade_template_parameter_test",
  "off_template_exception_requires_neutral_review",
  "free_text_cannot_create_new_obligations",
  "template_conformance_route_health_spec_and_migration_wiring",
] as const;

function check(
  id: string,
  label: string,
  passed: boolean,
  evidence: string,
): MoralTradeTemplateConformanceCheck {
  return {
    id,
    label,
    status: passed ? "pass" : "fail",
    evidence,
  };
}

function isHash(value: string | null) {
  return typeof value === "string" && HASH_PATTERN.test(value);
}

function nonEmpty(values: string[]) {
  return values.some((value) => value.trim().length > 0);
}

function daysBetween(earlier: string, later: string) {
  const earlierTimestamp = Date.parse(earlier);
  const laterTimestamp = Date.parse(later);

  if (!Number.isFinite(earlierTimestamp) || !Number.isFinite(laterTimestamp)) {
    return Number.POSITIVE_INFINITY;
  }

  return (laterTimestamp - earlierTimestamp) / (1000 * 60 * 60 * 24);
}

function isExpired(value: string | null, checkedAt: string) {
  if (value === null) {
    return false;
  }

  const expiresAt = Date.parse(value);
  const checkedAtTimestamp = Date.parse(checkedAt);

  return (
    !Number.isFinite(expiresAt) ||
    !Number.isFinite(checkedAtTimestamp) ||
    expiresAt <= checkedAtTimestamp
  );
}

function makeHash(seed: string) {
  const hexSeed = seed.replace(/[^a-f0-9]/gi, "a") || "a";

  return `sha256:${hexSeed.padEnd(64, "0").slice(0, 64).toLowerCase()}`;
}

function makeSampleTemplate(
  overrides: Partial<MoralTradeApprovedTradeTemplateRecord> = {},
): MoralTradeApprovedTradeTemplateRecord {
  return {
    templateId: "template:tier-1-donation-offset",
    templateSlug: "tier-1-money-only-donation-offset",
    templateVersion: "2026-06-template-v1",
    tradeType: "donation_offset",
    templateState: "active",
    parameterPolicyHash: makeHash("template-parameter-policy"),
    parameterPolicyStatus: "resolved_immutable",
    allowedRecipientDestinationClasses: ["verified_charity", "fiscal_host"],
    eligibleCauseBucketRefs: ["cause-bucket:animal-welfare", "cause-bucket:global-health"],
    allowedEvidenceClaimTypes: ["payment_proof", "baseline_attestation"],
    challengeWindowPolicyRef: "challenge-window:standard-14-day",
    cancellationRuleRef: "cancellation:pre-lock-only",
    requiredControlPackRef: "risk-control-pack:tier-1-donation-offset",
    prohibitedParameterCodes: [...FORBIDDEN_OFF_TEMPLATE_REASON_CODES],
    offTemplateBehavior: "manual_review",
    reviewedAt: "2026-06-11T12:00:00.000Z",
    expiresAt: "2026-10-11T12:00:00.000Z",
    supersededBy: null,
    ...overrides,
  };
}

function makeSampleInstance(
  overrides: Partial<MoralTradeTemplateInstanceRecord> = {},
): MoralTradeTemplateInstanceRecord {
  return {
    instanceId: "template-instance:demo",
    approvedTemplateRef: "template:tier-1-donation-offset",
    subjectType: "offset_offer",
    subjectRef: "offset-offer:demo",
    submittedParameterHash: makeHash("submitted-parameters"),
    normalizedParameterHash: makeHash("normalized-parameters"),
    templateParameterPolicyRef: "template-parameter-policy:tier-1-donation-offset",
    conformanceState: "conforms",
    offTemplateReasonCodes: [],
    freeTextCreatesNewObligations: false,
    freeTextCreatesNewEvidenceStandards: false,
    freeTextCreatesSidePayments: false,
    freeTextCreatesNewCounterparties: false,
    neutralReviewerApproved: false,
    renewedParticipantConfirmationRef: null,
    reviewedAt: "2026-06-11T12:00:00.000Z",
    expiresAt: "2026-10-11T12:00:00.000Z",
    supersededBy: null,
    ...overrides,
  };
}

function getTransitionDefinition(
  transition: MoralTradeTemplateConformanceTransition,
) {
  return TRANSITION_DEFINITIONS.find((definition) => definition.key === transition);
}

function templateBlocks(
  template: MoralTradeApprovedTradeTemplateRecord,
  checkedAt: string,
) {
  const blockers: string[] = [];

  if (template.templateState !== "active") {
    blockers.push(
      `approved_template_not_active:${template.templateId}:${template.templateState}`,
    );
  }

  if (template.supersededBy) {
    blockers.push(`approved_template_superseded:${template.templateId}`);
  }

  if (template.parameterPolicyStatus !== "resolved_immutable") {
    blockers.push(
      `template_parameter_policy_not_immutable:${template.templateId}:${template.parameterPolicyStatus}`,
    );
  }

  if (!isHash(template.parameterPolicyHash)) {
    blockers.push(`invalid_template_parameter_policy_hash:${template.templateId}`);
  }

  if (daysBetween(template.reviewedAt, checkedAt) > MAX_REVIEW_AGE_DAYS) {
    blockers.push(`stale_approved_template:${template.templateId}`);
  }

  if (isExpired(template.expiresAt, checkedAt)) {
    blockers.push(`expired_approved_template:${template.templateId}`);
  }

  if (!nonEmpty(template.allowedRecipientDestinationClasses)) {
    blockers.push(`template_recipient_destination_class_missing:${template.templateId}`);
  }

  if (!nonEmpty(template.eligibleCauseBucketRefs)) {
    blockers.push(`template_cause_bucket_refs_missing:${template.templateId}`);
  }

  if (!nonEmpty(template.allowedEvidenceClaimTypes)) {
    blockers.push(`template_evidence_claim_types_missing:${template.templateId}`);
  }

  if (!template.challengeWindowPolicyRef) {
    blockers.push(`template_challenge_window_policy_missing:${template.templateId}`);
  }

  if (!template.cancellationRuleRef) {
    blockers.push(`template_cancellation_rule_missing:${template.templateId}`);
  }

  if (!template.requiredControlPackRef) {
    blockers.push(`template_required_control_pack_missing:${template.templateId}`);
  }

  return blockers;
}

function instanceBlocks({
  checkedAt,
  definition,
  instance,
  template,
}: {
  checkedAt: string;
  definition: MoralTradeTemplateConformanceTransitionDefinition;
  instance: MoralTradeTemplateInstanceRecord;
  template: MoralTradeApprovedTradeTemplateRecord | undefined;
}) {
  const blockers: string[] = [];

  if (!template) {
    blockers.push(`approved_template_missing:${instance.approvedTemplateRef}`);
  } else if (definition.requiresActiveTemplate) {
    blockers.push(...templateBlocks(template, checkedAt));
  }

  if (instance.supersededBy) {
    blockers.push(`template_instance_superseded:${instance.instanceId}`);
  }

  if (!isHash(instance.submittedParameterHash)) {
    blockers.push(`invalid_submitted_parameter_hash:${instance.instanceId}`);
  }

  if (!isHash(instance.normalizedParameterHash)) {
    blockers.push(`invalid_normalized_parameter_hash:${instance.instanceId}`);
  }

  if (!instance.templateParameterPolicyRef) {
    blockers.push(`template_parameter_policy_ref_missing:${instance.instanceId}`);
  }

  if (daysBetween(instance.reviewedAt, checkedAt) > MAX_REVIEW_AGE_DAYS) {
    blockers.push(`stale_template_instance:${instance.instanceId}`);
  }

  if (isExpired(instance.expiresAt, checkedAt)) {
    blockers.push(`expired_template_instance:${instance.instanceId}`);
  }

  if (instance.conformanceState === "blocked") {
    blockers.push(`template_instance_blocked:${instance.instanceId}`);
  }

  if (instance.conformanceState === "draft") {
    blockers.push(`template_instance_still_draft:${instance.instanceId}`);
  }

  if (instance.conformanceState === "superseded") {
    blockers.push(`template_instance_state_superseded:${instance.instanceId}`);
  }

  if (
    instance.conformanceState === "off_template_preview_only" &&
    definition.key !== "draft_preview"
  ) {
    blockers.push(`off_template_preview_only:${instance.instanceId}:${definition.key}`);
  }

  if (instance.conformanceState === "off_template_manual_review") {
    if (!definition.allowsOffTemplateException) {
      blockers.push(`off_template_exception_not_allowed:${instance.instanceId}`);
    }

    if (!template || template.offTemplateBehavior !== "manual_review") {
      blockers.push(`template_policy_disallows_off_template_exception:${instance.instanceId}`);
    }

    if (!instance.neutralReviewerApproved) {
      blockers.push(`off_template_neutral_review_missing:${instance.instanceId}`);
    }

    if (!instance.renewedParticipantConfirmationRef) {
      blockers.push(`off_template_renewed_confirmation_missing:${instance.instanceId}`);
    }
  }

  if (instance.freeTextCreatesNewObligations) {
    blockers.push(`free_text_creates_new_obligations:${instance.instanceId}`);
  }

  if (instance.freeTextCreatesNewEvidenceStandards) {
    blockers.push(`free_text_creates_new_evidence_standards:${instance.instanceId}`);
  }

  if (instance.freeTextCreatesSidePayments) {
    blockers.push(`free_text_creates_side_payments:${instance.instanceId}`);
  }

  if (instance.freeTextCreatesNewCounterparties) {
    blockers.push(`free_text_creates_new_counterparties:${instance.instanceId}`);
  }

  instance.offTemplateReasonCodes.forEach((code) => {
    if (
      FORBIDDEN_OFF_TEMPLATE_REASON_CODES.includes(
        code as (typeof FORBIDDEN_OFF_TEMPLATE_REASON_CODES)[number],
      )
    ) {
      blockers.push(`forbidden_off_template_reason:${instance.instanceId}:${code}`);
    }
  });

  return blockers;
}

export function evaluateMoralTradeTemplateConformance(
  input: MoralTradeTemplateConformanceEvaluationInput,
): MoralTradeTemplateConformanceEvaluation {
  const checkedAt = input.checkedAt ?? new Date().toISOString();
  const definition = getTransitionDefinition(input.transition);
  const blockers: string[] = [];
  const passingInstances = new Set<string>();
  const conformingInstances = new Set<string>();
  const offTemplateExceptions = new Set<string>();

  if (!definition) {
    return {
      status: "blocked",
      transition: input.transition,
      checkedAt,
      requiredInstanceCount: 0,
      passingInstanceCount: 0,
      conformingInstanceCount: 0,
      offTemplateExceptionCount: 0,
      blockers: [`unknown_template_conformance_transition:${input.transition}`],
      userFacingBlockerCategories: [
        "Template conformance state cannot be interpreted",
      ],
    };
  }

  if (definition.requiresTemplateInstance && input.instances.length === 0) {
    blockers.push("template_instance_record_required");
  }

  const templatesById = new Map(
    input.templates.map((template) => [template.templateId, template]),
  );

  input.instances.forEach((instance) => {
    const template = templatesById.get(instance.approvedTemplateRef);
    const recordBlockers = instanceBlocks({
      checkedAt,
      definition,
      instance,
      template,
    });

    if (recordBlockers.length === 0) {
      passingInstances.add(instance.instanceId);

      if (instance.conformanceState === "conforms") {
        conformingInstances.add(instance.instanceId);
      }

      if (instance.conformanceState === "off_template_manual_review") {
        offTemplateExceptions.add(instance.instanceId);
      }
    }

    blockers.push(...recordBlockers);
  });

  return {
    status: blockers.length === 0 ? "pass" : "blocked",
    transition: input.transition,
    checkedAt,
    requiredInstanceCount: definition.requiresTemplateInstance ? 1 : 0,
    passingInstanceCount: passingInstances.size,
    conformingInstanceCount: conformingInstances.size,
    offTemplateExceptionCount: offTemplateExceptions.size,
    blockers,
    userFacingBlockerCategories:
      blockers.length === 0 ? [] : [definition.userFacingBlockerCategory],
  };
}

export function getMoralTradeTemplateConformanceContract():
  MoralTradeTemplateConformanceContract {
  const previewSample = evaluateMoralTradeTemplateConformance({
    transition: "draft_preview",
    checkedAt: "2026-06-11T12:00:00.000Z",
    templates: [],
    instances: [],
  });
  const conformingLockSample = evaluateMoralTradeTemplateConformance({
    transition: "matched_trade_lock",
    checkedAt: "2026-06-11T12:00:00.000Z",
    templates: [makeSampleTemplate()],
    instances: [makeSampleInstance()],
  });
  const offTemplateExceptionSample = evaluateMoralTradeTemplateConformance({
    transition: "reliance_bearing_transition",
    checkedAt: "2026-06-11T12:00:00.000Z",
    templates: [makeSampleTemplate()],
    instances: [
      makeSampleInstance({
        conformanceState: "off_template_manual_review",
        offTemplateReasonCodes: ["amount_range_reviewed"],
        neutralReviewerApproved: true,
        renewedParticipantConfirmationRef: "participant-confirmation:renewed-template-exception",
      }),
    ],
  });
  const blockedFreeTextSample = evaluateMoralTradeTemplateConformance({
    transition: "payment_capture",
    checkedAt: "2026-06-11T12:00:00.000Z",
    templates: [makeSampleTemplate()],
    instances: [
      makeSampleInstance({
        conformanceState: "off_template_manual_review",
        offTemplateReasonCodes: ["new_side_payment"],
        freeTextCreatesSidePayments: true,
        neutralReviewerApproved: false,
        renewedParticipantConfirmationRef: null,
      }),
    ],
  });

  return {
    version: MORAL_TRADE_TEMPLATE_CONFORMANCE_CONTRACT_VERSION,
    purpose:
      "Fail-closed approved-template and parameter-conformance governance for non-public-goods offers, lock proposals, payment, reliance, and public metrics.",
    failClosedRule:
      "Donation offsets, pledge swaps, compensated moral-action agreements, performance-bond conditions, and side agreements can become live, locked, payable, reliance-bearing, or publicly counted only when an active approved template, immutable parameter policy, and template instance record show conformance. The template freezes recipient/destination class, eligible cause buckets, evidence claim types, challenge windows, cancellation rules, and required control pack references. Off-template exceptions require neutral reviewer approval and renewed participant confirmation.",
    privacyBoundary:
      "Template-conformance public surfaces publish only template kinds, table names, transition rules, and aggregate sample statuses; they do not expose private terms, exact caps, free-text narratives, hidden counterparty data, reviewer notes, private wishes, payment details, or participant-specific template instance records.",
    firstClassRecordTables: [...FIRST_CLASS_RECORD_TABLES],
    policySnapshotSubjects: [...POLICY_SNAPSHOT_SUBJECTS],
    tradeTypes: TRADE_TYPES,
    subjectTypes: SUBJECT_TYPES,
    templateStates: TEMPLATE_STATES,
    conformanceStates: CONFORMANCE_STATES,
    offTemplateBehaviors: OFF_TEMPLATE_BEHAVIORS,
    failClosedStatuses: [...FAIL_CLOSED_STATUSES],
    transitionDefinitions: TRANSITION_DEFINITIONS,
    sampleEvaluations: [
      previewSample,
      conformingLockSample,
      offTemplateExceptionSample,
      blockedFreeTextSample,
    ],
    contractTests: [...CONTRACT_TESTS],
  };
}

export function validateMoralTradeTemplateConformanceContract(
  contract = getMoralTradeTemplateConformanceContract(),
): MoralTradeTemplateConformanceValidation {
  const checks = [
    check(
      "first-class-template-conformance-tables",
      "Approved templates, parameter policies, and template instances are first-class records.",
      FIRST_CLASS_RECORD_TABLES.every((table) =>
        contract.firstClassRecordTables.includes(table),
      ),
      contract.firstClassRecordTables.join(", "),
    ),
    check(
      "policy-snapshot-subjects",
      "Template conformance is governed by immutable approved-template and parameter-policy snapshot subjects.",
      POLICY_SNAPSHOT_SUBJECTS.every((subject) =>
        contract.policySnapshotSubjects.includes(subject),
      ),
      contract.policySnapshotSubjects.join(", "),
    ),
    check(
      "template-trade-types",
      "Template conformance covers donation offsets, pledge swaps, compensated actions, performance-bond terms, and side agreements.",
      TRADE_TYPES.every((tradeType) => contract.tradeTypes.includes(tradeType)),
      contract.tradeTypes.join(", "),
    ),
    check(
      "parameter-envelope-fields",
      "Template records freeze recipient/destination class, cause buckets, evidence claim types, challenge windows, cancellation, and control-pack references.",
      /recipient\/destination class|evidence|challenge|cancellation|control pack/i.test(
        contract.failClosedRule,
      ) ||
        contract.sampleEvaluations.some((evaluation) =>
          evaluation.blockers.some((blocker) => blocker.includes("template_")),
        ),
      contract.failClosedRule,
    ),
    check(
      "high-risk-transitions",
      "Live, lock, payment, reliance, public-metric, and release-promotion transitions require template instances.",
      [
        "live_offer_publication",
        "matched_trade_lock",
        "payment_capture",
        "reliance_bearing_transition",
        "public_metric_publication",
        "release_gate_promotion",
      ].every((transition) =>
        contract.transitionDefinitions.some(
          (definition) =>
            definition.key === transition &&
            definition.requiresTemplateInstance &&
            definition.requiresActiveTemplate,
        ),
      ),
      contract.transitionDefinitions.map((definition) => definition.key).join(", "),
    ),
    check(
      "off-template-exception-control",
      "Off-template exceptions require neutral review and renewed participant confirmation before reliance-bearing transitions.",
      contract.sampleEvaluations.some(
        (evaluation) =>
          evaluation.transition === "reliance_bearing_transition" &&
          evaluation.status === "pass" &&
          evaluation.offTemplateExceptionCount === 1,
      ) &&
        /neutral reviewer|renewed participant confirmation/i.test(
          contract.failClosedRule,
        ),
      contract.sampleEvaluations
        .map(
          (evaluation) =>
            `${evaluation.transition}:${evaluation.status}:${evaluation.offTemplateExceptionCount}`,
        )
        .join(", "),
    ),
    check(
      "free-text-boundary",
      "User free text cannot create new obligations, evidence standards, side payments, or counterparties outside the approved parameter envelope.",
      contract.sampleEvaluations.some((evaluation) =>
        evaluation.blockers.some((blocker) =>
          /free_text_creates_(new_obligations|new_evidence_standards|side_payments|new_counterparties)/.test(
            blocker,
          ),
        ),
      ),
      contract.sampleEvaluations
        .flatMap((evaluation) => evaluation.blockers)
        .join(", "),
    ),
    check(
      "sample-evaluations",
      "The public contract exposes passing draft, conforming lock, reviewed off-template, and blocked free-text samples.",
      contract.sampleEvaluations.some(
        (evaluation) =>
          evaluation.transition === "draft_preview" &&
          evaluation.status === "pass",
      ) &&
        contract.sampleEvaluations.some(
          (evaluation) =>
            evaluation.transition === "matched_trade_lock" &&
            evaluation.status === "pass" &&
            evaluation.conformingInstanceCount === 1,
        ) &&
        contract.sampleEvaluations.some(
          (evaluation) =>
            evaluation.transition === "payment_capture" &&
            evaluation.status === "blocked",
        ),
      contract.sampleEvaluations
        .map((evaluation) => `${evaluation.transition}:${evaluation.status}`)
        .join(", "),
    ),
    check(
      "privacy-boundary",
      "Public template-conformance surfaces do not expose private terms or participant-specific template instances.",
      /do not expose private terms|participant-specific template instance records/i.test(
        contract.privacyBoundary,
      ),
      contract.privacyBoundary,
    ),
    check(
      "contract-tests",
      "Template-conformance contract test hooks are published.",
      CONTRACT_TESTS.every((testName) => contract.contractTests.includes(testName)),
      contract.contractTests.join(", "),
    ),
  ];
  const blockers = checks
    .filter((entry) => entry.status === "fail")
    .map((entry) => entry.id);

  return {
    status: blockers.length === 0 ? "pass" : "fail",
    validatorName: "moral-trade-template-conformance-contract",
    validatorVersion: MORAL_TRADE_TEMPLATE_CONFORMANCE_VALIDATOR_VERSION,
    contractVersion: contract.version,
    checks,
    blockers,
  };
}

const moralTradeTemplateConformance = {
  evaluateMoralTradeTemplateConformance,
  getMoralTradeTemplateConformanceContract,
  validateMoralTradeTemplateConformanceContract,
};

export default moralTradeTemplateConformance;
