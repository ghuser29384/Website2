create index if not exists agreement_reminder_rules_user_idx
  on public.agreement_reminder_rules (user_id, agreement_id);
