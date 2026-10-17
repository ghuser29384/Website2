-- Interface-preserving production adapter for the accepted Moral Trade Create flow.
-- The browser submits one versioned JSON contract; this migration atomically creates
-- the corresponding reviewable offer or MPGF pool proposal and stores the exact terms.
begin;

create extension if not exists pgcrypto;

create table if not exists public.moral_trade_create_submissions (
  id uuid primary key default gen_random_uuid(),
  owner_profile_id uuid not null references public.profiles(id) on delete cascade,
  submission_key text not null,
  interface_version text not null check (interface_version = 'moral_trade_create_v1'),
  submission_kind text not null check (
    submission_kind in ('pledge_swap', 'donation_redirect', 'pool_create', 'existing_pool_contribution')
  ),
  cause_area text not null,
  request_kind text not null check (request_kind in ('commitment', 'skill', 'fund')),
  requested_action text not null,
  offered_terms_json jsonb not null default '[]'::jsonb,
  pool_terms_json jsonb,
  source_payload_json jsonb not null,
  source_payload_hash text not null check (source_payload_hash ~ '^[0-9a-f]{64}$'),
  target_type text check (target_type in ('offer', 'mpgf_pool_proposal')),
  target_id uuid,
  status text not null default 'pending_review' check (
    status in ('pending_review', 'published', 'changes_requested', 'rejected', 'withdrawn')
  ),
  canonical_path text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (owner_profile_id, submission_key),
  unique (owner_profile_id, source_payload_hash),
  check ((target_type is null) = (target_id is null)),
  check (jsonb_typeof(offered_terms_json) = 'array'),
  check (jsonb_typeof(source_payload_json) = 'object'),
  check (pool_terms_json is null or jsonb_typeof(pool_terms_json) = 'object')
);

comment on table public.moral_trade_create_submissions is
  'Versioned, idempotent receipt for the accepted Create interface. A row is durable only when its target record was created in the same database transaction.';

create table if not exists public.moral_trade_create_offer_terms (
  offer_id uuid primary key references public.offers(id) on delete cascade,
  create_submission_id uuid not null unique references public.moral_trade_create_submissions(id) on delete cascade,
  request_kind text not null check (request_kind in ('commitment', 'skill', 'fund')),
  exact_requested_action text not null,
  contribution_options_json jsonb not null,
  existing_pool_reference text,
  existing_pool_amount_cents bigint,
  existing_pool_currency text,
  created_at timestamptz not null default timezone('utc', now()),
  check (jsonb_typeof(contribution_options_json) = 'array'),
  check (
    (existing_pool_reference is null and existing_pool_amount_cents is null and existing_pool_currency is null)
    or
    (existing_pool_reference is not null and existing_pool_amount_cents > 0 and existing_pool_currency is not null)
  )
);

create table if not exists public.moral_trade_donation_redirect_proposals (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null unique references public.offers(id) on delete cascade,
  create_submission_id uuid not null unique references public.moral_trade_create_submissions(id) on delete cascade,
  owner_profile_id uuid not null references public.profiles(id) on delete cascade,
  requested_redirect_terms text not null,
  cause_area text not null,
  contribution_options_json jsonb not null,
  completion_requirements_json jsonb not null default '[
    "Confirm the planned-donation baseline and amount",
    "Confirm the protected fallback destination",
    "Confirm the matched or redirected destination",
    "Complete payment-method authorization before any public matching window",
    "Freeze deadlines, settlement, refund, and unmatched-surplus terms"
  ]'::jsonb,
  status text not null default 'pending_review' check (
    status in ('pending_review', 'changes_requested', 'ready_for_authorization', 'rejected', 'withdrawn')
  ),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (jsonb_typeof(contribution_options_json) = 'array'),
  check (jsonb_typeof(completion_requirements_json) = 'array')
);

