-- Private capture authorization, RLS, append-only, and fail-closed QA.
begin;

create temporary table qa_capture_auth_actors (
  actor_role text primary key,
  profile_id uuid not null unique
) on commit drop;

insert into qa_capture_auth_actors(actor_role, profile_id)
select roles.actor_role, profiles.id
from unnest(array['payer','performer','administrator','unauthorized'])
  with ordinality roles(actor_role, position)
join (
  select id, row_number() over(order by id) as position
  from public.profiles
  limit 4
) profiles using(position);

do $test$
begin
  if (select count(*) from qa_capture_auth_actors) <> 4 then
    raise exception 'Capture authorization QA requires four existing QA profiles.';
  end if;
end;
$test$;

delete from public.trade_review_role_grants
where profile_id = (
    select profile_id
    from qa_capture_auth_actors
    where actor_role = 'unauthorized'
  )
  and role = 'administrator';

insert into public.trade_review_role_grants(
  profile_id, role, active, granted_by
)
select
  administrator.profile_id,
  'administrator',
  true,
  administrator.profile_id
from qa_capture_auth_actors administrator
where administrator.actor_role = 'administrator'
on conflict(profile_id, role) do update
set active = true,
    revoked_at = null,
    granted_by = excluded.granted_by;

create temporary table qa_capture_auth_objects (
  object_name text primary key,
  object_id uuid not null unique
) on commit drop;

with made as (
  insert into public.agreements(
    proposer_id, responder_id, status, lifecycle_status, source, completion_state
  )
  select
    payer.profile_id,
    performer.profile_id,
    'active'::public.agreement_status,
    'active',
    'manual',
    'under_review'
  from qa_capture_auth_actors payer
  cross join qa_capture_auth_actors performer
  where payer.actor_role = 'payer'
    and performer.actor_role = 'performer'
  returning id
)
insert into qa_capture_auth_objects
select 'agreement', id from made;

with made as (
  insert into public.trade_agreement_versions(
    agreement_id,
    version,
    proposed_by,
    proposed_action,
    requested_action,
    duration,
    evidence_rule,
    evidence_due_date,
    exit_conditions,
    maximum_burden,
    privacy_scope,
    no_trade_baseline,
    terms_hash,
    requires_milestone_manifest,
    milestone_manifest_hash,
    complete_terms_hash
  )
  select
    agreement.object_id,
    1,
    payer.profile_id,
    'Perform authorization QA',
    'Settle authorization QA',
    'QA only',
    'Private authorization evidence',
    current_date + 7,
    'Prospective exit',
    '$10 maximum',
    'Private',
    'No trade',
    repeat('4', 64),
    true,
    null,
    null
  from qa_capture_auth_objects agreement
  cross join qa_capture_auth_actors payer
  where agreement.object_name = 'agreement'
    and payer.actor_role = 'payer'
  returning id
)
insert into qa_capture_auth_objects
select 'version', id from made;

update public.agreements
set current_version_id = (
  select object_id from qa_capture_auth_objects where object_name = 'version'
)
where id = (
  select object_id from qa_capture_auth_objects where object_name = 'agreement'
);

with made as (
  insert into public.trade_agreement_milestones(
    agreement_id,
    agreement_version_id,
    position,
    performer_id,
    payer_id,
    action_category,
    description,
    unit_label,
    units_total,
    indivisible,
    maximum_amount_cents,
    currency,
    evidence_rule,
    status
  )
  select
    agreement.object_id,
    version.object_id,
    1,
    performer.profile_id,
    payer.profile_id,
    'research',
    'Complete one authorization QA unit',
    'unit',
    1,
    true,
    1000,
    'USD',
    'Private authorization evidence',
    'terms'
  from qa_capture_auth_objects agreement
  cross join qa_capture_auth_objects version
  cross join qa_capture_auth_actors performer
  cross join qa_capture_auth_actors payer
  where agreement.object_name = 'agreement'
    and version.object_name = 'version'
    and performer.actor_role = 'performer'
    and payer.actor_role = 'payer'
  returning id
)
insert into qa_capture_auth_objects
select 'milestone', id from made;

