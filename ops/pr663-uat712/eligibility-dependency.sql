\set ON_ERROR_STOP on

begin;

do $guard$
begin
  if pg_catalog.to_regclass('public.moral_trade_participant_eligibility_records') is not null then
    raise exception 'Refusing to replace a pre-existing participant eligibility relation.';
  end if;
end;
$guard$;

create table public.moral_trade_participant_eligibility_records (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'identity_unverified'
    check (status in ('missing', 'under_review', 'failed', 'stale', 'identity_unverified', 'sybil_risk')),
  identity_verification_status text not null default 'identity_unverified'
    check (identity_verification_status in ('missing', 'under_review', 'failed', 'stale', 'identity_unverified')),
  human_uniqueness_sybil_status text not null default 'under_review'
    check (human_uniqueness_sybil_status in ('missing', 'under_review', 'failed', 'stale', 'identity_unverified', 'sybil_risk')),
  reviewed_at timestamptz,
  expires_at timestamptz,
  controller_fixture_scope text not null default 'issue-712-fail-closed-dependency'
    check (controller_fixture_scope = 'issue-712-fail-closed-dependency'),
  check (status <> 'eligible'),
  check (identity_verification_status <> 'eligible'),
  check (human_uniqueness_sybil_status <> 'eligible')
);

comment on table public.moral_trade_participant_eligibility_records is
  'Issue #712 isolated-QA dependency shell only. It permits no eligible or verified-unique-person state, contains no rows, and must be dropped during unconditional cleanup.';

alter table public.moral_trade_participant_eligibility_records enable row level security;
revoke all on table public.moral_trade_participant_eligibility_records
  from public, anon, authenticated;

commit;