create table if not exists public.moral_trade_create_pool_terms (
  pool_proposal_id uuid primary key references public.mpgf_pool_proposals(id) on delete cascade,
  create_submission_id uuid not null unique references public.moral_trade_create_submissions(id) on delete cascade,
  threshold_amounts_cents_json jsonb not null,
  deadline_at timestamptz not null,
  failure_bonus_base_type text not null check (
    failure_bonus_base_type in ('none', 'fixed', 'percentage', 'function')
  ),
  failure_bonus_base_terms_json jsonb not null,
  failure_bonus_timing_mode text not null check (
    failure_bonus_timing_mode in ('all', 'cutoff', 'firstPercent', 'preset', 'piecewise', 'formula')
  ),
  failure_bonus_timing_terms_json jsonb not null,
  formula_source text,
  formula_ast_json jsonb,
  formula_language_version text,
  formula_hash text,
  formula_variables_json jsonb,
  continuation_mode text not null check (continuation_mode in ('stop', 'continue')),
  threshold_visibility public.mpgf_threshold_visibility not null default 'public_exact',
  progress_visibility public.mpgf_progress_visibility not null default 'exact_amount',
  moral_trade_failure_bonus_share_bps integer not null default 0 check (
    moral_trade_failure_bonus_share_bps between 0 and 10000
  ),
  additional_activation_rule text not null default '',
  reserve_quote_status text not null default 'pending_underwriting' check (
    reserve_quote_status in ('not_applicable', 'pending_underwriting', 'quoted', 'approved', 'revision_required', 'rejected')
  ),
  review_status text not null default 'pending_review' check (
    review_status in ('pending_review', 'approved', 'revision_required', 'rejected')
  ),
  terms_locked_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (jsonb_typeof(threshold_amounts_cents_json) = 'array'),
  check (jsonb_array_length(threshold_amounts_cents_json) between 1 and 10),
  check (jsonb_typeof(failure_bonus_base_terms_json) = 'object'),
  check (jsonb_typeof(failure_bonus_timing_terms_json) = 'object'),
  check (
    (
      failure_bonus_timing_mode = 'formula'
      and formula_source is not null
      and formula_ast_json is not null
      and formula_language_version = 'moral_trade_timing_formula_v1'
      and formula_hash ~ '^[0-9a-f]{64}$'
      and jsonb_typeof(formula_variables_json) = 'array'
    )
    or
    (
      failure_bonus_timing_mode <> 'formula'
      and formula_source is null
      and formula_ast_json is null
      and formula_language_version is null
      and formula_hash is null
      and formula_variables_json is null
    )
  )
);

comment on table public.moral_trade_create_pool_terms is
  'Exact Create-interface terms that are not silently projected into the legacy percentage-only reserve contract. They remain pending underwriting and operator review until translated and approved.';

create index if not exists moral_trade_create_submissions_owner_created_idx
  on public.moral_trade_create_submissions(owner_profile_id, created_at desc);
create index if not exists moral_trade_create_submissions_status_idx
  on public.moral_trade_create_submissions(status, created_at asc);
create index if not exists moral_trade_donation_redirect_proposals_owner_idx
  on public.moral_trade_donation_redirect_proposals(owner_profile_id, created_at desc);
create index if not exists moral_trade_create_pool_terms_review_idx
  on public.moral_trade_create_pool_terms(review_status, created_at asc);

create or replace function public.moral_trade_create_set_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $function$
begin
  new.updated_at := timezone('utc', now());
  return new;
end;
$function$;

create trigger moral_trade_create_submissions_set_updated_at
before update on public.moral_trade_create_submissions
for each row execute function public.moral_trade_create_set_updated_at();

create trigger moral_trade_donation_redirect_proposals_set_updated_at
before update on public.moral_trade_donation_redirect_proposals
for each row execute function public.moral_trade_create_set_updated_at();

create trigger moral_trade_create_pool_terms_set_updated_at
before update on public.moral_trade_create_pool_terms
for each row execute function public.moral_trade_create_set_updated_at();

