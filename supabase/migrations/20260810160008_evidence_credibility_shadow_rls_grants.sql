alter table public.credibility_shadow_model_versions enable row level security;
alter table public.credibility_shadow_controls enable row level security;
alter table public.trade_evidence_decisions enable row level security;
alter table public.trade_settlement_shadow_decisions enable row level security;
alter table public.credibility_shadow_events enable row level security;
alter table public.credibility_shadow_restriction_signals enable row level security;
alter table public.credibility_shadow_aggregates enable row level security;

revoke all on table public.credibility_shadow_model_versions from public, anon, authenticated;
revoke all on table public.credibility_shadow_controls from public, anon, authenticated;
revoke all on table public.trade_evidence_decisions from public, anon, authenticated;
revoke all on table public.trade_settlement_shadow_decisions from public, anon, authenticated;
revoke all on table public.credibility_shadow_events from public, anon, authenticated;
revoke all on table public.credibility_shadow_restriction_signals from public, anon, authenticated;
revoke all on table public.credibility_shadow_aggregates from public, anon, authenticated;

grant select on table public.credibility_shadow_model_versions to service_role;
grant select on table public.credibility_shadow_controls to service_role;
grant select on table public.trade_evidence_decisions to service_role;
grant select on table public.trade_settlement_shadow_decisions to service_role;
grant select on table public.credibility_shadow_events to service_role;
grant select on table public.credibility_shadow_restriction_signals to service_role;
grant select on table public.credibility_shadow_aggregates to service_role;

revoke execute on function public.credibility_shadow_category_for_action_category(text)
  from public, anon, authenticated, service_role;
revoke execute on function public.credibility_shadow_event_plan_v1(text, numeric, text, text, text)
  from public, anon, authenticated, service_role;
revoke execute on function public.refresh_profile_credibility_shadow(uuid)
  from public, anon, authenticated, service_role;
revoke execute on function public.handle_credibility_shadow_event_refresh()
  from public, anon, authenticated, service_role;
revoke execute on function public.materialize_trade_evidence_decision_shadow_v1(uuid)
  from public, anon, authenticated, service_role;
revoke execute on function public.materialize_trade_settlement_shadow_v1(uuid)
  from public, anon, authenticated, service_role;
revoke execute on function moral_trade_private.reject_credibility_shadow_history_mutation()
  from public, anon, authenticated, service_role;

revoke execute on function public.record_trade_evidence_decision_v1(
  uuid, uuid, smallint, text, text, text, text, text, text, text, text, text, text, uuid
) from public, anon;
grant execute on function public.record_trade_evidence_decision_v1(
  uuid, uuid, smallint, text, text, text, text, text, text, text, text, text, text, uuid
) to authenticated, service_role;

revoke execute on function public.record_trade_settlement_shadow_decision_v1(
  uuid, uuid, smallint, text, text, text, text, text, text, uuid
) from public, anon;
grant execute on function public.record_trade_settlement_shadow_decision_v1(
  uuid, uuid, smallint, text, text, text, text, text, text, uuid
) to authenticated, service_role;

revoke execute on function public.list_credibility_shadow_differential_v1(integer, integer)
  from public, anon;
grant execute on function public.list_credibility_shadow_differential_v1(integer, integer)
  to authenticated, service_role;

comment on table public.trade_evidence_decisions is
  'Private append-only final evidence decisions. Completion is factual; causal additionality is deliberately excluded.';
comment on table public.credibility_shadow_events is
  'Private v2 shadow credibility events. They cannot affect public credibility, ranking, exposure, safeguards, or eligibility while controls remain in shadow mode.';
comment on table public.credibility_shadow_restriction_signals is
  'Private operator-only fraud signals. Shadow signals do not mutate active credibility restrictions or public eligibility.';
comment on function public.record_trade_evidence_decision_v1(
  uuid, uuid, smallint, text, text, text, text, text, text, text, text, text, text, uuid
) is
  'Records one final milestone-scoped evidence decision and materializes only private shadow credibility events.';

notify pgrst, 'reload schema';
