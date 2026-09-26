-- Direct, non-custodial Donation Upgrade commitments.
-- Every.org receives each participant's donation directly. Moral Trade records
-- fulfilment only after exact partner-webhook verification.

create extension if not exists pgcrypto;

create table if not exists public.direct_donation_upgrade_offers (
  id uuid primary key default gen_random_uuid(),
  creator_profile_id uuid not null references public.profiles(id) on delete restrict,
  environment text not null check (environment in ('staging', 'live')),
  status text not null default 'open' check (
    status in ('open', 'matched', 'fallback_selected', 'completed', 'defaulted', 'expired', 'cancelled', 'needs_review')
  ),
  selected_branch text check (selected_branch is null or selected_branch in ('fallback', 'matched')),
  privacy_mode text not null default 'public' check (privacy_mode in ('public', 'private_until_completed')),
  creator_amount_cents integer not null check (creator_amount_cents between 100 and 5000000),
  matcher_amount_cents integer not null check (matcher_amount_cents between 100 and 5000000),
  currency text not null default 'USD' check (currency = 'USD'),
  match_deadline_at timestamptz not null,
  fulfillment_deadline_at timestamptz,
  webhook_grace_ends_at timestamptz,
  original_recipient jsonb not null check (jsonb_typeof(original_recipient) = 'object'),
  upgraded_recipient jsonb not null check (jsonb_typeof(upgraded_recipient) = 'object'),
  original_recipient_hash text not null check (original_recipient_hash ~ '^[0-9a-f]{64}$'),
  upgraded_recipient_hash text not null check (upgraded_recipient_hash ~ '^[0-9a-f]{64}$'),
  baseline_version text not null,
  baseline_attestation text not null,
  baseline_attested_at timestamptz not null default timezone('utc', now()),
  terms_hash text not null check (terms_hash ~ '^[0-9a-f]{64}$'),
  winning_candidate_id uuid,
  match_locked_at timestamptz,
  completed_at timestamptz,
  defaulted_at timestamptz,
  cancellation_reason text not null default '',
  failure_code text not null default '',
  failure_message text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (original_recipient_hash <> upgraded_recipient_hash),
  check (match_deadline_at > created_at),
  check (
    (status = 'open' and selected_branch is null and fulfillment_deadline_at is null and webhook_grace_ends_at is null)
    or (status in ('matched', 'fallback_selected', 'completed', 'defaulted', 'needs_review') and selected_branch is not null)
    or (status in ('expired', 'cancelled'))
  )
);

create index if not exists direct_donation_upgrade_offers_public_idx
  on public.direct_donation_upgrade_offers(status, created_at desc);
create index if not exists direct_donation_upgrade_offers_creator_idx
  on public.direct_donation_upgrade_offers(creator_profile_id, created_at desc);
create index if not exists direct_donation_upgrade_offers_match_deadline_idx
  on public.direct_donation_upgrade_offers(match_deadline_at)
  where status = 'open';
create index if not exists direct_donation_upgrade_offers_fulfillment_idx
  on public.direct_donation_upgrade_offers(webhook_grace_ends_at)
  where status in ('matched', 'fallback_selected');

create table if not exists public.direct_donation_upgrade_candidates (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references public.direct_donation_upgrade_offers(id) on delete restrict,
  profile_id uuid not null references public.profiles(id) on delete restrict,
  rank integer not null check (rank >= 1),
  status text not null check (status in ('primary', 'backup', 'promoted', 'fulfilled', 'defaulted', 'withdrawn', 'closed')),
  commitment_version text not null,
  commitment_accepted_at timestamptz not null default timezone('utc', now()),
  promoted_at timestamptz,
  fulfilled_at timestamptz,
  defaulted_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (offer_id, profile_id),
  unique (offer_id, rank)
);

alter table public.direct_donation_upgrade_offers
  drop constraint if exists direct_donation_upgrade_offers_winning_candidate_id_fkey;
alter table public.direct_donation_upgrade_offers
  add constraint direct_donation_upgrade_offers_winning_candidate_id_fkey
  foreign key (winning_candidate_id)
  references public.direct_donation_upgrade_candidates(id)
  on delete restrict;

create unique index if not exists direct_donation_upgrade_one_current_matcher_idx
  on public.direct_donation_upgrade_candidates(offer_id)
  where status in ('primary', 'promoted', 'fulfilled');
create index if not exists direct_donation_upgrade_candidates_profile_idx
  on public.direct_donation_upgrade_candidates(profile_id, created_at desc);
create index if not exists direct_donation_upgrade_candidates_backup_idx
  on public.direct_donation_upgrade_candidates(offer_id, rank)
  where status = 'backup';

create table if not exists public.direct_donation_upgrade_obligations (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references public.direct_donation_upgrade_offers(id) on delete restrict,
  candidate_id uuid references public.direct_donation_upgrade_candidates(id) on delete restrict,
  participant_profile_id uuid not null references public.profiles(id) on delete restrict,
  participant_role text not null check (participant_role in ('creator', 'matcher')),
  branch text not null check (branch in ('fallback', 'matched')),
  environment text not null check (environment in ('staging', 'live')),
  provider text not null default 'every_org' check (provider = 'every_org'),
  expected_recipient jsonb not null check (jsonb_typeof(expected_recipient) = 'object'),
  expected_recipient_hash text not null check (expected_recipient_hash ~ '^[0-9a-f]{64}$'),
  expected_amount_cents integer not null check (expected_amount_cents between 100 and 5000000),
  expected_currency text not null default 'USD' check (expected_currency = 'USD'),
  expected_frequency text not null default 'ONCE' check (expected_frequency = 'ONCE'),
  terms_hash text not null check (terms_hash ~ '^[0-9a-f]{64}$'),
  partner_donation_id text not null unique,
  status text not null default 'pending' check (
    status in ('pending', 'checkout_started', 'verified', 'defaulted', 'cancelled', 'needs_review')
  ),
  due_at timestamptz not null,
  webhook_grace_ends_at timestamptz not null,
  reminder_72h_sent_at timestamptz,
  reminder_24h_sent_at timestamptz,
  checkout_started_at timestamptz,
  provider_charge_id_hash text not null default '' check (provider_charge_id_hash = '' or provider_charge_id_hash ~ '^[0-9a-f]{64}$'),
  provider_payload_hash text not null default '' check (provider_payload_hash = '' or provider_payload_hash ~ '^[0-9a-f]{64}$'),
  provider_gross_amount_cents integer,
  provider_net_amount_cents integer,
  provider_currency text not null default '',
  provider_nonprofit_slug text not null default '',
  provider_nonprofit_ein text not null default '',
  provider_donation_date timestamptz,
  provider_payment_method text not null default '',
  incremental_amount_cents integer not null default 0 check (incremental_amount_cents >= 0),
  redirected_amount_cents integer not null default 0 check (redirected_amount_cents >= 0),
  failure_code text not null default '',
  failure_message text not null default '',
  verified_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (webhook_grace_ends_at > due_at),
  check (
    (participant_role = 'creator' and candidate_id is null)
    or (participant_role = 'matcher' and candidate_id is not null)
  ),
  check (
    (branch = 'fallback' and participant_role = 'creator' and incremental_amount_cents = 0 and redirected_amount_cents = 0)
    or (branch = 'matched' and participant_role = 'creator' and incremental_amount_cents = 0 and redirected_amount_cents = expected_amount_cents)
    or (branch = 'matched' and participant_role = 'matcher' and incremental_amount_cents = expected_amount_cents and redirected_amount_cents = 0)
  ),
  check (
    status <> 'verified'
    or (
      provider_charge_id_hash <> ''
      and provider_payload_hash <> ''
      and provider_gross_amount_cents = expected_amount_cents
      and provider_net_amount_cents between 0 and provider_gross_amount_cents
      and provider_currency = expected_currency
      and provider_donation_date is not null
      and verified_at is not null
    )
  )
);

create unique index if not exists direct_donation_upgrade_creator_obligation_idx
  on public.direct_donation_upgrade_obligations(offer_id, branch)
  where participant_role = 'creator';
create unique index if not exists direct_donation_upgrade_matcher_obligation_idx
  on public.direct_donation_upgrade_obligations(candidate_id)
  where participant_role = 'matcher';
create unique index if not exists direct_donation_upgrade_provider_charge_idx
  on public.direct_donation_upgrade_obligations(provider_charge_id_hash)
  where provider_charge_id_hash <> '';
create index if not exists direct_donation_upgrade_obligations_participant_idx
  on public.direct_donation_upgrade_obligations(participant_profile_id, created_at desc);
create index if not exists direct_donation_upgrade_obligations_due_idx
  on public.direct_donation_upgrade_obligations(webhook_grace_ends_at)
  where status in ('pending', 'checkout_started');

