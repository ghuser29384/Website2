create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.fallback_livestream_evidence_routes (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid references public.offers (id) on delete cascade,
  commitment_id uuid references public.agreements (id) on delete cascade,
  creator_id uuid not null references public.profiles (id) on delete cascade,
  subject_user_id uuid not null references public.profiles (id) on delete cascade,
  baseline_claim text not null,
  fallback_action_statement text not null,
  fallback_event_label text not null default 'No-trade branch evidence',
  clearing_deadline_at timestamptz,
  scheduled_start_at timestamptz not null,
  scheduled_end_at timestamptz not null,
  recording_due_at timestamptz,
  stream_provider text not null default 'external_url' check (
    stream_provider in ('external_url', 'youtube', 'twitch', 'zoom', 'other')
  ),
  stream_url text not null default '',
  recording_url text not null default '',
  challenge_code text not null,
  challenge_issued_at timestamptz not null default timezone('utc', now()),
  visibility text not null default 'private_review' check (
    visibility in ('private_review', 'participants', 'public_link')
  ),
  status text not null default 'draft' check (
    status in (
      'draft',
      'scheduled',
      'armed',
      'cancelled_trade_cleared',
      'due',
      'live_window',
      'recording_due',
      'submitted',
      'reviewed_observed',
      'reviewed_unclear',
      'missed',
      'cancelled'
    )
  ),
  review_decision text check (review_decision in ('observed', 'unclear', 'missed')),
  reviewer_id uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  review_notes text not null default '',
  review_checklist jsonb not null default '{}'::jsonb,
  cancel_reason text not null default '',
  submitted_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (offer_id is not null or commitment_id is not null),
  check (scheduled_start_at < scheduled_end_at),
  check (recording_due_at is null or recording_due_at >= scheduled_end_at),
  check (challenge_code ~ '^MT-FLE-[A-Z0-9]{4}-[A-Z0-9]{4}$'),
  check (
    (review_decision is null and reviewed_at is null)
    or (
      review_decision is not null
      and reviewed_at is not null
      and status in ('reviewed_observed', 'reviewed_unclear', 'missed')
    )
  )
);

comment on table public.fallback_livestream_evidence_routes is
  'Private fallback livestream evidence routes for observing the no-trade branch when a trade does not clear. These rows do not establish natural baseline intent and are not public completion markers.';
comment on column public.fallback_livestream_evidence_routes.baseline_claim is
  'Participant-stated no-trade branch claim under observation, not a determination of natural baseline intent.';
comment on column public.fallback_livestream_evidence_routes.challenge_code is
  'Server-generated phrase the participant must display or say during the external stream or recording.';

create index if not exists fallback_livestream_evidence_routes_offer_idx
  on public.fallback_livestream_evidence_routes (offer_id, created_at desc);
create index if not exists fallback_livestream_evidence_routes_commitment_idx
  on public.fallback_livestream_evidence_routes (commitment_id, created_at desc);
create index if not exists fallback_livestream_evidence_routes_creator_idx
  on public.fallback_livestream_evidence_routes (creator_id, status, scheduled_start_at desc);
create index if not exists fallback_livestream_evidence_routes_subject_idx
  on public.fallback_livestream_evidence_routes (subject_user_id, status, scheduled_start_at desc);
create index if not exists fallback_livestream_evidence_routes_review_idx
  on public.fallback_livestream_evidence_routes (status, recording_due_at asc, updated_at desc);
create index if not exists fallback_livestream_evidence_routes_reviewer_idx
  on public.fallback_livestream_evidence_routes (reviewer_id, reviewed_at desc);

drop trigger if exists fallback_livestream_evidence_routes_set_updated_at
  on public.fallback_livestream_evidence_routes;
create trigger fallback_livestream_evidence_routes_set_updated_at
before update on public.fallback_livestream_evidence_routes
for each row execute function public.set_updated_at();

alter table public.fallback_livestream_evidence_routes enable row level security;

revoke all on public.fallback_livestream_evidence_routes from anon;
revoke all on public.fallback_livestream_evidence_routes from authenticated;
grant select, insert, update on public.fallback_livestream_evidence_routes to authenticated;
grant all on public.fallback_livestream_evidence_routes to service_role;

drop policy if exists "fallback_livestream_evidence_routes_select_related"
  on public.fallback_livestream_evidence_routes;
create policy "fallback_livestream_evidence_routes_select_related"
  on public.fallback_livestream_evidence_routes
  for select
  to authenticated
  using (
    creator_id = (select auth.uid())
    or subject_user_id = (select auth.uid())
    or exists (
      select 1
      from public.offers
      where offers.id = fallback_livestream_evidence_routes.offer_id
        and offers.owner_id = (select auth.uid())
    )
    or exists (
      select 1
      from public.agreements
      where agreements.id = fallback_livestream_evidence_routes.commitment_id
        and (
          agreements.proposer_id = (select auth.uid())
          or agreements.responder_id = (select auth.uid())
        )
    )
  );

drop policy if exists "fallback_livestream_evidence_routes_insert_creator"
  on public.fallback_livestream_evidence_routes;
create policy "fallback_livestream_evidence_routes_insert_creator"
  on public.fallback_livestream_evidence_routes
  for insert
  to authenticated
  with check (
    creator_id = (select auth.uid())
    and subject_user_id = (select auth.uid())
    and reviewed_at is null
    and reviewer_id is null
    and review_decision is null
    and status in ('draft', 'scheduled', 'armed')
    and (
      exists (
        select 1
        from public.offers
        where offers.id = fallback_livestream_evidence_routes.offer_id
          and offers.owner_id = (select auth.uid())
      )
      or exists (
        select 1
        from public.agreements
        where agreements.id = fallback_livestream_evidence_routes.commitment_id
          and (
            agreements.proposer_id = (select auth.uid())
            or agreements.responder_id = (select auth.uid())
          )
      )
    )
  );

drop policy if exists "fallback_livestream_evidence_routes_update_creator_before_review"
  on public.fallback_livestream_evidence_routes;
create policy "fallback_livestream_evidence_routes_update_creator_before_review"
  on public.fallback_livestream_evidence_routes
  for update
  to authenticated
  using (
    creator_id = (select auth.uid())
    and reviewed_at is null
    and reviewer_id is null
    and review_decision is null
    and status in ('draft', 'scheduled', 'armed', 'due', 'live_window', 'recording_due', 'submitted', 'cancelled')
  )
  with check (
    creator_id = (select auth.uid())
    and subject_user_id = (select auth.uid())
    and reviewed_at is null
    and reviewer_id is null
    and review_decision is null
    and status in ('draft', 'scheduled', 'armed', 'due', 'live_window', 'recording_due', 'submitted', 'cancelled')
  );
