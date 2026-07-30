-- Execute against isolated QA after the additive evidence/payment migrations.
-- The transaction exercises the complete noncustodial payment-review lifecycle
-- and rolls back every fixture, role grant, notification, and state change.

begin;

do $test$
declare
  retired_function regprocedure;
begin
  foreach retired_function in array array[
    'public.initialize_public_trade_evidence()'::regprocedure,
    'public.register_trade_evidence_v3(uuid,uuid,text,text,text,text,text,uuid)'::regprocedure,
    'public.publish_trade_evidence_v3(uuid,uuid,text,text,text,text,text,text,text)'::regprocedure,
    'public.review_trade_evidence_v3(uuid,uuid,text,text)'::regprocedure,
    'public.withdraw_trade_evidence_v3(uuid,uuid,text)'::regprocedure
  ]
  loop
    if has_function_privilege('anon', retired_function, 'EXECUTE')
       or has_function_privilege('authenticated', retired_function, 'EXECUTE')
       or has_function_privilege('service_role', retired_function, 'EXECUTE') then
      raise exception 'Retired evidence function % remains API-executable.', retired_function;
    end if;
  end loop;

  if exists (
    select 1
    from pg_policies
    where (schemaname, tablename, policyname) in (
      ('public', 'profiles', 'profiles_public_read'),
      ('public', 'agreements', 'agreements_update_participants'),
      ('public', 'agreement_review_cases', 'agreement_review_cases_update_participants'),
      ('public', 'agreement_payments', 'agreement_payments_update_participants'),
      ('storage', 'objects', 'public_safe_trade_evidence_read')
    )
  ) then
    raise exception 'A retired public-read or participant-write policy remains installed.';
  end if;
end;
$test$;

create temporary table qa_payment_actors (
  actor_role text primary key,
  profile_id uuid not null unique
) on commit drop;

insert into qa_payment_actors(actor_role, profile_id)
select roles.actor_role, profiles.id
from unnest(array[
  'payer',
  'payee',
  'payment_reviewer',
  'payment_appeal_reviewer',
  'outsider',
  'administrator'
]) with ordinality as roles(actor_role, position)
join (
  select id, row_number() over (order by id) as position
  from public.profiles
  limit 6
) profiles using (position);

do $test$
begin
  if (select count(*) from qa_payment_actors) <> 6 then
    raise exception 'Payment lifecycle QA requires six isolated QA profiles.';
  end if;
end;
$test$;

insert into public.trade_review_role_grants(
  profile_id, role, active, granted_by, granted_at, revoked_at
)
select profile_id, 'reviewer', true, null, now(), null
from qa_payment_actors
where actor_role in ('payment_reviewer', 'payment_appeal_reviewer')
on conflict (profile_id, role) do update
set active = true,
    granted_by = null,
    granted_at = now(),
    revoked_at = null;

insert into public.trade_review_role_grants(
  profile_id, role, active, granted_by, granted_at, revoked_at
)
select profile_id, 'administrator', true, null, now(), null
from qa_payment_actors
where actor_role = 'administrator'
on conflict (profile_id, role) do update
set active = true,
    granted_by = null,
    granted_at = now(),
    revoked_at = null;

create temporary table qa_payment_objects (
  object_name text primary key,
  object_id uuid not null unique
) on commit drop;

with created as (
  insert into public.agreements(
    proposer_id,
    responder_id,
    status,
    lifecycle_status,
    source,
    completion_state
  )
  select
    payer.profile_id,
    payee.profile_id,
    'active'::public.agreement_status,
    'active',
    'manual',
    'under_review'
  from qa_payment_actors payer
  cross join qa_payment_actors payee
  where payer.actor_role = 'payer'
    and payee.actor_role = 'payee'
  returning id
)
insert into qa_payment_objects(object_name, object_id)
select 'agreement', id from created;

