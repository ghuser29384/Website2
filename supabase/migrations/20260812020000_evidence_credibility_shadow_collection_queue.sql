-- Private AAL2-administrator collection surface for the evidence-decision
-- contextual-credibility shadow model. This migration does not activate any
-- public, ranking, exposure, safeguard, eligibility, or restriction effect.

create table if not exists public.credibility_shadow_collection_audit (
  id uuid primary key default gen_random_uuid(),
  queue_kind text not null,
  queue_key text not null,
  milestone_id uuid not null
    references public.trade_agreement_milestones(id) on delete restrict,
  payout_id uuid
    references public.trade_milestone_payouts(id) on delete restrict,
  evidence_decision_id uuid
    references public.trade_evidence_decisions(id) on delete restrict,
  settlement_decision_id uuid
    references public.trade_settlement_shadow_decisions(id) on delete restrict,
  source_review_id uuid
    references public.trade_milestone_reviews(id) on delete restrict,
  source_payment_review_decision_id uuid
    references public.trade_payment_review_decisions(id) on delete restrict,
  supersedes_decision_id uuid,
  private_rationale text not null,
  source_snapshot jsonb not null,
  recorded_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint credibility_shadow_collection_audit_kind_check
    check (queue_kind in ('evidence', 'settlement')),
  constraint credibility_shadow_collection_audit_one_decision_check check (
    num_nonnulls(evidence_decision_id, settlement_decision_id) = 1
  ),
  constraint credibility_shadow_collection_audit_kind_link_check check (
    (queue_kind = 'evidence' and evidence_decision_id is not null
      and settlement_decision_id is null)
    or
    (queue_kind = 'settlement' and settlement_decision_id is not null
      and evidence_decision_id is null and payout_id is not null)
  ),
  constraint credibility_shadow_collection_audit_rationale_check
    check (length(btrim(private_rationale)) between 1 and 4000),
  constraint credibility_shadow_collection_audit_snapshot_check
    check (jsonb_typeof(source_snapshot) = 'object')
);

create unique index if not exists credibility_shadow_collection_audit_evidence_uidx
  on public.credibility_shadow_collection_audit(evidence_decision_id)
  where evidence_decision_id is not null;
create unique index if not exists credibility_shadow_collection_audit_settlement_uidx
  on public.credibility_shadow_collection_audit(settlement_decision_id)
  where settlement_decision_id is not null;
create index if not exists credibility_shadow_collection_audit_milestone_time_idx
  on public.credibility_shadow_collection_audit(milestone_id, created_at desc);

alter table public.credibility_shadow_collection_audit enable row level security;
revoke all on table public.credibility_shadow_collection_audit
  from public, anon, authenticated;
grant select on table public.credibility_shadow_collection_audit to service_role;

create trigger credibility_shadow_collection_audit_append_only
before update or delete on public.credibility_shadow_collection_audit
for each row execute function moral_trade_private.reject_credibility_shadow_history_mutation();

create or replace function moral_trade_private.require_credibility_shadow_collection_admin_v1()
returns void
language plpgsql
stable
security definer
set search_path = ''
as $function$
begin
  if auth.uid() is null
     or coalesce(auth.jwt() ->> 'aal', '') <> 'aal2'
     or not moral_trade_private.current_actor_has_trade_role('administrator') then
    raise exception 'Private shadow collection requires an active AAL2 administrator.';
  end if;
end;
$function$;