create table if not exists public.direct_donation_upgrade_impact_credits (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references public.direct_donation_upgrade_offers(id) on delete restrict,
  obligation_id uuid not null unique references public.direct_donation_upgrade_obligations(id) on delete restrict,
  profile_id uuid not null references public.profiles(id) on delete restrict,
  branch text not null check (branch in ('fallback', 'matched')),
  provider text not null default 'every_org' check (provider = 'every_org'),
  recipient_hash text not null check (recipient_hash ~ '^[0-9a-f]{64}$'),
  verified_gross_amount_cents integer not null check (verified_gross_amount_cents >= 0),
  verified_net_amount_cents integer not null check (verified_net_amount_cents >= 0),
  incremental_gross_amount_cents integer not null check (incremental_gross_amount_cents >= 0),
  incremental_net_amount_cents integer not null check (incremental_net_amount_cents >= 0),
  redirected_gross_amount_cents integer not null check (redirected_gross_amount_cents >= 0),
  redirected_net_amount_cents integer not null check (redirected_net_amount_cents >= 0),
  provider_charge_id_hash text not null check (provider_charge_id_hash ~ '^[0-9a-f]{64}$'),
  verified_at timestamptz not null,
  created_at timestamptz not null default timezone('utc', now()),
  check (verified_net_amount_cents <= verified_gross_amount_cents),
  check (incremental_gross_amount_cents + redirected_gross_amount_cents <= verified_gross_amount_cents),
  check (incremental_net_amount_cents + redirected_net_amount_cents <= verified_net_amount_cents)
);

create index if not exists direct_donation_upgrade_impact_profile_idx
  on public.direct_donation_upgrade_impact_credits(profile_id, verified_at desc);
create index if not exists direct_donation_upgrade_impact_offer_idx
  on public.direct_donation_upgrade_impact_credits(offer_id, verified_at);

