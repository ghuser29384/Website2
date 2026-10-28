begin;

alter function public.impact_accounting_validate_model_version() security definer;
alter function public.impact_accounting_validate_snapshot() security definer;

comment on function public.impact_accounting_validate_model_version() is
  'Security-definer trigger validator so service-role draft writes can invoke internal methodology assertions without exposing those assertions as public RPCs.';
comment on function public.impact_accounting_validate_snapshot() is
  'Security-definer trigger validator so the service-only publisher can invoke internal snapshot assertions without widening direct execution grants.';

commit;