create or replace function public.list_credibility_shadow_collection_queue_v1(
  p_limit integer default 100,
  p_offset integer default 0
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  items_value jsonb;
begin
  perform moral_trade_private.require_credibility_shadow_collection_admin_v1();

  if p_limit not between 1 and 200 or p_offset < 0 then
    raise exception 'Queue pagination is outside the supported range.';
  end if;

  with reviewed_sources as (
    select
      milestone.id as milestone_id,
      milestone.agreement_id,
      payout.id as payout_id,
      review.id as source_review_id,
      current_decision.id as current_decision_id,
      milestone.action_category,
      milestone.description,
      milestone.status as source_status,
      review.review_kind as source_kind,
      review.outcome as source_outcome,
      milestone.performer_id,
      milestone.payer_id,
      milestone.units_total,
      review.completion_units,
      review.confidence_band as payout_factor_band,
      payout.amount_due_cents,
      payout.currency,
      review.finalized_at as source_finalized_at,
      case
        when review.review_kind = 'appeal' then
          case
            when base_review.id is not null
             and base_review.outcome is not distinct from review.outcome
             and base_review.completion_units is not distinct from review.completion_units
              then 'appeal_affirmed'
            else 'appeal_overturned'
          end
        when review.review_kind = 'replacement' and review.outcome = 'graded'
          then 'replacement_success'
        when review.outcome = 'rejected' then 'terminal_rejection'
        else 'review_final'
      end as suggested_finality_reason,
      case
        when review.review_kind = 'appeal' then array[
          case
            when base_review.id is not null
             and base_review.outcome is not distinct from review.outcome
             and base_review.completion_units is not distinct from review.completion_units
              then 'appeal_affirmed'
            else 'appeal_overturned'
          end
        ]::text[]
        when review.review_kind = 'replacement' and review.outcome = 'graded'
          then array['replacement_success', 'late_cure']::text[]
        when review.outcome = 'rejected'
          then array['terminal_rejection']::text[]
        else array['review_final']::text[]
      end as allowed_finality_reasons,
      case
        when review.review_kind = 'appeal' then 'appeal_review_final'
        else 'neutral_review_final'
      end as derived_adjudication_class,
      current_decision.review_id as current_review_id,
      current_decision.finality_reason as current_finality_reason
    from public.trade_agreement_milestones milestone
    join public.trade_milestone_reviews review
      on review.id = milestone.final_review_id
     and review.milestone_id = milestone.id
     and review.is_final
     and review.finalized_at is not null
    left join public.trade_milestone_reviews base_review
      on base_review.id = review.base_review_id
    join public.trade_milestone_payouts payout
      on payout.milestone_id = milestone.id
     and payout.review_id = review.id
     and payout.is_final
    left join lateral (
      select decision_record.*
      from public.trade_evidence_decisions decision_record
      where decision_record.milestone_id = milestone.id
        and not exists (
          select 1
          from public.trade_evidence_decisions successor
          where successor.supersedes_decision_id = decision_record.id
        )
      order by decision_record.finalized_at desc, decision_record.created_at desc
      limit 1
    ) current_decision on true
    where review.review_kind <> 'appeal' or base_review.id is not null
  ),
  reviewed_evidence as (
    select
      source_finalized_at,
      jsonb_build_object(
        'kind', 'evidence',
        'queueKey', 'evidence:' || milestone_id::text,
        'agreementId', agreement_id,
        'milestoneId', milestone_id,
        'payoutId', payout_id,
        'sourceReviewId', source_review_id,
        'sourcePaymentReviewDecisionId', null,
        'currentDecisionId', current_decision_id,
        'requiresSupersession', current_decision_id is not null,
        'actionCategory', action_category,
        'description', description,
        'sourceStatus', source_status,
        'sourceKind', source_kind,
        'sourceOutcome', source_outcome,
        'suggestedFinalityReason', suggested_finality_reason,
        'allowedFinalityReasons', to_jsonb(allowed_finality_reasons),
        'derivedAdjudicationClass', derived_adjudication_class,
        'performerId', performer_id,
        'payerId', payer_id,
        'payeeId', performer_id,
        'unitsTotal', units_total,
        'completionUnits', completion_units,
        'payoutFactorBand', payout_factor_band,
        'amountDueCents', amount_due_cents,
        'currency', currency,
        'sourceFinalizedAt', source_finalized_at,
        'shadowOnly', true
      ) as item
    from reviewed_sources
    where current_decision_id is null
       or current_review_id is distinct from source_review_id
       or not (current_finality_reason = any(allowed_finality_reasons))
  ),
  no_review_sources as (
    select
      milestone.id as milestone_id,
      milestone.agreement_id,
      current_decision.id as current_decision_id,
      current_decision.review_id as current_review_id,
      current_decision.finality_reason as current_finality_reason,
      milestone.action_category,
      milestone.description,
      milestone.status as source_status,
      milestone.performer_id,
      milestone.payer_id,
      milestone.units_total,
      coalesce(milestone.replacement_deadline_at, milestone.updated_at, milestone.created_at)
        as source_finalized_at,
      case
        when milestone.status = 'replacement_due' then 'replacement_expired'
        else 'permissible_exit'
      end as suggested_finality_reason,
      case
        when milestone.status = 'replacement_due'
          then array['replacement_expired', 'unjustified_abandonment']::text[]
        else array[
          'permissible_exit', 'force_majeure', 'mutual_cancellation',
          'unjustified_abandonment', 'unresolved_dispute'
        ]::text[]
      end as allowed_finality_reasons
    from public.trade_agreement_milestones milestone
    left join lateral (
      select decision_record.*
      from public.trade_evidence_decisions decision_record
      where decision_record.milestone_id = milestone.id
        and not exists (
          select 1
          from public.trade_evidence_decisions successor
          where successor.supersedes_decision_id = decision_record.id
        )
      order by decision_record.finalized_at desc, decision_record.created_at desc
      limit 1
    ) current_decision on true
    where milestone.final_review_id is null
      and (
        (milestone.status = 'replacement_due'
          and milestone.replacement_deadline_at is not null
          and milestone.replacement_deadline_at <= now())
        or milestone.status = 'cancelled'
      )
  ),
  no_review_evidence as (
    select
      source_finalized_at,
      jsonb_build_object(
        'kind', 'evidence',
        'queueKey', 'evidence:' || milestone_id::text,
        'agreementId', agreement_id,
        'milestoneId', milestone_id,
        'payoutId', null,
        'sourceReviewId', null,
        'sourcePaymentReviewDecisionId', null,
        'currentDecisionId', current_decision_id,
        'requiresSupersession', current_decision_id is not null,
        'actionCategory', action_category,
        'description', description,
        'sourceStatus', source_status,
        'sourceKind', 'no_review_finality',
        'sourceOutcome', null,
        'suggestedFinalityReason', suggested_finality_reason,
        'allowedFinalityReasons', to_jsonb(allowed_finality_reasons),
        'derivedAdjudicationClass', 'platform_established',
        'performerId', performer_id,
        'payerId', payer_id,
        'payeeId', performer_id,
        'unitsTotal', units_total,
        'completionUnits', 0,
        'payoutFactorBand', null,
        'amountDueCents', null,
        'currency', null,
        'sourceFinalizedAt', source_finalized_at,
        'shadowOnly', true
      ) as item
    from no_review_sources
    where current_decision_id is null
       or current_review_id is not null
       or not (current_finality_reason = any(allowed_finality_reasons))
  ),
  settlement_sources as (
    select
      payout.id as payout_id,
      payout.milestone_id,
      milestone.agreement_id,
      current_decision.id as current_decision_id,
      current_decision.payment_review_decision_id as current_payment_review_decision_id,
      current_decision.finality_reason as current_finality_reason,
      current_decision.outcome as current_outcome,
      payment_source.payment_review_decision_id,
      payment_source.decision_kind as payment_decision_kind,
      payment_source.outcome as payment_decision_outcome,
      milestone.action_category,
      milestone.description,
      payout.status as source_status,
      milestone.performer_id,
      payout.payer_id,
      payout.payee_id,
      payout.amount_due_cents,
      payout.currency,
      coalesce(payment_source.finalized_at, payout.finalized_at, milestone.updated_at)
        as source_finalized_at,
      case
        when payout.status = 'confirmed' then 'confirmed'
        when payout.status = 'not_due' and milestone.status = 'cancelled'
          then 'permissible_cancellation'
        when payout.status = 'not_due' then 'not_due'
        when payout.status = 'adjudicated_paid'
             and current_decision.outcome = 0 then 'late_payment_cure'
        when payout.status = 'adjudicated_paid' then 'adjudicated_paid'
        else 'adjudicated_unpaid'
      end as suggested_finality_reason,
      case
        when payout.status = 'confirmed' then array['confirmed']::text[]
        when payout.status = 'not_due' and milestone.status = 'cancelled'
          then array['permissible_cancellation', 'not_due']::text[]
        when payout.status = 'not_due' then array['not_due']::text[]
        when payout.status = 'adjudicated_paid'
          then array['adjudicated_paid', 'late_payment_cure']::text[]
        else array['adjudicated_unpaid']::text[]
      end as allowed_finality_reasons,
      case
        when payment_source.decision_kind = 'appeal' then 'appeal_review_final'
        when payment_source.payment_review_decision_id is not null then 'neutral_review_final'
        else 'platform_established'
      end as derived_adjudication_class
    from public.trade_milestone_payouts payout
    join public.trade_agreement_milestones milestone
      on milestone.id = payout.milestone_id
    left join lateral (
      select
        payment_case.final_decision_id as payment_review_decision_id,
        payment_decision.decision_kind,
        payment_decision.outcome,
        payment_decision.finalized_at
      from public.trade_payment_review_cases payment_case
      join public.trade_payment_review_decisions payment_decision
        on payment_decision.id = payment_case.final_decision_id
       and payment_decision.is_final
      where payment_case.payout_id = payout.id
      order by payment_case.payment_cycle desc
      limit 1
    ) payment_source on true
    left join lateral (
      select decision_record.*
      from public.trade_settlement_shadow_decisions decision_record
      where decision_record.payout_id = payout.id
        and not exists (
          select 1
          from public.trade_settlement_shadow_decisions successor
          where successor.supersedes_decision_id = decision_record.id
        )
      order by decision_record.finalized_at desc, decision_record.created_at desc
      limit 1
    ) current_decision on true
    where payout.is_final
      and payout.status in ('not_due', 'confirmed', 'adjudicated_paid', 'still_due')
  ),
  settlement_queue as (
    select
      source_finalized_at,
      jsonb_build_object(
        'kind', 'settlement',
        'queueKey', 'settlement:' || payout_id::text,
        'agreementId', agreement_id,
        'milestoneId', milestone_id,
        'payoutId', payout_id,
        'sourceReviewId', null,
        'sourcePaymentReviewDecisionId', payment_review_decision_id,
        'currentDecisionId', current_decision_id,
        'requiresSupersession', current_decision_id is not null,
        'actionCategory', action_category,
        'description', description,
        'sourceStatus', source_status,
        'sourceKind', coalesce(payment_decision_kind, 'platform_finality'),
        'sourceOutcome', payment_decision_outcome,
        'suggestedFinalityReason', suggested_finality_reason,
        'allowedFinalityReasons', to_jsonb(allowed_finality_reasons),
        'derivedAdjudicationClass', derived_adjudication_class,
        'performerId', performer_id,
        'payerId', payer_id,
        'payeeId', payee_id,
        'unitsTotal', null,
        'completionUnits', null,
        'payoutFactorBand', null,
        'amountDueCents', amount_due_cents,
        'currency', currency,
        'sourceFinalizedAt', source_finalized_at,
        'shadowOnly', true
      ) as item
    from settlement_sources
    where current_decision_id is null
       or current_payment_review_decision_id
          is distinct from payment_review_decision_id
       or not (current_finality_reason = any(allowed_finality_reasons))
  )
  select coalesce(jsonb_agg(queued.item order by queued.source_finalized_at, queued.item->>'queueKey'), '[]'::jsonb)
  into items_value
  from (
    select * from reviewed_evidence
    union all
    select * from no_review_evidence
    union all
    select * from settlement_queue
    order by source_finalized_at
    limit p_limit offset p_offset
  ) queued;

  return jsonb_build_object(
    'items', items_value,
    'limit', p_limit,
    'offset', p_offset,
    'shadowOnly', true,
    'activePublicCredibilityUnaffected', true
  );
end;
$function$;

create or replace function public.record_credibility_shadow_evidence_collection_v1(
  p_milestone_id uuid,
  p_review_id uuid,
  p_decision_confidence_band smallint,
  p_primary_provenance_class text,
  p_provider_authentication_status text,
  p_provider_authentication_ref text,
  p_contradiction_status text,
  p_integrity_finding text,
  p_responsiveness_finding text,
  p_dispute_conduct_finding text,
  p_finality_reason text,
  p_exclusion_reason text,
  p_supersedes_decision_id uuid,
  p_private_rationale text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  milestone_row public.trade_agreement_milestones%rowtype;
  review_row public.trade_milestone_reviews%rowtype;
  base_review_row public.trade_milestone_reviews%rowtype;
  current_decision public.trade_evidence_decisions%rowtype;
  allowed_finality_reasons text[];
  derived_adjudication_class text;
  matching_current boolean := false;
  result_value jsonb;
  decision_id_value uuid;
  audit_id_value uuid;
  audit_rationale_value text;
  source_snapshot_value jsonb;
begin
  perform moral_trade_private.require_credibility_shadow_collection_admin_v1();

  if length(btrim(coalesce(p_private_rationale, ''))) not between 1 and 4000 then
    raise exception 'A private collection rationale is required.';
  end if;

  select * into milestone_row
  from public.trade_agreement_milestones milestone
  where milestone.id = p_milestone_id
  for share;
  if not found then
    raise exception 'Milestone is unavailable.';
  end if;

  if p_review_id is not null then
    select * into review_row
    from public.trade_milestone_reviews review
    where review.id = p_review_id
      and review.milestone_id = milestone_row.id
      and review.is_final
      and review.finalized_at is not null;
    if not found or milestone_row.final_review_id is distinct from review_row.id then
      raise exception 'Only the current final milestone review may be collected.';
    end if;

    if review_row.review_kind = 'appeal' then
      select * into base_review_row
      from public.trade_milestone_reviews base_review
      where base_review.id = review_row.base_review_id;
      if not found then
        raise exception 'The final appeal review has no valid base review.';
      end if;
      derived_adjudication_class := 'appeal_review_final';
      allowed_finality_reasons := array[
        case
          when base_review_row.outcome is not distinct from review_row.outcome
           and base_review_row.completion_units is not distinct from review_row.completion_units
            then 'appeal_affirmed'
          else 'appeal_overturned'
        end
      ]::text[];
    elsif review_row.review_kind = 'replacement' and review_row.outcome = 'graded' then
      derived_adjudication_class := 'neutral_review_final';
      allowed_finality_reasons := array['replacement_success', 'late_cure']::text[];
    elsif review_row.outcome = 'rejected' then
      derived_adjudication_class := 'neutral_review_final';
      allowed_finality_reasons := array['terminal_rejection']::text[];
    else
      derived_adjudication_class := 'neutral_review_final';
      allowed_finality_reasons := array['review_final']::text[];
    end if;
  else
    if milestone_row.final_review_id is not null then
      raise exception 'The current final review must be linked to this collection decision.';
    end if;
    if milestone_row.status = 'replacement_due'
       and milestone_row.replacement_deadline_at is not null
       and milestone_row.replacement_deadline_at <= now() then
      allowed_finality_reasons := array[
        'replacement_expired', 'unjustified_abandonment'
      ]::text[];
    elsif milestone_row.status = 'cancelled' then
      allowed_finality_reasons := array[
        'permissible_exit', 'force_majeure', 'mutual_cancellation',
        'unjustified_abandonment', 'unresolved_dispute'
      ]::text[];
    else
      raise exception 'The milestone has no collectable no-review finality.';
    end if;
    derived_adjudication_class := case
      when p_primary_provenance_class = 'authenticated_provider'
        then 'provider_established'
      else 'platform_established'
    end;
  end if;

  if not (p_finality_reason = any(allowed_finality_reasons)) then
    raise exception 'The selected finality reason does not match the current final source.';
  end if;

  select * into current_decision
  from public.trade_evidence_decisions decision_record
  where decision_record.milestone_id = milestone_row.id
    and not exists (
      select 1
      from public.trade_evidence_decisions successor
      where successor.supersedes_decision_id = decision_record.id
    )
  order by decision_record.finalized_at desc, decision_record.created_at desc
  limit 1;

  if found then
    matching_current :=
      current_decision.review_id is not distinct from p_review_id
      and current_decision.decision_confidence_band = p_decision_confidence_band
      and current_decision.primary_provenance_class = p_primary_provenance_class
      and current_decision.provider_authentication_status = p_provider_authentication_status
      and current_decision.provider_authentication_ref = btrim(coalesce(p_provider_authentication_ref, ''))
      and current_decision.adjudication_class = derived_adjudication_class
      and current_decision.contradiction_status = p_contradiction_status
      and current_decision.integrity_finding = p_integrity_finding
      and current_decision.responsiveness_finding = p_responsiveness_finding
      and current_decision.dispute_conduct_finding = p_dispute_conduct_finding
      and current_decision.finality_reason = p_finality_reason
      and current_decision.exclusion_reason = btrim(coalesce(p_exclusion_reason, ''))
      and current_decision.supersedes_decision_id is not distinct from p_supersedes_decision_id;

    if not matching_current
       and p_supersedes_decision_id is distinct from current_decision.id then
      raise exception 'A changed collection judgment must explicitly supersede the current decision.';
    end if;
  elsif p_supersedes_decision_id is not null then
    raise exception 'There is no current evidence decision to supersede.';
  end if;

  if p_finality_reason = 'late_cure'
     and not matching_current
     and (
       current_decision.id is null
       or current_decision.finality_reason not in (
         'terminal_rejection', 'replacement_expired', 'unjustified_abandonment'
       )
     ) then
    raise exception 'Late cure must supersede a current negative terminal decision.';
  end if;

  result_value := public.record_trade_evidence_decision_v1(
    p_milestone_id => milestone_row.id,
    p_review_id => p_review_id,
    p_decision_confidence_band => p_decision_confidence_band,
    p_primary_provenance_class => p_primary_provenance_class,
    p_provider_authentication_status => p_provider_authentication_status,
    p_provider_authentication_ref => btrim(coalesce(p_provider_authentication_ref, '')),
    p_adjudication_class => derived_adjudication_class,
    p_contradiction_status => p_contradiction_status,
    p_integrity_finding => p_integrity_finding,
    p_responsiveness_finding => p_responsiveness_finding,
    p_dispute_conduct_finding => p_dispute_conduct_finding,
    p_finality_reason => p_finality_reason,
    p_exclusion_reason => btrim(coalesce(p_exclusion_reason, '')),
    p_supersedes_decision_id => p_supersedes_decision_id
  );
  decision_id_value := (result_value ->> 'decisionId')::uuid;

  source_snapshot_value := jsonb_build_object(
    'queueKind', 'evidence',
    'milestoneId', milestone_row.id,
    'agreementId', milestone_row.agreement_id,
    'reviewId', p_review_id,
    'sourceStatus', milestone_row.status,
    'reviewKind', case when p_review_id is null then null else review_row.review_kind end,
    'reviewOutcome', case when p_review_id is null then null else review_row.outcome end,
    'derivedAdjudicationClass', derived_adjudication_class,
    'finalityReason', p_finality_reason,
    'shadowOnly', true,
    'activePublicCredibilityUnaffected', true
  );

  insert into public.credibility_shadow_collection_audit (
    queue_kind,
    queue_key,
    milestone_id,
    payout_id,
    evidence_decision_id,
    settlement_decision_id,
    source_review_id,
    source_payment_review_decision_id,
    supersedes_decision_id,
    private_rationale,
    source_snapshot,
    recorded_by
  ) values (
    'evidence',
    'evidence:' || milestone_row.id::text,
    milestone_row.id,
    null,
    decision_id_value,
    null,
    p_review_id,
    null,
    p_supersedes_decision_id,
    btrim(p_private_rationale),
    source_snapshot_value,
    auth.uid()
  )
  on conflict (evidence_decision_id) where evidence_decision_id is not null
  do nothing;

  select id, private_rationale
  into audit_id_value, audit_rationale_value
  from public.credibility_shadow_collection_audit audit_record
  where audit_record.evidence_decision_id = decision_id_value;
  if audit_rationale_value is distinct from btrim(p_private_rationale) then
    raise exception 'This evidence decision was already collected with a different private rationale.';
  end if;

  return result_value || jsonb_build_object(
    'auditId', audit_id_value,
    'derivedAdjudicationClass', derived_adjudication_class,
    'shadowOnly', true,
    'activePublicCredibilityUnaffected', true
  );
end;
$function$;

create or replace function public.record_credibility_shadow_settlement_collection_v1(
  p_payout_id uuid,
  p_payment_review_decision_id uuid,
  p_decision_confidence_band smallint,
  p_primary_provenance_class text,
  p_provider_authentication_status text,
  p_provider_authentication_ref text,
  p_finality_reason text,
  p_exclusion_reason text,
  p_supersedes_decision_id uuid,
  p_private_rationale text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  payout_row public.trade_milestone_payouts%rowtype;
  milestone_row public.trade_agreement_milestones%rowtype;
  payment_decision_row public.trade_payment_review_decisions%rowtype;
  payment_case_row public.trade_payment_review_cases%rowtype;
  current_decision public.trade_settlement_shadow_decisions%rowtype;
  allowed_finality_reasons text[];
  derived_adjudication_class text;
  matching_current boolean := false;
  result_value jsonb;
  decision_id_value uuid;
  audit_id_value uuid;
  audit_rationale_value text;
  source_snapshot_value jsonb;
begin
  perform moral_trade_private.require_credibility_shadow_collection_admin_v1();

  if length(btrim(coalesce(p_private_rationale, ''))) not between 1 and 4000 then
    raise exception 'A private collection rationale is required.';
  end if;

  select * into payout_row
  from public.trade_milestone_payouts payout
  where payout.id = p_payout_id
    and payout.is_final
  for share;
  if not found then
    raise exception 'Final payout is unavailable.';
  end if;

  select * into milestone_row
  from public.trade_agreement_milestones milestone
  where milestone.id = payout_row.milestone_id;

  if p_payment_review_decision_id is not null then
    select * into payment_decision_row
    from public.trade_payment_review_decisions payment_decision
    where payment_decision.id = p_payment_review_decision_id
      and payment_decision.is_final;
    if not found then
      raise exception 'Final payment-review decision is unavailable.';
    end if;
    select * into payment_case_row
    from public.trade_payment_review_cases payment_case
    where payment_case.id = payment_decision_row.case_id
      and payment_case.payout_id = payout_row.id
      and payment_case.final_decision_id = payment_decision_row.id;
    if not found then
      raise exception 'Only the payout case current final decision may be collected.';
    end if;

    derived_adjudication_class := case
      when payment_decision_row.decision_kind = 'appeal'
        then 'appeal_review_final'
      else 'neutral_review_final'
    end;
    allowed_finality_reasons := case
      when payment_decision_row.outcome = 'confirm_paid'
        then array['adjudicated_paid', 'late_payment_cure']::text[]
      when payment_decision_row.outcome = 'still_due'
        then array['adjudicated_unpaid']::text[]
      else array[]::text[]
    end;
  else
    derived_adjudication_class := case
      when p_primary_provenance_class = 'authenticated_provider'
        then 'provider_established'
      else 'platform_established'
    end;
    allowed_finality_reasons := case
      when payout_row.status = 'confirmed' then array['confirmed']::text[]
      when payout_row.status = 'not_due' and milestone_row.status = 'cancelled'
        then array['permissible_cancellation', 'not_due']::text[]
      when payout_row.status = 'not_due' then array['not_due']::text[]
      else array[]::text[]
    end;
  end if;

  if array_length(allowed_finality_reasons, 1) is null
     or not (p_finality_reason = any(allowed_finality_reasons)) then
    raise exception 'The selected settlement finality does not match the current final source.';
  end if;

  select * into current_decision
  from public.trade_settlement_shadow_decisions decision_record
  where decision_record.payout_id = payout_row.id
    and not exists (
      select 1
      from public.trade_settlement_shadow_decisions successor
      where successor.supersedes_decision_id = decision_record.id
    )
  order by decision_record.finalized_at desc, decision_record.created_at desc
  limit 1;

  if found then
    matching_current :=
      current_decision.payment_review_decision_id
        is not distinct from p_payment_review_decision_id
      and current_decision.decision_confidence_band = p_decision_confidence_band
      and current_decision.primary_provenance_class = p_primary_provenance_class
      and current_decision.provider_authentication_status = p_provider_authentication_status
      and current_decision.provider_authentication_ref = btrim(coalesce(p_provider_authentication_ref, ''))
      and current_decision.adjudication_class = derived_adjudication_class
      and current_decision.finality_reason = p_finality_reason
      and current_decision.exclusion_reason = btrim(coalesce(p_exclusion_reason, ''))
      and current_decision.supersedes_decision_id is not distinct from p_supersedes_decision_id;

    if not matching_current
       and p_supersedes_decision_id is distinct from current_decision.id then
      raise exception 'A changed settlement judgment must explicitly supersede the current decision.';
    end if;
  elsif p_supersedes_decision_id is not null then
    raise exception 'There is no current settlement decision to supersede.';
  end if;

  if p_finality_reason = 'late_payment_cure'
     and not matching_current
     and (
       current_decision.id is null
       or current_decision.finality_reason <> 'adjudicated_unpaid'
     ) then
    raise exception 'Late payment cure must supersede a current unpaid decision.';
  end if;

  result_value := public.record_trade_settlement_shadow_decision_v1(
    p_payout_id => payout_row.id,
    p_payment_review_decision_id => p_payment_review_decision_id,
    p_decision_confidence_band => p_decision_confidence_band,
    p_primary_provenance_class => p_primary_provenance_class,
    p_provider_authentication_status => p_provider_authentication_status,
    p_provider_authentication_ref => btrim(coalesce(p_provider_authentication_ref, '')),
    p_adjudication_class => derived_adjudication_class,
    p_finality_reason => p_finality_reason,
    p_exclusion_reason => btrim(coalesce(p_exclusion_reason, '')),
    p_supersedes_decision_id => p_supersedes_decision_id
  );
  decision_id_value := (result_value ->> 'decisionId')::uuid;

  source_snapshot_value := jsonb_build_object(
    'queueKind', 'settlement',
    'milestoneId', milestone_row.id,
    'agreementId', milestone_row.agreement_id,
    'payoutId', payout_row.id,
    'paymentReviewDecisionId', p_payment_review_decision_id,
    'payoutStatus', payout_row.status,
    'paymentDecisionKind', case
      when p_payment_review_decision_id is null then null
      else payment_decision_row.decision_kind
    end,
    'paymentDecisionOutcome', case
      when p_payment_review_decision_id is null then null
      else payment_decision_row.outcome
    end,
    'derivedAdjudicationClass', derived_adjudication_class,
    'finalityReason', p_finality_reason,
    'shadowOnly', true,
    'activePublicCredibilityUnaffected', true
  );

  insert into public.credibility_shadow_collection_audit (
    queue_kind,
    queue_key,
    milestone_id,
    payout_id,
    evidence_decision_id,
    settlement_decision_id,
    source_review_id,
    source_payment_review_decision_id,
    supersedes_decision_id,
    private_rationale,
    source_snapshot,
    recorded_by
  ) values (
    'settlement',
    'settlement:' || payout_row.id::text,
    milestone_row.id,
    payout_row.id,
    null,
    decision_id_value,
    null,
    p_payment_review_decision_id,
    p_supersedes_decision_id,
    btrim(p_private_rationale),
    source_snapshot_value,
    auth.uid()
  )
  on conflict (settlement_decision_id) where settlement_decision_id is not null
  do nothing;

  select id, private_rationale
  into audit_id_value, audit_rationale_value
  from public.credibility_shadow_collection_audit audit_record
  where audit_record.settlement_decision_id = decision_id_value;
  if audit_rationale_value is distinct from btrim(p_private_rationale) then
    raise exception 'This settlement decision was already collected with a different private rationale.';
  end if;

  return result_value || jsonb_build_object(
    'auditId', audit_id_value,
    'derivedAdjudicationClass', derived_adjudication_class,
    'shadowOnly', true,
    'activePublicCredibilityUnaffected', true
  );
end;
$function$;

revoke execute on function moral_trade_private.require_credibility_shadow_collection_admin_v1()
  from public, anon, authenticated, service_role;

revoke execute on function public.list_credibility_shadow_collection_queue_v1(integer, integer)
  from public, anon, authenticated, service_role;
grant execute on function public.list_credibility_shadow_collection_queue_v1(integer, integer)
  to authenticated;

revoke execute on function public.record_credibility_shadow_evidence_collection_v1(
  uuid, uuid, smallint, text, text, text, text, text, text, text,
  text, text, uuid, text
) from public, anon, authenticated, service_role;
grant execute on function public.record_credibility_shadow_evidence_collection_v1(
  uuid, uuid, smallint, text, text, text, text, text, text, text,
  text, text, uuid, text
) to authenticated;

revoke execute on function public.record_credibility_shadow_settlement_collection_v1(
  uuid, uuid, smallint, text, text, text, text, text, uuid, text
) from public, anon, authenticated, service_role;
grant execute on function public.record_credibility_shadow_settlement_collection_v1(
  uuid, uuid, smallint, text, text, text, text, text, uuid, text
) to authenticated;

comment on table public.credibility_shadow_collection_audit is
  'Private append-only AAL2-administrator rationale and source snapshot for shadow evidence and settlement collection.';
comment on function public.list_credibility_shadow_collection_queue_v1(integer, integer) is
  'Lists only private final milestone and settlement sources that lack a matching current shadow decision.';
comment on function public.record_credibility_shadow_evidence_collection_v1(
  uuid, uuid, smallint, text, text, text, text, text, text, text,
  text, text, uuid, text
) is
  'AAL2-administrator wrapper around the existing append-only milestone evidence-decision shadow RPC.';
comment on function public.record_credibility_shadow_settlement_collection_v1(
  uuid, uuid, smallint, text, text, text, text, text, uuid, text
) is
  'AAL2-administrator wrapper around the existing append-only settlement-decision shadow RPC.';

notify pgrst, 'reload schema';
