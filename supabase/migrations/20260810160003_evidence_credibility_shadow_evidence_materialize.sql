create or replace function public.materialize_trade_evidence_decision_shadow_v1(
  p_decision_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
  decision_row public.trade_evidence_decisions%rowtype;
  milestone_row public.trade_agreement_milestones%rowtype;
  model_row public.credibility_shadow_model_versions%rowtype;
  plan jsonb;
  plan_item jsonb;
  prior_event_id uuid;
  planned_dimension text;
  category_value text;
  outcome_value numeric;
  state_value text;
  provenance_weight_value numeric;
  confidence_weight_value numeric;
begin
  select *
  into decision_row
  from public.trade_evidence_decisions decision_record
  where decision_record.id = p_decision_id;
  if not found then
    raise exception 'Evidence decision is unavailable.';
  end if;

  if exists (
    select 1
    from public.credibility_shadow_events event_row
    where event_row.evidence_decision_id = decision_row.id
  ) then
    return;
  end if;

  select *
  into milestone_row
  from public.trade_agreement_milestones milestone
  where milestone.id = decision_row.milestone_id;

  select *
  into model_row
  from public.credibility_shadow_model_versions model
  where model.status = 'shadow'
  order by model.created_at desc
  limit 1;

  provenance_weight_value := coalesce(
    (model_row.provenance_weights ->> decision_row.primary_provenance_class)::numeric,
    0
  );
  confidence_weight_value := coalesce(
    (model_row.decision_confidence_weights ->> decision_row.decision_confidence_band::text)::numeric,
    0
  );
  category_value := public.credibility_shadow_category_for_action_category(
    milestone_row.action_category
  );
  plan := public.credibility_shadow_event_plan_v1(
    decision_row.decision_status,
    decision_row.completion_fraction,
    decision_row.integrity_finding,
    decision_row.responsiveness_finding,
    decision_row.dispute_conduct_finding
  );

  for plan_item in
    select value from jsonb_array_elements(plan -> 'events')
  loop
    planned_dimension := plan_item ->> 'dimension';
    state_value := plan_item ->> 'scoringState';
    outcome_value := case
      when plan_item -> 'outcome' = 'null'::jsonb then null
      else (plan_item ->> 'outcome')::numeric
    end;
    prior_event_id := null;

    if decision_row.supersedes_decision_id is not null then
      select event_row.id
      into prior_event_id
      from public.credibility_shadow_events event_row
      where event_row.evidence_decision_id = decision_row.supersedes_decision_id
        and event_row.profile_id = decision_row.performer_id
        and event_row.dimension = planned_dimension
        and not exists (
          select 1
          from public.credibility_shadow_events successor
          where successor.supersedes_event_id = event_row.id
        )
      order by event_row.created_at desc
      limit 1;
    end if;

    insert into public.credibility_shadow_events (
      evidence_decision_id,
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
      decision_row.performer_id,
      decision_row.agreement_id,
      decision_row.milestone_id,
      decision_row.payer_id,
      'committer',
      category_value,
      planned_dimension,
      state_value,
      outcome_value,
      decision_row.primary_provenance_class,
      decision_row.adjudication_class,
      decision_row.decision_confidence_band,
      provenance_weight_value,
      confidence_weight_value,
      1,
      milestone_row.maximum_amount_cents::numeric / 100::numeric,
      'evidence_decision',
      decision_row.id::text || ':' || planned_dimension,
      plan_item ->> 'reasonCode',
      decision_row.occurred_at,
      model_row.version,
      jsonb_build_object(
        'finalityReason', decision_row.finality_reason,
        'termsHash', decision_row.terms_hash,
        'decisionHash', decision_row.decision_hash,
        'payoutFactorBand', decision_row.payout_factor_band,
        'providerAuthenticationStatus', decision_row.provider_authentication_status,
        'providerAuthenticationRef', decision_row.provider_authentication_ref,
        'contradictionStatus', decision_row.contradiction_status,
        'additionalityStatus', decision_row.additionality_status
      )
    )
    on conflict do nothing;
  end loop;

  if decision_row.supersedes_decision_id is not null then
    for prior_event_id, planned_dimension in
      select event_row.id, event_row.dimension
      from public.credibility_shadow_events event_row
      where event_row.evidence_decision_id = decision_row.supersedes_decision_id
        and event_row.profile_id = decision_row.performer_id
        and not exists (
          select 1
          from public.credibility_shadow_events successor
          where successor.supersedes_event_id = event_row.id
        )
        and not exists (
          select 1
          from public.credibility_shadow_events replacement
          where replacement.evidence_decision_id = decision_row.id
            and replacement.dimension = event_row.dimension
        )
    loop
      insert into public.credibility_shadow_events (
        evidence_decision_id,
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
        decision_row.performer_id,
        decision_row.agreement_id,
        decision_row.milestone_id,
        decision_row.payer_id,
        'committer',
        category_value,
        planned_dimension,
        'excluded',
        null,
        decision_row.primary_provenance_class,
        decision_row.adjudication_class,
        decision_row.decision_confidence_band,
        provenance_weight_value,
        confidence_weight_value,
        1,
        milestone_row.maximum_amount_cents::numeric / 100::numeric,
        'evidence_decision',
        decision_row.id::text || ':' || planned_dimension || ':clear',
        'superseded_without_replacement',
        decision_row.occurred_at,
        model_row.version,
        jsonb_build_object('clearsPriorDimension', true)
      )
      on conflict do nothing;
    end loop;
  end if;

  if plan -> 'restrictionSignal' <> 'null'::jsonb then
    insert into public.credibility_shadow_restriction_signals (
      evidence_decision_id,
      profile_id,
      signal_type,
      reason_code,
      metadata
    ) values (
      decision_row.id,
      decision_row.performer_id,
      plan #>> '{restrictionSignal,signalType}',
      plan #>> '{restrictionSignal,reasonCode}',
      jsonb_build_object(
        'agreementId', decision_row.agreement_id,
        'milestoneId', decision_row.milestone_id,
        'decisionHash', decision_row.decision_hash,
        'shadowOnly', true
      )
    )
    on conflict (evidence_decision_id) do nothing;
  end if;
end;
$function$;
