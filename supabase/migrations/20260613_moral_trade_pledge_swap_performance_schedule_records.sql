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
      'pilot_evidence',
      'option_set_comparison',
      'preference_comparability',
      'trade_burden_accounting',
      'moral_difference_attestation',
      'bargaining_protocol',
      'empirical_assumption',
      'moral_side_constraint',
      'intrapersonal_self_offset',
      'commitment_inventory',
      'atomic_settlement',
      'breach_remedy',
      'pledge_performance_bond',
      'pledge_swap_performance'
    )
  );

create table if not exists public.moral_trade_pledge_swap_performance_schedules (
  id uuid primary key default gen_random_uuid(),
  policy_snapshot_id uuid not null references public.moral_trade_policy_snapshots (id) on delete restrict,
  pledge_swap_offer_id text,
  matched_trade_lock_proposal_ref text,
  cleared_trade_agreement_ref text,
  performance_schedule_policy_ref text not null,
  performance_start_at timestamptz not null,
  performance_end_at timestamptz not null,
  checkpoint_schedule_json jsonb not null,
  synchronized_start_required_bool boolean not null default true,
  counterpart_nonperformance_suspension_rule text not null,
  reciprocal_release_trigger text not null,
  grace_or_cure_period_days integer not null default 0 check (grace_or_cure_period_days >= 0),
  evidence_due_schedule jsonb not null,
  public_breach_disclosure_allowed_bool boolean not null default false,
  breach_remedy_policy_ref text not null,
  schedule_state text not null check (
    schedule_state in (
      'draft',
      'previewed',
      'locked',
      'active',
      'suspended',
      'completed',
      'released',
      'disputed',
      'superseded'
    )
  ),
  reviewer_decision_ref text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (
    pledge_swap_offer_id is not null
    or matched_trade_lock_proposal_ref is not null
    or cleared_trade_agreement_ref is not null
  ),
  check (performance_start_at < performance_end_at),
  check (checkpoint_schedule_json <> '{}'::jsonb),
  check (evidence_due_schedule <> '{}'::jsonb),
  check (synchronized_start_required_bool = true),
  check (public_breach_disclosure_allowed_bool = false)
);

create table if not exists public.moral_trade_pledge_swap_performance_schedule_enforcement_records (
  id uuid primary key default gen_random_uuid(),
  owner_profile_id uuid not null references public.profiles (id) on delete cascade,
  transition text not null,
  enforcement_status text not null check (enforcement_status in ('pass', 'blocked')),
  performance_schedule_required_bool boolean not null default false,
  schedule_count integer not null default 0 check (schedule_count >= 0),
  non_blocking_schedule_count integer not null default 0 check (non_blocking_schedule_count >= 0),
  synchronized_schedule_count integer not null default 0 check (synchronized_schedule_count >= 0),
  reciprocal_release_schedule_count integer not null default 0 check (reciprocal_release_schedule_count >= 0),
  enforcement_input_json jsonb not null,
  evaluation_result_json jsonb not null,
  blocker_codes text[] not null default '{}',
  user_facing_blocker_categories text[] not null default '{}',
  contract_version text not null,
  validator_version text not null,
  evaluation_hash text not null check (evaluation_hash ~ '^sha256:[a-f0-9]{64}$'),
  idempotency_key text not null,
  runtime_transition_allowed_bool boolean not null default false,
  matched_trade_lock_allowed_bool boolean not null default false,
  performance_start_allowed_bool boolean not null default false,
  checkpoint_evidence_allowed_bool boolean not null default false,
  performance_release_allowed_bool boolean not null default false,
  breach_remedy_allowed_bool boolean not null default false,
  reciprocal_release_allowed_bool boolean not null default false,
  public_metric_publication_allowed_bool boolean not null default false,
  release_gate_promotion_allowed_bool boolean not null default false,
  superseded_by uuid references public.moral_trade_pledge_swap_performance_schedule_enforcement_records (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  check (non_blocking_schedule_count <= schedule_count),
  check (runtime_transition_allowed_bool = false),
  check (matched_trade_lock_allowed_bool = false),
  check (performance_start_allowed_bool = false),
  check (checkpoint_evidence_allowed_bool = false),
  check (performance_release_allowed_bool = false),
  check (breach_remedy_allowed_bool = false),
  check (reciprocal_release_allowed_bool = false),
  check (public_metric_publication_allowed_bool = false),
  check (release_gate_promotion_allowed_bool = false),
  unique (owner_profile_id, idempotency_key)
);

comment on table public.moral_trade_pledge_swap_performance_schedules is
  'First-class pledge-swap performance schedules for synchronized continuing duties. Records freeze start/end, checkpoint schedule, evidence due schedule, cure/suspension terms, reciprocal release, non-punitive breach posture, and reviewer approval.';

comment on table public.moral_trade_pledge_swap_performance_schedule_enforcement_records is
  'Append-only owner-scoped pledge-swap performance-schedule enforcement records. Enforcement rows log deterministic evaluation results while enforcing that this endpoint cannot authorize runtime transitions, locks, performance start, checkpoint evidence, performance release, breach remedies, reciprocal release, public metrics, or release-gate promotion.';

alter table public.moral_trade_pledge_swap_performance_schedule_enforcement_records enable row level security;

drop policy if exists "moral_trade_pledge_swap_performance_schedule_enforcement_records_select_owner"
  on public.moral_trade_pledge_swap_performance_schedule_enforcement_records;
create policy "moral_trade_pledge_swap_performance_schedule_enforcement_records_select_owner"
  on public.moral_trade_pledge_swap_performance_schedule_enforcement_records
  for select
  to authenticated
  using (owner_profile_id = auth.uid());

drop policy if exists "moral_trade_pledge_swap_performance_schedule_enforcement_records_insert_owner"
  on public.moral_trade_pledge_swap_performance_schedule_enforcement_records;
create policy "moral_trade_pledge_swap_performance_schedule_enforcement_records_insert_owner"
  on public.moral_trade_pledge_swap_performance_schedule_enforcement_records
  for insert
  to authenticated
  with check (
    owner_profile_id = auth.uid()
    and runtime_transition_allowed_bool = false
    and matched_trade_lock_allowed_bool = false
    and performance_start_allowed_bool = false
    and checkpoint_evidence_allowed_bool = false
    and performance_release_allowed_bool = false
    and breach_remedy_allowed_bool = false
    and reciprocal_release_allowed_bool = false
    and public_metric_publication_allowed_bool = false
    and release_gate_promotion_allowed_bool = false
  );
