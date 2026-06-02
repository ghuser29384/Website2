alter table public.source_connections
  drop constraint if exists source_connections_access_status_check;

alter table public.source_connections
  add constraint source_connections_access_status_check
  check (access_status in ('not_connected', 'connected', 'expired', 'revoked', 'needs_review'));

alter table public.email_outbox
  add column if not exists source_kind text;

alter table public.email_outbox
  add column if not exists source_id text;

create unique index if not exists email_outbox_source_dedupe_idx
on public.email_outbox (source_kind, source_id);

alter table public.background_opportunity_briefs
  drop constraint if exists background_opportunity_briefs_feedback_reason_check;

alter table public.background_opportunity_briefs
  add constraint background_opportunity_briefs_feedback_reason_check
  check (
    feedback_reason is null
    or feedback_reason in (
      'not_relevant',
      'already_connected',
      'bad_timing',
      'too_vague',
      'privacy_concern',
      'safety_concern',
      'maybe_later',
      'interested'
    )
  );

alter table public.background_match_feedback
  drop constraint if exists background_match_feedback_reason_outcome_check;

alter table public.background_match_feedback
  drop constraint if exists background_match_feedback_reason_code_check;

alter table public.background_match_feedback
  add constraint background_match_feedback_reason_code_check
  check (
    reason_code in (
      'not_relevant',
      'already_connected',
      'bad_timing',
      'too_vague',
      'privacy_concern',
      'safety_concern',
      'maybe_later',
      'interested'
    )
  );

alter table public.background_match_feedback
  add constraint background_match_feedback_reason_outcome_check
  check (
    (outcome = 'interested' and reason_code = 'interested')
    or (outcome = 'maybe_later' and reason_code = 'maybe_later')
    or (outcome = 'dismissed' and reason_code not in ('interested', 'maybe_later'))
  );
