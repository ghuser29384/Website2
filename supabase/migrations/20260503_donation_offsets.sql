create table if not exists public.registered_charities (
  id text primary key,
  name text not null,
  cause_area text not null default '',
  website_url text not null default '',
  summary text not null default '',
  is_active boolean not null default true,
  is_political_campaign boolean not null default false,
  selectable boolean not null default true,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.donation_offset_offers (
  offer_id uuid primary key references public.offers (id) on delete cascade,
  baseline_amount_cents integer not null check (baseline_amount_cents > 0),
  baseline_opposed_cause text not null default '',
  requested_matching_amount_cents integer not null check (requested_matching_amount_cents > 0),
  requested_opposed_cause text not null default '',
  compromise_charity_id text not null references public.registered_charities (id),
  offset_ratio numeric(10,4) not null check (offset_ratio > 0),
  time_horizon text not null check (time_horizon in ('one_off', 'recurring')),
  verification_method text not null check (verification_method in ('receipts_uploaded', 'funds_in_escrow', 'third_party_audit')),
  unmatched_surplus_rule text not null check (unmatched_surplus_rule in ('return_to_donors', 'donate_to_compromise_destination', 'split_evenly')),
  evidence_url text not null default '',
  moderation_status text not null default 'clear' check (moderation_status in ('clear', 'flagged', 'blocked')),
  moderation_notes text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.donation_offset_matches (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references public.offers (id) on delete cascade,
  interest_id uuid references public.interests (id) on delete set null,
  guest_interest_id uuid references public.guest_interests (id) on delete set null,
  owner_profile_id uuid not null references public.profiles (id) on delete cascade,
  counterparty_profile_id uuid references public.profiles (id) on delete set null,
  counterparty_email text,
  matched_baseline_cents integer not null check (matched_baseline_cents >= 0),
  matched_counterparty_cents integer not null check (matched_counterparty_cents >= 0),
  compromise_total_cents integer not null check (compromise_total_cents >= 0),
  unmatched_baseline_cents integer not null default 0 check (unmatched_baseline_cents >= 0),
  unmatched_counterparty_cents integer not null default 0 check (unmatched_counterparty_cents >= 0),
  status text not null default 'completed' check (status in ('matched', 'completed', 'cancelled')),
  owner_evidence_url text not null default '',
  counterparty_evidence_url text not null default '',
  compromise_evidence_url text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists donation_offset_offers_charity_idx on public.donation_offset_offers (compromise_charity_id);
create index if not exists donation_offset_offers_moderation_idx on public.donation_offset_offers (moderation_status, created_at desc);
create index if not exists donation_offset_matches_offer_idx on public.donation_offset_matches (offer_id, created_at desc);
create index if not exists donation_offset_matches_owner_idx on public.donation_offset_matches (owner_profile_id, created_at desc);
create index if not exists donation_offset_matches_counterparty_idx on public.donation_offset_matches (counterparty_profile_id, created_at desc);

drop trigger if exists donation_offset_offers_set_updated_at on public.donation_offset_offers;
create trigger donation_offset_offers_set_updated_at
before update on public.donation_offset_offers
for each row execute procedure public.set_updated_at();

drop trigger if exists donation_offset_matches_set_updated_at on public.donation_offset_matches;
create trigger donation_offset_matches_set_updated_at
before update on public.donation_offset_matches
for each row execute procedure public.set_updated_at();

insert into public.registered_charities (
  id,
  name,
  cause_area,
  website_url,
  summary,
  is_active,
  is_political_campaign,
  selectable
)
values
  (
    'givewell-top-charities-fund',
    'GiveWell Top Charities Fund',
    'Global poverty',
    'https://www.every.org/givewell-top-charities-fund',
    'A broad compromise destination for donors who want a GiveWell-routed global poverty fund.',
    true,
    false,
    true
  ),
  (
    'animal-charity-evaluators-fund',
    'ACE Recommended Charity Fund',
    'Animal welfare',
    'https://www.every.org/animalcharityevaluators/f/recommended-charity-c87e',
    'A compromise destination routed through Animal Charity Evaluators'' recommended fund.',
    true,
    false,
    true
  ),
  (
    'founders-pledge-climate-fund',
    'Founders Pledge: Climate Fund',
    'Climate',
    'https://www.every.org/climate.fund',
    'A broad climate compromise destination for cases where both sides prefer redirected giving to cancelled-out advocacy.',
    true,
    false,
    true
  ),
  (
    'ea-long-term-future-fund',
    'EA Long-Term Future Fund',
    'Future flourishing',
    'https://www.every.org/ea-long-term-future-fund',
    'A longtermist compromise destination covering existential risk and long-run future concerns.',
    true,
    false,
    true
  ),
  (
    'direct-relief',
    'Direct Relief',
    'Public health',
    'https://www.directrelief.org/',
    'A registered public-health charity for donors who want a simpler, legible compromise destination.',
    true,
    false,
    true
  ),
  (
    'campaign-example-prohibited',
    'Illustrative political campaign committee',
    'Political campaign',
    'https://example.invalid/campaign',
    'A prohibited example used to ensure the platform rejects campaign-offset attempts.',
    false,
    true,
    false
  )
on conflict (id) do update
set
  name = excluded.name,
  cause_area = excluded.cause_area,
  website_url = excluded.website_url,
  summary = excluded.summary,
  is_active = excluded.is_active,
  is_political_campaign = excluded.is_political_campaign,
  selectable = excluded.selectable;

alter table public.registered_charities enable row level security;
alter table public.donation_offset_offers enable row level security;
alter table public.donation_offset_matches enable row level security;

drop policy if exists "registered_charities_public_read" on public.registered_charities;
create policy "registered_charities_public_read"
on public.registered_charities
for select
to anon, authenticated
using (true);

drop policy if exists "donation_offset_offers_public_read" on public.donation_offset_offers;
create policy "donation_offset_offers_public_read"
on public.donation_offset_offers
for select
to anon, authenticated
using (true);

drop policy if exists "donation_offset_offers_insert_own" on public.donation_offset_offers;
create policy "donation_offset_offers_insert_own"
on public.donation_offset_offers
for insert
to authenticated
with check (
  exists (
    select 1
    from public.offers
    where offers.id = donation_offset_offers.offer_id
      and offers.owner_id = (select auth.uid())
  )
);

drop policy if exists "donation_offset_offers_update_own" on public.donation_offset_offers;
create policy "donation_offset_offers_update_own"
on public.donation_offset_offers
for update
to authenticated
using (
  exists (
    select 1
    from public.offers
    where offers.id = donation_offset_offers.offer_id
      and offers.owner_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.offers
    where offers.id = donation_offset_offers.offer_id
      and offers.owner_id = (select auth.uid())
  )
);

drop policy if exists "donation_offset_offers_delete_own" on public.donation_offset_offers;
create policy "donation_offset_offers_delete_own"
on public.donation_offset_offers
for delete
to authenticated
using (
  exists (
    select 1
    from public.offers
    where offers.id = donation_offset_offers.offer_id
      and offers.owner_id = (select auth.uid())
  )
);

drop policy if exists "donation_offset_matches_select_relevant" on public.donation_offset_matches;
create policy "donation_offset_matches_select_relevant"
on public.donation_offset_matches
for select
to authenticated
using (
  owner_profile_id = (select auth.uid())
  or counterparty_profile_id = (select auth.uid())
);

drop policy if exists "donation_offset_matches_insert_owner" on public.donation_offset_matches;
create policy "donation_offset_matches_insert_owner"
on public.donation_offset_matches
for insert
to authenticated
with check (owner_profile_id = (select auth.uid()));

drop policy if exists "donation_offset_matches_update_owner" on public.donation_offset_matches;
create policy "donation_offset_matches_update_owner"
on public.donation_offset_matches
for update
to authenticated
using (owner_profile_id = (select auth.uid()))
with check (owner_profile_id = (select auth.uid()));
