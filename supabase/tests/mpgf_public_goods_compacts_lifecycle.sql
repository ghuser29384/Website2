-- Executed only inside a workflow-owned transaction that is rolled back.
-- Deliberately contains no BEGIN, COMMIT, or ROLLBACK of its own.

\set ON_ERROR_STOP on

do $test$
declare
  relation_name text;
  function_signature text;
  function_definition text;
  function_is_security_definer boolean;
  function_config text[];
begin
  if (select count(*) from public.mpgf_public_goods_compacts) <> 3 then
    raise exception 'Expected exactly three Compact v2 constitutions.';
  end if;
  if exists (select 1 from public.mpgf_public_goods_compact_memberships)
    or exists (select 1 from public.mpgf_public_goods_outflow_coverage_snapshots)
    or exists (select 1 from public.mpgf_public_goods_funding_qualification_snapshots)
  then
    raise exception 'Compact v2 migrations seeded participant, payment, or qualification facts.';
  end if;

  foreach relation_name in array array[
    'mpgf_public_goods_compacts', 'mpgf_public_goods_compact_memberships',
    'mpgf_public_goods_dormant_authorization_snapshots', 'mpgf_public_goods_outflow_coverage_snapshots',
    'mpgf_public_goods_outflow_observations', 'mpgf_public_goods_obligation_snapshots',
    'mpgf_public_goods_allocation_instructions', 'mpgf_public_goods_allocation_instruction_lines',
    'mpgf_public_goods_scheduled_amount_snapshots', 'mpgf_public_goods_settled_contribution_snapshots',
    'mpgf_public_goods_funding_qualification_snapshots', 'mpgf_public_goods_readiness_snapshots',
    'mpgf_public_goods_voting_snapshots', 'mpgf_public_goods_voting_weight_snapshots',
    'mpgf_public_goods_delegation_events', 'mpgf_public_goods_delegation_snapshots',
    'mpgf_public_goods_delegation_weight_snapshots', 'mpgf_public_goods_compact_idempotency_keys'
  ] loop
    if not exists (
      select 1 from pg_catalog.pg_class as relation
      join pg_catalog.pg_namespace as namespace on namespace.oid = relation.relnamespace
      where namespace.nspname = 'public' and relation.relname = relation_name and relation.relrowsecurity
    ) then raise exception 'RLS is not enabled for %.', relation_name; end if;

    if has_table_privilege('anon', pg_catalog.format('public.%I', relation_name), 'insert')
      or has_table_privilege('anon', pg_catalog.format('public.%I', relation_name), 'update')
      or has_table_privilege('anon', pg_catalog.format('public.%I', relation_name), 'delete')
      or has_table_privilege('authenticated', pg_catalog.format('public.%I', relation_name), 'insert')
      or has_table_privilege('authenticated', pg_catalog.format('public.%I', relation_name), 'update')
      or has_table_privilege('authenticated', pg_catalog.format('public.%I', relation_name), 'delete')
    then raise exception 'A browser role can directly mutate %.', relation_name; end if;
  end loop;

  if has_table_privilege('anon', 'public.mpgf_public_goods_compacts', 'select')
    or has_table_privilege('authenticated', 'public.mpgf_public_goods_compacts', 'select')
    or has_table_privilege('anon', 'public.mpgf_public_goods_readiness_snapshots', 'select')
    or has_table_privilege('authenticated', 'public.mpgf_public_goods_readiness_snapshots', 'select')
    or has_table_privilege('anon', 'public.mpgf_public_goods_compact_idempotency_keys', 'select')
    or has_table_privilege('authenticated', 'public.mpgf_public_goods_compact_idempotency_keys', 'select')
  then raise exception 'A browser role can bypass the public state RPC or read idempotency records.'; end if;

  foreach function_signature in array array[
    'public.join_mpgf_public_goods_compact_v2(text,text,jsonb,text)',
    'public.set_mpgf_public_goods_compact_allocation_v2(jsonb,text)',
    'public.request_mpgf_public_goods_compact_exit_v2(text,text)',
    'public.set_mpgf_public_goods_compact_delegation_v2(text,text,uuid,text)',
    'public.clear_mpgf_public_goods_compact_delegation_v2(text,text,text)',
    'public.get_mpgf_public_goods_compacts_v2_state()'
  ] loop
    select procedure.prosecdef, procedure.proconfig,
      pg_catalog.pg_get_functiondef(procedure.oid)
    into function_is_security_definer, function_config, function_definition
    from pg_catalog.pg_proc as procedure
    where procedure.oid = function_signature::regprocedure;
    if not function_is_security_definer
      or not ('search_path=""' = any(function_config))
      or function_definition ~* '(from|join|update|into|delete[[:space:]]+from)[[:space:]]+mpgf_public_goods_'
    then raise exception 'Security-definer hardening failed for %.', function_signature; end if;
  end loop;

  if has_function_privilege('anon', 'public.join_mpgf_public_goods_compact_v2(text,text,jsonb,text)', 'execute')
    or has_function_privilege('anon', 'public.set_mpgf_public_goods_compact_allocation_v2(jsonb,text)', 'execute')
    or has_function_privilege('anon', 'public.request_mpgf_public_goods_compact_exit_v2(text,text)', 'execute')
    or has_function_privilege('anon', 'public.set_mpgf_public_goods_compact_delegation_v2(text,text,uuid,text)', 'execute')
    or has_function_privilege('anon', 'public.clear_mpgf_public_goods_compact_delegation_v2(text,text,text)', 'execute')
    or not has_function_privilege('authenticated', 'public.join_mpgf_public_goods_compact_v2(text,text,jsonb,text)', 'execute')
    or not has_function_privilege('authenticated', 'public.set_mpgf_public_goods_compact_allocation_v2(jsonb,text)', 'execute')
    or not has_function_privilege('authenticated', 'public.request_mpgf_public_goods_compact_exit_v2(text,text)', 'execute')
    or not has_function_privilege('authenticated', 'public.set_mpgf_public_goods_compact_delegation_v2(text,text,uuid,text)', 'execute')
    or not has_function_privilege('authenticated', 'public.clear_mpgf_public_goods_compact_delegation_v2(text,text,text)', 'execute')
    or not has_function_privilege('anon', 'public.get_mpgf_public_goods_compacts_v2_state()', 'execute')
    or not has_function_privilege('authenticated', 'public.get_mpgf_public_goods_compacts_v2_state()', 'execute')
    or has_function_privilege('authenticated', 'public.freeze_mpgf_public_goods_financial_cycle_v2(uuid,text)', 'execute')
    or has_function_privilege('authenticated', 'public.freeze_mpgf_public_goods_readiness_v2(uuid,text)', 'execute')
    or has_function_privilege('authenticated', 'public.freeze_mpgf_public_goods_voting_v2(uuid,text)', 'execute')
    or has_function_privilege('authenticated', 'public.freeze_mpgf_public_goods_delegations_v2(uuid)', 'execute')
  then raise exception 'Compact function execution privileges do not match the intended role matrix.'; end if;

  if exists (
    select 1
    from pg_catalog.pg_attribute as attribute
    join pg_catalog.pg_class as relation on relation.oid = attribute.attrelid
    join pg_catalog.pg_namespace as namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'public'
      and relation.relname like 'mpgf_public_goods_%'
      and relation.relname <> 'mpgf_public_goods_compacts'
      and not attribute.attisdropped
      and attribute.attname ~* '(project.*opt|opt.*project)'
  ) then raise exception 'A project-by-project opt-out state exists outside the frozen constitution.'; end if;