update public.trade_agreement_versions
set milestone_manifest_hash = repeat('5', 64),
    complete_terms_hash = repeat('6', 64)
where id = (
  select object_id from qa_capture_auth_objects where object_name = 'version'
);

with made as (
  insert into public.trade_evidence_bundles(
    milestone_id, submitted_by, bundle_kind, attempt_number,
    status, submitted_at, reviewed_at
  )
  select
    milestone.object_id,
    performer.profile_id,
    'initial',
    1,
    'accepted',
    now(),
    now()
  from qa_capture_auth_objects milestone
  cross join qa_capture_auth_actors performer
  where milestone.object_name = 'milestone'
    and performer.actor_role = 'performer'
  returning id
)
insert into qa_capture_auth_objects
select 'bundle', id from made;

with payout_math as (
  select *
  from public.trade_milestone_payout_v1(
    1000::bigint, 1::numeric, 1::numeric, 100::smallint
  )
),
made as (
  insert into public.trade_milestone_reviews(
    milestone_id,
    bundle_id,
    reviewer_id,
    review_kind,
    outcome,
    completion_units,
    confidence_band,
    payout_basis_points,
    amount_due_cents,
    private_reason,
    appeal_deadline_at,
    is_final,
    finalized_at
  )
  select
    milestone.object_id,
    bundle.object_id,
    administrator.profile_id,
    'initial',
    'graded',
    1,
    100,
    payout_math.payout_basis_points,
    payout_math.amount_due_cents,
    'QA authorization review',
    now() + interval '7 days',
    true,
    now()
  from qa_capture_auth_objects milestone
  cross join qa_capture_auth_objects bundle
  cross join qa_capture_auth_actors administrator
  cross join payout_math
  where milestone.object_name = 'milestone'
    and bundle.object_name = 'bundle'
    and administrator.actor_role = 'administrator'
  returning id
)
insert into qa_capture_auth_objects
select 'review', id from made;

with made as (
  insert into public.trade_milestone_payouts(
    milestone_id,
    review_id,
    payer_id,
    payee_id,
    maximum_amount_cents,
    completion_units,
    units_total,
    confidence_band,
    payout_basis_points,
    amount_due_cents,
    currency,
    is_final,
    status,
    finalized_at
  )
  select
    milestone.object_id,
    review.object_id,
    payer.profile_id,
    performer.profile_id,
    1000,
    1,
    1,
    100,
    10000,
    1000,
    'USD',
    true,
    'due',
    now()
  from qa_capture_auth_objects milestone
  cross join qa_capture_auth_objects review
  cross join qa_capture_auth_actors payer
  cross join qa_capture_auth_actors performer
  where milestone.object_name = 'milestone'
    and review.object_name = 'review'
    and payer.actor_role = 'payer'
    and performer.actor_role = 'performer'
  returning id
)
insert into qa_capture_auth_objects
select 'payout', id from made;

update public.trade_agreement_milestones
set final_review_id = (
      select object_id from qa_capture_auth_objects where object_name = 'review'
    ),
    current_bundle_id = (
      select object_id from qa_capture_auth_objects where object_name = 'bundle'
    ),
    status = 'graded'
where id = (
  select object_id from qa_capture_auth_objects where object_name = 'milestone'
);

do $test$
declare
  evidence_queue oid := to_regprocedure(
    'public.list_trade_evidence_shadow_capture_queue_v1(integer,integer)'
  );
  settlement_queue oid := to_regprocedure(
    'public.list_trade_settlement_shadow_capture_queue_v1(integer,integer)'
  );
  evidence_capture oid := to_regprocedure(
    'public.record_trade_evidence_shadow_capture_v1(uuid,uuid,smallint,text,text,text,text,text,text,text,text,text,text,uuid)'
  );
  settlement_capture oid := to_regprocedure(
    'public.record_trade_settlement_shadow_capture_v1(uuid,uuid,smallint,text,text,text,text,text,text,uuid)'
  );
