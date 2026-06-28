import { createHash } from "node:crypto";

import {
  BACKGROUND_PURPOSE_CODES,
  BACKGROUND_PURPOSE_POLICY_VERSION,
  BACKGROUND_PURPOSE_REGISTRY,
} from "@/lib/background-purpose-registry";
import {
  BACKGROUND_UI_COPY_BUNDLE_HASH,
  BACKGROUND_UI_COPY_BUNDLE_VERSION,
} from "@/lib/background-ui-language";
import {
  BACKGROUND_PUBLIC_PAGE_SIMPLIFICATION_SPEC_HASH,
  BACKGROUND_PUBLIC_PAGE_SIMPLIFICATION_SPEC_VERSION,
} from "@/lib/background-public-pages";

export const BACKGROUND_PHASE_GATE_VALIDATOR_VERSION =
  "background-phase-gates-validator-v1";
export const BACKGROUND_PHASE_GATE_BUNDLE_VERSION =
  "background-phase-gates-phase2-v1-2026-06-14";
export const BACKGROUND_RELEASE_MANIFEST_VERSION =
  "background-release-manifest-v1-2026-06-14";
export const BACKGROUND_POLICY_ENGINE_VERSION =
  "background-policy-engine-v1-2026-06-14";
export const BACKGROUND_POLICY_ACTION_KIND_REGISTRY_VERSION =
  "background-policy-action-kind-registry-v1-2026-06-14";
export const BACKGROUND_OUTPUT_SCHEMA_BUNDLE_VERSION =
  "background-output-schema-bundle-v1-2026-06-14";
export const BACKGROUND_TOOL_CAPABILITY_BUNDLE_VERSION =
  "background-tool-capability-bundle-v1-2026-06-14";
export const BACKGROUND_RETENTION_POLICY_BUNDLE_VERSION =
  "background-retention-policy-bundle-v1-2026-06-14";
export const BACKGROUND_POLICY_COMPOSITION_BUNDLE_VERSION =
  "background-policy-composition-bundle-v1-2026-06-14";
export const BACKGROUND_ARTIFACT_TRANSITION_POLICY_BUNDLE_VERSION =
  "background-artifact-transition-policy-bundle-v1-2026-06-14";
export const BACKGROUND_SIGNAL_TAXONOMY_VERSION =
  "background-signal-taxonomy-v1-2026-06-14";
export const BACKGROUND_CLAIM_ASSURANCE_TAXONOMY_VERSION =
  "background-claim-assurance-taxonomy-v1-2026-06-14";

export const BACKGROUND_CURRENT_PHASE =
  "phase_2_source_summary_intro_skeleton" as const;

export type BackgroundNetworkingPhase =
  | "phase_0_policy_skeleton"
  | "phase_1_internal_staff_core"
  | "phase_2_source_summary_intro_skeleton"
  | "phase_3_tiny_cohort_partner_pilot"
  | "phase_4_higher_power_lanes"
  | "full_mature_system";

export type BackgroundLaneKind =
  | "route"
  | "worker"
  | "ui_panel"
  | "queue_consumer"
  | "export_path"
  | "telemetry_path"
  | "partner_callback"
  | "source_summary_path"
  | "llm_path"
  | "intro_path"
  | "disclosure_path"
  | "vault_path"
  | "aggregate_report_path"
  | "federation_path"
  | "retention_job"
  | "docs_page"
  | "test_suite";

export type BackgroundLaneState =
  | "enabled"
  | "staff_only"
  | "shadow_only"
  | "canary"
  | "disabled_stub"
  | "blocked";

export type BackgroundActorRole =
  | "anonymous"
  | "participant"
  | "operator"
  | "admin"
  | "system"
  | "partner";

export type BackgroundPolicyVerdict =
  | "allow"
  | "deny"
  | "stale"
  | "needs_review";

export type BackgroundPhaseLaneKey =
  | "current_phase_artifact"
  | "structured_wish_profile"
  | "subject_identity"
  | "claim_assurance_records"
  | "pairwise_safety_preferences"
  | "candidate_exposure"
  | "delegate_authorizations"
  | "helper_runs"
  | "manual_source_summaries"
  | "structured_wish_interview"
  | "opportunity_briefs"
  | "intro_requests"
  | "privacy_freeze"
  | "notification_builder"
  | "retention_cleanup"
  | "participant_exports"
  | "background_docs"
  | "phase_gate_tests"
  | "source_summary_import"
  | "llm_wish_interview"
  | "partner_matchmaker"
  | "federation_bridge"
  | "public_broad_preview_delegate"
  | "high_sensitivity_signal"
  | "high_impact_claim"
  | "aggregate_release"
  | "vault_reveal"
  | "exact_disclosure"
  | "private_overlap_crypto";

export type BackgroundPolicyActionKind =
  | "background.phase.read"
  | "background.wish_profile.apply"
  | "background.subject_identity.update"
  | "background.claim_assurance.record"
  | "background.pairwise_safety_preference.write"
  | "background.candidate_exposure.update"
  | "background.delegate_authorization.write"
  | "background.helper_run.enqueue"
  | "background.source_summary.create"
  | "background.source_summary.approve"
  | "background.source_summary.confirm_tags"
  | "background.structured_wish_interview.read"
  | "background.structured_wish_interview.answer"
  | "background.opportunity_brief.list"
  | "background.opportunity_brief.create"
  | "background.opportunity_feedback.record"
  | "background.intro_request.create"
  | "background.privacy_freeze.activate"
  | "background.privacy_freeze.release"
  | "background.notification.opportunity_brief"
  | "background.retention.cleanup"
  | "background.participant_export.generate"
  | "background.data_reuse_policy.read"
  | "background.docs.render"
  | "background.purpose_codes.list"
  | "background.phase_gate.test"
  | "background.source_summary.import"
  | "background.llm_wish_interview.propose"
  | "background.partner_matchmaker.run"
  | "background.federation_bridge.export"
  | "background.public_broad_preview_delegate.run"
  | "background.high_sensitivity_signal.confirm"
  | "background.high_impact_claim.assert"
  | "background.aggregate_release.publish"
  | "background.vault_reveal.read"
  | "background.exact_disclosure.grant"
  | "background.private_overlap.check";

export interface BackgroundActionKindRegistryEntry {
  actionFamily?:
    | "read_render"
    | "match_compute"
    | "artifact_state"
    | "notification"
    | "intro_flow"
    | "disclosure"
    | "governance"
    | "export"
    | "telemetry"
    | "retention"
    | "phase_gate";
  actionKind: BackgroundPolicyActionKind;
  actorRoles: BackgroundActorRole[];
  idempotencyRequired: boolean;
  laneKey: BackgroundPhaseLaneKey;
  outputSchemaVersion: string;
  sideEffectClass:
    | "none"
    | "queue"
    | "create_redacted_artifact"
    | "notification"
    | "export"
    | "retention"
    | "governance"
    | "disclosure"
    | "external";
  stepUpRequired?: boolean;
}

export interface BackgroundOutputSchemaBundleEntry {
  allowedActionKinds: BackgroundPolicyActionKind[];
  allowedKeys: string[];
  allowedLaneKeys: BackgroundPhaseLaneKey[];
  audienceScope:
    | "requester"
    | "counterparty"
    | "participant_owner"
    | "operator_redacted"
    | "public_contract"
    | "internal_service";
  extraKeyPolicy: "reject" | "strip_then_log_redacted" | "block_and_tripwire";
  forbiddenKeyPatterns: string[];
  redactionRulesHash: string;
  schemaKey: string;
  schemaRecordHash: string;
  schemaSurface:
    | "requester_opportunity_brief"
    | "requester_subject_identity"
    | "requester_claim_assurance"
    | "requester_safety_preference"
    | "delegate_receipt"
    | "requester_intro_status"
    | "participant_export"
    | "telemetry_event"
    | "public_contract";
  status: "active";
}

export interface BackgroundToolCapabilityBundleEntry {
  allowedActionKinds: BackgroundPolicyActionKind[];
  allowArbitraryNetwork: boolean;
  allowCalendarWrite: boolean;
  allowContactOrOutreach: boolean;
  allowPartnerCallback: boolean;
  allowRawSourceRead: boolean;
  allowVaultDecrypt: boolean;
  capabilityRecordHash: string;
  capabilityKey: string;
  maxInputDataClass: "redacted_metadata" | "confirmed_broad_signals";
  status: "active";
}

export interface BackgroundRetentionPolicyBundleEntry {
  allowedRetainedFieldKeys: string[];
  artifactKind:
    | "delegate_run"
    | "opportunity_brief"
    | "opportunity_feedback"
    | "intro_request"
    | "delegate_receipt"
    | "privacy_freeze"
    | "participant_export"
    | "policy_decision"
    | "subject_identity_profile"
    | "claim_assurance_record"
    | "pairwise_safety_preference"
    | "candidate_exposure_counter"
    | "match_signal_lineage";
  cacheOutboxInvalidationRequired: boolean;
  deleteAfterDays: number;
  linkableIdentifierAllowance:
    | "none"
    | "artifact_ids_only"
    | "active_candidate_ids"
    | "direct_counterparty_ids";
  nonActionabilityGuarantee: string;
  retentionClass: string;
  retentionPolicyRecordHash: string;
  status: "active";
}

export interface BackgroundSignalTaxonomyBundleEntry {
  allowedPurposeCodes: string[];
  allowedSurfaceKeys: string[];
  prohibitedUses: string[];
  publicLabel: string;
  requiresOperatorReview: boolean;
  requiresRiskReview: boolean;
  requiresStepUpConfirmation: boolean;
  sensitivityTier: "low" | "medium" | "high" | "prohibited";
  signalKey: string;
  signalKind:
    | "profile_field"
    | "confirmed_tag"
    | "source_summary_tag"
    | "constraint"
    | "exclusion"
    | "availability"
    | "third_party_private_data";
  signalRecordHash: string;
  status: "active" | "disabled";
  vulnerabilityLike: boolean;
}

export interface BackgroundClaimAssuranceTaxonomyBundleEntry {
  allowedPurposeBindings: Array<{
    purposeCode: string;
    purposePolicyVersion: typeof BACKGROUND_PURPOSE_POLICY_VERSION;
  }>;
  allowedSurfaceKeys: string[];
  broadClaimKey: string;
  claimAssuranceTaxonomyRecordHash: string;
  claimKind:
    | "credential"
    | "authority"
    | "funding_capacity"
    | "institutional_affiliation"
    | "legal_expertise"
    | "medical_expertise"
    | "immigration_expertise"
    | "fiscal_sponsorship"
    | "scarce_resource"
    | "safety_relevant_capability";
  evidenceRequirementCodes: string[];
  maxValidityDays: number;
  minimumAssuranceLevel:
    | "evidence_submitted"
    | "operator_reviewed"
    | "externally_verified";
  prohibitedUses: string[];
  publicLabel: string;
  relianceLimitCodes: string[];
  requiresOperatorReview: boolean;
  status: "active" | "disabled";
}

export interface BackgroundPolicyCompositionRule {
  appliesToActionKinds: BackgroundPolicyActionKind[];
  compositionMode:
    | "deny_overrides"
    | "intersection"
    | "narrowest_scope_wins";
  conflictBehavior: "fail_closed" | "require_recompute" | "require_operator_review";
  controlFamilies: string[];
  ruleCode: string;
  ruleRecordHash: string;
  status: "active";
}

export interface BackgroundArtifactTransitionPolicy {
  allowedActorRoles: BackgroundActorRole[];
  artifactKind:
    | "opportunity_brief"
    | "subject_identity"
    | "claim_assurance"
    | "pairwise_safety_preference"
    | "intro_request"
    | "delegate_receipt"
    | "privacy_freeze"
    | "participant_export";
  fromStates: string[];
  nonActionabilityGuarantee: string;
  requiredActionKind: BackgroundPolicyActionKind;
  status: "active";
  toState: string;
  transitionRecordHash: string;
}