end;
$test$;

create temporary table mpgf_public_goods_money_baseline (
  relation_name text primary key,
  row_count bigint not null
) on commit drop;

do $test$
declare
  relation_name text;
  observed_count bigint;
begin
  foreach relation_name in array array[
    'conditional_payment_mandates', 'conditional_payment_attempts',
    'trade_donation_intents', 'agreement_payments', 'mpgf_payment_intents',
    'mpgf_payment_authorizations', 'mpgf_provider_payment_events',
    'mpgf_external_payment_evidence', 'mpgf_manual_external_payment_evidence',
    'mpgf_receipts', 'mpgf_custody_holds', 'mpgf_phase_one_checkout_handoffs'
  ] loop
    if pg_catalog.to_regclass('public.' || relation_name) is not null then
      execute pg_catalog.format('select count(*) from public.%I', relation_name)
        into observed_count;
      insert into mpgf_public_goods_money_baseline values (relation_name, observed_count);
    end if;
  end loop;
end;
$test$;

set local role anon;
do $test$
begin
  begin
    perform count(*) from public.mpgf_public_goods_compacts;
    raise exception 'Anonymous direct Compact reads bypassed the public state RPC.';
  exception when insufficient_privilege then null;
  end;
  if (public.get_mpgf_public_goods_compacts_v2_state()->>'available')::boolean is distinct from true
    or public.get_mpgf_public_goods_compacts_v2_state()::text ~ 'acknowledgements|request_hash|unique_person_key_hash'
  then raise exception 'Anonymous public state is unavailable or exposes private fields.'; end if;
  begin
    perform public.join_mpgf_public_goods_compact_v2(
      'future-flourishing', 'mpgf-public-goods-compact/transaction-v2',
      '{"voluntaryChoice":true,"exactConstitution":true,"activationAndNoProjectOptOut":true,"noPaymentMandate":true}',
      'qa.anon.join.denied'
    );
    raise exception 'Anonymous join execution was accepted.';
  exception when insufficient_privilege then null;
  end;
end;
$test$;
reset role;

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, confirmation_token, recovery_token,
  email_change_token_new, email_change_token_current, reauthentication_token,
  is_sso_user, is_anonymous, created_at, updated_at
) values (
  '6a000000-0000-4000-8000-000000000001','00000000-0000-0000-0000-000000000000',
  'authenticated','authenticated','compact-a@example.test','',now(),'{}','{}','','','','','',false,false,now(),now()
), (
  '6a000000-0000-4000-8000-000000000002','00000000-0000-0000-0000-000000000000',
  'authenticated','authenticated','compact-no-profile@example.test','',now(),'{}','{}','','','','','',false,false,now(),now()
), (
  '6a000000-0000-4000-8000-000000000003','00000000-0000-0000-0000-000000000000',
  'authenticated','authenticated','compact-nonmember@example.test','',now(),'{}','{}','','','','','',false,false,now(),now()
);
delete from public.profiles
where id = '6a000000-0000-4000-8000-000000000002';
insert into public.profiles (
  id, email, display_name, bio, affiliation, username, account_kind,
  accepts_group_invitations, public_invitation_mentions_enabled
) values (
  '6a000000-0000-4000-8000-000000000001','compact-a@example.test','Compact A','','','compact-a','individual',true,true
), (
  '6a000000-0000-4000-8000-000000000003','compact-nonmember@example.test','Compact Nonmember','','','compact-nonmember','individual',true,true
)
on conflict (id) do update
set email = excluded.email,
    display_name = excluded.display_name,
    bio = excluded.bio,
    affiliation = excluded.affiliation,
    username = excluded.username,
    account_kind = excluded.account_kind,
    accepts_group_invitations = excluded.accepts_group_invitations,
    public_invitation_mentions_enabled = excluded.public_invitation_mentions_enabled;

set local role authenticated;
select set_config('request.jwt.claim.sub','6a000000-0000-4000-8000-000000000002',true);
select set_config('request.jwt.claim.role','authenticated',true);
do $test$
begin
  begin
    perform public.join_mpgf_public_goods_compact_v2(
      'future-flourishing', 'mpgf-public-goods-compact/transaction-v2',
      '{"voluntaryChoice":true,"exactConstitution":true,"activationAndNoProjectOptOut":true,"noPaymentMandate":true}',
      'qa.no-profile.join.denied'
    );
    raise exception 'An authenticated account without a profile joined a Compact.';
  exception when insufficient_privilege then null;
  end;
end;
$test$;
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','6a000000-0000-4000-8000-000000000001',true);
select set_config('request.jwt.claim.role','authenticated',true);

do $test$
declare
  response jsonb;
  replay jsonb;
  first_instruction uuid;
  acknowledgement_key text;
  membership_id uuid;
  reaccepted_id uuid;
  exit_response jsonb;