with created as (
  insert into public.trade_agreement_versions(
    agreement_id,
    version,
    proposed_by,
    proposed_action,
    requested_action,
    duration,
    evidence_rule,
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
    'Perform the agreed QA milestone',
    'Pay the externally settled amount',
    'QA transaction',
    'Private QA evidence',
    'Prospective exit remains available',
    '$5 maximum',
    'Participants and assigned reviewers only',
    'No trade',
    repeat('a', 64),
    true,
    null,
    null
  from qa_payment_objects agreement
  cross join qa_payment_actors payer
  where agreement.object_name = 'agreement'
    and payer.actor_role = 'payer'
  returning id
)
insert into qa_payment_objects(object_name, object_id)
select 'version', id from created;

update public.agreements
set current_version_id = version.object_id
from qa_payment_objects version
where agreements.id = (
    select object_id
    from qa_payment_objects
    where object_name = 'agreement'
  )
  and version.object_name = 'version';

with created as (
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
    payee.profile_id,
    payer.profile_id,
    'service',
    'Complete the isolated QA payment lifecycle',
    'milestone',
    1,
    true,
    500,
    'USD',
    'Private completion evidence',
    'graded'
  from qa_payment_objects agreement
  cross join qa_payment_objects version
  cross join qa_payment_actors payer
  cross join qa_payment_actors payee
  where agreement.object_name = 'agreement'
    and version.object_name = 'version'
    and payer.actor_role = 'payer'
    and payee.actor_role = 'payee'
  returning id
)
insert into qa_payment_objects(object_name, object_id)
select 'milestone', id from created;

update public.trade_agreement_versions
set milestone_manifest_hash = repeat('b', 64),
    complete_terms_hash = repeat('c', 64)
where id = (
  select object_id from qa_payment_objects where object_name = 'version'
);

with created as (
  insert into public.trade_evidence_bundles(
    milestone_id,
    submitted_by,
    bundle_kind,
    attempt_number,
    status,
    submitted_at,
    reviewed_at
  )
  select
    milestone.object_id,
    payee.profile_id,
    'initial',
    1,
    'accepted',
    now(),
    now()
  from qa_payment_objects milestone
  cross join qa_payment_actors payee
  where milestone.object_name = 'milestone'
    and payee.actor_role = 'payee'
  returning id
)
insert into qa_payment_objects(object_name, object_id)
select 'bundle', id from created;

with created as (
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
    reviewer.profile_id,
    'initial',
    'graded',
    1,
    50,
    5000,
    250,
    'QA evidence establishes full completion at moderate confidence.',
    now(),
    true,
    now()
  from qa_payment_objects milestone
  cross join qa_payment_objects bundle
  cross join qa_payment_actors reviewer
  where milestone.object_name = 'milestone'
    and bundle.object_name = 'bundle'
    and reviewer.actor_role = 'payment_reviewer'
  returning id
)
insert into qa_payment_objects(object_name, object_id)
select 'milestone_review', id from created;

with created as (
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
    payee.profile_id,
    500,
    1,
    1,
    50,
    5000,
    250,
    'USD',
    true,
    'due',
    now()
  from qa_payment_objects milestone
  cross join qa_payment_objects review
  cross join qa_payment_actors payer
  cross join qa_payment_actors payee
  where milestone.object_name = 'milestone'
    and review.object_name = 'milestone_review'
    and payer.actor_role = 'payer'
    and payee.actor_role = 'payee'
  returning id
)
insert into qa_payment_objects(object_name, object_id)
select 'payout', id from created;

update public.trade_agreement_milestones
set final_review_id = review.object_id
from qa_payment_objects review
where trade_agreement_milestones.id = (
    select object_id
    from qa_payment_objects
    where object_name = 'milestone'
  )
  and review.object_name = 'milestone_review';

-- Neither an outsider nor the payee can impersonate the payer, and the payer
-- cannot change the frozen amount.
select set_config(
  'request.jwt.claim.sub',
  (select profile_id::text from qa_payment_actors where actor_role = 'outsider'),
  true
);
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub',
    (select profile_id::text from qa_payment_actors where actor_role = 'outsider'),
    'role',
    'authenticated',
    'aal',
    'aal1'
  )::text,
  true
);
do $test$
declare
  rejected boolean := false;
