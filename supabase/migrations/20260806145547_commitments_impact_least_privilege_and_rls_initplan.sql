begin;

revoke all on table public.impact_model_approvers from service_role;
revoke all on table public.impact_model_approver_events from service_role;
revoke all on table public.impact_model_versions from service_role;
revoke all on table public.impact_model_approval_events from service_role;
revoke all on table public.impact_model_lifecycle_events from service_role;
revoke all on table public.impact_model_health_snapshots from service_role;
revoke all on table public.impact_reference_observations from service_role;
revoke all on table public.impact_estimate_snapshots from service_role;
revoke all on table public.impact_estimate_audit_events from service_role;
revoke all on table public.impact_refresh_queue from service_role;

grant select on table public.impact_model_approvers to service_role;
grant select on table public.impact_model_approver_events to service_role;
grant select, insert, update on table public.impact_model_versions to service_role;
grant select on table public.impact_model_approval_events to service_role;
grant select on table public.impact_model_lifecycle_events to service_role;
grant select, insert on table public.impact_model_health_snapshots to service_role;
grant select, insert on table public.impact_reference_observations to service_role;
grant select on table public.impact_estimate_snapshots to service_role;
grant select on table public.impact_estimate_audit_events to service_role;
grant select on table public.impact_refresh_queue to service_role;

revoke all on function public.impact_accounting_reject_mutation() from service_role;
revoke all on function public.impact_accounting_guard_model_version_update() from service_role;
revoke all on function public.impact_accounting_guard_estimate_snapshot_mutation() from service_role;

drop policy if exists impact_model_approvers_select_own
  on public.impact_model_approvers;
create policy impact_model_approvers_select_own
  on public.impact_model_approvers
  for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists impact_model_versions_select_approver
  on public.impact_model_versions;
create policy impact_model_versions_select_approver
  on public.impact_model_versions
  for select to authenticated
  using ((select public.is_impact_model_approver(false)));

drop policy if exists impact_model_approval_events_select_approver
  on public.impact_model_approval_events;
create policy impact_model_approval_events_select_approver
  on public.impact_model_approval_events
  for select to authenticated
  using ((select public.is_impact_model_approver(false)));

drop policy if exists impact_model_health_snapshots_select_approver
  on public.impact_model_health_snapshots;
create policy impact_model_health_snapshots_select_approver
  on public.impact_model_health_snapshots
  for select to authenticated
  using ((select public.is_impact_model_approver(false)));

drop policy if exists impact_estimate_snapshots_select_participant
  on public.impact_estimate_snapshots;
create policy impact_estimate_snapshots_select_participant
  on public.impact_estimate_snapshots
  for select to authenticated
  using (participant_user_id = (select auth.uid()));

drop policy if exists impact_model_approver_events_select_approver
  on public.impact_model_approver_events;
create policy impact_model_approver_events_select_approver
  on public.impact_model_approver_events
  for select to authenticated
  using ((select public.is_impact_model_approver(false)));

drop policy if exists impact_model_lifecycle_events_select_approver
  on public.impact_model_lifecycle_events;
create policy impact_model_lifecycle_events_select_approver
  on public.impact_model_lifecycle_events
  for select to authenticated
  using ((select public.is_impact_model_approver(false)));

comment on policy impact_model_approvers_select_own
  on public.impact_model_approvers is
  'Participant identity is initialized once per statement rather than recalculated per row.';
comment on policy impact_estimate_snapshots_select_participant
  on public.impact_estimate_snapshots is
  'Participant identity is initialized once per statement rather than recalculated per row.';
comment on policy impact_model_versions_select_approver
  on public.impact_model_versions is
  'Approver authorization is initialized once per statement.';

commit;
