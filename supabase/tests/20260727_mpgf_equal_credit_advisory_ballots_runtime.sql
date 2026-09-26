begin;

do $preflight$
begin
  if (select count(*) from public.profiles) < 2 then
    raise exception 'MPGF runtime test requires two QA profiles.';
  end if;
end;
$preflight$;

insert into public.mpgf_phase_one_rounds (
  id,
  slug,
  title,
  status,
  pledge_opens_at,
  pledge_closes_at,
  ballot_opens_at,
  ballot_closes_at
) values (
  '10000000-0000-4000-8000-000000000001',
  'runtime-equal-credit-check',
  'Runtime equal-credit check',
  'pledge_open',
  timezone('utc', now()) - interval '1 hour',
  timezone('utc', now()) + interval '1 hour',
  timezone('utc', now()) + interval '1 hour',
  timezone('utc', now()) + interval '2 hours'
);

insert into public.mpgf_phase_one_projects (
  id,
  round_id,
  slug,
  title,
  summary,
  recipient_name,
  action_category,
  external_checkout_url,
  status,
  approved_at,
  reviewed_at
) values
(
  '10000000-0000-4000-8000-000000000011',
  '10000000-0000-4000-8000-000000000001',
  'runtime-project-a',
  'Runtime project A',
  'Reviewed runtime project A for equal-credit verification.',
  'Runtime recipient A',
  'global_health',
  'https://example.org/project-a',
  'approved',
  timezone('utc', now()),
  timezone('utc', now())
),
(
  '10000000-0000-4000-8000-000000000012',
  '10000000-0000-4000-8000-000000000001',
  'runtime-project-b',
  'Runtime project B',
  'Reviewed runtime project B for equal-credit verification.',
  'Runtime recipient B',
  'public_interest_knowledge',
  'https://example.org/project-b',
  'approved',
  timezone('utc', now()),
  timezone('utc', now())
);

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  (select id::text from public.profiles order by id limit 1),
  true
);
select public.confirm_mpgf_phase_one_pledge(
  '10000000-0000-4000-8000-000000000001',
  10000,
  'runtime.pledge.user-one'
);
select public.confirm_mpgf_phase_one_pledge(
  '10000000-0000-4000-8000-000000000001',
  10000,
  'runtime.pledge.user-one'
);

select set_config(
  'request.jwt.claim.sub',
  (select id::text from public.profiles order by id offset 1 limit 1),
  true
);
select public.confirm_mpgf_phase_one_pledge(
  '10000000-0000-4000-8000-000000000001',
  1000000,
  'runtime.pledge.user-two'
);
reset role;

update public.mpgf_phase_one_rounds
set
  pledge_opens_at = timezone('utc', now()) - interval '4 hours',
  pledge_closes_at = timezone('utc', now()) - interval '3 hours',
  ballot_opens_at = timezone('utc', now()) - interval '2 hours',
  ballot_closes_at = timezone('utc', now()) + interval '1 hour'
where id = '10000000-0000-4000-8000-000000000001';

set local role service_role;
select public.open_mpgf_phase_one_ballot(
  '10000000-0000-4000-8000-000000000001'
);
select public.open_mpgf_phase_one_ballot(
  '10000000-0000-4000-8000-000000000001'
);
reset role;

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  (select id::text from public.profiles order by id limit 1),
  true
);
select public.submit_mpgf_phase_one_ballot(
  '10000000-0000-4000-8000-000000000001',
  array[
    '10000000-0000-4000-8000-000000000011',
    '10000000-0000-4000-8000-000000000012'
  ]::uuid[],
  'runtime.ballot.user-one'
);

select set_config(
  'request.jwt.claim.sub',
  (select id::text from public.profiles order by id offset 1 limit 1),
  true
);
select public.submit_mpgf_phase_one_ballot(
  '10000000-0000-4000-8000-000000000001',
  array['10000000-0000-4000-8000-000000000012']::uuid[],
  'runtime.ballot.user-two'
);
reset role;

set local role service_role;
update public.mpgf_phase_one_rounds
set ballot_closes_at = timezone('utc', now()) - interval '1 minute'
where id = '10000000-0000-4000-8000-000000000001';
select public.publish_mpgf_phase_one_results(
  '10000000-0000-4000-8000-000000000001'
);
select public.publish_mpgf_phase_one_results(
  '10000000-0000-4000-8000-000000000001'
);
reset role;

