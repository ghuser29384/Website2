-- Refund-safe, append-only provider-reversal accounting for direct Donation Upgrades.
--
-- Every.org currently has no automated refund webhook. Until one exists, a
-- service-role-only operator action may record a full provider refund using
-- authoritative Every.org dashboard or support evidence. The original
-- authenticated confirmation, its provider hashes, and its impact-credit row
-- remain immutable. A separate append-only reversal row supplies current
-- unreversed accounting.

alter table public.direct_donation_upgrade_obligations
  add column if not exists provider_reversed_at timestamptz;

-- Replace the two offer status-related checks with explicit, durable names.
do $offer_checks$
declare
  constraint_row record;
begin
  for constraint_row in
    select conname
    from pg_catalog.pg_constraint
    where conrelid = 'public.direct_donation_upgrade_offers'::regclass
      and contype = 'c'
      and pg_catalog.pg_get_constraintdef(oid) like '%status%'
      and pg_catalog.pg_get_constraintdef(oid) like '%fallback_selected%'
      and pg_catalog.pg_get_constraintdef(oid) like '%completed%'
      and pg_catalog.pg_get_constraintdef(oid) like '%cancelled%'
  loop
    execute format(
      'alter table public.direct_donation_upgrade_offers drop constraint %I',
      constraint_row.conname
    );
  end loop;
end;
$offer_checks$;

alter table public.direct_donation_upgrade_offers
  drop constraint if exists direct_donation_upgrade_offers_status_check;
alter table public.direct_donation_upgrade_offers
  add constraint direct_donation_upgrade_offers_status_check
  check (
    status in (
      'open',
      'matched',
      'fallback_selected',
      'completed',
      'post_completion_exception',
      'defaulted',
      'expired',
      'cancelled',
      'needs_review'
    )
  );

alter table public.direct_donation_upgrade_offers
  drop constraint if exists direct_donation_upgrade_offer_state_shape_check;
alter table public.direct_donation_upgrade_offers
  add constraint direct_donation_upgrade_offer_state_shape_check
  check (
    (
      status = 'open'
      and selected_branch is null
      and fulfillment_deadline_at is null
      and webhook_grace_ends_at is null
    )
    or (
      status in (
        'matched',
        'fallback_selected',
        'completed',
        'post_completion_exception',
        'defaulted',
        'needs_review'
      )
      and selected_branch is not null
    )
    or status in ('expired', 'cancelled')
  );

-- Replace only the single-column obligation status membership check. Keep the
-- separate provider-evidence shape checks intact.
do $obligation_status_check$
declare
  constraint_row record;
begin
  for constraint_row in
    select conname
    from pg_catalog.pg_constraint
    where conrelid = 'public.direct_donation_upgrade_obligations'::regclass
      and contype = 'c'
      and pg_catalog.pg_get_constraintdef(oid) like '%ANY (ARRAY%'
      and pg_catalog.pg_get_constraintdef(oid) like '%checkout_started%'
      and pg_catalog.pg_get_constraintdef(oid) like '%verified%'
      and pg_catalog.pg_get_constraintdef(oid) like '%defaulted%'
      and pg_catalog.pg_get_constraintdef(oid) like '%needs_review%'
  loop
    execute format(
      'alter table public.direct_donation_upgrade_obligations drop constraint %I',
      constraint_row.conname
    );
  end loop;
end;
$obligation_status_check$;

alter table public.direct_donation_upgrade_obligations
  drop constraint if exists direct_donation_upgrade_obligations_status_check;
alter table public.direct_donation_upgrade_obligations
  add constraint direct_donation_upgrade_obligations_status_check
  check (
    status in (
      'pending',
      'checkout_started',
      'verified',
      'provider_reversed',
      'defaulted',
      'cancelled',
      'needs_review'
    )
  );

alter table public.direct_donation_upgrade_obligations
  drop constraint if exists direct_donation_upgrade_provider_reversed_at_check;
alter table public.direct_donation_upgrade_obligations
  add constraint direct_donation_upgrade_provider_reversed_at_check
  check (
    (status = 'provider_reversed' and provider_reversed_at is not null)
    or status = 'needs_review'
    or (
      status not in ('provider_reversed', 'needs_review')
      and provider_reversed_at is null
    )
  );

create table if not exists public.direct_donation_upgrade_provider_reversals (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null
    references public.direct_donation_upgrade_offers(id) on delete restrict,
  obligation_id uuid not null unique
    references public.direct_donation_upgrade_obligations(id) on delete restrict,
  impact_credit_id uuid not null unique
    references public.direct_donation_upgrade_impact_credits(id) on delete restrict,
  recorded_by_profile_id uuid not null
    references public.profiles(id) on delete restrict,
  environment text not null check (environment in ('staging', 'live')),
  provider text not null default 'every_org' check (provider = 'every_org'),
  provider_charge_id_hash text not null
    check (provider_charge_id_hash ~ '^[0-9a-f]{64}$'),
  partner_donation_id text not null
    check (char_length(partner_donation_id) between 1 and 200),
  recipient_hash text not null check (recipient_hash ~ '^[0-9a-f]{64}$'),
  amount_cents integer not null check (amount_cents between 100 and 5000000),
  currency text not null default 'USD' check (currency = 'USD'),
  provider_refunded_at timestamptz not null,
  evidence_source text not null
    check (evidence_source in ('every_org_dashboard', 'every_org_support')),
  evidence_reference_hash text not null
    check (evidence_reference_hash ~ '^[0-9a-f]{64}$'),
  report_fingerprint_hash text not null unique
    check (report_fingerprint_hash ~ '^[0-9a-f]{64}$'),
  reason_code text not null default 'provider_refund'
    check (reason_code = 'provider_refund'),
  reversed_verified_gross_amount_cents integer not null
    check (reversed_verified_gross_amount_cents >= 0),
  reversed_verified_net_amount_cents integer not null
    check (reversed_verified_net_amount_cents >= 0),
  reversed_incremental_gross_amount_cents integer not null
    check (reversed_incremental_gross_amount_cents >= 0),
  reversed_incremental_net_amount_cents integer not null
    check (reversed_incremental_net_amount_cents >= 0),
  reversed_redirected_gross_amount_cents integer not null
    check (reversed_redirected_gross_amount_cents >= 0),
  reversed_redirected_net_amount_cents integer not null
    check (reversed_redirected_net_amount_cents >= 0),
  recorded_at timestamptz not null default timezone('utc', now()),
  check (
    reversed_verified_net_amount_cents <=
      reversed_verified_gross_amount_cents
  ),
  check (
    reversed_incremental_gross_amount_cents +
      reversed_redirected_gross_amount_cents <=
      reversed_verified_gross_amount_cents
  ),
  check (
    reversed_incremental_net_amount_cents +
      reversed_redirected_net_amount_cents <=
      reversed_verified_net_amount_cents
  )
);

