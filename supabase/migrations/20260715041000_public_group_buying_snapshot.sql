create or replace function public.get_public_group_buying_snapshot()
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $function$
with
live_cycles as (
  select
    id,
    label,
    mode,
    currency,
    status,
    ballot_closes_at,
    summary_published_at,
    created_at
  from public.mpgf_cycles
  where mode in ('real_money', 'pledge_only')
    and concat_ws(' ', id, label, mode) !~* '(^|[[:space:]_:-])(demo|test|sandbox|simulated)([[:space:]_:-]|$)'
    and status !~* '(closed|cancelled|canceled|expired|archived|completed|complete)'
),
route_payload as (
  select
    p.title as sort_title,
    jsonb_build_object(
      'id', p.id::text,
      'publicKey', a.id,
      'title', p.title,
      'summary', coalesce(nullif(p.summary, ''), a.description),
      'causeArea', coalesce(nullif(p.cause_area, ''), a.cause_area),
      'recipientName', coalesce(nullif(p.proposed_recipient_name, ''), a.recipient_name),
      'intervention', p.intervention,
      'verificationSummary', coalesce(nullif(p.outcome_units_summary, ''), a.outcome_unit),
      'expectedEffect', p.expected_effect_vs_funding,
      'timeline', p.timeline,
      'statusLabel', case
        when c.mode = 'real_money' then 'Live real-money cycle'
        else 'Live pledge-only cycle'
      end,
      'statusSentence', concat(
        'Approved candidate in ',
        c.label,
        '. ',
        case
          when c.mode = 'real_money' then 'Financial activity is read from live payment records.'
          else 'This route records real participant intent but does not move money.'
        end
      ),
      'fundingMode', c.mode,
      'currency', upper(c.currency),
      'minimumFundingCents', coalesce(p.minimum_viable_funding_cents, 0),
      'targetFundingCents', p.requested_maximum_funding_cents,
      'deadlineAt', coalesce(c.ballot_closes_at, c.summary_published_at),
      'failureBehavior', 'If the cycle or its review conditions do not clear, no live settlement is created for this route.',
      'href', '/contact'
    ) as route
  from public.mpgf_pool_proposals p
  join public.mpgf_candidate_alternatives a
    on a.id = p.candidate_alternative_id
  join live_cycles c
    on c.id = a.cycle_id
  where p.status = 'approved_as_candidate'
    and a.status <> 'approved_demo'
    and concat_ws(
      ' ',
      p.title,
      p.summary,
      p.proposed_recipient_name,
      a.id,
      a.name,
      a.recipient_name,
      a.status
    ) !~* '(^|[[:space:]_:-])(demo|test|sandbox|simulated)([[:space:]_:-]|$)'
),
route_summary as (
  select coalesce(jsonb_agg(route order by sort_title), '[]'::jsonb) as routes
  from route_payload
),
live_mandates as (
  select
    id,
    amount_cents,
    currency,
    status,
    created_at,
    updated_at
  from public.conditional_payment_mandates
  where purpose = 'public_goods_pool'
    and livemode = true
),
live_attempts as (
  select
    a.amount_cents,
    a.currency,
    a.status,
    a.refunded_amount_cents,
    a.created_at,
    a.updated_at
  from public.conditional_payment_attempts a
  join live_mandates m
    on m.id = a.mandate_id
),
live_transfers as (
  select
    t.amount_cents,
    t.currency,
    t.status,
    t.created_at,
    t.updated_at
  from public.conditional_settlement_transfers t
  join live_mandates m
    on m.id = t.mandate_id
),
live_recurring as (
  select
    amount_cents,
    currency,
    status,
    next_scheduled_at,
    created_at,
    paused_at,
    cancelled_at
  from public.mpgf_recurring_contribution_commitments
  where mode = 'real_money'
),
financial_activity as (
  select updated_at as activity_at from live_mandates
  union all
  select updated_at as activity_at from live_attempts
  union all
  select updated_at as activity_at from live_transfers
  union all
  select coalesce(cancelled_at, paused_at, next_scheduled_at, created_at) as activity_at
  from live_recurring
),
financial_summary as (
  select jsonb_build_object(
    'currency', upper(coalesce(
      (select currency from live_mandates order by created_at desc limit 1),
      (select currency from live_attempts order by created_at desc limit 1),
      (select currency from live_transfers order by created_at desc limit 1),
      (select currency from live_recurring order by created_at desc limit 1),
      (select currency from live_cycles order by created_at desc limit 1),
      'USD'
    )),
    'liveMandateCount', (select count(*) from live_mandates),
    'openMandateCount', (
      select count(*)
      from live_mandates
      where status in ('setup_pending', 'ready', 'charge_pending', 'requires_action')
    ),
    'openConditionalExposureCents', (
      select coalesce(sum(amount_cents), 0)
      from live_mandates
      where status in ('setup_pending', 'ready', 'charge_pending', 'requires_action')
    ),
    'grossChargedCents', (
      select coalesce(sum(amount_cents), 0)
      from live_attempts
      where status in ('succeeded', 'refunded', 'disputed')
    ),
    'refundedCents', (
      select coalesce(sum(refunded_amount_cents), 0)
      from live_attempts
      where status in ('succeeded', 'refunded', 'disputed')
    ),
    'netChargedCents', greatest(
      (
        select coalesce(sum(amount_cents), 0)
        from live_attempts
        where status in ('succeeded', 'refunded', 'disputed')
      ) - (
        select coalesce(sum(refunded_amount_cents), 0)
        from live_attempts
        where status in ('succeeded', 'refunded', 'disputed')
      ),
      0
    ),
    'transferredCents', (
      select coalesce(sum(amount_cents), 0)
      from live_transfers
      where status = 'transferred'
    ),
    'activeRecurringCommitmentCount', (
      select count(*)
      from live_recurring
      where status in ('active', 'provider_action_required')
    ),
    'activeRecurringMonthlyCents', (
      select coalesce(sum(amount_cents), 0)
      from live_recurring
      where status in ('active', 'provider_action_required')
    ),
    'latestFinancialActivityAt', (select max(activity_at) from financial_activity)
  ) as financial
),
gate_payload as (
  select
    case gate_key
      when 'destination_approved' then 'Live recipient destination'
      when 'legal_terms_approved' then 'Legal terms'
      when 'operator_runbook_approved' then 'Operator runbook'
      when 'payout_profile_approved' then 'Payout profile'
      when 'recipient_compliance_policy_approved' then 'Recipient compliance'
      when 'refund_policy_approved' then 'Refund policy'
      when 'stripe_account_ready' then 'Stripe account'
      when 'stripe_live_keys_configured' then 'Stripe live keys'
      when 'stripe_webhook_configured' then 'Stripe webhook'
      when 'terms_approved' then 'Participant terms'
      when 'webhook_signature' then 'Signed webhook'
      else replace(gate_key, '_', ' ')
    end as sort_label,
    status,
    jsonb_build_object(
      'key', gate_key,
      'label', case gate_key
        when 'destination_approved' then 'Live recipient destination'
        when 'legal_terms_approved' then 'Legal terms'
        when 'operator_runbook_approved' then 'Operator runbook'
        when 'payout_profile_approved' then 'Payout profile'
        when 'recipient_compliance_policy_approved' then 'Recipient compliance'
        when 'refund_policy_approved' then 'Refund policy'
        when 'stripe_account_ready' then 'Stripe account'
        when 'stripe_live_keys_configured' then 'Stripe live keys'
        when 'stripe_webhook_configured' then 'Stripe webhook'
        when 'terms_approved' then 'Participant terms'
        when 'webhook_signature' then 'Signed webhook'
        else replace(gate_key, '_', ' ')
      end,
      'status', case
        when status in ('passed', 'pending', 'blocked') then status
        else 'unknown'
      end,
      'updatedAt', updated_at
    ) as gate
  from public.conditional_payment_gate_status
  where environment = 'live'
),
gate_summary as (
  select
    count(*) filter (where status = 'passed') as passed_count,
    count(*) filter (where status = 'pending') as pending_count,
    count(*) filter (where status = 'blocked') as blocked_count,
    count(*) as total_count,
    coalesce(jsonb_agg(gate order by sort_label), '[]'::jsonb) as gates
  from gate_payload
)
select jsonb_build_object(
  'sourceStatus', 'live',
  'checkedAt', statement_timestamp(),
  'routes', route_summary.routes,
  'openCycleCount', (select count(*) from live_cycles),
  'financial', financial_summary.financial,
  'paymentReadiness', jsonb_build_object(
    'status', case
      when gate_summary.total_count = 0 then 'unavailable'
      when gate_summary.blocked_count > 0 then 'blocked'
      when gate_summary.pending_count > 0
        or gate_summary.passed_count <> gate_summary.total_count then 'pending'
      else 'ready'
    end,
    'passedGateCount', gate_summary.passed_count,
    'pendingGateCount', gate_summary.pending_count,
    'blockedGateCount', gate_summary.blocked_count,
    'totalGateCount', gate_summary.total_count,
    'gates', gate_summary.gates
  )
)
from route_summary
cross join financial_summary
cross join gate_summary;
$function$;

comment on function public.get_public_group_buying_snapshot() is
  'Returns a privacy-safe production group-buying inventory and financial aggregate snapshot. Demo, test, sandbox, simulated, and row-level private payment data are excluded.';

revoke all on function public.get_public_group_buying_snapshot() from public;
grant execute on function public.get_public_group_buying_snapshot() to anon, authenticated, service_role;
