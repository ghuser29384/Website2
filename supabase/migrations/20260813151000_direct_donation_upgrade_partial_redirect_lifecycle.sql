-- Generalize Donation Upgrade completion and lifecycle handling for partial
-- redirection. The existing provider webhook remains the only authority that can
-- verify an obligation or create impact credit.

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
       (old.status = 'open' and new.status in (
         'matched', 'fallback_selected', 'expired', 'cancelled', 'needs_review'
       ))
       or (old.status in ('matched', 'fallback_selected') and new.status in (
         'completed', 'defaulted', 'needs_review'
       ))
       or (old.status in ('completed', 'defaulted', 'expired', 'cancelled')
           and new.status = 'needs_review')
     ) then
    raise exception 'Invalid Donation Upgrade offer status transition from % to %.', old.status, new.status;
  end if;

  if new.selected_branch is distinct from old.selected_branch then
    if old.selected_branch is not null
       or old.status <> 'open'
       or not (
         (new.status = 'matched' and new.selected_branch = 'matched')
         or (new.status = 'fallback_selected' and new.selected_branch = 'fallback')
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
    if not found or replacement_candidate.status not in ('primary', 'promoted', 'fulfilled') then
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
  if old.completed_at is not null and new.completed_at is distinct from old.completed_at then
    raise exception 'The Donation Upgrade completion timestamp is immutable once set.';
  end if;
  if old.defaulted_at is not null and new.defaulted_at is distinct from old.defaulted_at then
    raise exception 'The Donation Upgrade default timestamp is immutable once set.';
  end if;

  if new.status = 'matched'
     and (new.selected_branch <> 'matched'
          or new.winning_candidate_id is null
          or new.match_locked_at is null
          or new.fulfillment_deadline_at is null
          or new.webhook_grace_ends_at is null) then
    raise exception 'A matched Donation Upgrade requires one frozen winner and fulfillment window.';
  end if;
  if new.status = 'fallback_selected'
     and (new.selected_branch <> 'fallback'
          or new.winning_candidate_id is not null
          or new.fulfillment_deadline_at is null
          or new.webhook_grace_ends_at is null) then
    raise exception 'A fallback Donation Upgrade requires its frozen fallback fulfillment window.';
  end if;
  if new.status = 'completed' and new.completed_at is null then
    raise exception 'A completed Donation Upgrade requires its completion timestamp.';
  end if;
  if new.status = 'defaulted' and new.defaulted_at is null then
    raise exception 'A defaulted Donation Upgrade requires its default timestamp.';
  end if;
  return new;
end;
$$;

create or replace function public.direct_donation_upgrade_guard_candidate_identity()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'Donation Upgrade matcher records are retained as audit records.';
  end if;

  if tg_op = 'INSERT' then
    if new.status not in ('primary', 'backup')
       or new.promoted_at is not null
       or new.fulfilled_at is not null
       or new.defaulted_at is not null then
      raise exception 'A Donation Upgrade matcher must begin as a primary or backup candidate.';
    end if;
    return new;
  end if;

  if new.offer_id is distinct from old.offer_id
     or new.profile_id is distinct from old.profile_id
     or new.rank is distinct from old.rank
     or new.commitment_version is distinct from old.commitment_version
     or new.commitment_accepted_at is distinct from old.commitment_accepted_at
     or new.created_at is distinct from old.created_at then
    raise exception 'Donation Upgrade matcher identity and commitment are immutable.';
  end if;

  if new.status is distinct from old.status
     and not (
       (old.status = 'backup' and new.status in ('promoted', 'withdrawn', 'closed'))
       or (old.status in ('primary', 'promoted') and new.status in ('fulfilled', 'defaulted', 'closed'))
     ) then
    raise exception 'Invalid Donation Upgrade matcher status transition from % to %.', old.status, new.status;
  end if;

  if new.promoted_at is distinct from old.promoted_at
     and not (old.status = 'backup' and new.status = 'promoted'
              and old.promoted_at is null and new.promoted_at is not null) then
    raise exception 'The matcher promotion timestamp may be set only during backup promotion.';
  end if;
  if new.fulfilled_at is distinct from old.fulfilled_at
     and not (old.status in ('primary', 'promoted') and new.status = 'fulfilled'
              and old.fulfilled_at is null and new.fulfilled_at is not null) then
    raise exception 'The matcher fulfillment timestamp may be set only during provider verification.';
  end if;
  if new.defaulted_at is distinct from old.defaulted_at
     and not (old.status in ('primary', 'promoted') and new.status = 'defaulted'
              and old.defaulted_at is null and new.defaulted_at is not null) then
    raise exception 'The matcher default timestamp may be set only during matcher default.';
  end if;
  if new.status = 'promoted' and new.promoted_at is null then
    raise exception 'A promoted matcher requires its promotion timestamp.';
  end if;
  if new.status = 'fulfilled' and new.fulfilled_at is null then
    raise exception 'A fulfilled matcher requires its provider-verified fulfillment timestamp.';
  end if;
  if new.status = 'defaulted' and new.defaulted_at is null then
    raise exception 'A defaulted matcher requires its default timestamp.';
  end if;
  return new;
end;
$$;

drop trigger if exists direct_donation_upgrade_candidate_identity_immutable
  on public.direct_donation_upgrade_candidates;
create trigger direct_donation_upgrade_candidate_identity_immutable
before insert or update or delete on public.direct_donation_upgrade_candidates
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
       (old.status in ('pending', 'checkout_started')
        and new.status in ('checkout_started', 'verified', 'defaulted', 'cancelled', 'needs_review'))
       or (old.status in ('verified', 'defaulted', 'cancelled') and new.status = 'needs_review')
     ) then
    raise exception 'Invalid Direct Donation Upgrade obligation status transition from % to %.', old.status, new.status;
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
       or new.provider_gross_amount_cents is distinct from new.expected_amount_cents
       or new.provider_net_amount_cents is null
       or new.provider_net_amount_cents < 0
       or new.provider_net_amount_cents > new.provider_gross_amount_cents
       or new.provider_currency <> new.expected_currency
       or new.provider_nonprofit_slug <> lower(new.expected_recipient->>'primarySlug')
       or new.provider_donation_date is null
       or new.verified_at is null
       or new.failure_code <> ''
       or new.failure_message <> '' then
      raise exception 'A verified obligation requires complete provider webhook evidence matching its frozen terms.';
    end if;
  end if;

  if old.status = 'verified'
     and (
       new.provider_charge_id_hash is distinct from old.provider_charge_id_hash
       or new.provider_payload_hash is distinct from old.provider_payload_hash
       or new.provider_gross_amount_cents is distinct from old.provider_gross_amount_cents
       or new.provider_net_amount_cents is distinct from old.provider_net_amount_cents
       or new.provider_currency is distinct from old.provider_currency
       or new.provider_nonprofit_slug is distinct from old.provider_nonprofit_slug
       or new.provider_nonprofit_ein is distinct from old.provider_nonprofit_ein
       or new.provider_donation_date is distinct from old.provider_donation_date
       or new.provider_payment_method is distinct from old.provider_payment_method
       or new.verified_at is distinct from old.verified_at
     ) then
    raise exception 'Verified provider evidence is immutable.';
  end if;

  if (
       new.provider_charge_id_hash is distinct from old.provider_charge_id_hash
       or new.provider_gross_amount_cents is distinct from old.provider_gross_amount_cents
       or new.provider_net_amount_cents is distinct from old.provider_net_amount_cents
       or new.provider_currency is distinct from old.provider_currency
       or new.provider_nonprofit_slug is distinct from old.provider_nonprofit_slug
       or new.provider_nonprofit_ein is distinct from old.provider_nonprofit_ein
       or new.provider_donation_date is distinct from old.provider_donation_date
       or new.provider_payment_method is distinct from old.provider_payment_method
       or new.verified_at is distinct from old.verified_at
     )
     and not (old.status in ('pending', 'checkout_started') and new.status = 'verified') then
    raise exception 'Provider verification evidence may be recorded only with the verified transition.';
  end if;
  if new.provider_payload_hash is distinct from old.provider_payload_hash
     and not (
       old.status in ('pending', 'checkout_started')
       and new.status in ('verified', 'needs_review')
     ) then
    raise exception 'Provider payload evidence may be recorded only by webhook processing.';
  end if;
  return new;
