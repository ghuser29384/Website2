-- Durable, private harmful-offer assessment receipts for the Create workflow.
-- Deterministic hard-policy rules may stop target creation. Model-only findings can
-- require human review but cannot create an automatic block.
begin;

create extension if not exists pgcrypto;

create table if not exists public.moral_trade_harmful_offer_assessments (
  id uuid primary key default gen_random_uuid(),
  owner_profile_id uuid not null references public.profiles(id) on delete cascade,
  create_submission_id uuid references public.moral_trade_create_submissions(id) on delete cascade,
  submission_key text not null,
  assessment_trigger text not null check (
    assessment_trigger in ('live_draft', 'publication', 'material_edit', 'amendment', 'dispute', 'report', 'moderation')
  ),
  assessment_route text not null check (assessment_route in ('allow', 'human_review', 'block')),
  policy_version text not null,
  schema_version text not null,
  source_payload_hash text not null check (source_payload_hash ~ '^[0-9a-f]{64}$'),
  assessment_source_hash text not null check (assessment_source_hash ~ '^[0-9a-f]{64}$'),
  source_payload_json jsonb not null,
  assessment_json jsonb not null,
  model_status text not null check (
    model_status in ('not_requested', 'completed', 'unavailable', 'invalid')
  ),
  review_status text not null check (
    review_status in ('not_required', 'pending', 'upheld', 'overturned', 'superseded')
  ),
  appeal_status text not null default 'not_requested' check (
    appeal_status in ('not_requested', 'requested', 'resolved')
  ),
  supersedes_id uuid references public.moral_trade_harmful_offer_assessments(id),
  created_at timestamptz not null default timezone('utc', now()),
  unique (
    owner_profile_id,
    submission_key,
    assessment_trigger,
    assessment_source_hash,
    policy_version
  ),
  check (jsonb_typeof(source_payload_json) = 'object'),
  check (jsonb_typeof(assessment_json) = 'object'),
  check (jsonb_typeof(assessment_json -> 'findings') = 'array'),
  check (jsonb_typeof(assessment_json -> 'unresolvedQuestions') = 'array'),
  check (
    (assessment_route = 'allow' and review_status = 'not_required')
    or
    (assessment_route in ('human_review', 'block') and review_status in ('pending', 'upheld', 'overturned', 'superseded'))
  )
);

comment on table public.moral_trade_harmful_offer_assessments is
  'Append-only private assessment receipts. Full draft terms are retained for owner access, authorized review, reconsideration, and audit; no assessment is public by default.';

create index if not exists moral_trade_harm_assessments_owner_created_idx
  on public.moral_trade_harmful_offer_assessments(owner_profile_id, created_at desc);
create index if not exists moral_trade_harm_assessments_review_idx
  on public.moral_trade_harmful_offer_assessments(review_status, created_at asc)
  where review_status = 'pending';
create index if not exists moral_trade_harm_assessments_submission_idx
  on public.moral_trade_harmful_offer_assessments(create_submission_id, created_at desc)
  where create_submission_id is not null;

alter table public.moral_trade_harmful_offer_assessments enable row level security;

revoke all on public.moral_trade_harmful_offer_assessments from anon, authenticated;
grant select on public.moral_trade_harmful_offer_assessments to authenticated;
grant all on public.moral_trade_harmful_offer_assessments to service_role;

create policy moral_trade_harm_assessments_owner_select
on public.moral_trade_harmful_offer_assessments
for select to authenticated
using (owner_profile_id = (select auth.uid()));

