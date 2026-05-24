alter table public.agreements alter column offer_id drop not null;
alter table public.agreements add column if not exists match_id uuid;
alter table public.agreements add column if not exists introduction_plan_id uuid;
alter table public.agreements add column if not exists source text not null default 'offer';
alter table public.agreements add column if not exists structured_terms text not null default '';
alter table public.agreements add column if not exists no_trade_baseline text not null default '';
alter table public.agreements add column if not exists counterfactual_declaration text not null default '';
alter table public.agreements add column if not exists duration_terms text not null default '';
alter table public.agreements add column if not exists exit_conditions text not null default '';
alter table public.agreements add column if not exists evidence_rule text not null default '';
alter table public.agreements add column if not exists privacy_scope text not null default '';
alter table public.agreements add column if not exists disclosure_scope text not null default '';
alter table public.agreements add column if not exists completion_state text not null default 'pending_evidence';
alter table public.agreements add column if not exists challenge_window_ends_at timestamptz;
alter table public.agreements drop constraint if exists agreements_source_check;
alter table public.agreements
add constraint agreements_source_check check (source in ('offer', 'introduction', 'manual'));
alter table public.agreements drop constraint if exists agreements_completion_state_check;
alter table public.agreements
add constraint agreements_completion_state_check check (
  completion_state in ('pending_evidence', 'under_review', 'challenge_window_open', 'reviewed_complete', 'disputed_unresolved')
);

alter table public.agreement_events drop constraint if exists agreement_events_event_type_check;
alter table public.agreement_events
add constraint agreement_events_event_type_check check (
  event_type in (
    'note',
    'counterproposal',
    'verification_submitted',
    'cancellation_requested',
    'dispute_opened',
    'status_change',
    'payment_update',
    'terms_updated',
    'evidence_submitted',
    'review_status_changed',
    'challenge_opened',
    'appeal_requested',
    'verification_badge_updated'
  )
);

