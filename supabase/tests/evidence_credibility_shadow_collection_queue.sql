-- Private AAL2-administrator collection queue and wrapper QA; rollback-only.
begin;

create temporary table qa_collection_actors (
  actor_role text primary key,
  profile_id uuid not null unique
) on commit drop;

insert into qa_collection_actors(actor_role, profile_id)
select roles.actor_role, profiles.id
from unnest(array['admin','payer','performer','reviewer','appeal_reviewer'])
  with ordinality as roles(actor_role, position)
join (
  select id, row_number() over (order by id) as position
  from public.profiles
  limit 5
) profiles using (position);

do $test$
begin
  if (select count(*) from qa_collection_actors) <> 5 then
    raise exception 'Collection QA requires five existing QA profiles.';
  end if;
end;
$test$;

insert into public.trade_review_role_grants(
  profile_id, role, active, granted_by, granted_at, revoked_at
)
select admin.profile_id, 'administrator', true, admin.profile_id, now(), null
from qa_collection_actors admin
where admin.actor_role = 'admin'
on conflict (profile_id, role) do update
set active = true,
    revoked_at = null;

create temporary table qa_collection_objects (
  object_name text primary key,
  object_id uuid not null unique
) on commit drop;

with created as (
  insert into public.agreements(
    proposer_id, responder_id, status, lifecycle_status, source, completion_state
  )
  select payer.profile_id, performer.profile_id,
    'active'::public.agreement_status, 'active', 'manual', 'under_review'
  from qa_collection_actors payer
  cross join qa_collection_actors performer
  where payer.actor_role = 'payer' and performer.actor_role = 'performer'
  returning id
)
insert into qa_collection_objects
select 'agreement', id from created;

with created as (
  insert into public.trade_agreement_versions(
    agreement_id, version, proposed_by, proposed_action, requested_action,
    duration, evidence_rule, exit_conditions, maximum_burden, privacy_scope,
    no_trade_baseline, terms_hash, requires_milestone_manifest,
    milestone_manifest_hash, complete_terms_hash
  )
  select agreement.object_id, 1, payer.profile_id,
    'Perform private collection QA', 'Settle private collection QA',
    'QA only', 'Private reviewed evidence', 'Prospective exit', '$100 maximum',
    'Participants and assigned reviewers only', 'No trade', repeat('1', 64),
    true, repeat('2', 64), repeat('3', 64)
  from qa_collection_objects agreement
  cross join qa_collection_actors payer
  where agreement.object_name = 'agreement' and payer.actor_role = 'payer'
  returning id
)
insert into qa_collection_objects
select 'version', id from created;

update public.agreements
set current_version_id = (
  select object_id from qa_collection_objects where object_name = 'version'
)
where id = (
  select object_id from qa_collection_objects where object_name = 'agreement'
);

create or replace function pg_temp.collection_make_milestone(
  p_name text,
  p_position integer,
  p_units numeric,
  p_status text default 'terms'
)
returns uuid
language plpgsql
as $function$
declare
  result_id uuid;
begin
  insert into public.trade_agreement_milestones(
    agreement_id, agreement_version_id, position, performer_id, payer_id,
    action_category, description, unit_label, units_total, indivisible,
    maximum_amount_cents, currency, evidence_rule, status,
    replacement_deadline_at
  ) values (
    (select object_id from qa_collection_objects where object_name = 'agreement'),
    (select object_id from qa_collection_objects where object_name = 'version'),
    p_position,
    (select profile_id from qa_collection_actors where actor_role = 'performer'),
    (select profile_id from qa_collection_actors where actor_role = 'payer'),
    'service', p_name, 'unit', p_units, false,
    10000, 'USD', 'Private collection QA evidence', p_status,
    case when p_status = 'replacement_due' then now() - interval '1 day' else null end
  )
  returning id into result_id;
  insert into qa_collection_objects values (p_name, result_id);
  return result_id;
