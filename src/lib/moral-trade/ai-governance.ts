import aiGovernanceProfileJson from "../../../config/moral-trade/ai-governance-profile.json";

export const MORAL_TRADE_AI_GOVERNANCE_VALIDATOR_VERSION =
  "moral-trade-ai-governance-validator-v0.2";

type GovernanceEntry = {
  key: string;
  label: string;
  rule?: string;
  use?: string;
};

type MoralTradeFairnessDocumentation = {
  requiredBeforeAnyMl: boolean;
  metrics: string[];
  slices: string[];
  reviewRule: string;
};

type MoralTradeDocumentationTemplate = {
  key: string;
  label: string;
  requiredFields: string[];
  publicSummaryFields: string[];
  redactedFields: string[];
  reviewRule: string;
};

type MoralTradeDocumentationValue = string | number | boolean | string[];

type MoralTradeSampleDocumentationPacket = {
  key: string;
  reviewerStatus: "shadow_only" | "approved_for_pilot";
  fields: Record<string, MoralTradeDocumentationValue>;
  publicSummary: Record<string, MoralTradeDocumentationValue>;
  redactionNotes: string[];
};

export type MoralTradeAiGovernanceProfile = {
  version: string;
  purpose: string;
  decisioningMode: string;
  mlEnabledForMatching: boolean;
  mlEnabledForStateChanges: boolean;
  requiredDocumentationBeforeMl: Array<Required<Pick<GovernanceEntry, "key" | "label" | "rule">>>;
  documentationTemplates: MoralTradeDocumentationTemplate[];
  sampleDocumentationPackets: MoralTradeSampleDocumentationPacket[];
  permittedAutomation: Array<Required<Pick<GovernanceEntry, "key" | "label" | "rule">>>;
  prohibitedUses: Array<Required<Pick<GovernanceEntry, "key" | "label" | "rule">>>;
  fairnessDocumentation: MoralTradeFairnessDocumentation;
  explanationControls: Array<Required<Pick<GovernanceEntry, "key" | "label" | "rule">>>;
  externalStandards: Array<Required<Pick<GovernanceEntry, "key" | "label" | "use">>>;
  humanControlledDecisions: string[];
  governanceTests: string[];
};

export interface MoralTradeAiGovernanceCheck {
  id: string;
  label: string;
  status: "pass" | "fail";
  evidence: string;
}

export interface MoralTradeAiGovernanceValidation {
  status: "pass" | "fail";
  validatorName: "moral-trade-ai-governance-profile";
  validatorVersion: string;
  profileVersion: string;
  checks: MoralTradeAiGovernanceCheck[];
  blockers: string[];
}

const aiGovernanceProfile = aiGovernanceProfileJson as unknown as MoralTradeAiGovernanceProfile;

const REQUIRED_DOCUMENTATION = [
  "model_card",
  "dataset_datasheet",
  "benchmark_slices",
  "intended_use_limits",
  "fairness_audit_report",
  "change_log",
] as const;

const REQUIRED_TEMPLATE_REDACTIONS = [
  "raw_private_wish_text",
  "contact_details",
] as const;

const REQUIRED_PERMITTED_AUTOMATION = [
  "schema_bound_drafting",
  "missing_field_detection",
  "factor_code_explanation",
  "evidence_checklist_drafting",
  "reviewer_summary_drafting",
] as const;

const REQUIRED_PROHIBITED_USES = [
  "end_to_end_llm_matching",
  "global_moral_ranking",
  "unreviewed_learning_to_rank",
  "protected_trait_inference",
  "autonomous_outreach",
  "raw_private_feed_training",
] as const;

const REQUIRED_FAIRNESS_METRICS = [
  "subgroup_surfacing_parity",
  "false_match_rate",
  "human_overrule_rate",
  "privacy_leakage_incidents",
] as const;

const REQUIRED_FAIRNESS_SLICES = [
  "trade_format",
  "cause_area_pair",
  "geography_bucket",
  "privacy_stage",
  "optional_governed_sensitive_attribute",
] as const;

const REQUIRED_EXPLANATION_CONTROLS = [
  "factor_codes_source_of_truth",
  "meaningful_user_action",
  "system_accuracy_boundary",
  "uncertainty_and_redaction_notice",
  "appealable_review_scope",
  "reversible_interaction",
] as const;

const REQUIRED_EXTERNAL_STANDARDS = [
  "nist_ai_rmf",
  "nist_xai",
  "model_cards",
  "datasheets_for_datasets",
  "fairness_tradeoff_literature",
] as const;

const REQUIRED_HUMAN_CONTROLLED_DECISIONS = [
  "safety_blocking",
  "matching_disclosure",
  "reviewed_completion",
  "dispute_resolution",
] as const;

