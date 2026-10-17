-- Production-backed, pool-level pledge-impact forecasts.
--
-- Public pool keys map only to approved MPGF pool proposals. Live pool state is
-- derived from proposal terms and the linked pledge ledger at read/release time;
-- callers cannot submit or override that state. Forecasts are immutable,
-- non-personalized, experimental, short-lived, and unavailable whenever the
-- ledger state changes.

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.mpgf_pledge_impact_pool_map (
  pool_public_key text primary key,
  pool_proposal_id uuid not null unique
    references public.mpgf_pool_proposals (id) on delete restrict,
  mapping_version text not null default 'mpgf_pledge_impact_pool_map_v1',
  release_environment text not null check (release_environment in ('qa', 'production')),
  active boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint mpgf_pledge_impact_pool_key_format
    check (pool_public_key ~ '^(pool|qa-pool)-[a-z0-9-]{3,96}$'),
  constraint mpgf_pledge_impact_mapping_version_present
    check (btrim(mapping_version) <> '')
);

create table if not exists public.mpgf_pledge_impact_forecast_snapshots (
  id uuid primary key default gen_random_uuid(),
  pool_public_key text not null
    references public.mpgf_pledge_impact_pool_map (pool_public_key) on delete restrict,
  pool_proposal_id uuid not null
    references public.mpgf_pool_proposals (id) on delete restrict,
  forecast_version text not null,
  model_version text not null,
  released_at timestamptz not null,
  expires_at timestamptz not null,
  pool_state_json jsonb not null,
  pool_state_sha256 text not null,
  forecast_json jsonb not null,
  content_sha256 text not null,
  created_at timestamptz not null default timezone('utc', now()),
  constraint mpgf_pledge_impact_forecast_version_present
    check (btrim(forecast_version) <> ''),
  constraint mpgf_pledge_impact_model_version_present
    check (btrim(model_version) <> ''),
  constraint mpgf_pledge_impact_release_window
    check (expires_at > released_at and expires_at <= released_at + interval '2 hours'),
  constraint mpgf_pledge_impact_pool_state_object
    check (jsonb_typeof(pool_state_json) = 'object'),
  constraint mpgf_pledge_impact_forecast_object
    check (jsonb_typeof(forecast_json) = 'object'),
  constraint mpgf_pledge_impact_pool_state_hash_format
    check (pool_state_sha256 ~ '^sha256:[a-f0-9]{64}$'),
  constraint mpgf_pledge_impact_content_hash_format
    check (content_sha256 ~ '^sha256:[a-f0-9]{64}$'),
  unique (pool_public_key, forecast_version)
);

create index if not exists mpgf_pledge_impact_forecast_latest_idx
  on public.mpgf_pledge_impact_forecast_snapshots (pool_public_key, released_at desc);
create index if not exists mpgf_pledge_impact_forecast_expiry_idx
  on public.mpgf_pledge_impact_forecast_snapshots (expires_at);

create table if not exists public.mpgf_pledge_impact_forecast_audit_events (
  id uuid primary key default gen_random_uuid(),
  snapshot_id uuid not null
    references public.mpgf_pledge_impact_forecast_snapshots (id) on delete restrict,
  event_type text not null check (event_type = 'forecast_released'),
  event_payload jsonb not null,
  event_sha256 text not null check (event_sha256 ~ '^sha256:[a-f0-9]{64}$'),
  created_at timestamptz not null default timezone('utc', now()),
  constraint mpgf_pledge_impact_audit_payload_object
    check (jsonb_typeof(event_payload) = 'object')
);

create unique index if not exists mpgf_pledge_impact_one_release_event_idx
  on public.mpgf_pledge_impact_forecast_audit_events (snapshot_id, event_type);

create or replace function public.mpgf_pledge_impact_sha256(value jsonb)
returns text
language sql
immutable
strict
set search_path = public, pg_temp
as $function$
  select 'sha256:' || encode(extensions.digest(value::text, 'sha256'), 'hex');
$function$;

revoke all on function public.mpgf_pledge_impact_sha256(jsonb)
  from public, anon, authenticated;

