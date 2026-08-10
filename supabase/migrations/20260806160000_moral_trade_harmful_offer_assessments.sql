-- Private harmful-offer assessment, rate-limit, reconsideration, and material-edit records.
-- Model findings may require review but cannot create an automatic block. Automatic permission
-- is valid only when every low-risk criterion is established by a completed assessment.
begin;

create extension if not exists pgcrypto;

create table if not exists public.moral_trade_harmful_offer_assessments (
  id uuid primary key default gen_random_uuid(),
  owner_profile_id uuid not null references public.profiles(id) on delete cascade,
  create_submission_id uuid references public.moral_trade_create_submissions(id) on delete cascade,
  submission_key text not null,
  assessment_key text not null unique,
  assessment_trigger text not null check (
    assessment_trigger in (
      'live_draft',
      'publication',
      'material_edit',
      'amendment',
      'pre_activation',
      'participant_or_obligation_change',
      'dispute',
      'report',
      'moderation'
    )
  ),
  assessment_route text not null check (assessment_route in ('allow', 'human_review', 'block')),
  enforcement_basis text not null check (
    enforcement_basis in (
      'deterministic_hard_policy',
      'human_review_required',
      'completed_low_risk_assessment'
    )
  ),
  policy_version text not null,
  schema_version text not null,
  source_payload_hash text not null check (source_payload_hash ~ '^[0-9a-f]{64}$'),
  assessment_source_hash text not null check (assessment_source_hash ~ '^[0-9a-f]{64}$'),
  source_payload_json jsonb not null,
  assessment_json jsonb not null,
  model_status text not null check (
    model_status in ('not_requested', 'completed', 'unavailable', 'invalid')
  ),
  overall_confidence numeric(5,4) not null check (overall_confidence between 0 and 1),
  evidence_quality text not null check (evidence_quality in ('strong', 'mixed', 'thin')),
  reversibility_concern text not null check (reversibility_concern in ('low', 'moderate', 'high')),
  contested_moral_frame boolean not null,
  third_party_effect_severity text not null check (
    third_party_effect_severity in ('none', 'low', 'moderate', 'high', 'critical')
  ),
  legitimate_veto_holder_identified boolean not null,
  human_only_sensitive_domain boolean not null,
  baseline_comparison text not null check (
    baseline_comparison in ('better_or_equal', 'uncertain', 'worse')
  ),
  plausible_severe_harm boolean not null,
  dependent_party_risk boolean not null,
  opaque_coercion_incentives boolean not null,
  hard_policy_block_count integer not null check (hard_policy_block_count >= 0),
  review_status text not null check (
    review_status in ('not_required', 'pending', 'upheld', 'overturned', 'superseded')
  ),
  reviewed_by_profile_id uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  appeal_status text not null default 'not_requested' check (
    appeal_status in ('not_requested', 'requested', 'resolved')
  ),
  supersedes_id uuid references public.moral_trade_harmful_offer_assessments(id),
  created_at timestamptz not null default timezone('utc', now()),
  check (jsonb_typeof(source_payload_json) = 'object'),
  check (jsonb_typeof(assessment_json) = 'object'),
  check (jsonb_typeof(assessment_json -> 'findings') = 'array'),
  check (jsonb_typeof(assessment_json -> 'unresolvedQuestions') = 'array'),
  check (
    (assessment_route = 'allow' and review_status = 'not_required')
    or
    (assessment_route in ('human_review', 'block') and review_status in ('pending', 'upheld', 'overturned', 'superseded'))
  ),
  check (
    assessment_route <> 'block'
    or (
      hard_policy_block_count > 0
      and enforcement_basis = 'deterministic_hard_policy'
    )
  ),
  check (
    assessment_route <> 'allow'
    or (
      model_status = 'completed'
      and enforcement_basis = 'completed_low_risk_assessment'
      and overall_confidence >= 0.9000
      and evidence_quality = 'strong'
      and reversibility_concern = 'low'
      and contested_moral_frame = false
      and third_party_effect_severity in ('none', 'low', 'moderate')
      and legitimate_veto_holder_identified = false
      and human_only_sensitive_domain = false
      and baseline_comparison = 'better_or_equal'
      and plausible_severe_harm = false
      and dependent_party_risk = false
      and opaque_coercion_incentives = false
      and hard_policy_block_count = 0
      and jsonb_array_length(assessment_json -> 'findings') = 0
      and jsonb_array_length(assessment_json -> 'unresolvedQuestions') = 0
      and assessment_json #>> '{automaticPermitCriteria,passed}' = 'true'
    )
  )
);

