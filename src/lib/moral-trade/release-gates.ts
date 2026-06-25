export const MORAL_TRADE_RELEASE_GATE_CONTRACT_VERSION =
  "moral-trade-release-gates-v0.2-2026-06";
export const MORAL_TRADE_RELEASE_GATE_VALIDATOR_VERSION =
  "moral-trade-release-gate-validator-v0.1";

export type MoralTradeReleaseStage =
  | "public_goods_preview"
  | "donation_offset_payable"
  | "pledge_swap_reliance_manual_pilot"
  | "capped_real_money_release"
  | "public_metric_release";

export type MoralTradeReleaseGateRequirementStatus =
  | "passed"
  | "not_required_for_stage"
  | "waived_by_neutral_review"
  | "failed"
  | "missing"
  | "stale"
  | "unknown"
  | "under_review";

export type MoralTradePolicySnapshotStatus =
  | "resolved_immutable"
  | "missing"
  | "mutable"
  | "stale"
  | "superseded";

export type MoralTradePrivilegedActionStatus =
  | "not_required"
  | "dual_control_approved"
  | "neutral_review_approved"
  | "missing"
  | "rejected"
  | "stale";

export type MoralTradeReleaseGateEvaluationStatus = "pass" | "blocked";

export interface MoralTradeReleaseStageContract {
  key: MoralTradeReleaseStage;
  label: string;
  featureFlagKey: string;
  payable: boolean;
  relianceBearing: boolean;
  publicMetricsMayPublish: boolean;
  requiredRequirementKeys: string[];
  inactiveRequirementKeys: string[];
  hardBlockerSummary: string;
}

export interface MoralTradeReleaseGateRequirementDefinition {
  key: string;
  label: string;
  category:
    | "calculation"
    | "health"
    | "privacy"
    | "safety"
    | "payment"
    | "evidence"
    | "review"
    | "operations"
    | "policy"
    | "participant"
    | "recipient"
    | "audit"
    | "metrics";
  policySnapshotRequired: boolean;
  privilegedActionRequired: boolean;
  description: string;
}

export interface MoralTradeReleaseGateRequirementResult {
  key: string;
  status: MoralTradeReleaseGateRequirementStatus;
  evidenceRef: string;
  policySnapshotStatus: MoralTradePolicySnapshotStatus;
  privilegedActionStatus: MoralTradePrivilegedActionStatus;
  recordedAt: string;
}

export interface MoralTradeReleaseGateEvaluationInput {
  stage: MoralTradeReleaseStage;
  gateId: string;
  policySnapshotBundleStatus: MoralTradePolicySnapshotStatus;
  stateInterpretationPolicyStatus: MoralTradePolicySnapshotStatus;
  featureFlagEnabled: boolean;
  emergencyPaused: boolean;
  results: MoralTradeReleaseGateRequirementResult[];
}

export interface MoralTradeReleaseGateEvaluation {
  status: MoralTradeReleaseGateEvaluationStatus;
  stage: MoralTradeReleaseStage;
  gateId: string;
  payable: boolean;
  relianceBearing: boolean;
  publicMetricsMayPublish: boolean;
  requiredRequirementCount: number;
  inactiveRequirementCount: number;
  passedRequirementCount: number;
  notRequiredRequirementCount: number;
  waivedRequirementCount: number;
  blockers: string[];
  checkedAt: string;
}

export interface MoralTradeReleaseGateCheck {
  id: string;
  label: string;
  status: "pass" | "fail";
  evidence: string;
}

export interface MoralTradeReleaseGateValidation {
  status: "pass" | "fail";
  validatorName: "moral-trade-release-gate-contract";
  validatorVersion: string;
  contractVersion: string;
  checks: MoralTradeReleaseGateCheck[];
  blockers: string[];
}

export interface MoralTradeReleaseGateContract {
  version: string;
  purpose: string;
  stateInterpretationRule: string;
  policySnapshotRule: string;
  firstClassRecordTables: string[];
  immutablePolicySnapshotSubjects: string[];
  privilegedActionKeys: string[];
  stages: MoralTradeReleaseStageContract[];
  requirementDefinitions: MoralTradeReleaseGateRequirementDefinition[];
  sampleEvaluations: MoralTradeReleaseGateEvaluation[];
  contractTests: string[];
}

const CONTRACT_TESTS = [
  "release_gate_contract_validator",
  "release_gate_missing_results_fail_closed",
  "release_gate_stale_unknown_states_block",
  "release_gate_waivers_require_neutral_review",
  "release_gate_inactive_controls_require_not_required_policy_snapshot",
  "release_gate_api_route_contract",
] as const;

const FIRST_CLASS_RECORD_TABLES = [
  "moral_trade_policy_snapshots",
  "moral_trade_state_interpretation_policies",
  "moral_trade_release_gates",
  "moral_trade_release_gate_requirement_results",
  "moral_trade_privileged_action_records",
  "moral_trade_participant_confirmation_records",
  "moral_trade_consent_quality_records",
] as const;

const POLICY_SNAPSHOT_SUBJECTS = [
  "release_gate",
  "state_interpretation",
  "payment_capture",
  "payout_release",
  "refund_cancellation",
  "provider_source_authentication",
  "time_authority",
  "notification",
  "fx",
  "platform_fee",
  "public_metrics",
  "data_retention",
  "participant_eligibility",
  "recipient_destination_verification",
  "account_security",
  "backup_recovery",
  "deployment_release",
  "configuration_snapshot",
  "schema_migration",
  "environment_data_isolation",
  "financial_reconciliation",
  "audit_integrity",
  "data_security",
  "noncompensable_blocker",
  "batch_clearing_objective",
  "sensitive_evidence_attestation",
  "pilot_evidence",
] as const;

const PRIVILEGED_ACTION_KEYS = [
  "release_gate_approval",
  "policy_snapshot_approval",
  "recipient_destination_verification",
  "private_data_access_grant",
  "impact_claim_publication",
  "blocker_override",
  "manual_capture",
  "manual_payout_release",
  "emergency_unpause",
  "nonroutine_refund_cancellation",
] as const;

