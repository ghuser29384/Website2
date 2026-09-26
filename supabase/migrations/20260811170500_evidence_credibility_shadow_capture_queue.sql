-- Private AAL2-administrator capture queue for the shadow-only
-- Evidence Decision -> Contextual Credibility integration.
--
-- This migration does not activate public credibility, ranking, exposure,
-- safeguards, eligibility, restrictions, or the milestone cutover.

create table if not exists public.trade_shadow_capture_records (
  id uuid primary key default gen_random_uuid(),
  evidence_decision_id uuid
    references public.trade_evidence_decisions(id) on delete restrict,
  settlement_decision_id uuid
    references public.trade_settlement_shadow_decisions(id) on delete restrict,
  private_rationale text not null,
  private_rationale_hash text not null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint trade_shadow_capture_records_one_source_check
    check (num_nonnulls(evidence_decision_id, settlement_decision_id) = 1),
  constraint trade_shadow_capture_records_rationale_check
    check (length(btrim(private_rationale)) between 1 and 4000),
  constraint trade_shadow_capture_records_rationale_hash_check
    check (private_rationale_hash ~ '^[0-9a-f]{64}$'),
  unique (evidence_decision_id),
  unique (settlement_decision_id)
);

create index if not exists trade_shadow_capture_records_created_by_idx
  on public.trade_shadow_capture_records(created_by, created_at desc)
  where created_by is not null;
create index if not exists trade_shadow_capture_records_created_at_idx
  on public.trade_shadow_capture_records(created_at desc);

drop trigger if exists trade_shadow_capture_records_append_only
  on public.trade_shadow_capture_records;
create trigger trade_shadow_capture_records_append_only
before update or delete on public.trade_shadow_capture_records
for each row execute function moral_trade_private.reject_credibility_shadow_history_mutation();

alter table public.trade_shadow_capture_records enable row level security;
revoke all on table public.trade_shadow_capture_records
  from public, anon, authenticated;
grant select on table public.trade_shadow_capture_records to service_role;

create or replace function moral_trade_private.require_shadow_capture_administrator()
returns void
language plpgsql
stable
security definer
set search_path = ''
as $function$
begin
  if coalesce(auth.jwt() ->> 'role', '') <> 'service_role'
     and not moral_trade_private.current_actor_has_trade_role('administrator') then
    raise exception 'Shadow capture requires an AAL2 Moral Trade administrator.';
  end if;

  if not exists (
    select 1
    from public.credibility_shadow_controls control
    where control.control_key = 'evidence_decision_v2'
      and control.mode = 'shadow'
      and not control.milestone_cutover_enabled
      and not control.public_effects_enabled
      and not control.ranking_effects_enabled
      and not control.eligibility_effects_enabled
  ) then
    raise exception 'Shadow capture is unavailable unless every active-effect switch is fail-closed.';
  end if;
end;
$function$;

revoke execute on function
  moral_trade_private.require_shadow_capture_administrator()
  from public, anon, authenticated, service_role;

