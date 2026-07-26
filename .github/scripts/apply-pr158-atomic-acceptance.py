#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path

EXPECTED_HEAD = "01993080cbc734e9da4932fc1be2d5319392fe18"
MIGRATION_NAME = "20260726143000_restore_agreement_completion_contract_and_atomic_acceptance.sql"

root = Path.cwd()
actions_path = root / "src/app/actions.ts"
workflow_path = root / ".github/workflows/dynamic-marketplace-qa.yml"
old_migration_path = root / "supabase/migrations/20260524_agreement_evidence_verification_loop.sql"
new_migration_path = root / "supabase/migrations" / MIGRATION_NAME
sql_test_path = root / "supabase/tests/marketplace_interest_acceptance_atomicity.sql"
source_test_path = root / "src/app/offers/marketplace-interest-acceptance.test.ts"


def replace_once(source: str, old: str, new: str, label: str) -> str:
    count = source.count(old)
    if count != 1:
        raise RuntimeError(f"Expected exactly one {label}; found {count}")
    return source.replace(old, new, 1)


actions = actions_path.read_text(encoding="utf-8")

member_start = actions.index(
    '  const { error: acceptError } = await supabase\n    .from("interests")',
    actions.index("export async function acceptInterestAction"),
)
member_end = actions.index(
    '\n\n  if (offer.mode === "pledge" && (offererPerformanceBond || takerPerformanceBond)) {',
    member_start,
)
member_replacement = '''  const { data: acceptanceResult, error: acceptanceError } = await (supabase as any).rpc(
    "accept_marketplace_interest_v1",
    {
      p_interest_id: interestId,
      p_offer_id: offerId,
      p_notes: notes,
      p_no_trade_baseline:
        offererPerformanceBond?.no_trade_baseline ?? offer.no_trade_baseline ?? "",
      p_counterfactual_declaration:
        offererPerformanceBond?.additionality_statement ?? "",
    },
  );

  const acceptancePayload = acceptanceResult as
    | { agreement?: AgreementRow; created?: boolean }
    | null;
  const agreement = acceptancePayload?.agreement;

  if (acceptanceError || !agreement) {
    logSupabaseActionError(
      "Failed to atomically accept interest and create agreement",
      acceptanceError,
      {
        offerId,
        interestId,
        proposerId: viewer.authUser.id,
        responderId: interest.user_id,
      },
    );
    redirectWithMessage(
      returnTo,
      "error",
      acceptanceError?.message ?? "Unable to accept interest and create agreement.",
    );
  }'''
actions = actions[:member_start] + member_replacement + actions[member_end:]

guest_start = actions.index(
    '  const { error: acceptError } = await supabase\n    .from("guest_interests")',
    actions.index("export async function acceptGuestInterestAction"),
)
guest_end = actions.index('\n\n  if (offer.mode === "offset") {', guest_start)
guest_replacement = '''  const { data: acceptanceResult, error: acceptanceError } = await (supabase as any).rpc(
    "accept_marketplace_guest_interest_v1",
    {
      p_guest_interest_id: guestInterestId,
      p_offer_id: offerId,
      p_notes: notes,
    },
  );

  const acceptancePayload = acceptanceResult as
    | { agreement?: AgreementRow; created?: boolean }
    | null;

  if (acceptanceError || !acceptancePayload?.agreement) {
    logSupabaseActionError(
      "Failed to atomically accept guest response and create agreement",
      acceptanceError,
      {
        offerId,
        guestInterestId,
        proposerId: viewer.authUser.id,
        responderId: guestInterest.claimed_by_profile_id,
      },
    );
    redirectWithMessage(
      returnTo,
      "error",
      acceptanceError?.message ??
        "Unable to accept the guest response and create an agreement.",
    );
  }'''
actions = actions[:guest_start] + guest_replacement + actions[guest_end:]
actions_path.write_text(actions, encoding="utf-8")