begin
  begin
    perform public.join_mpgf_public_goods_compact_v2(
      'future-flourishing', 'mpgf-public-goods-compact/founding-v1',
      '{"voluntaryChoice":true,"exactConstitution":true,"activationAndNoProjectOptOut":true,"noPaymentMandate":true}',
      'qa.join.bad-version'
    );
    raise exception 'A stale constitution version was accepted.';
  exception when check_violation then null;
  end;

  foreach acknowledgement_key in array array[
    'voluntaryChoice', 'exactConstitution',
    'activationAndNoProjectOptOut', 'noPaymentMandate'
  ] loop
    begin
      perform public.join_mpgf_public_goods_compact_v2(
        'future-flourishing', 'mpgf-public-goods-compact/transaction-v2',
        '{"voluntaryChoice":true,"exactConstitution":true,"activationAndNoProjectOptOut":true,"noPaymentMandate":true}'::jsonb - acknowledgement_key,
        'qa.join.missing-' || acknowledgement_key
      );
      raise exception 'Join accepted without acknowledgement %.', acknowledgement_key;
    exception when invalid_parameter_value then null;
    end;
  end loop;

  response := public.join_mpgf_public_goods_compact_v2(
    'future-flourishing', 'mpgf-public-goods-compact/transaction-v2',
    '{"voluntaryChoice":true,"exactConstitution":true,"activationAndNoProjectOptOut":true,"noPaymentMandate":true}',
    'qa.join.future.0001'
  );
  replay := public.join_mpgf_public_goods_compact_v2(
    'future-flourishing', 'mpgf-public-goods-compact/transaction-v2',
    '{"voluntaryChoice":true,"exactConstitution":true,"activationAndNoProjectOptOut":true,"noPaymentMandate":true}',
    'qa.join.future.0001'
  );
  if response <> replay
    or response->>'membershipStatus' <> 'pending_activation'
    or not (response->>'allocationDefaulted')::boolean
    or (response->>'bindingNow')::boolean
    or (response->>'moneyMoved')::boolean
    or (response->>'paymentMandateCreated')::boolean
  then raise exception 'Single-Compact join violated idempotency, default allocation, or no-money boundaries: %', response; end if;
  membership_id := (response->>'membershipId')::uuid;
  if (select acknowledgements from public.mpgf_public_goods_compact_memberships where id = membership_id)
      is distinct from '{"voluntaryChoice":true,"exactConstitution":true,"activationAndNoProjectOptOut":true,"noPaymentMandate":true}'::jsonb
    or (select count(*) from public.mpgf_public_goods_compact_memberships
        where participant_id = auth.uid() and compact_id = '10000000-0000-4000-8000-000000000001') <> 1
  then raise exception 'Acknowledgements or membership were not durably stored exactly once.'; end if;
  begin
    perform public.join_mpgf_public_goods_compact_v2(
      'animal-welfare', 'mpgf-public-goods-compact/transaction-v2',
      '{"voluntaryChoice":true,"exactConstitution":true,"activationAndNoProjectOptOut":true,"noPaymentMandate":true}',
      'qa.join.future.0001'
    );
    raise exception 'A materially different join reused an idempotency key.';
  exception when unique_violation then null;
  end;

  select instruction.id into first_instruction
  from public.mpgf_public_goods_allocation_instructions as instruction
  join public.mpgf_public_goods_allocation_instruction_lines as line on line.instruction_id = instruction.id
  where instruction.participant_id = auth.uid() and line.allocation_bps = 10000;
  if first_instruction is null then raise exception 'Single membership did not default to 100 percent.'; end if;

  perform public.join_mpgf_public_goods_compact_v2(
    'animal-welfare', 'mpgf-public-goods-compact/transaction-v2',
    '{"voluntaryChoice":true,"exactConstitution":true,"activationAndNoProjectOptOut":true,"noPaymentMandate":true}',
    'qa.join.animal.0001'
  );
  begin
    perform public.set_mpgf_public_goods_compact_allocation_v2(
      '{"future-flourishing":10000}', 'qa.allocation.incomplete'
    );
    raise exception 'An incomplete multi-Compact allocation was accepted.';
  exception when check_violation then null;
  end;

  response := public.set_mpgf_public_goods_compact_allocation_v2(
    '{"future-flourishing":3333,"animal-welfare":6667}', 'qa.allocation.complete.0001'
  );
  replay := public.set_mpgf_public_goods_compact_allocation_v2(
    '{"future-flourishing":3333,"animal-welfare":6667}', 'qa.allocation.complete.0002'
  );
  if response->>'instructionId' is distinct from replay->>'instructionId'
    or (response->>'moneyMoved')::boolean
    or (response->>'paymentMandateCreated')::boolean
  then raise exception 'Equivalent complete allocations were not semantically idempotent and no-money: %, %', response, replay; end if;

  select id into reaccepted_id
  from public.mpgf_public_goods_compact_memberships
  where participant_id = auth.uid()
    and compact_id = '10000000-0000-4000-8000-000000000002';
  exit_response := public.request_mpgf_public_goods_compact_exit_v2(
    'animal-welfare', 'qa.exit.recruiting.0001'
  );
  if exit_response->>'membershipStatus' <> 'revoked'
    or not (exit_response->>'revokedImmediately')::boolean
    or (exit_response->>'exitEffectiveAt') is not null
    or (exit_response->>'delegationsRevoked')::integer <> 0
  then raise exception 'Recruiting revocation was not immediate and non-binding: %', exit_response; end if;
  response := public.join_mpgf_public_goods_compact_v2(
    'animal-welfare', 'mpgf-public-goods-compact/transaction-v2',
    '{"voluntaryChoice":true,"exactConstitution":true,"activationAndNoProjectOptOut":true,"noPaymentMandate":true}',
    'qa.join.animal.reaccept.0001'
  );
  if (response->>'membershipId')::uuid <> reaccepted_id
    or response->>'membershipStatus' <> 'pending_activation'
  then raise exception 'Explicit recruiting reacceptance duplicated or failed to restore membership: %', response; end if;

end;
$test$;
reset role;

do $test$
begin
  if (select count(*) from public.mpgf_public_goods_compact_idempotency_keys
      where participant_id = '6a000000-0000-4000-8000-000000000001'
        and action = 'join_v2' and idempotency_key = 'qa.join.future.0001') <> 1
  then raise exception 'Join idempotency was not durably stored exactly once.'; end if;
  begin
    update public.mpgf_public_goods_compacts
    set summary = summary || ' changed'
    where public_key = 'future-flourishing';
    raise exception 'Accepted constitutional terms were mutable.';
  exception when object_not_in_prerequisite_state then null;
  end;
end;
$test$;

set local role authenticated;
select set_config('request.jwt.claim.sub','6a000000-0000-4000-8000-000000000003',true);
select set_config('request.jwt.claim.role','authenticated',true);
do $test$
declare state jsonb;
begin
  if exists (select 1 from public.mpgf_public_goods_compact_memberships) then
    raise exception 'One participant read another participant membership through RLS.';
  end if;
  begin
    perform count(*) from public.mpgf_public_goods_compact_idempotency_keys;
    raise exception 'Authenticated direct idempotency reads bypassed the state RPC.';
  exception when insufficient_privilege then null;
  end;
  state := public.get_mpgf_public_goods_compacts_v2_state();
  if state::text like '%6a000000-0000-4000-8000-000000000001%'
    or exists (
      select 1
      from pg_catalog.jsonb_array_elements(state->'compacts') as compact(value)
      where compact.value->'membership' <> 'null'::jsonb
    )
  then raise exception 'Public state exposed another participant private Compact state.'; end if;
end;
$test$;
reset role;

-- No coverage means no obligation amount.
do $test$
declare response jsonb;
begin
  response := public.freeze_mpgf_public_goods_financial_cycle_v2(
    '6a000000-0000-4000-8000-000000000001', to_char(timezone('UTC', now()), 'YYYY-MM')
  );
  if response->>'state' <> 'unavailable' or (response->>'moneyMoved')::boolean then
    raise exception 'Missing coverage did not fail closed: %', response;
  end if;
end;
$test$;

insert into public.mpgf_public_goods_dormant_authorization_snapshots (
  participant_id, cycle_key, state, provider_reference_hash, authorized_at,
  expires_at, evidence_hash
) values (
  '6a000000-0000-4000-8000-000000000001', to_char(timezone('UTC', now()), 'YYYY-MM'), 'valid',
  'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', now(), now() + interval '2 months',
  'sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'
);
insert into public.mpgf_public_goods_outflow_coverage_snapshots (
  id, participant_id, cycle_key, period_start, period_end_exclusive,
  coverage_status, coverage_reason, source_scope, source_coverage_attested, evidence_hash
)
select '6c000000-0000-4000-8000-000000000001',
  '6a000000-0000-4000-8000-000000000001', to_char(timezone('UTC', now()), 'YYYY-MM'),
  bounds.period_start, bounds.period_end_exclusive, 'complete', 'QA synthetic complete coverage',
  array['authoritative_moral_trade_settlements','refunds_reversals_chargebacks'], true,
  'sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc'
from public.mpgf_public_goods_cycle_bounds_v2(to_char(timezone('UTC', now()), 'YYYY-MM')) as bounds;