end;
$function$;

select pg_temp.collection_make_milestone('reviewed_milestone', 1, 10, 'terms');
select pg_temp.collection_make_milestone(
  'expired_replacement_milestone', 2, 1, 'replacement_due'
);

create or replace function pg_temp.collection_attach_review(
  p_milestone_name text,
  p_review_name text,
  p_kind text,
  p_base_review uuid,
  p_outcome text,
  p_completion numeric,
  p_factor smallint,
  p_reviewer_role text default 'reviewer'
)
returns uuid
language plpgsql
as $function$
declare
  milestone_value uuid := (
    select object_id from qa_collection_objects where object_name = p_milestone_name
  );
  units_value numeric;
  bundle_value uuid;
  review_value uuid;
  payout_value uuid;
  completion_value numeric;
  factor_value smallint;
  basis integer;
  amount bigint;
  bundle_kind_value text;
  attempt_value smallint;
begin
  select units_total into units_value
  from public.trade_agreement_milestones
  where id = milestone_value;

  completion_value := case when p_outcome = 'rejected' then 0 else p_completion end;
  factor_value := case when p_outcome = 'rejected' then 0::smallint else p_factor end;
  bundle_kind_value := case when p_kind = 'replacement' then 'replacement' else 'initial' end;
  attempt_value := case when bundle_kind_value = 'replacement' then 2 else 1 end;

  select id into bundle_value
  from public.trade_evidence_bundles
  where milestone_id = milestone_value
    and bundle_kind = bundle_kind_value
  limit 1;

  if bundle_value is null then
    insert into public.trade_evidence_bundles(
      milestone_id, submitted_by, bundle_kind, attempt_number,
      status, submitted_at, reviewed_at
    ) values (
      milestone_value,
      (select profile_id from qa_collection_actors where actor_role = 'performer'),
      bundle_kind_value, attempt_value, 'accepted', now(), now()
    ) returning id into bundle_value;
  end if;

  select payout_basis_points, amount_due_cents
  into basis, amount
  from public.trade_milestone_payout_v1(
    10000::bigint,
    completion_value,
    units_value,
    factor_value
  );

  insert into public.trade_milestone_reviews(
    milestone_id, bundle_id, reviewer_id, review_kind, base_review_id,
    outcome, completion_units, confidence_band, payout_basis_points,
    amount_due_cents, private_reason, appeal_deadline_at, is_final, finalized_at
  ) values (
    milestone_value,
    bundle_value,
    (select profile_id from qa_collection_actors where actor_role = p_reviewer_role),
    p_kind,
    p_base_review,
    p_outcome,
    completion_value,
    factor_value,
    basis,
    amount,
    'Private collection QA final review',
    now() + interval '7 days',
    true,
    now()
  ) returning id into review_value;

  select id into payout_value
  from public.trade_milestone_payouts
  where milestone_id = milestone_value;

  if payout_value is null then
    insert into public.trade_milestone_payouts(
      milestone_id, review_id, payer_id, payee_id, maximum_amount_cents,
      completion_units, units_total, confidence_band, payout_basis_points,
      amount_due_cents, currency, is_final, status, finalized_at
    ) values (
      milestone_value,
      review_value,
      (select profile_id from qa_collection_actors where actor_role = 'payer'),
      (select profile_id from qa_collection_actors where actor_role = 'performer'),
      10000,
      completion_value,
      units_value,
      factor_value,
      basis,
      amount,
      'USD',
      true,
      case when amount = 0 then 'not_due' else 'due' end,
      now()
    ) returning id into payout_value;
    insert into qa_collection_objects values ('reviewed_payout', payout_value);
  else
    update public.trade_milestone_payouts
    set review_id = review_value,
        completion_units = completion_value,
        units_total = units_value,
        confidence_band = factor_value,
        payout_basis_points = basis,
        amount_due_cents = amount,
        status = case when amount = 0 then 'not_due' else 'due' end,
        finalized_at = now(),
        updated_at = now()
    where id = payout_value;
  end if;

  update public.trade_agreement_milestones
  set final_review_id = review_value,
      status = 'graded'
  where id = milestone_value;

  insert into qa_collection_objects values (p_review_name, review_value);
  return review_value;
