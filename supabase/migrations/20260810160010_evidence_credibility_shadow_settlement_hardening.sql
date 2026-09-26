create or replace function public.record_trade_settlement_shadow_decision_v1(
  p_payout_id uuid,
  p_payment_review_decision_id uuid,
  p_decision_confidence_band smallint,
  p_primary_provenance_class text,
  p_provider_authentication_status text,
  p_provider_authentication_ref text,
  p_adjudication_class text,
  p_finality_reason text,
  p_exclusion_reason text default '',
  p_supersedes_decision_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  actor_id uuid := auth.uid();
  service_call boolean := coalesce(auth.jwt() ->> 'role', '') = 'service_role';
  actor_is_administrator boolean := moral_trade_private.current_actor_has_trade_role('administrator');
  payout_row public.trade_milestone_payouts%rowtype;
  milestone_row public.trade_agreement_milestones%rowtype;
  payment_decision public.trade_payment_review_decisions%rowtype;
  payment_case public.trade_payment_review_cases%rowtype;
  prior_decision public.trade_settlement_shadow_decisions%rowtype;
  decision_status_value text;
  outcome_value numeric;
  decision_hash_value text;
  source_key_value text;
  existing_id uuid;
  decision_id uuid;
begin
  select * into payout_row
  from public.trade_milestone_payouts payout
  where payout.id = p_payout_id
  for share;
  if not found or not payout_row.is_final then
    raise exception 'Only a final milestone payout may create a settlement decision.';
  end if;
  select * into milestone_row
  from public.trade_agreement_milestones milestone
  where milestone.id = payout_row.milestone_id;

  if p_payment_review_decision_id is not null then
    select * into payment_decision
    from public.trade_payment_review_decisions decision_record
    where decision_record.id = p_payment_review_decision_id
      and decision_record.is_final;
    select * into payment_case
    from public.trade_payment_review_cases case_record
    where case_record.id = payment_decision.case_id
      and case_record.payout_id = payout_row.id;
    if not found then
      raise exception 'The final payment review does not belong to this payout.';
    end if;
    if payment_case.final_decision_id is distinct from payment_decision.id then
      raise exception 'Only the current final payment review may create a settlement decision.';
    end if;
    if payment_decision.decision_kind = 'appeal'
       and p_adjudication_class <> 'appeal_review_final' then
      raise exception 'A payment appeal requires appeal-review adjudication.';
    elsif payment_decision.decision_kind <> 'appeal'
       and p_adjudication_class <> 'neutral_review_final' then
      raise exception 'A non-appeal payment review requires neutral-review adjudication.';
    end if;
    if not service_call
       and not actor_is_administrator
       and (
         not moral_trade_private.current_actor_has_trade_role('reviewer')
         or actor_id <> payment_decision.reviewer_id
       ) then
      raise exception 'Only the final payment reviewer may record this decision.';
    end if;
  elsif not service_call and not actor_is_administrator then
    raise exception 'A non-adjudicated settlement decision requires an administrator.';
  end if;

  decision_status_value := case
    when p_finality_reason in ('not_due', 'permissible_cancellation') then 'excluded'
    when p_finality_reason = 'unresolved_dispute' or p_decision_confidence_band = 0 then 'review_required'
    else 'eligible'
  end;
  outcome_value := case p_finality_reason
    when 'confirmed' then 1
    when 'adjudicated_paid' then 1
    when 'late_payment_cure' then 1
    when 'administrative_correction' then case
      when payout_row.status in ('confirmed', 'adjudicated_paid') then 1
      when payout_row.status = 'still_due' then 0
      else null
    end
    when 'adjudicated_unpaid' then 0
    else null
  end;

  if decision_status_value <> 'eligible' then
    outcome_value := null;
  end if;

  if p_adjudication_class = 'unreviewed' and decision_status_value = 'eligible' then
    raise exception 'An eligible settlement decision cannot be unreviewed.';
  end if;

  if decision_status_value = 'eligible' and outcome_value is null then
    raise exception 'Eligible settlement finality must determine paid or still due.';
  end if;
  if decision_status_value <> 'eligible'
     and length(btrim(coalesce(p_exclusion_reason, ''))) not between 1 and 1000 then
    raise exception 'Excluded and review-required settlement decisions need a private reason.';
  end if;

  if p_finality_reason = 'confirmed' and payout_row.status <> 'confirmed' then
    raise exception 'Confirmed settlement requires a confirmed payout.';
  elsif p_finality_reason in ('adjudicated_paid', 'late_payment_cure')
        and payout_row.status <> 'adjudicated_paid' then
    raise exception 'Paid adjudication requires an adjudicated-paid payout.';
  elsif p_finality_reason = 'adjudicated_unpaid' and payout_row.status <> 'still_due' then
    raise exception 'Unpaid adjudication requires a still-due payout.';
  elsif p_finality_reason = 'not_due' and payout_row.status <> 'not_due' then
    raise exception 'Not-due finality requires a not-due payout.';
  elsif p_finality_reason = 'permissible_cancellation'
        and payout_row.status <> 'not_due' then
    raise exception 'Permissible cancellation requires a not-due payout.';
  elsif p_finality_reason = 'unresolved_dispute'
        and payout_row.status not in (
          'reported_paid', 'payment_review_pending', 'correction_due',
          'corrected_reported', 'payment_decision_pending', 'payment_appeal_pending'
        ) then
    raise exception 'Unresolved settlement finality requires a pending dispute state.';
  end if;

  if p_payment_review_decision_id is not null then
    if p_finality_reason in ('adjudicated_paid', 'late_payment_cure')
       and payment_decision.outcome <> 'confirm_paid' then
      raise exception 'The payment review did not confirm payment.';
    end if;
    if p_finality_reason = 'adjudicated_unpaid'
       and payment_decision.outcome <> 'still_due' then
      raise exception 'The payment review did not find the amount still due.';
    end if;
  end if;
  if p_primary_provenance_class = 'authenticated_provider' then
    if p_provider_authentication_status <> 'authenticated'
       or length(btrim(coalesce(p_provider_authentication_ref, ''))) not between 1 and 500 then
      raise exception 'Authenticated-provider provenance requires a verified provider reference.';
    end if;
  elsif p_provider_authentication_status = 'authenticated' then
    raise exception 'Authenticated provider status requires authenticated-provider provenance.';
  end if;

  if p_supersedes_decision_id is not null then
    select * into prior_decision
    from public.trade_settlement_shadow_decisions decision_record
    where decision_record.id = p_supersedes_decision_id
    for share;
    if not found
       or prior_decision.payout_id <> payout_row.id
       or exists (
         select 1
         from public.trade_settlement_shadow_decisions successor
         where successor.supersedes_decision_id = prior_decision.id
       ) then
      raise exception 'The superseded settlement decision is invalid or no longer current.';
    end if;
  end if;

  if p_finality_reason in ('late_payment_cure', 'administrative_correction')
     and p_supersedes_decision_id is null then
    raise exception 'This settlement finality must supersede the current decision.';
  end if;

  decision_hash_value := encode(
    extensions.digest(
      convert_to(
        jsonb_build_object(
          'payoutId', payout_row.id,
          'paymentReviewDecisionId', p_payment_review_decision_id,
          'supersedesDecisionId', p_supersedes_decision_id,
          'decisionConfidenceBand', p_decision_confidence_band,
          'primaryProvenanceClass', p_primary_provenance_class,
          'providerAuthenticationStatus', p_provider_authentication_status,
          'providerAuthenticationRef', btrim(coalesce(p_provider_authentication_ref, '')),
          'adjudicationClass', p_adjudication_class,
          'finalityReason', p_finality_reason,
          'exclusionReason', btrim(coalesce(p_exclusion_reason, '')),
          'payoutStatus', payout_row.status,
          'amountDueCents', payout_row.amount_due_cents
        )::text,
        'UTF8'
      ),
      'sha256'
    ),
    'hex'
  );
  source_key_value := 'settlement-decision:v1:' || payout_row.id::text || ':' || decision_hash_value;

  select id into existing_id
  from public.trade_settlement_shadow_decisions
  where source_key = source_key_value;
  if existing_id is not null then
    perform public.materialize_trade_settlement_shadow_v1(existing_id);
    return jsonb_build_object(
      'decisionId', existing_id,
      'status', 'replayed',
      'shadowOnly', true
    );
  end if;

  if p_supersedes_decision_id is null and exists (
    select 1
    from public.trade_settlement_shadow_decisions decision_record
    where decision_record.payout_id = payout_row.id
      and not exists (
        select 1
        from public.trade_settlement_shadow_decisions successor
        where successor.supersedes_decision_id = decision_record.id
      )
  ) then
    raise exception 'A current settlement decision already exists; supersede it explicitly.';
  end if;

  insert into public.trade_settlement_shadow_decisions (
    payout_id,
    agreement_id,
    milestone_id,
    payment_review_decision_id,
    supersedes_decision_id,
    payer_id,
    payee_id,
    decision_status,
    outcome,
    decision_confidence_band,
    primary_provenance_class,
    provider_authentication_status,
    provider_authentication_ref,
    adjudication_class,
    finality_reason,
    exclusion_reason,
    decision_hash,
    source_key,
    occurred_at,
    finalized_at,
    created_by,
    metadata
  ) values (
    payout_row.id,
    milestone_row.agreement_id,
    milestone_row.id,
    p_payment_review_decision_id,
    p_supersedes_decision_id,
    payout_row.payer_id,
    payout_row.payee_id,
    decision_status_value,
    outcome_value,
    p_decision_confidence_band,
    p_primary_provenance_class,
    p_provider_authentication_status,
    btrim(coalesce(p_provider_authentication_ref, '')),
    p_adjudication_class,
    p_finality_reason,
    btrim(coalesce(p_exclusion_reason, '')),
    decision_hash_value,
    source_key_value,
    coalesce(payment_decision.finalized_at, payout_row.finalized_at, now()),
    now(),
    actor_id,
    jsonb_build_object(
      'shadowOnly', true,
      'activePublicCredibilityUnaffected', true
    )
  )
  returning id into decision_id;

  perform public.materialize_trade_settlement_shadow_v1(decision_id);

  return jsonb_build_object(
    'decisionId', decision_id,
    'status', decision_status_value,
    'outcome', outcome_value,
    'shadowOnly', true
  );
end;
$function$;

notify pgrst, 'reload schema';
