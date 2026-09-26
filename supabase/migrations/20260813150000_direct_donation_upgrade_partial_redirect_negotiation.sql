-- Partial Donation Upgrade redirection and auditable counteroffers.
-- This migration is additive over 20260801050000_direct_verified_donation_upgrades.
-- The original full donation remains the no-match baseline. A matched branch may
-- retain part of that donation at the original recipient while redirecting the
-- rest and adding a separate matcher donation at the upgraded recipient.

create or replace function public.direct_donation_upgrade_redirected_amount(
  p_creator_amount_cents integer,
  p_redirect_basis_points integer
)
returns integer
language sql
immutable
strict
set search_path = pg_catalog
as $$
  select (
    (p_creator_amount_cents::bigint * p_redirect_basis_points::bigint + 5000) / 10000
  )::integer;
$$;

create or replace function public.direct_donation_upgrade_validate_split(
  p_creator_amount_cents integer,
  p_redirect_basis_points integer,
  p_redirected_amount_cents integer,
  p_retained_amount_cents integer
)
returns void
language plpgsql
immutable
set search_path = pg_catalog
as $$
declare
  expected_redirected integer;
begin
  if p_creator_amount_cents not between 100 and 5000000 then
    raise exception 'The planned donation must be between $1 and $50,000.';
  end if;
  if p_redirect_basis_points not between 1 and 10000 then
    raise exception 'The redirect percentage must be greater than 0%% and no more than 100%%.';
  end if;

  expected_redirected := public.direct_donation_upgrade_redirected_amount(
    p_creator_amount_cents,
    p_redirect_basis_points
  );
  if p_redirected_amount_cents <> expected_redirected
     or p_retained_amount_cents <> p_creator_amount_cents - expected_redirected then
    raise exception 'The proposed cent amounts do not match the redirect percentage.';
  end if;
  if p_redirected_amount_cents < 100 then
    raise exception 'The redirected donation leg must be at least $1.';
  end if;
  if p_retained_amount_cents <> 0 and p_retained_amount_cents < 100 then
    raise exception 'The retained donation leg must be either $0 or at least $1.';
  end if;
end;
$$;

create or replace function public.direct_donation_upgrade_canonical_json(
  p_value jsonb
)
returns text
language plpgsql
immutable
strict
set search_path = pg_catalog
as $$
declare
  value_type text := jsonb_typeof(p_value);
  result text;
begin
  if value_type in ('null', 'boolean', 'number', 'string') then
    return p_value::text;
  end if;

  if value_type = 'array' then
    select '[' || coalesce(
      string_agg(
        public.direct_donation_upgrade_canonical_json(element.value),
        ',' order by element.ordinality
      ),
      ''
    ) || ']'
    into result
    from jsonb_array_elements(p_value) with ordinality as element(value, ordinality);
    return result;
  end if;

  if value_type = 'object' then
    select '{' || coalesce(
      string_agg(
        to_jsonb(entry.key)::text || ':' ||
          public.direct_donation_upgrade_canonical_json(entry.value),
        ',' order by entry.key
      ),
      ''
    ) || '}'
    into result
    from jsonb_each(p_value) as entry(key, value);
    return result;
  end if;

  raise exception 'Unsupported Donation Upgrade canonical JSON value.';
end;
$$;

create or replace function public.direct_donation_upgrade_terms_hash_v2(
  p_creator_profile_id uuid,
  p_creator_amount_cents integer,
  p_redirect_basis_points integer,
  p_matcher_amount_cents integer,
  p_original_recipient_hash text,
  p_upgraded_recipient_hash text,
  p_match_deadline_at timestamptz,
  p_privacy_mode text,
  p_environment text,
  p_baseline_attestation text
)
returns text
language sql
immutable
strict
set search_path = pg_catalog
as $$
  select encode(
    extensions.digest(
      convert_to(
        public.direct_donation_upgrade_canonical_json(
          jsonb_build_object(
            'schemaVersion', 'direct-donation-upgrade-terms-v2',
            'creatorProfileId', p_creator_profile_id::text,
            'creatorAmountCents', p_creator_amount_cents,
            'redirectBasisPoints', p_redirect_basis_points,
            'redirectedAmountCents', public.direct_donation_upgrade_redirected_amount(
              p_creator_amount_cents,
              p_redirect_basis_points
            ),
            'retainedAmountCents', p_creator_amount_cents -
              public.direct_donation_upgrade_redirected_amount(
                p_creator_amount_cents,
                p_redirect_basis_points
              ),
            'matcherAmountCents', p_matcher_amount_cents,
            'currency', 'USD',
            'originalRecipientHash', lower(trim(p_original_recipient_hash)),
            'upgradedRecipientHash', lower(trim(p_upgraded_recipient_hash)),
            'matchDeadlineAt', to_char(
              p_match_deadline_at at time zone 'UTC',
              'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'
            ),
            'privacyMode', p_privacy_mode,
            'environment', p_environment,
            'baselineVersion', 'direct-donation-upgrade-baseline-v1-2026-08-01',
            'baselineAttestationHash', encode(
              extensions.digest(convert_to(trim(p_baseline_attestation), 'UTF8'), 'sha256'),
              'hex'
            ),
            'matcherCommitmentVersion', 'direct-donation-upgrade-matcher-v1-2026-08-01',
            'proposalCommitmentVersion', 'direct-donation-upgrade-proposal-v1-2026-08-12',
            'fulfillmentDays', 7,
            'webhookGraceHours', 24
          )
        ),
        'UTF8'
      ),
      'sha256'
    ),
    'hex'
  );
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
  -- Serialize the natural restriction key so simultaneous defaults for one
  -- profile cannot both pass the existence check and create duplicate windows.
  perform pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'direct_donation_upgrade_default:' || p_profile_id::text,
      0
    )
  );

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

alter table public.direct_donation_upgrade_offers
  add column if not exists redirect_basis_points integer not null default 10000;
alter table public.direct_donation_upgrade_offers
  add column if not exists redirected_amount_cents integer
  generated always as (
    public.direct_donation_upgrade_redirected_amount(
      creator_amount_cents,
      redirect_basis_points
    )
  ) stored;
alter table public.direct_donation_upgrade_offers
  add column if not exists retained_amount_cents integer
  generated always as (
    creator_amount_cents - public.direct_donation_upgrade_redirected_amount(
      creator_amount_cents,
      redirect_basis_points
    )
  ) stored;
alter table public.direct_donation_upgrade_offers
  add column if not exists supersedes_offer_id uuid;
alter table public.direct_donation_upgrade_offers
  add column if not exists superseded_by_offer_id uuid;

alter table public.direct_donation_upgrade_offers
  drop constraint if exists direct_donation_upgrade_offers_redirect_basis_points_check;
alter table public.direct_donation_upgrade_offers
  add constraint direct_donation_upgrade_offers_redirect_basis_points_check
  check (redirect_basis_points between 1 and 10000);
alter table public.direct_donation_upgrade_offers
  drop constraint if exists direct_donation_upgrade_offers_redirect_split_check;
