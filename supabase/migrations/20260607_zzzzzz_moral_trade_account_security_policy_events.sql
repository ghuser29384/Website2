alter table public.moral_trade_account_security_policies
  add column if not exists policy_version text not null default 'moral-trade-account-security-policy-v0.1-2026-06',
  add column if not exists applies_to_action text not null default 'participant_confirmation',
  add column if not exists step_up_required_bool boolean not null default true,
  add column if not exists trusted_device_required_bool boolean not null default false,
  add column if not exists cooldown_hours integer not null default 0,
  add column if not exists risk_signals_json jsonb not null default '[]'::jsonb,
  add column if not exists high_risk_behavior text not null default 'step_up',
  add column if not exists account_recovery_behavior text not null default 'manual_review',
  add column if not exists reviewer_decision_ref uuid references public.moral_trade_review_decisions (id) on delete set null,
  add column if not exists updated_at timestamptz not null default timezone('utc', now());

alter table public.moral_trade_account_security_policies
  drop constraint if exists moral_trade_account_security_policies_applies_to_action_check;

alter table public.moral_trade_account_security_policies
  add constraint moral_trade_account_security_policies_applies_to_action_check
  check (
    applies_to_action in (
      'login',
      'payment_method_change',
      'participant_confirmation',
      'payment_authorization',
      'payment_capture',
      'payout_release',
      'privacy_grant',
      'identity_artifact_change',
      'contact_introduction',
      'account_recovery',
      'email_change',
      'mfa_change',
      'exposure_increase',
      'reliance_bearing_agreement'
    )
  );

alter table public.moral_trade_account_security_policies
  drop constraint if exists moral_trade_account_security_policies_high_risk_behavior_check;

alter table public.moral_trade_account_security_policies
  add constraint moral_trade_account_security_policies_high_risk_behavior_check
  check (high_risk_behavior in ('block', 'step_up', 'cooldown', 'manual_review'));

alter table public.moral_trade_account_security_policies
  drop constraint if exists moral_trade_account_security_policies_account_recovery_behavior_check;

alter table public.moral_trade_account_security_policies
  add constraint moral_trade_account_security_policies_account_recovery_behavior_check
  check (account_recovery_behavior in ('block_real_money', 'manual_review', 'limited_access'));

alter table public.moral_trade_account_security_policies
  drop constraint if exists moral_trade_account_security_policies_cooldown_hours_check;

alter table public.moral_trade_account_security_policies
  add constraint moral_trade_account_security_policies_cooldown_hours_check
  check (cooldown_hours >= 0);

alter table public.moral_trade_account_security_events
  add column if not exists participant_id_hash text not null default 'sha256:0000000000000000000000000000000000000000000000000000000000000000',
  add column if not exists account_security_policy_ref uuid references public.moral_trade_account_security_policies (id) on delete restrict,
  add column if not exists risk_state text not null default 'manual_review',
  add column if not exists action_subject_type text not null default 'participant_confirmation_record',
  add column if not exists action_subject_id text not null default 'unknown',
  add column if not exists notice_ref text,
  add column if not exists trusted_device_status text not null default 'missing',
  add column if not exists reviewer_decision_ref uuid references public.moral_trade_review_decisions (id) on delete set null,
  add column if not exists updated_at timestamptz not null default timezone('utc', now());

alter table public.moral_trade_account_security_events
  drop constraint if exists moral_trade_account_security_events_event_type_check;

alter table public.moral_trade_account_security_events
  add constraint moral_trade_account_security_events_event_type_check
  check (
    event_type in (
      'login',
      'password_change',
      'new_device',
      'session_anomaly',
      'payment_method_change',
      'email_change',
      'mfa_change',
      'account_recovery',
      'identity_artifact_change',
      'participant_identity_change',
      'step_up_passed',
      'step_up_failed',
      'manual_review'
    )
  );

alter table public.moral_trade_account_security_events
  drop constraint if exists moral_trade_account_security_events_risk_state_check;

alter table public.moral_trade_account_security_events
  add constraint moral_trade_account_security_events_risk_state_check
  check (risk_state in ('low', 'medium', 'high', 'blocked', 'manual_review', 'stale'));

alter table public.moral_trade_account_security_events
  drop constraint if exists moral_trade_account_security_events_action_subject_type_check;

alter table public.moral_trade_account_security_events
  add constraint moral_trade_account_security_events_action_subject_type_check
  check (
    action_subject_type in (
      'common_ground_budget',
      'offset_offer',
      'pledge_swap_offer',
      'cleared_trade_agreement',
      'privacy_grant',
      'payment_event',
      'payout_milestone',
      'contact_interaction_record',
      'participant_confirmation_record',
      'participant_eligibility_record'
    )
  );

alter table public.moral_trade_account_security_events
  drop constraint if exists moral_trade_account_security_events_trusted_device_status_check;

alter table public.moral_trade_account_security_events
  add constraint moral_trade_account_security_events_trusted_device_status_check
  check (
    trusted_device_status in (
      'passed',
      'not_required_for_stage',
      'missing',
      'failed',
      'stale',
      'under_review'
    )
  );

alter table public.moral_trade_account_security_events
  drop constraint if exists moral_trade_account_security_events_participant_id_hash_check;

alter table public.moral_trade_account_security_events
  add constraint moral_trade_account_security_events_participant_id_hash_check
  check (participant_id_hash ~ '^sha256:[a-f0-9]{64}$');

create index if not exists moral_trade_account_security_policies_action_idx
  on public.moral_trade_account_security_policies (applies_to_action, status, created_at desc);

create index if not exists moral_trade_account_security_events_subject_idx
  on public.moral_trade_account_security_events (action_subject_type, action_subject_id, risk_state, created_at desc);

create index if not exists moral_trade_account_security_events_participant_hash_idx
  on public.moral_trade_account_security_events (participant_id_hash, risk_state, created_at desc);
