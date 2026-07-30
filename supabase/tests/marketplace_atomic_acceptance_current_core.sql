-- Transaction-local regression against the exact MoralTrade QA fixture.
-- No test mutation survives the final rollback.

begin;
set local statement_timeout = '45s';
set local lock_timeout = '10s';

DO $guard$
declare
  owner_profile_id uuid;
  responder_profile_id uuid;
  fixture_count integer;
begin
  select id into owner_profile_id from public.profiles where email='qa-market-owner@example.com';
  select id into responder_profile_id from public.profiles where email='qa-market-responder@example.com';
  select count(*) into fixture_count
  from public.offers
  where id='10000000-0000-4000-8000-000000000158'::uuid
    and fingerprint='qa-pr-158-marketplace-fixture-v1'
    and owner_id=owner_profile_id;
  if owner_profile_id is null or responder_profile_id is null or fixture_count <> 1 then
    raise exception 'Refusing marketplace delta regression outside the exact MoralTrade QA fixture.';
  end if;
end;
$guard$;

-- Transaction-local clean baseline.
delete from public.trade_threads where offer_id='10000000-0000-4000-8000-000000000158'::uuid;
delete from public.agreements where offer_id='10000000-0000-4000-8000-000000000158'::uuid;
delete from public.interests where offer_id='10000000-0000-4000-8000-000000000158'::uuid;
delete from public.guest_interests where offer_id='10000000-0000-4000-8000-000000000158'::uuid;
update public.offers
set status='open', workflow_status='published', closed_at=null, deleted_at=null, updated_at=now()
where id='10000000-0000-4000-8000-000000000158'::uuid;

-- Everything after this point in the member case, including finalized milestone
-- terms and confirmations, can be undone without firing delete guards.
savepoint marketplace_member_case;

insert into public.interests(id, offer_id, user_id, interested_alias, message, status)
values (
  '10000000-0000-4000-8000-000000000170'::uuid,
  '10000000-0000-4000-8000-000000000158'::uuid,
  (select id from public.profiles where email='qa-market-responder@example.com'),
  'QA Counterparty',
  '[marketplace delta regression] member response',
  'pending'
);

select set_config(
  'request.jwt.claim.sub',
  (select id::text from public.profiles where email='qa-market-owner@example.com'),
  true
);
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub', (select id::text from public.profiles where email='qa-market-owner@example.com'),
    'role', 'authenticated'
  )::text,
  true
);

create or replace function public.qa_force_marketplace_delta_agreement_failure()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $function$
begin
  if new.notes='qa-marketplace-delta-forced-failure' then
    raise exception 'qa_marketplace_delta_forced_failure';
  end if;
  return new;
end;
$function$;

create trigger qa_force_marketplace_delta_agreement_failure_trigger
before insert on public.agreements
for each row execute function public.qa_force_marketplace_delta_agreement_failure();

DO $failure_case$
begin
  begin
    perform public.accept_marketplace_interest_v1(
      '10000000-0000-4000-8000-000000000170'::uuid,
      '10000000-0000-4000-8000-000000000158'::uuid,
      'qa-marketplace-delta-forced-failure'
    );
    raise exception 'Expected the forced agreement insert failure.';
  exception when others then
    if sqlerrm <> 'qa_marketplace_delta_forced_failure' then raise; end if;
  end;
end;
$failure_case$;

DO $failure_assertions$
declare
  response_status text;
  offer_status text;
  offer_workflow text;
  agreement_count integer;
begin
  select status::text into response_status from public.interests
  where id='10000000-0000-4000-8000-000000000170'::uuid;
  select status::text, workflow_status into offer_status, offer_workflow from public.offers
  where id='10000000-0000-4000-8000-000000000158'::uuid;
  select count(*) into agreement_count from public.agreements
  where offer_id='10000000-0000-4000-8000-000000000158'::uuid;
  if response_status <> 'pending' or offer_status <> 'open' or offer_workflow <> 'published' or agreement_count <> 0 then
    raise exception 'Failed creation must roll back response, offer, and agreement state. response %, offer %/%, agreements %.',
      response_status, offer_status, offer_workflow, agreement_count;
  end if;
end;
$failure_assertions$;

drop trigger qa_force_marketplace_delta_agreement_failure_trigger on public.agreements;
drop function public.qa_force_marketplace_delta_agreement_failure();

DO $member_success$
declare
  owner_profile_id uuid := (select id from public.profiles where email='qa-market-owner@example.com');
  responder_profile_id uuid := (select id from public.profiles where email='qa-market-responder@example.com');
  result jsonb;
  agreement_id_value uuid;
  version_id_value uuid;
  lifecycle text;
  thread_count integer;
  offer_status text;
  offer_workflow text;
  confirmation jsonb;
  confirmation_count integer;
