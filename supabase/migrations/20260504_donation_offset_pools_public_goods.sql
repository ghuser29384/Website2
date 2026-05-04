alter table public.registered_charities
  add column if not exists is_moral_public_good boolean not null default false;

alter table public.registered_charities
  add column if not exists consensus_label text not null default '';

alter table public.registered_charities
  add column if not exists sort_order integer not null default 100;

create table if not exists public.donation_offset_pools (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references public.profiles (id) on delete cascade,
  name text not null default '',
  description text not null default '',
  compromise_charity_id text not null references public.registered_charities (id),
  offset_ratio numeric(10,4) not null check (offset_ratio > 0),
  time_horizon text not null check (time_horizon in ('one_off', 'recurring')),
  verification_method text not null check (
    verification_method in ('proof_of_past_donations', 'receipts_uploaded', 'funds_in_escrow', 'third_party_audit')
  ),
  unmatched_surplus_rule text not null check (
    unmatched_surplus_rule in ('return_to_donors', 'donate_to_compromise_destination', 'donate_to_original_cause', 'split_evenly')
  ),
  assurance_minimum_cents integer not null default 0 check (assurance_minimum_cents >= 0),
  assurance_deadline_at timestamptz,
  side_a_label text not null default '',
  side_b_label text not null default '',
  status text not null default 'open' check (
    status in ('open', 'assurance_pending', 'assurance_met', 'closed')
  ),
  moderation_status text not null default 'clear' check (
    moderation_status in ('clear', 'flagged', 'blocked')
  ),
  moderation_notes text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.donation_offset_offers
  add column if not exists participation_mode text not null default 'direct';

alter table public.donation_offset_offers
  add column if not exists pool_id uuid references public.donation_offset_pools (id) on delete set null;

alter table public.donation_offset_offers
  add column if not exists pool_side text;

alter table public.donation_offset_offers
  add column if not exists assurance_minimum_cents integer not null default 0;

alter table public.donation_offset_offers
  add column if not exists assurance_deadline_at timestamptz;

alter table public.donation_offset_offers
  add column if not exists moderation_reviewed_by uuid references public.profiles (id);

alter table public.donation_offset_offers
  add column if not exists moderation_reviewed_at timestamptz;

alter table public.donation_offset_offers
  drop constraint if exists donation_offset_offers_verification_method_check;

alter table public.donation_offset_offers
  add constraint donation_offset_offers_verification_method_check
  check (
    verification_method in ('proof_of_past_donations', 'receipts_uploaded', 'funds_in_escrow', 'third_party_audit')
  );

alter table public.donation_offset_offers
  drop constraint if exists donation_offset_offers_unmatched_surplus_rule_check;

alter table public.donation_offset_offers
  add constraint donation_offset_offers_unmatched_surplus_rule_check
  check (
    unmatched_surplus_rule in ('return_to_donors', 'donate_to_compromise_destination', 'donate_to_original_cause', 'split_evenly')
  );

alter table public.donation_offset_offers
  drop constraint if exists donation_offset_offers_participation_mode_check;

alter table public.donation_offset_offers
  add constraint donation_offset_offers_participation_mode_check
  check (participation_mode in ('direct', 'pool'));

alter table public.donation_offset_offers
  drop constraint if exists donation_offset_offers_pool_side_check;

alter table public.donation_offset_offers
  add constraint donation_offset_offers_pool_side_check
  check (pool_side is null or pool_side in ('side_a', 'side_b'));

alter table public.donation_offset_offers
  drop constraint if exists donation_offset_offers_assurance_minimum_cents_check;

alter table public.donation_offset_offers
  add constraint donation_offset_offers_assurance_minimum_cents_check
  check (assurance_minimum_cents >= 0);

create index if not exists registered_charities_public_goods_idx
  on public.registered_charities (is_moral_public_good, sort_order, name);

create index if not exists donation_offset_pools_status_idx
  on public.donation_offset_pools (status, created_at desc);

create index if not exists donation_offset_pools_charity_idx
  on public.donation_offset_pools (compromise_charity_id, created_at desc);

create index if not exists donation_offset_offers_pool_idx
  on public.donation_offset_offers (pool_id, created_at desc);

drop trigger if exists donation_offset_pools_set_updated_at on public.donation_offset_pools;

create trigger donation_offset_pools_set_updated_at
before update on public.donation_offset_pools
for each row execute procedure public.set_updated_at();

insert into public.registered_charities (
  id,
  name,
  cause_area,
  website_url,
  summary,
  is_active,
  is_political_campaign,
  selectable,
  is_moral_public_good,
  consensus_label,
  sort_order
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
    true,
    true,
    'Global health and anti-poverty',
    10
  ),
  (
    'animal-charity-evaluators-fund',
    'ACE Recommended Charity Fund',
    'Animal welfare',
    'https://www.every.org/animalcharityevaluators/f/recommended-charity-c87e',
    'A compromise destination routed through Animal Charity Evaluators'' recommended fund.',
    true,
    false,
    true,
    true,
    'Animal welfare',
    40
  ),
  (
    'founders-pledge-climate-fund',
    'Founders Pledge: Climate Fund',
    'Climate',
    'https://www.every.org/climate.fund',
    'A broad climate compromise destination for cases where both sides prefer redirected giving to cancelled-out advocacy.',
    true,
    false,
    true,
    true,
    'Climate and air quality',
    30
  ),
  (
    'ea-long-term-future-fund',
    'EA Long-Term Future Fund',
    'Future flourishing',
    'https://www.every.org/ea-long-term-future-fund',
    'A longtermist compromise destination covering existential risk and long-run future concerns.',
    true,
    false,
    true,
    true,
    'Future flourishing',
    50
  ),
  (
    'direct-relief',
    'Direct Relief',
    'Public health',
    'https://www.directrelief.org/',
    'A registered public-health charity for donors who want a simpler, legible compromise destination.',
    true,
    false,
    true,
    true,
    'Emergency public health',
    20
  ),
  (
    'campaign-example-prohibited',
    'Illustrative political campaign committee',
    'Political campaign',
    'https://example.invalid/campaign',
    'A prohibited example used to ensure the platform rejects campaign-offset attempts.',
    false,
    true,
    false,
    false,
    'Prohibited',
    999
  )
on conflict (id) do update
set
  name = excluded.name,
  cause_area = excluded.cause_area,
  website_url = excluded.website_url,
  summary = excluded.summary,
  is_active = excluded.is_active,
  is_political_campaign = excluded.is_political_campaign,
  selectable = excluded.selectable,
  is_moral_public_good = excluded.is_moral_public_good,
  consensus_label = excluded.consensus_label,
  sort_order = excluded.sort_order;

alter table public.donation_offset_pools enable row level security;

drop policy if exists "donation_offset_pools_public_read" on public.donation_offset_pools;
create policy "donation_offset_pools_public_read"
on public.donation_offset_pools
for select
to anon, authenticated
using (status <> 'closed' and moderation_status = 'clear');

drop policy if exists "donation_offset_pools_insert_own" on public.donation_offset_pools;
create policy "donation_offset_pools_insert_own"
on public.donation_offset_pools
for insert
to authenticated
with check (created_by = (select auth.uid()));

drop policy if exists "donation_offset_pools_update_own" on public.donation_offset_pools;
create policy "donation_offset_pools_update_own"
on public.donation_offset_pools
for update
to authenticated
using (created_by = (select auth.uid()))
with check (created_by = (select auth.uid()));

drop policy if exists "donation_offset_offers_public_read" on public.donation_offset_offers;
create policy "donation_offset_offers_public_read"
on public.donation_offset_offers
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.offers
    where offers.id = donation_offset_offers.offer_id
      and (
        offers.status = 'open'
        or offers.owner_id = (select auth.uid())
      )
  )
);