export const MORALTRADE82_RELEASE_GATE_REQUIREMENT_KEYS = [
  "dry_run_calculation_bundle",
  "route_health_baseline",
  "privacy_review",
  "anti_threat_review",
  "payment_replay_tests",
  "evidence_challenge_tests",
  "reviewer_conflict_tests",
  "emergency_pause_test",
  "neutral_reviewer_approval",
  "deployment_config_snapshot",
  "schema_migration_dry_run",
  "rollback_plan_test",
  "environment_data_isolation_check",
  "donation_offset_lock_confirmation_test",
  "non_public_goods_term_sheet_test",
  "marketplace_intake_triage_routing_test",
  "participant_ui_ux_progressive_disclosure_test",
  "participant_ui_render_snapshot_accessibility_test",
  "plain_language_copy_contract_test",
  "participant_task_card_simplification_test",
  "safe_template_default_disclosure_test",
  "public_moral_trade_page_simplification_test",
  "offset_creation_route_happy_path_test",
  "worked_example_card_simplification_test",
  "technical_detail_progressive_disclosure_test",
  "counterparty_blinding_staged_disclosure_test",
  "recipient_acceptance_association_test",
  "ai_preference_elicitation_boundary_test",
  "post_clear_audit_sampling_test",
  "public_receipt_card_publication_test",
  "public_receipt_causal_wording_and_reuse_test",
  "public_receipt_net_personal_contribution_test",
  "public_receipt_anti_gamification_test",
  "public_receipt_authenticity_revocation_test",
  "public_receipt_social_pressure_sensitive_action_test",
  "approved_trade_template_parameter_test",
  "review_capacity_admission_queue_test",
  "non_public_goods_subsidy_schedule_test",
  "direct_pair_clearing_test",
  "cause_bucket_taxonomy_review_test",
  "resource_compatibility_assessment_test",
  "net_offset_accounting_test",
  "pledge_swap_performance_terms_test",
  "behavioral_micro_pledge_duration_test",
  "behavioral_micro_pledge_evidence_ladder_test",
  "behavioral_micro_pledge_unit_baseline_test",
  "micro_pledge_sequence_cumulative_cap_test",
  "food_abstention_health_safety_boundary_test",
  "behavioral_micro_pledge_low_stakes_cap_test",
  "micro_pledge_unit_settlement_test",
  "micro_pledge_preperformance_lock_test",
  "commitment_inventory_double_count_test",
  "atomic_settlement_group_test",
  "pledge_swap_synchronized_performance_test",
  "compensated_moral_action_terms_test",
  "negative_commitment_substitution_test",
  "irreversible_action_gate_test",
  "donor_of_record_tax_receipt_test",
  "third_party_obligation_assessment_test",
  "baseline_integrity_manufacturing_test",
  "compensated_action_classification_test",
  "agreement_amendment_confirmation_test",
  "anti_corruption_improper_inducement_test",
  "representative_authority_verification_test",
  "protected_reporting_non_suppression_test",
  "civil_rights_discrimination_test",
  "participant_autonomy_undue_influence_test",
  "confidentiality_privacy_rights_test",
  "evidence_authenticity_synthetic_media_test",
  "financial_crime_fraud_screening_test",
  "agreement_non_transferability_test",
  "regulated_goods_hazardous_activity_test",
  "cyber_abuse_digital_systems_integrity_test",
  "noncompensable_safety_blocker_test",
  "offer_expiry_staleness_test",
  "batch_clearing_objective_fairness_test",
  "privacy_preserving_verification_attestation_test",
  "non_public_goods_tier_scope_test",
  "counterfactual_trust_class_test",
  "closed_counterparty_pledge_swap_test",
  "control_applicability_matrix_test",
  "private_exchange_rate_quote_test",
  "market_simulation_red_team_test",
  "pilot_exit_criteria_test",
  "option_set_pareto_comparison_test",
  "preference_incomparability_noncardinal_test",
  "trade_burden_accounting_test",
  "moral_difference_attestation_test",
  "bargaining_protocol_anti_holdup_test",
  "empirical_assumption_snapshot_test",
  "moral_side_constraint_agent_relative_test",
  "intrapersonal_self_offset_classification_test",
  "pledge_performance_bond_neutral_forfeiture_test",
] as const;

export const MORALTRADE68_RELEASE_GATE_REQUIREMENT_KEYS =
  MORALTRADE82_RELEASE_GATE_REQUIREMENT_KEYS;

type Moraltrade82ReleaseGateRequirementKey =
  (typeof MORALTRADE82_RELEASE_GATE_REQUIREMENT_KEYS)[number];

const MORALTRADE82_RELEASE_GATE_REQUIREMENT_KEY_SET = new Set<string>(
  MORALTRADE82_RELEASE_GATE_REQUIREMENT_KEYS,
);

function titleCaseRequirementKey(key: string) {
  return key
    .split("_")
    .map((part) => (part ? part[0]!.toUpperCase() + part.slice(1) : part))
    .join(" ");
}

function categoryForMoraltrade82Requirement(
  key: Moraltrade82ReleaseGateRequirementKey,
): MoralTradeReleaseGateRequirementDefinition["category"] {
  if (
    /payment|donor|settlement|fx|reconciliation|capture|payout|atomic|commitment_inventory/.test(
      key,
    )
  ) {
    return "payment";
  }

  if (/privacy|confidentiality|blinding|sensitive_evidence/.test(key)) {
    return "privacy";
  }

  if (/evidence|challenge|baseline|empirical|post_clear_audit/.test(key)) {
    return "evidence";
  }

  if (
    /participant|consent|term_sheet|autonomy|moral_difference|trade_burden|marketplace_intake|plain_language|task_card|offset_creation|worked_example|technical_detail|micro_pledge|pledge_preperformance/.test(
      key,
    )
  ) {
    return "participant";
  }

  if (/recipient|representative|direct_pair/.test(key)) {
    return "recipient";
  }

  if (/metric|net_offset|cause_bucket|classification|intrapersonal|public_receipt/.test(key)) {
    return "metrics";
  }

  if (
    /schema|deployment|rollback|environment|control_applicability|tier_scope|public_moral_trade_page/.test(
      key,
    )
  ) {
    return "operations";
  }

  if (/anti_|civil_rights|regulated|cyber|financial_crime|noncompensable|hazardous/.test(key)) {
    return "safety";
  }

  if (/calculation|objective|pareto|preference|bargaining|resource/.test(key)) {
    return "calculation";
  }

  if (/policy|template|subsidy|validity/.test(key)) {
    return "policy";
  }

  if (/review|approval|capacity/.test(key)) {
    return "review";
  }

  return "review";
}

