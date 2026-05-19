alter table public.profiles add column if not exists country text;
alter table public.profiles add column if not exists public_location_granularity text not null default 'hidden';

update public.profiles
set public_location_granularity = 'hidden'
where public_location_granularity is null
   or public_location_granularity not in ('hidden', 'country', 'region', 'city');

alter table public.profiles drop constraint if exists profiles_public_location_granularity_check;
alter table public.profiles
add constraint profiles_public_location_granularity_check
check (public_location_granularity in ('hidden', 'country', 'region', 'city'));
