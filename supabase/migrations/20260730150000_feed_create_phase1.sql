-- Phase 1: authenticated Feed recommendations can seed private, source-bound
-- bilateral counteroffer drafts. The source relationship is durable, while
-- recommendation scores/reasons remain transient and are never stored here.
begin;

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.moral_trade_feed_create_links (
  id uuid primary key default gen_random_uuid(),
  creator_profile_id uuid not null references public.profiles(id) on delete cascade,
  derived_offer_id uuid not null unique references public.offers(id) on delete cascade,
  source_exposure_id uuid not null references public.recommendation_exposures(id) on delete restrict,
  exposure_request_id uuid not null,
  source_opportunity_type text not null check (source_opportunity_type = 'offer'),
  source_offer_id uuid not null references public.offers(id) on delete restrict,
  source_owner_profile_id uuid not null references public.profiles(id) on delete restrict,
  counterparty_profile_id uuid not null references public.profiles(id) on delete restrict,
  source_terms_version integer not null check (source_terms_version > 0),
  derivation_mode text not null check (derivation_mode = 'counteroffer'),
  source_snapshot_json jsonb not null check (
    jsonb_typeof(source_snapshot_json) = 'object'
    and source_snapshot_json ?& array[
      'ownerAlias', 'offeredCause', 'requestedCause', 'offerAction',
      'requestAction', 'verification', 'duration', 'termsVersion', 'publishedAt'
    ]
    and source_snapshot_json - array[
      'ownerAlias', 'offeredCause', 'requestedCause', 'offerAction',
      'requestAction', 'verification', 'duration', 'termsVersion', 'publishedAt'
    ] = '{}'::jsonb
  ),
  source_snapshot_hash text not null check (source_snapshot_hash ~ '^[0-9a-f]{64}$'),
  imported_field_reviews jsonb not null check (
    imported_field_reviews = '{"counterparty":true,"duration":true,"evidence_rule":true,"offered_cause":true,"proposed_action":true,"requested_action":true,"requested_cause":true}'::jsonb
  ),
  duplicate_acknowledged boolean not null default false,
  submitted_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (creator_profile_id <> source_owner_profile_id),
  check (source_owner_profile_id = counterparty_profile_id)
);

comment on table public.moral_trade_feed_create_links is
  'Phase-1 provenance for private Feed-derived counteroffer drafts. Stores only public source terms and explicit review receipts; never stores match scores, match reasons, private preference features, or payment credentials.';

create index if not exists moral_trade_feed_create_links_creator_source_idx
  on public.moral_trade_feed_create_links(creator_profile_id, source_offer_id, created_at desc);
create index if not exists moral_trade_feed_create_links_source_owner_idx
  on public.moral_trade_feed_create_links(source_owner_profile_id, created_at desc);
create index if not exists moral_trade_feed_create_links_exposure_idx
  on public.moral_trade_feed_create_links(source_exposure_id);
create index if not exists moral_trade_feed_create_links_source_offer_idx
  on public.moral_trade_feed_create_links(source_offer_id);
create index if not exists moral_trade_feed_create_links_counterparty_idx
  on public.moral_trade_feed_create_links(counterparty_profile_id);

create table if not exists public.moral_trade_feed_create_events (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  source_exposure_id uuid not null references public.recommendation_exposures(id) on delete cascade,
  source_opportunity_type text not null check (source_opportunity_type = 'offer'),
  source_opportunity_id uuid not null references public.offers(id) on delete cascade,
  exposure_request_id uuid not null,
  event_type text not null check (event_type in (
    'action_shown',
    'action_clicked',
    'create_opened',
    'draft_saved',
    'proposal_submitted',
    'trade_completed'
  )),
  derivation_mode text not null default 'counteroffer' check (derivation_mode = 'counteroffer'),
  rank integer check (rank is null or rank between 1 and 1000),
  derived_offer_id uuid references public.offers(id) on delete cascade,
  agreement_id uuid references public.agreements(id) on delete cascade,
  idempotency_key text not null unique,
  occurred_at timestamptz not null default timezone('utc', now()),
  check (
    (event_type in ('action_shown', 'action_clicked', 'create_opened') and derived_offer_id is null and agreement_id is null)
    or (event_type in ('draft_saved', 'proposal_submitted') and derived_offer_id is not null and agreement_id is null)
    or (event_type = 'trade_completed' and derived_offer_id is not null and agreement_id is not null)
  )
);

