create or replace function public.credibility_shadow_event_plan_v1(
  p_decision_status text,
  p_completion_fraction numeric,
  p_integrity_finding text,
  p_responsiveness_finding text,
  p_dispute_conduct_finding text
)
returns jsonb
language plpgsql
immutable
set search_path = ''
as $function$
declare
  event_rows jsonb := '[]'::jsonb;
  dispute_outcome numeric;
begin
  if p_decision_status not in ('eligible', 'excluded', 'review_required')
     or p_completion_fraction is null
     or p_completion_fraction < 0
     or p_completion_fraction > 1 then
    raise exception 'Invalid evidence-decision event plan.';
  end if;

  event_rows := event_rows || jsonb_build_array(jsonb_build_object(
    'dimension', 'fulfilment',
    'scoringState', p_decision_status,
    'outcome', case when p_decision_status = 'eligible' then p_completion_fraction else null end,
    'reasonCode', case
      when p_decision_status = 'eligible' then 'final_completion_fraction'
      when p_decision_status = 'excluded' then 'finality_excluded'
      else 'review_required'
    end
  ));

  if p_integrity_finding = 'supported_honest' then
    event_rows := event_rows || jsonb_build_array(jsonb_build_object(
      'dimension', 'evidence_integrity', 'scoringState', 'eligible',
      'outcome', 1, 'reasonCode', 'supported_honest_evidence_conduct'
    ));
  elsif p_integrity_finding = 'reckless_misleading' then
    event_rows := event_rows || jsonb_build_array(jsonb_build_object(
      'dimension', 'evidence_integrity', 'scoringState', 'eligible',
      'outcome', 0.5, 'reasonCode', 'reckless_misleading_evidence'
    ));
  elsif p_integrity_finding = 'deliberate_fabrication' then
    event_rows := event_rows || jsonb_build_array(jsonb_build_object(
      'dimension', 'evidence_integrity', 'scoringState', 'eligible',
      'outcome', 0, 'reasonCode', 'deliberate_evidence_fabrication'
    ));
  elsif p_integrity_finding <> 'not_assessed' then
    raise exception 'Invalid integrity finding.';
  end if;

  if p_responsiveness_finding = 'on_time' then
    event_rows := event_rows || jsonb_build_array(jsonb_build_object(
      'dimension', 'responsiveness', 'scoringState', 'eligible',
      'outcome', 1, 'reasonCode', 'deadline_met'
    ));
  elsif p_responsiveness_finding in ('late_cure', 'missed_deadline') then
    event_rows := event_rows || jsonb_build_array(jsonb_build_object(
      'dimension', 'responsiveness', 'scoringState', 'eligible',
      'outcome', 0, 'reasonCode', case
        when p_responsiveness_finding = 'late_cure' then 'late_cure'
        else 'deadline_missed'
      end
    ));
  elsif p_responsiveness_finding not in ('not_assessed', 'excused') then
    raise exception 'Invalid responsiveness finding.';
  end if;

  if p_dispute_conduct_finding <> 'not_assessed' then
    dispute_outcome := case p_dispute_conduct_finding
      when 'cooperative' then 1
      when 'obstructive' then 0.5
      when 'retaliatory' then 0
      when 'evidence_destruction' then 0
      when 'abusive_appeal' then 0
      else null
    end;
    if dispute_outcome is null then
      raise exception 'Invalid dispute-conduct finding.';
    end if;
    event_rows := event_rows || jsonb_build_array(jsonb_build_object(
      'dimension', 'dispute_conduct', 'scoringState', 'eligible',
      'outcome', dispute_outcome,
      'reasonCode', 'dispute_conduct_' || p_dispute_conduct_finding
    ));
  end if;

  return jsonb_build_object(
    'events', event_rows,
    'restrictionSignal', case
      when p_integrity_finding = 'deliberate_fabrication'
        then jsonb_build_object(
          'signalType', 'forged_evidence',
          'reasonCode', 'deliberate_evidence_fabrication'
        )
      else null
    end
  );
end;
$function$;

create or replace function public.refresh_profile_credibility_shadow(
  target_profile_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
  model_row public.credibility_shadow_model_versions%rowtype;
begin
  select *
  into model_row
  from public.credibility_shadow_model_versions model
  where model.status = 'shadow'
  order by model.created_at desc
  limit 1;

  if model_row.version is null then
    raise exception 'No shadow credibility model version is available.';
  end if;

  delete from public.credibility_shadow_aggregates
  where profile_id = target_profile_id;

  insert into public.credibility_shadow_aggregates (
    profile_id,
    role,
    category,
    dimension,
    weighted_success,
    weighted_failure,
    effective_observations,
    event_count,
    independent_counterparties,
    last_event_at,
    as_of_at,
    model_version
  )
  with terminal_events as (
    select event_row.*
    from public.credibility_shadow_events event_row
    where event_row.profile_id = target_profile_id
      and event_row.scoring_state = 'eligible'
      and event_row.outcome is not null
      and not exists (
        select 1
        from public.credibility_shadow_events successor
        where successor.supersedes_event_id = event_row.id
      )
  ), ranked as (
    select
      terminal_events.*,
      row_number() over (
        partition by terminal_events.profile_id,
          coalesce(terminal_events.counterparty_id::text, terminal_events.id::text),
          terminal_events.role,
          terminal_events.category,
          terminal_events.dimension
        order by terminal_events.occurred_at, terminal_events.id
      ) as counterparty_sequence
    from terminal_events
  ), weighted as (
    select
      ranked.*,
      (
        exp(
          -ln(2::numeric)
          * greatest(
              0::numeric,
              extract(epoch from (now() - ranked.occurred_at))::numeric / 86400::numeric
            )
          / model_row.recency_half_life_days::numeric
        )
        * ranked.provenance_weight
        * ranked.decision_confidence_weight
        * (1::numeric / sqrt(ranked.counterparty_sequence::numeric))
        * ranked.context_similarity
        * public.credibility_stake_weight(ranked.stake_units)
      ) as event_weight
    from ranked
  )
  select
    target_profile_id,
    weighted.role,
    weighted.category,
    weighted.dimension,
    sum(weighted.event_weight * weighted.outcome),
    sum(weighted.event_weight * (1 - weighted.outcome)),
    sum(weighted.event_weight),
    count(*)::integer,
    count(distinct weighted.counterparty_id)::integer,
    max(weighted.occurred_at),
    now(),
    model_row.version
  from weighted
  group by weighted.role, weighted.category, weighted.dimension;
end;
$function$;

create or replace function public.handle_credibility_shadow_event_refresh()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  perform public.refresh_profile_credibility_shadow(new.profile_id);
  return new;
end;
$function$;

create trigger credibility_shadow_events_refresh_aggregates
after insert on public.credibility_shadow_events
for each row execute function public.handle_credibility_shadow_event_refresh();
