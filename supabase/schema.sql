create extension if not exists pgcrypto;

do $$
begin
  create type public.offer_mode as enum ('pledge', 'offset');
exception
  when duplicate_object then null;
end
$$;

alter type public.offer_mode add value if not exists 'payment';

do $$
begin
  create type public.offer_status as enum ('open', 'paused', 'matched', 'closed');
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create type public.interest_status as enum ('pending', 'accepted', 'declined', 'withdrawn');
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create type public.agreement_status as enum ('proposed', 'active', 'completed', 'cancelled');
exception
  when duplicate_object then null;
end
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  display_name text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.offers (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  owner_alias text not null,
  mode public.offer_mode not null,
  offered_cause text not null,
  requested_cause text not null,
  offer_action text not null,
  request_action text not null,
  compromise_cause text not null default 'Not needed',
  offer_impact smallint not null check (offer_impact between 1 and 10),
  min_counterparty_impact smallint not null check (min_counterparty_impact between 1 and 10),
  verification text not null,
  duration text not null,
  trust_level smallint not null check (trust_level between 1 and 5),
  notes text not null default '',
  status public.offer_status not null default 'open',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.interests (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references public.offers (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  interested_alias text not null,
  message text not null default '',
  status public.interest_status not null default 'pending',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (offer_id, user_id)
);

create table if not exists public.agreements (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references public.offers (id) on delete cascade,
  interest_id uuid unique references public.interests (id) on delete cascade,
  proposer_id uuid not null references public.profiles (id) on delete cascade,
  responder_id uuid not null references public.profiles (id) on delete cascade,
  status public.agreement_status not null default 'proposed',
  notes text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists offers_owner_id_idx on public.offers (owner_id);
create index if not exists offers_status_created_at_idx on public.offers (status, created_at desc);
create index if not exists interests_offer_id_idx on public.interests (offer_id);
create index if not exists interests_user_id_idx on public.interests (user_id);
create index if not exists agreements_offer_id_idx on public.agreements (offer_id);
create index if not exists agreements_proposer_id_idx on public.agreements (proposer_id);
create index if not exists agreements_responder_id_idx on public.agreements (responder_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create or replace function public.handle_auth_profile_sync()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do update
    set email = excluded.email,
        display_name = coalesce(excluded.display_name, public.profiles.display_name);

  return new;
end;
$$;

insert into public.profiles (id, email, display_name)
select
  users.id,
  users.email,
  coalesce(users.raw_user_meta_data ->> 'display_name', split_part(users.email, '@', 1))
from auth.users as users
on conflict (id) do update
  set email = excluded.email,
      display_name = coalesce(excluded.display_name, public.profiles.display_name);

alter table public.offers drop constraint if exists offers_owner_id_fkey;
alter table public.offers
  add constraint offers_owner_id_fkey
  foreign key (owner_id) references public.profiles (id) on delete cascade;

alter table public.interests drop constraint if exists interests_user_id_fkey;
alter table public.interests
  add constraint interests_user_id_fkey
  foreign key (user_id) references public.profiles (id) on delete cascade;

alter table public.agreements drop constraint if exists agreements_proposer_id_fkey;
alter table public.agreements
  add constraint agreements_proposer_id_fkey
  foreign key (proposer_id) references public.profiles (id) on delete cascade;

alter table public.agreements drop constraint if exists agreements_responder_id_fkey;
alter table public.agreements
  add constraint agreements_responder_id_fkey
  foreign key (responder_id) references public.profiles (id) on delete cascade;

drop trigger if exists on_auth_profile_created on auth.users;
create trigger on_auth_profile_created
after insert or update of email, raw_user_meta_data on auth.users
for each row execute procedure public.handle_auth_profile_sync();

drop trigger if exists offers_set_updated_at on public.offers;
create trigger offers_set_updated_at
before update on public.offers
for each row execute procedure public.set_updated_at();

drop trigger if exists interests_set_updated_at on public.interests;
create trigger interests_set_updated_at
before update on public.interests
for each row execute procedure public.set_updated_at();

drop trigger if exists agreements_set_updated_at on public.agreements;
create trigger agreements_set_updated_at
before update on public.agreements
for each row execute procedure public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.offers enable row level security;
alter table public.interests enable row level security;
alter table public.agreements enable row level security;

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

drop policy if exists "offers_public_read" on public.offers;
create policy "offers_public_read"
on public.offers
for select
to anon, authenticated
using (status = 'open' or owner_id = (select auth.uid()));

drop policy if exists "offers_insert_own" on public.offers;
create policy "offers_insert_own"
on public.offers
for insert
to authenticated
with check ((select auth.uid()) = owner_id);

drop policy if exists "offers_update_own" on public.offers;
create policy "offers_update_own"
on public.offers
for update
to authenticated
using ((select auth.uid()) = owner_id)
with check ((select auth.uid()) = owner_id);

drop policy if exists "offers_delete_own" on public.offers;
create policy "offers_delete_own"
on public.offers
for delete
to authenticated
using ((select auth.uid()) = owner_id);

drop policy if exists "interests_select_relevant" on public.interests;
create policy "interests_select_relevant"
on public.interests
for select
to authenticated
using (
  user_id = (select auth.uid())
  or exists (
    select 1
    from public.offers
    where offers.id = interests.offer_id
      and offers.owner_id = (select auth.uid())
  )
);

drop policy if exists "interests_insert_own" on public.interests;
create policy "interests_insert_own"
on public.interests
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and exists (
    select 1
    from public.offers
    where offers.id = interests.offer_id
      and offers.owner_id <> (select auth.uid())
  )
);

drop policy if exists "interests_update_relevant" on public.interests;
create policy "interests_update_relevant"
on public.interests
for update
to authenticated
using (
  user_id = (select auth.uid())
  or exists (
    select 1
    from public.offers
    where offers.id = interests.offer_id
      and offers.owner_id = (select auth.uid())
  )
)
with check (
  user_id = interests.user_id
);

drop policy if exists "agreements_select_participants" on public.agreements;
create policy "agreements_select_participants"
on public.agreements
for select
to authenticated
using (
  proposer_id = (select auth.uid())
  or responder_id = (select auth.uid())
);

drop policy if exists "agreements_insert_participants" on public.agreements;
create policy "agreements_insert_participants"
on public.agreements
for insert
to authenticated
with check (
  proposer_id = (select auth.uid())
  or responder_id = (select auth.uid())
);

drop policy if exists "agreements_update_participants" on public.agreements;
create policy "agreements_update_participants"
on public.agreements
for update
to authenticated
using (
  proposer_id = (select auth.uid())
  or responder_id = (select auth.uid())
)
with check (
  proposer_id = agreements.proposer_id
  and responder_id = agreements.responder_id
);
