alter table public.trade_messages
  add column if not exists submission_key text not null default '';
alter table public.trade_counterproposals
  add column if not exists submission_key text not null default '';
alter table public.trade_agreement_versions
  add column if not exists submission_key text not null default '';
alter table public.trade_evidence_items
  add column if not exists submission_key text not null default '';

create unique index if not exists trade_messages_sender_submission_key_uidx
  on public.trade_messages(sender_id, submission_key)
  where sender_id is not null and submission_key <> '';
create unique index if not exists trade_counterproposals_proposer_submission_key_uidx
  on public.trade_counterproposals(proposer_id, submission_key)
  where submission_key <> '';
create unique index if not exists trade_agreement_versions_proposer_submission_key_uidx
  on public.trade_agreement_versions(proposed_by, submission_key)
  where submission_key <> '';
create unique index if not exists trade_evidence_items_submitter_submission_key_uidx
  on public.trade_evidence_items(submitted_by, submission_key)
  where submission_key <> '';

create index if not exists agreements_current_version_id_idx on public.agreements(current_version_id);
create index if not exists agreements_exit_requested_by_idx on public.agreements(exit_requested_by);
create index if not exists trade_agreement_confirmations_user_id_idx on public.trade_agreement_confirmations(user_id);
create index if not exists trade_agreement_versions_proposed_by_idx on public.trade_agreement_versions(proposed_by);
create index if not exists trade_blocks_blocked_id_idx on public.trade_blocks(blocked_id);
create index if not exists trade_blocks_blocker_id_idx on public.trade_blocks(blocker_id);
create index if not exists trade_completion_confirmations_user_id_idx on public.trade_completion_confirmations(user_id);
create index if not exists trade_counterproposals_offer_id_idx on public.trade_counterproposals(offer_id);
create index if not exists trade_counterproposals_proposer_id_idx on public.trade_counterproposals(proposer_id);
create index if not exists trade_evidence_items_submitted_by_idx on public.trade_evidence_items(submitted_by);
create index if not exists trade_exit_requests_requested_by_idx on public.trade_exit_requests(requested_by);
create index if not exists trade_messages_sender_id_idx on public.trade_messages(sender_id);
create index if not exists trade_reports_message_id_idx on public.trade_reports(message_id);
create index if not exists trade_reports_reporter_id_idx on public.trade_reports(reporter_id);
create index if not exists trade_reports_thread_id_idx on public.trade_reports(thread_id);
create index if not exists trade_review_events_reviewer_id_idx on public.trade_review_events(reviewer_id);
create index if not exists trade_thread_reads_user_id_idx on public.trade_thread_reads(user_id);
create index if not exists trade_threads_agreement_id_idx on public.trade_threads(agreement_id);
create index if not exists trade_threads_invitation_id_idx on public.trade_threads(invitation_id);

revoke truncate, references, trigger on table
  public.offers,
  public.interests,
  public.agreements,
  public.trade_threads,
  public.trade_messages,
  public.trade_counterproposals,
  public.trade_agreement_versions,
  public.trade_agreement_confirmations,
  public.trade_evidence_items,
  public.trade_completion_confirmations,
  public.trade_exit_requests,
  public.trade_notifications,
  public.trade_blocks,
  public.trade_reports,
  public.trade_review_events,
  public.trade_thread_reads,
  public.trade_invitations,
  public.core_loop_events
from anon, authenticated;

revoke all on table
  public.agreements,
  public.trade_threads,
  public.trade_messages,
  public.trade_counterproposals,
  public.trade_agreement_versions,
  public.trade_agreement_confirmations,
  public.trade_evidence_items,
  public.trade_completion_confirmations,
  public.trade_exit_requests,
  public.trade_notifications,
  public.trade_blocks,
  public.trade_reports,
  public.trade_thread_reads,
  public.trade_invitations,
  public.core_loop_events
from anon;

revoke insert, update, delete on table
  public.agreements,
  public.trade_threads,
  public.trade_messages,
  public.trade_counterproposals,
  public.trade_agreement_versions,
  public.trade_agreement_confirmations,
  public.trade_evidence_items,
  public.trade_completion_confirmations,
  public.trade_exit_requests,
  public.trade_blocks,
  public.trade_invitations
from authenticated;

grant select on table
  public.agreements,
  public.trade_threads,
  public.trade_messages,
  public.trade_counterproposals,
  public.trade_agreement_versions,
  public.trade_agreement_confirmations,
  public.trade_evidence_items,
  public.trade_completion_confirmations,
  public.trade_exit_requests,
  public.trade_blocks
  to authenticated;
grant select, update on table public.trade_notifications to authenticated;
grant select, insert on table public.trade_reports to authenticated;
grant select, insert, update, delete on table public.trade_thread_reads to authenticated;
grant select, insert on table public.core_loop_events to authenticated;
revoke all on table public.trade_invitations from authenticated;

alter policy trade_threads_participant_select on public.trade_threads
  using ((participant_a = (select auth.uid())) or (participant_b = (select auth.uid())));
alter policy trade_messages_participant_select on public.trade_messages
  using (exists (
    select 1 from public.trade_threads t
    where t.id = trade_messages.thread_id
      and ((t.participant_a = (select auth.uid())) or (t.participant_b = (select auth.uid())))
  ));
alter policy trade_thread_reads_self_all on public.trade_thread_reads
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
alter policy trade_blocks_participant_select on public.trade_blocks
  using ((blocker_id = (select auth.uid())) or (blocked_id = (select auth.uid())));
