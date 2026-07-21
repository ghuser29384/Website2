alter table public.email_outbox
  add column if not exists dedupe_key text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.email_outbox'::regclass
      and conname = 'email_outbox_dedupe_key_key'
  ) then
    alter table public.email_outbox
      add constraint email_outbox_dedupe_key_key unique (dedupe_key);
  end if;
end
$$;
