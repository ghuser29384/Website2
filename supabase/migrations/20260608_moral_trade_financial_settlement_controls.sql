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
      'payout_milestone'
    )
  );

create table if not exists public.moral_trade_platform_fee_policies (
  id uuid primary key default gen_random_uuid(),
  policy_snapshot_id uuid not null references public.moral_trade_policy_snapshots (id) on delete restrict,
  policy_version text not null default 'moral-trade-platform-fee-v0.1-2026-06',
  surface text not null check (
    surface in ('public_preview', 'matched_trade_lock', 'payment_authorization', 'payment_capture', 'payout_milestone_release', 'public_metric_publication')
  ),
  status text not null default 'under_review' check (
    status in ('passed', 'not_required_for_stage', 'missing', 'under_review', 'blocked', 'stale', 'superseded')
  ),
  fee_disclosure_required_bool boolean not null default true,
  moral_volume_exclusion_required_bool boolean not null default true,
  qf_signal_exclusion_required_bool boolean not null default true,
  threshold_progress_exclusion_required_bool boolean not null default true,
  impact_claim_exclusion_required_bool boolean not null default true,
  policy_hash text not null check (policy_hash ~ '^sha256:[a-f0-9]{64}$'),
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  superseded_by uuid references public.moral_trade_platform_fee_policies (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (policy_snapshot_id, surface),
  check (fee_disclosure_required_bool = true),
  check (moral_volume_exclusion_required_bool = true),
  check (qf_signal_exclusion_required_bool = true),
  check (threshold_progress_exclusion_required_bool = true),
  check (impact_claim_exclusion_required_bool = true)
);

comment on table public.moral_trade_platform_fee_policies is
  'Frozen platform-fee policies. Fees must be displayed separately and excluded from moral-trade volume, threshold progress, QF signal, and recipient-impact claims.';

create table if not exists public.moral_trade_platform_fee_disclosures (
  id uuid primary key default gen_random_uuid(),
  platform_fee_policy_ref uuid not null references public.moral_trade_platform_fee_policies (id) on delete restrict,
  subject_type text not null check (
    subject_type in ('donation_offset', 'pledge_swap', 'common_ground_budget', 'public_goods_round', 'payment_event', 'payout_milestone', 'release_gate')
  ),
  subject_ref text not null,
  status text not null default 'under_review' check (
    status in ('passed', 'not_required_for_stage', 'missing', 'under_review', 'blocked', 'stale', 'superseded')
  ),
  amount_cents integer not null default 0 check (amount_cents >= 0),
  currency text not null default 'usd' check (currency ~ '^[a-z]{3}$'),
  currency_status text not null default 'missing' check (
    currency_status in ('explicit_currency', 'inherits_settlement_currency', 'not_required_for_stage', 'missing', 'currency_mismatch', 'stale')
  ),
  fee_disclosure_status text not null default 'missing' check (
    fee_disclosure_status in ('displayed_separately', 'not_required_for_stage', 'missing', 'bundled_into_moral_volume', 'stale')
  ),
  metric_exclusion_status text not null default 'missing' check (
    metric_exclusion_status in ('excluded', 'not_required_for_stage', 'missing', 'included_in_moral_volume', 'included_in_qf_signal', 'included_in_threshold_progress', 'included_in_impact_claim', 'stale')
  ),
  fee_amount_hash text not null check (fee_amount_hash ~ '^sha256:[a-f0-9]{64}$'),
  display_snapshot_hash text not null check (display_snapshot_hash ~ '^sha256:[a-f0-9]{64}$'),
  participant_specific_fee_payment_record_public_bool boolean not null default false,
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  expires_at timestamptz,
  superseded_by uuid references public.moral_trade_platform_fee_disclosures (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (participant_specific_fee_payment_record_public_bool = false),
  check (
    status <> 'passed'
    or (
      currency_status in ('explicit_currency', 'inherits_settlement_currency', 'not_required_for_stage')
      and fee_disclosure_status in ('displayed_separately', 'not_required_for_stage')
      and metric_exclusion_status in ('excluded', 'not_required_for_stage')
      and reviewed_at is not null
    )
  )
);

comment on table public.moral_trade_platform_fee_disclosures is
  'First-class platform-fee disclosure records. A fee cannot be bundled into moral volume, threshold progress, QF signal, or recipient-impact claims.';

create table if not exists public.moral_trade_fx_policies (
  id uuid primary key default gen_random_uuid(),
  policy_snapshot_id uuid not null references public.moral_trade_policy_snapshots (id) on delete restrict,
  policy_version text not null default 'moral-trade-fx-v0.1-2026-06',
  surface text not null check (
    surface in ('public_preview', 'matched_trade_lock', 'payment_authorization', 'payment_capture', 'payout_milestone_release', 'public_metric_publication')
  ),
  status text not null default 'under_review' check (
    status in ('passed', 'not_required_for_stage', 'missing', 'under_review', 'blocked', 'stale', 'superseded')
  ),
  rate_snapshot_required_bool boolean not null default true,
  spread_disclosure_required_bool boolean not null default true,
  conversion_fee_disclosure_required_bool boolean not null default true,
  metric_exclusion_required_bool boolean not null default true,
  raw_fx_provider_payload_public_bool boolean not null default false,
  policy_hash text not null check (policy_hash ~ '^sha256:[a-f0-9]{64}$'),
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  superseded_by uuid references public.moral_trade_fx_policies (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (policy_snapshot_id, surface),
  check (rate_snapshot_required_bool = true),
  check (spread_disclosure_required_bool = true),
  check (conversion_fee_disclosure_required_bool = true),
  check (metric_exclusion_required_bool = true),
  check (raw_fx_provider_payload_public_bool = false)
);

comment on table public.moral_trade_fx_policies is
  'Frozen FX policies requiring rate snapshots, separate spread/conversion-fee display, metric exclusion, and no public raw provider payloads.';

create table if not exists public.moral_trade_fx_rate_snapshots (
  id uuid primary key default gen_random_uuid(),
  fx_policy_ref uuid not null references public.moral_trade_fx_policies (id) on delete restrict,
  subject_type text not null check (
    subject_type in ('donation_offset', 'pledge_swap', 'common_ground_budget', 'public_goods_round', 'payment_event', 'payout_milestone', 'release_gate')
  ),
  subject_ref text not null,
  status text not null default 'under_review' check (
    status in ('passed', 'not_required_for_stage', 'missing', 'under_review', 'blocked', 'stale', 'superseded')
  ),
  source_currency text not null check (source_currency ~ '^[a-z]{3}$'),
  settlement_currency text not null check (settlement_currency ~ '^[a-z]{3}$'),
  currency_status text not null default 'missing' check (
    currency_status in ('explicit_currency', 'inherits_settlement_currency', 'not_required_for_stage', 'missing', 'currency_mismatch', 'stale')
  ),
  fx_snapshot_status text not null default 'missing' check (
    fx_snapshot_status in ('snapshot_current', 'not_required_for_stage', 'missing', 'expired', 'spread_hidden', 'fee_not_separated', 'stale')
  ),
  fee_disclosure_status text not null default 'missing' check (
    fee_disclosure_status in ('displayed_separately', 'not_required_for_stage', 'missing', 'bundled_into_moral_volume', 'stale')
  ),
  metric_exclusion_status text not null default 'missing' check (
    metric_exclusion_status in ('excluded', 'not_required_for_stage', 'missing', 'included_in_moral_volume', 'included_in_qf_signal', 'included_in_threshold_progress', 'included_in_impact_claim', 'stale')
  ),
  rate_snapshot_hash text not null check (rate_snapshot_hash ~ '^sha256:[a-f0-9]{64}$'),
  spread_bps integer not null default 0 check (spread_bps >= 0),
  conversion_fee_cents integer not null default 0 check (conversion_fee_cents >= 0),
  quoted_at timestamptz not null,
  quote_expires_at timestamptz not null,
  raw_fx_provider_payload_public_bool boolean not null default false,
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  superseded_by uuid references public.moral_trade_fx_rate_snapshots (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (quote_expires_at > quoted_at),
  check (raw_fx_provider_payload_public_bool = false),
  check (
    status <> 'passed'
    or (
      currency_status in ('explicit_currency', 'inherits_settlement_currency', 'not_required_for_stage')
      and fx_snapshot_status in ('snapshot_current', 'not_required_for_stage')
      and fee_disclosure_status in ('displayed_separately', 'not_required_for_stage')
      and metric_exclusion_status in ('excluded', 'not_required_for_stage')
      and reviewed_at is not null
    )
  )
);

comment on table public.moral_trade_fx_rate_snapshots is
  'First-class FX snapshots. FX spreads and conversion fees are displayed separately and excluded from moral metrics before preview, lock, capture, payout, or public metrics.';

create table if not exists public.moral_trade_notification_policies (
  id uuid primary key default gen_random_uuid(),
  policy_snapshot_id uuid not null references public.moral_trade_policy_snapshots (id) on delete restrict,
  policy_version text not null default 'moral-trade-notification-v0.1-2026-06',
  notice_surface text not null check (
    notice_surface in ('material_terms_change', 'challenge_window', 'dispute_deadline', 'renewed_confirmation', 'emergency_pause', 'payout_release_opportunity')
  ),
  status text not null default 'under_review' check (
    status in ('passed', 'not_required_for_stage', 'missing', 'under_review', 'blocked', 'stale', 'superseded')
  ),
  recorded_notice_required_bool boolean not null default true,
  confirmed_delivery_required_bool boolean not null default true,
  rights_loss_without_notice_forbidden_bool boolean not null default true,
  policy_hash text not null check (policy_hash ~ '^sha256:[a-f0-9]{64}$'),
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  superseded_by uuid references public.moral_trade_notification_policies (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (policy_snapshot_id, notice_surface),
  check (recorded_notice_required_bool = true),
  check (confirmed_delivery_required_bool = true),
  check (rights_loss_without_notice_forbidden_bool = true)
);

create table if not exists public.moral_trade_material_notice_records (
  id uuid primary key default gen_random_uuid(),
  notification_policy_ref uuid not null references public.moral_trade_notification_policies (id) on delete restrict,
  subject_type text not null check (
    subject_type in ('donation_offset', 'pledge_swap', 'common_ground_budget', 'public_goods_round', 'payment_event', 'challenge_window', 'payout_milestone', 'release_gate')
  ),
  subject_ref text not null,
  notice_kind text not null check (
    notice_kind in ('material_terms_change', 'challenge_window', 'dispute_deadline', 'renewed_confirmation', 'emergency_pause', 'payout_release_opportunity')
  ),
  status text not null default 'under_review' check (
    status in ('passed', 'not_required_for_stage', 'missing', 'under_review', 'blocked', 'stale', 'superseded')
  ),
  notice_delivery_status text not null default 'missing' check (
    notice_delivery_status in ('delivered_confirmed', 'not_required_for_stage', 'missing', 'failed', 'unconfirmed_channel', 'stale')
  ),
  participant_hash text not null check (participant_hash ~ '^sha256:[a-f0-9]{64}$'),
  counterparty_hash text check (counterparty_hash is null or counterparty_hash ~ '^sha256:[a-f0-9]{64}$'),
  channel_hash text not null check (channel_hash ~ '^sha256:[a-f0-9]{64}$'),
  notice_hash text not null check (notice_hash ~ '^sha256:[a-f0-9]{64}$'),
  delivered_at timestamptz,
  confirmed_at timestamptz,
  rights_loss_allowed_bool boolean not null default false,
  raw_notice_payload_public_bool boolean not null default false,
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  expires_at timestamptz,
  superseded_by uuid references public.moral_trade_material_notice_records (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (rights_loss_allowed_bool = false),
  check (raw_notice_payload_public_bool = false),
  check (
    notice_delivery_status <> 'delivered_confirmed'
    or (delivered_at is not null and confirmed_at is not null)
  ),
  check (
    status <> 'passed'
    or (
      notice_delivery_status in ('delivered_confirmed', 'not_required_for_stage')
      and rights_loss_allowed_bool = false
      and raw_notice_payload_public_bool = false
      and reviewed_at is not null
    )
  )
);

comment on table public.moral_trade_material_notice_records is
  'Recorded material notices for challenge windows, disputes, renewed confirmations, emergency pauses, and payout-release opportunities. Missing or failed notice cannot remove participant rights.';

create table if not exists public.moral_trade_time_authority_policies (
  id uuid primary key default gen_random_uuid(),
  policy_snapshot_id uuid not null references public.moral_trade_policy_snapshots (id) on delete restrict,
  policy_version text not null default 'moral-trade-time-authority-v0.1-2026-06',
  deadline_surface text not null check (
    deadline_surface in ('challenge_window', 'dispute_deadline', 'lock_time', 'confirmation_expiry', 'fx_quote_expiry', 'authorization_expiry', 'cancellation_window', 'release_gate_time_limit')
  ),
  status text not null default 'under_review' check (
    status in ('passed', 'not_required_for_stage', 'missing', 'under_review', 'blocked', 'stale', 'superseded')
  ),
  server_time_required_bool boolean not null default true,
  client_clock_forbidden_bool boolean not null default true,
  mutable_display_time_forbidden_bool boolean not null default true,
  policy_hash text not null check (policy_hash ~ '^sha256:[a-f0-9]{64}$'),
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  superseded_by uuid references public.moral_trade_time_authority_policies (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (policy_snapshot_id, deadline_surface),
  check (server_time_required_bool = true),
  check (client_clock_forbidden_bool = true),
  check (mutable_display_time_forbidden_bool = true)
);

create table if not exists public.moral_trade_deadline_records (
  id uuid primary key default gen_random_uuid(),
  time_authority_policy_ref uuid not null references public.moral_trade_time_authority_policies (id) on delete restrict,
  subject_type text not null check (
    subject_type in ('donation_offset', 'pledge_swap', 'common_ground_budget', 'public_goods_round', 'payment_event', 'challenge_window', 'payout_milestone', 'release_gate')
  ),
  subject_ref text not null,
  deadline_kind text not null check (
    deadline_kind in ('challenge_window', 'dispute_deadline', 'lock_time', 'confirmation_expiry', 'fx_quote_expiry', 'authorization_expiry', 'cancellation_window', 'release_gate_time_limit')
  ),
  status text not null default 'under_review' check (
    status in ('passed', 'not_required_for_stage', 'missing', 'under_review', 'blocked', 'stale', 'superseded')
  ),
  time_authority_status text not null default 'missing' check (
    time_authority_status in ('server_authoritative', 'not_required_for_stage', 'missing', 'client_clock_used', 'unsynchronized_job', 'mutable_display_time', 'stale')
  ),
  server_computed_at timestamptz not null default timezone('utc', now()),
  server_deadline_at timestamptz not null,
  client_clock_used_bool boolean not null default false,
  mutable_display_time_authoritative_bool boolean not null default false,
  deadline_hash text not null check (deadline_hash ~ '^sha256:[a-f0-9]{64}$'),
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  superseded_by uuid references public.moral_trade_deadline_records (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (server_deadline_at > server_computed_at),
  check (client_clock_used_bool = false),
  check (mutable_display_time_authoritative_bool = false),
  check (
    status <> 'passed'
    or (
      time_authority_status in ('server_authoritative', 'not_required_for_stage')
      and client_clock_used_bool = false
      and mutable_display_time_authoritative_bool = false
      and reviewed_at is not null
    )
  )
);

comment on table public.moral_trade_deadline_records is
  'Server-side deadline records for lock times, challenge windows, confirmation expiry, FX quotes, authorizations, cancellation windows, and release-gate time limits.';

create table if not exists public.moral_trade_challenge_window_records (
  id uuid primary key default gen_random_uuid(),
  material_notice_record_id uuid references public.moral_trade_material_notice_records (id) on delete restrict,
  deadline_record_id uuid not null references public.moral_trade_deadline_records (id) on delete restrict,
  subject_type text not null check (
    subject_type in ('donation_offset', 'pledge_swap', 'common_ground_budget', 'public_goods_round', 'payment_event', 'payout_milestone', 'release_gate')
  ),
  subject_ref text not null,
  status text not null default 'under_review' check (
    status in ('passed', 'not_required_for_stage', 'missing', 'under_review', 'blocked', 'stale', 'superseded')
  ),
  challenge_window_status text not null default 'missing' check (
    challenge_window_status in ('open_or_not_required', 'closed_after_notice', 'not_required_for_stage', 'missing', 'expired_without_notice', 'defaulted_against_participant', 'stale')
  ),
  notice_delivery_status text not null default 'missing' check (
    notice_delivery_status in ('delivered_confirmed', 'not_required_for_stage', 'missing', 'failed', 'unconfirmed_channel', 'stale')
  ),
  time_authority_status text not null default 'missing' check (
    time_authority_status in ('server_authoritative', 'not_required_for_stage', 'missing', 'client_clock_used', 'unsynchronized_job', 'mutable_display_time', 'stale')
  ),
  opened_at timestamptz not null,
  closes_at timestamptz not null,
  closed_at timestamptz,
  default_against_participant_bool boolean not null default false,
  participant_right_loss_allowed_bool boolean not null default false,
  challenge_record_hash text not null check (challenge_record_hash ~ '^sha256:[a-f0-9]{64}$'),
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  superseded_by uuid references public.moral_trade_challenge_window_records (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (closes_at > opened_at),
  check (default_against_participant_bool = false),
  check (participant_right_loss_allowed_bool = false),
  check (
    status <> 'passed'
    or (
      challenge_window_status in ('open_or_not_required', 'closed_after_notice', 'not_required_for_stage')
      and notice_delivery_status in ('delivered_confirmed', 'not_required_for_stage')
      and time_authority_status in ('server_authoritative', 'not_required_for_stage')
      and default_against_participant_bool = false
      and participant_right_loss_allowed_bool = false
      and reviewed_at is not null
    )
  )
);

comment on table public.moral_trade_challenge_window_records is
  'First-class challenge-window records. Defaults and timeouts cannot run against a participant from missing notice, failed notice, client clocks, or mutable display strings.';

create table if not exists public.moral_trade_payout_milestone_records (
  id uuid primary key default gen_random_uuid(),
  policy_snapshot_id uuid not null references public.moral_trade_policy_snapshots (id) on delete restrict,
  challenge_window_record_id uuid references public.moral_trade_challenge_window_records (id) on delete restrict,
  subject_type text not null check (
    subject_type in ('donation_offset', 'pledge_swap', 'common_ground_budget', 'public_goods_round', 'payment_event', 'release_gate')
  ),
  subject_ref text not null,
  milestone_ref text not null,
  status text not null default 'under_review' check (
    status in ('passed', 'not_required_for_stage', 'missing', 'under_review', 'blocked', 'stale', 'superseded')
  ),
  amount_cents integer not null check (amount_cents >= 0),
  currency text not null default 'usd' check (currency ~ '^[a-z]{3}$'),
  currency_status text not null default 'missing' check (
    currency_status in ('explicit_currency', 'inherits_settlement_currency', 'not_required_for_stage', 'missing', 'currency_mismatch', 'stale')
  ),
  payout_milestone_status text not null default 'under_review' check (
    payout_milestone_status in ('releasable', 'not_required_for_stage', 'missing', 'under_review', 'blocked', 'destination_mismatch', 'evidence_missing', 'challenge_open', 'stale', 'superseded')
  ),
  evidence_status text not null default 'missing' check (
    evidence_status in ('claim_typed_evidence_passed', 'not_required_for_stage', 'missing', 'under_review', 'failed', 'stale')
  ),
  destination_status text not null default 'missing' check (
    destination_status in ('verified_destination_bound', 'not_required_for_stage', 'missing', 'unverified', 'changed_after_lock', 'stale')
  ),
  challenge_window_status text not null default 'missing' check (
    challenge_window_status in ('open_or_not_required', 'closed_after_notice', 'not_required_for_stage', 'missing', 'expired_without_notice', 'defaulted_against_participant', 'stale')
  ),
  destination_hash text not null check (destination_hash ~ '^sha256:[a-f0-9]{64}$'),
  required_claim_typed_evidence_hash text not null check (required_claim_typed_evidence_hash ~ '^sha256:[a-f0-9]{64}$'),
  reviewer_decision_hash text not null check (reviewer_decision_hash ~ '^sha256:[a-f0-9]{64}$'),
  release_payment_event_hash text check (release_payment_event_hash is null or release_payment_event_hash ~ '^sha256:[a-f0-9]{64}$'),
  payment_credentials_public_bool boolean not null default false,
  raw_evidence_public_bool boolean not null default false,
  private_provider_settlement_public_bool boolean not null default false,
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  released_at timestamptz,
  superseded_by uuid references public.moral_trade_payout_milestone_records (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (subject_type, subject_ref, milestone_ref),
  check (payment_credentials_public_bool = false),
  check (raw_evidence_public_bool = false),
  check (private_provider_settlement_public_bool = false),
  check (
    status <> 'passed'
    or (
      currency_status in ('explicit_currency', 'inherits_settlement_currency', 'not_required_for_stage')
      and payout_milestone_status in ('releasable', 'not_required_for_stage')
      and evidence_status in ('claim_typed_evidence_passed', 'not_required_for_stage')
      and destination_status in ('verified_destination_bound', 'not_required_for_stage')
      and challenge_window_status in ('closed_after_notice', 'not_required_for_stage')
      and payment_credentials_public_bool = false
      and raw_evidence_public_bool = false
      and private_provider_settlement_public_bool = false
      and reviewed_at is not null
    )
  )
);

comment on table public.moral_trade_payout_milestone_records is
  'Staged payout milestone records. Release requires the frozen payout plan, claim-typed evidence, closed or waived challenge window, verified destination, and no public payment credentials or private settlement artifacts.';

create index if not exists moral_trade_platform_fee_policies_surface_idx
  on public.moral_trade_platform_fee_policies (surface, status, created_at desc);

create index if not exists moral_trade_platform_fee_disclosures_subject_idx
  on public.moral_trade_platform_fee_disclosures (subject_type, subject_ref, status);

create index if not exists moral_trade_fx_policies_surface_idx
  on public.moral_trade_fx_policies (surface, status, created_at desc);

create index if not exists moral_trade_fx_rate_snapshots_subject_idx
  on public.moral_trade_fx_rate_snapshots (subject_type, subject_ref, status, quote_expires_at);

create index if not exists moral_trade_notification_policies_surface_idx
  on public.moral_trade_notification_policies (notice_surface, status, created_at desc);

create index if not exists moral_trade_material_notice_subject_idx
  on public.moral_trade_material_notice_records (subject_type, subject_ref, notice_kind, notice_delivery_status);

create index if not exists moral_trade_time_authority_policies_surface_idx
  on public.moral_trade_time_authority_policies (deadline_surface, status, created_at desc);

create index if not exists moral_trade_deadline_records_subject_idx
  on public.moral_trade_deadline_records (subject_type, subject_ref, deadline_kind, server_deadline_at);

create index if not exists moral_trade_challenge_window_subject_idx
  on public.moral_trade_challenge_window_records (subject_type, subject_ref, challenge_window_status, closes_at);

create index if not exists moral_trade_payout_milestone_subject_idx
  on public.moral_trade_payout_milestone_records (subject_type, subject_ref, milestone_ref, payout_milestone_status);

alter table public.moral_trade_platform_fee_policies enable row level security;
alter table public.moral_trade_platform_fee_disclosures enable row level security;
alter table public.moral_trade_fx_policies enable row level security;
alter table public.moral_trade_fx_rate_snapshots enable row level security;
alter table public.moral_trade_notification_policies enable row level security;
alter table public.moral_trade_material_notice_records enable row level security;
alter table public.moral_trade_time_authority_policies enable row level security;
alter table public.moral_trade_deadline_records enable row level security;
alter table public.moral_trade_challenge_window_records enable row level security;
alter table public.moral_trade_payout_milestone_records enable row level security;
