import operationsProfileJson from "../../../config/moral-trade/operations-profile.json";

export const MORAL_TRADE_OPERATIONS_VALIDATOR_VERSION =
  "moral-trade-operations-validator-v0.2";

type OperationsEntry = {
  key?: string;
  code?: string;
  label: string;
  evidence?: string;
  rule?: string;
};

type RateLimitSurface = {
  key: string;
  window: string;
  limit: number;
};

type RetentionControl = {
  key: string;
  label: string;
  scope: string;
  retentionWindow: string;
  evidence: string;
};

type MoralTradeOperationsProfile = {
  version: string;
  purpose: string;
  securityHeaders: Array<Required<Pick<OperationsEntry, "code" | "label" | "evidence">>>;
  rateLimitSurfaces: RateLimitSurface[];
  privacyAndSessionControls: Array<Required<Pick<OperationsEntry, "key" | "label" | "evidence">>>;
  retentionControls: RetentionControl[];
  observabilityMetrics: string[];
  fallbackControls: Array<Required<Pick<OperationsEntry, "key" | "label" | "rule">>>;
  rolloutGates: Array<Required<Pick<OperationsEntry, "key" | "label" | "rule">>>;
  operationalTests: string[];
};

export interface MoralTradeOperationsCheck {
  id: string;
  label: string;
  status: "pass" | "fail";
  evidence: string;
}

export interface MoralTradeOperationsValidation {
  status: "pass" | "fail";
  validatorName: "moral-trade-operations-profile";
  validatorVersion: string;
  profileVersion: string;
  checks: MoralTradeOperationsCheck[];
  blockers: string[];
}

export type MoralTradeFallbackTrigger =
  | "copilot_invalid_output"
  | "copilot_timeout"
  | "provider_timeout"
  | "provider_error"
  | "state_transition_replay";

export type MoralTradeStateChangeSurface =
  | "publish"
  | "match"
  | "disclose"
  | "complete"
  | "status_change"
  | "none";

export interface MoralTradeFallbackDecisionInput {
  trigger: MoralTradeFallbackTrigger;
  proposedStateChange?: MoralTradeStateChangeSurface;
  deterministicValidationAvailable?: boolean;
  manualReviewAvailable?: boolean;
  replay?: {
    idempotencyKey?: string | null;
    requestHash?: string | null;
    previousRequestHash?: string | null;
    previousOutcome?: "accepted" | "blocked" | "pending" | null;
  };
}

export interface MoralTradeFallbackDecision {
  status: "pass" | "fail";
  decision: "block_state_change" | "manual_review" | "reuse_prior_outcome";
  liveStateChangeAllowed: boolean;
  fallbackMode: "deterministic_manual_review" | "idempotent_replay";
  auditCodes: string[];
  blockers: string[];
}

const operationsProfile = operationsProfileJson as MoralTradeOperationsProfile;

export const MORAL_TRADE_RESILIENCE_FALLBACK_TESTS = [
  "invalid_copilot_output_no_state_change",
  "copilot_timeout_manual_fallback",
  "provider_timeout_no_state_change",
  "state_transition_replay_idempotency",
] as const;

const REQUIRED_SECURITY_HEADERS = [
  "strict_transport_security",
  "x_content_type_options",
  "x_frame_options",
  "referrer_policy",
  "permissions_policy",
  "csp_report_only",
  "private_no_store",
] as const;

const REQUIRED_RATE_LIMITS = [
  "public_contract_read",
  "signup",
  "login",
  "offer_create",
  "privacy_access_request",
  "match_concierge_request",
  "offer_comment",
  "offer_collection_read",
  "offer_detail_read",
  "offer_facets_read",
  "offer_follow_write",
  "offer_create_similar",
  "saved_search_write",
  "copilot_draft_review",
  "match_signal_evaluate",
  "matching_clearing_execute",
  "clearing_preview_execute",
  "release_gate_enforce",
  "baseline_integrity_enforce",
  "agreement_amendment_enforce",
  "side_agreement_enforce",
  "trade_classification_enforce",
  "template_conformance_enforce",
  "review_capacity_enforce",
  "participant_term_sheet_enforce",
  "participant_confirmation_enforce",
  "participant_eligibility_enforce",
  "account_security_enforce",
  "reviewer_quality_enforce",
  "protective_assessment_enforce",
  "user_safety_content_moderation_enforce",
  "financial_settlement_controls_enforce",
  "recipient_acceptance_enforce",
  "ai_preference_elicitation_enforce",
  "post_clear_audit_enforce",
  "non_public_goods_subsidy_enforce",
  "direct_pair_clearing_enforce",
  "cause_bucket_taxonomy_enforce",
  "resource_compatibility_enforce",
  "net_offset_accounting_enforce",
  "offer_validity_enforce",
  "private_exchange_rate_enforce",
  "noncompensable_blocker_enforce",
  "batch_clearing_objective_enforce",
  "sensitive_evidence_attestation_enforce",
  "pilot_evidence_enforce",
  "challenge_appeal_evaluate",
  "challenge_appeal_enforce",
  "disclosure_evaluate",
  "review_workflow_evaluate",
  "profile_portability",
  "background_opportunity_brief_read",
  "background_opportunity_feedback_write",
  "background_helper_run_write",
  "background_wish_interview_write",
  "background_source_summary_write",
  "background_intro_packet_write",
  "background_private_overlap_check",
  "wish_registry_search",
  "analytics_ingest",
] as const;