export interface BackgroundPhaseGateLane {
  allowedActionKinds: BackgroundPolicyActionKind[];
  genericUnavailableCode: string;
  laneKey: BackgroundPhaseLaneKey;
  laneKind: BackgroundLaneKind;
  laneRecordHash: string;
  laneState: BackgroundLaneState;
  requiredFeatureFlagStates: Record<string, boolean>;
  requiredPilotEvaluation: boolean;
  requiredRiskReview: boolean;
}

export interface BackgroundPhaseGateBundle {
  backgroundNetworkingPhase: typeof BACKGROUND_CURRENT_PHASE;
  bundleHash: string;
  bundleVersion: typeof BACKGROUND_PHASE_GATE_BUNDLE_VERSION;
  lanes: BackgroundPhaseGateLane[];
}

export interface BackgroundReleaseManifest {
  artifactTransitionPolicyBundleHash: string;
  artifactTransitionPolicyBundleVersion: typeof BACKGROUND_ARTIFACT_TRANSITION_POLICY_BUNDLE_VERSION;
  backgroundNetworkingPhase: typeof BACKGROUND_CURRENT_PHASE;
  claimAssuranceTaxonomyHash: string;
  claimAssuranceTaxonomyVersion: typeof BACKGROUND_CLAIM_ASSURANCE_TAXONOMY_VERSION;
  id: typeof BACKGROUND_RELEASE_MANIFEST_VERSION;
  outputSchemaBundleHash: string;
  outputSchemaBundleVersion: typeof BACKGROUND_OUTPUT_SCHEMA_BUNDLE_VERSION;
  phaseGateBundleHash: string;
  phaseGateBundleVersion: typeof BACKGROUND_PHASE_GATE_BUNDLE_VERSION;
  policyActionKindRegistryHash: string;
  policyActionKindRegistryVersion: typeof BACKGROUND_POLICY_ACTION_KIND_REGISTRY_VERSION;
  policyCompositionBundleHash: string;
  policyCompositionBundleVersion: typeof BACKGROUND_POLICY_COMPOSITION_BUNDLE_VERSION;
  publicPageSimplificationSpecHash: string;
  publicPageSimplificationSpecVersion: typeof BACKGROUND_PUBLIC_PAGE_SIMPLIFICATION_SPEC_VERSION;
  policyEngineVersion: typeof BACKGROUND_POLICY_ENGINE_VERSION;
  purposeRegistryHash: string;
  purposeRegistryVersion: typeof BACKGROUND_PURPOSE_POLICY_VERSION;
  retentionPolicyBundleHash: string;
  retentionPolicyBundleVersion: typeof BACKGROUND_RETENTION_POLICY_BUNDLE_VERSION;
  signalTaxonomyHash: string;
  signalTaxonomyVersion: typeof BACKGROUND_SIGNAL_TAXONOMY_VERSION;
  status: "active";
  toolCapabilityBundleHash: string;
  toolCapabilityBundleVersion: typeof BACKGROUND_TOOL_CAPABILITY_BUNDLE_VERSION;
  uiCopyBundleHash: string;
  uiCopyBundleVersion: typeof BACKGROUND_UI_COPY_BUNDLE_VERSION;
}

export interface BackgroundPolicyDecision {
  actionKind: BackgroundPolicyActionKind | string;
  actorRole: BackgroundActorRole;
  artifactTransitionPolicyBundleHash: string;
  claimAssuranceTaxonomyHash: string;
  expiresAt: string;
  genericUnavailableCode: string;
  idempotencyKey: string | null;
  laneKey: BackgroundPhaseLaneKey | string;
  manifestId: string;
  outputSchemaVersion: string | null;
  phase: typeof BACKGROUND_CURRENT_PHASE;
  phaseGateBundleHash: string;
  policyActionKindRegistryHash: string;
  policyCompositionBundleHash: string;
  publicPageSimplificationSpecHash: string;
  policyDecisionId: string;
  policyEngineVersion: typeof BACKGROUND_POLICY_ENGINE_VERSION;
  reasonClasses: string[];
  retentionPolicyBundleHash: string;
  sideEffectsAllowed: boolean;
  signalTaxonomyHash: string;
  toolCapabilityBundleHash: string;
  uiCopyBundleHash: string;
  verdict: BackgroundPolicyVerdict;
}

export interface BackgroundPolicyDecisionInput {
  actionKind: BackgroundPolicyActionKind | string;
  actorRole: BackgroundActorRole;
  controlStates?: {
    accountSecurityHoldActive?: boolean;
    emergencyStopActive?: boolean;
    privacyFreezeActive?: boolean;
    retentionHoldActive?: boolean;
    tripwirePauseActive?: boolean;
  };
  featureFlags?: Record<string, boolean | undefined>;
  idempotencyKey?: string | null;
  laneKey: BackgroundPhaseLaneKey | string;
  outputSchemaVersion?: string | null;
  purposeCode?: string | null;
  purposePolicyVersion?: string | null;
}

export interface BackgroundPhaseGateValidation {
  blockers: string[];
  checks: Array<{
    evidence: string;
    id: string;
    label: string;
    status: "pass" | "fail";
  }>;
  manifestId: string;
  status: "pass" | "fail";
  validatorName: "background-phase-gates";
  validatorVersion: typeof BACKGROUND_PHASE_GATE_VALIDATOR_VERSION;
}

const DISABLED_FUTURE_ACTIONS = [
  "background.source_summary.import",
  "background.llm_wish_interview.propose",
  "background.partner_matchmaker.run",
  "background.federation_bridge.export",
  "background.public_broad_preview_delegate.run",
  "background.high_sensitivity_signal.confirm",
  "background.high_impact_claim.assert",
  "background.aggregate_release.publish",
  "background.vault_reveal.read",
  "background.exact_disclosure.grant",
  "background.private_overlap.check",
] as const satisfies readonly BackgroundPolicyActionKind[];

const ACTION_REGISTRY_ROWS: BackgroundActionKindRegistryEntry[] = [
  {
    actionKind: "background.phase.read",
    actorRoles: ["anonymous", "participant", "operator", "admin", "system"],
    idempotencyRequired: false,
    laneKey: "current_phase_artifact",
    outputSchemaVersion: "background-phase-status-response-v1",
    sideEffectClass: "none",
  },
  {
    actionKind: "background.wish_profile.apply",
    actorRoles: ["participant"],
    idempotencyRequired: true,
    laneKey: "structured_wish_profile",
    outputSchemaVersion: "background-wish-profile-apply-response-v1",
    sideEffectClass: "create_redacted_artifact",
  },
  {
    actionKind: "background.subject_identity.update",
    actorRoles: ["participant", "operator", "admin"],
    idempotencyRequired: true,
    laneKey: "subject_identity",
    outputSchemaVersion: "background-subject-identity-response-v1",
    sideEffectClass: "create_redacted_artifact",
  },
  {
    actionKind: "background.claim_assurance.record",
    actorRoles: ["participant", "operator", "admin"],
    idempotencyRequired: true,
    laneKey: "claim_assurance_records",
    outputSchemaVersion: "background-claim-assurance-response-v1",
    sideEffectClass: "create_redacted_artifact",
  },
  {
    actionKind: "background.pairwise_safety_preference.write",
    actorRoles: ["participant"],
    idempotencyRequired: true,
    laneKey: "pairwise_safety_preferences",
    outputSchemaVersion: "background-pairwise-safety-response-v1",
    sideEffectClass: "create_redacted_artifact",
  },
  {
    actionKind: "background.candidate_exposure.update",
    actorRoles: ["participant"],
    idempotencyRequired: true,
    laneKey: "candidate_exposure",
    outputSchemaVersion: "background-candidate-exposure-response-v1",
    sideEffectClass: "create_redacted_artifact",
  },
  {
    actionKind: "background.delegate_authorization.write",
    actorRoles: ["participant"],
    idempotencyRequired: true,
    laneKey: "delegate_authorizations",
    outputSchemaVersion: "background-delegate-authorization-response-v1",
    sideEffectClass: "create_redacted_artifact",
  },
  {
    actionKind: "background.helper_run.enqueue",
    actorRoles: ["participant", "system"],
    idempotencyRequired: true,
    laneKey: "helper_runs",
    outputSchemaVersion: "background-helper-run-response-v1",
    sideEffectClass: "queue",
  },
  {
    actionKind: "background.source_summary.create",
    actorRoles: ["participant"],
    idempotencyRequired: true,
    laneKey: "manual_source_summaries",
    outputSchemaVersion: "background-source-summary-response-v1",
    sideEffectClass: "create_redacted_artifact",
  },
  {
    actionKind: "background.source_summary.approve",
    actorRoles: ["participant"],
    idempotencyRequired: true,
    laneKey: "manual_source_summaries",
    outputSchemaVersion: "background-source-summary-response-v1",
    sideEffectClass: "create_redacted_artifact",
  },
  {
    actionKind: "background.source_summary.confirm_tags",
    actorRoles: ["participant"],
    idempotencyRequired: true,
    laneKey: "manual_source_summaries",
    outputSchemaVersion: "background-source-summary-tag-confirmation-response-v1",
    sideEffectClass: "create_redacted_artifact",
  },
  {
    actionKind: "background.structured_wish_interview.read",
    actorRoles: ["participant"],
    idempotencyRequired: false,
    laneKey: "structured_wish_interview",
    outputSchemaVersion: "background-structured-wish-interview-response-v1",
    sideEffectClass: "none",
  },
  {
    actionKind: "background.structured_wish_interview.answer",
    actorRoles: ["participant"],
    idempotencyRequired: true,
    laneKey: "structured_wish_interview",
    outputSchemaVersion: "background-structured-wish-interview-response-v1",
    sideEffectClass: "create_redacted_artifact",
  },
  {
    actionKind: "background.opportunity_brief.list",
    actorRoles: ["participant"],
    idempotencyRequired: false,
    laneKey: "opportunity_briefs",
    outputSchemaVersion: "background-opportunity-brief-list-response-v2",
    sideEffectClass: "none",
  },
  {
    actionKind: "background.opportunity_brief.create",
    actorRoles: ["system"],
    idempotencyRequired: true,
    laneKey: "opportunity_briefs",
    outputSchemaVersion: "background-opportunity-brief-card-v2",
    sideEffectClass: "create_redacted_artifact",
  },
  {
    actionKind: "background.opportunity_feedback.record",
    actorRoles: ["participant"],
    idempotencyRequired: true,
    laneKey: "opportunity_briefs",
    outputSchemaVersion: "background-opportunity-feedback-response-v1",
    sideEffectClass: "create_redacted_artifact",
  },
  {
    actionKind: "background.intro_request.create",
    actorRoles: ["participant"],
    idempotencyRequired: true,
    laneKey: "intro_requests",
    outputSchemaVersion: "background-intro-request-response-v1",
    sideEffectClass: "create_redacted_artifact",
  },
  {
    actionKind: "background.privacy_freeze.activate",
    actorRoles: ["participant"],
    idempotencyRequired: true,
    laneKey: "privacy_freeze",
    outputSchemaVersion: "background-privacy-freeze-response-v1",
    sideEffectClass: "create_redacted_artifact",
  },
  {
    actionKind: "background.privacy_freeze.release",
    actorRoles: ["participant"],
    idempotencyRequired: true,
    laneKey: "privacy_freeze",
    outputSchemaVersion: "background-privacy-freeze-response-v1",
    sideEffectClass: "create_redacted_artifact",
    stepUpRequired: true,
  },
  {
    actionKind: "background.notification.opportunity_brief",
    actorRoles: ["system"],
    idempotencyRequired: true,
    laneKey: "notification_builder",
    outputSchemaVersion: "background-opportunity-notification-v1",
    sideEffectClass: "notification",
  },
  {
    actionKind: "background.retention.cleanup",
    actorRoles: ["system", "operator", "admin"],
    idempotencyRequired: true,
    laneKey: "retention_cleanup",
    outputSchemaVersion: "background-retention-cleanup-response-v1",
    sideEffectClass: "retention",
  },
  {
    actionKind: "background.participant_export.generate",
    actorRoles: ["participant"],
    idempotencyRequired: true,
    laneKey: "participant_exports",
    outputSchemaVersion: "background-participant-export-response-v1",
    sideEffectClass: "export",
  },
  {
    actionKind: "background.data_reuse_policy.read",
    actorRoles: ["anonymous", "participant", "operator", "admin", "system"],
    idempotencyRequired: false,
    laneKey: "background_docs",
    outputSchemaVersion: "background-data-reuse-policy-v1",
    sideEffectClass: "none",
  },
  {
    actionKind: "background.docs.render",
    actorRoles: ["anonymous", "participant", "operator", "admin", "system"],
    idempotencyRequired: false,
    laneKey: "background_docs",
    outputSchemaVersion: "background-docs-phase-summary-v1",
    sideEffectClass: "none",
  },
  {
    actionKind: "background.purpose_codes.list",
    actorRoles: ["anonymous", "participant", "operator", "admin", "system"],
    idempotencyRequired: false,
    laneKey: "background_docs",
    outputSchemaVersion: "background-purpose-codes-response-v1",
    sideEffectClass: "none",
  },
  {
    actionKind: "background.phase_gate.test",
    actorRoles: ["system"],
    idempotencyRequired: false,
    laneKey: "phase_gate_tests",
    outputSchemaVersion: "background-phase-gate-test-result-v1",
    sideEffectClass: "none",
  },
  {
    actionKind: "background.source_summary.import",
    actorRoles: ["participant"],
    idempotencyRequired: true,
    laneKey: "source_summary_import",
    outputSchemaVersion: "background-disabled-lane-response-v1",
    sideEffectClass: "external",
  },
  {
    actionKind: "background.llm_wish_interview.propose",
    actorRoles: ["participant"],
    idempotencyRequired: true,
    laneKey: "llm_wish_interview",
    outputSchemaVersion: "background-disabled-lane-response-v1",
    sideEffectClass: "external",
  },
  {
    actionKind: "background.partner_matchmaker.run",
    actorRoles: ["partner", "operator", "system"],
    idempotencyRequired: true,
    laneKey: "partner_matchmaker",
    outputSchemaVersion: "background-disabled-lane-response-v1",
    sideEffectClass: "external",
  },
  {
    actionKind: "background.federation_bridge.export",
    actorRoles: ["partner", "operator", "system"],
    idempotencyRequired: true,
    laneKey: "federation_bridge",
    outputSchemaVersion: "background-disabled-lane-response-v1",
    sideEffectClass: "external",
  },
  {
    actionKind: "background.public_broad_preview_delegate.run",
    actorRoles: ["participant", "system"],
    idempotencyRequired: true,
    laneKey: "public_broad_preview_delegate",
    outputSchemaVersion: "background-disabled-lane-response-v1",
    sideEffectClass: "queue",
  },
  {
    actionKind: "background.high_sensitivity_signal.confirm",
    actorRoles: ["participant", "operator"],
    idempotencyRequired: true,
    laneKey: "high_sensitivity_signal",
    outputSchemaVersion: "background-disabled-lane-response-v1",
    sideEffectClass: "create_redacted_artifact",
  },
  {
    actionKind: "background.high_impact_claim.assert",
    actorRoles: ["participant", "operator"],
    idempotencyRequired: true,
    laneKey: "high_impact_claim",
    outputSchemaVersion: "background-disabled-lane-response-v1",
    sideEffectClass: "create_redacted_artifact",
  },
  {
    actionKind: "background.aggregate_release.publish",
    actorRoles: ["operator", "admin", "system"],
    idempotencyRequired: true,
    laneKey: "aggregate_release",
    outputSchemaVersion: "background-disabled-lane-response-v1",
    sideEffectClass: "external",
  },
  {
    actionKind: "background.vault_reveal.read",
    actorRoles: ["participant", "operator", "admin", "system"],
    idempotencyRequired: true,
    laneKey: "vault_reveal",
    outputSchemaVersion: "background-disabled-lane-response-v1",
    sideEffectClass: "disclosure",
  },
  {
    actionKind: "background.exact_disclosure.grant",
    actorRoles: ["participant"],
    idempotencyRequired: true,
    laneKey: "exact_disclosure",
    outputSchemaVersion: "background-disabled-lane-response-v1",
    sideEffectClass: "disclosure",
  },
  {
    actionKind: "background.private_overlap.check",
    actorRoles: ["participant"],
    idempotencyRequired: true,
    laneKey: "private_overlap_crypto",
    outputSchemaVersion: "background-disabled-lane-response-v1",
    sideEffectClass: "external",
  },
];

