-- Versioned, pool-level pledge-impact forecasts. Forecasts are experimental,
-- immutable after release, non-personalized, and published only through the
-- service-role release function below.

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.mpgf_pledge_impact_pool_campaign_map (
  pool_public_key text primary key,
  campaign_id text not null references public.mpgf_public_goods_campaigns (id) on delete restrict,
  mapping_version text not null default 'pledge-impact-pool-map-v1',
  created_at timestamptz not null default timezone('utc', now()),
  constraint mpgf_pledge_impact_pool_key_format check (pool_public_key ~ '^pool-[a-z0-9-]+$'),
  constraint mpgf_pledge_impact_mapping_version_present check (btrim(mapping_version) <> '')
);

insert into public.mpgf_pledge_impact_pool_campaign_map (pool_public_key, campaign_id)
values
  ('pool-bio-salary', 'campaign-existential-risk-resilience'),
  ('pool-wild-research', 'campaign-animal-welfare-transition'),
  ('pool-civic-open', 'campaign-public-interest-knowledge'),
  ('pool-factory-transition', 'campaign-animal-welfare-transition')
on conflict (pool_public_key) do update
set campaign_id = excluded.campaign_id,
    mapping_version = 'pledge-impact-pool-map-v1';

create table if not exists public.mpgf_pledge_impact_forecast_snapshots (
  id uuid primary key default gen_random_uuid(),
  pool_public_key text not null references public.mpgf_pledge_impact_pool_campaign_map (pool_public_key) on delete restrict,
  campaign_id text not null references public.mpgf_public_goods_campaigns (id) on delete restrict,
  forecast_version text not null,
  model_version text not null,
  released_at timestamptz not null,
  expires_at timestamptz not null,
  pool_state_json jsonb not null,
  forecast_json jsonb not null,
  content_sha256 text not null,
  created_at timestamptz not null default timezone('utc', now()),
  constraint mpgf_pledge_impact_forecast_version_present check (btrim(forecast_version) <> ''),
  constraint mpgf_pledge_impact_model_version_present check (btrim(model_version) <> ''),
  constraint mpgf_pledge_impact_release_window check (
    expires_at > released_at and expires_at <= released_at + interval '2 hours'
  ),
  constraint mpgf_pledge_impact_hash_format check (content_sha256 ~ '^sha256:[a-f0-9]{64}$'),
  constraint mpgf_pledge_impact_pool_state_object check (jsonb_typeof(pool_state_json) = 'object'),
  constraint mpgf_pledge_impact_forecast_object check (jsonb_typeof(forecast_json) = 'object'),
  unique (pool_public_key, forecast_version)
);

create index if not exists mpgf_pledge_impact_forecast_latest_idx
  on public.mpgf_pledge_impact_forecast_snapshots (pool_public_key, released_at desc);
create index if not exists mpgf_pledge_impact_forecast_expiry_idx
  on public.mpgf_pledge_impact_forecast_snapshots (expires_at);

create table if not exists public.mpgf_pledge_impact_forecast_audit_events (
  id uuid primary key default gen_random_uuid(),
  snapshot_id uuid not null references public.mpgf_pledge_impact_forecast_snapshots (id) on delete restrict,
  event_type text not null check (event_type in ('forecast_released')),
  event_payload jsonb not null,
  event_sha256 text not null check (event_sha256 ~ '^sha256:[a-f0-9]{64}$'),
  created_at timestamptz not null default timezone('utc', now()),
  constraint mpgf_pledge_impact_audit_payload_object check (jsonb_typeof(event_payload) = 'object')
);

create unique index if not exists mpgf_pledge_impact_forecast_one_release_event_idx
  on public.mpgf_pledge_impact_forecast_audit_events (snapshot_id, event_type);

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

