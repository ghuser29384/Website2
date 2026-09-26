-- Account-bound participant selection for proposal-only Co-Funds and Co-Acts.
--
-- Existing accounts are not assigned generated usernames. A profile becomes searchable
-- only after its holder explicitly chooses a valid public username. Search and canonical
-- resolution are service-role-only, return public-safe identity fields, and exclude blocked
-- pairs. Draft selection does not send an invitation or enroll a participant.

begin;

create extension if not exists pg_trgm with schema extensions;

alter table public.profiles
  add column if not exists username text,
  add column if not exists avatar_url text,
  add column if not exists account_kind text not null default 'individual',
  add column if not exists accepts_group_invitations boolean not null default true,
  add column if not exists public_invitation_mentions_enabled boolean not null default true,
  add column if not exists organization_approval_count smallint not null default 1;

-- Remove the earlier automatic-username behavior before clearing only usernames that match
-- the exact legacy generated format. User-chosen usernames, if any, are preserved.
drop trigger if exists profiles_ensure_username_v1 on public.profiles;
drop trigger if exists profiles_prepare_username_v1 on public.profiles;
drop trigger if exists profiles_sync_username_claim_v1 on public.profiles;
drop trigger if exists profiles_username_claim_v2 on public.profiles;
drop trigger if exists profiles_prepare_username_v2 on public.profiles;
drop trigger if exists profiles_record_username_claim_v2 on public.profiles;
drop function if exists public.ensure_profile_username_v1();
drop function if exists public.prepare_profile_username_v1();
drop function if exists public.sync_profile_username_claim_v1();

update public.profiles profile
set username = null
where profile.username is not null
  and (
    btrim(profile.username) = left(
      coalesce(
        nullif(
          btrim(regexp_replace(coalesce(profile.display_name, ''), '[[:cntrl:]]', '', 'g')),
          ''
        ),
        'Member'
      ),
      49
    ) || ' · ' || left(profile.id::text, 8)
    or btrim(profile.username) = 'Member · ' || left(profile.id::text, 8)
  );

alter table public.profiles alter column username drop not null;

create or replace function public.normalize_profile_username_v1(p_username text)
returns text
language sql
immutable
strict
set search_path = pg_catalog
as $function$
  select lower(regexp_replace(btrim(p_username), '^@+', ''));
$function$;

create or replace function public.profile_username_is_reserved_v1(p_username text)
returns boolean
language sql
immutable
strict
set search_path = pg_catalog
as $function$
  select public.normalize_profile_username_v1(p_username) = any (array[
    'about','account','admin','administrator','api','app','auth','billing','blog',
    'contact','create','dashboard','discover','docs','help','legal','login','logout',
    'moral-trade','moraltrade','moderator','notifications','people','privacy','profile',
    'root','security','settings','signup','staff','support','system','terms','trade',
    'trades','user','users','verification','www'
  ]::text[]);
$function$;

-- Normalize already-explicit usernames, while making accounts with values that are unsafe
-- under the final public contract choose again. This does not invent a username.
update public.profiles
set username = public.normalize_profile_username_v1(username)
where username is not null;

update public.profiles
set username = null
where username is not null
  and (
    char_length(username) not between 2 and 32
    or username !~ '^[a-z0-9]([a-z0-9-]*[a-z0-9])?$'
    or username ~ '--'
    or public.profile_username_is_reserved_v1(username)
  );

alter table public.profiles
  drop constraint if exists profiles_username_valid_check,
  drop constraint if exists profiles_username_format_check,
  add constraint profiles_username_valid_check check (
    username is null
    or (
      username = public.normalize_profile_username_v1(username)
      and char_length(username) between 2 and 32
      and username ~ '^[a-z0-9]([a-z0-9-]*[a-z0-9])?$'
      and username !~ '--'
      and not public.profile_username_is_reserved_v1(username)
    )
  ),
  drop constraint if exists profiles_avatar_url_valid_check,
  add constraint profiles_avatar_url_valid_check check (
    avatar_url is null
    or (
      char_length(avatar_url) between 8 and 500
      and avatar_url ~ '^https://'
    )
  ),
  drop constraint if exists profiles_account_kind_check,
  add constraint profiles_account_kind_check check (
    account_kind in ('individual', 'organization')
  ),
  drop constraint if exists profiles_organization_approval_count_check,
  add constraint profiles_organization_approval_count_check check (
    organization_approval_count between 1 and 12
  );