end;
$$;

drop trigger if exists direct_donation_upgrade_obligation_terms_immutable
  on public.direct_donation_upgrade_obligations;
create trigger direct_donation_upgrade_obligation_terms_immutable
before insert or update or delete on public.direct_donation_upgrade_obligations
for each row execute function public.direct_donation_upgrade_guard_obligation_terms();

create or replace function public.direct_donation_upgrade_guard_completion()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  expected_creator_count integer;
  actual_creator_count integer;
  unverified_required_count integer;
  current_matcher_count integer;
begin
  if new.status <> 'completed' or old.status = 'completed' then
    return new;
  end if;

  if new.selected_branch = 'fallback' then
    select count(*)::integer,
           count(*) filter (where status <> 'verified')::integer
    into actual_creator_count, unverified_required_count
    from public.direct_donation_upgrade_obligations
    where offer_id = new.id
      and obligation_kind = 'creator_fallback';

    if actual_creator_count <> 1 or unverified_required_count <> 0 then
      new.status := old.status;
      new.completed_at := old.completed_at;
      new.failure_code := old.failure_code;
      new.failure_message := old.failure_message;
    end if;
    return new;
  end if;

  if new.selected_branch = 'matched' then
    -- Stored generated columns are computed after BEFORE triggers, so NEW's
    -- retained_amount_cents is null here. The frozen basis points carry the
    -- same retained-leg contract without consulting a not-yet-generated value.
    expected_creator_count := 1 + case when new.redirect_basis_points < 10000 then 1 else 0 end;

    select count(*)::integer,
           count(*) filter (where status <> 'verified')::integer
    into actual_creator_count, unverified_required_count
    from public.direct_donation_upgrade_obligations
    where offer_id = new.id
      and participant_role = 'creator'
      and branch = 'matched';

    select count(*)::integer
    into current_matcher_count
    from public.direct_donation_upgrade_obligations
    where offer_id = new.id
      and participant_role = 'matcher'
      and obligation_kind = 'matcher_incremental'
      and candidate_id = new.winning_candidate_id
      and status = 'verified';

    if actual_creator_count <> expected_creator_count
       or unverified_required_count <> 0
       or current_matcher_count <> 1
       or not exists (
         select 1
         from public.direct_donation_upgrade_obligations
         where offer_id = new.id
           and obligation_kind = 'creator_redirected'
           and status = 'verified'
       )
       or (
        new.redirect_basis_points < 10000
         and not exists (
           select 1
           from public.direct_donation_upgrade_obligations
           where offer_id = new.id
             and obligation_kind = 'creator_retained'
             and status = 'verified'
         )
       ) then
      new.status := old.status;
      new.completed_at := old.completed_at;
      new.failure_code := old.failure_code;
      new.failure_message := old.failure_message;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists direct_donation_upgrade_completion_guard
  on public.direct_donation_upgrade_offers;