comment on table public.moral_trade_feed_create_events is
  'Privacy-minimal Feed-to-Create funnel events. Contains typed identifiers and rank only; form text, moral preferences, match explanations, evidence, payment data, and identity prose are prohibited by schema.';

create index if not exists moral_trade_feed_create_events_profile_time_idx
  on public.moral_trade_feed_create_events(profile_id, occurred_at desc);
create index if not exists moral_trade_feed_create_events_source_time_idx
  on public.moral_trade_feed_create_events(source_opportunity_id, occurred_at desc);
create index if not exists moral_trade_feed_create_events_derived_idx
  on public.moral_trade_feed_create_events(derived_offer_id, occurred_at desc)
  where derived_offer_id is not null;
create index if not exists moral_trade_feed_create_events_agreement_idx
  on public.moral_trade_feed_create_events(agreement_id)
  where agreement_id is not null;

create or replace function public.moral_trade_feed_create_set_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $function$
begin
  new.updated_at := timezone('utc', now());
  return new;
end;
$function$;

create trigger moral_trade_feed_create_links_set_updated_at
before update on public.moral_trade_feed_create_links
for each row execute function public.moral_trade_feed_create_set_updated_at();

alter table public.moral_trade_feed_create_links enable row level security;
alter table public.moral_trade_feed_create_events enable row level security;

revoke all on public.moral_trade_feed_create_links from public, anon, authenticated;
revoke all on public.moral_trade_feed_create_events from public, anon, authenticated;
grant select on public.moral_trade_feed_create_links to authenticated;
grant select on public.moral_trade_feed_create_events to authenticated;
grant all on public.moral_trade_feed_create_links to service_role;
grant all on public.moral_trade_feed_create_events to service_role;

create policy moral_trade_feed_create_links_owner_select
on public.moral_trade_feed_create_links
for select to authenticated
using (creator_profile_id = (select auth.uid()));

create policy moral_trade_feed_create_events_owner_select
on public.moral_trade_feed_create_events
for select to authenticated
using (profile_id = (select auth.uid()));

