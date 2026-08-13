begin;

do $test$
declare
  split_result integer;
  forbidden_rpc_privileges integer;
begin
  split_result := public.direct_donation_upgrade_redirected_amount(1000, 2000);
  if split_result <> 200 then
    raise exception 'Expected a 20%% redirect of $10 to equal $2; got % cents.', split_result;
  end if;

  perform public.direct_donation_upgrade_validate_split(1000, 2000, 200, 800);

  begin
    perform public.direct_donation_upgrade_validate_split(1000, 2000, 201, 799);
    raise exception 'Mismatched split amounts were accepted.';
  exception
    when others then
      if position('do not match' in lower(sqlerrm)) = 0 then
        raise;
      end if;
  end;

  if to_regclass('public.direct_donation_upgrade_proposals') is null then
    raise exception 'The counteroffer table is missing.';
  end if;
  if to_regprocedure('public.create_direct_donation_upgrade_offer(uuid,text,integer,integer,timestamptz,text,jsonb,jsonb,text,text,text,integer)') is null then
    raise exception 'The percentage-aware create RPC is missing.';
  end if;
  if to_regprocedure('public.propose_direct_donation_upgrade_terms(uuid,uuid,integer,integer,integer,integer,text,text)') is null then
    raise exception 'The counteroffer RPC is missing.';
  end if;
  if to_regprocedure('public.accept_direct_donation_upgrade_proposal(uuid,uuid,text)') is null then
    raise exception 'The counteroffer acceptance RPC is missing.';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'direct_donation_upgrade_offers'
      and column_name = 'redirect_basis_points'
  ) or not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'direct_donation_upgrade_obligations'
      and column_name = 'obligation_kind'
  ) then
    raise exception 'Partial-redirection columns are missing.';
  end if;

  select count(*) into forbidden_rpc_privileges
  from information_schema.routine_privileges
  where routine_schema = 'public'
    and routine_name in (
      'propose_direct_donation_upgrade_terms',
      'withdraw_direct_donation_upgrade_proposal',
      'reject_direct_donation_upgrade_proposal',
      'accept_direct_donation_upgrade_proposal'
    )
    and grantee in ('PUBLIC', 'anon', 'authenticated');
  if forbidden_rpc_privileges <> 0 then
    raise exception 'A counteroffer RPC is executable by a public user role.';
  end if;

  if has_table_privilege('anon', 'public.direct_donation_upgrade_proposals', 'select')
     or has_table_privilege('authenticated', 'public.direct_donation_upgrade_proposals', 'select') then
    raise exception 'Private counteroffers are directly readable by public user roles.';
  end if;
end;
$test$;

rollback;
