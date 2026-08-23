-- Cover every foreign-key lookup introduced by the evidence/credibility shadow schema.

create index if not exists credibility_shadow_aggregates_model_version_idx
  on public.credibility_shadow_aggregates(model_version);

create index if not exists credibility_shadow_controls_model_version_idx
  on public.credibility_shadow_controls(model_version);
create index if not exists credibility_shadow_controls_updated_by_idx
  on public.credibility_shadow_controls(updated_by);

create index if not exists credibility_shadow_events_agreement_id_idx
  on public.credibility_shadow_events(agreement_id);
create index if not exists credibility_shadow_events_counterparty_id_idx
  on public.credibility_shadow_events(counterparty_id);
create index if not exists credibility_shadow_events_evidence_decision_id_idx
  on public.credibility_shadow_events(evidence_decision_id);
create index if not exists credibility_shadow_events_model_version_idx
  on public.credibility_shadow_events(model_version);
create index if not exists credibility_shadow_events_settlement_decision_id_idx
  on public.credibility_shadow_events(settlement_decision_id);

create index if not exists credibility_shadow_restriction_signals_profile_id_idx
  on public.credibility_shadow_restriction_signals(profile_id);

create index if not exists trade_evidence_decisions_agreement_id_idx
  on public.trade_evidence_decisions(agreement_id);
create index if not exists trade_evidence_decisions_agreement_version_id_idx
  on public.trade_evidence_decisions(agreement_version_id);
create index if not exists trade_evidence_decisions_base_review_id_idx
  on public.trade_evidence_decisions(base_review_id);
create index if not exists trade_evidence_decisions_created_by_idx
  on public.trade_evidence_decisions(created_by);
create index if not exists trade_evidence_decisions_payer_id_idx
  on public.trade_evidence_decisions(payer_id);

create index if not exists trade_settlement_shadow_decisions_payment_review_decision_id_idx
  on public.trade_settlement_shadow_decisions(payment_review_decision_id);
create index if not exists trade_settlement_shadow_decisions_agreement_id_idx
  on public.trade_settlement_shadow_decisions(agreement_id);
create index if not exists trade_settlement_shadow_decisions_created_by_idx
  on public.trade_settlement_shadow_decisions(created_by);
create index if not exists trade_settlement_shadow_decisions_milestone_id_idx
  on public.trade_settlement_shadow_decisions(milestone_id);
create index if not exists trade_settlement_shadow_decisions_payee_id_idx
  on public.trade_settlement_shadow_decisions(payee_id);
create index if not exists trade_settlement_shadow_decisions_payer_id_idx
  on public.trade_settlement_shadow_decisions(payer_id);

notify pgrst, 'reload schema';