alter table public.direct_donation_upgrade_offers
  add constraint direct_donation_upgrade_offers_redirect_split_check
  check (
    redirected_amount_cents >= 100
    and (retained_amount_cents = 0 or retained_amount_cents >= 100)
    and redirected_amount_cents + retained_amount_cents = creator_amount_cents
  );
alter table public.direct_donation_upgrade_offers
  drop constraint if exists direct_donation_upgrade_offers_supersedes_fk;
alter table public.direct_donation_upgrade_offers
  add constraint direct_donation_upgrade_offers_supersedes_fk
  foreign key (supersedes_offer_id)
  references public.direct_donation_upgrade_offers(id)
  on delete restrict;
alter table public.direct_donation_upgrade_offers
  drop constraint if exists direct_donation_upgrade_offers_superseded_by_fk;
alter table public.direct_donation_upgrade_offers
  add constraint direct_donation_upgrade_offers_superseded_by_fk
  foreign key (superseded_by_offer_id)
  references public.direct_donation_upgrade_offers(id)
  on delete restrict;
alter table public.direct_donation_upgrade_offers
  drop constraint if exists direct_donation_upgrade_offers_revision_self_check;
alter table public.direct_donation_upgrade_offers
  add constraint direct_donation_upgrade_offers_revision_self_check
  check (
    (supersedes_offer_id is null or supersedes_offer_id <> id)
    and (superseded_by_offer_id is null or superseded_by_offer_id <> id)
  );

create unique index if not exists direct_donation_upgrade_one_successor_idx
  on public.direct_donation_upgrade_offers(supersedes_offer_id)
  where supersedes_offer_id is not null;
create unique index if not exists direct_donation_upgrade_one_predecessor_idx
  on public.direct_donation_upgrade_offers(superseded_by_offer_id)
  where superseded_by_offer_id is not null;
create index if not exists direct_donation_upgrade_offers_winning_candidate_idx
  on public.direct_donation_upgrade_offers(winning_candidate_id)
  where winning_candidate_id is not null;

alter table public.direct_donation_upgrade_obligations
  add column if not exists obligation_kind text;

update public.direct_donation_upgrade_obligations
set obligation_kind = case
  when branch = 'fallback' and participant_role = 'creator' then 'creator_fallback'
  when branch = 'matched' and participant_role = 'creator' then 'creator_redirected'
  when branch = 'matched' and participant_role = 'matcher' then 'matcher_incremental'
  else obligation_kind
end
where obligation_kind is null;

alter table public.direct_donation_upgrade_obligations
  alter column obligation_kind set not null;

do $$
declare
  constraint_row record;
begin
  for constraint_row in
    select conname
    from pg_constraint
    where conrelid = 'public.direct_donation_upgrade_obligations'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) like '%branch = ''fallback''%'
      and pg_get_constraintdef(oid) like '%incremental_amount_cents%'
      and pg_get_constraintdef(oid) like '%redirected_amount_cents = expected_amount_cents%'
  loop
    execute format(
      'alter table public.direct_donation_upgrade_obligations drop constraint %I',
      constraint_row.conname
    );
  end loop;
end;
$$;

alter table public.direct_donation_upgrade_obligations
  drop constraint if exists direct_donation_upgrade_obligation_kind_check;
alter table public.direct_donation_upgrade_obligations
  add constraint direct_donation_upgrade_obligation_kind_check
  check (
    obligation_kind in (
      'creator_fallback',
      'creator_redirected',
      'creator_retained',
      'matcher_incremental'
    )
  );
alter table public.direct_donation_upgrade_obligations
  drop constraint if exists direct_donation_upgrade_obligation_credit_shape;
alter table public.direct_donation_upgrade_obligations
  add constraint direct_donation_upgrade_obligation_credit_shape
  check (
    (
      obligation_kind = 'creator_fallback'
      and participant_role = 'creator'
      and branch = 'fallback'
      and incremental_amount_cents = 0
      and redirected_amount_cents = 0
    )
    or (
      obligation_kind = 'creator_redirected'
      and participant_role = 'creator'
      and branch = 'matched'
      and incremental_amount_cents = 0
      and redirected_amount_cents = expected_amount_cents
    )
    or (
      obligation_kind = 'creator_retained'
      and participant_role = 'creator'
      and branch = 'matched'
      and incremental_amount_cents = 0
      and redirected_amount_cents = 0
    )
    or (
      obligation_kind = 'matcher_incremental'
      and participant_role = 'matcher'
      and branch = 'matched'
      and incremental_amount_cents = expected_amount_cents
      and redirected_amount_cents = 0
    )
  );

drop index if exists public.direct_donation_upgrade_creator_obligation_idx;
create unique index if not exists direct_donation_upgrade_creator_obligation_kind_idx
  on public.direct_donation_upgrade_obligations(offer_id, obligation_kind)
  where participant_role = 'creator';