function descriptionForMoraltrade82Requirement(key: Moraltrade82ReleaseGateRequirementKey) {
  switch (key) {
    case "dry_run_calculation_bundle":
      return "A deterministic dry-run calculation, input bundle hash, excluded-record list, and replay evidence exist before stage promotion.";
    case "route_health_baseline":
      return "Route health, public contract metadata, and baseline response shape are current for the requested release stage.";
    case "payment_replay_tests":
      return "Payment/provider replay, stale snapshot, wrong-account, idempotency, and server-time tests pass before money can move.";
    case "emergency_pause_test":
      return "Emergency pause blocks new authorizations and captures without deleting audit records or blocking required refunds.";
    case "neutral_reviewer_approval":
      return "Neutral reviewer or panel approval is first-class where a gate, waiver, rejection, dispute, or counterparty-benefiting decision requires it.";
    case "market_simulation_red_team_test":
      return "Donation-offset and pledge-swap pilots have reviewed market simulation, replay, red-team, participant-comprehension, and abuse-case evidence.";
    case "pilot_exit_criteria_test":
      return "Pilot promotion requires pre-registered scale-up, pause, rollback, and non-volume success criteria; matched volume alone is insufficient.";
    case "marketplace_intake_triage_routing_test":
      return "Marketplace intake routes ordinary donations, matching, services, self-offsets, external CRECM/public-goods work, background networking, and unsupported requests away from the non-public-goods lock path unless corrected and reviewed.";
    case "participant_ui_ux_progressive_disclosure_test":
      return "Participant UI separates intake, template gallery, guided builder, draft preview, review queue, matched-lock proposal, final confirmation, dashboard, and receipt publication into task-oriented progressive-disclosure surfaces.";
    case "participant_ui_render_snapshot_accessibility_test":
      return "Reliance-bearing or money-affecting participant screens produce hash-backed render snapshots with accessibility, visible-field, redaction, CTA, term-sheet, and maximum-exposure evidence.";
    case "plain_language_copy_contract_test":
      return "Participant copy maps control-plane states to one-sentence summaries, key facts, next actions, and optional details without using internal control codes as primary explanations.";
    case "participant_task_card_simplification_test":
      return "Participant task cards use one primary action, bounded key facts, stable term labels, and safe next steps instead of competing CTAs or validator walls.";
    case "safe_template_default_disclosure_test":
      return "Template defaults may simplify drafting only when every default affecting money, obligations, privacy, evidence, duration, failure handling, or publication is shown in preview and the term sheet.";
    case "public_moral_trade_page_simplification_test":
      return "Public Moral Trade pages keep safety concepts but collapse validator detail, internal enums, factor codes, and route diagnostics behind plain-language task surfaces.";
    case "offset_creation_route_happy_path_test":
      return "Signed-out donation-offset creation has a concrete draft/preview path and explains that sign-in is required before save, publication, review, disclosure, money authorization, or live-offer creation.";
    case "worked_example_card_simplification_test":
      return "Worked-example cards are lightweight teaching cards with status, trade type, terms, evidence, review state, and one primary action; technical proof detail stays in drawers or reviewer surfaces.";
    case "technical_detail_progressive_disclosure_test":
      return "Technical detail remains available through labelled details drawers or technical pages while primary public and participant copy stays plain-language and action-oriented.";
    case "public_receipt_card_publication_test":
      return "Completed non-public-goods trades can offer opt-in public receipt cards only after reconciliation, challenge, privacy-publication, recipient-association, content-moderation, and public-metric checks are non-blocking.";
    case "public_receipt_causal_wording_and_reuse_test":
      return "Receipt wording uses trade-conditioned by default; trade-unlocked, additional, matched, completed, verified, or impact claims require reviewed claim records and no reused personal contribution.";
    case "public_receipt_net_personal_contribution_test":
      return "Receipt cards separate gross transfer, verified net personal contribution, trade-conditioned or trade-unlocked contribution, subsidies, reimbursements, and total recipient transfer.";
    case "public_receipt_anti_gamification_test":
      return "Receipt publication cannot create likes, share counts, streaks, leaderboards, profile boosts, ranking, review priority, matching priority, or moral-status games.";
    case "public_receipt_authenticity_revocation_test":
      return "Public receipt cards resolve to a privacy-safe verification handle with issued-at time, current status, and correction, revocation, suppression, or supersession state.";
    case "public_receipt_social_pressure_sensitive_action_test":
      return "Receipt publication cannot be required as a trade term, and sensitive personal-behavior details require separate consent plus privacy, autonomy, user-safety, and content-moderation review.";
    case "behavioral_micro_pledge_duration_test":
      return "Food-abstention and similar behavioral pledge templates default to one meal, a few meals, one day, or a few days; longer variants are explicit manual-review exceptions or confirmed micro-pledge sequences.";
    case "behavioral_micro_pledge_evidence_ladder_test":
      return "Behavioral micro-pledge previews show self-attestation-first evidence, optional lightweight corroboration, escalation triggers, and privacy/effort costs before reliance.";
    case "behavioral_micro_pledge_unit_baseline_test":
      return "Each covered meal/day/few-day pledge records a unit-specific no-trade baseline, additionality review state, covered-food definition, and adequate-substitute plan before completion can count.";
    case "micro_pledge_sequence_cumulative_cap_test":
      return "Micro-pledge sequences enforce frozen rolling-window duration, payout, evidence-burden, and privacy-burden caps; exceeding caps requires renewed confirmation and manual review.";
    case "food_abstention_health_safety_boundary_test":
      return "Food-abstention templates block fasting, weight-loss, calorie restriction, medical-diet, body-image, eating-disorder, minor/dependency/coercion, and high-burden variants unless exact reviews are non-blocking.";
    case "behavioral_micro_pledge_low_stakes_cap_test":
      return "Behavioral micro-pledge previews freeze low-stakes per-unit caps, sequence-total caps, performance-bond caps, and personal-cash/manual-review handling.";
    case "micro_pledge_unit_settlement_test":
      return "Micro-pledge sequences disclose per-unit versus all-or-nothing settlement, failed-unit effect, evidence checkpoints, renewed confirmations, and release/cancellation behavior before final confirmation.";
    case "micro_pledge_preperformance_lock_test":
      return "Behavioral micro-pledges require server-time pre-performance locks before the covered window; retroactive claims route to bookkeeping or manual review rather than completed moral-trade status.";
    default:
      return `${titleCaseRequirementKey(key)} must resolve to a current first-class release_gate_requirement_result or frozen equivalent before this release gate can pass.`;
  }
}

