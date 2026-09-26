-- Concurrency and invariant hardening for partial Donation Upgrade redirection.
--
-- Lock order for an existing offer is: offer row first; any already-addressed
-- proposal/candidate/obligation row next; profile-eligibility advisory lock last;
-- then new participant/obligation rows. A fresh offer has no existing offer row,
-- so its creator-profile advisory lock is its first and only pre-insert lock.
-- Supported single-participant RPCs do not lock another offer after taking the
-- profile lock. The lifecycle worker can touch multiple participant profiles,
-- so its public entry point is globally serialized before it takes any offer row.

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
  -- Rounding can otherwise turn 99.99% of a small baseline into a full-cent
  -- redirect. Product semantics reserve a zero retained leg for exactly 100%.
  if (p_redirect_basis_points = 10000) is distinct from (p_retained_amount_cents = 0) then
    raise exception 'A $0 retained leg is valid only for an exact 100%% redirect.';
  end if;
end;
$$;

alter table public.direct_donation_upgrade_offers
  drop constraint if exists direct_donation_upgrade_offers_redirect_split_check;
alter table public.direct_donation_upgrade_offers
  add constraint direct_donation_upgrade_offers_redirect_split_check
  check (
    redirected_amount_cents >= 100
    and (retained_amount_cents = 0 or retained_amount_cents >= 100)
    and redirected_amount_cents + retained_amount_cents = creator_amount_cents
    and ((redirect_basis_points = 10000) = (retained_amount_cents = 0))
  );

-- Fail the additive migration rather than accepting a silently pre-existing,
-- ordinary column after an earlier ADD COLUMN IF NOT EXISTS replay.
do $generated_columns$
begin
  if not exists (
    select 1
    from pg_catalog.pg_attribute attribute
    join pg_catalog.pg_class relation on relation.oid = attribute.attrelid
    join pg_catalog.pg_namespace namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'public'
      and relation.relname = 'direct_donation_upgrade_offers'
      and attribute.attname = 'redirected_amount_cents'
      and attribute.attgenerated = 's'
  ) or not exists (
    select 1
    from pg_catalog.pg_attribute attribute
    join pg_catalog.pg_class relation on relation.oid = attribute.attrelid
    join pg_catalog.pg_namespace namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'public'
      and relation.relname = 'direct_donation_upgrade_offers'
      and attribute.attname = 'retained_amount_cents'
      and attribute.attgenerated = 's'
  ) then
    raise exception 'Donation Upgrade split amounts must remain stored generated columns.';
  end if;
end;
$generated_columns$;

create or replace function public.direct_donation_upgrade_lock_profile_eligibility(
  p_profile_id uuid
)
returns void
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  if p_profile_id is null then
    raise exception 'A profile is required for Donation Upgrade eligibility locking.';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'direct_donation_upgrade_default:' || p_profile_id::text,
      0
    )
  );
end;
$$;

create or replace function public.direct_donation_upgrade_guard_profile_eligibility()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  profile_id_value uuid;
  action_label text;
begin
  if tg_table_name = 'direct_donation_upgrade_offers' then
    -- An accepted revision retains its creator; acceptance eligibility is about
    -- the proposer, whose candidate insert is checked below.
    if new.supersedes_offer_id is not null then
      return new;
    end if;
    profile_id_value := new.creator_profile_id;
    action_label := 'creating Donation Upgrades';
  elsif tg_table_name = 'direct_donation_upgrade_proposals' then
    if tg_op <> 'INSERT' then
      return new;
    end if;
    profile_id_value := new.proposer_profile_id;
    action_label := 'proposing Donation Upgrade terms';
  elsif tg_table_name = 'direct_donation_upgrade_candidates' then
    if tg_op = 'UPDATE' and not (
      old.status = 'backup' and new.status = 'promoted'
    ) then
      return new;
    end if;
    profile_id_value := new.profile_id;
    action_label := case
      when tg_op = 'UPDATE' then 'being promoted as a Donation Upgrade matcher'
      else 'joining Donation Upgrades'
    end;
  else
    raise exception 'Unexpected Donation Upgrade eligibility trigger table: %.', tg_table_name;
  end if;

  perform public.direct_donation_upgrade_lock_profile_eligibility(profile_id_value);
  if public.direct_donation_upgrade_temporarily_restricted(profile_id_value) then
    raise exception 'This profile is temporarily restricted from % after a recent unfulfilled obligation.',
      action_label;
  end if;
  return new;
