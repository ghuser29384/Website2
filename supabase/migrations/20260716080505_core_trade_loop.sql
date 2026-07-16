-- Core non-financial Moral Trade loop: reliable drafts, invitations, negotiation,
-- bilateral confirmation, evidence, completion, notifications, review, and analytics.

alter table public.offers
  add column if not exists workflow_status text not null default 'draft',
  add column if not exists moderation_reason text not null default '',
  add column if not exists submission_key text not null default '',
  add column if not exists fingerprint text not null default '',
  add column if not exists no_trade_baseline text not null default '',
  add column if not exists start_date date,
  add column if not exists exit_conditions text not null default '',
  add column if not exists maximum_burden text not null default '',
  add column if not exists privacy_scope text not null default 'Participants and operator only',
  add column if not exists evidence_due_date date,
  add column if not exists submitted_at timestamptz,
  add column if not exists published_at timestamptz,
  add column if not exists closed_at timestamptz,
  add column if not exists deleted_at timestamptz,
  add column if not exists terms_version integer not null default 1;

update public.offers
set workflow_status = case status::text
  when 'open' then 'published'
  when 'paused' then 'draft'
  when 'matched' then 'closed'
  when 'closed' then 'closed'
  else 'draft'
end
where workflow_status = 'draft'
  and created_at < now();

update public.offers
set published_at = coalesce(published_at, created_at)
where workflow_status = 'published';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'offers_workflow_status_check'
      and conrelid = 'public.offers'::regclass
  ) then
    alter table public.offers
      add constraint offers_workflow_status_check
      check (workflow_status in (
        'draft','pending_review','published','changes_requested','rejected','paused','closed','deleted'
      ));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'offers_terms_version_positive'
      and conrelid = 'public.offers'::regclass
  ) then
    alter table public.offers
      add constraint offers_terms_version_positive check (terms_version > 0);
  end if;
end $$;

create unique index if not exists offers_owner_submission_key_uidx
  on public.offers(owner_id, submission_key)
  where submission_key <> '';

create unique index if not exists offers_owner_active_fingerprint_uidx
  on public.offers(owner_id, fingerprint)
  where fingerprint <> '' and workflow_status not in ('closed','deleted');

create index if not exists offers_workflow_status_idx
  on public.offers(workflow_status, updated_at desc);

