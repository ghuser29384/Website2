-- Complete the server-owned invitation boundary and cover recipient lookups.

drop policy if exists trade_invitations_participant_select
  on public.trade_invitations;
drop policy if exists email_outbox_insert_own
  on public.email_outbox;
drop policy if exists email_outbox_select_own
  on public.email_outbox;

create index if not exists trade_invitations_recipient_user_idx
  on public.trade_invitations(recipient_user_id)
  where recipient_user_id is not null;

create index if not exists trade_invitations_claimed_by_idx
  on public.trade_invitations(claimed_by)
  where claimed_by is not null;