create trigger direct_donation_upgrade_completion_guard
before update of status on public.direct_donation_upgrade_offers
for each row execute function public.direct_donation_upgrade_guard_completion();

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
  -- A deferred row trigger can have several queued versions of the same row.
  -- Validate the final stored revision rather than a stale NEW image.
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
       or current_offer.status not in ('matched', 'completed', 'defaulted', 'needs_review')
       or current_offer.selected_branch <> 'matched'
       or current_offer.creator_profile_id is distinct from predecessor.creator_profile_id
       or current_offer.environment is distinct from predecessor.environment
       or current_offer.privacy_mode is distinct from predecessor.privacy_mode
       or current_offer.creator_amount_cents is distinct from predecessor.creator_amount_cents
       or current_offer.currency is distinct from predecessor.currency
       or current_offer.match_deadline_at is distinct from predecessor.match_deadline_at
       or current_offer.original_recipient is distinct from predecessor.original_recipient
       or current_offer.upgraded_recipient is distinct from predecessor.upgraded_recipient
       or current_offer.original_recipient_hash is distinct from predecessor.original_recipient_hash
       or current_offer.upgraded_recipient_hash is distinct from predecessor.upgraded_recipient_hash
       or current_offer.baseline_version is distinct from predecessor.baseline_version
       or current_offer.baseline_attestation is distinct from predecessor.baseline_attestation
       or current_offer.baseline_attested_at is distinct from predecessor.baseline_attested_at
       or current_offer.terms_hash is distinct from public.direct_donation_upgrade_terms_hash_v2(
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
          and candidate.commitment_version = proposal.commitment_version
          and candidate.commitment_accepted_at = proposal.commitment_accepted_at
          and candidate.status in ('primary', 'fulfilled', 'defaulted', 'closed')
         where proposal.offer_id = predecessor.id
           and proposal.status = 'accepted'
           and proposal.base_terms_hash = predecessor.terms_hash
           and proposal.accepted_offer_id = current_offer.id
           and proposal.proposed_redirect_basis_points = current_offer.redirect_basis_points
           and proposal.proposed_redirected_amount_cents = current_offer.redirected_amount_cents
           and proposal.proposed_retained_amount_cents = current_offer.retained_amount_cents
           and proposal.proposed_matcher_amount_cents = current_offer.matcher_amount_cents
           and proposal.currency = current_offer.currency
           and (candidate.status <> 'primary'
                or current_offer.winning_candidate_id = candidate.id)
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
       or successor.status not in ('matched', 'completed', 'defaulted', 'needs_review')
       or successor.selected_branch <> 'matched'
       or successor.creator_profile_id is distinct from current_offer.creator_profile_id
       or successor.environment is distinct from current_offer.environment
       or successor.privacy_mode is distinct from current_offer.privacy_mode
       or successor.creator_amount_cents is distinct from current_offer.creator_amount_cents
       or successor.currency is distinct from current_offer.currency
       or successor.match_deadline_at is distinct from current_offer.match_deadline_at
       or successor.original_recipient is distinct from current_offer.original_recipient
       or successor.upgraded_recipient is distinct from current_offer.upgraded_recipient
       or successor.original_recipient_hash is distinct from current_offer.original_recipient_hash
       or successor.upgraded_recipient_hash is distinct from current_offer.upgraded_recipient_hash
       or successor.baseline_version is distinct from current_offer.baseline_version
       or successor.baseline_attestation is distinct from current_offer.baseline_attestation
       or successor.baseline_attested_at is distinct from current_offer.baseline_attested_at
       or successor.terms_hash is distinct from public.direct_donation_upgrade_terms_hash_v2(
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
          and candidate.commitment_version = proposal.commitment_version
          and candidate.commitment_accepted_at = proposal.commitment_accepted_at
          and candidate.status in ('primary', 'fulfilled', 'defaulted', 'closed')
         where proposal.offer_id = current_offer.id
           and proposal.status = 'accepted'
           and proposal.base_terms_hash = current_offer.terms_hash
           and proposal.accepted_offer_id = successor.id
           and proposal.proposed_redirect_basis_points = successor.redirect_basis_points
           and proposal.proposed_redirected_amount_cents = successor.redirected_amount_cents
           and proposal.proposed_retained_amount_cents = successor.retained_amount_cents
           and proposal.proposed_matcher_amount_cents = successor.matcher_amount_cents
           and proposal.currency = successor.currency
           and (candidate.status <> 'primary'
                or successor.winning_candidate_id = candidate.id)
       ) then
      raise exception 'Donation Upgrade revision links require one accepted counteroffer and matching immutable provenance.';
    end if;
  end if;

  return null;
end;
$$;

drop trigger if exists direct_donation_upgrade_revision_links_consistent
  on public.direct_donation_upgrade_offers;
create constraint trigger direct_donation_upgrade_revision_links_consistent
after insert or update on public.direct_donation_upgrade_offers
deferrable initially deferred
for each row execute function public.direct_donation_upgrade_guard_revision_links();

do $migration$
begin
  if to_regprocedure(
    'public.direct_donation_upgrade_complete_obligation_20260801(uuid,boolean,text,text,text,text,integer,integer,text,text,text,timestamp with time zone,text)'
  ) is null then
    alter function public.complete_direct_donation_upgrade_obligation(
      uuid, boolean, text, text, text, text, integer, integer,
      text, text, text, timestamptz, text
    ) rename to direct_donation_upgrade_complete_obligation_20260801;
  end if;
end;
$migration$;

create or replace function public.withdraw_direct_donation_upgrade_backup(
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
  candidate_row public.direct_donation_upgrade_candidates%rowtype;
begin
  if p_expected_environment not in ('staging', 'live') then
    raise exception 'Invalid expected Direct Donation Upgrade environment.';
  end if;

  -- All offer-scoped mutations lock the offer first. This serializes backup
  -- withdrawal with lifecycle promotion and makes rank order deterministic.
  select * into offer_row
  from public.direct_donation_upgrade_offers
  where id = p_offer_id
  for update;
  if not found then
    raise exception 'Donation Upgrade not found.';
  end if;
  if offer_row.environment is distinct from p_expected_environment then
    raise exception 'The Donation Upgrade belongs to a different environment.';
  end if;

  select * into candidate_row
  from public.direct_donation_upgrade_candidates
  where offer_id = offer_row.id
    and profile_id = p_actor_profile_id
    and status = 'backup'
  for update;
  if not found then
    raise exception 'Only an unpromoted backup matcher can withdraw.';
  end if;

  update public.direct_donation_upgrade_candidates
  set status = 'withdrawn'
  where id = candidate_row.id
    and status = 'backup'
  returning * into candidate_row;
  if not found then
    raise exception 'The backup matcher changed while it was being withdrawn.';
  end if;

  perform public.direct_donation_upgrade_audit(
    offer_row.id,
    null,
    candidate_row.id,
    p_actor_profile_id,
    'backup_withdrawn',
    jsonb_build_object('rank', candidate_row.rank)
  );
  return to_jsonb(candidate_row);
end;
$$;

create or replace function public.start_direct_donation_upgrade_checkout(
  p_actor_profile_id uuid,
  p_obligation_id uuid,
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
  candidate_row public.direct_donation_upgrade_candidates%rowtype;
begin
  if p_expected_environment not in ('staging', 'live') then
    raise exception 'Invalid expected Direct Donation Upgrade environment.';
  end if;

  select offer_id into obligation_offer_id
  from public.direct_donation_upgrade_obligations
  where id = p_obligation_id
    and participant_profile_id = p_actor_profile_id;
  if not found then
    raise exception 'Donation obligation not found.';
  end if;

  -- Lock the offer before its obligation, matching webhook and lifecycle paths.
  select * into offer_row
  from public.direct_donation_upgrade_offers
  where id = obligation_offer_id
  for update;
  if not found then
    raise exception 'Donation Upgrade not found.';
  end if;
  if offer_row.environment is distinct from p_expected_environment then
    raise exception 'The Donation Upgrade belongs to a different environment.';
  end if;

  select * into obligation_row
  from public.direct_donation_upgrade_obligations
  where id = p_obligation_id
    and offer_id = offer_row.id
    and participant_profile_id = p_actor_profile_id
  for update;
  if not found then
    raise exception 'The donation obligation changed while locking.';
  end if;
  if obligation_row.environment is distinct from p_expected_environment
     or obligation_row.environment is distinct from offer_row.environment then
    raise exception 'The donation obligation belongs to a different environment.';
  end if;

  if obligation_row.status = 'verified' then
    return to_jsonb(obligation_row);
  end if;
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
    where id = obligation_row.candidate_id
      and offer_id = offer_row.id;
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
    jsonb_build_object(
      'branch', obligation_row.branch,
      'participantRole', obligation_row.participant_role
    )
  );
  return to_jsonb(obligation_row);
end;
$$;

-- Owner-only compatibility overloads preserve the original SQL regression
-- while routing every mutation through the environment-bound, offer-first
-- implementations above. Their EXECUTE privileges are revoked below.
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
  stored_environment text;
begin
  select environment into stored_environment
  from public.direct_donation_upgrade_offers
  where id = p_offer_id;
  if not found then
    raise exception 'Donation Upgrade not found.';
  end if;
  return public.join_direct_donation_upgrade_offer(
    p_actor_profile_id,
    p_offer_id,
    p_commitment_version,
    stored_environment
  );
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
  stored_environment text;
begin
  select environment into stored_environment
  from public.direct_donation_upgrade_offers
  where id = p_offer_id;
  if not found then
    raise exception 'Donation Upgrade not found.';
  end if;
  return public.withdraw_direct_donation_upgrade_backup(
    p_actor_profile_id,
    p_offer_id,
    stored_environment
  );
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
  stored_environment text;
begin
  select environment into stored_environment
  from public.direct_donation_upgrade_offers
  where id = p_offer_id;
  if not found then
    raise exception 'Donation Upgrade not found.';
  end if;
  return public.cancel_direct_donation_upgrade_offer(
    p_actor_profile_id,
    p_offer_id,
    stored_environment
  );
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
  stored_environment text;
begin
  select environment into stored_environment
  from public.direct_donation_upgrade_obligations
  where id = p_obligation_id
    and participant_profile_id = p_actor_profile_id;
  if not found then
    raise exception 'Donation obligation not found.';
  end if;
  return public.start_direct_donation_upgrade_checkout(
    p_actor_profile_id,
    p_obligation_id,
    stored_environment
  );
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
  if p_expected_environment not in ('staging', 'live') then
    raise exception 'Invalid expected Direct Donation Upgrade environment.';
  end if;

  select offer_id into obligation_offer_id
  from public.direct_donation_upgrade_obligations
  where id = p_obligation_id;
  if not found then
    raise exception 'Direct Donation Upgrade obligation not found.';
  end if;

  -- The lifecycle worker also locks offer then obligation. Retaining this order
  -- across both paths prevents an expiry/webhook lock inversion.
  select * into offer_row
  from public.direct_donation_upgrade_offers
  where id = obligation_offer_id
  for update;
  if not found then
    raise exception 'Direct Donation Upgrade offer not found.';
  end if;
  if offer_row.environment is distinct from p_expected_environment then
    raise exception 'The Direct Donation Upgrade offer belongs to a different environment.';
  end if;

  select * into obligation_row
  from public.direct_donation_upgrade_obligations
  where id = p_obligation_id
    and offer_id = obligation_offer_id
  for update;
  if not found then
    raise exception 'Direct Donation Upgrade obligation changed while locking.';
  end if;
  if obligation_row.environment is distinct from p_expected_environment
     or obligation_row.environment is distinct from offer_row.environment then
    raise exception 'The Direct Donation Upgrade obligation belongs to a different environment.';
  end if;

  if obligation_row.status = 'verified' then
    exact_replay := coalesce(p_valid, false)
      and obligation_row.provider_charge_id_hash = lower(coalesce(p_provider_charge_id_hash, ''))
      and obligation_row.provider_payload_hash = lower(coalesce(p_provider_payload_hash, ''))
      and obligation_row.provider_gross_amount_cents is not distinct from p_provider_gross_amount_cents
      and obligation_row.provider_net_amount_cents is not distinct from p_provider_net_amount_cents
      and obligation_row.provider_currency = upper(coalesce(p_provider_currency, ''))
      and obligation_row.provider_nonprofit_slug = lower(coalesce(p_provider_nonprofit_slug, ''))
      and obligation_row.provider_nonprofit_ein = regexp_replace(
        coalesce(p_provider_nonprofit_ein, ''),
        '[^0-9]',
        '',
        'g'
      )
      and obligation_row.provider_donation_date is not distinct from p_provider_donation_date
      and obligation_row.provider_payment_method = left(
        coalesce(p_provider_payment_method, ''),
        120
      );

    if exact_replay then
      return jsonb_build_object(
        'outcome', 'already_verified',
        'obligation', to_jsonb(obligation_row),
        'offer', to_jsonb(offer_row)
      );
    end if;

    update public.direct_donation_upgrade_obligations
    set status = 'needs_review',
        failure_code = 'altered_replay',
        failure_message = 'A non-identical webhook replay was received after verification.'
    where id = obligation_row.id;
    update public.direct_donation_upgrade_offers
    set status = 'needs_review',
        failure_code = 'altered_replay',
        failure_message = 'A non-identical webhook replay was received after verification.'
    where id = offer_row.id;
    perform public.direct_donation_upgrade_audit(
      offer_row.id,
      obligation_row.id,
      obligation_row.candidate_id,
      null,
      'provider_webhook_altered_replay',
      jsonb_build_object(
        'storedChargeIdHash', obligation_row.provider_charge_id_hash,
        'receivedChargeIdHash', lower(coalesce(p_provider_charge_id_hash, '')),
        'storedPayloadHash', obligation_row.provider_payload_hash,
        'receivedPayloadHash', lower(coalesce(p_provider_payload_hash, ''))
      )
    );
    return jsonb_build_object('outcome', 'needs_review', 'reason', 'altered_replay');
  end if;

  return public.direct_donation_upgrade_complete_obligation_20260801(
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
    p_provider_payment_method
  );
end;
$$;

-- Preserve the original rollback regression and owner-only maintenance surface
-- without exposing an environment-unbound overload to service_role/PostgREST.
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
  stored_environment text;
begin
  select environment into stored_environment
  from public.direct_donation_upgrade_obligations
  where id = p_obligation_id;
  if not found then
    raise exception 'Direct Donation Upgrade obligation not found.';
  end if;

  return public.complete_direct_donation_upgrade_obligation(
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
    stored_environment
  );
end;
$$;

create or replace function public.run_direct_donation_upgrade_lifecycle(
  p_now timestamptz,
  p_expected_environment text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  offer_row public.direct_donation_upgrade_offers%rowtype;
  obligation_row public.direct_donation_upgrade_obligations%rowtype;
  fallback_obligation public.direct_donation_upgrade_obligations%rowtype;
  matcher_obligation public.direct_donation_upgrade_obligations%rowtype;
  winning_candidate public.direct_donation_upgrade_candidates%rowtype;
  backup_candidate public.direct_donation_upgrade_candidates%rowtype;
  proposal_row public.direct_donation_upgrade_proposals%rowtype;
  due_at_value timestamptz;
  grace_ends_value timestamptz;
  expected_creator_count integer;
  actual_creator_count integer;
  verified_creator_count integer;
  first_unverified_creator_id uuid;
  unverified_creator_amount integer;
  fallback_selected_count integer := 0;
  completed_count integer := 0;
  defaulted_count integer := 0;
  promoted_count integer := 0;
  reminder_count integer := 0;
begin
  if p_expected_environment not in ('staging', 'live') then
    raise exception 'Invalid expected Direct Donation Upgrade environment.';
  end if;
  if p_now is null then
    raise exception 'A lifecycle processing time is required.';
  end if;

  for offer_row in
    select *
    from public.direct_donation_upgrade_offers
    where environment = p_expected_environment
      and status = 'open'
      and match_deadline_at <= p_now
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
      offer_id, candidate_id, participant_profile_id, participant_role,
      obligation_kind, branch, environment, expected_recipient,
      expected_recipient_hash, expected_amount_cents, expected_currency,
      expected_frequency, terms_hash, partner_donation_id, status, due_at,
      webhook_grace_ends_at, incremental_amount_cents, redirected_amount_cents
    ) values (
      offer_row.id, null, offer_row.creator_profile_id, 'creator',
      'creator_fallback', 'fallback', offer_row.environment,
      offer_row.original_recipient, offer_row.original_recipient_hash,
      offer_row.creator_amount_cents, 'USD', 'ONCE', offer_row.terms_hash,
      gen_random_uuid()::text, 'pending', due_at_value, grace_ends_value, 0, 0
    ) on conflict do nothing;

    for proposal_row in
      update public.direct_donation_upgrade_proposals
      set status = 'expired',
          response_message = 'The matching deadline passed without an accepted agreement.',
          responded_at = p_now
      where offer_id = offer_row.id and status = 'pending'
      returning *
    loop
      perform public.direct_donation_upgrade_notify(
        proposal_row.proposer_profile_id,
        'direct_donation_upgrade_counteroffer_expired',
        'Donation Upgrade counteroffer expired',
        'The matching deadline passed without an accepted agreement.',
        '/donation-upgrades/' || offer_row.id::text,
        'direct_donation_upgrade_counteroffer_deadline:' || proposal_row.id::text
      );
    end loop;

    perform public.direct_donation_upgrade_notify(
      offer_row.creator_profile_id,
      'direct_donation_upgrade_no_match',
      'No matcher joined',
      'Complete your originally planned direct donation within seven days.',
      '/donation-upgrades/' || offer_row.id::text,
      'direct_donation_upgrade_fallback:' || offer_row.id::text || ':' || offer_row.creator_profile_id::text
    );
    perform public.direct_donation_upgrade_audit(
      offer_row.id,
      null,
      null,
      null,
      'fallback_branch_selected',
      jsonb_build_object('dueAt', due_at_value, 'graceEndsAt', grace_ends_value)
    );
    fallback_selected_count := fallback_selected_count + 1;
  end loop;

  for obligation_row in
    select obligation.*
    from public.direct_donation_upgrade_obligations obligation
    join public.direct_donation_upgrade_offers offer on offer.id = obligation.offer_id
    where obligation.status in ('pending', 'checkout_started')
      and obligation.environment = p_expected_environment
      and offer.environment = p_expected_environment
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
      'One exact direct Donation Upgrade obligation is due within 72 hours.',
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
      and obligation.environment = p_expected_environment
      and offer.environment = p_expected_environment
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
      'Complete this exact Every.org donation before the frozen deadline.',
      '/donation-upgrades/' || obligation_row.offer_id::text,
      'direct_donation_upgrade_24h:' || obligation_row.id::text
    );
    reminder_count := reminder_count + 1;
  end loop;

  for offer_row in
    select *
    from public.direct_donation_upgrade_offers
    where environment = p_expected_environment
      and status in ('matched', 'fallback_selected')
      and webhook_grace_ends_at <= p_now
    order by webhook_grace_ends_at
    for update skip locked
  loop
    if offer_row.status = 'fallback_selected' then
      select * into fallback_obligation
      from public.direct_donation_upgrade_obligations
      where offer_id = offer_row.id
        and obligation_kind = 'creator_fallback'
      for update;

      if not found then
        update public.direct_donation_upgrade_offers
        set status = 'needs_review',
            failure_code = 'fallback_obligation_missing',
            failure_message = 'The required fallback donation obligation is missing.'
        where id = offer_row.id;
        continue;
      end if;

      if fallback_obligation.status = 'verified' then
        update public.direct_donation_upgrade_offers
        set status = 'completed',
            completed_at = coalesce(completed_at, p_now)
        where id = offer_row.id;
        completed_count := completed_count + 1;
      else
        update public.direct_donation_upgrade_obligations
        set status = 'defaulted',
            failure_code = 'creator_fallback_default',
            failure_message = 'The original direct donation was not verified before the deadline and webhook grace period.'
        where id = fallback_obligation.id
          and status in ('pending', 'checkout_started');
        update public.direct_donation_upgrade_offers
        set status = 'defaulted',
            defaulted_at = p_now,
            failure_code = 'creator_fallback_default',
            failure_message = 'The creator did not complete the original direct donation.'
        where id = offer_row.id;
        perform public.direct_donation_upgrade_record_default(
          offer_row.creator_profile_id,
          null,
          offer_row.id,
          fallback_obligation.id,
          fallback_obligation.expected_amount_cents
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
      set status = 'needs_review',
          failure_code = 'winning_candidate_missing',
          failure_message = 'The selected matcher record is missing or in an impossible state.'
      where id = offer_row.id;
      continue;
    end if;

    select * into matcher_obligation
    from public.direct_donation_upgrade_obligations
    where candidate_id = winning_candidate.id
      and obligation_kind = 'matcher_incremental'
    for update;
    if not found then
      update public.direct_donation_upgrade_offers
      set status = 'needs_review',
          failure_code = 'matcher_obligation_missing',
          failure_message = 'The current matcher donation obligation is missing.'
      where id = offer_row.id;
      continue;
    end if;

    expected_creator_count := 1 + case when offer_row.retained_amount_cents > 0 then 1 else 0 end;
    select count(*)::integer,
           count(*) filter (where status = 'verified')::integer
    into actual_creator_count, verified_creator_count
    from public.direct_donation_upgrade_obligations
    where offer_id = offer_row.id
      and participant_role = 'creator'
      and branch = 'matched';

    if actual_creator_count <> expected_creator_count
       or not exists (
         select 1
         from public.direct_donation_upgrade_obligations
         where offer_id = offer_row.id
           and obligation_kind = 'creator_redirected'
       )
       or (
         offer_row.retained_amount_cents > 0
         and not exists (
           select 1
           from public.direct_donation_upgrade_obligations
           where offer_id = offer_row.id
             and obligation_kind = 'creator_retained'
         )
       ) then
      update public.direct_donation_upgrade_offers
      set status = 'needs_review',
          failure_code = 'creator_obligation_set_invalid',
          failure_message = 'The creator donation-leg set does not match the frozen split.'
      where id = offer_row.id;
      continue;
    end if;

    if verified_creator_count = expected_creator_count
       and matcher_obligation.status = 'verified' then
      update public.direct_donation_upgrade_offers
      set status = 'completed',
          completed_at = coalesce(completed_at, p_now)
      where id = offer_row.id;
      update public.direct_donation_upgrade_candidates
      set status = 'closed'
      where offer_id = offer_row.id and status = 'backup';
      completed_count := completed_count + 1;
      continue;
    end if;

    if verified_creator_count <> expected_creator_count then
      first_unverified_creator_id := null;
      unverified_creator_amount := 0;
      select id into first_unverified_creator_id
      from public.direct_donation_upgrade_obligations
      where offer_id = offer_row.id
        and participant_role = 'creator'
        and branch = 'matched'
        and status <> 'verified'
      order by created_at, id
      limit 1;
      select coalesce(sum(expected_amount_cents), 0)::integer
      into unverified_creator_amount
      from public.direct_donation_upgrade_obligations
      where offer_id = offer_row.id
        and participant_role = 'creator'
        and branch = 'matched'
        and status <> 'verified';

      update public.direct_donation_upgrade_obligations
      set status = 'defaulted',
          failure_code = 'creator_matched_default',
          failure_message = 'A required creator donation leg was not verified before the deadline and webhook grace period.'
      where offer_id = offer_row.id
        and participant_role = 'creator'
        and branch = 'matched'
        and status in ('pending', 'checkout_started');

      if matcher_obligation.status in ('pending', 'checkout_started') then
        update public.direct_donation_upgrade_obligations
        set status = 'cancelled',
            failure_code = 'creator_defaulted',
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
      set status = 'defaulted',
          defaulted_at = p_now,
          failure_code = 'creator_matched_default',
          failure_message = 'The creator did not complete every required donation leg.'
      where id = offer_row.id;

      if first_unverified_creator_id is not null then
        perform public.direct_donation_upgrade_record_default(
          offer_row.creator_profile_id,
          winning_candidate.profile_id,
          offer_row.id,
          first_unverified_creator_id,
          unverified_creator_amount
        );
      end if;
      perform public.direct_donation_upgrade_notify(
        offer_row.creator_profile_id,
        'direct_donation_upgrade_defaulted',
        'Donation Upgrade commitment unfulfilled',
        'At least one creator donation leg was not verified before the deadline. A temporary Donation Upgrade restriction was applied.',
        '/donation-upgrades/' || offer_row.id::text,
        'direct_donation_upgrade_creator_default:' || offer_row.id::text
      );

      if matcher_obligation.status = 'verified' then
        update public.direct_donation_upgrade_candidates
        set status = 'fulfilled',
            fulfilled_at = coalesce(fulfilled_at, matcher_obligation.verified_at)
        where id = winning_candidate.id;
      end if;
      defaulted_count := defaulted_count + 1;
      continue;
    end if;

    if matcher_obligation.status <> 'verified' then
      update public.direct_donation_upgrade_obligations
      set status = 'defaulted',
          failure_code = 'matcher_default',
          failure_message = 'The selected matcher donation was not verified before the deadline and webhook grace period.'
      where id = matcher_obligation.id
        and status in ('pending', 'checkout_started');
      update public.direct_donation_upgrade_candidates
      set status = 'defaulted',
          defaulted_at = p_now
      where id = winning_candidate.id
        and status in ('primary', 'promoted');
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

      update public.direct_donation_upgrade_candidates candidate
      set status = 'closed'
      where candidate.offer_id = offer_row.id
        and candidate.status = 'backup'
        and public.direct_donation_upgrade_temporarily_restricted(candidate.profile_id);

      select * into backup_candidate
      from public.direct_donation_upgrade_candidates
      where offer_id = offer_row.id
        and status = 'backup'
        and not public.direct_donation_upgrade_temporarily_restricted(profile_id)
      order by rank
      limit 1
      for update;

      if found then
        due_at_value := p_now + interval '7 days';
        grace_ends_value := due_at_value + interval '24 hours';
        update public.direct_donation_upgrade_candidates
        set status = 'promoted',
            promoted_at = p_now
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
          offer_id, candidate_id, participant_profile_id, participant_role,
          obligation_kind, branch, environment, expected_recipient,
          expected_recipient_hash, expected_amount_cents, expected_currency,
          expected_frequency, terms_hash, partner_donation_id, status, due_at,
          webhook_grace_ends_at, incremental_amount_cents, redirected_amount_cents
        ) values (
          offer_row.id, backup_candidate.id, backup_candidate.profile_id, 'matcher',
          'matcher_incremental', 'matched', offer_row.environment,
          offer_row.upgraded_recipient, offer_row.upgraded_recipient_hash,
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
          'Your verified creator donation legs remain recorded. The promoted matcher has seven days to fulfill the additional donation.',
          '/donation-upgrades/' || offer_row.id::text,
          'direct_donation_upgrade_promoted_creator:' || offer_row.id::text || ':' || backup_candidate.id::text
        );
        promoted_count := promoted_count + 1;
      else
        update public.direct_donation_upgrade_offers
        set status = 'defaulted',
            defaulted_at = p_now,
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
    'environment', p_expected_environment,
    'processedAt', p_now
  );
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
  staging_result jsonb;
