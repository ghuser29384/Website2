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
      'private_exchange_rate_quote'
    )
  );

create table if not exists public.moral_trade_private_exchange_rate_quote_records (
  id uuid primary key default gen_random_uuid(),
  policy_snapshot_id uuid not null references public.moral_trade_policy_snapshots (id) on delete restrict,
  subject_type text not null check (
    subject_type in (
      'offset_offer',
      'pledge_swap_offer',
      'matched_trade_lock_proposal',
      'cleared_trade_agreement',
      'bargaining_round_record'
    )
  ),
  subject_id text not null,
  participant_id_hash text not null check (participant_id_hash ~ '^sha256:[a-f0-9]{64}$'),
  private_exchange_rate_quote_policy_ref text not null,
  policy_status text not null default 'missing' check (
    policy_status in ('resolved_immutable', 'missing', 'mutable', 'stale', 'superseded')
  ),
  quote_type text not null check (
    quote_type in (
      'clearing_ratio_bound',
      'side_payment_bound',
      'counterpart_volume_bound',
      'action_money_tradeoff',
      'empirical_effectiveness_tradeoff',
      'manual_review'
    )
  ),
  private_quote_terms_hash text not null check (private_quote_terms_hash ~ '^sha256:[a-f0-9]{64}$'),
  acceptable_min_bps integer not null check (acceptable_min_bps >= 0),
  acceptable_max_bps integer not null check (acceptable_max_bps >= 0),
  settlement_currency text check (settlement_currency is null or settlement_currency ~ '^[A-Z]{3}$'),
  disclosure_scope text not null default 'participant_only' check (
    disclosure_scope in (
      'participant_only',
      'reviewer_only',
      'counterparty_band_only',
      'public_suppressed'
    )
  ),
  public_moral_price_prohibited_bool boolean not null default true,
  public_cause_price_published_bool boolean not null default false,
  global_exchange_rate_published_bool boolean not null default false,
  public_effectiveness_comparison_published_bool boolean not null default false,
  moral_value_inference_published_bool boolean not null default false,
  exact_counterparty_quote_disclosed_bool boolean not null default false,
  raw_private_terms_public_bool boolean not null default false,
  quote_state text not null default 'draft' check (
    quote_state in ('draft', 'active', 'locked', 'expired', 'superseded', 'withdrawn')
  ),
  reviewer_decision_ref text,
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (acceptable_min_bps <= acceptable_max_bps),
  check (
    quote_type not in ('side_payment_bound', 'action_money_tradeoff')
    or settlement_currency is not null
  ),
  check (
    quote_state not in ('active', 'locked')
    or (
      policy_status = 'resolved_immutable'
      and length(trim(private_exchange_rate_quote_policy_ref)) > 0
      and public_moral_price_prohibited_bool
      and not public_cause_price_published_bool
      and not global_exchange_rate_published_bool
      and not public_effectiveness_comparison_published_bool
      and not moral_value_inference_published_bool
      and not exact_counterparty_quote_disclosed_bool
      and not raw_private_terms_public_bool
      and reviewer_decision_ref is not null
      and reviewed_at is not null
    )
  )
);

comment on table public.moral_trade_private_exchange_rate_quote_records is
  'First-class private exchange-rate quote records for participant-owned ratio bounds, side-payment bounds, counterpart-volume bounds, and implied tradeoffs. Public surfaces may report that trades cleared within participant bounds but cannot publish cause prices, global moral exchange rates, public effectiveness comparisons, exact willingness-to-trade terms, or inferred moral values.';

create index if not exists moral_trade_private_exchange_rate_subject_idx
  on public.moral_trade_private_exchange_rate_quote_records (subject_type, subject_id, quote_state, updated_at desc);

create index if not exists moral_trade_private_exchange_rate_participant_idx
  on public.moral_trade_private_exchange_rate_quote_records (participant_id_hash, quote_type, quote_state);

create index if not exists moral_trade_private_exchange_rate_policy_idx
  on public.moral_trade_private_exchange_rate_quote_records (policy_snapshot_id, policy_status, quote_state);

alter table public.moral_trade_private_exchange_rate_quote_records enable row level security;
