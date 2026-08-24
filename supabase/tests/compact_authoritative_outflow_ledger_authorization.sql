-- Executed inside a workflow-owned transaction and rolled back.
\set ON_ERROR_STOP on

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, confirmation_token, recovery_token,
  email_change_token_new, email_change_token_current, reauthentication_token,
  is_sso_user, is_anonymous, created_at, updated_at
) values
  ('6c000000-0000-4000-8000-000000000001','00000000-0000-0000-8000-000000000000','authenticated','authenticated','ledger-admin@example.test','',now(),'{}','{}','','','','','',false,false,now(),now()),
  ('6c000000-0000-4000-8000-000000000002','00000000-0000-0000-8000-000000000000','authenticated','authenticated','ledger-user@example.test','',now(),'{}','{}','','','','','',false,false,now(),now());

insert into public.profiles (
  id, email, display_name, bio, affiliation, username, account_kind,
  accepts_group_invitations, public_invitation_mentions_enabled
) values
  ('6c000000-0000-4000-8000-000000000001','ledger-admin@example.test','Ledger Admin','','','ledger-admin','individual',true,true),
  ('6c000000-0000-4000-8000-000000000002','ledger-user@example.test','Ledger User','','','ledger-user','individual',true,true)
on conflict (id) do update set
  email = excluded.email,
  display_name = excluded.display_name,
  bio = excluded.bio,
  affiliation = excluded.affiliation,
  username = excluded.username,
  account_kind = excluded.account_kind,
  accepts_group_invitations = excluded.accepts_group_invitations,
  public_invitation_mentions_enabled = excluded.public_invitation_mentions_enabled;

insert into public.trade_review_role_grants (
  profile_id, role, active, granted_by, granted_at
) values (
  '6c000000-0000-4000-8000-000000000001','administrator',true,
  '6c000000-0000-4000-8000-000000000001',now()
);

set local role anon;
do $test$
begin
  begin
    perform count(*) from moral_trade_private.compact_outflow_event_metadata;
    raise exception 'Anonymous role read private outflow metadata.';
  exception when insufficient_privilege then null;
  end;
  begin
    perform moral_trade_private.compact_outflow_ingest_batch_v1(
      '6c000000-0000-4000-8000-000000000002','2026-08','qa','USD','v1','qa.auth.anon.denied'
    );
    raise exception 'Anonymous role executed an operator function.';
  exception when insufficient_privilege then null;
  end;
end;
$test$;
reset role;

set local role authenticated;
select pg_catalog.set_config(
  'request.jwt.claims',
  '{"sub":"6c000000-0000-4000-8000-000000000002","role":"authenticated","aal":"aal2"}',
  true
);
do $test$
begin
  begin
    perform count(*) from moral_trade_private.compact_outflow_coverage_metadata;
    raise exception 'Authenticated role read private coverage metadata.';
  exception when insufficient_privilege then null;
  end;
  begin
    perform moral_trade_private.compact_outflow_ingest_batch_v1(
      '6c000000-0000-4000-8000-000000000002','2026-08','qa','USD',
      'compact-authoritative-outflow-ledger/v1','qa.auth.nonadmin.denied'
    );
    raise exception 'AAL2 non-administrator executed an operator function.';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.mpgf_public_goods_outflow_observations (
      coverage_snapshot_id, participant_id, source_system, source_record_key,
      direction, payment_kind, settlement_status, gross_settled_cents,
      refunded_cents, reversed_cents, chargeback_cents, occurred_at,
      source_event_hash
    ) values (
      gen_random_uuid(),'6c000000-0000-4000-8000-000000000002','forged','forged',
      'outgoing','moral_trade_payment','settled',100,0,0,0,now(),
      'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
    );
    raise exception 'Authenticated direct observation write was accepted.';
  exception when insufficient_privilege or foreign_key_violation then null;
  end;
end;
$test$;

