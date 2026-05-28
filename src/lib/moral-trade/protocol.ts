import protocolProfileJson from "../../../config/moral-trade/protocol-profile.json";

export const MORAL_TRADE_PROTOCOL_VALIDATOR_VERSION = "moral-trade-core-validator-v0.1";

export type MoralTradeProtocolProfile = {
  version: string;
  purpose: string;
  requiredProposalFields: Array<{ key: string; label: string }>;
  statusValues: string[];
  stateTransitionRules: MoralTradeStateTransitionRule[];
  guardrails: Array<{ code: string; label: string; rule: string }>;
  factorCodes: Array<{ code: string; label: string; description: string }>;
  evidenceSchemas: Array<{ key: string; label: string; required: string[] }>;
  provenanceModel: {
    entities: string[];
    activities: string[];
    agents: string[];
  };
  provenanceObjectSchemas: Array<{ key: string; label: string; required: string[] }>;
  qualityMetrics: string[];
};

export interface MoralTradeStateTransitionRule {
  key: string;
  from: string;
  allowedTo: string[];
  requires: string[];
  provenanceActivity: string;
}

export interface MoralTradeProposalStateTransitionInput {
  from: string;
  to: string;
  proposal: Record<string, unknown>;
  humanReviewApproved?: boolean;
  evidenceReviewed?: boolean;
  disputeRecordCreated?: boolean;
  provenanceActivityRecorded?: boolean;
  policyConflictCodes?: string[];
}

export interface MoralTradeProposalStateTransitionValidation {
  status: "pass" | "fail";
  from: string;
  to: string;
  allowed: boolean;
  missingRequiredFields: string[];
  appliedRule: MoralTradeStateTransitionRule | null;
  requiredChecks: string[];
  blockers: string[];
}

export interface MoralTradeProtocolValidatorCheck {
  id: string;
  label: string;
  status: "pass" | "fail";
  evidence: string;
}

export interface MoralTradeProtocolValidation {
  status: "pass" | "fail";
  validatorName: "moral-trade-core-protocol-profile";
  validatorVersion: string;
  profileVersion: string;
  checks: MoralTradeProtocolValidatorCheck[];
  blockers: string[];
}

const protocolProfile = protocolProfileJson as MoralTradeProtocolProfile;

const REQUIRED_STATUSES = [
  "draft",
  "submitted",
  "needs_clarification",
  "needs_evidence",
  "needs_human_review",
  "challenge_window",
  "completion_reviewed",
  "disputed_unresolved",
  "blocked",
  "matchable",
] as const;

const REQUIRED_GUARDRAILS = [
  "anti_threat_baseline",
  "no_autonomous_outreach",
  "no_global_moral_ranking",
  "privacy_redaction_required",
  "separate_trust_axes",
] as const;

const REQUIRED_FACTOR_CODES = [
  "cause_area_complementarity",
  "baseline_stated",
  "cause_area_overlap",
  "evidence_rule_named",
  "externality_review_required",
  "human_review_required",
  "party_relative_benefit",
  "location_constraint_satisfied",
  "privacy_safe_preview",
  "privacy_stage_compatible",
  "stated_exclusions_clear",
  "terms_complete",
  "trade_mode_compatible",
  "verification_preference_compatible",
] as const;

const REQUIRED_EVIDENCE_SCHEMAS = [
  "pledge_swap_v1",
  "donation_offset_v1",
  "paid_action_v1",
  "public_good_commitment_v1",
] as const;

const REQUIRED_PROVENANCE_OBJECT_SCHEMAS = [
  "evidence_artifact",
  "evidence_claim",
  "external_entity_reference",
  "match_signal",
  "traceability_event",
  "review_decision",
  "provenance_activity",
  "provenance_agent",
] as const;

const COMPLETE_PROPOSAL_REQUIRED_STATUSES = [
  "submitted",
  "needs_evidence",
  "needs_human_review",
  "challenge_window",
  "matchable",
  "completion_reviewed",
] as const;

const HUMAN_REVIEW_REQUIRED_STATUSES = ["matchable", "completion_reviewed"] as const;