end;
$function$;

select pg_temp.collection_attach_review(
  'reviewed_milestone',
  'initial_review',
  'initial',
  null::uuid,
  'graded',
  6,
  50::smallint,
  'reviewer'
);

create temporary table qa_collection_baseline as
select
  (select count(*) from public.credibility_events) as active_events,
  (select count(*) from public.credibility_public_aggregates) as active_aggregates,
  (select count(*) from public.credibility_restrictions) as active_restrictions;

select set_config(
  'request.jwt.claim.sub',
  (select profile_id::text from qa_collection_actors where actor_role = 'admin'),
  true
);
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub', (select profile_id::text from qa_collection_actors where actor_role = 'admin'),
    'role', 'authenticated',
    'aal', 'aal1'
  )::text,
  true
);

do $test$
declare
  denied boolean := false;
begin
  begin
    perform public.list_credibility_shadow_collection_queue_v1(100, 0);
  exception when others then
    if sqlerrm like '%requires an active AAL2 administrator%' then
      denied := true;
    else
      raise;
    end if;
  end;
  if not denied then
    raise exception 'AAL1 administrator unexpectedly opened the private collection queue.';
  end if;
end;
$test$;

select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub', (select profile_id::text from qa_collection_actors where actor_role = 'admin'),
    'role', 'authenticated',
    'aal', 'aal2'
  )::text,
  true
);

do $test$
declare
  queue_value jsonb := public.list_credibility_shadow_collection_queue_v1(100, 0);
begin
  if not exists (
    select 1
    from jsonb_array_elements(queue_value -> 'items') item
    where item ->> 'queueKey' = 'evidence:' || (
      select object_id::text from qa_collection_objects
      where object_name = 'reviewed_milestone'
    )
      and item ->> 'derivedAdjudicationClass' = 'neutral_review_final'
      and item ->> 'suggestedFinalityReason' = 'review_final'
      and (item ->> 'requiresSupersession')::boolean = false
  ) then
    raise exception 'Final reviewed milestone was not listed in the private queue.';
  end if;

  if not exists (
    select 1
    from jsonb_array_elements(queue_value -> 'items') item
    where item ->> 'queueKey' = 'evidence:' || (
      select object_id::text from qa_collection_objects
      where object_name = 'expired_replacement_milestone'
    )
      and item ->> 'suggestedFinalityReason' = 'replacement_expired'
  ) then
    raise exception 'Expired no-review replacement was not listed in the private queue.';
  end if;
end;
$test$;

create temporary table qa_initial_collection_result as
select public.record_credibility_shadow_evidence_collection_v1(
  p_milestone_id => (
    select object_id from qa_collection_objects where object_name = 'reviewed_milestone'
  ),
  p_review_id => (
    select object_id from qa_collection_objects where object_name = 'initial_review'
  ),
  p_decision_confidence_band => 75::smallint,
  p_primary_provenance_class => 'independent_third_party',
  p_provider_authentication_status => 'not_applicable',
  p_provider_authentication_ref => '',
  p_contradiction_status => 'none',
  p_integrity_finding => 'supported_honest',
  p_responsiveness_finding => 'on_time',
  p_dispute_conduct_finding => 'cooperative',
  p_finality_reason => 'review_final',
  p_exclusion_reason => '',
  p_supersedes_decision_id => null::uuid,
  p_private_rationale => 'Independent private QA review supports the final completion finding.'
) as result;

insert into qa_collection_objects
select 'initial_evidence_decision', (result ->> 'decisionId')::uuid
from qa_initial_collection_result;