end;
$$;

drop trigger if exists direct_donation_upgrade_offer_00_profile_eligible
  on public.direct_donation_upgrade_offers;
create trigger direct_donation_upgrade_offer_00_profile_eligible
before insert on public.direct_donation_upgrade_offers
for each row execute function public.direct_donation_upgrade_guard_profile_eligibility();

drop trigger if exists direct_donation_upgrade_proposal_00_profile_eligible
  on public.direct_donation_upgrade_proposals;
create trigger direct_donation_upgrade_proposal_00_profile_eligible
before insert on public.direct_donation_upgrade_proposals
for each row execute function public.direct_donation_upgrade_guard_profile_eligibility();

drop trigger if exists direct_donation_upgrade_candidate_00_profile_eligible
  on public.direct_donation_upgrade_candidates;
create trigger direct_donation_upgrade_candidate_00_profile_eligible
before insert or update of status on public.direct_donation_upgrade_candidates
for each row execute function public.direct_donation_upgrade_guard_profile_eligibility();

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
  -- Use the same natural-key lock as offer creation, join, proposal creation,
  -- proposal acceptance, and backup promotion. Whichever transaction obtains
  -- it first establishes the serial order for eligibility versus restriction.
  perform public.direct_donation_upgrade_lock_profile_eligibility(p_profile_id);

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

-- The applied v2 creator stored only the first 2,000 attestation characters but
-- hashed the full caller input. Wrap that immutable implementation so the text
-- persisted on the offer is exactly the text committed by the terms hash.
do $create_wrapper$
begin
  if to_regprocedure(
    'public.direct_donation_upgrade_create_offer_20260813(uuid,text,integer,integer,timestamptz,text,jsonb,jsonb,text,text,text,integer)'
  ) is null then
    execute 'alter function public.create_direct_donation_upgrade_offer(uuid, text, integer, integer, timestamptz, text, jsonb, jsonb, text, text, text, integer) rename to direct_donation_upgrade_create_offer_20260813';
  end if;
end;
$create_wrapper$;

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
begin
  if p_environment is null or p_environment not in ('staging', 'live') then
    raise exception 'Invalid Direct Donation Upgrade environment.';
  end if;
  if char_length(trim(coalesce(p_baseline_attestation, ''))) > 2000 then
    raise exception 'The immutable baseline attestation must be no more than 2,000 characters.';
  end if;

  -- Normal commitment paths share this gate. The multi-offer lifecycle and
  -- provider-completion paths take its exclusive form before any offer row,
  -- so they can never retain a profile lock while waiting on an offer held by
  -- a concurrent commitment.
  perform pg_catalog.pg_advisory_xact_lock_shared(
    pg_catalog.hashtextextended(
      'moraltrade:direct-donation-upgrade-lifecycle-worker',
      0
    )
  );

  return public.direct_donation_upgrade_create_offer_20260813(
    p_creator_profile_id,
    p_environment,
    p_creator_amount_cents,
    p_matcher_amount_cents,
    p_match_deadline_at,
    p_privacy_mode,
    p_original_recipient,
    p_upgraded_recipient,
    p_baseline_version,
    p_baseline_attestation,
    p_terms_hash,
    p_redirect_basis_points
  );
end;
$$;

