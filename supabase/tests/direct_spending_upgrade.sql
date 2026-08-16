begin;

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, confirmation_token, recovery_token,
  email_change_token_new, email_change_token_current, reauthentication_token,
  is_sso_user, is_anonymous, created_at, updated_at
)
select
  fixture.id,
  '00000000-0000-0000-0000-000000000000'::uuid,
  'authenticated',
  'authenticated',
  fixture.email,
  '',
  timezone('utc', now()),
  '{"provider":"email","providers":["email"]}'::jsonb,
  jsonb_build_object('display_name', fixture.display_name, 'qa_fixture', true),
  '', '', '', '', '', false, false,
  timezone('utc', now()),
  timezone('utc', now())
from (values
  ('e1000000-0000-4000-8000-000000000001'::uuid, 'spending-creator@example.test', 'Spending Creator'),
  ('e2000000-0000-4000-8000-000000000002'::uuid, 'spending-matcher@example.test', 'Spending Matcher'),
  ('e3000000-0000-4000-8000-000000000003'::uuid, 'spending-reviewer@example.test', 'Spending Reviewer'),
  ('e4000000-0000-4000-8000-000000000004'::uuid, 'spending-reviewer-two@example.test', 'Spending Reviewer Two'),
  ('e5000000-0000-4000-8000-000000000005'::uuid, 'spending-creator-two@example.test', 'Spending Creator Two')
) as fixture(id, email, display_name);

insert into public.profiles (id, email, display_name, bio)
values
  ('e1000000-0000-4000-8000-000000000001', 'spending-creator@example.test', 'Spending Creator', ''),
  ('e2000000-0000-4000-8000-000000000002', 'spending-matcher@example.test', 'Spending Matcher', ''),
  ('e3000000-0000-4000-8000-000000000003', 'spending-reviewer@example.test', 'Spending Reviewer', ''),
  ('e4000000-0000-4000-8000-000000000004', 'spending-reviewer-two@example.test', 'Spending Reviewer Two', ''),
  ('e5000000-0000-4000-8000-000000000005', 'spending-creator-two@example.test', 'Spending Creator Two', '')
on conflict (id) do update set
  email = excluded.email,
  display_name = excluded.display_name;

create or replace function pg_temp.make_spending_offer(
  p_creator_profile_id uuid,
  p_fingerprint_character text,
  p_match_window interval default interval '7 days',
  p_planned_spend_amount_cents integer default 1050,
  p_creator_diversion_amount_cents integer default 1001,
  p_matcher_amount_cents integer default 1500,
  p_privacy_mode text default 'private_until_completed'
)
returns jsonb
language plpgsql
as $test$
declare
  captured_at timestamptz := timezone('utc', now());
  deadline_at timestamptz := timezone('utc', now()) + p_match_window;
  evidence_payload jsonb := jsonb_build_object(
    'recordKind', 'prospective_nonessential_expense',
    'amountCents', p_planned_spend_amount_cents,
    'privateReference', p_fingerprint_character
  );
  evidence_hash text;
  baseline_fingerprint text := repeat(lower(p_fingerprint_character), 64);
  upgraded_recipient jsonb := jsonb_build_object(
    'schemaVersion', 'moral-trade-every-org-nonprofit-identity-v1',
    'provider', 'every_org',
    'providerNonprofitId', 'qa-givewell-top-charities-fund',
    'name', 'GiveWell Top Charities Fund',
    'primarySlug', 'givewell-top-charities-fund',
    'ein', '',
    'isDisbursable', true,
    'profileUrl', 'https://www.every.org/givewell-top-charities-fund',
    'websiteUrl', 'https://www.givewell.org/top-charities-fund',
    'locationAddress', 'United States',
    'description', 'Rollback-only QA fixture.',
    'logoUrl', '',
    'identityHash', repeat('2', 64)
  );
  terms_hash text;
begin
  evidence_hash := public.direct_spending_upgrade_evidence_hash_v1(
    evidence_payload,
    captured_at
  );
  terms_hash := public.direct_spending_upgrade_terms_hash_v1(
    p_creator_profile_id,
    'pending_order_or_upgrade',
    'cancel',
    p_planned_spend_amount_cents,
    p_creator_diversion_amount_cents,
    p_matcher_amount_cents,
    repeat('2', 64),
    deadline_at,
    p_privacy_mode,
    'staging',
    evidence_hash,
    captured_at,
    baseline_fingerprint
  );
  return public.create_direct_spending_upgrade_offer(
    p_creator_profile_id,
    'staging',
    'pending_order_or_upgrade',
    'Private QA merchant',
    'Rollback-only prospective nonessential order that has not yet been completed.',
    p_planned_spend_amount_cents,
    p_creator_diversion_amount_cents,
    'cancel',
    evidence_payload,
    evidence_hash,
    captured_at,
    baseline_fingerprint,
    p_matcher_amount_cents,
    deadline_at,
    p_privacy_mode,
    upgraded_recipient,
    repeat('2', 64),
    terms_hash,
    true,
    true,
    true,
    true,
    true,
    true
  );
end;
$test$;

create or replace function pg_temp.accept_spending_baseline(
  p_offer_result jsonb,
  p_reviewer_profile_id uuid,
  p_key text
)
returns void
language plpgsql
as $test$
declare
  baseline_id uuid := (p_offer_result->'baseline'->>'id')::uuid;
  offer_id uuid := (p_offer_result->'offer'->>'id')::uuid;
  assignment_result jsonb;
  assignment_id uuid;
  decision_hash text;
