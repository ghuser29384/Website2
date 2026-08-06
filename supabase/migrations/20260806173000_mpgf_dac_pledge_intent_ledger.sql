begin;

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.mpgf_pledge_intents (
  id uuid primary key default gen_random_uuid(),
  campaign_id text not null
    references public.mpgf_public_goods_campaigns (id) on delete restrict,
  pool_proposal_id uuid not null
    references public.mpgf_pool_proposals (id) on delete restrict,
  terms_version integer not null,
  terms_sha256 text not null,
  profile_id uuid not null
    references public.profiles (id) on delete restrict,
  idempotency_key_hash text not null,
  amount_cents bigint not null,
  currency text not null default 'usd',
  visibility_mode text not null,
  supporter_reason text,
  consent_json jsonb not null,
  consent_sha256 text not null,
  accepted_at timestamptz not null,
  created_at timestamptz not null default timezone('utc', now()),
  constraint mpgf_pledge_intents_terms_version_positive
    check (terms_version > 0),
  constraint mpgf_pledge_intents_terms_hash_format
    check (terms_sha256 ~ '^sha256:[a-f0-9]{64}$'),
  constraint mpgf_pledge_intents_idempotency_hash_format
    check (idempotency_key_hash ~ '^sha256:[a-f0-9]{64}$'),
  constraint mpgf_pledge_intents_amount_positive
    check (amount_cents > 0),
  constraint mpgf_pledge_intents_currency_usd
    check (currency = 'usd'),
  constraint mpgf_pledge_intents_visibility_valid
    check (visibility_mode in ('private_amount', 'public_supporter', 'public_reason')),
  constraint mpgf_pledge_intents_supporter_reason_length
    check (supporter_reason is null or char_length(supporter_reason) <= 500),
  constraint mpgf_pledge_intents_consent_object
    check (jsonb_typeof(consent_json) = 'object'),
  constraint mpgf_pledge_intents_consent_hash_format
    check (consent_sha256 ~ '^sha256:[a-f0-9]{64}$'),
  constraint mpgf_pledge_intents_proposal_version_fkey
    foreign key (pool_proposal_id, terms_version)
    references public.mpgf_pool_proposal_versions (proposal_id, terms_version)
    on delete restrict,
  constraint mpgf_pledge_intents_profile_idempotency_key
    unique (profile_id, idempotency_key_hash)
);

create index if not exists mpgf_pledge_intents_campaign_created_idx
  on public.mpgf_pledge_intents (campaign_id, created_at);
create index if not exists mpgf_pledge_intents_proposal_version_idx
  on public.mpgf_pledge_intents (pool_proposal_id, terms_version);
create index if not exists mpgf_pledge_intents_profile_created_idx
  on public.mpgf_pledge_intents (profile_id, created_at desc);

alter table public.mpgf_public_goods_pledges
  add column if not exists pledge_intent_id uuid,
  add column if not exists pool_proposal_id uuid,
  add column if not exists terms_version integer,
  add column if not exists terms_sha256 text,
  add column if not exists accepted_at timestamptz,
  add column if not exists expires_at timestamptz;

do $migration$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.mpgf_public_goods_pledges'::regclass
      and conname = 'mpgf_public_goods_pledges_intent_fkey'
  ) then
    alter table public.mpgf_public_goods_pledges
      add constraint mpgf_public_goods_pledges_intent_fkey
      foreign key (pledge_intent_id)
      references public.mpgf_pledge_intents (id)
      on delete restrict;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.mpgf_public_goods_pledges'::regclass
      and conname = 'mpgf_public_goods_pledges_proposal_fkey'
  ) then
    alter table public.mpgf_public_goods_pledges
      add constraint mpgf_public_goods_pledges_proposal_fkey
      foreign key (pool_proposal_id)
      references public.mpgf_pool_proposals (id)
      on delete restrict;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.mpgf_public_goods_pledges'::regclass
      and conname = 'mpgf_public_goods_pledges_proposal_version_fkey'
  ) then
    alter table public.mpgf_public_goods_pledges
      add constraint mpgf_public_goods_pledges_proposal_version_fkey
      foreign key (pool_proposal_id, terms_version)
      references public.mpgf_pool_proposal_versions (proposal_id, terms_version)
      on delete restrict;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.mpgf_public_goods_pledges'::regclass
      and conname = 'mpgf_public_goods_pledges_dac_binding_complete'
  ) then
    alter table public.mpgf_public_goods_pledges
      add constraint mpgf_public_goods_pledges_dac_binding_complete
      check (
        (
          pledge_intent_id is null
          and pool_proposal_id is null
          and terms_version is null
          and terms_sha256 is null
          and accepted_at is null
          and expires_at is null
        )
        or
        (
          pledge_intent_id is not null
          and pool_proposal_id is not null
          and terms_version is not null
          and terms_version > 0
          and terms_sha256 ~ '^sha256:[a-f0-9]{64}$'
          and accepted_at is not null
          and expires_at is not null
          and expires_at > accepted_at
          and capture_mode = 'signed_intent'
          and is_recurring = false
        )
      ) not valid;
  end if;
