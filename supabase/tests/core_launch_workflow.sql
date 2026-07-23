begin;

create temporary table core_launch_test_results (
  check_name text primary key,
  check_value jsonb not null
) on commit drop;

create or replace function public.__core_launch_fail_notification()
returns trigger
language plpgsql
set search_path = pg_catalog
as $function$
begin
  raise exception 'Synthetic notification failure';
end;
$function$;

do $test$
declare
  actor_a constant uuid := '7a111111-1111-4111-8111-111111111111';
  actor_b constant uuid := '7b222222-2222-4222-8222-222222222222';
  outsider constant uuid := '7c333333-3333-4333-8333-333333333333';
  offer_one constant uuid := '8a111111-1111-4111-8111-111111111111';
  invite_one constant uuid := '9a111111-1111-4111-8111-111111111111';
  offer_two constant uuid := '8a222222-2222-4222-8222-222222222222';
  invite_two constant uuid := '9a222222-2222-4222-8222-222222222222';
  response jsonb;
  retry_response jsonb;
  thread_one uuid;
  proposal_one uuid;
  agreement_one uuid;
  version_one uuid;
  version_two uuid;
  evidence_one uuid;
  evidence_two uuid;
  thread_two uuid;
  agreement_two uuid;
  version_three uuid;
  exit_request_id uuid;
  expected_failure boolean;
  record_count integer;
  public_record jsonb;