alter policy trade_reports_reporter_select on public.trade_reports
  using (reporter_id = (select auth.uid()));
alter policy trade_counterproposals_participant_select on public.trade_counterproposals
  using (exists (
    select 1 from public.trade_threads t
    where t.id = trade_counterproposals.thread_id
      and ((t.participant_a = (select auth.uid())) or (t.participant_b = (select auth.uid())))
  ));
alter policy trade_agreement_versions_participant_select on public.trade_agreement_versions
  using (exists (
    select 1 from public.agreements a
    where a.id = trade_agreement_versions.agreement_id
      and ((a.proposer_id = (select auth.uid())) or (a.responder_id = (select auth.uid())))
  ));
alter policy trade_agreement_confirmations_participant_select on public.trade_agreement_confirmations
  using (exists (
    select 1
    from public.trade_agreement_versions v
    join public.agreements a on a.id = v.agreement_id
    where v.id = trade_agreement_confirmations.agreement_version_id
      and ((a.proposer_id = (select auth.uid())) or (a.responder_id = (select auth.uid())))
  ));
alter policy trade_evidence_items_participant_select on public.trade_evidence_items
  using (exists (
    select 1 from public.agreements a
    where a.id = trade_evidence_items.agreement_id
      and ((a.proposer_id = (select auth.uid())) or (a.responder_id = (select auth.uid())))
  ));
alter policy trade_completion_confirmations_participant_select on public.trade_completion_confirmations
  using (exists (
    select 1 from public.agreements a
    where a.id = trade_completion_confirmations.agreement_id
      and ((a.proposer_id = (select auth.uid())) or (a.responder_id = (select auth.uid())))
  ));
alter policy trade_exit_requests_participant_select on public.trade_exit_requests
  using (exists (
    select 1 from public.agreements a
    where a.id = trade_exit_requests.agreement_id
      and ((a.proposer_id = (select auth.uid())) or (a.responder_id = (select auth.uid())))
  ));
alter policy trade_notifications_self_select on public.trade_notifications
  using (user_id = (select auth.uid()));
alter policy trade_notifications_self_update on public.trade_notifications
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
alter policy trade_review_events_owner_select on public.trade_review_events
  using (exists (
    select 1 from public.offers o
    where o.id = trade_review_events.offer_id
      and o.owner_id = (select auth.uid())
  ));
alter policy core_loop_events_self_select on public.core_loop_events
  using (profile_id = (select auth.uid()));

do $revoke$
declare
  function_row record;
begin
  for function_row in
    select p.oid::regprocedure as signature
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in (
        'enforce_private_source_evidence_insert',
        'guard_core_agreement_version_insert',
        'guard_core_counterproposal_mutation',
        'guard_core_evidence_mutation',
        'guard_core_exit_request_mutation',
        'guard_core_offer_mutation',
        'guard_core_thread_mutation',
        'touch_core_thread_from_message'
      )
  loop
    execute format('revoke all on function %s from public, anon, authenticated', function_row.signature);
  end loop;
end
$revoke$;

create or replace function public.get_core_release_health_v1()
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog
as $function$
  with required_tables(name) as (
    values
      ('public.profiles'),
      ('public.offers'),
      ('public.trade_invitations'),
      ('public.trade_threads'),
      ('public.trade_messages'),
      ('public.trade_counterproposals'),
      ('public.agreements'),
      ('public.trade_agreement_versions'),
      ('public.trade_agreement_confirmations'),
      ('public.trade_evidence_items'),
      ('public.trade_completion_confirmations'),
      ('public.trade_exit_requests')
  ), required_functions(name) as (
    values
      ('create_trade_invitation_v2'),
      ('respond_trade_invitation_v2'),
      ('decide_counterproposal_v2'),
      ('confirm_agreement_version_v2'),
      ('send_trade_message_v3'),
      ('create_counterproposal_v3'),
      ('propose_agreement_version_v3'),
      ('register_trade_evidence_v3'),
      ('review_trade_evidence_v3'),
      ('confirm_trade_completion_v3'),
      ('request_trade_exit_v3')
  ), table_check as (
    select bool_and(to_regclass(name) is not null) as ready
    from required_tables
  ), function_check as (
    select bool_and(exists (
      select 1
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.proname = required_functions.name
    )) as ready
    from required_functions
  ), rls_check as (
    select bool_and(c.relrowsecurity) as ready
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname in (
        'offers','trade_invitations','trade_threads','trade_messages',
        'trade_counterproposals','agreements','trade_agreement_versions',
        'trade_agreement_confirmations','trade_evidence_items',
        'trade_completion_confirmations','trade_exit_requests'
      )
  ), storage_check as (
    select exists (
      select 1 from storage.buckets b
      where b.id = 'trade-evidence' and b.public = false
    ) as ready
  )
  select jsonb_build_object(
    'ready', coalesce(table_check.ready, false)
      and coalesce(function_check.ready, false)
      and coalesce(rls_check.ready, false)
      and coalesce(storage_check.ready, false),
    'tablesReady', coalesce(table_check.ready, false),
    'functionsReady', coalesce(function_check.ready, false),
    'rlsReady', coalesce(rls_check.ready, false),
    'storageReady', coalesce(storage_check.ready, false)
  )
  from table_check, function_check, rls_check, storage_check;
$function$;

revoke all on function public.get_core_release_health_v1() from public, anon, authenticated;
grant execute on function public.get_core_release_health_v1() to service_role;