-- The applied join/propose/accept implementations lock the offer before their
-- final profile-eligibility trigger. Wrap them so the shared lifecycle gate is
-- always acquired before that first offer lock. Shared holders remain fully
-- concurrent with one another; only lifecycle/provider maintenance excludes
-- them.
do $commitment_wrappers$
begin
  if to_regprocedure(
    'public.direct_donation_upgrade_join_offer_20260813(uuid,uuid,text,text)'
  ) is null then
    execute 'alter function public.join_direct_donation_upgrade_offer(uuid, uuid, text, text) rename to direct_donation_upgrade_join_offer_20260813';
  end if;
  if to_regprocedure(
    'public.direct_donation_upgrade_propose_terms_20260813(uuid,uuid,integer,integer,integer,integer,text,text,text)'
  ) is null then
    execute 'alter function public.propose_direct_donation_upgrade_terms(uuid, uuid, integer, integer, integer, integer, text, text, text) rename to direct_donation_upgrade_propose_terms_20260813';
  end if;
  if to_regprocedure(
    'public.direct_donation_upgrade_accept_proposal_20260813(uuid,uuid,text,text)'
  ) is null then
    execute 'alter function public.accept_direct_donation_upgrade_proposal(uuid, uuid, text, text) rename to direct_donation_upgrade_accept_proposal_20260813';
  end if;
  if to_regprocedure(
    'public.direct_donation_upgrade_start_checkout_20260813(uuid,uuid,text)'
  ) is null then
    execute 'alter function public.start_direct_donation_upgrade_checkout(uuid, uuid, text) rename to direct_donation_upgrade_start_checkout_20260813';
  end if;
end;
$commitment_wrappers$;

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
begin
  if p_expected_environment is null
     or p_expected_environment not in ('staging', 'live') then
    raise exception 'Invalid expected Direct Donation Upgrade environment.';
  end if;
  perform pg_catalog.pg_advisory_xact_lock_shared(
    pg_catalog.hashtextextended(
      'moraltrade:direct-donation-upgrade-lifecycle-worker',
      0
    )
  );
  return public.direct_donation_upgrade_join_offer_20260813(
    p_actor_profile_id,
    p_offer_id,
    p_commitment_version,
    p_expected_environment
  );
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
begin
  if p_expected_environment is null
     or p_expected_environment not in ('staging', 'live') then
    raise exception 'Invalid expected Direct Donation Upgrade environment.';
  end if;
  perform pg_catalog.pg_advisory_xact_lock_shared(
    pg_catalog.hashtextextended(
      'moraltrade:direct-donation-upgrade-lifecycle-worker',
      0
    )
  );
  return public.direct_donation_upgrade_propose_terms_20260813(
    p_actor_profile_id,
    p_offer_id,
    p_proposed_redirect_basis_points,
    p_proposed_redirected_amount_cents,
    p_proposed_retained_amount_cents,
    p_proposed_matcher_amount_cents,
    p_message,
    p_commitment_version,
    p_expected_environment
  );
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
begin
  if p_expected_environment is null
     or p_expected_environment not in ('staging', 'live') then
    raise exception 'Invalid expected Direct Donation Upgrade environment.';
  end if;
  perform pg_catalog.pg_advisory_xact_lock_shared(
    pg_catalog.hashtextextended(
      'moraltrade:direct-donation-upgrade-lifecycle-worker',
      0
    )
  );
  return public.direct_donation_upgrade_accept_proposal_20260813(
    p_actor_profile_id,
    p_proposal_id,
    p_new_terms_hash,
    p_expected_environment
  );
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
begin
  if p_expected_environment is null
     or p_expected_environment not in ('staging', 'live') then
    raise exception 'Invalid expected Direct Donation Upgrade environment.';
  end if;
  perform pg_catalog.pg_advisory_xact_lock_shared(
    pg_catalog.hashtextextended(
      'moraltrade:direct-donation-upgrade-lifecycle-worker',
      0
    )
  );
  return public.direct_donation_upgrade_start_checkout_20260813(
    p_actor_profile_id,
    p_obligation_id,
    p_expected_environment
  );
end;
$$;

