-- Executed inside a workflow-owned transaction and rolled back.
\set ON_ERROR_STOP on
\set VERBOSITY verbose
\echo ledger-core:start

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, confirmation_token, recovery_token,
  email_change_token_new, email_change_token_current, reauthentication_token,
  is_sso_user, is_anonymous, created_at, updated_at
) values
  ('6b000000-0000-4000-8000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','ledger-a@example.test','',now(),'{}','{}','','','','','',false,false,now(),now()),
  ('6b000000-0000-4000-8000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','ledger-zero@example.test','',now(),'{}','{}','','','','','',false,false,now(),now()),
  ('6b000000-0000-4000-8000-000000000003','00000000-0000-0000-0000-000000000000','authenticated','authenticated','ledger-incomplete@example.test','',now(),'{}','{}','','','','','',false,false,now(),now()),
  ('6b000000-0000-4000-8000-000000000004','00000000-0000-0000-0000-000000000000','authenticated','authenticated','ledger-eur@example.test','',now(),'{}','{}','','','','','',false,false,now(),now()),
  ('6b000000-0000-4000-8000-000000000005','00000000-0000-0000-8000-000000000000','authenticated','authenticated','ledger-prod@example.test','',now(),'{}','{}','','','','','',false,false,now(),now());
\echo ledger-core:auth-users-inserted

insert into public.profiles (
  id, email, display_name, bio, affiliation, username, account_kind,
  accepts_group_invitations, public_invitation_mentions_enabled
) values
  ('6b000000-0000-4000-8000-000000000001','ledger-a@example.test','Ledger A','','','ledger-a','individual',true,true),
  ('6b000000-0000-4000-8000-000000000002','ledger-zero@example.test','Ledger Zero','','','ledger-zero','individual',true,true),
  ('6b000000-0000-4000-8000-000000000003','ledger-incomplete@example.test','Ledger Incomplete','','','ledger-incomplete','individual',true,true),
  ('6b000000-0000-4000-8000-000000000004','ledger-eur@example.test','Ledger EUR','','','ledger-eur','individual',true,true),
  ('6b000000-0000-4000-8000-000000000005','ledger-prod@example.test','Ledger Prod','','','ledger-prod','individual',true,true)
on conflict (id) do update set
  email = excluded.email,
  display_name = excluded.display_name,
  bio = excluded.bio,
  affiliation = excluded.affiliation,
  username = excluded.username,
  account_kind = excluded.account_kind,
  accepts_group_invitations = excluded.accepts_group_invitations,
  public_invitation_mentions_enabled = excluded.public_invitation_mentions_enabled;
\echo ledger-core:profiles-inserted

create temporary table compact_outflow_test_ids (
  key text primary key,
  value uuid not null
) on commit drop;

grant select, insert, update, delete
on table compact_outflow_test_ids
to service_role;

set local role service_role;
select pg_catalog.set_config('request.jwt.claims', '{"role":"service_role"}', true);

insert into compact_outflow_test_ids values (
  'batch-a',
  moral_trade_private.compact_outflow_ingest_batch_v1(
    '6b000000-0000-4000-8000-000000000001','2026-08','qa','USD',
    'compact-authoritative-outflow-ledger/v1','qa.ledger.batch.a.0001'
  )
);

insert into compact_outflow_test_ids
select 'a1', (moral_trade_private.record_compact_outflow_event_v1(
  (select value from compact_outflow_test_ids where key='batch-a'),
  'qa_authoritative_synthetic','payment-a','outgoing','moral_trade_payment','settled',
  10000,0,0,0,'2026-07-05T12:00:00Z','2026-07-05T12:01:00Z',
  'qa-v1',1,'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  null,true
)->>'observationId')::uuid;

insert into compact_outflow_test_ids
select 'a2', (moral_trade_private.record_compact_outflow_event_v1(
  (select value from compact_outflow_test_ids where key='batch-a'),
  'qa_authoritative_synthetic','payment-a','outgoing','moral_trade_payment','settled',
  10000,2000,0,0,'2026-07-05T12:00:00Z','2026-07-20T12:00:00Z',
  'qa-v1',2,'sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
  (select value from compact_outflow_test_ids where key='a1'),true
)->>'observationId')::uuid;

insert into compact_outflow_test_ids
select 'b1', (moral_trade_private.record_compact_outflow_event_v1(
  (select value from compact_outflow_test_ids where key='batch-a'),
  'qa_authoritative_synthetic','payment-b','outgoing','moral_trade_payment','settled',
  5000,0,1000,0,'2026-07-10T12:00:00Z','2026-07-11T12:00:00Z',
  'qa-v1',1,'sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc',
  null,true
)->>'observationId')::uuid;