create or replace function public.moral_trade_create_submit_with_harm_assessment_service(
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
  p_target_fields jsonb,
  p_harm_assessment jsonb
)
returns table (
  submission_id uuid,
  target_type text,
  target_id uuid,
  submission_status text,
  canonical_path text,
  harm_assessment_id uuid,
  harm_route text
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  assessment_id_value uuid;
  assessment_route_value text;
  model_status_value text;
  review_status_value text;
  hard_policy_block_count integer;
  created_submission_id uuid;
  created_target_type text;
  created_target_id uuid;
  created_submission_status text;
  created_canonical_path text;
begin
  if p_actor_id is null then
    raise exception using errcode = '42501', message = 'A valid authenticated actor is required.';
  end if;
  if jsonb_typeof(p_harm_assessment) <> 'object' then
    raise exception using errcode = '22023', message = 'The harmful-offer assessment must be an object.';
  end if;
  if p_harm_assessment ->> 'schemaVersion' <> 'moral-trade-harmful-offer-assessment-v1' then
    raise exception using errcode = '22023', message = 'The harmful-offer assessment schema is unsupported.';
  end if;
  if p_harm_assessment ->> 'policyVersion' <> 'pluralist-harm-policy-2026-08-06' then
    raise exception using errcode = '22023', message = 'The harmful-offer policy version is unsupported.';
  end if;
  if p_harm_assessment ->> 'trigger' <> 'publication' then
    raise exception using errcode = '22023', message = 'Create submission requires a publication assessment.';
  end if;
  if p_harm_assessment ->> 'sourceHash' !~ '^[0-9a-f]{64}$' then
    raise exception using errcode = '22023', message = 'The harmful-offer source hash is invalid.';
  end if;
  if jsonb_typeof(p_harm_assessment -> 'findings') <> 'array'
     or jsonb_typeof(p_harm_assessment -> 'unresolvedQuestions') <> 'array' then
    raise exception using errcode = '22023', message = 'The harmful-offer assessment arrays are invalid.';
  end if;

  assessment_route_value := p_harm_assessment ->> 'route';
  if assessment_route_value not in ('allow', 'human_review', 'block') then
    raise exception using errcode = '22023', message = 'The harmful-offer route is invalid.';
  end if;

  model_status_value := p_harm_assessment #>> '{modelAssessment,status}';
  if model_status_value not in ('not_requested', 'completed', 'unavailable', 'invalid') then
    raise exception using errcode = '22023', message = 'The harmful-offer model status is invalid.';
  end if;
  if assessment_route_value = 'allow' and model_status_value <> 'completed' then
    raise exception using
      errcode = '23514',
      message = 'Automatic permission requires a completed model assessment.';
  end if;

  begin
    hard_policy_block_count := coalesce(
      nullif(p_harm_assessment #>> '{ruleAssessment,hardPolicyBlockCount}', '')::integer,
      0
    );
  exception when invalid_text_representation then
    raise exception using errcode = '22023', message = 'The hard-policy block count is invalid.';
  end;
  if assessment_route_value = 'block' and hard_policy_block_count < 1 then
    raise exception using
      errcode = '23514',
      message = 'An automatic block requires at least one deterministic hard-policy finding.';
  end if;

  review_status_value := case
    when assessment_route_value = 'allow' then 'not_required'
    else 'pending'
  end;

  perform pg_advisory_xact_lock(
    hashtextextended(
      p_actor_id::text || ':harm-assessment:' || p_submission_key || ':' || (p_harm_assessment ->> 'sourceHash'),
      0
    )
  );

  if assessment_route_value <> 'block' then
    select
      service.submission_id,
      service.target_type,
      service.target_id,
      service.submission_status,
      service.canonical_path
    into
      created_submission_id,
      created_target_type,
      created_target_id,
      created_submission_status,
      created_canonical_path
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
    ) as service;
  else
    created_submission_id := null;
    created_target_type := null;
    created_target_id := null;
    created_submission_status := 'rejected';
    created_canonical_path := null;
  end if;

  insert into public.moral_trade_harmful_offer_assessments (
    owner_profile_id,
    create_submission_id,
    submission_key,
    assessment_trigger,
    assessment_route,
    policy_version,
    schema_version,
    source_payload_hash,
    assessment_source_hash,
    source_payload_json,
    assessment_json,
    model_status,
    review_status
  ) values (
    p_actor_id,
    created_submission_id,
    p_submission_key,
    p_harm_assessment ->> 'trigger',
    assessment_route_value,
    p_harm_assessment ->> 'policyVersion',
    p_harm_assessment ->> 'schemaVersion',
    p_payload_hash,
    p_harm_assessment ->> 'sourceHash',
    p_source_payload,
    p_harm_assessment,
    model_status_value,
    review_status_value
  )
  on conflict (
    owner_profile_id,
    submission_key,
    assessment_trigger,
    assessment_source_hash,
    policy_version
  ) do nothing
  returning id into assessment_id_value;

  if assessment_id_value is null then
    select id
    into assessment_id_value
    from public.moral_trade_harmful_offer_assessments
    where owner_profile_id = p_actor_id
      and submission_key = p_submission_key
      and assessment_trigger = p_harm_assessment ->> 'trigger'
      and assessment_source_hash = p_harm_assessment ->> 'sourceHash'
      and policy_version = p_harm_assessment ->> 'policyVersion'
    limit 1;
  end if;

  if assessment_id_value is null then
    raise exception using errcode = 'P0001', message = 'The harmful-offer assessment receipt was not created.';
  end if;

  return query select
    created_submission_id,
    created_target_type,
    created_target_id,
    created_submission_status,
    created_canonical_path,
    assessment_id_value,
    assessment_route_value;
end;
$function$;

revoke all on function public.moral_trade_create_submit_with_harm_assessment_service(
  uuid, text, text, jsonb, text, text, text, text, text, jsonb, jsonb, jsonb, jsonb
) from public, anon, authenticated;
grant execute on function public.moral_trade_create_submit_with_harm_assessment_service(
  uuid, text, text, jsonb, text, text, text, text, text, jsonb, jsonb, jsonb, jsonb
) to service_role;

commit;