-- One lifecycle call can default one participant and promote another, and it
-- retains transaction-scoped profile locks while scanning later offers. A
-- single worker lock prevents two overlapping workers from acquiring profile
-- locks in opposite orders. Other mutations take at most one profile lock and
-- never acquire a new offer afterward.
do $lifecycle_wrapper$
begin
  if to_regprocedure(
    'public.direct_donation_upgrade_run_lifecycle_20260813(timestamptz,text)'
  ) is null then
    execute 'alter function public.run_direct_donation_upgrade_lifecycle(timestamptz, text) rename to direct_donation_upgrade_run_lifecycle_20260813';
  end if;
end;
$lifecycle_wrapper$;

create or replace function public.run_direct_donation_upgrade_lifecycle(
  p_now timestamptz,
  p_expected_environment text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  if p_expected_environment is null
     or p_expected_environment not in ('staging', 'live') then
    raise exception 'Invalid expected Direct Donation Upgrade environment.';
  end if;
  if p_now is null then
    raise exception 'A lifecycle processing time is required.';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'moraltrade:direct-donation-upgrade-lifecycle-worker',
      0
    )
  );

  return public.direct_donation_upgrade_run_lifecycle_20260813(
    p_now,
    p_expected_environment
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
  affected_offer_id uuid;
  normalized_charge_hash text;
  exact_replay boolean;
  completion_result jsonb;
begin
  if p_expected_environment is null
     or p_expected_environment not in ('staging', 'live') then
    raise exception 'Invalid expected Direct Donation Upgrade environment.';
  end if;

  -- Use the lifecycle worker's global outer lock before the charge-specific
  -- lock. A lifecycle transaction can retain multiple offer locks in deadline
  -- order, whereas charge reuse locks multiple offers in UUID order; excluding
  -- those paths prevents a cross-order cycle.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'moraltrade:direct-donation-upgrade-lifecycle-worker',
      0
    )
  );

  normalized_charge_hash := lower(coalesce(p_provider_charge_id_hash, ''));
  if normalized_charge_hash ~ '^[0-9a-f]{64}$' then
    -- The frozen verifier reacquires this transaction-reentrant lock. Take it
    -- before discovering either the current or a prior use of the charge so
    -- the complete affected-offer set is stable for canonical row locking.
    perform pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended(normalized_charge_hash, 0)
    );
  end if;

  select offer_id into obligation_offer_id
  from public.direct_donation_upgrade_obligations
  where id = p_obligation_id;
  if not found then
    raise exception 'Direct Donation Upgrade obligation not found.';
  end if;

  if normalized_charge_hash ~ '^[0-9a-f]{64}$' then
    -- The charge lock above makes the set of prior uses stable while we lock
    -- every affected offer in UUID order. Only then may the verifier lock either
    -- the current or a duplicate obligation. This preserves the lifecycle's
    -- offer-before-obligation order even on charge reuse.
    for affected_offer_id in
      select affected_offer.id
      from public.direct_donation_upgrade_offers affected_offer
      where affected_offer.id in (
        select affected_obligation.offer_id
        from public.direct_donation_upgrade_obligations affected_obligation
        where affected_obligation.id = p_obligation_id
           or affected_obligation.provider_charge_id_hash = normalized_charge_hash
      )
      order by affected_offer.id
      for update
    loop
      null;
    end loop;
  else
    perform 1
    from public.direct_donation_upgrade_offers
    where id = obligation_offer_id
    for update;
  end if;

  select * into offer_row
  from public.direct_donation_upgrade_offers
  where id = obligation_offer_id;
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

  completion_result := public.direct_donation_upgrade_complete_obligation_20260801(
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

  if completion_result->>'reason' = 'provider_charge_reused' then
    -- The frozen verifier deliberately preserves completed offers for ordinary
    -- late failures, but charge reuse invalidates the evidence behind every
    -- affected completion. Hide and review all affected offers, including one
    -- that had already reached completed before the charge was reused.
    update public.direct_donation_upgrade_offers affected_offer
    set status = 'needs_review',
        failure_code = 'provider_charge_reused',
        failure_message = 'One provider charge was presented for multiple obligations.'
    where affected_offer.id in (
      select distinct affected_obligation.offer_id
      from public.direct_donation_upgrade_obligations affected_obligation
      where affected_obligation.id = p_obligation_id
         or affected_obligation.provider_charge_id_hash = lower(p_provider_charge_id_hash)
    );
  end if;

  return completion_result;
end;
$$;

revoke execute on function public.direct_donation_upgrade_lock_profile_eligibility(uuid)
  from public, anon, authenticated, service_role;
revoke execute on function public.direct_donation_upgrade_guard_profile_eligibility()
  from public, anon, authenticated, service_role;
revoke execute on function public.direct_donation_upgrade_record_default(uuid, uuid, uuid, uuid, integer)
  from public, anon, authenticated, service_role;
revoke execute on function public.direct_donation_upgrade_create_offer_20260813(uuid, text, integer, integer, timestamptz, text, jsonb, jsonb, text, text, text, integer)
  from public, anon, authenticated, service_role;
revoke execute on function public.direct_donation_upgrade_join_offer_20260813(uuid, uuid, text, text)
  from public, anon, authenticated, service_role;
revoke execute on function public.direct_donation_upgrade_propose_terms_20260813(uuid, uuid, integer, integer, integer, integer, text, text, text)
  from public, anon, authenticated, service_role;
revoke execute on function public.direct_donation_upgrade_accept_proposal_20260813(uuid, uuid, text, text)
  from public, anon, authenticated, service_role;
revoke execute on function public.direct_donation_upgrade_start_checkout_20260813(uuid, uuid, text)
  from public, anon, authenticated, service_role;
revoke execute on function public.direct_donation_upgrade_run_lifecycle_20260813(timestamptz, text)
  from public, anon, authenticated, service_role;
revoke execute on function public.create_direct_donation_upgrade_offer(uuid, text, integer, integer, timestamptz, text, jsonb, jsonb, text, text, text, integer)
  from public, anon, authenticated, service_role;
revoke execute on function public.join_direct_donation_upgrade_offer(uuid, uuid, text, text)
  from public, anon, authenticated, service_role;
revoke execute on function public.propose_direct_donation_upgrade_terms(uuid, uuid, integer, integer, integer, integer, text, text, text)
  from public, anon, authenticated, service_role;
revoke execute on function public.accept_direct_donation_upgrade_proposal(uuid, uuid, text, text)
  from public, anon, authenticated, service_role;
revoke execute on function public.start_direct_donation_upgrade_checkout(uuid, uuid, text)
  from public, anon, authenticated, service_role;
revoke execute on function public.run_direct_donation_upgrade_lifecycle(timestamptz, text)
  from public, anon, authenticated, service_role;
revoke execute on function public.complete_direct_donation_upgrade_obligation(uuid, boolean, text, text, text, text, integer, integer, text, text, text, timestamptz, text, text)
  from public, anon, authenticated, service_role;
grant execute on function public.create_direct_donation_upgrade_offer(uuid, text, integer, integer, timestamptz, text, jsonb, jsonb, text, text, text, integer)
  to service_role;
grant execute on function public.join_direct_donation_upgrade_offer(uuid, uuid, text, text)
  to service_role;
grant execute on function public.propose_direct_donation_upgrade_terms(uuid, uuid, integer, integer, integer, integer, text, text, text)
  to service_role;
grant execute on function public.accept_direct_donation_upgrade_proposal(uuid, uuid, text, text)
  to service_role;
grant execute on function public.start_direct_donation_upgrade_checkout(uuid, uuid, text)
  to service_role;
grant execute on function public.run_direct_donation_upgrade_lifecycle(timestamptz, text)
  to service_role;
grant execute on function public.complete_direct_donation_upgrade_obligation(uuid, boolean, text, text, text, text, integer, integer, text, text, text, timestamptz, text, text)
  to service_role;

comment on function public.direct_donation_upgrade_lock_profile_eligibility(uuid) is
  'Serializes Donation Upgrade commitments and default restrictions for one profile natural key.';
comment on function public.direct_donation_upgrade_guard_profile_eligibility() is
  'Rechecks temporary restriction state under the shared profile lock at offer, proposal, candidate, and promotion mutation boundaries.';