create or replace function public.mpgf_pledge_impact_contains_personalization(value jsonb)
returns boolean
language sql
immutable
strict
set search_path = public, pg_temp
as $function$
  select case jsonb_typeof(value)
    when 'object' then exists (
      select 1
      from jsonb_each(value) as item(key, child)
      where lower(regexp_replace(item.key, '[^a-zA-Z0-9_]', '', 'g')) = any (array[
        'userid', 'user_id', 'profileid', 'profile_id', 'viewerid', 'viewer_id',
        'email', 'demographic', 'demographics', 'paymenthistory', 'payment_history',
        'sharingpropensity', 'sharing_propensity', 'individualhistory', 'individual_history'
      ])
      or public.mpgf_pledge_impact_contains_personalization(item.child)
    )
    when 'array' then exists (
      select 1
      from jsonb_array_elements(value) as item(child)
      where public.mpgf_pledge_impact_contains_personalization(item.child)
    )
    else false
  end;
$function$;

revoke all on function public.mpgf_pledge_impact_contains_personalization(jsonb)
  from public, anon, authenticated;

create or replace function public.mpgf_pledge_impact_immutable()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
begin
  raise exception 'Released pledge-impact forecasts and audit events are immutable.'
    using errcode = '23514';
end;
$function$;

revoke all on function public.mpgf_pledge_impact_immutable()
  from public, anon, authenticated;

drop trigger if exists mpgf_pledge_impact_forecast_snapshots_immutable
  on public.mpgf_pledge_impact_forecast_snapshots;
create trigger mpgf_pledge_impact_forecast_snapshots_immutable
before update or delete on public.mpgf_pledge_impact_forecast_snapshots
for each row execute function public.mpgf_pledge_impact_immutable();

drop trigger if exists mpgf_pledge_impact_forecast_audit_events_immutable
  on public.mpgf_pledge_impact_forecast_audit_events;
create trigger mpgf_pledge_impact_forecast_audit_events_immutable
before update or delete on public.mpgf_pledge_impact_forecast_audit_events
for each row execute function public.mpgf_pledge_impact_immutable();