drop index if exists public.profiles_username_lower_unique_idx;
create unique index profiles_username_lower_unique_idx
  on public.profiles (lower(btrim(username)))
  where username is not null;
create index if not exists profiles_display_name_lower_idx
  on public.profiles (lower(btrim(coalesce(display_name, ''))));
create index if not exists profiles_username_trgm_idx
  on public.profiles using gin ((lower(btrim(username))) extensions.gin_trgm_ops)
  where username is not null;
create index if not exists profiles_display_name_trgm_idx
  on public.profiles using gin ((lower(btrim(coalesce(display_name, '')))) extensions.gin_trgm_ops);

-- Preserve an existing organization classification signal instead of resetting every
-- historical profile to the column default.
update public.profiles profile
set account_kind = 'organization'
from public.wish_profiles wish
where wish.profile_id = profile.id
  and wish.participant_kind in ('collective', 'institution')
  and profile.account_kind <> 'organization';

create table if not exists public.profile_username_claims (
  username text primary key,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  is_current boolean not null default true,
  claimed_at timestamptz not null default timezone('utc', now()),
  superseded_at timestamptz
);


-- Claims from generated or otherwise invalid legacy identities were never valid public
-- usernames under this contract. Valid former usernames remain reserved.
delete from public.profile_username_claims
where username ~ ' · [0-9a-f]{8}$'
   or public.normalize_profile_username_v1(username) <> username
   or char_length(username) not between 2 and 32
   or username !~ '^[a-z0-9]([a-z0-9-]*[a-z0-9])?$'
   or username ~ '--'
   or public.profile_username_is_reserved_v1(username);

update public.profile_username_claims claim
set is_current = false,
    superseded_at = coalesce(claim.superseded_at, timezone('utc', now()))
where claim.is_current
  and not exists (
    select 1
    from public.profiles profile
    where profile.id = claim.profile_id
      and profile.username = claim.username
  );

update public.profile_username_claims
set superseded_at = timezone('utc', now())
where not is_current and superseded_at is null;

update public.profile_username_claims
set superseded_at = null
where is_current and superseded_at is not null;

alter table public.profile_username_claims
  drop constraint if exists profile_username_claims_username_valid,
  drop constraint if exists profile_username_claims_format_check,
  add constraint profile_username_claims_username_valid check (
    username = public.normalize_profile_username_v1(username)
    and char_length(username) between 2 and 32
    and username ~ '^[a-z0-9]([a-z0-9-]*[a-z0-9])?$'
    and username !~ '--'
    and not public.profile_username_is_reserved_v1(username)
  ),
  drop constraint if exists profile_username_claims_state_check,
  drop constraint if exists profile_username_claims_superseded_check,
  add constraint profile_username_claims_state_check check (
    (is_current and superseded_at is null)
    or (not is_current and superseded_at is not null)
  );

create unique index if not exists profile_username_claims_one_current_per_profile_idx
  on public.profile_username_claims(profile_id)
  where is_current;
drop index if exists public.profile_username_claims_profile_idx;
create index if not exists profile_username_claims_profile_history_idx
  on public.profile_username_claims(profile_id, claimed_at desc);

insert into public.profile_username_claims(username, profile_id, is_current, claimed_at, superseded_at)
select profile.username, profile.id, true, timezone('utc', now()), null
from public.profiles profile
where profile.username is not null
on conflict (username) do update
set is_current = true,
    superseded_at = null
where public.profile_username_claims.profile_id = excluded.profile_id;