insert into compact_outflow_test_ids
select 'c1', (moral_trade_private.record_compact_outflow_event_v1(
  (select value from compact_outflow_test_ids where key='batch-a'),
  'qa_authoritative_synthetic','payment-c','outgoing','moral_trade_payment','settled',
  7000,0,0,3000,'2026-07-15T12:00:00Z','2026-07-16T12:00:00Z',
  'qa-v1',1,'sha256:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd',
  null,true
)->>'observationId')::uuid;

select moral_trade_private.record_compact_outflow_event_v1(
  (select value from compact_outflow_test_ids where key='batch-a'),
  'qa_authoritative_synthetic','compact-contribution','outgoing','compact_contribution','settled',
  9000,0,0,0,'2026-07-18T12:00:00Z','2026-07-18T12:01:00Z',
  'qa-v1',1,'sha256:eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',null,true
);
select moral_trade_private.record_compact_outflow_event_v1(
  (select value from compact_outflow_test_ids where key='batch-a'),
  'qa_authoritative_synthetic','internal-transfer','internal','moral_trade_payment','settled',
  9000,0,0,0,'2026-07-18T12:00:00Z','2026-07-18T12:01:00Z',
  'qa-v1',1,'sha256:ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',null,true
);
select moral_trade_private.record_compact_outflow_event_v1(
  (select value from compact_outflow_test_ids where key='batch-a'),
  'qa_authoritative_synthetic','incoming','incoming','moral_trade_payment','settled',
  9000,0,0,0,'2026-07-18T12:00:00Z','2026-07-18T12:01:00Z',
  'qa-v1',1,'sha256:1111111111111111111111111111111111111111111111111111111111111111',null,true
);
select moral_trade_private.record_compact_outflow_event_v1(
  (select value from compact_outflow_test_ids where key='batch-a'),
  'qa_authoritative_synthetic','pending','outgoing','moral_trade_payment','pending',
  9000,0,0,0,'2026-07-18T12:00:00Z',null,
  'qa-v1',0,'sha256:2222222222222222222222222222222222222222222222222222222222222222',null,true
);
select moral_trade_private.record_compact_outflow_event_v1(
  (select value from compact_outflow_test_ids where key='batch-a'),
  'qa_authoritative_synthetic','failed','outgoing','moral_trade_payment','failed',
  9000,0,0,0,'2026-07-18T12:00:00Z',null,
  'qa-v1',0,'sha256:3333333333333333333333333333333333333333333333333333333333333333',null,true
);

do $test$
declare replay jsonb;
begin
  replay := moral_trade_private.record_compact_outflow_event_v1(
    (select value from compact_outflow_test_ids where key='batch-a'),
    'qa_authoritative_synthetic','payment-b','outgoing','moral_trade_payment','settled',
    5000,0,1000,0,'2026-07-10T12:00:00Z','2026-07-11T12:00:00Z',
    'qa-v1',1,'sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc',null,true
  );
  if replay->>'status' <> 'replayed'
     or (replay->>'observationId')::uuid <> (select value from compact_outflow_test_ids where key='b1') then
    raise exception 'Exact event replay was not idempotent.';
  end if;
end;
$test$;

do $test$
begin
  begin
    perform moral_trade_private.record_compact_outflow_event_v1(
      (select value from compact_outflow_test_ids where key='batch-a'),
      'qa_authoritative_synthetic','payment-a','outgoing','moral_trade_payment','settled',
      10000,1000,0,0,'2026-07-05T12:00:00Z','2026-07-21T12:00:00Z',
      'qa-v1',2,'sha256:4444444444444444444444444444444444444444444444444444444444444444',
      (select value from compact_outflow_test_ids where key='a1'),true
    );
    raise exception 'Out-of-order supersession was accepted.';
  exception when check_violation then null;
  end;
end;
$test$;

insert into compact_outflow_test_ids
select 'coverage-a', (moral_trade_private.freeze_compact_outflow_coverage_v1(
  (select value from compact_outflow_test_ids where key='batch-a'),
  'complete','Synthetic QA coverage complete through the exact prior UTC month.',
  '2026-08-01T00:00:00Z',
  '[{"adapter_key":"qa_authoritative_synthetic","disposition":"complete","source_watermark":"qa:2026-08-01","evidence_hash":"sha256:5555555555555555555555555555555555555555555555555555555555555555"}]'::jsonb,
  'qa.ledger.coverage.a.0001'
)->>'coverageSnapshotId')::uuid;