do $test$
declare
  replay jsonb;
  queue_value jsonb;
begin
  if not exists (
    select 1
    from public.credibility_shadow_collection_audit audit_record
    where audit_record.evidence_decision_id = (
      select object_id from qa_collection_objects
      where object_name = 'initial_evidence_decision'
    )
      and audit_record.queue_kind = 'evidence'
      and audit_record.recorded_by = (
        select profile_id from qa_collection_actors where actor_role = 'admin'
      )
      and audit_record.private_rationale =
        'Independent private QA review supports the final completion finding.'
  ) then
    raise exception 'Evidence collection audit record was not created.';
  end if;

  replay := public.record_credibility_shadow_evidence_collection_v1(
    p_milestone_id => (
      select object_id from qa_collection_objects where object_name = 'reviewed_milestone'
    ),
    p_review_id => (
      select object_id from qa_collection_objects where object_name = 'initial_review'
    ),
    p_decision_confidence_band => 75::smallint,
    p_primary_provenance_class => 'independent_third_party',
    p_provider_authentication_status => 'not_applicable',
    p_provider_authentication_ref => '',
    p_contradiction_status => 'none',
    p_integrity_finding => 'supported_honest',
    p_responsiveness_finding => 'on_time',
    p_dispute_conduct_finding => 'cooperative',
    p_finality_reason => 'review_final',
    p_exclusion_reason => '',
    p_supersedes_decision_id => null::uuid,
    p_private_rationale => 'Independent private QA review supports the final completion finding.'
  );

  if replay ->> 'status' <> 'replayed'
     or (select count(*) from public.credibility_shadow_collection_audit
         where evidence_decision_id = (
           select object_id from qa_collection_objects
           where object_name = 'initial_evidence_decision'
         )) <> 1 then
    raise exception 'Evidence collection replay was not idempotent.';
  end if;

  queue_value := public.list_credibility_shadow_collection_queue_v1(100, 0);
  if exists (
    select 1
    from jsonb_array_elements(queue_value -> 'items') item
    where item ->> 'queueKey' = 'evidence:' || (
      select object_id::text from qa_collection_objects
      where object_name = 'reviewed_milestone'
    )
  ) then
    raise exception 'Matching current evidence decision remained in the queue.';
  end if;
end;
$test$;

create temporary table qa_no_review_collection_result as
select public.record_credibility_shadow_evidence_collection_v1(
  p_milestone_id => (
    select object_id from qa_collection_objects
    where object_name = 'expired_replacement_milestone'
  ),
  p_review_id => null::uuid,
  p_decision_confidence_band => 100::smallint,
  p_primary_provenance_class => 'platform_observed',
  p_provider_authentication_status => 'not_applicable',
  p_provider_authentication_ref => '',
  p_contradiction_status => 'none',
  p_integrity_finding => 'not_assessed',
  p_responsiveness_finding => 'missed_deadline',
  p_dispute_conduct_finding => 'not_assessed',
  p_finality_reason => 'replacement_expired',
  p_exclusion_reason => '',
  p_supersedes_decision_id => null::uuid,
  p_private_rationale => 'The frozen replacement window expired without a replacement packet.'
) as result;

insert into qa_collection_objects
select 'expired_evidence_decision', (result ->> 'decisionId')::uuid
from qa_no_review_collection_result;

-- Replace the current source with a final appeal decision. The queue must require
-- explicit supersession of the earlier shadow decision.
reset role;
select pg_temp.collection_attach_review(
  'reviewed_milestone',
  'appeal_review',
  'appeal',
  (select object_id from qa_collection_objects where object_name = 'initial_review'),
  'graded',
  8,
  100::smallint,
  'appeal_reviewer'
);

do $test$
declare
  queue_value jsonb := public.list_credibility_shadow_collection_queue_v1(100, 0);