do $block$
begin
  if exists (
    select 1
    from public.profiles profile
    left join public.profile_username_claims claim
      on claim.username = profile.username
     and claim.profile_id = profile.id
     and claim.is_current
    where profile.username is not null
      and claim.username is null
  ) then
    raise exception 'profile_username_claim_reconciliation_failed' using errcode = '23505';
  end if;
end;
$block$;

create or replace function public.prepare_profile_username_v2()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  normalized text;
  existing_owner uuid;
begin
  if new.username is null or btrim(new.username) = '' then
    if tg_op = 'UPDATE' and old.username is not null then
      raise exception 'username_cannot_be_cleared' using errcode = '23514';
    end if;
    new.username := null;
    return new;
  end if;

  normalized := public.normalize_profile_username_v1(new.username);
  if char_length(normalized) not between 2 and 32
     or normalized !~ '^[a-z0-9]([a-z0-9-]*[a-z0-9])?$'
     or normalized ~ '--'
     or public.profile_username_is_reserved_v1(normalized) then
    raise exception 'invalid_or_reserved_username' using errcode = '23514';
  end if;

  select claim.profile_id
  into existing_owner
  from public.profile_username_claims claim
  where claim.username = normalized;

  if existing_owner is not null and existing_owner <> new.id then
    raise exception 'username_already_claimed_or_reserved' using errcode = '23505';
  end if;

  new.username := normalized;
  return new;
end;
$function$;

create or replace function public.record_profile_username_claim_v2()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
begin
  if tg_op = 'UPDATE' then
    if old.username is not distinct from new.username then
      return new;
    end if;

    if old.username is not null then
      update public.profile_username_claims
      set is_current = false,
          superseded_at = coalesce(superseded_at, timezone('utc', now()))
      where username = old.username
        and profile_id = new.id;
    end if;
  elsif new.username is null then
    return new;
  end if;

  if new.username is not null then
    insert into public.profile_username_claims(
      username,
      profile_id,
      is_current,
      claimed_at,
      superseded_at
    ) values (
      new.username,
      new.id,
      true,
      timezone('utc', now()),
      null
    )
    on conflict (username) do update
    set is_current = true,
        superseded_at = null
    where public.profile_username_claims.profile_id = excluded.profile_id;

    if not found then
      raise exception 'username_already_claimed_or_reserved' using errcode = '23505';
    end if;
  end if;

  return new;
end;
$function$;

create trigger profiles_prepare_username_v2
before insert or update of username on public.profiles
for each row execute function public.prepare_profile_username_v2();

create trigger profiles_record_username_claim_v2
after insert or update of username on public.profiles
for each row execute function public.record_profile_username_claim_v2();

alter function public.prepare_profile_username_v2() owner to postgres;
alter function public.record_profile_username_claim_v2() owner to postgres;
revoke all on function public.prepare_profile_username_v2() from public, anon, authenticated;
revoke all on function public.record_profile_username_claim_v2() from public, anon, authenticated;

alter table public.profile_username_claims enable row level security;
revoke all on table public.profile_username_claims from public, anon, authenticated;
grant select, insert, update, delete on table public.profile_username_claims to service_role;

comment on table public.profile_username_claims is
  'Private immutable username-claim history. Former usernames remain reserved to the same profile; this table is not a participant-search surface.';
comment on column public.profiles.username is
  'Unique public Moral Trade username chosen by the account holder. Null means the account has not yet chosen a username and is excluded from participant search.';

create or replace function public.safe_participant_display_name_v1(
  p_display_name text,
  p_username text
)
returns text
language sql
immutable
set search_path = pg_catalog
as $function$
  with cleaned as (
    select btrim(regexp_replace(regexp_replace(coalesce(p_display_name, ''), '[[:cntrl:]]', '', 'g'), '[[:space:]]+', ' ', 'g')) as value
  )
  select case
    when nullif(cleaned.value, '') is null then '@' || p_username
    when strpos(cleaned.value, '@') > 0 then '@' || p_username
    when cleaned.value ~* '(https?://|www\.)' then '@' || p_username
    when char_length(regexp_replace(cleaned.value, '[^0-9]', '', 'g')) >= 7
      and cleaned.value ~ '^[+0-9() .-]+$' then '@' || p_username
    else left(cleaned.value, 120)
  end
  from cleaned;
