create table if not exists public.moral_trade_matching_clearing_execution_records (
  id uuid primary key default gen_random_uuid(),
  owner_profile_id uuid not null references public.profiles (id) on delete cascade,
  execution_kind text not null check (execution_kind in ('evaluation', 'replay_check')),
  flow_type text not null check (
    flow_type in (
      'donation_offset_batch',
      'pledge_swap_preview',
      'broad_match_candidate',
      'public_goods_round'
    )
  ),
  execution_status text not null check (execution_status in ('pass', 'blocked')),
  requires_payable_transition_bool boolean not null default false,
  requires_reliance_bearing_transition_bool boolean not null default false,
  requires_lock_proposal_bool boolean not null default false,
  run_count integer not null default 0 check (run_count >= 0),
  lock_proposal_count integer not null default 0 check (lock_proposal_count >= 0),
  execution_input_json jsonb not null,
  evaluation_result_json jsonb not null,
  replay_input_hash text check (replay_input_hash is null or replay_input_hash ~ '^sha256:[a-f0-9]{64}$'),
  replay_result_hash text check (replay_result_hash is null or replay_result_hash ~ '^sha256:[a-f0-9]{64}$'),
  deterministic_replay_bool boolean not null default false,
  blocker_codes text[] not null default '{}',
  user_facing_blocker_categories text[] not null default '{}',
  contract_version text not null,
  validator_version text not null,
  evaluation_hash text not null check (evaluation_hash ~ '^sha256:[a-f0-9]{64}$'),
  idempotency_key text not null,
  creates_lock_proposal_bool boolean not null default false,
  payable_transition_allowed_bool boolean not null default false,
  reliance_bearing_transition_allowed_bool boolean not null default false,
  superseded_by uuid references public.moral_trade_matching_clearing_execution_records (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  check (creates_lock_proposal_bool = false),
  check (payable_transition_allowed_bool = false),
  check (reliance_bearing_transition_allowed_bool = false),
  unique (owner_profile_id, idempotency_key)
);

comment on table public.moral_trade_matching_clearing_execution_records is
  'Append-only user-owned matching-clearing execution and replay audit records. These records store normalized evaluation inputs, deterministic evaluation results, replay hashes, blockers, and result hashes while enforcing that execution records cannot create lock proposals, authorize payment, authorize reliance, or publish public metrics.';

create index if not exists moral_trade_matching_clearing_execution_records_owner_status_idx
  on public.moral_trade_matching_clearing_execution_records (owner_profile_id, execution_status, created_at desc);

create index if not exists moral_trade_matching_clearing_execution_records_flow_idx
  on public.moral_trade_matching_clearing_execution_records (flow_type, execution_kind, execution_status, created_at desc);

create index if not exists moral_trade_matching_clearing_execution_records_hash_idx
  on public.moral_trade_matching_clearing_execution_records (evaluation_hash, created_at desc);

alter table public.moral_trade_matching_clearing_execution_records enable row level security;

drop policy if exists "moral_trade_matching_clearing_execution_records_select_owner"
  on public.moral_trade_matching_clearing_execution_records;
create policy "moral_trade_matching_clearing_execution_records_select_owner"
  on public.moral_trade_matching_clearing_execution_records
  for select
  to authenticated
  using (owner_profile_id = auth.uid());

drop policy if exists "moral_trade_matching_clearing_execution_records_insert_owner"
  on public.moral_trade_matching_clearing_execution_records;
create policy "moral_trade_matching_clearing_execution_records_insert_owner"
  on public.moral_trade_matching_clearing_execution_records
  for insert
  to authenticated
  with check (
    owner_profile_id = auth.uid()
    and creates_lock_proposal_bool = false
    and payable_transition_allowed_bool = false
    and reliance_bearing_transition_allowed_bool = false
  );
