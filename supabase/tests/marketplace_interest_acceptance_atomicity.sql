-- Destructive-looking operations are transaction-local and rolled back.
-- This test is deliberately bound to the two synthetic MoralTrade QA accounts
-- and deterministic offer so it fails closed in any other environment.

begin;

set local statement_timeout = '30s';
set local lock_timeout = '5s';

DO $guard$
declare
  owner_id uuid;
  responder_id uuid;
  offer_owner_id uuid;
begin
  select id into owner_id
  from public.profiles
  where email = 'qa-market-owner@example.com';

  select id into responder_id
  from public.profiles
  where email = 'qa-market-responder@example.com';

  select owner_id into offer_owner_id
  from public.offers
  where id = '10000000-0000-4000-8000-000000000158'::uuid;

  if owner_id is null or responder_id is null or offer_owner_id is null then
    raise exception 'Refusing atomicity test outside the deterministic MoralTrade QA fixture.';
  end if;

  if offer_owner_id <> owner_id then
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

rollback;
