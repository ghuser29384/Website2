-- Keep the A1 scheduled-slot ledger service-only while making the deny-all RLS
-- intent explicit for Supabase security advisors and future maintainers.

drop policy if exists recommendation_training_slots_deny_browser_access
  on public.recommendation_training_slots;

create policy recommendation_training_slots_deny_browser_access
  on public.recommendation_training_slots
  for all
  to anon, authenticated
  using (false)
  with check (false);
