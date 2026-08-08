-- Install the profile badge projection without sharing a transaction with auth.users DDL.
-- The core identity migration is additive and fail-closed; this follow-up is idempotent
-- and can be retried independently if public.profiles is temporarily busy.

begin;

set local statement_timeout = '120s';
set local lock_timeout = '90s';

do $require_one_person_profile_projection_function$
begin
  if to_regprocedure('moral_trade_private.sync_identity_badge_from_profile()') is null then
    raise exception using
      errcode = '55000',
      message = 'one_person_profile_projection_function_missing';
  end if;
end;
$require_one_person_profile_projection_function$;

drop trigger if exists sync_identity_badge_from_profile on public.profiles;
create trigger sync_identity_badge_from_profile
after insert or update on public.profiles
for each row execute function moral_trade_private.sync_identity_badge_from_profile();

notify pgrst, 'reload schema';

commit;