create or replace function public.release_mpgf_pledge_impact_forecast(
  target_pool_public_key text,
  target_campaign_id text,
  target_forecast_version text,
  target_model_version text,
  target_released_at timestamptz,
  target_expires_at timestamptz,
  target_pool_state_json jsonb,
  target_forecast_json jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $function$
declare
  expected_campaign_id text;
  canonical_payload text;
  computed_hash text;
  existing_snapshot public.mpgf_pledge_impact_forecast_snapshots%rowtype;
  inserted_snapshot_id uuid;
begin
  if btrim(coalesce(target_forecast_version, '')) = ''
     or btrim(coalesce(target_model_version, '')) = '' then
    raise exception 'Forecast and model versions are required.' using errcode = '22023';
  end if;

  select mapping.campaign_id
  into expected_campaign_id
  from public.mpgf_pledge_impact_pool_campaign_map mapping
  where mapping.pool_public_key = target_pool_public_key;

  if expected_campaign_id is null then
    raise exception 'Unknown pledge-impact pool public key: %.', target_pool_public_key
      using errcode = '23503';
  end if;
  if target_campaign_id is distinct from expected_campaign_id then
    raise exception 'Campaign % is not mapped to pool %.', target_campaign_id, target_pool_public_key
      using errcode = '23514';
  end if;

  if target_released_at < timezone('utc', now()) - interval '15 minutes'
     or target_released_at > timezone('utc', now()) + interval '5 minutes' then
    raise exception 'Forecast release timestamp is stale or future-dated.' using errcode = '22023';
  end if;
  if target_expires_at <= target_released_at
     or target_expires_at > target_released_at + interval '2 hours' then
    raise exception 'Forecast expiry must be after release and no more than two hours later.'
      using errcode = '22023';
  end if;

  if jsonb_typeof(target_pool_state_json) <> 'object'
     or target_pool_state_json ->> 'poolPublicKey' is distinct from target_pool_public_key
     or target_pool_state_json ->> 'campaignId' is distinct from target_campaign_id
     or target_pool_state_json ->> 'currency' is distinct from 'USD'
     or jsonb_typeof(target_pool_state_json -> 'thresholdsCents') <> 'array' then
    raise exception 'Pool-state snapshot is malformed or does not match the released pool.'
      using errcode = '22023';
  end if;

  if jsonb_typeof(target_forecast_json) <> 'object'
     or target_forecast_json ->> 'schemaVersion' is distinct from 'mpgf_pledge_impact_forecast_v1'
     or target_forecast_json ->> 'audience' is distinct from 'pool_state'
     or target_forecast_json ->> 'experimental' is distinct from 'true'
     or target_forecast_json ->> 'currency' is distinct from 'USD'
     or jsonb_typeof(target_forecast_json -> 'points') <> 'array'
     or jsonb_array_length(target_forecast_json -> 'points') < 2 then
    raise exception 'Forecast payload does not satisfy the experimental pool-state schema.'
      using errcode = '22023';
  end if;

  if public.mpgf_pledge_impact_contains_personalization(target_pool_state_json)
     or public.mpgf_pledge_impact_contains_personalization(target_forecast_json) then
    raise exception 'Pledge-impact forecasts may not contain viewer-level personalization.'
      using errcode = '22023';
  end if;

  canonical_payload := jsonb_build_object(
    'poolPublicKey', target_pool_public_key,
    'campaignId', target_campaign_id,
    'forecastVersion', target_forecast_version,
    'modelVersion', target_model_version,
    'releasedAt', to_char(target_released_at at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'expiresAt', to_char(target_expires_at at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'poolState', target_pool_state_json,
    'forecast', target_forecast_json
  )::text;
  computed_hash := 'sha256:' || encode(digest(convert_to(canonical_payload, 'UTF8'), 'sha256'), 'hex');

  perform pg_advisory_xact_lock(
    hashtextextended(target_pool_public_key || '|' || target_forecast_version, 0)
  );

  select *
  into existing_snapshot
  from public.mpgf_pledge_impact_forecast_snapshots snapshot
  where snapshot.pool_public_key = target_pool_public_key
    and snapshot.forecast_version = target_forecast_version;

  if existing_snapshot.id is not null then
    if existing_snapshot.content_sha256 = computed_hash then
      return existing_snapshot.id;
    end if;
    raise exception 'Forecast version % already exists with different content.', target_forecast_version
      using errcode = '23505';
  end if;

  insert into public.mpgf_pledge_impact_forecast_snapshots (
    pool_public_key,
    campaign_id,
    forecast_version,
    model_version,
    released_at,
    expires_at,
    pool_state_json,
    forecast_json,
    content_sha256
  ) values (
    target_pool_public_key,
    target_campaign_id,
    target_forecast_version,
    target_model_version,
    target_released_at,
    target_expires_at,
    target_pool_state_json,
    target_forecast_json,
    computed_hash
  ) returning id into inserted_snapshot_id;

  insert into public.mpgf_pledge_impact_forecast_audit_events (
    snapshot_id,
    event_type,
    event_payload,
    event_sha256
  ) values (
    inserted_snapshot_id,
    'forecast_released',
    jsonb_build_object(
      'poolPublicKey', target_pool_public_key,
      'campaignId', target_campaign_id,
      'forecastVersion', target_forecast_version,
      'modelVersion', target_model_version,
      'contentSha256', computed_hash
    ),
    computed_hash
  );

  return inserted_snapshot_id;
end;
$function$;

revoke all on function public.release_mpgf_pledge_impact_forecast(
  text, text, text, text, timestamptz, timestamptz, jsonb, jsonb
) from public, anon, authenticated;
grant execute on function public.release_mpgf_pledge_impact_forecast(
  text, text, text, text, timestamptz, timestamptz, jsonb, jsonb
) to service_role;

alter table public.mpgf_pledge_impact_pool_campaign_map enable row level security;
alter table public.mpgf_pledge_impact_forecast_snapshots enable row level security;
alter table public.mpgf_pledge_impact_forecast_audit_events enable row level security;

revoke all on table public.mpgf_pledge_impact_pool_campaign_map from public, anon, authenticated, service_role;
revoke all on table public.mpgf_pledge_impact_forecast_snapshots from public, anon, authenticated, service_role;
revoke all on table public.mpgf_pledge_impact_forecast_audit_events from public, anon, authenticated, service_role;

grant select on table public.mpgf_pledge_impact_pool_campaign_map to anon, authenticated, service_role;
grant select on table public.mpgf_pledge_impact_forecast_snapshots to anon, authenticated, service_role;
grant select on table public.mpgf_pledge_impact_forecast_audit_events to service_role;

drop policy if exists mpgf_pledge_impact_map_public_read
  on public.mpgf_pledge_impact_pool_campaign_map;
create policy mpgf_pledge_impact_map_public_read
  on public.mpgf_pledge_impact_pool_campaign_map
  for select to anon, authenticated
  using (true);

drop policy if exists mpgf_pledge_impact_forecast_public_read
  on public.mpgf_pledge_impact_forecast_snapshots;
create policy mpgf_pledge_impact_forecast_public_read
  on public.mpgf_pledge_impact_forecast_snapshots
  for select to anon, authenticated
  using (released_at <= timezone('utc', now()));

comment on table public.mpgf_pledge_impact_forecast_snapshots is
  'Immutable, versioned, experimental pool-level pledge-impact forecasts. Payloads may not contain viewer-level inputs.';
comment on function public.release_mpgf_pledge_impact_forecast(
  text, text, text, text, timestamptz, timestamptz, jsonb, jsonb
) is 'Service-role-only atomic release path for non-personalized pledge-impact forecasts and their audit event.';
