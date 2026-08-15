create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create schema auth;
create schema extensions;
create extension pgcrypto with schema extensions;

create table public.profiles (
  id uuid primary key,
  email text not null default '',
  display_name text,
  bio text not null default '',
  created_at timestamptz not null default timezone('utc', now())
);

-- Only the old table surface touched by the additive cross-subtype charge
-- guard is needed in the disposable PostgreSQL service.
create table public.direct_donation_upgrade_obligations (
  id uuid primary key default gen_random_uuid(),
  provider_charge_id_hash text not null default ''
);

create or replace function public.direct_donation_upgrade_canonical_json(
  p_value jsonb
)
returns text
language plpgsql
immutable
strict
set search_path = pg_catalog
as $$
declare
  value_type text := jsonb_typeof(p_value);
  result text;
begin
  if value_type in ('null', 'boolean', 'number', 'string') then
    return p_value::text;
  end if;
  if value_type = 'array' then
    select '[' || coalesce(string_agg(
      public.direct_donation_upgrade_canonical_json(element.value),
      ',' order by element.ordinality
    ), '') || ']'
    into result
    from jsonb_array_elements(p_value) with ordinality
      as element(value, ordinality);
    return result;
  end if;
  if value_type = 'object' then
    select '{' || coalesce(string_agg(
      to_jsonb(entry.key)::text || ':' ||
        public.direct_donation_upgrade_canonical_json(entry.value),
      ',' order by entry.key
    ), '') || '}'
    into result
    from jsonb_each(p_value) as entry(key, value);
    return result;
  end if;
  raise exception 'Unsupported canonical JSON type.';
end;
$$;

create or replace function public.direct_donation_upgrade_validate_recipient(
  p_recipient jsonb,
  p_hash text
)
returns void
language plpgsql
immutable
set search_path = pg_catalog
as $$
begin
  if jsonb_typeof(p_recipient) is distinct from 'object'
     or p_hash !~ '^[0-9a-f]{64}$'
     or p_recipient->>'identityHash' is distinct from p_hash
     or p_recipient->>'provider' is distinct from 'every_org'
     or coalesce((p_recipient->>'isDisbursable')::boolean, false) is not true then
    raise exception 'Invalid disposable Every.org recipient fixture.';
  end if;
end;
$$;

create or replace function public.direct_donation_upgrade_temporarily_restricted(
  p_profile_id uuid
)
returns boolean
language sql
stable
set search_path = pg_catalog
as $$ select false; $$;

create or replace function public.direct_donation_upgrade_lock_profile_eligibility(
  p_profile_id uuid
)
returns void
language plpgsql
set search_path = pg_catalog
as $$
begin
  perform 1 from public.profiles where id = p_profile_id for update;
end;
$$;