begin
  if has_table_privilege(
      'anon', 'public.trade_shadow_capture_records', 'SELECT'
    )
    or has_table_privilege(
      'authenticated', 'public.trade_shadow_capture_records', 'SELECT'
    )
    or has_table_privilege(
      'authenticated', 'public.trade_shadow_capture_records', 'INSERT'
    ) then
    raise exception 'Ordinary API roles retained direct capture-record privileges.';
  end if;

  if has_function_privilege('anon', evidence_queue, 'EXECUTE')
     or has_function_privilege('anon', settlement_queue, 'EXECUTE')
     or has_function_privilege('anon', evidence_capture, 'EXECUTE')
     or has_function_privilege('anon', settlement_capture, 'EXECUTE') then
    raise exception 'Anonymous callers can reach a private capture RPC.';
  end if;

  if not has_function_privilege('authenticated', evidence_queue, 'EXECUTE')
     or not has_function_privilege('authenticated', evidence_capture, 'EXECUTE') then
    raise exception 'Authenticated administrators cannot reach the guarded capture RPCs.';
  end if;
end;
$test$;

-- AAL1 remains blocked even with an active administrator grant.
select set_config(
  'request.jwt.claim.sub',
  (select profile_id::text from qa_capture_auth_actors where actor_role = 'administrator'),
  true
);
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'role', 'authenticated',
    'aal', 'aal1',
    'sub', (
      select profile_id::text
      from qa_capture_auth_actors
      where actor_role = 'administrator'
    )
  )::text,
  true
);

do $test$
begin
  begin
    perform *
    from public.list_trade_evidence_shadow_capture_queue_v1(20, 0);
    raise exception 'An AAL1 administrator unexpectedly read the capture queue.';
  exception
    when others then
      if sqlerrm not like 'Shadow capture requires an AAL2 Moral Trade administrator%' then
        raise;
      end if;
  end;

  begin
    perform public.record_trade_evidence_shadow_capture_v1(
      p_milestone_id => (
        select object_id from qa_capture_auth_objects where object_name = 'milestone'
      ),
      p_review_id => (
        select object_id from qa_capture_auth_objects where object_name = 'review'
      ),
      p_decision_confidence_band => 100::smallint,
      p_primary_provenance_class => 'independent_third_party',
      p_provider_authentication_status => 'not_applicable',
      p_provider_authentication_ref => '',
      p_contradiction_status => 'none',
      p_integrity_finding => 'not_assessed',
      p_responsiveness_finding => 'on_time',
      p_dispute_conduct_finding => 'not_assessed',
      p_finality_reason => 'review_final',
      p_exclusion_reason => '',
      p_private_rationale => 'AAL1 must not capture',
      p_supersedes_decision_id => null::uuid
    );
    raise exception 'An AAL1 administrator unexpectedly recorded a capture.';
  exception
    when others then
      if sqlerrm not like 'Shadow capture requires an AAL2 Moral Trade administrator%' then
        raise;
      end if;
  end;
end;
$test$;

-- AAL2 without an administrator grant remains blocked.
select set_config(
  'request.jwt.claim.sub',
  (select profile_id::text from qa_capture_auth_actors where actor_role = 'unauthorized'),
  true
);
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'role', 'authenticated',
    'aal', 'aal2',
    'sub', (
      select profile_id::text
      from qa_capture_auth_actors
      where actor_role = 'unauthorized'
    )
  )::text,
  true
);

do $test$
begin
  begin
    perform *
    from public.list_trade_evidence_shadow_capture_queue_v1(20, 0);
    raise exception 'A non-administrator unexpectedly read the capture queue.';
  exception
    when others then
      if sqlerrm not like 'Shadow capture requires an AAL2 Moral Trade administrator%' then
        raise;
      end if;
  end;
end;
$test$;