create index if not exists direct_donation_upgrade_reversals_offer_idx
  on public.direct_donation_upgrade_provider_reversals(offer_id, recorded_at);
create index if not exists direct_donation_upgrade_reversals_charge_idx
  on public.direct_donation_upgrade_provider_reversals(
    environment,
    provider_charge_id_hash
  );

alter table public.direct_donation_upgrade_provider_reversals
  enable row level security;
revoke all on public.direct_donation_upgrade_provider_reversals
  from public, anon, authenticated, service_role;
grant select on public.direct_donation_upgrade_provider_reversals
  to service_role;

drop trigger if exists direct_donation_upgrade_reversal_immutable
  on public.direct_donation_upgrade_provider_reversals;
create trigger direct_donation_upgrade_reversal_immutable
before update or delete on public.direct_donation_upgrade_provider_reversals
for each row execute function public.direct_donation_upgrade_prevent_audit_mutation();

create or replace function public.direct_donation_upgrade_guard_offer_terms()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
declare
  replacement_candidate public.direct_donation_upgrade_candidates%rowtype;
  prior_candidate_status text;
begin
  if tg_op = 'DELETE' then
    raise exception 'Donation Upgrade offers are retained as audit records.';
  end if;
  if new.creator_profile_id is distinct from old.creator_profile_id
     or new.environment is distinct from old.environment
     or new.privacy_mode is distinct from old.privacy_mode
     or new.creator_amount_cents is distinct from old.creator_amount_cents
     or new.redirect_basis_points is distinct from old.redirect_basis_points
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
     or new.supersedes_offer_id is distinct from old.supersedes_offer_id
     or new.created_at is distinct from old.created_at then
    raise exception 'Published Donation Upgrade terms and baseline are immutable.';
  end if;

  if new.superseded_by_offer_id is distinct from old.superseded_by_offer_id then
    if old.superseded_by_offer_id is not null
       or new.superseded_by_offer_id is null
       or new.status <> 'cancelled' then
      raise exception 'Donation Upgrade revision provenance cannot be rewritten.';
    end if;
  end if;

  if new.status is distinct from old.status
     and not (
       (
         old.status = 'open'
         and new.status in (
           'matched',
           'fallback_selected',
           'expired',
           'cancelled',
           'needs_review'
         )
       )
       or (
         old.status in ('matched', 'fallback_selected')
         and new.status in ('completed', 'defaulted', 'needs_review')
       )
       or (
         old.status = 'completed'
         and new.status in ('post_completion_exception', 'needs_review')
       )
       or (
         old.status = 'post_completion_exception'
         and new.status = 'needs_review'
       )
       or (
         old.status in ('defaulted', 'expired', 'cancelled')
         and new.status = 'needs_review'
       )
     ) then
    raise exception 'Invalid Donation Upgrade offer status transition from % to %.',
      old.status, new.status;
  end if;

  if new.selected_branch is distinct from old.selected_branch then
    if old.selected_branch is not null
       or old.status <> 'open'
       or not (
         (new.status = 'matched' and new.selected_branch = 'matched')
         or (
           new.status = 'fallback_selected'
           and new.selected_branch = 'fallback'
         )
       ) then
      raise exception 'The selected Donation Upgrade branch may be frozen only once.';
    end if;
  end if;

  if new.winning_candidate_id is distinct from old.winning_candidate_id then
    if new.winning_candidate_id is null then
      raise exception 'A selected Donation Upgrade matcher cannot be cleared.';
    end if;

    select * into replacement_candidate
    from public.direct_donation_upgrade_candidates
    where id = new.winning_candidate_id
      and offer_id = new.id;
    if not found
       or replacement_candidate.status not in (
         'primary',
         'promoted',
         'fulfilled'
       ) then
      raise exception 'The winning matcher must be an active candidate for this Donation Upgrade.';
    end if;

    if old.winning_candidate_id is null then
      if replacement_candidate.status <> 'primary' then
        raise exception 'The first winning matcher must be the primary candidate.';
      end if;
    else
      select status into prior_candidate_status
      from public.direct_donation_upgrade_candidates
      where id = old.winning_candidate_id
        and offer_id = old.id;
      if prior_candidate_status is distinct from 'defaulted'
         or replacement_candidate.status <> 'promoted'
         or old.status <> 'matched'
         or new.status <> 'matched' then
        raise exception 'A winning matcher may change only from a defaulted matcher to a promoted backup.';
      end if;
    end if;
  end if;

  if old.match_locked_at is not null
     and new.match_locked_at is distinct from old.match_locked_at then
    raise exception 'The Donation Upgrade match-lock timestamp is immutable once set.';
  end if;
  if old.fulfillment_deadline_at is not null
     and new.fulfillment_deadline_at is distinct from old.fulfillment_deadline_at
     and new.winning_candidate_id is not distinct from old.winning_candidate_id then
    raise exception 'The fulfillment deadline may change only when a backup matcher is promoted.';
  end if;
  if old.webhook_grace_ends_at is not null
     and new.webhook_grace_ends_at is distinct from old.webhook_grace_ends_at
     and new.winning_candidate_id is not distinct from old.winning_candidate_id then
    raise exception 'The webhook grace deadline may change only when a backup matcher is promoted.';
  end if;
  if old.completed_at is not null
     and new.completed_at is distinct from old.completed_at then
    raise exception 'The Donation Upgrade completion timestamp is immutable once set.';
  end if;
  if old.defaulted_at is not null
     and new.defaulted_at is distinct from old.defaulted_at then
    raise exception 'The Donation Upgrade default timestamp is immutable once set.';
  end if;

  if new.status = 'matched'
     and (
       new.selected_branch <> 'matched'
       or new.winning_candidate_id is null
       or new.match_locked_at is null
       or new.fulfillment_deadline_at is null
       or new.webhook_grace_ends_at is null
     ) then
    raise exception 'A matched Donation Upgrade requires one frozen winner and fulfillment window.';
  end if;
  if new.status = 'fallback_selected'
     and (
       new.selected_branch <> 'fallback'
       or new.winning_candidate_id is not null
       or new.fulfillment_deadline_at is null
       or new.webhook_grace_ends_at is null
     ) then
    raise exception 'A fallback Donation Upgrade requires its frozen fallback fulfillment window.';
  end if;
  if new.status in ('completed', 'post_completion_exception')
     and new.completed_at is null then
    raise exception 'A completed or post-completion-exception Donation Upgrade requires its historical completion timestamp.';
  end if;
  if new.status = 'defaulted' and new.defaulted_at is null then
    raise exception 'A defaulted Donation Upgrade requires its default timestamp.';
  end if;
  return new;
