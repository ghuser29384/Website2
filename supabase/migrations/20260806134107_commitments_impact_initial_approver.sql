begin;

do $$
declare
  active_approver_count integer;
begin
  select count(*)
  into active_approver_count
  from public.impact_model_approvers
  where active;

  if active_approver_count <> 0 then
    raise exception
      'The initial impact-model approver roster must remain empty until the controlled release procedure configures the founder-selected account',
      using errcode = '23514';
  end if;

  raise notice
    'Initial impact-model approver intentionally left unconfigured; bootstrap the founder-selected account outside source control after the production schema release';
end;
$$;

comment on table public.impact_model_approvers is
  'Current impact-model approval authority. Initial authority is configured outside source control through the audited service-role procedure.';

commit;