atomic_sql = r'''

-- Restore the intended evidence-review state machine alongside the newer
-- bilateral lifecycle state machine, then put response acceptance and agreement
-- creation behind one database transaction.

create unique index if not exists profile_verification_badges_profile_badge_uidx
  on public.profile_verification_badges (profile_id, badge_type);

alter table public.profile_verification_badges
  alter column source set default 'operator_review';

comment on column public.agreements.lifecycle_status is
  'Bilateral agreement lifecycle: proposed, confirmed, active, evidence due, completed, disputed, cancelled, or expired.';
comment on column public.agreements.completion_state is
  'Evidence and completion-review workflow, independent of the bilateral lifecycle state.';

create or replace function public.accept_marketplace_interest_v1(
  p_interest_id uuid,
  p_offer_id uuid,
  p_notes text default '',
  p_no_trade_baseline text default '',
  p_counterfactual_declaration text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $function$
declare
  actor_id uuid := auth.uid();
  offer_row public.offers%rowtype;
  interest_row public.interests%rowtype;
  existing_agreement public.agreements%rowtype;
  agreement_row public.agreements%rowtype;
  agreement_id_value uuid;
  normalized_notes text := btrim(coalesce(p_notes, ''));
  normalized_baseline text := btrim(coalesce(p_no_trade_baseline, ''));
  normalized_counterfactual text := btrim(coalesce(p_counterfactual_declaration, ''));
begin
  if actor_id is null then
    raise exception using
      errcode = '42501',
      message = 'A signed-in offer owner is required.';
  end if;

  if p_interest_id is null or p_offer_id is null then
    raise exception using
      errcode = '22023',
      message = 'Interest ID and offer ID are required.';
  end if;

  select * into offer_row
  from public.offers
  where id = p_offer_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'Offer not found.';
  end if;

  if offer_row.owner_id <> actor_id then
    raise exception using
      errcode = '42501',
      message = 'Only the offer owner can accept interest.';
  end if;

  select * into interest_row
  from public.interests
  where id = p_interest_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'Interest not found.';
  end if;

  if interest_row.offer_id <> offer_row.id then
    raise exception using
      errcode = '23514',
      message = 'That interest is not attached to this offer.';
  end if;

  if interest_row.user_id = actor_id then
    raise exception using
      errcode = '23514',
      message = 'An offer owner cannot accept their own response.';
  end if;

  select * into existing_agreement
  from public.agreements
  where interest_id = interest_row.id
  limit 1;

  if existing_agreement.id is not null then
    if existing_agreement.offer_id is distinct from offer_row.id
       or existing_agreement.proposer_id is distinct from actor_id
       or existing_agreement.responder_id is distinct from interest_row.user_id then
      raise exception using
        errcode = '23514',
        message = 'The existing agreement does not match this response.';
    end if;

    return jsonb_build_object(
      'agreement', to_jsonb(existing_agreement),
      'created', false
    );
  end if;

  if offer_row.status::text <> 'open'
     or offer_row.workflow_status <> 'published' then
    raise exception using
      errcode = '23514',
      message = 'This offer is not open for acceptance.';
  end if;

  if interest_row.status::text <> 'pending' then
    raise exception using
      errcode = '23514',
      message = 'Only a pending response can be accepted.';
  end if;

  if offer_row.mode::text = 'offset'
     and exists (
       select 1
       from public.donation_offset_offers offset_offer
       where offset_offer.offer_id = offer_row.id
         and offset_offer.participation_mode = 'pool'
     ) then
    raise exception using
      errcode = '23514',
      message = 'Pool commitments cannot be accepted one-to-one.';
  end if;

  -- The selected response is deliberately updated before the agreement insert.
  -- PostgreSQL rolls this update and all trigger side effects back if any later
  -- statement in this function fails.
  update public.interests
  set status = 'accepted', updated_at = now()
  where id = interest_row.id;

  insert into public.agreements (
    offer_id,
    interest_id,
    proposer_id,
    responder_id,
    status,
    notes,
    source,
    structured_terms,
    no_trade_baseline,
    counterfactual_declaration,
    duration_terms,
    exit_conditions,
    evidence_rule,
    privacy_scope,
    disclosure_scope,
    completion_state
  ) values (
    offer_row.id,
    interest_row.id,
    actor_id,
    interest_row.user_id,
    'active',
    normalized_notes,
    'offer',
    concat_ws(' ', offer_row.offer_action, 'for', offer_row.request_action),
    coalesce(nullif(normalized_baseline, ''), nullif(btrim(offer_row.no_trade_baseline), ''), ''),
    normalized_counterfactual,
    offer_row.duration,
    offer_row.exit_conditions,
    offer_row.verification,
    coalesce(
      nullif(btrim(offer_row.privacy_scope), ''),
      'Agreement participants can see this room. Broader publication waits for reviewed completion.'
    ),
    'Share only the details needed to verify this agreement and resolve disputes.',
    'pending_evidence'
  )
  returning id into agreement_id_value;

  update public.interests
  set status = 'declined', updated_at = now()
  where offer_id = offer_row.id
    and id <> interest_row.id
    and status = 'pending';

  update public.guest_interests
  set status = 'declined', updated_at = now()
  where offer_id = offer_row.id
    and status = 'pending';

  update public.offers
  set status = 'matched', updated_at = now()
  where id = offer_row.id;

  select * into agreement_row
  from public.agreements
  where id = agreement_id_value;

  return jsonb_build_object(
    'agreement', to_jsonb(agreement_row),
    'created', true
  );
end;
$function$;

comment on function public.accept_marketplace_interest_v1(uuid, uuid, text, text, text) is
  'Atomically accepts one signed-in member response, creates its proposed agreement and frozen version, declines competing responses, and closes the public offer. Any failure rolls back every mutation.';

revoke all on function public.accept_marketplace_interest_v1(uuid, uuid, text, text, text)
  from public, anon;
grant execute on function public.accept_marketplace_interest_v1(uuid, uuid, text, text, text)
  to authenticated;

create or replace function public.accept_marketplace_guest_interest_v1(
  p_guest_interest_id uuid,
  p_offer_id uuid,
  p_notes text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $function$
declare
  actor_id uuid := auth.uid();
  offer_row public.offers%rowtype;
  guest_interest_row public.guest_interests%rowtype;
  existing_agreement public.agreements%rowtype;
  agreement_row public.agreements%rowtype;
  agreement_id_value uuid;
  normalized_notes text := btrim(coalesce(p_notes, ''));
begin
  if actor_id is null then
    raise exception using
      errcode = '42501',
      message = 'A signed-in offer owner is required.';
  end if;

  if p_guest_interest_id is null or p_offer_id is null then
    raise exception using
      errcode = '22023',
      message = 'Guest response ID and offer ID are required.';
  end if;

  select * into offer_row
  from public.offers
  where id = p_offer_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'Offer not found.';
  end if;

  if offer_row.owner_id <> actor_id then
    raise exception using
      errcode = '42501',
      message = 'Only the offer owner can accept responses.';
  end if;

  select * into guest_interest_row
  from public.guest_interests
  where id = p_guest_interest_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'Guest response not found.';
  end if;

  if guest_interest_row.offer_id <> offer_row.id then
    raise exception using
      errcode = '23514',
      message = 'That guest response is not attached to this offer.';
  end if;

  if guest_interest_row.claimed_by_profile_id is null then
    raise exception using
      errcode = '23514',
      message = 'The guest respondent must claim the response with an account first.';
  end if;

  if guest_interest_row.claimed_by_profile_id = actor_id then
    raise exception using
      errcode = '23514',
      message = 'An offer owner cannot accept their own response.';
  end if;

  select * into existing_agreement
  from public.agreements
  where offer_id = offer_row.id
  order by created_at asc
  limit 1;

  if existing_agreement.id is not null then
    if existing_agreement.proposer_id = actor_id
       and existing_agreement.responder_id = guest_interest_row.claimed_by_profile_id then
      return jsonb_build_object(
        'agreement', to_jsonb(existing_agreement),
        'created', false
      );
    end if;

    raise exception using
      errcode = '23514',
      message = 'This offer already has an agreement.';
  end if;

  if offer_row.status::text <> 'open'
     or offer_row.workflow_status <> 'published' then
    raise exception using
      errcode = '23514',
      message = 'This offer is not open for acceptance.';
  end if;

  if guest_interest_row.status::text <> 'pending' then
    raise exception using
      errcode = '23514',
      message = 'Only a pending guest response can be accepted.';
  end if;

  if offer_row.mode::text = 'offset'
     and exists (
       select 1
       from public.donation_offset_offers offset_offer
       where offset_offer.offer_id = offer_row.id
         and offset_offer.participation_mode = 'pool'
     ) then
    raise exception using
      errcode = '23514',
      message = 'Pool commitments cannot be accepted one-to-one.';
  end if;

  if offer_row.mode::text = 'pledge'
     and exists (
       select 1
       from public.performance_bonds bond
       where bond.offer_id = offer_row.id
         and bond.side = 'offerer'
         and bond.enabled = true
     ) then
    raise exception using
      errcode = '23514',
      message = 'Bonded pledge swaps require a signed-in member response.';
  end if;

  update public.guest_interests
  set status = 'accepted', updated_at = now()
  where id = guest_interest_row.id;

  insert into public.agreements (
    offer_id,
    interest_id,
    proposer_id,
    responder_id,
    status,
    notes,
    source,
    structured_terms,
    no_trade_baseline,
    counterfactual_declaration,
    duration_terms,
    exit_conditions,
    evidence_rule,
    privacy_scope,
    disclosure_scope,
    completion_state
  ) values (
    offer_row.id,
    null,
    actor_id,
    guest_interest_row.claimed_by_profile_id,
    'active',
    normalized_notes,
    'offer',
    concat_ws(' ', offer_row.offer_action, 'for', offer_row.request_action),
    offer_row.no_trade_baseline,
    '',
    offer_row.duration,
    offer_row.exit_conditions,
    offer_row.verification,
    coalesce(
      nullif(btrim(offer_row.privacy_scope), ''),
      'Agreement participants can see this room. Broader publication waits for reviewed completion.'
    ),
    'Share only the details needed to verify this agreement and resolve disputes.',
    'pending_evidence'
  )
  returning id into agreement_id_value;

  update public.guest_interests
  set status = 'declined', updated_at = now()
  where offer_id = offer_row.id
    and id <> guest_interest_row.id
    and status = 'pending';

  update public.interests
  set status = 'declined', updated_at = now()
  where offer_id = offer_row.id
    and status = 'pending';

  update public.offers
  set status = 'matched', updated_at = now()
  where id = offer_row.id;

  select * into agreement_row
  from public.agreements
  where id = agreement_id_value;

  return jsonb_build_object(
    'agreement', to_jsonb(agreement_row),
    'created', true
  );
end;
$function$;

comment on function public.accept_marketplace_guest_interest_v1(uuid, uuid, text) is
  'Atomically accepts a claimed guest response, creates its proposed agreement and frozen version, declines competing responses, and closes the public offer. Any failure rolls back every mutation.';

revoke all on function public.accept_marketplace_guest_interest_v1(uuid, uuid, text)
  from public, anon;
grant execute on function public.accept_marketplace_guest_interest_v1(uuid, uuid, text)
  to authenticated;

notify pgrst, 'reload schema';
'''

