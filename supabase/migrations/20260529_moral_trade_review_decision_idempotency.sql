-- Make persisted Moral Trade review decisions retry-safe and hash-bound.

alter table public.moral_trade_review_decisions
  add column if not exists idempotency_key text,
  add column if not exists decision_hash text;

update public.moral_trade_review_decisions
set idempotency_key = 'legacy-review-decision:' || id::text
where idempotency_key is null or btrim(idempotency_key) = '';

update public.moral_trade_review_decisions
set decision_hash = left(replace(id::text, '-', '') || repeat('0', 64), 64)
where decision_hash is null or decision_hash !~ '^[a-f0-9]{64}$';

alter table public.moral_trade_review_decisions
  alter column idempotency_key set not null,
  alter column decision_hash set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'moral_trade_review_decisions_decision_hash_check'
  ) then
    alter table public.moral_trade_review_decisions
      add constraint moral_trade_review_decisions_decision_hash_check
      check (decision_hash ~ '^[a-f0-9]{64}$');
  end if;
end $$;

create unique index if not exists moral_trade_review_decisions_owner_idempotency_idx
  on public.moral_trade_review_decisions (owner_profile_id, idempotency_key);

create unique index if not exists moral_trade_review_decisions_decision_hash_idx
  on public.moral_trade_review_decisions (decision_hash);
