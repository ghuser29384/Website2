begin;

alter table public.mpgf_round_rulebooks
  add column if not exists ecm_plus_hybrid_policy text not null default 'ecm_core_plus_moral_trade_safeguards_preserve_capped_qf_and_review_stack_v1',
  add column if not exists refund_reroute_policy text not null default 'donor_selected_refund_release_or_reroute_after_failed_cross_view_batch',
  add column if not exists cross_view_subsidy_policy text not null default 'base_1_to_1_then_capped_qf_plus_simple_cross_view_premium_schedule',
  add column if not exists batch_interval_min_days integer not null default 7 check (batch_interval_min_days = 7),
  add column if not exists batch_interval_max_days integer not null default 14 check (batch_interval_max_days = 14),
  add column if not exists cross_view_subsidy_schedule jsonb not null default '[]'::jsonb;

comment on column public.mpgf_round_rulebooks.ecm_plus_hybrid_policy is
  'ECM-core plus Moral Trade safeguards: preserve anti-threat, challenge, privacy, reviewer-conflict, and capped QF layers instead of replacing them with exact ECM unchanged.';

comment on column public.mpgf_round_rulebooks.refund_reroute_policy is
  'Public failed-batch outcome policy: unmatched pledges expire or release authorization, while captured funds require refund or donor-configured reroute handling.';

comment on column public.mpgf_round_rulebooks.cross_view_subsidy_schedule is
  'Public cross-view premium schedule layered after 1:1 base match and alongside the capped QF breadth bonus.';

commit;
