-- Require the contextual Create safeguard contract and carry the concrete
-- no-trade baseline into the reviewable offer record. The existing v1 adapter
-- remains the atomic target creator; this wrapper adds fail-closed validation
-- and updates the target inside the same transaction.

begin;

create or replace function public.moral_trade_create_submit_service_v2(
  p_actor_id uuid,
  p_submission_key text,
  p_submission_kind text,
  p_source_payload jsonb,
  p_payload_hash text,
  p_cause_area text,
  p_request_kind text,
  p_requested_action text,
  p_offered_summary text,
  p_offered_terms jsonb,
  p_pool_terms jsonb,
  p_target_fields jsonb
)
returns table (
  submission_id uuid,
  target_type text,
  target_id uuid,
  submission_status text,
  canonical_path text
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  result_row record;
  safeguards jsonb := p_source_payload -> 'safeguards';
  baseline_value text;
  affected_party_status text;
  affected_party_plan text;
begin
  if jsonb_typeof(safeguards) is distinct from 'object' then
    raise exception using
      errcode = '22023',
      message = 'Create safeguards are required.';
  end if;

  if exists (
    select 1
    from jsonb_object_keys(safeguards) as safeguard_key(key_name)
    where key_name not in (
      'affectedPartyPlan',
      'affectedPartyStatus',
      'baselineConfirmed',
      'capacity',
      'noManufacturedLeverage',
      'noTradeBaseline'
    )
  ) then
    raise exception using
      errcode = '22023',
      message = 'Create safeguards contain an unsupported field.';
  end if;

  baseline_value := btrim(coalesce(safeguards ->> 'noTradeBaseline', ''));
  if length(baseline_value) < 20 or length(baseline_value) > 600 then
    raise exception using
      errcode = '22023',
      message = 'No-trade baseline must be between 20 and 600 characters.';
  end if;
  if lower(baseline_value) = lower('If no proposal is accepted, neither party incurs an obligation.') then
    raise exception using
      errcode = '22023',
      message = 'No-trade baseline must describe the specific default, not only the absence of an agreement.';
  end if;
  if (safeguards -> 'baselineConfirmed') is distinct from 'true'::jsonb then
    raise exception using
      errcode = '22023',
      message = 'The no-trade baseline confirmation is required.';
  end if;
  if (safeguards -> 'noManufacturedLeverage') is distinct from 'true'::jsonb then
    raise exception using
      errcode = '22023',
      message = 'The no-manufactured-leverage confirmation is required.';
  end if;
  if (safeguards ->> 'capacity') is distinct from 'individual' then
    raise exception using
      errcode = '22023',
      message = 'The current Create flow accepts individual capacity only.';
  end if;

  affected_party_status := safeguards ->> 'affectedPartyStatus';
  affected_party_plan := btrim(coalesce(safeguards ->> 'affectedPartyPlan', ''));
  if coalesce(affected_party_status, '') not in ('none_identified', 'review_required') then
    raise exception using
      errcode = '22023',
      message = 'Affected-party status is invalid.';
  end if;
  if length(affected_party_plan) > 600 then
    raise exception using
      errcode = '22023',
      message = 'Affected-party plan must be 600 characters or fewer.';
  end if;
  if affected_party_status = 'review_required' and length(affected_party_plan) < 20 then
    raise exception using
      errcode = '22023',
      message = 'A possible affected party requires an impact, standing, and remedy plan.';
  end if;
  if affected_party_status = 'none_identified' and affected_party_plan <> '' then
    raise exception using
      errcode = '22023',
      message = 'Affected-party plan must be empty when no affected nonparticipant is identified.';
  end if;

  select *
  into result_row
  from public.moral_trade_create_submit_service(
    p_actor_id,
    p_submission_key,
    p_submission_kind,
    p_source_payload,
    p_payload_hash,
    p_cause_area,
    p_request_kind,
    p_requested_action,
    p_offered_summary,
    p_offered_terms,
    p_pool_terms,
    p_target_fields
  );

  if result_row.submission_id is null
     or result_row.target_type is null
     or result_row.target_id is null
     or result_row.canonical_path is null then
    raise exception using
      errcode = 'P0001',
      message = 'The Create adapter did not return a durable target.';
  end if;

  if result_row.target_type = 'offer' then
    update public.offers
    set
      no_trade_baseline = baseline_value,
      updated_at = timezone('utc', now())
    where id = result_row.target_id
      and owner_id = p_actor_id;

    if not found then
      raise exception using
        errcode = '42501',
        message = 'The safeguarded Create target was not owned by the authenticated actor.';
    end if;
  end if;

  return query
  select
    result_row.submission_id::uuid,
    result_row.target_type::text,
    result_row.target_id::uuid,
    result_row.submission_status::text,
    result_row.canonical_path::text;
end;
$function$;

comment on function public.moral_trade_create_submit_service_v2(
  uuid,
  text,
  text,
  jsonb,
  text,
  text,
  text,
  text,
  text,
  jsonb,
  jsonb,
  jsonb
) is
  'Atomic Create adapter requiring a concrete counterfactual baseline, anti-manufacturing declaration, affected-party screen, and individual-capacity boundary.';

revoke all on function public.moral_trade_create_submit_service_v2(
  uuid,
  text,
  text,
  jsonb,
  text,
  text,
  text,
  text,
  text,
  jsonb,
  jsonb,
  jsonb
) from public, anon, authenticated, service_role;

grant execute on function public.moral_trade_create_submit_service_v2(
  uuid,
  text,
  text,
  jsonb,
  text,
  text,
  text,
  text,
  text,
  jsonb,
  jsonb,
  jsonb
) to service_role;

commit;