function privilegedActionRequiredForMoraltrade82Requirement(
  key: Moraltrade82ReleaseGateRequirementKey,
) {
  return [
    "neutral_reviewer_approval",
    "recipient_acceptance_association_test",
    "representative_authority_verification_test",
    "pledge_performance_bond_neutral_forfeiture_test",
  ].includes(key);
}

const MORALTRADE82_RELEASE_GATE_REQUIREMENTS: MoralTradeReleaseGateRequirementDefinition[] =
  MORALTRADE82_RELEASE_GATE_REQUIREMENT_KEYS.map((key) => ({
    key,
    label: titleCaseRequirementKey(key),
    category: categoryForMoraltrade82Requirement(key),
    policySnapshotRequired: key !== "route_health_baseline",
    privilegedActionRequired: privilegedActionRequiredForMoraltrade82Requirement(key),
    description: descriptionForMoraltrade82Requirement(key),
  }));

const LEGACY_COMPAT_RELEASE_GATE_REQUIREMENTS: MoralTradeReleaseGateRequirementDefinition[] = [
  {
    key: "dry_run_calculation",
    label: "Dry-run calculation",
    category: "calculation",
    policySnapshotRequired: true,
    privilegedActionRequired: false,
    description:
      "A deterministic dry-run calculation, input bundle hash, and excluded-record list exist before payable or reliance-bearing launch.",
  },
  {
    key: "route_health_output",
    label: "Route health output",
    category: "health",
    policySnapshotRequired: false,
    privilegedActionRequired: false,
    description:
      "Route baseline and public contract health output are current for the target release stage.",
  },
  {
    key: "privacy_review",
    label: "Privacy review",
    category: "privacy",
    policySnapshotRequired: true,
    privilegedActionRequired: false,
    description:
      "Public and counterparty surfaces have reviewed redaction, grant, small-cell, and access-log boundaries.",
  },
  {
    key: "anti_threat_review",
    label: "Anti-threat review",
    category: "safety",
    policySnapshotRequired: true,
    privilegedActionRequired: false,
    description:
      "Threat, extortion, coercion, anti-corruption, hazardous-activity, and prohibited-use checks are non-blocking.",
  },
  {
    key: "provider_event_replay_tests",
    label: "Provider-event replay tests",
    category: "payment",
    policySnapshotRequired: true,
    privilegedActionRequired: false,
    description:
      "Provider source authentication, idempotency, replay, stale snapshot, endpoint, account, and server-time tests pass.",
  },
  {
    key: "evidence_challenge_tests",
    label: "Evidence challenge tests",
    category: "evidence",
    policySnapshotRequired: true,
    privilegedActionRequired: false,
    description:
      "Claim-typed evidence, challenge-window, default-outcome, dispute-case, and payout-milestone blocking tests pass.",
  },
  {
    key: "reviewer_conflict_tests",
    label: "Reviewer conflict tests",
    category: "review",
    policySnapshotRequired: true,
    privilegedActionRequired: false,
    description:
      "Reviewer conflict-of-interest, recusal, neutral reviewer, and panel-assignment tests pass.",
  },
  {
    key: "emergency_pause_tests",
    label: "Emergency-pause tests",
    category: "operations",
    policySnapshotRequired: true,
    privilegedActionRequired: false,
    description:
      "Emergency pause blocks new authorizations and captures without deleting audit records or blocking required refunds.",
  },
  {
    key: "participant_confirmation_records",
    label: "Participant confirmation records",
    category: "participant",
    policySnapshotRequired: true,
    privilegedActionRequired: false,
    description:
      "Non-stale first-class confirmations bind baseline, terms, policy bundle, exposure, notice, and confirmation scope.",
  },
  {
    key: "participant_eligibility_records",
    label: "Participant eligibility records",
    category: "participant",
    policySnapshotRequired: true,
    privilegedActionRequired: false,
    description:
      "Identity, human uniqueness, legal capacity, sanctions, payment-rail, and jurisdiction eligibility are non-blocking.",
  },
  {
    key: "recipient_destination_verification",
    label: "Recipient and destination verification",
    category: "recipient",
    policySnapshotRequired: true,
    privilegedActionRequired: true,
    description:
      "Recipient registry entries and payment destinations are verified records, not free-text names, links, wallets, or bank details.",
  },
  {
    key: "financial_reconciliation",
    label: "Financial reconciliation",
    category: "payment",
    policySnapshotRequired: true,
    privilegedActionRequired: false,
    description:
      "Ledger, settlement report, provider event, fee, and refund/cancellation reconciliation is non-blocking before release.",
  },
  {
    key: "audit_integrity_checkpoint",
    label: "Audit integrity checkpoint",
    category: "audit",
    policySnapshotRequired: true,
    privilegedActionRequired: false,
    description:
      "Append-only records have a fresh tamper-evident checkpoint before money, public impact, or gate promotion claims.",
  },
  {
    key: "public_metric_suppression",
    label: "Public metric suppression",
    category: "metrics",
    policySnapshotRequired: true,
    privilegedActionRequired: false,
    description:
      "Public metrics enforce small-cell suppression, live/demo separation, rare-slice protection, and non-live exclusions.",
  },
  {
    key: "cause_bucket_taxonomy_review_test",
    label: "Cause-bucket taxonomy review test",
    category: "review",
    policySnapshotRequired: true,
    privilegedActionRequired: false,
    description:
      "Versioned, plural-reviewed, privacy-safe, non-ranking cause-bucket taxonomy and assignment records pass before bucket labels affect distinctness, classification, clearing, public metrics, or release promotion.",
  },
  {
    key: "resource_compatibility_assessment_test",
    label: "Resource-compatibility assessment test",
    category: "review",
    policySnapshotRequired: true,
    privilegedActionRequired: false,
    description:
      "First-class joint-feasibility assessments pass before non-public-goods trades with actions, donations, abstentions, destinations, timing, duties, or control claims can lock, clear, capture, count publicly, or promote release gates.",
  },
  {
    key: "net_offset_accounting_test",
    label: "Net-offset accounting test",
    category: "metrics",
    policySnapshotRequired: true,
    privilegedActionRequired: false,
    description:
      "Net-of-offset accounting records baseline opposed action, matched canceled amount, compromise transfer, sponsor or match amount, residual opposed action, substitution-channel state, and evidence standard before donation-offset volume or completion can be counted.",
  },
  {
    key: "offer_validity_record_test",
    label: "Offer-validity record test",
    category: "review",
    policySnapshotRequired: true,
    privilegedActionRequired: false,
    description:
      "Offer-validity records prove baselines, empirical assumptions, evidence standards, payment methods, jurisdictions, destinations, and counterparty buckets are current or renewed before matching, lock, capture, reliance, public completion, or release promotion.",
  },
  {
    key: "private_exchange_rate_quote_test",
    label: "Private exchange-rate quote test",
    category: "privacy",
    policySnapshotRequired: true,
    privilegedActionRequired: false,
    description:
      "Private exchange-rate quote records prove clearing ratios, side payments, counterpart volumes, and implied tradeoffs are participant-owned private terms that never become public cause prices, global moral exchange rates, public effectiveness comparisons, exact willingness-to-trade terms, or inferred moral values.",
  },
  {
    key: "noncompensable_safety_blocker_test",
    label: "Noncompensable safety blocker test",
    category: "safety",
    policySnapshotRequired: true,
    privilegedActionRequired: false,
    description:
      "Noncompensable blocker assessments prove safety, legal, privacy, third-party-rights, reporting-integrity, civil-rights, confidentiality, regulated-goods, cyber-abuse, financial-crime, anti-threat, and process-integrity blockers are constraints that side payments, higher donations, performance bonds, reciprocal favors, private agreements, and private waivers cannot clear by themselves.",
  },
  {
    key: "batch_clearing_objective_result_test",
    label: "Batch-clearing objective result test",
    category: "calculation",
    policySnapshotRequired: true,
    privilegedActionRequired: false,
    description:
      "Donation-offset batch clearing records a frozen objective, deterministic tie-break fairness rule, reproducible objective result, and prohibited-driver counters before scarce matches can allocate, lock, capture, rely, publish metrics, or promote release gates.",
  },
  {
    key: "sensitive_evidence_privacy_preserving_attestation_test",
    label: "Sensitive-evidence attestation test",
    category: "privacy",
    policySnapshotRequired: true,
    privilegedActionRequired: false,
    description:
      "Sensitive evidence paths return claim-typed attestation results, uncertainty, scope, and challenge routes to counterparties, and raw private artifacts require current privacy grants plus passed confidentiality review.",
  },
  {
    key: "market_simulation_red_team_test",
    label: "Market simulation and red-team test",
    category: "review",
    policySnapshotRequired: true,
    privilegedActionRequired: false,
    description:
      "Donation-offset and pledge-swap pilots have reviewed market simulation, replay, red-team, participant-comprehension, and abuse-case evidence before payable, reliance-bearing, public-metric, or release-promotion states.",
  },
  {
    key: "pilot_exit_criteria_test",
    label: "Pilot exit criteria test",
    category: "operations",
    policySnapshotRequired: true,
    privilegedActionRequired: false,
    description:
      "Donation-offset and pledge-swap pilots pre-register scale-up, pause, and rollback criteria, and matched volume alone cannot satisfy pilot success.",
  },
] satisfies MoralTradeReleaseGateRequirementDefinition[];

