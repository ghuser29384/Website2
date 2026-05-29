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
  evidence_url text not null default '',
  moderation_status text not null default 'clear' check (moderation_status in ('clear', 'flagged', 'blocked')),
  moderation_notes text not null default '',
  moderation_reviewed_by uuid references public.profiles (id) on delete set null,
  moderation_reviewed_at timestamptz,
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
alter table public.donation_offset_offers add column if not exists moderation_reviewed_by uuid references public.profiles (id) on delete set null;
alter table public.donation_offset_offers add column if not exists moderation_reviewed_at timestamptz;
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
  redaction_level text not null default 'participant_private' check (redaction_level in ('public', 'participant_private', 'reviewer_only')),
  created_at timestamptz not null default timezone('utc', now())
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
  created_at timestamptz not null default timezone('utc', now()),
  sent_at timestamptz
);

alter table public.email_outbox add column if not exists attempt_count integer not null default 0;
alter table public.email_outbox add column if not exists last_error text not null default '';

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
  is_discoverable boolean not null default true,
  share_public_preview boolean not null default true,
  share_location boolean not null default false,
  public_preview text not null default '',
  safety_status text not null default 'clear' check (safety_status in ('clear', 'flagged', 'blocked')),
  safety_notes text not null default '',
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
alter table public.match_suggestions add column if not exists match_basis text[] not null default '{}';
alter table public.match_suggestions add column if not exists shared_causes text[] not null default '{}';
alter table public.match_suggestions add column if not exists suggested_first_step text not null default '';
alter table public.match_suggestions add column if not exists risk_notes text not null default '';
alter table public.match_suggestions add column if not exists generated_by text not null default 'rule-based';
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
  is_active boolean not null default true,
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
  desired_timeline text not null default '',
  risk_notes text not null default '',
  status text not null default 'open' check (status in ('open', 'triaged', 'waiting_on_requester', 'waiting_on_counterparty', 'introduced', 'declined', 'closed')),
  operator_notes text not null default '',
  sla_due_at timestamptz not null default (timezone('utc', now()) + interval '24 hours'),
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
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
  access_status text not null default 'not_connected' check (access_status in ('not_connected', 'connected', 'revoked', 'needs_review')),
  access_scope text not null default '',
  consent_notes text not null default '',
  import_mode text not null default 'manual_review' check (import_mode in ('manual_review', 'manual_paste', 'rss_pull', 'forwarded_note')),
  sync_frequency text not null default 'manual' check (sync_frequency in ('manual', 'weekly', 'monthly')),
  last_sync_summary text not null default '',
  last_import_item_count integer not null default 0 check (last_import_item_count >= 0),
  last_imported_at timestamptz,
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
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.helper_strategies (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  helper_kind text not null default 'cause_overlap' check (helper_kind in ('cause_overlap', 'payment_compatibility', 'geographic', 'network_expansion', 'saved_search', 'risk_filter')),
  label text not null,
  priority smallint not null default 3 check (priority between 1 and 5),
  min_score smallint not null default 55 check (min_score between 0 and 100),
  strategy_config jsonb not null default '{}'::jsonb,
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
  last_digest_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (profile_id, event_kind, channel)
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

alter table public.network_invites add column if not exists target_kind text not null default 'person';
alter table public.network_invites add column if not exists target_url text not null default '';
alter table public.network_invites add column if not exists desired_capability text not null default '';
alter table public.network_invites add column if not exists suggested_message text not null default '';
alter table public.network_invites add column if not exists priority smallint not null default 3;

alter table public.source_connections add column if not exists import_mode text not null default 'manual_review';
alter table public.source_connections add column if not exists sync_frequency text not null default 'manual';
alter table public.source_connections add column if not exists last_sync_summary text not null default '';
alter table public.source_connections add column if not exists last_import_item_count integer not null default 0;

alter table public.profile_syntheses add column if not exists cause_priorities text[] not null default '{}';
alter table public.profile_syntheses add column if not exists offer_terms text[] not null default '{}';
alter table public.profile_syntheses add column if not exists ask_terms text[] not null default '{}';
alter table public.profile_syntheses add column if not exists capability_tags text[] not null default '{}';
alter table public.profile_syntheses add column if not exists constraint_flags text[] not null default '{}';
alter table public.profile_syntheses add column if not exists uncertainty_flags text[] not null default '{}';
alter table public.profile_syntheses add column if not exists missing_fields text[] not null default '{}';
alter table public.profile_syntheses add column if not exists confidence_breakdown jsonb not null default '{}'::jsonb;

alter table public.helper_strategies add column if not exists min_score smallint not null default 55;
alter table public.helper_strategies add column if not exists strategy_config jsonb not null default '{}'::jsonb;

alter table public.match_introduction_plans add column if not exists proposal_terms text not null default '';
alter table public.match_introduction_plans add column if not exists timeline text not null default '';
alter table public.match_introduction_plans add column if not exists next_actions text not null default '';

alter table public.privacy_grants add column if not exists audience_stage text not null default 'registry';
alter table public.privacy_grants add column if not exists notes text not null default '';
alter table public.privacy_grants add column if not exists expires_at timestamptz;

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
create index if not exists wish_entries_profile_type_idx on public.wish_entries (profile_id, entry_type, updated_at desc);
create index if not exists wish_entries_preview_idx on public.wish_entries (visibility, safety_status, entry_type, updated_at desc);
create index if not exists match_suggestions_profile_a_idx on public.match_suggestions (profile_a_id, status, updated_at desc);
create index if not exists match_suggestions_profile_b_idx on public.match_suggestions (profile_b_id, status, updated_at desc);
create index if not exists match_suggestions_score_idx on public.match_suggestions (status, score desc, updated_at desc);
create index if not exists match_consents_profile_id_idx on public.match_consents (profile_id);
create index if not exists wish_notifications_profile_unread_idx on public.wish_notifications (profile_id, read_at, created_at desc);
create index if not exists profile_sources_profile_active_idx on public.profile_sources (profile_id, is_active, updated_at desc);
create index if not exists profile_sources_profile_review_idx on public.profile_sources (profile_id, needs_review, updated_at desc);
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
create index if not exists match_concierge_events_request_idx on public.match_concierge_events (request_id, created_at desc);
create index if not exists network_invites_profile_status_idx on public.network_invites (profile_id, status, created_at desc);
create index if not exists network_invites_profile_priority_idx on public.network_invites (profile_id, priority desc, updated_at desc);
create index if not exists personal_delegates_status_idx on public.personal_delegates (status, operating_mode, last_run_at asc nulls first);
create index if not exists source_connections_profile_status_idx on public.source_connections (profile_id, access_status, updated_at desc);
create index if not exists source_connections_profile_import_idx on public.source_connections (profile_id, access_status, sync_frequency, updated_at desc);
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