do $test$
declare result jsonb;
begin
  result := public.freeze_mpgf_public_goods_financial_cycle_v2(
    '6b000000-0000-4000-8000-000000000001','2026-08'
  );
  if result->>'authorityStatus' <> 'complete'
     or (result->>'eligibleNetSettledOutflowCents')::bigint <> 16000
     or (result->>'obligationCents')::bigint <> 1600
     or (result->>'moneyMoved')::boolean
     or (result->>'paymentMandateCreated')::boolean then
    raise exception 'Complete coverage did not produce the exact shadow-only amount: %', result;
  end if;
end;
$test$;

insert into compact_outflow_test_ids values (
  'batch-zero',
  moral_trade_private.compact_outflow_ingest_batch_v1(
    '6b000000-0000-4000-8000-000000000002','2026-08','qa','USD',
    'compact-authoritative-outflow-ledger/v1','qa.ledger.batch.zero.0001'
  )
);
select moral_trade_private.freeze_compact_outflow_coverage_v1(
  (select value from compact_outflow_test_ids where key='batch-zero'),
  'complete','Every required QA adapter proves complete zero coverage.',
  '2026-08-01T00:00:00Z',
  '[{"adapter_key":"qa_authoritative_synthetic","disposition":"complete","source_watermark":"qa:zero","evidence_hash":"sha256:6666666666666666666666666666666666666666666666666666666666666666"}]'::jsonb,
  'qa.ledger.coverage.zero.0001'
);
do $test$
declare result jsonb;
begin
  result := public.freeze_mpgf_public_goods_financial_cycle_v2(
    '6b000000-0000-4000-8000-000000000002','2026-08'
  );
  if (result->>'eligibleNetSettledOutflowCents')::bigint <> 0
     or (result->>'obligationCents')::bigint <> 0 then
    raise exception 'Proven complete zero was not preserved: %', result;
  end if;
end;
$test$;

insert into compact_outflow_test_ids values (
  'batch-incomplete',
  moral_trade_private.compact_outflow_ingest_batch_v1(
    '6b000000-0000-4000-8000-000000000003','2026-08','qa','USD',
    'compact-authoritative-outflow-ledger/v1','qa.ledger.batch.incomplete.0001'
  )
);
select moral_trade_private.freeze_compact_outflow_coverage_v1(
  (select value from compact_outflow_test_ids where key='batch-incomplete'),
  'incomplete','The QA source watermark is missing.',
  '2026-08-01T00:00:00Z',
  '[{"adapter_key":"qa_authoritative_synthetic","disposition":"incomplete","source_watermark":"","evidence_hash":"sha256:7777777777777777777777777777777777777777777777777777777777777777"}]'::jsonb,
  'qa.ledger.coverage.incomplete.0001'
);
do $test$
declare result jsonb;
begin
  result := public.freeze_mpgf_public_goods_financial_cycle_v2(
    '6b000000-0000-4000-8000-000000000003','2026-08'
  );
  if result->>'obligationState' <> 'unavailable'
     or result->>'eligibleNetSettledOutflowCents' is not null
     or result->>'obligationCents' is not null then
    raise exception 'Incomplete coverage fabricated a zero or amount: %', result;
  end if;
end;
$test$;

insert into compact_outflow_test_ids values (
  'batch-eur',
  moral_trade_private.compact_outflow_ingest_batch_v1(
    '6b000000-0000-4000-8000-000000000004','2026-08','qa','EUR',
    'compact-authoritative-outflow-ledger/v1','qa.ledger.batch.eur.0001'
  )
);
do $test$
begin
  begin
    perform moral_trade_private.freeze_compact_outflow_coverage_v1(
      (select value from compact_outflow_test_ids where key='batch-eur'),
      'complete','Should be rejected for non-USD authority.',
      '2026-08-01T00:00:00Z',
      '[{"adapter_key":"qa_authoritative_synthetic","disposition":"complete","source_watermark":"qa:eur","evidence_hash":"sha256:8888888888888888888888888888888888888888888888888888888888888888"}]'::jsonb,
      'qa.ledger.coverage.eur.0001'
    );
    raise exception 'Mixed/non-USD complete coverage was accepted.';
  exception when check_violation then null;
  end;
end;
$test$;