create table if not exists public.direct_donation_upgrade_audit_events (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid references public.direct_donation_upgrade_offers(id) on delete restrict,
  obligation_id uuid references public.direct_donation_upgrade_obligations(id) on delete restrict,
  candidate_id uuid references public.direct_donation_upgrade_candidates(id) on delete restrict,
  actor_profile_id uuid references public.profiles(id) on delete set null,
  event_type text not null,
  details jsonb not null default '{}'::jsonb check (jsonb_typeof(details) = 'object'),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists direct_donation_upgrade_audit_offer_idx
  on public.direct_donation_upgrade_audit_events(offer_id, created_at);

create or replace function public.direct_donation_upgrade_set_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  new.updated_at := timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists direct_donation_upgrade_offers_updated_at on public.direct_donation_upgrade_offers;
create trigger direct_donation_upgrade_offers_updated_at
before update on public.direct_donation_upgrade_offers
for each row execute function public.direct_donation_upgrade_set_updated_at();

drop trigger if exists direct_donation_upgrade_candidates_updated_at on public.direct_donation_upgrade_candidates;
create trigger direct_donation_upgrade_candidates_updated_at
before update on public.direct_donation_upgrade_candidates
for each row execute function public.direct_donation_upgrade_set_updated_at();

drop trigger if exists direct_donation_upgrade_obligations_updated_at on public.direct_donation_upgrade_obligations;
create trigger direct_donation_upgrade_obligations_updated_at
before update on public.direct_donation_upgrade_obligations
for each row execute function public.direct_donation_upgrade_set_updated_at();

create or replace function public.direct_donation_upgrade_guard_offer_terms()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'Donation Upgrade offers are retained as audit records.';
  end if;
  if new.creator_profile_id is distinct from old.creator_profile_id
     or new.environment is distinct from old.environment
     or new.privacy_mode is distinct from old.privacy_mode
     or new.creator_amount_cents is distinct from old.creator_amount_cents
     or new.matcher_amount_cents is distinct from old.matcher_amount_cents
     or new.currency is distinct from old.currency
     or new.match_deadline_at is distinct from old.match_deadline_at
     or new.original_recipient is distinct from old.original_recipient
     or new.upgraded_recipient is distinct from old.upgraded_recipient
     or new.original_recipient_hash is distinct from old.original_recipient_hash
     or new.upgraded_recipient_hash is distinct from old.upgraded_recipient_hash
     or new.baseline_version is distinct from old.baseline_version
     or new.baseline_attestation is distinct from old.baseline_attestation
     or new.baseline_attested_at is distinct from old.baseline_attested_at
     or new.terms_hash is distinct from old.terms_hash
     or new.created_at is distinct from old.created_at then
    raise exception 'Published Donation Upgrade terms and baseline are immutable.';
  end if;
  return new;
end;
$$;

drop trigger if exists direct_donation_upgrade_offer_terms_immutable on public.direct_donation_upgrade_offers;
create trigger direct_donation_upgrade_offer_terms_immutable
before update or delete on public.direct_donation_upgrade_offers
for each row execute function public.direct_donation_upgrade_guard_offer_terms();

create or replace function public.direct_donation_upgrade_guard_candidate_identity()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'Donation Upgrade matcher records are retained as audit records.';
  end if;
  if new.offer_id is distinct from old.offer_id
     or new.profile_id is distinct from old.profile_id
     or new.rank is distinct from old.rank
     or new.commitment_version is distinct from old.commitment_version
     or new.commitment_accepted_at is distinct from old.commitment_accepted_at
     or new.created_at is distinct from old.created_at then
    raise exception 'Donation Upgrade matcher identity and commitment are immutable.';
  end if;
  return new;
end;
$$;

drop trigger if exists direct_donation_upgrade_candidate_identity_immutable on public.direct_donation_upgrade_candidates;
create trigger direct_donation_upgrade_candidate_identity_immutable
before update or delete on public.direct_donation_upgrade_candidates
for each row execute function public.direct_donation_upgrade_guard_candidate_identity();

create or replace function public.direct_donation_upgrade_guard_obligation_terms()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'Direct Donation Upgrade obligations are retained as audit records.';
  end if;
  if new.offer_id is distinct from old.offer_id
     or new.candidate_id is distinct from old.candidate_id
     or new.participant_profile_id is distinct from old.participant_profile_id
     or new.participant_role is distinct from old.participant_role
     or new.branch is distinct from old.branch
     or new.environment is distinct from old.environment
     or new.provider is distinct from old.provider
     or new.expected_recipient is distinct from old.expected_recipient
     or new.expected_recipient_hash is distinct from old.expected_recipient_hash
     or new.expected_amount_cents is distinct from old.expected_amount_cents
     or new.expected_currency is distinct from old.expected_currency
     or new.expected_frequency is distinct from old.expected_frequency
     or new.terms_hash is distinct from old.terms_hash
     or new.partner_donation_id is distinct from old.partner_donation_id
     or new.due_at is distinct from old.due_at
     or new.webhook_grace_ends_at is distinct from old.webhook_grace_ends_at
     or new.incremental_amount_cents is distinct from old.incremental_amount_cents
     or new.redirected_amount_cents is distinct from old.redirected_amount_cents
     or new.created_at is distinct from old.created_at then
    raise exception 'Direct Donation Upgrade obligation terms are immutable.';
  end if;
  return new;
end;
$$;

drop trigger if exists direct_donation_upgrade_obligation_terms_immutable on public.direct_donation_upgrade_obligations;
create trigger direct_donation_upgrade_obligation_terms_immutable
before update or delete on public.direct_donation_upgrade_obligations
for each row execute function public.direct_donation_upgrade_guard_obligation_terms();

create or replace function public.direct_donation_upgrade_prevent_audit_mutation()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  raise exception 'Direct Donation Upgrade audit records are append-only.';
end;
$$;

drop trigger if exists direct_donation_upgrade_audit_immutable on public.direct_donation_upgrade_audit_events;
create trigger direct_donation_upgrade_audit_immutable
before update or delete on public.direct_donation_upgrade_audit_events
for each row execute function public.direct_donation_upgrade_prevent_audit_mutation();

drop trigger if exists direct_donation_upgrade_impact_immutable on public.direct_donation_upgrade_impact_credits;
create trigger direct_donation_upgrade_impact_immutable
before update or delete on public.direct_donation_upgrade_impact_credits
for each row execute function public.direct_donation_upgrade_prevent_audit_mutation();

create or replace function public.direct_donation_upgrade_notify(
  p_user_id uuid,
  p_notification_type text,
  p_title text,
  p_body text,
  p_href text,
  p_dedupe_key text
)
returns void
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  insert into public.trade_notifications(
    user_id, notification_type, title, body, href, dedupe_key
  ) values (
    p_user_id, p_notification_type, p_title, p_body, p_href, p_dedupe_key
  ) on conflict (dedupe_key) do nothing;
end;
$$;

create or replace function public.direct_donation_upgrade_audit(
  p_offer_id uuid,
  p_obligation_id uuid,
  p_candidate_id uuid,
  p_actor_profile_id uuid,
  p_event_type text,
  p_details jsonb
)
returns void
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  insert into public.direct_donation_upgrade_audit_events(
    offer_id, obligation_id, candidate_id, actor_profile_id, event_type, details
  ) values (
    p_offer_id,
    p_obligation_id,
    p_candidate_id,
    p_actor_profile_id,
    left(coalesce(p_event_type, ''), 120),
    coalesce(p_details, '{}'::jsonb)
  );
end;
$$;

create or replace function public.direct_donation_upgrade_temporarily_restricted(p_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select exists (
    select 1
    from public.credibility_restrictions restriction
    where restriction.profile_id = p_profile_id
      and restriction.status in ('active', 'reviewing')
      and restriction.reason_code = 'direct_donation_upgrade_default'
      and restriction.starts_at <= timezone('utc', now())
      and (restriction.ends_at is null or restriction.ends_at > timezone('utc', now()))
  );
$$;

create or replace function public.direct_donation_upgrade_record_fulfilment(
  p_profile_id uuid,
  p_counterparty_id uuid,
  p_offer_id uuid,
  p_obligation_id uuid,
  p_outcome numeric,
  p_amount_cents integer,
  p_reason_code text
)
returns void
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  insert into public.credibility_events(
    profile_id,
    agreement_id,
    counterparty_id,
    role,
    category,
    dimension,
    outcome,
    evidence_quality,
    context_similarity,
    stake_units,
    source_type,
    source_id,
    reason_code,
    eligible,
    occurred_at,
    verified_at,
    metadata,
    created_by
  ) values (
    p_profile_id,
    null,
    p_counterparty_id,
    'funder',
    'donation',
    'fulfilment',
    greatest(0, least(1, p_outcome)),
    'platform_verified',
    1,
    greatest(0, p_amount_cents)::numeric / 100,
    'direct_donation_upgrade',
    p_obligation_id::text,
    left(coalesce(p_reason_code, ''), 120),
    true,
    timezone('utc', now()),
    case when p_outcome >= 1 then timezone('utc', now()) else null end,
    jsonb_build_object('offerId', p_offer_id, 'obligationId', p_obligation_id),
    p_profile_id
  ) on conflict (source_type, source_id, profile_id, dimension)
    where source_id is not null
    do nothing;
end;
$$;

create or replace function public.direct_donation_upgrade_record_default(
  p_profile_id uuid,
  p_counterparty_id uuid,
  p_offer_id uuid,
  p_obligation_id uuid,
  p_amount_cents integer
)
returns void
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  perform public.direct_donation_upgrade_record_fulfilment(
    p_profile_id,
    p_counterparty_id,
    p_offer_id,
    p_obligation_id,
    0,
    p_amount_cents,
    'direct_donation_upgrade_default'
  );

  if not exists (
    select 1
    from public.credibility_restrictions restriction
    where restriction.profile_id = p_profile_id
      and restriction.reason_code = 'direct_donation_upgrade_default'
      and restriction.status in ('active', 'reviewing')
      and restriction.starts_at <= timezone('utc', now())
      and (restriction.ends_at is null or restriction.ends_at > timezone('utc', now()))
  ) then
    insert into public.credibility_restrictions(
      profile_id,
      restriction_type,
      reason_code,
      status,
      scope_role,
      scope_category,
      starts_at,
      ends_at,
      private_notes
    ) values (
      p_profile_id,
      'other',
      'direct_donation_upgrade_default',
      'active',
      'funder',
      'donation',
      timezone('utc', now()),
      timezone('utc', now()) + interval '7 days',
      'Temporary restriction after an unfulfilled direct Donation Upgrade obligation.'
    );
  end if;
end;
$$;

create or replace function public.direct_donation_upgrade_validate_recipient(p_recipient jsonb, p_hash text)
returns void
language plpgsql
immutable
set search_path = pg_catalog
as $$
begin
  if p_recipient is null or jsonb_typeof(p_recipient) <> 'object' then
    raise exception 'A structured Every.org recipient identity is required.';
  end if;
  if coalesce(p_recipient->>'schemaVersion', '') <> 'moral-trade-every-org-nonprofit-identity-v1'
     or coalesce(p_recipient->>'provider', '') <> 'every_org'
     or length(trim(coalesce(p_recipient->>'providerNonprofitId', ''))) < 2
     or length(trim(coalesce(p_recipient->>'name', ''))) < 2
     or length(trim(coalesce(p_recipient->>'primarySlug', ''))) < 2
     or coalesce((p_recipient->>'isDisbursable')::boolean, false) is not true
     or coalesce(p_recipient->>'profileUrl', '') !~ '^https://(www\.)?every\.org/'
     or p_hash !~ '^[0-9a-f]{64}$'
     or coalesce(p_recipient->>'identityHash', '') <> p_hash then
    raise exception 'The Every.org recipient identity is incomplete or not disbursable.';
  end if;
end;
$$;

create or replace function public.create_direct_donation_upgrade_offer(
  p_creator_profile_id uuid,
  p_environment text,
  p_creator_amount_cents integer,
  p_matcher_amount_cents integer,
  p_match_deadline_at timestamptz,
  p_privacy_mode text,
  p_original_recipient jsonb,
  p_upgraded_recipient jsonb,
  p_baseline_version text,
  p_baseline_attestation text,
  p_terms_hash text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  offer_row public.direct_donation_upgrade_offers%rowtype;
  original_hash text := lower(trim(coalesce(p_original_recipient->>'identityHash', '')));
  upgraded_hash text := lower(trim(coalesce(p_upgraded_recipient->>'identityHash', '')));
  original_ein text := regexp_replace(coalesce(p_original_recipient->>'ein', ''), '[^0-9]', '', 'g');
  upgraded_ein text := regexp_replace(coalesce(p_upgraded_recipient->>'ein', ''), '[^0-9]', '', 'g');
begin
  if not exists (select 1 from public.profiles where id = p_creator_profile_id) then
    raise exception 'Creator profile not found.';
  end if;
  if public.direct_donation_upgrade_temporarily_restricted(p_creator_profile_id) then
    raise exception 'This profile is temporarily restricted from creating Donation Upgrades after a recent unfulfilled obligation.';
  end if;
  if p_environment not in ('staging', 'live') then
    raise exception 'Invalid Direct Donation Upgrade environment.';
  end if;
  if p_creator_amount_cents not between 100 and 5000000
     or p_matcher_amount_cents not between 100 and 5000000 then
    raise exception 'Donation amounts must be between $1 and $50,000.';
  end if;
  if p_match_deadline_at < timezone('utc', now()) + interval '1 hour'
     or p_match_deadline_at > timezone('utc', now()) + interval '30 days' then
    raise exception 'The matching deadline must be between one hour and 30 days from now.';
  end if;
  if p_privacy_mode not in ('public', 'private_until_completed') then
    raise exception 'Invalid privacy mode.';
  end if;
  if trim(coalesce(p_baseline_version, '')) <> 'direct-donation-upgrade-baseline-v1-2026-08-01'
     or length(trim(coalesce(p_baseline_attestation, ''))) < 20 then
    raise exception 'The immutable pre-commitment baseline attestation is required.';
  end if;
  if lower(trim(coalesce(p_terms_hash, ''))) !~ '^[0-9a-f]{64}$' then
    raise exception 'The frozen terms hash is invalid.';
  end if;

  perform public.direct_donation_upgrade_validate_recipient(p_original_recipient, original_hash);
  perform public.direct_donation_upgrade_validate_recipient(p_upgraded_recipient, upgraded_hash);

  if original_hash = upgraded_hash
     or lower(p_original_recipient->>'providerNonprofitId') = lower(p_upgraded_recipient->>'providerNonprofitId')
     or lower(p_original_recipient->>'primarySlug') = lower(p_upgraded_recipient->>'primarySlug')
     or (original_ein <> '' and original_ein = upgraded_ein) then
    raise exception 'The original and upgraded recipients must be different nonprofits.';
  end if;

  insert into public.direct_donation_upgrade_offers(
    creator_profile_id,
    environment,
    status,
    selected_branch,
    privacy_mode,
    creator_amount_cents,
    matcher_amount_cents,
    currency,
    match_deadline_at,
    original_recipient,
    upgraded_recipient,
    original_recipient_hash,
    upgraded_recipient_hash,
    baseline_version,
    baseline_attestation,
    baseline_attested_at,
    terms_hash
  ) values (
    p_creator_profile_id,
    p_environment,
    'open',
    null,
    p_privacy_mode,
    p_creator_amount_cents,
    p_matcher_amount_cents,
    'USD',
    p_match_deadline_at,
    p_original_recipient,
    p_upgraded_recipient,
    original_hash,
    upgraded_hash,
    trim(p_baseline_version),
    left(trim(p_baseline_attestation), 2000),
    timezone('utc', now()),
    lower(trim(p_terms_hash))
  ) returning * into offer_row;

  perform public.direct_donation_upgrade_audit(
    offer_row.id,
    null,
    null,
    p_creator_profile_id,
    'offer_created',
    jsonb_build_object(
      'environment', offer_row.environment,
      'privacyMode', offer_row.privacy_mode,
      'originalRecipientHash', offer_row.original_recipient_hash,
      'upgradedRecipientHash', offer_row.upgraded_recipient_hash,
      'termsHash', offer_row.terms_hash
    )
  );
  perform public.direct_donation_upgrade_notify(
    p_creator_profile_id,
    'direct_donation_upgrade_created',
    'Donation Upgrade published',
    'Your conditional donation commitment is open for a matcher. No payment method was collected.',
    '/donation-upgrades/' || offer_row.id::text,
    'direct_donation_upgrade_created:' || offer_row.id::text || ':' || p_creator_profile_id::text
  );
  return to_jsonb(offer_row);
end;
$$;

create or replace function public.join_direct_donation_upgrade_offer(
  p_actor_profile_id uuid,
  p_offer_id uuid,
  p_commitment_version text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  offer_row public.direct_donation_upgrade_offers%rowtype;
  candidate_row public.direct_donation_upgrade_candidates%rowtype;
  candidate_rank integer;
  due_at_value timestamptz;
  grace_ends_value timestamptz;
  is_primary boolean;
begin
  if not exists (select 1 from public.profiles where id = p_actor_profile_id) then
    raise exception 'Matcher profile not found.';
  end if;
  if public.direct_donation_upgrade_temporarily_restricted(p_actor_profile_id) then
    raise exception 'This profile is temporarily restricted from joining Donation Upgrades after a recent unfulfilled obligation.';
  end if;
  if trim(coalesce(p_commitment_version, '')) <> 'direct-donation-upgrade-matcher-v1-2026-08-01' then
    raise exception 'The current matcher commitment must be accepted.';
  end if;

  select * into offer_row
  from public.direct_donation_upgrade_offers
  where id = p_offer_id
  for update;
  if not found then raise exception 'Donation Upgrade not found.'; end if;
  if offer_row.creator_profile_id = p_actor_profile_id then
    raise exception 'The creator cannot match their own Donation Upgrade.';
  end if;

  select * into candidate_row
  from public.direct_donation_upgrade_candidates
  where offer_id = p_offer_id and profile_id = p_actor_profile_id;
  if found then return to_jsonb(candidate_row); end if;

  if offer_row.status = 'open' then
    if offer_row.match_deadline_at <= timezone('utc', now()) then
      raise exception 'The matching deadline has passed.';
    end if;
    is_primary := true;
  elsif offer_row.status = 'matched' then
    if offer_row.webhook_grace_ends_at <= timezone('utc', now()) then
      raise exception 'The fulfillment window has closed.';
    end if;
    is_primary := false;
  else
    raise exception 'This Donation Upgrade no longer accepts matchers.';
  end if;

  select coalesce(max(rank), 0) + 1 into candidate_rank
  from public.direct_donation_upgrade_candidates
  where offer_id = p_offer_id;

  insert into public.direct_donation_upgrade_candidates(
    offer_id,
    profile_id,
    rank,
    status,
    commitment_version,
    commitment_accepted_at
  ) values (
    p_offer_id,
    p_actor_profile_id,
    candidate_rank,
    case when is_primary then 'primary' else 'backup' end,
    trim(p_commitment_version),
    timezone('utc', now())
  ) returning * into candidate_row;

  if is_primary then
    due_at_value := timezone('utc', now()) + interval '7 days';
    grace_ends_value := due_at_value + interval '24 hours';

    update public.direct_donation_upgrade_offers
    set status = 'matched',
        selected_branch = 'matched',
        winning_candidate_id = candidate_row.id,
        match_locked_at = timezone('utc', now()),
        fulfillment_deadline_at = due_at_value,
        webhook_grace_ends_at = grace_ends_value
    where id = offer_row.id
    returning * into offer_row;

    insert into public.direct_donation_upgrade_obligations(
      offer_id,
      candidate_id,
      participant_profile_id,
      participant_role,
      branch,
      environment,
      expected_recipient,
      expected_recipient_hash,
      expected_amount_cents,
      expected_currency,
      expected_frequency,
      terms_hash,
      partner_donation_id,
      status,
      due_at,
      webhook_grace_ends_at,
      incremental_amount_cents,
      redirected_amount_cents
    ) values
    (
      offer_row.id,
      null,
      offer_row.creator_profile_id,
      'creator',
      'matched',
      offer_row.environment,
      offer_row.upgraded_recipient,
      offer_row.upgraded_recipient_hash,
      offer_row.creator_amount_cents,
      'USD',
      'ONCE',
      offer_row.terms_hash,
      gen_random_uuid()::text,
      'pending',
      due_at_value,
      grace_ends_value,
      0,
      offer_row.creator_amount_cents
    ),
    (
      offer_row.id,
      candidate_row.id,
      candidate_row.profile_id,
      'matcher',
      'matched',
      offer_row.environment,
      offer_row.upgraded_recipient,
      offer_row.upgraded_recipient_hash,
      offer_row.matcher_amount_cents,
      'USD',
      'ONCE',
      offer_row.terms_hash,
      gen_random_uuid()::text,
      'pending',
      due_at_value,
      grace_ends_value,
      offer_row.matcher_amount_cents,
      0
    );

    perform public.direct_donation_upgrade_notify(
      offer_row.creator_profile_id,
      'direct_donation_upgrade_matched',
      'Your Donation Upgrade matched',
      'A matcher committed. You each have seven days to complete a direct donation to the upgraded recipient.',
      '/donation-upgrades/' || offer_row.id::text,
      'direct_donation_upgrade_matched:' || offer_row.id::text || ':' || offer_row.creator_profile_id::text
    );
    perform public.direct_donation_upgrade_notify(
      candidate_row.profile_id,
      'direct_donation_upgrade_primary_matcher',
      'You matched a Donation Upgrade',
      'You and the creator each have seven days to complete the frozen direct donation obligation.',
      '/donation-upgrades/' || offer_row.id::text,
      'direct_donation_upgrade_primary:' || offer_row.id::text || ':' || candidate_row.profile_id::text
    );
  else
    perform public.direct_donation_upgrade_notify(
      candidate_row.profile_id,
      'direct_donation_upgrade_backup_joined',
      'You are a backup matcher',
      'You will be promoted only if the current matcher defaults. No payment method was collected.',
      '/donation-upgrades/' || offer_row.id::text,
      'direct_donation_upgrade_backup:' || offer_row.id::text || ':' || candidate_row.profile_id::text
    );
  end if;

  perform public.direct_donation_upgrade_audit(
    offer_row.id,
    null,
    candidate_row.id,
    p_actor_profile_id,
    case when is_primary then 'primary_matcher_joined' else 'backup_matcher_joined' end,
    jsonb_build_object('rank', candidate_row.rank, 'status', candidate_row.status)
  );

  return to_jsonb(candidate_row);
end;
$$;

create or replace function public.withdraw_direct_donation_upgrade_backup(
  p_actor_profile_id uuid,
  p_offer_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  candidate_row public.direct_donation_upgrade_candidates%rowtype;
begin
  update public.direct_donation_upgrade_candidates
  set status = 'withdrawn'
  where offer_id = p_offer_id
    and profile_id = p_actor_profile_id
    and status = 'backup'
  returning * into candidate_row;
  if not found then
    raise exception 'Only an unpromoted backup matcher can withdraw.';
  end if;
  perform public.direct_donation_upgrade_audit(
    p_offer_id, null, candidate_row.id, p_actor_profile_id,
    'backup_withdrawn', jsonb_build_object('rank', candidate_row.rank)
  );
  return to_jsonb(candidate_row);
end;
$$;

create or replace function public.cancel_direct_donation_upgrade_offer(
  p_actor_profile_id uuid,
  p_offer_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  offer_row public.direct_donation_upgrade_offers%rowtype;
begin
  update public.direct_donation_upgrade_offers
  set status = 'cancelled',
      cancellation_reason = 'Creator cancelled before a matcher committed.',
      completed_at = timezone('utc', now())
  where id = p_offer_id
    and creator_profile_id = p_actor_profile_id
    and status = 'open'
  returning * into offer_row;
  if not found then
    raise exception 'Only an open, unmatched Donation Upgrade can be cancelled by its creator.';
  end if;
  perform public.direct_donation_upgrade_audit(
    p_offer_id, null, null, p_actor_profile_id,
    'offer_cancelled', jsonb_build_object('reason', offer_row.cancellation_reason)
  );
  return to_jsonb(offer_row);
end;
$$;

create or replace function public.start_direct_donation_upgrade_checkout(
  p_actor_profile_id uuid,
  p_obligation_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  obligation_row public.direct_donation_upgrade_obligations%rowtype;
  offer_row public.direct_donation_upgrade_offers%rowtype;
  candidate_row public.direct_donation_upgrade_candidates%rowtype;
begin
  select * into obligation_row
  from public.direct_donation_upgrade_obligations
  where id = p_obligation_id and participant_profile_id = p_actor_profile_id
  for update;
  if not found then raise exception 'Donation obligation not found.'; end if;

  select * into offer_row
  from public.direct_donation_upgrade_offers
  where id = obligation_row.offer_id
  for update;

  if obligation_row.status = 'verified' then return to_jsonb(obligation_row); end if;
  if obligation_row.status not in ('pending', 'checkout_started') then
    raise exception 'This donation obligation is not payable from its current state.';
  end if;
  if offer_row.status not in ('matched', 'fallback_selected')
     or offer_row.selected_branch <> obligation_row.branch then
    raise exception 'The frozen Donation Upgrade branch is no longer active.';
  end if;
  if obligation_row.webhook_grace_ends_at <= timezone('utc', now()) then
    raise exception 'The donation fulfillment window has closed.';
  end if;
  if obligation_row.participant_role = 'matcher' then
    select * into candidate_row
    from public.direct_donation_upgrade_candidates
    where id = obligation_row.candidate_id;
    if not found
       or candidate_row.id <> offer_row.winning_candidate_id
       or candidate_row.status not in ('primary', 'promoted', 'fulfilled') then
      raise exception 'This matcher is not the current selected matcher.';
    end if;
  end if;

  update public.direct_donation_upgrade_obligations
  set status = case when status = 'pending' then 'checkout_started' else status end,
      checkout_started_at = coalesce(checkout_started_at, timezone('utc', now()))
  where id = obligation_row.id
  returning * into obligation_row;

  perform public.direct_donation_upgrade_audit(
    obligation_row.offer_id,
    obligation_row.id,
    obligation_row.candidate_id,
    p_actor_profile_id,
    'checkout_started',
    jsonb_build_object('branch', obligation_row.branch, 'participantRole', obligation_row.participant_role)
  );
  return to_jsonb(obligation_row);
end;
$$;

create or replace function public.complete_direct_donation_upgrade_obligation(
  p_obligation_id uuid,
  p_valid boolean,
  p_failure_code text,
  p_failure_message text,
  p_provider_charge_id_hash text,
  p_provider_payload_hash text,
  p_provider_gross_amount_cents integer,
  p_provider_net_amount_cents integer,
  p_provider_currency text,
  p_provider_nonprofit_slug text,
  p_provider_nonprofit_ein text,
  p_provider_donation_date timestamptz,
  p_provider_payment_method text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  obligation_row public.direct_donation_upgrade_obligations%rowtype;
  offer_row public.direct_donation_upgrade_offers%rowtype;
  candidate_row public.direct_donation_upgrade_candidates%rowtype;
  counterparty_id uuid;
  duplicate_obligation_id uuid;
  creator_verified boolean := false;
  matcher_verified boolean := false;
  incremental_net integer := 0;
  redirected_net integer := 0;
begin
  select * into obligation_row
  from public.direct_donation_upgrade_obligations
  where id = p_obligation_id
  for update;
  if not found then raise exception 'Direct Donation Upgrade obligation not found.'; end if;

  select * into offer_row
  from public.direct_donation_upgrade_offers
  where id = obligation_row.offer_id
  for update;

  if obligation_row.status = 'verified' then
    if obligation_row.provider_charge_id_hash = coalesce(p_provider_charge_id_hash, '')
       and obligation_row.provider_payload_hash = coalesce(p_provider_payload_hash, '') then
      return jsonb_build_object('outcome', 'already_verified', 'obligation', to_jsonb(obligation_row), 'offer', to_jsonb(offer_row));
    end if;
    update public.direct_donation_upgrade_obligations
    set status = 'needs_review', failure_code = 'altered_replay',
        failure_message = 'A non-identical webhook replay was received after verification.'
    where id = obligation_row.id;
    update public.direct_donation_upgrade_offers
    set status = 'needs_review', failure_code = 'altered_replay',
        failure_message = 'A non-identical webhook replay was received after verification.'
    where id = offer_row.id;
    return jsonb_build_object('outcome', 'needs_review', 'reason', 'altered_replay');
  end if;

  if not coalesce(p_valid, false) then
    update public.direct_donation_upgrade_obligations
    set status = 'needs_review',
        failure_code = left(coalesce(p_failure_code, 'webhook_invalid'), 120),
        failure_message = left(coalesce(p_failure_message, 'Provider webhook validation failed.'), 1000),
        provider_payload_hash = coalesce(p_provider_payload_hash, provider_payload_hash)
    where id = obligation_row.id;
    update public.direct_donation_upgrade_offers
    set status = 'needs_review',
        failure_code = left(coalesce(p_failure_code, 'webhook_invalid'), 120),
        failure_message = left(coalesce(p_failure_message, 'Provider webhook validation failed.'), 1000)
    where id = offer_row.id and status <> 'completed';
    perform public.direct_donation_upgrade_audit(
      offer_row.id, obligation_row.id, obligation_row.candidate_id, null,
      'provider_webhook_rejected',
      jsonb_build_object('failureCode', p_failure_code, 'payloadHash', p_provider_payload_hash)
    );
    return jsonb_build_object('outcome', 'needs_review', 'reason', coalesce(p_failure_code, 'webhook_invalid'));
  end if;

  if obligation_row.status not in ('pending', 'checkout_started')
     or offer_row.status not in ('matched', 'fallback_selected')
     or offer_row.selected_branch <> obligation_row.branch then
    update public.direct_donation_upgrade_obligations
    set status = 'needs_review', failure_code = 'inactive_obligation',
        failure_message = 'A verified provider donation arrived for an inactive obligation.'
    where id = obligation_row.id;
    update public.direct_donation_upgrade_offers
    set status = 'needs_review', failure_code = 'inactive_obligation',
        failure_message = 'A verified provider donation arrived for an inactive obligation.'
    where id = offer_row.id and status <> 'completed';
    return jsonb_build_object('outcome', 'needs_review', 'reason', 'inactive_obligation');
  end if;

  if lower(coalesce(p_provider_charge_id_hash, '')) !~ '^[0-9a-f]{64}$'
     or lower(coalesce(p_provider_payload_hash, '')) !~ '^[0-9a-f]{64}$' then
    raise exception 'Valid provider charge and payload hashes are required.';
  end if;

  -- Serialize all attempts to allocate the same provider charge before checking the
  -- partial unique index. This turns simultaneous webhook deliveries into either
  -- an exact idempotent replay or an explicit cross-obligation reuse review.
  perform pg_advisory_xact_lock(
    pg_catalog.hashtextextended(lower(p_provider_charge_id_hash), 0)
  );

  select id into duplicate_obligation_id
  from public.direct_donation_upgrade_obligations
  where provider_charge_id_hash = lower(p_provider_charge_id_hash)
    and id <> obligation_row.id
  limit 1;
  if duplicate_obligation_id is not null then
    update public.direct_donation_upgrade_obligations
    set status = 'needs_review', failure_code = 'provider_charge_reused',
        failure_message = 'One provider charge was presented for multiple obligations.'
    where id in (obligation_row.id, duplicate_obligation_id);
    update public.direct_donation_upgrade_offers
    set status = 'needs_review', failure_code = 'provider_charge_reused',
        failure_message = 'One provider charge was presented for multiple obligations.'
    where id in (
      offer_row.id,
      (select offer_id from public.direct_donation_upgrade_obligations where id = duplicate_obligation_id)
    ) and status <> 'completed';
    return jsonb_build_object('outcome', 'needs_review', 'reason', 'provider_charge_reused');
  end if;

  if p_provider_gross_amount_cents <> obligation_row.expected_amount_cents
     or p_provider_net_amount_cents is null
     or p_provider_net_amount_cents < 0
     or p_provider_net_amount_cents > p_provider_gross_amount_cents
     or upper(coalesce(p_provider_currency, '')) <> 'USD'
     or lower(coalesce(p_provider_nonprofit_slug, '')) <> lower(obligation_row.expected_recipient->>'primarySlug') then
    raise exception 'The verified webhook fields do not match the frozen obligation.';
  end if;

  update public.direct_donation_upgrade_obligations
  set status = 'verified',
      provider_charge_id_hash = lower(p_provider_charge_id_hash),
      provider_payload_hash = lower(p_provider_payload_hash),
      provider_gross_amount_cents = p_provider_gross_amount_cents,
      provider_net_amount_cents = p_provider_net_amount_cents,
      provider_currency = upper(p_provider_currency),
      provider_nonprofit_slug = lower(p_provider_nonprofit_slug),
      provider_nonprofit_ein = regexp_replace(coalesce(p_provider_nonprofit_ein, ''), '[^0-9]', '', 'g'),
      provider_donation_date = p_provider_donation_date,
      provider_payment_method = left(coalesce(p_provider_payment_method, ''), 120),
      failure_code = '',
      failure_message = '',
      verified_at = timezone('utc', now())
  where id = obligation_row.id
  returning * into obligation_row;

  incremental_net := case
    when obligation_row.expected_amount_cents > 0 then
      round(p_provider_net_amount_cents::numeric * obligation_row.incremental_amount_cents::numeric / obligation_row.expected_amount_cents::numeric)::integer
    else 0
  end;
  redirected_net := case
    when obligation_row.expected_amount_cents > 0 then
      round(p_provider_net_amount_cents::numeric * obligation_row.redirected_amount_cents::numeric / obligation_row.expected_amount_cents::numeric)::integer
    else 0
  end;

  insert into public.direct_donation_upgrade_impact_credits(
    offer_id,
    obligation_id,
    profile_id,
    branch,
    provider,
    recipient_hash,
    verified_gross_amount_cents,
    verified_net_amount_cents,
    incremental_gross_amount_cents,
    incremental_net_amount_cents,
    redirected_gross_amount_cents,
    redirected_net_amount_cents,
    provider_charge_id_hash,
    verified_at
  ) values (
    obligation_row.offer_id,
    obligation_row.id,
    obligation_row.participant_profile_id,
    obligation_row.branch,
    'every_org',
    obligation_row.expected_recipient_hash,
    p_provider_gross_amount_cents,
    p_provider_net_amount_cents,
    obligation_row.incremental_amount_cents,
    incremental_net,
    obligation_row.redirected_amount_cents,
    redirected_net,
    lower(p_provider_charge_id_hash),
    obligation_row.verified_at
  ) on conflict (obligation_id) do nothing;

  if obligation_row.participant_role = 'matcher' then
    update public.direct_donation_upgrade_candidates
    set status = 'fulfilled', fulfilled_at = timezone('utc', now())
    where id = obligation_row.candidate_id and status in ('primary', 'promoted', 'fulfilled')
    returning * into candidate_row;
    counterparty_id := offer_row.creator_profile_id;
  elsif obligation_row.branch = 'matched' then
    select * into candidate_row
    from public.direct_donation_upgrade_candidates
    where id = offer_row.winning_candidate_id;
    counterparty_id := candidate_row.profile_id;
  else
    counterparty_id := null;
  end if;

  perform public.direct_donation_upgrade_record_fulfilment(
    obligation_row.participant_profile_id,
    counterparty_id,
    offer_row.id,
    obligation_row.id,
    1,
    obligation_row.expected_amount_cents,
    'provider_webhook_verified'
  );

  if obligation_row.branch = 'fallback' then
    update public.direct_donation_upgrade_offers
    set status = 'completed', completed_at = timezone('utc', now()),
        failure_code = '', failure_message = ''
    where id = offer_row.id
    returning * into offer_row;
  else
    select exists (
      select 1 from public.direct_donation_upgrade_obligations
      where offer_id = offer_row.id and participant_role = 'creator' and branch = 'matched' and status = 'verified'
    ) into creator_verified;
    select exists (
      select 1 from public.direct_donation_upgrade_obligations
      where offer_id = offer_row.id and candidate_id = offer_row.winning_candidate_id and participant_role = 'matcher' and status = 'verified'
    ) into matcher_verified;

    if creator_verified and matcher_verified then
      update public.direct_donation_upgrade_offers
      set status = 'completed', completed_at = timezone('utc', now()),
          failure_code = '', failure_message = ''
      where id = offer_row.id
      returning * into offer_row;
      update public.direct_donation_upgrade_candidates
      set status = 'closed'
      where offer_id = offer_row.id and status = 'backup';
    end if;
  end if;

  perform public.direct_donation_upgrade_notify(
    obligation_row.participant_profile_id,
    'direct_donation_upgrade_donation_verified',
    'Direct donation verified',
    'Every.org confirmed the exact recipient and amount. Moral Trade recorded this obligation as fulfilled.',
    '/donation-upgrades/' || offer_row.id::text,
    'direct_donation_upgrade_verified:' || obligation_row.id::text || ':' || obligation_row.participant_profile_id::text
  );
  if offer_row.status = 'completed' then
    perform public.direct_donation_upgrade_notify(
      offer_row.creator_profile_id,
      'direct_donation_upgrade_completed',
      'Donation Upgrade completed',
      'All required direct donations for the selected branch were verified.',
      '/donation-upgrades/' || offer_row.id::text,
      'direct_donation_upgrade_completed:' || offer_row.id::text || ':' || offer_row.creator_profile_id::text
    );
    if offer_row.winning_candidate_id is not null then
      select * into candidate_row from public.direct_donation_upgrade_candidates where id = offer_row.winning_candidate_id;
      if candidate_row.profile_id is not null then
        perform public.direct_donation_upgrade_notify(
          candidate_row.profile_id,
          'direct_donation_upgrade_completed',
          'Donation Upgrade completed',
          'All required direct donations for the selected branch were verified.',
          '/donation-upgrades/' || offer_row.id::text,
          'direct_donation_upgrade_completed:' || offer_row.id::text || ':' || candidate_row.profile_id::text
        );
      end if;
    end if;
  end if;

  perform public.direct_donation_upgrade_audit(
    offer_row.id,
    obligation_row.id,
    obligation_row.candidate_id,
    null,
    'provider_webhook_verified',
    jsonb_build_object(
      'chargeIdHash', obligation_row.provider_charge_id_hash,
      'grossAmountCents', obligation_row.provider_gross_amount_cents,
      'netAmountCents', obligation_row.provider_net_amount_cents,
      'participantRole', obligation_row.participant_role,
      'offerStatus', offer_row.status
    )
  );

  return jsonb_build_object('outcome', 'verified', 'obligation', to_jsonb(obligation_row), 'offer', to_jsonb(offer_row));
end;
$$;

create or replace function public.run_direct_donation_upgrade_lifecycle(
  p_now timestamptz default timezone('utc', now())
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  offer_row public.direct_donation_upgrade_offers%rowtype;
  obligation_row public.direct_donation_upgrade_obligations%rowtype;
  creator_obligation public.direct_donation_upgrade_obligations%rowtype;
  matcher_obligation public.direct_donation_upgrade_obligations%rowtype;
  winning_candidate public.direct_donation_upgrade_candidates%rowtype;
  backup_candidate public.direct_donation_upgrade_candidates%rowtype;
  due_at_value timestamptz;
  grace_ends_value timestamptz;
  fallback_selected_count integer := 0;
  completed_count integer := 0;
  defaulted_count integer := 0;
  promoted_count integer := 0;
  reminder_count integer := 0;
begin
  for offer_row in
    select *
    from public.direct_donation_upgrade_offers
    where status = 'open' and match_deadline_at <= p_now
    order by match_deadline_at
    for update skip locked
  loop
    due_at_value := p_now + interval '7 days';
    grace_ends_value := due_at_value + interval '24 hours';
    update public.direct_donation_upgrade_offers
    set status = 'fallback_selected',
        selected_branch = 'fallback',
        fulfillment_deadline_at = due_at_value,
        webhook_grace_ends_at = grace_ends_value
    where id = offer_row.id;

    insert into public.direct_donation_upgrade_obligations(
      offer_id, candidate_id, participant_profile_id, participant_role, branch,
      environment, expected_recipient, expected_recipient_hash, expected_amount_cents,
      expected_currency, expected_frequency, terms_hash, partner_donation_id,
      status, due_at, webhook_grace_ends_at, incremental_amount_cents, redirected_amount_cents
    ) values (
      offer_row.id, null, offer_row.creator_profile_id, 'creator', 'fallback',
      offer_row.environment, offer_row.original_recipient, offer_row.original_recipient_hash,
      offer_row.creator_amount_cents, 'USD', 'ONCE', offer_row.terms_hash,
      gen_random_uuid()::text, 'pending', due_at_value, grace_ends_value, 0, 0
    ) on conflict do nothing;

    perform public.direct_donation_upgrade_notify(
      offer_row.creator_profile_id,
      'direct_donation_upgrade_no_match',
      'No matcher joined',
      'Complete your originally planned direct donation within seven days.',
      '/donation-upgrades/' || offer_row.id::text,
      'direct_donation_upgrade_fallback:' || offer_row.id::text || ':' || offer_row.creator_profile_id::text
    );
    perform public.direct_donation_upgrade_audit(
      offer_row.id, null, null, null, 'fallback_branch_selected',
      jsonb_build_object('dueAt', due_at_value, 'graceEndsAt', grace_ends_value)
    );
    fallback_selected_count := fallback_selected_count + 1;
  end loop;

  for obligation_row in
    select obligation.*
    from public.direct_donation_upgrade_obligations obligation
    join public.direct_donation_upgrade_offers offer on offer.id = obligation.offer_id
    where obligation.status in ('pending', 'checkout_started')
      and offer.status in ('matched', 'fallback_selected')
      and obligation.due_at > p_now
      and obligation.due_at <= p_now + interval '72 hours'
      and obligation.reminder_72h_sent_at is null
    order by obligation.due_at
    for update of obligation skip locked
  loop
    update public.direct_donation_upgrade_obligations
    set reminder_72h_sent_at = p_now
    where id = obligation_row.id;
    perform public.direct_donation_upgrade_notify(
      obligation_row.participant_profile_id,
      'direct_donation_upgrade_due_soon',
      'Direct donation due soon',
      'Your exact direct Donation Upgrade obligation is due within 72 hours.',
      '/donation-upgrades/' || obligation_row.offer_id::text,
      'direct_donation_upgrade_72h:' || obligation_row.id::text
    );
    reminder_count := reminder_count + 1;
  end loop;

  for obligation_row in
    select obligation.*
    from public.direct_donation_upgrade_obligations obligation
    join public.direct_donation_upgrade_offers offer on offer.id = obligation.offer_id
    where obligation.status in ('pending', 'checkout_started')
      and offer.status in ('matched', 'fallback_selected')
      and obligation.due_at > p_now
      and obligation.due_at <= p_now + interval '24 hours'
      and obligation.reminder_24h_sent_at is null
    order by obligation.due_at
    for update of obligation skip locked
  loop
    update public.direct_donation_upgrade_obligations
    set reminder_24h_sent_at = p_now
    where id = obligation_row.id;
    perform public.direct_donation_upgrade_notify(
      obligation_row.participant_profile_id,
      'direct_donation_upgrade_due_soon',
      'Direct donation due within 24 hours',
      'Complete the exact Every.org donation before the frozen deadline.',
      '/donation-upgrades/' || obligation_row.offer_id::text,
      'direct_donation_upgrade_24h:' || obligation_row.id::text
    );
    reminder_count := reminder_count + 1;
  end loop;

  for offer_row in
    select *
    from public.direct_donation_upgrade_offers
    where status in ('matched', 'fallback_selected')
      and webhook_grace_ends_at <= p_now
    order by webhook_grace_ends_at
    for update skip locked
  loop
    if offer_row.status = 'fallback_selected' then
      select * into creator_obligation
      from public.direct_donation_upgrade_obligations
      where offer_id = offer_row.id and participant_role = 'creator' and branch = 'fallback'
      for update;

      if creator_obligation.status = 'verified' then
        update public.direct_donation_upgrade_offers
        set status = 'completed', completed_at = coalesce(completed_at, p_now)
        where id = offer_row.id;
        completed_count := completed_count + 1;
      else
        update public.direct_donation_upgrade_obligations
        set status = 'defaulted', failure_code = 'creator_fallback_default',
            failure_message = 'The original direct donation was not verified before the deadline and webhook grace period.'
        where id = creator_obligation.id and status in ('pending', 'checkout_started');
        update public.direct_donation_upgrade_offers
        set status = 'defaulted', defaulted_at = p_now,
            failure_code = 'creator_fallback_default',
            failure_message = 'The creator did not complete the original direct donation.'
        where id = offer_row.id;
        perform public.direct_donation_upgrade_record_default(
          offer_row.creator_profile_id, null, offer_row.id, creator_obligation.id, creator_obligation.expected_amount_cents
        );
        perform public.direct_donation_upgrade_notify(
          offer_row.creator_profile_id,
          'direct_donation_upgrade_defaulted',
          'Donation Upgrade commitment unfulfilled',
          'The original donation was not verified before the deadline. A temporary Donation Upgrade restriction was applied.',
          '/donation-upgrades/' || offer_row.id::text,
          'direct_donation_upgrade_default:' || offer_row.id::text || ':' || offer_row.creator_profile_id::text
        );
        defaulted_count := defaulted_count + 1;
      end if;
      continue;
    end if;

    select * into winning_candidate
    from public.direct_donation_upgrade_candidates
    where id = offer_row.winning_candidate_id
      and status in ('primary', 'promoted', 'fulfilled')
    for update;
    if not found then
      update public.direct_donation_upgrade_offers
      set status = 'needs_review', failure_code = 'winning_candidate_missing',
          failure_message = 'The selected matcher record is missing or in an impossible state.'
      where id = offer_row.id;
      continue;
    end if;

    select * into creator_obligation
    from public.direct_donation_upgrade_obligations
    where offer_id = offer_row.id and participant_role = 'creator' and branch = 'matched'
    for update;
    select * into matcher_obligation
    from public.direct_donation_upgrade_obligations
    where candidate_id = winning_candidate.id and participant_role = 'matcher'
    for update;

    if creator_obligation.status = 'verified' and matcher_obligation.status = 'verified' then
      update public.direct_donation_upgrade_offers
      set status = 'completed', completed_at = coalesce(completed_at, p_now)
      where id = offer_row.id;
      update public.direct_donation_upgrade_candidates set status = 'closed'
      where offer_id = offer_row.id and status = 'backup';
      completed_count := completed_count + 1;
      continue;
    end if;

    if creator_obligation.status <> 'verified' then
      update public.direct_donation_upgrade_obligations
      set status = 'defaulted', failure_code = 'creator_matched_default',
          failure_message = 'The creator donation was not verified before the deadline and webhook grace period.'
      where id = creator_obligation.id and status in ('pending', 'checkout_started');
      if matcher_obligation.status in ('pending', 'checkout_started') then
        update public.direct_donation_upgrade_obligations
        set status = 'cancelled', failure_code = 'creator_defaulted',
            failure_message = 'The creator defaulted before this matcher donation was verified.'
        where id = matcher_obligation.id;
        update public.direct_donation_upgrade_candidates
        set status = 'closed'
        where id = winning_candidate.id and status in ('primary', 'promoted');
      end if;
      update public.direct_donation_upgrade_candidates
      set status = 'closed'
      where offer_id = offer_row.id and status = 'backup';
      update public.direct_donation_upgrade_offers
      set status = 'defaulted', defaulted_at = p_now,
          failure_code = 'creator_matched_default',
          failure_message = 'The creator did not complete the upgraded direct donation.'
      where id = offer_row.id;
      perform public.direct_donation_upgrade_record_default(
        offer_row.creator_profile_id,
        winning_candidate.profile_id,
        offer_row.id,
        creator_obligation.id,
        creator_obligation.expected_amount_cents
      );
      perform public.direct_donation_upgrade_notify(
        offer_row.creator_profile_id,
        'direct_donation_upgrade_defaulted',
        'Donation Upgrade commitment unfulfilled',
        'Your upgraded donation was not verified before the deadline. A temporary Donation Upgrade restriction was applied.',
        '/donation-upgrades/' || offer_row.id::text,
        'direct_donation_upgrade_creator_default:' || offer_row.id::text
      );
      -- A matcher who already donated remains fulfilled even though the creator defaulted.
      if matcher_obligation.status = 'verified' then
        update public.direct_donation_upgrade_candidates
        set status = 'fulfilled', fulfilled_at = coalesce(fulfilled_at, matcher_obligation.verified_at)
        where id = winning_candidate.id;
      end if;
      defaulted_count := defaulted_count + 1;
      continue;
    end if;

    if matcher_obligation.status <> 'verified' then
      update public.direct_donation_upgrade_obligations
      set status = 'defaulted', failure_code = 'matcher_default',
          failure_message = 'The selected matcher donation was not verified before the deadline and webhook grace period.'
      where id = matcher_obligation.id and status in ('pending', 'checkout_started');
      update public.direct_donation_upgrade_candidates
      set status = 'defaulted', defaulted_at = p_now
      where id = winning_candidate.id and status in ('primary', 'promoted');
      perform public.direct_donation_upgrade_record_default(
        winning_candidate.profile_id,
        offer_row.creator_profile_id,
        offer_row.id,
        matcher_obligation.id,
        matcher_obligation.expected_amount_cents
      );
      perform public.direct_donation_upgrade_notify(
        winning_candidate.profile_id,
        'direct_donation_upgrade_defaulted',
        'Donation Upgrade match unfulfilled',
        'Your matcher donation was not verified before the deadline. A temporary Donation Upgrade restriction was applied.',
        '/donation-upgrades/' || offer_row.id::text,
        'direct_donation_upgrade_matcher_default:' || offer_row.id::text || ':' || winning_candidate.profile_id::text
      );

      select * into backup_candidate
      from public.direct_donation_upgrade_candidates
      where offer_id = offer_row.id and status = 'backup'
      order by rank
      limit 1
      for update skip locked;

      if found then
        due_at_value := p_now + interval '7 days';
        grace_ends_value := due_at_value + interval '24 hours';
        update public.direct_donation_upgrade_candidates
        set status = 'promoted', promoted_at = p_now
        where id = backup_candidate.id
        returning * into backup_candidate;
        update public.direct_donation_upgrade_offers
        set winning_candidate_id = backup_candidate.id,
            fulfillment_deadline_at = due_at_value,
            webhook_grace_ends_at = grace_ends_value,
            failure_code = '',
            failure_message = ''
        where id = offer_row.id;
        insert into public.direct_donation_upgrade_obligations(
          offer_id, candidate_id, participant_profile_id, participant_role, branch,
          environment, expected_recipient, expected_recipient_hash, expected_amount_cents,
          expected_currency, expected_frequency, terms_hash, partner_donation_id,
          status, due_at, webhook_grace_ends_at, incremental_amount_cents, redirected_amount_cents
        ) values (
          offer_row.id, backup_candidate.id, backup_candidate.profile_id, 'matcher', 'matched',
          offer_row.environment, offer_row.upgraded_recipient, offer_row.upgraded_recipient_hash,
          offer_row.matcher_amount_cents, 'USD', 'ONCE', offer_row.terms_hash,
          gen_random_uuid()::text, 'pending', due_at_value, grace_ends_value,
          offer_row.matcher_amount_cents, 0
        );
        perform public.direct_donation_upgrade_notify(
          backup_candidate.profile_id,
          'direct_donation_upgrade_backup_promoted',
          'You were promoted as the matcher',
          'The earlier matcher defaulted. You now have seven days to complete the exact direct donation.',
          '/donation-upgrades/' || offer_row.id::text,
          'direct_donation_upgrade_promoted:' || offer_row.id::text || ':' || backup_candidate.profile_id::text
        );
        perform public.direct_donation_upgrade_notify(
          offer_row.creator_profile_id,
          'direct_donation_upgrade_backup_promoted',
          'A backup matcher was promoted',
          'Your verified creator donation remains recorded. The promoted matcher has seven days to fulfill the additional donation.',
          '/donation-upgrades/' || offer_row.id::text,
          'direct_donation_upgrade_promoted_creator:' || offer_row.id::text || ':' || backup_candidate.id::text
        );
        promoted_count := promoted_count + 1;
      else
        update public.direct_donation_upgrade_offers
        set status = 'defaulted', defaulted_at = p_now,
            failure_code = 'matcher_default_no_backup',
            failure_message = 'The selected matcher defaulted and no backup matcher was available.'
        where id = offer_row.id;
        defaulted_count := defaulted_count + 1;
      end if;
    end if;
  end loop;

  return jsonb_build_object(
    'fallbackSelected', fallback_selected_count,
    'completed', completed_count,
    'defaulted', defaulted_count,
    'promoted', promoted_count,
    'reminders', reminder_count,
    'processedAt', p_now
  );
end;
$$;

create or replace view public.direct_donation_upgrade_public_offers
with (security_barrier = true)
as
select
  offer.id,
  offer.environment,
  offer.status,
  offer.selected_branch,
  offer.privacy_mode,
  offer.creator_amount_cents,
  offer.matcher_amount_cents,
  offer.currency,
  offer.match_deadline_at,
  offer.fulfillment_deadline_at,
  offer.webhook_grace_ends_at,
  offer.original_recipient,
  offer.upgraded_recipient,
  offer.terms_hash,
  offer.created_at,
  offer.completed_at,
  case
    when offer.privacy_mode = 'public' or offer.status = 'completed'
      then coalesce(creator.display_name, 'Moral Trade participant')
    else null
  end as creator_display_name,
  case
    when (offer.privacy_mode = 'public' or offer.status = 'completed') and winner_profile.id is not null
      then coalesce(winner_profile.display_name, 'Moral Trade participant')
    else null
  end as matcher_display_name,
  (
    select count(*)::integer
    from public.direct_donation_upgrade_candidates candidate
    where candidate.offer_id = offer.id
      and candidate.status in ('primary', 'backup', 'promoted', 'fulfilled')
  ) as matcher_count,
  (
    select count(*)::integer
    from public.direct_donation_upgrade_obligations obligation
    where obligation.offer_id = offer.id and obligation.status = 'verified'
  ) as verified_obligation_count,
  coalesce((
    select sum(credit.verified_gross_amount_cents)::integer
    from public.direct_donation_upgrade_impact_credits credit
    where credit.offer_id = offer.id
  ), 0) as verified_gross_amount_cents,
  coalesce((
    select sum(credit.verified_net_amount_cents)::integer
    from public.direct_donation_upgrade_impact_credits credit
    where credit.offer_id = offer.id
  ), 0) as verified_net_amount_cents,
  coalesce((
    select sum(credit.incremental_net_amount_cents)::integer
    from public.direct_donation_upgrade_impact_credits credit
    where credit.offer_id = offer.id
  ), 0) as incremental_net_amount_cents,
  coalesce((
    select sum(credit.redirected_net_amount_cents)::integer
    from public.direct_donation_upgrade_impact_credits credit
    where credit.offer_id = offer.id
  ), 0) as redirected_net_amount_cents
from public.direct_donation_upgrade_offers offer
join public.profiles creator on creator.id = offer.creator_profile_id
left join public.direct_donation_upgrade_candidates winner on winner.id = offer.winning_candidate_id
left join public.profiles winner_profile on winner_profile.id = winner.profile_id
where offer.status not in ('cancelled', 'needs_review');

alter table public.direct_donation_upgrade_offers enable row level security;
alter table public.direct_donation_upgrade_candidates enable row level security;
alter table public.direct_donation_upgrade_obligations enable row level security;
alter table public.direct_donation_upgrade_impact_credits enable row level security;
alter table public.direct_donation_upgrade_audit_events enable row level security;

revoke all on public.direct_donation_upgrade_offers from anon, authenticated;
revoke all on public.direct_donation_upgrade_candidates from anon, authenticated;
revoke all on public.direct_donation_upgrade_obligations from anon, authenticated;
revoke all on public.direct_donation_upgrade_impact_credits from anon, authenticated;
revoke all on public.direct_donation_upgrade_audit_events from anon, authenticated;

grant select on public.direct_donation_upgrade_public_offers to anon, authenticated;

revoke execute on function public.direct_donation_upgrade_set_updated_at() from public, anon, authenticated;
revoke execute on function public.direct_donation_upgrade_guard_offer_terms() from public, anon, authenticated;
revoke execute on function public.direct_donation_upgrade_guard_candidate_identity() from public, anon, authenticated;
revoke execute on function public.direct_donation_upgrade_guard_obligation_terms() from public, anon, authenticated;
revoke execute on function public.direct_donation_upgrade_prevent_audit_mutation() from public, anon, authenticated;
revoke execute on function public.direct_donation_upgrade_notify(uuid, text, text, text, text, text) from public, anon, authenticated;
revoke execute on function public.direct_donation_upgrade_audit(uuid, uuid, uuid, uuid, text, jsonb) from public, anon, authenticated;
revoke execute on function public.direct_donation_upgrade_temporarily_restricted(uuid) from public, anon, authenticated;
revoke execute on function public.direct_donation_upgrade_record_fulfilment(uuid, uuid, uuid, uuid, numeric, integer, text) from public, anon, authenticated;
revoke execute on function public.direct_donation_upgrade_record_default(uuid, uuid, uuid, uuid, integer) from public, anon, authenticated;
revoke execute on function public.direct_donation_upgrade_validate_recipient(jsonb, text) from public, anon, authenticated;
revoke execute on function public.create_direct_donation_upgrade_offer(uuid, text, integer, integer, timestamptz, text, jsonb, jsonb, text, text, text) from public, anon, authenticated;
revoke execute on function public.join_direct_donation_upgrade_offer(uuid, uuid, text) from public, anon, authenticated;
revoke execute on function public.withdraw_direct_donation_upgrade_backup(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.cancel_direct_donation_upgrade_offer(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.start_direct_donation_upgrade_checkout(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.complete_direct_donation_upgrade_obligation(uuid, boolean, text, text, text, text, integer, integer, text, text, text, timestamptz, text) from public, anon, authenticated;
revoke execute on function public.run_direct_donation_upgrade_lifecycle(timestamptz) from public, anon, authenticated;

grant execute on function public.create_direct_donation_upgrade_offer(uuid, text, integer, integer, timestamptz, text, jsonb, jsonb, text, text, text) to service_role;
grant execute on function public.join_direct_donation_upgrade_offer(uuid, uuid, text) to service_role;
grant execute on function public.withdraw_direct_donation_upgrade_backup(uuid, uuid) to service_role;
grant execute on function public.cancel_direct_donation_upgrade_offer(uuid, uuid) to service_role;
grant execute on function public.start_direct_donation_upgrade_checkout(uuid, uuid) to service_role;
grant execute on function public.complete_direct_donation_upgrade_obligation(uuid, boolean, text, text, text, text, integer, integer, text, text, text, timestamptz, text) to service_role;
grant execute on function public.run_direct_donation_upgrade_lifecycle(timestamptz) to service_role;

comment on table public.direct_donation_upgrade_offers is
  'Immutable-baseline, non-custodial Donation Upgrade commitments. Every.org receives each donation directly.';
comment on table public.direct_donation_upgrade_obligations is
  'Exact branch-specific direct donation obligations; browser returns and screenshots never verify fulfillment.';
comment on table public.direct_donation_upgrade_impact_credits is
  'Webhook-verified gross, net, incremental, and redirected donation accounting.';
