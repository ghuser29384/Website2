begin;

create table if not exists public.mpgf_coordination_flags (
  id text primary key,
  round_id text not null references public.mpgf_public_goods_rounds (id) on delete cascade,
  campaign_id text not null references public.mpgf_public_goods_campaigns (id) on delete cascade,
  cluster_key_hash text not null check (cluster_key_hash ~ '^sha256:[0-9a-f]{64}$'),
  severity text not null check (severity in ('watch', 'medium', 'high')),
  penalty_bps integer not null check (penalty_bps between 0 and 10000),
  rationale jsonb not null,
  append_only_hash text not null unique check (append_only_hash ~ '^sha256:[0-9a-f]{64}$'),
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.mpgf_round_allocations (
  id text primary key,
  round_id text not null references public.mpgf_public_goods_rounds (id) on delete cascade,
  campaign_id text not null references public.mpgf_public_goods_campaigns (id) on delete cascade,
  counted_cents bigint not null check (counted_cents >= 0),
  verified_supporters integer not null check (verified_supporters >= 0),
  base_match_cents bigint not null check (base_match_cents >= 0),
  qf_raw_cents bigint not null check (qf_raw_cents >= 0),
  anti_collusion_factor_bps integer not null default 10000 check (anti_collusion_factor_bps between 0 and 10000),
  qf_bonus_cents bigint not null check (qf_bonus_cents >= 0),
  withheld_qf_bonus_cents bigint not null default 0 check (withheld_qf_bonus_cents >= 0),
  final_total_cents bigint not null check (final_total_cents >= 0),
  proof_path text not null,
  calculation_hash text not null check (calculation_hash ~ '^sha256:[0-9a-f]{64}$'),
  finalization_status text not null check (finalization_status in ('preview', 'finalized', 'voided')),
  created_at timestamptz not null default timezone('utc', now()),
  unique (round_id, campaign_id, finalization_status)
);

create index if not exists mpgf_coordination_flags_round_campaign_idx
  on public.mpgf_coordination_flags (round_id, campaign_id, severity);

create index if not exists mpgf_round_allocations_round_idx
  on public.mpgf_round_allocations (round_id, finalization_status, campaign_id);

create or replace function public.prevent_mpgf_coordination_flags_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'MPGF coordination flags are append-only';
end;
$$;

drop trigger if exists mpgf_coordination_flags_append_only on public.mpgf_coordination_flags;
create trigger mpgf_coordination_flags_append_only
before update or delete on public.mpgf_coordination_flags
for each row execute function public.prevent_mpgf_coordination_flags_mutation();

alter table public.mpgf_coordination_flags enable row level security;
alter table public.mpgf_round_allocations enable row level security;

drop policy if exists "mpgf_coordination_flags_public_select" on public.mpgf_coordination_flags;
create policy "mpgf_coordination_flags_public_select"
on public.mpgf_coordination_flags
for select
to anon, authenticated
using (true);

drop policy if exists "mpgf_round_allocations_public_select" on public.mpgf_round_allocations;
create policy "mpgf_round_allocations_public_select"
on public.mpgf_round_allocations
for select
to anon, authenticated
using (true);

grant select on public.mpgf_coordination_flags to anon, authenticated;
grant select on public.mpgf_round_allocations to anon, authenticated;
grant all on public.mpgf_coordination_flags to service_role;
grant all on public.mpgf_round_allocations to service_role;

comment on table public.mpgf_coordination_flags is
  'Privacy-safe MPGF coordination-cluster flags. Public rows expose cluster hashes and reason codes only, not donor identities or raw payment references.';

comment on table public.mpgf_round_allocations is
  'Deterministic MPGF finalization rows with threshold, base match, QF raw amount, anti-collusion factor, final totals, proof path, and stable calculation hash.';

commit;
