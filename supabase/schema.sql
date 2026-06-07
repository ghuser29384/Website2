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

do $$
begin
  create type public.wish_entry_type as enum ('wish', 'offer', 'ask');
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create type public.match_suggestion_status as enum ('suggested', 'dismissed', 'introduced', 'archived');
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
  country text,
  public_location_granularity text not null default 'hidden' check (
    public_location_granularity in ('hidden', 'country', 'region', 'city')
  ),
  bio text not null default '',
  follower_count integer not null default 0,
  following_count integer not null default 0,
  karma integer not null default 0,
  comment_count integer not null default 0,
  rating_avg double precision,
  rating_count integer not null default 0,
  offer_count integer not null default 0,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.profiles add column if not exists follower_count integer not null default 0;
alter table public.profiles add column if not exists following_count integer not null default 0;
alter table public.profiles add column if not exists karma integer not null default 0;
alter table public.profiles add column if not exists comment_count integer not null default 0;
alter table public.profiles add column if not exists rating_avg double precision;
alter table public.profiles add column if not exists rating_count integer not null default 0;
alter table public.profiles add column if not exists offer_count integer not null default 0;
alter table public.profiles add column if not exists country text;
alter table public.profiles add column if not exists public_location_granularity text not null default 'hidden';
alter table public.profiles drop constraint if exists profiles_public_location_granularity_check;
alter table public.profiles
add constraint profiles_public_location_granularity_check
check (public_location_granularity in ('hidden', 'country', 'region', 'city'));

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
  payment_interval_value integer,
  payment_interval_unit text,
  trust_level smallint not null check (trust_level between 1 and 5),
  notes text not null default '',
  discount_note text not null default '',
  status public.offer_status not null default 'open',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.offers add column if not exists payment_interval_value integer;
alter table public.offers add column if not exists payment_interval_unit text;