create table if not exists public.direct_donation_upgrade_proposals (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null
    references public.direct_donation_upgrade_offers(id) on delete restrict,
  proposer_profile_id uuid not null
    references public.profiles(id) on delete restrict,
  status text not null default 'pending' check (
    status in ('pending', 'accepted', 'rejected', 'withdrawn', 'superseded', 'expired')
  ),
  base_terms_hash text not null check (base_terms_hash ~ '^[0-9a-f]{64}$'),
  proposed_redirect_basis_points integer not null
    check (proposed_redirect_basis_points between 1 and 10000),
  proposed_redirected_amount_cents integer not null
    check (proposed_redirected_amount_cents between 100 and 5000000),
  proposed_retained_amount_cents integer not null
    check (
      proposed_retained_amount_cents = 0
      or proposed_retained_amount_cents between 100 and 5000000
    ),
  proposed_matcher_amount_cents integer not null
    check (proposed_matcher_amount_cents between 100 and 5000000),
  currency text not null default 'USD' check (currency = 'USD'),
  message text not null default '',
  response_message text not null default '',
  commitment_version text not null,
  commitment_accepted_at timestamptz not null default timezone('utc', now()),
  responded_at timestamptz,
  accepted_offer_id uuid
    references public.direct_donation_upgrade_offers(id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (
    proposed_redirected_amount_cents + proposed_retained_amount_cents
      between 100 and 5000000
  ),
  check (
    (status = 'accepted' and accepted_offer_id is not null and responded_at is not null)
    or (status <> 'accepted' and accepted_offer_id is null)
  )
);

alter table public.direct_donation_upgrade_proposals
  drop constraint if exists direct_donation_upgrade_proposal_message_length_check;
alter table public.direct_donation_upgrade_proposals
  add constraint direct_donation_upgrade_proposal_message_length_check
  check (char_length(message) <= 600 and char_length(response_message) <= 600);
alter table public.direct_donation_upgrade_proposals
  drop constraint if exists direct_donation_upgrade_proposal_commitment_version_check;
alter table public.direct_donation_upgrade_proposals
  add constraint direct_donation_upgrade_proposal_commitment_version_check
  check (commitment_version = 'direct-donation-upgrade-proposal-v1-2026-08-12');

create unique index if not exists direct_donation_upgrade_one_pending_proposal_idx
  on public.direct_donation_upgrade_proposals(offer_id, proposer_profile_id)
  where status = 'pending';
create unique index if not exists direct_donation_upgrade_accepted_offer_idx
  on public.direct_donation_upgrade_proposals(accepted_offer_id)
  where accepted_offer_id is not null;
create index if not exists direct_donation_upgrade_proposals_offer_idx
  on public.direct_donation_upgrade_proposals(offer_id, status, created_at desc);
create index if not exists direct_donation_upgrade_proposals_proposer_idx
  on public.direct_donation_upgrade_proposals(proposer_profile_id, created_at desc);
create index if not exists direct_donation_upgrade_audit_obligation_idx
  on public.direct_donation_upgrade_audit_events(obligation_id)
  where obligation_id is not null;
create index if not exists direct_donation_upgrade_audit_candidate_idx
  on public.direct_donation_upgrade_audit_events(candidate_id)
  where candidate_id is not null;
create index if not exists direct_donation_upgrade_audit_actor_idx
  on public.direct_donation_upgrade_audit_events(actor_profile_id)
  where actor_profile_id is not null;

drop trigger if exists direct_donation_upgrade_proposals_updated_at
  on public.direct_donation_upgrade_proposals;
create trigger direct_donation_upgrade_proposals_updated_at
before update on public.direct_donation_upgrade_proposals
for each row execute function public.direct_donation_upgrade_set_updated_at();

create or replace function public.direct_donation_upgrade_guard_proposal_terms()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
declare
  offer_row public.direct_donation_upgrade_offers%rowtype;
  accepted_offer_row public.direct_donation_upgrade_offers%rowtype;
begin
  if tg_op = 'DELETE' then
    raise exception 'Donation Upgrade counteroffers are retained as audit records.';
  end if;

  if tg_op = 'INSERT' then
    select * into offer_row
    from public.direct_donation_upgrade_offers
    where id = new.offer_id;
    if not found then
      raise exception 'The counteroffer base offer does not exist.';
    end if;
    if new.status <> 'pending'
       or new.accepted_offer_id is not null
       or new.responded_at is not null
       or new.response_message <> '' then
      raise exception 'A new Donation Upgrade counteroffer must begin pending.';
    end if;
    if offer_row.status <> 'open'
       or offer_row.match_deadline_at <= timezone('utc', now()) then
      raise exception 'Only an open Donation Upgrade can receive a counteroffer.';
    end if;
    if new.proposer_profile_id = offer_row.creator_profile_id then
      raise exception 'The creator cannot counteroffer to their own Donation Upgrade.';
    end if;
    if new.base_terms_hash <> offer_row.terms_hash then
      raise exception 'The counteroffer base terms hash does not match the offer.';
    end if;
    perform public.direct_donation_upgrade_validate_split(
      offer_row.creator_amount_cents,
      new.proposed_redirect_basis_points,
      new.proposed_redirected_amount_cents,
      new.proposed_retained_amount_cents
    );
    return new;
  end if;

  if new.offer_id is distinct from old.offer_id
     or new.proposer_profile_id is distinct from old.proposer_profile_id
     or new.base_terms_hash is distinct from old.base_terms_hash
     or new.proposed_redirect_basis_points is distinct from old.proposed_redirect_basis_points
     or new.proposed_redirected_amount_cents is distinct from old.proposed_redirected_amount_cents
     or new.proposed_retained_amount_cents is distinct from old.proposed_retained_amount_cents
     or new.proposed_matcher_amount_cents is distinct from old.proposed_matcher_amount_cents
     or new.currency is distinct from old.currency
     or new.message is distinct from old.message
     or new.commitment_version is distinct from old.commitment_version
     or new.commitment_accepted_at is distinct from old.commitment_accepted_at
     or new.created_at is distinct from old.created_at then
    raise exception 'Donation Upgrade counteroffer terms are immutable.';
  end if;

  if old.status <> 'pending' then
    raise exception 'A resolved Donation Upgrade counteroffer is immutable.';
  end if;
  if new.status not in ('accepted', 'rejected', 'withdrawn', 'superseded', 'expired')
     or new.responded_at is null then
    raise exception 'A pending Donation Upgrade counteroffer may transition only once to a terminal status.';
  end if;

  if new.status = 'accepted' then
    if new.accepted_offer_id is null then
      raise exception 'An accepted counteroffer must link its matched revision.';
    end if;
    select * into accepted_offer_row
    from public.direct_donation_upgrade_offers
    where id = new.accepted_offer_id;
    select * into offer_row
    from public.direct_donation_upgrade_offers
    where id = old.offer_id;
    if not found
       or accepted_offer_row.id is null
       or offer_row.status <> 'cancelled'
       or offer_row.superseded_by_offer_id <> accepted_offer_row.id
       or accepted_offer_row.supersedes_offer_id <> offer_row.id
       or accepted_offer_row.status <> 'matched' then
      raise exception 'The accepted counteroffer revision provenance is incomplete.';
    end if;
  elsif new.accepted_offer_id is not null then
    raise exception 'Only an accepted counteroffer may link a matched revision.';
  end if;
  return new;
end;
$$;

drop trigger if exists direct_donation_upgrade_proposal_terms_immutable
  on public.direct_donation_upgrade_proposals;
create trigger direct_donation_upgrade_proposal_terms_immutable
before insert or update or delete on public.direct_donation_upgrade_proposals
for each row execute function public.direct_donation_upgrade_guard_proposal_terms();

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
  p_terms_hash text,
  p_redirect_basis_points integer
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
  redirected_amount integer;
  retained_amount integer;
  expected_terms_hash text;
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
  redirected_amount := public.direct_donation_upgrade_redirected_amount(
    p_creator_amount_cents,
    p_redirect_basis_points
  );
  retained_amount := p_creator_amount_cents - redirected_amount;
  perform public.direct_donation_upgrade_validate_split(
    p_creator_amount_cents,
    p_redirect_basis_points,
    redirected_amount,
    retained_amount
  );
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

  expected_terms_hash := public.direct_donation_upgrade_terms_hash_v2(
    p_creator_profile_id,
    p_creator_amount_cents,
    p_redirect_basis_points,
    p_matcher_amount_cents,
    original_hash,
    upgraded_hash,
    p_match_deadline_at,
    p_privacy_mode,
    p_environment,
    p_baseline_attestation
  );
  if lower(trim(p_terms_hash)) <> expected_terms_hash then
    raise exception 'The frozen terms hash does not match the exact canonical Donation Upgrade terms.';
  end if;

  insert into public.direct_donation_upgrade_offers(
    creator_profile_id,
    environment,
    status,
    selected_branch,
    privacy_mode,
    creator_amount_cents,
    redirect_basis_points,
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
    p_redirect_basis_points,
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
      'redirectBasisPoints', offer_row.redirect_basis_points,
      'redirectedAmountCents', offer_row.redirected_amount_cents,
      'retainedAmountCents', offer_row.retained_amount_cents,
      'termsHash', offer_row.terms_hash
    )
  );
  perform public.direct_donation_upgrade_notify(
    p_creator_profile_id,
    'direct_donation_upgrade_created',
    'Donation Upgrade published',
    'Your split donation commitment is open for acceptance or a counteroffer. No payment method was collected.',
    '/donation-upgrades/' || offer_row.id::text,
    'direct_donation_upgrade_created:' || offer_row.id::text || ':' || p_creator_profile_id::text
  );
  return to_jsonb(offer_row);
