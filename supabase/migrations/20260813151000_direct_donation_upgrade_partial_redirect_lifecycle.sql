-- Generalize Donation Upgrade completion and lifecycle handling for partial
-- redirection. The existing provider webhook remains the only authority that can
-- verify an obligation or create impact credit.

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
  return new;
end;
$$;

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
    expected_creator_count := 1 + case when new.retained_amount_cents > 0 then 1 else 0 end;

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
         new.retained_amount_cents > 0
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
    where status in ('matched', 'fallback_selected')
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
    'processedAt', p_now
  );
end;
$$;

revoke execute on function public.direct_donation_upgrade_guard_completion()
  from public, anon, authenticated;
revoke execute on function public.run_direct_donation_upgrade_lifecycle(timestamptz)
  from public, anon, authenticated;
grant execute on function public.run_direct_donation_upgrade_lifecycle(timestamptz)
  to service_role;

comment on function public.direct_donation_upgrade_guard_completion() is
  'Prevents a split Donation Upgrade from completing until every required creator leg and the current matcher leg are provider-verified.';