comment on table public.moral_trade_harmful_offer_assessments is
  'Append-only private harmful-offer assessment receipts. Detailed terms and findings are owner-visible and reviewer-visible, never public by default.';

create index if not exists moral_trade_harm_assessments_owner_created_idx
  on public.moral_trade_harmful_offer_assessments(owner_profile_id, created_at desc);
create index if not exists moral_trade_harm_assessments_review_idx
  on public.moral_trade_harmful_offer_assessments(review_status, created_at asc)
  where review_status = 'pending';
create index if not exists moral_trade_harm_assessments_submission_idx
  on public.moral_trade_harmful_offer_assessments(create_submission_id, created_at desc)
  where create_submission_id is not null;
create index if not exists moral_trade_harm_assessments_source_idx
  on public.moral_trade_harmful_offer_assessments(
    owner_profile_id,
    submission_key,
    assessment_source_hash,
    created_at desc
  );

create table if not exists public.moral_trade_harmful_offer_assessment_appeals (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.moral_trade_harmful_offer_assessments(id) on delete cascade,
  appellant_profile_id uuid not null references public.profiles(id) on delete cascade,
  appeal_kind text not null check (
    appeal_kind in ('ordinary', 'new_evidence', 'procedural_error')
  ),
  statement text not null check (char_length(statement) between 20 and 4000),
  evidence_json jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending', 'resolved', 'dismissed')),
  assigned_reviewer_profile_id uuid references public.profiles(id) on delete set null,
  decided_by_profile_id uuid references public.profiles(id) on delete set null,
  outcome text check (outcome in ('upheld', 'overturned', 'remanded')),
  resolution_reason text,
  deadlines_paused boolean not null default true,
  money_released boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  resolved_at timestamptz,
  check (jsonb_typeof(evidence_json) in ('object', 'array')),
  check (
    (status = 'pending' and outcome is null and decided_by_profile_id is null and resolved_at is null)
    or
    (status in ('resolved', 'dismissed') and outcome is not null and decided_by_profile_id is not null and resolved_at is not null)
  )
);

create unique index if not exists moral_trade_harm_assessment_one_ordinary_appeal_idx
  on public.moral_trade_harmful_offer_assessment_appeals(assessment_id, appellant_profile_id)
  where appeal_kind = 'ordinary';
create index if not exists moral_trade_harm_assessment_appeals_appellant_idx
  on public.moral_trade_harmful_offer_assessment_appeals(appellant_profile_id, created_at desc);
create index if not exists moral_trade_harm_assessment_appeals_pending_idx
  on public.moral_trade_harmful_offer_assessment_appeals(status, created_at asc)
  where status = 'pending';

create table if not exists public.moral_trade_harm_assessment_rate_limits (
  actor_profile_id uuid not null references public.profiles(id) on delete cascade,
  scope text not null check (scope in ('live_draft', 'publication', 'appeal')),
  window_started_at timestamptz not null,
  request_count integer not null default 0 check (request_count >= 0),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (actor_profile_id, scope, window_started_at)
);

create index if not exists moral_trade_harm_rate_limits_cleanup_idx
  on public.moral_trade_harm_assessment_rate_limits(window_started_at);

create or replace function public.moral_trade_harm_appeal_set_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $function$
begin
  new.updated_at := timezone('utc', now());
  return new;
end;
$function$;

drop trigger if exists moral_trade_harm_appeal_set_updated_at
  on public.moral_trade_harmful_offer_assessment_appeals;
create trigger moral_trade_harm_appeal_set_updated_at
before update on public.moral_trade_harmful_offer_assessment_appeals
for each row execute function public.moral_trade_harm_appeal_set_updated_at();

alter table public.moral_trade_harmful_offer_assessments enable row level security;
alter table public.moral_trade_harmful_offer_assessment_appeals enable row level security;
alter table public.moral_trade_harm_assessment_rate_limits enable row level security;