begin
  -- The immutable base rollback regression uses staging fixtures. This
  -- owner-only compatibility overload must never sweep both environments.
  staging_result := public.run_direct_donation_upgrade_lifecycle(p_now, 'staging');
  return staging_result - 'environment';
end;
$$;

revoke execute on function public.direct_donation_upgrade_guard_offer_terms()
  from public, anon, authenticated, service_role;
revoke execute on function public.direct_donation_upgrade_guard_candidate_identity()
  from public, anon, authenticated, service_role;
revoke execute on function public.direct_donation_upgrade_guard_obligation_terms()
  from public, anon, authenticated, service_role;
revoke execute on function public.direct_donation_upgrade_guard_completion()
  from public, anon, authenticated, service_role;
revoke execute on function public.direct_donation_upgrade_guard_revision_links()
  from public, anon, authenticated, service_role;
revoke execute on function public.direct_donation_upgrade_complete_obligation_20260801(uuid, boolean, text, text, text, text, integer, integer, text, text, text, timestamptz, text)
  from public, anon, authenticated, service_role;

-- The base migration and any earlier QA application can leave environment-
-- unbound overloads behind. Revoke every such overload when present so
-- PostgREST cannot resolve an insecure signature.
revoke execute on function public.create_direct_donation_upgrade_offer(uuid, text, integer, integer, timestamptz, text, jsonb, jsonb, text, text, text)
  from public, anon, authenticated, service_role;