create or replace function public.mpgf_pledge_impact_live_pool_state(
  p_pool_public_key text,
  p_at timestamptz default timezone('utc', now())
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $function$
declare
  proposal record;
  funded_cents bigint := 0;
  contributor_count integer := 0;
  thresholds_json jsonb;
  failure_bonus_json jsonb;
begin
  if p_pool_public_key is null
     or p_pool_public_key !~ '^(pool|qa-pool)-[a-z0-9-]{3,96}$' then
    return null;
  end if;

  select
    mapping.pool_public_key,
    mapping.pool_proposal_id,
    mapping.release_environment,
    pool.title,
    pool.cause_area,
    pool.status,
    pool.threshold_visibility::text as threshold_visibility,
    pool.progress_visibility::text as progress_visibility,
    pool.public_goods_destination_type,
    pool.public_goods_destination_ref,
    pool.public_goods_threshold_amount_cents,
    pool.public_goods_threshold_supporters,
    pool.public_goods_deadline_at,
    pool.public_goods_failure_bonus_enabled,
    pool.public_goods_failure_bonus_rate_bps,
    pool.public_goods_threshold_schedule_json,
    pool.public_goods_failure_bonus_max_participants,
    pool.public_goods_failure_bonus_max_per_participant_cents,
    pool.public_goods_failure_bonus_schedule_status,
    pool.public_goods_success_premium_rate_bps,
    pool.public_goods_success_premium_cents,
    pool.public_goods_gross_success_requirement_cents
  into proposal
  from public.mpgf_pledge_impact_pool_map as mapping
  join public.mpgf_pool_proposals as pool
    on pool.id = mapping.pool_proposal_id
  where mapping.pool_public_key = p_pool_public_key
    and mapping.active = true;

  if not found
     or proposal.status <> 'approved_as_candidate'
     or proposal.threshold_visibility <> 'public_exact'
     or proposal.progress_visibility <> 'exact_amount'
     or proposal.public_goods_destination_type not in (
       'external_charity', 'fiscal_host', 'signed_sponsor_route'
     )
     or btrim(coalesce(proposal.public_goods_destination_ref, '')) = ''
     or proposal.public_goods_destination_ref ilike '%demo%'
     or proposal.public_goods_threshold_amount_cents is null
     or proposal.public_goods_threshold_amount_cents <= 0
     or proposal.public_goods_threshold_supporters is null
     or proposal.public_goods_threshold_supporters <= 0
     or proposal.public_goods_deadline_at is null
     or proposal.public_goods_deadline_at <= p_at then
    return null;
  end if;

  if proposal.public_goods_failure_bonus_enabled then
    if proposal.public_goods_failure_bonus_schedule_status <> 'approved'
       or jsonb_typeof(proposal.public_goods_threshold_schedule_json) <> 'object'
       or jsonb_typeof(proposal.public_goods_threshold_schedule_json -> 'thresholds') <> 'array'
       or jsonb_array_length(proposal.public_goods_threshold_schedule_json -> 'thresholds') < 1 then
      return null;
    end if;

    select jsonb_agg(
      jsonb_build_object(
        'thresholdIndex', (threshold_item.value ->> 'thresholdIndex')::integer,
        'thresholdId', threshold_item.value ->> 'thresholdId',
        'cumulativeNetRecipientThresholdCents',
          (threshold_item.value ->> 'cumulativeNetRecipientThresholdCents')::bigint,
        'grossSuccessRequirementCents',
          (threshold_item.value ->> 'grossSuccessRequirementCents')::bigint,
        'premiumRateBps', (threshold_item.value ->> 'premiumRateBps')::integer,
        'successPremiumCents',
          (threshold_item.value ->> 'successPremiumCents')::bigint
      )
      order by (threshold_item.value ->> 'thresholdIndex')::integer
    )
    into thresholds_json
    from jsonb_array_elements(
      proposal.public_goods_threshold_schedule_json -> 'thresholds'
    ) as threshold_item(value);

    failure_bonus_json := jsonb_build_object(
      'enabled', true,
      'scheduleStatus', 'approved',
      'rateBps', proposal.public_goods_failure_bonus_rate_bps,
      'maxParticipants', proposal.public_goods_failure_bonus_max_participants,
      'maxPerParticipantCents',
        proposal.public_goods_failure_bonus_max_per_participant_cents
    );
  else
    thresholds_json := jsonb_build_array(
      jsonb_build_object(
        'thresholdIndex', 1,
        'thresholdId', 'threshold-1',
        'cumulativeNetRecipientThresholdCents',
          proposal.public_goods_threshold_amount_cents,
        'grossSuccessRequirementCents',
          proposal.public_goods_threshold_amount_cents,
        'premiumRateBps', 0,
        'successPremiumCents', 0
      )
    );
    failure_bonus_json := jsonb_build_object(
      'enabled', false,
      'scheduleStatus', null,
      'rateBps', null,
      'maxParticipants', null,
      'maxPerParticipantCents', null
    );
  end if;

  select
    coalesce(sum(pledge.amount_cents::bigint), 0),
    count(distinct coalesce(
      pledge.user_id::text,
      pledge.profile_id::text,
      pledge.id::text
    ))::integer
  into funded_cents, contributor_count
  from public.mpgf_pledges as pledge
  where pledge.pool_proposal_id = proposal.pool_proposal_id
    and pledge.status in ('pledged', 'converted_to_payment_intent')
    and pledge.pledge_mode = 'pledge_only'
    and pledge.real_money = false
    and (pledge.expires_at is null or pledge.expires_at > p_at);

  return jsonb_build_object(
    'schemaVersion', 'mpgf_pledge_impact_pool_state_v1',
    'poolPublicKey', proposal.pool_public_key,
    'poolProposalId', proposal.pool_proposal_id,
    'title', proposal.title,
    'causeArea', proposal.cause_area,
    'currency', 'USD',
    'thresholds', thresholds_json,
    'fundedCents', funded_cents,
    'contributorCount', contributor_count,
    'deadlineAt', to_char(
      proposal.public_goods_deadline_at at time zone 'UTC',
      'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'
    ),
    'thresholdSupporters', proposal.public_goods_threshold_supporters,
    'thresholdVisibility', proposal.threshold_visibility,
    'progressVisibility', proposal.progress_visibility,
    'destinationType', proposal.public_goods_destination_type,
    'failureBonus', failure_bonus_json
  );
exception
  when others then
    return null;
end;
$function$;

revoke all on function public.mpgf_pledge_impact_live_pool_state(text, timestamptz)
  from public, anon, authenticated;

create or replace function public.mpgf_pledge_impact_forecast_shape_valid(
  forecast_json jsonb,
  live_pool_state jsonb
)
returns boolean
language plpgsql
immutable
strict
set search_path = public, pg_temp
as $function$
declare
  points_json jsonb;
  point_item jsonb;
  previous_pledge_cents bigint := -1;
  current_pledge_cents bigint;
  expected_threshold_count integer;
begin
  if jsonb_typeof(forecast_json) <> 'object'
     or forecast_json ->> 'schemaVersion' <> 'mpgf_pledge_impact_forecast_v1'
     or forecast_json ->> 'audience' <> 'pool_state'
     or forecast_json ->> 'currency' <> 'USD'
     or jsonb_typeof(forecast_json -> 'experimental') <> 'boolean'
     or (forecast_json ->> 'experimental')::boolean <> true
     or jsonb_typeof(forecast_json -> 'forecastErrorFloorBps') <> 'number'
     or (forecast_json ->> 'forecastErrorFloorBps')::integer not between 0 and 10000
     or jsonb_typeof(forecast_json -> 'followOnEffect') <> 'object'
     or jsonb_typeof(forecast_json -> 'modelPerformance') <> 'object'
     or public.mpgf_pledge_impact_contains_personalization(forecast_json) then
    return false;
  end if;

  points_json := forecast_json -> 'points';
  if jsonb_typeof(points_json) <> 'array'
     or jsonb_array_length(points_json) < 2
     or jsonb_array_length(points_json) > 256 then
    return false;
  end if;

  expected_threshold_count := jsonb_array_length(live_pool_state -> 'thresholds');
  for point_item in select value from jsonb_array_elements(points_json)
  loop
    if jsonb_typeof(point_item) <> 'object'
       or jsonb_typeof(point_item -> 'pledgeCents') <> 'number'
       or jsonb_typeof(point_item -> 'additionalFundingFromOthers') <> 'object'
       or jsonb_typeof(point_item -> 'allocatedFundingCredit') <> 'object'
       or jsonb_typeof(point_item -> 'thresholds') <> 'array'
       or jsonb_array_length(point_item -> 'thresholds') <> expected_threshold_count
       or jsonb_typeof(point_item -> 'decomposition') <> 'object' then
      return false;
    end if;
    current_pledge_cents := (point_item ->> 'pledgeCents')::bigint;
    if current_pledge_cents < 0
       or current_pledge_cents <= previous_pledge_cents then
      return false;
    end if;
    previous_pledge_cents := current_pledge_cents;
  end loop;

  return ((points_json -> 0 ->> 'pledgeCents')::bigint = 0);
exception
  when others then
    return false;
end;
$function$;

revoke all on function public.mpgf_pledge_impact_forecast_shape_valid(jsonb, jsonb)
  from public, anon, authenticated;

create or replace function public.release_mpgf_pledge_impact_forecast(
  p_pool_public_key text,
  p_forecast_version text,
  p_model_version text,
  p_released_at timestamptz,
  p_expires_at timestamptz,
  p_forecast_json jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  live_pool_state jsonb;
  live_pool_state_sha256 text;
  pool_proposal_id_value uuid;
  content_value jsonb;
  content_sha256_value text;
  snapshot_id_value uuid;
  existing_snapshot record;
  event_payload_value jsonb;
begin
  if btrim(coalesce(p_forecast_version, '')) = ''
     or btrim(coalesce(p_model_version, '')) = '' then
    raise exception 'Forecast and model versions are required.'
      using errcode = '22023';
  end if;
  if p_released_at < timezone('utc', now()) - interval '15 minutes'
     or p_released_at > timezone('utc', now()) + interval '5 minutes'
     or p_expires_at <= p_released_at
     or p_expires_at > p_released_at + interval '2 hours' then
    raise exception 'Forecast release timestamps are stale, future-dated, or too long-lived.'
      using errcode = '22023';
  end if;

  live_pool_state := public.mpgf_pledge_impact_live_pool_state(
    p_pool_public_key,
    p_released_at
  );
  if live_pool_state is null then
    raise exception 'Pool is not an approved, active, publicly exact live MPGF proposal.'
      using errcode = '23514';
  end if;
  if not public.mpgf_pledge_impact_forecast_shape_valid(
    p_forecast_json,
    live_pool_state
  ) then
    raise exception 'Pledge-impact forecast payload failed validation.'
      using errcode = '22023';
  end if;

  pool_proposal_id_value := (live_pool_state ->> 'poolProposalId')::uuid;
  live_pool_state_sha256 := public.mpgf_pledge_impact_sha256(live_pool_state);
  content_value := jsonb_build_object(
    'poolPublicKey', p_pool_public_key,
    'poolProposalId', pool_proposal_id_value,
    'forecastVersion', p_forecast_version,
    'modelVersion', p_model_version,
    'releasedAt', p_released_at,
    'expiresAt', p_expires_at,
    'poolState', live_pool_state,
    'forecast', p_forecast_json
  );
  content_sha256_value := public.mpgf_pledge_impact_sha256(content_value);

  select id, content_sha256
  into existing_snapshot
  from public.mpgf_pledge_impact_forecast_snapshots
  where pool_public_key = p_pool_public_key
    and forecast_version = p_forecast_version;

  if found then
    if existing_snapshot.content_sha256 <> content_sha256_value then
      raise unique_violation using message =
        'Forecast version already exists with different content.';
    end if;
    return existing_snapshot.id;
  end if;

  insert into public.mpgf_pledge_impact_forecast_snapshots (
    pool_public_key,
    pool_proposal_id,
    forecast_version,
    model_version,
    released_at,
    expires_at,
    pool_state_json,
    pool_state_sha256,
    forecast_json,
    content_sha256
  ) values (
    p_pool_public_key,
    pool_proposal_id_value,
    p_forecast_version,
    p_model_version,
    p_released_at,
    p_expires_at,
    live_pool_state,
    live_pool_state_sha256,
    p_forecast_json,
    content_sha256_value
  ) returning id into snapshot_id_value;

  event_payload_value := jsonb_build_object(
    'snapshotId', snapshot_id_value,
    'poolPublicKey', p_pool_public_key,
    'poolProposalId', pool_proposal_id_value,
    'forecastVersion', p_forecast_version,
    'modelVersion', p_model_version,
    'releasedAt', p_released_at,
    'expiresAt', p_expires_at,
    'poolStateSha256', live_pool_state_sha256,
    'contentSha256', content_sha256_value
  );

  insert into public.mpgf_pledge_impact_forecast_audit_events (
    snapshot_id,
    event_type,
    event_payload,
    event_sha256
  ) values (
    snapshot_id_value,
    'forecast_released',
    event_payload_value,
    public.mpgf_pledge_impact_sha256(event_payload_value)
  );

  return snapshot_id_value;
end;
$function$;

revoke all on function public.release_mpgf_pledge_impact_forecast(
  text, text, text, timestamptz, timestamptz, jsonb
) from public, anon, authenticated;
grant execute on function public.release_mpgf_pledge_impact_forecast(
  text, text, text, timestamptz, timestamptz, jsonb
) to service_role;

create or replace function public.mpgf_pledge_impact_bundle_at(
  p_pool_public_key text,
  p_at timestamptz
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $function$
declare
  live_pool_state jsonb;
  live_pool_state_sha256 text;
  latest_snapshot record;
  status_value text;
  release_value jsonb := null;
begin
  live_pool_state := public.mpgf_pledge_impact_live_pool_state(
    p_pool_public_key,
    p_at
  );
  if live_pool_state is null then
    return jsonb_build_object(
      'status', 'pool_not_live',
      'checkedAt', to_char(p_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
      'poolPublicKey', p_pool_public_key,
      'poolState', null,
      'poolStateSha256', null,
      'forecastRelease', null
    );
  end if;

  live_pool_state_sha256 := public.mpgf_pledge_impact_sha256(live_pool_state);

  select
    id,
    forecast_version,
    model_version,
    released_at,
    expires_at,
    pool_state_sha256,
    forecast_json
  into latest_snapshot
  from public.mpgf_pledge_impact_forecast_snapshots
  where pool_public_key = p_pool_public_key
    and released_at <= p_at + interval '5 minutes'
  order by released_at desc
  limit 1;

  if not found then
    status_value := 'forecast_not_released';
  elsif latest_snapshot.expires_at <= p_at then
    status_value := 'forecast_stale';
  elsif latest_snapshot.pool_state_sha256 <> live_pool_state_sha256 then
    status_value := 'pool_state_mismatch';
  else
    status_value := 'available';
    release_value := jsonb_build_object(
      'id', latest_snapshot.id,
      'forecastVersion', latest_snapshot.forecast_version,
      'modelVersion', latest_snapshot.model_version,
      'releasedAt', to_char(
        latest_snapshot.released_at at time zone 'UTC',
        'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'
      ),
      'expiresAt', to_char(
        latest_snapshot.expires_at at time zone 'UTC',
        'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'
      ),
      'poolStateSha256', latest_snapshot.pool_state_sha256,
      'forecast', latest_snapshot.forecast_json
    );
  end if;

  return jsonb_build_object(
    'status', status_value,
    'checkedAt', to_char(p_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'poolPublicKey', p_pool_public_key,
    'poolState', live_pool_state,
    'poolStateSha256', live_pool_state_sha256,
    'forecastRelease', release_value
  );
end;
$function$;

revoke all on function public.mpgf_pledge_impact_bundle_at(text, timestamptz)
  from public, anon, authenticated;

create or replace function public.get_mpgf_pledge_impact_bundle(
  p_pool_public_key text
)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $function$
  select public.mpgf_pledge_impact_bundle_at(
    p_pool_public_key,
    timezone('utc', now())
  );
$function$;

revoke all on function public.get_mpgf_pledge_impact_bundle(text)
  from public;
grant execute on function public.get_mpgf_pledge_impact_bundle(text)
  to anon, authenticated, service_role;

alter table public.mpgf_pledge_impact_pool_map enable row level security;
alter table public.mpgf_pledge_impact_forecast_snapshots enable row level security;
alter table public.mpgf_pledge_impact_forecast_audit_events enable row level security;

revoke all on table public.mpgf_pledge_impact_pool_map
  from public, anon, authenticated;
revoke all on table public.mpgf_pledge_impact_forecast_snapshots
  from public, anon, authenticated;
revoke all on table public.mpgf_pledge_impact_forecast_audit_events
  from public, anon, authenticated;

grant all on table public.mpgf_pledge_impact_pool_map to service_role;
grant all on table public.mpgf_pledge_impact_forecast_snapshots to service_role;
grant all on table public.mpgf_pledge_impact_forecast_audit_events to service_role;

comment on table public.mpgf_pledge_impact_pool_map is
  'Service-controlled mapping from public pool keys to approved live MPGF pool proposals. No demo mappings are seeded.';
comment on table public.mpgf_pledge_impact_forecast_snapshots is
  'Immutable, short-lived, non-personalized experimental forecasts bound to server-derived MPGF ledger state.';
comment on function public.get_mpgf_pledge_impact_bundle(text) is
  'Returns a sanitized live pool state and an available forecast only when its released state hash still matches the current MPGF ledger.';
