create table if not exists public.moral_trade_production_readiness_enforcement_records (
  id uuid primary key default gen_random_uuid(),
  owner_profile_id uuid not null references public.profiles (id) on delete cascade,
  gate text not null check (
    gate in (
      'sandbox_calculation_preview',
      'real_money_capture',
      'payout_release',
      'round_close',
      'public_money_metric_release',
      'privacy_disclosure',
      'release_gate_promotion',
      'non_emergency_privileged_change'
    )
  ),
  enforcement_status text not null check (enforcement_status in ('pass', 'blocked')),
  required_control_count integer not null default 0 check (required_control_count >= 0),
  passing_control_count integer not null default 0 check (passing_control_count >= 0),
  record_count integer not null default 0 check (record_count >= 0),
  blocker_count integer not null default 0 check (blocker_count >= 0),
  enforcement_input_json jsonb not null,
  evaluation_result_json jsonb not null,
  blocker_codes text[] not null default '{}',
  user_facing_blocker_categories text[] not null default '{}',
  contract_version text not null,
  validator_version text not null,
  evaluation_hash text not null check (evaluation_hash ~ '^sha256:[a-f0-9]{64}$'),
  idempotency_key text not null,
  sandbox_calculation_preview_allowed_bool boolean not null default false,
  real_money_capture_allowed_bool boolean not null default false,
  payout_release_allowed_bool boolean not null default false,
  round_close_allowed_bool boolean not null default false,
  public_money_metric_release_allowed_bool boolean not null default false,
  privacy_disclosure_allowed_bool boolean not null default false,
  release_gate_promotion_allowed_bool boolean not null default false,
  non_emergency_privileged_change_allowed_bool boolean not null default false,
  superseded_by uuid references public.moral_trade_production_readiness_enforcement_records (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  check (passing_control_count <= required_control_count),
  check (record_count <= 64),
  check (sandbox_calculation_preview_allowed_bool = false),
  check (real_money_capture_allowed_bool = false),
  check (payout_release_allowed_bool = false),
  check (round_close_allowed_bool = false),
  check (public_money_metric_release_allowed_bool = false),
  check (privacy_disclosure_allowed_bool = false),
  check (release_gate_promotion_allowed_bool = false),
  check (non_emergency_privileged_change_allowed_bool = false),
  unique (owner_profile_id, idempotency_key)
);

comment on table public.moral_trade_production_readiness_enforcement_records is
  'Append-only user-owned production-readiness enforcement records. A record stores normalized operational-control input, deterministic evaluation result, blockers, and evaluation hash while enforcing that enforcement records cannot authorize sandbox preview, money capture, payout release, round close, public money metric release, privacy disclosure, release-gate promotion, or non-emergency privileged change.';

create index if not exists mt_production_readiness_enforce_owner_status_idx
  on public.moral_trade_production_readiness_enforcement_records (owner_profile_id, enforcement_status, created_at desc);

create index if not exists mt_production_readiness_enforce_gate_idx
  on public.moral_trade_production_readiness_enforcement_records (gate, enforcement_status, created_at desc);

create index if not exists mt_production_readiness_enforce_hash_idx
  on public.moral_trade_production_readiness_enforcement_records (evaluation_hash, created_at desc);

alter table public.moral_trade_production_readiness_enforcement_records enable row level security;

drop policy if exists "mt_production_readiness_enforce_select_owner"
  on public.moral_trade_production_readiness_enforcement_records;
create policy "mt_production_readiness_enforce_select_owner"
  on public.moral_trade_production_readiness_enforcement_records
  for select
  to authenticated
  using (owner_profile_id = auth.uid());

drop policy if exists "mt_production_readiness_enforce_insert_owner"
  on public.moral_trade_production_readiness_enforcement_records;
create policy "mt_production_readiness_enforce_insert_owner"
  on public.moral_trade_production_readiness_enforcement_records
  for insert
  to authenticated
  with check (
    owner_profile_id = auth.uid()
    and sandbox_calculation_preview_allowed_bool = false
    and real_money_capture_allowed_bool = false
    and payout_release_allowed_bool = false
    and round_close_allowed_bool = false
    and public_money_metric_release_allowed_bool = false
    and privacy_disclosure_allowed_bool = false
    and release_gate_promotion_allowed_bool = false
    and non_emergency_privileged_change_allowed_bool = false
  );