begin
  assignment_result := public.assign_direct_spending_upgrade_reviewer(
    baseline_id,
    null,
    'baseline',
    p_reviewer_profile_id,
    true,
    'direct-spending-upgrade-assigned-reviewer-v1-2026-08-14'
  );
  assignment_id := (assignment_result->'assignment'->>'id')::uuid;
  decision_hash := public.direct_spending_upgrade_review_decision_hash_v1(
    assignment_id,
    baseline_id,
    null,
    null,
    'baseline',
    p_reviewer_profile_id,
    'accepted',
    '{}'::text[],
    'Rollback-only prospective baseline review.',
    p_key
  );
  perform public.record_direct_spending_upgrade_review_decision(
    p_reviewer_profile_id,
    assignment_id,
    null,
    'accepted',
    '{}'::text[],
    'Rollback-only prospective baseline review.',
    p_key,
    decision_hash
  );
  if not exists (
    select 1
    from public.direct_spending_upgrade_baselines
    where id = baseline_id and review_status = 'accepted'
  ) or not exists (
    select 1
    from public.direct_spending_upgrade_offers
    where id = offer_id and status = 'open'
  ) then
    raise exception 'Accepted prospective baseline did not open its offer.';
  end if;
end;
$test$;

do $test$
#variable_conflict use_variable
declare
  creator_id constant uuid := 'e1000000-0000-4000-8000-000000000001';
  matcher_id constant uuid := 'e2000000-0000-4000-8000-000000000002';
  reviewer_id constant uuid := 'e3000000-0000-4000-8000-000000000003';
  reviewer_two_id constant uuid := 'e4000000-0000-4000-8000-000000000004';
  creator_two_id constant uuid := 'e5000000-0000-4000-8000-000000000005';
  offer_result jsonb;
  baseline_id uuid;
  offer_id uuid;
  candidate_id uuid;
  creator_obligation_id uuid;
  matcher_obligation_id uuid;
  tampered_obligation_id uuid := gen_random_uuid();
  replacement_candidate_id uuid;
  evidence_id uuid;
  assignment_result jsonb;
  assignment_id uuid;
  decision_hash text;
  captured_at timestamptz;
  evidence_payload jsonb;
  completion_result jsonb;
  immutable_blocked boolean := false;
  manual_completion_blocked boolean := false;
  obligation_tamper_blocked boolean := false;
  winner_tamper_blocked boolean := false;
  matched_reopen_blocked boolean := false;
  credit_tamper_blocked boolean := false;
  self_match_blocked boolean := false;
  counterparty_review_blocked boolean := false;
  reviewer_match_blocked boolean := false;
  reviewer_proposal_blocked boolean := false;
  terminal_baseline_review_blocked boolean := false;
  unassigned_review_blocked boolean := false;
  active_evidence_blocked boolean := false;
  terminal_evidence_resubmit_blocked boolean := false;
  duplicate_blocked boolean := false;
  excluded_category_blocked boolean := false;
  unsupported_action_blocked boolean := false;
  false_attestation_blocked boolean := false;
  cancelled_offer_id uuid;
  expired_offer_id uuid;
  rejected_offer_id uuid;
  unavailable_offer_id uuid;
  rejected_baseline_id uuid;
  unavailable_baseline_id uuid;
  rejected_creator_obligation_id uuid;
  rejected_matcher_obligation_id uuid;
  unavailable_creator_obligation_id uuid;