function hasAll(values: readonly string[], required: readonly string[]) {
  return required.every((entry) => values.includes(entry));
}

function check(
  id: string,
  label: string,
  passed: boolean,
  evidence: string,
): MoralTradeProtocolValidatorCheck {
  return {
    id,
    label,
    status: passed ? "pass" : "fail",
    evidence,
  };
}

export function getMoralTradeProtocolProfile() {
  return protocolProfile;
}

function protocolFieldIsPresent(value: unknown) {
  if (Array.isArray(value)) {
    return value.some((entry) => String(entry ?? "").trim().length > 0);
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return true;
  }

  return String(value ?? "").trim().length > 0;
}

export function getMissingMoralTradeRequiredProposalFields(
  proposal: Record<string, unknown>,
  profile: MoralTradeProtocolProfile = protocolProfile,
) {
  return profile.requiredProposalFields
    .map((field) => field.key)
    .filter((key) => !protocolFieldIsPresent(proposal[key]));
}

function getStateTransitionRule(from: string, profile: MoralTradeProtocolProfile = protocolProfile) {
  return profile.stateTransitionRules.find((rule) => rule.from === from) ?? null;
}

export function validateMoralTradeProposalStateTransition(
  input: MoralTradeProposalStateTransitionInput,
  profile: MoralTradeProtocolProfile = protocolProfile,
): MoralTradeProposalStateTransitionValidation {
  const statusValues = new Set(profile.statusValues);
  const blockers: string[] = [];
  const appliedRule = getStateTransitionRule(input.from, profile);
  const requiredChecks = appliedRule?.requires ?? [];
  const missingRequiredFields = getMissingMoralTradeRequiredProposalFields(input.proposal, profile);

  if (!statusValues.has(input.from)) {
    blockers.push(`unknown_from_status:${input.from}`);
  }

  if (!statusValues.has(input.to)) {
    blockers.push(`unknown_to_status:${input.to}`);
  }

  if (!appliedRule) {
    blockers.push(`missing_transition_rule:${input.from}`);
  } else if (!appliedRule.allowedTo.includes(input.to)) {
    blockers.push(`invalid_transition:${input.from}->${input.to}`);
  }

  if (
    COMPLETE_PROPOSAL_REQUIRED_STATUSES.includes(
      input.to as (typeof COMPLETE_PROPOSAL_REQUIRED_STATUSES)[number],
    ) &&
    missingRequiredFields.length
  ) {
    blockers.push(`missing_required_fields:${missingRequiredFields.join(",")}`);
  }

  if (
    HUMAN_REVIEW_REQUIRED_STATUSES.includes(
      input.to as (typeof HUMAN_REVIEW_REQUIRED_STATUSES)[number],
    ) &&
    !input.humanReviewApproved
  ) {
    blockers.push(`human_review_required_before:${input.to}`);
  }

  if (input.to === "completion_reviewed" && !input.evidenceReviewed) {
    blockers.push("evidence_review_required_before:completion_reviewed");
  }

  if (input.to === "disputed_unresolved" && !input.disputeRecordCreated) {
    blockers.push("dispute_record_required_before:disputed_unresolved");
  }

  if (
    input.to === "blocked" &&
    !input.humanReviewApproved &&
    !(input.policyConflictCodes && input.policyConflictCodes.length > 0)
  ) {
    blockers.push("policy_or_human_review_required_before:blocked");
  }

  if (!input.provenanceActivityRecorded) {
    blockers.push("transition_event_record_required");
  }

  return {
    status: blockers.length ? "fail" : "pass",
    from: input.from,
    to: input.to,
    allowed: blockers.length === 0,
    missingRequiredFields,
    appliedRule,
    requiredChecks,
    blockers,
  };
}