const REQUIRED_GOVERNANCE_TESTS = [
  "ai_governance_profile_validator",
  "no_undocumented_ml_gate",
  "model_card_datasheet_required",
  "fairness_documentation_contract",
  "sample_documentation_packet_contract",
  "health_route_contract_smoke",
] as const;

function hasAll(values: readonly string[], required: readonly string[]) {
  return required.every((entry) => values.includes(entry));
}

function check(
  id: string,
  label: string,
  passed: boolean,
  evidence: string,
): MoralTradeAiGovernanceCheck {
  return {
    id,
    label,
    status: passed ? "pass" : "fail",
    evidence,
  };
}

function isDocumentationValuePresent(value: MoralTradeDocumentationValue | undefined) {
  if (Array.isArray(value)) {
    return value.length > 0 && value.every((entry) => entry.trim().length > 0);
  }

  if (typeof value === "string") {
    return value.trim().length > 0;
  }

  return value != null;
}

function sampleDocumentationPacketFailures(
  profile: MoralTradeAiGovernanceProfile,
) {
  const templatesByKey = new Map(
    profile.documentationTemplates.map((template) => [template.key, template]),
  );
  const packetsByKey = new Map(
    profile.sampleDocumentationPackets.map((packet) => [packet.key, packet]),
  );
  const failures: string[] = [];

  for (const documentationKey of REQUIRED_DOCUMENTATION) {
    const template = templatesByKey.get(documentationKey);
    const packet = packetsByKey.get(documentationKey);

    if (!template) {
      failures.push(`${documentationKey}: template missing`);
      continue;
    }

    if (!packet) {
      failures.push(`${documentationKey}: sample packet missing`);
      continue;
    }

    const missingFields = template.requiredFields.filter(
      (field) => !isDocumentationValuePresent(packet.fields[field]),
    );
    const disallowedPublicFields = Object.keys(packet.publicSummary).filter(
      (field) => !template.publicSummaryFields.includes(field),
    );
    const redactedPublicFields = Object.keys(packet.publicSummary).filter((field) =>
      template.redactedFields.includes(field),
    );
    const publicFieldsWithoutSource = Object.keys(packet.publicSummary).filter(
      (field) => !Object.prototype.hasOwnProperty.call(packet.fields, field),
    );
    const missingRedactionNotes = REQUIRED_TEMPLATE_REDACTIONS.filter(
      (redaction) =>
        !packet.redactionNotes.some((note) =>
          note.toLowerCase().includes(redaction.toLowerCase()),
        ),
    );

    if (missingFields.length) {
      failures.push(`${documentationKey}: missing required fields ${missingFields.join(",")}`);
    }

    if (disallowedPublicFields.length) {
      failures.push(
        `${documentationKey}: disallowed public summary fields ${disallowedPublicFields.join(",")}`,
      );
    }

    if (redactedPublicFields.length) {
      failures.push(
        `${documentationKey}: redacted fields leaked in public summary ${redactedPublicFields.join(",")}`,
      );
    }

    if (publicFieldsWithoutSource.length) {
      failures.push(
        `${documentationKey}: public summary fields missing source values ${publicFieldsWithoutSource.join(",")}`,
      );
    }

    if (missingRedactionNotes.length) {
      failures.push(
        `${documentationKey}: missing redaction notes ${missingRedactionNotes.join(",")}`,
      );
    }
  }

  return failures;
}

export function getMoralTradeAiGovernanceProfile() {
  return aiGovernanceProfile;
}