-- AAL2 administrator succeeds and is recorded as the capture actor.
select set_config(
  'request.jwt.claim.sub',
  (select profile_id::text from qa_capture_auth_actors where actor_role = 'administrator'),
  true
);
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'role', 'authenticated',
    'aal', 'aal2',
    'sub', (
      select profile_id::text
      from qa_capture_auth_actors
      where actor_role = 'administrator'
    )
  )::text,
  true
);

create temporary table qa_capture_auth_result as
select public.record_trade_evidence_shadow_capture_v1(
  p_milestone_id => (
    select object_id from qa_capture_auth_objects where object_name = 'milestone'
  ),
  p_review_id => (
    select object_id from qa_capture_auth_objects where object_name = 'review'
  ),
  p_decision_confidence_band => 100::smallint,
  p_primary_provenance_class => 'independent_third_party',
  p_provider_authentication_status => 'not_applicable',
  p_provider_authentication_ref => '',
  p_contradiction_status => 'none',
  p_integrity_finding => 'supported_honest',
  p_responsiveness_finding => 'on_time',
  p_dispute_conduct_finding => 'not_assessed',
  p_finality_reason => 'review_final',
  p_exclusion_reason => '',
  p_private_rationale => 'AAL2 administrator private authorization rationale',
  p_supersedes_decision_id => null::uuid
) as result;

insert into qa_capture_auth_objects
select 'decision', (result ->> 'decisionId')::uuid
from qa_capture_auth_result;
insert into qa_capture_auth_objects
select 'capture', (result ->> 'captureId')::uuid
from qa_capture_auth_result;

do $test$
begin
  if not exists (
    select 1
    from public.trade_shadow_capture_records record
    where record.id = (
      select object_id from qa_capture_auth_objects where object_name = 'capture'
    )
      and record.evidence_decision_id = (
        select object_id from qa_capture_auth_objects where object_name = 'decision'
      )
      and record.created_by = (
        select profile_id
        from qa_capture_auth_actors
        where actor_role = 'administrator'
      )
      and record.private_rationale_hash = encode(
        extensions.digest(
          convert_to(
            'AAL2 administrator private authorization rationale',
            'UTF8'
          ),
          'sha256'
        ),
        'hex'
      )
  ) then
    raise exception 'AAL2 administrator capture was not actor- and rationale-bound.';
  end if;
end;
$test$;

-- Append-only history rejects mutation even through the service path.
select set_config('request.jwt.claim.sub', '', true);
select set_config('request.jwt.claims', '{"role":"service_role"}', true);

do $test$
begin
  begin
    update public.trade_shadow_capture_records
    set private_rationale = 'tampered'
    where id = (
      select object_id from qa_capture_auth_objects where object_name = 'capture'
    );
    raise exception 'Capture-record update unexpectedly succeeded.';
  exception
    when others then
      if sqlerrm not like 'Shadow evidence and credibility history is append-only%' then
        raise;
      end if;
  end;

  begin
    delete from public.trade_shadow_capture_records
    where id = (
      select object_id from qa_capture_auth_objects where object_name = 'capture'
    );
    raise exception 'Capture-record deletion unexpectedly succeeded.';
  exception
    when others then
      if sqlerrm not like 'Shadow evidence and credibility history is append-only%' then
        raise;
      end if;
  end;
end;
$test$;

-- Any active-effect switch makes the queue fail closed.
update public.credibility_shadow_controls
set mode = 'active',
    public_effects_enabled = true,
    updated_at = now()
where control_key = 'evidence_decision_v2';

do $test$
begin
  begin
    perform *
    from public.list_trade_evidence_shadow_capture_queue_v1(20, 0);
    raise exception 'Capture queue remained available with an active effect switch.';
  exception
    when others then
      if sqlerrm not like 'Shadow capture is unavailable unless every active-effect switch is fail-closed%' then
        raise;
      end if;
  end;
end;
$test$;

update public.credibility_shadow_controls
set mode = 'shadow',
    milestone_cutover_enabled = false,
    public_effects_enabled = false,
    ranking_effects_enabled = false,
    eligibility_effects_enabled = false,
    updated_at = now()
where control_key = 'evidence_decision_v2';

rollback;
