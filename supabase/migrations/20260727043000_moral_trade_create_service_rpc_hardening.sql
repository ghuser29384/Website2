-- Move Create persistence behind the authenticated application route and service role.
begin;

do $migration$
declare
  old_definition text;
  service_definition text;
begin
  if to_regprocedure(
    'public.moral_trade_create_submit_service(uuid,text,text,jsonb,text,text,text,text,text,jsonb,jsonb,jsonb)'
  ) is null then
    select pg_get_functiondef(
      'public.moral_trade_create_submit(text,text,jsonb,text,text,text,text,text,jsonb,jsonb,jsonb)'::regprocedure
    ) into old_definition;

    service_definition := replace(
      old_definition,
      'CREATE OR REPLACE FUNCTION public.moral_trade_create_submit(',
      'CREATE OR REPLACE FUNCTION public.moral_trade_create_submit_service(p_actor_id uuid, '
    );
    service_definition := replace(
      service_definition,
      'actor_id uuid := auth.uid();',
      'actor_id uuid := p_actor_id;'
    );
    service_definition := replace(
      service_definition,
      'message = ''Authentication is required to submit a Create record.''',
      'message = ''A valid authenticated actor is required to submit a Create record.'''
    );

    if service_definition = old_definition
       or position('actor_id uuid := p_actor_id;' in service_definition) = 0 then
      raise exception using
        errcode = 'P0001',
        message = 'Could not construct the service-role Create submission RPC.';
    end if;

    execute service_definition;
  end if;
end;
$migration$;

comment on function public.moral_trade_create_submit_service(uuid, text, text, jsonb, text, text, text, text, text, jsonb, jsonb, jsonb) is
  'Service-role-only atomic persistence for one validated Create-interface submission and its reviewable offer or MPGF pool proposal. It never authorizes money movement or opens an unreviewed record.';

revoke all on function public.moral_trade_create_submit_service(uuid, text, text, jsonb, text, text, text, text, text, jsonb, jsonb, jsonb)
from public, anon, authenticated;
grant execute on function public.moral_trade_create_submit_service(uuid, text, text, jsonb, text, text, text, text, text, jsonb, jsonb, jsonb)
to service_role;

drop function if exists public.moral_trade_create_submit(
  text, text, jsonb, text, text, text, text, text, jsonb, jsonb, jsonb
);

commit;
