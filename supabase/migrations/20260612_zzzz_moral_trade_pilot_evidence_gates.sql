alter table public.moral_trade_policy_snapshots
  drop constraint if exists moral_trade_policy_snapshots_subject_kind_check;

alter table public.moral_trade_policy_snapshots
  add constraint moral_trade_policy_snapshots_subject_kind_check
  check (
    subject_kind in (
      'release_gate',
      'state_interpretation',
      'payment_capture',
      'payout_release',
      'refund_cancellation',
      'provider_source_authentication',
      'time_authority',
      'notification',
      'fx',
      'platform_fee',
      'public_metrics',
      'data_retention',
      'participant_eligibility',
      'recipient_destination_verification',
      'account_security',
      'backup_recovery',
      'deployment_release',
      'configuration_snapshot',
      'schema_migration',
      'environment_data_isolation',
      'financial_reconciliation',
      'audit_integrity',
      'data_security',
      'reviewer_quality',
      'anti_enumeration',
      'privacy_disclosure',
      'impact_claim_methodology',
      'matching_clearing',
      'matched_trade_lock',
      'baseline_integrity',
      'baseline_manufacturing',
      'agreement_amendment',
      'appeal_case',
      'side_agreement_disclosure',
      'side_agreement_review',
      'trade_classification',
      'compensated_moral_action',
      'ordinary_service_procurement',
      'protective_assessment',
      'negative_commitment_scope',
      'action_reversibility_assessment',
      'donor_of_record_tax_receipt',
      'third_party_obligation_assessment',
      'representative_authority_assessment',
      'reporting_integrity_assessment',
      'civil_rights_discrimination_assessment',
      'participant_autonomy_assessment',
      'confidentiality_privacy_rights_assessment',
      'evidence_authenticity_assessment',
      'financial_crime_fraud_assessment',
      'agreement_transferability_assessment',
      'regulated_goods_hazardous_activity_assessment',
      'cyber_abuse_digital_integrity_assessment',
      'anti_corruption_assessment',
      'least_intrusive_evidence_assessment',
      'performance_bond_neutral_review',
      'user_safety',
      'contact_interaction',
      'abuse_report',
      'content_moderation',
      'prohibited_use',
      'challenge_window',
      'payout_milestone',
      'approved_trade_template',
      'template_parameter',
      'review_capacity',
      'review_queue_admission',
      'participant_term_sheet',
      'counterparty_blinding',
      'staged_counterparty_disclosure',
      'recipient_acceptance',
      'adverse_association',
      'ai_preference_elicitation',
      'post_clear_audit',
      'non_public_goods_subsidy',
      'subsidy_schedule',
      'cause_bucket_taxonomy',
      'resource_compatibility',
      'net_offset_accounting',
      'offer_validity',
      'direct_pair_clearing',
      'private_exchange_rate_quote',
      'noncompensable_blocker',
      'batch_clearing_objective',
      'sensitive_evidence_attestation',
      'pilot_evidence'
    )
  );

create table if not exists public.moral_trade_pilot_evidence_gates (
  id uuid primary key default gen_random_uuid(),
  policy_snapshot_id uuid not null references public.moral_trade_policy_snapshots (id) on delete restrict,
  pilot_track text not null check (
    pilot_track in ('donation_offset', 'pledge_swap', 'combined_market_pilot')
  ),
  release_stage text not null,
  pilot_evidence_policy_ref text not null,
  policy_status text not null default 'missing' check (
    policy_status in ('resolved_immutable', 'missing', 'mutable', 'stale', 'superseded')
  ),
  simulation_evidence_hash text check (simulation_evidence_hash is null or simulation_evidence_hash ~ '^sha256:[a-f0-9]{64}$'),
  red_team_evidence_hash text check (red_team_evidence_hash is null or red_team_evidence_hash ~ '^sha256:[a-f0-9]{64}$'),
  pre_registered_criteria_hash text check (pre_registered_criteria_hash is null or pre_registered_criteria_hash ~ '^sha256:[a-f0-9]{64}$'),
  scale_up_criteria text not null default '',
  pause_criteria text not null default '',
  rollback_criteria text not null default '',
  evidence_types_json jsonb not null default '[]'::jsonb,
  success_metric_refs_json jsonb not null default '[]'::jsonb,
  matched_volume_only_bool boolean not null default false,
  replay_run_count integer not null default 0 check (replay_run_count >= 0),
  red_team_finding_count integer not null default 0 check (red_team_finding_count >= 0),
  unresolved_critical_finding_count integer not null default 0 check (unresolved_critical_finding_count >= 0),
  result_state text not null default 'under_review' check (
    result_state in ('draft', 'under_review', 'passed', 'blocked', 'paused', 'rollback_required', 'superseded')
  ),
  reviewer_decision_ref text,
  criteria_published_at timestamptz,
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (
    jsonb_typeof(evidence_types_json) = 'array'
    and jsonb_typeof(success_metric_refs_json) = 'array'
  ),
  check (
    result_state <> 'passed'
    or (
      policy_status = 'resolved_immutable'
      and length(trim(pilot_evidence_policy_ref)) > 0
      and simulation_evidence_hash is not null
      and red_team_evidence_hash is not null
      and pre_registered_criteria_hash is not null
      and length(trim(scale_up_criteria)) >= 12
      and length(trim(pause_criteria)) >= 12
      and length(trim(rollback_criteria)) >= 12
      and jsonb_array_length(evidence_types_json) > 0
      and jsonb_array_length(success_metric_refs_json) > 0
      and not (success_metric_refs_json <@ '["matched_volume"]'::jsonb)
      and matched_volume_only_bool = false
      and replay_run_count > 0
      and unresolved_critical_finding_count = 0
      and reviewer_decision_ref is not null
      and criteria_published_at is not null
      and reviewed_at is not null
    )
  )
);

comment on table public.moral_trade_pilot_evidence_gates is
  'First-class pilot evidence gate records for donation-offset and pledge-swap promotion. Records require reviewed market simulation, red-team evidence, pre-registered scale-up, pause, and rollback criteria, and non-volume success metrics; matched volume alone cannot satisfy pilot success.';

create index if not exists moral_trade_pilot_evidence_gates_track_idx
  on public.moral_trade_pilot_evidence_gates (pilot_track, release_stage, result_state, updated_at desc);

create index if not exists moral_trade_pilot_evidence_gates_policy_idx
  on public.moral_trade_pilot_evidence_gates (policy_snapshot_id, policy_status, result_state);

create index if not exists moral_trade_pilot_evidence_gates_review_idx
  on public.moral_trade_pilot_evidence_gates (result_state, criteria_published_at, reviewed_at);

alter table public.moral_trade_pilot_evidence_gates enable row level security;