const REQUIRED_PRIVACY_CONTROLS = [
  "supabase_auth_cookies",
  "private_route_cache_control",
  "data_right_requests",
  "field_level_disclosure_grants",
  "email_outbox_safety_gate",
  "audit_events",
] as const;

const REQUIRED_RETENTION_CONTROLS = [
  "account_profile_lifecycle",
  "private_wish_source_lifecycle",
  "evidence_provenance_lifecycle",
  "payment_donation_reference_lifecycle",
  "analytics_attribution_lifecycle",
  "notification_delivery_lifecycle",
  "data_right_request_lifecycle",
] as const;

const REQUIRED_OBSERVABILITY_METRICS = [
  "funnel_event_counts",
  "route_error_rate",
  "api_latency_p95",
  "web_vitals",
  "email_outbox_suppression_count",
  "privacy_incident_count",
  "copilot_fallback_rate",
  "evidence_review_sla",
] as const;

const REQUIRED_FALLBACK_CONTROLS = [
  "deterministic_manual_fallback",
  "invalid_copilot_output_no_state_change",
  "provider_timeout_no_state_change",
  "unsafe_email_no_provider_send",
  "replay_safe_state_transitions",
] as const;

const REQUIRED_ROLLOUT_GATES = [
  "shadow_mode",
  "assist_mode",
  "guarded_automation",
  "human_controlled_safety",
] as const;

function hasAll(values: readonly string[], required: readonly string[]) {
  return required.every((entry) => values.includes(entry));
}

function check(
  id: string,
  label: string,
  passed: boolean,
  evidence: string,
): MoralTradeOperationsCheck {
  return {
    id,
    label,
    status: passed ? "pass" : "fail",
    evidence,
  };
}

export function getMoralTradeOperationsProfile() {
  return operationsProfile;
}

function isAutomationFailureTrigger(trigger: MoralTradeFallbackTrigger) {
  return (
    trigger === "copilot_invalid_output" ||
    trigger === "copilot_timeout" ||
    trigger === "provider_timeout" ||
    trigger === "provider_error"
  );
}

export function decideMoralTradeFallback(
  input: MoralTradeFallbackDecisionInput,
): MoralTradeFallbackDecision {
  const blockers: string[] = [];
  const auditCodes: string[] = [input.trigger];
  const proposedStateChange = input.proposedStateChange ?? "none";

  if (isAutomationFailureTrigger(input.trigger)) {
    auditCodes.push("deterministic_manual_fallback");

    if (input.deterministicValidationAvailable === false) {
      blockers.push("fallback_path_unavailable");
      blockers.push("deterministic_validation_unavailable");
    }

    if (input.manualReviewAvailable === false) {
      blockers.push("fallback_path_unavailable");
      blockers.push("manual_review_unavailable");
    }

    if (proposedStateChange !== "none") {
      auditCodes.push("no_live_state_change");
      auditCodes.push(`${proposedStateChange}_state_change_blocked`);
    }

    return {
      status: blockers.length ? "fail" : "pass",
      decision: blockers.length ? "block_state_change" : "manual_review",
      liveStateChangeAllowed: false,
      fallbackMode: "deterministic_manual_review",
      auditCodes,
      blockers: Array.from(new Set(blockers)),
    };
  }

  if (input.trigger === "state_transition_replay") {
    auditCodes.push("replay_safe_state_transitions");

    if (!input.replay?.idempotencyKey) {
      blockers.push("replay_identity_missing");
      blockers.push("missing_idempotency_key");
    }

    if (!input.replay?.requestHash) {
      blockers.push("replay_identity_missing");
      blockers.push("missing_request_hash");
    }

    if (!input.replay?.previousRequestHash) {
      blockers.push("replay_identity_missing");
      blockers.push("missing_previous_request_hash");
    }

    if (!input.replay?.previousOutcome) {
      blockers.push("replay_prior_outcome_missing");
    }

    if (
      input.replay?.requestHash &&
      input.replay.previousRequestHash &&
      input.replay.requestHash !== input.replay.previousRequestHash
    ) {
      blockers.push("replay_hash_mismatch");
      blockers.push("idempotency_key_reused_for_different_request");
    }

    return {
      status: blockers.length ? "fail" : "pass",
      decision: blockers.length ? "block_state_change" : "reuse_prior_outcome",
      liveStateChangeAllowed: false,
      fallbackMode: "idempotent_replay",
      auditCodes,
      blockers: Array.from(new Set(blockers)),
    };
  }

  const exhaustiveTrigger: never = input.trigger;
  throw new Error(`Unsupported Moral Trade fallback trigger: ${exhaustiveTrigger}`);
}