begin
  begin
    perform public.report_trade_external_payment_v1(
      (select object_id from qa_payment_objects where object_name = 'payout'),
      'QA bank',
      'QA-outsider-' || gen_random_uuid()::text,
      250,
      'USD',
      current_date,
      ''
    );
  exception when others then
    rejected := true;
  end;
  if not rejected then
    raise exception 'An outsider reported another participant''s payment.';
  end if;
end;
$test$;

set local role authenticated;
do $test$
declare
  rejected boolean := false;
begin
  begin
    update public.trade_milestone_payouts
    set status = 'confirmed';
  exception when others then
    rejected := true;
  end;
  if not rejected then
    raise exception 'Authenticated direct payout writes remain open.';
  end if;
end;
$test$;
reset role;

select set_config(
  'request.jwt.claim.sub',
  (select profile_id::text from qa_payment_actors where actor_role = 'payee'),
  true
);
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub',
    (select profile_id::text from qa_payment_actors where actor_role = 'payee'),
    'role',
    'authenticated',
    'aal',
    'aal1'
  )::text,
  true
);
do $test$
declare
  rejected boolean := false;
begin
  begin
    perform public.report_trade_external_payment_v1(
      (select object_id from qa_payment_objects where object_name = 'payout'),
      'QA bank',
      'QA-payee-' || gen_random_uuid()::text,
      250,
      'USD',
      current_date,
      ''
    );
  exception when others then
    rejected := true;
  end;
  if not rejected then
    raise exception 'The payee impersonated the payer.';
  end if;
end;
$test$;

select set_config(
  'request.jwt.claim.sub',
  (select profile_id::text from qa_payment_actors where actor_role = 'payer'),
  true
);
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub',
    (select profile_id::text from qa_payment_actors where actor_role = 'payer'),
    'role',
    'authenticated',
    'aal',
    'aal1'
  )::text,
  true
);
do $test$
declare
  rejected boolean := false;
begin
  begin
    perform public.report_trade_external_payment_v1(
      (select object_id from qa_payment_objects where object_name = 'payout'),
      'QA bank',
      'QA-wrong-amount-' || gen_random_uuid()::text,
      251,
      'USD',
      current_date,
      ''
    );
  exception when others then
    rejected := true;
  end;
  if not rejected then
    raise exception 'The payer changed the frozen amount.';
  end if;
end;
$test$;

with reported as (
  select public.report_trade_external_payment_v1(
    (select object_id from qa_payment_objects where object_name = 'payout'),
    'QA bank',
    'QA-initial-' || gen_random_uuid()::text,
    250,
    'USD',
    current_date,
    ''
  ) as id
)
insert into qa_payment_objects(object_name, object_id)
select 'initial_receipt', id from reported;

-- The payer cannot answer their own report.
do $test$
declare
  rejected boolean := false;
begin
  begin
    perform public.respond_trade_external_payment_v1(
      (select object_id
       from qa_payment_objects
       where object_name = 'initial_receipt'),
      'confirm',
      ''
    );
  exception when others then
    rejected := true;
  end;
  if not rejected then
    raise exception 'The payer answered their own external-payment report.';
  end if;
end;
$test$;

select set_config(
  'request.jwt.claim.sub',
  (select profile_id::text from qa_payment_actors where actor_role = 'payee'),
  true
);
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub',
    (select profile_id::text from qa_payment_actors where actor_role = 'payee'),
    'role',
    'authenticated',
    'aal',
    'aal1'
  )::text,
  true
);
select public.respond_trade_external_payment_v1(
  (select object_id
   from qa_payment_objects
   where object_name = 'initial_receipt'),
  'dispute',
  'The initial external-payment evidence is not sufficient.'
);

insert into qa_payment_objects(object_name, object_id)
select 'payment_case', id
from public.trade_payment_review_cases
where payout_id = (
  select object_id from qa_payment_objects where object_name = 'payout'
);

select set_config(
  'request.jwt.claim.sub',
  (select profile_id::text from qa_payment_actors where actor_role = 'outsider'),
  true
);
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub',
    (select profile_id::text from qa_payment_actors where actor_role = 'outsider'),
    'role',
    'authenticated',
    'aal',
    'aal1'
  )::text,
  true
);
do $test$
declare
  rejected boolean := false;