export function validateMoralTradeProtocolProfile(): MoralTradeProtocolValidation {
  const transitionStatusValues = protocolProfile.stateTransitionRules.flatMap((rule) => [
    rule.from,
    ...rule.allowedTo,
  ]);
  const checks = [
    check(
      "required-proposal-fields",
      "Required proposal fields",
      protocolProfile.requiredProposalFields.length >= 9 &&
        hasAll(
          protocolProfile.requiredProposalFields.map((field) => field.key),
          [
            "format",
            "cause_areas",
            "offered_action",
            "requested_action",
            "baseline_statement",
            "duration",
            "exit_conditions",
            "verification_method",
            "public_description",
          ],
        ),
      `${protocolProfile.requiredProposalFields.length} required field(s) published.`,
    ),
    check(
      "status-values",
      "Review status values",
      hasAll(protocolProfile.statusValues, REQUIRED_STATUSES),
      protocolProfile.statusValues.join(", "),
    ),
    check(
      "state-transition-rules",
      "Proposal state transition rules",
      protocolProfile.stateTransitionRules.length >= 6 &&
        hasAll(
          protocolProfile.stateTransitionRules.map((rule) => rule.from),
          [
            "draft",
            "submitted",
            "needs_evidence",
            "needs_human_review",
            "challenge_window",
            "disputed_unresolved",
            "matchable",
            "completion_reviewed",
          ],
        ) &&
        transitionStatusValues.every((status) => protocolProfile.statusValues.includes(status)) &&
        protocolProfile.stateTransitionRules.every(
          (rule) =>
            rule.requires.includes("transition_event_recorded") &&
            protocolProfile.provenanceModel.activities.includes(rule.provenanceActivity),
        ),
      `${protocolProfile.stateTransitionRules.length} state transition rule(s) publish allowed edges, required checks, and provenance activities.`,
    ),
    check(
      "guardrails",
      "Safety and privacy guardrails",
      hasAll(
        protocolProfile.guardrails.map((guardrail) => guardrail.code),
        REQUIRED_GUARDRAILS,
      ),
      `${protocolProfile.guardrails.length} guardrail(s), including anti-threat and redaction rules.`,
    ),
    check(
      "factor-codes",
      "Public factor-code explanations",
      hasAll(
        protocolProfile.factorCodes.map((factor) => factor.code),
        REQUIRED_FACTOR_CODES,
      ),
      `${protocolProfile.factorCodes.length} factor code(s) available for match and review explanations.`,
    ),
    check(
      "evidence-schemas",
      "Evidence schemas by trade format",
      hasAll(
        protocolProfile.evidenceSchemas.map((schema) => schema.key),
        REQUIRED_EVIDENCE_SCHEMAS,
      ),
      protocolProfile.evidenceSchemas.map((schema) => schema.key).join(", "),
    ),
    check(
      "provenance-model",
      "Provenance objects",
      protocolProfile.provenanceModel.entities.length >= 3 &&
        protocolProfile.provenanceModel.activities.length >= 3 &&
        protocolProfile.provenanceModel.agents.length >= 3,
      `${protocolProfile.provenanceModel.entities.length} entities, ${protocolProfile.provenanceModel.activities.length} activities, ${protocolProfile.provenanceModel.agents.length} agents.`,
    ),
    check(
      "provenance-object-schemas",
      "Provenance object schemas",
      hasAll(
        protocolProfile.provenanceObjectSchemas.map((schema) => schema.key),
        REQUIRED_PROVENANCE_OBJECT_SCHEMAS,
      ) &&
        protocolProfile.provenanceObjectSchemas.every((schema) => schema.required.length >= 3),
      `${protocolProfile.provenanceObjectSchemas.length} object schema(s) published for evidence and review provenance.`,
    ),
    check(
      "quality-metrics",
      "Quality and safety metrics",
      protocolProfile.qualityMetrics.length >= 7 &&
        protocolProfile.qualityMetrics.includes("privacy_leakage_incidents") &&
        protocolProfile.qualityMetrics.includes("human_overrule_rate"),
      `${protocolProfile.qualityMetrics.length} metric(s) published.`,
    ),
  ];
  const blockers = checks
    .filter((entry) => entry.status === "fail")
    .map((entry) => `${entry.id}: ${entry.label}`);

  return {
    status: blockers.length ? "fail" : "pass",
    validatorName: "moral-trade-core-protocol-profile",
    validatorVersion: MORAL_TRADE_PROTOCOL_VALIDATOR_VERSION,
    profileVersion: protocolProfile.version,
    checks,
    blockers,
  };
}