create or replace function public.moral_trade_feed_create_record_event_service(
  p_actor_id uuid,
  p_event_type text,
  p_source_opportunity_type text,
  p_source_opportunity_id uuid,
  p_exposure_request_id uuid,
  p_source_terms_version integer,
  p_derived_offer_id uuid default null,
  p_agreement_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  exposure_row public.recommendation_exposures%rowtype;
  source_row public.offers%rowtype;
  link_row public.moral_trade_feed_create_links%rowtype;
  event_id uuid;
  event_key text;
begin
  if p_actor_id is null then
    raise exception using errcode = '42501', message = 'An authenticated actor is required.';
  end if;
  if p_event_type not in (
    'action_shown', 'action_clicked', 'create_opened',
    'draft_saved', 'proposal_submitted', 'trade_completed'
  ) then
    raise exception using errcode = '22023', message = 'Unsupported Feed-to-Create event type.';
  end if;
  if p_source_opportunity_type <> 'offer' then
    raise exception using errcode = '22023', message = 'Only bilateral offers may enter Feed-to-Create Phase 1.';
  end if;

  select * into exposure_row
  from public.recommendation_exposures
  where profile_id = p_actor_id
    and request_id = p_exposure_request_id
    and opportunity_type = p_source_opportunity_type
    and opportunity_id = p_source_opportunity_id::text
    and was_shown = true
  limit 1;

  if exposure_row.id is null then
    raise exception using errcode = '42501', message = 'The Feed exposure receipt is missing or does not belong to this user.';
  end if;

  select * into source_row
  from public.offers
  where id = p_source_opportunity_id
  limit 1;

  if p_event_type <> 'trade_completed' and (
    source_row.id is null
    or source_row.owner_id is distinct from exposure_row.owner_id
    or source_row.owner_id = p_actor_id
    or source_row.mode::text <> 'pledge'
    or source_row.status::text <> 'open'
    or source_row.workflow_status <> 'published'
    or source_row.published_at is null
    or source_row.closed_at is not null
    or source_row.deleted_at is not null
    or source_row.terms_version <> p_source_terms_version
  ) then
    raise exception using errcode = '23514', message = 'The Feed source is no longer an eligible open bilateral offer at the shown revision.';
  end if;

  if p_event_type in ('draft_saved', 'proposal_submitted', 'trade_completed') then
    select * into link_row
    from public.moral_trade_feed_create_links
    where creator_profile_id = p_actor_id
      and derived_offer_id = p_derived_offer_id
      and source_exposure_id = exposure_row.id
      and source_offer_id = p_source_opportunity_id
    limit 1;
    if link_row.id is null then
      raise exception using errcode = '42501', message = 'The derived offer is not linked to this authenticated Feed source.';
    end if;
  end if;

  if p_event_type = 'trade_completed' then
    if p_agreement_id is null or not exists (
      select 1 from public.agreements
      where id = p_agreement_id
        and offer_id = p_derived_offer_id
        and (
          lifecycle_status = 'completed'
          or completion_state = 'reviewed_complete'
        )
    ) then
      raise exception using errcode = '23514', message = 'A completed linked agreement is required for the completion event.';
    end if;
  elsif p_agreement_id is not null then
    raise exception using errcode = '22023', message = 'Only completion events may reference an agreement.';
  end if;

  event_key := concat_ws(':',
    'feed-create-v1',
    p_actor_id::text,
    p_event_type,
    exposure_row.id::text,
    coalesce(p_derived_offer_id::text, ''),
    coalesce(p_agreement_id::text, '')
  );

  insert into public.moral_trade_feed_create_events (
    profile_id,
    source_exposure_id,
    source_opportunity_type,
    source_opportunity_id,
    exposure_request_id,
    event_type,
    rank,
    derived_offer_id,
    agreement_id,
    idempotency_key
  ) values (
    p_actor_id,
    exposure_row.id,
    p_source_opportunity_type,
    p_source_opportunity_id,
    p_exposure_request_id,
    p_event_type,
    exposure_row.rank,
    p_derived_offer_id,
    p_agreement_id,
    event_key
  )
  on conflict (idempotency_key) do update
    set occurred_at = public.moral_trade_feed_create_events.occurred_at
  returning id into event_id;

  if event_id is null then
    select id into event_id
    from public.moral_trade_feed_create_events
    where idempotency_key = event_key;
  end if;

  return event_id;
end;
$function$;

comment on function public.moral_trade_feed_create_record_event_service(uuid, text, text, uuid, uuid, integer, uuid, uuid) is
  'Service-only, receipt-bound, privacy-minimal Feed-to-Create funnel event writer.';

revoke all on function public.moral_trade_feed_create_record_event_service(uuid, text, text, uuid, uuid, integer, uuid, uuid)
from public, anon, authenticated;
grant execute on function public.moral_trade_feed_create_record_event_service(uuid, text, text, uuid, uuid, integer, uuid, uuid)
to service_role;

create or replace function public.moral_trade_feed_create_save_service(
  p_actor_id uuid,
  p_intent text,
  p_submission_key text,
  p_source_opportunity_type text,
  p_source_opportunity_id uuid,
  p_exposure_request_id uuid,
  p_source_terms_version integer,
  p_imported_field_reviews jsonb,
  p_duplicate_acknowledged boolean,
  p_offered_cause text,
  p_requested_cause text,
  p_proposed_action text,
  p_requested_action text,
  p_no_trade_baseline text,
  p_duration text,
  p_start_date date,
  p_evidence_due_date date,
  p_evidence_rule text,
  p_maximum_burden text,
  p_privacy_scope text,
  p_exit_conditions text,
  p_notes text
)
returns table (
  derived_offer_id uuid,
  link_id uuid,
  workflow_status text
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  exposure_row public.recommendation_exposures%rowtype;
  source_row public.offers%rowtype;
  existing_offer public.offers%rowtype;
  existing_link public.moral_trade_feed_create_links%rowtype;
  actor_alias text;
  active_duplicate_count integer;
  new_offer_id uuid := gen_random_uuid();
  new_link_id uuid := gen_random_uuid();
  now_value timestamptz := timezone('utc', now());
  workflow_value text;
  source_snapshot jsonb;
  source_snapshot_hash text;
  fingerprint_value text;
  review_key text;
  required_reviews text[] := array[
    'counterparty',
    'offered_cause',
    'requested_cause',
    'proposed_action',
    'requested_action',
    'duration',
    'evidence_rule'
  ];
begin
  if p_actor_id is null then
    raise exception using errcode = '42501', message = 'An authenticated actor is required.';
  end if;
  if p_intent not in ('draft', 'submit') then
    raise exception using errcode = '22023', message = 'Feed-to-Create intent must be draft or submit.';
  end if;
  if p_source_opportunity_type <> 'offer' then
    raise exception using errcode = '22023', message = 'Only bilateral offers may enter Feed-to-Create Phase 1.';
  end if;
  if nullif(btrim(p_submission_key), '') is null
     or length(p_submission_key) > 120
     or p_submission_key !~ '^[A-Za-z0-9:_-]+$' then
    raise exception using errcode = '22023', message = 'Submission key is invalid.';
  end if;
  if jsonb_typeof(p_imported_field_reviews) <> 'object'
     or p_imported_field_reviews - required_reviews <> '{}'::jsonb then
    raise exception using errcode = '22023', message = 'Imported-field review receipts contain unsupported fields.';
  end if;
  foreach review_key in array required_reviews loop
    if coalesce(p_imported_field_reviews ->> review_key, '') <> 'true' then
      raise exception using errcode = '23514', message = 'Review every imported material field before saving.';
    end if;
  end loop;

  if nullif(btrim(p_offered_cause), '') is null
     or nullif(btrim(p_requested_cause), '') is null
     or nullif(btrim(p_proposed_action), '') is null
     or nullif(btrim(p_requested_action), '') is null
     or nullif(btrim(p_no_trade_baseline), '') is null
     or nullif(btrim(p_duration), '') is null
     or nullif(btrim(p_evidence_rule), '') is null
     or nullif(btrim(p_maximum_burden), '') is null
     or nullif(btrim(p_privacy_scope), '') is null
     or nullif(btrim(p_exit_conditions), '') is null then
    raise exception using errcode = '22023', message = 'Complete every required counteroffer field before saving.';
  end if;
  if greatest(
    length(p_offered_cause), length(p_requested_cause), length(p_proposed_action),
    length(p_requested_action), length(p_no_trade_baseline), length(p_duration),
    length(p_evidence_rule), length(p_maximum_burden), length(p_privacy_scope),
    length(p_exit_conditions), length(coalesce(p_notes, ''))
  ) > 5000 then
    raise exception using errcode = '22023', message = 'A Feed-derived counteroffer field is too long.';
  end if;
  if p_start_date is not null and p_start_date < current_date then
    raise exception using errcode = '22023', message = 'The start date cannot be in the past.';
  end if;
  if p_evidence_due_date is not null and p_evidence_due_date < current_date then
    raise exception using errcode = '22023', message = 'The evidence due date cannot be in the past.';
  end if;
  if p_start_date is not null and p_evidence_due_date is not null and p_evidence_due_date < p_start_date then
    raise exception using errcode = '22023', message = 'Evidence cannot be due before the commitment starts.';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(p_actor_id::text || ':feed-create:' || p_source_opportunity_id::text, 0)
  );
  perform pg_advisory_xact_lock(
    hashtextextended(p_actor_id::text || ':feed-create-key:' || p_submission_key, 0)
  );

  select * into exposure_row
  from public.recommendation_exposures
  where profile_id = p_actor_id
    and request_id = p_exposure_request_id
    and opportunity_type = p_source_opportunity_type
    and opportunity_id = p_source_opportunity_id::text
    and was_shown = true
  limit 1;

  if exposure_row.id is null then
    raise exception using errcode = '42501', message = 'The Feed exposure receipt is missing or does not belong to this user.';
  end if;

  select * into source_row
  from public.offers
  where id = p_source_opportunity_id
  for share;

  if source_row.id is null
     or source_row.owner_id is distinct from exposure_row.owner_id
     or source_row.owner_id = p_actor_id
     or source_row.mode::text <> 'pledge'
     or source_row.status::text <> 'open'
     or source_row.workflow_status <> 'published'
     or source_row.published_at is null
     or source_row.closed_at is not null
     or source_row.deleted_at is not null
     or source_row.terms_version <> p_source_terms_version
     or nullif(btrim(source_row.offered_cause), '') is null
     or nullif(btrim(source_row.requested_cause), '') is null
     or nullif(btrim(source_row.offer_action), '') is null
     or nullif(btrim(source_row.request_action), '') is null
     or nullif(btrim(source_row.verification), '') is null
     or nullif(btrim(source_row.duration), '') is null then
    raise exception using errcode = '23514', message = 'The Feed source is no longer an eligible open bilateral offer at the shown revision.';
  end if;

  select coalesce(nullif(btrim(display_name), ''), nullif(btrim(email), ''), 'Moral Trade participant')
  into actor_alias
  from public.profiles
  where id = p_actor_id;
  if actor_alias is null then
    raise exception using errcode = '23503', message = 'A Moral Trade profile is required before saving.';
  end if;

  select * into existing_offer
  from public.offers
  where owner_id = p_actor_id
    and submission_key = p_submission_key
  limit 1;

  if existing_offer.id is not null then
    select * into existing_link
    from public.moral_trade_feed_create_links as existing_feed_link
    where existing_feed_link.derived_offer_id = existing_offer.id
      and existing_feed_link.creator_profile_id = p_actor_id
      and existing_feed_link.source_exposure_id = exposure_row.id
      and existing_feed_link.source_offer_id = source_row.id
      and existing_feed_link.source_terms_version = p_source_terms_version
    limit 1;
    if existing_link.id is null then
      raise exception using errcode = '23514', message = 'This submission key was already used for a different proposal.';
    end if;
    return query select existing_offer.id, existing_link.id, existing_offer.workflow_status;
    return;
  end if;

  select count(*)::integer into active_duplicate_count
  from public.moral_trade_feed_create_links link
  join public.offers derived on derived.id = link.derived_offer_id
  where link.creator_profile_id = p_actor_id
    and link.source_offer_id = p_source_opportunity_id
    and derived.status::text <> 'closed'
    and derived.workflow_status not in ('closed', 'deleted', 'rejected');

  if active_duplicate_count > 0 and coalesce(p_duplicate_acknowledged, false) = false then
    raise exception using errcode = '23514', message = 'An active draft already exists for this Feed opportunity. Acknowledge the duplicate before creating another.';
  end if;

  source_snapshot := jsonb_build_object(
    'ownerAlias', source_row.owner_alias,
    'offeredCause', source_row.offered_cause,
    'requestedCause', source_row.requested_cause,
    'offerAction', source_row.offer_action,
    'requestAction', source_row.request_action,
    'verification', source_row.verification,
    'duration', source_row.duration,
    'termsVersion', source_row.terms_version,
    'publishedAt', source_row.published_at
  );
  source_snapshot_hash := encode(
    extensions.digest(convert_to(source_snapshot::text, 'UTF8'), 'sha256'),
    'hex'
  );
  fingerprint_value := encode(
    extensions.digest(convert_to(concat_ws(chr(31),
      lower(btrim(p_offered_cause)), lower(btrim(p_requested_cause)),
      lower(btrim(p_proposed_action)), lower(btrim(p_requested_action)),
      lower(btrim(p_no_trade_baseline)), lower(btrim(p_duration)),
      lower(btrim(p_evidence_rule)), lower(btrim(p_maximum_burden)),
      lower(btrim(p_privacy_scope)), lower(btrim(p_exit_conditions)),
      p_source_opportunity_id::text, p_submission_key
    ), 'UTF8'), 'sha256'),
    'hex'
  );
  workflow_value := case when p_intent = 'submit' then 'pending_review' else 'draft' end;

  insert into public.offers (
    id,
    owner_id,
    owner_alias,
    mode,
    offered_cause,
    requested_cause,
    offer_action,
    request_action,
    compromise_cause,
    offer_impact,
    min_counterparty_impact,
    verification,
    duration,
    trust_level,
    notes,
    discount_note,
    status,
    workflow_status,
    moderation_reason,
    submission_key,
    fingerprint,
    no_trade_baseline,
    start_date,
    exit_conditions,
    maximum_burden,
    privacy_scope,
    evidence_due_date,
    submitted_at,
    terms_version
  ) values (
    new_offer_id,
    p_actor_id,
    actor_alias,
    'pledge',
    btrim(p_offered_cause),
    btrim(p_requested_cause),
    btrim(p_proposed_action),
    btrim(p_requested_action),
    'Not needed',
    5,
    5,
    btrim(p_evidence_rule),
    btrim(p_duration),
    1,
    left(coalesce(p_notes, ''), 5000),
    '',
    'paused',
    workflow_value,
    '',
    p_submission_key,
    fingerprint_value,
    btrim(p_no_trade_baseline),
    p_start_date,
    btrim(p_exit_conditions),
    btrim(p_maximum_burden),
    btrim(p_privacy_scope),
    p_evidence_due_date,
    case when p_intent = 'submit' then now_value else null end,
    1
  );

  insert into public.moral_trade_feed_create_links (
    id,
    creator_profile_id,
    derived_offer_id,
    source_exposure_id,
    exposure_request_id,
    source_opportunity_type,
    source_offer_id,
    source_owner_profile_id,
    counterparty_profile_id,
    source_terms_version,
    derivation_mode,
    source_snapshot_json,
    source_snapshot_hash,
    imported_field_reviews,
    duplicate_acknowledged,
    submitted_at
  ) values (
    new_link_id,
    p_actor_id,
    new_offer_id,
    exposure_row.id,
    p_exposure_request_id,
    p_source_opportunity_type,
    source_row.id,
    source_row.owner_id,
    source_row.owner_id,
    p_source_terms_version,
    'counteroffer',
    source_snapshot,
    source_snapshot_hash,
    p_imported_field_reviews,
    coalesce(p_duplicate_acknowledged, false),
    case when p_intent = 'submit' then now_value else null end
  );

  insert into public.core_loop_events (
    profile_id,
    event_type,
    entity_type,
    entity_id,
    idempotency_key,
    metadata
  ) values (
    p_actor_id,
    'offer_draft_saved',
    'offer',
    new_offer_id,
    'offer_draft_saved:' || p_actor_id::text || ':offer:' || new_offer_id::text,
    jsonb_build_object('source', 'feed_create_v1', 'derivationMode', 'counteroffer')
  ) on conflict (idempotency_key) do nothing;

  perform public.moral_trade_feed_create_record_event_service(
    p_actor_id,
    'draft_saved',
    p_source_opportunity_type,
    p_source_opportunity_id,
    p_exposure_request_id,
    p_source_terms_version,
    new_offer_id,
    null
  );

  if p_intent = 'submit' then
    insert into public.trade_review_events (
      offer_id,
      reviewer_id,
      action,
      reason,
      metadata
    ) values (
      new_offer_id,
      null,
      'submitted',
      'Feed-derived source-bound counteroffer submitted for Phase-1 operator review.',
      jsonb_build_object('feedCreateLinkId', new_link_id, 'deliveryBlocked', true)
    );

    insert into public.core_loop_events (
      profile_id,
      event_type,
      entity_type,
      entity_id,
      idempotency_key,
      metadata
    ) values (
      p_actor_id,
      'offer_submitted',
      'offer',
      new_offer_id,
      'offer_submitted:' || p_actor_id::text || ':offer:' || new_offer_id::text,
      jsonb_build_object('source', 'feed_create_v1', 'derivationMode', 'counteroffer', 'deliveryBlocked', true)
    ) on conflict (idempotency_key) do nothing;

    perform public.moral_trade_feed_create_record_event_service(
      p_actor_id,
      'proposal_submitted',
      p_source_opportunity_type,
      p_source_opportunity_id,
      p_exposure_request_id,
      p_source_terms_version,
      new_offer_id,
      null
    );
  end if;

  return query select new_offer_id, new_link_id, workflow_value;
end;
$function$;

comment on function public.moral_trade_feed_create_save_service(uuid, text, text, text, uuid, uuid, integer, jsonb, boolean, text, text, text, text, text, text, date, date, text, text, text, text, text) is
  'Service-only atomic creation of a private Feed-derived bilateral counteroffer and its provenance. Phase 1 never publishes, delivers, invites, creates a thread, creates an agreement, or authorizes payment.';

revoke all on function public.moral_trade_feed_create_save_service(uuid, text, text, text, uuid, uuid, integer, jsonb, boolean, text, text, text, text, text, text, date, date, text, text, text, text, text)
from public, anon, authenticated;
grant execute on function public.moral_trade_feed_create_save_service(uuid, text, text, text, uuid, uuid, integer, jsonb, boolean, text, text, text, text, text, text, date, date, text, text, text, text, text)
to service_role;

create or replace function public.moral_trade_feed_create_guard_offer_update()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $function$
declare
  link_row public.moral_trade_feed_create_links%rowtype;
  source_row public.offers%rowtype;
begin
  select * into link_row
  from public.moral_trade_feed_create_links
  where derived_offer_id = old.id
  limit 1;
  if link_row.id is null then
    return new;
  end if;

  if new.owner_id is distinct from old.owner_id or new.mode::text <> 'pledge' then
    raise exception using errcode = '23514', message = 'A Feed-derived counteroffer cannot change its creator or trade mode.';
  end if;
  if new.workflow_status = 'published' or new.status::text = 'open' or new.published_at is not null then
    raise exception using errcode = '42501', message = 'Feed-derived counteroffers cannot be published or delivered in Phase 1.';
  end if;

  if new.workflow_status = 'pending_review' then
    select * into source_row from public.offers where id = link_row.source_offer_id;
    if source_row.id is null
       or source_row.owner_id <> link_row.source_owner_profile_id
       or source_row.mode::text <> 'pledge'
       or source_row.status::text <> 'open'
       or source_row.workflow_status <> 'published'
       or source_row.closed_at is not null
       or source_row.deleted_at is not null
       or source_row.terms_version <> link_row.source_terms_version then
      raise exception using errcode = '23514', message = 'The original Feed offer changed or closed. This counteroffer cannot be resubmitted from the stale source revision.';
    end if;
  end if;

  return new;
end;
$function$;

create trigger moral_trade_feed_create_guard_offer_update
before update on public.offers
for each row execute function public.moral_trade_feed_create_guard_offer_update();

create or replace function public.moral_trade_feed_create_guard_offer_relation()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $function$
declare
  guarded_offer_id uuid;
begin
  guarded_offer_id := new.offer_id;
  if guarded_offer_id is not null and exists (
    select 1 from public.moral_trade_feed_create_links where derived_offer_id = guarded_offer_id
  ) then
    raise exception using errcode = '42501', message = 'Feed-derived counteroffers cannot create invitations, responses, threads, or agreements in Phase 1.';
  end if;
  return new;
end;
$function$;

create trigger moral_trade_feed_create_guard_invitations
before insert or update of offer_id on public.trade_invitations
for each row execute function public.moral_trade_feed_create_guard_offer_relation();

create trigger moral_trade_feed_create_guard_threads
before insert or update of offer_id on public.trade_threads
for each row execute function public.moral_trade_feed_create_guard_offer_relation();

create trigger moral_trade_feed_create_guard_agreements
before insert or update of offer_id on public.agreements
for each row execute function public.moral_trade_feed_create_guard_offer_relation();

create trigger moral_trade_feed_create_guard_interests
before insert or update of offer_id on public.interests
for each row execute function public.moral_trade_feed_create_guard_offer_relation();

create trigger moral_trade_feed_create_guard_guest_interests
before insert or update of offer_id on public.guest_interests
for each row execute function public.moral_trade_feed_create_guard_offer_relation();

create or replace function public.moral_trade_feed_create_record_completion()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  link_row public.moral_trade_feed_create_links%rowtype;
begin
  if new.offer_id is null then
    return new;
  end if;
  if not (
    new.lifecycle_status = 'completed'
    or new.completion_state = 'reviewed_complete'
  ) then
    return new;
  end if;

  select * into link_row
  from public.moral_trade_feed_create_links
  where derived_offer_id = new.offer_id
  limit 1;
  if link_row.id is null then
    return new;
  end if;

  perform public.moral_trade_feed_create_record_event_service(
    link_row.creator_profile_id,
    'trade_completed',
    link_row.source_opportunity_type,
    link_row.source_offer_id,
    link_row.exposure_request_id,
    link_row.source_terms_version,
    link_row.derived_offer_id,
    new.id
  );
  return new;
end;
$function$;

create trigger moral_trade_feed_create_record_completion
after update of lifecycle_status, completion_state on public.agreements
for each row execute function public.moral_trade_feed_create_record_completion();

commit;