begin
  -- An unmatched candidate is only a frozen, review-required offer. It has no
  -- donation, checkout, purchase, transfer, or impact obligation.
  offer_result := pg_temp.make_spending_offer(creator_id, 'a');
  cancelled_offer_id := (offer_result->'offer'->>'id')::uuid;
  if offer_result->>'outcome' <> 'review_required'
     or exists (
       select 1 from public.direct_spending_upgrade_obligations
       where direct_spending_upgrade_obligations.offer_id = cancelled_offer_id
     )
     or exists (
       select 1 from public.direct_spending_upgrade_impact_credits
       where direct_spending_upgrade_impact_credits.offer_id = cancelled_offer_id
     ) then
    raise exception 'An unmatched Spending Upgrade created an obligation or credit.';
  end if;
  perform public.cancel_direct_spending_upgrade_offer(
    creator_id,
    cancelled_offer_id,
    'staging'
  );
  if not exists (
    select 1 from public.direct_spending_upgrade_offers
    where id = cancelled_offer_id
      and status = 'cancelled'
      and fulfillment_deadline_at is null
      and webhook_grace_ends_at is null
      and winning_candidate_id is null
  ) then
    raise exception 'Unmatched cancellation did not remain obligation-free.';
  end if;

  -- An accepted baseline that reaches its matching deadline also expires with
  -- zero obligations and zero credit.
  offer_result := pg_temp.make_spending_offer(
    creator_two_id,
    'b',
    interval '2 hours'
  );
  expired_offer_id := (offer_result->'offer'->>'id')::uuid;
  perform pg_temp.accept_spending_baseline(
    offer_result,
    reviewer_id,
    'baseline-expiry'
  );
  perform public.run_direct_spending_upgrade_lifecycle(
    timezone('utc', now()) + interval '3 hours',
    'staging'
  );
  if not exists (
    select 1 from public.direct_spending_upgrade_offers
    where id = expired_offer_id and status = 'expired'
  ) or exists (
    select 1 from public.direct_spending_upgrade_obligations
    where direct_spending_upgrade_obligations.offer_id = expired_offer_id
  ) or exists (
    select 1 from public.direct_spending_upgrade_impact_credits
    where direct_spending_upgrade_impact_credits.offer_id = expired_offer_id
  ) then
    raise exception 'Unmatched expiry created a donation obligation or impact credit.';
  end if;
  begin
    update public.direct_spending_upgrade_offers
    set status = 'completed',
        spending_change_review_status = 'accepted',
        completed_at = timezone('utc', now())
    where id = expired_offer_id;
  exception when others then
    manual_completion_blocked :=
      position('exactly two frozen obligations' in lower(sqlerrm)) > 0
      or position('two current provider-bound credits' in lower(sqlerrm)) > 0
      or position('terminal unmatched spending upgrade cannot be reopened' in lower(sqlerrm)) > 0;
  end;
  if not manual_completion_blocked then
    raise exception 'An unmatched Spending Upgrade was manually marked completed.';
  end if;

  -- Primary success path uses an exact-cent remainder below one dollar.
  offer_result := pg_temp.make_spending_offer(creator_id, 'c');
  baseline_id := (offer_result->'baseline'->>'id')::uuid;
  offer_id := (offer_result->'offer'->>'id')::uuid;
  if exists (
    select 1 from public.direct_spending_upgrade_public_offers where id = offer_id
  ) then
    raise exception 'A review-required private baseline entered the public projection.';
  end if;
  perform pg_temp.accept_spending_baseline(
    offer_result,
    reviewer_id,
    'baseline-main'
  );
  if not exists (
    select 1
    from public.direct_spending_upgrade_offers
    where id = offer_id
      and creator_diversion_amount_cents = 1001
      and retained_spending_amount_cents = 49
      and diversion_basis_points = public.direct_spending_upgrade_diversion_basis_points(1050, 1001)
  ) then
    raise exception 'Exact-cent diversion or sub-dollar remainder was not preserved.';
  end if;

  begin
    perform public.assign_direct_spending_upgrade_reviewer(
      baseline_id,
      null,
      'baseline',
      reviewer_two_id,
      true,
      'direct-spending-upgrade-assigned-reviewer-v1-2026-08-14'
    );
  exception when others then
    terminal_baseline_review_blocked :=
      position('append-only correction' in lower(sqlerrm)) > 0;
  end;
  if not terminal_baseline_review_blocked then
    raise exception 'An accepted prospective baseline received a replacement ordinary review.';
  end if;

  begin
    perform public.propose_direct_spending_upgrade_terms(
      reviewer_id,
      offer_id,
      1001,
      1500,
      'Reviewer must not become the counterparty.',
      'direct-spending-upgrade-proposal-v1-2026-08-14',
      'staging'
    );
  exception when others then
    reviewer_proposal_blocked := position('reviewer cannot become' in lower(sqlerrm)) > 0;
  end;
  if not reviewer_proposal_blocked then
    raise exception 'A baseline reviewer was able to propose as the counterparty.';
  end if;

  begin
    perform public.join_direct_spending_upgrade_offer(
      reviewer_id,
      offer_id,
      'direct-spending-upgrade-matcher-v1-2026-08-14',
      'staging'
    );
  exception when others then
    reviewer_match_blocked := position('reviewer cannot become' in lower(sqlerrm)) > 0;
  end;
  if not reviewer_match_blocked then
    raise exception 'A baseline reviewer was able to match as the counterparty.';
  end if;

  begin
    perform public.join_direct_spending_upgrade_offer(
      creator_id,
      offer_id,
      'direct-spending-upgrade-matcher-v1-2026-08-14',
      'staging'
    );
  exception when others then
    self_match_blocked := position('cannot match' in lower(sqlerrm)) > 0;
  end;
  if not self_match_blocked then
    raise exception 'A creator was able to self-match a Spending Upgrade.';
  end if;

  candidate_id := (
    public.join_direct_spending_upgrade_offer(
      matcher_id,
      offer_id,
      'direct-spending-upgrade-matcher-v1-2026-08-14',
      'staging'
    )->'candidate'->>'id'
  )::uuid;
  if (select count(*) from public.direct_spending_upgrade_obligations obligation
      where obligation.offer_id = offer_id) <> 2
     or (select count(*) from public.direct_spending_upgrade_obligations obligation
         where obligation.offer_id = offer_id
           and obligation.obligation_kind = 'creator_converted_spending'
           and obligation.expected_amount_cents = 1001
           and obligation.expected_recipient_hash = repeat('2', 64)) <> 1
     or (select count(*) from public.direct_spending_upgrade_obligations obligation
         where obligation.offer_id = offer_id
           and obligation.obligation_kind = 'matcher_incremental'
           and obligation.expected_amount_cents = 1500
           and obligation.expected_recipient_hash = repeat('2', 64)) <> 1 then
    raise exception 'Matching did not create exactly the two direct same-recipient donations.';
  end if;
  select id into creator_obligation_id
  from public.direct_spending_upgrade_obligations
  where direct_spending_upgrade_obligations.offer_id = offer_id
    and obligation_kind = 'creator_converted_spending';
  select id into matcher_obligation_id
  from public.direct_spending_upgrade_obligations
  where direct_spending_upgrade_obligations.offer_id = offer_id
    and obligation_kind = 'matcher_incremental';

  insert into public.direct_spending_upgrade_candidates(
    offer_id, profile_id, status, commitment_version
  ) values (
    offer_id,
    creator_two_id,
    'closed',
    'direct-spending-upgrade-matcher-v1-2026-08-14'
  ) returning id into replacement_candidate_id;
  begin
    update public.direct_spending_upgrade_offers
    set winning_candidate_id = replacement_candidate_id
    where id = offer_id;
  exception when others then
    winner_tamper_blocked :=
      position('matched spending upgrade identity' in lower(sqlerrm)) > 0;
  end;
  if not winner_tamper_blocked then
    raise exception 'A matched Spending Upgrade winner escaped frozen identity.';
  end if;

  begin
    update public.direct_spending_upgrade_offers
    set status = 'open'
    where id = offer_id;
  exception when others then
    matched_reopen_blocked :=
      position('cannot return to an unmatched state' in lower(sqlerrm)) > 0;
  end;
  if not matched_reopen_blocked then
    raise exception 'A matched Spending Upgrade returned to an unmatched state.';
  end if;

  begin
    insert into public.direct_spending_upgrade_obligations(
      id, offer_id, candidate_id, participant_profile_id, participant_role,
      obligation_kind, environment, expected_recipient,
      expected_recipient_hash, expected_amount_cents, terms_hash,
      partner_donation_id, due_at, webhook_grace_ends_at
    )
    select
      tampered_obligation_id, offer_id, candidate_id, participant_profile_id,
      participant_role, obligation_kind, environment, expected_recipient,
      expected_recipient_hash, expected_amount_cents + 1, terms_hash,
      'direct-spending-upgrade:' || environment || ':' || tampered_obligation_id::text,
      due_at, webhook_grace_ends_at
    from public.direct_spending_upgrade_obligations
    where id = creator_obligation_id;
  exception when others then
    obligation_tamper_blocked := position('frozen terms' in lower(sqlerrm)) > 0;
  end;
  if not obligation_tamper_blocked then
    raise exception 'A Spending Upgrade obligation escaped frozen database terms.';
  end if;

  begin
    perform public.assign_direct_spending_upgrade_reviewer(
      baseline_id,
      offer_id,
      'spending_change',
      matcher_id,
      true,
      'direct-spending-upgrade-assigned-reviewer-v1-2026-08-14'
    );
  exception when others then
    counterparty_review_blocked := position('counterparty' in lower(sqlerrm)) > 0;
  end;
  if not counterparty_review_blocked then
    raise exception 'The matcher was able to review creator spending evidence.';
  end if;

  perform public.start_direct_spending_upgrade_checkout(
    matcher_id,
    matcher_obligation_id,
    'staging'
  );
  completion_result := public.complete_direct_spending_upgrade_obligation(
    matcher_obligation_id,
    true,
    '',
    '',
    repeat('3', 64),
    repeat('4', 64),
    1500,
    1455,
    'USD',
    'givewell-top-charities-fund',
    '',
    timezone('utc', now()),
    'card',
    'staging'
  );
  if completion_result->>'outcome' <> 'donation_verified'
     or (select count(*) from public.direct_spending_upgrade_impact_credits credit
         where credit.offer_id = offer_id
           and credit.credit_kind = 'matcher_incremental'
           and credit.incremental_gross_amount_cents = 1500
           and credit.incremental_net_amount_cents = 1455) <> 1
     or exists (
       select 1 from public.direct_spending_upgrade_impact_credits credit
       where credit.offer_id = offer_id and credit.credit_kind = 'converted_spending'
     ) then
    raise exception 'Matcher donation was not recorded independently and exactly.';
  end if;

  begin
    insert into public.direct_spending_upgrade_impact_credits(
      offer_id, obligation_id, profile_id, credit_kind, recipient_hash,
      verified_gross_amount_cents, verified_net_amount_cents,
      converted_spending_gross_amount_cents,
      converted_spending_net_amount_cents,
      incremental_gross_amount_cents, incremental_net_amount_cents,
      provider_charge_id_hash, evidence_decision_id, verified_at
    )
    select
      offer_id, id, creator_id, 'matcher_incremental', expected_recipient_hash,
      provider_gross_amount_cents, provider_net_amount_cents, 0, 0,
      provider_gross_amount_cents, provider_net_amount_cents,
      provider_charge_id_hash, null, verified_at
    from public.direct_spending_upgrade_obligations
    where id = matcher_obligation_id;
  exception when others then
    credit_tamper_blocked := position('provider-verified identity' in lower(sqlerrm)) > 0;
  end;
  if not credit_tamper_blocked then
    raise exception 'A Spending Upgrade credit escaped its verified obligation identity.';
  end if;

  completion_result := public.complete_direct_spending_upgrade_obligation(
    creator_obligation_id,
    true,
    '',
    '',
    repeat('5', 64),
    repeat('6', 64),
    1001,
    970,
    'USD',
    'givewell-top-charities-fund',
    '',
    timezone('utc', now()),
    'bank',
    'staging'
  );
  if completion_result->>'outcome' <> 'donation_verified_waiting_for_spending_review'
     or exists (
       select 1 from public.direct_spending_upgrade_impact_credits credit
       where credit.offer_id = offer_id and credit.credit_kind = 'converted_spending'
     )
     or exists (
       select 1 from public.direct_spending_upgrade_offers
       where id = offer_id and status = 'completed'
     ) then
    raise exception 'Creator donation verification incorrectly proved converted spending.';
  end if;
  completion_result := public.complete_direct_spending_upgrade_obligation(
    creator_obligation_id,
    true,
    '',
    '',
    repeat('5', 64),
    repeat('f', 64),
    1001,
    970,
    'USD',
    'givewell-top-charities-fund',
    '',
    timezone('utc', now()),
    'bank',
    'staging'
  );
  if completion_result->>'outcome' <> 'needs_review'
     or completion_result->>'reason' <> 'altered_replay' then
    raise exception 'An altered pre-credit webhook did not fail closed.';
  end if;

  captured_at := timezone('utc', now());
  evidence_payload := jsonb_build_object(
    'changeKind', 'order_cancelled',
    'privateCancellationReference', 'qa-private-order-reference'
  );
  evidence_id := (
    public.submit_direct_spending_upgrade_change_evidence(
      creator_id,
      offer_id,
      evidence_payload,
      public.direct_spending_upgrade_change_evidence_hash_v1(
        offer_id,
        evidence_payload,
        captured_at
      ),
      captured_at,
      'main-change-evidence',
      'staging'
    )->>'evidenceId'
  )::uuid;
  if exists (
    select 1 from public.direct_spending_upgrade_impact_credits credit
    where credit.offer_id = offer_id and credit.credit_kind = 'converted_spending'
  ) or not exists (
    select 1
    from public.direct_spending_upgrade_offers
    where id = offer_id
      and status = 'needs_review'
      and spending_change_review_status = 'review_required'
      and failure_code = 'altered_replay'
  ) then
    raise exception 'Submitting unreviewed spending evidence minted credit or masked provider review.';
  end if;
  begin
    perform public.submit_direct_spending_upgrade_change_evidence(
      creator_id,
      offer_id,
      jsonb_build_object(
        'changeKind', 'order_cancelled',
        'privateCancellationReference', 'second-active-record'
      ),
      public.direct_spending_upgrade_change_evidence_hash_v1(
        offer_id,
        jsonb_build_object(
          'changeKind', 'order_cancelled',
          'privateCancellationReference', 'second-active-record'
        ),
        captured_at
      ),
      captured_at,
      'second-active-change-evidence',
      'staging'
    );
  exception when others then
    active_evidence_blocked := position('already awaiting' in lower(sqlerrm)) > 0;
  end;
  if not active_evidence_blocked then
    raise exception 'More than one active Spending Upgrade evidence record was accepted.';
  end if;

  completion_result := public.complete_direct_spending_upgrade_obligation(
    creator_obligation_id,
    true,
    '',
    '',
    repeat('5', 64),
    repeat('6', 64),
    1001,
    970,
    'USD',
    'givewell-top-charities-fund',
    '',
    timezone('utc', now()),
    'bank',
    'staging'
  );
  if completion_result->>'outcome' <> 'donation_verified_waiting_for_spending_review'
     or not exists (
       select 1
       from public.direct_spending_upgrade_offers
       where id = offer_id
         and status = 'matched'
         and failure_code = ''
     ) then
    raise exception 'An exact pre-credit webhook did not clear only the provider review state.';
  end if;

  assignment_result := public.assign_direct_spending_upgrade_reviewer(
    baseline_id,
    offer_id,
    'spending_change',
    reviewer_two_id,
    true,
    'direct-spending-upgrade-assigned-reviewer-v1-2026-08-14'
  );
  assignment_id := (assignment_result->'assignment'->>'id')::uuid;
  decision_hash := public.direct_spending_upgrade_review_decision_hash_v1(
    assignment_id,
    baseline_id,
    offer_id,
    evidence_id,
    'spending_change',
    reviewer_two_id,
    'accepted',
    array['private_record_consistent'],
    'Rollback-only spending-change review.',
    'main-change-accept'
  );
  begin
    perform public.record_direct_spending_upgrade_review_decision(
      reviewer_id,
      assignment_id,
      evidence_id,
      'accepted',
      array['private_record_consistent'],
      'Rollback-only spending-change review.',
      'main-change-accept',
      decision_hash
    );
  exception when others then
    unassigned_review_blocked := position('assigned scoped reviewer' in lower(sqlerrm)) > 0;
  end;
  if not unassigned_review_blocked then
    raise exception 'An unassigned reviewer was able to decide spending evidence.';
  end if;
  perform public.record_direct_spending_upgrade_review_decision(
    reviewer_two_id,
    assignment_id,
    evidence_id,
    'accepted',
    array['private_record_consistent'],
    'Rollback-only spending-change review.',
    'main-change-accept',
    decision_hash
  );
  perform public.record_direct_spending_upgrade_review_decision(
    reviewer_two_id,
    assignment_id,
    evidence_id,
    'accepted',
    array['private_record_consistent'],
    'Rollback-only spending-change review.',
    'main-change-accept',
    decision_hash
  );
  if (select count(*) from public.direct_spending_upgrade_impact_credits credit
      where credit.offer_id = offer_id
        and credit.credit_kind = 'converted_spending'
        and credit.converted_spending_gross_amount_cents = 1001
        and credit.converted_spending_net_amount_cents = 970
        and credit.evidence_decision_id is not null) <> 1
     or (select count(*) from public.direct_spending_upgrade_impact_credits credit
         where credit.offer_id = offer_id) <> 2
     or not exists (
       select 1 from public.direct_spending_upgrade_offers
       where id = offer_id
         and status = 'completed'
         and spending_change_review_status = 'accepted'
         and completed_at is not null
     ) then
    raise exception 'Accepted spending evidence did not mint one creator credit and complete exactly once.';
  end if;

  completion_result := public.complete_direct_spending_upgrade_obligation(
    creator_obligation_id,
    true,
    '',
    '',
    repeat('5', 64),
    repeat('6', 64),
    1001,
    970,
    'USD',
    'givewell-top-charities-fund',
    '',
    timezone('utc', now()),
    'bank',
    'staging'
  );
  if completion_result->>'outcome' <> 'already_verified'
     or (select count(*) from public.direct_spending_upgrade_impact_credits credit
         where credit.offer_id = offer_id) <> 2 then
    raise exception 'Exact webhook replay was not idempotent.';
  end if;

  -- A non-identical replay invalidates the currently verified obligation and
  -- suppresses only the affected credit from projections. The append-only
  -- credit record remains auditable, and an exact authoritative replay can
  -- restore the verified state without minting a second credit.
  completion_result := public.complete_direct_spending_upgrade_obligation(
    creator_obligation_id,
    true,
    '',
    '',
    repeat('5', 64),
    repeat('7', 64),
    1001,
    970,
    'USD',
    'givewell-top-charities-fund',
    '',
    timezone('utc', now()),
    'bank',
    'staging'
  );
  if completion_result->>'outcome' <> 'needs_review'
     or completion_result->>'reason' <> 'altered_replay'
     or not exists (
       select 1 from public.direct_spending_upgrade_obligations
       where id = creator_obligation_id
         and status = 'needs_review'
         and failure_code = 'altered_replay'
     )
     or not exists (
       select 1 from public.direct_spending_upgrade_offers
       where id = offer_id and status = 'needs_review'
     )
     or not exists (
       select 1 from public.direct_spending_upgrade_public_offers
       where id = offer_id
         and verified_obligation_count = 1
         and converted_spending_gross_amount_cents = 0
         and incremental_gross_amount_cents = 1500
     )
     or (select count(*) from public.direct_spending_upgrade_impact_credits credit
         where credit.offer_id = offer_id) <> 2 then
    raise exception 'An altered webhook replay left stale causal credit visible.';
  end if;
  begin
    perform public.submit_direct_spending_upgrade_change_evidence(
      creator_id,
      offer_id,
      jsonb_build_object(
        'changeKind', 'order_cancelled',
        'privateCancellationReference', 'post-credit-replacement'
      ),
      public.direct_spending_upgrade_change_evidence_hash_v1(
        offer_id,
        jsonb_build_object(
          'changeKind', 'order_cancelled',
          'privateCancellationReference', 'post-credit-replacement'
        ),
        captured_at
      ),
      captured_at,
      'post-credit-replacement',
      'staging'
    );
  exception when others then
    terminal_evidence_resubmit_blocked :=
      position('append-only correction' in lower(sqlerrm)) > 0;
  end;
  if not terminal_evidence_resubmit_blocked then
    raise exception 'Accepted causal evidence was replaced without an append-only correction.';
  end if;

  completion_result := public.complete_direct_spending_upgrade_obligation(
    creator_obligation_id,
    true,
    '',
    '',
    repeat('8', 64),
    repeat('8', 64),
    1001,
    970,
    'USD',
    'givewell-top-charities-fund',
    '',
    timezone('utc', now()),
    'bank',
    'staging'
  );
  if completion_result->>'outcome' <> 'needs_review'
     or completion_result->>'reason' <> 'credited_provider_identity_changed'
     or not exists (
       select 1
       from public.direct_spending_upgrade_obligations
       where id = creator_obligation_id
         and status = 'needs_review'
         and failure_code = 'credited_provider_identity_changed'
         and provider_charge_id_hash = repeat('5', 64)
         and provider_payload_hash = repeat('6', 64)
     )
     or not exists (
       select 1
       from public.direct_spending_upgrade_public_offers
       where id = offer_id
         and converted_spending_gross_amount_cents = 0
         and incremental_gross_amount_cents = 1500
     ) then
    raise exception 'A changed provider identity replaced append-only causal credit.';
  end if;

  completion_result := public.complete_direct_spending_upgrade_obligation(
    creator_obligation_id,
    true,
    '',
    '',
    repeat('5', 64),
    repeat('6', 64),
    1001,
    970,
    'USD',
    'givewell-top-charities-fund',
    '',
    timezone('utc', now()),
    'bank',
    'staging'
  );
  if completion_result->>'outcome' <> 'completed'
     or not exists (
       select 1 from public.direct_spending_upgrade_public_offers
       where id = offer_id
         and verified_obligation_count = 2
         and converted_spending_gross_amount_cents = 1001
         and incremental_gross_amount_cents = 1500
     )
     or (select count(*) from public.direct_spending_upgrade_impact_credits credit
         where credit.offer_id = offer_id) <> 2 then
    raise exception 'An exact authoritative replay did not restore credit exactly once.';
  end if;

  begin
    update public.direct_spending_upgrade_offers
    set creator_diversion_amount_cents = 1002
    where id = offer_id;
  exception when others then
    immutable_blocked := position('immutable' in lower(sqlerrm)) > 0
      or position('remainder' in lower(sqlerrm)) > 0;
  end;
  if not immutable_blocked then
    raise exception 'Published Spending Upgrade terms were mutable.';
  end if;

  begin
    perform pg_temp.make_spending_offer(creator_id, 'c');
  exception when unique_violation then
    duplicate_blocked := true;
  end;
  if not duplicate_blocked then
    raise exception 'A duplicate private baseline fingerprint was accepted.';
  end if;

  -- Rejection followed by dispute never creates creator causal credit, while
  -- an independently provider-verified matcher donation remains factual.
  offer_result := pg_temp.make_spending_offer(creator_two_id, 'd');
  rejected_baseline_id := (offer_result->'baseline'->>'id')::uuid;
  rejected_offer_id := (offer_result->'offer'->>'id')::uuid;
  perform pg_temp.accept_spending_baseline(offer_result, reviewer_id, 'baseline-rejected-case');
  perform public.join_direct_spending_upgrade_offer(
    matcher_id,
    rejected_offer_id,
    'direct-spending-upgrade-matcher-v1-2026-08-14',
    'staging'
  );
  select id into rejected_creator_obligation_id
  from public.direct_spending_upgrade_obligations
  where direct_spending_upgrade_obligations.offer_id = rejected_offer_id
    and obligation_kind = 'creator_converted_spending';
  select id into rejected_matcher_obligation_id
  from public.direct_spending_upgrade_obligations
  where direct_spending_upgrade_obligations.offer_id = rejected_offer_id
    and obligation_kind = 'matcher_incremental';
  perform public.complete_direct_spending_upgrade_obligation(
    rejected_creator_obligation_id, true, '', '', repeat('7', 64), repeat('8', 64),
    1001, 990, 'USD', 'givewell-top-charities-fund', '', timezone('utc', now()), 'card', 'staging'
  );
  perform public.complete_direct_spending_upgrade_obligation(
    rejected_matcher_obligation_id, true, '', '', repeat('9', 64), repeat('a', 64),
    1500, 1480, 'USD', 'givewell-top-charities-fund', '', timezone('utc', now()), 'card', 'staging'
  );
  captured_at := timezone('utc', now());
  evidence_payload := jsonb_build_object('changeKind', 'order_cancelled', 'privateReference', 'rejected-case');
  evidence_id := (
    public.submit_direct_spending_upgrade_change_evidence(
      creator_two_id, rejected_offer_id, evidence_payload,
      public.direct_spending_upgrade_change_evidence_hash_v1(rejected_offer_id, evidence_payload, captured_at),
      captured_at, 'rejected-change-evidence', 'staging'
    )->>'evidenceId'
  )::uuid;
  assignment_result := public.assign_direct_spending_upgrade_reviewer(
    rejected_baseline_id, rejected_offer_id, 'spending_change', reviewer_two_id, true,
    'direct-spending-upgrade-assigned-reviewer-v1-2026-08-14'
  );
  assignment_id := (assignment_result->'assignment'->>'id')::uuid;
  decision_hash := public.direct_spending_upgrade_review_decision_hash_v1(
    assignment_id, rejected_baseline_id, rejected_offer_id, evidence_id,
    'spending_change', reviewer_two_id, 'rejected', array['insufficient_private_evidence'],
    'Rollback-only rejection.', 'rejected-change-decision'
  );
  perform public.record_direct_spending_upgrade_review_decision(
    reviewer_two_id, assignment_id, evidence_id, 'rejected',
    array['insufficient_private_evidence'], 'Rollback-only rejection.',
    'rejected-change-decision', decision_hash
  );
  if exists (
    select 1 from public.direct_spending_upgrade_impact_credits credit
    where credit.offer_id = rejected_offer_id and credit.credit_kind = 'converted_spending'
  ) or not exists (
    select 1 from public.direct_spending_upgrade_impact_credits credit
    where credit.offer_id = rejected_offer_id and credit.credit_kind = 'matcher_incremental'
  ) then
    raise exception 'Rejected spending evidence altered separated credit accounting.';
  end if;
  perform public.dispute_direct_spending_upgrade_evidence(
    creator_two_id, rejected_baseline_id, rejected_offer_id, 'spending_change',
    'Rollback-only dispute.'
  );
  if not exists (
    select 1 from public.direct_spending_upgrade_offers
    where id = rejected_offer_id
      and status = 'needs_review'
      and spending_change_review_status = 'disputed'
  ) or exists (
    select 1 from public.direct_spending_upgrade_impact_credits credit
    where credit.offer_id = rejected_offer_id and credit.credit_kind = 'converted_spending'
  ) then
    raise exception 'Disputed spending evidence created or preserved creator causal credit.';
  end if;

  -- Unavailable review authority/evidence also fails closed after a real
  -- creator donation; the offer cannot be presented as completed.
  offer_result := pg_temp.make_spending_offer(creator_id, 'e');
  unavailable_baseline_id := (offer_result->'baseline'->>'id')::uuid;
  unavailable_offer_id := (offer_result->'offer'->>'id')::uuid;
  perform pg_temp.accept_spending_baseline(offer_result, reviewer_id, 'baseline-unavailable-case');
  perform public.join_direct_spending_upgrade_offer(
    matcher_id, unavailable_offer_id,
    'direct-spending-upgrade-matcher-v1-2026-08-14', 'staging'
  );
  select id into unavailable_creator_obligation_id
  from public.direct_spending_upgrade_obligations
  where direct_spending_upgrade_obligations.offer_id = unavailable_offer_id
    and obligation_kind = 'creator_converted_spending';
  perform public.complete_direct_spending_upgrade_obligation(
    unavailable_creator_obligation_id, true, '', '', repeat('b', 64), repeat('c', 64),
    1001, 985, 'USD', 'givewell-top-charities-fund', '', timezone('utc', now()), 'card', 'staging'
  );
  captured_at := timezone('utc', now());
  evidence_payload := jsonb_build_object('changeKind', 'order_cancelled', 'privateReference', 'unavailable-case');
  evidence_id := (
    public.submit_direct_spending_upgrade_change_evidence(
      creator_id, unavailable_offer_id, evidence_payload,
      public.direct_spending_upgrade_change_evidence_hash_v1(unavailable_offer_id, evidence_payload, captured_at),
      captured_at, 'unavailable-change-evidence', 'staging'
    )->>'evidenceId'
  )::uuid;
  assignment_result := public.assign_direct_spending_upgrade_reviewer(
    unavailable_baseline_id, unavailable_offer_id, 'spending_change', reviewer_two_id, true,
    'direct-spending-upgrade-assigned-reviewer-v1-2026-08-14'
  );
  assignment_id := (assignment_result->'assignment'->>'id')::uuid;
  decision_hash := public.direct_spending_upgrade_review_decision_hash_v1(
    assignment_id, unavailable_baseline_id, unavailable_offer_id, evidence_id,
    'spending_change', reviewer_two_id, 'unavailable', array['authority_unavailable'],
    'No compatible authority was available.', 'unavailable-change-decision'
  );
  perform public.record_direct_spending_upgrade_review_decision(
    reviewer_two_id, assignment_id, evidence_id, 'unavailable', array['authority_unavailable'],
    'No compatible authority was available.', 'unavailable-change-decision', decision_hash
  );
  if exists (
    select 1 from public.direct_spending_upgrade_impact_credits credit
    where credit.offer_id = unavailable_offer_id and credit.credit_kind = 'converted_spending'
  ) or exists (
    select 1 from public.direct_spending_upgrade_offers
    where id = unavailable_offer_id and status = 'completed'
  ) then
    raise exception 'Unavailable spending review minted creator credit or completion.';
  end if;

  -- Server and database fail closed on excluded baselines and missing safety
  -- attestations even when a caller bypasses the browser form.
  begin
    perform public.create_direct_spending_upgrade_offer(
      creator_id, 'staging', 'food_or_nutrition', 'Private merchant',
      'Excluded food baseline must be rejected before any record is stored.',
      1000, 1000, 'cancel', '{}'::jsonb, repeat('1', 64), timezone('utc', now()),
      repeat('f', 64), 1000, timezone('utc', now()) + interval '7 days', 'public',
      jsonb_build_object('schemaVersion', 'moral-trade-every-org-nonprofit-identity-v1'),
      repeat('2', 64), repeat('3', 64), true, true, true, true, true, true
    );
  exception when others then
    excluded_category_blocked := position('excluded' in lower(sqlerrm)) > 0;
  end;
  if not excluded_category_blocked then
    raise exception 'An excluded food or nutrition baseline was accepted.';
  end if;
  begin
    perform public.create_direct_spending_upgrade_offer(
      creator_id, 'staging', 'pending_order_or_upgrade', 'Private merchant',
      'A completed purchase return is outside the prospective first-version scope.',
      1000, 1000, 'return', '{}'::jsonb, repeat('1', 64), timezone('utc', now()),
      repeat('f', 64), 1000, timezone('utc', now()) + interval '7 days', 'public',
      jsonb_build_object('schemaVersion', 'moral-trade-every-org-nonprofit-identity-v1'),
      repeat('2', 64), repeat('3', 64), true, true, true, true, true, true
    );
  exception when others then
    unsupported_action_blocked := position('invalid spending upgrade action' in lower(sqlerrm)) > 0;
  end;
  if not unsupported_action_blocked then
    raise exception 'A completed-purchase return escaped the prospective first-version scope.';
  end if;
  begin
    perform public.create_direct_spending_upgrade_offer(
      creator_id, 'staging', 'pending_order_or_upgrade', 'Private merchant',
      'Missing safety attestation must be rejected before any record is stored.',
      1000, 1000, 'cancel', '{}'::jsonb, repeat('1', 64), timezone('utc', now()),
      repeat('f', 64), 1000, timezone('utc', now()) + interval '7 days', 'public',
      jsonb_build_object('schemaVersion', 'moral-trade-every-org-nonprofit-identity-v1'),
      repeat('2', 64), repeat('3', 64), false, true, true, true, true, true
    );
  exception when others then
    false_attestation_blocked := position('safety attestation' in lower(sqlerrm)) > 0;
  end;
  if not false_attestation_blocked then
    raise exception 'A false safety attestation was accepted.';
  end if;

  -- Raw merchants, descriptions, evidence, fingerprints, reviewer notes, and
  -- provider identifiers are absent from the only service-facing projection.
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'direct_spending_upgrade_public_offers'
      and column_name in (
        'private_merchant_label', 'private_description', 'evidence_payload',
        'private_payload', 'evidence_hash', 'baseline_fingerprint',
        'private_notes', 'partner_donation_id', 'provider_charge_id_hash',
        'provider_payload_hash'
      )
  ) then
    raise exception 'The Spending Upgrade public projection exposes private or provider evidence.';
  end if;
  if has_table_privilege('authenticated', 'public.direct_spending_upgrade_baselines', 'select')
     or has_table_privilege('authenticated', 'public.direct_spending_upgrade_public_offers', 'select')
     or has_function_privilege(
       'authenticated',
       'public.create_direct_spending_upgrade_offer(uuid,text,text,text,text,integer,integer,text,jsonb,text,timestamptz,text,integer,timestamptz,text,jsonb,text,text,boolean,boolean,boolean,boolean,boolean,boolean)',
       'execute'
     )
     or not has_table_privilege('service_role', 'public.direct_spending_upgrade_public_offers', 'select')
     or not has_function_privilege(
       'service_role',
       'public.create_direct_spending_upgrade_offer(uuid,text,text,text,text,integer,integer,text,jsonb,text,timestamptz,text,integer,timestamptz,text,jsonb,text,text,boolean,boolean,boolean,boolean,boolean,boolean)',
       'execute'
     ) then
    raise exception 'Spending Upgrade RLS or service-only privilege boundary is invalid.';
  end if;

  raise notice 'direct_spending_upgrade rollback-only QA passed';
end;
$test$;

rollback;
