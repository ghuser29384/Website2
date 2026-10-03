begin;

-- The DAC application and public exact-terms RPC expose a reviewed aggregate
-- contract. Restrict direct PostgREST access to that same contract so public
-- readers cannot request reviewer identifiers, internal reasons, audit JSON,
-- or other control-plane columns from the backing tables.

do $prerequisites$
declare
  campaign_column_count integer;
  outcome_column_count integer;
begin
  if to_regclass('public.mpgf_public_goods_campaigns') is null
     or to_regclass('public.mpgf_dac_campaign_outcomes') is null then
    raise exception using
      errcode = '55000',
      message = 'The canonical DAC public aggregate tables are missing.';
  end if;

  select count(*) into campaign_column_count
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'mpgf_public_goods_campaigns'
    and column_name in (
      'id', 'round_id', 'slug', 'pool_alternative_id', 'title',
      'destination_type', 'destination_ref', 'cause_tags',
      'public_summary', 'threshold_amount_cents',
      'threshold_supporters', 'deadline_at', 'verification_method',
      'baseline_rule', 'exit_rule', 'review_status',
      'challenge_window_ends_at', 'created_at', 'pool_proposal_id',
      'threshold_visibility', 'progress_visibility',
      'first_accepted_pledge_at', 'published_terms_version',
      'published_terms_sha256', 'published_by', 'published_at'
    );

  select count(*) into outcome_column_count
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'mpgf_dac_campaign_outcomes'
    and column_name in (
      'id', 'campaign_id', 'pool_proposal_id', 'terms_version',
      'terms_sha256', 'outcome_status', 'eligible_amount_cents',
      'eligible_supporter_count', 'threshold_amount_cents',
      'threshold_supporters', 'deadline_at', 'evaluated_at',
      'finalized_by', 'reason', 'outcome_json', 'outcome_sha256',
      'created_at'
    );

  if campaign_column_count <> 26 or outcome_column_count <> 17 then
    raise exception using
      errcode = '55000',
      message = format(
        'The DAC public aggregate schema differs from the reviewed contract: campaigns=%s outcomes=%s.',
        campaign_column_count,
        outcome_column_count
      );
  end if;

  if not exists (
    select 1
    from pg_class c
    where c.oid = 'public.mpgf_public_goods_campaigns'::regclass
      and c.relrowsecurity
  ) or not exists (
    select 1
    from pg_class c
    where c.oid = 'public.mpgf_dac_campaign_outcomes'::regclass
      and c.relrowsecurity
  ) then
    raise exception using
      errcode = '55000',
      message = 'RLS must be enabled before public DAC column grants are narrowed.';
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'mpgf_public_goods_campaigns'
      and policyname = 'mpgf_public_goods_campaigns_public_read'
      and cmd = 'SELECT'
  ) or not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'mpgf_dac_campaign_outcomes'
      and policyname = 'mpgf_dac_campaign_outcomes_public_select'
      and cmd = 'SELECT'
  ) then
    raise exception using
      errcode = '55000',
      message = 'The reviewed public DAC RLS policies are missing.';
  end if;
end;
$prerequisites$;

revoke all privileges on table public.mpgf_public_goods_campaigns
  from public, anon, authenticated;
revoke select (
  id,
  round_id,
  slug,
  pool_alternative_id,
  title,
  destination_type,
  destination_ref,
  cause_tags,
  public_summary,
  threshold_amount_cents,
  threshold_supporters,
  deadline_at,
  verification_method,
  baseline_rule,
  exit_rule,
  review_status,
  challenge_window_ends_at,
  created_at,
  pool_proposal_id,
  threshold_visibility,
  progress_visibility,
  first_accepted_pledge_at,
  published_terms_version,
  published_terms_sha256,
  published_by,
  published_at
) on table public.mpgf_public_goods_campaigns
  from anon, authenticated;

grant select (
  id,
  round_id,
  slug,
  title,
  destination_type,
  destination_ref,
  cause_tags,
  public_summary,
  threshold_amount_cents,
  threshold_supporters,
  deadline_at,
  verification_method,
  baseline_rule,
  exit_rule,
  review_status,
  pool_proposal_id,
  threshold_visibility,
  progress_visibility,
  published_terms_version,
  published_terms_sha256,
  published_at,
  created_at
) on table public.mpgf_public_goods_campaigns
  to anon, authenticated;

grant all on table public.mpgf_public_goods_campaigns to service_role;

revoke all privileges on table public.mpgf_dac_campaign_outcomes
  from public, anon, authenticated;
revoke select (
  id,
  campaign_id,
  pool_proposal_id,
  terms_version,
  terms_sha256,
  outcome_status,
  eligible_amount_cents,
  eligible_supporter_count,
  threshold_amount_cents,
  threshold_supporters,
  deadline_at,
  evaluated_at,
  finalized_by,
  reason,
  outcome_json,
  outcome_sha256,
  created_at
) on table public.mpgf_dac_campaign_outcomes
  from anon, authenticated;