create or replace function public.list_trade_evidence_shadow_capture_queue_v1(
  p_limit integer default 50,
  p_offset integer default 0
)
returns table (
  milestone_id uuid,
  agreement_id uuid,
  agreement_version_id uuid,
  agreement_lifecycle_status text,
  agreement_evidence_due_at date,
  milestone_position integer,
  action_category text,
  description text,
  unit_label text,
  units_total numeric,
  indivisible boolean,
  maximum_amount_cents bigint,
  currency text,
  evidence_rule text,
  no_trade_baseline text,
  final_review_id uuid,
  review_kind text,
  review_outcome text,
  completion_units numeric,
  payout_factor_band smallint,
  review_finalized_at timestamptz,
  evidence_bundle_id uuid,
  evidence_item_count bigint,
  evidence_type_counts jsonb,
  current_decision_id uuid,
  current_decision_review_id uuid,
  current_decision_status text,
  current_decision_finality_reason text,
  current_completion_fraction numeric,
  requires_supersession boolean,
  derived_adjudication_class text,
  suggested_finality_reason text,
  allowed_finality_reasons text[]
)
language plpgsql
security definer
set search_path = ''
as $function$
begin
  perform moral_trade_private.require_shadow_capture_administrator();

  if p_limit < 1 or p_limit > 200 or p_offset < 0 then
    raise exception 'Invalid shadow-capture queue page.';
  end if;

  return query
  with current_decisions as (
    select distinct on (decision_record.milestone_id)
      decision_record.*
    from public.trade_evidence_decisions decision_record
    where not exists (
      select 1
      from public.trade_evidence_decisions successor
      where successor.supersedes_decision_id = decision_record.id
    )
    order by
      decision_record.milestone_id,
      decision_record.finalized_at desc,
      decision_record.created_at desc,
      decision_record.id desc
  ),
  evidence_summaries as (
    select
      bundle.id as bundle_id,
      (
        select count(*)::bigint
        from public.trade_evidence_bundle_items item
        where item.bundle_id = bundle.id
      ) as item_count,
      (
        select coalesce(
          jsonb_object_agg(type_count.evidence_type, type_count.item_count),
          '{}'::jsonb
        )
        from (
          select
            grouped_item.evidence_type,
            count(*)::bigint as item_count
          from public.trade_evidence_bundle_items grouped_item
          where grouped_item.bundle_id = bundle.id
          group by grouped_item.evidence_type
        ) type_count
      ) as type_counts
    from public.trade_evidence_bundles bundle
  ),
  reviewed_candidates as (
    select
      milestone.id as milestone_id,
      milestone.agreement_id,
      milestone.agreement_version_id,
      agreement.lifecycle_status as agreement_lifecycle_status,
      agreement.evidence_due_at as agreement_evidence_due_at,
      milestone.position as milestone_position,
      milestone.action_category,
      milestone.description,
      milestone.unit_label,
      milestone.units_total,
      milestone.indivisible,
      milestone.maximum_amount_cents,
      milestone.currency,
      milestone.evidence_rule,
      version.no_trade_baseline,
      review.id as final_review_id,
      review.review_kind,
      review.outcome as review_outcome,
      review.completion_units,
      review.confidence_band as payout_factor_band,
      review.finalized_at as review_finalized_at,
      review.bundle_id as evidence_bundle_id,
      coalesce(summary.item_count, 0)::bigint as evidence_item_count,
      coalesce(summary.type_counts, '{}'::jsonb) as evidence_type_counts,
      current_decision.id as current_decision_id,
      current_decision.review_id as current_decision_review_id,
      current_decision.decision_status as current_decision_status,
      current_decision.finality_reason as current_decision_finality_reason,
      current_decision.completion_fraction as current_completion_fraction,
      current_decision.id is not null as requires_supersession,
      case
        when review.review_kind = 'appeal' then 'appeal_review_final'
        else 'neutral_review_final'
      end as derived_adjudication_class,
      case
        when review.review_kind = 'appeal'
         and base_review.id is not null
         and base_review.outcome is not distinct from review.outcome
         and base_review.completion_units is not distinct from review.completion_units
          then 'appeal_affirmed'
        when review.review_kind = 'appeal' then 'appeal_overturned'
        when review.review_kind = 'replacement' and review.outcome = 'graded'
          then 'replacement_success'
        when review.outcome = 'rejected' then 'terminal_rejection'
        else 'review_final'
      end as suggested_finality_reason,
      case
        when review.review_kind = 'appeal'
         and base_review.id is not null
         and base_review.outcome is not distinct from review.outcome
         and base_review.completion_units is not distinct from review.completion_units
          then array['appeal_affirmed']::text[]
        when review.review_kind = 'appeal'
          then array['appeal_overturned']::text[]
        when review.review_kind = 'replacement' and review.outcome = 'graded'
          then array['replacement_success', 'late_cure']::text[]
        when review.outcome = 'rejected'
          then array['terminal_rejection']::text[]
        else array['review_final']::text[]
      end as allowed_finality_reasons,
      review.finalized_at as queue_time
    from public.trade_agreement_milestones milestone
    join public.agreements agreement
      on agreement.id = milestone.agreement_id
    join public.trade_agreement_versions version
      on version.id = milestone.agreement_version_id
     and version.agreement_id = milestone.agreement_id
    join public.trade_milestone_reviews review
      on review.id = milestone.final_review_id
     and review.milestone_id = milestone.id
     and review.is_final
     and review.finalized_at is not null
    join public.trade_milestone_payouts payout
      on payout.milestone_id = milestone.id
     and payout.review_id = review.id
     and payout.is_final
    left join public.trade_milestone_reviews base_review
      on base_review.id = review.base_review_id
    left join evidence_summaries summary
      on summary.bundle_id = review.bundle_id
    left join current_decisions current_decision
      on current_decision.milestone_id = milestone.id
    where current_decision.id is null
       or current_decision.review_id is distinct from review.id
  ),
  no_review_candidates as (
    select
      milestone.id as milestone_id,
      milestone.agreement_id,
      milestone.agreement_version_id,
      agreement.lifecycle_status as agreement_lifecycle_status,
      agreement.evidence_due_at as agreement_evidence_due_at,
      milestone.position as milestone_position,
      milestone.action_category,
      milestone.description,
      milestone.unit_label,
      milestone.units_total,
      milestone.indivisible,
      milestone.maximum_amount_cents,
      milestone.currency,
      milestone.evidence_rule,
      version.no_trade_baseline,
      null::uuid as final_review_id,
      null::text as review_kind,
      null::text as review_outcome,
      null::numeric as completion_units,
      null::smallint as payout_factor_band,
      null::timestamptz as review_finalized_at,
      milestone.current_bundle_id as evidence_bundle_id,
      coalesce(bundle_summary.item_count, 0)::bigint as evidence_item_count,
      coalesce(bundle_summary.type_counts, '{}'::jsonb) as evidence_type_counts,
      current_decision.id as current_decision_id,
      current_decision.review_id as current_decision_review_id,
      current_decision.decision_status as current_decision_status,
      current_decision.finality_reason as current_decision_finality_reason,
      current_decision.completion_fraction as current_completion_fraction,
      false as requires_supersession,
      case
        when milestone.status = 'replacement_due' then 'platform_established'
        when agreement.lifecycle_status = 'expired' then 'platform_established'
        else 'unreviewed'
      end as derived_adjudication_class,
      case
        when milestone.status = 'replacement_due' then 'replacement_expired'
        when agreement.lifecycle_status = 'cancelled' then 'permissible_exit'
        when agreement.lifecycle_status = 'disputed' then 'unresolved_dispute'
        else 'unjustified_abandonment'
      end as suggested_finality_reason,
      case
        when milestone.status = 'replacement_due'
          then array['replacement_expired']::text[]
        when agreement.lifecycle_status = 'cancelled'
          then array['permissible_exit', 'force_majeure', 'mutual_cancellation']::text[]
        when agreement.lifecycle_status = 'disputed'
          then array['unresolved_dispute']::text[]
        else array['unjustified_abandonment']::text[]
      end as allowed_finality_reasons,
      coalesce(
        milestone.replacement_deadline_at,
        agreement.cancelled_at,
        agreement.evidence_due_at::timestamptz,
        milestone.updated_at
      ) as queue_time
    from public.trade_agreement_milestones milestone
    join public.agreements agreement
      on agreement.id = milestone.agreement_id
    join public.trade_agreement_versions version
      on version.id = milestone.agreement_version_id
     and version.agreement_id = milestone.agreement_id
    left join current_decisions current_decision
      on current_decision.milestone_id = milestone.id
    left join lateral (
      select
        (
          select count(*)::bigint
          from public.trade_evidence_bundle_items item
          where item.bundle_id = milestone.current_bundle_id
        ) as item_count,
        (
          select coalesce(
            jsonb_object_agg(type_count.evidence_type, type_count.item_count),
            '{}'::jsonb
          )
          from (
            select
              grouped_item.evidence_type,
              count(*)::bigint as item_count
            from public.trade_evidence_bundle_items grouped_item
            where grouped_item.bundle_id = milestone.current_bundle_id
            group by grouped_item.evidence_type
          ) type_count
        ) as type_counts
    ) bundle_summary on true
    where milestone.final_review_id is null
      and current_decision.id is null
      and (
        (
          milestone.status = 'replacement_due'
          and milestone.replacement_deadline_at is not null
          and milestone.replacement_deadline_at <= now()
        )
        or agreement.lifecycle_status in ('cancelled', 'disputed', 'expired')
        or (
          agreement.lifecycle_status = 'evidence_due'
          and agreement.evidence_due_at is not null
          and agreement.evidence_due_at < current_date
          and milestone.current_bundle_id is null
        )
      )
  ),
  combined as (
    select * from reviewed_candidates
    union all
    select * from no_review_candidates
  )
  select
    combined.milestone_id,
    combined.agreement_id,
    combined.agreement_version_id,
    combined.agreement_lifecycle_status,
    combined.agreement_evidence_due_at,
    combined.milestone_position,
    combined.action_category,
    combined.description,
    combined.unit_label,
    combined.units_total,
    combined.indivisible,
    combined.maximum_amount_cents,
    combined.currency,
    combined.evidence_rule,
    combined.no_trade_baseline,
    combined.final_review_id,
    combined.review_kind,
    combined.review_outcome,
    combined.completion_units,
    combined.payout_factor_band,
    combined.review_finalized_at,
    combined.evidence_bundle_id,
    combined.evidence_item_count,
    combined.evidence_type_counts,
    combined.current_decision_id,
    combined.current_decision_review_id,
    combined.current_decision_status,
    combined.current_decision_finality_reason,
    combined.current_completion_fraction,
    combined.requires_supersession,
    combined.derived_adjudication_class,
    combined.suggested_finality_reason,
    combined.allowed_finality_reasons
  from combined
  order by combined.queue_time asc nulls last, combined.milestone_id
  limit p_limit
  offset p_offset;
