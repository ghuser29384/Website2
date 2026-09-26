begin;

revoke all on function public.impact_accounting_validate_snapshot() from service_role;

comment on function public.impact_accounting_validate_snapshot() is
  'Internal security-definer trigger validator. Direct execution is denied to API roles; estimate publication reaches it only through the table trigger.';

commit;
