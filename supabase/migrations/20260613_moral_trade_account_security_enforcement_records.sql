create table if not exists public.moral_trade_account_security_enforcement_records (
  id uuid primary key default gen_random_uuid(),
  owner_profile_id uuid not null references public.profiles (id) on delete cascade,
  action text not null check (
    action in (
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
  ),
  enforcement_status text not null check (enforcement_status in ('pass', 'blocked')),
  required_policy_count integer not null default 0 check (required_policy_count >= 0),
  policy_count integer not null default 0 check (policy_count >= 0),
  event_count integer not null default 0 check (event_count >= 0),
  high_risk_event_count integer not null default 0 check (high_risk_event_count >= 0),
  remediated_high_risk_event_count integer not null default 0 check (remediated_high_risk_event_count >= 0),
  blocker_count integer not null default 0 check (blocker_count >= 0),
  enforcement_input_json jsonb not null,
  evaluation_result_json jsonb not null,
  blocker_codes text[] not null default '{}',
  user_facing_blocker_categories text[] not null default '{}',
  contract_version text not null,
  validator_version text not null,
  evaluation_hash text not null check (evaluation_hash ~ '^sha256:[a-f0-9]{64}$'),
  idempotency_key text not null,
  participant_confirmation_allowed_bool boolean not null default false,
  payment_authorization_allowed_bool boolean not null default false,
  payment_capture_allowed_bool boolean not null default false,
  payout_release_allowed_bool boolean not null default false,
  privacy_grant_allowed_bool boolean not null default false,
  contact_introduction_allowed_bool boolean not null default false,
  exposure_increase_allowed_bool boolean not null default false,
  reliance_bearing_agreement_allowed_bool boolean not null default false,
  release_gate_promotion_allowed_bool boolean not null default false,
  superseded_by uuid references public.moral_trade_account_security_enforcement_records (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  check (remediated_high_risk_event_count <= high_risk_event_count),
  check (policy_count <= 32),
  check (event_count <= 96),
  check (participant_confirmation_allowed_bool = false),
  check (payment_authorization_allowed_bool = false),
  check (payment_capture_allowed_bool = false),
  check (payout_release_allowed_bool = false),
  check (privacy_grant_allowed_bool = false),
  check (contact_introduction_allowed_bool = false),
  check (exposure_increase_allowed_bool = false),
  check (reliance_bearing_agreement_allowed_bool = false),
  check (release_gate_promotion_allowed_bool = false),
  unique (owner_profile_id, idempotency_key)
);

comment on table public.moral_trade_account_security_enforcement_records is
  'Append-only user-owned account-security enforcement records. A record stores normalized private policy/event summaries, deterministic evaluation result, blockers, and evaluation hash while enforcing that enforcement records cannot authorize participant confirmation, payment authorization, payment capture, payout release, privacy grants, contact introductions, exposure increases, reliance-bearing agreements, or release-gate promotion.';

create index if not exists mt_account_security_enforce_owner_status_idx
  on public.moral_trade_account_security_enforcement_records (owner_profile_id, enforcement_status, created_at desc);

create index if not exists mt_account_security_enforce_action_status_idx
  on public.moral_trade_account_security_enforcement_records (action, enforcement_status, created_at desc);

create index if not exists mt_account_security_enforce_hash_idx
  on public.moral_trade_account_security_enforcement_records (evaluation_hash, created_at desc);

alter table public.moral_trade_account_security_enforcement_records enable row level security;

drop policy if exists "mt_account_security_enforce_select_owner"
  on public.moral_trade_account_security_enforcement_records;
create policy "mt_account_security_enforce_select_owner"
  on public.moral_trade_account_security_enforcement_records
  for select
  to authenticated
  using (owner_profile_id = auth.uid());

drop policy if exists "mt_account_security_enforce_insert_owner"
  on public.moral_trade_account_security_enforcement_records;
create policy "mt_account_security_enforce_insert_owner"
  on public.moral_trade_account_security_enforcement_records
  for insert
  to authenticated
  with check (
    owner_profile_id = auth.uid()
    and participant_confirmation_allowed_bool = false
    and payment_authorization_allowed_bool = false
    and payment_capture_allowed_bool = false
    and payout_release_allowed_bool = false
    and privacy_grant_allowed_bool = false
    and contact_introduction_allowed_bool = false
    and exposure_increase_allowed_bool = false
    and reliance_bearing_agreement_allowed_bool = false
    and release_gate_promotion_allowed_bool = false
  );
