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
      'template_parameter'
    )
  );

create table if not exists public.moral_trade_template_parameter_policies (
  id uuid primary key default gen_random_uuid(),
  policy_snapshot_id uuid not null references public.moral_trade_policy_snapshots (id) on delete restrict,
  template_slug text not null,
  template_version text not null,
  trade_type text not null check (
    trade_type in (
      'donation_offset',
      'pledge_swap',
      'compensated_moral_action',
      'performance_bond_condition',
      'side_agreement'
    )
  ),
  allowed_recipient_destination_classes text[] not null default '{}',
  eligible_cause_bucket_refs text[] not null default '{}',
  allowed_evidence_claim_types text[] not null default '{}',
  challenge_window_policy_ref text,
  cancellation_rule_ref text,
  required_control_pack_ref text,
  prohibited_parameter_codes_json jsonb not null default '[]'::jsonb,
  off_template_behavior text not null default 'block' check (
    off_template_behavior in ('block', 'preview_only', 'manual_review')
  ),
  policy_status text not null default 'missing' check (
    policy_status in ('resolved_immutable', 'missing', 'mutable', 'stale', 'superseded')
  ),
  policy_hash text not null check (policy_hash ~ '^sha256:[a-f0-9]{64}$'),
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  expires_at timestamptz,
  superseded_by uuid references public.moral_trade_template_parameter_policies (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (template_slug, template_version),
  check (jsonb_typeof(prohibited_parameter_codes_json) = 'array'),
  check (
    policy_status <> 'resolved_immutable'
    or (
      cardinality(allowed_recipient_destination_classes) > 0
      and cardinality(eligible_cause_bucket_refs) > 0
      and cardinality(allowed_evidence_claim_types) > 0
      and challenge_window_policy_ref is not null
      and cancellation_rule_ref is not null
      and required_control_pack_ref is not null
      and reviewed_at is not null
    )
  )
);

comment on table public.moral_trade_template_parameter_policies is
  'Immutable approved-template parameter policies. Reliance-bearing Moral Trade offers must freeze recipient/destination class, cause buckets, evidence claim types, challenge windows, cancellation rules, and control-pack references before lock, payment, reliance, or public metrics.';

create table if not exists public.moral_trade_approved_trade_templates (
  id uuid primary key default gen_random_uuid(),
  template_parameter_policy_id uuid not null references public.moral_trade_template_parameter_policies (id) on delete restrict,
  template_slug text not null,
  template_version text not null,
  trade_type text not null check (
    trade_type in (
      'donation_offset',
      'pledge_swap',
      'compensated_moral_action',
      'performance_bond_condition',
      'side_agreement'
    )
  ),
  template_state text not null default 'draft' check (
    template_state in ('draft', 'active', 'deprecated', 'superseded', 'blocked')
  ),
  template_summary_hash text not null check (template_summary_hash ~ '^sha256:[a-f0-9]{64}$'),
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  expires_at timestamptz,
  superseded_by uuid references public.moral_trade_approved_trade_templates (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (template_slug, template_version),
  check (
    template_state <> 'active'
    or (reviewed_at is not null and expires_at is not null)
  )
);

comment on table public.moral_trade_approved_trade_templates is
  'First-class approved trade templates for donation offsets, pledge swaps, compensated moral actions, performance-bond conditions, and side agreements. Draft, deprecated, superseded, or blocked templates cannot support live, payable, reliance-bearing, or public-metric transitions.';

create table if not exists public.moral_trade_template_instance_records (
  id uuid primary key default gen_random_uuid(),
  approved_trade_template_id uuid not null references public.moral_trade_approved_trade_templates (id) on delete restrict,
  template_parameter_policy_id uuid not null references public.moral_trade_template_parameter_policies (id) on delete restrict,
  subject_type text not null check (
    subject_type in (
      'offset_offer',
      'pledge_swap_offer',
      'matched_trade_lock_proposal',
      'cleared_trade_agreement',
      'seed_template',
      'worked_example'
    )
  ),
  subject_ref text not null,
  submitted_parameter_hash text not null check (submitted_parameter_hash ~ '^sha256:[a-f0-9]{64}$'),
  normalized_parameter_hash text not null check (normalized_parameter_hash ~ '^sha256:[a-f0-9]{64}$'),
  conformance_state text not null default 'draft' check (
    conformance_state in (
      'draft',
      'conforms',
      'off_template_preview_only',
      'off_template_manual_review',
      'blocked',
      'superseded'
    )
  ),
  off_template_reason_codes_json jsonb not null default '[]'::jsonb,
  free_text_creates_new_obligations_bool boolean not null default false,
  free_text_creates_new_evidence_standards_bool boolean not null default false,
  free_text_creates_side_payments_bool boolean not null default false,
  free_text_creates_new_counterparties_bool boolean not null default false,
  neutral_reviewer_decision_id uuid references public.moral_trade_review_decisions (id) on delete set null,
  renewed_participant_confirmation_id uuid references public.moral_trade_participant_confirmation_records (id) on delete set null,
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  expires_at timestamptz,
  superseded_by uuid references public.moral_trade_template_instance_records (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (subject_type, subject_ref, approved_trade_template_id),
  check (jsonb_typeof(off_template_reason_codes_json) = 'array'),
  check (
    conformance_state <> 'conforms'
    or (
      free_text_creates_new_obligations_bool = false
      and free_text_creates_new_evidence_standards_bool = false
      and free_text_creates_side_payments_bool = false
      and free_text_creates_new_counterparties_bool = false
      and reviewed_at is not null
    )
  ),
  check (
    conformance_state <> 'off_template_manual_review'
    or (
      neutral_reviewer_decision_id is not null
      and renewed_participant_confirmation_id is not null
      and free_text_creates_new_obligations_bool = false
      and free_text_creates_new_evidence_standards_bool = false
      and free_text_creates_side_payments_bool = false
      and free_text_creates_new_counterparties_bool = false
      and reviewed_at is not null
    )
  )
);

comment on table public.moral_trade_template_instance_records is
  'Subject-specific template conformance records. User free text cannot create new obligations, evidence standards, side payments, or counterparties; off-template reliance requires neutral review and renewed participant confirmation.';

create index if not exists moral_trade_template_parameter_policies_template_idx
  on public.moral_trade_template_parameter_policies (template_slug, template_version, policy_status);

create index if not exists moral_trade_approved_trade_templates_state_idx
  on public.moral_trade_approved_trade_templates (template_slug, template_version, trade_type, template_state);

create index if not exists moral_trade_template_instance_records_subject_idx
  on public.moral_trade_template_instance_records (subject_type, subject_ref, conformance_state, created_at desc);

create index if not exists moral_trade_template_instance_records_template_idx
  on public.moral_trade_template_instance_records (approved_trade_template_id, conformance_state, reviewed_at desc);

alter table public.moral_trade_template_parameter_policies enable row level security;
alter table public.moral_trade_approved_trade_templates enable row level security;
alter table public.moral_trade_template_instance_records enable row level security;
