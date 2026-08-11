create or replace function public.materialize_trade_settlement_shadow_v1(
  p_decision_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
  decision_row public.trade_settlement_shadow_decisions%rowtype;
  milestone_row public.trade_agreement_milestones%rowtype;
  payout_row public.trade_milestone_payouts%rowtype;
  model_row public.credibility_shadow_model_versions%rowtype;
  category_value text;
  provenance_weight_value numeric;
  confidence_weight_value numeric;
  prior_event_id uuid;
  prior_responsiveness_id uuid;
begin
  select * into decision_row
  from public.trade_settlement_shadow_decisions decision_record
  where decision_record.id = p_decision_id;
  if not found then
    raise exception 'Settlement decision is unavailable.';
  end if;
  if exists (
    select 1 from public.credibility_shadow_events event_row
    where event_row.settlement_decision_id = decision_row.id
  ) then
    return;
  end if;

  select * into milestone_row
  from public.trade_agreement_milestones milestone
  where milestone.id = decision_row.milestone_id;
  select * into payout_row
  from public.trade_milestone_payouts payout
  where payout.id = decision_row.payout_id;
  select * into model_row
  from public.credibility_shadow_model_versions model
  where model.status = 'shadow'
  order by model.created_at desc
  limit 1;

  category_value := public.credibility_shadow_category_for_action_category(
    milestone_row.action_category
  );
  provenance_weight_value := coalesce(
    (model_row.provenance_weights ->> decision_row.primary_provenance_class)::numeric,
    0
  );
  confidence_weight_value := coalesce(
    (model_row.decision_confidence_weights ->> decision_row.decision_confidence_band::text)::numeric,
    0
  );

  prior_event_id := null;
  prior_responsiveness_id := null;
  if decision_row.supersedes_decision_id is not null then
    select event_row.id into prior_event_id
    from public.credibility_shadow_events event_row
    where event_row.settlement_decision_id = decision_row.supersedes_decision_id
      and event_row.dimension = 'settlement'
      and not exists (
        select 1 from public.credibility_shadow_events successor
        where successor.supersedes_event_id = event_row.id
      )
    limit 1;
    select event_row.id into prior_responsiveness_id
    from public.credibility_shadow_events event_row
    where event_row.settlement_decision_id = decision_row.supersedes_decision_id
      and event_row.dimension = 'responsiveness'
      and not exists (
        select 1 from public.credibility_shadow_events successor
        where successor.supersedes_event_id = event_row.id
      )
    limit 1;
  end if;

  insert into public.credibility_shadow_events (
    settlement_decision_id,
    supersedes_event_id,
    profile_id,
    agreement_id,
    milestone_id,
    counterparty_id,
    role,
    category,
    dimension,
    scoring_state,
    outcome,
    primary_provenance_class,
    adjudication_class,
    decision_confidence_band,
    provenance_weight,
    decision_confidence_weight,
    context_similarity,
    stake_units,
    source_type,
    source_id,
    reason_code,
    occurred_at,
    model_version,
    metadata
  ) values (
    decision_row.id,
    prior_event_id,
    decision_row.payer_id,
    decision_row.agreement_id,
    decision_row.milestone_id,
    decision_row.payee_id,
    'funder',
    category_value,
    'settlement',
    decision_row.decision_status,
    decision_row.outcome,
    decision_row.primary_provenance_class,
    decision_row.adjudication_class,
    decision_row.decision_confidence_band,
    provenance_weight_value,
    confidence_weight_value,
    1,
    payout_row.amount_due_cents::numeric / 100::numeric,
    'settlement_decision',
    decision_row.id::text || ':settlement',
    'settlement_' || decision_row.finality_reason,
    decision_row.occurred_at,
    model_row.version,
    jsonb_build_object(
      'decisionHash', decision_row.decision_hash,
      'providerAuthenticationStatus', decision_row.provider_authentication_status,
      'providerAuthenticationRef', decision_row.provider_authentication_ref,
      'shadowOnly', true
    )
  )
  on conflict do nothing;

  if decision_row.finality_reason = 'late_payment_cure' then
    insert into public.credibility_shadow_events (
      settlement_decision_id,
      supersedes_event_id,
      profile_id,
      agreement_id,
      milestone_id,
      counterparty_id,
      role,
      category,
      dimension,
      scoring_state,
      outcome,
      primary_provenance_class,
      adjudication_class,
      decision_confidence_band,
      provenance_weight,
      decision_confidence_weight,
      context_similarity,
      stake_units,
      source_type,
      source_id,
      reason_code,
      occurred_at,
      model_version,
      metadata
    ) values (
      decision_row.id,
      prior_responsiveness_id,
      decision_row.payer_id,
      decision_row.agreement_id,
      decision_row.milestone_id,
      decision_row.payee_id,
      'funder',
      category_value,
      'responsiveness',
      'eligible',
      0,
      decision_row.primary_provenance_class,
      decision_row.adjudication_class,
      decision_row.decision_confidence_band,
      provenance_weight_value,
      confidence_weight_value,
      1,
      payout_row.amount_due_cents::numeric / 100::numeric,
      'settlement_decision',
      decision_row.id::text || ':responsiveness',
      'late_payment_cure',
      decision_row.occurred_at,
      model_row.version,
      jsonb_build_object('shadowOnly', true)
    )
    on conflict do nothing;
  elsif prior_responsiveness_id is not null then
    insert into public.credibility_shadow_events (
      settlement_decision_id,
      supersedes_event_id,
      profile_id,
      agreement_id,
      milestone_id,
      counterparty_id,
      role,
      category,
      dimension,
      scoring_state,
      outcome,
      primary_provenance_class,
      adjudication_class,
      decision_confidence_band,
      provenance_weight,
      decision_confidence_weight,
      context_similarity,
      stake_units,
      source_type,
      source_id,
      reason_code,
      occurred_at,
      model_version,
      metadata
    ) values (
      decision_row.id,
      prior_responsiveness_id,
      decision_row.payer_id,
      decision_row.agreement_id,
      decision_row.milestone_id,
      decision_row.payee_id,
      'funder',
      category_value,
      'responsiveness',
      'excluded',
      null,
      decision_row.primary_provenance_class,
      decision_row.adjudication_class,
      decision_row.decision_confidence_band,
      provenance_weight_value,
      confidence_weight_value,
      1,
      payout_row.amount_due_cents::numeric / 100::numeric,
      'settlement_decision',
      decision_row.id::text || ':responsiveness:clear',
      'superseded_without_replacement',
      decision_row.occurred_at,
      model_row.version,
      jsonb_build_object('shadowOnly', true)
    )
    on conflict do nothing;
  end if;
end;
$function$;