grant select (
  id,
  campaign_id,
  pool_proposal_id,
  terms_version,
  terms_sha256,
  outcome_status,
  eligible_amount_cents,
  eligible_supporter_count,
  threshold_amount_cents,
  threshold_supporters,
  deadline_at,
  evaluated_at,
  outcome_sha256,
  created_at
) on table public.mpgf_dac_campaign_outcomes
  to anon, authenticated;

grant select on table public.mpgf_dac_campaign_outcomes to service_role;

do $verify$
declare
  role_name text;
  column_name text;
  safe_campaign_columns constant text[] := array[
    'id', 'round_id', 'slug', 'title', 'destination_type',
    'destination_ref', 'cause_tags', 'public_summary',
    'threshold_amount_cents', 'threshold_supporters', 'deadline_at',
    'verification_method', 'baseline_rule', 'exit_rule', 'review_status',
    'pool_proposal_id', 'threshold_visibility', 'progress_visibility',
    'published_terms_version', 'published_terms_sha256', 'published_at',
    'created_at'
  ];
  private_campaign_columns constant text[] := array[
    'pool_alternative_id', 'challenge_window_ends_at',
    'first_accepted_pledge_at', 'published_by'
  ];
  safe_outcome_columns constant text[] := array[
    'id', 'campaign_id', 'pool_proposal_id', 'terms_version',
    'terms_sha256', 'outcome_status', 'eligible_amount_cents',
    'eligible_supporter_count', 'threshold_amount_cents',
    'threshold_supporters', 'deadline_at', 'evaluated_at',
    'outcome_sha256', 'created_at'
  ];
  private_outcome_columns constant text[] := array[
    'finalized_by', 'reason', 'outcome_json'
  ];
begin
  if exists (
    select 1
    from information_schema.role_table_grants
    where table_schema = 'public'
      and table_name in (
        'mpgf_public_goods_campaigns',
        'mpgf_dac_campaign_outcomes'
      )
      and grantee in ('PUBLIC', 'anon', 'authenticated')
      and privilege_type = 'SELECT'
  ) then
    raise exception using
      errcode = '55000',
      message = 'A public DAC aggregate table still has table-level SELECT.';
  end if;

  foreach role_name in array array['anon', 'authenticated']
  loop
    foreach column_name in array safe_campaign_columns
    loop
      if not has_column_privilege(
        role_name,
        'public.mpgf_public_goods_campaigns',
        column_name,
        'SELECT'
      ) then
        raise exception using
          errcode = '55000',
          message = format('%s cannot select reviewed campaign column %s.', role_name, column_name);
      end if;
    end loop;

    foreach column_name in array private_campaign_columns
    loop
      if has_column_privilege(
        role_name,
        'public.mpgf_public_goods_campaigns',
        column_name,
        'SELECT'
      ) then
        raise exception using
          errcode = '55000',
          message = format('%s can still select private campaign column %s.', role_name, column_name);
      end if;
    end loop;

    foreach column_name in array safe_outcome_columns
    loop
      if not has_column_privilege(
        role_name,
        'public.mpgf_dac_campaign_outcomes',
        column_name,
        'SELECT'
      ) then
        raise exception using
          errcode = '55000',
          message = format('%s cannot select reviewed outcome column %s.', role_name, column_name);
      end if;
    end loop;

    foreach column_name in array private_outcome_columns
    loop
      if has_column_privilege(
        role_name,
        'public.mpgf_dac_campaign_outcomes',
        column_name,
        'SELECT'
      ) then
        raise exception using
          errcode = '55000',
          message = format('%s can still select private outcome column %s.', role_name, column_name);
      end if;
    end loop;

    if has_table_privilege(
      role_name,
      'public.mpgf_public_goods_campaigns',
      'INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER'
    ) or has_table_privilege(
      role_name,
      'public.mpgf_dac_campaign_outcomes',
      'INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER'
    ) then
      raise exception using
        errcode = '55000',
        message = format('%s retains a public DAC aggregate mutation privilege.', role_name);
    end if;
  end loop;
end;
$verify$;

comment on table public.mpgf_public_goods_campaigns is
  'Canonical public DAC campaigns. Anonymous and authenticated readers receive only the reviewed aggregate campaign columns; reviewer and control-plane columns remain service-only.';
comment on table public.mpgf_dac_campaign_outcomes is
  'Immutable public DAC terminal aggregates. Anonymous and authenticated readers receive only aggregate outcome fields; reviewer identity, rationale, and internal audit JSON remain service-only.';

commit;
