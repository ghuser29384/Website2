-- Transactional regression for the deterministic MoralTrade QA marketplace fixture.
-- The test proves that one participant cannot activate by confirming twice, while two
-- distinct participants can activate the exact frozen version after marketplace acceptance
-- has already closed the source offer.

begin;

set local statement_timeout = '30s';
set local lock_timeout = '5s';

DO $test$
declare
  owner_profile_id uuid;
  responder_profile_id uuid;
  agreement_id_value uuid;
  agreement_version_id_value uuid;
  acceptance_result jsonb;
  first_confirmation jsonb;
  duplicate_confirmation jsonb;
  second_confirmation jsonb;
  confirmation_count integer;
  agreement_state text;
  agreement_status text;
  offer_state text;
  offer_workflow text;
begin
  select id into owner_profile_id
  from public.profiles
  where email = 'qa-market-owner@example.com';

  select id into responder_profile_id
  from public.profiles
  where email = 'qa-market-responder@example.com';

  if owner_profile_id is null or responder_profile_id is null then
    raise exception 'Refusing bilateral confirmation test outside the exact synthetic QA accounts.';
  end if;

  if not exists (
    select 1
    from public.offers
    where id = '10000000-0000-4000-8000-000000000158'::uuid
      and owner_id = owner_profile_id
      and fingerprint = 'qa-pr-158-marketplace-fixture-v1'
      and status::text = 'open'
      and workflow_status = 'published'
  ) then
    raise exception 'Refusing bilateral confirmation test outside the clean deterministic QA offer.';
  end if;

  if exists (
    select 1 from public.interests
    where offer_id = '10000000-0000-4000-8000-000000000158'::uuid
  ) or exists (
    select 1 from public.agreements
    where offer_id = '10000000-0000-4000-8000-000000000158'::uuid
  ) then
    raise exception 'Deterministic QA offer must have no responses or agreements before the test.';
  end if;

  insert into public.interests (
    id,
    offer_id,
    user_id,
    interested_alias,
    message,
    status
  ) values (
    '10000000-0000-4000-8000-000000000161'::uuid,
    '10000000-0000-4000-8000-000000000158'::uuid,
    responder_profile_id,
    'QA Counterparty',
    '[bilateral confirmation regression] synthetic response',
    'pending'
  );

  perform set_config('request.jwt.claim.sub', owner_profile_id::text, true);
  perform set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', owner_profile_id::text, 'role', 'authenticated')::text,
    true
  );

  acceptance_result := public.accept_marketplace_interest_v1(
    '10000000-0000-4000-8000-000000000161'::uuid,
    '10000000-0000-4000-8000-000000000158'::uuid,
    'Synthetic bilateral-confirmation regression agreement.',
    '',
    'Without this synthetic agreement, neither participant has the recorded reciprocal commitment.'
  );

  agreement_id_value := (acceptance_result -> 'agreement' ->> 'id')::uuid;
  if agreement_id_value is null then
    raise exception 'Acceptance did not return an agreement ID.';
  end if;

  select current_version_id, lifecycle_status, status::text
  into agreement_version_id_value, agreement_state, agreement_status
  from public.agreements
  where id = agreement_id_value;

  select status::text, workflow_status
  into offer_state, offer_workflow
  from public.offers
  where id = '10000000-0000-4000-8000-000000000158'::uuid;

  if agreement_version_id_value is null
     or agreement_state <> 'proposed'
     or agreement_status <> 'proposed' then
    raise exception 'Acceptance did not create one proposed agreement with a frozen version.';
  end if;

  if offer_state <> 'matched' or offer_workflow <> 'closed' then
    raise exception 'Acceptance did not close the source offer before confirmation.';
  end if;

  first_confirmation := public.confirm_agreement_version_v2(
    owner_profile_id,
    agreement_id_value,
    agreement_version_id_value
  );

  select count(*), max(a.lifecycle_status), max(a.status::text)
  into confirmation_count, agreement_state, agreement_status
  from public.trade_agreement_confirmations c
  join public.trade_agreement_versions v on v.id = c.agreement_version_id
  join public.agreements a on a.id = v.agreement_id
  where c.agreement_version_id = agreement_version_id_value;

  if coalesce((first_confirmation ->> 'active')::boolean, true)
     or confirmation_count <> 1
     or agreement_state <> 'proposed'
     or agreement_status <> 'proposed' then
    raise exception 'The first distinct confirmation must persist once and leave the agreement proposed.';
  end if;

  duplicate_confirmation := public.confirm_agreement_version_v2(
    owner_profile_id,
    agreement_id_value,
    agreement_version_id_value
  );

  select count(*), max(a.lifecycle_status), max(a.status::text)
  into confirmation_count, agreement_state, agreement_status
  from public.trade_agreement_confirmations c
  join public.trade_agreement_versions v on v.id = c.agreement_version_id
  join public.agreements a on a.id = v.agreement_id
  where c.agreement_version_id = agreement_version_id_value;

  if coalesce((duplicate_confirmation ->> 'active')::boolean, true)
     or confirmation_count <> 1
     or agreement_state <> 'proposed'
     or agreement_status <> 'proposed' then
    raise exception 'A duplicate confirmation by one participant must not activate the agreement.';
  end if;

  second_confirmation := public.confirm_agreement_version_v2(
    responder_profile_id,
    agreement_id_value,
    agreement_version_id_value
  );

  select count(*), max(a.lifecycle_status), max(a.status::text)
  into confirmation_count, agreement_state, agreement_status
  from public.trade_agreement_confirmations c
  join public.trade_agreement_versions v on v.id = c.agreement_version_id
  join public.agreements a on a.id = v.agreement_id
  where c.agreement_version_id = agreement_version_id_value;

  if not coalesce((second_confirmation ->> 'active')::boolean, false)
     or confirmation_count <> 2
     or agreement_state <> 'active'
     or agreement_status <> 'active' then
    raise exception 'Two distinct confirmations of the same frozen version must activate the agreement.';
  end if;
end;
$test$;

select 'PASS: duplicate confirmation does not activate; two distinct confirmations activate the closed-offer agreement' as result;

rollback;
