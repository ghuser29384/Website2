-- Repair PL/pgSQL name resolution in the atomic multi-threshold approval RPC.
-- The function returns a column named pool_proposal_id, so every table-column
-- reference with that name must be explicitly qualified.
begin;

create or replace function public.mpgf_approve_failure_bonus_premium_schedule(
  proposal_id_input uuid,
  reviewer_id_input uuid,
  rationale_input text
)
returns table (
  pool_proposal_id uuid,
  approved_threshold_count integer,
  approved_at timestamptz
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  proposal_row public.mpgf_pool_proposals%rowtype;
  threshold_item jsonb;
  quote_row public.mpgf_failure_bonus_premium_quotes%rowtype;
  approved_schedule jsonb;
  approved_thresholds jsonb;
  threshold_count integer;
  approved_timestamp timestamptz := timezone('utc', now());
  operator_rationale text := btrim(rationale_input);
begin
  if reviewer_id_input is null
     or not exists (select 1 from public.profiles where id = reviewer_id_input) then
    raise exception using errcode = '23503', message = 'A valid operator profile is required.';
  end if;
  if operator_rationale = '' then
    raise exception using errcode = '22023', message = 'Operator approval requires a rationale.';
  end if;

  select * into proposal_row
  from public.mpgf_pool_proposals
  where id = proposal_id_input
  for update;

  if proposal_row.id is null then
    raise exception using errcode = 'P0002', message = 'Failure-bonus proposal was not found.';
  end if;
  if proposal_row.status <> 'submitted'
     or proposal_row.public_goods_failure_bonus_enabled <> true
     or proposal_row.public_goods_failure_bonus_schedule_status <> 'pending_review'
     or proposal_row.public_goods_success_premium_provisional <> true then
    raise exception using errcode = '23514', message = 'Only a submitted proposal with a complete pending failure-bonus schedule can be approved.';
  end if;
  if proposal_row.first_accepted_pledge_at is not null then
    raise exception using errcode = '23514', message = 'A failure-bonus schedule must be approved before the first accepted pledge.';
  end if;

  threshold_count := jsonb_array_length(
    proposal_row.public_goods_threshold_schedule_json -> 'thresholds'
  );

  if (
    select count(*)
    from public.mpgf_failure_bonus_premium_quotes pending_quote
    where pending_quote.pool_proposal_id = proposal_row.id
      and pending_quote.status = 'pending_review'
  ) <> threshold_count then
    raise exception using errcode = '23514', message = 'The pending quote set does not match the complete threshold schedule.';
  end if;

  for threshold_item in
    select value
    from jsonb_array_elements(
      proposal_row.public_goods_threshold_schedule_json -> 'thresholds'
    )
  loop
    select * into quote_row
    from public.mpgf_failure_bonus_premium_quotes quote_candidate
    where quote_candidate.pool_proposal_id = proposal_row.id
      and quote_candidate.threshold_index = (threshold_item ->> 'thresholdIndex')::integer
      and quote_candidate.status = 'pending_review'
    for update;

    if quote_row.id is null
       or quote_row.threshold_id <> threshold_item ->> 'thresholdId'
       or quote_row.cumulative_net_recipient_threshold_cents <>
          (threshold_item ->> 'cumulativeNetRecipientThresholdCents')::bigint
       or quote_row.incremental_net_recipient_cents <>
          (threshold_item ->> 'incrementalNetRecipientCents')::bigint
       or quote_row.premium_rate_bps <> (threshold_item ->> 'premiumRateBps')::integer
       or quote_row.success_premium_cents <> (threshold_item ->> 'successPremiumCents')::bigint
       or quote_row.cumulative_success_premium_cents <>
          (threshold_item ->> 'cumulativeSuccessPremiumCents')::bigint
       or quote_row.gross_success_requirement_cents <>
          (threshold_item ->> 'grossSuccessRequirementCents')::bigint
       or quote_row.incremental_failure_bonus_exposure_cents <>
          (threshold_item ->> 'incrementalFailureBonusExposureCents')::bigint
       or quote_row.maximum_failure_bonus_exposure_cents <>
          (threshold_item ->> 'maximumFailureBonusExposureCents')::bigint
       or quote_row.pricing_json is distinct from threshold_item -> 'assumptions'
       or quote_row.eligibility_json is distinct from
          proposal_row.public_goods_failure_bonus_eligibility_json then
      raise exception using errcode = '23514', message = 'A pending threshold quote differs from the current proposal schedule.';
    end if;
  end loop;

  select jsonb_agg(
    (value - 'provisional' - 'rationale') || jsonb_build_object(
      'provisional', false,
      'rationale', operator_rationale
    )
    order by (value ->> 'thresholdIndex')::integer
  ) into approved_thresholds
  from jsonb_array_elements(
    proposal_row.public_goods_threshold_schedule_json -> 'thresholds'
  );

  approved_schedule := jsonb_set(
    proposal_row.public_goods_threshold_schedule_json,
    '{thresholds}',
    approved_thresholds,
    false
  );

  perform set_config(
    'app.mpgf_failure_bonus_schedule_approval',
    proposal_row.id::text,
    true
  );

  update public.mpgf_pool_proposals
  set public_goods_threshold_schedule_json = approved_schedule,
      public_goods_failure_bonus_schedule_status = 'approved',
      public_goods_success_premium_provisional = false
  where id = proposal_row.id;

  update public.mpgf_failure_bonus_premium_quotes approved_quote
  set status = 'approved',
      provisional = false,
      rationale = operator_rationale,
      approved_by = reviewer_id_input,
      approved_at = approved_timestamp
  where approved_quote.pool_proposal_id = proposal_row.id
    and approved_quote.status = 'pending_review';

  if not found then
    raise exception using errcode = '23514', message = 'No pending threshold quotes were approved.';
  end if;

  return query select proposal_row.id, threshold_count, approved_timestamp;
end;
$function$;

comment on function public.mpgf_approve_failure_bonus_premium_schedule(uuid, uuid, text) is
  'Atomically approves every current threshold quote and finalizes the matching proposal schedule. Partial approval and post-pledge approval are prohibited.';

revoke all on function public.mpgf_approve_failure_bonus_premium_schedule(uuid, uuid, text)
  from public, anon, authenticated;
grant execute on function public.mpgf_approve_failure_bonus_premium_schedule(uuid, uuid, text)
  to service_role;

commit;