export const MORAL_TRADE_RELEASE_GATE_REQUIREMENTS: MoralTradeReleaseGateRequirementDefinition[] = [
  ...MORALTRADE82_RELEASE_GATE_REQUIREMENTS,
  ...LEGACY_COMPAT_RELEASE_GATE_REQUIREMENTS.filter(
    (requirement) => !MORALTRADE82_RELEASE_GATE_REQUIREMENT_KEY_SET.has(requirement.key),
  ),
];

const PUBLIC_GOODS_PREVIEW_REQUIRED_REQUIREMENTS = [
  "dry_run_calculation_bundle",
  "route_health_baseline",
  "privacy_review",
  "anti_threat_review",
  "environment_data_isolation_check",
] as const satisfies readonly Moraltrade82ReleaseGateRequirementKey[];

const DOCUMENTED_RELEASE_STAGE_REQUIREMENTS = [
  ...MORALTRADE82_RELEASE_GATE_REQUIREMENT_KEYS,
] as const;

function inactiveDocumentRequirements(
  requiredRequirements: readonly Moraltrade82ReleaseGateRequirementKey[],
) {
  const required = new Set<string>(requiredRequirements);

  return MORALTRADE82_RELEASE_GATE_REQUIREMENT_KEYS.filter((key) => !required.has(key));
}