const PHASE_GATE_ROWS: Array<Omit<BackgroundPhaseGateLane, "laneRecordHash">> = [
  phaseLane("current_phase_artifact", "docs_page", "enabled", ["background.phase.read"]),
  phaseLane("structured_wish_profile", "route", "enabled", ["background.wish_profile.apply"]),
  phaseLane("subject_identity", "route", "enabled", [
    "background.subject_identity.update",
  ]),
  phaseLane("claim_assurance_records", "route", "enabled", [
    "background.claim_assurance.record",
  ]),
  phaseLane("pairwise_safety_preferences", "route", "enabled", [
    "background.pairwise_safety_preference.write",
  ]),
  phaseLane("candidate_exposure", "route", "enabled", ["background.candidate_exposure.update"]),
  phaseLane("delegate_authorizations", "route", "enabled", [
    "background.delegate_authorization.write",
  ]),
  phaseLane("helper_runs", "route", "enabled", ["background.helper_run.enqueue"]),
  phaseLane("manual_source_summaries", "source_summary_path", "enabled", [
    "background.source_summary.create",
    "background.source_summary.approve",
    "background.source_summary.confirm_tags",
  ]),
  phaseLane("structured_wish_interview", "route", "enabled", [
    "background.structured_wish_interview.read",
    "background.structured_wish_interview.answer",
  ]),
  phaseLane("opportunity_briefs", "route", "enabled", [
    "background.opportunity_brief.list",
    "background.opportunity_brief.create",
    "background.opportunity_feedback.record",
  ]),
  phaseLane("intro_requests", "intro_path", "enabled", ["background.intro_request.create"]),
  phaseLane("privacy_freeze", "route", "enabled", [
    "background.privacy_freeze.activate",
    "background.privacy_freeze.release",
  ]),
  phaseLane("notification_builder", "worker", "enabled", [
    "background.notification.opportunity_brief",
  ]),
  phaseLane("retention_cleanup", "retention_job", "enabled", [
    "background.retention.cleanup",
  ]),
  phaseLane("participant_exports", "export_path", "enabled", [
    "background.participant_export.generate",
  ]),
  phaseLane("background_docs", "docs_page", "enabled", [
    "background.data_reuse_policy.read",
    "background.docs.render",
    "background.purpose_codes.list",
  ]),
  phaseLane("phase_gate_tests", "test_suite", "enabled", ["background.phase_gate.test"]),
  phaseLane("source_summary_import", "source_summary_path", "disabled_stub", [
    "background.source_summary.import",
  ]),
  phaseLane("llm_wish_interview", "llm_path", "disabled_stub", [
    "background.llm_wish_interview.propose",
  ]),
  phaseLane("partner_matchmaker", "partner_callback", "disabled_stub", [
    "background.partner_matchmaker.run",
  ]),
  phaseLane("federation_bridge", "federation_path", "disabled_stub", [
    "background.federation_bridge.export",
  ]),
  phaseLane("public_broad_preview_delegate", "worker", "disabled_stub", [
    "background.public_broad_preview_delegate.run",
  ]),
  phaseLane("high_sensitivity_signal", "route", "disabled_stub", [
    "background.high_sensitivity_signal.confirm",
  ]),
  phaseLane("high_impact_claim", "route", "disabled_stub", [
    "background.high_impact_claim.assert",
  ]),
  phaseLane("aggregate_release", "aggregate_report_path", "disabled_stub", [
    "background.aggregate_release.publish",
  ]),
  phaseLane("vault_reveal", "vault_path", "disabled_stub", ["background.vault_reveal.read"]),
  phaseLane("exact_disclosure", "disclosure_path", "disabled_stub", [
    "background.exact_disclosure.grant",
  ]),
  phaseLane("private_overlap_crypto", "route", "disabled_stub", [
    "background.private_overlap.check",
  ]),
];

function inferActionFamily(
  entry: Pick<BackgroundActionKindRegistryEntry, "actionKind" | "sideEffectClass">,
): NonNullable<BackgroundActionKindRegistryEntry["actionFamily"]> {
  if (entry.actionKind.includes("intro_request")) {
    return "intro_flow";
  }

  if (entry.actionKind.includes("disclosure") || entry.actionKind.includes("vault")) {
    return "disclosure";
  }

  if (entry.actionKind.includes("notification")) {
    return "notification";
  }

  if (entry.actionKind.includes("retention")) {
    return "retention";
  }

  if (entry.actionKind.includes("export")) {
    return "export";
  }

  if (entry.actionKind.includes("phase")) {
    return "phase_gate";
  }

  if (entry.sideEffectClass === "queue" || entry.actionKind.includes("helper_run")) {
    return "match_compute";
  }

  if (entry.sideEffectClass === "governance") {
    return "governance";
  }

  return entry.sideEffectClass === "none" ? "read_render" : "artifact_state";
}

type GovernedActionKindRegistryEntry = Omit<
  BackgroundActionKindRegistryEntry,
  "actionFamily" | "stepUpRequired"
> & {
  actionFamily: NonNullable<BackgroundActionKindRegistryEntry["actionFamily"]>;
  stepUpRequired: boolean;
};

function buildActionKindRegistryRows(): GovernedActionKindRegistryEntry[] {
  return ACTION_REGISTRY_ROWS.map((entry) => ({
    ...entry,
    actionFamily: entry.actionFamily ?? inferActionFamily(entry),
    stepUpRequired: entry.stepUpRequired ?? false,
  }));
}

const GOVERNED_ACTION_REGISTRY_ROWS = buildActionKindRegistryRows();
const ALL_PURPOSE_CODES = [...BACKGROUND_PURPOSE_CODES].sort();
const ALL_PURPOSE_BINDINGS: BackgroundClaimAssuranceTaxonomyBundleEntry["allowedPurposeBindings"] =
  ALL_PURPOSE_CODES.map((purposeCode) => ({
    purposeCode,
    purposePolicyVersion: BACKGROUND_PURPOSE_POLICY_VERSION,
  }));

