create table if not exists public.moral_trade_pilot_evidence_enforcement_records (
  id uuid primary key default gen_random_uuid(),
  owner_profile_id uuid not null references public.profiles (id) on delete cascade,
  transition text not null check (
    transition in (
      'donation_offset_payable_promotion',
      'pledge_swap_reliance_promotion',
      'capped_real_money_release',
      'public_metric_release',
      'release_gate_promotion'
    )
  ),
  enforcement_status text not null check (enforcement_status in ('pass', 'blocked')),
  evidence_required_bool boolean not null default false,
  reviewed_record_count integer not null default 0 check (reviewed_record_count >= 0),
  passing_record_count integer not null default 0 check (passing_record_count >= 0),
  simulation_evidence_count integer not null default 0 check (simulation_evidence_count >= 0),
  red_team_evidence_count integer not null default 0 check (red_team_evidence_count >= 0),
  blocker_count integer not null default 0 check (blocker_count >= 0),
  record_count integer not null default 0 check (record_count >= 0),
  enforcement_input_json jsonb not null,
  evaluation_result_json jsonb not null,
  blocker_codes text[] not null default '{}',
  user_facing_blocker_categories text[] not null default '{}',
  contract_version text not null,
  validator_version text not null,
  evaluation_hash text not null check (evaluation_hash ~ '^sha256:[a-f0-9]{64}$'),
  idempotency_key text not null,
  donation_offset_payable_promotion_allowed_bool boolean not null default false,
  pledge_swap_reliance_promotion_allowed_bool boolean not null default false,
  capped_real_money_release_allowed_bool boolean not null default false,
  public_metric_publication_allowed_bool boolean not null default false,
  release_gate_promotion_allowed_bool boolean not null default false,
  superseded_by uuid references public.moral_trade_pilot_evidence_enforcement_records (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  check (reviewed_record_count <= record_count),
  check (passing_record_count <= record_count),
  check (simulation_evidence_count <= record_count),
  check (red_team_evidence_count <= record_count),
  check (donation_offset_payable_promotion_allowed_bool = false),
  check (pledge_swap_reliance_promotion_allowed_bool = false),
  check (capped_real_money_release_allowed_bool = false),
  check (public_metric_publication_allowed_bool = false),
  check (release_gate_promotion_allowed_bool = false),
  unique (owner_profile_id, idempotency_key)
);

comment on table public.moral_trade_pilot_evidence_enforcement_records is
  'Append-only user-owned pilot-evidence enforcement records. A record stores normalized pilot evidence input, deterministic evaluation result, blockers, and evaluation hash while enforcing that enforcement records cannot authorize donation-offset payable promotion, pledge-swap reliance promotion, capped real-money release, public metric publication, or release-gate promotion.';

create index if not exists moral_trade_pilot_evidence_enforcement_records_owner_status_idx
  on public.moral_trade_pilot_evidence_enforcement_records (owner_profile_id, enforcement_status, created_at desc);

create index if not exists moral_trade_pilot_evidence_enforcement_records_transition_status_idx
  on public.moral_trade_pilot_evidence_enforcement_records (transition, enforcement_status, created_at desc);

create index if not exists moral_trade_pilot_evidence_enforcement_records_hash_idx
  on public.moral_trade_pilot_evidence_enforcement_records (evaluation_hash, created_at desc);

alter table public.moral_trade_pilot_evidence_enforcement_records enable row level security;

drop policy if exists "moral_trade_pilot_evidence_enforcement_records_select_owner"
  on public.moral_trade_pilot_evidence_enforcement_records;
create policy "moral_trade_pilot_evidence_enforcement_records_select_owner"
  on public.moral_trade_pilot_evidence_enforcement_records
  for select
  to authenticated
  using (owner_profile_id = auth.uid());

drop policy if exists "moral_trade_pilot_evidence_enforcement_records_insert_owner"
  on public.moral_trade_pilot_evidence_enforcement_records;
create policy "moral_trade_pilot_evidence_enforcement_records_insert_owner"
  on public.moral_trade_pilot_evidence_enforcement_records
  for insert
  to authenticated
  with check (
    owner_profile_id = auth.uid()
    and donation_offset_payable_promotion_allowed_bool = false
    and pledge_swap_reliance_promotion_allowed_bool = false
    and capped_real_money_release_allowed_bool = false
    and public_metric_publication_allowed_bool = false
    and release_gate_promotion_allowed_bool = false
  );