end;
$migration$;

alter table public.mpgf_public_goods_pledges
  validate constraint mpgf_public_goods_pledges_dac_binding_complete;

create unique index if not exists mpgf_public_goods_pledges_intent_unique_idx
  on public.mpgf_public_goods_pledges (pledge_intent_id)
  where pledge_intent_id is not null;
create index if not exists mpgf_public_goods_pledges_dac_campaign_state_idx
  on public.mpgf_public_goods_pledges (
    campaign_id,
    eligibility_state,
    status,
    expires_at
  )
  where pledge_intent_id is not null;
create index if not exists mpgf_public_goods_pledges_dac_proposal_version_idx
  on public.mpgf_public_goods_pledges (pool_proposal_id, terms_version)
  where pledge_intent_id is not null;

create table if not exists public.mpgf_dac_pledge_events (
  id uuid primary key default gen_random_uuid(),
  pledge_intent_id uuid not null
    references public.mpgf_pledge_intents (id) on delete restrict,
  pledge_id uuid not null
    references public.mpgf_public_goods_pledges (id) on delete restrict,
  campaign_id text not null
    references public.mpgf_public_goods_campaigns (id) on delete restrict,
  pool_proposal_id uuid not null
    references public.mpgf_pool_proposals (id) on delete restrict,
  profile_id uuid not null
    references public.profiles (id) on delete restrict,
  event_type text not null,
  terms_version integer not null,
  terms_sha256 text not null,
  amount_cents bigint not null,
  currency text not null,
  event_json jsonb not null,
  event_sha256 text not null,
  created_at timestamptz not null default timezone('utc', now()),
  constraint mpgf_dac_pledge_events_type_valid
    check (event_type = 'pledge_created'),
  constraint mpgf_dac_pledge_events_terms_version_positive
    check (terms_version > 0),
  constraint mpgf_dac_pledge_events_terms_hash_format
    check (terms_sha256 ~ '^sha256:[a-f0-9]{64}$'),
  constraint mpgf_dac_pledge_events_amount_positive
    check (amount_cents > 0),
  constraint mpgf_dac_pledge_events_currency_usd
    check (currency = 'usd'),
  constraint mpgf_dac_pledge_events_event_object
    check (jsonb_typeof(event_json) = 'object'),
  constraint mpgf_dac_pledge_events_event_hash_format
    check (event_sha256 ~ '^sha256:[a-f0-9]{64}$'),
  constraint mpgf_dac_pledge_events_one_creation
    unique (pledge_id, event_type)
);

create index if not exists mpgf_dac_pledge_events_campaign_created_idx
  on public.mpgf_dac_pledge_events (campaign_id, created_at);
create index if not exists mpgf_dac_pledge_events_profile_created_idx
  on public.mpgf_dac_pledge_events (profile_id, created_at desc);

create or replace function public.mpgf_dac_json_sha256(p_value jsonb)
returns text
language sql
immutable
strict
set search_path = pg_catalog, public
as $function$
  select 'sha256:' ||
    pg_catalog.encode(
      extensions.digest(pg_catalog.convert_to(p_value::text, 'UTF8'), 'sha256'),
      'hex'
    );
$function$;

revoke all on function public.mpgf_dac_json_sha256(jsonb)
  from public, anon, authenticated;

create or replace function public.mpgf_dac_immutable_row()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
begin
  raise exception using
    errcode = '23514',
    message = 'DAC pledge consent and audit records are immutable.';
end;
$function$;

revoke all on function public.mpgf_dac_immutable_row()
  from public, anon, authenticated;

drop trigger if exists mpgf_pledge_intents_immutable
  on public.mpgf_pledge_intents;
create trigger mpgf_pledge_intents_immutable
before update or delete on public.mpgf_pledge_intents
for each row execute function public.mpgf_dac_immutable_row();