$function$;

revoke all on function public.normalize_profile_username_v1(text) from public, anon, authenticated;
revoke all on function public.profile_username_is_reserved_v1(text) from public, anon, authenticated;
revoke all on function public.safe_participant_display_name_v1(text, text) from public, anon, authenticated;

-- The profile username check constraint calls these two pure validators while ordinary
-- authenticated owners update their own profile. Grant only those non-sensitive helpers;
-- participant search and the private claim ledger remain service-role-only.
grant execute on function public.normalize_profile_username_v1(text) to authenticated;
grant execute on function public.profile_username_is_reserved_v1(text) to authenticated;

drop function if exists public.search_create_participants_v1(uuid, text, text, uuid, integer);
drop function if exists public.resolve_create_participants_v1(uuid, uuid[]);

create or replace function public.search_create_participants_v2(
  p_actor_profile_id uuid,
  p_query text,
  p_limit integer default 12
)
returns table (
  profile_id uuid,
  username text,
  display_name text,
  avatar_url text,
  account_type text,
  verification text,
  public_invitation_mentions_enabled boolean
)
language plpgsql
stable
security definer
set search_path = pg_catalog, public, auth, extensions
as $function$
declare
  normalized_query text := lower(regexp_replace(regexp_replace(btrim(coalesce(p_query, '')), '^@+', ''), '[[:space:]]+', ' ', 'g'));
  bounded_limit integer := least(12, greatest(1, coalesce(p_limit, 12)));
begin
  if auth.role() <> 'service_role' then
    raise exception 'service_role_required' using errcode = '42501';
  end if;
  if p_actor_profile_id is null then
    raise exception 'actor_profile_required' using errcode = '22023';
  end if;
  if char_length(normalized_query) < 2 or char_length(normalized_query) > 80 then
    return;
  end if;

  return query
  with candidate as (
    select
      profile.id,
      profile.username,
      public.safe_participant_display_name_v1(profile.display_name, profile.username) as display_name,
      profile.avatar_url,
      profile.account_kind,
      profile.public_invitation_mentions_enabled,
      case
        when lower(profile.username) = normalized_query then 0
        when lower(public.safe_participant_display_name_v1(profile.display_name, profile.username)) = normalized_query then 1
        when left(lower(profile.username), char_length(normalized_query)) = normalized_query then 2
        when left(lower(public.safe_participant_display_name_v1(profile.display_name, profile.username)), char_length(normalized_query)) = normalized_query then 3
        when strpos(lower(profile.username), normalized_query) > 0 then 4
        when strpos(lower(public.safe_participant_display_name_v1(profile.display_name, profile.username)), normalized_query) > 0 then 5
        when greatest(
          extensions.similarity(lower(profile.username), normalized_query),
          extensions.similarity(lower(public.safe_participant_display_name_v1(profile.display_name, profile.username)), normalized_query)
        ) >= 0.28 then 6
        else 100
      end as match_rank
    from public.profiles profile
    left join public.wish_profiles wish on wish.profile_id = profile.id
    where profile.id <> p_actor_profile_id
      and profile.username is not null
      and profile.accepts_group_invitations
      and coalesce(wish.safety_status, 'clear') <> 'blocked'
      and not exists (
        select 1
        from public.trade_blocks block
        where (block.blocker_id = p_actor_profile_id and block.blocked_id = profile.id)
           or (block.blocker_id = profile.id and block.blocked_id = p_actor_profile_id)
      )
  )
  select
    candidate.id,
    candidate.username,
    candidate.display_name,
    candidate.avatar_url,
    candidate.account_kind,
    case
      when exists (
        select 1 from public.profile_verification_badges badge
        where badge.profile_id = candidate.id
          and badge.badge_type = case
            when candidate.account_kind = 'organization' then 'organization_verified'
            else 'identity_verified'
          end
          and badge.status = 'verified'
          and (badge.expires_at is null or badge.expires_at > timezone('utc', now()))
      ) then case
        when candidate.account_kind = 'organization' then 'organization-verified'
        else 'identity-verified'
      end
      else 'none'
    end,
    candidate.public_invitation_mentions_enabled
  from candidate
  where candidate.match_rank < 100
  order by candidate.match_rank, lower(candidate.username), candidate.id
  limit bounded_limit;
