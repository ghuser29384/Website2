create table if not exists public.moral_trade_action_reversibility_enforcement_records (
  id uuid primary key default gen_random_uuid(),
  owner_profile_id uuid not null references public.profiles (id) on delete cascade,
  transition text not null check (
    transition in (
      'draft_preview',
      'matched_trade_lock',
      'payment_capture',
      'performance_start',
      'reliance_bearing_transition',
      'public_metric_publication',
      'release_gate_promotion'
    )
  ),
  enforcement_status text not null check (enforcement_status in ('pass', 'blocked')),
  action_reversibility_required_bool boolean not null default false,
  record_count integer not null default 0 check (record_count >= 0),
  non_blocking_record_count integer not null default 0 check (non_blocking_record_count >= 0),
  high_stakes_or_irreversible_record_count integer not null default 0 check (high_stakes_or_irreversible_record_count >= 0),
  approved_high_stakes_record_count integer not null default 0 check (approved_high_stakes_record_count >= 0),
  enforcement_input_json jsonb not null,
  evaluation_result_json jsonb not null,
  blocker_codes text[] not null default '{}',
  user_facing_blocker_categories text[] not null default '{}',
  contract_version text not null,
  validator_version text not null,
  evaluation_hash text not null check (evaluation_hash ~ '^sha256:[a-f0-9]{64}$'),
  idempotency_key text not null,
  matched_trade_lock_allowed_bool boolean not null default false,
  payment_capture_allowed_bool boolean not null default false,
  performance_start_allowed_bool boolean not null default false,
  reliance_bearing_transition_allowed_bool boolean not null default false,
  public_metric_publication_allowed_bool boolean not null default false,
  release_gate_promotion_allowed_bool boolean not null default false,
  state_mutation_allowed_bool boolean not null default false,
  superseded_by uuid references public.moral_trade_action_reversibility_enforcement_records (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  check (non_blocking_record_count <= record_count),
  check (high_stakes_or_irreversible_record_count <= record_count),
  check (approved_high_stakes_record_count <= high_stakes_or_irreversible_record_count),
  check (matched_trade_lock_allowed_bool = false),
  check (payment_capture_allowed_bool = false),
  check (performance_start_allowed_bool = false),
  check (reliance_bearing_transition_allowed_bool = false),
  check (public_metric_publication_allowed_bool = false),
  check (release_gate_promotion_allowed_bool = false),
  check (state_mutation_allowed_bool = false),
  unique (owner_profile_id, idempotency_key)
);

comment on table public.moral_trade_action_reversibility_enforcement_records is
  'Append-only owner-scoped action-reversibility enforcement records. A row stores normalized reversibility input, deterministic evaluation results, blockers, and evaluation hash while enforcing that this endpoint cannot authorize lock, payment capture, performance start, reliance, public metrics, release-gate promotion, or other state changes.';

create index if not exists moral_trade_action_reversibility_enforcement_owner_status_idx
  on public.moral_trade_action_reversibility_enforcement_records (owner_profile_id, enforcement_status, created_at desc);

create index if not exists moral_trade_action_reversibility_enforcement_transition_status_idx
  on public.moral_trade_action_reversibility_enforcement_records (transition, enforcement_status, created_at desc);

create index if not exists moral_trade_action_reversibility_enforcement_hash_idx
  on public.moral_trade_action_reversibility_enforcement_records (evaluation_hash, created_at desc);

alter table public.moral_trade_action_reversibility_enforcement_records enable row level security;

drop policy if exists "moral_trade_action_reversibility_enforcement_records_select_owner"
  on public.moral_trade_action_reversibility_enforcement_records;
create policy "moral_trade_action_reversibility_enforcement_records_select_owner"
  on public.moral_trade_action_reversibility_enforcement_records
  for select
  using (owner_profile_id = (select auth.uid()));

drop policy if exists "moral_trade_action_reversibility_enforcement_records_insert_owner"
  on public.moral_trade_action_reversibility_enforcement_records;
create policy "moral_trade_action_reversibility_enforcement_records_insert_owner"
  on public.moral_trade_action_reversibility_enforcement_records
  for insert
  with check (owner_profile_id = (select auth.uid()));