create table if not exists public.agreement_evidence_items (
  id uuid primary key default gen_random_uuid(),
  agreement_id uuid not null references public.agreements (id) on delete cascade,
  uploader_id uuid not null references public.profiles (id) on delete cascade,
  trade_type text not null default 'pledge_swap' check (trade_type in ('pledge_swap', 'donation_offset', 'mpgf', 'paid_action', 'other')),
  evidence_type text not null default 'manual_attestation' check (evidence_type in ('receipt', 'provider_record', 'manual_attestation', 'public_log', 'timestamped_commitment', 'third_party_review', 'other')),
  schema_key text not null default 'pledge_swap_v1',
  title text not null,
  evidence_url text not null default '',
  evidence_summary text not null default '',
  status text not null default 'under_review' check (status in ('pending_evidence', 'under_review', 'challenge_window_open', 'reviewed_complete', 'disputed_unresolved')),
  reviewer_confidence smallint check (reviewer_confidence between 0 and 100),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.agreement_review_cases (
  id uuid primary key default gen_random_uuid(),
  agreement_id uuid not null references public.agreements (id) on delete cascade,
  evidence_item_id uuid references public.agreement_evidence_items (id) on delete set null,
  opened_by uuid not null references public.profiles (id) on delete cascade,
  assigned_reviewer_id uuid references public.profiles (id) on delete set null,
  reviewer_role text not null default 'operator' check (reviewer_role in ('operator', 'validator', 'external_reviewer', 'admin')),
  review_scope text not null default '',
  status text not null default 'open' check (status in ('open', 'under_review', 'challenge_window_open', 'reviewed_complete', 'disputed_unresolved', 'appealed', 'closed')),
  conflict_of_interest_notes text not null default '',
  reviewer_notes text not null default '',
  public_reasoning_summary text not null default '',
  sla_due_at timestamptz not null default (timezone('utc', now()) + interval '72 hours'),
  challenge_window_ends_at timestamptz,
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  appeal_requested_by uuid references public.profiles (id) on delete set null,
  appeal_reason text not null default '',
  appealed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.profile_verification_badges (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  badge_type text not null check (badge_type in ('identity_verified', 'organization_verified', 'payment_evidence_verified', 'completion_reviewed', 'repeat_counterparty')),
  status text not null default 'pending' check (status in ('pending', 'verified', 'rejected', 'revoked')),
  evidence_summary text not null default '',
  source text not null default 'operator_review',
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (profile_id, badge_type)
);

create index if not exists agreements_match_id_idx on public.agreements (match_id);
create index if not exists agreements_introduction_plan_id_idx on public.agreements (introduction_plan_id);
create index if not exists agreements_completion_state_idx on public.agreements (completion_state, updated_at desc);
create index if not exists agreement_evidence_items_agreement_idx on public.agreement_evidence_items (agreement_id, created_at desc);
create index if not exists agreement_evidence_items_status_idx on public.agreement_evidence_items (status, updated_at desc);
create index if not exists agreement_review_cases_status_sla_idx on public.agreement_review_cases (status, sla_due_at asc, created_at desc);
create index if not exists agreement_review_cases_agreement_idx on public.agreement_review_cases (agreement_id, created_at desc);
create index if not exists profile_verification_badges_profile_idx on public.profile_verification_badges (profile_id, badge_type);

drop trigger if exists agreement_evidence_items_set_updated_at on public.agreement_evidence_items;
create trigger agreement_evidence_items_set_updated_at
before update on public.agreement_evidence_items
for each row execute procedure public.set_updated_at();

drop trigger if exists agreement_review_cases_set_updated_at on public.agreement_review_cases;
create trigger agreement_review_cases_set_updated_at
before update on public.agreement_review_cases
for each row execute procedure public.set_updated_at();

drop trigger if exists profile_verification_badges_set_updated_at on public.profile_verification_badges;
create trigger profile_verification_badges_set_updated_at
before update on public.profile_verification_badges
for each row execute procedure public.set_updated_at();

alter table public.agreement_evidence_items enable row level security;
alter table public.agreement_review_cases enable row level security;
alter table public.profile_verification_badges enable row level security;

drop policy if exists "agreement_evidence_items_select_participants" on public.agreement_evidence_items;
create policy "agreement_evidence_items_select_participants"
on public.agreement_evidence_items
for select
to authenticated
using (
  exists (
    select 1
    from public.agreements
    where agreements.id = agreement_evidence_items.agreement_id
      and (
        agreements.proposer_id = (select auth.uid())
        or agreements.responder_id = (select auth.uid())
      )
  )
);

drop policy if exists "agreement_evidence_items_insert_participants" on public.agreement_evidence_items;
create policy "agreement_evidence_items_insert_participants"
on public.agreement_evidence_items
for insert
to authenticated
with check (
  uploader_id = (select auth.uid())
  and exists (
    select 1
    from public.agreements
    where agreements.id = agreement_evidence_items.agreement_id
      and (
        agreements.proposer_id = (select auth.uid())
        or agreements.responder_id = (select auth.uid())
      )
  )
);

drop policy if exists "agreement_evidence_items_update_participants" on public.agreement_evidence_items;
create policy "agreement_evidence_items_update_participants"
on public.agreement_evidence_items
for update
to authenticated
using (
  exists (
    select 1
    from public.agreements
    where agreements.id = agreement_evidence_items.agreement_id
      and (
        agreements.proposer_id = (select auth.uid())
        or agreements.responder_id = (select auth.uid())
      )
  )
)
with check (
  exists (
    select 1
    from public.agreements
    where agreements.id = agreement_evidence_items.agreement_id
      and (
        agreements.proposer_id = (select auth.uid())
        or agreements.responder_id = (select auth.uid())
      )
  )
);

drop policy if exists "agreement_review_cases_select_participants" on public.agreement_review_cases;
create policy "agreement_review_cases_select_participants"
on public.agreement_review_cases
for select
to authenticated
using (
  exists (
    select 1
    from public.agreements
    where agreements.id = agreement_review_cases.agreement_id
      and (
        agreements.proposer_id = (select auth.uid())
        or agreements.responder_id = (select auth.uid())
      )
  )
);

drop policy if exists "agreement_review_cases_insert_participants" on public.agreement_review_cases;
create policy "agreement_review_cases_insert_participants"
on public.agreement_review_cases
for insert
to authenticated
with check (
  opened_by = (select auth.uid())
  and exists (
    select 1
    from public.agreements
    where agreements.id = agreement_review_cases.agreement_id
      and (
        agreements.proposer_id = (select auth.uid())
        or agreements.responder_id = (select auth.uid())
      )
  )
);

drop policy if exists "agreement_review_cases_update_participants" on public.agreement_review_cases;
create policy "agreement_review_cases_update_participants"
on public.agreement_review_cases
for update
to authenticated
using (
  exists (
    select 1
    from public.agreements
    where agreements.id = agreement_review_cases.agreement_id
      and (
        agreements.proposer_id = (select auth.uid())
        or agreements.responder_id = (select auth.uid())
      )
  )
)
with check (
  exists (
    select 1
    from public.agreements
    where agreements.id = agreement_review_cases.agreement_id
      and (
        agreements.proposer_id = (select auth.uid())
        or agreements.responder_id = (select auth.uid())
      )
  )
);

drop policy if exists "profile_verification_badges_select_relevant" on public.profile_verification_badges;
create policy "profile_verification_badges_select_relevant"
on public.profile_verification_badges
for select
to anon, authenticated
using (
  status = 'verified'
  or profile_id = (select auth.uid())
);
