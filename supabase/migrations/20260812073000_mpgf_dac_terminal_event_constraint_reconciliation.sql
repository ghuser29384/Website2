begin;

-- Reconcile the terminal lifecycle-event vocabulary in case an older
-- review-only constraint was replayed after the DAC success/lapse migration on
-- a shared environment. This is idempotent and matches the event values emitted
-- by public.mpgf_finalize_dac_campaign.
alter table public.mpgf_pool_lifecycle_events
  drop constraint if exists mpgf_pool_lifecycle_events_event_type_check;

alter table public.mpgf_pool_lifecycle_events
  add constraint mpgf_pool_lifecycle_events_event_type_check
  check (
    event_type in (
      'review_started',
      'changes_requested',
      'revision_submitted',
      'proposal_rejected',
      'terms_approved_and_frozen',
      'pool_published',
      'pool_succeeded',
      'pool_lapsed'
    )
  );

comment on constraint mpgf_pool_lifecycle_events_event_type_check
  on public.mpgf_pool_lifecycle_events is
  'Allows review, publication, and exactly-once succeeded/lapsed DAC lifecycle events.';

commit;