end;
$$;

create or replace function public.direct_donation_upgrade_guard_obligation_terms()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'Direct Donation Upgrade obligations are retained as audit records.';
  end if;

  if tg_op = 'INSERT' then
    if new.status <> 'pending'
       or new.reminder_72h_sent_at is not null
       or new.reminder_24h_sent_at is not null
       or new.checkout_started_at is not null
       or new.provider_charge_id_hash <> ''
       or new.provider_payload_hash <> ''
       or new.provider_gross_amount_cents is not null
       or new.provider_net_amount_cents is not null
       or new.provider_currency <> ''
       or new.provider_nonprofit_slug <> ''
       or new.provider_nonprofit_ein <> ''
       or new.provider_donation_date is not null
       or new.provider_payment_method <> ''
       or new.provider_reversed_at is not null
       or new.failure_code <> ''
       or new.failure_message <> ''
       or new.verified_at is not null then
      raise exception 'A Direct Donation Upgrade obligation must begin pending without provider evidence.';
    end if;
    if not exists (
      select 1
      from public.direct_donation_upgrade_offers offer
      where offer.id = new.offer_id
        and offer.environment = new.environment
        and offer.terms_hash = new.terms_hash
    ) then
      raise exception 'A Direct Donation Upgrade obligation must match its offer environment and frozen terms.';
    end if;
    return new;
  end if;

  if new.offer_id is distinct from old.offer_id
     or new.candidate_id is distinct from old.candidate_id
     or new.participant_profile_id is distinct from old.participant_profile_id
     or new.participant_role is distinct from old.participant_role
     or new.obligation_kind is distinct from old.obligation_kind
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

  if new.status is distinct from old.status
     and not (
       (
         old.status in ('pending', 'checkout_started')
         and new.status in (
           'checkout_started',
           'verified',
           'defaulted',
           'cancelled',
           'needs_review'
         )
       )
       or (
         old.status = 'verified'
         and new.status in ('provider_reversed', 'needs_review')
       )
       or (
         old.status in (
           'provider_reversed',
           'defaulted',
           'cancelled'
         )
         and new.status = 'needs_review'
       )
     ) then
    raise exception 'Invalid Direct Donation Upgrade obligation status transition from % to %.',
      old.status, new.status;
  end if;

  if old.checkout_started_at is not null
     and new.checkout_started_at is distinct from old.checkout_started_at then
    raise exception 'The checkout-start timestamp is immutable once set.';
  end if;
  if old.reminder_72h_sent_at is not null
     and new.reminder_72h_sent_at is distinct from old.reminder_72h_sent_at then
    raise exception 'The 72-hour reminder timestamp is immutable once set.';
  end if;
  if old.reminder_24h_sent_at is not null
     and new.reminder_24h_sent_at is distinct from old.reminder_24h_sent_at then
    raise exception 'The 24-hour reminder timestamp is immutable once set.';
  end if;

  if new.status = 'verified' and old.status <> 'verified' then
    if new.provider_charge_id_hash !~ '^[0-9a-f]{64}$'
       or new.provider_payload_hash !~ '^[0-9a-f]{64}$'
       or new.provider_gross_amount_cents is distinct from
         new.expected_amount_cents
       or new.provider_net_amount_cents is null
       or new.provider_net_amount_cents < 0
       or new.provider_net_amount_cents >
         new.provider_gross_amount_cents
       or new.provider_currency <> new.expected_currency
       or new.provider_nonprofit_slug <>
         lower(new.expected_recipient->>'primarySlug')
       or new.provider_donation_date is null
       or new.verified_at is null
       or new.provider_reversed_at is not null
       or new.failure_code <> ''
       or new.failure_message <> '' then
      raise exception 'A verified obligation requires complete provider webhook evidence matching its frozen terms.';
    end if;
  end if;

  if old.provider_charge_id_hash <> ''
     and (
       new.provider_charge_id_hash is distinct from
         old.provider_charge_id_hash
       or new.provider_payload_hash is distinct from
         old.provider_payload_hash
       or new.provider_gross_amount_cents is distinct from
         old.provider_gross_amount_cents
       or new.provider_net_amount_cents is distinct from
         old.provider_net_amount_cents
       or new.provider_currency is distinct from old.provider_currency
       or new.provider_nonprofit_slug is distinct from
         old.provider_nonprofit_slug
       or new.provider_nonprofit_ein is distinct from
         old.provider_nonprofit_ein
       or new.provider_donation_date is distinct from
         old.provider_donation_date
       or new.provider_payment_method is distinct from
         old.provider_payment_method
       or new.verified_at is distinct from old.verified_at
     ) then
    raise exception 'Verified provider evidence is immutable.';
  end if;

  if (
       new.provider_charge_id_hash is distinct from
         old.provider_charge_id_hash
       or new.provider_gross_amount_cents is distinct from
         old.provider_gross_amount_cents
       or new.provider_net_amount_cents is distinct from
         old.provider_net_amount_cents
       or new.provider_currency is distinct from old.provider_currency
       or new.provider_nonprofit_slug is distinct from
         old.provider_nonprofit_slug
       or new.provider_nonprofit_ein is distinct from
         old.provider_nonprofit_ein
       or new.provider_donation_date is distinct from
         old.provider_donation_date
       or new.provider_payment_method is distinct from
         old.provider_payment_method
       or new.verified_at is distinct from old.verified_at
     )
     and not (
       old.status in ('pending', 'checkout_started')
       and new.status = 'verified'
     ) then
    raise exception 'Provider verification evidence may be recorded only with the verified transition.';
  end if;

  if new.provider_payload_hash is distinct from old.provider_payload_hash
     and not (
       old.status in ('pending', 'checkout_started')
       and new.status in ('verified', 'needs_review')
     ) then
    raise exception 'Provider payload evidence may be recorded only by webhook processing.';
  end if;

  if new.provider_reversed_at is distinct from old.provider_reversed_at
     and not (
       old.status = 'verified'
       and new.status = 'provider_reversed'
       and old.provider_reversed_at is null
       and new.provider_reversed_at is not null
     ) then
    raise exception 'Provider reversal time may be recorded only when a verified obligation becomes provider-reversed.';
  end if;

  if new.status = 'provider_reversed'
     and (
       new.provider_reversed_at is null
       or new.provider_charge_id_hash !~ '^[0-9a-f]{64}$'
       or new.provider_payload_hash !~ '^[0-9a-f]{64}$'
       or new.verified_at is null
     ) then
    raise exception 'A provider-reversed obligation must preserve complete original provider confirmation evidence.';
  end if;

  return new;
