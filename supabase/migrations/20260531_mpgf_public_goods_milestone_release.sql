begin;

create extension if not exists pgcrypto;

create table if not exists public.mpgf_public_goods_milestones (
  id text primary key,
  campaign_id text not null references public.mpgf_public_goods_campaigns (id) on delete cascade,
  ordinal integer not null check (ordinal > 0),
  release_pct integer not null check (release_pct > 0 and release_pct <= 100),
  evidence_requirements text[] not null default '{}',
  status text not null default 'pending' check (
    status in ('pending', 'eligible', 'paused', 'released', 'rejected')
  ),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (campaign_id, ordinal)
);

create table if not exists public.mpgf_public_goods_disbursements (
  id uuid primary key default gen_random_uuid(),
  milestone_id text not null references public.mpgf_public_goods_milestones (id) on delete cascade,
  campaign_id text not null references public.mpgf_public_goods_campaigns (id) on delete cascade,
  amount_cents bigint not null check (amount_cents >= 0),
  status text not null check (
    status in ('partner_release_pending', 'paused', 'released', 'rejected')
  ),
  reviewer_id uuid references public.profiles (id) on delete set null,
  partner_ref text,
  review_state_confirmed boolean not null default false,
  blocker_codes text[] not null default '{}',
  public_notes text not null default '',
  released_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.mpgf_public_goods_release_audit_events (
  id uuid primary key default gen_random_uuid(),
  object_type text not null check (object_type = 'mpgf_public_goods_milestone'),
  object_id text not null,
  actor_type text not null check (actor_type in ('reviewer', 'system')),
  event_type text not null check (
    event_type in ('milestone_release_authorized', 'milestone_release_paused', 'milestone_release_rejected')
  ),
  event_hash text not null,
  event_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists mpgf_public_goods_release_audit_hash_idx
on public.mpgf_public_goods_release_audit_events (event_hash);

create or replace function public.prevent_mpgf_public_goods_release_audit_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'MPGF public-goods release audit events are append-only';
end;
$$;

drop trigger if exists mpgf_public_goods_release_audit_append_only on public.mpgf_public_goods_release_audit_events;
create trigger mpgf_public_goods_release_audit_append_only
before update or delete on public.mpgf_public_goods_release_audit_events
for each row execute function public.prevent_mpgf_public_goods_release_audit_mutation();

grant select on
  public.mpgf_public_goods_milestones,
  public.mpgf_public_goods_disbursements,
  public.mpgf_public_goods_release_audit_events
to anon, authenticated;

grant all on
  public.mpgf_public_goods_milestones,
  public.mpgf_public_goods_disbursements,
  public.mpgf_public_goods_release_audit_events
to service_role;

alter table public.mpgf_public_goods_milestones enable row level security;
alter table public.mpgf_public_goods_disbursements enable row level security;
alter table public.mpgf_public_goods_release_audit_events enable row level security;

drop policy if exists "mpgf_public_goods_milestones_public_select" on public.mpgf_public_goods_milestones;
create policy "mpgf_public_goods_milestones_public_select"
on public.mpgf_public_goods_milestones
for select
to anon, authenticated
using (true);

drop policy if exists "mpgf_public_goods_disbursements_public_select" on public.mpgf_public_goods_disbursements;
create policy "mpgf_public_goods_disbursements_public_select"
on public.mpgf_public_goods_disbursements
for select
to anon, authenticated
using (true);

drop policy if exists "mpgf_public_goods_release_audit_public_select" on public.mpgf_public_goods_release_audit_events;
create policy "mpgf_public_goods_release_audit_public_select"
on public.mpgf_public_goods_release_audit_events
for select
to anon, authenticated
using (true);

commit;
