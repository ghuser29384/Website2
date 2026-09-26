create or replace function public.list_credibility_shadow_differential_v1(
  p_limit integer default 100,
  p_offset integer default 0
)
returns table (
  profile_id uuid,
  role text,
  category text,
  dimension text,
  active_effective_observations numeric,
  shadow_effective_observations numeric,
  active_success_rate numeric,
  shadow_success_rate numeric,
  success_rate_delta numeric,
  active_model_version text,
  shadow_model_version text
)
language plpgsql
stable
security definer
set search_path = ''
as $function$
begin
  if coalesce(auth.jwt() ->> 'role', '') <> 'service_role'
     and not moral_trade_private.current_actor_has_trade_role('administrator') then
    raise exception 'Shadow differential access requires an AAL2 administrator.';
  end if;
  if p_limit < 1 or p_limit > 500 or p_offset < 0 then
    raise exception 'Invalid differential page.';
  end if;

  return query
  select
    coalesce(active_row.profile_id, shadow_row.profile_id),
    coalesce(active_row.role, shadow_row.role),
    coalesce(active_row.category, shadow_row.category),
    coalesce(active_row.dimension, shadow_row.dimension),
    coalesce(active_row.effective_observations, 0),
    coalesce(shadow_row.effective_observations, 0),
    case
      when coalesce(active_row.effective_observations, 0) > 0
        then active_row.weighted_success / active_row.effective_observations
      else null
    end,
    case
      when coalesce(shadow_row.effective_observations, 0) > 0
        then shadow_row.weighted_success / shadow_row.effective_observations
      else null
    end,
    case
      when coalesce(active_row.effective_observations, 0) > 0
       and coalesce(shadow_row.effective_observations, 0) > 0
        then
          shadow_row.weighted_success / shadow_row.effective_observations
          - active_row.weighted_success / active_row.effective_observations
      else null
    end,
    active_row.model_version,
    shadow_row.model_version
  from public.credibility_public_aggregates active_row
  full join public.credibility_shadow_aggregates shadow_row
    on shadow_row.profile_id = active_row.profile_id
   and shadow_row.role = active_row.role
   and shadow_row.category = active_row.category
   and shadow_row.dimension = active_row.dimension
  order by
    coalesce(active_row.profile_id, shadow_row.profile_id),
    coalesce(active_row.role, shadow_row.role),
    coalesce(active_row.category, shadow_row.category),
    coalesce(active_row.dimension, shadow_row.dimension)
  limit p_limit
  offset p_offset;
end;
$function$;

-- Preserve the current active public pipeline until a later explicit cutover.
-- Once the private control is deliberately activated, milestone-based agreements
-- stop creating the legacy blanket whole-agreement fulfilment rows.
create or replace function public.handle_completed_agreement_credibility()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  offer_category text;
  cutover_enabled boolean := false;
begin
  if new.status <> 'completed'::public.agreement_status then
    return new;
  end if;

  if tg_op = 'UPDATE' and old.status is not distinct from new.status then
    return new;
  end if;

  select coalesce(control.milestone_cutover_enabled, false)
  into cutover_enabled
  from public.credibility_shadow_controls control
  where control.control_key = 'evidence_decision_v2';

  if cutover_enabled and exists (
    select 1
    from public.trade_agreement_milestones milestone
    where milestone.agreement_id = new.id
  ) then
    return new;
  end if;

  select public.credibility_category_for_offer_mode(offer_record.mode)
  into offer_category
  from public.offers offer_record
  where offer_record.id = new.offer_id;

  offer_category := coalesce(offer_category, 'other');

  insert into public.credibility_events (
    profile_id, agreement_id, counterparty_id, role, category, dimension,
    outcome, evidence_quality, source_type, source_id, reason_code, occurred_at
  )
  values
    (
      new.proposer_id, new.id, new.responder_id, 'committer', offer_category, 'fulfilment',
      1, 'platform_verified', 'agreement_transition', new.id::text || ':proposer:completed',
      'agreement_completed', coalesce(new.updated_at, now())
    ),
    (
      new.responder_id, new.id, new.proposer_id, 'counterparty', offer_category, 'fulfilment',
      1, 'bilateral', 'agreement_transition', new.id::text || ':responder:completed',
      'agreement_completed', coalesce(new.updated_at, now())
    )
  on conflict do nothing;

  return new;
end;
$$;

create or replace function public.handle_paid_agreement_payment_credibility()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  offer_category text;
  cutover_enabled boolean := false;
begin
  if new.status <> 'paid' then
    return new;
  end if;

  if tg_op = 'UPDATE' and old.status is not distinct from new.status then
    return new;
  end if;

  select coalesce(control.milestone_cutover_enabled, false)
  into cutover_enabled
  from public.credibility_shadow_controls control
  where control.control_key = 'evidence_decision_v2';

  if cutover_enabled and exists (
    select 1
    from public.trade_agreement_milestones milestone
    where milestone.agreement_id = new.agreement_id
  ) then
    return new;
  end if;

  select public.credibility_category_for_offer_mode(offer_record.mode)
  into offer_category
  from public.agreements agreement_record
  join public.offers offer_record on offer_record.id = agreement_record.offer_id
  where agreement_record.id = new.agreement_id;

  insert into public.credibility_events (
    profile_id, agreement_id, counterparty_id, role, category, dimension,
    outcome, evidence_quality, stake_units, source_type, source_id, reason_code, occurred_at
  )
  values (
    new.payer_id, new.agreement_id, new.payee_id, 'funder', coalesce(offer_category, 'paid_action'), 'settlement',
    1, 'platform_verified', new.amount_cents::numeric / 100::numeric,
    'payment_transition', new.id::text || ':paid', 'payment_settled', coalesce(new.paid_at, new.updated_at, now())
  )
  on conflict do nothing;

  return new;
end;
$$;
