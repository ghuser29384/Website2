alter table public.conditional_payment_customers
  drop constraint if exists conditional_payment_customers_pkey;

alter table public.conditional_payment_customers
  add primary key (profile_id, livemode);