const RELEASE_STAGES: MoralTradeReleaseStageContract[] = [
  {
    key: "public_goods_preview",
    label: "Public-goods preview",
    featureFlagKey: "moral_trade_public_goods_preview",
    payable: false,
    relianceBearing: false,
    publicMetricsMayPublish: false,
    requiredRequirementKeys: [...PUBLIC_GOODS_PREVIEW_REQUIRED_REQUIREMENTS],
    inactiveRequirementKeys: inactiveDocumentRequirements(PUBLIC_GOODS_PREVIEW_REQUIRED_REQUIREMENTS),
    hardBlockerSummary:
      "Preview can render only when dry-run, route-health, privacy, anti-threat, and environment-isolation evidence pass; later controls must be explicit not-required decisions.",
  },
  {
    key: "donation_offset_payable",
    label: "Donation-offset payable mode",
    featureFlagKey: "moral_trade_donation_offset_payable",
    payable: true,
    relianceBearing: true,
    publicMetricsMayPublish: false,
    requiredRequirementKeys: [...DOCUMENTED_RELEASE_STAGE_REQUIREMENTS],
    inactiveRequirementKeys: [],
    hardBlockerSummary:
      "Payable mode requires every moraltrade82 release-gate requirement to pass or be represented by a privileged neutral-review waiver outside this stage matrix.",
  },
  {
    key: "pledge_swap_reliance_manual_pilot",
    label: "Pledge-swap reliance manual pilot",
    featureFlagKey: "moral_trade_pledge_swap_reliance_manual_pilot",
    payable: false,
    relianceBearing: true,
    publicMetricsMayPublish: false,
    requiredRequirementKeys: [...DOCUMENTED_RELEASE_STAGE_REQUIREMENTS],
    inactiveRequirementKeys: [],
    hardBlockerSummary:
      "Reliance-bearing swaps require every moraltrade82 release-gate requirement before lock, reliance, private disclosure, public completion, or release promotion.",
  },
  {
    key: "capped_real_money_release",
    label: "Capped real-money release",
    featureFlagKey: "moral_trade_capped_real_money_release",
    payable: true,
    relianceBearing: true,
    publicMetricsMayPublish: false,
    requiredRequirementKeys: [...DOCUMENTED_RELEASE_STAGE_REQUIREMENTS],
    inactiveRequirementKeys: [],
    hardBlockerSummary:
      "Capped real-money release requires the complete moraltrade82 release-gate bundle before capture, payout, public money claims, or release promotion.",
  },
  {
    key: "public_metric_release",
    label: "Public metric release",
    featureFlagKey: "moral_trade_public_metric_release",
    payable: false,
    relianceBearing: false,
    publicMetricsMayPublish: true,
    requiredRequirementKeys: [
      "route_health_baseline",
      "privacy_review",
      "anti_threat_review",
      "deployment_config_snapshot",
      "environment_data_isolation_check",
      "control_applicability_matrix_test",
      "cause_bucket_taxonomy_review_test",
      "resource_compatibility_assessment_test",
      "net_offset_accounting_test",
      "private_exchange_rate_quote_test",
      "batch_clearing_objective_fairness_test",
      "privacy_preserving_verification_attestation_test",
      "market_simulation_red_team_test",
      "pilot_exit_criteria_test",
      "moral_difference_attestation_test",
      "intrapersonal_self_offset_classification_test",
    ],
    inactiveRequirementKeys: inactiveDocumentRequirements([
      "route_health_baseline",
      "privacy_review",
      "anti_threat_review",
      "deployment_config_snapshot",
      "environment_data_isolation_check",
      "control_applicability_matrix_test",
      "cause_bucket_taxonomy_review_test",
      "resource_compatibility_assessment_test",
      "net_offset_accounting_test",
      "private_exchange_rate_quote_test",
      "batch_clearing_objective_fairness_test",
      "privacy_preserving_verification_attestation_test",
      "market_simulation_red_team_test",
      "pilot_exit_criteria_test",
      "moral_difference_attestation_test",
      "intrapersonal_self_offset_classification_test",
    ]),
    hardBlockerSummary:
      "Public metric release is allowed only for aggregate, suppressed, live/demo-separated metrics backed by the document-key release-gate bundle.",
  },
];

const requirementByKey = new Map(
  MORAL_TRADE_RELEASE_GATE_REQUIREMENTS.map((requirement) => [
    requirement.key,
    requirement,
  ]),
);

function check(
  id: string,
  label: string,
  passed: boolean,
  evidence: string,
): MoralTradeReleaseGateCheck {
  return {
    id,
    label,
    status: passed ? "pass" : "fail",
    evidence,
  };
}

function getStage(stage: MoralTradeReleaseStage) {
  return RELEASE_STAGES.find((entry) => entry.key === stage) ?? null;
}

function resultKeySet(results: readonly MoralTradeReleaseGateRequirementResult[]) {
  return new Set(results.map((result) => result.key));
}

function isFreshIsoTimestamp(value: string) {
  const parsed = Date.parse(value);

  if (!Number.isFinite(parsed)) {
    return false;
  }

  const maxAgeMs = 1000 * 60 * 60 * 24 * 90;

  return Date.now() - parsed <= maxAgeMs;
}

function makeResult(
  key: string,
  status: MoralTradeReleaseGateRequirementStatus,
  overrides: Partial<MoralTradeReleaseGateRequirementResult> = {},
): MoralTradeReleaseGateRequirementResult {
  const definition = requirementByKey.get(key);

  return {
    key,
    status,
    evidenceRef: `synthetic://${key}`,
    policySnapshotStatus: "resolved_immutable",
    privilegedActionStatus: definition?.privilegedActionRequired
      ? "neutral_review_approved"
      : "not_required",
    recordedAt: new Date().toISOString(),
    ...overrides,
  };
}

function samplePreviewEvaluation() {
  return evaluateMoralTradeReleaseGate({
    stage: "public_goods_preview",
    gateId: "sample-preview-gate",
    policySnapshotBundleStatus: "resolved_immutable",
    stateInterpretationPolicyStatus: "resolved_immutable",
    featureFlagEnabled: true,
    emergencyPaused: false,
    results: [
      ...RELEASE_STAGES.find((stage) => stage.key === "public_goods_preview")!.requiredRequirementKeys.map(
        (key) => makeResult(key, "passed"),
      ),
      ...RELEASE_STAGES.find((stage) => stage.key === "public_goods_preview")!.inactiveRequirementKeys.map(
        (key) => makeResult(key, "not_required_for_stage"),
      ),
    ],
  });
}

function samplePayableEvaluation() {
  return evaluateMoralTradeReleaseGate({
    stage: "donation_offset_payable",
    gateId: "sample-payable-gate",
    policySnapshotBundleStatus: "resolved_immutable",
    stateInterpretationPolicyStatus: "resolved_immutable",
    featureFlagEnabled: true,
    emergencyPaused: false,
    results: [
      ...RELEASE_STAGES.find((stage) => stage.key === "donation_offset_payable")!.requiredRequirementKeys.map(
        (key) => {
          if (key === "payment_replay_tests") {
            return makeResult(key, "missing", { evidenceRef: "" });
          }

          if (key === "review_capacity_admission_queue_test") {
            return makeResult(key, "stale");
          }

          if (key === "recipient_acceptance_association_test") {
            return makeResult(key, "passed", { privilegedActionStatus: "missing" });
          }

          return makeResult(key, "passed");
        },
      ),
    ],
  });
}