insert into public.mpgf_public_goods_outflow_observations (
  coverage_snapshot_id, participant_id, source_system, source_record_key,
  direction, payment_kind, settlement_status, gross_settled_cents,
  refunded_cents, reversed_cents, chargeback_cents, occurred_at, source_event_hash
)
select '6c000000-0000-4000-8000-000000000001',
  '6a000000-0000-4000-8000-000000000001', 'qa', item.source_key,
  item.direction, item.payment_kind, item.settlement_status, item.gross_cents,
  item.refunded_cents, item.reversed_cents, item.chargeback_cents,
  bounds.period_start + interval '1 day', item.event_hash
from public.mpgf_public_goods_cycle_bounds_v2(to_char(timezone('UTC', now()), 'YYYY-MM')) as bounds
cross join (values
  ('eligible','outgoing','moral_trade_payment','settled',12345700::bigint,10::bigint,10::bigint,10::bigint,'sha256:1111111111111111111111111111111111111111111111111111111111111111'),
  ('compact-excluded','outgoing','compact_contribution','settled',99999999::bigint,0::bigint,0::bigint,0::bigint,'sha256:2222222222222222222222222222222222222222222222222222222222222222'),
  ('incoming-excluded','incoming','moral_trade_payment','settled',99999999::bigint,0::bigint,0::bigint,0::bigint,'sha256:3333333333333333333333333333333333333333333333333333333333333333'),
  ('pending-excluded','outgoing','moral_trade_payment','pending',99999999::bigint,0::bigint,0::bigint,0::bigint,'sha256:4444444444444444444444444444444444444444444444444444444444444444')
) as item(source_key,direction,payment_kind,settlement_status,gross_cents,refunded_cents,reversed_cents,chargeback_cents,event_hash);

do $test$
declare response jsonb;
begin
  response := public.freeze_mpgf_public_goods_financial_cycle_v2(
    '6a000000-0000-4000-8000-000000000001', to_char(timezone('UTC', now()), 'YYYY-MM')
  );
  if (response->>'eligibleNetSettledOutflowCents')::bigint <> 12345670
    or (response->>'obligationCents')::bigint <> 1234567
    or (response->>'scheduledTotalCents')::bigint <> 1234567
    or (response->>'obligationCents')::bigint <= 1000
    or (response->>'moneyMoved')::boolean
  then raise exception 'Net-settlement, no-cap, or cent-exact freeze failed: %', response; end if;
  if (select scheduled_contribution_cents from public.mpgf_public_goods_scheduled_amount_snapshots where compact_id = '10000000-0000-4000-8000-000000000001') <> 411481
    or (select scheduled_contribution_cents from public.mpgf_public_goods_scheduled_amount_snapshots where compact_id = '10000000-0000-4000-8000-000000000002') <> 823086
  then raise exception 'Largest-remainder allocation did not use deterministic Compact-key ordering.'; end if;
  begin
    update public.mpgf_public_goods_obligation_snapshots set obligation_cents = 1;
    raise exception 'An immutable obligation snapshot was updated.';
  exception when object_not_in_prerequisite_state then null;
  end;
end;
$test$;

-- 100 synthetic verified people. Every row remains inside the outer rollback.
insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, confirmation_token, recovery_token,
  email_change_token_new, email_change_token_current, reauthentication_token,
  is_sso_user, is_anonymous, created_at, updated_at
)
select ('6b000000-0000-4000-8000-' || lpad(to_hex(person), 12, '0'))::uuid,
  '00000000-0000-0000-0000-000000000000','authenticated','authenticated',
  'compact-v2-' || person || '@example.test','',now(),'{}','{}','','','','','',false,false,now(),now()
from generate_series(1,100) as person;
insert into public.profiles (
  id, email, display_name, bio, affiliation, username, account_kind,
  accepts_group_invitations, public_invitation_mentions_enabled
)
select users.id, users.email, 'Compact V2 ' || person, '', '', 'compact-v2-' || person,
  'individual', true, true
from generate_series(1,100) as person
join auth.users as users on users.id = ('6b000000-0000-4000-8000-' || lpad(to_hex(person), 12, '0'))::uuid
on conflict (id) do update
set email = excluded.email,
    display_name = excluded.display_name,
    bio = excluded.bio,
    affiliation = excluded.affiliation,
    username = excluded.username,
    account_kind = excluded.account_kind,
    accepts_group_invitations = excluded.accepts_group_invitations,
    public_invitation_mentions_enabled = excluded.public_invitation_mentions_enabled;

insert into public.moral_trade_policy_snapshots (
  id, subject_kind, subject_key, version_label, status, snapshot_hash,
  snapshot_payload, approved_at, immutable_after
) values (
  '6f000000-0000-4000-8000-000000000001','participant_eligibility','compact-v2-qa',
  'compact-v2-qa','immutable','sha256:5555555555555555555555555555555555555555555555555555555555555555',
  '{"qaSynthetic":true}',now(),now()
);
insert into public.moral_trade_participant_eligibility_records (
  participant_id, status, identity_verification_status, human_uniqueness_sybil_status,
  legal_capacity_status, sanctions_screening_status, payment_rail_eligibility_status,
  jurisdictional_eligibility_status, source_authentication_status,
  raw_identity_artifact_handling_status, policy_snapshot_id, eligibility_hash,
  evidence_bundle_hash, reviewed_at, expires_at
)
select profile.id, 'eligible','eligible','eligible','eligible','eligible','eligible','eligible','eligible','eligible',
  '6f000000-0000-4000-8000-000000000001',
  'sha256:' || public.mpgf_public_goods_hash_v2(jsonb_build_object('eligibility', profile.id)),
  'sha256:' || public.mpgf_public_goods_hash_v2(jsonb_build_object('evidence', profile.id)),
  now(), now() + interval '2 months'
from public.profiles as profile where profile.email like 'compact-v2-%@example.test';
insert into public.mpgf_public_goods_compact_memberships (
  compact_id, participant_id, constitution_version_accepted, acknowledgements
)
select '10000000-0000-4000-8000-000000000001', profile.id,
  'mpgf-public-goods-compact/transaction-v2',
  '{"voluntaryChoice":true,"exactConstitution":true,"activationAndNoProjectOptOut":true,"noPaymentMandate":true}'
from public.profiles as profile where profile.email like 'compact-v2-%@example.test';
insert into public.mpgf_public_goods_outflow_coverage_snapshots (
  participant_id, cycle_key, period_start, period_end_exclusive, coverage_status,
  coverage_reason, source_scope, source_coverage_attested, evidence_hash
)
select profile.id, to_char(timezone('UTC', now()), 'YYYY-MM'), bounds.period_start,
  bounds.period_end_exclusive, 'complete', 'QA synthetic complete coverage',
  array['authoritative_moral_trade_settlements','refunds_reversals_chargebacks'], true,
  'sha256:' || public.mpgf_public_goods_hash_v2(jsonb_build_object('coverage', profile.id))
from public.profiles as profile
cross join public.mpgf_public_goods_cycle_bounds_v2(to_char(timezone('UTC', now()), 'YYYY-MM')) as bounds
where profile.email like 'compact-v2-%@example.test';
insert into public.mpgf_public_goods_outflow_observations (
  coverage_snapshot_id, participant_id, source_system, source_record_key,
  direction, payment_kind, settlement_status, gross_settled_cents,
  occurred_at, source_event_hash
)
select coverage.id, coverage.participant_id, 'qa', coverage.participant_id::text,
  'outgoing','moral_trade_payment','settled',5000, coverage.period_start + interval '1 day',
  'sha256:' || public.mpgf_public_goods_hash_v2(jsonb_build_object('outflow', coverage.participant_id))
