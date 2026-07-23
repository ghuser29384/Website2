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
