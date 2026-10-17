begin;

-- Reconcile the complete DAC terminal-state schema vocabulary. Shared QA
-- environments can receive older review-only migrations after the original
-- success/lapse migration; replaying this additive migration restores the exact
-- constraints required by public.mpgf_finalize_dac_campaign.
alter table public.mpgf_pool_proposals
  drop constraint if exists mpgf_pool_proposals_status_check;

alter table public.mpgf_pool_proposals
  add constraint mpgf_pool_proposals_status_check
  check (
    status in (
      'draft',
      'submitted',
      'under_review',
      'changes_requested',
      'approved_as_candidate',
      'rejected',
      'withdrawn',
      'succeeded',
      'lapsed'
    )
  );

alter table public.mpgf_pool_proposals
  drop constraint if exists mpgf_pool_proposals_lock_complete;

alter table public.mpgf_pool_proposals
  add constraint mpgf_pool_proposals_lock_complete
  check (
    (
      status in ('approved_as_candidate', 'succeeded', 'lapsed')
    ) = (
      approved_terms_version is not null
      and operative_terms_sha256 is not null
      and terms_locked_at is not null
      and reviewed_by is not null
      and reviewed_at is not null
    )
  ) not valid;

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

alter table public.mpgf_dac_pledge_events
  drop constraint if exists mpgf_dac_pledge_events_type_valid;

alter table public.mpgf_dac_pledge_events
  add constraint mpgf_dac_pledge_events_type_valid
  check (
    event_type in (
      'pledge_created',
      'eligibility_reviewed',
      'pledge_expired'
    )
  );

comment on constraint mpgf_pool_proposals_status_check
  on public.mpgf_pool_proposals is
  'Allows review states plus exactly-once succeeded/lapsed DAC terminal states.';

comment on constraint mpgf_pool_proposals_lock_complete
  on public.mpgf_pool_proposals is
  'Requires exact frozen terms for approved and terminal DAC proposals.';

comment on constraint mpgf_pool_lifecycle_events_event_type_check
  on public.mpgf_pool_lifecycle_events is
  'Allows review, publication, and exactly-once succeeded/lapsed DAC lifecycle events.';

comment on constraint mpgf_dac_pledge_events_type_valid
  on public.mpgf_dac_pledge_events is
  'Allows immutable pledge creation, eligibility review, and lapse-time expiration events.';

commit;
