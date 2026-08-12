-- AAL2 authorization, conflict, file-access, RLS, and append-only QA.
begin;

create temporary table qa_auth_actors(
  actor_role text primary key,
  profile_id uuid not null unique
) on commit drop;

insert into qa_auth_actors(actor_role, profile_id)
select roles.actor_role, profiles.id
from unnest(array[
  'payer', 'performer', 'original_reviewer', 'audit_reviewer', 'unassigned_reviewer'
]) with ordinality roles(actor_role, position)
join (
  select id, row_number() over(order by id) as position
  from public.profiles
  limit 5
) profiles using(position);

do $test$
begin
  if (select count(*) from qa_auth_actors) <> 5 then
    raise exception 'Blind-audit authorization QA requires five existing QA profiles.';
  end if;
end;
$test$;

insert into public.trade_review_role_grants(
  profile_id, role, active, granted_by
)
select payer.profile_id, 'administrator', true, payer.profile_id
from qa_auth_actors payer
where payer.actor_role = 'payer'
on conflict(profile_id, role) do update
set active = true, revoked_at = null, granted_by = excluded.granted_by;

insert into public.trade_review_role_grants(
  profile_id, role, active, granted_by
)
select reviewer.profile_id, 'reviewer', true, payer.profile_id
from qa_auth_actors reviewer
cross join qa_auth_actors payer
where reviewer.actor_role in (
  'original_reviewer', 'audit_reviewer', 'unassigned_reviewer'
)
  and payer.actor_role = 'payer'
on conflict(profile_id, role) do update
set active = true, revoked_at = null, granted_by = excluded.granted_by;

create temporary table qa_auth_objects(
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
  from qa_auth_actors payer
  cross join qa_auth_actors performer
  where payer.actor_role = 'payer'
    and performer.actor_role = 'performer'
  returning id
)
insert into qa_auth_objects select 'agreement', id from made;

with made as (
  insert into public.trade_agreement_versions(
    agreement_id, version, proposed_by, proposed_action, requested_action,
    duration, evidence_rule, evidence_due_date, exit_conditions,
    maximum_burden, privacy_scope, no_trade_baseline, terms_hash,
    requires_milestone_manifest, milestone_manifest_hash, complete_terms_hash
  )
  select
    agreement.object_id,
    1,
    payer.profile_id,
    'Complete private file evidence QA',
    'Settle private file evidence QA',
    'QA',
    'Provide a private file',
    current_date + 7,
    'Prospective exit',
    '$10 maximum',
    'Private',
    'No performance without the trade',
    repeat('4',64),
    true,
    null,
    null
  from qa_auth_objects agreement
  cross join qa_auth_actors payer
  where agreement.object_name = 'agreement'
    and payer.actor_role = 'payer'
  returning id
)
insert into qa_auth_objects select 'version', id from made;

update public.agreements
set current_version_id = (
      select object_id from qa_auth_objects where object_name = 'version'
    ),
    evidence_due_at = current_date + 7
where id = (
  select object_id from qa_auth_objects where object_name = 'agreement'
);

with made as (
  insert into public.trade_agreement_milestones(
    agreement_id, agreement_version_id, position, performer_id, payer_id,
    action_category, description, unit_label, units_total, indivisible,
    maximum_amount_cents, currency, evidence_rule, status
  )
  select
    agreement.object_id,
    version.object_id,
    1,
    performer.profile_id,
    payer.profile_id,
    'service',
    'Complete private file evidence QA',
    'unit',
    1,
    true,
    1000,
    'USD',
    'Provide a private file',
    'terms'
  from qa_auth_objects agreement
  cross join qa_auth_objects version
  cross join qa_auth_actors performer
  cross join qa_auth_actors payer
  where agreement.object_name = 'agreement'
    and version.object_name = 'version'
    and performer.actor_role = 'performer'
    and payer.actor_role = 'payer'
  returning id
)
insert into qa_auth_objects select 'milestone', id from made;

update public.trade_agreement_versions
set milestone_manifest_hash = repeat('5',64), complete_terms_hash = repeat('6',64)
where id = (
  select object_id from qa_auth_objects where object_name = 'version'
);