begin
  result := public.accept_marketplace_interest_v1(
    '10000000-0000-4000-8000-000000000170'::uuid,
    '10000000-0000-4000-8000-000000000158'::uuid,
    'member atomic success'
  );
  agreement_id_value := (result->'agreement'->>'id')::uuid;
  select current_version_id, lifecycle_status into version_id_value, lifecycle
  from public.agreements where id=agreement_id_value;
  select count(*) into thread_count from public.trade_threads
  where offer_id='10000000-0000-4000-8000-000000000158'::uuid
    and agreement_id=agreement_id_value;
  select status::text, workflow_status into offer_status, offer_workflow from public.offers
  where id='10000000-0000-4000-8000-000000000158'::uuid;
  if agreement_id_value is null or version_id_value is null or lifecycle <> 'proposed'
     or thread_count <> 1 or offer_status <> 'matched' or offer_workflow <> 'closed' then
    raise exception 'Member acceptance did not create one proposed versioned agreement and linked thread before closing the offer.';
  end if;

  -- Current core trade versions require at least one independently described
  -- milestone and a finalized manifest before either participant may confirm.
  -- This is transaction-local QA data and is rolled back with the entire regression.
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
    evidence_rule
  )
  select
    agreement_id_value,
    version_id_value,
    1,
    responder_profile_id,
    owner_profile_id,
    'other',
    'Synthetic reciprocal commitment for the marketplace atomic-acceptance regression.',
    'commitment',
    1,
    true,
    0,
    'USD',
    v.evidence_rule
  from public.trade_agreement_versions v
  where v.id=version_id_value;

  perform public.finalize_trade_milestone_manifest_v1(version_id_value);

  confirmation := public.confirm_agreement_version_v2(owner_profile_id, agreement_id_value, version_id_value);
  if coalesce((confirmation->>'active')::boolean, true) then
    raise exception 'First confirmation must not activate.';
  end if;
  confirmation := public.confirm_agreement_version_v2(owner_profile_id, agreement_id_value, version_id_value);
  select count(distinct user_id) into confirmation_count from public.trade_agreement_confirmations
  where agreement_version_id=version_id_value;
  if coalesce((confirmation->>'active')::boolean, true) or confirmation_count <> 1 then
    raise exception 'Duplicate confirmation by one participant must remain idempotent.';
  end if;
  perform set_config('request.jwt.claim.sub', responder_profile_id::text, true);
  perform set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', responder_profile_id::text, 'role', 'authenticated')::text,
    true
  );
  confirmation := public.confirm_agreement_version_v2(responder_profile_id, agreement_id_value, version_id_value);
  if not coalesce((confirmation->>'active')::boolean, false) then
    raise exception 'Second distinct confirmation must activate the frozen version.';
  end if;
end;
$member_success$;

-- Restore the exact transaction-local clean fixture without deleting frozen
-- milestone terms. PostgreSQL undoes the member response, agreement, version,
-- milestone manifest, confirmations, thread linkage, and offer closure atomically.
rollback to savepoint marketplace_member_case;

select set_config('request.jwt.claim.sub', '', true);
select set_config(
  'request.jwt.claims',
  jsonb_build_object('role', 'service_role')::text,
  true
);

insert into public.guest_interests(
  id, offer_id, contact_email, display_name, message, status, claimed_by_profile_id
) values (
  '10000000-0000-4000-8000-000000000171'::uuid,
  '10000000-0000-4000-8000-000000000158'::uuid,
  'qa-market-responder@example.com',
  'QA Counterparty',
  '[marketplace delta regression] claimed guest response',
  'pending',
  (select id from public.profiles where email='qa-market-responder@example.com')
);

DO $guest_success$
declare
  owner_profile_id uuid := (select id from public.profiles where email='qa-market-owner@example.com');
  result jsonb;
  agreement_id_value uuid;
  version_id_value uuid;
  lifecycle text;
  thread_count integer;
begin
  perform set_config('request.jwt.claim.sub', owner_profile_id::text, true);
  perform set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', owner_profile_id::text, 'role', 'authenticated')::text,
    true
  );
  result := public.accept_marketplace_guest_interest_v1(
    '10000000-0000-4000-8000-000000000171'::uuid,
    '10000000-0000-4000-8000-000000000158'::uuid,
    'claimed guest atomic success'
  );
  agreement_id_value := (result->'agreement'->>'id')::uuid;
  select current_version_id, lifecycle_status into version_id_value, lifecycle
  from public.agreements where id=agreement_id_value;
  select count(*) into thread_count from public.trade_threads
  where offer_id='10000000-0000-4000-8000-000000000158'::uuid
    and agreement_id=agreement_id_value;
  if agreement_id_value is null or version_id_value is null or lifecycle <> 'proposed' or thread_count <> 1 then
    raise exception 'Claimed-guest acceptance did not create one proposed versioned agreement and linked thread.';
  end if;
end;
$guest_success$;

select 'PASS: member and claimed-guest acceptance are atomic on the existing core-trade schema' as result;
rollback;