end;
$$;

create or replace function public.join_direct_donation_upgrade_offer(
  p_actor_profile_id uuid,
  p_offer_id uuid,
  p_commitment_version text,
  p_expected_environment text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  offer_row public.direct_donation_upgrade_offers%rowtype;
  candidate_row public.direct_donation_upgrade_candidates%rowtype;
  proposal_row public.direct_donation_upgrade_proposals%rowtype;
  candidate_rank integer;
  due_at_value timestamptz;
  grace_ends_value timestamptz;
  is_primary boolean;
begin
  if p_expected_environment not in ('staging', 'live') then
    raise exception 'Invalid expected Direct Donation Upgrade environment.';
  end if;
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
  if offer_row.environment is distinct from p_expected_environment then
    raise exception 'The Donation Upgrade belongs to a different environment.';
  end if;
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

  perform public.direct_donation_upgrade_validate_split(
    offer_row.creator_amount_cents,
    offer_row.redirect_basis_points,
    offer_row.redirected_amount_cents,
    offer_row.retained_amount_cents
  );

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

    for proposal_row in
      update public.direct_donation_upgrade_proposals
      set status = 'superseded',
          response_message = 'The creator accepted the published terms with another matcher.',
          responded_at = timezone('utc', now())
      where offer_id = offer_row.id and status = 'pending'
      returning *
    loop
      perform public.direct_donation_upgrade_notify(
        proposal_row.proposer_profile_id,
        'direct_donation_upgrade_counteroffer_superseded',
        'Donation Upgrade counteroffer superseded',
        'Another matcher accepted the published terms before your counteroffer was accepted.',
        '/donation-upgrades/' || offer_row.id::text,
        'direct_donation_upgrade_counteroffer_superseded:' || proposal_row.id::text
      );
      perform public.direct_donation_upgrade_audit(
        offer_row.id,
        null,
        null,
        proposal_row.proposer_profile_id,
        'counteroffer_superseded',
        jsonb_build_object('proposalId', proposal_row.id, 'reason', 'published_terms_accepted')
      );
    end loop;

    if offer_row.retained_amount_cents > 0 then
      insert into public.direct_donation_upgrade_obligations(
        offer_id, candidate_id, participant_profile_id, participant_role,
        obligation_kind, branch, environment, expected_recipient,
        expected_recipient_hash, expected_amount_cents, expected_currency,
        expected_frequency, terms_hash, partner_donation_id, status, due_at,
        webhook_grace_ends_at, incremental_amount_cents, redirected_amount_cents
      ) values (
        offer_row.id, null, offer_row.creator_profile_id, 'creator',
        'creator_retained', 'matched', offer_row.environment,
        offer_row.original_recipient, offer_row.original_recipient_hash,
        offer_row.retained_amount_cents, 'USD', 'ONCE', offer_row.terms_hash,
        gen_random_uuid()::text, 'pending', due_at_value, grace_ends_value, 0, 0
      );
    end if;

    insert into public.direct_donation_upgrade_obligations(
      offer_id, candidate_id, participant_profile_id, participant_role,
      obligation_kind, branch, environment, expected_recipient,
      expected_recipient_hash, expected_amount_cents, expected_currency,
      expected_frequency, terms_hash, partner_donation_id, status, due_at,
      webhook_grace_ends_at, incremental_amount_cents, redirected_amount_cents
    ) values
    (
      offer_row.id, null, offer_row.creator_profile_id, 'creator',
      'creator_redirected', 'matched', offer_row.environment,
      offer_row.upgraded_recipient, offer_row.upgraded_recipient_hash,
      offer_row.redirected_amount_cents, 'USD', 'ONCE', offer_row.terms_hash,
      gen_random_uuid()::text, 'pending', due_at_value, grace_ends_value,
      0, offer_row.redirected_amount_cents
    ),
    (
      offer_row.id, candidate_row.id, candidate_row.profile_id, 'matcher',
      'matcher_incremental', 'matched', offer_row.environment,
      offer_row.upgraded_recipient, offer_row.upgraded_recipient_hash,
      offer_row.matcher_amount_cents, 'USD', 'ONCE', offer_row.terms_hash,
      gen_random_uuid()::text, 'pending', due_at_value, grace_ends_value,
      offer_row.matcher_amount_cents, 0
    );

    perform public.direct_donation_upgrade_notify(
      offer_row.creator_profile_id,
      'direct_donation_upgrade_matched',
      'Your Donation Upgrade matched',
      'A matcher accepted the exact terms. Complete every creator donation leg within seven days.',
      '/donation-upgrades/' || offer_row.id::text,
      'direct_donation_upgrade_matched:' || offer_row.id::text || ':' || offer_row.creator_profile_id::text
    );
    perform public.direct_donation_upgrade_notify(
      candidate_row.profile_id,
      'direct_donation_upgrade_primary_matcher',
      'You matched a Donation Upgrade',
      'You and the creator have seven days to complete the frozen direct donation obligations.',
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
    jsonb_build_object(
      'rank', candidate_row.rank,
      'status', candidate_row.status,
      'redirectBasisPoints', offer_row.redirect_basis_points
    )
  );

  return to_jsonb(candidate_row);
end;
$$;

create or replace function public.propose_direct_donation_upgrade_terms(
  p_actor_profile_id uuid,
  p_offer_id uuid,
  p_proposed_redirect_basis_points integer,
  p_proposed_redirected_amount_cents integer,
  p_proposed_retained_amount_cents integer,
  p_proposed_matcher_amount_cents integer,
  p_message text,
  p_commitment_version text,
  p_expected_environment text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  offer_row public.direct_donation_upgrade_offers%rowtype;
  proposal_row public.direct_donation_upgrade_proposals%rowtype;
begin
  if p_expected_environment not in ('staging', 'live') then
    raise exception 'Invalid expected Direct Donation Upgrade environment.';
  end if;
  if not exists (select 1 from public.profiles where id = p_actor_profile_id) then
    raise exception 'Counterparty profile not found.';
  end if;
  if public.direct_donation_upgrade_temporarily_restricted(p_actor_profile_id) then
    raise exception 'This profile is temporarily restricted from proposing Donation Upgrade terms after a recent unfulfilled obligation.';
  end if;
  if trim(coalesce(p_commitment_version, '')) <> 'direct-donation-upgrade-proposal-v1-2026-08-12' then
    raise exception 'The binding counteroffer commitment must be accepted.';
  end if;
  if p_proposed_matcher_amount_cents not between 100 and 5000000 then
    raise exception 'The proposed matcher donation must be between $1 and $50,000.';
  end if;

  select * into offer_row
  from public.direct_donation_upgrade_offers
  where id = p_offer_id
  for update;
  if not found then raise exception 'Donation Upgrade not found.'; end if;
  if offer_row.environment is distinct from p_expected_environment then
    raise exception 'The Donation Upgrade belongs to a different environment.';
  end if;
  if offer_row.creator_profile_id = p_actor_profile_id then
    raise exception 'The creator cannot counteroffer to their own Donation Upgrade.';
  end if;
  if offer_row.status <> 'open' or offer_row.match_deadline_at <= timezone('utc', now()) then
    raise exception 'Only an open Donation Upgrade can receive a counteroffer.';
  end if;
  if exists (
    select 1
    from public.direct_donation_upgrade_candidates
    where offer_id = offer_row.id and profile_id = p_actor_profile_id
  ) then
    raise exception 'A matcher who already accepted the current terms cannot counteroffer.';
  end if;
  if exists (
    select 1
    from public.direct_donation_upgrade_proposals
    where offer_id = offer_row.id
      and proposer_profile_id = p_actor_profile_id
      and status = 'pending'
  ) then
    raise exception 'Withdraw your pending counteroffer before proposing revised terms.';
  end if;

  perform public.direct_donation_upgrade_validate_split(
    offer_row.creator_amount_cents,
    p_proposed_redirect_basis_points,
    p_proposed_redirected_amount_cents,
    p_proposed_retained_amount_cents
  );

  insert into public.direct_donation_upgrade_proposals(
    offer_id,
    proposer_profile_id,
    status,
    base_terms_hash,
    proposed_redirect_basis_points,
    proposed_redirected_amount_cents,
    proposed_retained_amount_cents,
    proposed_matcher_amount_cents,
    currency,
    message,
    commitment_version,
    commitment_accepted_at
  ) values (
    offer_row.id,
    p_actor_profile_id,
    'pending',
    offer_row.terms_hash,
    p_proposed_redirect_basis_points,
    p_proposed_redirected_amount_cents,
    p_proposed_retained_amount_cents,
    p_proposed_matcher_amount_cents,
    'USD',
    left(coalesce(p_message, ''), 600),
    trim(p_commitment_version),
    timezone('utc', now())
  ) returning * into proposal_row;

  perform public.direct_donation_upgrade_notify(
    offer_row.creator_profile_id,
    'direct_donation_upgrade_counteroffer_received',
    'New Donation Upgrade counteroffer',
    'A counterparty proposed a different redirect percentage and matcher amount.',
    '/donation-upgrades/' || offer_row.id::text,
    'direct_donation_upgrade_counteroffer:' || proposal_row.id::text || ':' || offer_row.creator_profile_id::text
  );
  perform public.direct_donation_upgrade_audit(
    offer_row.id,
    null,
    null,
    p_actor_profile_id,
    'counteroffer_created',
    jsonb_build_object(
      'proposalId', proposal_row.id,
      'baseTermsHash', proposal_row.base_terms_hash,
      'redirectBasisPoints', proposal_row.proposed_redirect_basis_points,
      'redirectedAmountCents', proposal_row.proposed_redirected_amount_cents,
      'retainedAmountCents', proposal_row.proposed_retained_amount_cents,
      'matcherAmountCents', proposal_row.proposed_matcher_amount_cents
    )
  );
  return to_jsonb(proposal_row);
end;
$$;

create or replace function public.withdraw_direct_donation_upgrade_proposal(
  p_actor_profile_id uuid,
  p_proposal_id uuid,
  p_expected_environment text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  proposal_offer_id uuid;
  offer_row public.direct_donation_upgrade_offers%rowtype;
  proposal_row public.direct_donation_upgrade_proposals%rowtype;
begin
  if p_expected_environment not in ('staging', 'live') then
    raise exception 'Invalid expected Direct Donation Upgrade environment.';
  end if;
  select offer_id into proposal_offer_id
  from public.direct_donation_upgrade_proposals
  where id = p_proposal_id;
  if not found then
    raise exception 'Only the proposer can withdraw a pending counteroffer.';
  end if;

  select * into offer_row
  from public.direct_donation_upgrade_offers
  where id = proposal_offer_id
  for update;
  if not found then
    raise exception 'Donation Upgrade not found.';
  end if;
  if offer_row.environment is distinct from p_expected_environment then
    raise exception 'The Donation Upgrade belongs to a different environment.';
  end if;

  update public.direct_donation_upgrade_proposals
  set status = 'withdrawn',
      response_message = 'The proposer withdrew this counteroffer.',
      responded_at = timezone('utc', now())
  where id = p_proposal_id
    and offer_id = proposal_offer_id
    and proposer_profile_id = p_actor_profile_id
    and status = 'pending'
  returning * into proposal_row;
  if not found then
    raise exception 'Only the proposer can withdraw a pending counteroffer.';
  end if;

  perform public.direct_donation_upgrade_audit(
    proposal_row.offer_id,
    null,
    null,
    p_actor_profile_id,
    'counteroffer_withdrawn',
    jsonb_build_object('proposalId', proposal_row.id)
  );
  return to_jsonb(proposal_row);
end;
$$;

create or replace function public.reject_direct_donation_upgrade_proposal(
  p_actor_profile_id uuid,
  p_proposal_id uuid,
  p_response_message text,
  p_expected_environment text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  proposal_offer_id uuid;
  proposal_row public.direct_donation_upgrade_proposals%rowtype;
  offer_row public.direct_donation_upgrade_offers%rowtype;
begin
  if p_expected_environment not in ('staging', 'live') then
    raise exception 'Invalid expected Direct Donation Upgrade environment.';
  end if;
  select offer_id into proposal_offer_id
  from public.direct_donation_upgrade_proposals
  where id = p_proposal_id;
  if not found then
    raise exception 'Pending counteroffer not found.';
  end if;

  select * into offer_row
  from public.direct_donation_upgrade_offers
  where id = proposal_offer_id
  for update;
  if not found or offer_row.creator_profile_id <> p_actor_profile_id then
    raise exception 'Only the creator can reject this counteroffer.';
  end if;
  if offer_row.environment is distinct from p_expected_environment then
    raise exception 'The Donation Upgrade belongs to a different environment.';
  end if;
  if offer_row.status <> 'open' then
    raise exception 'This Donation Upgrade is no longer open.';
  end if;

  select * into proposal_row
  from public.direct_donation_upgrade_proposals
  where id = p_proposal_id
    and offer_id = proposal_offer_id
  for update;
  if not found or proposal_row.status <> 'pending' then
    raise exception 'Pending counteroffer not found.';
  end if;

  update public.direct_donation_upgrade_proposals
  set status = 'rejected',
      response_message = left(coalesce(p_response_message, ''), 600),
      responded_at = timezone('utc', now())
  where id = proposal_row.id
  returning * into proposal_row;

  perform public.direct_donation_upgrade_notify(
    proposal_row.proposer_profile_id,
    'direct_donation_upgrade_counteroffer_rejected',
    'Donation Upgrade counteroffer rejected',
    'The creator declined your proposed terms. You may submit a revised counteroffer while the offer remains open.',
    '/donation-upgrades/' || offer_row.id::text,
    'direct_donation_upgrade_counteroffer_rejected:' || proposal_row.id::text
  );
  perform public.direct_donation_upgrade_audit(
    offer_row.id,
    null,
    null,
    p_actor_profile_id,
    'counteroffer_rejected',
    jsonb_build_object('proposalId', proposal_row.id)
  );
  return to_jsonb(proposal_row);
end;
$$;

create or replace function public.accept_direct_donation_upgrade_proposal(
  p_actor_profile_id uuid,
  p_proposal_id uuid,
  p_new_terms_hash text,
  p_expected_environment text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  proposal_offer_id uuid;
  proposal_row public.direct_donation_upgrade_proposals%rowtype;
  superseded_proposal public.direct_donation_upgrade_proposals%rowtype;
  offer_row public.direct_donation_upgrade_offers%rowtype;
  accepted_offer public.direct_donation_upgrade_offers%rowtype;
  candidate_row public.direct_donation_upgrade_candidates%rowtype;
  due_at_value timestamptz;
  grace_ends_value timestamptz;
  expected_terms_hash text;
begin
  if p_expected_environment not in ('staging', 'live') then
    raise exception 'Invalid expected Direct Donation Upgrade environment.';
  end if;
  select offer_id into proposal_offer_id
  from public.direct_donation_upgrade_proposals
  where id = p_proposal_id;
  if not found then
    raise exception 'Pending counteroffer not found.';
  end if;

  select * into offer_row
  from public.direct_donation_upgrade_offers
  where id = proposal_offer_id
  for update;
  if not found or offer_row.creator_profile_id <> p_actor_profile_id then
    raise exception 'Only the creator can accept this counteroffer.';
  end if;
  if offer_row.environment is distinct from p_expected_environment then
    raise exception 'The Donation Upgrade belongs to a different environment.';
  end if;
  if offer_row.status <> 'open' or offer_row.match_deadline_at <= timezone('utc', now()) then
    raise exception 'The original Donation Upgrade is no longer open.';
  end if;

  select * into proposal_row
  from public.direct_donation_upgrade_proposals
  where id = p_proposal_id
    and offer_id = proposal_offer_id
  for update;
  if not found or proposal_row.status <> 'pending' then
    raise exception 'Pending counteroffer not found.';
  end if;
  if proposal_row.base_terms_hash <> offer_row.terms_hash then
    raise exception 'The counteroffer was based on different terms.';
  end if;
  if public.direct_donation_upgrade_temporarily_restricted(proposal_row.proposer_profile_id) then
    raise exception 'The proposer is temporarily restricted from matcher commitments.';
  end if;
  if lower(trim(coalesce(p_new_terms_hash, ''))) !~ '^[0-9a-f]{64}$' then
    raise exception 'The accepted revision terms hash is invalid.';
  end if;

  perform public.direct_donation_upgrade_validate_split(
    offer_row.creator_amount_cents,
    proposal_row.proposed_redirect_basis_points,
    proposal_row.proposed_redirected_amount_cents,
    proposal_row.proposed_retained_amount_cents
  );

  expected_terms_hash := public.direct_donation_upgrade_terms_hash_v2(
    offer_row.creator_profile_id,
    offer_row.creator_amount_cents,
    proposal_row.proposed_redirect_basis_points,
    proposal_row.proposed_matcher_amount_cents,
    offer_row.original_recipient_hash,
    offer_row.upgraded_recipient_hash,
    offer_row.match_deadline_at,
    offer_row.privacy_mode,
    offer_row.environment,
    offer_row.baseline_attestation
  );
  if lower(trim(p_new_terms_hash)) <> expected_terms_hash then
    raise exception 'The accepted revision hash does not match the exact proposed terms.';
  end if;

  due_at_value := timezone('utc', now()) + interval '7 days';
  grace_ends_value := due_at_value + interval '24 hours';

  insert into public.direct_donation_upgrade_offers(
    creator_profile_id,
    environment,
    status,
    selected_branch,
    privacy_mode,
    creator_amount_cents,
    redirect_basis_points,
    matcher_amount_cents,
    currency,
    match_deadline_at,
    fulfillment_deadline_at,
    webhook_grace_ends_at,
    original_recipient,
    upgraded_recipient,
    original_recipient_hash,
    upgraded_recipient_hash,
    baseline_version,
    baseline_attestation,
    baseline_attested_at,
    terms_hash,
    match_locked_at,
    supersedes_offer_id
  ) values (
    offer_row.creator_profile_id,
    offer_row.environment,
    'matched',
    'matched',
    offer_row.privacy_mode,
    offer_row.creator_amount_cents,
    proposal_row.proposed_redirect_basis_points,
    proposal_row.proposed_matcher_amount_cents,
    'USD',
    offer_row.match_deadline_at,
    due_at_value,
    grace_ends_value,
    offer_row.original_recipient,
    offer_row.upgraded_recipient,
    offer_row.original_recipient_hash,
    offer_row.upgraded_recipient_hash,
    offer_row.baseline_version,
    offer_row.baseline_attestation,
    offer_row.baseline_attested_at,
    lower(trim(p_new_terms_hash)),
    timezone('utc', now()),
    offer_row.id
  ) returning * into accepted_offer;

  insert into public.direct_donation_upgrade_candidates(
    offer_id,
    profile_id,
    rank,
    status,
    commitment_version,
    commitment_accepted_at
  ) values (
    accepted_offer.id,
    proposal_row.proposer_profile_id,
    1,
    'primary',
    proposal_row.commitment_version,
    proposal_row.commitment_accepted_at
  ) returning * into candidate_row;

  update public.direct_donation_upgrade_offers
  set winning_candidate_id = candidate_row.id
  where id = accepted_offer.id
  returning * into accepted_offer;

  if accepted_offer.retained_amount_cents > 0 then
    insert into public.direct_donation_upgrade_obligations(
      offer_id, candidate_id, participant_profile_id, participant_role,
      obligation_kind, branch, environment, expected_recipient,
      expected_recipient_hash, expected_amount_cents, expected_currency,
      expected_frequency, terms_hash, partner_donation_id, status, due_at,
      webhook_grace_ends_at, incremental_amount_cents, redirected_amount_cents
    ) values (
      accepted_offer.id, null, accepted_offer.creator_profile_id, 'creator',
      'creator_retained', 'matched', accepted_offer.environment,
      accepted_offer.original_recipient, accepted_offer.original_recipient_hash,
      accepted_offer.retained_amount_cents, 'USD', 'ONCE', accepted_offer.terms_hash,
      gen_random_uuid()::text, 'pending', due_at_value, grace_ends_value, 0, 0
    );
  end if;

  insert into public.direct_donation_upgrade_obligations(
    offer_id, candidate_id, participant_profile_id, participant_role,
    obligation_kind, branch, environment, expected_recipient,
    expected_recipient_hash, expected_amount_cents, expected_currency,
    expected_frequency, terms_hash, partner_donation_id, status, due_at,
    webhook_grace_ends_at, incremental_amount_cents, redirected_amount_cents
  ) values
  (
    accepted_offer.id, null, accepted_offer.creator_profile_id, 'creator',
    'creator_redirected', 'matched', accepted_offer.environment,
    accepted_offer.upgraded_recipient, accepted_offer.upgraded_recipient_hash,
    accepted_offer.redirected_amount_cents, 'USD', 'ONCE', accepted_offer.terms_hash,
    gen_random_uuid()::text, 'pending', due_at_value, grace_ends_value,
    0, accepted_offer.redirected_amount_cents
  ),
  (
    accepted_offer.id, candidate_row.id, candidate_row.profile_id, 'matcher',
    'matcher_incremental', 'matched', accepted_offer.environment,
    accepted_offer.upgraded_recipient, accepted_offer.upgraded_recipient_hash,
    accepted_offer.matcher_amount_cents, 'USD', 'ONCE', accepted_offer.terms_hash,
    gen_random_uuid()::text, 'pending', due_at_value, grace_ends_value,
    accepted_offer.matcher_amount_cents, 0
  );

  update public.direct_donation_upgrade_offers
  set status = 'cancelled',
      cancellation_reason = 'Superseded by an accepted counteroffer.',
      completed_at = timezone('utc', now()),
      superseded_by_offer_id = accepted_offer.id
  where id = offer_row.id and status = 'open';
  if not found then
    raise exception 'The original Donation Upgrade changed during acceptance.';
  end if;

  update public.direct_donation_upgrade_proposals
  set status = 'accepted',
      response_message = 'The creator accepted these exact terms.',
      responded_at = timezone('utc', now()),
      accepted_offer_id = accepted_offer.id
  where id = proposal_row.id
  returning * into proposal_row;

  for superseded_proposal in
    update public.direct_donation_upgrade_proposals
    set status = 'superseded',
        response_message = 'Another counteroffer was accepted.',
        responded_at = timezone('utc', now())
    where offer_id = offer_row.id
      and id <> proposal_row.id
      and status = 'pending'
    returning *
  loop
    perform public.direct_donation_upgrade_notify(
      superseded_proposal.proposer_profile_id,
      'direct_donation_upgrade_counteroffer_superseded',
      'Donation Upgrade counteroffer superseded',
      'The creator accepted another counteroffer.',
      '/donation-upgrades/' || offer_row.id::text,
      'direct_donation_upgrade_counteroffer_superseded:' || superseded_proposal.id::text
    );
    perform public.direct_donation_upgrade_audit(
      offer_row.id,
      null,
      null,
      superseded_proposal.proposer_profile_id,
      'counteroffer_superseded',
      jsonb_build_object(
        'proposalId', superseded_proposal.id,
        'acceptedProposalId', proposal_row.id
      )
    );
  end loop;

  perform public.direct_donation_upgrade_notify(
    accepted_offer.creator_profile_id,
    'direct_donation_upgrade_counteroffer_accepted',
    'Donation Upgrade counteroffer accepted',
    'A new immutable matched revision was created. Complete every creator donation leg within seven days.',
    '/donation-upgrades/' || accepted_offer.id::text,
    'direct_donation_upgrade_counteroffer_accepted_creator:' || proposal_row.id::text
  );
  perform public.direct_donation_upgrade_notify(
    proposal_row.proposer_profile_id,
    'direct_donation_upgrade_counteroffer_accepted',
    'Your Donation Upgrade counteroffer was accepted',
    'Your proposed matcher donation is now binding and due within seven days.',
    '/donation-upgrades/' || accepted_offer.id::text,
    'direct_donation_upgrade_counteroffer_accepted_matcher:' || proposal_row.id::text
  );

  perform public.direct_donation_upgrade_audit(
    offer_row.id,
    null,
    null,
    p_actor_profile_id,
    'offer_superseded_by_counteroffer',
    jsonb_build_object(
      'proposalId', proposal_row.id,
      'acceptedOfferId', accepted_offer.id,
      'acceptedTermsHash', accepted_offer.terms_hash
    )
  );
  perform public.direct_donation_upgrade_audit(
    accepted_offer.id,
    null,
    candidate_row.id,
    p_actor_profile_id,
    'offer_created_from_counteroffer',
    jsonb_build_object(
      'proposalId', proposal_row.id,
      'supersedesOfferId', offer_row.id,
      'redirectBasisPoints', accepted_offer.redirect_basis_points,
      'redirectedAmountCents', accepted_offer.redirected_amount_cents,
      'retainedAmountCents', accepted_offer.retained_amount_cents,
      'matcherAmountCents', accepted_offer.matcher_amount_cents
    )
  );

  return jsonb_build_object(
    'offer', to_jsonb(accepted_offer),
    'proposal', to_jsonb(proposal_row),
    'candidate', to_jsonb(candidate_row)
  );
end;
$$;

create or replace function public.cancel_direct_donation_upgrade_offer(
  p_actor_profile_id uuid,
  p_offer_id uuid,
  p_expected_environment text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  offer_row public.direct_donation_upgrade_offers%rowtype;
  proposal_row public.direct_donation_upgrade_proposals%rowtype;
begin
  if p_expected_environment not in ('staging', 'live') then
    raise exception 'Invalid expected Direct Donation Upgrade environment.';
  end if;

  select * into offer_row
  from public.direct_donation_upgrade_offers
  where id = p_offer_id
  for update;
  if not found
     or offer_row.creator_profile_id <> p_actor_profile_id
     or offer_row.status <> 'open' then
    raise exception 'Only an open, unmatched Donation Upgrade can be cancelled by its creator.';
  end if;
  if offer_row.environment is distinct from p_expected_environment then
    raise exception 'The Donation Upgrade belongs to a different environment.';
  end if;

  update public.direct_donation_upgrade_offers
  set status = 'cancelled',
      cancellation_reason = 'Creator cancelled before a matcher committed.',
      completed_at = timezone('utc', now())
  where id = p_offer_id
    and creator_profile_id = p_actor_profile_id
    and status = 'open'
  returning * into offer_row;
  if not found then
    raise exception 'The Donation Upgrade changed while it was being cancelled.';
  end if;

  for proposal_row in
    update public.direct_donation_upgrade_proposals
    set status = 'expired',
        response_message = 'The creator cancelled the original offer.',
        responded_at = timezone('utc', now())
    where offer_id = offer_row.id and status = 'pending'
    returning *
  loop
    perform public.direct_donation_upgrade_notify(
      proposal_row.proposer_profile_id,
      'direct_donation_upgrade_counteroffer_expired',
      'Donation Upgrade counteroffer closed',
      'The creator cancelled the original offer before accepting a counteroffer.',
      '/donation-upgrades/' || offer_row.id::text,
      'direct_donation_upgrade_counteroffer_expired:' || proposal_row.id::text
    );
  end loop;

  perform public.direct_donation_upgrade_audit(
    p_offer_id,
    null,
    null,
    p_actor_profile_id,
    'offer_cancelled',
    jsonb_build_object('reason', offer_row.cancellation_reason)
  );
  return to_jsonb(offer_row);
end;
$$;

create or replace view public.direct_donation_upgrade_public_offers
with (security_barrier = true, security_invoker = true)
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
  ), 0) as redirected_net_amount_cents,
  offer.redirect_basis_points,
  offer.redirected_amount_cents,
  offer.retained_amount_cents,
  offer.supersedes_offer_id,
  offer.superseded_by_offer_id,
  0::integer as proposal_count
from public.direct_donation_upgrade_offers offer
join public.profiles creator on creator.id = offer.creator_profile_id
left join public.direct_donation_upgrade_candidates winner on winner.id = offer.winning_candidate_id
left join public.profiles winner_profile on winner_profile.id = winner.profile_id
where offer.status not in ('cancelled', 'needs_review');

alter table public.direct_donation_upgrade_proposals enable row level security;
revoke all on public.direct_donation_upgrade_offers
  from public, anon, authenticated, service_role;
revoke all on public.direct_donation_upgrade_candidates
  from public, anon, authenticated, service_role;
revoke all on public.direct_donation_upgrade_obligations
  from public, anon, authenticated, service_role;
revoke all on public.direct_donation_upgrade_impact_credits
  from public, anon, authenticated, service_role;
revoke all on public.direct_donation_upgrade_audit_events
  from public, anon, authenticated, service_role;
revoke all on public.direct_donation_upgrade_proposals
  from public, anon, authenticated, service_role;
grant select on public.direct_donation_upgrade_offers,
  public.direct_donation_upgrade_candidates,
  public.direct_donation_upgrade_obligations,
  public.direct_donation_upgrade_impact_credits,
  public.direct_donation_upgrade_audit_events,
  public.direct_donation_upgrade_proposals
  to service_role;
revoke all on public.direct_donation_upgrade_public_offers from public, anon, authenticated;
grant select on public.direct_donation_upgrade_public_offers to service_role;

revoke execute on function public.direct_donation_upgrade_redirected_amount(integer, integer)
  from public, anon, authenticated;
revoke execute on function public.direct_donation_upgrade_validate_split(integer, integer, integer, integer)
  from public, anon, authenticated;
revoke execute on function public.direct_donation_upgrade_canonical_json(jsonb)
  from public, anon, authenticated;
revoke execute on function public.direct_donation_upgrade_terms_hash_v2(uuid, integer, integer, integer, text, text, timestamptz, text, text, text)
  from public, anon, authenticated;
revoke execute on function public.direct_donation_upgrade_guard_proposal_terms()
  from public, anon, authenticated;
revoke execute on function public.create_direct_donation_upgrade_offer(uuid, text, integer, integer, timestamptz, text, jsonb, jsonb, text, text, text, integer)
  from public, anon, authenticated, service_role;
revoke execute on function public.create_direct_donation_upgrade_offer(uuid, text, integer, integer, timestamptz, text, jsonb, jsonb, text, text, text)
  from public, anon, authenticated, service_role;
revoke execute on function public.propose_direct_donation_upgrade_terms(uuid, uuid, integer, integer, integer, integer, text, text, text)
  from public, anon, authenticated, service_role;
revoke execute on function public.withdraw_direct_donation_upgrade_proposal(uuid, uuid, text)
  from public, anon, authenticated, service_role;
revoke execute on function public.reject_direct_donation_upgrade_proposal(uuid, uuid, text, text)
  from public, anon, authenticated, service_role;
revoke execute on function public.accept_direct_donation_upgrade_proposal(uuid, uuid, text, text)
  from public, anon, authenticated, service_role;

revoke execute on function public.join_direct_donation_upgrade_offer(uuid, uuid, text)
  from public, anon, authenticated, service_role;
revoke execute on function public.join_direct_donation_upgrade_offer(uuid, uuid, text, text)
  from public, anon, authenticated, service_role;
revoke execute on function public.cancel_direct_donation_upgrade_offer(uuid, uuid)
  from public, anon, authenticated, service_role;
revoke execute on function public.cancel_direct_donation_upgrade_offer(uuid, uuid, text)
  from public, anon, authenticated, service_role;
revoke execute on function public.withdraw_direct_donation_upgrade_backup(uuid, uuid)
  from public, anon, authenticated, service_role;
revoke execute on function public.start_direct_donation_upgrade_checkout(uuid, uuid)
  from public, anon, authenticated, service_role;
revoke execute on function public.complete_direct_donation_upgrade_obligation(uuid, boolean, text, text, text, text, integer, integer, text, text, text, timestamptz, text)
  from public, anon, authenticated, service_role;
revoke execute on function public.run_direct_donation_upgrade_lifecycle(timestamptz)
  from public, anon, authenticated, service_role;

do $privileges$
begin
  if to_regprocedure(
    'public.propose_direct_donation_upgrade_terms(uuid,uuid,integer,integer,integer,integer,text,text)'
  ) is not null then
    execute 'revoke execute on function public.propose_direct_donation_upgrade_terms(uuid, uuid, integer, integer, integer, integer, text, text) from public, anon, authenticated, service_role';
  end if;
  if to_regprocedure('public.withdraw_direct_donation_upgrade_proposal(uuid,uuid)') is not null then
    execute 'revoke execute on function public.withdraw_direct_donation_upgrade_proposal(uuid, uuid) from public, anon, authenticated, service_role';
  end if;
  if to_regprocedure('public.reject_direct_donation_upgrade_proposal(uuid,uuid,text)') is not null then
    execute 'revoke execute on function public.reject_direct_donation_upgrade_proposal(uuid, uuid, text) from public, anon, authenticated, service_role';
  end if;
  if to_regprocedure('public.accept_direct_donation_upgrade_proposal(uuid,uuid,text)') is not null then
    execute 'revoke execute on function public.accept_direct_donation_upgrade_proposal(uuid, uuid, text) from public, anon, authenticated, service_role';
  end if;
end;
$privileges$;

comment on table public.direct_donation_upgrade_proposals is
  'Immutable, binding counteroffers for a different redirect percentage and matcher amount. Acceptance creates a new matched offer revision.';
comment on column public.direct_donation_upgrade_offers.redirect_basis_points is
  'Frozen share of the creator baseline that moves to the upgraded recipient, in basis points.';
comment on column public.direct_donation_upgrade_obligations.obligation_kind is
  'Exact fallback, retained, redirected, or matcher donation leg represented by this obligation.';
