begin;

create table if not exists public.mpgf_public_goods_governance_ballots (
  id text primary key,
  round_id text not null references public.mpgf_public_goods_rounds (id) on delete cascade,
  profile_id uuid references public.profiles (id) on delete set null,
  voter_ref_hash text not null check (voter_ref_hash ~ '^sha256:[0-9a-f]{64}$'),
  idempotency_key_hash text not null unique check (idempotency_key_hash ~ '^sha256:[0-9a-f]{64}$'),
  weights jsonb not null,
  total_weight_bps integer not null check (total_weight_bps between 1 and 10000),
  status text not null default 'submitted' check (status in ('submitted', 'pending_review', 'voided')),
  no_moral_ranking boolean not null default true check (no_moral_ranking = true),
  no_transferable_governance_weight boolean not null default true check (no_transferable_governance_weight = true),
  calculation_hash text not null check (calculation_hash ~ '^sha256:[0-9a-f]{64}$'),
  submitted_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.mpgf_public_goods_challenges (
  id text primary key,
  round_id text not null references public.mpgf_public_goods_rounds (id) on delete cascade,
  campaign_id text not null references public.mpgf_public_goods_campaigns (id) on delete cascade,
  profile_id uuid references public.profiles (id) on delete set null,
  challenger_ref_hash text not null check (challenger_ref_hash ~ '^sha256:[0-9a-f]{64}$'),
  reason_code text not null check (
    reason_code in (
      'destination_evidence_disputed',
      'identity_or_sybil_review',
      'coordination_cluster_review',
      'threat_baseline_review',
      'other_reviewable_claim'
    )
  ),
  public_summary text not null,
  status text not null default 'opened' check (status in ('opened', 'under_review', 'resolved', 'rejected')),
  pauses_unreleased_milestones boolean not null default true check (pauses_unreleased_milestones = true),
  final_payout_authorized boolean not null default false check (final_payout_authorized = false),
  calculation_hash text not null check (calculation_hash ~ '^sha256:[0-9a-f]{64}$'),
  opened_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists mpgf_public_goods_governance_ballots_round_idx
  on public.mpgf_public_goods_governance_ballots (round_id, status, submitted_at desc);

create index if not exists mpgf_public_goods_challenges_round_idx
  on public.mpgf_public_goods_challenges (round_id, campaign_id, status, opened_at desc);

alter table public.mpgf_public_goods_governance_ballots enable row level security;
alter table public.mpgf_public_goods_challenges enable row level security;

drop policy if exists "mpgf_public_goods_governance_ballots_select_own"
on public.mpgf_public_goods_governance_ballots;
create policy "mpgf_public_goods_governance_ballots_select_own"
on public.mpgf_public_goods_governance_ballots
for select
to authenticated
using (profile_id = auth.uid());

drop policy if exists "mpgf_public_goods_challenges_public_select"
on public.mpgf_public_goods_challenges;
create policy "mpgf_public_goods_challenges_public_select"
on public.mpgf_public_goods_challenges
for select
to anon, authenticated
using (true);

grant select, insert on public.mpgf_public_goods_governance_ballots to authenticated;
grant select on public.mpgf_public_goods_challenges to anon, authenticated;
grant all on public.mpgf_public_goods_governance_ballots to service_role;
grant all on public.mpgf_public_goods_challenges to service_role;

comment on table public.mpgf_public_goods_governance_ballots is
  'Role-limited plural MPGF budget ballots. Ballots allocate category weights without creating a hidden moral ranking, transferable governance weight, or engagement score.';

comment on table public.mpgf_public_goods_challenges is
  'MPGF challenge records pause unreleased milestones for review and never authorize final payout by themselves.';

commit;