drop trigger if exists mpgf_dac_pledge_events_immutable
  on public.mpgf_dac_pledge_events;
create trigger mpgf_dac_pledge_events_immutable
before update or delete on public.mpgf_dac_pledge_events
for each row execute function public.mpgf_dac_immutable_row();

create or replace function public.mpgf_guard_dac_public_goods_pledge()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  campaign_is_dac boolean := false;
  trusted_writer boolean := false;
  internal_write_token text := current_setting('app.mpgf_dac_internal_write', true);
begin
  trusted_writer :=
    auth.role() = 'service_role'
    or (auth.uid() is null and current_user in ('postgres', 'supabase_admin'))
    or (
      tg_op <> 'DELETE'
      and new.pledge_intent_id is not null
      and internal_write_token = new.pledge_intent_id::text
    );

  if tg_op = 'DELETE' then
    if old.pledge_intent_id is not null then
      raise exception using
        errcode = '23514',
        message = 'A DAC pledge cannot be deleted.';
    end if;
    return old;
  end if;

  select coalesce(proposal.public_goods_failure_bonus_enabled, false)
  into campaign_is_dac
  from public.mpgf_public_goods_campaigns as campaign
  join public.mpgf_pool_proposals as proposal
    on proposal.id = campaign.pool_proposal_id
  where campaign.id = new.campaign_id
    and campaign.review_status in ('approved', 'finalized')
    and campaign.published_terms_version is not null
    and campaign.published_terms_sha256 is not null;

  if campaign_is_dac and new.pledge_intent_id is null then
    raise exception using
      errcode = '23514',
      message = 'Published DAC campaigns accept pledges only through an immutable pledge intent.';
  end if;

  if new.pledge_intent_id is not null and not trusted_writer then
    raise exception using
      errcode = '42501',
      message = 'DAC pledge rows can be created or changed only through the authorized lifecycle.';
  end if;

  if tg_op = 'UPDATE' and old.pledge_intent_id is not null then
    if new.pledge_intent_id is distinct from old.pledge_intent_id
       or new.campaign_id is distinct from old.campaign_id
       or new.profile_id is distinct from old.profile_id
       or new.user_ref is distinct from old.user_ref
       or new.amount_cents is distinct from old.amount_cents
       or new.currency is distinct from old.currency
       or new.visibility_mode is distinct from old.visibility_mode
       or new.is_recurring is distinct from old.is_recurring
       or new.capture_mode is distinct from old.capture_mode
       or new.supporter_reason is distinct from old.supporter_reason
       or new.pool_proposal_id is distinct from old.pool_proposal_id
       or new.terms_version is distinct from old.terms_version
       or new.terms_sha256 is distinct from old.terms_sha256
       or new.accepted_at is distinct from old.accepted_at
       or new.expires_at is distinct from old.expires_at then
      raise exception using
        errcode = '23514',
        message = 'A DAC pledge''s identity, amount, consent, campaign, and frozen terms cannot change.';
    end if;
  end if;

  return new;
end;
$function$;

revoke all on function public.mpgf_guard_dac_public_goods_pledge()
  from public, anon, authenticated;

drop trigger if exists mpgf_guard_dac_public_goods_pledge
  on public.mpgf_public_goods_pledges;
create trigger mpgf_guard_dac_public_goods_pledge
before insert or update or delete on public.mpgf_public_goods_pledges
for each row execute function public.mpgf_guard_dac_public_goods_pledge();

drop trigger if exists mpgf_latch_dac_public_goods_campaign_accepted_pledge
  on public.mpgf_public_goods_pledges;
create trigger mpgf_latch_dac_public_goods_campaign_accepted_pledge
after insert or update of eligibility_state, status
on public.mpgf_public_goods_pledges
for each row
when (new.pledge_intent_id is not null)
execute function public.mpgf_latch_public_goods_campaign_accepted_pledge();