revoke execute on function public.join_direct_donation_upgrade_offer(uuid, uuid, text)
  from public, anon, authenticated, service_role;
revoke execute on function public.withdraw_direct_donation_upgrade_backup(uuid, uuid)
  from public, anon, authenticated, service_role;
revoke execute on function public.cancel_direct_donation_upgrade_offer(uuid, uuid)
  from public, anon, authenticated, service_role;
revoke execute on function public.start_direct_donation_upgrade_checkout(uuid, uuid)
  from public, anon, authenticated, service_role;
revoke execute on function public.run_direct_donation_upgrade_lifecycle(timestamptz)
  from public, anon, authenticated, service_role;

do $privileges$
begin
  if to_regprocedure(
    'public.complete_direct_donation_upgrade_obligation(uuid,boolean,text,text,text,text,integer,integer,text,text,text,timestamp with time zone,text)'
  ) is not null then
    execute 'revoke execute on function public.complete_direct_donation_upgrade_obligation(uuid, boolean, text, text, text, text, integer, integer, text, text, text, timestamptz, text) from public, anon, authenticated, service_role';
  end if;
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

revoke execute on function public.complete_direct_donation_upgrade_obligation(uuid, boolean, text, text, text, text, integer, integer, text, text, text, timestamptz, text, text)
  from public, anon, authenticated, service_role;