old_migration = old_migration_path.read_text(encoding="utf-8").rstrip()
new_migration_path.write_text(old_migration + atomic_sql, encoding="utf-8")

sql_test_path.parent.mkdir(parents=True, exist_ok=True)
sql_test_path.write_text(
    r'''-- Destructive-looking operations are transaction-local and rolled back.
-- This test is deliberately bound to the two synthetic MoralTrade QA accounts
-- and deterministic offer so it fails closed in any other environment.

begin;

set local statement_timeout = '30s';
set local lock_timeout = '5s';

DO $guard$
declare
  owner_id uuid;
  responder_id uuid;
  offer_owner_id uuid;
begin
  select id into owner_id
  from public.profiles
  where email = 'qa-market-owner@example.com';

  select id into responder_id
  from public.profiles
  where email = 'qa-market-responder@example.com';

  select owner_id into offer_owner_id
  from public.offers
  where id = '10000000-0000-4000-8000-000000000158'::uuid;

  if owner_id is null or responder_id is null or offer_owner_id is null then
    raise exception 'Refusing atomicity test outside the deterministic MoralTrade QA fixture.';
  end if;

  if offer_owner_id <> owner_id then
    raise exception 'Deterministic QA offer owner does not match the synthetic owner.';
  end if;
end;
$guard$;

delete from public.agreements
where offer_id = '10000000-0000-4000-8000-000000000158'::uuid;

delete from public.interests
where offer_id = '10000000-0000-4000-8000-000000000158'::uuid
  and user_id = (
    select id from public.profiles where email = 'qa-market-responder@example.com'
  );

update public.offers
set status = 'open', workflow_status = 'published', updated_at = now()
where id = '10000000-0000-4000-8000-000000000158'::uuid;

insert into public.interests (
  id,
  offer_id,
  user_id,
  interested_alias,
  message,
  status
) values (
  '10000000-0000-4000-8000-000000000159'::uuid,
  '10000000-0000-4000-8000-000000000158'::uuid,
  (select id from public.profiles where email = 'qa-market-responder@example.com'),
  'QA Counterparty',
  '[atomicity regression] response must remain pending after forced agreement failure',
  'pending'
);

create or replace function public.qa_force_marketplace_agreement_insert_failure()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $function$
begin
  if new.notes = 'qa-atomicity-forced-failure' then
    raise exception 'qa_forced_agreement_insert_failure';
  end if;
  return new;
end;
$function$;

create trigger qa_force_marketplace_agreement_insert_failure_trigger
before insert on public.agreements
for each row
execute function public.qa_force_marketplace_agreement_insert_failure();

select set_config(
  'request.jwt.claim.sub',
  (select id::text from public.profiles where email = 'qa-market-owner@example.com'),
  true
);
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub', (select id::text from public.profiles where email = 'qa-market-owner@example.com'),
    'role', 'authenticated'
  )::text,
  true
);

DO $exercise$
begin
  begin
    perform public.accept_marketplace_interest_v1(
      '10000000-0000-4000-8000-000000000159'::uuid,
      '10000000-0000-4000-8000-000000000158'::uuid,
      'qa-atomicity-forced-failure',
      '',
      ''
    );
    raise exception 'Atomicity test expected the agreement insert to fail.';
  exception
    when others then
      if sqlerrm <> 'qa_forced_agreement_insert_failure' then
        raise;
      end if;
  end;
end;
$exercise$;

DO $assertions$
declare
  response_status text;
  offer_status text;
  agreement_count integer;
begin
  select status::text into response_status
  from public.interests
  where id = '10000000-0000-4000-8000-000000000159'::uuid;

  select status::text into offer_status
  from public.offers
  where id = '10000000-0000-4000-8000-000000000158'::uuid;

  select count(*) into agreement_count
  from public.agreements
  where interest_id = '10000000-0000-4000-8000-000000000159'::uuid;

  if response_status <> 'pending' then
    raise exception 'Atomicity regression: failed agreement creation left response status %.', response_status;
  end if;

  if offer_status <> 'open' then
    raise exception 'Atomicity regression: failed agreement creation changed offer status to %.', offer_status;
  end if;

  if agreement_count <> 0 then
    raise exception 'Atomicity regression: failed agreement creation left % agreement row(s).', agreement_count;
  end if;
end;
$assertions$;

select 'PASS: failed agreement creation leaves the selected response pending and the offer open' as result;

rollback;
''',
    encoding="utf-8",
)

