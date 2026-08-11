begin;

do $qa_guard$
begin
  if not exists (
    select 1
    from moraltrade_qa.environment_identity
    where singleton
      and environment = 'qa'
      and project_ref = 'hvmxfjjbdcgjjudmthdz'
      and sentinel_id = 'a0244e19-9744-4a82-83e4-57776804cc06'::uuid
      and sentinel_sha256 = 'f7801a29e33764650322ad39e66a2062d9e2f750a9438e74d9fff0c9eeeb8d30'
      and provisioned_out_of_band
  ) then
    raise exception 'MoralTrade QA sentinel is absent or incorrect'
      using errcode = '55000';
  end if;
end;
$qa_guard$;

revoke execute on function public.impact_study_is_blocked(uuid)
from public, anon, authenticated, service_role;

grant execute on function public.impact_study_is_blocked(uuid)
to service_role;

comment on function public.impact_study_is_blocked(uuid) is
  'Read-only lifecycle probe for exact QA regression and service-role diagnostics; it grants no study mutation or execution authority.';

commit;