end;
$$;

create or replace function public.direct_donation_upgrade_guard_revision_links()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  current_offer public.direct_donation_upgrade_offers%rowtype;
  predecessor public.direct_donation_upgrade_offers%rowtype;
  successor public.direct_donation_upgrade_offers%rowtype;
begin
  select * into current_offer
  from public.direct_donation_upgrade_offers
  where id = new.id;
  if not found then
    return null;
  end if;

  if current_offer.supersedes_offer_id is not null then
    select * into predecessor
    from public.direct_donation_upgrade_offers
    where id = current_offer.supersedes_offer_id;

    if not found
       or predecessor.status <> 'cancelled'
       or predecessor.superseded_by_offer_id is distinct from current_offer.id
       or current_offer.status not in (
         'matched',
         'completed',
         'post_completion_exception',
         'defaulted',
         'needs_review'
       )
       or current_offer.selected_branch <> 'matched'
       or current_offer.creator_profile_id is distinct from
         predecessor.creator_profile_id
       or current_offer.environment is distinct from predecessor.environment
       or current_offer.privacy_mode is distinct from predecessor.privacy_mode
       or current_offer.creator_amount_cents is distinct from
         predecessor.creator_amount_cents
       or current_offer.currency is distinct from predecessor.currency
       or current_offer.match_deadline_at is distinct from
         predecessor.match_deadline_at
       or current_offer.original_recipient is distinct from
         predecessor.original_recipient
       or current_offer.upgraded_recipient is distinct from
         predecessor.upgraded_recipient
       or current_offer.original_recipient_hash is distinct from
         predecessor.original_recipient_hash
       or current_offer.upgraded_recipient_hash is distinct from
         predecessor.upgraded_recipient_hash
       or current_offer.baseline_version is distinct from
         predecessor.baseline_version
       or current_offer.baseline_attestation is distinct from
         predecessor.baseline_attestation
       or current_offer.baseline_attested_at is distinct from
         predecessor.baseline_attested_at
       or current_offer.terms_hash is distinct from
         public.direct_donation_upgrade_terms_hash_v2(
           current_offer.creator_profile_id,
           current_offer.creator_amount_cents,
           current_offer.redirect_basis_points,
           current_offer.matcher_amount_cents,
           current_offer.original_recipient_hash,
           current_offer.upgraded_recipient_hash,
           current_offer.match_deadline_at,
           current_offer.privacy_mode,
           current_offer.environment,
           current_offer.baseline_attestation
         )
       or not exists (
         select 1
         from public.direct_donation_upgrade_proposals proposal
         join public.direct_donation_upgrade_candidates candidate
           on candidate.offer_id = current_offer.id
          and candidate.profile_id = proposal.proposer_profile_id
          and candidate.rank = 1
          and candidate.commitment_version =
            proposal.commitment_version
          and candidate.commitment_accepted_at =
            proposal.commitment_accepted_at
          and candidate.status in (
            'primary',
            'fulfilled',
            'defaulted',
            'closed'
          )
         where proposal.offer_id = predecessor.id
           and proposal.status = 'accepted'
           and proposal.base_terms_hash = predecessor.terms_hash
           and proposal.accepted_offer_id = current_offer.id
           and proposal.proposed_redirect_basis_points =
             current_offer.redirect_basis_points
           and proposal.proposed_redirected_amount_cents =
             current_offer.redirected_amount_cents
           and proposal.proposed_retained_amount_cents =
             current_offer.retained_amount_cents
           and proposal.proposed_matcher_amount_cents =
             current_offer.matcher_amount_cents
           and proposal.currency = current_offer.currency
           and (
             candidate.status <> 'primary'
             or current_offer.winning_candidate_id = candidate.id
           )
       ) then
      raise exception 'Donation Upgrade revision links require one accepted counteroffer and matching immutable provenance.';
    end if;
  end if;

  if current_offer.superseded_by_offer_id is not null then
    select * into successor
    from public.direct_donation_upgrade_offers
    where id = current_offer.superseded_by_offer_id;

    if not found
       or current_offer.status <> 'cancelled'
       or successor.supersedes_offer_id is distinct from current_offer.id
       or successor.status not in (
         'matched',
         'completed',
         'post_completion_exception',
         'defaulted',
         'needs_review'
       )
       or successor.selected_branch <> 'matched'
       or successor.creator_profile_id is distinct from
         current_offer.creator_profile_id
       or successor.environment is distinct from current_offer.environment
       or successor.privacy_mode is distinct from current_offer.privacy_mode
       or successor.creator_amount_cents is distinct from
         current_offer.creator_amount_cents
       or successor.currency is distinct from current_offer.currency
       or successor.match_deadline_at is distinct from
         current_offer.match_deadline_at
       or successor.original_recipient is distinct from
         current_offer.original_recipient
       or successor.upgraded_recipient is distinct from
         current_offer.upgraded_recipient
       or successor.original_recipient_hash is distinct from
         current_offer.original_recipient_hash
       or successor.upgraded_recipient_hash is distinct from
         current_offer.upgraded_recipient_hash
       or successor.baseline_version is distinct from
         current_offer.baseline_version
       or successor.baseline_attestation is distinct from
         current_offer.baseline_attestation
       or successor.baseline_attested_at is distinct from
         current_offer.baseline_attested_at
       or successor.terms_hash is distinct from
         public.direct_donation_upgrade_terms_hash_v2(
           successor.creator_profile_id,
           successor.creator_amount_cents,
           successor.redirect_basis_points,
           successor.matcher_amount_cents,
           successor.original_recipient_hash,
           successor.upgraded_recipient_hash,
           successor.match_deadline_at,
           successor.privacy_mode,
           successor.environment,
           successor.baseline_attestation
         )
       or not exists (
         select 1
         from public.direct_donation_upgrade_proposals proposal
         join public.direct_donation_upgrade_candidates candidate
           on candidate.offer_id = successor.id
          and candidate.profile_id = proposal.proposer_profile_id
          and candidate.rank = 1
          and candidate.commitment_version =
            proposal.commitment_version
          and candidate.commitment_accepted_at =
            proposal.commitment_accepted_at
          and candidate.status in (
            'primary',
            'fulfilled',
            'defaulted',
            'closed'
          )
         where proposal.offer_id = current_offer.id
           and proposal.status = 'accepted'
           and proposal.base_terms_hash = current_offer.terms_hash
           and proposal.accepted_offer_id = successor.id
           and proposal.proposed_redirect_basis_points =
             successor.redirect_basis_points
           and proposal.proposed_redirected_amount_cents =
             successor.redirected_amount_cents
           and proposal.proposed_retained_amount_cents =
             successor.retained_amount_cents
           and proposal.proposed_matcher_amount_cents =
             successor.matcher_amount_cents
           and proposal.currency = successor.currency
           and (
             candidate.status <> 'primary'
             or successor.winning_candidate_id = candidate.id
           )
       ) then
      raise exception 'Donation Upgrade revision links require one accepted counteroffer and matching immutable provenance.';
    end if;
  end if;

  return null;
