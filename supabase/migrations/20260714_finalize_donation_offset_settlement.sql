-- Finalize a captured donation offset as one database transaction. If any
-- participant-facing state cannot be advanced, the caller compensates the Stripe
-- transfers and charges instead of publishing a partially completed settlement.

create or replace function public.finalize_donation_offset_settlement(
  p_batch_id uuid,
  p_processing_token uuid,
  p_match_id uuid,
  p_offer_id uuid
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
    and status = 'transferring';

  get diagnostics affected_rows = row_count;
  if affected_rows <> 1 then
    return false;
  end if;

  update public.donation_offset_matches
  set status = 'completed'
  where id = p_match_id
    and offer_id = p_offer_id
    and status = 'matched';

  get diagnostics affected_rows = row_count;
  if affected_rows <> 1 then
    raise exception 'Donation-offset match could not be finalized from matched state.';
  end if;

  update public.offers
  set status = 'closed'
  where id = p_offer_id
    and status in ('open', 'matched');

  get diagnostics affected_rows = row_count;
  if affected_rows <> 1 then
    raise exception 'Donation-offset offer could not be closed during settlement finalization.';
  end if;

  return true;
end;
$$;

revoke all on function public.finalize_donation_offset_settlement(uuid, uuid, uuid, uuid) from public;
revoke all on function public.finalize_donation_offset_settlement(uuid, uuid, uuid, uuid) from anon;
revoke all on function public.finalize_donation_offset_settlement(uuid, uuid, uuid, uuid) from authenticated;
grant execute on function public.finalize_donation_offset_settlement(uuid, uuid, uuid, uuid) to service_role;
