-- Synthetic prototype only: not a production migration.
create table moral_trade_private.email_dispatch_probe (
 slot timestamptz primary key,
 worker_token uuid not null,
 claimed_ids uuid[] not null default '{}'
);
alter table moral_trade_private.email_dispatch_probe enable row level security;
revoke all on moral_trade_private.email_dispatch_probe from public;
create function moral_trade_private.claim_dispatch_probe(p_slot timestamptz,p_token uuid)
returns setof public.email_outbox
language plpgsql security definer set search_path = pg_catalog, public
as $$
declare inserted_slot timestamptz;
begin
 insert into moral_trade_private.email_dispatch_probe(slot,worker_token)
 values(p_slot,p_token) on conflict do nothing returning slot into inserted_slot;
 if inserted_slot is null then return; end if;
 return query select * from public.claim_email_outbox_v2(p_token,25);
 update moral_trade_private.email_dispatch_probe
 set claimed_ids=array(select id from public.email_outbox where lock_token=p_token and status='processing')
 where slot=p_slot;
end;
$$;
revoke all on function moral_trade_private.claim_dispatch_probe(timestamptz,uuid) from public;
grant usage on schema moral_trade_private to service_role;
grant execute on function moral_trade_private.claim_dispatch_probe(timestamptz,uuid) to service_role;

alter table moral_trade_private.email_dispatch_probe
 add column finished_at timestamptz,
 add column result jsonb;
create function moral_trade_private.finish_dispatch_probe(p_slot timestamptz,p_token uuid,p_result jsonb)
returns boolean language plpgsql security definer set search_path=pg_catalog,public
as $$
declare n integer; k text; total integer:=0;
begin
 select cardinality(claimed_ids) into n from moral_trade_private.email_dispatch_probe
 where slot=p_slot and worker_token=p_token and finished_at is null for update;
 if not found then return false; end if;
 if p_result is null or jsonb_typeof(p_result)<>'object' or (select count(*) from jsonb_object_keys(p_result))<>5 then
  raise exception 'Invalid aggregate result';
 end if;
 foreach k in array array['claimed','sent','failed','retrying','suppressed'] loop
  if not p_result ? k or jsonb_typeof(p_result->k)<>'number' or (p_result->>k)!~'^[0-9]+$' then raise exception 'Invalid aggregate result'; end if;
  if (p_result->>k)::integer >25 then raise exception 'Invalid aggregate result'; end if;
  if k<>'claimed' then total:=total+(p_result->>k)::integer; end if;
 end loop;
 if (p_result->>'claimed')::integer<>n or total<>n then raise exception 'Incomplete aggregate result'; end if;
 -- A finished HTTP loop can report failures. This is not a successful-delivery flag.
 update moral_trade_private.email_dispatch_probe set finished_at=clock_timestamp(),result=p_result where slot=p_slot;
 return true;
end;
$$;
revoke all on function moral_trade_private.finish_dispatch_probe(timestamptz,uuid,jsonb) from public;
grant execute on function moral_trade_private.finish_dispatch_probe(timestamptz,uuid,jsonb) to service_role;