with made as (
  insert into public.trade_evidence_bundles(
    milestone_id, submitted_by, bundle_kind, attempt_number, status
  )
  select milestone.object_id, performer.profile_id, 'initial', 1, 'draft'
  from qa_auth_objects milestone
  cross join qa_auth_actors performer
  where milestone.object_name = 'milestone'
    and performer.actor_role = 'performer'
  returning id
)
insert into qa_auth_objects select 'bundle', id from made;

with made as (
  insert into public.trade_evidence_bundle_items(
    bundle_id, evidence_type, storage_path
  )
  select bundle.object_id, 'file', 'qa/private/blind-audit-proof.pdf'
  from qa_auth_objects bundle
  where bundle.object_name = 'bundle'
  returning id
)
insert into qa_auth_objects select 'evidence_item', id from made;

update public.trade_evidence_bundles
set status = 'accepted', submitted_at = now(), reviewed_at = now()
where id = (
  select object_id from qa_auth_objects where object_name = 'bundle'
);

with payout_math as (
  select * from public.trade_milestone_payout_v1(
    1000::bigint, 1::numeric, 1::numeric, 100::smallint
  )
), made as (
  insert into public.trade_milestone_reviews(
    milestone_id, bundle_id, reviewer_id, review_kind, outcome,
    completion_units, confidence_band, payout_basis_points, amount_due_cents,
    private_reason, appeal_deadline_at, is_final, finalized_at
  )
  select
    milestone.object_id,
    bundle.object_id,
    reviewer.profile_id,
    'initial',
    'graded',
    1,
    100,
    payout_math.payout_basis_points,
    payout_math.amount_due_cents,
    'Original private rationale',
    now() + interval '7 days',
    true,
    now()
  from qa_auth_objects milestone
  cross join qa_auth_objects bundle
  cross join qa_auth_actors reviewer
  cross join payout_math
  where milestone.object_name = 'milestone'
    and bundle.object_name = 'bundle'
    and reviewer.actor_role = 'original_reviewer'
  returning id
)
insert into qa_auth_objects select 'review', id from made;

with made as (
  insert into public.trade_milestone_payouts(
    milestone_id, review_id, payer_id, payee_id, maximum_amount_cents,
    completion_units, units_total, confidence_band, payout_basis_points,
    amount_due_cents, currency, is_final, status, finalized_at
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
  from qa_auth_objects milestone
  cross join qa_auth_objects review
  cross join qa_auth_actors payer
  cross join qa_auth_actors performer
  where milestone.object_name = 'milestone'
    and review.object_name = 'review'
    and payer.actor_role = 'payer'
    and performer.actor_role = 'performer'
  returning id
)
insert into qa_auth_objects select 'payout', id from made;

update public.trade_agreement_milestones
set final_review_id = (
      select object_id from qa_auth_objects where object_name = 'review'
    ),
    current_bundle_id = (
      select object_id from qa_auth_objects where object_name = 'bundle'
    ),
    status = 'graded'
where id = (
  select object_id from qa_auth_objects where object_name = 'milestone'
);

select set_config('request.jwt.claim.sub', '', true);
select set_config('request.jwt.claims', '{"role":"service_role"}', true);

create temporary table qa_auth_capture as
select public.record_trade_evidence_shadow_capture_v1(
  p_milestone_id => (
    select object_id from qa_auth_objects where object_name = 'milestone'
  ),
  p_review_id => (
    select object_id from qa_auth_objects where object_name = 'review'
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
  p_private_rationale => 'Authorization QA capture rationale',
  p_supersedes_decision_id => null::uuid
) as result;

insert into qa_auth_objects
select 'evidence_decision', (result ->> 'decisionId')::uuid
from qa_auth_capture;

create temporary table qa_auth_sampling as
select public.materialize_evidence_credibility_calibration_draws_v1(
  1::numeric,
  repeat('c',64),
  'qa-blind-auth-run'
) as result;

insert into qa_auth_objects
select 'sampling_run', (result ->> 'samplingRunId')::uuid
from qa_auth_sampling;

insert into qa_auth_objects
select 'draw', draw.id
from public.evidence_credibility_calibration_draws draw
where draw.evidence_decision_id = (
  select object_id from qa_auth_objects where object_name = 'evidence_decision'
);

-- Ordinary API roles retain no direct table privileges.
do $test$
begin
  if has_table_privilege(
       'anon',
       'public.evidence_credibility_calibration_draws',
       'SELECT'
     )
     or has_table_privilege(
       'authenticated',
       'public.evidence_credibility_calibration_draws',
       'SELECT'
     )
     or has_table_privilege(
       'authenticated',
       'public.evidence_credibility_calibration_audit_assignments',
       'INSERT'
     )
     or has_table_privilege(
       'authenticated',
       'public.evidence_credibility_calibration_labels',
       'SELECT'
     ) then
    raise exception 'Ordinary API roles retained direct calibration-table privileges.';
  end if;
end;
$test$;

-- AAL1 administrators fail closed.
select set_config(
  'request.jwt.claim.sub',
  (select profile_id::text from qa_auth_actors where actor_role = 'payer'),
  true
);
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'role','authenticated',
    'aal','aal1',
    'sub',(select profile_id::text from qa_auth_actors where actor_role = 'payer')
  )::text,
  true
);