export function evaluateMoralTradeReleaseGate(
  input: MoralTradeReleaseGateEvaluationInput,
): MoralTradeReleaseGateEvaluation {
  const stage = getStage(input.stage);
  const blockers: string[] = [];
  const resultsByKey = new Map(input.results.map((result) => [result.key, result]));

  if (!stage) {
    blockers.push(`unknown_stage:${input.stage}`);
  }

  if (input.policySnapshotBundleStatus !== "resolved_immutable") {
    blockers.push(`policy_snapshot_bundle_not_immutable:${input.policySnapshotBundleStatus}`);
  }

  if (input.stateInterpretationPolicyStatus !== "resolved_immutable") {
    blockers.push(
      `state_interpretation_policy_not_immutable:${input.stateInterpretationPolicyStatus}`,
    );
  }

  if (input.emergencyPaused) {
    blockers.push("emergency_pause_active");
  }

  if (stage && (stage.payable || stage.relianceBearing || stage.publicMetricsMayPublish) && !input.featureFlagEnabled) {
    blockers.push(`feature_flag_disabled:${stage.featureFlagKey}`);
  }

  const requiredRequirementKeys = stage?.requiredRequirementKeys ?? [];
  const inactiveRequirementKeys = stage?.inactiveRequirementKeys ?? [];

  for (const key of [...requiredRequirementKeys, ...inactiveRequirementKeys]) {
    if (!requirementByKey.has(key)) {
      blockers.push(`unknown_requirement_definition:${key}`);
    }
  }

  for (const key of requiredRequirementKeys) {
    const result = resultsByKey.get(key);
    const definition = requirementByKey.get(key);

    if (!result) {
      blockers.push(`missing_required_result:${key}`);
      continue;
    }

    if (!result.evidenceRef.trim()) {
      blockers.push(`missing_evidence_ref:${key}`);
    }

    if (!isFreshIsoTimestamp(result.recordedAt)) {
      blockers.push(`stale_or_invalid_result_timestamp:${key}`);
    }

    if (definition?.policySnapshotRequired && result.policySnapshotStatus !== "resolved_immutable") {
      blockers.push(`requirement_policy_snapshot_not_immutable:${key}:${result.policySnapshotStatus}`);
    }

    if (
      definition?.privilegedActionRequired &&
      !["dual_control_approved", "neutral_review_approved"].includes(result.privilegedActionStatus)
    ) {
      blockers.push(`privileged_action_not_approved:${key}:${result.privilegedActionStatus}`);
    }

    if (result.status === "passed") {
      continue;
    }

    if (result.status === "waived_by_neutral_review") {
      if (result.privilegedActionStatus !== "neutral_review_approved") {
        blockers.push(`waiver_without_neutral_review:${key}`);
      }

      continue;
    }

    blockers.push(`required_result_not_passed:${key}:${result.status}`);
  }

  for (const key of inactiveRequirementKeys) {
    const result = resultsByKey.get(key);

    if (!result) {
      blockers.push(`missing_inactive_control_representation:${key}`);
      continue;
    }

    if (result.status !== "not_required_for_stage") {
      blockers.push(`inactive_control_not_explicitly_not_required:${key}:${result.status}`);
    }

    if (result.policySnapshotStatus !== "resolved_immutable") {
      blockers.push(`inactive_control_policy_snapshot_not_immutable:${key}:${result.policySnapshotStatus}`);
    }
  }

  return {
    status: blockers.length ? "blocked" : "pass",
    stage: input.stage,
    gateId: input.gateId,
    payable: stage?.payable ?? false,
    relianceBearing: stage?.relianceBearing ?? false,
    publicMetricsMayPublish: stage?.publicMetricsMayPublish ?? false,
    requiredRequirementCount: requiredRequirementKeys.length,
    inactiveRequirementCount: inactiveRequirementKeys.length,
    passedRequirementCount: input.results.filter((result) => result.status === "passed").length,
    notRequiredRequirementCount: input.results.filter(
      (result) => result.status === "not_required_for_stage",
    ).length,
    waivedRequirementCount: input.results.filter(
      (result) => result.status === "waived_by_neutral_review",
    ).length,
    blockers,
    checkedAt: new Date().toISOString(),
  };
}

export function getMoralTradeReleaseGateContract(): MoralTradeReleaseGateContract {
  return {
    version: MORAL_TRADE_RELEASE_GATE_CONTRACT_VERSION,
    purpose:
      "Public contract for fail-closed Moral Trade release gates: immutable policy snapshots, frozen state interpretation, first-class requirement results, privileged-action approval, explicit inactive-control decisions, and staged feature flags before payable, reliance-bearing, or public-metric behavior.",
    stateInterpretationRule:
      "Missing, unknown, stale, under-review, superseded, unmapped, or mutable states block payable, releasable, reliance-bearing, privacy-disclosing, public-metric, and release-gate transitions unless a frozen policy snapshot explicitly marks the requirement not required for that release stage.",
    policySnapshotRule:
      "Every policy reference affecting locked agreements, clearing, allocation, evidence, fees, FX, notifications, legal availability, metrics, payout release, refund/cancellation, data retention, or state interpretation resolves to an immutable policy snapshot before the gate can pass.",
    firstClassRecordTables: [...FIRST_CLASS_RECORD_TABLES],
    immutablePolicySnapshotSubjects: [...POLICY_SNAPSHOT_SUBJECTS],
    privilegedActionKeys: [...PRIVILEGED_ACTION_KEYS],
    stages: RELEASE_STAGES.map((stage) => ({ ...stage })),
    requirementDefinitions: MORAL_TRADE_RELEASE_GATE_REQUIREMENTS.map((requirement) => ({
      ...requirement,
    })),
    sampleEvaluations: [samplePreviewEvaluation(), samplePayableEvaluation()],
    contractTests: [...CONTRACT_TESTS],
  };
}

