export const BACKGROUND_CAPABILITY_GATE_CONTRACT_VERSION =
  "background-capability-gates-v0.1-2026-05";
export const BACKGROUND_CAPABILITY_GATE_VALIDATOR_VERSION =
  "background-capability-gates-validator-v0.1";

export type BackgroundCapabilityGateKey =
  | "source_connector_imports"
  | "ai_shadow_summarization"
  | "privacy_preserving_overlap";

export type BackgroundCapabilityReleaseState =
  | "default_off"
  | "shadow_only"
  | "design_only";

export interface BackgroundCapabilityGate {
  allowedUse: string;
  currentBlockers: string[];
  dataInputs: string[];
  key: BackgroundCapabilityGateKey;
  label: string;
  lawfulBasis: string;
  prohibitedEffects: string[];
  purpose: string;
  publicEvidence: string[];
  releaseState: BackgroundCapabilityReleaseState;
  requiredBeforeExpansion: string[];
  retentionRule: string;
}

export interface BackgroundCapabilityGateContract {
  contractTests: string[];
  gates: BackgroundCapabilityGate[];
  invariants: string[];
  purpose: string;
  version: typeof BACKGROUND_CAPABILITY_GATE_CONTRACT_VERSION;
}

export interface BackgroundCapabilityGateCheck {
  evidence: string;
  id: string;
  label: string;
  status: "pass" | "fail";
}

export interface BackgroundCapabilityGateValidation {
  blockers: string[];
  checks: BackgroundCapabilityGateCheck[];
  contractVersion: typeof BACKGROUND_CAPABILITY_GATE_CONTRACT_VERSION;
  expansionReady: false;
  status: "pass" | "fail";
  validatorName: "background-capability-gates";
  validatorVersion: typeof BACKGROUND_CAPABILITY_GATE_VALIDATOR_VERSION;
}

const REQUIRED_GATE_KEYS = [
  "source_connector_imports",
  "ai_shadow_summarization",
  "privacy_preserving_overlap",
] as const satisfies readonly BackgroundCapabilityGateKey[];

const CAPABILITY_GATE_CONTRACT_TESTS = [
  "background_capability_gate_validator",
  "background_capability_gate_public_route_smoke",
  "background_capability_gate_page_copy_smoke",
  "background_capability_gate_api_contract_profile_smoke",
] as const;

function gateCheck(
  id: string,
  label: string,
  passed: boolean,
  evidence: string,
): BackgroundCapabilityGateCheck {
  return {
    evidence,
    id,
    label,
    status: passed ? "pass" : "fail",
  };
}

function hasAll(values: readonly string[], requiredValues: readonly string[]) {
  return requiredValues.every((value) => values.includes(value));
}