create table if not exists public.trade_invitations (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references public.offers(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  recipient_user_id uuid references public.profiles(id) on delete set null,
  recipient_email text not null default '',
  token text not null unique,
  message text not null default '',
  status text not null default 'drafted' check (status in ('drafted','sent','opened','responded','declined','revoked')),
  opened_at timestamptz,
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists trade_invitations_offer_idx
  on public.trade_invitations(offer_id, created_at desc);
create index if not exists trade_invitations_sender_idx
  on public.trade_invitations(sender_id, created_at desc);

create table if not exists public.trade_threads (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references public.offers(id) on delete cascade,
  invitation_id uuid references public.trade_invitations(id) on delete set null,
  agreement_id uuid,
  participant_a uuid not null references public.profiles(id) on delete cascade,
  participant_b uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'active' check (status in ('active','blocked','closed')),
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint trade_threads_distinct_participants check (participant_a <> participant_b)
);

create unique index if not exists trade_threads_offer_pair_uidx
  on public.trade_threads(
    offer_id,
    least(participant_a::text, participant_b::text),
    greatest(participant_a::text, participant_b::text)
  )
  where status <> 'closed';
create index if not exists trade_threads_participant_a_idx
  on public.trade_threads(participant_a, last_message_at desc);
create index if not exists trade_threads_participant_b_idx
  on public.trade_threads(participant_b, last_message_at desc);

create table if not exists public.trade_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.trade_threads(id) on delete cascade,
  sender_id uuid references public.profiles(id) on delete set null,
  message_type text not null default 'user' check (message_type in ('user','system')),
  body text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists trade_messages_thread_idx
  on public.trade_messages(thread_id, created_at asc);

create table if not exists public.trade_thread_reads (
  thread_id uuid not null references public.trade_threads(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (thread_id, user_id)
);

create table if not exists public.trade_blocks (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid references public.trade_threads(id) on delete cascade,
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  reason text not null default '',
  created_at timestamptz not null default now(),
  unique (thread_id, blocker_id, blocked_id),
  constraint trade_blocks_distinct_users check (blocker_id <> blocked_id)
);

create table if not exists public.trade_reports (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.trade_threads(id) on delete cascade,
  message_id uuid references public.trade_messages(id) on delete set null,
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reason text not null,
  status text not null default 'open' check (status in ('open','reviewing','resolved','dismissed')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index if not exists trade_reports_status_idx
  on public.trade_reports(status, created_at asc);

create table if not exists public.trade_counterproposals (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.trade_threads(id) on delete cascade,
  offer_id uuid not null references public.offers(id) on delete cascade,
  proposer_id uuid not null references public.profiles(id) on delete cascade,
  version integer not null,
  status text not null default 'proposed' check (status in ('proposed','accepted','rejected','withdrawn','superseded')),
  proposed_action text not null,
  requested_action text not null,
  duration text not null,
  start_date date,
  evidence_rule text not null,
  evidence_due_date date,
  exit_conditions text not null,
  maximum_burden text not null,
  privacy_scope text not null,
  no_trade_baseline text not null,
  terms_hash text not null,
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  unique (thread_id, version),
  unique (thread_id, terms_hash)
);

create index if not exists trade_counterproposals_thread_idx
  on public.trade_counterproposals(thread_id, version desc);

alter table public.agreements
  add column if not exists lifecycle_status text not null default 'proposed',
  add column if not exists current_version_id uuid,
  add column if not exists evidence_due_at date,
  add column if not exists activated_at timestamptz,
  add column if not exists completed_at timestamptz,
  add column if not exists cancelled_at timestamptz,
  add column if not exists exit_requested_by uuid references public.profiles(id) on delete set null,
  add column if not exists exit_reason text not null default '';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'agreements_lifecycle_status_check'
      and conrelid = 'public.agreements'::regclass
  ) then
    alter table public.agreements
      add constraint agreements_lifecycle_status_check
      check (lifecycle_status in (
        'draft','proposed','confirmed','active','evidence_due','completed','disputed','cancelled','expired'
      ));
  end if;
end $$;

create table if not exists public.trade_agreement_versions (
  id uuid primary key default gen_random_uuid(),
  agreement_id uuid not null references public.agreements(id) on delete cascade,
  version integer not null,
  proposed_by uuid not null references public.profiles(id) on delete cascade,
  proposed_action text not null,
  requested_action text not null,
  duration text not null,
  start_date date,
  evidence_rule text not null,
  evidence_due_date date,
  exit_conditions text not null,
  maximum_burden text not null,
  privacy_scope text not null,
  no_trade_baseline text not null,
  terms_hash text not null,
  created_at timestamptz not null default now(),
  unique (agreement_id, version),
  unique (agreement_id, terms_hash)
);

create index if not exists trade_agreement_versions_agreement_idx
  on public.trade_agreement_versions(agreement_id, version desc);

create table if not exists public.trade_agreement_confirmations (
  agreement_version_id uuid not null references public.trade_agreement_versions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  confirmed_at timestamptz not null default now(),
  primary key (agreement_version_id, user_id)
);

alter table public.trade_threads
  drop constraint if exists trade_threads_agreement_id_fkey;
alter table public.trade_threads
  add constraint trade_threads_agreement_id_fkey
  foreign key (agreement_id) references public.agreements(id) on delete set null;

alter table public.agreements
  drop constraint if exists agreements_current_version_id_fkey;
alter table public.agreements
  add constraint agreements_current_version_id_fkey
  foreign key (current_version_id) references public.trade_agreement_versions(id) on delete set null;

create table if not exists public.trade_evidence_items (
  id uuid primary key default gen_random_uuid(),
  agreement_id uuid not null references public.agreements(id) on delete cascade,
  submitted_by uuid not null references public.profiles(id) on delete cascade,
  evidence_type text not null check (evidence_type in ('file','link','attestation')),
  storage_path text not null default '',
  evidence_url text not null default '',
  attestation text not null default '',
  status text not null default 'submitted' check (status in ('submitted','accepted','challenged')),
  challenge_reason text not null default '',
  challenge_window_ends_at timestamptz not null default (now() + interval '7 days'),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create index if not exists trade_evidence_items_agreement_idx
  on public.trade_evidence_items(agreement_id, created_at desc);

create table if not exists public.trade_completion_confirmations (
  agreement_id uuid not null references public.agreements(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  confirmed_at timestamptz not null default now(),
  primary key (agreement_id, user_id)
);

create table if not exists public.trade_exit_requests (
  id uuid primary key default gen_random_uuid(),
  agreement_id uuid not null references public.agreements(id) on delete cascade,
  requested_by uuid not null references public.profiles(id) on delete cascade,
  request_type text not null check (request_type in ('mutual_cancel','unilateral_exit')),
  reason text not null,
  status text not null default 'pending' check (status in ('pending','accepted','declined','executed')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index if not exists trade_exit_requests_agreement_idx
  on public.trade_exit_requests(agreement_id, created_at desc);

create table if not exists public.trade_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  notification_type text not null,
  title text not null,
  body text not null,
  href text not null,
  dedupe_key text not null unique,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists trade_notifications_user_idx
  on public.trade_notifications(user_id, read_at, created_at desc);

create table if not exists public.trade_review_events (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references public.offers(id) on delete cascade,
  reviewer_id uuid references public.profiles(id) on delete set null,
  action text not null check (action in ('submitted','approved','rejected','changes_requested','paused','closed','duplicate_flagged')),
  reason text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists trade_review_events_offer_idx
  on public.trade_review_events(offer_id, created_at desc);

create table if not exists public.core_loop_events (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete cascade,
  event_type text not null check (event_type in (
    'signup_completed','onboarding_completed','offer_draft_saved','offer_submitted','offer_published',
    'invitation_sent','response_sent','counterproposal_sent','agreement_confirmed_by_both',
    'evidence_submitted','agreement_completed'
  )),
  entity_type text not null default '',
  entity_id uuid,
  idempotency_key text not null unique,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists core_loop_events_funnel_idx
  on public.core_loop_events(event_type, created_at desc);
create index if not exists core_loop_events_profile_idx
  on public.core_loop_events(profile_id, created_at desc);

create or replace view public.core_loop_funnel_summary as
select
  event_type,
  count(*) as event_count,
  count(distinct profile_id) as unique_users,
  min(created_at) as first_seen_at,
  max(created_at) as last_seen_at
from public.core_loop_events
group by event_type;

create or replace function public.record_core_signup_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.core_loop_events(
    profile_id, event_type, entity_type, entity_id, idempotency_key
  ) values (
    new.id, 'signup_completed', 'profile', new.id, 'signup_completed:' || new.id::text
  ) on conflict (idempotency_key) do nothing;
  return new;
end;
$$;

drop trigger if exists record_core_signup_event_trigger on public.profiles;
create trigger record_core_signup_event_trigger
after insert on public.profiles
for each row execute function public.record_core_signup_event();

create or replace function public.record_core_onboarding_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.completed_at is not null or new.status = 'completed' then
    insert into public.core_loop_events(
      profile_id, event_type, entity_type, entity_id, idempotency_key
    ) values (
      new.profile_id,
      'onboarding_completed',
      'profile',
      new.profile_id,
      'onboarding_completed:' || new.profile_id::text
    ) on conflict (idempotency_key) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists record_core_onboarding_event_trigger on public.cohort_onboarding_profiles;
create trigger record_core_onboarding_event_trigger
after insert or update on public.cohort_onboarding_profiles
for each row execute function public.record_core_onboarding_event();

insert into public.core_loop_events(profile_id, event_type, entity_type, entity_id, idempotency_key, created_at)
select id, 'signup_completed', 'profile', id, 'signup_completed:' || id::text, created_at
from public.profiles
on conflict (idempotency_key) do nothing;

insert into public.core_loop_events(profile_id, event_type, entity_type, entity_id, idempotency_key, created_at)
select profile_id, 'onboarding_completed', 'profile', profile_id,
       'onboarding_completed:' || profile_id::text,
       coalesce(completed_at, updated_at)
from public.cohort_onboarding_profiles
where completed_at is not null or status = 'completed'
on conflict (idempotency_key) do nothing;

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values (
  'trade-evidence',
  'trade-evidence',
  false,
  10485760,
  array['application/pdf','image/png','image/jpeg','image/webp','text/plain']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

alter table public.trade_invitations enable row level security;
alter table public.trade_threads enable row level security;
alter table public.trade_messages enable row level security;
alter table public.trade_thread_reads enable row level security;
alter table public.trade_blocks enable row level security;
alter table public.trade_reports enable row level security;
alter table public.trade_counterproposals enable row level security;
alter table public.trade_agreement_versions enable row level security;
alter table public.trade_agreement_confirmations enable row level security;
alter table public.trade_evidence_items enable row level security;
alter table public.trade_completion_confirmations enable row level security;
alter table public.trade_exit_requests enable row level security;
alter table public.trade_notifications enable row level security;
alter table public.trade_review_events enable row level security;
alter table public.core_loop_events enable row level security;

create policy "trade_invitations_participant_select" on public.trade_invitations
for select to authenticated
using (sender_id = auth.uid() or recipient_user_id = auth.uid());

create policy "trade_threads_participant_select" on public.trade_threads
for select to authenticated
using (participant_a = auth.uid() or participant_b = auth.uid());

create policy "trade_messages_participant_select" on public.trade_messages
for select to authenticated
using (exists (
  select 1 from public.trade_threads t
  where t.id = thread_id and (t.participant_a = auth.uid() or t.participant_b = auth.uid())
));

create policy "trade_thread_reads_self_all" on public.trade_thread_reads
for all to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "trade_blocks_participant_select" on public.trade_blocks
for select to authenticated
using (blocker_id = auth.uid() or blocked_id = auth.uid());

create policy "trade_reports_reporter_select" on public.trade_reports
for select to authenticated
using (reporter_id = auth.uid());

create policy "trade_counterproposals_participant_select" on public.trade_counterproposals
for select to authenticated
using (exists (
  select 1 from public.trade_threads t
  where t.id = thread_id and (t.participant_a = auth.uid() or t.participant_b = auth.uid())
));

create policy "trade_agreement_versions_participant_select" on public.trade_agreement_versions
for select to authenticated
using (exists (
  select 1 from public.agreements a
  where a.id = agreement_id and (a.proposer_id = auth.uid() or a.responder_id = auth.uid())
));

create policy "trade_agreement_confirmations_participant_select" on public.trade_agreement_confirmations
for select to authenticated
using (exists (
  select 1 from public.trade_agreement_versions v
  join public.agreements a on a.id = v.agreement_id
  where v.id = agreement_version_id and (a.proposer_id = auth.uid() or a.responder_id = auth.uid())
));

create policy "trade_evidence_items_participant_select" on public.trade_evidence_items
for select to authenticated
using (exists (
  select 1 from public.agreements a
  where a.id = agreement_id and (a.proposer_id = auth.uid() or a.responder_id = auth.uid())
));

create policy "trade_completion_confirmations_participant_select" on public.trade_completion_confirmations
for select to authenticated
using (exists (
  select 1 from public.agreements a
  where a.id = agreement_id and (a.proposer_id = auth.uid() or a.responder_id = auth.uid())
));

create policy "trade_exit_requests_participant_select" on public.trade_exit_requests
for select to authenticated
using (exists (
  select 1 from public.agreements a
  where a.id = agreement_id and (a.proposer_id = auth.uid() or a.responder_id = auth.uid())
));

create policy "trade_notifications_self_select" on public.trade_notifications
for select to authenticated
using (user_id = auth.uid());

create policy "trade_notifications_self_update" on public.trade_notifications
for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "trade_review_events_owner_select" on public.trade_review_events
for select to authenticated
using (exists (
  select 1 from public.offers o where o.id = offer_id and o.owner_id = auth.uid()
));

create policy "core_loop_events_self_select" on public.core_loop_events
for select to authenticated
using (profile_id = auth.uid());

grant select on public.trade_invitations, public.trade_threads, public.trade_messages,
  public.trade_blocks, public.trade_reports, public.trade_counterproposals,
  public.trade_agreement_versions, public.trade_agreement_confirmations,
  public.trade_evidence_items, public.trade_completion_confirmations,
  public.trade_exit_requests, public.trade_notifications, public.trade_review_events,
  public.core_loop_events, public.core_loop_funnel_summary to authenticated;

grant select, insert, update, delete on public.trade_thread_reads to authenticated;
grant update on public.trade_notifications to authenticated;

comment on table public.core_loop_events is
  'Idempotent canonical events for the non-financial two-party Moral Trade loop.';
comment on table public.trade_threads is
  'Private counterparty threads; no public access and no WebSocket dependency.';
comment on table public.trade_agreement_versions is
  'Immutable bilateral agreement term versions. A new amendment always creates a new row.';