revoke execute on function public.run_direct_donation_upgrade_lifecycle(timestamptz, text)
  from public, anon, authenticated, service_role;
revoke execute on function public.withdraw_direct_donation_upgrade_backup(uuid, uuid, text)
  from public, anon, authenticated, service_role;
revoke execute on function public.start_direct_donation_upgrade_checkout(uuid, uuid, text)
  from public, anon, authenticated, service_role;
revoke execute on function public.join_direct_donation_upgrade_offer(uuid, uuid, text, text)
  from public, anon, authenticated, service_role;
revoke execute on function public.propose_direct_donation_upgrade_terms(uuid, uuid, integer, integer, integer, integer, text, text, text)
  from public, anon, authenticated, service_role;
revoke execute on function public.withdraw_direct_donation_upgrade_proposal(uuid, uuid, text)
  from public, anon, authenticated, service_role;
revoke execute on function public.reject_direct_donation_upgrade_proposal(uuid, uuid, text, text)
  from public, anon, authenticated, service_role;
revoke execute on function public.accept_direct_donation_upgrade_proposal(uuid, uuid, text, text)
  from public, anon, authenticated, service_role;
revoke execute on function public.cancel_direct_donation_upgrade_offer(uuid, uuid, text)
  from public, anon, authenticated, service_role;

