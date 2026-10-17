-- Repair the Create submission RPC when the deployed offers.mode column uses the offer_mode enum.
begin;

do $migration$
declare
  function_definition text;
begin
  select pg_get_functiondef(
    'public.moral_trade_create_submit_service(uuid,text,text,jsonb,text,text,text,text,text,jsonb,jsonb,jsonb)'::regprocedure
  )
  into function_definition;

  if position('mode_value text;' in function_definition) > 0 then
    execute replace(
      function_definition,
      'mode_value text;',
      'mode_value public.offer_mode;'
    );
  elsif position('mode_value public.offer_mode;' in function_definition) = 0 then
    raise exception using
      errcode = 'P0001',
      message = 'Could not verify the Create submission RPC offer-mode declaration.';
  end if;
end;
$migration$;

commit;