begin
  begin
    perform public.nominate_trade_payment_reviewer_v1(
      (select object_id from qa_payment_objects where object_name = 'payout'),
      (select profile_id
       from qa_payment_actors
       where actor_role = 'payment_reviewer')
    );
  exception when others then
    rejected := true;
  end;
  if not rejected then
    raise exception 'An outsider nominated the payment reviewer.';
  end if;
end;
$test$;

set local role authenticated;
do $test$
begin
  if (select count(*) from public.trade_payment_review_cases) <> 0
     or (select count(*) from public.trade_external_payment_receipts) <> 0 then
    raise exception 'An outsider can read private payment evidence.';
  end if;
end;
$test$;
reset role;

select set_config(
  'request.jwt.claim.sub',
  (select profile_id::text from qa_payment_actors where actor_role = 'payer'),
  true
);
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub',
    (select profile_id::text from qa_payment_actors where actor_role = 'payer'),
    'role',
    'authenticated',
    'aal',
    'aal1'
  )::text,
  true
);
select public.nominate_trade_payment_reviewer_v1(
  (select object_id from qa_payment_objects where object_name = 'payout'),
  (select profile_id
   from qa_payment_actors
   where actor_role = 'payment_reviewer')
);

select set_config(
  'request.jwt.claim.sub',
  (select profile_id::text from qa_payment_actors where actor_role = 'payee'),
  true
);
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub',
    (select profile_id::text from qa_payment_actors where actor_role = 'payee'),
    'role',
    'authenticated',
    'aal',
    'aal1'
  )::text,
  true
);
select public.nominate_trade_payment_reviewer_v1(
  (select object_id from qa_payment_objects where object_name = 'payout'),
  (select profile_id
   from qa_payment_actors
   where actor_role = 'payment_reviewer')
);

select set_config(
  'request.jwt.claim.sub',
  (select profile_id::text
   from qa_payment_actors
   where actor_role = 'payment_reviewer'),
  true
);
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub',
    (select profile_id::text
     from qa_payment_actors
     where actor_role = 'payment_reviewer'),
    'role',
    'authenticated',
    'aal',
    'aal1'
  )::text,
  true
);
do $test$
declare
  rejected boolean := false;
begin
  begin
    perform public.resolve_trade_payment_review_v1(
      (select object_id
       from qa_payment_objects
       where object_name = 'payment_case'),
      'allow_correction',
      'An AAL1 reviewer must not be able to decide.'
    );
  exception when others then
    rejected := true;
  end;
  if not rejected then
    raise exception 'An AAL1 reviewer resolved a payment review.';
  end if;
end;
$test$;

set local role authenticated;
do $test$
begin
  if (select count(*) from public.trade_payment_review_cases) <> 1
     or (select count(*) from public.trade_external_payment_receipts) <> 1 then
    raise exception 'The assigned reviewer cannot read the private payment case.';
  end if;
end;
$test$;
reset role;

select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub',
    (select profile_id::text
     from qa_payment_actors
     where actor_role = 'payment_reviewer'),
    'role',
    'authenticated',
    'aal',
    'aal2'
  )::text,
  true
);
select public.resolve_trade_payment_review_v1(
  (select object_id
   from qa_payment_objects
   where object_name = 'payment_case'),
  'allow_correction',
  'The payer may provide one corrected receipt.'
);

select set_config(
  'request.jwt.claim.sub',
  (select profile_id::text from qa_payment_actors where actor_role = 'payer'),
  true
);
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub',
    (select profile_id::text from qa_payment_actors where actor_role = 'payer'),
    'role',
    'authenticated',
    'aal',
    'aal1'
  )::text,
  true
);
with reported as (
  select public.report_trade_external_payment_v1(
    (select object_id from qa_payment_objects where object_name = 'payout'),
    'QA bank',
    'QA-correction-' || gen_random_uuid()::text,
    250,
    'USD',
    current_date,
    ''
  ) as id
)
insert into qa_payment_objects(object_name, object_id)
select 'corrected_receipt', id from reported;

do $test$
declare
  rejected boolean := false;