end;
$$;

-- Freeze the pre-refund completion implementation, then interpose a wrapper
-- that makes verified completion replays harmless after a recorded reversal.
do $completion_wrapper$
begin
  if to_regprocedure(
    'public.direct_donation_upgrade_complete_obligation_20260820(uuid,boolean,text,text,text,text,integer,integer,text,text,text,timestamp with time zone,text,text)'
  ) is null then
    alter function public.complete_direct_donation_upgrade_obligation(
      uuid,
      boolean,
      text,
      text,
      text,
      text,
      integer,
      integer,
      text,
      text,
      text,
      timestamptz,
      text,
      text
    ) rename to direct_donation_upgrade_complete_obligation_20260820;
  end if;
end;
$completion_wrapper$;

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
  p_provider_payment_method text,
  p_expected_environment text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  obligation_offer_id uuid;
  obligation_row public.direct_donation_upgrade_obligations%rowtype;
  offer_row public.direct_donation_upgrade_offers%rowtype;
  exact_replay boolean;
begin
  if p_expected_environment is null
     or p_expected_environment not in ('staging', 'live') then
    raise exception 'Invalid expected Direct Donation Upgrade environment.';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'moraltrade:direct-donation-upgrade-lifecycle-worker',
      0
    )
  );

  select offer_id into obligation_offer_id
  from public.direct_donation_upgrade_obligations
  where id = p_obligation_id;
  if not found then
    raise exception 'Direct Donation Upgrade obligation not found.';
  end if;

  select * into offer_row
  from public.direct_donation_upgrade_offers
  where id = obligation_offer_id
  for update;
  if not found then
    raise exception 'Direct Donation Upgrade offer not found.';
  end if;

  select * into obligation_row
  from public.direct_donation_upgrade_obligations
  where id = p_obligation_id
    and offer_id = obligation_offer_id
  for update;
  if not found then
    raise exception 'Direct Donation Upgrade obligation changed while locking.';
  end if;

  if offer_row.environment is distinct from p_expected_environment
     or obligation_row.environment is distinct from p_expected_environment
     or obligation_row.environment is distinct from offer_row.environment then
    raise exception 'The Direct Donation Upgrade obligation belongs to a different environment.';
  end if;

  if obligation_row.provider_reversed_at is not null then
    exact_replay := coalesce(p_valid, false)
      and obligation_row.provider_charge_id_hash =
        lower(coalesce(p_provider_charge_id_hash, ''))
      and obligation_row.provider_payload_hash =
        lower(coalesce(p_provider_payload_hash, ''))
      and obligation_row.provider_gross_amount_cents is not distinct from
        p_provider_gross_amount_cents
      and obligation_row.provider_net_amount_cents is not distinct from
        p_provider_net_amount_cents
      and obligation_row.provider_currency =
        upper(coalesce(p_provider_currency, ''))
      and obligation_row.provider_nonprofit_slug =
        lower(coalesce(p_provider_nonprofit_slug, ''))
      and obligation_row.provider_nonprofit_ein =
        regexp_replace(
          coalesce(p_provider_nonprofit_ein, ''),
          '[^0-9]',
          '',
          'g'
        )
      and obligation_row.provider_donation_date is not distinct from
        p_provider_donation_date
      and obligation_row.provider_payment_method =
        left(coalesce(p_provider_payment_method, ''), 120);

    if exact_replay then
      return jsonb_build_object(
        'outcome', 'already_provider_reversed',
        'obligation', to_jsonb(obligation_row),
        'offer', to_jsonb(offer_row)
      );
    end if;

    update public.direct_donation_upgrade_obligations
    set status = 'needs_review',
        failure_code = 'post_refund_completion_replay_mismatch',
        failure_message =
          'A non-identical completion webhook arrived after a provider refund was recorded.'
    where id = obligation_row.id
      and status = 'provider_reversed';

    update public.direct_donation_upgrade_offers
    set status = 'needs_review',
        failure_code = 'post_refund_completion_replay_mismatch',
        failure_message =
          'A non-identical completion webhook arrived after a provider refund was recorded.'
    where id = offer_row.id
      and status <> 'needs_review';

    perform public.direct_donation_upgrade_audit(
      offer_row.id,
      obligation_row.id,
      obligation_row.candidate_id,
      null,
      'post_refund_completion_replay_rejected',
      jsonb_build_object(
        'storedChargeIdHash', obligation_row.provider_charge_id_hash,
        'receivedChargeIdHash',
          lower(coalesce(p_provider_charge_id_hash, '')),
        'storedPayloadHash', obligation_row.provider_payload_hash,
        'receivedPayloadHash',
          lower(coalesce(p_provider_payload_hash, ''))
      )
    );
    return jsonb_build_object(
      'outcome', 'needs_review',
      'reason', 'post_refund_completion_replay_mismatch'
    );
  end if;

  return public.direct_donation_upgrade_complete_obligation_20260820(
    p_obligation_id,
    p_valid,
    p_failure_code,
    p_failure_message,
    p_provider_charge_id_hash,
    p_provider_payload_hash,
    p_provider_gross_amount_cents,
    p_provider_net_amount_cents,
    p_provider_currency,
    p_provider_nonprofit_slug,
    p_provider_nonprofit_ein,
    p_provider_donation_date,
    p_provider_payment_method,
    p_expected_environment
  );
end;
$$;

