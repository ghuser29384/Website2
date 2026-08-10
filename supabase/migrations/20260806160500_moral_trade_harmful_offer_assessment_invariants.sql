-- Null-safe database enforcement for automatic permission and deterministic-only blocking.
begin;

create or replace function public.moral_trade_enforce_harm_assessment_route_invariants()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $function$
declare
  actual_hard_rule_count integer;
begin
  if jsonb_typeof(new.assessment_json -> 'findings') is distinct from 'array'
     or jsonb_typeof(new.assessment_json -> 'unresolvedQuestions') is distinct from 'array'
     or jsonb_typeof(new.assessment_json -> 'automaticPermitCriteria') is distinct from 'object' then
    raise exception using errcode = '23514', message = 'The harmful-offer assessment structure is invalid.';
  end if;

  select count(*)::integer
  into actual_hard_rule_count
  from jsonb_array_elements(new.assessment_json -> 'findings') as finding
  where finding ->> 'source' = 'rule'
    and finding ->> 'hardPolicyBlock' = 'true';

  if new.hard_policy_block_count is distinct from actual_hard_rule_count then
    raise exception using
      errcode = '23514',
      message = 'The deterministic hard-policy count does not match the assessment findings.';
  end if;

  if new.assessment_route = 'allow' and (
    new.model_status is distinct from 'completed'
    or new.enforcement_basis is distinct from 'completed_low_risk_assessment'
    or new.overall_confidence < 0.9000
    or new.evidence_quality is distinct from 'strong'
    or new.reversibility_concern is distinct from 'low'
    or new.contested_moral_frame is distinct from false
    or new.third_party_effect_severity not in ('none', 'low', 'moderate')
    or new.legitimate_veto_holder_identified is distinct from false
    or new.human_only_sensitive_domain is distinct from false
    or new.baseline_comparison is distinct from 'better_or_equal'
    or new.plausible_severe_harm is distinct from false
    or new.dependent_party_risk is distinct from false
    or new.opaque_coercion_incentives is distinct from false
    or new.hard_policy_block_count <> 0
    or jsonb_array_length(new.assessment_json -> 'findings') <> 0
    or jsonb_array_length(new.assessment_json -> 'unresolvedQuestions') <> 0
    or coalesce(new.assessment_json #>> '{automaticPermitCriteria,passed}', 'false') <> 'true'
  ) then
    raise exception using
      errcode = '23514',
      message = 'Automatic permission requires every low-risk criterion.';
  end if;

  if new.assessment_route = 'block' and (
    new.enforcement_basis is distinct from 'deterministic_hard_policy'
    or actual_hard_rule_count < 1
  ) then
    raise exception using
      errcode = '23514',
      message = 'An automatic block requires a deterministic categorical finding.';
  end if;

  if new.assessment_route = 'human_review'
     and new.enforcement_basis is distinct from 'human_review_required' then
    raise exception using
      errcode = '23514',
      message = 'Human-review assessments require the human-review enforcement basis.';
  end if;

  if new.assessment_route = 'allow' and new.review_status is distinct from 'not_required' then
    raise exception using errcode = '23514', message = 'Automatically permitted assessments cannot carry a pending review status.';
  end if;
  if new.assessment_route in ('human_review', 'block')
     and new.review_status not in ('pending', 'upheld', 'overturned', 'superseded') then
    raise exception using errcode = '23514', message = 'Held assessments require a review status.';
  end if;

  return new;
end;
$function$;

drop trigger if exists moral_trade_harm_assessment_route_invariants
  on public.moral_trade_harmful_offer_assessments;
create trigger moral_trade_harm_assessment_route_invariants
before insert or update on public.moral_trade_harmful_offer_assessments
for each row execute function public.moral_trade_enforce_harm_assessment_route_invariants();

commit;