select pg_catalog.set_config(
  'request.jwt.claims',
  '{"sub":"6c000000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal1"}',
  true
);
do $test$
begin
  begin
    perform moral_trade_private.compact_outflow_ingest_batch_v1(
      '6c000000-0000-4000-8000-000000000002','2026-08','qa','USD',
      'compact-authoritative-outflow-ledger/v1','qa.auth.aal1.denied'
    );
    raise exception 'AAL1 administrator executed an operator function.';
  exception when insufficient_privilege then null;
  end;
end;
$test$;

select pg_catalog.set_config(
  'request.jwt.claims',
  '{"sub":"6c000000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal2"}',
  true
);
do $test$
declare batch_id uuid;
begin
  batch_id := moral_trade_private.compact_outflow_ingest_batch_v1(
    '6c000000-0000-4000-8000-000000000002','2026-08','qa','USD',
    'compact-authoritative-outflow-ledger/v1','qa.auth.aal2.allowed'
  );
  if batch_id is null then
    raise exception 'AAL2 administrator did not receive a provisional batch identifier.';
  end if;
  perform pg_catalog.set_config(
    'moral_trade.test_aal2_batch_id',
    batch_id::text,
    true
  );
end;
$test$;
reset role;

do $test$
declare
  batch_setting text := pg_catalog.current_setting(
    'moral_trade.test_aal2_batch_id',
    true
  );
  batch_id uuid;
begin
  if batch_setting is null or batch_setting = '' then
    raise exception 'AAL2 administrator batch identifier was not retained for privileged verification.';
  end if;
  batch_id := batch_setting::uuid;
  if not exists (
    select 1 from moral_trade_private.compact_outflow_coverage_metadata
    where coverage_snapshot_id = batch_id
      and authority_status = 'provisional'
      and participant_id = '6c000000-0000-4000-8000-000000000002'
  ) then
    raise exception 'AAL2 administrator did not create the expected private provisional batch.';
  end if;
  if exists (
    select 1 from public.mpgf_public_goods_obligation_snapshots
    where participant_id='6c000000-0000-4000-8000-000000000002'
  ) or exists (
    select 1 from public.mpgf_public_goods_readiness_snapshots
  ) or exists (
    select 1 from public.mpgf_public_goods_voting_snapshots
  ) then
    raise exception 'Provisional authority unexpectedly created downstream financial or governance state.';
  end if;
end;
$test$;

set local role authenticated;
select pg_catalog.set_config(
  'request.jwt.claims',
  '{"sub":"6c000000-0000-4000-8000-000000000002","role":"authenticated","aal":"aal2"}',
  true
);
do $test$
declare state jsonb;
begin
  state := public.get_mpgf_public_goods_compacts_v2_state();
  if state#>>'{obligation,coverage}' not in ('partial','unavailable')
     or state::text ~ 'qa.auth.aal2.allowed|compact_outflow_|source_watermark|canonical_event_hash' then
    raise exception 'Self-scoped projection leaked operator or source metadata: %', state;
  end if;
end;
$test$;

reset role;

do $test$
begin
  if has_table_privilege('anon','public.mpgf_public_goods_outflow_observations','select')
     or has_table_privilege('authenticated','public.mpgf_public_goods_outflow_observations','insert')
     or has_table_privilege('authenticated','public.mpgf_public_goods_outflow_coverage_snapshots','update')
     or has_function_privilege('anon','moral_trade_private.compact_outflow_ingest_batch_v1(uuid,text,text,text,text,text)','execute')
     or has_function_privilege('authenticated','moral_trade_private.assign_compact_outflow_coverage_order_v1()','execute')
     or has_function_privilege('authenticated','moral_trade_private.assign_compact_outflow_metadata_order_v1()','execute')
     or has_function_privilege('authenticated','moral_trade_private.assign_compact_outflow_obligation_order_v1()','execute')
  then raise exception 'Outflow authority privilege matrix is too broad.'; end if;
end;
$test$;
