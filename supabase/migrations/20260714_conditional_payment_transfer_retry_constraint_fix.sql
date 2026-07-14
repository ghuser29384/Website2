-- PostgreSQL truncates long generated constraint names. Remove the legacy uniqueness
-- constraint by its columns rather than by a guessed name, so compensated settlement
-- retries can create a fresh transfer for a fresh payment attempt.

do $$
declare
  constraint_record record;
begin
  for constraint_record in
    select tc.constraint_name
    from information_schema.table_constraints tc
    join information_schema.constraint_column_usage ccu
      on ccu.constraint_schema = tc.constraint_schema
     and ccu.constraint_name = tc.constraint_name
    where tc.table_schema = 'public'
      and tc.table_name = 'conditional_settlement_transfers'
      and tc.constraint_type = 'UNIQUE'
    group by tc.constraint_name
    having array_agg(ccu.column_name::text order by ccu.column_name::text)
      = array['mandate_id', 'settlement_batch_id']::text[]
  loop
    execute format(
      'alter table public.conditional_settlement_transfers drop constraint %I',
      constraint_record.constraint_name
    );
  end loop;
end;
$$;

alter table public.conditional_settlement_transfers
  drop constraint if exists conditional_settlement_transfers_settlement_batch_id_payment_attempt_id_key;

alter table public.conditional_settlement_transfers
  drop constraint if exists conditional_settlement_transfers_batch_attempt_key;

alter table public.conditional_settlement_transfers
  add constraint conditional_settlement_transfers_batch_attempt_key
  unique (settlement_batch_id, payment_attempt_id);

create index if not exists conditional_settlement_transfers_batch_mandate_idx
  on public.conditional_settlement_transfers (settlement_batch_id, mandate_id, created_at desc);
