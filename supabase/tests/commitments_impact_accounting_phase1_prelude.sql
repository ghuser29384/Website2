begin;

-- Synthetic auth users create canonical private account rows whose production
-- policy intentionally blocks hard deletion. This transaction-scoped trigger
-- removes only the fixed QA approver fixture so the regression can exercise
-- deletion-safe impact-governance history without weakening that policy.
create function pg_temp.phase1_cleanup_person_account()
returns trigger
language plpgsql
set search_path = moral_trade_private, pg_temp
as $$
begin
  delete from moral_trade_private.person_accounts
  where profile_id = old.id;

  return old;
end;
$$;

create trigger phase1_cleanup_person_account_before_auth_delete
before delete on auth.users
for each row
when (old.id = '7a100000-0000-4000-8000-000000000001'::uuid)
execute function pg_temp.phase1_cleanup_person_account();