begin
  insert into auth.users(
    id, aud, role, email, encrypted_password, email_confirmed_at, confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) values
    (
      actor_a, 'authenticated', 'authenticated', 'launch-a-20260723@example.test', '',
      now(), now(), '{"provider":"email","providers":["email"]}'::jsonb,
      '{"display_name":"Launch Participant A"}'::jsonb, now(), now()
    ),
    (
      actor_b, 'authenticated', 'authenticated', 'launch-b-20260723@example.test', '',
      now(), now(), '{"provider":"email","providers":["email"]}'::jsonb,
      '{"display_name":"Launch Participant B"}'::jsonb, now(), now()
    ),
    (
      outsider, 'authenticated', 'authenticated', 'launch-c-20260723@example.test', '',
      now(), now(), '{"provider":"email","providers":["email"]}'::jsonb,
      '{"display_name":"Launch Outsider"}'::jsonb, now(), now()
    );

  insert into public.profiles(id, email, display_name, bio, affiliation)
  values
    (actor_a, 'launch-a-20260723@example.test', 'Launch Participant A', '', ''),
    (actor_b, 'launch-b-20260723@example.test', 'Launch Participant B', '', ''),
    (outsider, 'launch-c-20260723@example.test', 'Launch Outsider', '', '')
  on conflict (id) do update set
    email = excluded.email,
    display_name = excluded.display_name;

  insert into public.offers(
    id, owner_id, owner_alias, mode, offered_cause, requested_cause,
    offer_action, request_action, compromise_cause, offer_impact,
    min_counterparty_impact, verification, duration, trust_level, notes,
    status, workflow_status, submission_key, fingerprint, no_trade_baseline,
    start_date, exit_conditions, maximum_burden, privacy_scope,
    evidence_due_date, submitted_at, published_at, terms_version
  ) values (
    offer_one, actor_a, 'Launch Participant A', 'pledge',
    'Global poverty reduction', 'Animal welfare',
    'Donate one percent of income for twelve months.',
    'Follow a vegetarian diet for twelve months.',
    'Not needed', 50, 50,
    'Participant attestation and a receipt where applicable.',
    '12 months', 3, 'Synthetic transactional launch test.',
    'open', 'published', 'launch-happy-offer', 'launch-happy-fingerprint',
    'Both participants continue their current behavior.',
    current_date + 1,
    'Either participant may end future obligations by notifying the other.',
    'Only the stated one-percent donation and twelve-month diet commitment.',
    'Participants and operator only; publication requires a separate redacted copy.',
    current_date + 30, now(), now(), 1
  );

  response := public.create_trade_invitation_v2(
    actor_a,
    offer_one,
    invite_one,
    repeat('a', 64),
    repeat('c', 64),
    'launch-b-20260723@example.test',
    'Please review every bounded term.',
    'Moral Trade invitation',
    'Open the private invitation and review every term before responding.'
  );
  if response->>'status' <> 'sent' then
    raise exception 'Invitation creation did not return sent status: %', response;
  end if;

  response := public.respond_trade_invitation_v2(
    actor_b,
    repeat('a', 64),
    'counter',
    'I can do this with a narrower duration.',
    'Donate one percent of income for six months.',
    'Follow a vegetarian diet for six months.',
    '6 months',
    current_date + 1,
    'Participant attestation and a receipt where applicable.',
    current_date + 30,
    'Either participant may end future obligations by notifying the other.',
    'Only the stated one-percent donation and six-month diet commitment.',
    'Participants and operator only; publication requires a separate redacted copy.',
    'Both participants continue their current behavior.'
  );
  thread_one := (response->>'threadId')::uuid;
  proposal_one := (response->>'counterproposalId')::uuid;
  if response->>'status' <> 'countered' or thread_one is null or proposal_one is null then
    raise exception 'Invitation counterproposal did not create a thread and proposal: %', response;
  end if;

  execute 'create trigger __core_launch_notification_failure before insert on public.trade_notifications for each row execute function public.__core_launch_fail_notification()';
  response := public.send_trade_message_v3(
    actor_a,
    thread_one,
    'This primary message must survive a notification failure.',
    'launch-message-idempotency'
  );
  execute 'drop trigger __core_launch_notification_failure on public.trade_notifications';
  if coalesce((response->>'created')::boolean, false) is not true then
    raise exception 'Primary message did not survive the synthetic notification failure: %', response;
  end if;
  retry_response := public.send_trade_message_v3(
    actor_a,
    thread_one,
    'This primary message must survive a notification failure.',
    'launch-message-idempotency'
  );
  if (retry_response->>'messageId') is distinct from (response->>'messageId')
     or coalesce((retry_response->>'created')::boolean, true) is not false then
    raise exception 'Message retry was not idempotent: first %, retry %', response, retry_response;
  end if;

  expected_failure := false;
  begin
    perform public.decide_counterproposal_v2(actor_b, thread_one, proposal_one, 'accept');
  exception when others then
    expected_failure := true;
  end;
  if not expected_failure then
    raise exception 'Counterproposal proposer was able to accept their own proposal.';
  end if;

  response := public.decide_counterproposal_v2(actor_a, thread_one, proposal_one, 'accept');
  select agreement_id into agreement_one
  from public.trade_threads
  where id = thread_one;
  if agreement_one is null then
    raise exception 'Counterproposal acceptance did not atomically create and link an agreement: %', response;
  end if;
  select current_version_id into version_one
  from public.agreements
  where id = agreement_one;

  response := public.propose_agreement_version_v3(
    actor_a,
    agreement_one,
    'launch-amendment-v2',
    'Donate one percent of income for six months, beginning on the stated date.',
    'Follow a vegetarian diet for six months, beginning on the stated date.',
    '6 months',
    current_date + 2,
    'Participant attestation and a receipt where applicable.',
    current_date + 31,
    'Either participant may end future obligations by notifying the other.',
    'Only the stated one-percent donation and six-month diet commitment.',
    'Participants and operator only; publication requires a separate redacted copy.',
    'Both participants continue their current behavior.'
  );
  version_two := (response->>'versionId')::uuid;
  if version_two is null or version_two = version_one then
    raise exception 'Agreement amendment did not create a distinct immutable version: %', response;
  end if;

  expected_failure := false;
  begin
    perform public.confirm_agreement_version_v2(actor_b, agreement_one, version_one);
  exception when others then
    expected_failure := true;
  end;
  if not expected_failure then
    raise exception 'A stale agreement version was confirmed.';
  end if;

  response := public.confirm_agreement_version_v2(actor_a, agreement_one, version_two);
  if coalesce((response->>'activated')::boolean, false) then
    raise exception 'One participant activated the agreement alone: %', response;
  end if;
  response := public.confirm_agreement_version_v2(actor_b, agreement_one, version_two);
  if coalesce((response->>'activated')::boolean, false) is not true then
    raise exception 'Bilateral confirmation did not activate the exact current version: %', response;
  end if;

  expected_failure := false;
  begin
    perform public.propose_agreement_version_v3(
      actor_a, agreement_one, 'forbidden-post-activation-amendment',
      'Changed action', 'Changed request', '1 month', current_date + 3,
      'Changed evidence', current_date + 32, 'Changed exit', 'Changed burden',
      'Private', 'Changed baseline'
    );
  exception when others then
    expected_failure := true;
  end;
  if not expected_failure then
    raise exception 'Activated terms were amended.';
  end if;

  response := public.register_trade_evidence_v3(
    actor_a,
    agreement_one,
    'launch-private-evidence-1',
    'attestation',
    '',
    '',
    'PRIVATE SOURCE: completed the stated action for the first review period.',
    null
  );
  evidence_one := (response->>'evidenceId')::uuid;
  select count(*) into record_count
  from public.trade_evidence_items
  where id = evidence_one
    and public_visibility = 'private'
    and public_published_at is null
    and redaction_status = 'withheld';
  if record_count <> 1 then
    raise exception 'New evidence was not private by default.';
  end if;
  retry_response := public.register_trade_evidence_v3(
    actor_a,
    agreement_one,
    'launch-private-evidence-1',
    'attestation',
    '',
    '',
    'PRIVATE SOURCE: completed the stated action for the first review period.',
    null
  );
  if (retry_response->>'evidenceId') is distinct from evidence_one::text
     or coalesce((retry_response->>'created')::boolean, true) is not false then
    raise exception 'Evidence retry was not idempotent: first %, retry %', response, retry_response;
  end if;

  expected_failure := false;
  begin
    perform public.review_trade_evidence_v3(actor_a, evidence_one, 'accept', '');
  exception when others then
    expected_failure := true;
  end;
  if not expected_failure then
    raise exception 'Evidence submitter reviewed their own evidence.';
  end if;

  response := public.review_trade_evidence_v3(
    actor_b,
    evidence_one,
    'challenge',
    'The period stated in the private attestation is ambiguous.'
  );
  if response->>'status' <> 'challenged' then
    raise exception 'Counterparty challenge failed: %', response;
  end if;

  response := public.register_trade_evidence_v3(
    actor_a,
    agreement_one,
    'launch-private-evidence-2',
    'attestation',
    '',
    '',
    'PRIVATE SOURCE: completed the action from the explicit start date through the explicit review date.',
    evidence_one
  );
  evidence_two := (response->>'evidenceId')::uuid;
  if evidence_two is null then
    raise exception 'Replacement evidence was not created: %', response;
  end if;
  select count(*) into record_count
  from public.trade_evidence_items
  where id = evidence_one and status = 'replaced' and public_visibility = 'private';
  if record_count <> 1 then
    raise exception 'Replaced evidence was not closed and made private.';
  end if;

  response := public.review_trade_evidence_v3(actor_b, evidence_two, 'accept', '');
  if response->>'status' <> 'accepted' then
    raise exception 'Replacement evidence acceptance failed: %', response;
  end if;

  response := public.publish_trade_evidence_v3(
    actor_a,
    evidence_two,
    'Redacted completion summary',
    'A participant completed the bounded action for the reviewed period.',
    '', '', '', '',
    'Removed the private date details and all participant identifiers.'
  );
  if response->>'visibility' <> 'public' then
    raise exception 'Explicit redacted publication failed: %', response;
  end if;
  public_record := public.get_public_moral_trade_evidence_v1(agreement_one);
  if public_record is null
     or public_record::text like '%PRIVATE SOURCE:%'
     or public_record::text not like '%Redacted completion summary%' then
    raise exception 'Public evidence projection was missing or exposed private source text: %', public_record;
  end if;

  response := public.confirm_trade_completion_v3(actor_a, agreement_one);
  if coalesce((response->>'completed')::boolean, true) is not false then
    raise exception 'One participant completed the agreement alone: %', response;
  end if;
  retry_response := public.confirm_trade_completion_v3(actor_a, agreement_one);
  select count(*) into record_count
  from public.trade_completion_confirmations
  where agreement_id = agreement_one and user_id = actor_a;
  if record_count <> 1 then
    raise exception 'Completion confirmation retry created a duplicate record: %', retry_response;
  end if;
  response := public.confirm_trade_completion_v3(actor_b, agreement_one);
  if coalesce((response->>'completed')::boolean, false) is not true then
    raise exception 'Bilateral completion did not create a final receipt state: %', response;
  end if;
  select count(*) into record_count
  from public.agreements
  where id = agreement_one and lifecycle_status = 'completed' and status = 'completed';
  if record_count <> 1 then
    raise exception 'Agreement did not reach immutable completed state.';
  end if;

  insert into public.offers(
    id, owner_id, owner_alias, mode, offered_cause, requested_cause,
    offer_action, request_action, compromise_cause, offer_impact,
    min_counterparty_impact, verification, duration, trust_level, notes,
    status, workflow_status, submission_key, fingerprint, no_trade_baseline,
    start_date, exit_conditions, maximum_burden, privacy_scope,
    evidence_due_date, submitted_at, published_at, terms_version
  ) values (
    offer_two, actor_a, 'Launch Participant A', 'pledge',
    'Scientific research', 'Environmental protection',
    'Contribute ten verified hours to a research project.',
    'Contribute ten verified hours to an environmental project.',
    'Not needed', 50, 50,
    'Participant attestation and project confirmation.',
    '3 months', 3, 'Synthetic exit-path test.',
    'open', 'published', 'launch-exit-offer', 'launch-exit-fingerprint',
    'Neither participant changes their project allocation.',
    current_date + 1,
    'Either participant may end future obligations by notifying the other.',
    'Ten hours per participant only.',
    'Participants and operator only; publication requires a separate redacted copy.',
    current_date + 30, now(), now(), 1
  );

  perform public.create_trade_invitation_v2(
    actor_a,
    offer_two,
    invite_two,
    repeat('b', 64),
    repeat('d', 64),
    'launch-b-20260723@example.test',
    'Please review the exit-path proposal.',
    'Moral Trade invitation',
    'Open the private invitation and review every term before responding.'
  );
  response := public.respond_trade_invitation_v2(
    actor_b,
    repeat('b', 64),
    'accept',
    'Accepted as written.',
    '', '', '', null, '', null, '', '', '', ''
  );
  thread_two := (response->>'threadId')::uuid;
  agreement_two := (response->>'agreementId')::uuid;
  version_three := (response->>'agreementVersionId')::uuid;
  if agreement_two is null or version_three is null then
    raise exception 'Second accepted invitation did not form a proposed agreement: %', response;
  end if;
  perform public.confirm_agreement_version_v2(actor_a, agreement_two, version_three);
  response := public.confirm_agreement_version_v2(actor_b, agreement_two, version_three);
  if coalesce((response->>'activated')::boolean, false) is not true then
    raise exception 'Second agreement did not activate.';
  end if;

  response := public.request_trade_exit_v3(
    actor_a,
    agreement_two,
    'mutual_cancel',
    'The participants should stop before reliance increases.'
  );
  exit_request_id := (response->>'requestId')::uuid;
  response := public.respond_trade_exit_v3(actor_b, exit_request_id, 'decline');
  if response->>'requestStatus' <> 'declined' then
    raise exception 'Mutual cancellation decline was not recorded: %', response;
  end if;
  select count(*) into record_count
  from public.agreements
  where id = agreement_two and lifecycle_status = 'active';
  if record_count <> 1 then
    raise exception 'Declining mutual cancellation changed the active agreement.';
  end if;

  response := public.request_trade_exit_v3(
    actor_a,
    agreement_two,
    'unilateral_exit',
    'Using the disclosed unilateral exit rule before further reliance.'
  );
  if response->>'lifecycleStatus' <> 'cancelled' then
    raise exception 'Unilateral exit did not immediately end future obligations: %', response;
  end if;
  retry_response := public.request_trade_exit_v3(
    actor_a,
    agreement_two,
    'unilateral_exit',
    'Using the disclosed unilateral exit rule before further reliance.'
  );
  if coalesce((retry_response->>'created')::boolean, true) is not false then
    raise exception 'Unilateral exit retry was not idempotent: %', retry_response;
  end if;

  insert into core_launch_test_results(check_name, check_value) values
    ('happy_path', jsonb_build_object(
      'agreementId', agreement_one,
      'lifecycleStatus', 'completed',
      'privateEvidenceId', evidence_two,
      'publicProjectionSafe', true
    )),
    ('exit_path', jsonb_build_object(
      'agreementId', agreement_two,
      'lifecycleStatus', 'cancelled',
      'mutualDeclineRecorded', true,
      'unilateralExitIdempotent', true
    )),
    ('atomicity', jsonb_build_object(
      'messageSurvivedNotificationFailure', true,
      'messageRetryIdempotent', true,
      'staleVersionRejected', true,
      'selfAcceptanceRejected', true,
      'onePartyActivationRejected', true,
      'onePartyCompletionRejected', true
    ));
