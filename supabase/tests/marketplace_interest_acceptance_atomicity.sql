-- Destructive-looking operations are transaction-local and rolled back.
-- This test is deliberately bound to the two synthetic MoralTrade QA accounts
-- and deterministic offer so it fails closed in any other environment.

begin;

set local statement_timeout = '30s';
set local lock_timeout = '5s';

DO $guard$
declare
  owner_profile_id uuid;
  responder_profile_id uuid;
  offer_owner_profile_id uuid;
begin
  select profiles.id into owner_profile_id
  from public.profiles
  where profiles.email = 'qa-market-owner@example.com';

  select profiles.id into responder_profile_id
  from public.profiles
  where profiles.email = 'qa-market-responder@example.com';

  select offers.owner_id into offer_owner_profile_id
  from public.offers
  where offers.id = '10000000-0000-4000-8000-000000000158'::uuid;

  if owner_profile_id is null
     or responder_profile_id is null
     or offer_owner_profile_id is null then
    raise exception 'Refusing atomicity test outside the deterministic MoralTrade QA fixture.';
  end if;

  if offer_owner_profile_id <> owner_profile_id then
    raise exception 'Deterministic QA offer owner does not match the synthetic owner.';
  end if;
end;
$guard$;

delete from public.agreements
where offer_id = '10000000-0000-4000-8000-000000000158'::uuid;

delete from public.interests
where offer_id = '10000000-0000-4000-8000-000000000158'::uuid
  and user_id = (
    select id from public.profiles where email = 'qa-market-responder@example.com'
  );

update public.offers
set status = 'open', workflow_status = 'published', updated_at = now()
where id = '10000000-0000-4000-8000-000000000158'::uuid;

insert into public.interests (
  id,
  offer_id,
  user_id,
  interested_alias,
  message,
  status
) values (
  '10000000-0000-4000-8000-000000000159'::uuid,
  '10000000-0000-4000-8000-000000000158'::uuid,
  (select id from public.profiles where email = 'qa-market-responder@example.com'),
  'QA Counterparty',
  '[atomicity regression] response must remain pending after forced agreement failure',
  'pending'
);

create or replace function public.qa_force_marketplace_agreement_insert_failure()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $function$
begin
  if new.notes = 'qa-atomicity-forced-failure' then
    raise exception 'qa_forced_agreement_insert_failure';
  end if;
  return new;
end;
$function$;

create trigger qa_force_marketplace_agreement_insert_failure_trigger
before insert on public.agreements
for each row
execute function public.qa_force_marketplace_agreement_insert_failure();

select set_config(
  'request.jwt.claim.sub',
  (select id::text from public.profiles where email = 'qa-market-owner@example.com'),
  true
);
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub', (select id::text from public.profiles where email = 'qa-market-owner@example.com'),
    'role', 'authenticated'
  )::text,
  true
);

DO $exercise$
begin
  begin
    perform public.accept_marketplace_interest_v1(
      '10000000-0000-4000-8000-000000000159'::uuid,
      '10000000-0000-4000-8000-000000000158'::uuid,
      'qa-atomicity-forced-failure',
      '',
      ''
    );
    raise exception 'Atomicity test expected the agreement insert to fail.';
  exception
    when others then
      if sqlerrm <> 'qa_forced_agreement_insert_failure' then
        raise;
      end if;
  end;
end;
$exercise$;

DO $assertions$
declare
  response_status text;
  offer_status text;
  agreement_count integer;
begin
  select status::text into response_status
  from public.interests
  where id = '10000000-0000-4000-8000-000000000159'::uuid;

  select status::text into offer_status
  from public.offers
  where id = '10000000-0000-4000-8000-000000000158'::uuid;

  select count(*) into agreement_count
  from public.agreements
  where interest_id = '10000000-0000-4000-8000-000000000159'::uuid;

  if response_status <> 'pending' then
    raise exception 'Atomicity regression: failed agreement creation left response status %.', response_status;
  end if;

  if offer_status <> 'open' then
    raise exception 'Atomicity regression: failed agreement creation changed offer status to %.', offer_status;
  end if;

  if agreement_count <> 0 then
    raise exception 'Atomicity regression: failed agreement creation left % agreement row(s).', agreement_count;
  end if;
end;
$assertions$;

select 'PASS: failed agreement creation leaves the selected response pending and the offer open' as result;

select set_config('app.core_trade_linking_agreement', '', true);
select set_config('app.core_trade_internal', '', true);
drop trigger qa_force_marketplace_agreement_insert_failure_trigger on public.agreements;

DO $success_exercise$
declare
  acceptance_result jsonb;
begin
  acceptance_result := public.accept_marketplace_interest_v1(
    '10000000-0000-4000-8000-000000000159'::uuid,
    '10000000-0000-4000-8000-000000000158'::uuid,
    'qa-atomicity-success',
    '',
    ''
  );

  if coalesce((acceptance_result->>'created')::boolean, false) is not true then
    raise exception 'Success regression: acceptance RPC did not report a newly created agreement: %.', acceptance_result;
  end if;
end;
$success_exercise$;

DO $success_assertions$
declare
  response_status text;
  offer_status text;
  offer_workflow_status text;
  offer_closed_at timestamptz;
  agreement_row public.agreements%rowtype;
  agreement_count integer;
  version_count integer;
  linked_thread_count integer;
begin
  select status::text into response_status
  from public.interests
  where id = '10000000-0000-4000-8000-000000000159'::uuid;

  select status::text, workflow_status, closed_at
  into offer_status, offer_workflow_status, offer_closed_at
  from public.offers
  where id = '10000000-0000-4000-8000-000000000158'::uuid;

  select count(*) into agreement_count
  from public.agreements
  where interest_id = '10000000-0000-4000-8000-000000000159'::uuid;

  select * into agreement_row
  from public.agreements
  where interest_id = '10000000-0000-4000-8000-000000000159'::uuid;

  select count(*) into version_count
  from public.trade_agreement_versions
  where agreement_id = agreement_row.id
    and id = agreement_row.current_version_id
    and version = 1;

  select count(*) into linked_thread_count
  from public.trade_threads
  where offer_id = '10000000-0000-4000-8000-000000000158'::uuid
    and agreement_id = agreement_row.id
    and status = 'active';

  if response_status <> 'accepted' then
    raise exception 'Success regression: response status is %, expected accepted.', response_status;
  end if;
  if offer_status <> 'matched'
     or offer_workflow_status <> 'closed'
     or offer_closed_at is null then
    raise exception 'Success regression: offer state is status %, workflow %, closed_at %; expected matched, closed, timestamped.',
      offer_status,
      offer_workflow_status,
      offer_closed_at;
  end if;
  if agreement_count <> 1 or agreement_row.id is null then
    raise exception 'Success regression: expected one agreement, found %.', agreement_count;
  end if;
  if agreement_row.status::text <> 'proposed'
     or agreement_row.lifecycle_status <> 'proposed'
     or agreement_row.current_version_id is null then
    raise exception 'Success regression: agreement was not bridged to one frozen proposed version: %.', to_jsonb(agreement_row);
  end if;
  if version_count <> 1 then
    raise exception 'Success regression: expected one current frozen version, found %.', version_count;
  end if;
  if linked_thread_count <> 1 then
    raise exception 'Success regression: expected one linked private thread, found %.', linked_thread_count;
  end if;
end;
$success_assertions$;

select 'PASS: successful acceptance creates one proposed agreement, frozen version, and linked private thread' as result;

rollback;