create or replace function public.record_direct_donation_upgrade_provider_reversal(
  p_operator_profile_id uuid,
  p_obligation_id uuid,
  p_expected_environment text,
  p_provider_charge_id_hash text,
  p_partner_donation_id text,
  p_recipient_hash text,
  p_amount_cents integer,
  p_currency text,
  p_provider_refunded_at timestamptz,
  p_evidence_source text,
  p_evidence_reference_hash text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  normalized_charge_hash text :=
    lower(trim(coalesce(p_provider_charge_id_hash, '')));
  normalized_recipient_hash text :=
    lower(trim(coalesce(p_recipient_hash, '')));
  normalized_currency text :=
    upper(trim(coalesce(p_currency, '')));
  normalized_partner_donation_id text :=
    trim(coalesce(p_partner_donation_id, ''));
  normalized_evidence_source text :=
    lower(trim(coalesce(p_evidence_source, '')));
  normalized_evidence_reference_hash text :=
    lower(trim(coalesce(p_evidence_reference_hash, '')));
  fingerprint_hash text;
  obligation_offer_id uuid;
  conflicting_obligation_id uuid;
  conflicting_offer_id uuid;
  affected_offer_id uuid;
  offer_was_completed boolean := false;
  offer_row public.direct_donation_upgrade_offers%rowtype;
  obligation_row public.direct_donation_upgrade_obligations%rowtype;
  credit_row public.direct_donation_upgrade_impact_credits%rowtype;
  existing_reversal
    public.direct_donation_upgrade_provider_reversals%rowtype;
  reversal_row
    public.direct_donation_upgrade_provider_reversals%rowtype;
  mismatch_reason text := '';
  participant_id uuid;
begin
  if p_operator_profile_id is null
     or not exists (
       select 1
       from public.profiles
       where id = p_operator_profile_id
     ) then
    raise exception 'A valid operator profile is required.';
  end if;
  if p_expected_environment is null
     or p_expected_environment not in ('staging', 'live') then
    raise exception 'Invalid expected Direct Donation Upgrade environment.';
  end if;
  if normalized_charge_hash !~ '^[0-9a-f]{64}$'
     or normalized_recipient_hash !~ '^[0-9a-f]{64}$'
     or normalized_evidence_reference_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'Provider charge, recipient, and evidence-reference hashes must be lowercase SHA-256 hex.';
  end if;
  if char_length(normalized_partner_donation_id) not between 1 and 200 then
    raise exception 'A provider-linked partner donation identifier is required.';
  end if;
  if p_amount_cents is null
     or p_amount_cents not between 100 and 5000000
     or normalized_currency <> 'USD'
     or p_provider_refunded_at is null then
    raise exception 'A full USD provider refund amount and timestamp are required.';
  end if;
  if normalized_evidence_source not in (
    'every_org_dashboard',
    'every_org_support'
  ) then
    raise exception 'Refund evidence must come from the Every.org dashboard or Every.org support.';
  end if;

  fingerprint_hash := encode(
    extensions.digest(
      convert_to(
        concat_ws(
          '|',
          p_obligation_id::text,
          p_expected_environment,
          normalized_charge_hash,
          normalized_partner_donation_id,
          normalized_recipient_hash,
          p_amount_cents::text,
          normalized_currency,
          to_char(
            p_provider_refunded_at at time zone 'UTC',
            'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'
          ),
          normalized_evidence_source,
          normalized_evidence_reference_hash
        ),
        'UTF8'
      ),
      'sha256'
    ),
    'hex'
  );

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'moraltrade:direct-donation-upgrade-lifecycle-worker',
      0
    )
  );
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(normalized_charge_hash, 0)
  );

  select offer_id into obligation_offer_id
  from public.direct_donation_upgrade_obligations
  where id = p_obligation_id;
  if not found then
    raise exception 'Direct Donation Upgrade obligation not found.';
  end if;

  select id, offer_id
  into conflicting_obligation_id, conflicting_offer_id
  from public.direct_donation_upgrade_obligations
  where provider_charge_id_hash = normalized_charge_hash
    and id <> p_obligation_id
  order by id
  limit 1;

  for affected_offer_id in
    select affected_offer.id
    from public.direct_donation_upgrade_offers affected_offer
    where affected_offer.id in (
      obligation_offer_id,
      conflicting_offer_id
    )
    order by affected_offer.id
    for update
  loop
    null;
  end loop;

  select * into offer_row
  from public.direct_donation_upgrade_offers
  where id = obligation_offer_id;
  if not found then
    raise exception 'Direct Donation Upgrade offer not found.';
  end if;

  select * into obligation_row
  from public.direct_donation_upgrade_obligations
  where id = p_obligation_id
    and offer_id = obligation_offer_id
  for update;
  if not found then
    raise exception 'Direct Donation Upgrade obligation changed while locking.';
  end if;

  if conflicting_obligation_id is not null then
    perform 1
    from public.direct_donation_upgrade_obligations
    where id = conflicting_obligation_id
    for update;
  end if;

  select * into existing_reversal
  from public.direct_donation_upgrade_provider_reversals
  where obligation_id = obligation_row.id
  for update;
  if found then
    if existing_reversal.report_fingerprint_hash = fingerprint_hash then
      return jsonb_build_object(
        'outcome', 'already_recorded',
        'reversal', to_jsonb(existing_reversal),
        'obligation', to_jsonb(obligation_row),
        'offer', to_jsonb(offer_row)
      );
    end if;
    mismatch_reason := 'provider_reversal_altered_replay';
  end if;

  if mismatch_reason = ''
     and (
       offer_row.environment is distinct from p_expected_environment
       or obligation_row.environment is distinct from p_expected_environment
       or obligation_row.environment is distinct from offer_row.environment
     ) then
    mismatch_reason := 'provider_reversal_environment_mismatch';
  end if;
  if mismatch_reason = ''
     and conflicting_obligation_id is not null then
    mismatch_reason := 'provider_reversal_cross_obligation_charge';
  end if;
  if mismatch_reason = ''
     and obligation_row.status <> 'verified' then
    mismatch_reason := 'provider_reversal_obligation_not_verified';
  end if;
  if mismatch_reason = ''
     and obligation_row.provider_charge_id_hash <> normalized_charge_hash then
    mismatch_reason := 'provider_reversal_charge_mismatch';
  end if;
  if mismatch_reason = ''
     and obligation_row.partner_donation_id <>
       normalized_partner_donation_id then
    mismatch_reason := 'provider_reversal_donation_id_mismatch';
  end if;
  if mismatch_reason = ''
     and obligation_row.expected_recipient_hash <>
       normalized_recipient_hash then
    mismatch_reason := 'provider_reversal_recipient_mismatch';
  end if;
  if mismatch_reason = ''
     and (
       obligation_row.expected_amount_cents <> p_amount_cents
       or obligation_row.provider_gross_amount_cents <> p_amount_cents
     ) then
    mismatch_reason := 'provider_reversal_amount_mismatch';
  end if;
  if mismatch_reason = ''
     and (
       obligation_row.expected_currency <> normalized_currency
       or obligation_row.provider_currency <> normalized_currency
     ) then
    mismatch_reason := 'provider_reversal_currency_mismatch';
  end if;
  if mismatch_reason = ''
     and (
       p_provider_refunded_at < obligation_row.provider_donation_date
       or p_provider_refunded_at >
         timezone('utc', now()) + interval '5 minutes'
     ) then
    mismatch_reason := 'provider_reversal_time_mismatch';
  end if;

  select * into credit_row
  from public.direct_donation_upgrade_impact_credits
  where obligation_id = obligation_row.id
  for update;
  if mismatch_reason = ''
     and not found then
    mismatch_reason := 'provider_reversal_credit_missing';
  end if;
  if mismatch_reason = ''
     and (
       credit_row.offer_id <> offer_row.id
       or credit_row.profile_id <> obligation_row.participant_profile_id
       or credit_row.provider_charge_id_hash <> normalized_charge_hash
       or credit_row.recipient_hash <> normalized_recipient_hash
       or credit_row.verified_gross_amount_cents <> p_amount_cents
     ) then
    mismatch_reason := 'provider_reversal_credit_mismatch';
  end if;

  if mismatch_reason <> '' then
    update public.direct_donation_upgrade_obligations
    set status = 'needs_review',
        failure_code = mismatch_reason,
        failure_message =
          'A provider-refund report did not exactly match the immutable confirmed obligation.'
    where id = obligation_row.id
      and status <> 'needs_review';

    update public.direct_donation_upgrade_offers
    set status = 'needs_review',
        failure_code = mismatch_reason,
        failure_message =
          'A provider-refund report did not exactly match the immutable confirmed obligation.'
    where id = offer_row.id
      and status <> 'needs_review';

    if conflicting_obligation_id is not null then
      update public.direct_donation_upgrade_obligations
      set status = 'needs_review',
          failure_code = mismatch_reason,
          failure_message =
            'A provider charge was presented in a refund report for another obligation.'
      where id = conflicting_obligation_id
        and status <> 'needs_review';

      update public.direct_donation_upgrade_offers
      set status = 'needs_review',
          failure_code = mismatch_reason,
          failure_message =
            'A provider charge was presented in a refund report for another obligation.'
      where id = conflicting_offer_id
        and status <> 'needs_review';
    end if;

    perform public.direct_donation_upgrade_audit(
      offer_row.id,
      obligation_row.id,
      obligation_row.candidate_id,
      p_operator_profile_id,
      'provider_refund_report_rejected',
      jsonb_build_object(
        'reason', mismatch_reason,
        'receivedChargeIdHash', normalized_charge_hash,
        'receivedRecipientHash', normalized_recipient_hash,
        'receivedAmountCents', p_amount_cents,
        'receivedCurrency', normalized_currency
      )
    );
    return jsonb_build_object(
      'outcome', 'needs_review',
      'reason', mismatch_reason
    );
  end if;

  insert into public.direct_donation_upgrade_provider_reversals(
    offer_id,
    obligation_id,
    impact_credit_id,
    recorded_by_profile_id,
    environment,
    provider_charge_id_hash,
    partner_donation_id,
    recipient_hash,
    amount_cents,
    currency,
    provider_refunded_at,
    evidence_source,
    evidence_reference_hash,
    report_fingerprint_hash,
    reversed_verified_gross_amount_cents,
    reversed_verified_net_amount_cents,
    reversed_incremental_gross_amount_cents,
    reversed_incremental_net_amount_cents,
    reversed_redirected_gross_amount_cents,
    reversed_redirected_net_amount_cents
  ) values (
    offer_row.id,
    obligation_row.id,
    credit_row.id,
    p_operator_profile_id,
    obligation_row.environment,
    obligation_row.provider_charge_id_hash,
    obligation_row.partner_donation_id,
    obligation_row.expected_recipient_hash,
    obligation_row.provider_gross_amount_cents,
    obligation_row.provider_currency,
    p_provider_refunded_at,
    normalized_evidence_source,
    normalized_evidence_reference_hash,
    fingerprint_hash,
    credit_row.verified_gross_amount_cents,
    credit_row.verified_net_amount_cents,
    credit_row.incremental_gross_amount_cents,
    credit_row.incremental_net_amount_cents,
    credit_row.redirected_gross_amount_cents,
    credit_row.redirected_net_amount_cents
  )
  returning * into reversal_row;

  update public.direct_donation_upgrade_obligations
  set status = 'provider_reversed',
      provider_reversed_at = reversal_row.provider_refunded_at,
      failure_code = 'provider_refund_recorded',
      failure_message =
        'Every.org authoritative evidence records a full provider refund; original confirmation evidence is retained.'
  where id = obligation_row.id
  returning * into obligation_row;

  offer_was_completed := offer_row.status = 'completed';

  update public.direct_donation_upgrade_offers
  set status = case
        when offer_was_completed
          then 'post_completion_exception'
        else 'needs_review'
      end,
      failure_code = 'provider_refund_recorded',
      failure_message = case
        when offer_was_completed
          then 'A required donation was later refunded by the provider after completion.'
        else 'A confirmed donation was later refunded by the provider.'
      end
  where id = offer_row.id
  returning * into offer_row;

  perform public.direct_donation_upgrade_audit(
    offer_row.id,
    obligation_row.id,
    obligation_row.candidate_id,
    p_operator_profile_id,
    'provider_refund_recorded',
    jsonb_build_object(
      'reversalId', reversal_row.id,
      'chargeIdHash', reversal_row.provider_charge_id_hash,
      'amountCents', reversal_row.amount_cents,
      'currency', reversal_row.currency,
      'providerRefundedAt', reversal_row.provider_refunded_at,
      'offerStatus', offer_row.status
    )
  );

  for participant_id in
    select distinct participant
    from (
      select obligation_row.participant_profile_id as participant
      union all
      select offer_row.creator_profile_id
      union all
      select candidate.profile_id
      from public.direct_donation_upgrade_candidates candidate
      where candidate.id = offer_row.winning_candidate_id
    ) participants
    where participant is not null
  loop
    perform public.direct_donation_upgrade_notify(
      participant_id,
      'direct_donation_upgrade_provider_refund',
      'Provider refund recorded',
      'Every.org authoritative evidence records a later refund. The original confirmation remains in the audit history, and current credited impact excludes the refunded amount.',
      '/donation-upgrades/' || offer_row.id::text,
      'direct_donation_upgrade_provider_refund:' ||
        reversal_row.id::text || ':' || participant_id::text
    );
  end loop;

  return jsonb_build_object(
    'outcome', 'provider_reversed',
    'reversal', to_jsonb(reversal_row),
    'obligation', to_jsonb(obligation_row),
    'offer', to_jsonb(offer_row)
  );
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
    when offer.privacy_mode = 'public'
      or offer.status in ('completed', 'post_completion_exception')
      then coalesce(creator.display_name, 'Moral Trade participant')
    else null
  end as creator_display_name,
  case
    when (
      offer.privacy_mode = 'public'
      or offer.status in ('completed', 'post_completion_exception')
    )
      and winner_profile.id is not null
      then coalesce(winner_profile.display_name, 'Moral Trade participant')
    else null
  end as matcher_display_name,
  (
    select count(*)::integer
    from public.direct_donation_upgrade_candidates candidate
    where candidate.offer_id = offer.id
      and candidate.status in (
        'primary',
        'backup',
        'promoted',
        'fulfilled'
      )
  ) as matcher_count,
  (
    select count(*)::integer
    from public.direct_donation_upgrade_impact_credits credit
    where credit.offer_id = offer.id
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
  (
    select count(*)::integer
    from public.direct_donation_upgrade_proposals proposal
    where proposal.offer_id = offer.id
  ) as proposal_count,
  coalesce((
    select sum(
      credit.verified_gross_amount_cents -
      coalesce(reversal.reversed_verified_gross_amount_cents, 0)
    )::integer
    from public.direct_donation_upgrade_impact_credits credit
    left join public.direct_donation_upgrade_provider_reversals reversal
      on reversal.impact_credit_id = credit.id
    where credit.offer_id = offer.id
  ), 0) as current_unreversed_gross_amount_cents,
  coalesce((
    select sum(
      credit.verified_net_amount_cents -
      coalesce(reversal.reversed_verified_net_amount_cents, 0)
    )::integer
    from public.direct_donation_upgrade_impact_credits credit
    left join public.direct_donation_upgrade_provider_reversals reversal
      on reversal.impact_credit_id = credit.id
    where credit.offer_id = offer.id
  ), 0) as current_unreversed_net_amount_cents,
  coalesce((
    select sum(
      credit.incremental_net_amount_cents -
      coalesce(reversal.reversed_incremental_net_amount_cents, 0)
    )::integer
    from public.direct_donation_upgrade_impact_credits credit
    left join public.direct_donation_upgrade_provider_reversals reversal
      on reversal.impact_credit_id = credit.id
    where credit.offer_id = offer.id
  ), 0) as current_incremental_net_amount_cents,
  coalesce((
    select sum(
      credit.redirected_net_amount_cents -
      coalesce(reversal.reversed_redirected_net_amount_cents, 0)
    )::integer
    from public.direct_donation_upgrade_impact_credits credit
    left join public.direct_donation_upgrade_provider_reversals reversal
      on reversal.impact_credit_id = credit.id
    where credit.offer_id = offer.id
  ), 0) as current_redirected_net_amount_cents,
  (
    select count(*)::integer
    from public.direct_donation_upgrade_provider_reversals reversal
    where reversal.offer_id = offer.id
  ) as provider_reversed_obligation_count
from public.direct_donation_upgrade_offers offer
join public.profiles creator on creator.id = offer.creator_profile_id
left join public.direct_donation_upgrade_candidates winner
  on winner.id = offer.winning_candidate_id
left join public.profiles winner_profile
  on winner_profile.id = winner.profile_id
where offer.status not in ('cancelled', 'needs_review');

revoke all on public.direct_donation_upgrade_public_offers
  from public, anon, authenticated;
grant select on public.direct_donation_upgrade_public_offers
  to service_role;

revoke execute on function
  public.direct_donation_upgrade_guard_offer_terms()
  from public, anon, authenticated, service_role;
revoke execute on function
  public.direct_donation_upgrade_guard_obligation_terms()
  from public, anon, authenticated, service_role;
revoke execute on function
  public.direct_donation_upgrade_guard_revision_links()
  from public, anon, authenticated, service_role;
revoke execute on function
  public.direct_donation_upgrade_complete_obligation_20260820(
    uuid,
    boolean,
    text,
    text,
    text,
    text,
    integer,
    integer,
    text,
    text,
    text,
    timestamptz,
    text,
    text
  )
  from public, anon, authenticated, service_role;
revoke execute on function
  public.complete_direct_donation_upgrade_obligation(
    uuid,
    boolean,
    text,
    text,
    text,
    text,
    integer,
    integer,
    text,
    text,
    text,
    timestamptz,
    text,
    text
  )
  from public, anon, authenticated, service_role;
revoke execute on function
  public.record_direct_donation_upgrade_provider_reversal(
    uuid,
    uuid,
    text,
    text,
    text,
    text,
    integer,
    text,
    timestamptz,
    text,
    text
  )
  from public, anon, authenticated, service_role;

grant execute on function
  public.complete_direct_donation_upgrade_obligation(
    uuid,
    boolean,
    text,
    text,
    text,
    text,
    integer,
    integer,
    text,
    text,
    text,
    timestamptz,
    text,
    text
  )
  to service_role;
grant execute on function
  public.record_direct_donation_upgrade_provider_reversal(
    uuid,
    uuid,
    text,
    text,
    text,
    text,
    integer,
    text,
    timestamptz,
    text,
    text
  )
  to service_role;

comment on table public.direct_donation_upgrade_provider_reversals is
  'Append-only authoritative Every.org provider-refund evidence and full impact-credit reversal. No donor PII or raw payment payload is stored.';
comment on column public.direct_donation_upgrade_obligations.provider_reversed_at is
  'Authoritative provider refund time; original confirmation fields remain immutable and the separate reversal row records Moral Trade ingestion time.';
comment on function
  public.record_direct_donation_upgrade_provider_reversal(
    uuid,
    uuid,
    text,
    text,
    text,
    text,
    integer,
    text,
    timestamptz,
    text,
    text
  ) is
  'Service-role-only, full-refund reconciliation using authoritative Every.org dashboard or support evidence. Exact replays are idempotent; mismatches fail closed to review.';
