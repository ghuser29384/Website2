-- Donation Redirect v2: participant-owned destinations, frozen two-party impact
-- receipts, and an explicitly opt-in public sharing token.

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
    'against-malaria-foundation',
    'Against Malaria Foundation',
    'Global health',
    'https://www.againstmalaria.com/',
    'Funds long-lasting insecticidal nets to prevent malaria.',
    true,
    false,
    true,
    true,
    'Malaria prevention',
    21
  ),
  (
    'malaria-consortium-smc',
    'Malaria Consortium — seasonal malaria chemoprevention',
    'Global health',
    'https://www.malariaconsortium.org/',
    'Supports seasonal malaria chemoprevention for children.',
    true,
    false,
    true,
    true,
    'Malaria prevention',
    22
  ),
  (
    'helen-keller-intl-vitamin-a',
    'Helen Keller Intl — vitamin A supplementation',
    'Global health',
    'https://helenkellerintl.org/',
    'Supports vitamin A supplementation for children at risk of deficiency.',
    true,
    false,
    true,
    true,
    'Child health and nutrition',
    23
  ),
  (
    'new-incentives',
    'New Incentives',
    'Global health',
    'https://www.newincentives.org/',
    'Supports conditional cash transfers that increase infant vaccination.',
    true,
    false,
    true,
    true,
    'Childhood vaccination',
    24
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

-- Acceptance creates an agreement and a matched pair. Completion is reserved for
-- the atomic post-transfer finalization function.
alter table public.donation_offset_matches alter column status set default 'matched';

create table if not exists public.donation_offset_redirect_plans (
  match_id uuid not null references public.donation_offset_matches(id) on delete cascade,
  participant_role text not null check (participant_role in ('owner', 'counterparty')),
  participant_profile_id uuid not null references public.profiles(id) on delete cascade,
  registered_charity_id text not null references public.registered_charities(id) on delete restrict,
  plan_version integer not null default 1 check (plan_version > 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (match_id, participant_role)
);

create index if not exists donation_offset_redirect_plans_profile_idx
  on public.donation_offset_redirect_plans (participant_profile_id, updated_at desc);

create index if not exists donation_offset_redirect_plans_charity_idx
  on public.donation_offset_redirect_plans (registered_charity_id);

create or replace function public.validate_donation_offset_redirect_plan()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  expected_profile_id uuid;
  charity_is_eligible boolean;
begin
  select case
    when new.participant_role = 'owner' then donation_offset_matches.owner_profile_id
    else donation_offset_matches.counterparty_profile_id
  end
  into expected_profile_id
  from public.donation_offset_matches
  where donation_offset_matches.id = new.match_id;

  if expected_profile_id is null or expected_profile_id <> new.participant_profile_id then
    raise exception 'Redirect-plan participant does not match the donation-offset role.';
  end if;

  select
    registered_charities.is_active
    and registered_charities.selectable
    and not registered_charities.is_political_campaign
  into charity_is_eligible
  from public.registered_charities
  where registered_charities.id = new.registered_charity_id;

  if coalesce(charity_is_eligible, false) is not true then
    raise exception 'Redirect-plan destination is not an eligible registered charity.';
  end if;

  if tg_op = 'UPDATE'
    and new.registered_charity_id is distinct from old.registered_charity_id
    and new.plan_version <= old.plan_version then
    raise exception 'Changing a redirect destination requires a newer plan version.';
  end if;

  return new;
end;
$$;

drop trigger if exists donation_offset_redirect_plans_validate
  on public.donation_offset_redirect_plans;
create trigger donation_offset_redirect_plans_validate
before insert or update on public.donation_offset_redirect_plans
for each row execute function public.validate_donation_offset_redirect_plan();

drop trigger if exists donation_offset_redirect_plans_set_updated_at
  on public.donation_offset_redirect_plans;
create trigger donation_offset_redirect_plans_set_updated_at
before update on public.donation_offset_redirect_plans
for each row execute function public.set_updated_at();

create or replace function public.seed_donation_offset_redirect_plans()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  initial_charity_id text;
begin
  select donation_offset_offers.compromise_charity_id
  into initial_charity_id
  from public.donation_offset_offers
  where donation_offset_offers.offer_id = new.offer_id;

  if initial_charity_id is null then
    return new;
  end if;

  insert into public.donation_offset_redirect_plans (
    match_id,
    participant_role,
    participant_profile_id,
    registered_charity_id
  )
  values (
    new.id,
    'owner',
    new.owner_profile_id,
    initial_charity_id
  )
  on conflict (match_id, participant_role) do nothing;

  if new.counterparty_profile_id is not null then
    insert into public.donation_offset_redirect_plans (
      match_id,
      participant_role,
      participant_profile_id,
      registered_charity_id
    )
    values (
      new.id,
      'counterparty',
      new.counterparty_profile_id,
      initial_charity_id
    )
    on conflict (match_id, participant_role) do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists donation_offset_matches_seed_redirect_plans
  on public.donation_offset_matches;
create trigger donation_offset_matches_seed_redirect_plans
after insert on public.donation_offset_matches
for each row execute function public.seed_donation_offset_redirect_plans();

-- Give existing direct matches a backward-compatible starting plan. Historical
-- completion is not treated as proof of a transferred settlement or shareable receipt.
insert into public.donation_offset_redirect_plans (
  match_id,
  participant_role,
  participant_profile_id,
  registered_charity_id
)
select
  donation_offset_matches.id,
  'owner',
  donation_offset_matches.owner_profile_id,
  donation_offset_offers.compromise_charity_id
from public.donation_offset_matches
join public.donation_offset_offers
  on donation_offset_offers.offer_id = donation_offset_matches.offer_id
join public.registered_charities
  on registered_charities.id = donation_offset_offers.compromise_charity_id
where registered_charities.is_active
  and registered_charities.selectable
  and not registered_charities.is_political_campaign
on conflict (match_id, participant_role) do nothing;

insert into public.donation_offset_redirect_plans (
  match_id,
  participant_role,
  participant_profile_id,
  registered_charity_id
)
select
  donation_offset_matches.id,
  'counterparty',
  donation_offset_matches.counterparty_profile_id,
  donation_offset_offers.compromise_charity_id
from public.donation_offset_matches
join public.donation_offset_offers
  on donation_offset_offers.offer_id = donation_offset_matches.offer_id
join public.registered_charities
  on registered_charities.id = donation_offset_offers.compromise_charity_id
where donation_offset_matches.counterparty_profile_id is not null
  and registered_charities.is_active
  and registered_charities.selectable
  and not registered_charities.is_political_campaign
on conflict (match_id, participant_role) do nothing;

alter table public.donation_offset_redirect_plans enable row level security;
revoke all on table public.donation_offset_redirect_plans from public, anon, authenticated;
grant all on table public.donation_offset_redirect_plans to service_role;

alter table public.conditional_settlement_batches
  add column if not exists owner_destination_id uuid
    references public.conditional_payment_destinations(id) on delete restrict,
  add column if not exists counterparty_destination_id uuid
    references public.conditional_payment_destinations(id) on delete restrict,
  add column if not exists public_receipt_token uuid not null default gen_random_uuid(),
  add column if not exists public_receipt_enabled boolean not null default false,
  add column if not exists public_receipt_enabled_at timestamptz,
  add column if not exists public_receipt_enabled_by uuid
    references public.profiles(id) on delete set null;

update public.conditional_settlement_batches
set
  owner_destination_id = coalesce(owner_destination_id, destination_id),
  counterparty_destination_id = coalesce(counterparty_destination_id, destination_id)
where purpose = 'donation_offset';

create unique index if not exists conditional_settlement_batches_receipt_token_uidx
  on public.conditional_settlement_batches (public_receipt_token);

create or replace function public.validate_public_donation_redirect_receipt()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.public_receipt_enabled
    and not old.public_receipt_enabled
    and (
      new.purpose <> 'donation_offset'
      or new.subject_type <> 'donation_offset_match'
      or not new.livemode
      or new.status <> 'transferred'
      or coalesce(new.condition_snapshot ->> 'schemaVersion', '')
        <> 'donation-offset-payment-condition-v2'
    ) then
    raise exception 'Only a transferred live v2 donation redirect can publish a receipt.';
  end if;

  if not new.public_receipt_enabled then
    new.public_receipt_enabled_at := null;
    new.public_receipt_enabled_by := null;
  elsif not old.public_receipt_enabled then
    new.public_receipt_enabled_at := timezone('utc', now());
  end if;

  return new;
end;
$$;

drop trigger if exists conditional_settlement_batches_validate_public_receipt
  on public.conditional_settlement_batches;
create trigger conditional_settlement_batches_validate_public_receipt
before update of public_receipt_enabled on public.conditional_settlement_batches
for each row execute function public.validate_public_donation_redirect_receipt();

comment on table public.donation_offset_redirect_plans is
  'Private participant-owned redirect choices. A settlement mandate freezes both plans and their versioned impact estimates.';
comment on column public.conditional_settlement_batches.public_receipt_token is
  'Opaque identifier for an opt-in public projection. The public route must expose only a privacy-reviewed whitelist from the frozen v2 snapshot.';

revoke all on function public.validate_donation_offset_redirect_plan()
  from public, anon, authenticated;
revoke all on function public.seed_donation_offset_redirect_plans()
  from public, anon, authenticated;
revoke all on function public.validate_public_donation_redirect_receipt()
  from public, anon, authenticated;
grant execute on function public.validate_donation_offset_redirect_plan() to service_role;
grant execute on function public.seed_donation_offset_redirect_plans() to service_role;
grant execute on function public.validate_public_donation_redirect_receipt() to service_role;