from public.mpgf_public_goods_outflow_coverage_snapshots as coverage
join public.profiles as profile on profile.id = coverage.participant_id
where profile.email like 'compact-v2-%@example.test';
insert into public.mpgf_public_goods_obligation_snapshots (
  participant_id, cycle_key, coverage_snapshot_id, state,
  eligible_net_settled_outflow_cents, obligation_cents, source_observation_count, snapshot_hash
)
select coverage.participant_id, coverage.cycle_key, coverage.id, 'calculated',5000,500,1,
  'sha256:' || public.mpgf_public_goods_hash_v2(jsonb_build_object('obligation', coverage.participant_id))
from public.mpgf_public_goods_outflow_coverage_snapshots as coverage
join public.profiles as profile on profile.id = coverage.participant_id
where profile.email like 'compact-v2-%@example.test';
insert into public.mpgf_public_goods_allocation_instructions (
  participant_id, cycle_key, constitution_version, basis_points_total, instruction_hash
)
select profile.id, to_char(timezone('UTC', now()), 'YYYY-MM'),
  'mpgf-public-goods-compact/transaction-v2',10000,
  'sha256:' || public.mpgf_public_goods_hash_v2(jsonb_build_object('allocation', profile.id))
from public.profiles as profile where profile.email like 'compact-v2-%@example.test';
insert into public.mpgf_public_goods_allocation_instruction_lines (
  instruction_id, membership_id, compact_id, allocation_bps, stable_compact_key
)
select instruction.id, membership.id, membership.compact_id,10000,'future-flourishing'
from public.mpgf_public_goods_allocation_instructions as instruction
join public.mpgf_public_goods_compact_memberships as membership
  on membership.participant_id = instruction.participant_id and membership.compact_id = '10000000-0000-4000-8000-000000000001'
join public.profiles as profile on profile.id = instruction.participant_id
where profile.email like 'compact-v2-%@example.test';
insert into public.mpgf_public_goods_dormant_authorization_snapshots (
  participant_id, cycle_key, state, provider_reference_hash, authorized_at, expires_at, evidence_hash
)
select profile.id, to_char(timezone('UTC', now()), 'YYYY-MM'),'valid',
  'sha256:' || public.mpgf_public_goods_hash_v2(jsonb_build_object('provider', profile.id)),
  now(),now() + interval '2 months',
  'sha256:' || public.mpgf_public_goods_hash_v2(jsonb_build_object('authorization', profile.id))
from public.profiles as profile where profile.email like 'compact-v2-%@example.test';
insert into public.mpgf_public_goods_scheduled_amount_snapshots (
  obligation_snapshot_id, allocation_instruction_id, participant_id, cycle_key,
  membership_id, compact_id, allocation_bps, scheduled_contribution_cents,
  remainder_numerator, largest_remainder_rank, snapshot_hash
)
select obligation.id, instruction.id, membership.participant_id, instruction.cycle_key,
  membership.id, membership.compact_id,10000,500,0,1,
  'sha256:' || public.mpgf_public_goods_hash_v2(jsonb_build_object('schedule', membership.participant_id))
from public.mpgf_public_goods_compact_memberships as membership
join public.profiles as profile on profile.id = membership.participant_id and profile.email like 'compact-v2-%@example.test'
join public.mpgf_public_goods_obligation_snapshots as obligation on obligation.participant_id = membership.participant_id
join public.mpgf_public_goods_allocation_instructions as instruction on instruction.participant_id = membership.participant_id;

insert into public.mpgf_public_goods_funding_qualification_snapshots (
  participant_id, cycle_key, membership_id, compact_id,
  identity_eligibility_record_id, allocation_instruction_id, scheduled_amount_snapshot_id,
  dormant_authorization_snapshot_id, identity_qualified, unique_person_gate_state,
  unique_person_key_hash, allocation_valid, scheduled_contribution_cents,
  qualification_state, snapshot_hash
)
select membership.participant_id, schedule.cycle_key, membership.id, membership.compact_id,
  eligibility.id, instruction.id, schedule.id, dormant_auth.id, true,'verified_unique_person',
  'sha256:' || public.mpgf_public_goods_hash_v2(jsonb_build_object('person', membership.participant_id)),
  true,500,'scheduled_qualified',
  'sha256:' || public.mpgf_public_goods_hash_v2(jsonb_build_object('scheduled-qualified', membership.participant_id))
from public.mpgf_public_goods_compact_memberships as membership
join public.profiles as profile on profile.id = membership.participant_id and profile.email like 'compact-v2-%@example.test'
join public.moral_trade_participant_eligibility_records as eligibility on eligibility.participant_id = membership.participant_id
join public.mpgf_public_goods_allocation_instructions as instruction on instruction.participant_id = membership.participant_id
join public.mpgf_public_goods_scheduled_amount_snapshots as schedule on schedule.membership_id = membership.id
join public.mpgf_public_goods_dormant_authorization_snapshots as dormant_auth on dormant_auth.participant_id = membership.participant_id
where profile.username <> 'compact-v2-100';

do $test$
declare first_freeze jsonb; second_freeze jsonb;
begin
  first_freeze := public.freeze_mpgf_public_goods_readiness_v2(
    '10000000-0000-4000-8000-000000000001', to_char(timezone('UTC', now()), 'YYYY-MM')
  );
  second_freeze := public.freeze_mpgf_public_goods_readiness_v2(
    '10000000-0000-4000-8000-000000000001', to_char(timezone('UTC', now()), 'YYYY-MM')
  );
  if (first_freeze->>'fundingQualifiedUniquePersonCount')::integer <> 99
    or (first_freeze->>'scheduledContributionCents')::bigint <> 49500
    or (first_freeze->>'thresholdReady')::boolean
    or first_freeze->>'readinessSnapshotId' is distinct from second_freeze->>'readinessSnapshotId'
  then raise exception '99-person/$495 readiness or serialized replay boundary failed: %, %', first_freeze, second_freeze; end if;
end;
$test$;

insert into public.mpgf_public_goods_funding_qualification_snapshots (
  participant_id, cycle_key, membership_id, compact_id,
  identity_eligibility_record_id, allocation_instruction_id, scheduled_amount_snapshot_id,
  dormant_authorization_snapshot_id, identity_qualified, unique_person_gate_state,
  unique_person_key_hash, allocation_valid, scheduled_contribution_cents,
  qualification_state, snapshot_hash
)
select membership.participant_id, schedule.cycle_key, membership.id, membership.compact_id,
  eligibility.id, instruction.id, schedule.id, dormant_auth.id, true,'verified_unique_person',
  'sha256:' || public.mpgf_public_goods_hash_v2(jsonb_build_object('person', membership.participant_id)),
  true,500,'scheduled_qualified',
  'sha256:' || public.mpgf_public_goods_hash_v2(jsonb_build_object('scheduled-qualified', membership.participant_id))