const OUTPUT_SCHEMA_BUNDLE_ROWS: BackgroundOutputSchemaBundleEntry[] =
  GOVERNED_ACTION_REGISTRY_ROWS.map((entry) => {
    const allowedKeysBySchema: Record<string, string[]> = {
      "background-opportunity-brief-card-v2": [
        "actions",
        "authorizationScope",
        "blockerCodes",
        "confidenceBand",
        "dependencyState",
        "factorCodes",
        "id",
        "purposeLabel",
        "receiptId",
        "schemaVersion",
        "visibleCounts",
      ],
      "background-opportunity-brief-list-response-v2": [
        "briefs",
        "privacyNotice",
        "rollout",
        "schemaVersion",
      ],
      "background-intro-request-response-v1": [
        "introRequestId",
        "outreachSent",
        "policyDecisionId",
        "privateDetailsReturned",
        "reviewState",
        "stateMutation",
      ],
      "background-subject-identity-response-v1": [
        "authorityExpiresAt",
        "automationDisclosureRequired",
        "automationDisclosureState",
        "dependentArtifactInvalidation",
        "identityDetailDisclosure",
        "policyDecisionId",
        "representativeAuthorityState",
        "sanitizedSubjectLabel",
        "schemaVersion",
        "stateMutation",
        "subjectIdentityId",
        "subjectIdentityVersion",
        "subjectKind",
      ],
      "background-claim-assurance-response-v1": [
        "assuranceRecordId",
        "assuranceVersion",
        "claimInfluenceState",
        "policyDecisionId",
        "safeLabel",
        "schemaVersion",
        "stateMutation",
        "taxonomySnapshotState",
      ],
      "background-pairwise-safety-response-v1": [
        "dependentArtifactInvalidation",
        "policyDecisionId",
        "preferenceId",
        "preferenceVersion",
        "requesterSafeState",
        "schemaVersion",
        "stateMutation",
      ],
      "background-participant-export-response-v1": [
        "backgroundProfilePackage",
        "exportedAt",
        "importUrl",
        "privacyNotice",
        "schemaUrl",
        "schemaVersion",
      ],
    };
    const schemaRow = {
      allowedActionKinds: [entry.actionKind],
      allowedKeys:
        allowedKeysBySchema[entry.outputSchemaVersion] ??
        ["code", "policyDecision", "schemaVersion", "state", "stateMutation"],
      allowedLaneKeys: [entry.laneKey],
      audienceScope: entry.actionKind.includes("participant_export")
        ? "participant_owner"
        : entry.actionKind.includes("purpose_codes") ||
            entry.actionKind.includes("docs") ||
            entry.actionKind.includes("data_reuse_policy") ||
            entry.actionKind.includes("phase")
          ? "public_contract"
          : "requester",
      extraKeyPolicy: "reject",
      forbiddenKeyPatterns: [
        "candidate",
        "counterparty",
        "profile_id",
        "key_hash",
        "raw",
        "exact",
        "contact",
        "private",
        "debug",
        "timing",
        "policyDependencySnapshot",
      ],
      redactionRulesHash: hashGovernedObject({
        buckets: ["withheld", "none", "1", "2_to_3", "4_plus"],
        exactDetails: "field_grant_only",
        version: BACKGROUND_OUTPUT_SCHEMA_BUNDLE_VERSION,
      }),
      schemaKey: entry.outputSchemaVersion,
      schemaSurface: entry.actionKind.includes("participant_export")
        ? "participant_export"
        : entry.actionKind.includes("intro_request")
          ? "requester_intro_status"
          : entry.actionKind.includes("claim_assurance")
            ? "requester_claim_assurance"
            : entry.actionKind.includes("pairwise_safety")
              ? "requester_safety_preference"
          : entry.actionKind.includes("subject_identity")
            ? "requester_subject_identity"
            : entry.actionKind.includes("notification")
              ? "delegate_receipt"
              : entry.actionKind.includes("docs") ||
                  entry.actionKind.includes("purpose_codes") ||
                  entry.actionKind.includes("data_reuse_policy") ||
                  entry.actionKind.includes("phase")
                ? "public_contract"
                : "requester_opportunity_brief",
      status: "active",
    } satisfies Omit<BackgroundOutputSchemaBundleEntry, "schemaRecordHash">;

    return {
      ...schemaRow,
      schemaRecordHash: hashGovernedObject(schemaRow),
    };
  });

const TOOL_CAPABILITY_BUNDLE_BASE_ROWS = [
  {
    allowedActionKinds: ["background.helper_run.enqueue", "background.opportunity_brief.create"],
    allowArbitraryNetwork: false,
    allowCalendarWrite: false,
    allowContactOrOutreach: false,
    allowPartnerCallback: false,
    allowRawSourceRead: false,
    allowVaultDecrypt: false,
    capabilityKey: "deterministic_background_delegate_phase2",
    maxInputDataClass: "confirmed_broad_signals",
    status: "active",
  },
  {
    allowedActionKinds: [...DISABLED_FUTURE_ACTIONS],
    allowArbitraryNetwork: false,
    allowCalendarWrite: false,
    allowContactOrOutreach: false,
    allowPartnerCallback: false,
    allowRawSourceRead: false,
    allowVaultDecrypt: false,
    capabilityKey: "future_lanes_disabled_no_tools",
    maxInputDataClass: "redacted_metadata",
    status: "active",
  },
] satisfies Array<Omit<BackgroundToolCapabilityBundleEntry, "capabilityRecordHash">>;

const TOOL_CAPABILITY_BUNDLE_ROWS: BackgroundToolCapabilityBundleEntry[] =
  TOOL_CAPABILITY_BUNDLE_BASE_ROWS.map((row) => ({
    ...row,
    capabilityRecordHash: hashGovernedObject(row),
  }));

const RETENTION_POLICY_BUNDLE_ROWS: BackgroundRetentionPolicyBundleEntry[] = [
  ["delegate_run", "redacted_delegate_run", "artifact_ids_only", 90],
  ["opportunity_brief", "active_redacted_brief", "active_candidate_ids", 90],
  ["opportunity_feedback", "feedback_action_state", "artifact_ids_only", 90],
  ["intro_request", "intro_review_state", "direct_counterparty_ids", 90],
  ["delegate_receipt", "participant_redacted_receipt", "artifact_ids_only", 180],
  ["privacy_freeze", "participant_freeze_control", "artifact_ids_only", 365],
  ["participant_export", "short_lived_sanitized_export", "none", 1],
  ["policy_decision", "redacted_policy_decision", "artifact_ids_only", 30],
  ["subject_identity_profile", "broad_authority_state", "artifact_ids_only", 180],
  ["claim_assurance_record", "high_impact_claim_assurance", "artifact_ids_only", 180],
  ["pairwise_safety_preference", "participant_pairwise_safety_control", "none", 365],
  ["candidate_exposure_counter", "candidate_budget_counter", "active_candidate_ids", 45],
  ["match_signal_lineage", "confirmed_signal_lineage", "artifact_ids_only", 180],
].map(([artifactKind, retentionClass, linkableIdentifierAllowance, deleteAfterDays]) => {
  const row = {
    allowedRetainedFieldKeys: ["id", "profile_id", "status", "created_at", "updated_at"],
    artifactKind: artifactKind as BackgroundRetentionPolicyBundleEntry["artifactKind"],
    cacheOutboxInvalidationRequired: true,
    deleteAfterDays: Number(deleteAfterDays),
    linkableIdentifierAllowance:
      linkableIdentifierAllowance as BackgroundRetentionPolicyBundleEntry["linkableIdentifierAllowance"],
    nonActionabilityGuarantee:
      "retained_records_cannot_drive_matching_notifications_intro_disclosure_exports_or_analytics",
    retentionClass: String(retentionClass),
    status: "active" as const,
  };

  return {
    ...row,
    retentionPolicyRecordHash: hashGovernedObject(row),
  };
});

const SIGNAL_TAXONOMY_BASE_ROWS = [
  {
    allowedPurposeCodes: ALL_PURPOSE_CODES,
    allowedSurfaceKeys: ["broad_profile", "reviewed_source_summary"],
    prohibitedUses: ["latent_vector_matching", "engagement_optimization"],
    publicLabel: "Cause area",
    requiresOperatorReview: false,
    requiresRiskReview: false,
    requiresStepUpConfirmation: false,
    sensitivityTier: "low",
    signalKey: "cause_area",
    signalKind: "profile_field",
    status: "active",
    vulnerabilityLike: false,
  },
  {
    allowedPurposeCodes: ALL_PURPOSE_CODES,
    allowedSurfaceKeys: ["broad_profile", "reviewed_source_summary"],
    prohibitedUses: ["latent_vector_matching", "engagement_optimization"],
    publicLabel: "Offer",
    requiresOperatorReview: false,
    requiresRiskReview: false,
    requiresStepUpConfirmation: false,
    sensitivityTier: "low",
    signalKey: "offer",
    signalKind: "profile_field",
    status: "active",
    vulnerabilityLike: false,
  },
  {
    allowedPurposeCodes: ALL_PURPOSE_CODES,
    allowedSurfaceKeys: ["broad_profile", "reviewed_source_summary"],
    prohibitedUses: ["latent_vector_matching", "engagement_optimization"],
    publicLabel: "Ask",
    requiresOperatorReview: false,
    requiresRiskReview: false,
    requiresStepUpConfirmation: false,
    sensitivityTier: "medium",
    signalKey: "ask",
    signalKind: "profile_field",
    status: "active",
    vulnerabilityLike: false,
  },
  {
    allowedPurposeCodes: ALL_PURPOSE_CODES,
    allowedSurfaceKeys: ["broad_profile", "reviewed_source_summary"],
    prohibitedUses: ["latent_vector_matching", "unreviewed_reliance_wording"],
    publicLabel: "Capability",
    requiresOperatorReview: false,
    requiresRiskReview: false,
    requiresStepUpConfirmation: false,
    sensitivityTier: "medium",
    signalKey: "capability",
    signalKind: "profile_field",
    status: "active",
    vulnerabilityLike: false,
  },
  {
    allowedPurposeCodes: ALL_PURPOSE_CODES,
    allowedSurfaceKeys: ["broad_profile", "reviewed_source_summary"],
    prohibitedUses: ["urgency_boosting", "engagement_optimization"],
    publicLabel: "Constraint",
    requiresOperatorReview: false,
    requiresRiskReview: false,
    requiresStepUpConfirmation: false,
    sensitivityTier: "medium",
    signalKey: "constraint",
    signalKind: "constraint",
    status: "active",
    vulnerabilityLike: false,
  },
  {
    allowedPurposeCodes: ALL_PURPOSE_CODES,
    allowedSurfaceKeys: ["reviewed_source_summary"],
    prohibitedUses: ["source_summary_approval_as_implicit_confirmation"],
    publicLabel: "Confirmed source-summary tag",
    requiresOperatorReview: false,
    requiresRiskReview: false,
    requiresStepUpConfirmation: false,
    sensitivityTier: "medium",
    signalKey: "confirmed_source_summary_tag",
    signalKind: "source_summary_tag",
    status: "active",
    vulnerabilityLike: false,
  },
  {
    allowedPurposeCodes: [],
    allowedSurfaceKeys: [],
    prohibitedUses: ["matching", "surfacing", "notification", "intro_request", "disclosure_prompt"],
    publicLabel: "High-sensitivity or vulnerability-like signal",
    requiresOperatorReview: true,
    requiresRiskReview: true,
    requiresStepUpConfirmation: true,
    sensitivityTier: "high",
    signalKey: "high_sensitivity_or_vulnerability",
    signalKind: "confirmed_tag",
    status: "disabled",
    vulnerabilityLike: true,
  },
  {
    allowedPurposeCodes: [],
    allowedSurfaceKeys: [],
    prohibitedUses: ["matching", "surfacing", "notification", "intro_request", "analytics"],
    publicLabel: "Private third-party data",
    requiresOperatorReview: true,
    requiresRiskReview: true,
    requiresStepUpConfirmation: true,
    sensitivityTier: "prohibited",
    signalKey: "private_third_party_data",
    signalKind: "third_party_private_data",
    status: "disabled",
    vulnerabilityLike: true,
  },
] satisfies Array<Omit<BackgroundSignalTaxonomyBundleEntry, "signalRecordHash">>;

const SIGNAL_TAXONOMY_ROWS: BackgroundSignalTaxonomyBundleEntry[] =
  SIGNAL_TAXONOMY_BASE_ROWS.map((row) => ({
    ...row,
    allowedPurposeCodes: [...row.allowedPurposeCodes],
    allowedSurfaceKeys: [...row.allowedSurfaceKeys],
    prohibitedUses: [...row.prohibitedUses],
    signalRecordHash: hashGovernedObject(row),
  }));