begin
  if not exists (
    select 1
    from jsonb_array_elements(queue_value -> 'items') item
    where item ->> 'queueKey' = 'evidence:' || (
      select object_id::text from qa_collection_objects
      where object_name = 'reviewed_milestone'
    )
      and item ->> 'suggestedFinalityReason' = 'appeal_overturned'
      and (item ->> 'requiresSupersession')::boolean = true
      and item ->> 'currentDecisionId' = (
        select object_id::text from qa_collection_objects
        where object_name = 'initial_evidence_decision'
      )
  ) then
    raise exception 'Changed final appeal source did not require explicit supersession.';
  end if;
end;
$test$;

create temporary table qa_appeal_collection_result as
select public.record_credibility_shadow_evidence_collection_v1(
  p_milestone_id => (
    select object_id from qa_collection_objects where object_name = 'reviewed_milestone'
  ),
  p_review_id => (
    select object_id from qa_collection_objects where object_name = 'appeal_review'
  ),
  p_decision_confidence_band => 100::smallint,
  p_primary_provenance_class => 'independent_third_party',
  p_provider_authentication_status => 'not_applicable',
  p_provider_authentication_ref => '',
  p_contradiction_status => 'none',
  p_integrity_finding => 'supported_honest',
  p_responsiveness_finding => 'on_time',
  p_dispute_conduct_finding => 'cooperative',
  p_finality_reason => 'appeal_overturned',
  p_exclusion_reason => '',
  p_supersedes_decision_id => (
    select object_id from qa_collection_objects
    where object_name = 'initial_evidence_decision'
  ),
  p_private_rationale => 'A different final appeal reviewer materially changed completion.'
) as result;

insert into qa_collection_objects
select 'appeal_evidence_decision', (result ->> 'decisionId')::uuid
from qa_appeal_collection_result;

do $test$
begin
  if not exists (
    select 1
    from public.trade_evidence_decisions current_decision
    where current_decision.id = (
      select object_id from qa_collection_objects
      where object_name = 'appeal_evidence_decision'
    )
      and current_decision.supersedes_decision_id = (
        select object_id from qa_collection_objects
        where object_name = 'initial_evidence_decision'
      )
      and current_decision.adjudication_class = 'appeal_review_final'
      and current_decision.finality_reason = 'appeal_overturned'
  ) then
    raise exception 'Appeal collection did not preserve explicit supersession.';
  end if;

  if (
    select count(*)
    from public.credibility_shadow_events event_row
    where event_row.milestone_id = (
      select object_id from qa_collection_objects where object_name = 'reviewed_milestone'
    )
      and event_row.dimension = 'fulfilment'
      and not exists (
        select 1 from public.credibility_shadow_events successor
        where successor.supersedes_event_id = event_row.id
      )
  ) <> 1 then
    raise exception 'Evidence supersession left more than one terminal fulfilment event.';
  end if;
end;
$test$;

-- A directly confirmed final external payment becomes a private settlement item.
update public.trade_milestone_payouts
set status = 'confirmed',
    finalized_at = now(),
    updated_at = now()
where id = (
  select object_id from qa_collection_objects where object_name = 'reviewed_payout'
);

do $test$
declare
  queue_value jsonb := public.list_credibility_shadow_collection_queue_v1(100, 0);
begin
  if not exists (
    select 1
    from jsonb_array_elements(queue_value -> 'items') item
    where item ->> 'queueKey' = 'settlement:' || (
      select object_id::text from qa_collection_objects where object_name = 'reviewed_payout'
    )
      and item ->> 'suggestedFinalityReason' = 'confirmed'
      and item ->> 'derivedAdjudicationClass' = 'platform_established'
  ) then
    raise exception 'Confirmed final payout was not listed in the settlement queue.';
  end if;
end;
$test$;