source_test_path.write_text(
    '''import assert from "node:assert/strict";\nimport { readFileSync } from "node:fs";\nimport path from "node:path";\nimport test from "node:test";\n\nconst repoRoot = path.resolve(import.meta.dirname, "../../..");\nconst actions = readFileSync(path.join(repoRoot, "src/app/actions.ts"), "utf8");\nconst migration = readFileSync(\n  path.join(\n    repoRoot,\n    "supabase/migrations/20260726143000_restore_agreement_completion_contract_and_atomic_acceptance.sql",\n  ),\n  "utf8",\n);\nconst sqlRegression = readFileSync(\n  path.join(repoRoot, "supabase/tests/marketplace_interest_acceptance_atomicity.sql"),\n  "utf8",\n);\n\nfunction between(source: string, start: string, end: string) {\n  const startIndex = source.indexOf(start);\n  assert.notEqual(startIndex, -1, `Missing start marker: ${start}`);\n  const endIndex = source.indexOf(end, startIndex + start.length);\n  assert.notEqual(endIndex, -1, `Missing end marker: ${end}`);\n  return source.slice(startIndex, endIndex);\n}\n\ntest("member and guest acceptance use database transaction boundaries", () => {\n  const member = between(\n    actions,\n    "export async function acceptInterestAction",\n    "export async function acceptGuestInterestAction",\n  );\n  const guest = between(\n    actions,\n    "export async function acceptGuestInterestAction",\n    "export async function rateAgreementAction",\n  );\n\n  assert.match(member, /accept_marketplace_interest_v1/);\n  assert.doesNotMatch(\n    member,\n    /\\.from\\(\"interests\"\\)[\\s\\S]{0,160}\\.update\\(\\{[\\s\\S]{0,80}status:\\s*\"accepted\"/,\n  );\n  assert.match(guest, /accept_marketplace_guest_interest_v1/);\n  assert.doesNotMatch(\n    guest,\n    /\\.from\\(\"guest_interests\"\\)[\\s\\S]{0,160}\\.update\\(\\{[\\s\\S]{0,80}status:\\s*\"accepted\"/,\n  );\n});\n\ntest("migration restores completion review separately from lifecycle and makes acceptance atomic", () => {\n  assert.match(migration, /add column if not exists completion_state text not null default 'pending_evidence'/);\n  assert.match(migration, /add column if not exists lifecycle_status text not null default 'proposed'/);\n  assert.match(migration, /create table if not exists public\\.agreement_evidence_items/);\n  assert.match(migration, /create table if not exists public\\.agreement_review_cases/);\n\n  const memberRpc = between(\n    migration,\n    "create or replace function public.accept_marketplace_interest_v1",\n    "create or replace function public.accept_marketplace_guest_interest_v1",\n  );\n  const acceptedUpdate = memberRpc.indexOf("update public.interests");\n  const agreementInsert = memberRpc.indexOf("insert into public.agreements");\n  assert.ok(acceptedUpdate >= 0);\n  assert.ok(agreementInsert > acceptedUpdate);\n  assert.match(memberRpc, /security definer/);\n  assert.match(memberRpc, /for update/);\n});\n\ntest("SQL regression forces an agreement failure and asserts rollback", () => {\n  assert.match(sqlRegression, /qa_forced_agreement_insert_failure/);\n  assert.match(sqlRegression, /response_status <> 'pending'/);\n  assert.match(sqlRegression, /offer_status <> 'open'/);\n  assert.match(sqlRegression, /agreement_count <> 0/);\n  assert.match(sqlRegression, /rollback;/);\n});\n''',
    encoding="utf-8",
)