create or replace function public.moral_trade_create_pool_terms_immutable()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $function$
declare
  accepted_at timestamptz;
begin
  select first_accepted_pledge_at
  into accepted_at
  from public.mpgf_pool_proposals
  where id = old.pool_proposal_id;

  if accepted_at is not null then
    raise exception using
      errcode = '23514',
      message = 'Create-interface pool terms are immutable after the first accepted pledge.';
  end if;

  if old.review_status = 'approved' then
    raise exception using
      errcode = '23514',
      message = 'Approved Create-interface pool terms are immutable.';
  end if;

  return new;
end;
$function$;

create trigger moral_trade_create_pool_terms_immutable
before update or delete on public.moral_trade_create_pool_terms
for each row execute function public.moral_trade_create_pool_terms_immutable();

alter table public.moral_trade_create_submissions enable row level security;
alter table public.moral_trade_create_offer_terms enable row level security;
alter table public.moral_trade_donation_redirect_proposals enable row level security;
alter table public.moral_trade_create_pool_terms enable row level security;

revoke all on public.moral_trade_create_submissions from anon, authenticated;
revoke all on public.moral_trade_create_offer_terms from anon, authenticated;
revoke all on public.moral_trade_donation_redirect_proposals from anon, authenticated;
revoke all on public.moral_trade_create_pool_terms from anon, authenticated;

grant select on public.moral_trade_create_submissions to authenticated;
grant select on public.moral_trade_create_offer_terms to authenticated;
grant select on public.moral_trade_donation_redirect_proposals to authenticated;
grant select on public.moral_trade_create_pool_terms to authenticated;
grant all on public.moral_trade_create_submissions to service_role;
grant all on public.moral_trade_create_offer_terms to service_role;
grant all on public.moral_trade_donation_redirect_proposals to service_role;
grant all on public.moral_trade_create_pool_terms to service_role;

create policy moral_trade_create_submissions_owner_select
on public.moral_trade_create_submissions
for select to authenticated
using (owner_profile_id = (select auth.uid()));

create policy moral_trade_create_offer_terms_owner_select
on public.moral_trade_create_offer_terms
for select to authenticated
using (
  exists (
    select 1 from public.offers
    where offers.id = moral_trade_create_offer_terms.offer_id
      and offers.owner_id = (select auth.uid())
  )
);

create policy moral_trade_donation_redirect_proposals_owner_select
on public.moral_trade_donation_redirect_proposals
for select to authenticated
using (owner_profile_id = (select auth.uid()));

create policy moral_trade_create_pool_terms_owner_select
on public.moral_trade_create_pool_terms
for select to authenticated
using (
  exists (
    select 1 from public.mpgf_pool_proposals
    where mpgf_pool_proposals.id = moral_trade_create_pool_terms.pool_proposal_id
      and mpgf_pool_proposals.proposer_id = (select auth.uid())
  )
);