revoke all on public.moral_trade_harmful_offer_assessments from anon, authenticated;
revoke all on public.moral_trade_harmful_offer_assessment_appeals from anon, authenticated;
revoke all on public.moral_trade_harm_assessment_rate_limits from anon, authenticated;
grant select on public.moral_trade_harmful_offer_assessments to authenticated;
grant select on public.moral_trade_harmful_offer_assessment_appeals to authenticated;
grant all on public.moral_trade_harmful_offer_assessments to service_role;
grant all on public.moral_trade_harmful_offer_assessment_appeals to service_role;
grant all on public.moral_trade_harm_assessment_rate_limits to service_role;

create policy moral_trade_harm_assessments_owner_select
on public.moral_trade_harmful_offer_assessments
for select to authenticated
using (owner_profile_id = (select auth.uid()));

create policy moral_trade_harm_assessment_appeals_owner_select
on public.moral_trade_harmful_offer_assessment_appeals
for select to authenticated
using (appellant_profile_id = (select auth.uid()));

create or replace function public.moral_trade_claim_harm_assessment_rate_limit_service(
  p_actor_id uuid,
  p_scope text
)
returns table (allowed boolean)
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  scope_limit integer;
  window_start timestamptz;
  claimed_count integer;
begin
  if p_actor_id is null then
    raise exception using errcode = '42501', message = 'A valid authenticated actor is required.';
  end if;
  scope_limit := case p_scope
    when 'live_draft' then 12
    when 'publication' then 8
    when 'appeal' then 4
    else null
  end;
  if scope_limit is null then
    raise exception using errcode = '22023', message = 'The assessment rate-limit scope is invalid.';
  end if;
  if not exists (select 1 from public.profiles where id = p_actor_id) then
    raise exception using errcode = '23503', message = 'A Moral Trade profile is required.';
  end if;

  window_start := to_timestamp(
    floor(extract(epoch from timezone('utc', now())) / 900) * 900
  );

  insert into public.moral_trade_harm_assessment_rate_limits (
    actor_profile_id,
    scope,
    window_started_at,
    request_count,
    updated_at
  ) values (
    p_actor_id,
    p_scope,
    window_start,
    1,
    timezone('utc', now())
  )
  on conflict (actor_profile_id, scope, window_started_at)
  do update set
    request_count = public.moral_trade_harm_assessment_rate_limits.request_count + 1,
    updated_at = timezone('utc', now())
  where public.moral_trade_harm_assessment_rate_limits.request_count < scope_limit
  returning request_count into claimed_count;

  delete from public.moral_trade_harm_assessment_rate_limits
  where window_started_at < timezone('utc', now()) - interval '2 days';

  return query select claimed_count is not null;
end;
$function$;

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
  assessment_key_value text;
  assessment_route_value text;
  enforcement_basis_value text;
  model_status_value text;
  review_status_value text;
  hard_policy_block_count_value integer;
  overall_confidence_value numeric;
  evidence_quality_value text;
  reversibility_concern_value text;
  contested_moral_frame_value boolean;
  third_party_effect_severity_value text;
  legitimate_veto_holder_value boolean;
  human_only_sensitive_value boolean;
  baseline_comparison_value text;
  plausible_severe_harm_value boolean;
  dependent_party_risk_value boolean;
  opaque_coercion_incentives_value boolean;
  created_submission_id uuid;
  created_target_type text;
  created_target_id uuid;
  created_submission_status text;
  created_canonical_path text;
  existing_submission public.moral_trade_create_submissions%rowtype;
  actor_alias text;