end;
$function$;

create or replace function public.list_trade_settlement_shadow_capture_queue_v1(
  p_limit integer default 50,
  p_offset integer default 0
)
returns table (
  payout_id uuid,
  agreement_id uuid,
  milestone_id uuid,
  action_category text,
  maximum_amount_cents bigint,
  amount_due_cents bigint,
  currency text,
  payout_status text,
  payout_finalized_at timestamptz,
  payment_review_decision_id uuid,
  payment_decision_kind text,
  payment_decision_outcome text,
  payment_decision_finalized_at timestamptz,
  current_decision_id uuid,
  current_payment_review_decision_id uuid,
  current_decision_status text,
  current_decision_finality_reason text,
  current_outcome numeric,
  requires_supersession boolean,
  derived_adjudication_class text,
  suggested_finality_reason text,
  allowed_finality_reasons text[]
)
language plpgsql
security definer
set search_path = ''
as $function$
begin
  perform moral_trade_private.require_shadow_capture_administrator();

  if p_limit < 1 or p_limit > 200 or p_offset < 0 then
    raise exception 'Invalid shadow-capture queue page.';
  end if;

  return query
  with current_decisions as (
    select distinct on (decision_record.payout_id)
      decision_record.*
    from public.trade_settlement_shadow_decisions decision_record
    where not exists (
      select 1
      from public.trade_settlement_shadow_decisions successor
      where successor.supersedes_decision_id = decision_record.id
    )
    order by
      decision_record.payout_id,
      decision_record.finalized_at desc,
      decision_record.created_at desc,
      decision_record.id desc
  )
  select
    payout.id,
    milestone.agreement_id,
    milestone.id,
    milestone.action_category,
    payout.maximum_amount_cents,
    payout.amount_due_cents,
    payout.currency,
    payout.status,
    payout.finalized_at,
    payment_decision.id,
    payment_decision.decision_kind,
    payment_decision.outcome,
    payment_decision.finalized_at,
    current_decision.id,
    current_decision.payment_review_decision_id,
    current_decision.decision_status,
    current_decision.finality_reason,
    current_decision.outcome,
    current_decision.id is not null,
    case
      when payment_decision.decision_kind = 'appeal' then 'appeal_review_final'
      when payment_decision.id is not null then 'neutral_review_final'
      when payout.status = 'confirmed' then 'bilateral_confirmed'
      else 'platform_established'
    end,
    case
      when payout.status = 'confirmed' then 'confirmed'
      when payout.status = 'adjudicated_paid' and current_decision.id is not null
        then 'late_payment_cure'
      when payout.status = 'adjudicated_paid' then 'adjudicated_paid'
      when payout.status = 'still_due' then 'adjudicated_unpaid'
      else 'not_due'
    end,
    case
      when payout.status = 'confirmed'
        then array['confirmed']::text[]
      when payout.status = 'adjudicated_paid' and current_decision.id is not null
        then array['late_payment_cure', 'administrative_correction']::text[]
      when payout.status = 'adjudicated_paid'
        then array['adjudicated_paid']::text[]
      when payout.status = 'still_due' and current_decision.id is not null
        then array['adjudicated_unpaid', 'administrative_correction']::text[]
      when payout.status = 'still_due'
        then array['adjudicated_unpaid']::text[]
      else array['not_due']::text[]
    end
  from public.trade_milestone_payouts payout
  join public.trade_agreement_milestones milestone
    on milestone.id = payout.milestone_id
  left join public.trade_payment_review_cases payment_case
    on payment_case.payout_id = payout.id
   and payment_case.final_decision_id is not null
  left join public.trade_payment_review_decisions payment_decision
    on payment_decision.id = payment_case.final_decision_id
   and payment_decision.is_final
   and payment_decision.finalized_at is not null
  left join current_decisions current_decision
    on current_decision.payout_id = payout.id
  where payout.is_final
    and payout.status in ('not_due', 'confirmed', 'adjudicated_paid', 'still_due')
    and (
      current_decision.id is null
      or current_decision.payment_review_decision_id
          is distinct from payment_decision.id
      or current_decision.outcome is distinct from case
        when payout.status in ('confirmed', 'adjudicated_paid') then 1::numeric
        when payout.status = 'still_due' then 0::numeric
        else null::numeric
      end
    )
  order by
    coalesce(payment_decision.finalized_at, payout.finalized_at) asc nulls last,
    payout.id
  limit p_limit
  offset p_offset;