const CLAIM_ASSURANCE_TAXONOMY_BASE_ROWS = [
  {
    allowedPurposeBindings: ALL_PURPOSE_BINDINGS,
    allowedSurfaceKeys: [],
    broadClaimKey: "funding_capacity",
    claimKind: "funding_capacity",
    evidenceRequirementCodes: ["redacted_evidence_summary", "operator_review"],
    maxValidityDays: 180,
    minimumAssuranceLevel: "operator_reviewed",
    prohibitedUses: ["self_attested_reliance", "ranking_boost", "engagement_optimization"],
    publicLabel: "Funding capacity",
    relianceLimitCodes: ["no_reliance_wording", "field_grant_required"],
    requiresOperatorReview: true,
    status: "disabled",
  },
  {
    allowedPurposeBindings: ALL_PURPOSE_BINDINGS,
    allowedSurfaceKeys: [],
    broadClaimKey: "formal_authority",
    claimKind: "authority",
    evidenceRequirementCodes: ["authority_scope_record", "operator_review"],
    maxValidityDays: 180,
    minimumAssuranceLevel: "operator_reviewed",
    prohibitedUses: ["self_attested_reliance", "ranking_boost", "engagement_optimization"],
    publicLabel: "Formal authority",
    relianceLimitCodes: ["operator_review_required", "field_grant_required"],
    requiresOperatorReview: true,
    status: "disabled",
  },
  {
    allowedPurposeBindings: ALL_PURPOSE_BINDINGS,
    allowedSurfaceKeys: [],
    broadClaimKey: "credential_or_expertise",
    claimKind: "credential",
    evidenceRequirementCodes: ["redacted_credential_evidence", "operator_review"],
    maxValidityDays: 365,
    minimumAssuranceLevel: "externally_verified",
    prohibitedUses: ["unreviewed_reliance_wording", "ranking_boost", "engagement_optimization"],
    publicLabel: "Credential or expertise",
    relianceLimitCodes: ["no_reliance_wording", "operator_review_required"],
    requiresOperatorReview: true,
    status: "disabled",
  },
  {
    allowedPurposeBindings: ALL_PURPOSE_BINDINGS,
    allowedSurfaceKeys: [],
    broadClaimKey: "scarce_resource_or_safety_capability",
    claimKind: "scarce_resource",
    evidenceRequirementCodes: ["availability_evidence", "operator_review"],
    maxValidityDays: 90,
    minimumAssuranceLevel: "operator_reviewed",
    prohibitedUses: ["scarcity_boosting", "ranking_boost", "engagement_optimization"],
    publicLabel: "Scarce resource or safety capability",
    relianceLimitCodes: ["operator_review_required", "field_grant_required"],
    requiresOperatorReview: true,
    status: "disabled",
  },
  {
    allowedPurposeBindings: ALL_PURPOSE_BINDINGS,
    allowedSurfaceKeys: [],
    broadClaimKey: "fiscal_sponsorship_or_institutional_affiliation",
    claimKind: "fiscal_sponsorship",
    evidenceRequirementCodes: ["institutional_evidence", "operator_review"],
    maxValidityDays: 365,
    minimumAssuranceLevel: "externally_verified",
    prohibitedUses: ["self_attested_reliance", "ranking_boost", "engagement_optimization"],
    publicLabel: "Fiscal sponsorship or affiliation",
    relianceLimitCodes: ["no_reliance_wording", "field_grant_required"],
    requiresOperatorReview: true,
    status: "disabled",
  },
] satisfies Array<
  Omit<BackgroundClaimAssuranceTaxonomyBundleEntry, "claimAssuranceTaxonomyRecordHash">
>;

const CLAIM_ASSURANCE_TAXONOMY_ROWS: BackgroundClaimAssuranceTaxonomyBundleEntry[] =
  CLAIM_ASSURANCE_TAXONOMY_BASE_ROWS.map((row) => ({
    ...row,
    allowedPurposeBindings: row.allowedPurposeBindings.map((binding) => ({ ...binding })),
    allowedSurfaceKeys: [...row.allowedSurfaceKeys],
    evidenceRequirementCodes: [...row.evidenceRequirementCodes],
    prohibitedUses: [...row.prohibitedUses],
    relianceLimitCodes: [...row.relianceLimitCodes],
    claimAssuranceTaxonomyRecordHash: hashGovernedObject(row),
  }));

const POLICY_COMPOSITION_RULE_BASE_ROWS = [
  {
    appliesToActionKinds: GOVERNED_ACTION_REGISTRY_ROWS.map((entry) => entry.actionKind),
    compositionMode: "deny_overrides",
    conflictBehavior: "fail_closed",
    controlFamilies: [
      "delegate_authorization",
      "candidate_exposure",
      "privacy_freeze",
      "subject_identity_authority",
      "claim_assurance",
      "pairwise_safety_preference",
      "account_security_hold",
      "emergency_control",
      "retention_hold",
      "tripwire",
      "output_schema",
    ],
    ruleCode: "background_controls_compose_least_permissively",
    status: "active",
  },
] satisfies Array<Omit<BackgroundPolicyCompositionRule, "ruleRecordHash">>;

const POLICY_COMPOSITION_RULE_ROWS: BackgroundPolicyCompositionRule[] =
  POLICY_COMPOSITION_RULE_BASE_ROWS.map((row) => ({
    ...row,
    ruleRecordHash: hashGovernedObject(row),
  }));

const ARTIFACT_TRANSITION_POLICY_BASE_ROWS = [
  {
    allowedActorRoles: ["participant"],
    artifactKind: "privacy_freeze",
    fromStates: ["none", "released", "expired"],
    nonActionabilityGuarantee:
      "active_freeze_blocks_background_networking_without_revealing_reason_to_counterparties",
    requiredActionKind: "background.privacy_freeze.activate",
    status: "active",
    toState: "active",
  },
  {
    allowedActorRoles: ["participant"],
    artifactKind: "privacy_freeze",
    fromStates: ["active"],
    nonActionabilityGuarantee:
      "release_requires_step_up_and_recompute_before_artifacts_become_actionable",
    requiredActionKind: "background.privacy_freeze.release",
    status: "active",
    toState: "released",
  },
  {
    allowedActorRoles: ["participant"],
    artifactKind: "subject_identity",
    fromStates: ["none", "current", "stale", "disputed", "revoked"],
    nonActionabilityGuarantee:
      "subject identity changes stale dependent artifacts and require fresh governed policy decisions before surfacing or intro advancement",
    requiredActionKind: "background.subject_identity.update",
    status: "active",
    toState: "current_or_blocking",
  },
  {
    allowedActorRoles: ["participant", "operator", "admin"],
    artifactKind: "claim_assurance",
    fromStates: ["none", "pending", "approved", "stale", "revoked", "rejected"],
    nonActionabilityGuarantee:
      "claim assurance records remain broad, taxonomy-disabled for Phase 2, and cannot influence ranking or reliance wording without fresh governed taxonomy activation",
    requiredActionKind: "background.claim_assurance.record",
    status: "active",
    toState: "recorded_non_actionable",
  },
  {
    allowedActorRoles: ["participant"],
    artifactKind: "pairwise_safety_preference",
    fromStates: ["none", "active", "paused", "expired", "revoked"],
    nonActionabilityGuarantee:
      "pairwise safety preferences only suppress or stale dependent artifacts and never reveal the scoped target or reason to requesters",
    requiredActionKind: "background.pairwise_safety_preference.write",
    status: "active",
    toState: "suppressive_control_recorded",
  },
  {
    allowedActorRoles: ["participant"],
    artifactKind: "intro_request",
    fromStates: ["none"],
    nonActionabilityGuarantee:
      "intro_requests_remain_operator_reviewed_and_mutual_consent_gated",
    requiredActionKind: "background.intro_request.create",
    status: "active",
    toState: "requested",
  },
  {
    allowedActorRoles: ["participant"],
    artifactKind: "participant_export",
    fromStates: ["none"],
    nonActionabilityGuarantee:
      "exports_are_sanitized_short_lived_and_blocked_by_privacy_freeze",
    requiredActionKind: "background.participant_export.generate",
    status: "active",
    toState: "generated",
  },
] satisfies Array<Omit<BackgroundArtifactTransitionPolicy, "transitionRecordHash">>;

const ARTIFACT_TRANSITION_POLICY_ROWS: BackgroundArtifactTransitionPolicy[] =
  ARTIFACT_TRANSITION_POLICY_BASE_ROWS.map((row) => ({
    ...row,
    transitionRecordHash: hashGovernedObject(row),
  }));

const PURPOSE_REGISTRY_HASH = hashGovernedObject({
  purposePolicyVersion: BACKGROUND_PURPOSE_POLICY_VERSION,
  registry: Object.values(BACKGROUND_PURPOSE_REGISTRY).sort((left, right) =>
    left.code.localeCompare(right.code),
  ),
});
const SIGNAL_TAXONOMY_HASH = hashGovernedObject({
  rows: SIGNAL_TAXONOMY_ROWS
    .map((row) => ({ ...row }))
    .sort((left, right) => left.signalKey.localeCompare(right.signalKey)),
  version: BACKGROUND_SIGNAL_TAXONOMY_VERSION,
});
const CLAIM_ASSURANCE_TAXONOMY_HASH = hashGovernedObject({
  rows: CLAIM_ASSURANCE_TAXONOMY_ROWS
    .map((row) => ({ ...row }))
    .sort((left, right) => left.broadClaimKey.localeCompare(right.broadClaimKey)),
  version: BACKGROUND_CLAIM_ASSURANCE_TAXONOMY_VERSION,
});
const OUTPUT_SCHEMA_BUNDLE_HASH = hashGovernedObject({
  rows: OUTPUT_SCHEMA_BUNDLE_ROWS
    .map((row) => ({ ...row }))
    .sort((left, right) => left.schemaKey.localeCompare(right.schemaKey)),
  version: BACKGROUND_OUTPUT_SCHEMA_BUNDLE_VERSION,
});
const TOOL_CAPABILITY_BUNDLE_HASH = hashGovernedObject({
  rows: TOOL_CAPABILITY_BUNDLE_ROWS
    .map((row) => ({ ...row }))
    .sort((left, right) => left.capabilityKey.localeCompare(right.capabilityKey)),
  version: BACKGROUND_TOOL_CAPABILITY_BUNDLE_VERSION,
});
const RETENTION_POLICY_BUNDLE_HASH = hashGovernedObject({
  rows: RETENTION_POLICY_BUNDLE_ROWS
    .map((row) => ({ ...row }))
    .sort((left, right) => left.retentionClass.localeCompare(right.retentionClass)),
  version: BACKGROUND_RETENTION_POLICY_BUNDLE_VERSION,
});
const POLICY_COMPOSITION_BUNDLE_HASH = hashGovernedObject({
  rows: POLICY_COMPOSITION_RULE_ROWS
    .map((row) => ({ ...row }))
    .sort((left, right) => left.ruleCode.localeCompare(right.ruleCode)),
  version: BACKGROUND_POLICY_COMPOSITION_BUNDLE_VERSION,
});
const ARTIFACT_TRANSITION_POLICY_BUNDLE_HASH = hashGovernedObject({
  rows: ARTIFACT_TRANSITION_POLICY_ROWS
    .map((row) => ({ ...row }))
    .sort((left, right) =>
      `${left.artifactKind}:${left.toState}`.localeCompare(
        `${right.artifactKind}:${right.toState}`,
      ),
    ),
  version: BACKGROUND_ARTIFACT_TRANSITION_POLICY_BUNDLE_VERSION,
});
const ACTION_REGISTRY_HASH = hashGovernedObject({
  rows: GOVERNED_ACTION_REGISTRY_ROWS,
  version: BACKGROUND_POLICY_ACTION_KIND_REGISTRY_VERSION,
});