create or replace function public.moral_trade_create_submit_service(
  p_actor_id uuid,
  p_submission_key text,
  p_submission_kind text,
  p_source_payload jsonb,
  p_payload_hash text,
  p_cause_area text,
  p_request_kind text,
  p_requested_action text,
  p_offered_summary text,
  p_offered_terms jsonb,
  p_pool_terms jsonb,
  p_target_fields jsonb
)
returns table (
  submission_id uuid,
  target_type text,
  target_id uuid,
  submission_status text,
  canonical_path text
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  actor_id uuid := p_actor_id;
  actor_alias text;
  existing_submission public.moral_trade_create_submissions%rowtype;
  new_submission_id uuid := gen_random_uuid();
  new_target_id uuid;
  canonical text := '/create/submissions/' || new_submission_id::text;
  mode_value public.offer_mode;
  first_threshold_cents bigint;
  final_threshold_cents bigint;
  deadline_value timestamptz;
  progress_value public.mpgf_progress_visibility;
  threshold_milestones jsonb;
begin
  if actor_id is null then
    raise exception using errcode = '42501', message = 'A valid authenticated actor is required to submit a Create record.';
  end if;

  if p_submission_kind not in ('pledge_swap', 'donation_redirect', 'pool_create', 'existing_pool_contribution') then
    raise exception using errcode = '22023', message = 'Unsupported Create submission kind.';
  end if;
  if p_request_kind not in ('commitment', 'skill', 'fund') then
    raise exception using errcode = '22023', message = 'Unsupported request kind.';
  end if;
  if nullif(btrim(p_submission_key), '') is null
     or length(p_submission_key) > 120
     or p_submission_key !~ '^[A-Za-z0-9:_-]+$' then
    raise exception using errcode = '22023', message = 'Submission key is invalid.';
  end if;
  if p_payload_hash !~ '^[0-9a-f]{64}$' then
    raise exception using errcode = '22023', message = 'Payload hash is invalid.';
  end if;
  if jsonb_typeof(p_source_payload) <> 'object'
     or octet_length(p_source_payload::text) > 180000 then
    raise exception using errcode = '22023', message = 'Source payload is invalid or too large.';
  end if;
  if jsonb_typeof(p_offered_terms) <> 'array' then
    raise exception using errcode = '22023', message = 'Contribution terms must be an array.';
  end if;
  if nullif(btrim(p_cause_area), '') is null or nullif(btrim(p_requested_action), '') is null then
    raise exception using errcode = '22023', message = 'Cause and requested action are required.';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(actor_id::text || ':create-key:' || p_submission_key, 0)
  );
  perform pg_advisory_xact_lock(
    hashtextextended(actor_id::text || ':create-hash:' || p_payload_hash, 0)
  );

  select * into existing_submission
  from public.moral_trade_create_submissions
  where owner_profile_id = actor_id
    and submission_key = p_submission_key
  limit 1;

  if existing_submission.id is not null then
    if existing_submission.source_payload_hash <> p_payload_hash
       or existing_submission.source_payload_json is distinct from p_source_payload then
      raise exception using
        errcode = '23514',
        message = 'This Create submission key was already used for different terms.';
    end if;

    return query select
      existing_submission.id,
      existing_submission.target_type,
      existing_submission.target_id,
      existing_submission.status,
      existing_submission.canonical_path;
    return;
  end if;

  select * into existing_submission
  from public.moral_trade_create_submissions
  where owner_profile_id = actor_id
    and source_payload_hash = p_payload_hash
  limit 1;

  if existing_submission.id is not null then
    if existing_submission.source_payload_json is distinct from p_source_payload then
      raise exception using
        errcode = '23514',
        message = 'A Create payload hash collision was detected.';
    end if;

    return query select
      existing_submission.id,
      existing_submission.target_type,
      existing_submission.target_id,
      existing_submission.status,
      existing_submission.canonical_path;
    return;
  end if;

  if p_source_payload ->> 'interfaceVersion' <> 'moral_trade_create_v1'
     or p_source_payload ->> 'submissionKey' <> p_submission_key
     or btrim(coalesce(p_source_payload ->> 'cause', '')) <> btrim(p_cause_area)
     or p_source_payload ->> 'requestKind' <> p_request_kind
     or btrim(coalesce(p_source_payload ->> 'requestAction', '')) <> btrim(p_requested_action)
     or coalesce(p_source_payload -> 'offers', '[]'::jsonb) is distinct from p_offered_terms then
    raise exception using
      errcode = '23514',
      message = 'The Create payload does not match its validated persistence fields.';
  end if;

  if jsonb_typeof(p_target_fields) <> 'object' then
    raise exception using errcode = '22023', message = 'Create target fields must be an object.';
  end if;
  if p_submission_kind = 'pool_create' and jsonb_typeof(p_pool_terms) <> 'object' then
    raise exception using errcode = '22023', message = 'Direct pool submissions require validated pool terms.';
  end if;
  if p_submission_kind <> 'pool_create' and p_pool_terms is not null then
    raise exception using errcode = '22023', message = 'Only direct pool submissions may include pool terms.';
  end if;

  select coalesce(nullif(btrim(display_name), ''), nullif(btrim(email), ''), 'Moral Trade participant')
  into actor_alias
  from public.profiles
  where id = actor_id;
  if actor_alias is null then
    raise exception using errcode = '23503', message = 'A Moral Trade profile is required before submission.';
  end if;

  insert into public.moral_trade_create_submissions (
    id,
    owner_profile_id,
    submission_key,
    interface_version,
    submission_kind,
    cause_area,
    request_kind,
    requested_action,
    offered_terms_json,
    pool_terms_json,
    source_payload_json,
    source_payload_hash,
    status,
    canonical_path
  ) values (
    new_submission_id,
    actor_id,
    p_submission_key,
    'moral_trade_create_v1',
    p_submission_kind,
    btrim(p_cause_area),
    p_request_kind,
    btrim(p_requested_action),
    p_offered_terms,
    p_pool_terms,
    p_source_payload,
    p_payload_hash,
    'pending_review',
    canonical
  );

  if p_submission_kind in ('pledge_swap', 'donation_redirect', 'existing_pool_contribution') then
    mode_value := case when p_submission_kind = 'donation_redirect' then 'offset' else 'pledge' end;
    new_target_id := gen_random_uuid();

    insert into public.offers (
      id,
      owner_id,
      owner_alias,
      mode,
      offered_cause,
      requested_cause,
      offer_action,
      request_action,
      compromise_cause,
      offer_impact,
      min_counterparty_impact,
      verification,
      duration,
      payment_interval_value,
      payment_interval_unit,
      trust_level,
      notes,
      discount_note,
      status,
      workflow_status,
      moderation_reason,
      submission_key,
      fingerprint,
      no_trade_baseline,
      exit_conditions,
      maximum_burden,
      privacy_scope,
      submitted_at,
      terms_version
    ) values (
      new_target_id,
      actor_id,
      actor_alias,
      mode_value,
      'Creator-defined contribution options',
      btrim(p_cause_area),
      left(btrim(p_offered_summary), 2000),
      btrim(p_requested_action),
      case when p_submission_kind = 'donation_redirect' then btrim(p_cause_area) else 'Not applicable' end,
      1,
      1,
      'Evidence terms must be agreed before any binding trade.',
      'As specified in the selected contribution option.',
      null,
      null,
      1,
      'Created through Moral Trade Create v1. Exact structured terms are stored in the linked Create submission.',
      '',
      'paused',
      'pending_review',
      '',
      'create:' || p_submission_key,
      p_payload_hash,
      'If no proposal is accepted, neither party incurs an obligation.',
      'No commitment exists until both parties confirm final terms.',
      left(btrim(p_offered_summary), 2000),
      'Listing terms may become public after review; private negotiation and sensitive evidence remain private.',
      timezone('utc', now()),
      1
    );

    insert into public.moral_trade_create_offer_terms (
      offer_id,
      create_submission_id,
      request_kind,
      exact_requested_action,
      contribution_options_json,
      existing_pool_reference,
      existing_pool_amount_cents,
      existing_pool_currency
    ) values (
      new_target_id,
      new_submission_id,
      p_request_kind,
      btrim(p_requested_action),
      p_offered_terms,
      nullif(p_target_fields ->> 'existingPoolReference', ''),
      case
        when p_target_fields ? 'existingPoolAmountCents'
        then (p_target_fields ->> 'existingPoolAmountCents')::bigint
        else null
      end,
      nullif(p_target_fields ->> 'existingPoolCurrency', '')
    );

    if p_submission_kind = 'donation_redirect' then
      insert into public.moral_trade_donation_redirect_proposals (
        offer_id,
        create_submission_id,
        owner_profile_id,
        requested_redirect_terms,
        cause_area,
        contribution_options_json
      ) values (
        new_target_id,
        new_submission_id,
        actor_id,
        btrim(p_requested_action),
        btrim(p_cause_area),
        p_offered_terms
      );
    end if;

    update public.moral_trade_create_submissions
    set target_type = 'offer', target_id = new_target_id
    where id = new_submission_id;

    return query select new_submission_id, 'offer'::text, new_target_id, 'pending_review'::text, canonical;
    return;
  end if;

  if p_submission_kind = 'pool_create' then
    if jsonb_typeof(p_pool_terms) <> 'object'
       or jsonb_typeof(p_pool_terms -> 'thresholdAmountsCents') <> 'array'
       or jsonb_array_length(p_pool_terms -> 'thresholdAmountsCents') not between 1 and 10 then
      raise exception using errcode = '22023', message = 'Direct pool terms require one to ten thresholds.';
    end if;

    first_threshold_cents := (p_pool_terms -> 'thresholdAmountsCents' ->> 0)::bigint;
    final_threshold_cents := (
      p_pool_terms -> 'thresholdAmountsCents' ->>
      (jsonb_array_length(p_pool_terms -> 'thresholdAmountsCents') - 1)
    )::bigint;
    deadline_value := (p_pool_terms ->> 'deadlineAt')::timestamptz;
    progress_value := (p_pool_terms ->> 'progressVisibility')::public.mpgf_progress_visibility;

    if first_threshold_cents <= 0 or final_threshold_cents < first_threshold_cents then
      raise exception using errcode = '22023', message = 'Pool threshold amounts are invalid.';
    end if;
    if deadline_value <= timezone('utc', now()) + interval '30 minutes' then
      raise exception using errcode = '22023', message = 'Pool deadline must be at least 30 minutes in the future.';
    end if;

    select jsonb_agg(
      jsonb_build_object(
        'label', format('Cumulative threshold %s', ordinality),
        'amountCents', value::bigint
      ) order by ordinality
    )
    into threshold_milestones
    from jsonb_array_elements_text(p_pool_terms -> 'thresholdAmountsCents') with ordinality;

    new_target_id := gen_random_uuid();
    insert into public.mpgf_pool_proposals (
      id,
      proposer_id,
      title,
      problem,
      intervention,
      moral_public_good_rationale,
      proposed_recipient_name,
      status,
      summary,
      cause_area,
      requested_maximum_funding_cents,
      minimum_viable_funding_cents,
      outcome_units_summary,
      expected_effect_vs_funding,
      timeline,
      milestones_json,
      risks_json,
      misuse_pathways,
      implementing_team_json,
      submitted_at,
      public_goods_destination_type,
      public_goods_destination_ref,
      public_goods_threshold_amount_cents,
      public_goods_threshold_supporters,
      public_goods_deadline_at,
      public_goods_verification_method,
      public_goods_baseline_rule,
      public_goods_exit_rule,
      public_goods_base_match_ratio,
      public_goods_qf_enabled,
      public_goods_qf_cap_multiple,
      public_goods_payout_method,
      threshold_visibility,
      progress_visibility,
      public_goods_failure_bonus_enabled,
      public_goods_success_premium_included_in_net_threshold
    ) values (
      new_target_id,
      actor_id,
      left(btrim(p_requested_action), 240),
      'The creator proposes funding the named moral public good under the exact threshold terms stored with this submission.',
      btrim(p_requested_action),
      'The creator selected ' || btrim(p_cause_area) || ' as the cause to improve. No additional impact claim is inferred.',
      null,
      'submitted',
      'A reviewable multi-threshold moral-public-good pool submitted through Moral Trade Create v1.',
      btrim(p_cause_area),
      final_threshold_cents,
      first_threshold_cents,
      'Unit: one cumulatively cleared funding threshold. Exact amounts are stored in the linked Create terms.',
      'No impact estimate is invented by the adapter. Funding, implementation, and any failure-bonus reserve remain subject to review.',
      'Pledge deadline: ' || deadline_value::text,
      coalesce(threshold_milestones, '[]'::jsonb),
      '[{"risk":"No live-money capability, reserve backing, recipient verification, or payout is authorized by submission alone."}]'::jsonb,
      'The pool remains pending review. Unsupported or unsafe recipient, payout, formula, or activation terms must be revised or rejected before pledges open.',
      jsonb_build_object('summary', 'Implementing team and recipient to be confirmed during review.'),
      timezone('utc', now()),
      'external_charity',
      null,
      first_threshold_cents,
      null,
      deadline_value,
      'Moral Trade ledger plus recipient and implementation evidence required before clearance.',
      'Without an approved and cleared pool, no contribution is charged and no public good is treated as funded.',
      'No pledge is binding before review; post-acceptance exits and settlement follow the approved pool terms.',
      0,
      false,
      1.5,
      'external_handoff',
      'public_exact',
      progress_value,
      false,
      false
    );

    insert into public.moral_trade_create_pool_terms (
      pool_proposal_id,
      create_submission_id,
      threshold_amounts_cents_json,
      deadline_at,
      failure_bonus_base_type,
      failure_bonus_base_terms_json,
      failure_bonus_timing_mode,
      failure_bonus_timing_terms_json,
      formula_source,
      formula_ast_json,
      formula_language_version,
      formula_hash,
      formula_variables_json,
      continuation_mode,
      threshold_visibility,
      progress_visibility,
      moral_trade_failure_bonus_share_bps,
      additional_activation_rule,
      reserve_quote_status,
      review_status
    ) values (
      new_target_id,
      new_submission_id,
      p_pool_terms -> 'thresholdAmountsCents',
      deadline_value,
      p_pool_terms ->> 'failureBonusType',
      p_pool_terms -> 'failureBonusTerms',
      p_pool_terms ->> 'failureTimingMode',
      p_pool_terms -> 'failureTimingTerms',
      p_pool_terms -> 'formula' ->> 'source',
      p_pool_terms -> 'formula' -> 'ast',
      p_pool_terms -> 'formula' ->> 'languageVersion',
      p_pool_terms -> 'formula' ->> 'hash',
      p_pool_terms -> 'formula' -> 'variables',
      p_pool_terms ->> 'continuation',
      'public_exact',
      progress_value,
      (p_pool_terms ->> 'moralTradeBonusShareBps')::integer,
      coalesce(p_pool_terms ->> 'activationRule', ''),
      case when p_pool_terms ->> 'failureBonusType' = 'none' then 'not_applicable' else 'pending_underwriting' end,
      'pending_review'
    );

    update public.moral_trade_create_submissions
    set target_type = 'mpgf_pool_proposal', target_id = new_target_id
    where id = new_submission_id;

    return query select new_submission_id, 'mpgf_pool_proposal'::text, new_target_id, 'pending_review'::text, canonical;
    return;
  end if;

  raise exception using errcode = '22023', message = 'Unsupported Create submission kind.';
end;
$function$;

comment on function public.moral_trade_create_submit_service(uuid, text, text, jsonb, text, text, text, text, text, jsonb, jsonb, jsonb) is
  'Service-role-only atomic persistence for one validated Create-interface submission and its reviewable offer or MPGF pool proposal. It never authorizes money movement or opens an unreviewed record.';

revoke all on function public.moral_trade_create_submit_service(uuid, text, text, jsonb, text, text, text, text, text, jsonb, jsonb, jsonb)
from public, anon, authenticated;
grant execute on function public.moral_trade_create_submit_service(uuid, text, text, jsonb, text, text, text, text, text, jsonb, jsonb, jsonb)
to service_role;

commit;
