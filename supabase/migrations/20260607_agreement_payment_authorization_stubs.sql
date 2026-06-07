alter table public.agreement_payments
  add column if not exists authorization_mode text not null default 'direct_checkout',
  add column if not exists authorization_status text not null default 'not_required_for_stage',
  add column if not exists capture_policy text not null default 'direct_checkout_after_participant_request',
  add column if not exists authorization_gate_snapshot text not null default '',
  add column if not exists authorization_expires_at timestamptz,
  add column if not exists authorized_at timestamptz;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'agreement_payments_authorization_mode_check'
  ) then
    alter table public.agreement_payments
      add constraint agreement_payments_authorization_mode_check
      check (
        authorization_mode in (
          'direct_checkout',
          'manual_review_stub',
          'provider_managed_conditional_authorization'
        )
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'agreement_payments_authorization_status_check'
  ) then
    alter table public.agreement_payments
      add constraint agreement_payments_authorization_status_check
      check (
        authorization_status in (
          'not_required_for_stage',
          'stub_blocked',
          'manual_review_required',
          'authorization_pending',
          'authorized',
          'authorization_failed',
          'expired',
          'capture_blocked'
        )
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'agreement_payments_capture_policy_check'
  ) then
    alter table public.agreement_payments
      add constraint agreement_payments_capture_policy_check
      check (
        capture_policy in (
          'direct_checkout_after_participant_request',
          'no_capture_until_matched_lock_confirmed'
        )
      );
  end if;
end $$;

create index if not exists agreement_payments_authorization_idx
  on public.agreement_payments (
    agreement_id,
    authorization_mode,
    authorization_status,
    capture_policy,
    created_at desc
  );

comment on column public.agreement_payments.authorization_mode is
  'Direct checkout for ordinary agreements, or a fail-closed payment authorization stub for donation offsets, pledge swaps, and compensated moral-action agreements until conditional provider authorization is implemented.';

comment on column public.agreement_payments.capture_policy is
  'No-capture policy for marketplace-derived moral trades; immediate Stripe Checkout is not a conditional authorization.';