end;
$function$;

create or replace function public.record_trade_evidence_shadow_capture_v1(
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
  p_private_rationale text,
  p_supersedes_decision_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  actor_id uuid := auth.uid();
  review_row public.trade_milestone_reviews%rowtype;
  base_review_row public.trade_milestone_reviews%rowtype;
  milestone_row public.trade_agreement_milestones%rowtype;
  agreement_row public.agreements%rowtype;
  adjudication_class_value text;
  result jsonb;
  decision_id_value uuid;
  capture_id_value uuid;
  rationale_hash_value text;
  existing_hash text;
begin
  perform moral_trade_private.require_shadow_capture_administrator();

  if length(btrim(coalesce(p_private_rationale, ''))) not between 1 and 4000 then
    raise exception 'A private capture rationale is required.';
  end if;

  select * into milestone_row
  from public.trade_agreement_milestones milestone
  where milestone.id = p_milestone_id;
  if not found then
    raise exception 'Milestone is unavailable.';
  end if;

  select * into agreement_row
  from public.agreements agreement
  where agreement.id = milestone_row.agreement_id;

  if p_review_id is not null then
    select * into review_row
    from public.trade_milestone_reviews review
    where review.id = p_review_id
      and review.milestone_id = milestone_row.id
      and review.is_final
      and review.finalized_at is not null;
    if not found or milestone_row.final_review_id is distinct from review_row.id then
      raise exception 'Only the current final milestone review may be captured.';
    end if;
    adjudication_class_value := case
      when review_row.review_kind = 'appeal' then 'appeal_review_final'
      else 'neutral_review_final'
    end;

    if review_row.review_kind = 'appeal' then
      select * into base_review_row
      from public.trade_milestone_reviews base_review
      where base_review.id = review_row.base_review_id;
      if not found then
        raise exception 'The final appeal review has no valid base review.';
      end if;
      if base_review_row.outcome is not distinct from review_row.outcome
         and base_review_row.completion_units is not distinct from review_row.completion_units then
        if p_finality_reason <> 'appeal_affirmed' then
          raise exception 'This appeal result must be captured as appeal affirmed.';
        end if;
      elsif p_finality_reason <> 'appeal_overturned' then
        raise exception 'This changed appeal result must be captured as appeal overturned.';
      end if;
    elsif review_row.review_kind = 'replacement' then
      if review_row.outcome = 'graded'
         and p_finality_reason not in ('replacement_success', 'late_cure') then
        raise exception 'A graded replacement must be captured as replacement success or late cure.';
      elsif review_row.outcome = 'rejected'
         and p_finality_reason <> 'terminal_rejection' then
        raise exception 'A rejected replacement must be captured as terminal rejection.';
      end if;
    elsif review_row.outcome = 'rejected' then
      if p_finality_reason <> 'terminal_rejection' then
        raise exception 'A rejected final review must be captured as terminal rejection.';
      end if;
    elsif p_finality_reason <> 'review_final' then
      raise exception 'An initial graded review must be captured as review final.';
    end if;
  else
    adjudication_class_value := case
      when p_finality_reason in ('replacement_expired', 'unjustified_abandonment')
        then 'platform_established'
      else 'unreviewed'
    end;

    if p_finality_reason = 'replacement_expired' and not (
      milestone_row.status = 'replacement_due'
      and milestone_row.replacement_deadline_at is not null
      and milestone_row.replacement_deadline_at <= now()
    ) then
      raise exception 'Replacement expiry is not established by the milestone state.';
    elsif p_finality_reason in (
      'permissible_exit', 'force_majeure', 'mutual_cancellation'
    ) and agreement_row.lifecycle_status <> 'cancelled' then
      raise exception 'This exit finality requires a cancelled agreement.';
    elsif p_finality_reason = 'unresolved_dispute'
      and agreement_row.lifecycle_status <> 'disputed' then
      raise exception 'Unresolved-dispute finality requires a disputed agreement.';
    elsif p_finality_reason = 'unjustified_abandonment' and not (
      agreement_row.lifecycle_status = 'expired'
      or (
        agreement_row.lifecycle_status = 'evidence_due'
        and agreement_row.evidence_due_at is not null
        and agreement_row.evidence_due_at < current_date
        and milestone_row.current_bundle_id is null
      )
    ) then
      raise exception 'Unjustified abandonment is not established by the current lifecycle.';
    end if;
  end if;

  result := public.record_trade_evidence_decision_v1(
    p_milestone_id => p_milestone_id,
    p_review_id => p_review_id,
    p_decision_confidence_band => p_decision_confidence_band,
    p_primary_provenance_class => p_primary_provenance_class,
    p_provider_authentication_status => p_provider_authentication_status,
    p_provider_authentication_ref => coalesce(p_provider_authentication_ref, ''),
    p_adjudication_class => adjudication_class_value,
    p_contradiction_status => p_contradiction_status,
    p_integrity_finding => p_integrity_finding,
    p_responsiveness_finding => p_responsiveness_finding,
    p_dispute_conduct_finding => p_dispute_conduct_finding,
    p_finality_reason => p_finality_reason,
    p_exclusion_reason => coalesce(p_exclusion_reason, ''),
    p_supersedes_decision_id => p_supersedes_decision_id
  );

  decision_id_value := (result ->> 'decisionId')::uuid;
  rationale_hash_value := encode(
    extensions.digest(
      convert_to(btrim(p_private_rationale), 'UTF8'),
      'sha256'
    ),
    'hex'
  );

  insert into public.trade_shadow_capture_records (
    evidence_decision_id,
    private_rationale,
    private_rationale_hash,
    created_by
  ) values (
    decision_id_value,
    btrim(p_private_rationale),
    rationale_hash_value,
    actor_id
  )
  on conflict (evidence_decision_id) do nothing
  returning id into capture_id_value;

  if capture_id_value is null then
    select record.id, record.private_rationale_hash
    into capture_id_value, existing_hash
    from public.trade_shadow_capture_records record
    where record.evidence_decision_id = decision_id_value;

    if existing_hash is distinct from rationale_hash_value then
      raise exception 'The immutable private rationale for this capture differs from the existing record.';
    end if;
  end if;

  return result || jsonb_build_object(
    'captureId', capture_id_value,
    'adjudicationClass', adjudication_class_value,
    'shadowOnly', true
  );
end;
$function$;

create or replace function public.record_trade_settlement_shadow_capture_v1(
  p_payout_id uuid,
  p_payment_review_decision_id uuid,
  p_decision_confidence_band smallint,
  p_primary_provenance_class text,
  p_provider_authentication_status text,
  p_provider_authentication_ref text,
  p_finality_reason text,
  p_exclusion_reason text,
  p_private_rationale text,
  p_supersedes_decision_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  actor_id uuid := auth.uid();
  payment_decision public.trade_payment_review_decisions%rowtype;
  payout_row public.trade_milestone_payouts%rowtype;
  adjudication_class_value text;
  result jsonb;
  decision_id_value uuid;
  capture_id_value uuid;
  rationale_hash_value text;
  existing_hash text;
begin
  perform moral_trade_private.require_shadow_capture_administrator();

  if length(btrim(coalesce(p_private_rationale, ''))) not between 1 and 4000 then
    raise exception 'A private capture rationale is required.';
  end if;

  select * into payout_row
  from public.trade_milestone_payouts payout
  where payout.id = p_payout_id
    and payout.is_final;
  if not found then
    raise exception 'Only a final milestone payout may be captured.';
  end if;

  if p_payment_review_decision_id is not null then
    select decision_record.* into payment_decision
    from public.trade_payment_review_decisions decision_record
    join public.trade_payment_review_cases case_record
      on case_record.id = decision_record.case_id
     and case_record.payout_id = payout_row.id
     and case_record.final_decision_id = decision_record.id
    where decision_record.id = p_payment_review_decision_id
      and decision_record.is_final
      and decision_record.finalized_at is not null;
    if not found then
      raise exception 'Only the current final payment-review decision may be captured.';
    end if;
    adjudication_class_value := case
      when payment_decision.decision_kind = 'appeal' then 'appeal_review_final'
      else 'neutral_review_final'
    end;
  else
    adjudication_class_value := case
      when payout_row.status = 'confirmed' then 'bilateral_confirmed'
      else 'platform_established'
    end;
  end if;

  result := public.record_trade_settlement_shadow_decision_v1(
    p_payout_id => p_payout_id,
    p_payment_review_decision_id => p_payment_review_decision_id,
    p_decision_confidence_band => p_decision_confidence_band,
    p_primary_provenance_class => p_primary_provenance_class,
    p_provider_authentication_status => p_provider_authentication_status,
    p_provider_authentication_ref => coalesce(p_provider_authentication_ref, ''),
    p_adjudication_class => adjudication_class_value,
    p_finality_reason => p_finality_reason,
    p_exclusion_reason => coalesce(p_exclusion_reason, ''),
    p_supersedes_decision_id => p_supersedes_decision_id
  );

  decision_id_value := (result ->> 'decisionId')::uuid;
  rationale_hash_value := encode(
    extensions.digest(
      convert_to(btrim(p_private_rationale), 'UTF8'),
      'sha256'
    ),
    'hex'
  );

  insert into public.trade_shadow_capture_records (
    settlement_decision_id,
    private_rationale,
    private_rationale_hash,
    created_by
  ) values (
    decision_id_value,
    btrim(p_private_rationale),
    rationale_hash_value,
    actor_id
  )
  on conflict (settlement_decision_id) do nothing
  returning id into capture_id_value;

  if capture_id_value is null then
    select record.id, record.private_rationale_hash
    into capture_id_value, existing_hash
    from public.trade_shadow_capture_records record
    where record.settlement_decision_id = decision_id_value;

    if existing_hash is distinct from rationale_hash_value then
      raise exception 'The immutable private rationale for this capture differs from the existing record.';
    end if;
  end if;

  return result || jsonb_build_object(
    'captureId', capture_id_value,
    'adjudicationClass', adjudication_class_value,
    'shadowOnly', true
  );
end;
$function$;

revoke execute on function public.list_trade_evidence_shadow_capture_queue_v1(integer, integer)
  from public, anon;
grant execute on function public.list_trade_evidence_shadow_capture_queue_v1(integer, integer)
  to authenticated, service_role;

revoke execute on function public.list_trade_settlement_shadow_capture_queue_v1(integer, integer)
  from public, anon;
grant execute on function public.list_trade_settlement_shadow_capture_queue_v1(integer, integer)
  to authenticated, service_role;

revoke execute on function public.record_trade_evidence_shadow_capture_v1(
  uuid, uuid, smallint, text, text, text, text, text, text, text, text, text, text, uuid
) from public, anon;
grant execute on function public.record_trade_evidence_shadow_capture_v1(
  uuid, uuid, smallint, text, text, text, text, text, text, text, text, text, text, uuid
) to authenticated, service_role;

revoke execute on function public.record_trade_settlement_shadow_capture_v1(
  uuid, uuid, smallint, text, text, text, text, text, text, uuid
) from public, anon;
grant execute on function public.record_trade_settlement_shadow_capture_v1(
  uuid, uuid, smallint, text, text, text, text, text, text, uuid
) to authenticated, service_role;

comment on table public.trade_shadow_capture_records is
  'Private append-only administrator rationale records for shadow evidence and settlement captures. Never public and never activation-authorizing.';
comment on function public.list_trade_evidence_shadow_capture_queue_v1(integer, integer) is
  'Lists only terminal evidence outcomes missing a current shadow decision, or requiring explicit supersession. AAL2 administrator/service role only.';
comment on function public.list_trade_settlement_shadow_capture_queue_v1(integer, integer) is
  'Lists only final settlement outcomes missing a current shadow decision, or requiring explicit supersession. AAL2 administrator/service role only.';
comment on function public.record_trade_evidence_shadow_capture_v1(
  uuid, uuid, smallint, text, text, text, text, text, text, text, text, text, text, uuid
) is
  'AAL2-administrator wrapper that derives adjudication, records a private rationale, and calls the append-only shadow evidence-decision RPC.';
comment on function public.record_trade_settlement_shadow_capture_v1(
  uuid, uuid, smallint, text, text, text, text, text, text, uuid
) is
  'AAL2-administrator wrapper that derives adjudication, records a private rationale, and calls the append-only shadow settlement-decision RPC.';

notify pgrst, 'reload schema';