export function validateMoralTradeAiGovernanceProfile(
  profile: MoralTradeAiGovernanceProfile = aiGovernanceProfile,
): MoralTradeAiGovernanceValidation {
  const documentationKeys = profile.requiredDocumentationBeforeMl.map((entry) => entry.key);
  const documentationTemplateKeys = profile.documentationTemplates.map((entry) => entry.key);
  const sampleDocumentationPacketKeys = profile.sampleDocumentationPackets.map(
    (entry) => entry.key,
  );
  const permittedAutomationKeys = profile.permittedAutomation.map((entry) => entry.key);
  const prohibitedUseKeys = profile.prohibitedUses.map((entry) => entry.key);
  const explanationControlKeys = profile.explanationControls.map((entry) => entry.key);
  const externalStandardKeys = profile.externalStandards.map((entry) => entry.key);
  const sampleDocumentationFailures = sampleDocumentationPacketFailures(profile);
  const checks = [
    check(
      "deterministic-decisioning",
      "Core matching and state changes are not ML-enabled",
      /deterministic|rule/i.test(profile.decisioningMode) &&
        profile.mlEnabledForMatching === false &&
        profile.mlEnabledForStateChanges === false,
      `${profile.decisioningMode}, matching ML=${profile.mlEnabledForMatching}, state ML=${profile.mlEnabledForStateChanges}.`,
    ),
    check(
      "required-documentation-before-ml",
      "Model cards, datasheets, benchmarks, and change logs are required before ML",
      hasAll(documentationKeys, REQUIRED_DOCUMENTATION) &&
        profile.requiredDocumentationBeforeMl.every((entry) => entry.rule),
      documentationKeys.join(", "),
    ),
    check(
      "documentation-templates",
      "Required ML documentation has machine-checkable templates",
      hasAll(documentationTemplateKeys, REQUIRED_DOCUMENTATION) &&
        profile.requiredDocumentationBeforeMl.every((entry) =>
          documentationTemplateKeys.includes(entry.key),
        ) &&
        profile.documentationTemplates.every(
          (template) =>
            template.requiredFields.length >= 4 &&
            template.publicSummaryFields.length >= 3 &&
            template.publicSummaryFields.every((field) =>
              template.requiredFields.includes(field),
            ) &&
            REQUIRED_TEMPLATE_REDACTIONS.every((field) =>
              template.redactedFields.includes(field),
            ) &&
            /review|approve|confirm|log/i.test(template.reviewRule),
        ),
      profile.documentationTemplates
        .map((entry) => `${entry.key}:${entry.requiredFields.length}`)
        .join(", "),
    ),
    check(
      "sample-documentation-packets",
      "Required ML documentation templates have redacted sample packets",
      hasAll(sampleDocumentationPacketKeys, REQUIRED_DOCUMENTATION) &&
        sampleDocumentationFailures.length === 0,
      sampleDocumentationFailures.length
        ? sampleDocumentationFailures.slice(0, 8).join(" | ")
        : sampleDocumentationPacketKeys.join(", "),
    ),
    check(
      "permitted-automation",
      "Permitted automation is limited to drafting, checks, explanations, and summaries",
      hasAll(permittedAutomationKeys, REQUIRED_PERMITTED_AUTOMATION) &&
        profile.permittedAutomation.every((entry) => /may|without|only/i.test(entry.rule)),
      permittedAutomationKeys.join(", "),
    ),
    check(
      "prohibited-uses",
      "Hidden matching, moral ranking, trait inference, outreach, and raw-feed training are prohibited",
      hasAll(prohibitedUseKeys, REQUIRED_PROHIBITED_USES) &&
        profile.prohibitedUses.every((entry) => /no|cannot|must not/i.test(entry.rule)),
      prohibitedUseKeys.join(", "),
    ),
    check(
      "fairness-documentation",
      "Fairness metrics and slices are required before any ML promotion",
      profile.fairnessDocumentation.requiredBeforeAnyMl === true &&
        hasAll(profile.fairnessDocumentation.metrics, REQUIRED_FAIRNESS_METRICS) &&
        hasAll(profile.fairnessDocumentation.slices, REQUIRED_FAIRNESS_SLICES) &&
        /threshold|review|document|remediat/i.test(profile.fairnessDocumentation.reviewRule),
      `${profile.fairnessDocumentation.metrics.join(", ")} | ${profile.fairnessDocumentation.slices.join(", ")}`,
    ),
    check(
      "explanation-controls",
      "NIST XAI and HCI explanation controls are explicit",
      hasAll(explanationControlKeys, REQUIRED_EXPLANATION_CONTROLS) &&
        profile.explanationControls.every((entry) =>
          /factor|source|action|uncertain|redact|appeal|reversible|correct/i.test(entry.rule),
        ),
      explanationControlKeys.join(", "),
    ),
    check(
      "external-standards",
      "Responsible AI documentation standards are named",
      hasAll(externalStandardKeys, REQUIRED_EXTERNAL_STANDARDS) &&
        profile.externalStandards.every((entry) => entry.use),
      externalStandardKeys.join(", "),
    ),
    check(
      "human-controlled-decisions",
      "Safety, disclosure, completion, and disputes stay human-controlled",
      hasAll(profile.humanControlledDecisions, REQUIRED_HUMAN_CONTROLLED_DECISIONS),
      profile.humanControlledDecisions.join(", "),
    ),
    check(
      "governance-tests",
      "Governance test hooks",
      hasAll(profile.governanceTests, REQUIRED_GOVERNANCE_TESTS),
      profile.governanceTests.join(", "),
    ),
  ];
  const blockers = checks
    .filter((entry) => entry.status === "fail")
    .map((entry) => `${entry.id}: ${entry.label}`);

  return {
    status: blockers.length ? "fail" : "pass",
    validatorName: "moral-trade-ai-governance-profile",
    validatorVersion: MORAL_TRADE_AI_GOVERNANCE_VALIDATOR_VERSION,
    profileVersion: profile.version,
    checks,
    blockers,
  };
}