insert into compact_outflow_test_ids values (
  'batch-prod',
  moral_trade_private.compact_outflow_ingest_batch_v1(
    '6b000000-0000-4000-8000-000000000005','2026-08','production','USD',
    'compact-authoritative-outflow-ledger/v1','qa.ledger.batch.prod.0001'
  )
);
do $test$
begin
  begin
    perform moral_trade_private.record_compact_outflow_event_v1(
      (select value from compact_outflow_test_ids where key='batch-prod'),
      'core_trade_external_payment_evidence','prod-payment','outgoing','moral_trade_payment','settled',
      1000,0,0,0,'2026-07-01T12:00:00Z','2026-07-01T12:01:00Z',
      'prod-v1',1,'sha256:9999999999999999999999999999999999999999999999999999999999999999',null,true
    );
    raise exception 'Synthetic production fact was accepted.';
  exception when check_violation then null;
  end;
end;
$test$;

insert into compact_outflow_test_ids values (
  'batch-late',
  moral_trade_private.compact_outflow_ingest_batch_v1(
    '6b000000-0000-4000-8000-000000000001','2026-08','qa','USD',
    'compact-authoritative-outflow-ledger/v1','qa.ledger.batch.a.late.0002'
  )
);
insert into compact_outflow_test_ids
select 'a3', (moral_trade_private.record_compact_outflow_event_v1(
  (select value from compact_outflow_test_ids where key='batch-late'),
  'qa_authoritative_synthetic','payment-a','outgoing','moral_trade_payment','settled',
  10000,10000,0,0,'2026-07-05T12:00:00Z','2026-08-02T12:00:00Z',
  'qa-v1',3,'sha256:abababababababababababababababababababababababababababababababab',
  (select value from compact_outflow_test_ids where key='a2'),true
)->>'observationId')::uuid;
select moral_trade_private.freeze_compact_outflow_coverage_v1(
  (select value from compact_outflow_test_ids where key='batch-late'),
  'complete','Late full refund reconciled in a superseding coverage snapshot.',
  '2026-08-03T00:00:00Z',
  '[{"adapter_key":"qa_authoritative_synthetic","disposition":"complete","source_watermark":"qa:2026-08-03","evidence_hash":"sha256:cdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcd"}]'::jsonb,
  'qa.ledger.coverage.a.late.0002'
);
do $test$
declare result jsonb; latest public.mpgf_public_goods_obligation_snapshots%rowtype;
begin
  result := public.freeze_mpgf_public_goods_financial_cycle_v2(
    '6b000000-0000-4000-8000-000000000001','2026-08'
  );
  if (result->>'eligibleNetSettledOutflowCents')::bigint <> 8000
     or (result->>'obligationCents')::bigint <> 800 then
    raise exception 'Late adjustment was not reflected in the superseding amount: %', result;
  end if;
  select * into latest from public.mpgf_public_goods_obligation_snapshots
  where participant_id='6b000000-0000-4000-8000-000000000001' and cycle_key='2026-08'
  order by frozen_at desc, id desc limit 1;
  if latest.supersedes_id is null then
    raise exception 'Late adjustment did not preserve explicit obligation supersession.';
  end if;
end;
$test$;

reset role;
set local role authenticated;
select pg_catalog.set_config(
  'request.jwt.claims',
  '{"sub":"6b000000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal2"}',
  true
);
do $test$
declare state jsonb;
begin
  state := public.get_mpgf_public_goods_compacts_v2_state();
  if state#>>'{obligation,coverage}' <> 'complete'
     or (state#>>'{obligation,eligibleNetSettledOutflowCents}')::bigint <> 8000
     or (state#>>'{obligation,obligationCents}')::bigint <> 800
     or state::text ~ 'source_record_key|canonical_event_hash|source_watermark|provider_reference' then
    raise exception 'Self-scoped public state is incorrect or leaks private source detail: %', state;
  end if;
end;
$test$;

select pg_catalog.set_config(
  'request.jwt.claims',
  '{"sub":"6b000000-0000-4000-8000-000000000002","role":"authenticated","aal":"aal2"}',
  true
);
do $test$
declare state jsonb;
begin
  state := public.get_mpgf_public_goods_compacts_v2_state();
  if state#>>'{obligation,coverage}' <> 'complete'
     or (state#>>'{obligation,eligibleNetSettledOutflowCents}')::bigint <> 0
     or (state#>>'{obligation,obligationCents}')::bigint <> 0
     or (state#>'{obligation}')::text ~ 'payment-a|payment-b|payment-c|source_record_key|canonical_event_hash|source_watermark|provider_reference' then
    raise exception 'Cross-user aggregate or source detail leaked: %', state;
  end if;
end;
$test$;

reset role;
