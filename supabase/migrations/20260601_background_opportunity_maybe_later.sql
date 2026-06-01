alter table public.background_opportunity_briefs
  drop constraint if exists background_opportunity_briefs_status_check;

alter table public.background_opportunity_briefs
  add constraint background_opportunity_briefs_status_check
  check (status in ('open', 'opened', 'dismissed', 'interested', 'maybe_later', 'muted', 'packet_requested', 'expired'));

alter table public.background_opportunity_briefs
  drop constraint if exists background_opportunity_briefs_feedback_reason_check;

alter table public.background_opportunity_briefs
  add constraint background_opportunity_briefs_feedback_reason_check
  check (
    feedback_reason is null
    or feedback_reason in ('not_relevant', 'bad_timing', 'too_vague', 'safety_concern', 'maybe_later', 'interested')
  );

alter table public.background_match_feedback
  drop constraint if exists background_match_feedback_reason_outcome_check;

alter table public.background_match_feedback
  drop constraint if exists background_match_feedback_outcome_check;

alter table public.background_match_feedback
  add constraint background_match_feedback_outcome_check
  check (outcome in ('dismissed', 'maybe_later', 'interested'));

alter table public.background_match_feedback
  drop constraint if exists background_match_feedback_reason_code_check;

alter table public.background_match_feedback
  add constraint background_match_feedback_reason_code_check
  check (reason_code in ('not_relevant', 'bad_timing', 'too_vague', 'safety_concern', 'maybe_later', 'interested'));

alter table public.background_match_feedback
  add constraint background_match_feedback_reason_outcome_check
  check (
    (outcome = 'interested' and reason_code = 'interested')
    or (outcome = 'maybe_later' and reason_code = 'maybe_later')
    or (outcome = 'dismissed' and reason_code not in ('interested', 'maybe_later'))
  );