begin
  if p_actor_id is null then
    raise exception using errcode = '42501', message = 'A valid authenticated actor is required.';
  end if;
  if p_submission_kind not in ('pledge_swap', 'donation_redirect', 'pool_create', 'existing_pool_contribution') then
    raise exception using errcode = '22023', message = 'Unsupported Create submission kind.';
  end if;
  if p_request_kind not in ('commitment', 'skill', 'fund') then
    raise exception using errcode = '22023', message = 'Unsupported request kind.';
  end if;
  if nullif(btrim(p_submission_key), '') is null
     or length(p_submission_key) > 120
     or p_submission_key !~ '^[A-Za-z0-9:_-]+$' then
    raise exception using errcode = '22023', message = 'Submission key is invalid.';
  end if;
  if p_payload_hash is null or p_payload_hash !~ '^[0-9a-f]{64}$' then
    raise exception using errcode = '22023', message = 'Payload hash is invalid.';
  end if;
  if jsonb_typeof(p_source_payload) is distinct from 'object'
     or octet_length(p_source_payload::text) > 180000 then
    raise exception using errcode = '22023', message = 'Source payload is invalid or too large.';
  end if;
  if jsonb_typeof(p_offered_terms) is distinct from 'array' then
    raise exception using errcode = '22023', message = 'Contribution terms must be an array.';
  end if;
  if nullif(btrim(p_cause_area), '') is null or nullif(btrim(p_requested_action), '') is null then
    raise exception using errcode = '22023', message = 'Cause and requested action are required.';
  end if;
  if p_source_payload ->> 'interfaceVersion' is distinct from 'moral_trade_create_v1'
     or p_source_payload ->> 'submissionKey' is distinct from p_submission_key
     or btrim(coalesce(p_source_payload ->> 'cause', '')) is distinct from btrim(p_cause_area)
     or p_source_payload ->> 'requestKind' is distinct from p_request_kind
     or btrim(coalesce(p_source_payload ->> 'requestAction', '')) is distinct from btrim(p_requested_action)
     or coalesce(p_source_payload -> 'offers', '[]'::jsonb) is distinct from p_offered_terms then
    raise exception using errcode = '23514', message = 'The Create payload does not match its validated persistence fields.';
  end if;
  if jsonb_typeof(p_target_fields) is distinct from 'object' then
    raise exception using errcode = '22023', message = 'Create target fields must be an object.';
  end if;
  if p_submission_kind = 'pool_create' and jsonb_typeof(p_pool_terms) is distinct from 'object' then
    raise exception using errcode = '22023', message = 'Direct pool submissions require validated pool terms.';
  end if;
  if p_submission_kind <> 'pool_create' and p_pool_terms is not null then
    raise exception using errcode = '22023', message = 'Only direct pool submissions may include pool terms.';
  end if;

  select coalesce(nullif(btrim(display_name), ''), nullif(btrim(email), ''), 'Moral Trade participant')
  into actor_alias
  from public.profiles
  where id = p_actor_id;
  if actor_alias is null then
    raise exception using errcode = '23503', message = 'A Moral Trade profile is required before submission.';
  end if;

  if jsonb_typeof(p_harm_assessment) is distinct from 'object' then
    raise exception using errcode = '22023', message = 'The harmful-offer assessment must be an object.';
  end if;
  if p_harm_assessment ->> 'schemaVersion' is distinct from 'moral-trade-harmful-offer-assessment-v2' then
    raise exception using errcode = '22023', message = 'The harmful-offer assessment schema is unsupported.';
  end if;
  if p_harm_assessment ->> 'policyVersion' is distinct from 'pluralist-harm-policy-2026-08-06-v2' then
    raise exception using errcode = '22023', message = 'The harmful-offer policy version is unsupported.';
  end if;
  if p_harm_assessment ->> 'trigger' is distinct from 'publication' then
    raise exception using errcode = '22023', message = 'Create submission requires a publication assessment.';
  end if;
  if p_harm_assessment ->> 'sourceHash' is null
     or p_harm_assessment ->> 'sourceHash' !~ '^[0-9a-f]{64}$' then
    raise exception using errcode = '22023', message = 'The harmful-offer source hash is invalid.';
  end if;
  if jsonb_typeof(p_harm_assessment -> 'findings') is distinct from 'array'
     or jsonb_typeof(p_harm_assessment -> 'unresolvedQuestions') is distinct from 'array'
     or jsonb_typeof(p_harm_assessment -> 'lowRiskAssessment') is distinct from 'object'
     or jsonb_typeof(p_harm_assessment -> 'automaticPermitCriteria') is distinct from 'object' then
    raise exception using errcode = '22023', message = 'The harmful-offer assessment structure is invalid.';
  end if;

  assessment_route_value := p_harm_assessment ->> 'route';
  enforcement_basis_value := p_harm_assessment ->> 'enforcementBasis';
  model_status_value := p_harm_assessment #>> '{modelAssessment,status}';
  evidence_quality_value := p_harm_assessment #>> '{lowRiskAssessment,evidenceQuality}';
  reversibility_concern_value := p_harm_assessment #>> '{lowRiskAssessment,reversibilityConcern}';
  third_party_effect_severity_value := p_harm_assessment #>> '{lowRiskAssessment,thirdPartyEffectSeverity}';
  baseline_comparison_value := p_harm_assessment #>> '{lowRiskAssessment,baselineComparison}';

  if assessment_route_value not in ('allow', 'human_review', 'block') then
    raise exception using errcode = '22023', message = 'The harmful-offer route is invalid.';
  end if;
  if enforcement_basis_value not in (
    'deterministic_hard_policy',
    'human_review_required',
    'completed_low_risk_assessment'
  ) then
    raise exception using errcode = '22023', message = 'The harmful-offer enforcement basis is invalid.';
  end if;
  if model_status_value not in ('not_requested', 'completed', 'unavailable', 'invalid') then
    raise exception using errcode = '22023', message = 'The harmful-offer model status is invalid.';
  end if;
  if evidence_quality_value not in ('strong', 'mixed', 'thin')
     or reversibility_concern_value not in ('low', 'moderate', 'high')
     or third_party_effect_severity_value not in ('none', 'low', 'moderate', 'high', 'critical')
     or baseline_comparison_value not in ('better_or_equal', 'uncertain', 'worse') then
    raise exception using errcode = '22023', message = 'The harmful-offer low-risk classification is invalid.';
  end if;

  begin
    hard_policy_block_count_value := coalesce(
      nullif(p_harm_assessment #>> '{ruleAssessment,hardPolicyBlockCount}', '')::integer,
      0
    );
    overall_confidence_value := coalesce(
      nullif(p_harm_assessment #>> '{lowRiskAssessment,overallConfidence}', '')::numeric,
      0
    );
    contested_moral_frame_value := coalesce(
      nullif(p_harm_assessment #>> '{lowRiskAssessment,contestedMoralFrame}', '')::boolean,
      true
    );
    legitimate_veto_holder_value := coalesce(
      nullif(p_harm_assessment #>> '{lowRiskAssessment,legitimateVetoHolderIdentified}', '')::boolean,
      true
    );
    human_only_sensitive_value := coalesce(
      nullif(p_harm_assessment #>> '{lowRiskAssessment,humanOnlySensitiveDomain}', '')::boolean,
      true
    );
    plausible_severe_harm_value := coalesce(
      nullif(p_harm_assessment #>> '{lowRiskAssessment,plausibleSevereHarm}', '')::boolean,
      true
    );
    dependent_party_risk_value := coalesce(
      nullif(p_harm_assessment #>> '{lowRiskAssessment,dependentPartyRisk}', '')::boolean,
      true
    );
    opaque_coercion_incentives_value := coalesce(
      nullif(p_harm_assessment #>> '{lowRiskAssessment,opaqueCoercionIncentives}', '')::boolean,
      true
    );
  exception when invalid_text_representation then
    raise exception using errcode = '22023', message = 'The harmful-offer risk values are invalid.';
  end;

  if overall_confidence_value < 0 or overall_confidence_value > 1 then
    raise exception using errcode = '22023', message = 'The harmful-offer confidence is invalid.';
  end if;

  if assessment_route_value = 'allow' and not (
    model_status_value = 'completed'
    and enforcement_basis_value = 'completed_low_risk_assessment'
    and overall_confidence_value >= 0.9000
    and evidence_quality_value = 'strong'
    and reversibility_concern_value = 'low'
    and contested_moral_frame_value = false
    and third_party_effect_severity_value in ('none', 'low', 'moderate')
    and legitimate_veto_holder_value = false
    and human_only_sensitive_value = false
    and baseline_comparison_value = 'better_or_equal'
    and plausible_severe_harm_value = false
    and dependent_party_risk_value = false
    and opaque_coercion_incentives_value = false
    and hard_policy_block_count_value = 0
    and jsonb_array_length(p_harm_assessment -> 'findings') = 0
    and jsonb_array_length(p_harm_assessment -> 'unresolvedQuestions') = 0
    and p_harm_assessment #>> '{automaticPermitCriteria,passed}' = 'true'
  ) then
    raise exception using errcode = '23514', message = 'Automatic permission requires every low-risk criterion.';
  end if;

  if assessment_route_value = 'block' and not (
    hard_policy_block_count_value > 0
    and enforcement_basis_value = 'deterministic_hard_policy'
  ) then
    raise exception using errcode = '23514', message = 'An automatic block requires a deterministic categorical finding.';
  end if;

  if assessment_route_value = 'human_review'
     and enforcement_basis_value is distinct from 'human_review_required' then
    raise exception using errcode = '23514', message = 'Human-review assessments require the human-review enforcement basis.';
  end if;

  review_status_value := case
    when assessment_route_value = 'allow' then 'not_required'
    else 'pending'
  end;
  assessment_key_value := encode(
    digest(
      convert_to(
        p_actor_id::text || ':' || p_submission_key || ':' ||
        coalesce(p_harm_assessment ->> 'assessedAt', timezone('utc', now())::text) || ':' ||
        p_harm_assessment ->> 'sourceHash',
        'utf8'
      ),
      'sha256'
    ),
    'hex'
  );

  perform pg_advisory_xact_lock(
    hashtextextended(p_actor_id::text || ':create-key:' || p_submission_key, 0)
  );
  perform pg_advisory_xact_lock(
    hashtextextended(p_actor_id::text || ':create-hash:' || p_payload_hash, 0)
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
    select * into existing_submission
    from public.moral_trade_create_submissions
    where owner_profile_id = p_actor_id
      and submission_key = p_submission_key
    limit 1;

    if existing_submission.id is not null then
      if existing_submission.source_payload_hash is distinct from p_payload_hash
         or existing_submission.source_payload_json is distinct from p_source_payload then
        raise exception using errcode = '23514', message = 'This Create submission key was already used for different terms.';
      end if;
      created_submission_id := existing_submission.id;
      created_target_type := existing_submission.target_type;
      created_target_id := existing_submission.target_id;
      created_submission_status := 'changes_requested';
      created_canonical_path := existing_submission.canonical_path;
      update public.moral_trade_create_submissions
      set status = 'changes_requested'
      where id = existing_submission.id
        and status not in ('rejected', 'withdrawn');
      if existing_submission.target_type = 'offer' then
        update public.offers
        set
          status = 'paused',
          workflow_status = 'pending_review',
          moderation_reason = 'Private harmful-offer assessment hold.'
        where id = existing_submission.target_id;
      end if;
    else
      created_submission_id := null;
      created_target_type := null;
      created_target_id := null;
      created_submission_status := 'rejected';
      created_canonical_path := null;
    end if;
  end if;

  insert into public.moral_trade_harmful_offer_assessments (
    owner_profile_id,
    create_submission_id,
    submission_key,
    assessment_key,
    assessment_trigger,
    assessment_route,
    enforcement_basis,
    policy_version,
    schema_version,
    source_payload_hash,
    assessment_source_hash,
    source_payload_json,
    assessment_json,
    model_status,
    overall_confidence,
    evidence_quality,
    reversibility_concern,
    contested_moral_frame,
    third_party_effect_severity,
    legitimate_veto_holder_identified,
    human_only_sensitive_domain,
    baseline_comparison,
    plausible_severe_harm,
    dependent_party_risk,
    opaque_coercion_incentives,
    hard_policy_block_count,
    review_status
  ) values (
    p_actor_id,
    created_submission_id,
    p_submission_key,
    assessment_key_value,
    p_harm_assessment ->> 'trigger',
    assessment_route_value,
    enforcement_basis_value,
    p_harm_assessment ->> 'policyVersion',
    p_harm_assessment ->> 'schemaVersion',
    p_payload_hash,
    p_harm_assessment ->> 'sourceHash',
    p_source_payload,
    p_harm_assessment,
    model_status_value,
    overall_confidence_value,
    evidence_quality_value,
    reversibility_concern_value,
    contested_moral_frame_value,
    third_party_effect_severity_value,
    legitimate_veto_holder_value,
    human_only_sensitive_value,
    baseline_comparison_value,
    plausible_severe_harm_value,
    dependent_party_risk_value,
    opaque_coercion_incentives_value,
    hard_policy_block_count_value,
    review_status_value
  )
  on conflict (assessment_key) do update set
    create_submission_id = coalesce(
      public.moral_trade_harmful_offer_assessments.create_submission_id,
      excluded.create_submission_id
    )
  returning id into assessment_id_value;

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

create or replace function public.moral_trade_request_harm_assessment_appeal_service(
  p_actor_id uuid,
  p_assessment_id uuid,
  p_appeal_kind text,
  p_statement text,
  p_evidence jsonb
)
returns table (
  appeal_id uuid,
  appeal_status text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  assessment_row public.moral_trade_harmful_offer_assessments%rowtype;
  ordinary_resolved boolean;
  appeal_id_value uuid;
  created_at_value timestamptz;
begin
  if p_actor_id is null then
    raise exception using errcode = '42501', message = 'A valid authenticated actor is required.';
  end if;
  if p_appeal_kind not in ('ordinary', 'new_evidence', 'procedural_error') then
    raise exception using errcode = '22023', message = 'The appeal kind is invalid.';
  end if;
  if char_length(btrim(coalesce(p_statement, ''))) not between 20 and 4000 then
    raise exception using errcode = '22023', message = 'The appeal statement is invalid.';
  end if;
  if jsonb_typeof(coalesce(p_evidence, '{}'::jsonb)) not in ('object', 'array')
     or octet_length(coalesce(p_evidence, '{}'::jsonb)::text) > 24000 then
    raise exception using errcode = '22023', message = 'The appeal evidence is invalid or too large.';
  end if;

  select * into assessment_row
  from public.moral_trade_harmful_offer_assessments
  where id = p_assessment_id
    and owner_profile_id = p_actor_id
  for update;
  if assessment_row.id is null then
    raise exception using errcode = 'P0002', message = 'The harmful-offer assessment was not found.';
  end if;
  if assessment_row.assessment_route = 'allow' then
    raise exception using errcode = '23514', message = 'An automatically permitted assessment is not eligible for this appeal.';
  end if;

  if p_appeal_kind = 'ordinary' and exists (
    select 1
    from public.moral_trade_harmful_offer_assessment_appeals
    where assessment_id = p_assessment_id
      and appellant_profile_id = p_actor_id
      and appeal_kind = 'ordinary'
  ) then
    raise exception using errcode = '23505', message = 'The ordinary appeal has already been used.';
  end if;

  select exists (
    select 1
    from public.moral_trade_harmful_offer_assessment_appeals
    where assessment_id = p_assessment_id
      and appellant_profile_id = p_actor_id
      and appeal_kind = 'ordinary'
      and status = 'resolved'
  ) into ordinary_resolved;
  if p_appeal_kind <> 'ordinary' and not ordinary_resolved then
    raise exception using
      errcode = '23514',
      message = 'A later review request requires a resolved ordinary appeal plus new evidence or a procedural-error claim.';
  end if;

  insert into public.moral_trade_harmful_offer_assessment_appeals (
    assessment_id,
    appellant_profile_id,
    appeal_kind,
    statement,
    evidence_json
  ) values (
    p_assessment_id,
    p_actor_id,
    p_appeal_kind,
    btrim(p_statement),
    coalesce(p_evidence, '{}'::jsonb)
  ) returning id, moral_trade_harmful_offer_assessment_appeals.created_at
  into appeal_id_value, created_at_value;

  update public.moral_trade_harmful_offer_assessments
  set appeal_status = 'requested'
  where id = p_assessment_id;

  if assessment_row.create_submission_id is not null then
    update public.moral_trade_create_submissions
    set status = case
      when status in ('rejected', 'withdrawn') then status
      else 'changes_requested'
    end
    where id = assessment_row.create_submission_id;

    update public.offers
    set
      status = 'paused',
      workflow_status = 'pending_review',
      moderation_reason = 'Private harmful-offer reconsideration hold.'
    where id = (
      select target_id
      from public.moral_trade_create_submissions
      where id = assessment_row.create_submission_id
        and target_type = 'offer'
    );
  end if;

  return query select appeal_id_value, 'pending'::text, created_at_value;
end;
$function$;

create or replace function public.moral_trade_resolve_harm_assessment_appeal_service(
  p_reviewer_id uuid,
  p_appeal_id uuid,
  p_outcome text,
  p_resolution_reason text
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  appeal_row public.moral_trade_harmful_offer_assessment_appeals%rowtype;
  assessment_row public.moral_trade_harmful_offer_assessments%rowtype;
begin
  if p_reviewer_id is null then
    raise exception using errcode = '42501', message = 'A reviewer is required.';
  end if;
  if p_outcome not in ('upheld', 'overturned', 'remanded') then
    raise exception using errcode = '22023', message = 'The appeal outcome is invalid.';
  end if;
  if char_length(btrim(coalesce(p_resolution_reason, ''))) < 20 then
    raise exception using errcode = '22023', message = 'A substantive resolution reason is required.';
  end if;

  select * into appeal_row
  from public.moral_trade_harmful_offer_assessment_appeals
  where id = p_appeal_id
  for update;
  if appeal_row.id is null or appeal_row.status <> 'pending' then
    raise exception using errcode = 'P0002', message = 'The pending appeal was not found.';
  end if;

  select * into assessment_row
  from public.moral_trade_harmful_offer_assessments
  where id = appeal_row.assessment_id
  for update;
  if p_reviewer_id = appeal_row.appellant_profile_id
     or p_reviewer_id = assessment_row.owner_profile_id
     or (
       assessment_row.reviewed_by_profile_id is not null
       and p_reviewer_id = assessment_row.reviewed_by_profile_id
     ) then
    raise exception using errcode = '42501', message = 'The appeal must be decided by a different reviewer.';
  end if;
  if not exists (select 1 from public.profiles where id = p_reviewer_id) then
    raise exception using errcode = '23503', message = 'The reviewer profile was not found.';
  end if;

  update public.moral_trade_harmful_offer_assessment_appeals
  set
    status = 'resolved',
    assigned_reviewer_profile_id = coalesce(assigned_reviewer_profile_id, p_reviewer_id),
    decided_by_profile_id = p_reviewer_id,
    outcome = p_outcome,
    resolution_reason = btrim(p_resolution_reason),
    resolved_at = timezone('utc', now())
  where id = p_appeal_id;

  update public.moral_trade_harmful_offer_assessments
  set
    review_status = case p_outcome
      when 'upheld' then 'upheld'
      when 'overturned' then 'overturned'
      else 'pending'
    end,
    reviewed_by_profile_id = p_reviewer_id,
    reviewed_at = timezone('utc', now()),
    appeal_status = 'resolved'
  where id = appeal_row.assessment_id;
end;
$function$;

create or replace function public.moral_trade_mark_harm_assessment_superseded_on_material_edit()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
begin
  if new.source_payload_hash is distinct from old.source_payload_hash
     or new.source_payload_json is distinct from old.source_payload_json
     or new.requested_action is distinct from old.requested_action
     or new.offered_terms_json is distinct from old.offered_terms_json
     or new.pool_terms_json is distinct from old.pool_terms_json then
    update public.moral_trade_harmful_offer_assessments
    set review_status = 'superseded'
    where create_submission_id = old.id
      and review_status in ('not_required', 'pending', 'upheld', 'overturned');
    if new.status not in ('rejected', 'withdrawn') then
      new.status := 'changes_requested';
    end if;
  end if;
  return new;
end;
$function$;

drop trigger if exists moral_trade_create_submission_harm_material_edit
  on public.moral_trade_create_submissions;
create trigger moral_trade_create_submission_harm_material_edit
before update on public.moral_trade_create_submissions
for each row execute function public.moral_trade_mark_harm_assessment_superseded_on_material_edit();

revoke all on function public.moral_trade_claim_harm_assessment_rate_limit_service(uuid, text)
  from public, anon, authenticated;
revoke all on function public.moral_trade_create_submit_with_harm_assessment_service(
  uuid, text, text, jsonb, text, text, text, text, text, jsonb, jsonb, jsonb, jsonb
) from public, anon, authenticated;
revoke all on function public.moral_trade_request_harm_assessment_appeal_service(
  uuid, uuid, text, text, jsonb
) from public, anon, authenticated;
revoke all on function public.moral_trade_resolve_harm_assessment_appeal_service(
  uuid, uuid, text, text
) from public, anon, authenticated;

grant execute on function public.moral_trade_claim_harm_assessment_rate_limit_service(uuid, text)
  to service_role;
grant execute on function public.moral_trade_create_submit_with_harm_assessment_service(
  uuid, text, text, jsonb, text, text, text, text, text, jsonb, jsonb, jsonb, jsonb
) to service_role;
grant execute on function public.moral_trade_request_harm_assessment_appeal_service(
  uuid, uuid, text, text, jsonb
) to service_role;
grant execute on function public.moral_trade_resolve_harm_assessment_appeal_service(
  uuid, uuid, text, text
) to service_role;

commit;