workflow = workflow_path.read_text(encoding="utf-8")
workflow = replace_once(
    workflow,
    '      - "scripts/seed-moraltrade-qa.mjs"\n',
    '      - "scripts/seed-moraltrade-qa.mjs"\n'
    '      - "supabase/migrations/20260726143000_restore_agreement_completion_contract_and_atomic_acceptance.sql"\n'
    '      - "supabase/tests/marketplace_interest_acceptance_atomicity.sql"\n'
    '      - "src/app/actions.ts"\n'
    '      - "src/app/offers/marketplace-interest-acceptance.test.ts"\n',
    "dynamic marketplace workflow paths",
)
workflow = replace_once(
    workflow,
    '            src/app/offers/dynamic-marketplace.test.ts \\\n',
    '            src/app/offers/dynamic-marketplace.test.ts \\\n'
    '            src/app/offers/marketplace-interest-acceptance.test.ts \\\n',
    "focused marketplace test list",
)
workflow = replace_once(
    workflow,
    '          npx eslint \\\n',
    '          npx eslint \\\n'
    '            src/app/actions.ts \\\n'
    '            src/app/offers/marketplace-interest-acceptance.test.ts \\\n',
    "marketplace lint list",
)
workflow_path.write_text(workflow, encoding="utf-8")

print("Applied PR #158 atomic acceptance patch.")