set local role anon;
select public.get_mpgf_phase_one_governance_state(
  '10000000-0000-4000-8000-000000000001'
);
reset role;

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  (select id::text from public.profiles order by id limit 1),
  true
);
select public.confirm_mpgf_phase_one_external_checkout(
  '10000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000011',
  7500,
  public.get_mpgf_phase_one_governance_state(
    '10000000-0000-4000-8000-000000000001'
  ) #>> '{results,resultHash}',
  'runtime.checkout.user-one'
);
reset role;

update public.mpgf_phase_one_projects
set status = 'paused'
where id = '10000000-0000-4000-8000-000000000012';

do $runtime$
declare
  v_state jsonb;
  v_handoff jsonb;
  v_share_a integer;
  v_share_b integer;
begin
  v_state := public.get_mpgf_phase_one_governance_state(
    '10000000-0000-4000-8000-000000000001'
  );

  if (v_state #>> '{results,quorumMet}')::boolean is distinct from true then
    raise exception 'Runtime check failed: quorum was not met.';
  end if;

  if (v_state #>> '{results,eligiblePledgerCount}')::integer <> 2
     or (v_state #>> '{results,submittedBallotCount}')::integer <> 2
     or (v_state #>> '{results,quorumRequiredCount}')::integer <> 1 then
    raise exception 'Runtime check failed: electorate or quorum counts are wrong.';
  end if;

  select (share ->> 'advisoryShareBps')::integer
  into v_share_a
  from jsonb_array_elements(v_state #> '{results,projectShares}') share
  where share ->> 'projectId' = '10000000-0000-4000-8000-000000000011';

  select (share ->> 'advisoryShareBps')::integer
  into v_share_b
  from jsonb_array_elements(v_state #> '{results,projectShares}') share
  where share ->> 'projectId' = '10000000-0000-4000-8000-000000000012';

  if v_share_a <> 2500 or v_share_b <> 7500 then
    raise exception
      'Runtime check failed: expected 25/75 equal-credit shares, got %/%',
      v_share_a,
      v_share_b;
  end if;

  if (v_state #>> '{policy,pledgeAmountAffectsWeight}')::boolean is distinct from false
     or (v_state #>> '{policy,binding}')::boolean is distinct from false then
    raise exception 'Runtime check failed: public policy overstated binding or amount weight.';
  end if;

  if has_table_privilege(
       'anon',
       'public.mpgf_phase_one_pledges',
       'select'
     )
     or has_table_privilege(
       'authenticated',
       'public.mpgf_phase_one_ballots',
       'select'
     ) then
    raise exception 'Runtime check failed: private phase-one tables have direct participant grants.';
  end if;

  if not has_function_privilege(
    'anon',
    'public.get_mpgf_phase_one_governance_state(uuid)',
    'execute'
  ) then
    raise exception 'Runtime check failed: public projection is not callable by anon.';
  end if;

  select public.confirm_mpgf_phase_one_external_checkout(
    '10000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000011',
    7500,
    public.get_mpgf_phase_one_governance_state(
      '10000000-0000-4000-8000-000000000001'
    ) #>> '{results,resultHash}',
    'runtime.checkout.user-one'
  )
  into v_handoff;

  if (v_handoff ->> 'moneyMoved')::boolean is distinct from false
     or (v_handoff ->> 'paymentConfirmed')::boolean is distinct from false
     or (v_handoff ->> 'receiptRecorded')::boolean is distinct from false then
    raise exception 'Runtime check failed: checkout handoff claimed a payment.';
  end if;

  begin
    perform public.confirm_mpgf_phase_one_external_checkout(
      '10000000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000012',
      2500,
      public.get_mpgf_phase_one_governance_state(
        '10000000-0000-4000-8000-000000000001'
      ) #>> '{results,resultHash}',
      'runtime.checkout.paused'
    );
    raise exception 'Runtime check failed: paused project accepted a checkout handoff.';
  exception
    when others then
      if sqlerrm not like '%External checkout is paused%' then
        raise;
      end if;
  end;
end;
$runtime$;

rollback;

select
  'all_runtime_assertions_passed' as status,
  2 as eligible_pledgers,
  2 as submitted_ballots,
  2500 as project_a_share_bps,
  7500 as project_b_share_bps,
  false as pledge_amount_affects_weight,
  false as binding,
  false as money_moved;
