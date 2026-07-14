create unique index if not exists background_intro_packets_active_brief_uidx
on public.background_intro_packets (
  requester_profile_id,
  opportunity_brief_id,
  purpose_code,
  purpose_policy_version
)
where opportunity_brief_id is not null
  and review_state in ('requested', 'under_review', 'approved', 'changes_requested', 'sent');