export function getBackgroundCapabilityGateContract(): BackgroundCapabilityGateContract {
  return {
    contractTests: [...CAPABILITY_GATE_CONTRACT_TESTS],
    gates: [
      {
        allowedUse:
          "Consent ledger, approved manual summaries, field-scoped retention, and revocation controls only.",
        currentBlockers: [
          "No live connector worker may run before DPIA completion.",
          "No continuous raw source search is permitted.",
          "No raw source content may be copied into analytics.",
        ],
        dataInputs: [
          "source_connection_consent_scope",
          "allowed_field_keys",
          "approved_manual_summary",
          "retention_expires_at",
        ],
        key: "source_connector_imports",
        label: "Source connector imports",
        lawfulBasis:
          "Separate opt-in consent for optional enrichment; account creation consent is not enough.",
        prohibitedEffects: [
          "raw_private_feed_ingestion",
          "continuous_source_search",
          "counterparty_contact",
          "analytics_copy_of_raw_content",
        ],
        purpose:
          "Let participants record source-scoped summaries for matching review without turning external systems into a searchable corpus.",
        publicEvidence: [
          "dashboard_field_permissions",
          "revocation_control",
          "raw_ingestion_disabled_constraint",
        ],
        releaseState: "default_off",
        requiredBeforeExpansion: [
          "DPIA and documented privacy-design review",
          "lawful-basis record of processing",
          "source-specific retention and deletion test",
          "operator review and appeal path",
          "external security/privacy review for connector worker",
        ],
        retentionRule:
          "Use the selected source retention window; expired or revoked sources stop influencing matching.",
      },
      {
        allowedUse:
          "Shadow-only comparison on approved, redacted source summaries from consenting users.",
        currentBlockers: [
          "No AI output may create live matches or disclosure decisions.",
          "No AI output may rank users or change product state.",
          "No raw private feed training is permitted.",
        ],
        dataInputs: [
          "approved_manual_summary",
          "ai_shadow_mode_allowed",
          "allowed_field_keys",
          "retention_expires_at",
        ],
        key: "ai_shadow_summarization",
        label: "AI shadow summarization",
        lawfulBasis:
          "Separate source-level AI shadow consent; refusal must not block ordinary deterministic matching.",
        prohibitedEffects: [
          "live_match_suggestion",
          "participant_disclosure",
          "ranking_change",
          "state_mutation",
          "raw_private_feed_training",
        ],
        purpose:
          "Measure whether AI summary drafts improve explanation quality and reviewer endorsement without increasing unsafe exposure.",
        publicEvidence: [
          "ai_shadow_contract",
          "redacted_sample_evaluation",
          "dashboard_readiness_counter",
        ],
        releaseState: "shadow_only",
        requiredBeforeExpansion: [
          "DPIA and documented privacy-design review",
          "measured precision, explanation-quality, and user-endorsement lift",
          "unsafe-exposure regression review",
          "human approval for every status or disclosure change",
          "external security/privacy review before assist mode",
        ],
        retentionRule:
          "Do not retain raw prompts or raw source text; keep only aggregate readiness counts and redacted evaluation artifacts.",
      },
      {
        allowedUse:
          "Design-only exploration of blinded tags, VOPRF, HPKE sealed fields, PSI, or PIR-PSI for narrow sensitive overlap checks.",
        currentBlockers: [
          "No production private-set intersection lane exists.",
          "No sensitive overlap tokens may be generated without a narrow use case.",
          "No cryptographic matching design may ship without external review.",
        ],
        dataInputs: [
          "narrow_sensitive_tag_set",
          "client_side_blinded_token",
          "non_overlap_redaction",
        ],
        key: "privacy_preserving_overlap",
        label: "Privacy-preserving overlap computation",
        lawfulBasis:
          "Optional sensitive-overlap consent plus a documented processing record for the exact use case.",
        prohibitedEffects: [
          "global_moral_ranking",
          "raw_tag_upload",
          "unbounded_counterparty_search",
          "operator_bypass_of_consent",
        ],
        purpose:
          "Explore whether especially sensitive overlap can be discovered without revealing non-overlap, raw wishes, or hidden preference sets.",
        publicEvidence: [
          "design_status_only",
          "published_gate_before_pilot",
          "private_overlap_contract",
          "no_live_private_overlap_endpoint",
        ],
        releaseState: "design_only",
        requiredBeforeExpansion: [
          "DPIA and documented privacy-design review",
          "formal cryptographic design review",
          "narrow threat model and abuse case review",
          "property tests for non-overlap redaction",
          "external security/privacy review before pilot",
        ],
        retentionRule:
          "Do not store raw sensitive tags; any future pilot must expire blinded tokens and publish deletion semantics.",
      },
    ],
    invariants: [
      "Higher-power background features remain default-off unless the participant grants separate, specific, informed consent.",
      "DPIA and privacy-design review are required before live source connector workers, AI assist mode, or privacy-preserving overlap pilots.",
      "Raw private feeds, exact private wishes, contact details, and raw source text cannot be copied into analytics.",
      "Human review remains mandatory for safety blocking, matching disclosure, reviewed completion, and dispute resolution.",
      "Design-only or shadow-only features must publish blockers instead of implying production readiness.",
    ],
    purpose:
      "Public gate for staged background-networking expansion: source connectors, AI shadow summarization, and privacy-preserving overlap may advance only through documented consent, DPIA, review, and non-mutation controls.",
    version: BACKGROUND_CAPABILITY_GATE_CONTRACT_VERSION,
  };
}