do $test$
begin
  begin
    perform * from public.list_evidence_credibility_calibration_assignment_queue_v1(10,0);
    raise exception 'AAL1 administrator unexpectedly accessed assignment administration.';
  exception when others then
    if sqlerrm not like 'Calibration audit administration requires an AAL2%' then raise; end if;
  end;
end;
$test$;

-- AAL2 administrator can inspect, but conflicts are enforced.
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'role','authenticated',
    'aal','aal2',
    'sub',(select profile_id::text from qa_auth_actors where actor_role = 'payer')
  )::text,
  true
);

do $test$
begin
  if (select count(*) from public.list_evidence_credibility_calibration_assignment_queue_v1(10,0)) <> 1 then
    raise exception 'AAL2 administrator did not receive the selected assignment queue.';
  end if;

  begin
    perform public.assign_evidence_credibility_calibration_audit_v1(
      (select object_id from qa_auth_objects where object_name = 'draw'),
      (select profile_id from qa_auth_actors where actor_role = 'payer'),
      'qa-conflict-party',
      now() + interval '14 days'
    );
    raise exception 'A party was unexpectedly assigned as calibration reviewer.';
  exception when others then
    if sqlerrm not like 'The calibration reviewer must be independent%' then raise; end if;
  end;

  begin
    perform public.assign_evidence_credibility_calibration_audit_v1(
      (select object_id from qa_auth_objects where object_name = 'draw'),
      (select profile_id from qa_auth_actors where actor_role = 'original_reviewer'),
      'qa-conflict-original-reviewer',
      now() + interval '14 days'
    );
    raise exception 'The original reviewer was unexpectedly assigned.';
  exception when others then
    if sqlerrm not like 'The calibration reviewer must be independent%' then raise; end if;
  end;
end;
$test$;

create temporary table qa_auth_assignment as
select public.assign_evidence_credibility_calibration_audit_v1(
  (select object_id from qa_auth_objects where object_name = 'draw'),
  (select profile_id from qa_auth_actors where actor_role = 'audit_reviewer'),
  'qa-valid-independent-assignment',
  now() + interval '14 days'
) as result;

insert into qa_auth_objects
select 'assignment', (result ->> 'assignmentId')::uuid
from qa_auth_assignment;

-- AAL1 reviewers, unassigned reviewers, and unrelated files fail closed.
select set_config(
  'request.jwt.claim.sub',
  (select profile_id::text from qa_auth_actors where actor_role = 'audit_reviewer'),
  true
);
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'role','authenticated',
    'aal','aal1',
    'sub',(select profile_id::text from qa_auth_actors where actor_role = 'audit_reviewer')
  )::text,
  true
);

do $test$
begin
  begin
    perform * from public.list_my_evidence_credibility_calibration_audits_v1(10,0);
    raise exception 'AAL1 reviewer unexpectedly accessed a blind audit.';
  exception when others then
    if sqlerrm not like 'Calibration review requires an active AAL2%' then raise; end if;
  end;
end;
$test$;

select set_config(
  'request.jwt.claim.sub',
  (select profile_id::text from qa_auth_actors where actor_role = 'unassigned_reviewer'),
  true
);
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'role','authenticated',
    'aal','aal2',
    'sub',(select profile_id::text from qa_auth_actors where actor_role = 'unassigned_reviewer')
  )::text,
  true
);

