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

-- Restore the intended evidence-review state machine alongside the newer
-- bilateral lifecycle state machine, then put response acceptance and agreement
-- creation behind one database transaction.

create unique index if not exists profile_verification_badges_profile_badge_uidx
  on public.profile_verification_badges (profile_id, badge_type);

alter table public.profile_verification_badges
  alter column source set default 'operator_review';

comment on column public.agreements.lifecycle_status is
  'Bilateral agreement lifecycle: proposed, confirmed, active, evidence due, completed, disputed, cancelled, or expired.';
comment on column public.agreements.completion_state is
  'Evidence and completion-review workflow, independent of the bilateral lifecycle state.';

create or replace function public.accept_marketplace_interest_v1(
  p_interest_id uuid,
  p_offer_id uuid,
  p_notes text default '',
  p_no_trade_baseline text default '',
  p_counterfactual_declaration text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $function$
declare
  actor_id uuid := auth.uid();
  offer_row public.offers%rowtype;
  interest_row public.interests%rowtype;
  existing_agreement public.agreements%rowtype;
  agreement_row public.agreements%rowtype;
  agreement_id_value uuid;
  normalized_notes text := btrim(coalesce(p_notes, ''));
  normalized_baseline text := btrim(coalesce(p_no_trade_baseline, ''));
  normalized_counterfactual text := btrim(coalesce(p_counterfactual_declaration, ''));
begin
  if actor_id is null then
    raise exception using
      errcode = '42501',
      message = 'A signed-in offer owner is required.';
  end if;

  if p_interest_id is null or p_offer_id is null then
    raise exception using
      errcode = '22023',
      message = 'Interest ID and offer ID are required.';
  end if;

  select * into offer_row
  from public.offers
  where id = p_offer_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'Offer not found.';
  end if;

  if offer_row.owner_id <> actor_id then
    raise exception using
      errcode = '42501',
      message = 'Only the offer owner can accept interest.';
  end if;

  select * into interest_row
  from public.interests
  where id = p_interest_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'Interest not found.';
  end if;

  if interest_row.offer_id <> offer_row.id then
    raise exception using
      errcode = '23514',
      message = 'That interest is not attached to this offer.';
  end if;

  if interest_row.user_id = actor_id then
    raise exception using
      errcode = '23514',
      message = 'An offer owner cannot accept their own response.';
  end if;

  select * into existing_agreement
  from public.agreements
  where interest_id = interest_row.id
  limit 1;

  if existing_agreement.id is not null then
    if existing_agreement.offer_id is distinct from offer_row.id
       or existing_agreement.proposer_id is distinct from actor_id
       or existing_agreement.responder_id is distinct from interest_row.user_id then
      raise exception using
        errcode = '23514',
        message = 'The existing agreement does not match this response.';
    end if;

    return jsonb_build_object(
      'agreement', to_jsonb(existing_agreement),
      'created', false
    );
  end if;

  if offer_row.status::text <> 'open'
     or offer_row.workflow_status <> 'published' then
    raise exception using
      errcode = '23514',
      message = 'This offer is not open for acceptance.';
  end if;

  if interest_row.status::text <> 'pending' then
    raise exception using
      errcode = '23514',
      message = 'Only a pending response can be accepted.';
  end if;

  if offer_row.mode::text = 'offset'
     and exists (
       select 1
       from public.donation_offset_offers offset_offer
       where offset_offer.offer_id = offer_row.id
         and offset_offer.participation_mode = 'pool'
     ) then
    raise exception using
      errcode = '23514',
      message = 'Pool commitments cannot be accepted one-to-one.';
  end if;

  -- The selected response is deliberately updated before the agreement insert.
  -- PostgreSQL rolls this update and all trigger side effects back if any later
  -- statement in this function fails.
  update public.interests
  set status = 'accepted', updated_at = now()
  where id = interest_row.id;

  insert into public.agreements (
    offer_id,
    interest_id,
    proposer_id,
    responder_id,
    status,
    notes,
    source,
    structured_terms,
    no_trade_baseline,
    counterfactual_declaration,
    duration_terms,
    exit_conditions,
    evidence_rule,
    privacy_scope,
    disclosure_scope,
    completion_state
  ) values (
    offer_row.id,
    interest_row.id,
    actor_id,
    interest_row.user_id,
    'active',
    normalized_notes,
    'offer',
    concat_ws(' ', offer_row.offer_action, 'for', offer_row.request_action),
    coalesce(nullif(normalized_baseline, ''), nullif(btrim(offer_row.no_trade_baseline), ''), ''),
    normalized_counterfactual,
    offer_row.duration,
    offer_row.exit_conditions,
    offer_row.verification,
    coalesce(
      nullif(btrim(offer_row.privacy_scope), ''),
      'Agreement participants can see this room. Broader publication waits for reviewed completion.'
    ),
    'Share only the details needed to verify this agreement and resolve disputes.',
    'pending_evidence'
  )
  returning id into agreement_id_value;

  update public.interests
  set status = 'declined', updated_at = now()
  where offer_id = offer_row.id
    and id <> interest_row.id
    and status = 'pending';

  update public.guest_interests
  set status = 'declined', updated_at = now()
  where offer_id = offer_row.id
    and status = 'pending';

  update public.offers
  set status = 'matched', updated_at = now()
  where id = offer_row.id;

  select * into agreement_row
  from public.agreements
  where id = agreement_id_value;

  return jsonb_build_object(
    'agreement', to_jsonb(agreement_row),
    'created', true
  );
end;
$function$;

comment on function public.accept_marketplace_interest_v1(uuid, uuid, text, text, text) is
  'Atomically accepts one signed-in member response, creates its proposed agreement and frozen version, declines competing responses, and closes the public offer. Any failure rolls back every mutation.';

revoke all on function public.accept_marketplace_interest_v1(uuid, uuid, text, text, text)
  from public, anon;
grant execute on function public.accept_marketplace_interest_v1(uuid, uuid, text, text, text)
  to authenticated;

create or replace function public.accept_marketplace_guest_interest_v1(
  p_guest_interest_id uuid,
  p_offer_id uuid,
  p_notes text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $function$
declare
  actor_id uuid := auth.uid();
  offer_row public.offers%rowtype;
  guest_interest_row public.guest_interests%rowtype;
  existing_agreement public.agreements%rowtype;
  agreement_row public.agreements%rowtype;
  agreement_id_value uuid;
  normalized_notes text := btrim(coalesce(p_notes, ''));
begin
  if actor_id is null then
    raise exception using
      errcode = '42501',
      message = 'A signed-in offer owner is required.';
  end if;

  if p_guest_interest_id is null or p_offer_id is null then
    raise exception using
      errcode = '22023',
      message = 'Guest response ID and offer ID are required.';
  end if;

  select * into offer_row
  from public.offers
  where id = p_offer_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'Offer not found.';
  end if;

  if offer_row.owner_id <> actor_id then
    raise exception using
      errcode = '42501',
      message = 'Only the offer owner can accept responses.';
  end if;

  select * into guest_interest_row
  from public.guest_interests
  where id = p_guest_interest_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'Guest response not found.';
  end if;

  if guest_interest_row.offer_id <> offer_row.id then
    raise exception using
      errcode = '23514',
      message = 'That guest response is not attached to this offer.';
  end if;

  if guest_interest_row.claimed_by_profile_id is null then
    raise exception using
      errcode = '23514',
      message = 'The guest respondent must claim the response with an account first.';
  end if;

  if guest_interest_row.claimed_by_profile_id = actor_id then
    raise exception using
      errcode = '23514',
      message = 'An offer owner cannot accept their own response.';
  end if;

  select * into existing_agreement
  from public.agreements
  where offer_id = offer_row.id
  order by created_at asc
  limit 1;

  if existing_agreement.id is not null then
    if existing_agreement.proposer_id = actor_id
       and existing_agreement.responder_id = guest_interest_row.claimed_by_profile_id then
      return jsonb_build_object(
        'agreement', to_jsonb(existing_agreement),
        'created', false
      );
    end if;

    raise exception using
      errcode = '23514',
      message = 'This offer already has an agreement.';
  end if;

  if offer_row.status::text <> 'open'
     or offer_row.workflow_status <> 'published' then
    raise exception using
      errcode = '23514',
      message = 'This offer is not open for acceptance.';
  end if;

  if guest_interest_row.status::text <> 'pending' then
    raise exception using
      errcode = '23514',
      message = 'Only a pending guest response can be accepted.';
  end if;

  if offer_row.mode::text = 'offset'
     and exists (
       select 1
       from public.donation_offset_offers offset_offer
       where offset_offer.offer_id = offer_row.id
         and offset_offer.participation_mode = 'pool'
     ) then
    raise exception using
      errcode = '23514',
      message = 'Pool commitments cannot be accepted one-to-one.';
  end if;

  if offer_row.mode::text = 'pledge'
     and exists (
       select 1
       from public.performance_bonds bond
       where bond.offer_id = offer_row.id
         and bond.side = 'offerer'
         and bond.enabled = true
     ) then
    raise exception using
      errcode = '23514',
      message = 'Bonded pledge swaps require a signed-in member response.';
  end if;

  update public.guest_interests
  set status = 'accepted', updated_at = now()
  where id = guest_interest_row.id;

  insert into public.agreements (
    offer_id,
    interest_id,
    proposer_id,
    responder_id,
    status,
    notes,
    source,
    structured_terms,
    no_trade_baseline,
    counterfactual_declaration,
    duration_terms,
    exit_conditions,
    evidence_rule,
    privacy_scope,
    disclosure_scope,
    completion_state
  ) values (
    offer_row.id,
    null,
    actor_id,
    guest_interest_row.claimed_by_profile_id,
    'active',
    normalized_notes,
    'offer',
    concat_ws(' ', offer_row.offer_action, 'for', offer_row.request_action),
    offer_row.no_trade_baseline,
    '',
    offer_row.duration,
    offer_row.exit_conditions,
    offer_row.verification,
    coalesce(
      nullif(btrim(offer_row.privacy_scope), ''),
      'Agreement participants can see this room. Broader publication waits for reviewed completion.'
    ),
    'Share only the details needed to verify this agreement and resolve disputes.',
    'pending_evidence'
  )
  returning id into agreement_id_value;

  update public.guest_interests
  set status = 'declined', updated_at = now()
  where offer_id = offer_row.id
    and id <> guest_interest_row.id
    and status = 'pending';

  update public.interests
  set status = 'declined', updated_at = now()
  where offer_id = offer_row.id
    and status = 'pending';

  update public.offers
  set status = 'matched', updated_at = now()
  where id = offer_row.id;

  select * into agreement_row
  from public.agreements
  where id = agreement_id_value;

  return jsonb_build_object(
    'agreement', to_jsonb(agreement_row),
    'created', true
  );
end;
$function$;

comment on function public.accept_marketplace_guest_interest_v1(uuid, uuid, text) is
  'Atomically accepts a claimed guest response, creates its proposed agreement and frozen version, declines competing responses, and closes the public offer. Any failure rolls back every mutation.';

revoke all on function public.accept_marketplace_guest_interest_v1(uuid, uuid, text)
  from public, anon;
grant execute on function public.accept_marketplace_guest_interest_v1(uuid, uuid, text)
  to authenticated;

notify pgrst, 'reload schema';