grant execute on function public.run_direct_donation_upgrade_lifecycle(timestamptz, text)
  to service_role;
grant execute on function public.complete_direct_donation_upgrade_obligation(uuid, boolean, text, text, text, text, integer, integer, text, text, text, timestamptz, text, text)
  to service_role;
grant execute on function public.create_direct_donation_upgrade_offer(uuid, text, integer, integer, timestamptz, text, jsonb, jsonb, text, text, text, integer)
  to service_role;
grant execute on function public.join_direct_donation_upgrade_offer(uuid, uuid, text, text)
  to service_role;
grant execute on function public.propose_direct_donation_upgrade_terms(uuid, uuid, integer, integer, integer, integer, text, text, text)
  to service_role;
grant execute on function public.withdraw_direct_donation_upgrade_proposal(uuid, uuid, text)
  to service_role;
grant execute on function public.reject_direct_donation_upgrade_proposal(uuid, uuid, text, text)
  to service_role;
grant execute on function public.accept_direct_donation_upgrade_proposal(uuid, uuid, text, text)
  to service_role;
grant execute on function public.cancel_direct_donation_upgrade_offer(uuid, uuid, text)
  to service_role;
grant execute on function public.withdraw_direct_donation_upgrade_backup(uuid, uuid, text)
  to service_role;
grant execute on function public.start_direct_donation_upgrade_checkout(uuid, uuid, text)
  to service_role;

-- Server reads remain available, but impact credit is append-only evidence that
-- only the owner-executed webhook verifier may create or mutate.
revoke insert, update, delete, truncate on public.direct_donation_upgrade_impact_credits
  from public, anon, authenticated, service_role;
grant select on public.direct_donation_upgrade_impact_credits to service_role;

comment on function public.direct_donation_upgrade_guard_completion() is
  'Prevents a split Donation Upgrade from completing until every required creator leg and the current matcher leg are provider-verified.';
