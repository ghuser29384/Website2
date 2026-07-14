-- Allow a fully compensated batch to be retried after both participants authorize fresh
-- payment methods. Transfers are keyed to the concrete payment attempt rather than the
-- reusable mandate so a later, freshly authorized attempt cannot reuse an old transfer.

alter table public.conditional_settlement_transfers
  drop constraint if exists conditional_settlement_transfers_settlement_batch_id_mandate_id_key;

alter table public.conditional_settlement_transfers
  drop constraint if exists conditional_settlement_transfers_settlement_batch_id_payment_attempt_id_key;

alter table public.conditional_settlement_transfers
  add constraint conditional_settlement_transfers_settlement_batch_id_payment_attempt_id_key
  unique (settlement_batch_id, payment_attempt_id);

create index if not exists conditional_settlement_transfers_batch_mandate_idx
  on public.conditional_settlement_transfers (settlement_batch_id, mandate_id, created_at desc);

create or replace function public.claim_conditional_settlement_batch(
  p_batch_id uuid,
  p_processing_token uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  affected_rows integer := 0;
begin
  update public.conditional_settlement_batches
  set
    status = 'charging',
    processing_token = p_processing_token,
    processing_started_at = timezone('utc', now()),
    started_at = coalesce(started_at, timezone('utc', now())),
    failure_code = null,
    failure_message = null
  where id = p_batch_id
    and (
      status in (
        'pending_authorizations',
        'ready',
        'requires_action',
        'failed',
        'refunded'
      )
      or (
        status in ('charging', 'transferring')
        and processing_started_at < timezone('utc', now()) - interval '10 minutes'
      )
    )
    and (next_retry_at is null or next_retry_at <= timezone('utc', now()));

  get diagnostics affected_rows = row_count;
  return affected_rows = 1;
end;
$$;

revoke all on function public.claim_conditional_settlement_batch(uuid, uuid) from public;
revoke all on function public.claim_conditional_settlement_batch(uuid, uuid) from anon;
revoke all on function public.claim_conditional_settlement_batch(uuid, uuid) from authenticated;
grant execute on function public.claim_conditional_settlement_batch(uuid, uuid) to service_role;
