-- Run after the 20260729165525-20260729165530 evidence/payment rollout.
-- These checks are read-only and leave no records behind.

begin;

do $test$
declare
  basis_points_value integer;
  amount_due_value bigint;
  invalid_band_rows integer;
begin
  select result.payout_basis_points, result.amount_due_cents
  into basis_points_value, amount_due_value
  from public.trade_milestone_payout_v1(500, 1, 1, 50) result;

  if basis_points_value <> 5000 or amount_due_value <> 250 then
    raise exception 'Full completion at the 50%% band must pay 250 of 500 cents.';
  end if;

  select result.payout_basis_points, result.amount_due_cents
  into basis_points_value, amount_due_value
  from public.trade_milestone_payout_v1(101, 1, 3, 50) result;

  if basis_points_value <> 1666 or amount_due_value <> 16 then
    raise exception 'Payout must deterministically floor to whole cents.';
  end if;

  select count(*)
  into invalid_band_rows
  from public.trade_milestone_payout_v1(500, 1, 1, 60) result;

  if invalid_band_rows <> 0 then
    raise exception 'A confidence value outside 0/25/50/75/100 must fail closed.';
  end if;
end;
$test$;

do $test$
begin
  if has_table_privilege('anon', 'public.profiles', 'select') then
    raise exception 'Anonymous callers must not have base-table profile access.';
  end if;

  if has_table_privilege('authenticated', 'public.agreements', 'update')
     or has_table_privilege('authenticated', 'public.agreement_review_cases', 'update')
     or has_table_privilege('authenticated', 'public.agreement_payments', 'update') then
    raise exception 'Legacy participant lifecycle/review/payment UPDATE grants remain open.';
  end if;

  if has_table_privilege(
    'authenticated',
    'public.trade_external_payment_receipts',
    'insert'
  ) then
    raise exception 'External payment receipts must be written only through the trusted RPC.';
  end if;
end;
$test$;

rollback;
