-- Stripe test objects may exercise the compensated payment path, but must not
-- mark the real match or offer completed. Only live settlement advances those
-- participant-facing records.
create or replace function public.finalize_test_donation_offset_settlement(
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
    status = 'transferred',
    completed_at = timezone('utc', now()),
    processing_token = null,
    processing_started_at = null,
    failure_code = null,
    failure_message = null
  where id = p_batch_id
    and processing_token = p_processing_token
    and status = 'transferring'
    and livemode = false
    and purpose = 'donation_offset'
    and subject_type = 'donation_offset_match';

  get diagnostics affected_rows = row_count;
  return affected_rows = 1;
end;
$$;

revoke all on function public.finalize_test_donation_offset_settlement(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.finalize_test_donation_offset_settlement(uuid, uuid)
  to service_role;