begin
  begin
    perform public.report_trade_external_payment_v1(
      (select object_id from qa_payment_objects where object_name = 'payout'),
      'QA bank',
      'QA-second-correction-' || gen_random_uuid()::text,
      250,
      'USD',
      current_date,
      ''
    );
  exception when others then
    rejected := true;
  end;
  if not rejected then
    raise exception 'A second corrected receipt was accepted.';
  end if;
end;
$test$;

select set_config(
  'request.jwt.claim.sub',
  (select profile_id::text
   from qa_payment_actors
   where actor_role = 'payment_reviewer'),
  true
);
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub',
    (select profile_id::text
     from qa_payment_actors
     where actor_role = 'payment_reviewer'),
    'role',
    'authenticated',
    'aal',
    'aal2'
  )::text,
  true
);
do $test$
declare
  rejected boolean := false;
begin
  begin
    perform public.resolve_trade_payment_review_v1(
      (select object_id
       from qa_payment_objects
       where object_name = 'payment_case'),
      'still_due',
      'The fresh payee response window is still open.'
    );
  exception when others then
    rejected := true;
  end;
  if not rejected then
    raise exception 'The reviewer bypassed the corrected-receipt response window.';
  end if;
end;
$test$;

-- Simulate the corrected receipt's fresh seven-day response window expiring.
update public.trade_external_payment_receipts
set response_deadline_at = now() - interval '1 second'
where id = (
  select object_id
  from qa_payment_objects
  where object_name = 'corrected_receipt'
);

select set_config(
  'request.jwt.claim.sub',
  (select profile_id::text
   from qa_payment_actors
   where actor_role = 'payment_reviewer'),
  true
);
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub',
    (select profile_id::text
     from qa_payment_actors
     where actor_role = 'payment_reviewer'),
    'role',
    'authenticated',
    'aal',
    'aal2'
  )::text,
  true
);
select public.resolve_trade_payment_review_v1(
  (select object_id
   from qa_payment_objects
   where object_name = 'payment_case'),
  'still_due',
  'The corrected receipt remained unanswered; the amount is still due.'
);

select set_config(
  'request.jwt.claim.sub',
  (select profile_id::text from qa_payment_actors where actor_role = 'payer'),
  true
);
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub',
    (select profile_id::text from qa_payment_actors where actor_role = 'payer'),
    'role',
    'authenticated',
    'aal',
    'aal1'
  )::text,
  true
);
do $test$
declare
  rejected boolean := false;
begin
  begin
    perform public.finalize_trade_payment_review_v1(
      (select object_id
       from qa_payment_objects
       where object_name = 'payment_case')
    );
  exception when others then
    rejected := true;
  end;
  if not rejected then
    raise exception 'A participant finalized the decision before its appeal deadline.';
  end if;
end;
$test$;

select set_config(
  'request.jwt.claim.sub',
  (select profile_id::text from qa_payment_actors where actor_role = 'outsider'),
  true
);
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub',
    (select profile_id::text from qa_payment_actors where actor_role = 'outsider'),
    'role',
    'authenticated',
    'aal',
    'aal1'
  )::text,
  true
);
do $test$
declare
  rejected boolean := false;
begin
  begin
    perform public.open_trade_payment_appeal_v1(
      (select object_id
       from qa_payment_objects
       where object_name = 'payment_case'),
      'An outsider must not open this appeal.'
    );
  exception when others then
    rejected := true;
  end;
  if not rejected then
    raise exception 'An outsider opened a payment appeal.';
  end if;
end;
$test$;

select set_config(
  'request.jwt.claim.sub',
  (select profile_id::text from qa_payment_actors where actor_role = 'payer'),
  true
);
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub',
    (select profile_id::text from qa_payment_actors where actor_role = 'payer'),
    'role',
    'authenticated',
    'aal',
    'aal1'
  )::text,
  true
);
with opened as (
  select public.open_trade_payment_appeal_v1(
    (select object_id
     from qa_payment_objects
     where object_name = 'payment_case'),
    'The corrected external-payment evidence should be reviewed again.'
  ) as id
)
insert into qa_payment_objects(object_name, object_id)
select 'payment_appeal', id from opened;