create or replace function public.mpgf_create_dac_pledge(
  p_campaign_id text,
  p_amount_cents bigint,
  p_visibility_mode text,
  p_supporter_reason text,
  p_idempotency_key text
)
returns table (
  pledge_intent_id uuid,
  pledge_id uuid,
  campaign_id text,
  pool_proposal_id uuid,
  terms_version integer,
  terms_sha256 text,
  amount_cents bigint,
  currency text,
  eligibility_state text,
  pledge_status text,
  accepted_at timestamptz,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  actor_id uuid := auth.uid();
  campaign_id_value text := btrim(coalesce(p_campaign_id, ''));
  campaign_row public.mpgf_public_goods_campaigns%rowtype;
  proposal_row public.mpgf_pool_proposals%rowtype;
  existing_intent public.mpgf_pledge_intents%rowtype;
  existing_pledge public.mpgf_public_goods_pledges%rowtype;
  intent_id_value uuid := gen_random_uuid();
  pledge_id_value uuid := gen_random_uuid();
  accepted_at_value timestamptz := timezone('utc', now());
  supporter_reason_value text := nullif(btrim(coalesce(p_supporter_reason, '')), '');
  idempotency_hash_value text;
  consent_value jsonb;
  consent_hash_value text;
  event_value jsonb;
begin
  if actor_id is null then
    raise exception using
      errcode = '42501',
      message = 'Sign in to create a DAC pledge.';
  end if;
  if not exists (
    select 1 from public.profiles as profile where profile.id = actor_id
  ) then
    raise exception using
      errcode = '23503',
      message = 'A Moral Trade profile is required before pledging.';
  end if;
  if campaign_id_value = '' then
    raise exception using errcode = '22023', message = 'A campaign is required.';
  end if;
  if p_amount_cents is null or p_amount_cents <= 0 then
    raise exception using errcode = '22023', message = 'Pledge amount must be a positive number of cents.';
  end if;
  if p_visibility_mode is null
     or p_visibility_mode not in ('private_amount', 'public_supporter', 'public_reason') then
    raise exception using errcode = '22023', message = 'Pledge visibility is invalid.';
  end if;
  if p_visibility_mode = 'public_reason' and supporter_reason_value is null then
    raise exception using errcode = '22023', message = 'A public supporter reason is required for public-reason visibility.';
  end if;
  if supporter_reason_value is not null and char_length(supporter_reason_value) > 500 then
    raise exception using errcode = '22023', message = 'Supporter reason is too long.';
  end if;
  if btrim(coalesce(p_idempotency_key, '')) = ''
     or char_length(p_idempotency_key) > 256 then
    raise exception using errcode = '22023', message = 'A stable idempotency key of at most 256 characters is required.';
  end if;

  idempotency_hash_value :=
    'sha256:' ||
    pg_catalog.encode(
      extensions.digest(
        pg_catalog.convert_to(btrim(p_idempotency_key), 'UTF8'),
        'sha256'
      ),
      'hex'
    );

  perform pg_advisory_xact_lock(
    hashtextextended(actor_id::text || ':' || idempotency_hash_value, 0)
  );

  select * into existing_intent
  from public.mpgf_pledge_intents as intent
  where intent.profile_id = actor_id
    and intent.idempotency_key_hash = idempotency_hash_value;

  if existing_intent.id is not null then
    select * into existing_pledge
    from public.mpgf_public_goods_pledges as pledge
    where pledge.pledge_intent_id = existing_intent.id;

    if existing_pledge.id is null then
      raise exception using
        errcode = '23514',
        message = 'The existing pledge intent is missing its canonical pledge row.';
    end if;
    if existing_intent.campaign_id is distinct from campaign_id_value
       or existing_intent.amount_cents is distinct from p_amount_cents
       or existing_intent.visibility_mode is distinct from p_visibility_mode
       or existing_intent.supporter_reason is distinct from supporter_reason_value then
      raise exception using
        errcode = '23505',
        message = 'The idempotency key was already used for different DAC pledge terms.';
    end if;

    return query select
      existing_intent.id,
      existing_pledge.id,
      existing_intent.campaign_id,
      existing_intent.pool_proposal_id,
      existing_intent.terms_version,
      existing_intent.terms_sha256,
      existing_intent.amount_cents,
      existing_intent.currency,
      existing_pledge.eligibility_state,
      existing_pledge.status,
      existing_intent.accepted_at,
      existing_pledge.expires_at;
    return;
  end if;

  select * into campaign_row
  from public.mpgf_public_goods_campaigns as campaign
  where campaign.id = campaign_id_value
  for share;

  if campaign_row.id is null
     or campaign_row.review_status not in ('approved', 'finalized')
     or campaign_row.pool_proposal_id is null
     or campaign_row.published_terms_version is null
     or campaign_row.published_terms_sha256 is null
     or campaign_row.published_at is null
     or campaign_row.deadline_at <= accepted_at_value then
    raise exception using
      errcode = '23514',
      message = 'Only a live, approved, published campaign can accept a DAC pledge.';
  end if;

  select * into proposal_row
  from public.mpgf_pool_proposals as proposal
  where proposal.id = campaign_row.pool_proposal_id
  for share;

  if proposal_row.id is null
     or proposal_row.status <> 'approved_as_candidate'
     or proposal_row.approved_terms_version is null
     or proposal_row.approved_terms_version <> campaign_row.published_terms_version
     or proposal_row.operative_terms_sha256 is null
     or proposal_row.operative_terms_sha256 <> campaign_row.published_terms_sha256
     or proposal_row.terms_locked_at is null
     or proposal_row.public_goods_deadline_at is distinct from campaign_row.deadline_at then
    raise exception using
      errcode = '23514',
      message = 'The published campaign no longer matches its approved frozen proposal version.';
  end if;

  if proposal_row.public_goods_failure_bonus_enabled is distinct from true
     or proposal_row.public_goods_failure_bonus_schedule_status <> 'approved'
     or proposal_row.public_goods_success_premium_provisional is distinct from false
     or proposal_row.public_goods_threshold_schedule_json is null
     or proposal_row.public_goods_failure_bonus_eligibility_json is null then
    raise exception using
      errcode = '23514',
      message = 'This pledge path is restricted to reviewed dominant assurance contracts.';
  end if;

  if not exists (
    select 1
    from public.mpgf_pool_proposal_versions as proposal_version
    where proposal_version.proposal_id = proposal_row.id
      and proposal_version.terms_version = campaign_row.published_terms_version
      and proposal_version.terms_sha256 = campaign_row.published_terms_sha256
  ) then
    raise exception using
      errcode = '23514',
      message = 'The published campaign is missing its immutable approved proposal version.';
  end if;

  consent_value := jsonb_build_object(
    'schemaVersion', 'mpgf_dac_pledge_consent_v1',
    'mechanism', 'dominant_assurance_contract',
    'pledgeMode', 'pledge_only',
    'profileId', actor_id,
    'campaignId', campaign_row.id,
    'poolProposalId', proposal_row.id,
    'termsVersion', campaign_row.published_terms_version,
    'termsSha256', campaign_row.published_terms_sha256,
    'amountCents', p_amount_cents,
    'currency', 'usd',
    'visibilityMode', p_visibility_mode,
    'supporterReason', supporter_reason_value,
    'acceptedAt', accepted_at_value,
    'expiresAt', campaign_row.deadline_at,
    'threshold', jsonb_build_object(
      'netRecipientAmountCents', campaign_row.threshold_amount_cents,
      'minimumSupporters', campaign_row.threshold_supporters,
      'deadlineAt', campaign_row.deadline_at
    ),
    'failureBonus', jsonb_build_object(
      'enabled', true,
      'rateBps', proposal_row.public_goods_failure_bonus_rate_bps,
      'eligibility', proposal_row.public_goods_failure_bonus_eligibility_json,
      'maxParticipants', proposal_row.public_goods_failure_bonus_max_participants,
      'maxPerParticipantCents', proposal_row.public_goods_failure_bonus_max_per_participant_cents,
      'thresholdSchedule', proposal_row.public_goods_threshold_schedule_json,
      'scheduleStatus', proposal_row.public_goods_failure_bonus_schedule_status
    ),
    'payment', jsonb_build_object(
      'authorized', false,
      'mandateCreated', false,
      'charged', false,
      'captureMode', 'signed_intent'
    )
  );
  consent_hash_value := public.mpgf_dac_json_sha256(consent_value);

  insert into public.mpgf_pledge_intents (
    id,
    campaign_id,
    pool_proposal_id,
    terms_version,
    terms_sha256,
    profile_id,
    idempotency_key_hash,
    amount_cents,
    currency,
    visibility_mode,
    supporter_reason,
    consent_json,
    consent_sha256,
    accepted_at
  ) values (
    intent_id_value,
    campaign_row.id,
    proposal_row.id,
    campaign_row.published_terms_version,
    campaign_row.published_terms_sha256,
    actor_id,
    idempotency_hash_value,
    p_amount_cents,
    'usd',
    p_visibility_mode,
    supporter_reason_value,
    consent_value,
    consent_hash_value,
    accepted_at_value
  );

  perform set_config('app.mpgf_dac_internal_write', intent_id_value::text, true);

  insert into public.mpgf_public_goods_pledges (
    id,
    campaign_id,
    profile_id,
    user_ref,
    amount_cents,
    currency,
    visibility_mode,
    is_recurring,
    capture_mode,
    eligibility_state,
    human_score_bps,
    status,
    supporter_reason,
    payment_intent_ref,
    pledge_intent_id,
    pool_proposal_id,
    terms_version,
    terms_sha256,
    accepted_at,
    expires_at
  ) values (
    pledge_id_value,
    campaign_row.id,
    actor_id,
    'profile:' || actor_id::text,
    p_amount_cents,
    'usd',
    p_visibility_mode,
    false,
    'signed_intent',
    'pending_review',
    0,
    'pledged',
    supporter_reason_value,
    null,
    intent_id_value,
    proposal_row.id,
    campaign_row.published_terms_version,
    campaign_row.published_terms_sha256,
    accepted_at_value,
    campaign_row.deadline_at
  );

  event_value := jsonb_build_object(
    'schemaVersion', 'mpgf_dac_pledge_event_v1',
    'eventType', 'pledge_created',
    'pledgeIntentId', intent_id_value,
    'pledgeId', pledge_id_value,
    'campaignId', campaign_row.id,
    'poolProposalId', proposal_row.id,
    'profileId', actor_id,
    'termsVersion', campaign_row.published_terms_version,
    'termsSha256', campaign_row.published_terms_sha256,
    'amountCents', p_amount_cents,
    'currency', 'usd',
    'eligibilityState', 'pending_review',
    'pledgeStatus', 'pledged',
    'paymentAuthorized', false,
    'createdAt', accepted_at_value
  );

  insert into public.mpgf_dac_pledge_events (
    pledge_intent_id,
    pledge_id,
    campaign_id,
    pool_proposal_id,
    profile_id,
    event_type,
    terms_version,
    terms_sha256,
    amount_cents,
    currency,
    event_json,
    event_sha256,
    created_at
  ) values (
    intent_id_value,
    pledge_id_value,
    campaign_row.id,
    proposal_row.id,
    actor_id,
    'pledge_created',
    campaign_row.published_terms_version,
    campaign_row.published_terms_sha256,
    p_amount_cents,
    'usd',
    event_value,
    public.mpgf_dac_json_sha256(event_value),
    accepted_at_value
  );

  perform set_config('app.mpgf_dac_internal_write', '', true);

  return query select
    intent_id_value,
    pledge_id_value,
    campaign_row.id,
    proposal_row.id,
    campaign_row.published_terms_version,
    campaign_row.published_terms_sha256,
    p_amount_cents,
    'usd'::text,
    'pending_review'::text,
    'pledged'::text,
    accepted_at_value,
    campaign_row.deadline_at;
end;
$function$;

revoke all on function public.mpgf_create_dac_pledge(
  text, bigint, text, text, text
) from public, anon;
grant execute on function public.mpgf_create_dac_pledge(
  text, bigint, text, text, text
) to authenticated;

alter table public.mpgf_pledge_intents enable row level security;
alter table public.mpgf_dac_pledge_events enable row level security;

drop policy if exists mpgf_pledge_intents_select_own
  on public.mpgf_pledge_intents;
create policy mpgf_pledge_intents_select_own
on public.mpgf_pledge_intents
for select to authenticated
using (profile_id = auth.uid());

drop policy if exists mpgf_dac_pledge_events_select_own
  on public.mpgf_dac_pledge_events;
create policy mpgf_dac_pledge_events_select_own
on public.mpgf_dac_pledge_events
for select to authenticated
using (profile_id = auth.uid());

revoke all on table public.mpgf_pledge_intents
  from public, anon, authenticated;
revoke all on table public.mpgf_dac_pledge_events
  from public, anon, authenticated;
grant select on table public.mpgf_pledge_intents to authenticated;
grant select on table public.mpgf_dac_pledge_events to authenticated;
grant all on table public.mpgf_pledge_intents to service_role;
grant all on table public.mpgf_dac_pledge_events to service_role;

comment on table public.mpgf_pledge_intents is
  'Immutable consent evidence for self-service dominant assurance contract pledges. It is not an active pledge ledger.';
comment on table public.mpgf_dac_pledge_events is
  'Append-only private lifecycle evidence for DAC pledges.';
comment on function public.mpgf_create_dac_pledge(text, bigint, text, text, text) is
  'Atomically records immutable DAC pledge consent and one canonical pledge row. It creates no payment authorization, mandate, charge, capture, success, or lapse outcome.';

commit;