create table if not exists public.registered_charities (
  id text primary key,
  name text not null,
  cause_area text not null default '',
  website_url text not null default '',
  summary text not null default '',
  is_active boolean not null default true,
  is_political_campaign boolean not null default false,
  selectable boolean not null default true,
  is_moral_public_good boolean not null default false,
  consensus_label text not null default '',
  sort_order integer not null default 100,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.registered_charities add column if not exists is_moral_public_good boolean not null default false;
alter table public.registered_charities add column if not exists consensus_label text not null default '';
alter table public.registered_charities add column if not exists sort_order integer not null default 100;

create table if not exists public.donation_offset_pools (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  description text not null default '',
  compromise_charity_id text not null references public.registered_charities (id),
  offset_ratio numeric(10,4) not null check (offset_ratio > 0),
  time_horizon text not null check (time_horizon in ('one_off', 'recurring')),
  verification_method text not null check (
    verification_method in ('proof_of_past_donations', 'receipts_uploaded', 'funds_in_escrow', 'third_party_audit')
  ),
  unmatched_surplus_rule text not null check (
    unmatched_surplus_rule in (
      'return_to_donors',
      'donate_to_compromise_destination',
      'donate_to_original_cause',
      'split_evenly'
    )
  ),
  assurance_minimum_cents integer not null default 0 check (assurance_minimum_cents >= 0),
  maximum_cap_cents integer not null default 0 check (maximum_cap_cents >= 0),
  assurance_deadline_at timestamptz,
  side_a_label text not null default 'Side A',
  side_b_label text not null default 'Side B',
  status text not null default 'open' check (status in ('open', 'assurance_pending', 'assurance_met', 'closed')),
  moderation_status text not null default 'clear' check (moderation_status in ('clear', 'flagged', 'blocked')),
  moderation_notes text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.donation_offset_pools add column if not exists maximum_cap_cents integer not null default 0;
alter table public.donation_offset_pools drop constraint if exists donation_offset_pools_maximum_cap_cents_check;
alter table public.donation_offset_pools
add constraint donation_offset_pools_maximum_cap_cents_check
check (maximum_cap_cents >= 0);

create table if not exists public.donation_offset_offers (
  offer_id uuid primary key references public.offers (id) on delete cascade,
  baseline_amount_cents integer not null check (baseline_amount_cents > 0),
  baseline_opposed_cause text not null default '',
  requested_matching_amount_cents integer not null check (requested_matching_amount_cents > 0),
  requested_opposed_cause text not null default '',
  compromise_charity_id text not null references public.registered_charities (id),
  offset_ratio numeric(10,4) not null check (offset_ratio > 0),
  time_horizon text not null check (time_horizon in ('one_off', 'recurring')),
  verification_method text not null check (
    verification_method in ('proof_of_past_donations', 'receipts_uploaded', 'funds_in_escrow', 'third_party_audit')
  ),
  unmatched_surplus_rule text not null check (
    unmatched_surplus_rule in (
      'return_to_donors',
      'donate_to_compromise_destination',
      'donate_to_original_cause',
      'split_evenly'
    )
  ),
  participation_mode text not null default 'direct' check (participation_mode in ('direct', 'pool')),
  pool_id uuid references public.donation_offset_pools (id) on delete set null,
  pool_side text check (pool_side in ('side_a', 'side_b')),
  assurance_minimum_cents integer not null default 0 check (assurance_minimum_cents >= 0),
  assurance_deadline_at timestamptz,
  offer_expires_at timestamptz,
  evidence_url text not null default '',
  moderation_status text not null default 'clear' check (moderation_status in ('clear', 'flagged', 'blocked')),
  moderation_notes text not null default '',
  moderation_reviewed_by uuid references public.profiles (id) on delete set null,
  moderation_reviewed_at timestamptz,
  baseline_bond_enabled boolean not null default false,
  baseline_bond_amount_cents integer not null default 0 check (baseline_bond_amount_cents >= 0),
  baseline_bond_currency text not null default 'USD' check (baseline_bond_currency ~ '^[A-Z]{3}$'),
  baseline_bond_forfeit_destination_id text references public.registered_charities (id) on delete restrict,
  baseline_bond_evidence_due_at timestamptz,
  baseline_bond_evidence_standard text not null default '',
  baseline_bond_evidence_url text not null default '',
  baseline_bond_status text not null default 'none' check (
    baseline_bond_status in (
      'none',
      'pending_payment',
      'posted',
      'refunded_after_match',
      'evidence_due',
      'evidence_submitted',
      'refunded_after_evidence',
      'forfeited',
      'cancelled_by_review'
    )
  ),
  baseline_bond_review_notes text not null default '',
  baseline_bond_reviewed_by uuid references public.profiles (id) on delete set null,
  baseline_bond_reviewed_at timestamptz,
  baseline_bond_appeal_window_ends_at timestamptz,
  check (
    baseline_bond_enabled = false
    or (
      baseline_bond_amount_cents > 0
      and baseline_bond_forfeit_destination_id is not null
      and baseline_bond_evidence_due_at is not null
      and offer_expires_at is not null
      and length(trim(baseline_bond_evidence_standard)) >= 20
      and baseline_bond_status <> 'none'
    )
  ),
  check (
    baseline_bond_enabled = false
    or baseline_bond_evidence_due_at > offer_expires_at
  ),
  check (
    baseline_bond_forfeit_destination_id is null
    or baseline_bond_forfeit_destination_id not in (
      'platform-operating-account',
      'moraltrade-operating-account',
      'moral-trade-operating-account'
    )
  ),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.donation_offset_offers add column if not exists participation_mode text not null default 'direct';
alter table public.donation_offset_offers drop constraint if exists donation_offset_offers_participation_mode_check;
alter table public.donation_offset_offers
add constraint donation_offset_offers_participation_mode_check
check (participation_mode in ('direct', 'pool'));

alter table public.donation_offset_offers add column if not exists pool_id uuid references public.donation_offset_pools (id) on delete set null;
alter table public.donation_offset_offers add column if not exists pool_side text;
alter table public.donation_offset_offers drop constraint if exists donation_offset_offers_pool_side_check;
alter table public.donation_offset_offers
add constraint donation_offset_offers_pool_side_check
check (pool_side is null or pool_side in ('side_a', 'side_b'));

alter table public.donation_offset_offers add column if not exists assurance_minimum_cents integer not null default 0;
alter table public.donation_offset_offers drop constraint if exists donation_offset_offers_assurance_minimum_cents_check;
alter table public.donation_offset_offers
add constraint donation_offset_offers_assurance_minimum_cents_check
check (assurance_minimum_cents >= 0);

alter table public.donation_offset_offers add column if not exists assurance_deadline_at timestamptz;
alter table public.donation_offset_offers add column if not exists offer_expires_at timestamptz;
alter table public.donation_offset_offers add column if not exists moderation_reviewed_by uuid references public.profiles (id) on delete set null;
alter table public.donation_offset_offers add column if not exists moderation_reviewed_at timestamptz;
alter table public.donation_offset_offers add column if not exists baseline_bond_enabled boolean not null default false;
alter table public.donation_offset_offers add column if not exists baseline_bond_amount_cents integer not null default 0;
alter table public.donation_offset_offers drop constraint if exists donation_offset_offers_baseline_bond_amount_cents_check;
alter table public.donation_offset_offers drop constraint if exists donation_offset_offers_baseline_bond_amount_check;
alter table public.donation_offset_offers
add constraint donation_offset_offers_baseline_bond_amount_check
check (baseline_bond_amount_cents >= 0);
alter table public.donation_offset_offers add column if not exists baseline_bond_currency text not null default 'USD';
alter table public.donation_offset_offers drop constraint if exists donation_offset_offers_baseline_bond_currency_check;
alter table public.donation_offset_offers
add constraint donation_offset_offers_baseline_bond_currency_check
check (baseline_bond_currency ~ '^[A-Z]{3}$');
alter table public.donation_offset_offers add column if not exists baseline_bond_forfeit_destination_id text references public.registered_charities (id) on delete restrict;
alter table public.donation_offset_offers add column if not exists baseline_bond_evidence_due_at timestamptz;
alter table public.donation_offset_offers add column if not exists baseline_bond_evidence_standard text not null default '';
alter table public.donation_offset_offers add column if not exists baseline_bond_evidence_url text not null default '';
alter table public.donation_offset_offers add column if not exists baseline_bond_status text not null default 'none';
alter table public.donation_offset_offers drop constraint if exists donation_offset_offers_baseline_bond_status_check;
alter table public.donation_offset_offers
add constraint donation_offset_offers_baseline_bond_status_check
check (
  baseline_bond_status in (
    'none',
    'pending_payment',
    'posted',
    'refunded_after_match',
    'evidence_due',
    'evidence_submitted',
    'refunded_after_evidence',
    'forfeited',
    'cancelled_by_review'
  )
);
alter table public.donation_offset_offers add column if not exists baseline_bond_review_notes text not null default '';
alter table public.donation_offset_offers add column if not exists baseline_bond_reviewed_by uuid references public.profiles (id) on delete set null;
alter table public.donation_offset_offers add column if not exists baseline_bond_reviewed_at timestamptz;
alter table public.donation_offset_offers add column if not exists baseline_bond_appeal_window_ends_at timestamptz;
alter table public.donation_offset_offers drop constraint if exists donation_offset_offers_baseline_bond_enabled_fields_check;
alter table public.donation_offset_offers
add constraint donation_offset_offers_baseline_bond_enabled_fields_check
check (
  baseline_bond_enabled = false
  or (
    baseline_bond_amount_cents > 0
    and baseline_bond_forfeit_destination_id is not null
    and baseline_bond_evidence_due_at is not null
    and offer_expires_at is not null
    and length(trim(baseline_bond_evidence_standard)) >= 20
    and baseline_bond_status <> 'none'
  )
);
alter table public.donation_offset_offers drop constraint if exists donation_offset_offers_baseline_bond_timing_check;
alter table public.donation_offset_offers
add constraint donation_offset_offers_baseline_bond_timing_check
check (
  baseline_bond_enabled = false
  or baseline_bond_evidence_due_at > offer_expires_at
);
alter table public.donation_offset_offers drop constraint if exists donation_offset_offers_baseline_bond_forfeit_destination_check;
alter table public.donation_offset_offers
add constraint donation_offset_offers_baseline_bond_forfeit_destination_check
check (
  baseline_bond_forfeit_destination_id is null
  or baseline_bond_forfeit_destination_id not in (
    'platform-operating-account',
    'moraltrade-operating-account',
    'moral-trade-operating-account'
  )
);
alter table public.donation_offset_offers drop constraint if exists donation_offset_offers_verification_method_check;
alter table public.donation_offset_offers
add constraint donation_offset_offers_verification_method_check
check (
  verification_method in ('proof_of_past_donations', 'receipts_uploaded', 'funds_in_escrow', 'third_party_audit')
);
alter table public.donation_offset_offers drop constraint if exists donation_offset_offers_unmatched_surplus_rule_check;
alter table public.donation_offset_offers
add constraint donation_offset_offers_unmatched_surplus_rule_check
check (
  unmatched_surplus_rule in (
    'return_to_donors',
    'donate_to_compromise_destination',
    'donate_to_original_cause',
    'split_evenly'
  )
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'offers_payment_interval_value_check'
  ) then
    alter table public.offers
      add constraint offers_payment_interval_value_check
      check (payment_interval_value is null or payment_interval_value > 0);
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'offers_payment_interval_unit_check'
  ) then
    alter table public.offers
      add constraint offers_payment_interval_unit_check
      check (
        payment_interval_unit is null
        or payment_interval_unit in ('day', 'month', 'year')
      );
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'offers_payment_interval_pair_check'
  ) then
    alter table public.offers
      add constraint offers_payment_interval_pair_check
      check (
        (payment_interval_value is null and payment_interval_unit is null)
        or (payment_interval_value is not null and payment_interval_unit is not null)
      );
  end if;
end
$$;

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

create table if not exists public.guest_interests (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references public.offers (id) on delete cascade,
  contact_email text not null,
  display_name text not null default '',
  city text,
  region text,
  message text not null default '',
  status public.interest_status not null default 'pending',
  claimed_by_profile_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (offer_id, contact_email)
);
comment on table public.guest_interests is
  'Legacy signed-out offer responses kept for owner continuity and account-claim linkage. New public contact writes are disabled; signed-in responses use public.interests.';

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

create table if not exists public.agreements (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid references public.offers (id) on delete cascade,
  interest_id uuid unique references public.interests (id) on delete cascade,
  match_id uuid,
  introduction_plan_id uuid,
  source text not null default 'offer',
  proposer_id uuid not null references public.profiles (id) on delete cascade,
  responder_id uuid not null references public.profiles (id) on delete cascade,
  status public.agreement_status not null default 'active',
  notes text not null default '',
  structured_terms text not null default '',
  no_trade_baseline text not null default '',
  counterfactual_declaration text not null default '',
  duration_terms text not null default '',
  exit_conditions text not null default '',
  evidence_rule text not null default '',
  privacy_scope text not null default '',
  disclosure_scope text not null default '',
  completion_state text not null default 'pending_evidence',
  challenge_window_ends_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (source in ('offer', 'introduction', 'manual')),
  check (completion_state in ('pending_evidence', 'under_review', 'challenge_window_open', 'reviewed_complete', 'disputed_unresolved'))
);

alter table public.agreements alter column offer_id drop not null;
alter table public.agreements add column if not exists match_id uuid;
alter table public.agreements add column if not exists introduction_plan_id uuid;
alter table public.agreements add column if not exists source text not null default 'offer';
alter table public.agreements add column if not exists structured_terms text not null default '';
alter table public.agreements add column if not exists no_trade_baseline text not null default '';
alter table public.agreements add column if not exists counterfactual_declaration text not null default '';
alter table public.agreements add column if not exists duration_terms text not null default '';
alter table public.agreements add column if not exists exit_conditions text not null default '';
alter table public.agreements add column if not exists evidence_rule text not null default '';
alter table public.agreements add column if not exists privacy_scope text not null default '';
alter table public.agreements add column if not exists disclosure_scope text not null default '';
alter table public.agreements add column if not exists completion_state text not null default 'pending_evidence';
alter table public.agreements add column if not exists challenge_window_ends_at timestamptz;
alter table public.agreements drop constraint if exists agreements_source_check;
alter table public.agreements
add constraint agreements_source_check check (source in ('offer', 'introduction', 'manual'));
alter table public.agreements drop constraint if exists agreements_completion_state_check;
alter table public.agreements
add constraint agreements_completion_state_check check (
  completion_state in ('pending_evidence', 'under_review', 'challenge_window_open', 'reviewed_complete', 'disputed_unresolved')
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

create table if not exists public.profile_payment_accounts (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  stripe_account_id text not null unique,
  charges_enabled boolean not null default false,
  payouts_enabled boolean not null default false,
  details_submitted boolean not null default false,
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.agreement_payments (
  id uuid primary key default gen_random_uuid(),
  agreement_id uuid not null references public.agreements (id) on delete cascade,
  payer_id uuid not null references public.profiles (id) on delete cascade,
  payee_id uuid not null references public.profiles (id) on delete cascade,
  amount_cents integer not null check (amount_cents > 0),
  currency text not null default 'usd' check (currency ~ '^[a-z]{3}$'),
  cadence_interval_value integer not null default 1 check (cadence_interval_value > 0),
  cadence_interval_unit text not null default 'one_time' check (
    cadence_interval_unit in ('one_time', 'day', 'month', 'year', 'custom_days')
  ),
  platform_fee_cents integer not null default 0 check (platform_fee_cents >= 0),
  status text not null default 'draft' check (
    status in (
      'draft',
      'checkout_created',
      'paid',
      'failed',
      'refund_requested',
      'refunded',
      'disputed',
      'cancelled'
    )
  ),
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id text,
  stripe_charge_id text,
  receipt_url text,
  notes text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  paid_at timestamptz,
  check (payer_id <> payee_id),
  check (platform_fee_cents <= amount_cents)
);

alter table public.agreement_payments drop constraint if exists agreement_payments_status_check;
alter table public.agreement_payments
add constraint agreement_payments_status_check check (
  status in (
    'draft',
    'checkout_created',
    'paid',
    'failed',
    'refund_requested',
    'refunded',
    'disputed',
    'cancelled'
  )
);

create table if not exists public.agreement_payment_schedules (
  id uuid primary key default gen_random_uuid(),
  agreement_id uuid not null references public.agreements (id) on delete cascade,
  payer_id uuid not null references public.profiles (id) on delete cascade,
  payee_id uuid not null references public.profiles (id) on delete cascade,
  amount_cents integer not null check (amount_cents > 0),
  currency text not null default 'usd' check (currency ~ '^[a-z]{3}$'),
  cadence_interval_value integer not null default 1 check (cadence_interval_value > 0),
  cadence_interval_unit text not null check (
    cadence_interval_unit in ('day', 'month', 'year', 'custom_days')
  ),
  next_due_at timestamptz not null,
  status text not null default 'active' check (status in ('active', 'paused', 'cancelled')),
  last_reminded_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (payer_id <> payee_id)
);

create table if not exists public.agreement_events (
  id uuid primary key default gen_random_uuid(),
  agreement_id uuid not null references public.agreements (id) on delete cascade,
  actor_id uuid not null references public.profiles (id) on delete cascade,
  event_type text not null default 'note' check (
    event_type in (
      'note',
      'counterproposal',
      'verification_submitted',
      'cancellation_requested',
      'dispute_opened',
      'status_change',
      'payment_update',
      'terms_updated',
      'evidence_submitted',
      'review_status_changed',
      'challenge_opened',
      'appeal_requested',
      'verification_badge_updated'
    )
  ),
  summary text not null,
  details text not null default '',
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.agreement_events drop constraint if exists agreement_events_event_type_check;
alter table public.agreement_events
add constraint agreement_events_event_type_check check (
  event_type in (
    'note',
    'counterproposal',
    'verification_submitted',
    'cancellation_requested',
    'dispute_opened',
    'status_change',
    'payment_update',
    'terms_updated',
    'evidence_submitted',
    'review_status_changed',
    'challenge_opened',
    'appeal_requested',
    'verification_badge_updated'
  )
);

create table if not exists public.agreement_evidence_items (
  id uuid primary key default gen_random_uuid(),
  agreement_id uuid not null references public.agreements (id) on delete cascade,
  uploader_id uuid not null references public.profiles (id) on delete cascade,
  trade_type text not null default 'pledge_swap' check (trade_type in ('pledge_swap', 'donation_offset', 'mpgf', 'paid_action', 'other')),
  evidence_type text not null default 'manual_attestation' check (evidence_type in ('receipt', 'provider_record', 'manual_attestation', 'public_log', 'timestamped_commitment', 'third_party_review', 'other')),
  schema_key text not null default 'pledge_swap_v1',
  title text not null,
  evidence_url text not null default '',
  evidence_summary text not null default '',
  status text not null default 'under_review' check (status in ('pending_evidence', 'under_review', 'challenge_window_open', 'reviewed_complete', 'disputed_unresolved')),
  reviewer_confidence smallint check (reviewer_confidence between 0 and 100),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.agreement_review_cases (
  id uuid primary key default gen_random_uuid(),
  agreement_id uuid not null references public.agreements (id) on delete cascade,
  evidence_item_id uuid references public.agreement_evidence_items (id) on delete set null,
  opened_by uuid not null references public.profiles (id) on delete cascade,
  assigned_reviewer_id uuid references public.profiles (id) on delete set null,
  reviewer_role text not null default 'operator' check (reviewer_role in ('operator', 'validator', 'external_reviewer', 'admin')),
  review_scope text not null default '',
  status text not null default 'open' check (status in ('open', 'under_review', 'challenge_window_open', 'reviewed_complete', 'disputed_unresolved', 'appealed', 'closed')),
  conflict_of_interest_notes text not null default '',
  reviewer_notes text not null default '',
  public_reasoning_summary text not null default '',
  sla_due_at timestamptz not null default (timezone('utc', now()) + interval '72 hours'),
  challenge_window_ends_at timestamptz,
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  appeal_requested_by uuid references public.profiles (id) on delete set null,
  appeal_reason text not null default '',
  appealed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.profile_verification_badges (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  badge_type text not null check (badge_type in ('identity_verified', 'organization_verified', 'payment_evidence_verified', 'completion_reviewed', 'repeat_counterparty')),
  status text not null default 'pending' check (status in ('pending', 'verified', 'rejected', 'revoked')),
  evidence_summary text not null default '',
  source text not null default 'operator_review',
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (profile_id, badge_type)
);

create table if not exists public.moral_trade_provenance_agents (
  id uuid primary key default gen_random_uuid(),
  owner_profile_id uuid not null references public.profiles (id) on delete cascade,
  agent_key text not null,
  kind text not null check (kind in ('participant', 'counterparty', 'operator', 'external_reviewer', 'payment_or_evidence_provider')),
  label text not null default '',
  redaction_level text not null default 'participant_private' check (redaction_level in ('public', 'participant_private', 'reviewer_only')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  unique (owner_profile_id, agent_key)
);
comment on table public.moral_trade_provenance_agents is
  'Append-only W3C PROV-style agents for Moral Trade evidence bundles; public reads require redaction_level=public.';

create table if not exists public.moral_trade_evidence_artifacts (
  id uuid primary key default gen_random_uuid(),
  owner_profile_id uuid not null references public.profiles (id) on delete cascade,
  agreement_id uuid references public.agreements (id) on delete cascade,
  offer_id uuid references public.offers (id) on delete set null,
  subject_kind text not null default 'proposal_record' check (subject_kind in ('proposal_record', 'agreement', 'offer', 'match_signal', 'traceability_event')),
  subject_id text not null,
  kind text not null check (kind in ('receipt', 'public_log', 'attestation', 'payment_event', 'prior_intent')),
  normalized_locator text not null default '',
  media_type text not null default 'text/plain',
  claim_scopes text[] not null default '{}',
  submitted_at timestamptz not null default timezone('utc', now()),
  submitted_by_agent_id uuid references public.moral_trade_provenance_agents (id) on delete restrict,
  redaction_level text not null default 'participant_private' check (redaction_level in ('public', 'participant_private', 'reviewer_only')),
  sha256 text not null check (sha256 ~ '^[a-f0-9]{64}$'),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  check (claim_scopes <@ array['factual_action', 'counterfactual_baseline', 'externality_review', 'payment_or_donation_record', 'identity_or_authority']::text[])
);
comment on table public.moral_trade_evidence_artifacts is
  'Provenance-first evidence artifact entities. Raw artifacts stay private unless explicitly redacted for public display.';

create table if not exists public.moral_trade_evidence_claims (
  id uuid primary key default gen_random_uuid(),
  owner_profile_id uuid not null references public.profiles (id) on delete cascade,
  agreement_id uuid references public.agreements (id) on delete cascade,
  offer_id uuid references public.offers (id) on delete set null,
  subject_kind text not null default 'proposal_record' check (subject_kind in ('proposal_record', 'agreement', 'offer', 'match_signal')),
  subject_id text not null,
  claim_type text not null check (claim_type in ('receipt', 'public_log', 'attestation', 'payment_event', 'prior_intent')),
  claim_scope text not null check (claim_scope in ('factual_action', 'counterfactual_baseline', 'externality_review', 'payment_or_donation_record', 'identity_or_authority')),
  reviewer_confidence text not null default 'low' check (reviewer_confidence in ('low', 'medium', 'high')),
  uniqueness_checked boolean not null default false,
  reuse_justification text not null default '',
  redaction_level text not null default 'participant_private' check (redaction_level in ('public', 'participant_private', 'reviewer_only')),
  created_at timestamptz not null default timezone('utc', now())
);
comment on table public.moral_trade_evidence_claims is
  'One reviewed claim per scoped evidence question; artifact links live in moral_trade_evidence_claim_artifacts.';

create table if not exists public.moral_trade_evidence_claim_artifacts (
  claim_id uuid not null references public.moral_trade_evidence_claims (id) on delete cascade,
  artifact_id uuid not null references public.moral_trade_evidence_artifacts (id) on delete cascade,
  owner_profile_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (claim_id, artifact_id)
);

create table if not exists public.moral_trade_external_entity_references (
  id uuid primary key default gen_random_uuid(),
  owner_profile_id uuid not null references public.profiles (id) on delete cascade,
  entity_type text not null check (entity_type in ('charity', 'payment_provider', 'supplier', 'public_registry', 'platform')),
  label text not null default '',
  identifier_system text not null check (identifier_system in ('domain', 'ein', 'every_org_slug', 'gs1_gln', 'open_supply_hub_id', 'platform_internal_id', 'unknown_review_required')),
  normalized_identifier text not null,
  dedupe_key text not null,
  verification_status text not null default 'unverified' check (verification_status in ('unverified', 'reviewer_confirmed', 'external_registry_matched')),
  normalized_source_locator text,
  redaction_level text not null default 'participant_private' check (redaction_level in ('public', 'participant_private', 'reviewer_only')),
  sha256 text not null check (sha256 ~ '^[a-f0-9]{64}$'),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  unique (owner_profile_id, dedupe_key)
);
comment on table public.moral_trade_external_entity_references is
  'Stable external charity, provider, registry, or supplier-style references for traceability events.';

create table if not exists public.moral_trade_review_decisions (
  id uuid primary key default gen_random_uuid(),
  owner_profile_id uuid not null references public.profiles (id) on delete cascade,
  agreement_id uuid references public.agreements (id) on delete cascade,
  offer_id uuid references public.offers (id) on delete set null,
  subject_kind text not null default 'proposal_record' check (subject_kind in ('proposal_record', 'agreement', 'offer', 'evidence_claim')),
  subject_id text not null,
  outcome text not null check (outcome in ('pass', 'needs_more', 'challenge', 'block')),
  reason_codes text[] not null default '{}',
  summary text not null default '',
  reviewer_agent_id uuid references public.moral_trade_provenance_agents (id) on delete restrict,
  idempotency_key text not null,
  decision_hash text not null check (decision_hash ~ '^[a-f0-9]{64}$'),
  redaction_level text not null default 'participant_private' check (redaction_level in ('public', 'participant_private', 'reviewer_only')),
  created_at timestamptz not null default timezone('utc', now()),
  unique (owner_profile_id, idempotency_key),
  unique (decision_hash)
);

create table if not exists public.moral_trade_provenance_activities (
  id uuid primary key default gen_random_uuid(),
  owner_profile_id uuid not null references public.profiles (id) on delete cascade,
  subject_kind text not null default 'proposal_record' check (subject_kind in ('proposal_record', 'agreement', 'offer', 'evidence_claim', 'traceability_event')),
  subject_id text not null,
  kind text not null check (kind in ('draft_created', 'draft_updated', 'evidence_submitted', 'traceability_event_recorded', 'risk_screened', 'challenge_window_opened', 'review_completed')),
  activity_at timestamptz not null default timezone('utc', now()),
  used_entity_ids text[] not null default '{}',
  generated_entity_ids text[] not null default '{}',
  agent_ids uuid[] not null default '{}',
  idempotency_key text not null,
  previous_activity_hash text check (previous_activity_hash is null or previous_activity_hash ~ '^[a-f0-9]{64}$'),
  activity_hash text not null check (activity_hash ~ '^[a-f0-9]{64}$'),
  redaction_level text not null default 'participant_private' check (redaction_level in ('public', 'participant_private', 'reviewer_only')),
  created_at timestamptz not null default timezone('utc', now()),
  unique (owner_profile_id, idempotency_key),
  unique (activity_hash)
);
comment on table public.moral_trade_provenance_activities is
  'Append-only activity records linking evidence entities to agents and state changes.';

create table if not exists public.moral_trade_traceability_events (
  id uuid primary key default gen_random_uuid(),
  owner_profile_id uuid not null references public.profiles (id) on delete cascade,
  subject_kind text not null default 'proposal_record' check (subject_kind in ('proposal_record', 'agreement', 'offer', 'evidence_claim')),
  subject_id text not null,
  event_time timestamptz not null,
  recorded_at timestamptz not null default timezone('utc', now()),
  action text not null check (action in ('ADD', 'OBSERVE', 'DELETE')),
  business_step text not null check (business_step in ('proposal_submitted', 'evidence_uploaded', 'donation_initiated', 'payment_recorded', 'receipt_verified', 'review_decision_recorded', 'challenge_opened', 'completion_reviewed')),
  disposition text not null check (disposition in ('draft', 'in_review', 'verified', 'disputed', 'blocked', 'completed')),
  what jsonb not null default '{}'::jsonb,
  where_recorded jsonb not null default '{}'::jsonb,
  why jsonb not null default '{}'::jsonb,
  agent_ids uuid[] not null default '{}',
  audit_question_answers jsonb not null default '{"whatHappened":"","whoTouchedIt":[],"whenRecorded":""}'::jsonb,
  external_entity_reference_id uuid references public.moral_trade_external_entity_references (id) on delete set null,
  redaction_level text not null default 'participant_private' check (redaction_level in ('public', 'participant_private', 'reviewer_only')),
  sha256 text not null check (sha256 ~ '^[a-f0-9]{64}$'),
  created_at timestamptz not null default timezone('utc', now()),
  unique (sha256)
);
comment on table public.moral_trade_traceability_events is
  'EPCIS-oriented what/where/why event records for payment, charity routing, or external evidence traceability.';

create table if not exists public.moral_trade_state_transition_events (
  id uuid primary key default gen_random_uuid(),
  owner_profile_id uuid not null references public.profiles (id) on delete cascade,
  subject_kind text not null default 'proposal_record' check (subject_kind in ('proposal_record', 'agreement', 'offer')),
  subject_id text not null,
  from_status text not null,
  to_status text not null,
  provenance_activity text not null,
  recorded_at timestamptz not null default timezone('utc', now()),
  actor_agent_id uuid references public.moral_trade_provenance_agents (id) on delete restrict,
  actor_agent_kind text not null check (actor_agent_kind in ('participant', 'counterparty', 'operator', 'external_reviewer', 'payment_or_evidence_provider')),
  used_entity_ids text[] not null default '{}',
  generated_entity_ids text[] not null default '{}',
  idempotency_key text not null,
  audit_question_answers jsonb not null default '{"whatHappened":"","whoTouchedIt":[],"whenRecorded":""}'::jsonb,
  previous_event_hash text check (previous_event_hash is null or previous_event_hash ~ '^[a-f0-9]{64}$'),
  event_hash text not null check (event_hash ~ '^[a-f0-9]{64}$'),
  redaction_level text not null default 'participant_private' check (redaction_level in ('public', 'participant_private', 'reviewer_only')),
  created_at timestamptz not null default timezone('utc', now()),
  unique (owner_profile_id, idempotency_key),
  unique (event_hash)
);
comment on table public.moral_trade_state_transition_events is
  'Immutable state transition event records used before matchable or reviewed-completion reliance states.';

create table if not exists public.email_outbox (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles (id) on delete set null,
  recipient_email text not null,
  subject text not null,
  body text not null,
  status text not null default 'queued' check (status in ('queued', 'sent', 'failed', 'suppressed')),
  provider text not null default 'manual',
  attempt_count integer not null default 0 check (attempt_count >= 0),
  last_error text not null default '',
  source_kind text,
  source_id text,
  created_at timestamptz not null default timezone('utc', now()),
  sent_at timestamptz
);

alter table public.email_outbox add column if not exists attempt_count integer not null default 0;
alter table public.email_outbox add column if not exists last_error text not null default '';
alter table public.email_outbox add column if not exists source_kind text;
alter table public.email_outbox add column if not exists source_id text;

create table if not exists public.saved_searches (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  label text not null,
  causes text[] not null default '{}',
  query text not null default '',
  min_score smallint not null default 50 check (min_score between 0 and 100),
  cadence text not null default 'weekly' check (cadence in ('manual', 'daily', 'weekly', 'monthly')),
  status text not null default 'active' check (status in ('active', 'paused')),
  last_scanned_at timestamptz,
  filters_json jsonb not null default '{}'::jsonb,
  notify_on_live_match boolean not null default true,
  source_route text not null default '/dashboard',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.saved_searches add column if not exists last_scanned_at timestamptz;
alter table public.saved_searches add column if not exists filters_json jsonb not null default '{}'::jsonb;
alter table public.saved_searches add column if not exists notify_on_live_match boolean not null default true;
alter table public.saved_searches add column if not exists source_route text not null default '/dashboard';

-- Social and marketplace extensions used by the current app code.
-- Exact table names matter here:
-- - follows => public.user_follows
-- - recommendations => public.offer_recommendations
-- - comments => public.offer_comments
-- - ratings => public.agreement_ratings
-- - carts => public.offer_carts
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

create table if not exists public.wish_profiles (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  participant_kind text not null default 'individual' check (participant_kind in ('individual', 'collective', 'institution')),
  collective_name text not null default '',
  causes text[] not null default '{}',
  location_city text,
  location_region text,
  capabilities text not null default '',
  constraints text not null default '',
  verification_preferences text not null default '',
  uncertainty_notes text not null default '',
  openness_to_payment boolean not null default false,
  openness_to_pledges boolean not null default true,
  background_search_enabled boolean not null default true,
  manual_source_review_enabled boolean not null default false,
  notification_email_enabled boolean not null default false,
  notification_dashboard_enabled boolean not null default true,
  privacy_stage text not null default 'broad' check (privacy_stage in ('strict', 'broad', 'limited')),
  brokerage_preference text not null default '',
  match_frequency text not null default 'weekly' check (match_frequency in ('manual', 'weekly', 'monthly')),
  inbound_delegate_discovery text not null default 'off' check (inbound_delegate_discovery in ('off', 'cohort_only', 'partner_matchmaker', 'public_broad_preview')),
  inbound_delegate_purpose_codes text[] not null default '{}' check (inbound_delegate_purpose_codes <@ array['moral_trade_offer', 'donation_offset', 'pledge_swap', 'moral_public_good', 'research_collaboration', 'community_intro']::text[]),
  inbound_delegate_purpose_bindings jsonb not null default '{}'::jsonb,
  inbound_delegate_surfaces text[] not null default '{}' check (inbound_delegate_surfaces <@ array['broad_profile']::text[]),
  inbound_delegate_surface_budget_per_window jsonb not null default '{}'::jsonb,
  inbound_delegate_pending_intro_limit integer check (inbound_delegate_pending_intro_limit is null or inbound_delegate_pending_intro_limit between 0 and 50),
  inbound_delegate_cooloff_until timestamptz,
  candidate_inbound_budget_version text not null default 'candidate-budget-v1',
  candidate_exposure_version text not null default 'candidate-exposure-v1',
  allowed_cohort_ids text[] not null default '{}',
  is_discoverable boolean not null default true,
  share_public_preview boolean not null default true,
  share_location boolean not null default false,
  public_preview text not null default '',
  safety_status text not null default 'clear' check (safety_status in ('clear', 'flagged', 'blocked')),
  safety_notes text not null default '',
  sensitive_ciphertexts jsonb not null default '{}'::jsonb,
  sensitive_encryption_version text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.wish_entries (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  entry_type public.wish_entry_type not null,
  cause_area text not null default '',
  title text not null default '',
  body text not null,
  body_ciphertext text not null default '',
  body_encryption_version text not null default '',
  trade_mode text not null default 'open',
  visibility text not null default 'private' check (visibility in ('private', 'preview')),
  safety_status text not null default 'clear' check (safety_status in ('clear', 'flagged', 'blocked')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.match_suggestions (
  id uuid primary key default gen_random_uuid(),
  profile_a_id uuid not null references public.profiles (id) on delete cascade,
  profile_b_id uuid not null references public.profiles (id) on delete cascade,
  profile_a_entry_id uuid references public.wish_entries (id) on delete set null,
  profile_b_entry_id uuid references public.wish_entries (id) on delete set null,
  reason_for_a text not null,
  reason_for_b text not null,
  score smallint not null default 50 check (score between 0 and 100),
  match_basis text[] not null default '{}',
  shared_causes text[] not null default '{}',
  suggested_first_step text not null default '',
  risk_notes text not null default '',
  generated_by text not null default 'rule-based',
  background_owner_profile_id uuid references public.profiles (id) on delete set null,
  status public.match_suggestion_status not null default 'suggested',
  dedupe_key text not null default gen_random_uuid()::text,
  identity_revealed boolean not null default false,
  last_scored_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (profile_a_id <> profile_b_id),
  unique (dedupe_key),
  unique (profile_a_id, profile_b_id, profile_a_entry_id, profile_b_entry_id)
);

alter table public.match_suggestions add column if not exists dedupe_key text not null default gen_random_uuid()::text;
alter table public.wish_profiles add column if not exists participant_kind text not null default 'individual';
alter table public.wish_profiles add column if not exists collective_name text not null default '';
alter table public.wish_profiles add column if not exists capabilities text not null default '';
alter table public.wish_profiles add column if not exists uncertainty_notes text not null default '';
alter table public.wish_profiles add column if not exists background_search_enabled boolean not null default true;
alter table public.wish_profiles add column if not exists manual_source_review_enabled boolean not null default false;
alter table public.wish_profiles add column if not exists notification_email_enabled boolean not null default false;
alter table public.wish_profiles add column if not exists notification_dashboard_enabled boolean not null default true;
alter table public.wish_profiles add column if not exists privacy_stage text not null default 'broad';
alter table public.wish_profiles add column if not exists brokerage_preference text not null default '';
alter table public.wish_profiles add column if not exists match_frequency text not null default 'weekly';
alter table public.wish_profiles add column if not exists sensitive_ciphertexts jsonb not null default '{}'::jsonb;
alter table public.wish_profiles add column if not exists sensitive_encryption_version text not null default '';
alter table public.wish_entries add column if not exists body_ciphertext text not null default '';
alter table public.wish_entries add column if not exists body_encryption_version text not null default '';
alter table public.match_suggestions add column if not exists match_basis text[] not null default '{}';
alter table public.match_suggestions add column if not exists shared_causes text[] not null default '{}';
alter table public.match_suggestions add column if not exists suggested_first_step text not null default '';
alter table public.match_suggestions add column if not exists risk_notes text not null default '';
alter table public.match_suggestions add column if not exists generated_by text not null default 'rule-based';
alter table public.match_suggestions add column if not exists background_owner_profile_id uuid references public.profiles (id) on delete set null;
alter table public.match_suggestions add column if not exists last_scored_at timestamptz not null default timezone('utc', now());

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'match_suggestions_dedupe_key_key'
  ) then
    alter table public.match_suggestions
      add constraint match_suggestions_dedupe_key_key
      unique (dedupe_key);
  end if;
end
$$;

create table if not exists public.match_consents (
  match_id uuid not null references public.match_suggestions (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  note text not null default '',
  consented_at timestamptz not null default timezone('utc', now()),
  primary key (match_id, profile_id)
);

create table if not exists public.wish_notifications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  match_id uuid references public.match_suggestions (id) on delete cascade,
  kind text not null default 'match' check (kind in ('match', 'consent', 'safety', 'system')),
  title text not null,
  body text not null default '',
  read_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.profile_sources (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  source_type text not null default 'manual' check (source_type in ('manual', 'social', 'blog', 'chat_history', 'email', 'calendar', 'other')),
  label text not null,
  url text not null default '',
  access_level text not null default 'manual_summary' check (access_level in ('none', 'manual_summary', 'metadata_only')),
  content_kind text not null default 'manual_summary' check (content_kind in ('manual_summary', 'pasted_excerpt', 'public_post', 'email_note', 'chat_note', 'calendar_note')),
  notes text not null default '',
  snapshot_excerpt text not null default '',
  captured_tags text[] not null default '{}',
  needs_review boolean not null default true,
  imported_at timestamptz,
  retention_expires_at timestamptz not null default (timezone('utc', now()) + interval '90 days'),
  is_active boolean not null default true,
  sensitive_ciphertexts jsonb not null default '{}'::jsonb,
  sensitive_encryption_version text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.clarification_questions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  question text not null,
  reason text not null default '',
  status text not null default 'open' check (status in ('open', 'answered', 'dismissed')),
  answer text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  answered_at timestamptz
);

create table if not exists public.background_match_runs (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'completed' check (status in ('queued', 'running', 'completed', 'failed')),
  run_reason text not null default 'manual',
  candidates_scanned integer not null default 0,
  matches_created integer not null default 0,
  matches_refreshed integer not null default 0,
  error_message text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  completed_at timestamptz
);

create table if not exists public.match_explanation_snapshots (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.match_suggestions (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  explanation_version text not null default 'background-explanation-v1',
  workflow_stage text not null check (workflow_stage in ('suggested', 'detail_requested', 'grant_pending', 'intro_review', 'intro_ready', 'introduced', 'archived', 'reported')),
  confidence_band text not null check (confidence_band in ('High', 'Moderate', 'Tentative', 'Exploratory')),
  score_bucket text not null check (score_bucket in ('0-24', '25-44', '45-59', '60-74', '75-100')),
  factor_codes text[] not null default '{}',
  scanned_surfaces text[] not null default '{}',
  redacted_surfaces text[] not null default '{}',
  provenance text not null default '',
  summary text not null default '',
  privacy_note text not null default '',
  source_run_kind text not null default 'unknown',
  source_run_id text not null default '',
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.match_audit_events (
  id uuid primary key default gen_random_uuid(),
  match_id uuid references public.match_suggestions (id) on delete cascade,
  actor_profile_id uuid references public.profiles (id) on delete set null,
  event_type text not null,
  summary text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.match_reports (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.match_suggestions (id) on delete cascade,
  reporter_profile_id uuid not null references public.profiles (id) on delete cascade,
  reason text not null default 'other' check (reason in ('unsafe', 'spam', 'privacy', 'coercion', 'illegal', 'other')),
  details text not null default '',
  status text not null default 'open' check (status in ('open', 'reviewed', 'dismissed')),
  created_at timestamptz not null default timezone('utc', now()),
  reviewed_at timestamptz
);

create table if not exists public.match_concierge_requests (
  id uuid primary key default gen_random_uuid(),
  requester_profile_id uuid not null references public.profiles (id) on delete cascade,
  target_profile_id uuid references public.profiles (id) on delete set null,
  match_id uuid references public.match_suggestions (id) on delete set null,
  route text not null default 'private_match' check (route in ('private_match', 'pledge_swap', 'donation_offset', 'mpgf', 'other')),
  cause_areas text[] not null default '{}',
  target_preview text not null default '',
  intent_summary text not null default '',
  offer_summary text not null default '',
  ask_summary text not null default '',
  constraints text not null default '',
  no_trade_baseline text not null default '',
  desired_timeline text not null default '',
  risk_notes text not null default '',
  status text not null default 'open' check (status in ('open', 'triaged', 'waiting_on_requester', 'waiting_on_counterparty', 'introduced', 'declined', 'closed')),
  operator_notes text not null default '',
  sla_due_at timestamptz not null default (timezone('utc', now()) + interval '24 hours'),
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  appeal_status text not null default 'none' check (appeal_status in ('none', 'requested', 'under_review', 'resolved', 'dismissed')),
  appeal_reason text not null default '',
  appealed_at timestamptz,
  appeal_resolved_at timestamptz,
  appeal_resolved_by uuid references public.profiles (id) on delete set null,
  appeal_resolution_note text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (target_profile_id is null or requester_profile_id <> target_profile_id)
);

create table if not exists public.match_concierge_events (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.match_concierge_requests (id) on delete cascade,
  actor_profile_id uuid references public.profiles (id) on delete set null,
  event_type text not null,
  summary text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.network_invites (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  target_kind text not null default 'person' check (target_kind in ('person', 'collective', 'institution', 'community', 'public_call')),
  target_label text not null,
  target_url text not null default '',
  target_context text not null default '',
  desired_capability text not null default '',
  suggested_message text not null default '',
  priority smallint not null default 3 check (priority between 1 and 5),
  reason text not null default '',
  status text not null default 'draft' check (status in ('draft', 'sent', 'dismissed')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.personal_delegates (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  label text not null default 'Personal delegate',
  goals text[] not null default '{}',
  operating_mode text not null default 'passive' check (operating_mode in ('passive', 'active', 'paused')),
  search_scope text not null default '',
  risk_tolerance text not null default 'conservative' check (risk_tolerance in ('conservative', 'moderate', 'exploratory')),
  introduction_policy text not null default 'ask_each_time' check (introduction_policy in ('ask_each_time', 'auto_draft_only')),
  max_weekly_suggestions smallint not null default 5 check (max_weekly_suggestions between 0 and 50),
  allowed_purpose_bindings jsonb not null default '{}'::jsonb,
  status text not null default 'active' check (status in ('active', 'paused')),
  last_run_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.source_connections (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  provider text not null default 'manual' check (provider in ('manual', 'social', 'blog', 'email', 'calendar', 'chat_history', 'search_profile', 'other')),
  label text not null,
  url text not null default '',
  access_status text not null default 'not_connected' check (access_status in ('not_connected', 'connected', 'expired', 'revoked', 'needs_review')),
  access_scope text not null default '',
  consent_notes text not null default '',
  import_mode text not null default 'manual_review' check (import_mode in ('manual_review', 'manual_paste', 'rss_pull', 'forwarded_note')),
  sync_frequency text not null default 'manual' check (sync_frequency in ('manual', 'weekly', 'monthly')),
  last_sync_summary text not null default '',
  last_import_item_count integer not null default 0 check (last_import_item_count >= 0),
  last_imported_at timestamptz,
  allowed_field_keys text[] not null default '{}',
  retention_expires_at timestamptz,
  ai_shadow_mode_allowed boolean not null default false,
  raw_ingestion_allowed boolean not null default false,
  sensitive_ciphertexts jsonb not null default '{}'::jsonb,
  sensitive_encryption_version text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.profile_syntheses (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  hopes text not null default '',
  intent text not null default '',
  capabilities text not null default '',
  constraints text not null default '',
  uncertainty text not null default '',
  confidence_score smallint not null default 0 check (confidence_score between 0 and 100),
  source_count integer not null default 0 check (source_count >= 0),
  cause_priorities text[] not null default '{}',
  offer_terms text[] not null default '{}',
  ask_terms text[] not null default '{}',
  capability_tags text[] not null default '{}',
  constraint_flags text[] not null default '{}',
  uncertainty_flags text[] not null default '{}',
  missing_fields text[] not null default '{}',
  confidence_breakdown jsonb not null default '{}'::jsonb,
  synthesis_version text not null default 'deterministic-v1',
  sensitive_ciphertexts jsonb not null default '{}'::jsonb,
  sensitive_encryption_version text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.background_intent_claims (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  claim_key text not null,
  claim_type text not null check (claim_type in ('ask_term', 'capability_tag', 'cause_priority', 'constraint_flag', 'missing_field', 'offer_term', 'profile_state', 'source_permission', 'trade_preference', 'uncertainty_item')),
  claim_value text not null default '',
  claim_version text not null default 'background-intent-claims-v1',
  confidence_band text not null default 'medium' check (confidence_band in ('high', 'medium', 'low')),
  source_kind text not null default 'wish_profile' check (source_kind in ('wish_profile', 'profile_synthesis', 'source_connection', 'source_summary', 'profile_interview')),
  source_record_id uuid,
  surface_label text not null default '',
  preview_safe boolean not null default false,
  explanation text not null default '',
  status text not null default 'active' check (status in ('active', 'superseded', 'withdrawn')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (profile_id, claim_key)
);

create table if not exists public.helper_strategies (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  helper_kind text not null default 'cause_overlap' check (helper_kind in ('cause_overlap', 'payment_compatibility', 'geographic', 'network_expansion', 'saved_search', 'risk_filter')),
  label text not null,
  priority smallint not null default 3 check (priority between 1 and 5),
  min_score smallint not null default 55 check (min_score between 0 and 100),
  strategy_config jsonb not null default '{}'::jsonb,
  purpose_code text not null default 'moral_trade_offer' check (purpose_code in ('moral_trade_offer', 'donation_offset', 'pledge_swap', 'moral_public_good', 'research_collaboration', 'community_intro')),
  purpose_policy_version text not null default 'background-purpose-policy-v1' check (purpose_policy_version = 'background-purpose-policy-v1'),
  audience_scope text not null default 'cohort_only' check (audience_scope in ('cohort_only', 'partner_matchmaker', 'public_broad_preview')),
  cohort_scope_id text not null default '',
  status text not null default 'active' check (status in ('active', 'paused')),
  last_run_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.helper_runs (
  id uuid primary key default gen_random_uuid(),
  strategy_id uuid references public.helper_strategies (id) on delete set null,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'queued' check (status in ('queued', 'running', 'completed', 'failed')),
  candidates_scanned integer not null default 0 check (candidates_scanned >= 0),
  suggestions_created integer not null default 0 check (suggestions_created >= 0),
  notes text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  completed_at timestamptz
);

create table if not exists public.match_introduction_plans (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.match_suggestions (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  counterparty_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'draft' check (status in ('draft', 'shared', 'archived')),
  intro_message text not null default '',
  proposal_outline text not null default '',
  proposal_terms text not null default '',
  agenda text not null default '',
  timeline text not null default '',
  next_actions text not null default '',
  verification_plan text not null default '',
  privacy_notes text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (match_id, profile_id),
  check (profile_id <> counterparty_id)
);

create table if not exists public.match_introduction_tasks (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.match_introduction_plans (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  step_key text not null,
  title text not null default '',
  detail text not null default '',
  note text not null default '',
  sort_order smallint not null default 1 check (sort_order between 1 and 20),
  status text not null default 'pending' check (status in ('pending', 'in_progress', 'done', 'skipped')),
  due_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (plan_id, step_key)
);

create table if not exists public.privacy_grants (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  counterparty_id uuid references public.profiles (id) on delete cascade,
  match_id uuid references public.match_suggestions (id) on delete cascade,
  field_key text not null,
  access_level text not null default 'broad' check (access_level in ('hidden', 'broad', 'specific', 'contact')),
  audience_stage text not null default 'registry' check (audience_stage in ('registry', 'consent', 'introduced')),
  status text not null default 'draft' check (status in ('draft', 'granted', 'revoked')),
  notes text not null default '',
  expires_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (profile_id, counterparty_id, match_id, field_key)
);

create table if not exists public.privacy_access_requests (
  id uuid primary key default gen_random_uuid(),
  owner_profile_id uuid not null references public.profiles (id) on delete cascade,
  requester_profile_id uuid not null references public.profiles (id) on delete cascade,
  match_id uuid references public.match_suggestions (id) on delete set null,
  requested_fields text[] not null default '{}',
  requested_stage text not null default 'consent' check (requested_stage in ('registry', 'consent', 'introduced')),
  purpose text not null default '',
  justification text not null default '',
  owner_note text not null default '',
  status text not null default 'pending' check (status in ('pending', 'approved', 'denied', 'withdrawn')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  resolved_at timestamptz,
  check (owner_profile_id <> requester_profile_id)
);

create table if not exists public.risk_signals (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles (id) on delete cascade,
  match_id uuid references public.match_suggestions (id) on delete cascade,
  signal_type text not null,
  severity text not null default 'low' check (severity in ('low', 'medium', 'high', 'critical')),
  summary text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  status text not null default 'open' check (status in ('open', 'reviewed', 'dismissed')),
  created_at timestamptz not null default timezone('utc', now()),
  reviewed_at timestamptz
);

create table if not exists public.background_query_events (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles (id) on delete cascade,
  scope text not null check (scope in ('manual_scan', 'profile_save_scan', 'saved_search_scan', 'delegate_scan', 'registry_search')),
  query_fingerprint text not null default '',
  cost integer not null default 1 check (cost >= 0),
  daily_limit integer not null default 0 check (daily_limit >= 0),
  used_before integer not null default 0 check (used_before >= 0),
  remaining_after integer not null default 0 check (remaining_after >= 0),
  candidate_count integer not null default 0 check (candidate_count >= 0),
  result_count integer not null default 0 check (result_count >= 0),
  was_limited boolean not null default false,
  risk_signal_id uuid references public.risk_signals (id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.background_notification_preferences (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  event_kind text not null check (
    event_kind in (
      'match_suggestions',
      'consent_decisions',
      'introduction_updates',
      'grant_activity',
      'operator_review',
      'safety_review'
    )
  ),
  channel text not null check (channel in ('in_app', 'email_digest', 'web_push')),
  enabled boolean not null default true,
  digest_cadence text not null default 'daily' check (digest_cadence in ('immediate', 'daily', 'weekly', 'none')),
  quiet_until timestamptz,
  quiet_hours_start smallint check (quiet_hours_start is null or quiet_hours_start between 0 and 23),
  quiet_hours_end smallint check (quiet_hours_end is null or quiet_hours_end between 0 and 23),
  daily_cap smallint check (daily_cap is null or daily_cap between 0 and 24),
  source_cooldown_hours smallint check (source_cooldown_hours is null or source_cooldown_hours between 0 and 168),
  last_discovery_sent_at timestamptz,
  last_digest_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (profile_id, event_kind, channel)
);

alter table public.background_notification_preferences add column if not exists quiet_hours_start smallint;
alter table public.background_notification_preferences add column if not exists quiet_hours_end smallint;
alter table public.background_notification_preferences add column if not exists daily_cap smallint;
alter table public.background_notification_preferences add column if not exists source_cooldown_hours smallint;
alter table public.background_notification_preferences add column if not exists last_discovery_sent_at timestamptz;
alter table public.background_notification_preferences drop constraint if exists background_notification_preferences_source_cooldown_check;
alter table public.background_notification_preferences add constraint background_notification_preferences_source_cooldown_check check (
  source_cooldown_hours is null or source_cooldown_hours between 0 and 168
);

create table if not exists public.profile_data_right_requests (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  request_type text not null check (request_type in ('export', 'correction', 'deletion', 'restriction')),
  scope text not null default 'background_networking' check (scope in ('background_networking', 'profile', 'full_account')),
  status text not null default 'open' check (status in ('open', 'in_review', 'fulfilled', 'denied', 'cancelled')),
  request_details text not null default '',
  operator_note text not null default '',
  due_at timestamptz not null default (timezone('utc', now()) + interval '30 days'),
  reviewed_by uuid references public.profiles (id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.brokerage_bounties (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  label text not null,
  target_kind text not null default 'counterparty' check (target_kind in ('counterparty', 'group', 'institution', 'public_call')),
  cause_area text not null default '',
  max_amount_cents integer not null default 0 check (max_amount_cents >= 0),
  currency text not null default 'usd' check (currency ~ '^[a-z]{3}$'),
  reward_type text not null default 'introduction' check (reward_type in ('introduction', 'verified_trade', 'group_formation', 'research_lead')),
  preferred_regions text[] not null default '{}',
  success_condition text not null default '',
  target_note text not null default '',
  status text not null default 'active' check (status in ('active', 'paused', 'awarded', 'cancelled')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.collectives (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  description text not null default '',
  homepage_url text not null default '',
  contact_policy text not null default '',
  decision_rule text not null default 'single_owner',
  verification_notes text not null default '',
  verification_status text not null default 'unverified' check (verification_status in ('unverified', 'review_pending', 'verified')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.collective_members (
  collective_id uuid not null references public.collectives (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'admin', 'member', 'viewer')),
  status text not null default 'active' check (status in ('invited', 'active', 'removed')),
  delegation_scope text not null default '',
  can_approve_matches boolean not null default false,
  can_grant_privacy boolean not null default false,
  can_manage_bounties boolean not null default false,
  permissions text[] not null default '{}',
  created_at timestamptz not null default timezone('utc', now()),
  primary key (collective_id, profile_id)
);

create table if not exists public.collective_decisions (
  id uuid primary key default gen_random_uuid(),
  collective_id uuid not null references public.collectives (id) on delete cascade,
  created_by uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  decision_type text not null default 'match_review' check (decision_type in ('match_review', 'privacy_grant', 'bounty_award', 'verification_request', 'general')),
  target_kind text not null default 'internal' check (target_kind in ('match', 'collective', 'bounty', 'privacy_grant', 'internal')),
  target_id uuid,
  target_label text not null default '',
  summary text not null default '',
  required_approvals smallint not null default 1 check (required_approvals between 1 and 20),
  status text not null default 'open' check (status in ('open', 'approved', 'rejected', 'archived')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.collective_decision_responses (
  decision_id uuid not null references public.collective_decisions (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  response text not null default 'approve' check (response in ('approve', 'reject', 'abstain')),
  note text not null default '',
  responded_at timestamptz not null default timezone('utc', now()),
  primary key (decision_id, profile_id)
);

create table if not exists public.impact_contributions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  contribution_kind text not null default 'donation' check (contribution_kind in ('donation', 'money_equivalent')),
  cause_area text not null default '',
  action_label text not null default '',
  amount_cents integer not null check (amount_cents > 0),
  currency text not null default 'usd' check (currency ~ '^[a-z]{3}$'),
  occurred_at timestamptz not null default timezone('utc', now()),
  evidence_url text not null default '',
  evidence_note text not null default '',
  verification_status text not null default 'self_reported' check (verification_status in ('self_reported', 'verified', 'imported')),
  source_label text not null default 'manual',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.priority_correction_cycles (
  id uuid primary key default gen_random_uuid(),
  cycle_month date not null unique,
  source_period_start date not null,
  source_period_end date not null,
  carryover_in_cents integer not null default 0 check (carryover_in_cents >= 0),
  calculated_fund_cents integer not null default 0 check (calculated_fund_cents >= 0),
  published_fund_cents integer not null default 0 check (published_fund_cents >= 0),
  status text not null default 'draft' check (status in ('draft', 'published', 'specific_action_review', 'cause_area_review', 'reserved', 'finalized')),
  published_at timestamptz,
  specific_actions_due_at timestamptz,
  specific_actions_revision_due_at timestamptz,
  cause_area_due_at timestamptz,
  cause_area_revision_due_at timestamptz,
  reserve_reason text not null default '',
  notes text not null default '',
  created_by uuid references public.profiles (id) on delete set null,
  carryover_consumed_by_cycle_id uuid references public.priority_correction_cycles (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.priority_correction_member_snapshots (
  cycle_id uuid not null references public.priority_correction_cycles (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  donation_cents integer not null default 0 check (donation_cents >= 0),
  peer_payment_cents integer not null default 0 check (peer_payment_cents >= 0),
  qualifying_cents integer not null default 0 check (qualifying_cents >= 0),
  fund_share_cents integer not null default 0 check (fund_share_cents >= 0),
  prioritized_cause_area text,
  prioritized_share_basis_points integer not null default 0 check (prioritized_share_basis_points between 0 and 10000),
  priority_cause_cents integer not null default 0 check (priority_cause_cents >= 0),
  lifetime_contribution_cents integer not null default 0 check (lifetime_contribution_cents >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  primary key (cycle_id, profile_id)
);

create table if not exists public.priority_correction_arbiter_assignments (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid not null references public.priority_correction_cycles (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  role text not null check (role in ('specific_action_arbiter', 'cause_area_arbiter')),
  cause_area text,
  selection_pool text not null default '',
  selection_score integer not null default 0,
  status text not null default 'active' check (status in ('active', 'completed', 'recused', 'replaced')),
  created_at timestamptz not null default timezone('utc', now()),
  unique (cycle_id, profile_id, role, cause_area)
);

create table if not exists public.priority_specific_action_submissions (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid not null references public.priority_correction_cycles (id) on delete cascade,
  cause_area text not null default '',
  version integer not null default 1 check (version > 0),
  submitted_by uuid not null references public.profiles (id) on delete cascade,
  title text not null default '',
  combination_summary text not null default '',
  allocation_schedule jsonb not null default '[]'::jsonb,
  effect_schedule jsonb not null default '[]'::jsonb,
  reasoning text not null default '',
  status text not null default 'draft' check (status in ('draft', 'published', 'reconsideration_requested', 'superseded', 'excluded')),
  published_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (cycle_id, cause_area, version)
);

create table if not exists public.priority_specific_action_positions (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.priority_specific_action_submissions (id) on delete cascade,
  arbiter_assignment_id uuid not null references public.priority_correction_arbiter_assignments (id) on delete cascade,
  stance text not null check (stance in ('agree', 'dissent')),
  note text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  unique (submission_id, arbiter_assignment_id)
);

create table if not exists public.priority_specific_action_feedback (
  submission_id uuid not null references public.priority_specific_action_submissions (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  stance text not null check (stance in ('object', 'agree_with_dissent')),
  created_at timestamptz not null default timezone('utc', now()),
  primary key (submission_id, profile_id)
);

create table if not exists public.priority_cause_area_allocations (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid not null references public.priority_correction_cycles (id) on delete cascade,
  version integer not null default 1 check (version > 0),
  submitted_by uuid not null references public.profiles (id) on delete cascade,
  allocation_schedule jsonb not null default '[]'::jsonb,
  expected_impact text not null default '',
  reasoning text not null default '',
  status text not null default 'draft' check (status in ('draft', 'published', 'reconsideration_requested', 'superseded', 'reserved')),
  published_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (cycle_id, version)
);

create table if not exists public.priority_cause_area_positions (
  id uuid primary key default gen_random_uuid(),
  allocation_id uuid not null references public.priority_cause_area_allocations (id) on delete cascade,
  arbiter_assignment_id uuid not null references public.priority_correction_arbiter_assignments (id) on delete cascade,
  stance text not null check (stance in ('agree', 'dissent')),
  note text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  unique (allocation_id, arbiter_assignment_id)
);

create table if not exists public.priority_cause_area_feedback (
  allocation_id uuid not null references public.priority_cause_area_allocations (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  stance text not null check (stance in ('object', 'agree_with_dissent')),
  created_at timestamptz not null default timezone('utc', now()),
  primary key (allocation_id, profile_id)
);

alter table public.profile_sources add column if not exists content_kind text not null default 'manual_summary';
alter table public.profile_sources add column if not exists snapshot_excerpt text not null default '';
alter table public.profile_sources add column if not exists captured_tags text[] not null default '{}';
alter table public.profile_sources add column if not exists needs_review boolean not null default true;
alter table public.profile_sources add column if not exists imported_at timestamptz;
alter table public.profile_sources add column if not exists source_connection_id uuid references public.source_connections (id) on delete set null;
alter table public.profile_sources add column if not exists retention_expires_at timestamptz;
update public.profile_sources
set retention_expires_at = coalesce(
  retention_expires_at,
  imported_at + interval '90 days',
  created_at + interval '90 days',
  timezone('utc', now()) + interval '90 days'
)
where retention_expires_at is null;
alter table public.profile_sources alter column retention_expires_at set default (timezone('utc', now()) + interval '90 days');
alter table public.profile_sources alter column retention_expires_at set not null;
alter table public.profile_sources add column if not exists sensitive_ciphertexts jsonb not null default '{}'::jsonb;
alter table public.profile_sources add column if not exists sensitive_encryption_version text not null default '';

alter table public.network_invites add column if not exists target_kind text not null default 'person';
alter table public.network_invites add column if not exists target_url text not null default '';
alter table public.network_invites add column if not exists desired_capability text not null default '';
alter table public.network_invites add column if not exists suggested_message text not null default '';
alter table public.network_invites add column if not exists priority smallint not null default 3;

alter table public.source_connections add column if not exists import_mode text not null default 'manual_review';
alter table public.source_connections add column if not exists sync_frequency text not null default 'manual';
alter table public.source_connections add column if not exists last_sync_summary text not null default '';
alter table public.source_connections add column if not exists last_import_item_count integer not null default 0;
alter table public.source_connections add column if not exists allowed_field_keys text[] not null default '{}';
alter table public.source_connections add column if not exists retention_expires_at timestamptz;
alter table public.source_connections add column if not exists ai_shadow_mode_allowed boolean not null default false;
alter table public.source_connections add column if not exists raw_ingestion_allowed boolean not null default false;
alter table public.source_connections add column if not exists sensitive_ciphertexts jsonb not null default '{}'::jsonb;
alter table public.source_connections add column if not exists sensitive_encryption_version text not null default '';
alter table public.source_connections drop constraint if exists source_connections_access_status_check;
alter table public.source_connections
add constraint source_connections_access_status_check
check (access_status in ('not_connected', 'connected', 'expired', 'revoked', 'needs_review'));

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'source_connections_allowed_field_keys_check'
  ) then
    alter table public.source_connections
      add constraint source_connections_allowed_field_keys_check
      check (
        allowed_field_keys <@ array[
          'cause_priorities',
          'capability_tags',
          'offer_ask_terms',
          'verification_preferences',
          'availability_context',
          'safety_constraints'
        ]::text[]
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'source_connections_raw_ingestion_disabled_check'
  ) then
    alter table public.source_connections
      add constraint source_connections_raw_ingestion_disabled_check
      check (raw_ingestion_allowed = false);
  end if;
end
$$;

alter table public.profile_syntheses add column if not exists cause_priorities text[] not null default '{}';
alter table public.profile_syntheses add column if not exists offer_terms text[] not null default '{}';
alter table public.profile_syntheses add column if not exists ask_terms text[] not null default '{}';
alter table public.profile_syntheses add column if not exists capability_tags text[] not null default '{}';
alter table public.profile_syntheses add column if not exists constraint_flags text[] not null default '{}';
alter table public.profile_syntheses add column if not exists uncertainty_flags text[] not null default '{}';
alter table public.profile_syntheses add column if not exists missing_fields text[] not null default '{}';
alter table public.profile_syntheses add column if not exists confidence_breakdown jsonb not null default '{}'::jsonb;
alter table public.profile_syntheses add column if not exists sensitive_ciphertexts jsonb not null default '{}'::jsonb;
alter table public.profile_syntheses add column if not exists sensitive_encryption_version text not null default '';

alter table public.helper_strategies add column if not exists min_score smallint not null default 55;
alter table public.helper_strategies add column if not exists strategy_config jsonb not null default '{}'::jsonb;

alter table public.match_introduction_plans add column if not exists proposal_terms text not null default '';
alter table public.match_introduction_plans add column if not exists timeline text not null default '';
alter table public.match_introduction_plans add column if not exists next_actions text not null default '';

alter table public.privacy_grants add column if not exists audience_stage text not null default 'registry';
alter table public.privacy_grants add column if not exists notes text not null default '';
alter table public.privacy_grants add column if not exists expires_at timestamptz;

alter table public.match_concierge_requests add column if not exists appeal_status text not null default 'none';
alter table public.match_concierge_requests add column if not exists appeal_reason text not null default '';
alter table public.match_concierge_requests add column if not exists appealed_at timestamptz;
alter table public.match_concierge_requests add column if not exists appeal_resolved_at timestamptz;
alter table public.match_concierge_requests add column if not exists appeal_resolved_by uuid references public.profiles (id) on delete set null;
alter table public.match_concierge_requests add column if not exists appeal_resolution_note text not null default '';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'match_concierge_requests_appeal_status_check'
  ) then
    alter table public.match_concierge_requests
      add constraint match_concierge_requests_appeal_status_check
      check (appeal_status in ('none', 'requested', 'under_review', 'resolved', 'dismissed'));
  end if;
end
$$;

alter table public.risk_signals add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table public.brokerage_bounties add column if not exists target_kind text not null default 'counterparty';
alter table public.brokerage_bounties add column if not exists reward_type text not null default 'introduction';
alter table public.brokerage_bounties add column if not exists preferred_regions text[] not null default '{}';
alter table public.brokerage_bounties add column if not exists target_note text not null default '';

alter table public.collectives add column if not exists homepage_url text not null default '';
alter table public.collectives add column if not exists contact_policy text not null default '';
alter table public.collectives add column if not exists decision_rule text not null default 'single_owner';
alter table public.collectives add column if not exists verification_notes text not null default '';

alter table public.collective_members add column if not exists delegation_scope text not null default '';
alter table public.collective_members add column if not exists can_approve_matches boolean not null default false;
alter table public.collective_members add column if not exists can_grant_privacy boolean not null default false;
alter table public.collective_members add column if not exists can_manage_bounties boolean not null default false;
alter table public.collective_members add column if not exists permissions text[] not null default '{}';
alter table public.collective_members drop constraint if exists collective_members_role_check;
alter table public.collective_members add constraint collective_members_role_check
check (role in ('owner', 'admin', 'delegate', 'reviewer', 'member', 'viewer'));
alter table public.collective_members drop constraint if exists collective_members_permissions_check;
alter table public.collective_members add constraint collective_members_permissions_check
check (
  permissions <@ array[
    'edit_broad_preview',
    'approve_source_summary',
    'request_intro',
    'approve_contact_disclosure',
    'revoke_grants',
    'change_discoverability'
  ]::text[]
);

create or replace view public.wish_profile_previews as
select
  profile_id,
  participant_kind,
  collective_name,
  causes,
  public_preview,
  case when share_location then location_city else null end as location_city,
  case when share_location then location_region else null end as location_region,
  openness_to_payment,
  openness_to_pledges,
  background_search_enabled,
  privacy_stage,
  updated_at
from public.wish_profiles
where is_discoverable = true
  and share_public_preview = true
  and safety_status = 'clear';

create index if not exists offers_owner_id_idx on public.offers (owner_id);
create index if not exists offers_status_created_at_idx on public.offers (status, created_at desc);
create index if not exists offers_owner_id_status_created_at_idx on public.offers (owner_id, status, created_at desc);
create index if not exists registered_charities_public_goods_idx on public.registered_charities (is_moral_public_good, sort_order);
create index if not exists donation_offset_pools_status_idx on public.donation_offset_pools (status, created_at desc);
create index if not exists donation_offset_pools_charity_idx on public.donation_offset_pools (compromise_charity_id, created_at desc);
create index if not exists donation_offset_offers_charity_idx on public.donation_offset_offers (compromise_charity_id);
create index if not exists donation_offset_offers_moderation_idx on public.donation_offset_offers (moderation_status, created_at desc);
create index if not exists donation_offset_offers_pool_idx on public.donation_offset_offers (pool_id, participation_mode, created_at desc);
create index if not exists donation_offset_offers_baseline_bond_status_idx on public.donation_offset_offers (baseline_bond_status, offer_expires_at) where baseline_bond_enabled = true;
create index if not exists donation_offset_matches_offer_idx on public.donation_offset_matches (offer_id, created_at desc);
create index if not exists donation_offset_matches_owner_idx on public.donation_offset_matches (owner_profile_id, created_at desc);
create index if not exists donation_offset_matches_counterparty_idx on public.donation_offset_matches (counterparty_profile_id, created_at desc);
create index if not exists interests_offer_id_idx on public.interests (offer_id);
create index if not exists interests_user_id_idx on public.interests (user_id);
create index if not exists guest_interests_offer_id_idx on public.guest_interests (offer_id);
create index if not exists guest_interests_claimed_by_profile_id_idx on public.guest_interests (claimed_by_profile_id);
create index if not exists agreements_offer_id_idx on public.agreements (offer_id);
create index if not exists agreements_match_id_idx on public.agreements (match_id);
create index if not exists agreements_introduction_plan_id_idx on public.agreements (introduction_plan_id);
create index if not exists agreements_completion_state_idx on public.agreements (completion_state, updated_at desc);
create index if not exists agreements_proposer_id_idx on public.agreements (proposer_id);
create index if not exists agreements_responder_id_idx on public.agreements (responder_id);
create index if not exists agreement_ratings_rated_user_id_idx on public.agreement_ratings (rated_user_id);
create index if not exists profile_payment_accounts_stripe_id_idx on public.profile_payment_accounts (stripe_account_id);
create index if not exists agreement_payments_agreement_id_idx on public.agreement_payments (agreement_id, created_at desc);
create index if not exists agreement_payments_payer_id_idx on public.agreement_payments (payer_id, created_at desc);
create index if not exists agreement_payments_payee_id_idx on public.agreement_payments (payee_id, created_at desc);
create index if not exists agreement_payments_session_idx on public.agreement_payments (stripe_checkout_session_id);
create index if not exists agreement_payment_schedules_agreement_id_idx on public.agreement_payment_schedules (agreement_id, next_due_at asc);
create index if not exists agreement_payment_schedules_due_idx on public.agreement_payment_schedules (status, next_due_at asc);
create index if not exists agreement_events_agreement_id_idx on public.agreement_events (agreement_id, created_at desc);
create index if not exists agreement_evidence_items_agreement_idx on public.agreement_evidence_items (agreement_id, created_at desc);
create index if not exists agreement_evidence_items_status_idx on public.agreement_evidence_items (status, updated_at desc);
create index if not exists agreement_review_cases_status_sla_idx on public.agreement_review_cases (status, sla_due_at asc, created_at desc);
create index if not exists agreement_review_cases_agreement_idx on public.agreement_review_cases (agreement_id, created_at desc);
create index if not exists profile_verification_badges_profile_idx on public.profile_verification_badges (profile_id, badge_type);
create index if not exists moral_trade_provenance_agents_owner_idx on public.moral_trade_provenance_agents (owner_profile_id, created_at desc);
create index if not exists moral_trade_evidence_artifacts_owner_subject_idx on public.moral_trade_evidence_artifacts (owner_profile_id, subject_kind, subject_id, created_at desc);
create index if not exists moral_trade_evidence_artifacts_agreement_idx on public.moral_trade_evidence_artifacts (agreement_id, created_at desc);
create unique index if not exists moral_trade_evidence_artifacts_sha256_idx on public.moral_trade_evidence_artifacts (sha256);
create index if not exists moral_trade_evidence_claims_owner_subject_idx on public.moral_trade_evidence_claims (owner_profile_id, subject_kind, subject_id, created_at desc);
create index if not exists moral_trade_evidence_claim_artifacts_artifact_idx on public.moral_trade_evidence_claim_artifacts (artifact_id, created_at desc);
create index if not exists moral_trade_external_entity_references_owner_idx on public.moral_trade_external_entity_references (owner_profile_id, entity_type, created_at desc);
create index if not exists moral_trade_review_decisions_owner_subject_idx on public.moral_trade_review_decisions (owner_profile_id, subject_kind, subject_id, created_at desc);
create index if not exists moral_trade_provenance_activities_owner_subject_idx on public.moral_trade_provenance_activities (owner_profile_id, subject_kind, subject_id, activity_at desc);
create index if not exists moral_trade_traceability_events_owner_subject_idx on public.moral_trade_traceability_events (owner_profile_id, subject_kind, subject_id, recorded_at desc);
create index if not exists moral_trade_state_transition_events_owner_subject_idx on public.moral_trade_state_transition_events (owner_profile_id, subject_kind, subject_id, recorded_at desc);
create index if not exists email_outbox_status_created_idx on public.email_outbox (status, created_at asc);
create unique index if not exists email_outbox_source_dedupe_idx on public.email_outbox (source_kind, source_id);
create index if not exists saved_searches_profile_status_idx on public.saved_searches (profile_id, status, updated_at desc);
create index if not exists saved_searches_scan_idx on public.saved_searches (status, cadence, last_scanned_at asc nulls first);
create index if not exists offers_text_search_idx on public.offers using gin (
  to_tsvector(
    'english',
    coalesce(offered_cause, '') || ' ' ||
    coalesce(requested_cause, '') || ' ' ||
    coalesce(offer_action, '') || ' ' ||
    coalesce(request_action, '') || ' ' ||
    coalesce(notes, '')
  )
);
create index if not exists wish_entries_text_search_idx on public.wish_entries using gin (
  to_tsvector(
    'english',
    coalesce(cause_area, '') || ' ' ||
    coalesce(title, '') || ' ' ||
    coalesce(body, '')
  )
);
create index if not exists follows_followed_id_idx on public.user_follows (followed_id);
create index if not exists recommendations_source_offer_id_idx on public.offer_recommendations (source_offer_id);
create index if not exists recommendations_recommender_id_idx on public.offer_recommendations (recommender_id);
create index if not exists recommendations_recommended_offer_id_idx on public.offer_recommendations (recommended_offer_id);
create index if not exists offer_comments_offer_id_idx on public.offer_comments (offer_id, created_at asc);
create index if not exists offer_comments_author_id_idx on public.offer_comments (author_id);
create index if not exists comment_votes_user_id_idx on public.comment_votes (user_id);
create index if not exists comment_votes_comment_id_idx on public.comment_votes (comment_id);
create index if not exists offer_carts_user_id_idx on public.offer_carts (user_id);
create index if not exists profiles_rating_sort_idx on public.profiles (rating_avg desc nulls last, rating_count desc, offer_count desc, id);
create index if not exists profiles_follower_sort_idx on public.profiles (follower_count desc, offer_count desc, id);
create index if not exists profiles_karma_sort_idx on public.profiles (karma desc, offer_count desc, id);
create index if not exists profiles_comment_sort_idx on public.profiles (comment_count desc, offer_count desc, id);
create index if not exists wish_profiles_discoverable_idx on public.wish_profiles (is_discoverable, share_public_preview, safety_status, updated_at desc);
create index if not exists wish_profiles_broad_preview_text_search_idx on public.wish_profiles using gin (
  to_tsvector(
    'english',
    coalesce(public_preview, '') || ' ' ||
    array_to_string(causes, ' ') || ' ' ||
    coalesce(collective_name, '') || ' ' ||
    coalesce(participant_kind, '') || ' ' ||
    case
      when share_location then coalesce(location_city, '') || ' ' || coalesce(location_region, '')
      else ''
    end
  )
) where is_discoverable = true and share_public_preview = true and background_search_enabled = true and safety_status = 'clear';
create index if not exists wish_profiles_sensitive_encryption_idx on public.wish_profiles (sensitive_encryption_version, updated_at desc) where sensitive_encryption_version <> '';
create index if not exists wish_entries_profile_type_idx on public.wish_entries (profile_id, entry_type, updated_at desc);
create index if not exists wish_entries_preview_idx on public.wish_entries (visibility, safety_status, entry_type, updated_at desc);
create index if not exists wish_entries_body_encryption_idx on public.wish_entries (body_encryption_version, updated_at desc) where body_encryption_version <> '';
create index if not exists match_suggestions_profile_a_idx on public.match_suggestions (profile_a_id, status, updated_at desc);
create index if not exists match_suggestions_profile_b_idx on public.match_suggestions (profile_b_id, status, updated_at desc);
create index if not exists match_suggestions_score_idx on public.match_suggestions (status, score desc, updated_at desc);
create index if not exists match_suggestions_background_owner_idx on public.match_suggestions (background_owner_profile_id, generated_by, status, updated_at desc);
create index if not exists match_consents_profile_id_idx on public.match_consents (profile_id);
create index if not exists wish_notifications_profile_unread_idx on public.wish_notifications (profile_id, read_at, created_at desc);
create index if not exists profile_sources_profile_active_idx on public.profile_sources (profile_id, is_active, updated_at desc);
create index if not exists profile_sources_profile_review_idx on public.profile_sources (profile_id, needs_review, updated_at desc);
create index if not exists profile_sources_retention_expires_idx on public.profile_sources (profile_id, retention_expires_at asc);
create index if not exists profile_sources_sensitive_encryption_idx on public.profile_sources (sensitive_encryption_version, updated_at desc) where sensitive_encryption_version <> '';
create index if not exists clarification_questions_profile_status_idx on public.clarification_questions (profile_id, status, created_at desc);
create index if not exists background_match_runs_profile_created_idx on public.background_match_runs (profile_id, created_at desc);
create index if not exists match_explanation_snapshots_profile_created_idx on public.match_explanation_snapshots (profile_id, created_at desc);
create index if not exists match_explanation_snapshots_match_profile_idx on public.match_explanation_snapshots (match_id, profile_id, created_at desc);
create index if not exists match_explanation_snapshots_stage_idx on public.match_explanation_snapshots (workflow_stage, created_at desc);
create unique index if not exists match_explanation_snapshots_dedupe_idx on public.match_explanation_snapshots (
  match_id,
  profile_id,
  explanation_version,
  workflow_stage,
  confidence_band,
  score_bucket,
  source_run_kind,
  source_run_id
);
create index if not exists background_query_events_profile_scope_created_idx on public.background_query_events (profile_id, scope, created_at desc);
create index if not exists background_query_events_limited_idx on public.background_query_events (was_limited, created_at desc);
create index if not exists background_query_events_fingerprint_idx on public.background_query_events (query_fingerprint, created_at desc);
create index if not exists background_notification_preferences_profile_idx on public.background_notification_preferences (profile_id, event_kind, channel);
create index if not exists background_notification_preferences_enabled_idx on public.background_notification_preferences (channel, enabled, digest_cadence, updated_at desc);
create index if not exists profile_data_right_requests_profile_status_idx on public.profile_data_right_requests (profile_id, status, created_at desc);
create index if not exists profile_data_right_requests_status_due_idx on public.profile_data_right_requests (status, due_at asc, created_at desc);
create index if not exists match_audit_events_match_created_idx on public.match_audit_events (match_id, created_at desc);
create index if not exists match_reports_match_status_idx on public.match_reports (match_id, status, created_at desc);
create index if not exists match_concierge_requests_status_sla_idx on public.match_concierge_requests (status, sla_due_at asc, created_at desc);
create index if not exists match_concierge_requests_requester_idx on public.match_concierge_requests (requester_profile_id, updated_at desc);
create index if not exists match_concierge_requests_target_idx on public.match_concierge_requests (target_profile_id, updated_at desc);
create index if not exists match_concierge_requests_appeal_status_idx on public.match_concierge_requests (appeal_status, sla_due_at asc, updated_at desc) where appeal_status <> 'none';
create index if not exists match_concierge_events_request_idx on public.match_concierge_events (request_id, created_at desc);
create index if not exists network_invites_profile_status_idx on public.network_invites (profile_id, status, created_at desc);
create index if not exists network_invites_profile_priority_idx on public.network_invites (profile_id, priority desc, updated_at desc);
create index if not exists personal_delegates_status_idx on public.personal_delegates (status, operating_mode, last_run_at asc nulls first);
create index if not exists source_connections_profile_status_idx on public.source_connections (profile_id, access_status, updated_at desc);
create index if not exists source_connections_profile_import_idx on public.source_connections (profile_id, access_status, sync_frequency, updated_at desc);
create index if not exists source_connections_sensitive_encryption_idx on public.source_connections (sensitive_encryption_version, updated_at desc) where sensitive_encryption_version <> '';
create index if not exists source_connections_retention_expires_idx on public.source_connections (retention_expires_at asc) where retention_expires_at is not null;
create index if not exists source_connections_ai_shadow_idx on public.source_connections (profile_id, ai_shadow_mode_allowed, updated_at desc);
create index if not exists profile_syntheses_sensitive_encryption_idx on public.profile_syntheses (sensitive_encryption_version, updated_at desc) where sensitive_encryption_version <> '';
create index if not exists background_intent_claims_profile_status_idx on public.background_intent_claims (profile_id, status, claim_type, updated_at desc);
create index if not exists background_intent_claims_preview_idx on public.background_intent_claims (preview_safe, claim_type, updated_at desc) where status = 'active';
create index if not exists helper_strategies_profile_status_idx on public.helper_strategies (profile_id, status, priority asc, updated_at desc);
create index if not exists helper_runs_profile_created_idx on public.helper_runs (profile_id, created_at desc);
create index if not exists helper_runs_strategy_created_idx on public.helper_runs (strategy_id, created_at desc);
create index if not exists match_introduction_plans_match_idx on public.match_introduction_plans (match_id, status, updated_at desc);
create index if not exists match_introduction_plans_profile_idx on public.match_introduction_plans (profile_id, status, updated_at desc);
create index if not exists match_introduction_tasks_profile_status_idx on public.match_introduction_tasks (profile_id, status, updated_at desc);
create index if not exists match_introduction_tasks_plan_sort_idx on public.match_introduction_tasks (plan_id, sort_order asc, updated_at desc);
create index if not exists privacy_grants_profile_status_idx on public.privacy_grants (profile_id, status, updated_at desc);
create index if not exists privacy_grants_counterparty_status_idx on public.privacy_grants (counterparty_id, status, updated_at desc);
create index if not exists privacy_access_requests_owner_status_idx on public.privacy_access_requests (owner_profile_id, status, updated_at desc);
create index if not exists privacy_access_requests_requester_status_idx on public.privacy_access_requests (requester_profile_id, status, updated_at desc);
create index if not exists privacy_access_requests_match_idx on public.privacy_access_requests (match_id, status, updated_at desc);
create index if not exists risk_signals_status_idx on public.risk_signals (status, severity, created_at desc);
create index if not exists risk_signals_profile_status_idx on public.risk_signals (profile_id, status, created_at desc);
create index if not exists brokerage_bounties_profile_status_idx on public.brokerage_bounties (profile_id, status, updated_at desc);
create index if not exists brokerage_bounties_cause_idx on public.brokerage_bounties (cause_area, status, max_amount_cents desc);
create index if not exists collectives_owner_idx on public.collectives (owner_id, updated_at desc);
create index if not exists collective_members_profile_idx on public.collective_members (profile_id, status, created_at desc);
create index if not exists collective_decisions_collective_status_idx on public.collective_decisions (collective_id, status, updated_at desc);
create index if not exists collective_decision_responses_profile_idx on public.collective_decision_responses (profile_id, responded_at desc);
create index if not exists impact_contributions_profile_occurred_idx on public.impact_contributions (profile_id, occurred_at desc);
create index if not exists impact_contributions_cause_idx on public.impact_contributions (cause_area, occurred_at desc);
create index if not exists priority_correction_cycles_status_idx on public.priority_correction_cycles (status, cycle_month desc);
create index if not exists priority_correction_member_snapshots_profile_idx on public.priority_correction_member_snapshots (profile_id, cycle_id);
create index if not exists priority_correction_member_snapshots_cause_idx on public.priority_correction_member_snapshots (cycle_id, prioritized_cause_area);
create index if not exists priority_correction_arbiter_assignments_profile_idx on public.priority_correction_arbiter_assignments (profile_id, created_at desc);
create index if not exists priority_correction_arbiter_assignments_cycle_role_idx on public.priority_correction_arbiter_assignments (cycle_id, role, cause_area);
create index if not exists priority_specific_action_submissions_cycle_idx on public.priority_specific_action_submissions (cycle_id, cause_area, version desc);
create index if not exists priority_specific_action_positions_submission_idx on public.priority_specific_action_positions (submission_id);
create index if not exists priority_specific_action_feedback_submission_idx on public.priority_specific_action_feedback (submission_id);
create index if not exists priority_cause_area_allocations_cycle_idx on public.priority_cause_area_allocations (cycle_id, version desc);
create index if not exists priority_cause_area_positions_allocation_idx on public.priority_cause_area_positions (allocation_id);
create index if not exists priority_cause_area_feedback_allocation_idx on public.priority_cause_area_feedback (allocation_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create or replace function public.refresh_profile_rating_summary(target_profile_id uuid)
returns void
language plpgsql
as $$
begin
  update public.profiles
  set
    rating_count = (
      select count(*)
      from public.agreement_ratings
      where rated_user_id = target_profile_id
    ),
    rating_avg = (
      select avg(score)::double precision
      from public.agreement_ratings
      where rated_user_id = target_profile_id
    )
  where id = target_profile_id;
end;
$$;

create or replace function public.handle_user_follow_stats()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    update public.profiles
    set following_count = following_count + 1
    where id = new.follower_id;

    update public.profiles
    set follower_count = follower_count + 1
    where id = new.followed_id;

    return new;
  end if;

  update public.profiles
  set following_count = greatest(following_count - 1, 0)
  where id = old.follower_id;

  update public.profiles
  set follower_count = greatest(follower_count - 1, 0)
  where id = old.followed_id;

  return old;
end;
$$;

create or replace function public.handle_offer_comment_stats()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    update public.profiles
    set
      comment_count = comment_count + 1,
      karma = karma + 1
    where id = new.author_id;

    return new;
  end if;

  update public.profiles
  set
    comment_count = greatest(comment_count - 1, 0),
    karma = greatest(karma - 1, 0)
  where id = old.author_id;

  return old;
end;
$$;

create or replace function public.handle_comment_vote_stats()
returns trigger
language plpgsql
as $$
declare
  target_author_id uuid;
  karma_delta integer;
begin
  if tg_op = 'INSERT' then
    select author_id into target_author_id
    from public.offer_comments
    where id = new.comment_id;

    karma_delta := new.value;
  elsif tg_op = 'UPDATE' then
    select author_id into target_author_id
    from public.offer_comments
    where id = new.comment_id;

    karma_delta := new.value - old.value;
  else
    select author_id into target_author_id
    from public.offer_comments
    where id = old.comment_id;

    karma_delta := -old.value;
  end if;

  if target_author_id is not null and karma_delta <> 0 then
    update public.profiles
    set karma = greatest(karma + karma_delta, 0)
    where id = target_author_id;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

create or replace function public.handle_offer_stats()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    if new.status = 'open' then
      update public.profiles
      set offer_count = offer_count + 1
      where id = new.owner_id;
    end if;

    return new;
  end if;

  if tg_op = 'DELETE' then
    if old.status = 'open' then
      update public.profiles
      set offer_count = greatest(offer_count - 1, 0)
      where id = old.owner_id;
    end if;

    return old;
  end if;

  if old.owner_id = new.owner_id then
    if old.status <> 'open' and new.status = 'open' then
      update public.profiles
      set offer_count = offer_count + 1
      where id = new.owner_id;
    elsif old.status = 'open' and new.status <> 'open' then
      update public.profiles
      set offer_count = greatest(offer_count - 1, 0)
      where id = new.owner_id;
    end if;
  else
    if old.status = 'open' then
      update public.profiles
      set offer_count = greatest(offer_count - 1, 0)
      where id = old.owner_id;
    end if;

    if new.status = 'open' then
      update public.profiles
      set offer_count = offer_count + 1
      where id = new.owner_id;
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.handle_agreement_rating_stats()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    perform public.refresh_profile_rating_summary(new.rated_user_id);
    return new;
  end if;

  if tg_op = 'DELETE' then
    perform public.refresh_profile_rating_summary(old.rated_user_id);
    return old;
  end if;

  if old.rated_user_id is distinct from new.rated_user_id then
    perform public.refresh_profile_rating_summary(old.rated_user_id);
  end if;

  perform public.refresh_profile_rating_summary(new.rated_user_id);
  return new;
end;
$$;

create or replace function public.viewer_has_interest_for_offer(target_offer_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select
    auth.uid() is not null
    and exists (
      select 1
      from public.interests
      where interests.offer_id = target_offer_id
        and interests.user_id = auth.uid()
    );
$$;

create or replace function public.viewer_has_offer_in_cart(target_offer_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select
    auth.uid() is not null
    and exists (
      select 1
      from public.offer_carts
      where offer_carts.offer_id = target_offer_id
        and offer_carts.user_id = auth.uid()
    );
$$;

create or replace function public.wish_profile_is_previewable(target_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from public.wish_profiles
    where profile_id = target_profile_id
      and is_discoverable = true
      and share_public_preview = true
      and safety_status = 'clear'
  );
$$;

create or replace function public.viewer_participates_in_match(target_match_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select
    auth.uid() is not null
    and exists (
      select 1
      from public.match_suggestions
      where id = target_match_id
        and (
          profile_a_id = auth.uid()
          or profile_b_id = auth.uid()
        )
    );
$$;

create or replace function public.profile_participates_in_match(
  target_match_id uuid,
  target_profile_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    target_profile_id is not null
    and exists (
      select 1
      from public.match_suggestions
      where id = target_match_id
        and (
          profile_a_id = target_profile_id
          or profile_b_id = target_profile_id
        )
    );
$$;

create or replace function public.viewer_can_access_collective(target_collective_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select
    auth.uid() is not null
    and (
      exists (
        select 1
        from public.collectives
        where id = target_collective_id
          and owner_id = auth.uid()
      )
      or exists (
        select 1
        from public.collective_members
        where collective_id = target_collective_id
          and profile_id = auth.uid()
          and status = 'active'
      )
    );
$$;

create or replace function public.viewer_can_see_match_identity(target_match_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select
    public.viewer_participates_in_match(target_match_id)
    and exists (
      select 1
      from public.match_suggestions
      where id = target_match_id
        and (
          identity_revealed = true
          or (
            exists (
              select 1
              from public.match_consents
              where match_id = target_match_id
                and profile_id = profile_a_id
            )
            and exists (
              select 1
              from public.match_consents
              where match_id = target_match_id
                and profile_id = profile_b_id
            )
          )
        )
    );
$$;

drop function if exists public.upsert_match_suggestion(uuid, uuid, uuid, uuid, text, text, smallint, text);
drop function if exists public.upsert_match_suggestion(uuid, uuid, uuid, uuid, text, text, smallint, text, text[], text[], text, text, text);

create or replace function public.upsert_match_suggestion(
  target_profile_a_id uuid,
  target_profile_b_id uuid,
  target_profile_a_entry_id uuid,
  target_profile_b_entry_id uuid,
  target_reason_for_a text,
  target_reason_for_b text,
  target_score smallint,
  target_dedupe_key text,
  target_match_basis text[] default '{}',
  target_shared_causes text[] default '{}',
  target_suggested_first_step text default '',
  target_risk_notes text default '',
  target_generated_by text default 'rule-based'
)
returns table(match_id uuid, was_created boolean)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  existing_match_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required.';
  end if;

  if auth.uid() <> target_profile_a_id and auth.uid() <> target_profile_b_id then
    raise exception 'You can only create match suggestions involving your own profile.';
  end if;

  if target_profile_a_id = target_profile_b_id then
    raise exception 'A match suggestion requires two different profiles.';
  end if;

  if (
    select count(*)
    from public.wish_profiles
    where profile_id in (target_profile_a_id, target_profile_b_id)
      and is_discoverable = true
      and safety_status = 'clear'
  ) <> 2 then
    raise exception 'Both profiles must be discoverable and clear safety review.';
  end if;

  select id into existing_match_id
  from public.match_suggestions
  where dedupe_key = target_dedupe_key;

  insert into public.match_suggestions (
    profile_a_id,
    profile_b_id,
    profile_a_entry_id,
    profile_b_entry_id,
    reason_for_a,
    reason_for_b,
    score,
    match_basis,
    shared_causes,
    suggested_first_step,
    risk_notes,
    generated_by,
    status,
    dedupe_key,
    last_scored_at
  )
  values (
    target_profile_a_id,
    target_profile_b_id,
    target_profile_a_entry_id,
    target_profile_b_entry_id,
    target_reason_for_a,
    target_reason_for_b,
    least(100, greatest(0, target_score)),
    coalesce(target_match_basis, '{}'),
    coalesce(target_shared_causes, '{}'),
    coalesce(target_suggested_first_step, ''),
    coalesce(target_risk_notes, ''),
    coalesce(nullif(target_generated_by, ''), 'rule-based'),
    'suggested',
    target_dedupe_key,
    timezone('utc', now())
  )
  on conflict (dedupe_key) do update
    set reason_for_a = excluded.reason_for_a,
        reason_for_b = excluded.reason_for_b,
        score = excluded.score,
        match_basis = excluded.match_basis,
        shared_causes = excluded.shared_causes,
        suggested_first_step = excluded.suggested_first_step,
        risk_notes = excluded.risk_notes,
        generated_by = excluded.generated_by,
        last_scored_at = excluded.last_scored_at,
        status = case
          when public.match_suggestions.status = 'dismissed' then public.match_suggestions.status
          else excluded.status
        end
  returning id into match_id;

  was_created := existing_match_id is null;
  return next;
end;
$$;

create or replace function public.viewer_consent_to_match(
  target_match_id uuid,
  consent_note text default ''
)
returns table(counterparty_id uuid, both_consented boolean)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  viewer_id uuid := auth.uid();
  profile_a uuid;
  profile_b uuid;
begin
  if viewer_id is null then
    raise exception 'Authentication required.';
  end if;

  select profile_a_id, profile_b_id
  into profile_a, profile_b
  from public.match_suggestions
  where id = target_match_id
    and status <> 'dismissed';

  if profile_a is null or profile_b is null then
    raise exception 'Match suggestion not found.';
  end if;

  if viewer_id <> profile_a and viewer_id <> profile_b then
    raise exception 'You can only consent to your own match suggestions.';
  end if;

  counterparty_id := case when viewer_id = profile_a then profile_b else profile_a end;

  insert into public.match_consents (match_id, profile_id, note, consented_at)
  values (target_match_id, viewer_id, coalesce(consent_note, ''), timezone('utc', now()))
  on conflict (match_id, profile_id) do update
    set note = excluded.note,
        consented_at = excluded.consented_at;

  both_consented := exists (
    select 1
    from public.match_consents
    where match_id = target_match_id
      and profile_id = profile_a
  ) and exists (
    select 1
    from public.match_consents
    where match_id = target_match_id
      and profile_id = profile_b
  );

  if both_consented then
    update public.match_suggestions
    set identity_revealed = true,
        status = 'introduced'
    where id = target_match_id;
  end if;

  return next;
end;
$$;

grant execute on function public.viewer_has_interest_for_offer(uuid) to anon, authenticated;
grant execute on function public.viewer_has_offer_in_cart(uuid) to anon, authenticated;
grant execute on function public.wish_profile_is_previewable(uuid) to anon, authenticated;
grant execute on function public.viewer_participates_in_match(uuid) to authenticated;
grant execute on function public.profile_participates_in_match(uuid, uuid) to authenticated;
grant execute on function public.viewer_can_access_collective(uuid) to authenticated;
grant execute on function public.viewer_can_see_match_identity(uuid) to authenticated;
grant execute on function public.upsert_match_suggestion(uuid, uuid, uuid, uuid, text, text, smallint, text, text[], text[], text, text, text) to authenticated;
grant execute on function public.viewer_consent_to_match(uuid, text) to authenticated;

create or replace view public.match_suggestion_previews as
select
  match_suggestions.id,
  case
    when public.viewer_can_see_match_identity(match_suggestions.id) then
      case
        when match_suggestions.profile_a_id = auth.uid() then match_suggestions.profile_b_id
        else match_suggestions.profile_a_id
      end
    else null
  end as counterparty_profile_id,
  coalesce(counterparty_preview.public_preview, '') as counterparty_public_preview,
  coalesce(counterparty_preview.causes, '{}'::text[]) as counterparty_causes,
  counterparty_preview.location_city as counterparty_location_city,
  counterparty_preview.location_region as counterparty_location_region,
  coalesce(counterparty_preview.openness_to_payment, false) as counterparty_openness_to_payment,
  coalesce(counterparty_preview.openness_to_pledges, false) as counterparty_openness_to_pledges,
  case
    when match_suggestions.profile_a_id = auth.uid() then match_suggestions.reason_for_a
    else match_suggestions.reason_for_b
  end as viewer_reason,
  case
    when public.viewer_can_see_match_identity(match_suggestions.id) then
      case
        when match_suggestions.profile_a_id = auth.uid() then match_suggestions.reason_for_b
        else match_suggestions.reason_for_a
      end
    else ''
  end as counterparty_reason,
  match_suggestions.score,
  match_suggestions.match_basis,
  match_suggestions.shared_causes,
  match_suggestions.suggested_first_step,
  match_suggestions.risk_notes,
  match_suggestions.generated_by,
  match_suggestions.status,
  match_suggestions.identity_revealed,
  exists (
    select 1
    from public.match_consents
    where match_consents.match_id = match_suggestions.id
      and match_consents.profile_id = auth.uid()
  ) as viewer_consented,
  exists (
    select 1
    from public.match_consents
    where match_consents.match_id = match_suggestions.id
      and match_consents.profile_id = case
        when match_suggestions.profile_a_id = auth.uid() then match_suggestions.profile_b_id
        else match_suggestions.profile_a_id
      end
  ) as counterparty_consented,
  public.viewer_can_see_match_identity(match_suggestions.id) as can_reveal_identity,
  match_suggestions.last_scored_at,
  match_suggestions.created_at,
  match_suggestions.updated_at
from public.match_suggestions
left join public.wish_profile_previews as counterparty_preview
  on counterparty_preview.profile_id = case
    when match_suggestions.profile_a_id = auth.uid() then match_suggestions.profile_b_id
    else match_suggestions.profile_a_id
  end
where auth.uid() is not null
  and (
    match_suggestions.profile_a_id = auth.uid()
    or match_suggestions.profile_b_id = auth.uid()
  )
  and (
    match_suggestions.background_owner_profile_id is null
    or match_suggestions.background_owner_profile_id = auth.uid()
    or public.viewer_can_see_match_identity(match_suggestions.id)
  )
  and match_suggestions.status <> 'dismissed';

grant select on public.match_suggestion_previews to authenticated;

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
    public_location_granularity,
    bio
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
    end,
    coalesce(new.raw_user_meta_data ->> 'bio', '')
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
        ),
        bio = case
          when excluded.bio <> '' then excluded.bio
          else public.profiles.bio
        end;

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
  public_location_granularity,
  bio
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
  end,
  coalesce(users.raw_user_meta_data ->> 'bio', '')
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
      ),
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

drop trigger if exists donation_offset_offers_set_updated_at on public.donation_offset_offers;
create trigger donation_offset_offers_set_updated_at
before update on public.donation_offset_offers
for each row execute procedure public.set_updated_at();

drop trigger if exists donation_offset_pools_set_updated_at on public.donation_offset_pools;
create trigger donation_offset_pools_set_updated_at
before update on public.donation_offset_pools
for each row execute procedure public.set_updated_at();

drop trigger if exists donation_offset_matches_set_updated_at on public.donation_offset_matches;
create trigger donation_offset_matches_set_updated_at
before update on public.donation_offset_matches
for each row execute procedure public.set_updated_at();

drop trigger if exists offers_profile_stats on public.offers;
create trigger offers_profile_stats
after insert or delete or update of owner_id, status on public.offers
for each row execute procedure public.handle_offer_stats();

drop trigger if exists interests_set_updated_at on public.interests;
create trigger interests_set_updated_at
before update on public.interests
for each row execute procedure public.set_updated_at();

drop trigger if exists guest_interests_set_updated_at on public.guest_interests;
create trigger guest_interests_set_updated_at
before update on public.guest_interests
for each row execute procedure public.set_updated_at();

drop trigger if exists agreements_set_updated_at on public.agreements;
create trigger agreements_set_updated_at
before update on public.agreements
for each row execute procedure public.set_updated_at();

drop trigger if exists offer_comments_set_updated_at on public.offer_comments;
create trigger offer_comments_set_updated_at
before update on public.offer_comments
for each row execute procedure public.set_updated_at();

drop trigger if exists profile_payment_accounts_set_updated_at on public.profile_payment_accounts;
create trigger profile_payment_accounts_set_updated_at
before update on public.profile_payment_accounts
for each row execute procedure public.set_updated_at();

drop trigger if exists agreement_payments_set_updated_at on public.agreement_payments;
create trigger agreement_payments_set_updated_at
before update on public.agreement_payments
for each row execute procedure public.set_updated_at();

drop trigger if exists agreement_payment_schedules_set_updated_at on public.agreement_payment_schedules;
create trigger agreement_payment_schedules_set_updated_at
before update on public.agreement_payment_schedules
for each row execute procedure public.set_updated_at();

drop trigger if exists agreement_evidence_items_set_updated_at on public.agreement_evidence_items;
create trigger agreement_evidence_items_set_updated_at
before update on public.agreement_evidence_items
for each row execute procedure public.set_updated_at();

drop trigger if exists agreement_review_cases_set_updated_at on public.agreement_review_cases;
create trigger agreement_review_cases_set_updated_at
before update on public.agreement_review_cases
for each row execute procedure public.set_updated_at();

drop trigger if exists profile_verification_badges_set_updated_at on public.profile_verification_badges;
create trigger profile_verification_badges_set_updated_at
before update on public.profile_verification_badges
for each row execute procedure public.set_updated_at();

drop trigger if exists saved_searches_set_updated_at on public.saved_searches;
create trigger saved_searches_set_updated_at
before update on public.saved_searches
for each row execute procedure public.set_updated_at();

drop trigger if exists user_follows_profile_stats on public.user_follows;
create trigger user_follows_profile_stats
after insert or delete on public.user_follows
for each row execute procedure public.handle_user_follow_stats();

drop trigger if exists offer_comments_profile_stats on public.offer_comments;
create trigger offer_comments_profile_stats
after insert or delete on public.offer_comments
for each row execute procedure public.handle_offer_comment_stats();

drop trigger if exists comment_votes_profile_stats on public.comment_votes;
create trigger comment_votes_profile_stats
after insert or delete or update of value on public.comment_votes
for each row execute procedure public.handle_comment_vote_stats();

drop trigger if exists agreement_ratings_profile_stats on public.agreement_ratings;
create trigger agreement_ratings_profile_stats
after insert or delete or update of score, rated_user_id on public.agreement_ratings
for each row execute procedure public.handle_agreement_rating_stats();

drop trigger if exists wish_profiles_set_updated_at on public.wish_profiles;
create trigger wish_profiles_set_updated_at
before update on public.wish_profiles
for each row execute procedure public.set_updated_at();

drop trigger if exists wish_entries_set_updated_at on public.wish_entries;
create trigger wish_entries_set_updated_at
before update on public.wish_entries
for each row execute procedure public.set_updated_at();

drop trigger if exists match_suggestions_set_updated_at on public.match_suggestions;
create trigger match_suggestions_set_updated_at
before update on public.match_suggestions
for each row execute procedure public.set_updated_at();

drop trigger if exists match_concierge_requests_set_updated_at on public.match_concierge_requests;
create trigger match_concierge_requests_set_updated_at
before update on public.match_concierge_requests
for each row execute procedure public.set_updated_at();

drop trigger if exists profile_sources_set_updated_at on public.profile_sources;
create trigger profile_sources_set_updated_at
before update on public.profile_sources
for each row execute procedure public.set_updated_at();

drop trigger if exists network_invites_set_updated_at on public.network_invites;
create trigger network_invites_set_updated_at
before update on public.network_invites
for each row execute procedure public.set_updated_at();

drop trigger if exists personal_delegates_set_updated_at on public.personal_delegates;
create trigger personal_delegates_set_updated_at
before update on public.personal_delegates
for each row execute procedure public.set_updated_at();

drop trigger if exists source_connections_set_updated_at on public.source_connections;
create trigger source_connections_set_updated_at
before update on public.source_connections
for each row execute procedure public.set_updated_at();

drop trigger if exists profile_syntheses_set_updated_at on public.profile_syntheses;
create trigger profile_syntheses_set_updated_at
before update on public.profile_syntheses
for each row execute procedure public.set_updated_at();

drop trigger if exists background_intent_claims_set_updated_at on public.background_intent_claims;
create trigger background_intent_claims_set_updated_at
before update on public.background_intent_claims
for each row execute procedure public.set_updated_at();

drop trigger if exists helper_strategies_set_updated_at on public.helper_strategies;
create trigger helper_strategies_set_updated_at
before update on public.helper_strategies
for each row execute procedure public.set_updated_at();

drop trigger if exists match_introduction_plans_set_updated_at on public.match_introduction_plans;
create trigger match_introduction_plans_set_updated_at
before update on public.match_introduction_plans
for each row execute procedure public.set_updated_at();

drop trigger if exists match_introduction_tasks_set_updated_at on public.match_introduction_tasks;
create trigger match_introduction_tasks_set_updated_at
before update on public.match_introduction_tasks
for each row execute procedure public.set_updated_at();

drop trigger if exists privacy_grants_set_updated_at on public.privacy_grants;
create trigger privacy_grants_set_updated_at
before update on public.privacy_grants
for each row execute procedure public.set_updated_at();

drop trigger if exists privacy_access_requests_set_updated_at on public.privacy_access_requests;
create trigger privacy_access_requests_set_updated_at
before update on public.privacy_access_requests
for each row execute procedure public.set_updated_at();

drop trigger if exists brokerage_bounties_set_updated_at on public.brokerage_bounties;
create trigger brokerage_bounties_set_updated_at
before update on public.brokerage_bounties
for each row execute procedure public.set_updated_at();

drop trigger if exists collectives_set_updated_at on public.collectives;
create trigger collectives_set_updated_at
before update on public.collectives
for each row execute procedure public.set_updated_at();

drop trigger if exists collective_decisions_set_updated_at on public.collective_decisions;
create trigger collective_decisions_set_updated_at
before update on public.collective_decisions
for each row execute procedure public.set_updated_at();

drop trigger if exists impact_contributions_set_updated_at on public.impact_contributions;
create trigger impact_contributions_set_updated_at
before update on public.impact_contributions
for each row execute procedure public.set_updated_at();

drop trigger if exists priority_correction_cycles_set_updated_at on public.priority_correction_cycles;
create trigger priority_correction_cycles_set_updated_at
before update on public.priority_correction_cycles
for each row execute procedure public.set_updated_at();

drop trigger if exists priority_specific_action_submissions_set_updated_at on public.priority_specific_action_submissions;
create trigger priority_specific_action_submissions_set_updated_at
before update on public.priority_specific_action_submissions
for each row execute procedure public.set_updated_at();

drop trigger if exists priority_cause_area_allocations_set_updated_at on public.priority_cause_area_allocations;
create trigger priority_cause_area_allocations_set_updated_at
before update on public.priority_cause_area_allocations
for each row execute procedure public.set_updated_at();

update public.profiles p
set
  follower_count = (
    select count(*)
    from public.user_follows
    where followed_id = p.id
  ),
  following_count = (
    select count(*)
    from public.user_follows
    where follower_id = p.id
  ),
  comment_count = (
    select count(*)
    from public.offer_comments
    where author_id = p.id
  ),
  karma = (
    (
      select count(*)
      from public.offer_comments
      where author_id = p.id
    ) + coalesce(
      (
        select sum(comment_votes.value)
        from public.comment_votes
        join public.offer_comments on offer_comments.id = comment_votes.comment_id
        where offer_comments.author_id = p.id
      ),
      0
    )
  ),
  rating_count = (
    select count(*)
    from public.agreement_ratings
    where rated_user_id = p.id
  ),
  rating_avg = (
    select avg(score)::double precision
    from public.agreement_ratings
    where rated_user_id = p.id
  ),
  offer_count = (
    select count(*)
    from public.offers
    where owner_id = p.id
      and status = 'open'
  );

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

alter table public.profiles enable row level security;
alter table public.offers enable row level security;
alter table public.registered_charities enable row level security;
alter table public.donation_offset_pools enable row level security;
alter table public.donation_offset_offers enable row level security;
alter table public.interests enable row level security;
alter table public.guest_interests enable row level security;
alter table public.donation_offset_matches enable row level security;
alter table public.agreements enable row level security;
alter table public.agreement_ratings enable row level security;
alter table public.profile_payment_accounts enable row level security;
alter table public.agreement_payments enable row level security;
alter table public.agreement_payment_schedules enable row level security;
alter table public.agreement_events enable row level security;
alter table public.agreement_evidence_items enable row level security;
alter table public.agreement_review_cases enable row level security;
alter table public.profile_verification_badges enable row level security;
alter table public.moral_trade_provenance_agents enable row level security;
alter table public.moral_trade_evidence_artifacts enable row level security;
alter table public.moral_trade_evidence_claims enable row level security;
alter table public.moral_trade_evidence_claim_artifacts enable row level security;
alter table public.moral_trade_external_entity_references enable row level security;
alter table public.moral_trade_review_decisions enable row level security;
alter table public.moral_trade_provenance_activities enable row level security;
alter table public.moral_trade_traceability_events enable row level security;
alter table public.moral_trade_state_transition_events enable row level security;
alter table public.email_outbox enable row level security;
alter table public.saved_searches enable row level security;
alter table public.user_follows enable row level security;
alter table public.offer_recommendations enable row level security;
alter table public.offer_comments enable row level security;
alter table public.comment_votes enable row level security;
alter table public.offer_carts enable row level security;
alter table public.wish_profiles enable row level security;
alter table public.wish_entries enable row level security;
alter table public.match_suggestions enable row level security;
alter table public.match_consents enable row level security;
alter table public.wish_notifications enable row level security;
alter table public.profile_sources enable row level security;
alter table public.clarification_questions enable row level security;
alter table public.background_match_runs enable row level security;
alter table public.match_audit_events enable row level security;
alter table public.match_reports enable row level security;
alter table public.match_explanation_snapshots enable row level security;
alter table public.background_query_events enable row level security;
alter table public.background_notification_preferences enable row level security;
alter table public.profile_data_right_requests enable row level security;
alter table public.match_concierge_requests enable row level security;
alter table public.match_concierge_events enable row level security;
alter table public.network_invites enable row level security;
alter table public.personal_delegates enable row level security;
alter table public.source_connections enable row level security;
alter table public.profile_syntheses enable row level security;
alter table public.background_intent_claims enable row level security;
alter table public.helper_strategies enable row level security;
alter table public.helper_runs enable row level security;
alter table public.match_introduction_plans enable row level security;
alter table public.match_introduction_tasks enable row level security;
alter table public.privacy_grants enable row level security;
alter table public.privacy_access_requests enable row level security;
alter table public.risk_signals enable row level security;
alter table public.brokerage_bounties enable row level security;
alter table public.collectives enable row level security;
alter table public.collective_members enable row level security;
alter table public.collective_decisions enable row level security;
alter table public.collective_decision_responses enable row level security;
alter table public.impact_contributions enable row level security;
alter table public.priority_correction_cycles enable row level security;
alter table public.priority_correction_member_snapshots enable row level security;
alter table public.priority_correction_arbiter_assignments enable row level security;
alter table public.priority_specific_action_submissions enable row level security;
alter table public.priority_specific_action_positions enable row level security;
alter table public.priority_specific_action_feedback enable row level security;
alter table public.priority_cause_area_allocations enable row level security;
alter table public.priority_cause_area_positions enable row level security;
alter table public.priority_cause_area_feedback enable row level security;

grant select on public.wish_profile_previews to anon, authenticated;

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
  or public.viewer_has_interest_for_offer(id)
  or public.viewer_has_offer_in_cart(id)
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

drop policy if exists "registered_charities_public_read" on public.registered_charities;
create policy "registered_charities_public_read"
on public.registered_charities
for select
to anon, authenticated
using (true);

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

drop policy if exists "guest_interests_select_relevant" on public.guest_interests;
create policy "guest_interests_select_relevant"
on public.guest_interests
for select
to authenticated
using (
  claimed_by_profile_id = (select auth.uid())
  or exists (
    select 1
    from public.offers
    where offers.id = guest_interests.offer_id
      and offers.owner_id = (select auth.uid())
  )
);

drop policy if exists "guest_interests_insert_public" on public.guest_interests;
-- No insert policy is intentionally defined for guest_interests.
-- New offer contact paths require sign-in and write to public.interests.

drop policy if exists "guest_interests_claim_own_email" on public.guest_interests;
create policy "guest_interests_claim_own_email"
on public.guest_interests
for update
to authenticated
using (
  claimed_by_profile_id = (select auth.uid())
  or (
    claimed_by_profile_id is null
    and lower(contact_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  )
)
with check (
  claimed_by_profile_id = (select auth.uid())
  and lower(contact_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
);

drop policy if exists "guest_interests_update_owner" on public.guest_interests;
create policy "guest_interests_update_owner"
on public.guest_interests
for update
to authenticated
using (
  exists (
    select 1
    from public.offers
    where offers.id = guest_interests.offer_id
      and offers.owner_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.offers
    where offers.id = guest_interests.offer_id
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

drop policy if exists "profile_payment_accounts_select_own" on public.profile_payment_accounts;
create policy "profile_payment_accounts_select_own"
on public.profile_payment_accounts
for select
to authenticated
using (profile_id = (select auth.uid()));

drop policy if exists "profile_payment_accounts_insert_own" on public.profile_payment_accounts;
create policy "profile_payment_accounts_insert_own"
on public.profile_payment_accounts
for insert
to authenticated
with check (profile_id = (select auth.uid()));

drop policy if exists "profile_payment_accounts_update_own" on public.profile_payment_accounts;
create policy "profile_payment_accounts_update_own"
on public.profile_payment_accounts
for update
to authenticated
using (profile_id = (select auth.uid()))
with check (profile_id = (select auth.uid()));

drop policy if exists "agreement_payments_select_participants" on public.agreement_payments;
create policy "agreement_payments_select_participants"
on public.agreement_payments
for select
to authenticated
using (
  payer_id = (select auth.uid())
  or payee_id = (select auth.uid())
);

drop policy if exists "agreement_payments_insert_participants" on public.agreement_payments;
create policy "agreement_payments_insert_participants"
on public.agreement_payments
for insert
to authenticated
with check (
  payer_id = (select auth.uid())
  or payee_id = (select auth.uid())
);

drop policy if exists "agreement_payments_update_participants" on public.agreement_payments;
create policy "agreement_payments_update_participants"
on public.agreement_payments
for update
to authenticated
using (
  payer_id = (select auth.uid())
  or payee_id = (select auth.uid())
)
with check (
  payer_id = (select auth.uid())
  or payee_id = (select auth.uid())
);

drop policy if exists "agreement_payment_schedules_select_participants" on public.agreement_payment_schedules;
create policy "agreement_payment_schedules_select_participants"
on public.agreement_payment_schedules
for select
to authenticated
using (
  payer_id = (select auth.uid())
  or payee_id = (select auth.uid())
);

drop policy if exists "agreement_payment_schedules_insert_participants" on public.agreement_payment_schedules;
create policy "agreement_payment_schedules_insert_participants"
on public.agreement_payment_schedules
for insert
to authenticated
with check (
  payer_id = (select auth.uid())
  or payee_id = (select auth.uid())
);

drop policy if exists "agreement_payment_schedules_update_participants" on public.agreement_payment_schedules;
create policy "agreement_payment_schedules_update_participants"
on public.agreement_payment_schedules
for update
to authenticated
using (
  payer_id = (select auth.uid())
  or payee_id = (select auth.uid())
)
with check (
  payer_id = (select auth.uid())
  or payee_id = (select auth.uid())
);

drop policy if exists "agreement_events_select_participants" on public.agreement_events;
create policy "agreement_events_select_participants"
on public.agreement_events
for select
to authenticated
using (
  exists (
    select 1
    from public.agreements
    where agreements.id = agreement_events.agreement_id
      and (
        agreements.proposer_id = (select auth.uid())
        or agreements.responder_id = (select auth.uid())
      )
  )
);

drop policy if exists "agreement_events_insert_participants" on public.agreement_events;
create policy "agreement_events_insert_participants"
on public.agreement_events
for insert
to authenticated
with check (
  actor_id = (select auth.uid())
  and exists (
    select 1
    from public.agreements
    where agreements.id = agreement_events.agreement_id
      and (
        agreements.proposer_id = (select auth.uid())
        or agreements.responder_id = (select auth.uid())
      )
  )
);

drop policy if exists "agreement_evidence_items_select_participants" on public.agreement_evidence_items;
create policy "agreement_evidence_items_select_participants"
on public.agreement_evidence_items
for select
to authenticated
using (
  exists (
    select 1
    from public.agreements
    where agreements.id = agreement_evidence_items.agreement_id
      and (
        agreements.proposer_id = (select auth.uid())
        or agreements.responder_id = (select auth.uid())
      )
  )
);

drop policy if exists "agreement_evidence_items_insert_participants" on public.agreement_evidence_items;
create policy "agreement_evidence_items_insert_participants"
on public.agreement_evidence_items
for insert
to authenticated
with check (
  uploader_id = (select auth.uid())
  and exists (
    select 1
    from public.agreements
    where agreements.id = agreement_evidence_items.agreement_id
      and (
        agreements.proposer_id = (select auth.uid())
        or agreements.responder_id = (select auth.uid())
      )
  )
);

drop policy if exists "agreement_evidence_items_update_participants" on public.agreement_evidence_items;
create policy "agreement_evidence_items_update_participants"
on public.agreement_evidence_items
for update
to authenticated
using (
  exists (
    select 1
    from public.agreements
    where agreements.id = agreement_evidence_items.agreement_id
      and (
        agreements.proposer_id = (select auth.uid())
        or agreements.responder_id = (select auth.uid())
      )
  )
)
with check (
  exists (
    select 1
    from public.agreements
    where agreements.id = agreement_evidence_items.agreement_id
      and (
        agreements.proposer_id = (select auth.uid())
        or agreements.responder_id = (select auth.uid())
      )
  )
);

drop policy if exists "agreement_review_cases_select_participants" on public.agreement_review_cases;
create policy "agreement_review_cases_select_participants"
on public.agreement_review_cases
for select
to authenticated
using (
  exists (
    select 1
    from public.agreements
    where agreements.id = agreement_review_cases.agreement_id
      and (
        agreements.proposer_id = (select auth.uid())
        or agreements.responder_id = (select auth.uid())
      )
  )
);

drop policy if exists "agreement_review_cases_insert_participants" on public.agreement_review_cases;
create policy "agreement_review_cases_insert_participants"
on public.agreement_review_cases
for insert
to authenticated
with check (
  opened_by = (select auth.uid())
  and exists (
    select 1
    from public.agreements
    where agreements.id = agreement_review_cases.agreement_id
      and (
        agreements.proposer_id = (select auth.uid())
        or agreements.responder_id = (select auth.uid())
      )
  )
);

drop policy if exists "agreement_review_cases_update_participants" on public.agreement_review_cases;
create policy "agreement_review_cases_update_participants"
on public.agreement_review_cases
for update
to authenticated
using (
  exists (
    select 1
    from public.agreements
    where agreements.id = agreement_review_cases.agreement_id
      and (
        agreements.proposer_id = (select auth.uid())
        or agreements.responder_id = (select auth.uid())
      )
  )
)
with check (
  exists (
    select 1
    from public.agreements
    where agreements.id = agreement_review_cases.agreement_id
      and (
        agreements.proposer_id = (select auth.uid())
        or agreements.responder_id = (select auth.uid())
      )
  )
);

drop policy if exists "profile_verification_badges_select_relevant" on public.profile_verification_badges;
create policy "profile_verification_badges_select_relevant"
on public.profile_verification_badges
for select
to anon, authenticated
using (
  status = 'verified'
  or profile_id = (select auth.uid())
);

drop policy if exists "moral_trade_provenance_agents_select_visible" on public.moral_trade_provenance_agents;
create policy "moral_trade_provenance_agents_select_visible"
on public.moral_trade_provenance_agents
for select
to anon, authenticated
using (
  redaction_level = 'public'
  or owner_profile_id = (select auth.uid())
);

drop policy if exists "moral_trade_provenance_agents_insert_owner" on public.moral_trade_provenance_agents;
create policy "moral_trade_provenance_agents_insert_owner"
on public.moral_trade_provenance_agents
for insert
to authenticated
with check (owner_profile_id = (select auth.uid()));

drop policy if exists "moral_trade_evidence_artifacts_select_visible" on public.moral_trade_evidence_artifacts;
create policy "moral_trade_evidence_artifacts_select_visible"
on public.moral_trade_evidence_artifacts
for select
to anon, authenticated
using (
  redaction_level = 'public'
  or owner_profile_id = (select auth.uid())
);

drop policy if exists "moral_trade_evidence_artifacts_insert_owner" on public.moral_trade_evidence_artifacts;
create policy "moral_trade_evidence_artifacts_insert_owner"
on public.moral_trade_evidence_artifacts
for insert
to authenticated
with check (
  owner_profile_id = (select auth.uid())
  and (
    submitted_by_agent_id is null
    or exists (
      select 1
      from public.moral_trade_provenance_agents
      where moral_trade_provenance_agents.id = moral_trade_evidence_artifacts.submitted_by_agent_id
        and moral_trade_provenance_agents.owner_profile_id = (select auth.uid())
    )
  )
);

drop policy if exists "moral_trade_evidence_claims_select_visible" on public.moral_trade_evidence_claims;
create policy "moral_trade_evidence_claims_select_visible"
on public.moral_trade_evidence_claims
for select
to anon, authenticated
using (
  redaction_level = 'public'
  or owner_profile_id = (select auth.uid())
);

drop policy if exists "moral_trade_evidence_claims_insert_owner" on public.moral_trade_evidence_claims;
create policy "moral_trade_evidence_claims_insert_owner"
on public.moral_trade_evidence_claims
for insert
to authenticated
with check (owner_profile_id = (select auth.uid()));

drop policy if exists "moral_trade_evidence_claim_artifacts_select_visible" on public.moral_trade_evidence_claim_artifacts;
create policy "moral_trade_evidence_claim_artifacts_select_visible"
on public.moral_trade_evidence_claim_artifacts
for select
to anon, authenticated
using (
  owner_profile_id = (select auth.uid())
  or (
    exists (
      select 1
      from public.moral_trade_evidence_claims
      where moral_trade_evidence_claims.id = moral_trade_evidence_claim_artifacts.claim_id
        and moral_trade_evidence_claims.redaction_level = 'public'
    )
    and exists (
      select 1
      from public.moral_trade_evidence_artifacts
      where moral_trade_evidence_artifacts.id = moral_trade_evidence_claim_artifacts.artifact_id
        and moral_trade_evidence_artifacts.redaction_level = 'public'
    )
  )
);

drop policy if exists "moral_trade_evidence_claim_artifacts_insert_owner" on public.moral_trade_evidence_claim_artifacts;
create policy "moral_trade_evidence_claim_artifacts_insert_owner"
on public.moral_trade_evidence_claim_artifacts
for insert
to authenticated
with check (
  owner_profile_id = (select auth.uid())
  and exists (
    select 1
    from public.moral_trade_evidence_claims
    where moral_trade_evidence_claims.id = moral_trade_evidence_claim_artifacts.claim_id
      and moral_trade_evidence_claims.owner_profile_id = (select auth.uid())
  )
  and exists (
    select 1
    from public.moral_trade_evidence_artifacts
    where moral_trade_evidence_artifacts.id = moral_trade_evidence_claim_artifacts.artifact_id
      and moral_trade_evidence_artifacts.owner_profile_id = (select auth.uid())
  )
);

drop policy if exists "moral_trade_external_entity_references_select_visible" on public.moral_trade_external_entity_references;
create policy "moral_trade_external_entity_references_select_visible"
on public.moral_trade_external_entity_references
for select
to anon, authenticated
using (
  redaction_level = 'public'
  or owner_profile_id = (select auth.uid())
);

drop policy if exists "moral_trade_external_entity_references_insert_owner" on public.moral_trade_external_entity_references;
create policy "moral_trade_external_entity_references_insert_owner"
on public.moral_trade_external_entity_references
for insert
to authenticated
with check (owner_profile_id = (select auth.uid()));

drop policy if exists "moral_trade_review_decisions_select_visible" on public.moral_trade_review_decisions;
create policy "moral_trade_review_decisions_select_visible"
on public.moral_trade_review_decisions
for select
to anon, authenticated
using (
  redaction_level = 'public'
  or owner_profile_id = (select auth.uid())
);

drop policy if exists "moral_trade_review_decisions_insert_owner" on public.moral_trade_review_decisions;
create policy "moral_trade_review_decisions_insert_owner"
on public.moral_trade_review_decisions
for insert
to authenticated
with check (
  owner_profile_id = (select auth.uid())
  and (
    reviewer_agent_id is null
    or exists (
      select 1
      from public.moral_trade_provenance_agents
      where moral_trade_provenance_agents.id = moral_trade_review_decisions.reviewer_agent_id
        and moral_trade_provenance_agents.owner_profile_id = (select auth.uid())
    )
  )
);

drop policy if exists "moral_trade_provenance_activities_select_visible" on public.moral_trade_provenance_activities;
create policy "moral_trade_provenance_activities_select_visible"
on public.moral_trade_provenance_activities
for select
to anon, authenticated
using (
  redaction_level = 'public'
  or owner_profile_id = (select auth.uid())
);

drop policy if exists "moral_trade_provenance_activities_insert_owner" on public.moral_trade_provenance_activities;
create policy "moral_trade_provenance_activities_insert_owner"
on public.moral_trade_provenance_activities
for insert
to authenticated
with check (owner_profile_id = (select auth.uid()));

drop policy if exists "moral_trade_traceability_events_select_visible" on public.moral_trade_traceability_events;
create policy "moral_trade_traceability_events_select_visible"
on public.moral_trade_traceability_events
for select
to anon, authenticated
using (
  redaction_level = 'public'
  or owner_profile_id = (select auth.uid())
);

drop policy if exists "moral_trade_traceability_events_insert_owner" on public.moral_trade_traceability_events;
create policy "moral_trade_traceability_events_insert_owner"
on public.moral_trade_traceability_events
for insert
to authenticated
with check (
  owner_profile_id = (select auth.uid())
  and (
    external_entity_reference_id is null
    or exists (
      select 1
      from public.moral_trade_external_entity_references
      where moral_trade_external_entity_references.id = moral_trade_traceability_events.external_entity_reference_id
        and moral_trade_external_entity_references.owner_profile_id = (select auth.uid())
    )
  )
);

drop policy if exists "moral_trade_state_transition_events_select_visible" on public.moral_trade_state_transition_events;
create policy "moral_trade_state_transition_events_select_visible"
on public.moral_trade_state_transition_events
for select
to anon, authenticated
using (
  redaction_level = 'public'
  or owner_profile_id = (select auth.uid())
);

drop policy if exists "moral_trade_state_transition_events_insert_owner" on public.moral_trade_state_transition_events;
create policy "moral_trade_state_transition_events_insert_owner"
on public.moral_trade_state_transition_events
for insert
to authenticated
with check (
  owner_profile_id = (select auth.uid())
  and (
    actor_agent_id is null
    or exists (
      select 1
      from public.moral_trade_provenance_agents
      where moral_trade_provenance_agents.id = moral_trade_state_transition_events.actor_agent_id
        and moral_trade_provenance_agents.owner_profile_id = (select auth.uid())
    )
  )
);

-- Provenance tables are append-only by policy: corrections should create new
-- activities, traceability events, review decisions, or state transition rows.

drop policy if exists "email_outbox_select_own" on public.email_outbox;
create policy "email_outbox_select_own"
on public.email_outbox
for select
to authenticated
using (profile_id = (select auth.uid()));

drop policy if exists "email_outbox_insert_own" on public.email_outbox;
create policy "email_outbox_insert_own"
on public.email_outbox
for insert
to authenticated
with check (profile_id is null or profile_id = (select auth.uid()));

drop policy if exists "saved_searches_select_own" on public.saved_searches;
create policy "saved_searches_select_own"
on public.saved_searches
for select
to authenticated
using (profile_id = (select auth.uid()));

drop policy if exists "saved_searches_insert_own" on public.saved_searches;
create policy "saved_searches_insert_own"
on public.saved_searches
for insert
to authenticated
with check (profile_id = (select auth.uid()));

drop policy if exists "saved_searches_update_own" on public.saved_searches;
create policy "saved_searches_update_own"
on public.saved_searches
for update
to authenticated
using (profile_id = (select auth.uid()))
with check (profile_id = (select auth.uid()));

drop policy if exists "saved_searches_delete_own" on public.saved_searches;
create policy "saved_searches_delete_own"
on public.saved_searches
for delete
to authenticated
using (profile_id = (select auth.uid()));

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

drop policy if exists "wish_profiles_select_own" on public.wish_profiles;
create policy "wish_profiles_select_own"
on public.wish_profiles
for select
to authenticated
using (profile_id = (select auth.uid()));

drop policy if exists "wish_profiles_insert_own" on public.wish_profiles;
create policy "wish_profiles_insert_own"
on public.wish_profiles
for insert
to authenticated
with check (profile_id = (select auth.uid()));

drop policy if exists "wish_profiles_update_own" on public.wish_profiles;
create policy "wish_profiles_update_own"
on public.wish_profiles
for update
to authenticated
using (profile_id = (select auth.uid()))
with check (profile_id = (select auth.uid()));

drop policy if exists "wish_entries_select_own_or_preview" on public.wish_entries;
create policy "wish_entries_select_own_or_preview"
on public.wish_entries
for select
to authenticated
using (
  profile_id = (select auth.uid())
  or (
    visibility = 'preview'
    and safety_status = 'clear'
    and public.wish_profile_is_previewable(profile_id)
  )
);

drop policy if exists "wish_entries_insert_own" on public.wish_entries;
create policy "wish_entries_insert_own"
on public.wish_entries
for insert
to authenticated
with check (profile_id = (select auth.uid()));

drop policy if exists "wish_entries_update_own" on public.wish_entries;
create policy "wish_entries_update_own"
on public.wish_entries
for update
to authenticated
using (profile_id = (select auth.uid()))
with check (profile_id = (select auth.uid()));

drop policy if exists "wish_entries_delete_own" on public.wish_entries;
create policy "wish_entries_delete_own"
on public.wish_entries
for delete
to authenticated
using (profile_id = (select auth.uid()));

drop policy if exists "match_suggestions_select_participants" on public.match_suggestions;
create policy "match_suggestions_select_participants"
on public.match_suggestions
for select
to authenticated
using (
  public.viewer_can_see_match_identity(id)
);

drop policy if exists "match_suggestions_insert_participants" on public.match_suggestions;
create policy "match_suggestions_insert_participants"
on public.match_suggestions
for insert
to authenticated
with check (
  profile_a_id = (select auth.uid())
  or profile_b_id = (select auth.uid())
);

drop policy if exists "match_suggestions_update_participants" on public.match_suggestions;
create policy "match_suggestions_update_participants"
on public.match_suggestions
for update
to authenticated
using (
  public.viewer_participates_in_match(id)
)
with check (
  public.viewer_participates_in_match(id)
  and status = 'dismissed'
  and identity_revealed = false
);

drop policy if exists "match_consents_select_match_participants" on public.match_consents;
create policy "match_consents_select_match_participants"
on public.match_consents
for select
to authenticated
using (
  profile_id = (select auth.uid())
  or public.viewer_can_see_match_identity(match_id)
);

drop policy if exists "match_consents_insert_own" on public.match_consents;
create policy "match_consents_insert_own"
on public.match_consents
for insert
to authenticated
with check (
  profile_id = (select auth.uid())
  and public.viewer_participates_in_match(match_id)
);

drop policy if exists "match_consents_update_own" on public.match_consents;
create policy "match_consents_update_own"
on public.match_consents
for update
to authenticated
using (profile_id = (select auth.uid()))
with check (profile_id = (select auth.uid()));

drop policy if exists "wish_notifications_select_own" on public.wish_notifications;
create policy "wish_notifications_select_own"
on public.wish_notifications
for select
to authenticated
using (profile_id = (select auth.uid()));

drop policy if exists "wish_notifications_insert_relevant" on public.wish_notifications;
create policy "wish_notifications_insert_relevant"
on public.wish_notifications
for insert
to authenticated
with check (
  profile_id = (select auth.uid())
  or (
    match_id is not null
    and public.viewer_participates_in_match(match_id)
    and public.profile_participates_in_match(match_id, profile_id)
  )
);

drop policy if exists "wish_notifications_update_own" on public.wish_notifications;
create policy "wish_notifications_update_own"
on public.wish_notifications
for update
to authenticated
using (profile_id = (select auth.uid()))
with check (profile_id = (select auth.uid()));

drop policy if exists "profile_sources_select_own" on public.profile_sources;
create policy "profile_sources_select_own"
on public.profile_sources
for select
to authenticated
using (profile_id = (select auth.uid()));

drop policy if exists "profile_sources_insert_own" on public.profile_sources;
create policy "profile_sources_insert_own"
on public.profile_sources
for insert
to authenticated
with check (profile_id = (select auth.uid()));

drop policy if exists "profile_sources_update_own" on public.profile_sources;
create policy "profile_sources_update_own"
on public.profile_sources
for update
to authenticated
using (profile_id = (select auth.uid()))
with check (profile_id = (select auth.uid()));

drop policy if exists "profile_sources_delete_own" on public.profile_sources;
create policy "profile_sources_delete_own"
on public.profile_sources
for delete
to authenticated
using (profile_id = (select auth.uid()));

drop policy if exists "clarification_questions_select_own" on public.clarification_questions;
create policy "clarification_questions_select_own"
on public.clarification_questions
for select
to authenticated
using (profile_id = (select auth.uid()));

drop policy if exists "clarification_questions_insert_own" on public.clarification_questions;
create policy "clarification_questions_insert_own"
on public.clarification_questions
for insert
to authenticated
with check (profile_id = (select auth.uid()));

drop policy if exists "clarification_questions_update_own" on public.clarification_questions;
create policy "clarification_questions_update_own"
on public.clarification_questions
for update
to authenticated
using (profile_id = (select auth.uid()))
with check (profile_id = (select auth.uid()));

drop policy if exists "clarification_questions_delete_own" on public.clarification_questions;
create policy "clarification_questions_delete_own"
on public.clarification_questions
for delete
to authenticated
using (profile_id = (select auth.uid()));

drop policy if exists "background_match_runs_select_own" on public.background_match_runs;
create policy "background_match_runs_select_own"
on public.background_match_runs
for select
to authenticated
using (profile_id = (select auth.uid()));

drop policy if exists "background_match_runs_insert_own" on public.background_match_runs;
create policy "background_match_runs_insert_own"
on public.background_match_runs
for insert
to authenticated
with check (profile_id = (select auth.uid()));

drop policy if exists "background_match_runs_update_own" on public.background_match_runs;
create policy "background_match_runs_update_own"
on public.background_match_runs
for update
to authenticated
using (profile_id = (select auth.uid()))
with check (profile_id = (select auth.uid()));

drop policy if exists "match_explanation_snapshots_select_own" on public.match_explanation_snapshots;
create policy "match_explanation_snapshots_select_own"
on public.match_explanation_snapshots
for select
to authenticated
using (
  profile_id = (select auth.uid())
  and public.viewer_participates_in_match(match_id)
);

drop policy if exists "match_explanation_snapshots_insert_own" on public.match_explanation_snapshots;
create policy "match_explanation_snapshots_insert_own"
on public.match_explanation_snapshots
for insert
to authenticated
with check (
  profile_id = (select auth.uid())
  and public.viewer_participates_in_match(match_id)
);

drop policy if exists "background_query_events_select_own" on public.background_query_events;
create policy "background_query_events_select_own"
on public.background_query_events
for select
to authenticated
using (profile_id = (select auth.uid()));

drop policy if exists "background_query_events_insert_own" on public.background_query_events;
create policy "background_query_events_insert_own"
on public.background_query_events
for insert
to authenticated
with check (profile_id = (select auth.uid()));

drop policy if exists "background_notification_preferences_select_own" on public.background_notification_preferences;
create policy "background_notification_preferences_select_own"
on public.background_notification_preferences
for select
to authenticated
using (profile_id = (select auth.uid()));

drop policy if exists "background_notification_preferences_insert_own" on public.background_notification_preferences;
create policy "background_notification_preferences_insert_own"
on public.background_notification_preferences
for insert
to authenticated
with check (profile_id = (select auth.uid()));

drop policy if exists "background_notification_preferences_update_own" on public.background_notification_preferences;
create policy "background_notification_preferences_update_own"
on public.background_notification_preferences
for update
to authenticated
using (profile_id = (select auth.uid()))
with check (profile_id = (select auth.uid()));

drop policy if exists "profile_data_right_requests_select_own" on public.profile_data_right_requests;
create policy "profile_data_right_requests_select_own"
on public.profile_data_right_requests
for select
to authenticated
using (profile_id = (select auth.uid()));

drop policy if exists "profile_data_right_requests_insert_own" on public.profile_data_right_requests;
create policy "profile_data_right_requests_insert_own"
on public.profile_data_right_requests
for insert
to authenticated
with check (profile_id = (select auth.uid()));

drop policy if exists "profile_data_right_requests_update_own_open" on public.profile_data_right_requests;
create policy "profile_data_right_requests_update_own_open"
on public.profile_data_right_requests
for update
to authenticated
using (
  profile_id = (select auth.uid())
  and status in ('open', 'cancelled')
)
with check (
  profile_id = (select auth.uid())
  and status in ('open', 'cancelled')
);

drop policy if exists "match_audit_events_select_participants" on public.match_audit_events;
create policy "match_audit_events_select_participants"
on public.match_audit_events
for select
to authenticated
using (
  actor_profile_id = (select auth.uid())
  or (
    match_id is not null
    and public.viewer_participates_in_match(match_id)
  )
);

drop policy if exists "match_audit_events_insert_participants" on public.match_audit_events;
create policy "match_audit_events_insert_participants"
on public.match_audit_events
for insert
to authenticated
with check (
  actor_profile_id = (select auth.uid())
  and (
    match_id is null
    or public.viewer_participates_in_match(match_id)
  )
);

drop policy if exists "match_reports_select_own" on public.match_reports;
create policy "match_reports_select_own"
on public.match_reports
for select
to authenticated
using (reporter_profile_id = (select auth.uid()));

drop policy if exists "match_reports_insert_own_participant" on public.match_reports;
create policy "match_reports_insert_own_participant"
on public.match_reports
for insert
to authenticated
with check (
  reporter_profile_id = (select auth.uid())
  and public.viewer_participates_in_match(match_id)
);

drop policy if exists "network_invites_select_own" on public.network_invites;
create policy "network_invites_select_own"
on public.network_invites
for select
to authenticated
using (profile_id = (select auth.uid()));

drop policy if exists "network_invites_insert_own" on public.network_invites;
create policy "network_invites_insert_own"
on public.network_invites
for insert
to authenticated
with check (profile_id = (select auth.uid()));

drop policy if exists "network_invites_update_own" on public.network_invites;
create policy "network_invites_update_own"
on public.network_invites
for update
to authenticated
using (profile_id = (select auth.uid()))
with check (profile_id = (select auth.uid()));

drop policy if exists "network_invites_delete_own" on public.network_invites;
create policy "network_invites_delete_own"
on public.network_invites
for delete
to authenticated
using (profile_id = (select auth.uid()));

drop policy if exists "personal_delegates_select_own" on public.personal_delegates;
create policy "personal_delegates_select_own"
on public.personal_delegates
for select
to authenticated
using (profile_id = (select auth.uid()));

drop policy if exists "personal_delegates_insert_own" on public.personal_delegates;
create policy "personal_delegates_insert_own"
on public.personal_delegates
for insert
to authenticated
with check (profile_id = (select auth.uid()));

drop policy if exists "personal_delegates_update_own" on public.personal_delegates;
create policy "personal_delegates_update_own"
on public.personal_delegates
for update
to authenticated
using (profile_id = (select auth.uid()))
with check (profile_id = (select auth.uid()));

drop policy if exists "source_connections_select_own" on public.source_connections;
create policy "source_connections_select_own"
on public.source_connections
for select
to authenticated
using (profile_id = (select auth.uid()));

drop policy if exists "source_connections_insert_own" on public.source_connections;
create policy "source_connections_insert_own"
on public.source_connections
for insert
to authenticated
with check (profile_id = (select auth.uid()));

drop policy if exists "source_connections_update_own" on public.source_connections;
create policy "source_connections_update_own"
on public.source_connections
for update
to authenticated
using (profile_id = (select auth.uid()))
with check (profile_id = (select auth.uid()));

drop policy if exists "source_connections_delete_own" on public.source_connections;
create policy "source_connections_delete_own"
on public.source_connections
for delete
to authenticated
using (profile_id = (select auth.uid()));

drop policy if exists "profile_syntheses_select_own" on public.profile_syntheses;
create policy "profile_syntheses_select_own"
on public.profile_syntheses
for select
to authenticated
using (profile_id = (select auth.uid()));

drop policy if exists "profile_syntheses_insert_own" on public.profile_syntheses;
create policy "profile_syntheses_insert_own"
on public.profile_syntheses
for insert
to authenticated
with check (profile_id = (select auth.uid()));

drop policy if exists "profile_syntheses_update_own" on public.profile_syntheses;
create policy "profile_syntheses_update_own"
on public.profile_syntheses
for update
to authenticated
using (profile_id = (select auth.uid()))
with check (profile_id = (select auth.uid()));

drop policy if exists "background_intent_claims_select_own" on public.background_intent_claims;
create policy "background_intent_claims_select_own"
on public.background_intent_claims
for select
to authenticated
using (profile_id = (select auth.uid()));

drop policy if exists "background_intent_claims_insert_own" on public.background_intent_claims;
create policy "background_intent_claims_insert_own"
on public.background_intent_claims
for insert
to authenticated
with check (profile_id = (select auth.uid()));

drop policy if exists "background_intent_claims_update_own" on public.background_intent_claims;
create policy "background_intent_claims_update_own"
on public.background_intent_claims
for update
to authenticated
using (profile_id = (select auth.uid()))
with check (profile_id = (select auth.uid()));

drop policy if exists "background_intent_claims_delete_own" on public.background_intent_claims;
create policy "background_intent_claims_delete_own"
on public.background_intent_claims
for delete
to authenticated
using (profile_id = (select auth.uid()));

drop policy if exists "helper_strategies_select_own" on public.helper_strategies;
create policy "helper_strategies_select_own"
on public.helper_strategies
for select
to authenticated
using (profile_id = (select auth.uid()));

drop policy if exists "helper_strategies_insert_own" on public.helper_strategies;
create policy "helper_strategies_insert_own"
on public.helper_strategies
for insert
to authenticated
with check (profile_id = (select auth.uid()));

drop policy if exists "helper_strategies_update_own" on public.helper_strategies;
create policy "helper_strategies_update_own"
on public.helper_strategies
for update
to authenticated
using (profile_id = (select auth.uid()))
with check (profile_id = (select auth.uid()));

drop policy if exists "helper_runs_select_own" on public.helper_runs;
create policy "helper_runs_select_own"
on public.helper_runs
for select
to authenticated
using (profile_id = (select auth.uid()));

drop policy if exists "helper_runs_insert_own" on public.helper_runs;
create policy "helper_runs_insert_own"
on public.helper_runs
for insert
to authenticated
with check (profile_id = (select auth.uid()));

drop policy if exists "match_introduction_plans_select_participants" on public.match_introduction_plans;
create policy "match_introduction_plans_select_participants"
on public.match_introduction_plans
for select
to authenticated
using (
  profile_id = (select auth.uid())
  or counterparty_id = (select auth.uid())
);

drop policy if exists "match_introduction_plans_insert_participants" on public.match_introduction_plans;
create policy "match_introduction_plans_insert_participants"
on public.match_introduction_plans
for insert
to authenticated
with check (
  profile_id = (select auth.uid())
  and public.viewer_participates_in_match(match_id)
);

drop policy if exists "match_introduction_plans_update_own" on public.match_introduction_plans;
create policy "match_introduction_plans_update_own"
on public.match_introduction_plans
for update
to authenticated
using (profile_id = (select auth.uid()))
with check (profile_id = (select auth.uid()));

drop policy if exists "match_introduction_tasks_select_own" on public.match_introduction_tasks;
create policy "match_introduction_tasks_select_own"
on public.match_introduction_tasks
for select
to authenticated
using (profile_id = (select auth.uid()));

drop policy if exists "match_introduction_tasks_update_own" on public.match_introduction_tasks;
create policy "match_introduction_tasks_update_own"
on public.match_introduction_tasks
for update
to authenticated
using (profile_id = (select auth.uid()))
with check (profile_id = (select auth.uid()));

drop policy if exists "privacy_grants_select_relevant" on public.privacy_grants;
create policy "privacy_grants_select_relevant"
on public.privacy_grants
for select
to authenticated
using (
  profile_id = (select auth.uid())
  or (
    counterparty_id = (select auth.uid())
    and status = 'granted'
  )
);

drop policy if exists "privacy_grants_insert_own" on public.privacy_grants;
create policy "privacy_grants_insert_own"
on public.privacy_grants
for insert
to authenticated
with check (profile_id = (select auth.uid()));

drop policy if exists "privacy_grants_update_own" on public.privacy_grants;
create policy "privacy_grants_update_own"
on public.privacy_grants
for update
to authenticated
using (profile_id = (select auth.uid()))
with check (profile_id = (select auth.uid()));

drop policy if exists "privacy_access_requests_select_relevant" on public.privacy_access_requests;
create policy "privacy_access_requests_select_relevant"
on public.privacy_access_requests
for select
to authenticated
using (
  owner_profile_id = (select auth.uid())
  or requester_profile_id = (select auth.uid())
);

drop policy if exists "privacy_access_requests_insert_requester" on public.privacy_access_requests;
create policy "privacy_access_requests_insert_requester"
on public.privacy_access_requests
for insert
to authenticated
with check (
  requester_profile_id = (select auth.uid())
  and (
    match_id is null
    or public.profile_participates_in_match(match_id, (select auth.uid()))
  )
);

drop policy if exists "privacy_access_requests_update_relevant" on public.privacy_access_requests;
create policy "privacy_access_requests_update_relevant"
on public.privacy_access_requests
for update
to authenticated
using (
  owner_profile_id = (select auth.uid())
  or requester_profile_id = (select auth.uid())
)
with check (
  owner_profile_id = (select auth.uid())
  or requester_profile_id = (select auth.uid())
);

drop policy if exists "match_concierge_requests_select_relevant" on public.match_concierge_requests;
create policy "match_concierge_requests_select_relevant"
on public.match_concierge_requests
for select
to authenticated
using (
  requester_profile_id = (select auth.uid())
  or target_profile_id = (select auth.uid())
);

drop policy if exists "match_concierge_requests_insert_requester" on public.match_concierge_requests;
create policy "match_concierge_requests_insert_requester"
on public.match_concierge_requests
for insert
to authenticated
with check (
  requester_profile_id = (select auth.uid())
);

drop policy if exists "match_concierge_requests_update_requester_open" on public.match_concierge_requests;
create policy "match_concierge_requests_update_requester_open"
on public.match_concierge_requests
for update
to authenticated
using (
  requester_profile_id = (select auth.uid())
  and status in ('open', 'waiting_on_requester')
)
with check (
  requester_profile_id = (select auth.uid())
);

drop policy if exists "match_concierge_events_select_relevant" on public.match_concierge_events;
create policy "match_concierge_events_select_relevant"
on public.match_concierge_events
for select
to authenticated
using (
  exists (
    select 1
    from public.match_concierge_requests
    where match_concierge_requests.id = match_concierge_events.request_id
      and (
        match_concierge_requests.requester_profile_id = (select auth.uid())
        or match_concierge_requests.target_profile_id = (select auth.uid())
      )
  )
);

drop policy if exists "risk_signals_select_relevant" on public.risk_signals;
create policy "risk_signals_select_relevant"
on public.risk_signals
for select
to authenticated
using (
  profile_id = (select auth.uid())
  or (
    match_id is not null
    and public.viewer_participates_in_match(match_id)
  )
);

drop policy if exists "risk_signals_insert_relevant" on public.risk_signals;
create policy "risk_signals_insert_relevant"
on public.risk_signals
for insert
to authenticated
with check (
  profile_id = (select auth.uid())
  or (
    match_id is not null
    and public.viewer_participates_in_match(match_id)
  )
);

drop policy if exists "brokerage_bounties_select_own" on public.brokerage_bounties;
create policy "brokerage_bounties_select_own"
on public.brokerage_bounties
for select
to authenticated
using (profile_id = (select auth.uid()));

drop policy if exists "brokerage_bounties_insert_own" on public.brokerage_bounties;
create policy "brokerage_bounties_insert_own"
on public.brokerage_bounties
for insert
to authenticated
with check (profile_id = (select auth.uid()));

drop policy if exists "brokerage_bounties_update_own" on public.brokerage_bounties;
create policy "brokerage_bounties_update_own"
on public.brokerage_bounties
for update
to authenticated
using (profile_id = (select auth.uid()))
with check (profile_id = (select auth.uid()));

drop policy if exists "collectives_select_relevant" on public.collectives;
create policy "collectives_select_relevant"
on public.collectives
for select
to authenticated
using (
  public.viewer_can_access_collective(id)
);

drop policy if exists "collectives_insert_own" on public.collectives;
create policy "collectives_insert_own"
on public.collectives
for insert
to authenticated
with check (owner_id = (select auth.uid()));

drop policy if exists "collectives_update_owner" on public.collectives;
create policy "collectives_update_owner"
on public.collectives
for update
to authenticated
using (owner_id = (select auth.uid()))
with check (owner_id = (select auth.uid()));

drop policy if exists "collective_members_select_relevant" on public.collective_members;
create policy "collective_members_select_relevant"
on public.collective_members
for select
to authenticated
using (
  profile_id = (select auth.uid())
  or public.viewer_can_access_collective(collective_id)
);

drop policy if exists "collective_members_insert_owner" on public.collective_members;
create policy "collective_members_insert_owner"
on public.collective_members
for insert
to authenticated
with check (
  profile_id = (select auth.uid())
  or public.viewer_can_access_collective(collective_id)
);

drop policy if exists "collective_members_update_owner" on public.collective_members;
create policy "collective_members_update_owner"
on public.collective_members
for update
to authenticated
using (
  profile_id = (select auth.uid())
  or public.viewer_can_access_collective(collective_id)
)
with check (
  profile_id = (select auth.uid())
  or public.viewer_can_access_collective(collective_id)
);

drop policy if exists "collective_decisions_select_accessible" on public.collective_decisions;
create policy "collective_decisions_select_accessible"
on public.collective_decisions
for select
to authenticated
using (public.viewer_can_access_collective(collective_id));

drop policy if exists "collective_decisions_insert_accessible" on public.collective_decisions;
create policy "collective_decisions_insert_accessible"
on public.collective_decisions
for insert
to authenticated
with check (
  created_by = (select auth.uid())
  and public.viewer_can_access_collective(collective_id)
);

drop policy if exists "collective_decisions_update_accessible" on public.collective_decisions;
create policy "collective_decisions_update_accessible"
on public.collective_decisions
for update
to authenticated
using (public.viewer_can_access_collective(collective_id))
with check (public.viewer_can_access_collective(collective_id));

drop policy if exists "collective_decision_responses_select_accessible" on public.collective_decision_responses;
create policy "collective_decision_responses_select_accessible"
on public.collective_decision_responses
for select
to authenticated
using (
  exists (
    select 1
    from public.collective_decisions
    where public.collective_decisions.id = decision_id
      and public.viewer_can_access_collective(public.collective_decisions.collective_id)
  )
);

drop policy if exists "collective_decision_responses_insert_own" on public.collective_decision_responses;
create policy "collective_decision_responses_insert_own"
on public.collective_decision_responses
for insert
to authenticated
with check (
  profile_id = (select auth.uid())
  and exists (
    select 1
    from public.collective_decisions
    where public.collective_decisions.id = decision_id
      and public.viewer_can_access_collective(public.collective_decisions.collective_id)
  )
);

drop policy if exists "collective_decision_responses_update_own" on public.collective_decision_responses;
create policy "collective_decision_responses_update_own"
on public.collective_decision_responses
for update
to authenticated
using (
  profile_id = (select auth.uid())
  and exists (
    select 1
    from public.collective_decisions
    where public.collective_decisions.id = decision_id
      and public.viewer_can_access_collective(public.collective_decisions.collective_id)
  )
)
with check (
  profile_id = (select auth.uid())
  and exists (
    select 1
    from public.collective_decisions
    where public.collective_decisions.id = decision_id
      and public.viewer_can_access_collective(public.collective_decisions.collective_id)
  )
);

drop policy if exists "impact_contributions_select_own" on public.impact_contributions;
create policy "impact_contributions_select_own"
on public.impact_contributions
for select
to authenticated
using (profile_id = (select auth.uid()));

drop policy if exists "impact_contributions_insert_own" on public.impact_contributions;
create policy "impact_contributions_insert_own"
on public.impact_contributions
for insert
to authenticated
with check (profile_id = (select auth.uid()));

drop policy if exists "impact_contributions_update_own" on public.impact_contributions;
create policy "impact_contributions_update_own"
on public.impact_contributions
for update
to authenticated
using (profile_id = (select auth.uid()))
with check (profile_id = (select auth.uid()));

drop policy if exists "priority_correction_cycles_select_public" on public.priority_correction_cycles;
create policy "priority_correction_cycles_select_public"
on public.priority_correction_cycles
for select
to anon, authenticated
using (true);

drop policy if exists "priority_correction_member_snapshots_select_own" on public.priority_correction_member_snapshots;
create policy "priority_correction_member_snapshots_select_own"
on public.priority_correction_member_snapshots
for select
to authenticated
using (profile_id = (select auth.uid()));

drop policy if exists "priority_correction_arbiter_assignments_select_public" on public.priority_correction_arbiter_assignments;
create policy "priority_correction_arbiter_assignments_select_public"
on public.priority_correction_arbiter_assignments
for select
to anon, authenticated
using (true);

drop policy if exists "priority_specific_action_submissions_select_public" on public.priority_specific_action_submissions;
create policy "priority_specific_action_submissions_select_public"
on public.priority_specific_action_submissions
for select
to anon, authenticated
using (true);

drop policy if exists "priority_specific_action_submissions_insert_assigned" on public.priority_specific_action_submissions;
create policy "priority_specific_action_submissions_insert_assigned"
on public.priority_specific_action_submissions
for insert
to authenticated
with check (
  submitted_by = (select auth.uid())
  and exists (
    select 1
    from public.priority_correction_arbiter_assignments
    where public.priority_correction_arbiter_assignments.cycle_id = priority_specific_action_submissions.cycle_id
      and public.priority_correction_arbiter_assignments.profile_id = (select auth.uid())
      and public.priority_correction_arbiter_assignments.role = 'specific_action_arbiter'
      and public.priority_correction_arbiter_assignments.cause_area = priority_specific_action_submissions.cause_area
      and public.priority_correction_arbiter_assignments.status = 'active'
  )
);

drop policy if exists "priority_specific_action_submissions_update_assigned" on public.priority_specific_action_submissions;
create policy "priority_specific_action_submissions_update_assigned"
on public.priority_specific_action_submissions
for update
to authenticated
using (
  exists (
    select 1
    from public.priority_correction_arbiter_assignments
    where public.priority_correction_arbiter_assignments.cycle_id = priority_specific_action_submissions.cycle_id
      and public.priority_correction_arbiter_assignments.profile_id = (select auth.uid())
      and public.priority_correction_arbiter_assignments.role = 'specific_action_arbiter'
      and public.priority_correction_arbiter_assignments.cause_area = priority_specific_action_submissions.cause_area
      and public.priority_correction_arbiter_assignments.status = 'active'
  )
)
with check (
  exists (
    select 1
    from public.priority_correction_arbiter_assignments
    where public.priority_correction_arbiter_assignments.cycle_id = priority_specific_action_submissions.cycle_id
      and public.priority_correction_arbiter_assignments.profile_id = (select auth.uid())
      and public.priority_correction_arbiter_assignments.role = 'specific_action_arbiter'
      and public.priority_correction_arbiter_assignments.cause_area = priority_specific_action_submissions.cause_area
      and public.priority_correction_arbiter_assignments.status = 'active'
  )
);

drop policy if exists "priority_specific_action_positions_select_own" on public.priority_specific_action_positions;
create policy "priority_specific_action_positions_select_own"
on public.priority_specific_action_positions
for select
to authenticated
using (
  exists (
    select 1
    from public.priority_correction_arbiter_assignments
    where public.priority_correction_arbiter_assignments.id = arbiter_assignment_id
      and public.priority_correction_arbiter_assignments.profile_id = (select auth.uid())
  )
);

drop policy if exists "priority_specific_action_positions_insert_own" on public.priority_specific_action_positions;
create policy "priority_specific_action_positions_insert_own"
on public.priority_specific_action_positions
for insert
to authenticated
with check (
  exists (
    select 1
    from public.priority_correction_arbiter_assignments
    where public.priority_correction_arbiter_assignments.id = arbiter_assignment_id
      and public.priority_correction_arbiter_assignments.profile_id = (select auth.uid())
  )
);

drop policy if exists "priority_specific_action_positions_update_own" on public.priority_specific_action_positions;
create policy "priority_specific_action_positions_update_own"
on public.priority_specific_action_positions
for update
to authenticated
using (
  exists (
    select 1
    from public.priority_correction_arbiter_assignments
    where public.priority_correction_arbiter_assignments.id = arbiter_assignment_id
      and public.priority_correction_arbiter_assignments.profile_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.priority_correction_arbiter_assignments
    where public.priority_correction_arbiter_assignments.id = arbiter_assignment_id
      and public.priority_correction_arbiter_assignments.profile_id = (select auth.uid())
  )
);

drop policy if exists "priority_specific_action_feedback_select_own" on public.priority_specific_action_feedback;
create policy "priority_specific_action_feedback_select_own"
on public.priority_specific_action_feedback
for select
to authenticated
using (profile_id = (select auth.uid()));

drop policy if exists "priority_specific_action_feedback_insert_own" on public.priority_specific_action_feedback;
create policy "priority_specific_action_feedback_insert_own"
on public.priority_specific_action_feedback
for insert
to authenticated
with check (profile_id = (select auth.uid()));

drop policy if exists "priority_specific_action_feedback_update_own" on public.priority_specific_action_feedback;
create policy "priority_specific_action_feedback_update_own"
on public.priority_specific_action_feedback
for update
to authenticated
using (profile_id = (select auth.uid()))
with check (profile_id = (select auth.uid()));

drop policy if exists "priority_cause_area_allocations_select_public" on public.priority_cause_area_allocations;
create policy "priority_cause_area_allocations_select_public"
on public.priority_cause_area_allocations
for select
to anon, authenticated
using (true);

drop policy if exists "priority_cause_area_allocations_insert_assigned" on public.priority_cause_area_allocations;
create policy "priority_cause_area_allocations_insert_assigned"
on public.priority_cause_area_allocations
for insert
to authenticated
with check (
  submitted_by = (select auth.uid())
  and exists (
    select 1
    from public.priority_correction_arbiter_assignments
    where public.priority_correction_arbiter_assignments.cycle_id = priority_cause_area_allocations.cycle_id
      and public.priority_correction_arbiter_assignments.profile_id = (select auth.uid())
      and public.priority_correction_arbiter_assignments.role = 'cause_area_arbiter'
      and public.priority_correction_arbiter_assignments.status = 'active'
  )
);

drop policy if exists "priority_cause_area_allocations_update_assigned" on public.priority_cause_area_allocations;
create policy "priority_cause_area_allocations_update_assigned"
on public.priority_cause_area_allocations
for update
to authenticated
using (
  exists (
    select 1
    from public.priority_correction_arbiter_assignments
    where public.priority_correction_arbiter_assignments.cycle_id = priority_cause_area_allocations.cycle_id
      and public.priority_correction_arbiter_assignments.profile_id = (select auth.uid())
      and public.priority_correction_arbiter_assignments.role = 'cause_area_arbiter'
      and public.priority_correction_arbiter_assignments.status = 'active'
  )
)
with check (
  exists (
    select 1
    from public.priority_correction_arbiter_assignments
    where public.priority_correction_arbiter_assignments.cycle_id = priority_cause_area_allocations.cycle_id
      and public.priority_correction_arbiter_assignments.profile_id = (select auth.uid())
      and public.priority_correction_arbiter_assignments.role = 'cause_area_arbiter'
      and public.priority_correction_arbiter_assignments.status = 'active'
  )
);

drop policy if exists "priority_cause_area_positions_select_own" on public.priority_cause_area_positions;
create policy "priority_cause_area_positions_select_own"
on public.priority_cause_area_positions
for select
to authenticated
using (
  exists (
    select 1
    from public.priority_correction_arbiter_assignments
    where public.priority_correction_arbiter_assignments.id = arbiter_assignment_id
      and public.priority_correction_arbiter_assignments.profile_id = (select auth.uid())
  )
);

drop policy if exists "priority_cause_area_positions_insert_own" on public.priority_cause_area_positions;
create policy "priority_cause_area_positions_insert_own"
on public.priority_cause_area_positions
for insert
to authenticated
with check (
  exists (
    select 1
    from public.priority_correction_arbiter_assignments
    where public.priority_correction_arbiter_assignments.id = arbiter_assignment_id
      and public.priority_correction_arbiter_assignments.profile_id = (select auth.uid())
  )
);

drop policy if exists "priority_cause_area_positions_update_own" on public.priority_cause_area_positions;
create policy "priority_cause_area_positions_update_own"
on public.priority_cause_area_positions
for update
to authenticated
using (
  exists (
    select 1
    from public.priority_correction_arbiter_assignments
    where public.priority_correction_arbiter_assignments.id = arbiter_assignment_id
      and public.priority_correction_arbiter_assignments.profile_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.priority_correction_arbiter_assignments
    where public.priority_correction_arbiter_assignments.id = arbiter_assignment_id
      and public.priority_correction_arbiter_assignments.profile_id = (select auth.uid())
  )
);

drop policy if exists "priority_cause_area_feedback_select_own" on public.priority_cause_area_feedback;
create policy "priority_cause_area_feedback_select_own"
on public.priority_cause_area_feedback
for select
to authenticated
using (profile_id = (select auth.uid()));

drop policy if exists "priority_cause_area_feedback_insert_own" on public.priority_cause_area_feedback;
create policy "priority_cause_area_feedback_insert_own"
on public.priority_cause_area_feedback
for insert
to authenticated
with check (profile_id = (select auth.uid()));

drop policy if exists "priority_cause_area_feedback_update_own" on public.priority_cause_area_feedback;
create policy "priority_cause_area_feedback_update_own"
on public.priority_cause_area_feedback
for update
to authenticated
using (profile_id = (select auth.uid()))
with check (profile_id = (select auth.uid()));

create table if not exists public.background_opportunity_briefs (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  candidate_profile_id uuid references public.profiles (id) on delete set null,
  match_id uuid references public.match_suggestions (id) on delete set null,
  title text not null default 'Opportunity brief',
  confidence_band text not null default 'Exploratory' check (confidence_band in ('High', 'Moderate', 'Tentative', 'Exploratory')),
  delivery_state text not null default 'pending' check (delivery_state in ('pending', 'delivered', 'opened', 'interested', 'maybe_later', 'dismissed', 'expired')),
  factor_codes text[] not null default '{}',
  shared_counts jsonb not null default '{}'::jsonb,
  safe_summary text not null default '',
  redacted_fields text[] not null default '{}',
  why_text text not null default '',
  next_step_type text not null default 'review_profile' check (next_step_type in ('answer_questions', 'request_intro_packet', 'request_detail', 'review_profile', 'mute_or_dismiss')),
  hidden_fields_notice text not null default 'Exact wishes, private asks, contact details, raw source notes, and sensitive constraints stay hidden until a purpose-bound grant or mutual consent.',
  human_review_required boolean not null default true,
  reveal_consequence_notice text not null default 'Requesting more detail queues a reviewed, field-bound step; it does not send contact details or introduce anyone automatically.',
  review_status text not null default 'human_review_required' check (review_status in ('human_review_required', 'review_cleared', 'blocked')),
  status text not null default 'open' check (status in ('open', 'opened', 'dismissed', 'interested', 'maybe_later', 'muted', 'packet_requested', 'expired')),
  expires_at timestamptz not null default (timezone('utc', now()) + interval '14 days'),
  seen_at timestamptz,
  feedback_reason text constraint background_opportunity_briefs_feedback_reason_check check (
    feedback_reason is null
    or feedback_reason in ('not_relevant', 'already_connected', 'bad_timing', 'too_vague', 'privacy_concern', 'safety_concern', 'maybe_later', 'interested')
  ),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (profile_id, match_id)
);

alter table public.background_opportunity_briefs add column if not exists shared_counts jsonb not null default '{}'::jsonb;
alter table public.background_opportunity_briefs add column if not exists safe_summary text not null default '';
alter table public.background_opportunity_briefs add column if not exists redacted_fields text[] not null default '{}';
alter table public.background_opportunity_briefs add column if not exists delivery_state text not null default 'pending';
alter table public.background_opportunity_briefs add column if not exists review_status text not null default 'human_review_required';
alter table public.background_opportunity_briefs add column if not exists human_review_required boolean not null default true;
alter table public.background_opportunity_briefs add column if not exists seen_at timestamptz;
alter table public.background_opportunity_briefs add column if not exists feedback_reason text;
alter table public.background_opportunity_briefs drop constraint if exists background_opportunity_briefs_delivery_state_check;
alter table public.background_opportunity_briefs
add constraint background_opportunity_briefs_delivery_state_check
check (delivery_state in ('pending', 'delivered', 'opened', 'interested', 'maybe_later', 'dismissed', 'expired'));
alter table public.background_opportunity_briefs drop constraint if exists background_opportunity_briefs_review_status_check;
alter table public.background_opportunity_briefs
add constraint background_opportunity_briefs_review_status_check
check (review_status in ('human_review_required', 'review_cleared', 'blocked'));
alter table public.background_opportunity_briefs drop constraint if exists background_opportunity_briefs_status_check;
alter table public.background_opportunity_briefs
add constraint background_opportunity_briefs_status_check
check (status in ('open', 'opened', 'dismissed', 'interested', 'maybe_later', 'muted', 'packet_requested', 'expired'));
alter table public.background_opportunity_briefs drop constraint if exists background_opportunity_briefs_feedback_reason_check;
alter table public.background_opportunity_briefs
add constraint background_opportunity_briefs_feedback_reason_check
check (
  feedback_reason is null
  or feedback_reason in ('not_relevant', 'already_connected', 'bad_timing', 'too_vague', 'privacy_concern', 'safety_concern', 'maybe_later', 'interested')
);

create table if not exists public.background_match_feedback (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  opportunity_brief_id uuid not null references public.background_opportunity_briefs (id) on delete cascade,
  match_id uuid references public.match_suggestions (id) on delete set null,
  outcome text not null check (outcome in ('dismissed', 'maybe_later', 'interested')),
  reason_code text not null check (reason_code in ('not_relevant', 'already_connected', 'bad_timing', 'too_vague', 'privacy_concern', 'safety_concern', 'maybe_later', 'interested')),
  constraint background_match_feedback_reason_outcome_check check (
    (outcome = 'interested' and reason_code = 'interested')
    or (outcome = 'maybe_later' and reason_code = 'maybe_later')
    or (outcome = 'dismissed' and reason_code not in ('interested', 'maybe_later'))
  ),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (profile_id, opportunity_brief_id)
);

alter table public.background_match_feedback drop constraint if exists background_match_feedback_reason_outcome_check;
alter table public.background_match_feedback drop constraint if exists background_match_feedback_outcome_check;
alter table public.background_match_feedback add constraint background_match_feedback_outcome_check check (
  outcome in ('dismissed', 'maybe_later', 'interested')
);
alter table public.background_match_feedback drop constraint if exists background_match_feedback_reason_code_check;
alter table public.background_match_feedback add constraint background_match_feedback_reason_code_check check (
  reason_code in ('not_relevant', 'already_connected', 'bad_timing', 'too_vague', 'privacy_concern', 'safety_concern', 'maybe_later', 'interested')
);
alter table public.background_match_feedback add constraint background_match_feedback_reason_outcome_check check (
  (outcome = 'interested' and reason_code = 'interested')
  or (outcome = 'maybe_later' and reason_code = 'maybe_later')
  or (outcome = 'dismissed' and reason_code not in ('interested', 'maybe_later'))
);

create table if not exists public.background_intro_packets (
  id uuid primary key default gen_random_uuid(),
  opportunity_brief_id uuid references public.background_opportunity_briefs (id) on delete set null,
  match_id uuid references public.match_suggestions (id) on delete set null,
  requester_profile_id uuid not null references public.profiles (id) on delete cascade,
  counterparty_profile_id uuid references public.profiles (id) on delete set null,
  purpose text not null default '',
  requester_answers jsonb not null default '{}'::jsonb,
  mutual_questions text[] not null default '{}',
  requested_field_keys text[] not null default '{}',
  reveal_capsule text not null default '',
  review_state text not null default 'requested' check (review_state in ('draft', 'requested', 'under_review', 'approved', 'changes_requested', 'declined', 'sent')),
  reviewer_notes text not null default '',
  appeal_status text not null default 'none' check (appeal_status in ('none', 'requested', 'under_review', 'resolved', 'dismissed')),
  appeal_reason text not null default '',
  appealed_at timestamptz,
  appeal_resolved_at timestamptz,
  appeal_resolution_note text not null default '',
  requester_contact_approved_at timestamptz,
  counterparty_contact_approved_at timestamptz,
  contact_approval_status text not null default 'not_requested' check (
    contact_approval_status in ('not_requested', 'requester_approved', 'counterparty_approved', 'mutual_approved', 'withdrawn')
  ),
  contact_approval_requires_fresh_mfa boolean not null default true,
  sla_due_at timestamptz not null default (timezone('utc', now()) + interval '24 hours'),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (counterparty_profile_id is null or requester_profile_id <> counterparty_profile_id)
);

alter table public.background_intro_packets add column if not exists appeal_status text not null default 'none';
alter table public.background_intro_packets add column if not exists appeal_reason text not null default '';
alter table public.background_intro_packets add column if not exists appealed_at timestamptz;
alter table public.background_intro_packets add column if not exists appeal_resolved_at timestamptz;
alter table public.background_intro_packets add column if not exists appeal_resolution_note text not null default '';
alter table public.background_intro_packets add column if not exists requester_contact_approved_at timestamptz;
alter table public.background_intro_packets add column if not exists counterparty_contact_approved_at timestamptz;
alter table public.background_intro_packets add column if not exists contact_approval_status text not null default 'not_requested';
alter table public.background_intro_packets add column if not exists contact_approval_requires_fresh_mfa boolean not null default true;
alter table public.background_intro_packets drop constraint if exists background_intro_packets_appeal_status_check;
alter table public.background_intro_packets add constraint background_intro_packets_appeal_status_check check (
  appeal_status in ('none', 'requested', 'under_review', 'resolved', 'dismissed')
);
alter table public.background_intro_packets drop constraint if exists background_intro_packets_contact_approval_status_check;
alter table public.background_intro_packets add constraint background_intro_packets_contact_approval_status_check check (
  contact_approval_status in ('not_requested', 'requester_approved', 'counterparty_approved', 'mutual_approved', 'withdrawn')
);

create table if not exists public.background_grant_receipts (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  counterparty_id uuid references public.profiles (id) on delete set null,
  grant_id uuid references public.privacy_grants (id) on delete set null,
  receipt_kind text not null default 'disclosure_grant' check (receipt_kind in ('disclosure_grant', 'source_summary', 'connector_consent')),
  purpose text not null default '',
  field_keys text[] not null default '{}',
  audience_stage text not null default 'consent' check (audience_stage in ('registry', 'consent', 'introduced')),
  status text not null default 'active' check (status in ('active', 'revoked', 'expired')),
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.background_source_summaries (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  source_connection_id uuid references public.source_connections (id) on delete set null,
  consent_receipt_id uuid references public.background_grant_receipts (id) on delete set null,
  source_type text not null default 'manual' check (source_type in ('manual', 'social', 'blog', 'email', 'calendar', 'chat_history', 'search_profile', 'other')),
  label text not null,
  summary_text text not null default '',
  allowed_field_keys text[] not null default '{}',
  purpose text not null default '',
  retention_expires_at timestamptz not null,
  status text not null default 'active' check (status in ('draft', 'reviewed', 'active', 'expired', 'revoked')),
  raw_ingestion_allowed boolean not null default false check (raw_ingestion_allowed = false),
  redaction_report jsonb not null default '{}'::jsonb,
  summary_version integer not null default 1 check (summary_version > 0),
  approved_at timestamptz,
  sensitive_ciphertexts jsonb not null default '{}'::jsonb,
  sensitive_encryption_version text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.background_source_summaries add column if not exists redaction_report jsonb not null default '{}'::jsonb;
alter table public.background_source_summaries add column if not exists summary_version integer not null default 1;
alter table public.background_source_summaries add column if not exists approved_at timestamptz;
alter table public.background_source_summaries drop constraint if exists background_source_summaries_summary_version_check;
alter table public.background_source_summaries
add constraint background_source_summaries_summary_version_check check (summary_version > 0);

create table if not exists public.background_profile_signals (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  source text not null check (source in ('manual', 'approved_source_summary', 'interview')),
  source_connection_id uuid references public.source_connections (id) on delete set null,
  source_summary_id uuid references public.background_source_summaries (id) on delete set null,
  signal_key text not null,
  signal_value text not null,
  allowed_field_key text not null check (
    allowed_field_key in (
      'cause_priorities',
      'capability_tags',
      'offer_ask_terms',
      'verification_preferences',
      'availability_context',
      'safety_constraints'
    )
  ),
  sensitivity text not null check (sensitivity in ('broad', 'specific')),
  confidence_band text not null check (confidence_band in ('low', 'medium', 'high')),
  status text not null default 'active' check (status in ('active', 'stale', 'expired', 'revoked')),
  expires_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.background_shadow_runs (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  source_connection_id uuid references public.source_connections (id) on delete set null,
  source_summary_id uuid references public.background_source_summaries (id) on delete set null,
  model_name text not null default 'deterministic-redaction-v1',
  purpose text not null check (purpose in ('signal_extraction', 'clarification_draft')),
  output_json jsonb not null,
  was_promoted boolean not null default false,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.background_profile_interview_answers (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  question_key text not null,
  question_text text not null default '',
  answer text not null default '',
  uncertainty_flags text[] not null default '{}',
  broad_preview_update text not null default '',
  private_intent_update text not null default '',
  status text not null default 'saved' check (status in ('draft', 'saved', 'dismissed')),
  sensitive_ciphertexts jsonb not null default '{}'::jsonb,
  sensitive_encryption_version text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (profile_id, question_key)
);

create table if not exists public.background_collective_policies (
  id uuid primary key default gen_random_uuid(),
  collective_id uuid not null unique references public.collectives (id) on delete cascade,
  approval_threshold smallint not null default 1 check (approval_threshold between 1 and 20),
  approver_roles text[] not null default array['owner', 'admin']::text[],
  max_auto_grant_stage text not null default 'consent' check (max_auto_grant_stage in ('registry', 'consent', 'introduced')),
  group_public_preview text not null default '',
  default_retention_days smallint not null default 90 check (default_retention_days in (30, 90, 180, 365)),
  contact_disclosure_requires_owner_step_up boolean not null default true,
  disclosure_rules jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.background_collective_policies
  add column if not exists contact_disclosure_requires_owner_step_up boolean not null default true;

create table if not exists public.background_mute_rules (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  candidate_profile_id uuid references public.profiles (id) on delete set null,
  factor_code_pattern text not null default '',
  cause_pair text[] not null default '{}',
  status text not null default 'active' check (status in ('active', 'expired', 'revoked')),
  muted_until timestamptz not null default (timezone('utc', now()) + interval '30 days'),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (profile_id, candidate_profile_id, factor_code_pattern)
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'background_source_summaries_allowed_field_keys_check'
  ) then
    alter table public.background_source_summaries
      add constraint background_source_summaries_allowed_field_keys_check
      check (
        allowed_field_keys <@ array[
          'cause_priorities',
          'capability_tags',
          'offer_ask_terms',
          'verification_preferences',
          'availability_context',
          'safety_constraints'
        ]::text[]
      );
  end if;
end
$$;

create index if not exists background_opportunity_briefs_profile_status_idx
on public.background_opportunity_briefs (profile_id, status, expires_at asc, created_at desc);

create index if not exists background_opportunity_briefs_match_idx
on public.background_opportunity_briefs (match_id, profile_id);

create index if not exists background_opportunity_briefs_delivery_state_idx
on public.background_opportunity_briefs (profile_id, delivery_state, updated_at desc);

create index if not exists background_match_feedback_profile_idx
on public.background_match_feedback (profile_id, outcome, updated_at desc);

create index if not exists background_match_feedback_brief_idx
on public.background_match_feedback (opportunity_brief_id, profile_id);

create index if not exists background_intro_packets_requester_idx
on public.background_intro_packets (requester_profile_id, review_state, created_at desc);

create index if not exists background_intro_packets_counterparty_idx
on public.background_intro_packets (counterparty_profile_id, review_state, created_at desc)
where counterparty_profile_id is not null;

create index if not exists background_intro_packets_appeal_idx
on public.background_intro_packets (appeal_status, sla_due_at asc, updated_at desc)
where appeal_status <> 'none';

create index if not exists background_intro_packets_contact_approval_idx
on public.background_intro_packets (contact_approval_status, updated_at desc)
where contact_approval_status <> 'not_requested';

create index if not exists background_source_summaries_profile_status_idx
on public.background_source_summaries (profile_id, status, retention_expires_at asc);

create index if not exists background_profile_signals_profile_status_idx
on public.background_profile_signals (profile_id, status, expires_at asc, updated_at desc);

create index if not exists background_profile_signals_source_summary_idx
on public.background_profile_signals (source_summary_id, profile_id)
where source_summary_id is not null;

create index if not exists background_profile_signals_source_connection_idx
on public.background_profile_signals (source_connection_id, profile_id)
where source_connection_id is not null;

create index if not exists background_shadow_runs_profile_created_idx
on public.background_shadow_runs (profile_id, created_at desc);

create index if not exists background_shadow_runs_source_connection_idx
on public.background_shadow_runs (source_connection_id, profile_id, created_at desc)
where source_connection_id is not null;

create index if not exists background_profile_interview_answers_profile_status_idx
on public.background_profile_interview_answers (profile_id, status, updated_at desc);

create index if not exists background_grant_receipts_profile_status_idx
on public.background_grant_receipts (profile_id, status, expires_at asc);

create index if not exists background_collective_policies_collective_idx
on public.background_collective_policies (collective_id);

create index if not exists background_mute_rules_profile_status_idx
on public.background_mute_rules (profile_id, status, muted_until asc);

drop trigger if exists background_opportunity_briefs_set_updated_at on public.background_opportunity_briefs;
create trigger background_opportunity_briefs_set_updated_at
before update on public.background_opportunity_briefs
for each row execute function public.set_updated_at();

drop trigger if exists background_match_feedback_set_updated_at on public.background_match_feedback;
create trigger background_match_feedback_set_updated_at
before update on public.background_match_feedback
for each row execute function public.set_updated_at();

drop trigger if exists background_intro_packets_set_updated_at on public.background_intro_packets;
create trigger background_intro_packets_set_updated_at
before update on public.background_intro_packets
for each row execute function public.set_updated_at();

drop trigger if exists background_source_summaries_set_updated_at on public.background_source_summaries;
create trigger background_source_summaries_set_updated_at
before update on public.background_source_summaries
for each row execute function public.set_updated_at();

drop trigger if exists background_profile_signals_set_updated_at on public.background_profile_signals;
create trigger background_profile_signals_set_updated_at
before update on public.background_profile_signals
for each row execute function public.set_updated_at();

drop trigger if exists background_profile_interview_answers_set_updated_at on public.background_profile_interview_answers;
create trigger background_profile_interview_answers_set_updated_at
before update on public.background_profile_interview_answers
for each row execute function public.set_updated_at();

drop trigger if exists background_collective_policies_set_updated_at on public.background_collective_policies;
create trigger background_collective_policies_set_updated_at
before update on public.background_collective_policies
for each row execute function public.set_updated_at();

drop trigger if exists background_mute_rules_set_updated_at on public.background_mute_rules;
create trigger background_mute_rules_set_updated_at
before update on public.background_mute_rules
for each row execute function public.set_updated_at();

alter table public.background_opportunity_briefs enable row level security;
alter table public.background_match_feedback enable row level security;
alter table public.background_intro_packets enable row level security;
alter table public.background_grant_receipts enable row level security;
alter table public.background_delegate_receipts enable row level security;
alter table public.background_source_summaries enable row level security;
alter table public.background_profile_signals enable row level security;
alter table public.background_shadow_runs enable row level security;
alter table public.background_profile_interview_answers enable row level security;
alter table public.background_collective_policies enable row level security;
alter table public.background_mute_rules enable row level security;

drop policy if exists "background_opportunity_briefs_select_own" on public.background_opportunity_briefs;
create policy "background_opportunity_briefs_select_own"
on public.background_opportunity_briefs
for select
to authenticated
using (profile_id = (select auth.uid()));

drop policy if exists "background_opportunity_briefs_insert_own" on public.background_opportunity_briefs;
create policy "background_opportunity_briefs_insert_own"
on public.background_opportunity_briefs
for insert
to authenticated
with check (profile_id = (select auth.uid()));

drop policy if exists "background_opportunity_briefs_update_own" on public.background_opportunity_briefs;
create policy "background_opportunity_briefs_update_own"
on public.background_opportunity_briefs
for update
to authenticated
using (profile_id = (select auth.uid()))
with check (profile_id = (select auth.uid()));

drop policy if exists "background_opportunity_briefs_delete_own" on public.background_opportunity_briefs;
create policy "background_opportunity_briefs_delete_own"
on public.background_opportunity_briefs
for delete
to authenticated
using (profile_id = (select auth.uid()));

drop policy if exists "background_match_feedback_select_own" on public.background_match_feedback;
create policy "background_match_feedback_select_own"
on public.background_match_feedback
for select
to authenticated
using (profile_id = (select auth.uid()));

drop policy if exists "background_match_feedback_insert_own" on public.background_match_feedback;
create policy "background_match_feedback_insert_own"
on public.background_match_feedback
for insert
to authenticated
with check (
  profile_id = (select auth.uid())
  and exists (
    select 1
    from public.background_opportunity_briefs
    where background_opportunity_briefs.id = background_match_feedback.opportunity_brief_id
      and background_opportunity_briefs.profile_id = (select auth.uid())
  )
);

drop policy if exists "background_match_feedback_update_own" on public.background_match_feedback;
create policy "background_match_feedback_update_own"
on public.background_match_feedback
for update
to authenticated
using (profile_id = (select auth.uid()))
with check (profile_id = (select auth.uid()));

drop policy if exists "background_intro_packets_select_relevant" on public.background_intro_packets;
create policy "background_intro_packets_select_relevant"
on public.background_intro_packets
for select
to authenticated
using (
  requester_profile_id = (select auth.uid())
  or counterparty_profile_id = (select auth.uid())
);

drop policy if exists "background_intro_packets_insert_requester" on public.background_intro_packets;
create policy "background_intro_packets_insert_requester"
on public.background_intro_packets
for insert
to authenticated
with check (
  requester_profile_id = (select auth.uid())
  and (
    match_id is null
    or public.profile_participates_in_match(match_id, (select auth.uid()))
  )
);

drop policy if exists "background_intro_packets_update_relevant" on public.background_intro_packets;
create policy "background_intro_packets_update_relevant"
on public.background_intro_packets
for update
to authenticated
using (
  requester_profile_id = (select auth.uid())
  or counterparty_profile_id = (select auth.uid())
)
with check (
  requester_profile_id = (select auth.uid())
  or counterparty_profile_id = (select auth.uid())
);

drop policy if exists "background_grant_receipts_select_relevant" on public.background_grant_receipts;
create policy "background_grant_receipts_select_relevant"
on public.background_grant_receipts
for select
to authenticated
using (
  profile_id = (select auth.uid())
  or counterparty_id = (select auth.uid())
);

drop policy if exists "background_grant_receipts_insert_own" on public.background_grant_receipts;
create policy "background_grant_receipts_insert_own"
on public.background_grant_receipts
for insert
to authenticated
with check (profile_id = (select auth.uid()));

drop policy if exists "background_grant_receipts_update_own" on public.background_grant_receipts;
create policy "background_grant_receipts_update_own"
on public.background_grant_receipts
for update
to authenticated
using (profile_id = (select auth.uid()))
with check (profile_id = (select auth.uid()));

drop policy if exists "background_delegate_receipts_select_own" on public.background_delegate_receipts;
create policy "background_delegate_receipts_select_own"
on public.background_delegate_receipts
for select
to authenticated
using (profile_id = (select auth.uid()));

drop policy if exists "background_delegate_receipts_insert_own" on public.background_delegate_receipts;
create policy "background_delegate_receipts_insert_own"
on public.background_delegate_receipts
for insert
to authenticated
with check (profile_id = (select auth.uid()));

drop policy if exists "background_source_summaries_select_own" on public.background_source_summaries;
create policy "background_source_summaries_select_own"
on public.background_source_summaries
for select
to authenticated
using (profile_id = (select auth.uid()));

drop policy if exists "background_source_summaries_insert_own" on public.background_source_summaries;
create policy "background_source_summaries_insert_own"
on public.background_source_summaries
for insert
to authenticated
with check (profile_id = (select auth.uid()));

drop policy if exists "background_source_summaries_update_own" on public.background_source_summaries;
create policy "background_source_summaries_update_own"
on public.background_source_summaries
for update
to authenticated
using (profile_id = (select auth.uid()))
with check (profile_id = (select auth.uid()));

drop policy if exists "background_source_summaries_delete_own" on public.background_source_summaries;
create policy "background_source_summaries_delete_own"
on public.background_source_summaries
for delete
to authenticated
using (profile_id = (select auth.uid()));

drop policy if exists "background_profile_signals_select_own" on public.background_profile_signals;
create policy "background_profile_signals_select_own"
on public.background_profile_signals
for select
to authenticated
using (profile_id = (select auth.uid()));

drop policy if exists "background_profile_signals_insert_own" on public.background_profile_signals;
create policy "background_profile_signals_insert_own"
on public.background_profile_signals
for insert
to authenticated
with check (profile_id = (select auth.uid()));

drop policy if exists "background_profile_signals_update_own" on public.background_profile_signals;
create policy "background_profile_signals_update_own"
on public.background_profile_signals
for update
to authenticated
using (profile_id = (select auth.uid()))
with check (profile_id = (select auth.uid()));

drop policy if exists "background_profile_signals_delete_own" on public.background_profile_signals;
create policy "background_profile_signals_delete_own"
on public.background_profile_signals
for delete
to authenticated
using (profile_id = (select auth.uid()));

drop policy if exists "background_shadow_runs_select_own" on public.background_shadow_runs;
create policy "background_shadow_runs_select_own"
on public.background_shadow_runs
for select
to authenticated
using (profile_id = (select auth.uid()));

drop policy if exists "background_shadow_runs_insert_own" on public.background_shadow_runs;
create policy "background_shadow_runs_insert_own"
on public.background_shadow_runs
for insert
to authenticated
with check (profile_id = (select auth.uid()));

drop policy if exists "background_shadow_runs_update_own" on public.background_shadow_runs;
create policy "background_shadow_runs_update_own"
on public.background_shadow_runs
for update
to authenticated
using (profile_id = (select auth.uid()))
with check (profile_id = (select auth.uid()));

drop policy if exists "background_shadow_runs_delete_own" on public.background_shadow_runs;
create policy "background_shadow_runs_delete_own"
on public.background_shadow_runs
for delete
to authenticated
using (profile_id = (select auth.uid()));

drop policy if exists "background_profile_interview_answers_select_own" on public.background_profile_interview_answers;
create policy "background_profile_interview_answers_select_own"
on public.background_profile_interview_answers
for select
to authenticated
using (profile_id = (select auth.uid()));

drop policy if exists "background_profile_interview_answers_insert_own" on public.background_profile_interview_answers;
create policy "background_profile_interview_answers_insert_own"
on public.background_profile_interview_answers
for insert
to authenticated
with check (profile_id = (select auth.uid()));

drop policy if exists "background_profile_interview_answers_update_own" on public.background_profile_interview_answers;
create policy "background_profile_interview_answers_update_own"
on public.background_profile_interview_answers
for update
to authenticated
using (profile_id = (select auth.uid()))
with check (profile_id = (select auth.uid()));

drop policy if exists "background_profile_interview_answers_delete_own" on public.background_profile_interview_answers;
create policy "background_profile_interview_answers_delete_own"
on public.background_profile_interview_answers
for delete
to authenticated
using (profile_id = (select auth.uid()));

drop policy if exists "background_collective_policies_select_accessible" on public.background_collective_policies;
create policy "background_collective_policies_select_accessible"
on public.background_collective_policies
for select
to authenticated
using (public.viewer_can_access_collective(collective_id));

drop policy if exists "background_collective_policies_insert_accessible" on public.background_collective_policies;
create policy "background_collective_policies_insert_accessible"
on public.background_collective_policies
for insert
to authenticated
with check (public.viewer_can_access_collective(collective_id));

drop policy if exists "background_collective_policies_update_accessible" on public.background_collective_policies;
create policy "background_collective_policies_update_accessible"
on public.background_collective_policies
for update
to authenticated
using (public.viewer_can_access_collective(collective_id))
with check (public.viewer_can_access_collective(collective_id));

drop policy if exists "background_mute_rules_select_own" on public.background_mute_rules;
create policy "background_mute_rules_select_own"
on public.background_mute_rules
for select
to authenticated
using (profile_id = (select auth.uid()));

drop policy if exists "background_mute_rules_insert_own" on public.background_mute_rules;
create policy "background_mute_rules_insert_own"
on public.background_mute_rules
for insert
to authenticated
with check (profile_id = (select auth.uid()));

drop policy if exists "background_mute_rules_update_own" on public.background_mute_rules;
create policy "background_mute_rules_update_own"
on public.background_mute_rules
for update
to authenticated
using (profile_id = (select auth.uid()))
with check (profile_id = (select auth.uid()));

create table if not exists public.performance_bonds (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references public.offers (id) on delete cascade,
  swap_id uuid references public.agreements (id) on delete set null,
  interest_id uuid references public.interests (id) on delete set null,
  party_id uuid not null references public.profiles (id) on delete cascade,
  counterparty_id uuid references public.profiles (id) on delete set null,
  side text not null check (side in ('offerer', 'taker')),
  enabled boolean not null default true,
  amount_cents integer not null check (amount_cents >= 0),
  currency text not null default 'USD' check (currency ~ '^[A-Z]{3}$'),
  evidence_due_at timestamptz,
  challenge_window_days integer not null default 7 check (challenge_window_days in (7, 14, 30)),
  challenge_window_ends_at timestamptz,
  evidence_schema jsonb not null default '{}'::jsonb,
  additionality_statement text not null default '',
  no_trade_baseline text not null default '',
  forfeiture_rule text not null default 'neutral_release' check (forfeiture_rule in ('neutral_release', 'counterparty_release', 'split_release')),
  forfeiture_destination text not null default 'compromise_charity' check (forfeiture_destination in ('compromise_charity', 'mpgf', 'counterparty', 'split')),
  forfeiture_destination_id text references public.registered_charities (id) on delete restrict,
  split_config jsonb not null default '{"counterpartyPercent":0,"neutralCausePercent":50,"mpgfPercent":50}'::jsonb,
  reviewer_policy text not null default 'Counterparty may accept or challenge; platform arbitration if disputed',
  status text not null default 'draft' check (
    status in (
      'not_enabled',
      'draft',
      'awaiting_funding',
      'funded',
      'active',
      'evidence_due',
      'evidence_submitted',
      'challenge_window_open',
      'accepted_by_counterparty',
      'auto_refund_pending',
      'refunded',
      'challenged',
      'under_review',
      'accepted_after_review',
      'rejected_after_review',
      'forfeited',
      'split_disbursed',
      'cancelled',
      'expired'
    )
  ),
  funding_status text not null default 'awaiting_funding' check (
    funding_status in (
      'not_required',
      'awaiting_funding',
      'payment_pending',
      'funded',
      'refund_pending',
      'refunded',
      'release_pending',
      'released',
      'failed'
    )
  ),
  payment_provider text not null default 'manual_review',
  payment_intent_id text,
  counterparty_payout_consent boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  locked_at timestamptz,
  resolved_at timestamptz,
  check (
    enabled = false
    or (
      amount_cents > 0
      and evidence_due_at is not null
      and challenge_window_days in (7, 14, 30)
      and length(trim(additionality_statement)) > 0
      and length(trim(no_trade_baseline)) > 0
      and jsonb_typeof(evidence_schema) = 'object'
      and length(coalesce(evidence_schema ->> 'actionToProve', '')) >= 12
      and length(coalesce(evidence_schema ->> 'acceptedEvidenceTypes', '')) >= 12
      and length(coalesce(evidence_schema ->> 'minimumDetail', '')) >= 12
      and length(coalesce(evidence_schema ->> 'reviewStandard', '')) >= 12
    )
  ),
  check (forfeiture_destination <> 'counterparty' or counterparty_payout_consent = true),
  check (
    forfeiture_destination <> 'split'
    or (
      ((split_config ->> 'counterpartyPercent')::integer)
      + ((split_config ->> 'neutralCausePercent')::integer)
      + ((split_config ->> 'mpgfPercent')::integer)
    ) = 100
  )
);

create table if not exists public.bond_evidence (
  id uuid primary key default gen_random_uuid(),
  bond_id uuid not null references public.performance_bonds (id) on delete cascade,
  submitted_by uuid not null references public.profiles (id) on delete cascade,
  submitted_at timestamptz not null default timezone('utc', now()),
  evidence_text text not null default '',
  evidence_urls text[] not null default '{}',
  attachments jsonb not null default '[]'::jsonb,
  visibility text not null default 'counterparty_only' check (visibility in ('counterparty_only', 'platform_reviewer_only', 'public_proof', 'mixed_redacted')),
  redaction_notes text not null default '',
  attestation boolean not null default false,
  status text not null default 'submitted' check (status in ('submitted', 'accepted_by_counterparty', 'challenged', 'more_evidence_requested', 'accepted_after_review', 'rejected_after_review')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (attestation = true),
  check (length(trim(evidence_text)) > 0 or cardinality(evidence_urls) > 0)
);

create table if not exists public.bond_challenges (
  id uuid primary key default gen_random_uuid(),
  bond_id uuid not null references public.performance_bonds (id) on delete cascade,
  challenged_by uuid not null references public.profiles (id) on delete cascade,
  challenged_at timestamptz not null default timezone('utc', now()),
  reason text not null,
  specific_objection text not null,
  requested_outcome text not null default 'platform_review',
  bad_faith_flag boolean not null default false,
  status text not null default 'open' check (status in ('open', 'under_review', 'accepted', 'rejected', 'more_evidence_requested', 'closed', 'bad_faith_flagged')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.bond_adjudications (
  id uuid primary key default gen_random_uuid(),
  bond_id uuid not null references public.performance_bonds (id) on delete cascade,
  challenge_id uuid references public.bond_challenges (id) on delete set null,
  reviewer_id uuid not null references public.profiles (id) on delete restrict,
  decision text not null check (decision in ('accept', 'reject', 'request_more_evidence')),
  decision_reason text not null,
  decided_at timestamptz not null default timezone('utc', now()),
  appeal_allowed boolean not null default false,
  appeal_deadline timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  check (length(trim(decision_reason)) > 0)
);

create table if not exists public.bond_ledger_entries (
  id uuid primary key default gen_random_uuid(),
  bond_id uuid not null references public.performance_bonds (id) on delete cascade,
  type text not null check (type in ('fund', 'refund', 'release', 'split_release', 'adjustment')),
  amount_cents integer not null check (amount_cents >= 0),
  currency text not null default 'USD' check (currency ~ '^[A-Z]{3}$'),
  destination_type text not null check (destination_type in ('party', 'counterparty', 'compromise_charity', 'mpgf', 'platform_manual_review')),
  destination_id text,
  status text not null default 'pending' check (status in ('pending', 'completed', 'not_required', 'awaiting_funding', 'payment_pending', 'funded', 'refund_pending', 'refunded', 'release_pending', 'released', 'failed')),
  idempotency_key text not null,
  created_at timestamptz not null default timezone('utc', now()),
  unique (bond_id, idempotency_key)
);

create table if not exists public.performance_bond_audit_events (
  id uuid primary key default gen_random_uuid(),
  bond_id uuid not null references public.performance_bonds (id) on delete cascade,
  actor_id uuid references public.profiles (id) on delete set null,
  actor_role text not null check (actor_role in ('party', 'counterparty', 'reviewer', 'system')),
  event_type text not null,
  from_status text not null,
  to_status text not null,
  reason text not null,
  metadata jsonb not null default '{}'::jsonb,
  idempotency_key text not null,
  created_at timestamptz not null default timezone('utc', now()),
  unique (bond_id, idempotency_key)
);

drop trigger if exists performance_bonds_set_updated_at on public.performance_bonds;
create trigger performance_bonds_set_updated_at
before update on public.performance_bonds
for each row execute procedure public.set_updated_at();
drop trigger if exists bond_evidence_set_updated_at on public.bond_evidence;
create trigger bond_evidence_set_updated_at
before update on public.bond_evidence
for each row execute procedure public.set_updated_at();
drop trigger if exists bond_challenges_set_updated_at on public.bond_challenges;
create trigger bond_challenges_set_updated_at
before update on public.bond_challenges
for each row execute procedure public.set_updated_at();

create index if not exists performance_bonds_offer_id_idx on public.performance_bonds (offer_id);
create index if not exists performance_bonds_swap_id_idx on public.performance_bonds (swap_id);
create index if not exists performance_bonds_interest_id_idx on public.performance_bonds (interest_id);
create index if not exists performance_bonds_party_id_idx on public.performance_bonds (party_id);
create index if not exists performance_bonds_counterparty_id_idx on public.performance_bonds (counterparty_id);
create index if not exists performance_bonds_status_idx on public.performance_bonds (status);
create index if not exists performance_bonds_funding_status_idx on public.performance_bonds (funding_status);
create index if not exists performance_bonds_evidence_due_idx on public.performance_bonds (evidence_due_at);
create index if not exists performance_bonds_review_queue_idx on public.performance_bonds (status, evidence_due_at, updated_at) where status in ('challenged', 'under_review', 'rejected_after_review', 'evidence_due');
create unique index if not exists performance_bonds_offerer_unique_idx on public.performance_bonds (offer_id, side) where side = 'offerer';
create unique index if not exists performance_bonds_taker_interest_unique_idx on public.performance_bonds (interest_id, side) where interest_id is not null and side = 'taker';
create index if not exists bond_evidence_bond_idx on public.bond_evidence (bond_id, submitted_at desc);
create index if not exists bond_evidence_submitted_by_idx on public.bond_evidence (submitted_by, submitted_at desc);
create index if not exists bond_challenges_bond_status_idx on public.bond_challenges (bond_id, status, challenged_at desc);
create index if not exists bond_challenges_review_queue_idx on public.bond_challenges (status, challenged_at) where status in ('open', 'under_review');
create index if not exists bond_adjudications_bond_idx on public.bond_adjudications (bond_id, decided_at desc);
create index if not exists bond_ledger_entries_bond_idx on public.bond_ledger_entries (bond_id, created_at desc);
create index if not exists performance_bond_audit_events_bond_idx on public.performance_bond_audit_events (bond_id, created_at desc);

alter table public.performance_bonds enable row level security;
alter table public.bond_evidence enable row level security;
alter table public.bond_challenges enable row level security;
alter table public.bond_adjudications enable row level security;
alter table public.bond_ledger_entries enable row level security;
alter table public.performance_bond_audit_events enable row level security;

drop policy if exists "performance_bonds_select_visible" on public.performance_bonds;
create policy "performance_bonds_select_visible"
on public.performance_bonds
for select
to anon, authenticated
using (
  exists (select 1 from public.offers where offers.id = performance_bonds.offer_id and offers.status = 'open')
  or party_id = (select auth.uid())
  or counterparty_id = (select auth.uid())
  or exists (
    select 1
    from public.agreements
    where agreements.id = performance_bonds.swap_id
      and (agreements.proposer_id = (select auth.uid()) or agreements.responder_id = (select auth.uid()))
  )
);
drop policy if exists "performance_bonds_insert_own_draft" on public.performance_bonds;
create policy "performance_bonds_insert_own_draft"
on public.performance_bonds
for insert
to authenticated
with check (party_id = (select auth.uid()) and locked_at is null and status = 'draft');
drop policy if exists "performance_bonds_update_own_unlocked_draft" on public.performance_bonds;
create policy "performance_bonds_update_own_unlocked_draft"
on public.performance_bonds
for update
to authenticated
using (party_id = (select auth.uid()) and locked_at is null and status = 'draft')
with check (party_id = (select auth.uid()) and locked_at is null and status = 'draft');

drop policy if exists "bond_evidence_select_participants" on public.bond_evidence;
create policy "bond_evidence_select_participants"
on public.bond_evidence
for select
to authenticated
using (exists (select 1 from public.performance_bonds where performance_bonds.id = bond_evidence.bond_id and (performance_bonds.party_id = (select auth.uid()) or performance_bonds.counterparty_id = (select auth.uid()))));
drop policy if exists "bond_evidence_insert_party" on public.bond_evidence;
create policy "bond_evidence_insert_party"
on public.bond_evidence
for insert
to authenticated
with check (submitted_by = (select auth.uid()) and exists (select 1 from public.performance_bonds where performance_bonds.id = bond_evidence.bond_id and performance_bonds.party_id = (select auth.uid())));

drop policy if exists "bond_challenges_select_participants" on public.bond_challenges;
create policy "bond_challenges_select_participants"
on public.bond_challenges
for select
to authenticated
using (exists (select 1 from public.performance_bonds where performance_bonds.id = bond_challenges.bond_id and (performance_bonds.party_id = (select auth.uid()) or performance_bonds.counterparty_id = (select auth.uid()))));
drop policy if exists "bond_challenges_insert_counterparty" on public.bond_challenges;
create policy "bond_challenges_insert_counterparty"
on public.bond_challenges
for insert
to authenticated
with check (challenged_by = (select auth.uid()) and exists (select 1 from public.performance_bonds where performance_bonds.id = bond_challenges.bond_id and performance_bonds.counterparty_id = (select auth.uid())));

drop policy if exists "bond_adjudications_select_participants" on public.bond_adjudications;
create policy "bond_adjudications_select_participants"
on public.bond_adjudications
for select
to authenticated
using (exists (select 1 from public.performance_bonds where performance_bonds.id = bond_adjudications.bond_id and (performance_bonds.party_id = (select auth.uid()) or performance_bonds.counterparty_id = (select auth.uid()))));
drop policy if exists "bond_ledger_entries_select_participants" on public.bond_ledger_entries;
create policy "bond_ledger_entries_select_participants"
on public.bond_ledger_entries
for select
to authenticated
using (exists (select 1 from public.performance_bonds where performance_bonds.id = bond_ledger_entries.bond_id and (performance_bonds.party_id = (select auth.uid()) or performance_bonds.counterparty_id = (select auth.uid()))));
drop policy if exists "performance_bond_audit_events_select_participants" on public.performance_bond_audit_events;
create policy "performance_bond_audit_events_select_participants"
on public.performance_bond_audit_events
for select
to authenticated
using (exists (select 1 from public.performance_bonds where performance_bonds.id = performance_bond_audit_events.bond_id and (performance_bonds.party_id = (select auth.uid()) or performance_bonds.counterparty_id = (select auth.uid()))));

create table if not exists public.mpgf_cycles (
  id text primary key,
  label text not null,
  stage text not null check (stage in ('pilot', 'public_beta', 'mature')),
  mode text not null check (mode in ('non_real_money_demo', 'pledge_only', 'test_mode', 'real_money')),
  currency text not null default 'usd' check (currency = 'usd'),
  budget_cents integer not null default 0 check (budget_cents >= 0),
  protocol_parameter_version text not null,
  terms_version text not null,
  privacy_version text not null,
  status text not null default 'draft',
  proposal_opens_at timestamptz,
  ballot_opens_at timestamptz,
  ballot_closes_at timestamptz,
  summary_published_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.mpgf_candidate_alternatives (
  id text primary key,
  cycle_id text references public.mpgf_cycles (id) on delete cascade,
  name text not null,
  short_name text not null,
  cause_area text not null,
  recipient_name text not null,
  description text not null,
  moral_public_good_rationale text not null,
  outcome_unit text not null,
  status text not null check (status in ('approved_demo', 'carryover_only', 'draft', 'rejected')),
  operational_reliability_bps integer not null check (operational_reliability_bps between 0 and 10000),
  risk_bps integer not null check (risk_bps between 0 and 10000),
  tail_loss_bps integer not null check (tail_loss_bps between 0 and 10000),
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.mpgf_public_goods_match_pools (
  id text primary key,
  funder_type text not null check (
    funder_type in ('demo_common_ground_pool', 'sponsor', 'subscription_pool', 'institution')
  ),
  budget_cents bigint not null check (budget_cents >= 0),
  base_match_ratio numeric not null default 1 check (base_match_ratio >= 0),
  qf_bonus_cents bigint not null default 0 check (qf_bonus_cents >= 0),
  visible_commitment text not null,
  restrictions_json jsonb not null default '{}'::jsonb,
  status text not null default 'active' check (status in ('draft', 'active', 'paused', 'closed', 'voided')),
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.mpgf_public_goods_rounds (
  id text primary key,
  name text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  match_pool_id text not null references public.mpgf_public_goods_match_pools (id),
  qf_enabled boolean not null default false,
  qf_cap_multiple numeric not null default 1.5 check (qf_cap_multiple >= 0),
  supporter_gate text not null check (
    supporter_gate in ('demo_self_attestation', 'verified_human', 'repository_existing_verification')
  ),
  status text not null default 'scheduled' check (
    status in ('draft', 'scheduled', 'open', 'allocation_pending', 'published', 'closed', 'emergency_suspended')
  ),
  created_at timestamptz not null default timezone('utc', now()),
  constraint mpgf_public_goods_rounds_valid_window check (ends_at > starts_at)
);

create table if not exists public.mpgf_public_goods_campaigns (
  id text primary key,
  round_id text references public.mpgf_public_goods_rounds (id) on delete set null,
  slug text not null unique,
  pool_alternative_id text references public.mpgf_candidate_alternatives (id) on delete set null,
  title text not null,
  destination_type text not null check (
    destination_type in ('external_charity', 'fiscal_host', 'internal_demo_pool', 'signed_sponsor_route')
  ),
  destination_ref text not null,
  cause_tags text[] not null default '{}',
  public_summary text not null,
  threshold_amount_cents bigint not null check (threshold_amount_cents > 0),
  threshold_supporters integer not null check (threshold_supporters > 0),
  deadline_at timestamptz not null,
  verification_method text not null,
  baseline_rule text not null,
  exit_rule text not null,
  review_status text not null default 'draft' check (
    review_status in ('draft', 'submitted', 'needs_evidence', 'challenge_window', 'approved', 'blocked', 'finalized')
  ),
  challenge_window_ends_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.mpgf_public_goods_identity_attestations (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles (id) on delete cascade,
  user_ref text not null,
  provider text not null check (
    provider in ('demo_self_attestation', 'repository_profile', 'external_proof_of_personhood')
  ),
  human_score_bps integer not null check (human_score_bps between 0 and 10000),
  expires_at timestamptz not null,
  status text not null check (status in ('active', 'expired', 'revoked', 'pending_review')),
  redacted_reference text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.mpgf_public_goods_pledges (
  id uuid primary key default gen_random_uuid(),
  campaign_id text not null references public.mpgf_public_goods_campaigns (id) on delete cascade,
  profile_id uuid references public.profiles (id) on delete set null,
  user_ref text not null,
  amount_cents bigint not null check (amount_cents > 0),
  currency text not null default 'usd' check (currency = 'usd'),
  acceptable_counterpart_buckets text[] not null default array['any-pre-vetted-distinct-moral-bucket'],
  minimum_counterparty_cleared_cents bigint not null default 100 check (minimum_counterparty_cleared_cents >= 0),
  max_exposure_cents bigint not null default 0 check (max_exposure_cents >= 0),
  donor_exposure_disclosure jsonb not null default '{}'::jsonb,
  visibility_mode text not null check (
    visibility_mode in ('private_amount', 'public_supporter', 'public_reason')
  ),
  is_recurring boolean not null default false,
  capture_mode text not null check (
    capture_mode in ('external_handoff', 'stored_payment_method', 'signed_intent')
  ),
  eligibility_state text not null default 'pending_review' check (
    eligibility_state in ('eligible', 'pending_review', 'duplicate_identity', 'below_minimum', 'blocked')
  ),
  human_score_bps integer not null default 0 check (human_score_bps between 0 and 10000),
  status text not null default 'pledged' check (status in ('pledged', 'captured', 'voided', 'expired')),
  supporter_reason text,
  payment_intent_ref text,
  created_at timestamptz not null default timezone('utc', now()),
  constraint mpgf_public_goods_no_custody_default check (
    capture_mode <> 'stored_payment_method' or payment_intent_ref is not null
  )
);

create table if not exists public.mpgf_public_goods_allocation_results (
  id uuid primary key default gen_random_uuid(),
  round_id text not null references public.mpgf_public_goods_rounds (id) on delete cascade,
  campaign_id text not null references public.mpgf_public_goods_campaigns (id) on delete cascade,
  formula_version text not null default 'cg_vqaf_capital_constrained_qf_v1' check (
    formula_version = 'cg_vqaf_capital_constrained_qf_v1'
  ),
  qf_allocation_policy text not null default 'capital_constrained_lambda_bisection_with_per_campaign_cap' check (
    qf_allocation_policy = 'capital_constrained_lambda_bisection_with_per_campaign_cap'
  ),
  qf_lambda numeric not null default 0 check (qf_lambda >= 0),
  direct_eligible_cents bigint not null check (direct_eligible_cents >= 0),
  verified_supporter_count integer not null check (verified_supporter_count >= 0),
  base_match_cents bigint not null check (base_match_cents >= 0),
  qf_score numeric not null check (qf_score >= 0),
  qf_bonus_cents bigint not null check (qf_bonus_cents >= 0),
  qf_bonus_cap_cents bigint not null check (qf_bonus_cap_cents >= 0),
  total_payout_cents bigint not null check (total_payout_cents >= 0),
  status text not null check (
    status in ('threshold_pending', 'threshold_met', 'review_pending', 'payable', 'expired', 'blocked')
  ),
  proof_required text not null check (
    proof_required in ('external_destination_receipt', 'provider_webhook_and_review', 'signed_intent_review')
  ),
  custody_mode text not null check (
    custody_mode in ('no_custody_external_handoff', 'provider_or_fiscal_host_required')
  ),
  source_contribution_digest text not null default 'sha256:pending-source-proof' check (
    source_contribution_digest ~ '^sha256:[0-9a-f]{64}$' or source_contribution_digest = 'sha256:pending-source-proof'
  ),
  eligible_contribution_record_count integer not null default 0 check (eligible_contribution_record_count >= 0),
  raw_payment_object_count integer not null default 0 check (raw_payment_object_count >= 0),
  unique_counted_identity_count integer not null default 0 check (
    unique_counted_identity_count >= 0 and unique_counted_identity_count <= eligible_contribution_record_count
  ),
  regenerated_from_contribution_records boolean not null default false,
  locked_parameter_digest text not null default 'sha256:pending-parameter-proof' check (
    locked_parameter_digest ~ '^sha256:[0-9a-f]{64}$' or locked_parameter_digest = 'sha256:pending-parameter-proof'
  ),
  allocation_calculation_hash text not null default 'sha256:pending-calculation-proof' check (
    allocation_calculation_hash ~ '^sha256:[0-9a-f]{64}$' or allocation_calculation_hash = 'sha256:pending-calculation-proof'
  ),
  parameters_locked_before_round_open boolean not null default true check (parameters_locked_before_round_open = true),
  finalized_at timestamptz not null default timezone('utc', now()),
  constraint mpgf_public_goods_allocation_eligible_rows_within_raw_rows
    check (eligible_contribution_record_count <= raw_payment_object_count),
  unique (round_id, campaign_id)
);

create table if not exists public.mpgf_public_goods_payment_proofs (
  id uuid primary key default gen_random_uuid(),
  pledge_id uuid references public.mpgf_public_goods_pledges (id) on delete set null,
  campaign_id text not null references public.mpgf_public_goods_campaigns (id) on delete cascade,
  external_receipt_ref text,
  charity_receipt_ref text,
  amount_verified_cents bigint not null default 0 check (amount_verified_cents >= 0),
  status text not null default 'pending_review' check (
    status in ('pending_review', 'verified', 'rejected', 'superseded')
  ),
  reason_code text not null default 'needs_destination_evidence' check (
    reason_code in (
      'destination_verified',
      'needs_destination_evidence',
      'needs_identity_evidence',
      'blocked_threat_baseline',
      'blocked_destination_risk',
      'challenge_opened',
      'challenge_resolved',
      'external_handoff_verified',
      'external_handoff_failed',
      'duplicate_identity_blocked',
      'appeal_requested',
      'appeal_denied',
      'appeal_upheld'
    )
  ),
  reconciliation_source text not null default 'external_receipt' check (
    reconciliation_source in (
      'external_receipt',
      'fiscal_host_webhook',
      'sponsor_signed_intent',
      'every_org_partner_webhook'
    )
  ),
  source_event_ref text,
  verified_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.mpgf_public_goods_review_cases (
  id uuid primary key default gen_random_uuid(),
  campaign_id text not null references public.mpgf_public_goods_campaigns (id) on delete cascade,
  state text not null check (
    state in ('draft', 'submitted', 'needs_evidence', 'challenge_window', 'approved', 'blocked', 'finalized')
  ),
  action text not null check (
    action in ('approve', 'needs_evidence', 'block', 'challenge', 'finalize')
  ),
  reason_code text not null check (
    reason_code in (
      'destination_verified',
      'needs_destination_evidence',
      'needs_identity_evidence',
      'blocked_threat_baseline',
      'blocked_destination_risk',
      'challenge_opened',
      'challenge_resolved',
      'external_handoff_verified',
      'external_handoff_failed',
      'duplicate_identity_blocked',
      'appeal_requested',
      'appeal_denied',
      'appeal_upheld'
    )
  ),
  reviewer_id uuid references public.profiles (id) on delete set null,
  opened_at timestamptz not null default timezone('utc', now()),
  closed_at timestamptz,
  appeal_status text not null default 'none' check (
    appeal_status in ('none', 'appeal_requested', 'appeal_denied', 'appeal_upheld')
  ),
  challenge_window_ends_at timestamptz,
  public_notes text not null default '',
  allowed_next_actions text[] not null default '{}'
);

create table if not exists public.mpgf_public_goods_subscriptions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles (id) on delete cascade,
  user_ref text not null,
  pool_id text not null references public.mpgf_public_goods_match_pools (id) on delete cascade,
  amount_cents bigint not null check (amount_cents > 0),
  currency text not null default 'usd' check (currency = 'usd'),
  interval text not null check (interval in ('monthly', 'annual')),
  status text not null default 'active' check (
    status in ('active', 'paused', 'cancelled', 'past_due', 'expired')
  ),
  capture_mode text not null default 'external_handoff' check (
    capture_mode in ('external_handoff', 'stored_payment_method', 'signed_intent')
  ),
  mode text not null default 'pledge_only' check (mode in ('pledge_only', 'test_payment', 'real_money')),
  provider_subscription_ref text,
  next_charge_at timestamptz not null,
  created_at timestamptz not null default timezone('utc', now()),
  constraint mpgf_public_goods_subscription_no_hidden_provider check (
    mode = 'pledge_only' or provider_subscription_ref is not null
  )
);

create table if not exists public.mpgf_public_goods_experiment_assignments (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles (id) on delete cascade,
  user_ref_hash text not null,
  experiment_key text not null,
  variant text not null,
  analytics_policy text not null default 'privacy_safe_no_raw_private_text' check (
    analytics_policy = 'privacy_safe_no_raw_private_text'
  ),
  assigned_at timestamptz not null default timezone('utc', now()),
  unique (experiment_key, user_ref_hash)
);

create table if not exists public.mpgf_public_goods_analytics_events (
  id uuid primary key default gen_random_uuid(),
  user_ref_hash text,
  experiment_assignment_id uuid references public.mpgf_public_goods_experiment_assignments (id) on delete set null,
  event_type text not null,
  campaign_id text references public.mpgf_public_goods_campaigns (id) on delete set null,
  event_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  constraint mpgf_public_goods_analytics_no_raw_contact check (
    not (event_json ? 'email') and
    not (event_json ? 'phone') and
    not (event_json ? 'private_wish') and
    not (event_json ? 'raw_evidence_text')
  )
);

create table if not exists public.mpgf_pledge_intents (
  id text primary key,
  round_id text not null references public.mpgf_public_goods_rounds (id) on delete cascade,
  campaign_id text not null references public.mpgf_public_goods_campaigns (id) on delete cascade,
  profile_id uuid references public.profiles (id) on delete set null,
  user_ref_hash text not null check (user_ref_hash ~ '^sha256:[0-9a-f]{64}$'),
  idempotency_key_hash text not null unique check (idempotency_key_hash ~ '^sha256:[0-9a-f]{64}$'),
  amount_cents bigint not null check (amount_cents > 0),
  currency text not null default 'usd' check (currency = 'usd'),
  acceptable_counterpart_buckets text[] not null default array['any-pre-vetted-distinct-moral-bucket'],
  minimum_counterparty_cleared_cents bigint not null default 100 check (minimum_counterparty_cleared_cents >= 0),
  max_exposure_cents bigint not null default 0 check (max_exposure_cents >= 0),
  visibility_pref text not null default 'private_amount' check (
    visibility_pref in ('private_amount', 'public_supporter', 'public_reason')
  ),
  payment_state text not null default 'intent_created' check (
    payment_state in (
      'intent_created',
      'identity_verified',
      'identity_pending_review',
      'authorization_pending',
      'authorized',
      'manual_evidence_required',
      'provider_event_received',
      'captured',
      'voided',
      'expired'
    )
  ),
  counting_state text not null default 'preview_only' check (
    counting_state in ('not_counted', 'preview_only', 'eligible_pending_thresholds', 'counted_after_review', 'excluded')
  ),
  fallback_rule jsonb not null default jsonb_build_object(
    'manualEvidencePath', '/api/mpgf/evidence/manual',
    'providerUnavailableMode', 'manual_evidence_after_review',
    'roundNotClearedMode', 'expire_without_charge',
    'recipientVerificationFailedMode', 'release_authorization_or_reroute_to_next_eligible_common_ground_project',
    'authorizationExpiredMode', 'reauthorize_only_after_clearance_reconfirmed'
  ),
  donor_exposure_disclosure jsonb not null default '{}'::jsonb,
  cross_view_clearance_policy text not null default 'explicit_distinct_counterpart_bucket_conditions_before_moral_trade_counting',
  capture_policy text not null default 'capture_only_after_threshold_review_and_challenge_window' check (
    capture_policy = 'capture_only_after_threshold_review_and_challenge_window'
  ),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.mpgf_identity_verifications (
  id text primary key,
  pledge_intent_id text not null references public.mpgf_pledge_intents (id) on delete cascade,
  provider text not null check (
    provider in ('demo_self_attestation', 'repository_profile', 'external_proof_of_personhood')
  ),
  status text not null check (status in ('verified', 'pending_review', 'duplicate_identity', 'blocked')),
  human_score_bps integer not null check (human_score_bps between 0 and 10000),
  redacted_reference text not null,
  duplicate_proof_hash text check (duplicate_proof_hash is null or duplicate_proof_hash ~ '^sha256:[0-9a-f]{64}$'),
  counts_for_matching boolean not null default false,
  verified_at timestamptz,
  expires_at timestamptz not null,
  created_at timestamptz not null default timezone('utc', now()),
  unique (pledge_intent_id, provider)
);

create table if not exists public.mpgf_payment_authorizations (
  id text primary key,
  pledge_intent_id text not null references public.mpgf_pledge_intents (id) on delete cascade,
  provider text not null check (provider in ('stripe', 'fiscal_host', 'external_provider', 'manual_evidence')),
  provider_ref_hash text check (provider_ref_hash is null or provider_ref_hash ~ '^sha256:[0-9a-f]{64}$'),
  amount_cents bigint not null check (amount_cents > 0),
  currency text not null default 'usd' check (currency = 'usd'),
  status text not null check (
    status in (
      'requires_identity',
      'authorized',
      'manual_fallback_required',
      'provider_event_received',
      'captured',
      'failed',
      'voided',
      'expired'
    )
  ),
  capture_policy text not null default 'capture_only_after_threshold_review_and_challenge_window' check (
    capture_policy = 'capture_only_after_threshold_review_and_challenge_window'
  ),
  manual_evidence_path text,
  authorized_at timestamptz,
  captured_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  constraint mpgf_payment_authorizations_provider_or_manual check (
    (provider = 'manual_evidence' and manual_evidence_path = '/api/mpgf/evidence/manual')
    or (provider <> 'manual_evidence' and provider_ref_hash is not null)
  )
);

create table if not exists public.mpgf_provider_payment_events (
  id text primary key,
  payment_authorization_id text not null references public.mpgf_payment_authorizations (id) on delete cascade,
  pledge_intent_id text not null references public.mpgf_pledge_intents (id) on delete cascade,
  provider text not null check (provider in ('stripe', 'fiscal_host', 'external_provider', 'manual_evidence')),
  provider_event_ref_hash text not null unique check (provider_event_ref_hash ~ '^sha256:[0-9a-f]{64}$'),
  event_type text not null check (
    event_type in (
      'authorization_created',
      'authorization_failed',
      'capture_succeeded',
      'capture_failed',
      'refund_succeeded',
      'payment_expired'
    )
  ),
  amount_cents bigint not null check (amount_cents >= 0),
  status text not null check (status in ('recorded', 'needs_review', 'rejected')),
  signature_verified boolean not null default false,
  payload_hash text check (payload_hash is null or payload_hash ~ '^sha256:[0-9a-f]{64}$'),
  final_payout_authorized boolean not null default false check (final_payout_authorized = false),
  append_only_hash text not null check (append_only_hash ~ '^sha256:[0-9a-f]{64}$'),
  received_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.mpgf_moral_profiles (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  primary_causes text[] not null default '{}',
  secondary_common_ground_causes text[] not null default '{}',
  privacy_stage text not null default 'private' check (privacy_stage in ('private', 'aggregate_only', 'public_opt_in')),
  no_global_moral_ranking boolean not null default true check (no_global_moral_ranking = true),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.mpgf_support_signals (
  id text primary key,
  round_id text not null references public.mpgf_public_goods_rounds (id) on delete cascade,
  campaign_id text not null references public.mpgf_public_goods_campaigns (id) on delete cascade,
  profile_id uuid references public.profiles (id) on delete set null,
  user_ref_hash text not null check (user_ref_hash ~ '^sha256:[0-9a-f]{64}$'),
  moral_cluster_hash text not null check (moral_cluster_hash ~ '^sha256:[0-9a-f]{64}$'),
  signal_type text not null check (
    signal_type in ('strong_support', 'weak_common_ground_support', 'dissent_review_requested')
  ),
  strength_bps integer not null check (strength_bps between 0 and 10000),
  private_by_default boolean not null default true check (private_by_default = true),
  counts_for_common_ground boolean not null default true,
  no_global_moral_ranking boolean not null default true check (no_global_moral_ranking = true),
  calc_hash text not null check (calc_hash ~ '^sha256:[0-9a-f]{64}$'),
  created_at timestamptz not null default timezone('utc', now()),
  unique (round_id, campaign_id, user_ref_hash)
);

create table if not exists public.mpgf_user_budgets (
  id text primary key,
  round_id text not null references public.mpgf_public_goods_rounds (id) on delete cascade,
  profile_id uuid references public.profiles (id) on delete set null,
  user_ref_hash text not null check (user_ref_hash ~ '^sha256:[0-9a-f]{64}$'),
  budget_period text not null default 'monthly' check (budget_period in ('monthly', 'round_limited')),
  monthly_budget_cents bigint check (monthly_budget_cents is null or monthly_budget_cents >= 0),
  round_budget_cents bigint check (round_budget_cents is null or round_budget_cents >= 0),
  total_budget_cents bigint not null check (total_budget_cents > 0),
  settlement_currency text not null default 'usd' check (settlement_currency = 'usd'),
  currency text not null default 'usd' check (currency = 'usd'),
  recurrence_rule text,
  payment_profile_ref_hash text check (
    payment_profile_ref_hash is null or payment_profile_ref_hash ~ '^sha256:[0-9a-f]{64}$'
  ),
  external_payment_evidence_mode text not null default 'reviewed_manual_evidence_only' check (
    external_payment_evidence_mode = 'reviewed_manual_evidence_only'
  ),
  default_visibility text not null default 'private_aggregate_only' check (
    default_visibility in ('private_aggregate_only', 'public_after_aggregation_review')
  ),
  default_allocation_baseline text not null default 'participant_default_allocation_or_non_participation',
  baseline_confidence_level text not null default 'medium' check (
    baseline_confidence_level in ('low', 'medium', 'high')
  ),
  baseline_confidence_rationale text,
  participant_surplus_confirmation_required boolean not null default true check (
    participant_surplus_confirmation_required = true
  ),
  participant_surplus_confirmed_at timestamptz,
  eligible_project_set_hash text not null default 'sha256:0000000000000000000000000000000000000000000000000000000000000000' check (
    eligible_project_set_hash ~ '^sha256:[0-9a-f]{64}$'
  ),
  eligible_pool_set_hash text not null default 'sha256:0000000000000000000000000000000000000000000000000000000000000000' check (
    eligible_pool_set_hash ~ '^sha256:[0-9a-f]{64}$'
  ),
  project_set_change_policy text not null default 'require_reconfirmation' check (
    project_set_change_policy in ('require_reconfirmation', 'allow_if_matches_preapproved_policy')
  ),
  fallback_reroute_policy_ref text not null default 'frozen_eligible_set_then_carry_forward_release_hold_or_manual_review_v1',
  fallback_eligible_project_set_hash text not null default 'sha256:0000000000000000000000000000000000000000000000000000000000000000' check (
    fallback_eligible_project_set_hash ~ '^sha256:[0-9a-f]{64}$'
  ),
  unroutable_budget_policy text not null default 'carry_forward' check (
    unroutable_budget_policy in ('carry_forward', 'release_hold', 'manual_review')
  ),
  fallback_rule jsonb not null default jsonb_build_object(
    'onProjectFailure', 'release_hold',
    'onAuthorizationExpiry', 'reauthorize_near_capture',
    'carryForwardAllowed', true
  ),
  round_lock_confirmation_required boolean not null default true check (
    round_lock_confirmation_required = true
  ),
  cancel_until timestamptz,
  terms_snapshot_hash text check (
    terms_snapshot_hash is null or terms_snapshot_hash ~ '^sha256:[0-9a-f]{64}$'
  ),
  participant_confirmation_hash text check (
    participant_confirmation_hash is null or participant_confirmation_hash ~ '^sha256:[0-9a-f]{64}$'
  ),
  status text not null default 'draft' check (
    status in (
      'draft',
      'active',
      'authorization_pending',
      'authorized',
      'partially_routed',
      'settled',
      'released',
      'voided',
      'expired'
    )
  ),
  no_global_moral_ranking boolean not null default true check (no_global_moral_ranking = true),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (round_id, user_ref_hash)
);

create table if not exists public.mpgf_support_stances (
  id text primary key,
  budget_id text references public.mpgf_user_budgets (id) on delete cascade,
  round_id text not null references public.mpgf_public_goods_rounds (id) on delete cascade,
  campaign_id text references public.mpgf_public_goods_campaigns (id) on delete cascade,
  bucket_id text,
  profile_id uuid references public.profiles (id) on delete set null,
  user_ref_hash text not null check (user_ref_hash ~ '^sha256:[0-9a-f]{64}$'),
  stance text not null check (stance in ('strong', 'weak', 'dissent', 'abstain')),
  max_alloc_amount_cents bigint check (max_alloc_amount_cents is null or max_alloc_amount_cents >= 0),
  max_alloc_pct_bps integer check (max_alloc_pct_bps is null or max_alloc_pct_bps between 0 and 10000),
  rank_order integer check (rank_order is null or rank_order > 0),
  redacted_note_hash text check (
    redacted_note_hash is null or redacted_note_hash ~ '^sha256:[0-9a-f]{64}$'
  ),
  acceptable_counter_buckets text[] not null default '{}',
  private_by_default boolean not null default true check (private_by_default = true),
  counts_for_common_ground boolean not null default true,
  no_global_moral_ranking boolean not null default true check (no_global_moral_ranking = true),
  created_at timestamptz not null default timezone('utc', now()),
  constraint mpgf_support_stances_project_or_bucket check (
    (campaign_id is not null and bucket_id is null) or (campaign_id is null and bucket_id is not null)
  ),
  unique (round_id, user_ref_hash, campaign_id, bucket_id)
);

create table if not exists public.mpgf_coalition_candidates (
  id text primary key,
  round_id text not null references public.mpgf_public_goods_rounds (id) on delete cascade,
  campaign_id text not null references public.mpgf_public_goods_campaigns (id) on delete cascade,
  hard_gate_status text not null check (
    hard_gate_status in ('passed', 'pending_review', 'challenge_open', 'blocked')
  ),
  candidate_status text not null check (
    candidate_status in (
      'threshold_feasible',
      'amount_gap',
      'supporter_gap',
      'cluster_gap',
      'hard_gate_pending',
      'hard_gate_blocked'
    )
  ),
  direct_eligible_cents bigint not null default 0 check (direct_eligible_cents >= 0),
  eligible_weak_budget_cents bigint not null default 0 check (eligible_weak_budget_cents >= 0),
  routed_weak_budget_cents bigint not null default 0 check (
    routed_weak_budget_cents >= 0 and routed_weak_budget_cents <= eligible_weak_budget_cents
  ),
  threshold_amount_cents bigint not null check (threshold_amount_cents > 0),
  threshold_supporters integer not null check (threshold_supporters > 0),
  threshold_cluster_min integer not null default 2 check (threshold_cluster_min > 0),
  active_supporter_count integer not null default 0 check (active_supporter_count >= 0),
  active_cluster_count integer not null default 0 check (active_cluster_count >= 0),
  threshold_feasible_flag boolean not null default false,
  ecm_batch_clearing_eligible boolean not null default false,
  failure_bonus_or_carry_forward_eligible boolean not null default false,
  no_global_moral_ranking boolean not null default true check (no_global_moral_ranking = true),
  calculation_hash text not null check (calculation_hash ~ '^sha256:[0-9a-f]{64}$'),
  created_at timestamptz not null default timezone('utc', now()),
  unique (round_id, campaign_id)
);

create table if not exists public.mpgf_round_rulebooks (
  id text primary key,
  round_id text not null references public.mpgf_public_goods_rounds (id) on delete cascade,
  policy text not null default 'ecm_core_supervised_custody_cross_view_batch_rulebook_v1',
  ecm_plus_hybrid_policy text not null default 'ecm_core_plus_moral_trade_safeguards_preserve_capped_qf_and_review_stack_v1',
  batch_cadence_policy text not null default 'recurring_batch_rounds_close_clear_jit_authorize_custody_verify_challenge_release_audit',
  custody_policy text not null default 'partner_or_fiscal_host_supervised_custody_required_for_cleared_funds_no_platform_escrow_claim',
  refund_reroute_policy text not null default 'donor_selected_refund_release_or_reroute_after_failed_cross_view_batch',
  cross_view_subsidy_policy text not null default 'base_1_to_1_then_capped_qf_plus_simple_cross_view_premium_schedule',
  batch_interval_min_days integer not null default 7 check (batch_interval_min_days = 7),
  batch_interval_max_days integer not null default 14 check (batch_interval_max_days = 14),
  cross_view_subsidy_schedule jsonb not null default '[]'::jsonb,
  rulebook_json jsonb not null,
  published_before_round_open boolean not null default true,
  no_global_moral_ranking boolean not null default true check (no_global_moral_ranking = true),
  moral_reputation_can_increase_allocation_power boolean not null default false check (
    moral_reputation_can_increase_allocation_power = false
  ),
  created_at timestamptz not null default timezone('utc', now()),
  unique (round_id, policy)
);

create table if not exists public.mpgf_recipient_registry (
  id text primary key,
  campaign_id text not null references public.mpgf_public_goods_campaigns (id) on delete cascade,
  legal_entity_or_fiscal_host text not null,
  registry_status text not null check (
    registry_status in (
      'eligible_after_review_and_challenge',
      'review_required_before_payable',
      'demo_only_not_payable',
      'blocked_not_payable'
    )
  ),
  payout_rail text not null check (
    payout_rail in ('partner_donation_route', 'fiscal_host_release', 'signed_sponsor_route', 'not_payable_demo_only')
  ),
  allowed_uses text[] not null default '{}',
  receipt_or_milestone_rules text not null,
  review_state text not null,
  challenge_state text not null check (challenge_state in ('challenge_window_open', 'closed_or_not_open')),
  challenge_window_ends_at timestamptz,
  public_aggregation_only boolean not null default true check (public_aggregation_only = true),
  created_at timestamptz not null default timezone('utc', now()),
  unique (campaign_id)
);

create table if not exists public.mpgf_custody_holds (
  id text primary key,
  round_id text not null references public.mpgf_public_goods_rounds (id) on delete cascade,
  campaign_id text not null references public.mpgf_public_goods_campaigns (id) on delete cascade,
  pledge_intent_id text references public.mpgf_pledge_intents (id) on delete set null,
  provider text not null check (provider in ('stripe', 'fiscal_host', 'external_provider', 'manual_evidence')),
  custodial_state text not null check (
    custodial_state in (
      'awaiting_partner_or_fiscal_host_custody_confirmation',
      'custody_confirmed',
      'release_ready_after_challenge_window',
      'released',
      'cancelled',
      'expired'
    )
  ),
  amount_cents bigint not null check (amount_cents >= 0),
  max_exposure_cents bigint not null check (max_exposure_cents >= amount_cents),
  escrow_claim_allowed boolean not null default false check (escrow_claim_allowed = false),
  release_only_after_recipient_verification boolean not null default true check (
    release_only_after_recipient_verification = true
  ),
  release_only_after_challenge_window_completion boolean not null default true check (
    release_only_after_challenge_window_completion = true
  ),
  failure_rule jsonb not null default '{}'::jsonb,
  provider_ref_hash text check (provider_ref_hash is null or provider_ref_hash ~ '^sha256:[0-9a-f]{64}$'),
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.mpgf_conditional_pledges (
  id text primary key,
  round_id text not null references public.mpgf_public_goods_rounds (id) on delete cascade,
  campaign_id text not null references public.mpgf_public_goods_campaigns (id) on delete cascade,
  profile_id uuid references public.profiles (id) on delete set null,
  amount_cents bigint not null check (amount_cents > 0),
  counted_cap_cents bigint not null check (counted_cap_cents > 0),
  acceptable_counterpart_buckets text[] not null default array['any-pre-vetted-distinct-moral-bucket'],
  minimum_counterparty_cleared_cents bigint not null default 100 check (minimum_counterparty_cleared_cents >= 0),
  max_exposure_cents bigint not null default 0 check (max_exposure_cents >= 0),
  visibility text not null default 'private_amount' check (visibility in ('private_amount', 'public_supporter', 'public_reason')),
  payment_mode text not null check (payment_mode in ('every_org_fast_route', 'stripe_setup_intent_saved_commitment', 'manual_proof_fallback')),
  status text not null default 'signal_only' check (
    status in ('signal_only', 'pledge_saved', 'pending_verification', 'threshold_cleared', 'counted', 'voided', 'expired')
  ),
  deadline_at timestamptz not null,
  capture_policy text not null default 'capture_only_after_threshold_review_and_challenge_window' check (
    capture_policy = 'capture_only_after_threshold_review_and_challenge_window'
  ),
  failure_path_disclosure jsonb not null default '{}'::jsonb,
  cross_view_clearance_policy text not null default 'explicit_distinct_counterpart_bucket_conditions_before_moral_trade_counting',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.mpgf_every_org_partner_events (
  id text primary key,
  round_id text not null references public.mpgf_public_goods_rounds (id) on delete cascade,
  campaign_id text references public.mpgf_public_goods_campaigns (id) on delete set null,
  conditional_pledge_id text references public.mpgf_conditional_pledges (id) on delete set null,
  pledge_intent_id text references public.mpgf_pledge_intents (id) on delete set null,
  contributor_ref_hash text check (contributor_ref_hash is null or contributor_ref_hash ~ '^sha256:[0-9a-f]{64}$'),
  partner_donation_id_hash text check (partner_donation_id_hash is null or partner_donation_id_hash ~ '^sha256:[0-9a-f]{64}$'),
  charge_id_hash text not null unique check (charge_id_hash ~ '^sha256:[0-9a-f]{64}$'),
  nonprofit_ref_hash text check (nonprofit_ref_hash is null or nonprofit_ref_hash ~ '^sha256:[0-9a-f]{64}$'),
  amount_cents bigint not null check (amount_cents >= 0),
  net_amount_cents bigint check (net_amount_cents is null or net_amount_cents >= 0),
  currency text not null default 'USD' check (currency ~ '^[A-Z]{3}$'),
  frequency text,
  donation_date timestamptz,
  status text not null check (status in ('recorded', 'needs_review', 'rejected')),
  structure_verified boolean not null default false,
  webhook_verified boolean not null default false,
  auto_creates_contribution_evidence boolean not null default false,
  evidence_review_state text not null check (evidence_review_state in ('pending_review', 'needs_review', 'rejected')),
  review_required_before_counting boolean not null default true check (review_required_before_counting = true),
  final_payout_authorized boolean not null default false check (final_payout_authorized = false),
  payload_hash text not null check (payload_hash ~ '^sha256:[0-9a-f]{64}$'),
  append_only_hash text not null check (append_only_hash ~ '^sha256:[0-9a-f]{64}$'),
  received_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  constraint mpgf_every_org_events_recorded_requires_verified check (
    status <> 'recorded'
    or (
      structure_verified = true
      and webhook_verified = true
      and partner_donation_id_hash is not null
      and campaign_id is not null
      and amount_cents > 0
    )
  )
);

create table if not exists public.mpgf_payment_method_tokens (
  id text primary key,
  profile_id uuid references public.profiles (id) on delete set null,
  provider text not null check (provider in ('stripe')),
  provider_customer_id_hash text not null check (provider_customer_id_hash ~ '^sha256:[0-9a-f]{64}$'),
  provider_payment_method_id_hash text not null check (provider_payment_method_id_hash ~ '^sha256:[0-9a-f]{64}$'),
  setup_status text not null check (setup_status in ('setup_intent_created', 'setup_succeeded', 'setup_failed', 'revoked')),
  future_use_consent_at timestamptz,
  raw_card_data_stored boolean not null default false check (raw_card_data_stored = false),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.mpgf_payment_events (
  id text primary key,
  conditional_pledge_id text references public.mpgf_conditional_pledges (id) on delete set null,
  provider text not null check (provider in ('stripe', 'every_org', 'fiscal_host', 'manual_evidence')),
  provider_event_id_hash text not null unique check (provider_event_id_hash ~ '^sha256:[0-9a-f]{64}$'),
  provider_status text not null,
  amount_cents bigint not null check (amount_cents >= 0),
  signature_verified boolean not null default false,
  payload_hash text check (payload_hash is null or payload_hash ~ '^sha256:[0-9a-f]{64}$'),
  verified_at timestamptz,
  final_payout_authorized boolean not null default false check (final_payout_authorized = false),
  append_only_hash text not null check (append_only_hash ~ '^sha256:[0-9a-f]{64}$'),
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.mpgf_stripe_saved_commitments (
  id text primary key,
  round_id text not null references public.mpgf_public_goods_rounds (id) on delete cascade,
  campaign_id text not null references public.mpgf_public_goods_campaigns (id) on delete cascade,
  conditional_pledge_id text references public.mpgf_conditional_pledges (id) on delete set null,
  pledge_intent_id text references public.mpgf_pledge_intents (id) on delete set null,
  profile_id uuid references public.profiles (id) on delete set null,
  user_ref_hash text not null check (user_ref_hash ~ '^sha256:[0-9a-f]{64}$'),
  amount_cents bigint not null check (amount_cents > 0),
  currency text not null default 'usd' check (currency = 'usd'),
  provider_customer_id_hash text check (provider_customer_id_hash is null or provider_customer_id_hash ~ '^sha256:[0-9a-f]{64}$'),
  provider_setup_intent_id_hash text unique check (provider_setup_intent_id_hash is null or provider_setup_intent_id_hash ~ '^sha256:[0-9a-f]{64}$'),
  provider_payment_method_id_hash text check (provider_payment_method_id_hash is null or provider_payment_method_id_hash ~ '^sha256:[0-9a-f]{64}$'),
  setup_status text not null default 'setup_intent_created' check (
    setup_status in ('setup_intent_created', 'setup_succeeded', 'setup_failed', 'revoked')
  ),
  setup_usage text not null default 'off_session' check (setup_usage = 'off_session'),
  future_use_consent_at timestamptz,
  explicit_future_use_consent_required boolean not null default true check (explicit_future_use_consent_required = true),
  creates_charge_immediately boolean not null default false check (creates_charge_immediately = false),
  long_lived_manual_card_hold boolean not null default false check (long_lived_manual_card_hold = false),
  payment_intent_created_before_gates boolean not null default false check (payment_intent_created_before_gates = false),
  raw_card_data_stored boolean not null default false check (raw_card_data_stored = false),
  review_required_before_counting boolean not null default true check (review_required_before_counting = true),
  final_payout_authorized boolean not null default false check (final_payout_authorized = false),
  calc_hash text not null check (calc_hash ~ '^sha256:[0-9a-f]{64}$'),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.mpgf_stripe_saved_commitment_events (
  id text primary key,
  saved_commitment_id text references public.mpgf_stripe_saved_commitments (id) on delete set null,
  conditional_pledge_id text references public.mpgf_conditional_pledges (id) on delete set null,
  pledge_intent_id text references public.mpgf_pledge_intents (id) on delete set null,
  provider_event_id_hash text not null unique check (provider_event_id_hash ~ '^sha256:[0-9a-f]{64}$'),
  provider_object_id_hash text check (provider_object_id_hash is null or provider_object_id_hash ~ '^sha256:[0-9a-f]{64}$'),
  provider_customer_id_hash text check (provider_customer_id_hash is null or provider_customer_id_hash ~ '^sha256:[0-9a-f]{64}$'),
  provider_payment_method_id_hash text check (provider_payment_method_id_hash is null or provider_payment_method_id_hash ~ '^sha256:[0-9a-f]{64}$'),
  event_type text not null check (
    event_type in (
      'setup_intent.created',
      'setup_intent.succeeded',
      'setup_intent.setup_failed',
      'setup_intent.canceled',
      'payment_intent.created',
      'payment_intent.succeeded',
      'payment_intent.payment_failed',
      'payment_intent.canceled',
      'payment_intent.requires_action'
    )
  ),
  event_state text not null,
  status text not null check (status in ('recorded', 'needs_review', 'rejected')),
  signature_verified boolean not null default false,
  structure_verified boolean not null default false,
  payload_hash text not null check (payload_hash ~ '^sha256:[0-9a-f]{64}$'),
  append_only_hash text not null check (append_only_hash ~ '^sha256:[0-9a-f]{64}$'),
  review_required_before_counting boolean not null default true check (review_required_before_counting = true),
  final_payout_authorized boolean not null default false check (final_payout_authorized = false),
  received_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.mpgf_stripe_conditional_payment_intent_runs (
  id text primary key,
  round_id text not null references public.mpgf_public_goods_rounds (id) on delete cascade,
  campaign_id text not null references public.mpgf_public_goods_campaigns (id) on delete cascade,
  conditional_pledge_id text references public.mpgf_conditional_pledges (id) on delete set null,
  pledge_intent_id text references public.mpgf_pledge_intents (id) on delete set null,
  provider_customer_id_hash text not null check (provider_customer_id_hash ~ '^sha256:[0-9a-f]{64}$'),
  provider_payment_method_id_hash text not null check (provider_payment_method_id_hash ~ '^sha256:[0-9a-f]{64}$'),
  provider_setup_intent_id_hash text not null check (provider_setup_intent_id_hash ~ '^sha256:[0-9a-f]{64}$'),
  amount_cents bigint not null check (amount_cents > 0),
  currency text not null default 'usd' check (currency = 'usd'),
  gate_state jsonb not null,
  blocked_by text[] not null default '{}',
  payment_intent_creation_allowed boolean not null,
  setup_intent_first boolean not null default true check (setup_intent_first = true),
  confirm_off_session boolean not null default true check (confirm_off_session = true),
  capture_method text not null default 'automatic' check (capture_method = 'automatic'),
  long_lived_manual_card_hold boolean not null default false check (long_lived_manual_card_hold = false),
  requires_stripe_signature_webhook_before_counting boolean not null default true check (requires_stripe_signature_webhook_before_counting = true),
  review_required_before_counting boolean not null default true check (review_required_before_counting = true),
  final_payout_authorized boolean not null default false check (final_payout_authorized = false),
  idempotency_key_hash text not null unique check (idempotency_key_hash ~ '^sha256:[0-9a-f]{64}$'),
  calc_hash text not null check (calc_hash ~ '^sha256:[0-9a-f]{64}$'),
  created_at timestamptz not null default timezone('utc', now()),
  constraint mpgf_stripe_payment_intent_run_requires_clear_gates check (
    payment_intent_creation_allowed = false
    or (
      gate_state ->> 'roundParametersLocked' = 'true'
      and gate_state ->> 'thresholdAmountCleared' = 'true'
      and gate_state ->> 'supporterCountCleared' = 'true'
      and gate_state ->> 'reviewApproved' = 'true'
      and gate_state ->> 'challengeWindowClosed' = 'true'
    )
  )
);

create table if not exists public.mpgf_sponsor_pool_entries (
  id text primary key,
  round_id text references public.mpgf_public_goods_rounds (id) on delete set null,
  sponsor_pool_id text not null references public.mpgf_public_goods_match_pools (id) on delete cascade,
  source_type text not null check (
    source_type in ('direct_sponsor_deposit', 'recurring_member_tithe', 'donation_offset_surplus', 'trade_surplus_tithe')
  ),
  amount_cents bigint not null check (amount_cents > 0),
  restricted_or_unrestricted text not null check (restricted_or_unrestricted in ('restricted_to_round', 'unrestricted_future_rounds')),
  provenance_hash text not null check (provenance_hash ~ '^sha256:[0-9a-f]{64}$'),
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.mpgf_allocation_results (
  id text primary key,
  round_id text not null references public.mpgf_public_goods_rounds (id) on delete cascade,
  campaign_id text not null references public.mpgf_public_goods_campaigns (id) on delete cascade,
  eligible_direct_cents bigint not null check (eligible_direct_cents >= 0),
  base_match_cents bigint not null check (base_match_cents >= 0),
  q_signal_cents bigint not null check (q_signal_cents >= 0),
  bonus_match_cents bigint not null check (bonus_match_cents >= 0),
  final_allocated_cents bigint not null check (final_allocated_cents >= 0),
  formula_version text not null check (formula_version = 'cg_vqaf_capital_constrained_qf_v1'),
  lambda numeric not null check (lambda >= 0),
  calculation_hash text not null check (calculation_hash ~ '^sha256:[0-9a-f]{64}$'),
  no_global_moral_ranking boolean not null default true check (no_global_moral_ranking = true),
  created_at timestamptz not null default timezone('utc', now()),
  unique (round_id, campaign_id, formula_version)
);

create table if not exists public.mpgf_dissent_notes (
  id text primary key,
  campaign_id text not null references public.mpgf_public_goods_campaigns (id) on delete cascade,
  filed_by_profile_id uuid references public.profiles (id) on delete set null,
  filer_ref_hash text not null check (filer_ref_hash ~ '^sha256:[0-9a-f]{64}$'),
  reason_code text not null check (
    reason_code in ('externality_review', 'threat_baseline_review', 'destination_review', 'collusion_review', 'other_reviewable_claim')
  ),
  public_summary text not null,
  status text not null default 'opened' check (status in ('opened', 'under_review', 'resolved', 'dismissed')),
  pauses_unreleased_milestones boolean not null default true,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.mpgf_milestones (
  id text primary key,
  campaign_id text not null references public.mpgf_public_goods_campaigns (id) on delete cascade,
  percent_release integer not null check (percent_release between 0 and 100),
  evidence_requirements jsonb not null default '{}'::jsonb,
  release_status text not null default 'pending' check (
    release_status in ('pending', 'partner_release_pending', 'released', 'paused', 'voided')
  ),
  created_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists mpgf_public_goods_payment_proofs_source_event_idx
on public.mpgf_public_goods_payment_proofs (reconciliation_source, source_event_ref)
where source_event_ref is not null;

create index if not exists mpgf_pledge_intents_round_campaign_idx
on public.mpgf_pledge_intents (round_id, campaign_id, payment_state, counting_state);

create index if not exists mpgf_pledge_intents_profile_idx
on public.mpgf_pledge_intents (profile_id, created_at desc);

create index if not exists mpgf_identity_verifications_intent_idx
on public.mpgf_identity_verifications (pledge_intent_id, status);

create index if not exists mpgf_payment_authorizations_intent_idx
on public.mpgf_payment_authorizations (pledge_intent_id, status);

create index if not exists mpgf_provider_payment_events_intent_idx
on public.mpgf_provider_payment_events (pledge_intent_id, received_at desc);

create index if not exists mpgf_support_signals_round_campaign_idx
on public.mpgf_support_signals (round_id, campaign_id, signal_type, created_at desc);

create index if not exists mpgf_user_budgets_round_status_idx
on public.mpgf_user_budgets (round_id, status);

create index if not exists mpgf_support_stances_round_campaign_idx
on public.mpgf_support_stances (round_id, campaign_id, stance);

create index if not exists mpgf_coalition_candidates_round_status_idx
on public.mpgf_coalition_candidates (round_id, candidate_status, threshold_feasible_flag);

create index if not exists mpgf_round_rulebooks_round_idx
on public.mpgf_round_rulebooks (round_id, policy);

create index if not exists mpgf_recipient_registry_status_idx
on public.mpgf_recipient_registry (registry_status, payout_rail);

create index if not exists mpgf_custody_holds_round_state_idx
on public.mpgf_custody_holds (round_id, custodial_state, created_at desc);

create index if not exists mpgf_conditional_pledges_round_campaign_idx
on public.mpgf_conditional_pledges (round_id, campaign_id, status, payment_mode);

create index if not exists mpgf_every_org_partner_events_round_campaign_idx
on public.mpgf_every_org_partner_events (round_id, campaign_id, status, received_at desc);

create index if not exists mpgf_every_org_partner_events_pledge_idx
on public.mpgf_every_org_partner_events (conditional_pledge_id, pledge_intent_id, received_at desc);

create index if not exists mpgf_payment_events_pledge_idx
on public.mpgf_payment_events (conditional_pledge_id, provider, created_at desc);

create index if not exists mpgf_stripe_saved_commitments_round_campaign_idx
on public.mpgf_stripe_saved_commitments (round_id, campaign_id, setup_status, created_at desc);

create index if not exists mpgf_stripe_saved_commitment_events_intent_idx
on public.mpgf_stripe_saved_commitment_events (conditional_pledge_id, pledge_intent_id, received_at desc);

create index if not exists mpgf_stripe_conditional_payment_runs_round_idx
on public.mpgf_stripe_conditional_payment_intent_runs (round_id, campaign_id, payment_intent_creation_allowed, created_at desc);

create index if not exists mpgf_allocation_results_round_idx
on public.mpgf_allocation_results (round_id, formula_version, campaign_id);

alter table public.mpgf_public_goods_pledges enable row level security;
alter table public.mpgf_public_goods_identity_attestations enable row level security;
alter table public.mpgf_public_goods_payment_proofs enable row level security;
alter table public.mpgf_public_goods_review_cases enable row level security;
alter table public.mpgf_public_goods_subscriptions enable row level security;
alter table public.mpgf_public_goods_experiment_assignments enable row level security;
alter table public.mpgf_public_goods_analytics_events enable row level security;
alter table public.mpgf_pledge_intents enable row level security;
alter table public.mpgf_identity_verifications enable row level security;
alter table public.mpgf_payment_authorizations enable row level security;
alter table public.mpgf_provider_payment_events enable row level security;
alter table public.mpgf_moral_profiles enable row level security;
alter table public.mpgf_support_signals enable row level security;
alter table public.mpgf_user_budgets enable row level security;
alter table public.mpgf_support_stances enable row level security;
alter table public.mpgf_coalition_candidates enable row level security;
alter table public.mpgf_round_rulebooks enable row level security;
alter table public.mpgf_recipient_registry enable row level security;
alter table public.mpgf_custody_holds enable row level security;
alter table public.mpgf_conditional_pledges enable row level security;
alter table public.mpgf_every_org_partner_events enable row level security;
alter table public.mpgf_payment_method_tokens enable row level security;
alter table public.mpgf_payment_events enable row level security;
alter table public.mpgf_stripe_saved_commitments enable row level security;
alter table public.mpgf_stripe_saved_commitment_events enable row level security;
alter table public.mpgf_stripe_conditional_payment_intent_runs enable row level security;
alter table public.mpgf_sponsor_pool_entries enable row level security;
alter table public.mpgf_allocation_results enable row level security;
alter table public.mpgf_dissent_notes enable row level security;
alter table public.mpgf_milestones enable row level security;

drop policy if exists "mpgf_public_goods_pledges_select_own" on public.mpgf_public_goods_pledges;
create policy "mpgf_public_goods_pledges_select_own"
on public.mpgf_public_goods_pledges
for select
to authenticated
using (profile_id = (select auth.uid()));

drop policy if exists "mpgf_public_goods_pledges_insert_own" on public.mpgf_public_goods_pledges;
create policy "mpgf_public_goods_pledges_insert_own"
on public.mpgf_public_goods_pledges
for insert
to authenticated
with check (profile_id = (select auth.uid()));

drop policy if exists "mpgf_public_goods_review_cases_public_select" on public.mpgf_public_goods_review_cases;
create policy "mpgf_public_goods_review_cases_public_select"
on public.mpgf_public_goods_review_cases
for select
to anon, authenticated
using (true);

drop policy if exists "mpgf_pledge_intents_select_own" on public.mpgf_pledge_intents;
create policy "mpgf_pledge_intents_select_own"
on public.mpgf_pledge_intents
for select
to authenticated
using (profile_id = (select auth.uid()));

drop policy if exists "mpgf_pledge_intents_insert_own" on public.mpgf_pledge_intents;
create policy "mpgf_pledge_intents_insert_own"
on public.mpgf_pledge_intents
for insert
to authenticated
with check (profile_id = (select auth.uid()));

drop policy if exists "mpgf_identity_verifications_select_own" on public.mpgf_identity_verifications;
create policy "mpgf_identity_verifications_select_own"
on public.mpgf_identity_verifications
for select
to authenticated
using (
  exists (
    select 1
    from public.mpgf_pledge_intents
    where mpgf_pledge_intents.id = mpgf_identity_verifications.pledge_intent_id
      and mpgf_pledge_intents.profile_id = (select auth.uid())
  )
);

drop policy if exists "mpgf_payment_authorizations_select_own" on public.mpgf_payment_authorizations;
create policy "mpgf_payment_authorizations_select_own"
on public.mpgf_payment_authorizations
for select
to authenticated
using (
  exists (
    select 1
    from public.mpgf_pledge_intents
    where mpgf_pledge_intents.id = mpgf_payment_authorizations.pledge_intent_id
      and mpgf_pledge_intents.profile_id = (select auth.uid())
  )
);

drop policy if exists "mpgf_provider_payment_events_service_only" on public.mpgf_provider_payment_events;
create policy "mpgf_provider_payment_events_service_only"
on public.mpgf_provider_payment_events
for all
to service_role
using (true)
with check (true);

drop policy if exists "mpgf_moral_profiles_select_own" on public.mpgf_moral_profiles;
create policy "mpgf_moral_profiles_select_own"
on public.mpgf_moral_profiles
for select
to authenticated
using (profile_id = (select auth.uid()));

drop policy if exists "mpgf_moral_profiles_write_own" on public.mpgf_moral_profiles;
create policy "mpgf_moral_profiles_write_own"
on public.mpgf_moral_profiles
for all
to authenticated
using (profile_id = (select auth.uid()))
with check (profile_id = (select auth.uid()));

drop policy if exists "mpgf_support_signals_select_own" on public.mpgf_support_signals;
create policy "mpgf_support_signals_select_own"
on public.mpgf_support_signals
for select
to authenticated
using (profile_id = (select auth.uid()));

drop policy if exists "mpgf_support_signals_insert_own" on public.mpgf_support_signals;
create policy "mpgf_support_signals_insert_own"
on public.mpgf_support_signals
for insert
to authenticated
with check (profile_id = (select auth.uid()));

drop policy if exists "mpgf_user_budgets_select_own" on public.mpgf_user_budgets;
create policy "mpgf_user_budgets_select_own"
on public.mpgf_user_budgets
for select
to authenticated
using (profile_id = (select auth.uid()));

drop policy if exists "mpgf_user_budgets_write_own" on public.mpgf_user_budgets;
create policy "mpgf_user_budgets_write_own"
on public.mpgf_user_budgets
for all
to authenticated
using (profile_id = (select auth.uid()))
with check (profile_id = (select auth.uid()));

drop policy if exists "mpgf_support_stances_select_own" on public.mpgf_support_stances;
create policy "mpgf_support_stances_select_own"
on public.mpgf_support_stances
for select
to authenticated
using (profile_id = (select auth.uid()));

drop policy if exists "mpgf_support_stances_write_own" on public.mpgf_support_stances;
create policy "mpgf_support_stances_write_own"
on public.mpgf_support_stances
for all
to authenticated
using (profile_id = (select auth.uid()))
with check (profile_id = (select auth.uid()));

drop policy if exists "mpgf_coalition_candidates_public_select" on public.mpgf_coalition_candidates;
create policy "mpgf_coalition_candidates_public_select"
on public.mpgf_coalition_candidates
for select
to anon, authenticated
using (true);

drop policy if exists "mpgf_round_rulebooks_public_select" on public.mpgf_round_rulebooks;
create policy "mpgf_round_rulebooks_public_select"
on public.mpgf_round_rulebooks
for select
to anon, authenticated
using (true);

drop policy if exists "mpgf_recipient_registry_public_select" on public.mpgf_recipient_registry;
create policy "mpgf_recipient_registry_public_select"
on public.mpgf_recipient_registry
for select
to anon, authenticated
using (true);

drop policy if exists "mpgf_custody_holds_service_only_select" on public.mpgf_custody_holds;
create policy "mpgf_custody_holds_service_only_select"
on public.mpgf_custody_holds
for select
to service_role
using (true);

drop policy if exists "mpgf_conditional_pledges_select_own" on public.mpgf_conditional_pledges;
create policy "mpgf_conditional_pledges_select_own"
on public.mpgf_conditional_pledges
for select
to authenticated
using (profile_id = (select auth.uid()));

drop policy if exists "mpgf_conditional_pledges_insert_own" on public.mpgf_conditional_pledges;
create policy "mpgf_conditional_pledges_insert_own"
on public.mpgf_conditional_pledges
for insert
to authenticated
with check (profile_id = (select auth.uid()));

drop policy if exists "mpgf_every_org_partner_events_service_only" on public.mpgf_every_org_partner_events;
create policy "mpgf_every_org_partner_events_service_only"
on public.mpgf_every_org_partner_events
for all
to service_role
using (true)
with check (true);

drop policy if exists "mpgf_payment_method_tokens_select_own" on public.mpgf_payment_method_tokens;
create policy "mpgf_payment_method_tokens_select_own"
on public.mpgf_payment_method_tokens
for select
to authenticated
using (profile_id = (select auth.uid()));

drop policy if exists "mpgf_stripe_saved_commitments_select_own" on public.mpgf_stripe_saved_commitments;
create policy "mpgf_stripe_saved_commitments_select_own"
on public.mpgf_stripe_saved_commitments
for select
to authenticated
using (profile_id = (select auth.uid()));

drop policy if exists "mpgf_stripe_saved_commitments_insert_own" on public.mpgf_stripe_saved_commitments;
create policy "mpgf_stripe_saved_commitments_insert_own"
on public.mpgf_stripe_saved_commitments
for insert
to authenticated
with check (profile_id = (select auth.uid()));

drop policy if exists "mpgf_stripe_saved_commitment_events_service_only" on public.mpgf_stripe_saved_commitment_events;
create policy "mpgf_stripe_saved_commitment_events_service_only"
on public.mpgf_stripe_saved_commitment_events
for all
to service_role
using (true)
with check (true);

drop policy if exists "mpgf_stripe_conditional_payment_intent_runs_service_only" on public.mpgf_stripe_conditional_payment_intent_runs;
create policy "mpgf_stripe_conditional_payment_intent_runs_service_only"
on public.mpgf_stripe_conditional_payment_intent_runs
for all
to service_role
using (true)
with check (true);

drop policy if exists "mpgf_sponsor_pool_entries_public_select" on public.mpgf_sponsor_pool_entries;
create policy "mpgf_sponsor_pool_entries_public_select"
on public.mpgf_sponsor_pool_entries
for select
to anon, authenticated
using (true);

drop policy if exists "mpgf_allocation_results_public_select" on public.mpgf_allocation_results;
create policy "mpgf_allocation_results_public_select"
on public.mpgf_allocation_results
for select
to anon, authenticated
using (true);

drop policy if exists "mpgf_dissent_notes_public_select" on public.mpgf_dissent_notes;
create policy "mpgf_dissent_notes_public_select"
on public.mpgf_dissent_notes
for select
to anon, authenticated
using (true);

drop policy if exists "mpgf_milestones_public_select" on public.mpgf_milestones;
create policy "mpgf_milestones_public_select"
on public.mpgf_milestones
for select
to anon, authenticated
using (true);

grant select on
  public.mpgf_public_goods_match_pools,
  public.mpgf_public_goods_rounds,
  public.mpgf_public_goods_campaigns,
  public.mpgf_public_goods_allocation_results,
  public.mpgf_public_goods_review_cases,
  public.mpgf_sponsor_pool_entries,
  public.mpgf_coalition_candidates,
  public.mpgf_round_rulebooks,
  public.mpgf_recipient_registry,
  public.mpgf_allocation_results,
  public.mpgf_dissent_notes,
  public.mpgf_milestones
to anon, authenticated;

grant select, insert on
  public.mpgf_support_signals,
  public.mpgf_conditional_pledges
to authenticated;

grant select, insert, update on
  public.mpgf_user_budgets,
  public.mpgf_support_stances
to authenticated;

grant select, insert, update on public.mpgf_pledge_intents to authenticated;

grant select on
  public.mpgf_identity_verifications,
  public.mpgf_payment_authorizations
to authenticated;

grant select on public.mpgf_payment_method_tokens to authenticated;

grant select, insert on public.mpgf_stripe_saved_commitments to authenticated;

grant all on
  public.mpgf_public_goods_match_pools,
  public.mpgf_public_goods_rounds,
  public.mpgf_public_goods_campaigns,
  public.mpgf_public_goods_identity_attestations,
  public.mpgf_public_goods_pledges,
  public.mpgf_public_goods_allocation_results,
  public.mpgf_public_goods_payment_proofs,
  public.mpgf_public_goods_review_cases,
  public.mpgf_public_goods_subscriptions,
  public.mpgf_public_goods_experiment_assignments,
  public.mpgf_public_goods_analytics_events,
  public.mpgf_pledge_intents,
  public.mpgf_identity_verifications,
  public.mpgf_payment_authorizations,
  public.mpgf_provider_payment_events,
  public.mpgf_moral_profiles,
  public.mpgf_support_signals,
  public.mpgf_user_budgets,
  public.mpgf_support_stances,
  public.mpgf_coalition_candidates,
  public.mpgf_round_rulebooks,
  public.mpgf_recipient_registry,
  public.mpgf_custody_holds,
  public.mpgf_conditional_pledges,
  public.mpgf_every_org_partner_events,
  public.mpgf_payment_method_tokens,
  public.mpgf_payment_events,
  public.mpgf_stripe_saved_commitments,
  public.mpgf_stripe_saved_commitment_events,
  public.mpgf_stripe_conditional_payment_intent_runs,
  public.mpgf_sponsor_pool_entries,
  public.mpgf_allocation_results,
  public.mpgf_dissent_notes,
  public.mpgf_milestones
to service_role;

comment on table public.mpgf_pledge_intents is
  'First-class MPGF pledge_intent records for the production flow: verify identity, authorize conditionally, fall back to manual evidence only when provider integration is unavailable.';

comment on table public.mpgf_identity_verifications is
  'First-class MPGF identity_verification records; public and participant surfaces store redacted references and duplicate-proof hashes, not raw identity evidence.';

comment on table public.mpgf_payment_authorizations is
  'First-class MPGF payment_authorization records. Provider authorizations are conditional and capture only after threshold, review, and challenge gates.';

comment on table public.mpgf_provider_payment_events is
  'Append-only MPGF provider_payment_event records. Webhooks provide evidence but cannot authorize final payout by themselves.';

comment on table public.mpgf_support_signals is
  'Private-by-default Common-Ground Verified Quadratic Assurance Funding support signals. Public outputs aggregate signal counts and moral-cluster breadth only; they do not create a global moral ranking.';

comment on table public.mpgf_user_budgets is
  'Per-round MPGF Common Ground Budget records. Budget records freeze baseline, participant surplus confirmation, eligible-set hashes, fallback policy, and no-capture preview terms; public outputs remain aggregate-only.';

comment on table public.mpgf_support_stances is
  'Private-by-default strong, weak, dissent, or abstain stances over projects or buckets. Stances include caps, rank order, and redacted-note hashes, feed coalition feasibility, and never create global moral rankings.';

comment on table public.mpgf_coalition_candidates is
  'Aggregate coalition-feasibility candidates for Coalition-Routed Escrowed Conditional Matching. Rows publish threshold feasibility, cluster breadth, and routed weak-support totals only.';

comment on table public.mpgf_round_rulebooks is
  'Published MPGF ECM-core round rulebooks: fixed match schedule, batch cadence, custody policy, donor disclosure rules, and preserved safety/privacy/provenance invariants.';

comment on table public.mpgf_recipient_registry is
  'Public MPGF recipient registry with legal entity or fiscal host, payout rail, allowed uses, receipt or milestone rules, review state, and challenge state.';

comment on table public.mpgf_custody_holds is
  'Private post-clear MPGF custody-hold records. These require partner or fiscal-host custody confirmation and do not create a platform escrow claim.';

comment on table public.mpgf_conditional_pledges is
  'CG-VQAF conditional pledge records for fast Every.org routes, Stripe SetupIntent saved commitments, and manual proof fallback.';

comment on table public.mpgf_every_org_partner_events is
  'Append-only MPGF Every.org partner webhook imports. Dedupe by hashed chargeId, map partner metadata to round/campaign/pledge when present, auto-create reviewable contribution evidence, and never authorize final payout by webhook alone.';

comment on column public.mpgf_public_goods_payment_proofs.reconciliation_source is
  'Evidence source for MPGF contribution verification. Every.org partner webhooks create pending review evidence without exposing raw donor or charge references.';

comment on column public.mpgf_every_org_partner_events.charge_id_hash is
  'Hashed Every.org chargeId used as the idempotency key. Raw charge IDs, donor names, donor emails, private notes, and public testimony are not stored in this table.';

comment on column public.mpgf_every_org_partner_events.partner_donation_id_hash is
  'Hashed Donate Link partnerDonationId used to connect redirect-pending state with partner webhook import without exposing private donor references.';

comment on table public.mpgf_payment_method_tokens is
  'Stripe SetupIntent-first saved payment-method tokens. Provider ids are stored only as hashes; raw card data is never stored.';

comment on table public.mpgf_stripe_saved_commitments is
  'Stripe SetupIntent-first MPGF saved commitments. These records store hashed provider refs, require explicit future-use consent, create no immediate charge, and prohibit long-lived manual card holds.';

comment on table public.mpgf_stripe_saved_commitment_events is
  'Append-only Stripe webhook events for SetupIntent-first MPGF saved commitments. Stripe-Signature verification is required before any state transition, and webhook events never authorize final payout by themselves.';

comment on table public.mpgf_stripe_conditional_payment_intent_runs is
  'Protected threshold-clear worker runs that may create Stripe PaymentIntents only after amount, supporter, review, challenge-window, and parameter-lock gates are true.';

-- Bg17 Forethought-aligned background networking pilot surface.
-- Reviewed summaries, schema-bound wish dialogue, helper runs, exact-tag overlap
-- metadata, and append-only transparency receipts. Raw ingestion and autonomous
-- outreach remain disabled.

create table if not exists public.background_source_sync_jobs (
  id uuid primary key default gen_random_uuid(),
  source_connection_id uuid not null references public.source_connections (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  state text not null default 'queued' check (state in ('queued', 'running', 'retry', 'done', 'failed', 'cancelled')),
  attempts integer not null default 0 check (attempts >= 0),
  next_run_at timestamptz not null default timezone('utc', now()),
  last_error_code text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.background_helper_runs (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  trigger_kind text not null check (trigger_kind in ('saved_search', 'new_summary', 'manual_scan', 'scheduled_digest')),
  state text not null default 'queued' check (state in ('queued', 'running', 'retry', 'done', 'failed', 'cancelled')),
  attempts integer not null default 0 check (attempts >= 0),
  next_run_at timestamptz not null default timezone('utc', now()),
  query_fingerprint text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (profile_id, trigger_kind, query_fingerprint, state)
);

create table if not exists public.background_delegate_receipts (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  receipt_kind text not null check (receipt_kind in ('delegate_run', 'opportunity_brief', 'stale_transition', 'intro_request')),
  purpose_code text not null default 'moral_trade_offer',
  purpose_policy_version text not null default 'background-purpose-policy-v1',
  subject_kind text not null check (subject_kind in ('helper_run', 'background_helper_run', 'opportunity_brief', 'intro_packet')),
  subject_id uuid,
  public_summary text not null default '',
  factor_count_bucket text not null default 'withheld' check (factor_count_bucket in ('withheld', 'none', '1', '2_to_3', '4_plus')),
  blocker_count_bucket text not null default 'withheld' check (blocker_count_bucket in ('withheld', 'none', '1', '2_to_3', '4_plus')),
  redacted_payload jsonb not null default '{}'::jsonb,
  status text not null default 'active' check (status in ('active', 'expired', 'anonymized', 'held')),
  retention_expires_at timestamptz not null default (timezone('utc', now()) + interval '30 days'),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.background_delegate_receipts drop constraint if exists background_delegate_receipts_purpose_code_check;
alter table public.background_delegate_receipts
  add constraint background_delegate_receipts_purpose_code_check
  check (purpose_code in ('moral_trade_offer', 'donation_offset', 'pledge_swap', 'moral_public_good', 'research_collaboration', 'community_intro'));

alter table public.background_delegate_receipts drop constraint if exists background_delegate_receipts_purpose_policy_version_check;
alter table public.background_delegate_receipts
  add constraint background_delegate_receipts_purpose_policy_version_check
  check (purpose_policy_version = 'background-purpose-policy-v1');

alter table public.background_opportunity_briefs
  add column if not exists helper_run_id uuid references public.background_helper_runs (id) on delete set null,
  add column if not exists cooloff_until timestamptz,
  add column if not exists explanation_version text not null default 'background-explanation-v1',
  add column if not exists source_scope_version text not null default 'reviewed-summary-v1',
  add column if not exists purpose_code text not null default 'moral_trade_offer',
  add column if not exists purpose_policy_version text not null default 'background-purpose-policy-v1',
  add column if not exists output_schema_version text not null default 'background-opportunity-brief-card-v2',
  add column if not exists redacted_receipt_id uuid references public.background_delegate_receipts (id) on delete set null,
  add column if not exists retention_expires_at timestamptz not null default (timezone('utc', now()) + interval '30 days'),
  add column if not exists anonymized_at timestamptz,
  add column if not exists generic_dependency_label text not null default 'valid';

alter table public.background_opportunity_briefs drop constraint if exists background_opportunity_briefs_purpose_code_check;
alter table public.background_opportunity_briefs
  add constraint background_opportunity_briefs_purpose_code_check
  check (purpose_code in ('moral_trade_offer', 'donation_offset', 'pledge_swap', 'moral_public_good', 'research_collaboration', 'community_intro'));

alter table public.background_opportunity_briefs drop constraint if exists background_opportunity_briefs_purpose_policy_version_check;
alter table public.background_opportunity_briefs
  add constraint background_opportunity_briefs_purpose_policy_version_check
  check (purpose_policy_version = 'background-purpose-policy-v1');

alter table public.background_opportunity_briefs drop constraint if exists background_opportunity_briefs_output_schema_version_check;
alter table public.background_opportunity_briefs
  add constraint background_opportunity_briefs_output_schema_version_check
  check (output_schema_version = 'background-opportunity-brief-card-v2');

alter table public.background_opportunity_briefs drop constraint if exists background_opportunity_briefs_generic_dependency_label_check;
alter table public.background_opportunity_briefs
  add constraint background_opportunity_briefs_generic_dependency_label_check
  check (generic_dependency_label in ('valid', 'stale_or_unavailable', 'review_required'));

alter table public.background_intro_packets
  add column if not exists purpose_code text not null default 'moral_trade_offer',
  add column if not exists purpose_policy_version text not null default 'background-purpose-policy-v1',
  add column if not exists redacted_receipt_id uuid references public.background_delegate_receipts (id) on delete set null,
  add column if not exists retention_expires_at timestamptz not null default (timezone('utc', now()) + interval '30 days'),
  add column if not exists anonymized_at timestamptz;

alter table public.wish_profiles
  add column if not exists inbound_delegate_discovery text not null default 'off',
  add column if not exists inbound_delegate_purpose_codes text[] not null default '{}',
  add column if not exists inbound_delegate_purpose_bindings jsonb not null default '{}'::jsonb,
  add column if not exists inbound_delegate_surfaces text[] not null default '{}',
  add column if not exists inbound_delegate_surface_budget_per_window jsonb not null default '{}'::jsonb,
  add column if not exists inbound_delegate_pending_intro_limit integer,
  add column if not exists inbound_delegate_cooloff_until timestamptz,
  add column if not exists candidate_inbound_budget_version text not null default 'candidate-budget-v1',
  add column if not exists candidate_exposure_version text not null default 'candidate-exposure-v1',
  add column if not exists allowed_cohort_ids text[] not null default '{}';

alter table public.wish_profiles drop constraint if exists wish_profiles_inbound_delegate_discovery_check;
alter table public.wish_profiles
  add constraint wish_profiles_inbound_delegate_discovery_check
  check (inbound_delegate_discovery in ('off', 'cohort_only', 'partner_matchmaker', 'public_broad_preview'));

alter table public.wish_profiles drop constraint if exists wish_profiles_inbound_delegate_purpose_codes_check;
alter table public.wish_profiles
  add constraint wish_profiles_inbound_delegate_purpose_codes_check
  check (inbound_delegate_purpose_codes <@ array['moral_trade_offer', 'donation_offset', 'pledge_swap', 'moral_public_good', 'research_collaboration', 'community_intro']::text[]);

alter table public.wish_profiles drop constraint if exists wish_profiles_inbound_delegate_surfaces_check;
alter table public.wish_profiles
  add constraint wish_profiles_inbound_delegate_surfaces_check
  check (inbound_delegate_surfaces <@ array['broad_profile']::text[]);

alter table public.wish_profiles drop constraint if exists wish_profiles_inbound_delegate_pending_intro_limit_check;
alter table public.wish_profiles
  add constraint wish_profiles_inbound_delegate_pending_intro_limit_check
  check (inbound_delegate_pending_intro_limit is null or inbound_delegate_pending_intro_limit between 0 and 50);

alter table public.personal_delegates
  add column if not exists allowed_purpose_bindings jsonb not null default '{}'::jsonb;

alter table public.helper_strategies
  add column if not exists purpose_code text not null default 'moral_trade_offer',
  add column if not exists purpose_policy_version text not null default 'background-purpose-policy-v1',
  add column if not exists audience_scope text not null default 'cohort_only',
  add column if not exists cohort_scope_id text not null default '';

alter table public.helper_strategies drop constraint if exists helper_strategies_purpose_code_check;
alter table public.helper_strategies
  add constraint helper_strategies_purpose_code_check
  check (purpose_code in ('moral_trade_offer', 'donation_offset', 'pledge_swap', 'moral_public_good', 'research_collaboration', 'community_intro'));

alter table public.helper_strategies drop constraint if exists helper_strategies_purpose_policy_version_check;
alter table public.helper_strategies
  add constraint helper_strategies_purpose_policy_version_check
  check (purpose_policy_version = 'background-purpose-policy-v1');

alter table public.helper_strategies drop constraint if exists helper_strategies_audience_scope_check;
alter table public.helper_strategies
  add constraint helper_strategies_audience_scope_check
  check (audience_scope in ('cohort_only', 'partner_matchmaker', 'public_broad_preview'));

alter table public.background_intro_packets drop constraint if exists background_intro_packets_purpose_code_check;
alter table public.background_intro_packets
  add constraint background_intro_packets_purpose_code_check
  check (purpose_code in ('moral_trade_offer', 'donation_offset', 'pledge_swap', 'moral_public_good', 'research_collaboration', 'community_intro'));

alter table public.background_intro_packets drop constraint if exists background_intro_packets_purpose_policy_version_check;
alter table public.background_intro_packets
  add constraint background_intro_packets_purpose_policy_version_check
  check (purpose_policy_version = 'background-purpose-policy-v1');

alter table public.helper_runs
  add column if not exists purpose_code text not null default 'moral_trade_offer',
  add column if not exists purpose_policy_version text not null default 'background-purpose-policy-v1',
  add column if not exists redacted_receipt_id uuid references public.background_delegate_receipts (id) on delete set null,
  add column if not exists retention_expires_at timestamptz not null default (timezone('utc', now()) + interval '30 days');

alter table public.background_helper_runs
  add column if not exists purpose_code text not null default 'moral_trade_offer',
  add column if not exists purpose_policy_version text not null default 'background-purpose-policy-v1',
  add column if not exists redacted_receipt_id uuid references public.background_delegate_receipts (id) on delete set null,
  add column if not exists retention_expires_at timestamptz not null default (timezone('utc', now()) + interval '30 days');

create table if not exists public.background_candidate_exposure_counters (
  id uuid primary key default gen_random_uuid(),
  candidate_profile_id uuid references public.profiles (id) on delete set null,
  counter_reference_state text not null default 'active' check (counter_reference_state in ('active', 'redacted', 'anonymized')),
  purpose_code text not null default 'moral_trade_offer',
  purpose_policy_version text not null default 'background-purpose-policy-v1',
  audience_scope text not null default 'cohort_only' check (audience_scope in ('cohort_only', 'partner_matchmaker', 'public_broad_preview')),
  cohort_scope_id text not null default '',
  window_start timestamptz not null,
  window_end timestamptz not null,
  surface_count integer not null default 0 check (surface_count >= 0),
  pending_intro_count integer not null default 0 check (pending_intro_count >= 0),
  suppressed_for_budget_count integer not null default 0 check (suppressed_for_budget_count >= 0),
  budget_state text not null default 'clear' check (budget_state in ('clear', 'near_limit', 'exhausted', 'cooloff')),
  candidate_inbound_budget_version_snapshot text not null default 'candidate-budget-v1',
  last_surface_at timestamptz,
  last_intro_request_at timestamptz,
  retention_expires_at timestamptz not null default (timezone('utc', now()) + interval '45 days'),
  anonymized_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (counter_reference_state <> 'active' or candidate_profile_id is not null),
  check (window_end > window_start)
);

alter table public.background_candidate_exposure_counters drop constraint if exists background_candidate_exposure_counters_purpose_code_check;
alter table public.background_candidate_exposure_counters
  add constraint background_candidate_exposure_counters_purpose_code_check
  check (purpose_code in ('moral_trade_offer', 'donation_offset', 'pledge_swap', 'moral_public_good', 'research_collaboration', 'community_intro'));

alter table public.background_candidate_exposure_counters drop constraint if exists background_candidate_exposure_counters_purpose_policy_version_check;
alter table public.background_candidate_exposure_counters
  add constraint background_candidate_exposure_counters_purpose_policy_version_check
  check (purpose_policy_version = 'background-purpose-policy-v1');

create unique index if not exists background_candidate_exposure_counters_window_idx
on public.background_candidate_exposure_counters (
  candidate_profile_id,
  purpose_code,
  purpose_policy_version,
  audience_scope,
  cohort_scope_id,
  window_start
)
where counter_reference_state = 'active';

create index if not exists background_candidate_exposure_counters_retention_idx
on public.background_candidate_exposure_counters (counter_reference_state, retention_expires_at asc);

create or replace function public.reserve_background_candidate_exposure(
  target_candidate_profile_id uuid,
  target_purpose_code text,
  target_purpose_policy_version text,
  target_audience_scope text,
  target_cohort_scope_id text,
  target_surface_limit integer,
  target_window_days integer,
  target_budget_version text
)
returns table (
  allowed boolean,
  budget_state text,
  counter_id uuid,
  remaining integer,
  blocker_code text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_time_utc timestamptz := timezone('utc', now());
  normalized_cohort text := coalesce(nullif(target_cohort_scope_id, ''), '');
  normalized_window_days integer := greatest(1, least(coalesce(target_window_days, 30), 365));
  normalized_surface_limit integer := greatest(0, least(coalesce(target_surface_limit, 0), 1000));
  window_start_utc timestamptz := date_trunc('day', timezone('utc', now()));
  window_end_utc timestamptz;
  reserved_counter_id uuid;
  reserved_surface_count integer;
  reserved_budget_state text;
begin
  if target_candidate_profile_id is null or normalized_surface_limit <= 0 then
    allowed := false;
    budget_state := 'exhausted';
    counter_id := null;
    remaining := 0;
    blocker_code := 'candidate_budget_missing';
    return next;
    return;
  end if;

  window_end_utc := window_start_utc + make_interval(days => normalized_window_days);

  insert into public.background_candidate_exposure_counters (
    candidate_profile_id,
    purpose_code,
    purpose_policy_version,
    audience_scope,
    cohort_scope_id,
    window_start,
    window_end,
    candidate_inbound_budget_version_snapshot,
    retention_expires_at
  )
  values (
    target_candidate_profile_id,
    target_purpose_code,
    target_purpose_policy_version,
    target_audience_scope,
    normalized_cohort,
    window_start_utc,
    window_end_utc,
    coalesce(nullif(target_budget_version, ''), 'candidate-budget-v1'),
    window_end_utc + interval '45 days'
  )
  on conflict (candidate_profile_id, purpose_code, purpose_policy_version, audience_scope, cohort_scope_id, window_start)
  where counter_reference_state = 'active'
  do nothing;

  update public.background_candidate_exposure_counters
  set
    surface_count = surface_count + 1,
    budget_state = case
      when surface_count + 1 >= normalized_surface_limit then 'exhausted'
      when (surface_count + 1) * 5 >= normalized_surface_limit * 4 then 'near_limit'
      else 'clear'
    end,
    last_surface_at = current_time_utc,
    updated_at = current_time_utc
  where candidate_profile_id = target_candidate_profile_id
    and purpose_code = target_purpose_code
    and purpose_policy_version = target_purpose_policy_version
    and audience_scope = target_audience_scope
    and cohort_scope_id = normalized_cohort
    and window_start = window_start_utc
    and counter_reference_state = 'active'
    and budget_state <> 'cooloff'
    and surface_count < normalized_surface_limit
  returning id, surface_count, budget_state
  into reserved_counter_id, reserved_surface_count, reserved_budget_state;

  if reserved_counter_id is not null then
    allowed := true;
    budget_state := reserved_budget_state;
    counter_id := reserved_counter_id;
    remaining := greatest(0, normalized_surface_limit - reserved_surface_count);
    blocker_code := '';
    return next;
    return;
  end if;

  update public.background_candidate_exposure_counters
  set
    suppressed_for_budget_count = suppressed_for_budget_count + 1,
    budget_state = case when budget_state = 'cooloff' then 'cooloff' else 'exhausted' end,
    updated_at = current_time_utc
  where candidate_profile_id = target_candidate_profile_id
    and purpose_code = target_purpose_code
    and purpose_policy_version = target_purpose_policy_version
    and audience_scope = target_audience_scope
    and cohort_scope_id = normalized_cohort
    and window_start = window_start_utc
    and counter_reference_state = 'active'
  returning id, budget_state
  into reserved_counter_id, reserved_budget_state;

  allowed := false;
  budget_state := coalesce(reserved_budget_state, 'exhausted');
  counter_id := reserved_counter_id;
  remaining := 0;
  blocker_code := case when reserved_budget_state = 'cooloff' then 'candidate_cooloff' else 'candidate_budget_exhausted' end;
  return next;
end;
$$;

alter table public.background_profile_signals
  drop constraint if exists background_profile_signals_source_check;

alter table public.background_profile_signals
  add constraint background_profile_signals_source_check
  check (source in ('manual', 'approved_source_summary', 'interview', 'wish_dialogue'));

create table if not exists public.background_wish_dialogue_sessions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  state text not null default 'draft' check (state in ('draft', 'proposed', 'applied', 'abandoned')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.background_wish_dialogue_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.background_wish_dialogue_sessions (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  actor text not null check (actor in ('user', 'assistant')),
  body text not null default '[encrypted private field]',
  body_ciphertext text not null,
  body_encryption_version text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.background_wish_field_proposals (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.background_wish_dialogue_sessions (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  proposal jsonb not null,
  uncertainty_flags jsonb not null default '[]'::jsonb,
  explanation jsonb not null default '[]'::jsonb,
  approved boolean not null default false,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.background_private_overlap_tags (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  tag_namespace text not null check (tag_namespace in ('exact_capability_tag', 'exact_constraint_tag', 'exact_verification_tag')),
  blinded_token bytea not null,
  token_version text not null default 'bg17-demo-blinded-token-v1',
  expiry_at timestamptz not null,
  created_at timestamptz not null default timezone('utc', now()),
  unique (profile_id, tag_namespace, blinded_token)
);

create table if not exists public.background_private_overlap_checks (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles (id) on delete cascade,
  counterparty_id uuid not null references public.profiles (id) on delete cascade,
  stage text not null check (stage in ('registry', 'consent', 'introduced')),
  tag_namespace text not null check (tag_namespace in ('exact_capability_tag', 'exact_constraint_tag', 'exact_verification_tag')),
  result_bucket text not null check (result_bucket in ('none', '1', '2_to_3', '4_plus')),
  receipt_id uuid,
  created_at timestamptz not null default timezone('utc', now()),
  check (requester_id <> counterparty_id)
);

create table if not exists public.transparency_receipts (
  id uuid primary key default gen_random_uuid(),
  seq bigint generated always as identity unique,
  event_type text not null,
  actor_scope text not null,
  redacted_payload jsonb not null,
  prev_hash text,
  entry_hash text not null,
  created_at timestamptz not null default timezone('utc', now())
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'background_private_overlap_checks_receipt_id_fkey'
  ) then
    alter table public.background_private_overlap_checks
      add constraint background_private_overlap_checks_receipt_id_fkey
      foreign key (receipt_id) references public.transparency_receipts (id) on delete set null;
  end if;
end
$$;

create index if not exists background_source_sync_jobs_profile_state_idx
on public.background_source_sync_jobs (profile_id, state, next_run_at asc, updated_at desc);

create index if not exists background_source_sync_jobs_connection_idx
on public.background_source_sync_jobs (source_connection_id, state, next_run_at asc);

create index if not exists background_helper_runs_profile_state_idx
on public.background_helper_runs (profile_id, state, next_run_at asc, updated_at desc);

create index if not exists background_delegate_receipts_profile_kind_idx
on public.background_delegate_receipts (profile_id, receipt_kind, created_at desc);

create index if not exists background_delegate_receipts_retention_idx
on public.background_delegate_receipts (status, retention_expires_at asc);

create index if not exists background_opportunity_briefs_helper_run_idx
on public.background_opportunity_briefs (helper_run_id, profile_id)
where helper_run_id is not null;

create index if not exists background_opportunity_briefs_purpose_idx
on public.background_opportunity_briefs (profile_id, purpose_code, purpose_policy_version, status);

create index if not exists background_intro_packets_purpose_idx
on public.background_intro_packets (requester_profile_id, purpose_code, purpose_policy_version, review_state);

create index if not exists helper_strategies_purpose_idx
on public.helper_strategies (profile_id, purpose_code, purpose_policy_version, audience_scope, status);

create index if not exists background_wish_dialogue_sessions_profile_state_idx
on public.background_wish_dialogue_sessions (profile_id, state, updated_at desc);

create index if not exists background_wish_dialogue_messages_session_idx
on public.background_wish_dialogue_messages (session_id, created_at asc);

create index if not exists background_wish_field_proposals_session_idx
on public.background_wish_field_proposals (session_id, created_at desc);

create index if not exists background_private_overlap_tags_profile_namespace_idx
on public.background_private_overlap_tags (profile_id, tag_namespace, expiry_at asc);

create index if not exists background_private_overlap_checks_requester_idx
on public.background_private_overlap_checks (requester_id, created_at desc);

create index if not exists background_private_overlap_checks_counterparty_idx
on public.background_private_overlap_checks (counterparty_id, created_at desc);

create index if not exists transparency_receipts_actor_scope_idx
on public.transparency_receipts (actor_scope, created_at desc);

drop trigger if exists background_source_sync_jobs_set_updated_at on public.background_source_sync_jobs;
create trigger background_source_sync_jobs_set_updated_at
before update on public.background_source_sync_jobs
for each row execute function public.set_updated_at();

drop trigger if exists background_helper_runs_set_updated_at on public.background_helper_runs;
create trigger background_helper_runs_set_updated_at
before update on public.background_helper_runs
for each row execute function public.set_updated_at();

drop trigger if exists background_delegate_receipts_set_updated_at on public.background_delegate_receipts;
create trigger background_delegate_receipts_set_updated_at
before update on public.background_delegate_receipts
for each row execute function public.set_updated_at();

drop trigger if exists background_candidate_exposure_counters_set_updated_at on public.background_candidate_exposure_counters;
create trigger background_candidate_exposure_counters_set_updated_at
before update on public.background_candidate_exposure_counters
for each row execute function public.set_updated_at();

drop trigger if exists background_wish_dialogue_sessions_set_updated_at on public.background_wish_dialogue_sessions;
create trigger background_wish_dialogue_sessions_set_updated_at
before update on public.background_wish_dialogue_sessions
for each row execute function public.set_updated_at();

alter table public.background_source_sync_jobs enable row level security;
alter table public.background_helper_runs enable row level security;
alter table public.background_delegate_receipts enable row level security;
alter table public.background_candidate_exposure_counters enable row level security;
alter table public.background_wish_dialogue_sessions enable row level security;
alter table public.background_wish_dialogue_messages enable row level security;
alter table public.background_wish_field_proposals enable row level security;
alter table public.background_private_overlap_tags enable row level security;
alter table public.background_private_overlap_checks enable row level security;
alter table public.transparency_receipts enable row level security;

grant select, insert, update on public.background_source_sync_jobs to authenticated;
grant select, insert, update on public.background_helper_runs to authenticated;
grant select, insert on public.background_delegate_receipts to authenticated;
revoke all on public.background_candidate_exposure_counters from authenticated;
grant select, insert, update on public.background_wish_dialogue_sessions to authenticated;
grant select, insert on public.background_wish_dialogue_messages to authenticated;
grant select, insert, update on public.background_wish_field_proposals to authenticated;
grant select, insert, delete on public.background_private_overlap_tags to authenticated;
grant select, insert on public.background_private_overlap_checks to authenticated;
grant select, insert on public.transparency_receipts to authenticated;

grant all on public.background_source_sync_jobs to service_role;
grant all on public.background_helper_runs to service_role;
grant all on public.background_delegate_receipts to service_role;
grant all on public.background_candidate_exposure_counters to service_role;
grant all on public.background_wish_dialogue_sessions to service_role;
grant all on public.background_wish_dialogue_messages to service_role;
grant all on public.background_wish_field_proposals to service_role;
grant all on public.background_private_overlap_tags to service_role;
grant all on public.background_private_overlap_checks to service_role;
grant all on public.transparency_receipts to service_role;

revoke all on function public.reserve_background_candidate_exposure(uuid, text, text, text, text, integer, integer, text) from public;
revoke all on function public.reserve_background_candidate_exposure(uuid, text, text, text, text, integer, integer, text) from authenticated;
grant execute on function public.reserve_background_candidate_exposure(uuid, text, text, text, text, integer, integer, text) to service_role;

drop policy if exists "background_source_sync_jobs_select_own" on public.background_source_sync_jobs;
create policy "background_source_sync_jobs_select_own"
on public.background_source_sync_jobs
for select
to authenticated
using (profile_id = (select auth.uid()));

drop policy if exists "background_source_sync_jobs_insert_own" on public.background_source_sync_jobs;
create policy "background_source_sync_jobs_insert_own"
on public.background_source_sync_jobs
for insert
to authenticated
with check (profile_id = (select auth.uid()));

drop policy if exists "background_source_sync_jobs_update_own" on public.background_source_sync_jobs;
create policy "background_source_sync_jobs_update_own"
on public.background_source_sync_jobs
for update
to authenticated
using (profile_id = (select auth.uid()))
with check (profile_id = (select auth.uid()));

drop policy if exists "background_helper_runs_select_own" on public.background_helper_runs;
create policy "background_helper_runs_select_own"
on public.background_helper_runs
for select
to authenticated
using (profile_id = (select auth.uid()));

drop policy if exists "background_helper_runs_insert_own" on public.background_helper_runs;
create policy "background_helper_runs_insert_own"
on public.background_helper_runs
for insert
to authenticated
with check (profile_id = (select auth.uid()));

drop policy if exists "background_helper_runs_update_own" on public.background_helper_runs;
create policy "background_helper_runs_update_own"
on public.background_helper_runs
for update
to authenticated
using (profile_id = (select auth.uid()))
with check (profile_id = (select auth.uid()));

drop policy if exists "background_wish_dialogue_sessions_select_own" on public.background_wish_dialogue_sessions;
create policy "background_wish_dialogue_sessions_select_own"
on public.background_wish_dialogue_sessions
for select
to authenticated
using (profile_id = (select auth.uid()));

drop policy if exists "background_wish_dialogue_sessions_insert_own" on public.background_wish_dialogue_sessions;
create policy "background_wish_dialogue_sessions_insert_own"
on public.background_wish_dialogue_sessions
for insert
to authenticated
with check (profile_id = (select auth.uid()));

drop policy if exists "background_wish_dialogue_sessions_update_own" on public.background_wish_dialogue_sessions;
create policy "background_wish_dialogue_sessions_update_own"
on public.background_wish_dialogue_sessions
for update
to authenticated
using (profile_id = (select auth.uid()))
with check (profile_id = (select auth.uid()));

drop policy if exists "background_wish_dialogue_messages_select_own" on public.background_wish_dialogue_messages;
create policy "background_wish_dialogue_messages_select_own"
on public.background_wish_dialogue_messages
for select
to authenticated
using (profile_id = (select auth.uid()));

drop policy if exists "background_wish_dialogue_messages_insert_own" on public.background_wish_dialogue_messages;
create policy "background_wish_dialogue_messages_insert_own"
on public.background_wish_dialogue_messages
for insert
to authenticated
with check (
  profile_id = (select auth.uid())
  and exists (
    select 1
    from public.background_wish_dialogue_sessions
    where background_wish_dialogue_sessions.id = session_id
      and background_wish_dialogue_sessions.profile_id = (select auth.uid())
  )
);

drop policy if exists "background_wish_field_proposals_select_own" on public.background_wish_field_proposals;
create policy "background_wish_field_proposals_select_own"
on public.background_wish_field_proposals
for select
to authenticated
using (profile_id = (select auth.uid()));

drop policy if exists "background_wish_field_proposals_insert_own" on public.background_wish_field_proposals;
create policy "background_wish_field_proposals_insert_own"
on public.background_wish_field_proposals
for insert
to authenticated
with check (
  profile_id = (select auth.uid())
  and exists (
    select 1
    from public.background_wish_dialogue_sessions
    where background_wish_dialogue_sessions.id = session_id
      and background_wish_dialogue_sessions.profile_id = (select auth.uid())
  )
);

drop policy if exists "background_wish_field_proposals_update_own" on public.background_wish_field_proposals;
create policy "background_wish_field_proposals_update_own"
on public.background_wish_field_proposals
for update
to authenticated
using (profile_id = (select auth.uid()))
with check (profile_id = (select auth.uid()));

drop policy if exists "background_private_overlap_tags_select_own" on public.background_private_overlap_tags;
create policy "background_private_overlap_tags_select_own"
on public.background_private_overlap_tags
for select
to authenticated
using (profile_id = (select auth.uid()));

drop policy if exists "background_private_overlap_tags_insert_own" on public.background_private_overlap_tags;
create policy "background_private_overlap_tags_insert_own"
on public.background_private_overlap_tags
for insert
to authenticated
with check (profile_id = (select auth.uid()));

drop policy if exists "background_private_overlap_tags_delete_own" on public.background_private_overlap_tags;
create policy "background_private_overlap_tags_delete_own"
on public.background_private_overlap_tags
for delete
to authenticated
using (profile_id = (select auth.uid()));

drop policy if exists "background_private_overlap_checks_select_relevant" on public.background_private_overlap_checks;
create policy "background_private_overlap_checks_select_relevant"
on public.background_private_overlap_checks
for select
to authenticated
using (requester_id = (select auth.uid()) or counterparty_id = (select auth.uid()));

drop policy if exists "background_private_overlap_checks_insert_requester" on public.background_private_overlap_checks;
create policy "background_private_overlap_checks_insert_requester"
on public.background_private_overlap_checks
for insert
to authenticated
with check (requester_id = (select auth.uid()));

drop policy if exists "transparency_receipts_select_own_actor_scope" on public.transparency_receipts;
create policy "transparency_receipts_select_own_actor_scope"
on public.transparency_receipts
for select
to authenticated
using (actor_scope = ('profile:' || (select auth.uid())::text));

drop policy if exists "transparency_receipts_insert_own_actor_scope" on public.transparency_receipts;
create policy "transparency_receipts_insert_own_actor_scope"
on public.transparency_receipts
for insert
to authenticated
with check (actor_scope = ('profile:' || (select auth.uid())::text));