function phaseLane(
  laneKey: BackgroundPhaseLaneKey,
  laneKind: BackgroundLaneKind,
  laneState: BackgroundLaneState,
  allowedActionKinds: BackgroundPolicyActionKind[],
): Omit<BackgroundPhaseGateLane, "laneRecordHash"> {
  return {
    allowedActionKinds,
    genericUnavailableCode:
      laneState === "enabled" ? "background_lane_available" : "background_lane_unavailable",
    laneKey,
    laneKind,
    laneState,
    requiredFeatureFlagStates: {},
    requiredPilotEvaluation:
      laneKey === "partner_matchmaker" ||
      laneKey === "federation_bridge" ||
      laneKey === "public_broad_preview_delegate",
    requiredRiskReview:
      laneKey === "partner_matchmaker" ||
      laneKey === "federation_bridge" ||
      laneKey === "public_broad_preview_delegate" ||
      laneKey === "high_sensitivity_signal" ||
      laneKey === "high_impact_claim",
  };
}

function stableJson(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map(stableJson).join(",")}]`;
  }

  return `{${Object.entries(value as Record<string, unknown>)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, entry]) => `${JSON.stringify(key)}:${stableJson(entry)}`)
    .join(",")}}`;
}

export function hashGovernedObject(value: unknown) {
  return createHash("sha256").update(stableJson(value)).digest("hex");
}

export function getBackgroundActionKindRegistry() {
  return GOVERNED_ACTION_REGISTRY_ROWS.map((row) => ({
    ...row,
    actorRoles: [...row.actorRoles],
  }));
}

export function getBackgroundActionKindRegistryHash() {
  return ACTION_REGISTRY_HASH;
}

export function getBackgroundOutputSchemaBundle() {
  return OUTPUT_SCHEMA_BUNDLE_ROWS.map((row) => ({
    ...row,
    allowedActionKinds: [...row.allowedActionKinds],
    allowedKeys: [...row.allowedKeys],
    allowedLaneKeys: [...row.allowedLaneKeys],
    forbiddenKeyPatterns: [...row.forbiddenKeyPatterns],
  }));
}

export function getBackgroundToolCapabilityBundle() {
  return TOOL_CAPABILITY_BUNDLE_ROWS.map((row) => ({
    ...row,
    allowedActionKinds: [...row.allowedActionKinds],
  }));
}

export function getBackgroundRetentionPolicyBundle() {
  return RETENTION_POLICY_BUNDLE_ROWS.map((row) => ({
    ...row,
    allowedRetainedFieldKeys: [...row.allowedRetainedFieldKeys],
  }));
}

export function getBackgroundSignalTaxonomyBundle() {
  return SIGNAL_TAXONOMY_ROWS.map((row) => ({
    ...row,
    allowedPurposeCodes: [...row.allowedPurposeCodes],
    allowedSurfaceKeys: [...row.allowedSurfaceKeys],
    prohibitedUses: [...row.prohibitedUses],
  }));
}

export function getBackgroundClaimAssuranceTaxonomyBundle() {
  return CLAIM_ASSURANCE_TAXONOMY_ROWS.map((row) => ({
    ...row,
    allowedPurposeBindings: row.allowedPurposeBindings.map((binding) => ({ ...binding })),
    allowedSurfaceKeys: [...row.allowedSurfaceKeys],
    evidenceRequirementCodes: [...row.evidenceRequirementCodes],
    prohibitedUses: [...row.prohibitedUses],
    relianceLimitCodes: [...row.relianceLimitCodes],
  }));
}

export function getBackgroundPolicyCompositionBundle() {
  return POLICY_COMPOSITION_RULE_ROWS.map((row) => ({
    ...row,
    appliesToActionKinds: [...row.appliesToActionKinds],
    controlFamilies: [...row.controlFamilies],
  }));
}

export function getBackgroundArtifactTransitionPolicyBundle() {
  return ARTIFACT_TRANSITION_POLICY_ROWS.map((row) => ({
    ...row,
    allowedActorRoles: [...row.allowedActorRoles],
    fromStates: [...row.fromStates],
  }));
}

export function getBackgroundPhaseGateBundle(): BackgroundPhaseGateBundle {
  const lanes = PHASE_GATE_ROWS.map((lane) => ({
    ...lane,
    allowedActionKinds: [...lane.allowedActionKinds],
    requiredFeatureFlagStates: { ...lane.requiredFeatureFlagStates },
    laneRecordHash: hashGovernedObject(lane),
  }));

  return {
    backgroundNetworkingPhase: BACKGROUND_CURRENT_PHASE,
    bundleHash: hashGovernedObject({
      backgroundNetworkingPhase: BACKGROUND_CURRENT_PHASE,
      bundleVersion: BACKGROUND_PHASE_GATE_BUNDLE_VERSION,
      lanes: lanes
        .map((lane) => ({ ...lane }))
        .sort((left, right) => left.laneKey.localeCompare(right.laneKey)),
    }),
    bundleVersion: BACKGROUND_PHASE_GATE_BUNDLE_VERSION,
    lanes,
  };
}

export function getActiveBackgroundReleaseManifest(): BackgroundReleaseManifest {
  const phaseGateBundle = getBackgroundPhaseGateBundle();

  return {
    artifactTransitionPolicyBundleHash: ARTIFACT_TRANSITION_POLICY_BUNDLE_HASH,
    artifactTransitionPolicyBundleVersion:
      BACKGROUND_ARTIFACT_TRANSITION_POLICY_BUNDLE_VERSION,
    backgroundNetworkingPhase: BACKGROUND_CURRENT_PHASE,
    claimAssuranceTaxonomyHash: CLAIM_ASSURANCE_TAXONOMY_HASH,
    claimAssuranceTaxonomyVersion: BACKGROUND_CLAIM_ASSURANCE_TAXONOMY_VERSION,
    id: BACKGROUND_RELEASE_MANIFEST_VERSION,
    outputSchemaBundleHash: OUTPUT_SCHEMA_BUNDLE_HASH,
    outputSchemaBundleVersion: BACKGROUND_OUTPUT_SCHEMA_BUNDLE_VERSION,
    phaseGateBundleHash: phaseGateBundle.bundleHash,
    phaseGateBundleVersion: phaseGateBundle.bundleVersion,
    policyActionKindRegistryHash: ACTION_REGISTRY_HASH,
    policyActionKindRegistryVersion: BACKGROUND_POLICY_ACTION_KIND_REGISTRY_VERSION,
    policyCompositionBundleHash: POLICY_COMPOSITION_BUNDLE_HASH,
    policyCompositionBundleVersion: BACKGROUND_POLICY_COMPOSITION_BUNDLE_VERSION,
    publicPageSimplificationSpecHash: BACKGROUND_PUBLIC_PAGE_SIMPLIFICATION_SPEC_HASH,
    publicPageSimplificationSpecVersion: BACKGROUND_PUBLIC_PAGE_SIMPLIFICATION_SPEC_VERSION,
    policyEngineVersion: BACKGROUND_POLICY_ENGINE_VERSION,
    purposeRegistryHash: PURPOSE_REGISTRY_HASH,
    purposeRegistryVersion: BACKGROUND_PURPOSE_POLICY_VERSION,
    retentionPolicyBundleHash: RETENTION_POLICY_BUNDLE_HASH,
    retentionPolicyBundleVersion: BACKGROUND_RETENTION_POLICY_BUNDLE_VERSION,
    signalTaxonomyHash: SIGNAL_TAXONOMY_HASH,
    signalTaxonomyVersion: BACKGROUND_SIGNAL_TAXONOMY_VERSION,
    status: "active",
    toolCapabilityBundleHash: TOOL_CAPABILITY_BUNDLE_HASH,
    toolCapabilityBundleVersion: BACKGROUND_TOOL_CAPABILITY_BUNDLE_VERSION,
    uiCopyBundleHash: BACKGROUND_UI_COPY_BUNDLE_HASH,
    uiCopyBundleVersion: BACKGROUND_UI_COPY_BUNDLE_VERSION,
  };
}

export function getBackgroundPhaseLane(laneKey: string) {
  return getBackgroundPhaseGateBundle().lanes.find((lane) => lane.laneKey === laneKey) ?? null;
}

export function getBackgroundActionKind(actionKind: string) {
  return GOVERNED_ACTION_REGISTRY_ROWS.find((entry) => entry.actionKind === actionKind) ?? null;
}

function check(
  id: string,
  label: string,
  passed: boolean,
  evidence: string,
): BackgroundPhaseGateValidation["checks"][number] {
  return {
    evidence,
    id,
    label,
    status: passed ? "pass" : "fail",
  };
}

export function validateBackgroundPhaseGateBundle(
  bundle: BackgroundPhaseGateBundle = getBackgroundPhaseGateBundle(),
  manifest: BackgroundReleaseManifest = getActiveBackgroundReleaseManifest(),
): BackgroundPhaseGateValidation {
  const laneKeys = bundle.lanes.map((lane) => lane.laneKey);
  const actionKinds = GOVERNED_ACTION_REGISTRY_ROWS.map((entry) => entry.actionKind);
  const catchAllActionPattern = /(?:^|\.)(?:other|misc|debug|manual_override|admin_action|background_operation|worker_task|partner_action)(?:$|\.)/;
  const sideEffectingActions = GOVERNED_ACTION_REGISTRY_ROWS.filter(
    (entry) => entry.sideEffectClass !== "none",
  );
  const schemaKeys = new Set(OUTPUT_SCHEMA_BUNDLE_ROWS.map((row) => row.schemaKey));
  const schemaActions = new Set(
    OUTPUT_SCHEMA_BUNDLE_ROWS.flatMap((row) => row.allowedActionKinds),
  );
  const retentionArtifactKinds = new Set(
    RETENTION_POLICY_BUNDLE_ROWS.map((row) => row.artifactKind),
  );
  const activePurposeCodes = new Set<string>(ALL_PURPOSE_CODES);
  const recomputedLaneHashRows = bundle.lanes
    .map(({ laneRecordHash: _laneRecordHash, ...lane }) => ({
      ...lane,
      laneRecordHash: hashGovernedObject(lane),
    }))
    .sort((left, right) => left.laneKey.localeCompare(right.laneKey));
  const recomputedBundleHash = hashGovernedObject({
    backgroundNetworkingPhase: bundle.backgroundNetworkingPhase,
    bundleVersion: bundle.bundleVersion,
    lanes: recomputedLaneHashRows,
  });
  const futureLaneStates = bundle.lanes
    .filter((lane) =>
      [
        "source_summary_import",
        "llm_wish_interview",
        "partner_matchmaker",
        "federation_bridge",
        "public_broad_preview_delegate",
        "high_sensitivity_signal",
        "high_impact_claim",
        "aggregate_release",
        "vault_reveal",
        "exact_disclosure",
        "private_overlap_crypto",
      ].includes(lane.laneKey),
    )
    .map((lane) => `${lane.laneKey}:${lane.laneState}`);
  const requiredPhase2Lanes = [
    "structured_wish_profile",
    "subject_identity",
    "claim_assurance_records",
    "pairwise_safety_preferences",
    "candidate_exposure",
    "delegate_authorizations",
    "helper_runs",
    "manual_source_summaries",
    "structured_wish_interview",
    "opportunity_briefs",
    "intro_requests",
    "privacy_freeze",
    "notification_builder",
    "retention_cleanup",
    "participant_exports",
    "background_docs",
    "phase_gate_tests",
  ] as const satisfies readonly BackgroundPhaseLaneKey[];
  const checks = [
    check(
      "manifest-phase-bound",
      "Release manifest binds the current background-networking phase",
      manifest.backgroundNetworkingPhase === BACKGROUND_CURRENT_PHASE &&
        manifest.phaseGateBundleVersion === BACKGROUND_PHASE_GATE_BUNDLE_VERSION &&
        manifest.phaseGateBundleHash === bundle.bundleHash,
      `${manifest.backgroundNetworkingPhase}:${manifest.phaseGateBundleVersion}:${manifest.phaseGateBundleHash}`,
    ),
    check(
      "bundle-hash-valid",
      "Phase-gate bundle hash is recomputed from the complete lane matrix",
      recomputedBundleHash === bundle.bundleHash,
      `${bundle.bundleHash}:${recomputedBundleHash}`,
    ),
    check(
      "required-phase2-lanes",
      "Phase 2 enabled lanes cover profile, exposure, authorizations, helper runs, manual summaries, opportunity briefs, intro skeleton, notifications, retention, docs, and tests",
      requiredPhase2Lanes.every((laneKey) => laneKeys.includes(laneKey)),
      laneKeys.join(", "),
    ),
    check(
      "future-lanes-disabled",
      "Future higher-power lanes remain explicit disabled stubs",
      futureLaneStates.every((entry) => /:disabled_stub$/.test(entry)) &&
        futureLaneStates.length === 11,
      futureLaneStates.join(", "),
    ),
    check(
      "action-kind-registry-complete",
      "Every lane action kind is registered and every registry action belongs to its lane",
      bundle.lanes.every((lane) =>
        lane.allowedActionKinds.every((actionKind) => actionKinds.includes(actionKind)),
      ) &&
        GOVERNED_ACTION_REGISTRY_ROWS.every((entry) =>
          bundle.lanes.some(
            (lane) =>
              lane.laneKey === entry.laneKey &&
              lane.allowedActionKinds.includes(entry.actionKind),
          ),
        ),
      actionKinds.join(", "),
    ),
    check(
      "manifest-binds-governed-bundles",
      "Release manifest binds policy, action-kind, schema, tool, retention, signal, claim, purpose, transition, UI-copy, and public-page simplification bundles",
      [
        manifest.policyEngineVersion,
        manifest.policyActionKindRegistryHash,
        manifest.outputSchemaBundleHash,
        manifest.toolCapabilityBundleHash,
        manifest.retentionPolicyBundleHash,
        manifest.signalTaxonomyHash,
        manifest.claimAssuranceTaxonomyHash,
        manifest.purposeRegistryHash,
        manifest.policyCompositionBundleHash,
        manifest.artifactTransitionPolicyBundleHash,
        manifest.uiCopyBundleHash,
        manifest.publicPageSimplificationSpecHash,
      ].every(Boolean),
      manifest.id,
    ),
    check(
      "public-page-simplification-spec-hash-valid",
      "Public-page simplification spec is content-addressed and bound into the active release manifest",
      manifest.publicPageSimplificationSpecVersion ===
        BACKGROUND_PUBLIC_PAGE_SIMPLIFICATION_SPEC_VERSION &&
        manifest.publicPageSimplificationSpecHash ===
          BACKGROUND_PUBLIC_PAGE_SIMPLIFICATION_SPEC_HASH,
      `${manifest.publicPageSimplificationSpecVersion}:${manifest.publicPageSimplificationSpecHash}`,
    ),
    check(
      "ui-copy-bundle-hash-valid",
      "UI-copy bundle is content-addressed and bound into the active release manifest",
      manifest.uiCopyBundleVersion === BACKGROUND_UI_COPY_BUNDLE_VERSION &&
        manifest.uiCopyBundleHash === BACKGROUND_UI_COPY_BUNDLE_HASH,
      `${manifest.uiCopyBundleVersion}:${manifest.uiCopyBundleHash}`,
    ),
    check(
      "action-kind-registry-hash-valid",
      "Action-kind registry hash is recomputed from complete governed action rows",
      manifest.policyActionKindRegistryHash ===
        hashGovernedObject({
          rows: GOVERNED_ACTION_REGISTRY_ROWS,
          version: BACKGROUND_POLICY_ACTION_KIND_REGISTRY_VERSION,
        }) &&
        GOVERNED_ACTION_REGISTRY_ROWS.every(
          (entry) =>
            !catchAllActionPattern.test(entry.actionKind) &&
            (entry.sideEffectClass === "none" || entry.idempotencyRequired),
        ),
      `${manifest.policyActionKindRegistryVersion}:${manifest.policyActionKindRegistryHash}`,
    ),
    check(
      "output-schema-bundle-hash-valid",
      "Output schema bundle is content-addressed and covers every registered action response",
      manifest.outputSchemaBundleHash ===
        hashGovernedObject({
          rows: OUTPUT_SCHEMA_BUNDLE_ROWS
            .map((row) => ({ ...row }))
            .sort((left, right) => left.schemaKey.localeCompare(right.schemaKey)),
          version: BACKGROUND_OUTPUT_SCHEMA_BUNDLE_VERSION,
        }) &&
        GOVERNED_ACTION_REGISTRY_ROWS.every(
          (entry) =>
            schemaKeys.has(entry.outputSchemaVersion) &&
            schemaActions.has(entry.actionKind),
        ) &&
        OUTPUT_SCHEMA_BUNDLE_ROWS.every((row) => row.extraKeyPolicy === "reject"),
      `${manifest.outputSchemaBundleVersion}:${manifest.outputSchemaBundleHash}`,
    ),
    check(
      "tool-capability-bundle-hash-valid",
      "Tool-capability bundle is content-addressed and keeps delegate tools side-effect limited",
      manifest.toolCapabilityBundleHash ===
        hashGovernedObject({
          rows: TOOL_CAPABILITY_BUNDLE_ROWS
            .map((row) => ({ ...row }))
            .sort((left, right) => left.capabilityKey.localeCompare(right.capabilityKey)),
          version: BACKGROUND_TOOL_CAPABILITY_BUNDLE_VERSION,
        }) &&
        TOOL_CAPABILITY_BUNDLE_ROWS.every(
          (row) =>
            !row.allowArbitraryNetwork &&
            !row.allowCalendarWrite &&
            !row.allowContactOrOutreach &&
            !row.allowRawSourceRead &&
            !row.allowVaultDecrypt,
        ),
      `${manifest.toolCapabilityBundleVersion}:${manifest.toolCapabilityBundleHash}`,
    ),
    check(
      "retention-policy-bundle-hash-valid",
      "Retention-policy bundle is content-addressed and covers Phase 2 linkable artifacts",
      manifest.retentionPolicyBundleHash ===
        hashGovernedObject({
          rows: RETENTION_POLICY_BUNDLE_ROWS
            .map((row) => ({ ...row }))
            .sort((left, right) => left.retentionClass.localeCompare(right.retentionClass)),
          version: BACKGROUND_RETENTION_POLICY_BUNDLE_VERSION,
        }) &&
        [
          "delegate_run",
          "opportunity_brief",
          "opportunity_feedback",
          "intro_request",
          "delegate_receipt",
          "privacy_freeze",
          "participant_export",
          "policy_decision",
          "subject_identity_profile",
          "claim_assurance_record",
          "pairwise_safety_preference",
          "candidate_exposure_counter",
          "match_signal_lineage",
        ].every((artifactKind) =>
          retentionArtifactKinds.has(
            artifactKind as BackgroundRetentionPolicyBundleEntry["artifactKind"],
          ),
        ) &&
        RETENTION_POLICY_BUNDLE_ROWS.every(
          (row) =>
            row.cacheOutboxInvalidationRequired &&
            row.nonActionabilityGuarantee.includes("cannot_drive_matching"),
      ),
      `${manifest.retentionPolicyBundleVersion}:${manifest.retentionPolicyBundleHash}`,
    ),
    check(
      "signal-taxonomy-hash-valid",
      "Signal taxonomy is content-addressed and keeps high-sensitivity signals disabled for Phase 2",
      manifest.signalTaxonomyHash ===
        hashGovernedObject({
          rows: SIGNAL_TAXONOMY_ROWS
            .map((row) => ({ ...row }))
            .sort((left, right) => left.signalKey.localeCompare(right.signalKey)),
          version: BACKGROUND_SIGNAL_TAXONOMY_VERSION,
        }) &&
        SIGNAL_TAXONOMY_ROWS.every(({ signalRecordHash, ...row }) => {
          const purposeCodesValid = row.allowedPurposeCodes.every((purposeCode) =>
            activePurposeCodes.has(purposeCode),
          );
          const activeRowsHavePurpose = row.status !== "active" || row.allowedPurposeCodes.length > 0;
          const vulnerableRowsAreGated =
            !row.vulnerabilityLike ||
            (row.status === "disabled" &&
              row.requiresStepUpConfirmation &&
              row.requiresRiskReview &&
              row.requiresOperatorReview);

          return (
            signalRecordHash === hashGovernedObject(row) &&
            purposeCodesValid &&
            activeRowsHavePurpose &&
            vulnerableRowsAreGated &&
            !/(embedding|latent|vector|behavioral|engagement)/.test(row.signalKey)
          );
        }) &&
        SIGNAL_TAXONOMY_ROWS.some(
          (row) =>
            row.signalKey === "confirmed_source_summary_tag" &&
            row.status === "active" &&
            row.prohibitedUses.includes("source_summary_approval_as_implicit_confirmation"),
        ) &&
        SIGNAL_TAXONOMY_ROWS.some(
          (row) =>
            row.signalKey === "private_third_party_data" &&
            row.status === "disabled" &&
            row.sensitivityTier === "prohibited",
        ),
      `${manifest.signalTaxonomyVersion}:${manifest.signalTaxonomyHash}`,
    ),
    check(
      "claim-assurance-taxonomy-hash-valid",
      "Claim-assurance taxonomy is content-addressed and high-impact claim influence stays disabled for Phase 2",
      manifest.claimAssuranceTaxonomyHash ===
        hashGovernedObject({
          rows: CLAIM_ASSURANCE_TAXONOMY_ROWS
            .map((row) => ({ ...row }))
            .sort((left, right) => left.broadClaimKey.localeCompare(right.broadClaimKey)),
          version: BACKGROUND_CLAIM_ASSURANCE_TAXONOMY_VERSION,
        }) &&
        CLAIM_ASSURANCE_TAXONOMY_ROWS.every(
          ({ claimAssuranceTaxonomyRecordHash, ...row }) =>
            claimAssuranceTaxonomyRecordHash === hashGovernedObject(row) &&
            row.status === "disabled" &&
            row.requiresOperatorReview &&
            row.allowedSurfaceKeys.length === 0 &&
            row.allowedPurposeBindings.every(
              (binding) =>
                activePurposeCodes.has(binding.purposeCode) &&
                binding.purposePolicyVersion === BACKGROUND_PURPOSE_POLICY_VERSION,
            ) &&
            row.evidenceRequirementCodes.length > 0 &&
            row.relianceLimitCodes.length > 0 &&
            row.prohibitedUses.includes("ranking_boost"),
        ),
      `${manifest.claimAssuranceTaxonomyVersion}:${manifest.claimAssuranceTaxonomyHash}`,
    ),
    check(
      "composition-and-transition-bundles-hash-valid",
      "Policy composition and artifact-transition bundles are content-addressed and non-resurrecting",
      manifest.policyCompositionBundleHash ===
        hashGovernedObject({
          rows: POLICY_COMPOSITION_RULE_ROWS
            .map((row) => ({ ...row }))
            .sort((left, right) => left.ruleCode.localeCompare(right.ruleCode)),
          version: BACKGROUND_POLICY_COMPOSITION_BUNDLE_VERSION,
        }) &&
        manifest.artifactTransitionPolicyBundleHash ===
          hashGovernedObject({
            rows: ARTIFACT_TRANSITION_POLICY_ROWS
              .map((row) => ({ ...row }))
              .sort((left, right) =>
                `${left.artifactKind}:${left.toState}`.localeCompare(
                  `${right.artifactKind}:${right.toState}`,
                ),
              ),
            version: BACKGROUND_ARTIFACT_TRANSITION_POLICY_BUNDLE_VERSION,
          }) &&
        POLICY_COMPOSITION_RULE_ROWS.every(
          (row) =>
            row.compositionMode === "deny_overrides" &&
            row.conflictBehavior === "fail_closed",
        ) &&
        ARTIFACT_TRANSITION_POLICY_ROWS.every(
          (row) => !["stale", "expired", "redacted", "anonymized", "deleted"].includes(row.toState),
        ),
      `${manifest.policyCompositionBundleVersion}:${manifest.artifactTransitionPolicyBundleVersion}`,
    ),
  ];
  const blockers = checks
    .filter((entry) => entry.status === "fail")
    .map((entry) => `${entry.id}: ${entry.label}`);

  return {
    blockers,
    checks,
    manifestId: manifest.id,
    status: blockers.length ? "fail" : "pass",
    validatorName: "background-phase-gates",
    validatorVersion: BACKGROUND_PHASE_GATE_VALIDATOR_VERSION,
  };
}

function denyDecision({
  actionKind,
  actorRole,
  genericUnavailableCode,
  idempotencyKey = null,
  laneKey,
  outputSchemaVersion,
  reasonClasses,
  verdict = "deny",
}: {
  actionKind: string;
  actorRole: BackgroundActorRole;
  genericUnavailableCode: string;
  idempotencyKey?: string | null;
  laneKey: string;
  outputSchemaVersion: string | null;
  reasonClasses: string[];
  verdict?: Exclude<BackgroundPolicyVerdict, "allow">;
}): BackgroundPolicyDecision {
  return buildPolicyDecision({
    actionKind,
    actorRole,
    genericUnavailableCode,
    idempotencyKey,
    laneKey,
    outputSchemaVersion,
    reasonClasses,
    sideEffectsAllowed: false,
    verdict,
  });
}

function buildPolicyDecision({
  actionKind,
  actorRole,
  genericUnavailableCode,
  idempotencyKey,
  laneKey,
  outputSchemaVersion,
  reasonClasses,
  sideEffectsAllowed,
  verdict,
}: {
  actionKind: string;
  actorRole: BackgroundActorRole;
  genericUnavailableCode: string;
  idempotencyKey: string | null | undefined;
  laneKey: string;
  outputSchemaVersion: string | null;
  reasonClasses: string[];
  sideEffectsAllowed: boolean;
  verdict: BackgroundPolicyVerdict;
}): BackgroundPolicyDecision {
  const manifest = getActiveBackgroundReleaseManifest();
  const decisionPayload = {
    actionKind,
    actorRole,
    artifactTransitionPolicyBundleHash: manifest.artifactTransitionPolicyBundleHash,
    claimAssuranceTaxonomyHash: manifest.claimAssuranceTaxonomyHash,
    idempotencyKey: idempotencyKey ?? null,
    laneKey,
    manifestId: manifest.id,
    outputSchemaBundleHash: manifest.outputSchemaBundleHash,
    outputSchemaVersion,
    phase: manifest.backgroundNetworkingPhase,
    phaseGateBundleHash: manifest.phaseGateBundleHash,
    policyActionKindRegistryHash: manifest.policyActionKindRegistryHash,
    policyCompositionBundleHash: manifest.policyCompositionBundleHash,
    publicPageSimplificationSpecHash: manifest.publicPageSimplificationSpecHash,
    retentionPolicyBundleHash: manifest.retentionPolicyBundleHash,
    signalTaxonomyHash: manifest.signalTaxonomyHash,
    toolCapabilityBundleHash: manifest.toolCapabilityBundleHash,
    uiCopyBundleHash: manifest.uiCopyBundleHash,
    reasonClasses,
    verdict,
  };

  return {
    actionKind,
    actorRole,
    artifactTransitionPolicyBundleHash: manifest.artifactTransitionPolicyBundleHash,
    claimAssuranceTaxonomyHash: manifest.claimAssuranceTaxonomyHash,
    expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    genericUnavailableCode,
    idempotencyKey: idempotencyKey ?? null,
    laneKey,
    manifestId: manifest.id,
    outputSchemaVersion,
    phase: manifest.backgroundNetworkingPhase,
    phaseGateBundleHash: manifest.phaseGateBundleHash,
    policyActionKindRegistryHash: manifest.policyActionKindRegistryHash,
    policyCompositionBundleHash: manifest.policyCompositionBundleHash,
    publicPageSimplificationSpecHash: manifest.publicPageSimplificationSpecHash,
    policyDecisionId: `bgpd_${hashGovernedObject(decisionPayload).slice(0, 32)}`,
    policyEngineVersion: manifest.policyEngineVersion,
    reasonClasses,
    retentionPolicyBundleHash: manifest.retentionPolicyBundleHash,
    sideEffectsAllowed,
    signalTaxonomyHash: manifest.signalTaxonomyHash,
    toolCapabilityBundleHash: manifest.toolCapabilityBundleHash,
    uiCopyBundleHash: manifest.uiCopyBundleHash,
    verdict,
  };
}

export function evaluateBackgroundPolicyDecision({
  actionKind,
  actorRole,
  controlStates = {},
  featureFlags = {},
  idempotencyKey,
  laneKey,
  outputSchemaVersion,
  purposeCode,
  purposePolicyVersion,
}: BackgroundPolicyDecisionInput): BackgroundPolicyDecision {
  const bundleValidation = validateBackgroundPhaseGateBundle();

  if (bundleValidation.status === "fail") {
    return denyDecision({
      actionKind,
      actorRole,
      genericUnavailableCode: "background_release_manifest_invalid",
      idempotencyKey,
      laneKey,
      outputSchemaVersion: outputSchemaVersion ?? null,
      reasonClasses: ["release_manifest_invalid"],
      verdict: "stale",
    });
  }

  const lane = getBackgroundPhaseLane(laneKey);

  if (!lane) {
    return denyDecision({
      actionKind,
      actorRole,
      genericUnavailableCode: "background_lane_unregistered",
      idempotencyKey,
      laneKey,
      outputSchemaVersion: outputSchemaVersion ?? null,
      reasonClasses: ["unregistered_lane"],
    });
  }

  const action = getBackgroundActionKind(actionKind);

  if (!action) {
    return denyDecision({
      actionKind,
      actorRole,
      genericUnavailableCode: lane.genericUnavailableCode,
      idempotencyKey,
      laneKey,
      outputSchemaVersion: outputSchemaVersion ?? null,
      reasonClasses: ["unregistered_action_kind"],
    });
  }

  const reasonClasses: string[] = [];

  if (action.laneKey !== lane.laneKey) {
    reasonClasses.push("wrong_lane_for_action");
  }

  if (!lane.allowedActionKinds.includes(action.actionKind)) {
    reasonClasses.push("action_kind_not_allowed_for_lane");
  }

  if (!action.actorRoles.includes(actorRole)) {
    reasonClasses.push("actor_role_not_allowed");
  }

  if (action.idempotencyRequired && !idempotencyKey) {
    reasonClasses.push("idempotency_key_required");
  }

  if (
    controlStates.privacyFreezeActive &&
    action.actionKind !== "background.privacy_freeze.release" &&
    action.actionKind !== "background.privacy_freeze.activate"
  ) {
    reasonClasses.push("privacy_freeze_active");
  }

  if (controlStates.accountSecurityHoldActive && action.stepUpRequired) {
    reasonClasses.push("account_security_hold_active");
  }

  if (controlStates.emergencyStopActive) {
    reasonClasses.push("emergency_stop_active");
  }

  if (controlStates.retentionHoldActive && action.sideEffectClass !== "none") {
    reasonClasses.push("retention_hold_active");
  }

  if (controlStates.tripwirePauseActive) {
    reasonClasses.push("runtime_tripwire_pause_active");
  }

  if (outputSchemaVersion && outputSchemaVersion !== action.outputSchemaVersion) {
    reasonClasses.push("wrong_output_schema_version");
  }

  if (
    purposePolicyVersion &&
    purposePolicyVersion !== BACKGROUND_PURPOSE_POLICY_VERSION
  ) {
    reasonClasses.push("purpose_policy_version_mismatch");
  }

  if (!purposeCode && action.actionKind === "background.helper_run.enqueue") {
    reasonClasses.push("purpose_binding_required");
  }

  for (const [flagKey, requiredValue] of Object.entries(lane.requiredFeatureFlagStates)) {
    if (featureFlags[flagKey] !== requiredValue) {
      reasonClasses.push("feature_flag_conflict");
      break;
    }
  }

  if (lane.laneState === "disabled_stub" || lane.laneState === "blocked") {
    reasonClasses.push("disabled_phase_lane");
  } else if (
    lane.laneState === "staff_only" &&
    !["operator", "admin", "system"].includes(actorRole)
  ) {
    reasonClasses.push("staff_only_lane");
  } else if (lane.laneState === "shadow_only" && action.sideEffectClass !== "none") {
    reasonClasses.push("shadow_lane_no_side_effects");
  }

  if (reasonClasses.length) {
    return buildPolicyDecision({
      actionKind,
      actorRole,
      genericUnavailableCode: lane.genericUnavailableCode,
      idempotencyKey,
      laneKey,
      outputSchemaVersion: outputSchemaVersion ?? action.outputSchemaVersion,
      reasonClasses: [...new Set(reasonClasses)],
      sideEffectsAllowed: false,
      verdict: lane.laneState === "disabled_stub" ? "deny" : "stale",
    });
  }

  return buildPolicyDecision({
    actionKind,
    actorRole,
    genericUnavailableCode: lane.genericUnavailableCode,
    idempotencyKey,
    laneKey,
    outputSchemaVersion: outputSchemaVersion ?? action.outputSchemaVersion,
    reasonClasses: ["all_governed_phase_gates_passed"],
    sideEffectsAllowed: action.sideEffectClass !== "none",
    verdict: "allow",
  });
}

export function serializeBackgroundPolicyDecisionForResponse(
  decision: BackgroundPolicyDecision,
) {
  return {
    actionKind: decision.actionKind,
    laneKey: decision.laneKey,
    manifestId: decision.manifestId,
    phase: decision.phase,
    phaseGateBundleHash: decision.phaseGateBundleHash,
    policyDecisionId: decision.policyDecisionId,
    reasonClasses: decision.reasonClasses,
    publicPageSimplificationSpecHash: decision.publicPageSimplificationSpecHash,
    uiCopyBundleHash: decision.uiCopyBundleHash,
    verdict: decision.verdict,
  };
}

export function buildBackgroundDisabledLaneResponse(decision: BackgroundPolicyDecision) {
  return {
    code: decision.genericUnavailableCode,
    disclosureGrantCreated: false,
    exportCreated: false,
    introRequestCreated: false,
    notificationSent: false,
    opportunityBriefCreated: false,
    partnerOrFederationCalled: false,
    policyDecision: serializeBackgroundPolicyDecisionForResponse(decision),
    queueMutation: false,
    state: decision.verdict === "stale" ? "stale" : "unavailable",
    stateMutation: "none",
    telemetryEmitted: false,
  };
}

export function getBackgroundPhaseStatusForDocs() {
  const bundle = getBackgroundPhaseGateBundle();
  const manifest = getActiveBackgroundReleaseManifest();
  const enabledLanes = bundle.lanes
    .filter((lane) => lane.laneState === "enabled")
    .map((lane) => lane.laneKey);
  const disabledLanes = bundle.lanes
    .filter((lane) => lane.laneState === "disabled_stub" || lane.laneState === "blocked")
    .map((lane) => lane.laneKey);

  return {
    currentPhase: BACKGROUND_CURRENT_PHASE,
    claimAssuranceTaxonomyVersion: manifest.claimAssuranceTaxonomyVersion,
    disabledLanes,
    enabledLanes,
    manifestId: manifest.id,
    outputSchemaBundleVersion: manifest.outputSchemaBundleVersion,
    phaseGateBundleHash: bundle.bundleHash,
    phaseGateBundleVersion: bundle.bundleVersion,
    policyEngineVersion: manifest.policyEngineVersion,
    publicPageSimplificationSpecVersion: manifest.publicPageSimplificationSpecVersion,
    retentionPolicyBundleVersion: manifest.retentionPolicyBundleVersion,
    signalTaxonomyVersion: manifest.signalTaxonomyVersion,
    toolCapabilityBundleVersion: manifest.toolCapabilityBundleVersion,
    uiCopyBundleVersion: manifest.uiCopyBundleVersion,
  };
}