from public.mpgf_public_goods_compact_memberships as membership
join public.profiles as profile on profile.id = membership.participant_id and profile.username = 'compact-v2-100'
join public.moral_trade_participant_eligibility_records as eligibility on eligibility.participant_id = membership.participant_id
join public.mpgf_public_goods_allocation_instructions as instruction on instruction.participant_id = membership.participant_id
join public.mpgf_public_goods_scheduled_amount_snapshots as schedule on schedule.membership_id = membership.id
join public.mpgf_public_goods_dormant_authorization_snapshots as dormant_auth on dormant_auth.participant_id = membership.participant_id;

do $test$
declare readiness jsonb;
begin
  readiness := public.freeze_mpgf_public_goods_readiness_v2(
    '10000000-0000-4000-8000-000000000001', to_char(timezone('UTC', now()), 'YYYY-MM')
  );
  if (readiness->>'fundingQualifiedUniquePersonCount')::integer <> 100
    or (readiness->>'scheduledContributionCents')::bigint <> 50000
    or not (readiness->>'thresholdReady')::boolean
    or not (readiness->>'activationBlocked')::boolean
    or (readiness->>'compactActivated')::boolean
  then raise exception '100-person/$500 readiness incorrectly activated or failed: %', readiness; end if;
  if (select status from public.mpgf_public_goods_compacts where id = '10000000-0000-4000-8000-000000000001') <> 'recruiting' then
    raise exception 'Numerical readiness changed Compact status.';
  end if;
end;
$test$;

-- Three settled members exercise the 70/30 formula. QA temporarily bypasses only
-- the repository's activation hard-stop inside this rollback transaction.
insert into public.mpgf_public_goods_settled_contribution_snapshots (
  participant_id, cycle_key, membership_id, compact_id, gross_settled_cents,
  net_settled_cents, settlement_coverage_status, source_event_hash
)
select membership.participant_id, to_char(timezone('UTC', now()), 'YYYY-MM'), membership.id,
  membership.compact_id, contribution.net_cents, contribution.net_cents, 'complete',
  'sha256:' || public.mpgf_public_goods_hash_v2(jsonb_build_object(
    'settlement', membership.participant_id,
    'netCents', contribution.net_cents
  ))
from (values ('compact-v2-1',100::bigint),('compact-v2-2',400::bigint),('compact-v2-3',900::bigint)) as contribution(username,net_cents)
join public.profiles as profile on profile.username = contribution.username
join public.mpgf_public_goods_compact_memberships as membership on membership.participant_id = profile.id and membership.compact_id = '10000000-0000-4000-8000-000000000001';
insert into public.mpgf_public_goods_funding_qualification_snapshots (
  participant_id, cycle_key, membership_id, compact_id, identity_eligibility_record_id,
  allocation_instruction_id, settled_contribution_snapshot_id, identity_qualified,
  unique_person_gate_state, unique_person_key_hash, allocation_valid,
  net_settled_contribution_cents, qualification_state, snapshot_hash, frozen_at
)
select membership.participant_id, settlement.cycle_key, membership.id, membership.compact_id,
  eligibility.id, instruction.id, settlement.id, true,'verified_unique_person',
  'sha256:' || public.mpgf_public_goods_hash_v2(jsonb_build_object('person', membership.participant_id)),
  true,settlement.net_settled_cents,'settled_qualified',
  'sha256:' || public.mpgf_public_goods_hash_v2(jsonb_build_object('settled-qualified', membership.participant_id)),
  now() + interval '1 second'
from public.mpgf_public_goods_settled_contribution_snapshots as settlement
join public.mpgf_public_goods_compact_memberships as membership on membership.id = settlement.membership_id
join public.moral_trade_participant_eligibility_records as eligibility on eligibility.participant_id = membership.participant_id
join public.mpgf_public_goods_allocation_instructions as instruction on instruction.participant_id = membership.participant_id
where membership.compact_id = '10000000-0000-4000-8000-000000000001';

alter table public.mpgf_public_goods_compacts disable trigger mpgf_public_goods_compacts_constitution_freeze_v2;
alter table public.mpgf_public_goods_compacts drop constraint mpgf_public_goods_compacts_activation_execution_disabled;
alter table public.mpgf_public_goods_compacts drop constraint mpgf_public_goods_compacts_active_requires_execution_gate;
update public.mpgf_public_goods_compacts
set status = 'active', activated_at = now(), constitution_frozen_at = now(),
    frozen_constitution_version = constitution_version
where id = '10000000-0000-4000-8000-000000000001';
update public.mpgf_public_goods_compact_memberships
set status = 'active', activated_at = now(), updated_at = now()
where compact_id = '10000000-0000-4000-8000-000000000001';
alter table public.mpgf_public_goods_compacts enable trigger mpgf_public_goods_compacts_constitution_freeze_v2;

do $test$
declare voting jsonb;
begin
  voting := public.freeze_mpgf_public_goods_voting_v2(
    '10000000-0000-4000-8000-000000000001', to_char(timezone('UTC', now()), 'YYYY-MM')
  );
  if (voting->>'qualifiedMemberCount')::integer <> 3
    or (voting->>'totalWeightUnits')::bigint <> 1000000000000
    or (select sum(equal_weight_units) from public.mpgf_public_goods_voting_weight_snapshots where voting_snapshot_id = (voting->>'votingSnapshotId')::uuid) <> 700000000000
    or (select sum(sqrt_contribution_weight_units) from public.mpgf_public_goods_voting_weight_snapshots where voting_snapshot_id = (voting->>'votingSnapshotId')::uuid) <> 300000000000
  then raise exception '70/30 voting pools or exact normalization failed: %', voting; end if;
  if not exists (
    select 1 from public.mpgf_public_goods_voting_weight_snapshots
    where voting_snapshot_id = (voting->>'votingSnapshotId')::uuid
    group by voting_snapshot_id
    having min(total_weight_units) between 283333333333 and 283333333334
      and max(total_weight_units) between 383333333333 and 383333333334
  ) then raise exception 'The $1/$4/$9 square-root example did not match expected weights.'; end if;
end;
$test$;

-- Twenty equal-weight members exercise two-way direct delegation and the 10% rejection boundary.
insert into public.mpgf_public_goods_compact_memberships (
  compact_id, participant_id, constitution_version_accepted, acknowledgements
)
select '10000000-0000-4000-8000-000000000002', profile.id,
  'mpgf-public-goods-compact/transaction-v2',
  '{"voluntaryChoice":true,"exactConstitution":true,"activationAndNoProjectOptOut":true,"noPaymentMandate":true}'
from public.profiles as profile
where profile.username ~ '^compact-v2-([1-9]|1[0-9]|20)$';
insert into public.mpgf_public_goods_allocation_instructions (
  participant_id, cycle_key, constitution_version, basis_points_total, instruction_hash
)
select profile.id, to_char(timezone('UTC', now()), 'YYYY-MM'),
  'mpgf-public-goods-compact/transaction-v2',10000,
  'sha256:' || public.mpgf_public_goods_hash_v2(jsonb_build_object('two-compact-allocation', profile.id))