export function validateMoralTradeReleaseGateContract(
  contract: MoralTradeReleaseGateContract = getMoralTradeReleaseGateContract(),
): MoralTradeReleaseGateValidation {
  const requirementKeys = contract.requirementDefinitions.map((requirement) => requirement.key);
  const stageKeys = contract.stages.map((stage) => stage.key);
  const allStageRequirementKeys = contract.stages.flatMap((stage) => [
    ...stage.requiredRequirementKeys,
    ...stage.inactiveRequirementKeys,
  ]);
  const samplePreview = contract.sampleEvaluations.find(
    (evaluation) => evaluation.stage === "public_goods_preview",
  );
  const samplePayable = contract.sampleEvaluations.find(
    (evaluation) => evaluation.stage === "donation_offset_payable",
  );
  const checks = [
    check(
      "stage-coverage",
      "Release stages cover preview, payable, reliance, capped real-money, and public metrics",
      [
        "public_goods_preview",
        "donation_offset_payable",
        "pledge_swap_reliance_manual_pilot",
        "capped_real_money_release",
        "public_metric_release",
      ].every((stage) => stageKeys.includes(stage as MoralTradeReleaseStage)) &&
        contract.stages.every(
          (stage) =>
            stage.featureFlagKey.startsWith("moral_trade_") &&
            stage.requiredRequirementKeys.length > 0,
        ),
      stageKeys.join(", "),
    ),
    check(
      "requirement-definition-coverage",
      "Every stage requirement and moraltrade82 release-gate key resolves to a typed definition",
      allStageRequirementKeys.every((key) => requirementKeys.includes(key)) &&
        MORALTRADE82_RELEASE_GATE_REQUIREMENT_KEYS.every((key) =>
          requirementKeys.includes(key),
        ) &&
        requirementKeys.includes("provider_event_replay_tests") &&
        requirementKeys.includes("emergency_pause_tests") &&
        requirementKeys.includes("cause_bucket_taxonomy_review_test") &&
        requirementKeys.includes("resource_compatibility_assessment_test") &&
        requirementKeys.includes("net_offset_accounting_test") &&
        requirementKeys.includes("private_exchange_rate_quote_test") &&
        requirementKeys.includes("noncompensable_safety_blocker_test") &&
        requirementKeys.includes("batch_clearing_objective_result_test") &&
        requirementKeys.includes("sensitive_evidence_privacy_preserving_attestation_test") &&
        requirementKeys.includes("market_simulation_red_team_test") &&
        requirementKeys.includes("pilot_exit_criteria_test"),
      requirementKeys.join(", "),
    ),
    check(
      "policy-snapshot-subjects",
      "Immutable policy snapshot subjects cover state, payment, FX, notification, metrics, and retention",
      [
        "state_interpretation",
        "payment_capture",
        "payout_release",
        "refund_cancellation",
        "provider_source_authentication",
        "time_authority",
        "notification",
        "fx",
        "platform_fee",
        "public_metrics",
        "data_retention",
      ].every((subject) => contract.immutablePolicySnapshotSubjects.includes(subject)),
      contract.immutablePolicySnapshotSubjects.join(", "),
    ),
    check(
      "first-class-record-tables",
      "Release gates, policy snapshots, requirement results, state interpretation, and privileged actions are first-class records",
      [...FIRST_CLASS_RECORD_TABLES].every((table) =>
        contract.firstClassRecordTables.includes(table),
      ),
      contract.firstClassRecordTables.join(", "),
    ),
    check(
      "privileged-action-coverage",
      "Privileged actions include gate approval, manual money movement, private grants, and emergency unpause",
      [
        "release_gate_approval",
        "manual_capture",
        "manual_payout_release",
        "private_data_access_grant",
        "emergency_unpause",
        "nonroutine_refund_cancellation",
      ].every((key) => contract.privilegedActionKeys.includes(key)),
      contract.privilegedActionKeys.join(", "),
    ),
    check(
      "fail-closed-state-rule",
      "State interpretation rule blocks unknown, stale, unmapped, and mutable states",
      /Missing, unknown, stale, under-review, superseded, unmapped, or mutable states block/.test(
        contract.stateInterpretationRule,
      ),
      contract.stateInterpretationRule,
    ),
    check(
      "sample-preview-passes-with-inactive-controls",
      "Preview sample passes only with explicit not-required inactive controls",
      samplePreview?.status === "pass" &&
        samplePreview.inactiveRequirementCount > 0 &&
        samplePreview.notRequiredRequirementCount === samplePreview.inactiveRequirementCount,
      samplePreview
        ? `${samplePreview.status}:${samplePreview.notRequiredRequirementCount}/${samplePreview.inactiveRequirementCount}`
        : "missing",
    ),
    check(
      "sample-payable-fails-closed",
      "Payable sample fails closed when payment replay, review-capacity, or privileged recipient evidence is missing",
      samplePayable?.status === "blocked" &&
        samplePayable.blockers.some((blocker) =>
          blocker.includes("payment_replay_tests"),
        ) &&
        samplePayable.blockers.some((blocker) =>
          blocker.includes("review_capacity_admission_queue_test"),
        ) &&
        samplePayable.blockers.some((blocker) =>
          blocker.includes("recipient_acceptance_association_test"),
        ),
      samplePayable ? samplePayable.blockers.join(", ") : "missing",
    ),
    check(
      "contract-tests",
      "Contract test hooks are named",
      [...CONTRACT_TESTS].every((key) => contract.contractTests.includes(key)),
      contract.contractTests.join(", "),
    ),
  ];
  const blockers = checks
    .filter((entry) => entry.status === "fail")
    .map((entry) => `${entry.id}: ${entry.label}`);

  return {
    status: blockers.length ? "fail" : "pass",
    validatorName: "moral-trade-release-gate-contract",
    validatorVersion: MORAL_TRADE_RELEASE_GATE_VALIDATOR_VERSION,
    contractVersion: contract.version,
    checks,
    blockers,
  };
}

const moralTradeReleaseGates = {
  evaluateMoralTradeReleaseGate,
  getMoralTradeReleaseGateContract,
  validateMoralTradeReleaseGateContract,
};

export default moralTradeReleaseGates;