do $test$
begin
  if exists (
    select 1 from public.list_my_evidence_credibility_calibration_audits_v1(10,0)
  ) then
    raise exception 'An unassigned reviewer received another reviewer’s blind audit.';
  end if;

  if public.can_access_my_evidence_credibility_calibration_file_v1(
       (select object_id from qa_auth_objects where object_name = 'assignment'),
       'evidence_item',
       (select object_id from qa_auth_objects where object_name = 'evidence_item')
     ) then
    raise exception 'An unassigned reviewer accessed the private evidence file.';
  end if;

  begin
    perform public.record_evidence_credibility_calibration_label_v1(
      (select object_id from qa_auth_objects where object_name = 'assignment'),
      'qa-unassigned-label',
      'eligible',
      1::numeric,
      'review_final',
      'not_assessed',
      'on_time',
      'not_assessed',
      true,
      'Unauthorized reviewer rationale'
    );
    raise exception 'An unassigned reviewer unexpectedly recorded a label.';
  exception when others then
    if sqlerrm not like 'This blind calibration assignment is unavailable%' then raise; end if;
  end;
end;
$test$;

-- The exact assigned AAL2 reviewer receives the case and linked file only.
select set_config(
  'request.jwt.claim.sub',
  (select profile_id::text from qa_auth_actors where actor_role = 'audit_reviewer'),
  true
);
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'role','authenticated',
    'aal','aal2',
    'sub',(select profile_id::text from qa_auth_actors where actor_role = 'audit_reviewer')
  )::text,
  true
);

do $test$
begin
  if (select count(*) from public.list_my_evidence_credibility_calibration_audits_v1(10,0)) <> 1 then
    raise exception 'The assigned AAL2 reviewer did not receive the blind audit.';
  end if;

  if not public.can_access_my_evidence_credibility_calibration_file_v1(
       (select object_id from qa_auth_objects where object_name = 'assignment'),
       'evidence_item',
       (select object_id from qa_auth_objects where object_name = 'evidence_item')
     ) then
    raise exception 'The assigned reviewer could not authorize the linked private file.';
  end if;

  if public.can_access_my_evidence_credibility_calibration_file_v1(
       (select object_id from qa_auth_objects where object_name = 'assignment'),
       'evidence_item',
       gen_random_uuid()
     ) then
    raise exception 'The assigned reviewer authorized an unrelated private file.';
  end if;
end;
$test$;

create temporary table qa_auth_label as
select public.record_evidence_credibility_calibration_label_v1(
  (select object_id from qa_auth_objects where object_name = 'assignment'),
  'qa-valid-auth-label',
  'eligible',
  1::numeric,
  'review_final',
  'not_assessed',
  'on_time',
  'not_assessed',
  true,
  'Independent authorization QA rationale'
) as result;

do $test$
begin
  if public.can_access_my_evidence_credibility_calibration_file_v1(
       (select object_id from qa_auth_objects where object_name = 'assignment'),
       'evidence_item',
       (select object_id from qa_auth_objects where object_name = 'evidence_item')
     ) then
    raise exception 'Private file access remained open after terminal label completion.';
  end if;
end;
$test$;

-- Append-only history rejects modification even through the service path.
select set_config('request.jwt.claim.sub', '', true);
select set_config('request.jwt.claims', '{"role":"service_role"}', true);

do $test$
begin
  begin
    update public.evidence_credibility_calibration_draws
    set sampling_stratum = 'tampered'
    where id = (select object_id from qa_auth_objects where object_name = 'draw');
    raise exception 'A calibration draw update unexpectedly succeeded.';
  exception when others then
    if sqlerrm not like 'Shadow evidence and credibility history is append-only%' then raise; end if;
  end;

  begin
    delete from public.evidence_credibility_calibration_audit_assignments
    where id = (select object_id from qa_auth_objects where object_name = 'assignment');
    raise exception 'A calibration assignment deletion unexpectedly succeeded.';
  exception when others then
    if sqlerrm not like 'Shadow evidence and credibility history is append-only%' then raise; end if;
  end;

  begin
    update public.evidence_credibility_calibration_labels
    set private_rationale = 'tampered'
    where assignment_id = (
      select object_id from qa_auth_objects where object_name = 'assignment'
    );
    raise exception 'A calibration label update unexpectedly succeeded.';
  exception when others then
    if sqlerrm not like 'Shadow evidence and credibility history is append-only%' then raise; end if;
  end;
end;
$test$;

rollback;
