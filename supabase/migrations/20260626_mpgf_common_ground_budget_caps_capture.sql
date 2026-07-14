alter table public.mpgf_user_budgets
  add column if not exists per_project_cap_cents bigint not null default 0 check (per_project_cap_cents >= 0),
  add column if not exists next_capture_at timestamptz,
  add column if not exists next_capture_rule text not null default 'none_before_final_review' check (
    next_capture_rule in ('none_before_final_review', 'monthly_after_final_review', 'manual_review_required')
  );

comment on column public.mpgf_user_budgets.per_project_cap_cents is
  'Budget-level per-project exposure cap for moral public goods candidate allocation.';

comment on column public.mpgf_user_budgets.next_capture_at is
  'Optional reviewed next-capture timestamp; preview and setup flows cannot capture before final review.';

comment on column public.mpgf_user_budgets.next_capture_rule is
  'Reviewed next-capture rule for Common Ground Budget schedules; no preview capture authority.';
