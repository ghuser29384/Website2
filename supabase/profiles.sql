create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  display_name text,
  city text,
  region text,
  country text,
  public_location_granularity text not null default 'hidden' check (
    public_location_granularity in ('hidden', 'country', 'region', 'city')
  ),
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using ((select auth.uid()) = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
on public.profiles
for insert
to authenticated
with check ((select auth.uid()) = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create or replace function public.handle_auth_profile_sync()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  insert into public.profiles (
    id,
    email,
    display_name,
    city,
    region,
    country,
    public_location_granularity
  )
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)),
    nullif(new.raw_user_meta_data ->> 'city', ''),
    nullif(new.raw_user_meta_data ->> 'region', ''),
    nullif(new.raw_user_meta_data ->> 'country', ''),
    case
      when new.raw_user_meta_data ->> 'public_location_granularity' in ('country', 'region', 'city')
        then new.raw_user_meta_data ->> 'public_location_granularity'
      else 'hidden'
    end
  )
  on conflict (id) do update
    set email = excluded.email,
        display_name = coalesce(excluded.display_name, public.profiles.display_name),
        city = coalesce(excluded.city, public.profiles.city),
        region = coalesce(excluded.region, public.profiles.region),
        country = coalesce(excluded.country, public.profiles.country),
        public_location_granularity = coalesce(
          excluded.public_location_granularity,
          public.profiles.public_location_granularity
        );

  return new;
end;
$$;

insert into public.profiles (
  id,
  email,
  display_name,
  city,
  region,
  country,
  public_location_granularity
)
select
  users.id,
  users.email,
  coalesce(users.raw_user_meta_data ->> 'display_name', split_part(users.email, '@', 1)),
  nullif(users.raw_user_meta_data ->> 'city', ''),
  nullif(users.raw_user_meta_data ->> 'region', ''),
  nullif(users.raw_user_meta_data ->> 'country', ''),
  case
    when users.raw_user_meta_data ->> 'public_location_granularity' in ('country', 'region', 'city')
      then users.raw_user_meta_data ->> 'public_location_granularity'
    else 'hidden'
  end
from auth.users as users
on conflict (id) do update
  set email = excluded.email,
      display_name = coalesce(excluded.display_name, public.profiles.display_name),
      city = coalesce(excluded.city, public.profiles.city),
      region = coalesce(excluded.region, public.profiles.region),
      country = coalesce(excluded.country, public.profiles.country),
      public_location_granularity = coalesce(
        excluded.public_location_granularity,
        public.profiles.public_location_granularity
      );

drop trigger if exists on_auth_profile_created on auth.users;
create trigger on_auth_profile_created
after insert or update of email, raw_user_meta_data on auth.users
for each row execute procedure public.handle_auth_profile_sync();