do $test$
declare
  rejected boolean := false;
begin
  begin
    perform public.nominate_trade_payment_appeal_reviewer_v1(
      (select object_id
       from qa_payment_objects
       where object_name = 'payment_appeal'),
      (select profile_id
       from qa_payment_actors
       where actor_role = 'payment_reviewer')
    );
  exception when others then
    rejected := true;
  end;
  if not rejected then
    raise exception 'The original payment reviewer was nominated for the appeal.';
  end if;
end;
$test$;

select set_config(
  'request.jwt.claim.sub',
  (select profile_id::text
   from qa_payment_actors
   where actor_role = 'administrator'),
  true
);
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub',
    (select profile_id::text
     from qa_payment_actors
     where actor_role = 'administrator'),
    'role',
    'authenticated',
    'aal',
    'aal2'
  )::text,
  true
);
do $test$
declare
  rejected boolean := false;
begin
  begin
    perform public.admin_assign_trade_payment_appeal_reviewer_v1(
      (select object_id
       from qa_payment_objects
       where object_name = 'payment_appeal'),
      (select profile_id
       from qa_payment_actors
       where actor_role = 'payment_appeal_reviewer')
    );
  exception when others then
    rejected := true;
  end;
  if not rejected then
    raise exception 'The administrator bypassed the seven-day fallback deadline.';
  end if;
end;
$test$;

select set_config(
  'request.jwt.claim.sub',
  (select profile_id::text
   from qa_payment_actors
   where actor_role = 'administrator'),
  true
);
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub',
    (select profile_id::text
     from qa_payment_actors
     where actor_role = 'administrator'),
    'role',
    'authenticated',
    'aal', 'aal2'
  )::text,
  true
);
update public.trade_payment_appeals
set reviewer_selection_deadline_at = now() - interval '1 second'
where id = (
  select object_id
  from qa_payment_objects
  where object_name = 'payment_appeal'
);
select public.admin_assign_trade_payment_appeal_reviewer_v1(
  (select object_id
   from qa_payment_objects
   where object_name = 'payment_appeal'),
  (select profile_id
   from qa_payment_actors
   where actor_role = 'payment_appeal_reviewer')
);

select set_config(
  'request.jwt.claim.sub',
  (select profile_id::text
   from qa_payment_actors
   where actor_role = 'payment_appeal_reviewer'),
  true
);
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub',
    (select profile_id::text
     from qa_payment_actors
     where actor_role = 'payment_appeal_reviewer'),
    'role',
    'authenticated',
    'aal',
    'aal1'
  )::text,
  true
);
do $test$
declare
  rejected boolean := false;
begin
  begin
    perform public.resolve_trade_payment_appeal_v1(
      (select object_id
       from qa_payment_objects
       where object_name = 'payment_appeal'),
      'confirm_paid',
      'AAL1 must not decide an appeal.'
    );
  exception when others then
    rejected := true;
  end;
  if not rejected then
    raise exception 'An AAL1 reviewer resolved the payment appeal.';
  end if;
end;
$test$;

select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub',
    (select profile_id::text
     from qa_payment_actors
     where actor_role = 'payment_appeal_reviewer'),
    'role',
    'authenticated',
    'aal',
    'aal2'
  )::text,
  true
);
select public.resolve_trade_payment_appeal_v1(
  (select object_id
   from qa_payment_objects
   where object_name = 'payment_appeal'),
  'still_due',
  'The appeal confirms that the frozen external amount remains due.'
);

do $test$
declare
  payout_status text;
  milestone_status text;
  agreement_status text;
  agreement_lifecycle text;
  agreement_completion text;