export function evaluateMoralTradeFallbackDecision(
  input: MoralTradeFallbackDecisionInput,
): MoralTradeFallbackDecision {
  return decideMoralTradeFallback(input);
}

export function validateMoralTradeOperationsProfile(
  profile: MoralTradeOperationsProfile = operationsProfile,
): MoralTradeOperationsValidation {
  const securityHeaderCodes = profile.securityHeaders.map((header) => header.code);
  const rateLimitKeys = profile.rateLimitSurfaces.map((surface) => surface.key);
  const privacyKeys = profile.privacyAndSessionControls.map((control) => control.key);
  const retentionKeys = profile.retentionControls.map((control) => control.key);
  const fallbackKeys = profile.fallbackControls.map((control) => control.key);
  const rolloutKeys = profile.rolloutGates.map((gate) => gate.key);
  const checks = [
    check(
      "security-headers",
      "Security headers and private cache controls",
      hasAll(securityHeaderCodes, REQUIRED_SECURITY_HEADERS),
      securityHeaderCodes.join(", "),
    ),
    check(
      "rate-limit-surfaces",
      "Core rate-limit surfaces",
      hasAll(rateLimitKeys, REQUIRED_RATE_LIMITS) &&
        profile.rateLimitSurfaces.every((surface) => surface.limit > 0),
      rateLimitKeys.join(", "),
    ),
    check(
      "privacy-session-controls",
      "Privacy and session controls",
      hasAll(privacyKeys, REQUIRED_PRIVACY_CONTROLS),
      privacyKeys.join(", "),
    ),
    check(
      "retention-lifecycle-controls",
      "Retention lifecycle controls",
      hasAll(retentionKeys, REQUIRED_RETENTION_CONTROLS) &&
        profile.retentionControls.every((control) =>
          /retain|kept|keep|storage|excluded|private|append/i.test(
            `${control.retentionWindow} ${control.evidence}`,
          ),
        ),
      retentionKeys.join(", "),
    ),
    check(
      "observability-metrics",
      "Operational metrics",
      hasAll(profile.observabilityMetrics, REQUIRED_OBSERVABILITY_METRICS),
      profile.observabilityMetrics.join(", "),
    ),
    check(
      "fallback-controls",
      "Safe fallback controls",
      hasAll(fallbackKeys, REQUIRED_FALLBACK_CONTROLS),
      fallbackKeys.join(", "),
    ),
    check(
      "rollout-gates",
      "Rollout gates",
      hasAll(rolloutKeys, REQUIRED_ROLLOUT_GATES),
      rolloutKeys.join(", "),
    ),
    check(
      "operational-tests",
      "Operational test hooks",
      profile.operationalTests.includes("security_header_source_smoke") &&
        profile.operationalTests.includes("production_build") &&
        profile.operationalTests.includes("email_outbox_safety_gate_smoke") &&
        profile.operationalTests.includes("resilience_fallback_audit") &&
        profile.operationalTests.includes("health_route_contract_smoke"),
      profile.operationalTests.join(", "),
    ),
  ];
  const blockers = checks
    .filter((entry) => entry.status === "fail")
    .map((entry) => `${entry.id}: ${entry.label}`);

  return {
    status: blockers.length ? "fail" : "pass",
    validatorName: "moral-trade-operations-profile",
    validatorVersion: MORAL_TRADE_OPERATIONS_VALIDATOR_VERSION,
    profileVersion: profile.version,
    checks,
    blockers,
  };
}