export function validateBackgroundCapabilityGateContract(
  contract: BackgroundCapabilityGateContract = getBackgroundCapabilityGateContract(),
): BackgroundCapabilityGateValidation {
  const gateKeys = contract.gates.map((gate) => gate.key);
  const checks = [
    gateCheck(
      "required-gates",
      "Contract covers source connectors, AI shadow summarization, and privacy-preserving overlap",
      hasAll(gateKeys, REQUIRED_GATE_KEYS),
      gateKeys.join(", "),
    ),
    gateCheck(
      "dpia-required-before-expansion",
      "Every higher-power gate requires DPIA or documented privacy-design review before expansion",
      contract.gates.every((gate) =>
        gate.requiredBeforeExpansion.some((requirement) =>
          /DPIA|privacy-design review/i.test(requirement),
        ),
      ),
      contract.gates.map((gate) => `${gate.key}:${gate.requiredBeforeExpansion.length}`).join(", "),
    ),
    gateCheck(
      "separate-consent-and-lawful-basis",
      "Every gate separates optional consent from account creation and names a lawful-basis record",
      contract.gates.every((gate) => /consent/i.test(gate.lawfulBasis)) &&
        contract.gates.some((gate) => /account creation consent is not enough/i.test(gate.lawfulBasis)) &&
        contract.gates.every((gate) => gate.lawfulBasis.length > 24),
      contract.gates.map((gate) => gate.lawfulBasis).join(" | "),
    ),
    gateCheck(
      "raw-content-analytics-boundary",
      "Raw private feeds and raw source content are blocked from analytics and training",
      contract.invariants.some((invariant) => /analytics/i.test(invariant)) &&
        contract.gates.some((gate) => gate.prohibitedEffects.includes("analytics_copy_of_raw_content")) &&
        contract.gates.some((gate) => gate.prohibitedEffects.includes("raw_private_feed_training")),
      contract.gates.flatMap((gate) => gate.prohibitedEffects).join(", "),
    ),
    gateCheck(
      "non-production-staging",
      "AI and PET expansion remains shadow-only or design-only until evidence and review gates pass",
      contract.gates.some(
        (gate) => gate.key === "ai_shadow_summarization" && gate.releaseState === "shadow_only",
      ) &&
        contract.gates.some(
          (gate) =>
            gate.key === "privacy_preserving_overlap" && gate.releaseState === "design_only",
        ) &&
        contract.gates.every((gate) => gate.currentBlockers.length > 0),
      contract.gates.map((gate) => `${gate.key}:${gate.releaseState}`).join(", "),
    ),
    gateCheck(
      "human-control-boundary",
      "Safety, disclosure, completion, and dispute decisions stay human controlled",
      contract.invariants.some((invariant) => /Human review remains mandatory/i.test(invariant)) &&
        contract.gates.some((gate) => gate.prohibitedEffects.includes("state_mutation")) &&
        contract.gates.some((gate) => gate.prohibitedEffects.includes("operator_bypass_of_consent")),
      contract.invariants.join(" | "),
    ),
  ];
  const blockers = checks
    .filter((check) => check.status === "fail")
    .map((check) => `${check.id}: ${check.label}`);

  return {
    blockers,
    checks,
    contractVersion: contract.version,
    expansionReady: false,
    status: blockers.length ? "fail" : "pass",
    validatorName: "background-capability-gates",
    validatorVersion: BACKGROUND_CAPABILITY_GATE_VALIDATOR_VERSION,
  };
}