from public.profiles as profile where profile.username ~ '^compact-v2-([1-9]|1[0-9]|20)$';
insert into public.mpgf_public_goods_allocation_instruction_lines (
  instruction_id, membership_id, compact_id, allocation_bps, stable_compact_key
)
select instruction.id, membership.id, membership.compact_id,5000,compact.public_key
from public.mpgf_public_goods_allocation_instructions as instruction
join public.profiles as profile on profile.id = instruction.participant_id
join public.mpgf_public_goods_compact_memberships as membership on membership.participant_id = profile.id
join public.mpgf_public_goods_compacts as compact on compact.id = membership.compact_id
where profile.username ~ '^compact-v2-([1-9]|1[0-9]|20)$'
  and instruction.instruction_hash = 'sha256:' || public.mpgf_public_goods_hash_v2(jsonb_build_object('two-compact-allocation', profile.id))
  and membership.compact_id in (
    '10000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000002'
  );
insert into public.mpgf_public_goods_settled_contribution_snapshots (
  participant_id, cycle_key, membership_id, compact_id, gross_settled_cents,
  net_settled_cents, settlement_coverage_status, source_event_hash
)
select membership.participant_id,to_char(timezone('UTC', now()), 'YYYY-MM'),membership.id,
  membership.compact_id,100,100,'complete',
  'sha256:' || public.mpgf_public_goods_hash_v2(jsonb_build_object('animal-settlement', membership.participant_id))
from public.mpgf_public_goods_compact_memberships as membership
join public.profiles as profile on profile.id = membership.participant_id
where membership.compact_id = '10000000-0000-4000-8000-000000000002'
  and profile.username ~ '^compact-v2-([1-9]|1[0-9]|20)$';
insert into public.mpgf_public_goods_funding_qualification_snapshots (
  participant_id, cycle_key, membership_id, compact_id, identity_eligibility_record_id,
  allocation_instruction_id, settled_contribution_snapshot_id, identity_qualified,
  unique_person_gate_state, unique_person_key_hash, allocation_valid,
  net_settled_contribution_cents, qualification_state, snapshot_hash, frozen_at
)
select membership.participant_id, settlement.cycle_key, membership.id, membership.compact_id,
  eligibility.id, instruction.id, settlement.id,true,'verified_unique_person',
  'sha256:' || public.mpgf_public_goods_hash_v2(jsonb_build_object('person', membership.participant_id)),
  true,100,'settled_qualified',
  'sha256:' || public.mpgf_public_goods_hash_v2(jsonb_build_object('animal-qualified', membership.participant_id)),
  now() + interval '2 seconds'
from public.mpgf_public_goods_settled_contribution_snapshots as settlement
join public.mpgf_public_goods_compact_memberships as membership on membership.id = settlement.membership_id
join public.profiles as profile on profile.id = membership.participant_id and profile.username ~ '^compact-v2-([1-9]|1[0-9]|20)$'
join public.moral_trade_participant_eligibility_records as eligibility on eligibility.participant_id = membership.participant_id
join public.mpgf_public_goods_allocation_instructions as instruction on instruction.participant_id = membership.participant_id
join public.mpgf_public_goods_allocation_instruction_lines as allocation_line
  on allocation_line.instruction_id = instruction.id and allocation_line.membership_id = membership.id
where membership.compact_id = '10000000-0000-4000-8000-000000000002';

alter table public.mpgf_public_goods_compacts disable trigger mpgf_public_goods_compacts_constitution_freeze_v2;
update public.mpgf_public_goods_compacts
set status = 'active', activated_at = now(), constitution_frozen_at = now(),
    frozen_constitution_version = constitution_version
where id = '10000000-0000-4000-8000-000000000002';
update public.mpgf_public_goods_compact_memberships
set status = 'active', activated_at = now(), updated_at = now()
where compact_id = '10000000-0000-4000-8000-000000000002';
alter table public.mpgf_public_goods_compacts enable trigger mpgf_public_goods_compacts_constitution_freeze_v2;
select public.freeze_mpgf_public_goods_voting_v2(
  '10000000-0000-4000-8000-000000000002', to_char(timezone('UTC', now()), 'YYYY-MM')
);

alter table public.mpgf_public_goods_compacts disable trigger mpgf_public_goods_compacts_constitution_freeze_v2;
update public.mpgf_public_goods_compacts
set status = 'active', activated_at = now(), constitution_frozen_at = now(),
    frozen_constitution_version = constitution_version
where id = '10000000-0000-4000-8000-000000000003';
alter table public.mpgf_public_goods_compacts enable trigger mpgf_public_goods_compacts_constitution_freeze_v2;

set local role authenticated;
do $test$
declare
  membership_a uuid;
  membership_b uuid;
  membership_b_other_compact uuid;
  membership_c uuid;
  membership_d uuid;
  clear_response jsonb;
  clear_replay jsonb;
  exit_response jsonb;
  exit_replay jsonb;
  repeated_exit jsonb;
  first_effective timestamptz;
  requested_at timestamptz;
  activated_at timestamptz;