end;
$function$;

create or replace function public.resolve_create_participants_v2(
  p_actor_profile_id uuid,
  p_profile_ids uuid[]
)
returns table (
  profile_id uuid,
  username text,
  display_name text,
  avatar_url text,
  account_type text,
  verification text,
  public_invitation_mentions_enabled boolean
)
language plpgsql
stable
security definer
set search_path = pg_catalog, public, auth
as $function$
begin
  if auth.role() <> 'service_role' then
    raise exception 'service_role_required' using errcode = '42501';
  end if;
  if p_actor_profile_id is null then
    raise exception 'actor_profile_required' using errcode = '22023';
  end if;
  if p_profile_ids is null or coalesce(array_length(p_profile_ids, 1), 0) = 0 then
    return;
  end if;
  if array_length(p_profile_ids, 1) > 100 then
    raise exception 'too_many_profiles' using errcode = '22023';
  end if;

  return query
  with requested as (
    select request.profile_id, min(request.ordinality) as ordinality
    from unnest(p_profile_ids) with ordinality as request(profile_id, ordinality)
    where request.profile_id is not null
    group by request.profile_id
  )
  select
    profile.id,
    profile.username,
    public.safe_participant_display_name_v1(profile.display_name, profile.username),
    profile.avatar_url,
    profile.account_kind,
    case
      when exists (
        select 1 from public.profile_verification_badges badge
        where badge.profile_id = profile.id
          and badge.badge_type = case
            when profile.account_kind = 'organization' then 'organization_verified'
            else 'identity_verified'
          end
          and badge.status = 'verified'
          and (badge.expires_at is null or badge.expires_at > timezone('utc', now()))
      ) then case
        when profile.account_kind = 'organization' then 'organization-verified'
        else 'identity-verified'
      end
      else 'none'
    end,
    profile.public_invitation_mentions_enabled
  from requested
  join public.profiles profile on profile.id = requested.profile_id
  left join public.wish_profiles wish on wish.profile_id = profile.id
  where profile.username is not null
    and (profile.id = p_actor_profile_id or profile.accepts_group_invitations)
    and (profile.id = p_actor_profile_id or coalesce(wish.safety_status, 'clear') <> 'blocked')
    and (
      profile.id = p_actor_profile_id
      or not exists (
        select 1
        from public.trade_blocks block
        where (block.blocker_id = p_actor_profile_id and block.blocked_id = profile.id)
           or (block.blocker_id = profile.id and block.blocked_id = p_actor_profile_id)
      )
    )
  order by requested.ordinality;
end;
$function$;

alter function public.search_create_participants_v2(uuid, text, integer) owner to postgres;
alter function public.resolve_create_participants_v2(uuid, uuid[]) owner to postgres;
revoke all on function public.search_create_participants_v2(uuid, text, integer)
  from public, anon, authenticated;
revoke all on function public.resolve_create_participants_v2(uuid, uuid[])
  from public, anon, authenticated;
grant execute on function public.search_create_participants_v2(uuid, text, integer)
  to service_role;
grant execute on function public.resolve_create_participants_v2(uuid, uuid[])
  to service_role;

comment on function public.search_create_participants_v2(uuid, text, integer) is
  'Service-role-only participant autocomplete over chosen public usernames and safe display names. Excludes self, blocked pairs, non-searchable accounts, emails, and phones.';
comment on function public.resolve_create_participants_v2(uuid, uuid[]) is
  'Service-role-only pre-persistence canonical resolver for selected Co-Fund and Co-Act account UUIDs. Returns public-safe identity fields and excludes blocked or unavailable invitees.';

commit;
