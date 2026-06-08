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
      'ordinary_service_procurement'
    )
  );

create table if not exists public.moral_trade_trade_classification_records (
  id uuid primary key default gen_random_uuid(),
  subject_type text not null check (
    subject_type in (
      'donation_offset',
      'pledge_swap',
      'compensated_moral_action',
      'common_ground_budget',
      'public_goods_round',
      'cleared_trade_agreement'
    )
  ),
  subject_ref text not null,
  trade_classification text not null check (
    trade_classification in (
      'pure_moral_trade',
      'mixed_moral_trade',
      'moral_public_good_coalition',
      'ordinary_donation_or_matching',
      'ordinary_service_or_procurement',
      'rejected_threat_or_externality'
    )
  ),
  classification_state text not null default 'draft' check (
    classification_state in ('draft', 'previewed', 'reviewed', 'metrics_excluded', 'blocked', 'stale', 'superseded')
  ),
  metrics_eligibility text not null default 'manual_review' check (
    metrics_eligibility in ('eligible_for_moral_trade_metrics', 'excluded_ordinary', 'excluded_rejected', 'manual_review')
  ),
  policy_snapshot_id uuid not null references public.moral_trade_policy_snapshots (id) on delete restrict,
  payer_moral_reason_hash text check (payer_moral_reason_hash is null or payer_moral_reason_hash ~ '^sha256:[a-f0-9]{64}$'),
  performer_counterfactual_acceptance_state text not null default 'not_recorded' check (
    performer_counterfactual_acceptance_state in ('not_recorded', 'says_would_not_without_compensation', 'says_would_anyway', 'unclear', 'manual_review')
  ),
  ordinary_service_procurement_review_state text not null default 'under_review' check (
    ordinary_service_procurement_review_state in ('not_required', 'under_review', 'ordinary_service_blocking', 'non_blocking', 'manual_review')
  ),
  moral_trade_classification_rationale_hash text not null check (moral_trade_classification_rationale_hash ~ '^sha256:[a-f0-9]{64}$'),
  terms_state text not null default 'draft' check (
    terms_state in ('draft', 'previewed', 'locked', 'blocked', 'superseded')
  ),
  exact_action_frozen_bool boolean not null default false,
  compensation_terms_frozen_bool boolean not null default false,
  evidence_burden_frozen_bool boolean not null default false,
  review_period_frozen_bool boolean not null default false,
  exit_remedy_rule_frozen_bool boolean not null default false,
  public_badge_exposed_bool boolean not null default false,
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  expires_at timestamptz,
  superseded_by uuid references public.moral_trade_trade_classification_records (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (
    trade_classification not in ('ordinary_donation_or_matching', 'ordinary_service_or_procurement')
    or metrics_eligibility = 'excluded_ordinary'
  ),
  check (
    trade_classification <> 'rejected_threat_or_externality'
    or metrics_eligibility = 'excluded_rejected'
  ),
  check (
    subject_type <> 'compensated_moral_action'
    or trade_classification = 'mixed_moral_trade'
    or classification_state in ('draft', 'previewed', 'blocked', 'superseded')
  ),
  check (
    trade_classification <> 'mixed_moral_trade'
    or (
      payer_moral_reason_hash is not null
      and performer_counterfactual_acceptance_state = 'says_would_not_without_compensation'
      and ordinary_service_procurement_review_state = 'non_blocking'
    )
  )
);

comment on table public.moral_trade_trade_classification_records is
  'First-class trade_classification records. Classification is an implementation guard, not a public moral status badge; ordinary donations, same-view matching, and ordinary service/procurement are excluded from moral-trade-specific metrics.';

create table if not exists public.moral_trade_compensated_action_terms (
  id uuid primary key default gen_random_uuid(),
  trade_classification_record_id uuid not null references public.moral_trade_trade_classification_records (id) on delete cascade,
  payer_profile_hash text not null check (payer_profile_hash ~ '^sha256:[a-f0-9]{64}$'),
  performer_profile_hash text not null check (performer_profile_hash ~ '^sha256:[a-f0-9]{64}$'),
  exact_action_summary_hash text not null check (exact_action_summary_hash ~ '^sha256:[a-f0-9]{64}$'),
  compensation_terms_hash text not null check (compensation_terms_hash ~ '^sha256:[a-f0-9]{64}$'),
  evidence_burden_hash text not null check (evidence_burden_hash ~ '^sha256:[a-f0-9]{64}$'),
  review_period_start_at timestamptz,
  review_period_end_at timestamptz,
  exit_remedy_rule_hash text not null check (exit_remedy_rule_hash ~ '^sha256:[a-f0-9]{64}$'),
  terms_state text not null default 'draft' check (
    terms_state in ('draft', 'previewed', 'locked', 'blocked', 'superseded')
  ),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (
    terms_state <> 'locked'
    or (
      review_period_start_at is not null
      and review_period_end_at is not null
      and review_period_end_at > review_period_start_at
    )
  )
);

comment on table public.moral_trade_compensated_action_terms is
  'Frozen compensated moral-action terms: payer, performer, exact action, compensation, evidence burden, review period, and exit/remedy rule hashes before reliance-bearing lock.';

create table if not exists public.moral_trade_ordinary_service_procurement_reviews (
  id uuid primary key default gen_random_uuid(),
  trade_classification_record_id uuid not null references public.moral_trade_trade_classification_records (id) on delete cascade,
  review_state text not null default 'under_review' check (
    review_state in ('not_required', 'under_review', 'ordinary_service_blocking', 'non_blocking', 'manual_review')
  ),
  policy_snapshot_id uuid not null references public.moral_trade_policy_snapshots (id) on delete restrict,
  reviewer_decision_id uuid references public.moral_trade_review_decisions (id) on delete set null,
  rationale_hash text not null check (rationale_hash ~ '^sha256:[a-f0-9]{64}$'),
  ordinary_market_signal_bool boolean not null default false,
  payer_moral_aim_necessary_bool boolean not null default false,
  moral_prudential_asymmetry_bool boolean not null default false,
  reviewed_at timestamptz,
  expires_at timestamptz,
  superseded_by uuid references public.moral_trade_ordinary_service_procurement_reviews (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  check (
    review_state <> 'non_blocking'
    or (
      payer_moral_aim_necessary_bool = true
      and moral_prudential_asymmetry_bool = true
      and reviewed_at is not null
    )
  ),
  check (
    review_state <> 'ordinary_service_blocking'
    or ordinary_market_signal_bool = true
  )
);

comment on table public.moral_trade_ordinary_service_procurement_reviews is
  'Ordinary-service/procurement review records. If the same transaction would exist as ordinary service, procurement, or same-view matching without moral/prudential asymmetry, it is excluded from moral-trade-specific metrics.';

create index if not exists moral_trade_trade_classification_records_subject_idx
  on public.moral_trade_trade_classification_records (subject_type, subject_ref, trade_classification, classification_state, created_at desc);
create index if not exists moral_trade_trade_classification_records_policy_idx
  on public.moral_trade_trade_classification_records (policy_snapshot_id, classification_state, reviewed_at desc);
create index if not exists moral_trade_compensated_action_terms_classification_idx
  on public.moral_trade_compensated_action_terms (trade_classification_record_id, terms_state);
create index if not exists moral_trade_ordinary_service_reviews_state_idx
  on public.moral_trade_ordinary_service_procurement_reviews (trade_classification_record_id, review_state, reviewed_at desc);

alter table public.moral_trade_trade_classification_records enable row level security;
alter table public.moral_trade_compensated_action_terms enable row level security;
alter table public.moral_trade_ordinary_service_procurement_reviews enable row level security;
