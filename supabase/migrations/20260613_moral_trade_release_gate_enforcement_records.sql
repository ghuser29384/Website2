create table if not exists public.moral_trade_release_gate_enforcement_records (
  id uuid primary key default gen_random_uuid(),
  owner_profile_id uuid not null references public.profiles (id) on delete cascade,
  gate_id text not null,
  stage text not null check (
    stage in (
      'public_goods_preview',
      'donation_offset_payable',
      'pledge_swap_reliance_manual_pilot',
      'capped_real_money_release',
      'public_metric_release'
    )
  ),
  enforcement_status text not null check (enforcement_status in ('pass', 'blocked')),
  policy_snapshot_bundle_status text not null check (
    policy_snapshot_bundle_status in ('resolved_immutable', 'missing', 'mutable', 'stale', 'superseded')
  ),
  state_interpretation_policy_status text not null check (
    state_interpretation_policy_status in ('resolved_immutable', 'missing', 'mutable', 'stale', 'superseded')
  ),
  feature_flag_enabled_bool boolean not null default false,
  emergency_paused_bool boolean not null default false,
  required_requirement_count integer not null default 0 check (required_requirement_count >= 0),
  inactive_requirement_count integer not null default 0 check (inactive_requirement_count >= 0),
  passed_requirement_count integer not null default 0 check (passed_requirement_count >= 0),
  not_required_requirement_count integer not null default 0 check (not_required_requirement_count >= 0),
  waived_requirement_count integer not null default 0 check (waived_requirement_count >= 0),
  result_count integer not null default 0 check (result_count >= 0),
  blocker_count integer not null default 0 check (blocker_count >= 0),
  enforcement_input_json jsonb not null,
  evaluation_result_json jsonb not null,
  blocker_codes text[] not null default '{}',
  contract_version text not null,
  validator_version text not null,
  evaluation_hash text not null check (evaluation_hash ~ '^sha256:[a-f0-9]{64}$'),
  idempotency_key text not null,
  payable_allowed_bool boolean not null default false,
  reliance_bearing_allowed_bool boolean not null default false,
  public_metric_publication_allowed_bool boolean not null default false,
  release_gate_promotion_allowed_bool boolean not null default false,
  superseded_by uuid references public.moral_trade_release_gate_enforcement_records (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  check (passed_requirement_count <= result_count),
  check (not_required_requirement_count <= result_count),
  check (waived_requirement_count <= result_count),
  check (result_count <= 160),
  check (payable_allowed_bool = false),
  check (reliance_bearing_allowed_bool = false),
  check (public_metric_publication_allowed_bool = false),
  check (release_gate_promotion_allowed_bool = false),
  unique (owner_profile_id, idempotency_key)
);

comment on table public.moral_trade_release_gate_enforcement_records is
  'Append-only user-owned release-gate enforcement records. A record stores normalized gate input, requirement-result evaluation, blockers, and evaluation hash while enforcing that enforcement records cannot authorize payable, reliance-bearing, public-metric, or release-gate-promotion state.';

create index if not exists mt_release_gate_enforce_owner_status_idx
  on public.moral_trade_release_gate_enforcement_records (owner_profile_id, enforcement_status, created_at desc);

create index if not exists mt_release_gate_enforce_stage_status_idx
  on public.moral_trade_release_gate_enforcement_records (stage, enforcement_status, created_at desc);

create index if not exists mt_release_gate_enforce_hash_idx
  on public.moral_trade_release_gate_enforcement_records (evaluation_hash, created_at desc);

alter table public.moral_trade_release_gate_enforcement_records enable row level security;

drop policy if exists "mt_release_gate_enforce_select_owner"
  on public.moral_trade_release_gate_enforcement_records;
create policy "mt_release_gate_enforce_select_owner"
  on public.moral_trade_release_gate_enforcement_records
  for select
  to authenticated
  using (owner_profile_id = auth.uid());

drop policy if exists "mt_release_gate_enforce_insert_owner"
  on public.moral_trade_release_gate_enforcement_records;
create policy "mt_release_gate_enforce_insert_owner"
  on public.moral_trade_release_gate_enforcement_records
  for insert
  to authenticated
  with check (
    owner_profile_id = auth.uid()
    and payable_allowed_bool = false
    and reliance_bearing_allowed_bool = false
    and public_metric_publication_allowed_bool = false
    and release_gate_promotion_allowed_bool = false
  );
