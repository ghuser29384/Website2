-- Synthetic candidate, not a production migration. Empty is distinct from duplicate.
create function moral_trade_private.admit_dispatch_probe(p_slot timestamptz,p_token uuid)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public
as $$
declare inserted timestamptz; emails jsonb; prior jsonb;
begin
 insert into moral_trade_private.email_dispatch_probe(slot,worker_token)
 values(p_slot,p_token) on conflict do nothing returning slot into inserted;
 if inserted is null then
  select jsonb_build_object('admitted',false,'finished',finished_at is not null,'result',result)
  into prior from moral_trade_private.email_dispatch_probe where slot=p_slot;
  return prior;
 end if;
 select coalesce(jsonb_agg(to_jsonb(e)),'[]'::jsonb) into emails
 from public.claim_email_outbox_v2(p_token,25) e;
 update moral_trade_private.email_dispatch_probe
 set claimed_ids=array(select (e->>'id')::uuid from jsonb_array_elements(emails) e)
 where slot=p_slot;
 return jsonb_build_object('admitted',true,'emails',emails);
end;
$$;
revoke all on function moral_trade_private.admit_dispatch_probe(timestamptz,uuid) from public;
grant execute on function moral_trade_private.admit_dispatch_probe(timestamptz,uuid) to service_role;