begin
  perform set_config('request.jwt.claim.sub','6b000000-0000-4000-8000-000000000001',true);
  select membership.id into membership_a from public.mpgf_public_goods_compact_memberships as membership join public.profiles as profile on profile.id = membership.participant_id where profile.username = 'compact-v2-1' and membership.compact_id = '10000000-0000-4000-8000-000000000002';
  perform set_config('request.jwt.claim.sub','6b000000-0000-4000-8000-000000000002',true);
  select membership.id into membership_b from public.mpgf_public_goods_compact_memberships as membership join public.profiles as profile on profile.id = membership.participant_id where profile.username = 'compact-v2-2' and membership.compact_id = '10000000-0000-4000-8000-000000000002';
  select membership.id into membership_b_other_compact from public.mpgf_public_goods_compact_memberships as membership join public.profiles as profile on profile.id = membership.participant_id where profile.username = 'compact-v2-2' and membership.compact_id = '10000000-0000-4000-8000-000000000001';
  perform set_config('request.jwt.claim.sub','6b000000-0000-4000-8000-000000000003',true);
  select membership.id into membership_c from public.mpgf_public_goods_compact_memberships as membership join public.profiles as profile on profile.id = membership.participant_id where profile.username = 'compact-v2-3' and membership.compact_id = '10000000-0000-4000-8000-000000000002';
  perform set_config('request.jwt.claim.sub','6b000000-0000-4000-8000-000000000004',true);
  select membership.id into membership_d from public.mpgf_public_goods_compact_memberships as membership join public.profiles as profile on profile.id = membership.participant_id where profile.username = 'compact-v2-4' and membership.compact_id = '10000000-0000-4000-8000-000000000002';

  perform set_config('request.jwt.claim.sub','6b000000-0000-4000-8000-000000000001',true);
  begin
    perform public.set_mpgf_public_goods_compact_delegation_v2('animal-welfare',to_char(timezone('UTC', now()), 'YYYY-MM'),membership_a,'qa.delegation.self-denied');
    raise exception 'Self-delegation was accepted.';
  exception when check_violation then null;
  end;
  begin
    perform public.set_mpgf_public_goods_compact_delegation_v2('animal-welfare',to_char(timezone('UTC', now()), 'YYYY-MM'),membership_b_other_compact,'qa.delegation.cross-compact-denied');
    raise exception 'Cross-Compact delegation was accepted.';
  exception when foreign_key_violation then null;
  end;
  begin
    perform public.set_mpgf_public_goods_compact_delegation_v2('global-health',to_char(timezone('UTC', now()), 'YYYY-MM'),membership_b,'qa.delegation.no-electorate-denied');
    raise exception 'An active Compact without a frozen electorate accepted delegation.';
  exception when object_not_in_prerequisite_state then null;
  end;
  perform public.set_mpgf_public_goods_compact_delegation_v2('animal-welfare',to_char(timezone('UTC', now()), 'YYYY-MM'),membership_b,'qa.delegation.a-to-b');
  perform set_config('request.jwt.claim.sub','6b000000-0000-4000-8000-000000000002',true);
  perform public.set_mpgf_public_goods_compact_delegation_v2('animal-welfare',to_char(timezone('UTC', now()), 'YYYY-MM'),membership_a,'qa.delegation.b-to-a');
  perform set_config('request.jwt.claim.sub','6b000000-0000-4000-8000-000000000003',true);
  perform public.set_mpgf_public_goods_compact_delegation_v2('animal-welfare',to_char(timezone('UTC', now()), 'YYYY-MM'),membership_b,'qa.delegation.c-to-b');
  clear_response := public.clear_mpgf_public_goods_compact_delegation_v2('animal-welfare',to_char(timezone('UTC', now()), 'YYYY-MM'),'qa.delegation.c-clear');
  clear_replay := public.clear_mpgf_public_goods_compact_delegation_v2('animal-welfare',to_char(timezone('UTC', now()), 'YYYY-MM'),'qa.delegation.c-clear');
  if clear_response <> clear_replay
    or clear_response->>'delegationState' <> 'revoked'
    or (clear_response->>'membershipTransferred')::boolean
    or (clear_response->>'moneyTransferred')::boolean
    or (clear_response->>'reputationTransferred')::boolean
  then raise exception 'Delegation clear was not replay-safe and transfer-free: %, %', clear_response, clear_replay; end if;
  perform public.set_mpgf_public_goods_compact_delegation_v2('animal-welfare',to_char(timezone('UTC', now()), 'YYYY-MM'),membership_b,'qa.delegation.c-to-b-again');
  perform set_config('request.jwt.claim.sub','6b000000-0000-4000-8000-000000000004',true);
  begin
    perform public.set_mpgf_public_goods_compact_delegation_v2('animal-welfare',to_char(timezone('UTC', now()), 'YYYY-MM'),membership_b,'qa.delegation.d-to-b');
    raise exception 'A delegation exceeding 10 percent was accepted.';
  exception when check_violation then null;
  end;

  perform set_config('request.jwt.claim.sub','6a000000-0000-4000-8000-000000000003',true);
  begin
    perform public.set_mpgf_public_goods_compact_delegation_v2('animal-welfare',to_char(timezone('UTC', now()), 'YYYY-MM'),membership_b,'qa.delegation.nonmember-denied');
    raise exception 'A nonmember delegated frozen electorate weight.';
  exception when insufficient_privilege then null;
  end;

  perform set_config('request.jwt.claim.sub','6b000000-0000-4000-8000-000000000001',true);
  exit_response := public.request_mpgf_public_goods_compact_exit_v2('animal-welfare','qa.exit.active.0001');
  exit_replay := public.request_mpgf_public_goods_compact_exit_v2('animal-welfare','qa.exit.active.0001');
  first_effective := (exit_response->>'exitEffectiveAt')::timestamptz;
  select membership.exit_requested_at, membership.activated_at
  into requested_at, activated_at
  from public.mpgf_public_goods_compact_memberships as membership
  where membership.id = membership_a;
  if exit_response <> exit_replay
    or exit_response->>'membershipStatus' <> 'exit_notice'
    or (exit_response->>'delegationsRevoked')::integer <> 2
    or first_effective < activated_at + interval '12 months'
    or first_effective < requested_at + interval '30 days'
  then raise exception 'Active exit was not prospective, replay-safe, or atomic: %, %', exit_response, exit_replay; end if;
  repeated_exit := public.request_mpgf_public_goods_compact_exit_v2('animal-welfare','qa.exit.active.0002');
  if (repeated_exit->>'exitEffectiveAt')::timestamptz <> first_effective
    or (repeated_exit->>'delegationsRevoked')::integer <> 0
  then raise exception 'Repeated exit shortened the date or duplicated revocations: %', repeated_exit; end if;
  begin
    perform public.set_mpgf_public_goods_compact_delegation_v2('animal-welfare',to_char(timezone('UTC', now()), 'YYYY-MM'),membership_b,'qa.delegation.inactive-delegator-denied');
    raise exception 'An inactive member delegated.';
  exception when insufficient_privilege then null;
  end;
  perform set_config('request.jwt.claim.sub','6b000000-0000-4000-8000-000000000002',true);
  begin
    perform public.set_mpgf_public_goods_compact_delegation_v2('animal-welfare',to_char(timezone('UTC', now()), 'YYYY-MM'),membership_a,'qa.delegation.inactive-delegatee-denied');
    raise exception 'An inactive member received delegation.';
  exception when foreign_key_violation then null;
  end;
end;
$test$;
reset role;

do $test$
declare voting_id uuid; delegation jsonb;
begin
  select id into voting_id from public.mpgf_public_goods_voting_snapshots
  where compact_id = '10000000-0000-4000-8000-000000000002'
  order by frozen_at desc limit 1;
  delegation := public.freeze_mpgf_public_goods_delegations_v2(voting_id);
  if (select sum(controlled_weight_units) from public.mpgf_public_goods_delegation_weight_snapshots where delegation_snapshot_id = (delegation->>'delegationSnapshotId')::uuid) <> 1000000000000
  then raise exception 'Delegation snapshot lost or double-counted electorate weight.'; end if;
  if exists (
    select 1 from public.mpgf_public_goods_delegation_weight_snapshots as weight
    join public.profiles as profile on profile.id = weight.participant_id
    where weight.delegation_snapshot_id = (delegation->>'delegationSnapshotId')::uuid
      and profile.username = 'compact-v2-1' and weight.delegated_to_membership_id is not null
  ) or exists (
    select 1 from public.mpgf_public_goods_delegation_weight_snapshots as weight
    join public.profiles as profile on profile.id = weight.participant_id
    where weight.delegation_snapshot_id = (delegation->>'delegationSnapshotId')::uuid
      and profile.username = 'compact-v2-2' and weight.delegated_to_membership_id is not null
  ) or not exists (
    select 1 from public.mpgf_public_goods_delegation_weight_snapshots as weight
    join public.profiles as profile on profile.id = weight.participant_id
    where weight.delegation_snapshot_id = (delegation->>'delegationSnapshotId')::uuid
      and profile.username = 'compact-v2-3' and weight.delegated_to_membership_id is not null
  ) then raise exception 'Exit revocations or the remaining direct delegation were not preserved.'; end if;
end;
$test$;

do $test$
declare
  relation_name text;
  baseline_count bigint;
  observed_count bigint;
begin
  for relation_name, baseline_count in
    select baseline.relation_name, baseline.row_count
    from mpgf_public_goods_money_baseline as baseline
  loop
    execute pg_catalog.format('select count(*) from public.%I', relation_name)
      into observed_count;
    if observed_count <> baseline_count then
      raise exception 'Compact lifecycle changed payment-adjacent table % from % rows to % rows.',
        relation_name, baseline_count, observed_count;
    end if;
  end loop;
end;
$test$;

select 'Compact v2 lifecycle, transaction arithmetic, readiness, voting, and delegation QA passed inside rollback.' as result;
