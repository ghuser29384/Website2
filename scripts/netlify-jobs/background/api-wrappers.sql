-- Synthetic API candidate only. Ledger and privileged implementation stay private.
create function public.admit_email_dispatch_probe(p_slot timestamptz,p_token uuid)
returns jsonb language sql security invoker set search_path=''
as $$select moral_trade_private.admit_dispatch_probe(p_slot,p_token)$$;
create function public.finish_email_dispatch_probe(p_slot timestamptz,p_token uuid,p_result jsonb)
returns boolean language sql security invoker set search_path=''
as $$select moral_trade_private.finish_dispatch_probe(p_slot,p_token,p_result)$$;
revoke all on function public.admit_email_dispatch_probe(timestamptz,uuid) from public,anon,authenticated;
revoke all on function public.finish_email_dispatch_probe(timestamptz,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.admit_email_dispatch_probe(timestamptz,uuid) to service_role;
grant execute on function public.finish_email_dispatch_probe(timestamptz,uuid,jsonb) to service_role;