end;
$test$;

select set_config(
  'request.jwt.claims',
  '{"sub":"7c333333-3333-4333-8333-333333333333","role":"authenticated"}',
  true
);
set local role authenticated;

do $outsider$
declare
  denied boolean := false;
begin
  if exists (
    select 1 from public.trade_threads
    where id = '00000000-0000-4000-8000-000000000000'
       or participant_a = '7a111111-1111-4111-8111-111111111111'
       or participant_b = '7b222222-2222-4222-8222-222222222222'
  ) then
    raise exception 'Outsider could read a private trade thread.';
  end if;
  if exists (
    select 1 from public.agreements
    where proposer_id = '7a111111-1111-4111-8111-111111111111'
       or responder_id = '7b222222-2222-4222-8222-222222222222'
  ) then
    raise exception 'Outsider could read a private agreement.';
  end if;
  if exists (
    select 1 from public.trade_evidence_items
    where submitted_by = '7a111111-1111-4111-8111-111111111111'
  ) then
    raise exception 'Outsider could read private evidence source rows.';
  end if;
  if exists (
    select 1 from public.trade_messages
    where sender_id = '7a111111-1111-4111-8111-111111111111'
  ) then
    raise exception 'Outsider could read private messages.';
  end if;

  begin
    insert into public.trade_messages(thread_id, sender_id, message_type, body, metadata)
    values (
      '00000000-0000-4000-8000-000000000000',
      '7c333333-3333-4333-8333-333333333333',
      'user',
      'Forbidden direct write',
      '{}'::jsonb
    );
  exception when insufficient_privilege then
    denied := true;
  end;
  if not denied then
    raise exception 'Authenticated outsider retained direct mutation access to private messages.';
  end if;
end;
$outsider$;

reset role;

select set_config(
  'request.jwt.claims',
  '{"sub":"7a111111-1111-4111-8111-111111111111","role":"authenticated"}',
  true
);
set local role authenticated;

do $participant$
begin
  if not exists (
    select 1 from public.agreements
    where proposer_id = '7a111111-1111-4111-8111-111111111111'
  ) then
    raise exception 'Participant could not read their own agreement through RLS.';
  end if;
  if not exists (
    select 1 from public.trade_evidence_items
    where submitted_by = '7a111111-1111-4111-8111-111111111111'
  ) then
    raise exception 'Participant could not read their own private evidence through RLS.';
  end if;
end;
$participant$;

reset role;

insert into core_launch_test_results(check_name, check_value)
values (
  'rls_and_grants',
  jsonb_build_object(
    'outsiderPrivateReadsDenied', true,
    'outsiderDirectWritesDenied', true,
    'participantReadsAllowed', true
  )
);

select jsonb_object_agg(check_name, check_value order by check_name) as core_launch_validation
from core_launch_test_results;

rollback;