begin
  select status
  into payout_status
  from public.trade_milestone_payouts
  where id = (
    select object_id from qa_payment_objects where object_name = 'payout'
  );
  select status
  into milestone_status
  from public.trade_agreement_milestones
  where id = (
    select object_id from qa_payment_objects where object_name = 'milestone'
  );
  select status::text, lifecycle_status, completion_state
  into agreement_status, agreement_lifecycle, agreement_completion
  from public.agreements
  where id = (
    select object_id from qa_payment_objects where object_name = 'agreement'
  );

  if payout_status <> 'still_due'
     or milestone_status <> 'graded'
     or agreement_status = 'completed'
     or agreement_lifecycle = 'completed'
     or agreement_completion = 'reviewed_complete' then
    raise exception
      'A final still-due decision incorrectly completed the agreement: payout %, milestone %, agreement %/%/%.',
      payout_status,
      milestone_status,
      agreement_status,
      agreement_lifecycle,
      agreement_completion;
  end if;
end;
$test$;

-- A still-due adjudication preserves history and permits a genuinely new
-- external payment cycle. It does not reopen the prior correction or appeal.
select set_config(
  'request.jwt.claim.sub',
  (select profile_id::text from qa_payment_actors where actor_role = 'payer'),
  true
);
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub',
    (select profile_id::text from qa_payment_actors where actor_role = 'payer'),
    'role',
    'authenticated',
    'aal',
    'aal1'
  )::text,
  true
);
with reported as (
  select public.report_trade_external_payment_v1(
    (select object_id from qa_payment_objects where object_name = 'payout'),
    'QA bank',
    'QA-cycle-two-' || gen_random_uuid()::text,
    250,
    'USD',
    current_date,
    ''
  ) as id
)
insert into qa_payment_objects(object_name, object_id)
select 'cycle_two_receipt', id from reported;

select set_config(
  'request.jwt.claim.sub',
  (select profile_id::text from qa_payment_actors where actor_role = 'payee'),
  true
);
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub',
    (select profile_id::text from qa_payment_actors where actor_role = 'payee'),
    'role',
    'authenticated',
    'aal',
    'aal1'
  )::text,
  true
);
select public.respond_trade_external_payment_v1(
  (select object_id
   from qa_payment_objects
   where object_name = 'cycle_two_receipt'),
  'confirm',
  'The replacement external payment arrived.'
);

do $test$
declare
  payout_status text;
  milestone_status text;
  agreement_status text;
  agreement_lifecycle text;
  agreement_completion text;
  receipt_count integer;
  correction_count integer;
  latest_payment_cycle integer;
  final_payment_decision_count integer;
begin
  select status
  into payout_status
  from public.trade_milestone_payouts
  where id = (
    select object_id from qa_payment_objects where object_name = 'payout'
  );
  select status
  into milestone_status
  from public.trade_agreement_milestones
  where id = (
    select object_id from qa_payment_objects where object_name = 'milestone'
  );
  select status::text, lifecycle_status, completion_state
  into agreement_status, agreement_lifecycle, agreement_completion
  from public.agreements
  where id = (
    select object_id from qa_payment_objects where object_name = 'agreement'
  );
  select count(*), count(*) filter (where receipt_kind = 'correction')
  into receipt_count, correction_count
  from public.trade_external_payment_receipts
  where payout_id = (
    select object_id from qa_payment_objects where object_name = 'payout'
  );
  select max(payment_cycle)
  into latest_payment_cycle
  from public.trade_external_payment_receipts
  where payout_id = (
    select object_id from qa_payment_objects where object_name = 'payout'
  );
  select count(*)
  into final_payment_decision_count
  from public.trade_payment_review_decisions
  where case_id = (
      select object_id
      from qa_payment_objects
      where object_name = 'payment_case'
    )
    and is_final;

  if payout_status <> 'confirmed'
     or milestone_status <> 'paid'
     or agreement_status <> 'completed'
     or agreement_lifecycle <> 'completed'
     or agreement_completion <> 'reviewed_complete'
     or receipt_count <> 3
     or correction_count <> 1
     or latest_payment_cycle <> 2
     or final_payment_decision_count <> 1 then
    raise exception
      'Full payment lifecycle did not finish atomically: payout %, milestone %, agreement %/%/%, receipts %, corrections %, cycle %, final decisions %.',
      payout_status,
      milestone_status,
      agreement_status,
      agreement_lifecycle,
      agreement_completion,
      receipt_count,
      correction_count,
      latest_payment_cycle,
      final_payment_decision_count;
  end if;
end;
$test$;

rollback;
