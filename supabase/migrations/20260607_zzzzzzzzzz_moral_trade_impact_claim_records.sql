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
      'impact_claim_methodology'
    )
  );

create table if not exists public.moral_trade_impact_claim_methodology_policies (
  id uuid primary key default gen_random_uuid(),
  policy_snapshot_id uuid not null references public.moral_trade_policy_snapshots (id) on delete restrict,
  policy_version text not null default 'moral-trade-impact-claims-v0.1-2026-06',
  claim_type text not null check (
    claim_type in (
      'transfer_metric',
      'payout_metric',
      'sponsor_leverage_metric',
      'outcome_claim',
      'cost_effectiveness_claim',
      'causal_impact_claim',
      'moral_value_claim'
    )
  ),
  status text not null default 'under_review' check (
    status in ('passed', 'not_required_for_stage', 'missing', 'under_review', 'failed', 'stale', 'superseded')
  ),
  evidence_required_bool boolean not null default true,
  uncertainty_disclosure_required_bool boolean not null default true,
  transfer_separation_required_bool boolean not null default true,
  content_moderation_required_bool boolean not null default true,
  reviewer_quality_required_bool boolean not null default true,
  privileged_action_required_bool boolean not null default true,
  audit_integrity_required_bool boolean not null default true,
  public_metric_suppression_required_bool boolean not null default true,
  min_evidence_refs integer not null default 1 check (min_evidence_refs >= 0),
  methodology_hash text not null check (methodology_hash ~ '^sha256:[a-f0-9]{64}$'),
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  superseded_by uuid references public.moral_trade_impact_claim_methodology_policies (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (policy_snapshot_id, claim_type)
);

comment on table public.moral_trade_impact_claim_methodology_policies is
  'Frozen impact-claim methodology policies that keep transfer, payout, sponsor leverage, outcome, cost-effectiveness, causal-impact, and moral-value claims separate.';

create table if not exists public.moral_trade_impact_claim_records (
  id uuid primary key default gen_random_uuid(),
  methodology_policy_ref uuid not null references public.moral_trade_impact_claim_methodology_policies (id) on delete restrict,
  surface text not null check (
    surface in (
      'offer_detail',
      'public_dashboard',
      'transparency_report',
      'round_summary',
      'recipient_project_page'
    )
  ),
  claim_type text not null check (
    claim_type in (
      'transfer_metric',
      'payout_metric',
      'sponsor_leverage_metric',
      'outcome_claim',
      'cost_effectiveness_claim',
      'causal_impact_claim',
      'moral_value_claim'
    )
  ),
  publication_status text not null default 'draft' check (
    publication_status in ('draft', 'under_review', 'reviewed', 'published', 'blocked', 'stale', 'superseded')
  ),
  claim_subject_ref text not null default '',
  evidence_refs text[] not null default '{}',
  evidence_claim_types text[] not null default '{}',
  uncertainty_disclosure text not null default '',
  transfer_vs_impact_label text not null default '',
  gross_transfer_amount_displayed_bool boolean not null default false,
  net_recipient_payout_displayed_bool boolean not null default false,
  sponsor_leverage_displayed_bool boolean not null default false,
  payment_evidence_used_as_impact_bool boolean not null default false,
  impact_claim_text_public_bool boolean not null default false,
  content_moderation_status text not null default 'missing' check (
    content_moderation_status in ('passed', 'not_required_for_stage', 'missing', 'under_review', 'failed', 'stale', 'superseded')
  ),
  reviewer_quality_status text not null default 'missing' check (
    reviewer_quality_status in ('passed', 'not_required_for_stage', 'missing', 'under_review', 'failed', 'stale', 'superseded')
  ),
  privileged_action_record_id uuid references public.moral_trade_privileged_action_records (id) on delete set null,
  privileged_action_status text not null default 'missing' check (
    privileged_action_status in ('passed', 'not_required_for_stage', 'missing', 'under_review', 'failed', 'stale', 'superseded')
  ),
  audit_integrity_checkpoint_id uuid references public.moral_trade_audit_integrity_checkpoints (id) on delete set null,
  audit_integrity_status text not null default 'missing' check (
    audit_integrity_status in ('passed', 'not_required_for_stage', 'missing', 'under_review', 'failed', 'stale', 'superseded')
  ),
  public_metric_suppression_status text not null default 'missing' check (
    public_metric_suppression_status in ('passed', 'not_required_for_stage', 'missing', 'under_review', 'failed', 'stale', 'superseded')
  ),
  private_evidence_public_bool boolean not null default false,
  claim_hash text not null check (claim_hash ~ '^sha256:[a-f0-9]{64}$'),
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  expires_at timestamptz,
  superseded_by uuid references public.moral_trade_impact_claim_records (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

comment on table public.moral_trade_impact_claim_records is
  'Reviewed impact-claim records. Payment, payout, destination, sponsor-leverage, or transfer evidence cannot become causal impact, outcome, cost-effectiveness, or moral-value claims without reviewed methodology, evidence, uncertainty disclosure, and approvals.';

create index if not exists moral_trade_impact_claim_methodology_policies_claim_type_idx
  on public.moral_trade_impact_claim_methodology_policies (claim_type, status, created_at desc);

create index if not exists moral_trade_impact_claim_records_surface_claim_type_idx
  on public.moral_trade_impact_claim_records (surface, claim_type, publication_status, created_at desc);

create index if not exists moral_trade_impact_claim_records_subject_idx
  on public.moral_trade_impact_claim_records (claim_subject_ref, claim_type, created_at desc);

alter table public.moral_trade_impact_claim_methodology_policies enable row level security;
alter table public.moral_trade_impact_claim_records enable row level security;