create temporary table qa_settlement_collection_result as
select public.record_credibility_shadow_settlement_collection_v1(
  p_payout_id => (
    select object_id from qa_collection_objects where object_name = 'reviewed_payout'
  ),
  p_payment_review_decision_id => null::uuid,
  p_decision_confidence_band => 100::smallint,
  p_primary_provenance_class => 'platform_observed',
  p_provider_authentication_status => 'not_applicable',
  p_provider_authentication_ref => '',
  p_finality_reason => 'confirmed',
  p_exclusion_reason => '',
  p_supersedes_decision_id => null::uuid,
  p_private_rationale => 'The platform records the final participant-confirmed external receipt.'
) as result;

insert into qa_collection_objects
select 'settlement_decision', (result ->> 'decisionId')::uuid
from qa_settlement_collection_result;

do $test$
declare
  replay jsonb;
  queue_value jsonb;
begin
  replay := public.record_credibility_shadow_settlement_collection_v1(
    p_payout_id => (
      select object_id from qa_collection_objects where object_name = 'reviewed_payout'
    ),
    p_payment_review_decision_id => null::uuid,
    p_decision_confidence_band => 100::smallint,
    p_primary_provenance_class => 'platform_observed',
    p_provider_authentication_status => 'not_applicable',
    p_provider_authentication_ref => '',
    p_finality_reason => 'confirmed',
    p_exclusion_reason => '',
    p_supersedes_decision_id => null::uuid,
    p_private_rationale => 'The platform records the final participant-confirmed external receipt.'
  );

  if replay ->> 'status' <> 'replayed'
     or (select count(*) from public.credibility_shadow_collection_audit
         where settlement_decision_id = (
           select object_id from qa_collection_objects where object_name = 'settlement_decision'
         )) <> 1 then
    raise exception 'Settlement collection replay was not idempotent.';
  end if;

  queue_value := public.list_credibility_shadow_collection_queue_v1(100, 0);
  if exists (
    select 1
    from jsonb_array_elements(queue_value -> 'items') item
    where item ->> 'queueKey' = 'settlement:' || (
      select object_id::text from qa_collection_objects where object_name = 'reviewed_payout'
    )
  ) then
    raise exception 'Matching current settlement decision remained in the queue.';
  end if;
end;
$test$;

-- Direct audit-table reads remain unavailable to ordinary authenticated users.
set local role authenticated;
do $test$
declare
  denied boolean := false;
begin
  begin
    perform 1 from public.credibility_shadow_collection_audit limit 1;
  exception when insufficient_privilege then
    denied := true;
  end;
  if not denied then
    raise exception 'Authenticated role unexpectedly read the private audit table directly.';
  end if;
end;
$test$;
reset role;

do $test$
begin
  if not has_function_privilege(
       'authenticated',
       'public.list_credibility_shadow_collection_queue_v1(integer,integer)',
       'execute'
     )
     or has_function_privilege(
       'anon',
       'public.list_credibility_shadow_collection_queue_v1(integer,integer)',
       'execute'
     )
     or has_function_privilege(
       'service_role',
       'public.list_credibility_shadow_collection_queue_v1(integer,integer)',
       'execute'
     ) then
    raise exception 'Collection queue execution grants are not fail-closed.';
  end if;

  if (select count(*) from public.credibility_events)
       <> (select active_events from qa_collection_baseline)
     or (select count(*) from public.credibility_public_aggregates)
       <> (select active_aggregates from qa_collection_baseline)
     or (select count(*) from public.credibility_restrictions)
       <> (select active_restrictions from qa_collection_baseline) then
    raise exception 'Private collection changed the active credibility pipeline.';
  end if;

  if not exists (
    select 1
    from public.credibility_shadow_controls
    where control_key = 'evidence_decision_v2'
      and mode = 'shadow'
      and not milestone_cutover_enabled
      and not public_effects_enabled
      and not ranking_effects_enabled
      and not eligibility_effects_enabled
  ) then
    raise exception 'Shadow controls did not remain fail-closed.';
  end if;
end;
$test$;

rollback;
