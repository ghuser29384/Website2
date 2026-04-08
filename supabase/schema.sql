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
  city text,
  region text,
  bio text not null default '',
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
  discount_note text not null default '',
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
  status public.agreement_status not null default 'active',
  notes text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.agreement_ratings (
  id uuid primary key default gen_random_uuid(),
  agreement_id uuid not null references public.agreements (id) on delete cascade,
  rater_id uuid not null references public.profiles (id) on delete cascade,
  rated_user_id uuid not null references public.profiles (id) on delete cascade,
  score smallint not null check (score between 1 and 10),
  created_at timestamptz not null default timezone('utc', now()),
  unique (agreement_id, rater_id, rated_user_id)
);

create table if not exists public.user_follows (
  follower_id uuid not null references public.profiles (id) on delete cascade,
  followed_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (follower_id, followed_id),
  check (follower_id <> followed_id)
);

create table if not exists public.offer_recommendations (
  id uuid primary key default gen_random_uuid(),
  recommender_id uuid not null references public.profiles (id) on delete cascade,
  source_offer_id uuid references public.offers (id) on delete cascade,
  recommended_offer_id uuid not null references public.offers (id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.offer_comments (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references public.offers (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  parent_id uuid references public.offer_comments (id) on delete cascade,
  depth smallint not null default 0 check (depth between 0 and 49),
  body text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.comment_votes (
  comment_id uuid not null references public.offer_comments (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  value smallint not null check (value in (-1, 1)),
  created_at timestamptz not null default timezone('utc', now()),
  primary key (comment_id, user_id)
);

create table if not exists public.offer_carts (
  offer_id uuid not null references public.offers (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (offer_id, user_id)
);

create index if not exists offers_owner_id_idx on public.offers (owner_id);
create index if not exists offers_status_created_at_idx on public.offers (status, created_at desc);
create index if not exists interests_offer_id_idx on public.interests (offer_id);
create index if not exists interests_user_id_idx on public.interests (user_id);
create index if not exists agreements_offer_id_idx on public.agreements (offer_id);
create index if not exists agreements_proposer_id_idx on public.agreements (proposer_id);
create index if not exists agreements_responder_id_idx on public.agreements (responder_id);
create index if not exists agreement_ratings_rated_user_id_idx on public.agreement_ratings (rated_user_id);
create index if not exists follows_followed_id_idx on public.user_follows (followed_id);
create index if not exists recommendations_source_offer_id_idx on public.offer_recommendations (source_offer_id);
create index if not exists recommendations_recommender_id_idx on public.offer_recommendations (recommender_id);
create index if not exists offer_comments_offer_id_idx on public.offer_comments (offer_id, created_at asc);
create index if not exists offer_comments_author_id_idx on public.offer_comments (author_id);
create index if not exists comment_votes_user_id_idx on public.comment_votes (user_id);
create index if not exists offer_carts_user_id_idx on public.offer_carts (user_id);

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
  insert into public.profiles (id, email, display_name, city, region, bio)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)),
    nullif(new.raw_user_meta_data ->> 'city', ''),
    nullif(new.raw_user_meta_data ->> 'region', ''),
    coalesce(new.raw_user_meta_data ->> 'bio', '')
  )
  on conflict (id) do update
    set email = excluded.email,
        display_name = coalesce(excluded.display_name, public.profiles.display_name),
        city = coalesce(excluded.city, public.profiles.city),
        region = coalesce(excluded.region, public.profiles.region),
        bio = case
          when excluded.bio <> '' then excluded.bio
          else public.profiles.bio
        end;

  return new;
end;
$$;

insert into public.profiles (id, email, display_name, city, region, bio)
select
  users.id,
  users.email,
  coalesce(users.raw_user_meta_data ->> 'display_name', split_part(users.email, '@', 1)),
  nullif(users.raw_user_meta_data ->> 'city', ''),
  nullif(users.raw_user_meta_data ->> 'region', ''),
  coalesce(users.raw_user_meta_data ->> 'bio', '')
from auth.users as users
on conflict (id) do update
  set email = excluded.email,
      display_name = coalesce(excluded.display_name, public.profiles.display_name),
      city = coalesce(excluded.city, public.profiles.city),
      region = coalesce(excluded.region, public.profiles.region),
      bio = case
        when excluded.bio <> '' then excluded.bio
        else public.profiles.bio
      end;

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

drop trigger if exists offer_comments_set_updated_at on public.offer_comments;
create trigger offer_comments_set_updated_at
before update on public.offer_comments
for each row execute procedure public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.offers enable row level security;
alter table public.interests enable row level security;
alter table public.agreements enable row level security;
alter table public.agreement_ratings enable row level security;
alter table public.user_follows enable row level security;
alter table public.offer_recommendations enable row level security;
alter table public.offer_comments enable row level security;
alter table public.comment_votes enable row level security;
alter table public.offer_carts enable row level security;

drop policy if exists "profiles_public_read" on public.profiles;
create policy "profiles_public_read"
on public.profiles
for select
to anon, authenticated
using (true);

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
using (
  status = 'open'
  or owner_id = (select auth.uid())
  or exists (
    select 1
    from public.interests
    where interests.offer_id = offers.id
      and interests.user_id = (select auth.uid())
  )
  or exists (
    select 1
    from public.offer_carts
    where offer_carts.offer_id = offers.id
      and offer_carts.user_id = (select auth.uid())
  )
);

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
  user_id = (select auth.uid())
  or exists (
    select 1
    from public.offers
    where offers.id = interests.offer_id
      and offers.owner_id = (select auth.uid())
  )
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
  proposer_id = (select auth.uid())
  or responder_id = (select auth.uid())
);

drop policy if exists "agreement_ratings_public_read" on public.agreement_ratings;
create policy "agreement_ratings_public_read"
on public.agreement_ratings
for select
to anon, authenticated
using (true);

drop policy if exists "agreement_ratings_insert_own" on public.agreement_ratings;
create policy "agreement_ratings_insert_own"
on public.agreement_ratings
for insert
to authenticated
with check (
  rater_id = (select auth.uid())
  and rated_user_id <> (select auth.uid())
  and exists (
    select 1
    from public.agreements
    where agreements.id = agreement_ratings.agreement_id
      and (
        agreements.proposer_id = (select auth.uid())
        or agreements.responder_id = (select auth.uid())
      )
      and (
        agreements.proposer_id = agreement_ratings.rated_user_id
        or agreements.responder_id = agreement_ratings.rated_user_id
      )
  )
);

drop policy if exists "agreement_ratings_update_own" on public.agreement_ratings;
create policy "agreement_ratings_update_own"
on public.agreement_ratings
for update
to authenticated
using (rater_id = (select auth.uid()))
with check (rater_id = (select auth.uid()));

drop policy if exists "follows_public_read" on public.user_follows;
create policy "follows_public_read"
on public.user_follows
for select
to anon, authenticated
using (true);

drop policy if exists "follows_insert_own" on public.user_follows;
create policy "follows_insert_own"
on public.user_follows
for insert
to authenticated
with check (follower_id = (select auth.uid()));

drop policy if exists "follows_delete_own" on public.user_follows;
create policy "follows_delete_own"
on public.user_follows
for delete
to authenticated
using (follower_id = (select auth.uid()));

drop policy if exists "recommendations_public_read" on public.offer_recommendations;
create policy "recommendations_public_read"
on public.offer_recommendations
for select
to anon, authenticated
using (true);

drop policy if exists "recommendations_insert_own" on public.offer_recommendations;
create policy "recommendations_insert_own"
on public.offer_recommendations
for insert
to authenticated
with check (
  recommender_id = (select auth.uid())
  and exists (
    select 1
    from public.offers recommended_offer
    where recommended_offer.id = offer_recommendations.recommended_offer_id
      and recommended_offer.owner_id <> (select auth.uid())
  )
  and (
    source_offer_id is null
    or exists (
      select 1
      from public.offers source_offer
      where source_offer.id = offer_recommendations.source_offer_id
        and source_offer.owner_id = (select auth.uid())
    )
  )
);

drop policy if exists "recommendations_delete_own" on public.offer_recommendations;
create policy "recommendations_delete_own"
on public.offer_recommendations
for delete
to authenticated
using (recommender_id = (select auth.uid()));

drop policy if exists "comments_public_read" on public.offer_comments;
create policy "comments_public_read"
on public.offer_comments
for select
to anon, authenticated
using (true);

drop policy if exists "comments_insert_own" on public.offer_comments;
create policy "comments_insert_own"
on public.offer_comments
for insert
to authenticated
with check (
  author_id = (select auth.uid())
  and depth between 0 and 49
);

drop policy if exists "comments_update_own" on public.offer_comments;
create policy "comments_update_own"
on public.offer_comments
for update
to authenticated
using (author_id = (select auth.uid()))
with check (author_id = (select auth.uid()));

drop policy if exists "comments_delete_own" on public.offer_comments;
create policy "comments_delete_own"
on public.offer_comments
for delete
to authenticated
using (author_id = (select auth.uid()));

drop policy if exists "comment_votes_public_read" on public.comment_votes;
create policy "comment_votes_public_read"
on public.comment_votes
for select
to anon, authenticated
using (true);

drop policy if exists "comment_votes_insert_own" on public.comment_votes;
create policy "comment_votes_insert_own"
on public.comment_votes
for insert
to authenticated
with check (user_id = (select auth.uid()));

drop policy if exists "comment_votes_update_own" on public.comment_votes;
create policy "comment_votes_update_own"
on public.comment_votes
for update
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

drop policy if exists "comment_votes_delete_own" on public.comment_votes;
create policy "comment_votes_delete_own"
on public.comment_votes
for delete
to authenticated
using (user_id = (select auth.uid()));

drop policy if exists "offer_carts_select_relevant" on public.offer_carts;
create policy "offer_carts_select_relevant"
on public.offer_carts
for select
to authenticated
using (
  user_id = (select auth.uid())
  or exists (
    select 1
    from public.offers
    where offers.id = offer_carts.offer_id
      and offers.owner_id = (select auth.uid())
  )
);

drop policy if exists "offer_carts_insert_own" on public.offer_carts;
create policy "offer_carts_insert_own"
on public.offer_carts
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and exists (
    select 1
    from public.offers
    where offers.id = offer_carts.offer_id
      and offers.owner_id <> (select auth.uid())
  )
);

drop policy if exists "offer_carts_delete_own" on public.offer_carts;
create policy "offer_carts_delete_own"
on public.offer_carts
for delete
to authenticated
using (user_id = (select auth.uid()));
