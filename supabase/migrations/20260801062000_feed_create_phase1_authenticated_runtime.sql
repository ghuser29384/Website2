-- Least-privilege runtime entry points for Feed-to-Create Phase 1.
-- The application uses the request's authenticated Supabase session; these
-- wrappers derive the actor from auth.uid() and retain the atomic service
-- implementations behind a non-spoofable boundary.
begin;

create or replace function public.moral_trade_feed_create_record_event_authenticated(
  p_expected_actor_id uuid,
  p_event_type text,
  p_source_opportunity_type text,
  p_source_opportunity_id uuid,
  p_exposure_request_id uuid,
  p_source_terms_version integer,
  p_derived_offer_id uuid default null,
  p_agreement_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  actor_id uuid := auth.uid();
begin
  if actor_id is null then
    raise exception using errcode = '42501', message = 'An authenticated actor is required.';
  end if;
  if p_expected_actor_id is null or p_expected_actor_id is distinct from actor_id then
    raise exception using errcode = '42501', message = 'The expected Feed-to-Create actor does not match the authenticated session.';
  end if;

  return public.moral_trade_feed_create_record_event_service(
    actor_id,
    p_event_type,
    p_source_opportunity_type,
    p_source_opportunity_id,
    p_exposure_request_id,
    p_source_terms_version,
    p_derived_offer_id,
    p_agreement_id
  );
end;
$function$;

comment on function public.moral_trade_feed_create_record_event_authenticated(uuid, text, text, uuid, uuid, integer, uuid, uuid) is
  'Authenticated, receipt-bound Feed-to-Create event entry point. Actor identity is derived from auth.uid(); no service-role credential is required by the application.';

revoke all on function public.moral_trade_feed_create_record_event_authenticated(uuid, text, text, uuid, uuid, integer, uuid, uuid)
from public, anon;
grant execute on function public.moral_trade_feed_create_record_event_authenticated(uuid, text, text, uuid, uuid, integer, uuid, uuid)
to authenticated;

create or replace function public.moral_trade_feed_create_save_authenticated(
  p_expected_actor_id uuid,
  p_intent text,
  p_submission_key text,
  p_source_opportunity_type text,
  p_source_opportunity_id uuid,
  p_exposure_request_id uuid,
  p_source_terms_version integer,
  p_imported_field_reviews jsonb,
  p_duplicate_acknowledged boolean,
  p_offered_cause text,
  p_requested_cause text,
  p_proposed_action text,
  p_requested_action text,
  p_no_trade_baseline text,
  p_duration text,
  p_start_date date,
  p_evidence_due_date date,
  p_evidence_rule text,
  p_maximum_burden text,
  p_privacy_scope text,
  p_exit_conditions text,
  p_notes text
)
returns table (
  derived_offer_id uuid,
  link_id uuid,
  workflow_status text
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  actor_id uuid := auth.uid();
begin
  if actor_id is null then
    raise exception using errcode = '42501', message = 'An authenticated actor is required.';
  end if;
  if p_expected_actor_id is null or p_expected_actor_id is distinct from actor_id then
    raise exception using errcode = '42501', message = 'The expected Feed-to-Create actor does not match the authenticated session.';
  end if;

  return query
  select saved.derived_offer_id, saved.link_id, saved.workflow_status
  from public.moral_trade_feed_create_save_service(
    actor_id,
    p_intent,
    p_submission_key,
    p_source_opportunity_type,
    p_source_opportunity_id,
    p_exposure_request_id,
    p_source_terms_version,
    p_imported_field_reviews,
    p_duplicate_acknowledged,
    p_offered_cause,
    p_requested_cause,
    p_proposed_action,
    p_requested_action,
    p_no_trade_baseline,
    p_duration,
    p_start_date,
    p_evidence_due_date,
    p_evidence_rule,
    p_maximum_burden,
    p_privacy_scope,
    p_exit_conditions,
    p_notes
  ) as saved;
end;
$function$;

comment on function public.moral_trade_feed_create_save_authenticated(uuid, text, text, text, uuid, uuid, integer, jsonb, boolean, text, text, text, text, text, text, date, date, text, text, text, text, text) is
  'Authenticated atomic Feed-to-Create save entry point. Actor identity is derived from auth.uid(); the application never receives a service-role credential.';

revoke all on function public.moral_trade_feed_create_save_authenticated(uuid, text, text, text, uuid, uuid, integer, jsonb, boolean, text, text, text, text, text, text, date, date, text, text, text, text, text)
from public, anon;
grant execute on function public.moral_trade_feed_create_save_authenticated(uuid, text, text, text, uuid, uuid, integer, jsonb, boolean, text, text, text, text, text, text, date, date, text, text, text, text, text)
to authenticated;

commit;
