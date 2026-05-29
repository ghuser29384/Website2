-- Disable new signed-out offer contact writes while preserving legacy records.
-- Owners can still review existing guest_interests rows, and users can still
-- claim legacy rows by signing up with the same email.

drop policy if exists "guest_interests_insert_public" on public.guest_interests;

comment on table public.guest_interests is
  'Legacy signed-out offer responses kept for owner continuity and account-claim linkage. New public contact writes are disabled; signed-in responses use public.interests.';
