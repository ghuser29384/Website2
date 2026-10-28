begin;

revoke all on function public.impact_accounting_string_array(jsonb)
from public, anon, authenticated;
revoke all on function public.impact_accounting_assert_methodology_for_approval(jsonb,text,text)
from public, anon, authenticated;

grant execute on function public.impact_accounting_nonplaceholder_text(text)
to service_role;
grant execute on function public.impact_accounting_nonempty_string_array(jsonb)
to service_role;
grant execute on function public.impact_accounting_string_array(jsonb)
to service_role;
grant execute on function public.impact_accounting_assert_methodology_shape(jsonb,text,text)
to service_role;
grant execute on function public.impact_accounting_assert_methodology_for_review(jsonb,text,text)
to service_role;
grant execute on function public.impact_accounting_assert_methodology_for_approval(jsonb,text,text)
to service_role;
grant execute on function public.impact_accounting_assert_snapshot_payload(jsonb)
to service_role;

do $$
begin
  if not has_function_privilege(
    'service_role',
    'public.impact_accounting_assert_methodology_shape(jsonb,text,text)',
    'execute'
  ) or not has_function_privilege(
    'service_role',
    'public.impact_accounting_assert_methodology_for_review(jsonb,text,text)',
    'execute'
  ) or not has_function_privilege(
    'service_role',
    'public.impact_accounting_assert_methodology_for_approval(jsonb,text,text)',
    'execute'
  ) or not has_function_privilege(
    'service_role',
    'public.impact_accounting_assert_snapshot_payload(jsonb)',
    'execute'
  ) then
    raise exception 'Service-role internal validation authority is incomplete';
  end if;

  if has_function_privilege(
    'anon',
    'public.impact_accounting_string_array(jsonb)',
    'execute'
  ) or has_function_privilege(
    'authenticated',
    'public.impact_accounting_string_array(jsonb)',
    'execute'
  ) or has_function_privilege(
    'anon',
    'public.impact_accounting_assert_methodology_for_approval(jsonb,text,text)',
    'execute'
  ) or has_function_privilege(
    'authenticated',
    'public.impact_accounting_assert_methodology_for_approval(jsonb,text,text)',
    'execute'
  ) then
    raise exception 'Client roles retain internal methodology-validator execution';
  end if;
end
$$;

comment on function public.impact_accounting_assert_methodology_for_approval(jsonb,text,text) is
  'Internal exact-methodology approval validator. Direct execution is restricted to the service role; authenticated founder decisions use the audited security-definer governance RPC.';
comment on function public.impact_accounting_assert_snapshot_payload(jsonb) is
  'Internal immutable-snapshot validator. Direct execution is restricted; service-role publication and database triggers enforce the contract.';

commit;
