#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path

EXPECTED_HEAD = "4ca0bb452179684476a69af5dd320d91dda0879e"
MIGRATION_VERSION = "20260727042000"
MIGRATION_SLUG = "allow_closed_marketplace_offer_bilateral_confirmation"

ROOT = Path.cwd()
CORE_ACTIONS = ROOT / "src/app/core-trade-actions-base.ts"
DEALROOM = ROOT / "src/app/deals/[agreementId]/dealroom-main-sections.tsx"
SOURCE_TEST = ROOT / "src/app/deals/[agreementId]/dealroom-bilateral-confirmation.test.ts"
MIGRATION = ROOT / "supabase/migrations" / f"{MIGRATION_VERSION}_{MIGRATION_SLUG}.sql"
SQL_TEST = ROOT / "supabase/tests/marketplace_bilateral_confirmation.sql"


def replace_once(source: str, old: str, new: str, label: str) -> str:
    count = source.count(old)
    if count != 1:
        raise RuntimeError(f"Expected exactly one {label}; found {count}.")
    return source.replace(old, new, 1)


def replace_in_block(
    source: str,
    *,
    start_marker: str,
    end_marker: str,
    old: str,
    new: str,
    label: str,
) -> str:
    start = source.index(start_marker)
    end = source.index(end_marker, start + len(start_marker))
    block = source[start:end]
    block = replace_once(block, old, new, label)
    return source[:start] + block + source[end:]


core_actions = CORE_ACTIONS.read_text(encoding="utf-8")
core_actions = replace_in_block(
    core_actions,
    start_marker="export async function confirmAgreementVersionAction",
    end_marker="export async function proposeAgreementAmendmentAction",
    old='  const returnTo = `/trade-agreements/${agreementId}`;\n',
    new=(
        '  const returnTo = safeInternalPath(\n'
        '    read(formData, "return_to"),\n'
        '    `/trade-agreements/${agreementId}`,\n'
        '  );\n'
    ),
    label="confirmation return path",
)
core_actions = replace_in_block(
    core_actions,
    start_marker="export async function confirmAgreementVersionAction",
    end_marker="export async function proposeAgreementAmendmentAction",
    old=(
        '    revalidatePath("/offers");\n'
        '    revalidatePath(returnTo);\n'
    ),
    new=(
        '    revalidatePath("/offers");\n'
        '    revalidatePath("/commitments");\n'
        '    revalidatePath(`/deals/${agreementId}`);\n'
        '    revalidatePath(`/trade-agreements/${agreementId}`);\n'
        '    revalidatePath(returnTo);\n'
    ),
    label="confirmation revalidation paths",
)
CORE_ACTIONS.write_text(core_actions, encoding="utf-8")


dealroom = DEALROOM.read_text(encoding="utf-8")
dealroom = replace_once(
    dealroom,
    'import {\n  addAgreementEventAction,\n  updateAgreementStatusAction,\n} from "@/app/actions";\n',
    'import { addAgreementEventAction } from "@/app/actions";\n'
    'import { confirmAgreementVersionAction } from "@/app/core-trade-actions";\n',
    "dealroom action imports",
)
old_decision = '''            {agreement.status === "proposed" ? (
              <form action={updateAgreementStatusAction}>
                <input name="agreement_id" type="hidden" value={agreement.id} />
                <input name="return_to" type="hidden" value={returnTo} />
                <input name="status" type="hidden" value="active" />
                <input
                  name="summary"
                  type="hidden"
                  value="One participant activated the current dealroom terms"
                />
                <button className="button button-primary" type="submit">
                  Record confirmation and activate
                </button>
              </form>
            ) : (
'''
new_decision = '''            {agreement.status === "proposed" ? (
              agreement.current_version_id ? (
                <form action={confirmAgreementVersionAction} className="stack-form">
                  <input name="agreement_id" type="hidden" value={agreement.id} />
                  <input
                    name="agreement_version_id"
                    type="hidden"
                    value={agreement.current_version_id}
                  />
                  <input name="return_to" type="hidden" value={returnTo} />
                  <label className="field">
                    <span>Confirmation</span>
                    <span>
                      <input name="terms_reviewed" required type="checkbox" /> I reviewed
                      this frozen version. The first distinct confirmation records consent;
                      the second activates the agreement.
                    </span>
                  </label>
                  <button className="button button-primary" type="submit">
                    Confirm current frozen version
                  </button>
                </form>
              ) : (
                <Link
                  className="button button-secondary"
                  href={`/trade-agreements/${agreement.id}`}
                >
                  Review missing frozen version
                </Link>
              )
            ) : (
'''
dealroom = replace_once(dealroom, old_decision, new_decision, "dealroom confirmation form")
dealroom = replace_once(
    dealroom,
    '                  ? "Confirm only after both parties have reviewed the latest saved terms and the evidence rule."\n',
    '                  ? "Each participant must confirm the same frozen version. One confirmation records consent; two distinct confirmations activate the agreement."\n',
    "dealroom proposed-state explanation",
)
DEALROOM.write_text(dealroom, encoding="utf-8")


MIGRATION.write_text(
    r'''-- Marketplace acceptance intentionally removes the source offer from the public
-- marketplace before bilateral confirmation. Preserve the existing open-offer path for
-- core invitations, while allowing a closed matched offer only when this exact proposed
-- agreement is backed by the accepted member or claimed-guest response.

create or replace function public.confirm_agreement_version_v2(
  p_actor_id uuid,
  p_agreement_id uuid,
  p_agreement_version_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $function$
declare
  agreement_row public.agreements%rowtype;
  version_row public.trade_agreement_versions%rowtype;
  offer_row public.offers%rowtype;
  confirmation_count integer;
  counterpart_id uuid;
  loser record;
  offer_confirmation_eligible boolean;
begin
  select * into agreement_row
  from public.agreements
  where id = p_agreement_id
    and p_actor_id in (proposer_id, responder_id);

  if not found
     or agreement_row.lifecycle_status <> 'proposed'
     or agreement_row.current_version_id is null then
    raise exception 'Agreement is unavailable or can no longer be confirmed.';
  end if;

  perform moral_trade_private.lock_pair(
    agreement_row.proposer_id,
    agreement_row.responder_id
  );

  select * into agreement_row
  from public.agreements
  where id = p_agreement_id
    and p_actor_id in (proposer_id, responder_id)
  for update;

  if not found
     or agreement_row.lifecycle_status <> 'proposed'
     or agreement_row.current_version_id is null then
    raise exception 'Agreement is unavailable or can no longer be confirmed.';
  end if;
  if agreement_row.current_version_id <> p_agreement_version_id then
    raise exception 'The agreement changed after you reviewed it. Review the current frozen version.';
  end if;

  select * into version_row
  from public.trade_agreement_versions
  where id = p_agreement_version_id
    and agreement_id = p_agreement_id;
  if not found then
    raise exception 'Frozen agreement version not found.';
  end if;

  select * into offer_row
  from public.offers
  where id = agreement_row.offer_id
  for update;
  if not found then
    raise exception 'The offer is no longer eligible for this non-financial agreement.';
  end if;

  offer_confirmation_eligible := moral_trade_private.offer_is_invitable(offer_row.id)
    or (
      offer_row.status::text = 'matched'
      and offer_row.workflow_status = 'closed'
      and offer_row.closed_at is not null
      and (
        exists (
          select 1
          from public.interests interest_row
          where interest_row.id = agreement_row.interest_id
            and interest_row.offer_id = agreement_row.offer_id
            and interest_row.user_id = agreement_row.responder_id
            and interest_row.status::text = 'accepted'
        )
        or (
          agreement_row.interest_id is null
          and exists (
            select 1
            from public.guest_interests guest_interest_row
            where guest_interest_row.offer_id = agreement_row.offer_id
              and guest_interest_row.claimed_by_profile_id = agreement_row.responder_id
              and guest_interest_row.status::text = 'accepted'
          )
        )
      )
    );

  if not offer_confirmation_eligible then
    raise exception 'The offer is no longer eligible for this non-financial agreement.';
  end if;

  if moral_trade_private.pair_is_blocked(
    agreement_row.proposer_id,
    agreement_row.responder_id
  ) then
    raise exception 'This interaction is blocked.';
  end if;

  insert into public.trade_agreement_confirmations(
    agreement_version_id, user_id, confirmed_at
  ) values (
    p_agreement_version_id, p_actor_id, now()
  )
  on conflict (agreement_version_id, user_id) do nothing;

  select count(distinct c.user_id) into confirmation_count
  from public.trade_agreement_confirmations c
  where c.agreement_version_id = p_agreement_version_id
    and c.user_id in (agreement_row.proposer_id, agreement_row.responder_id);

  counterpart_id := case
    when agreement_row.proposer_id = p_actor_id then agreement_row.responder_id
    else agreement_row.proposer_id
  end;

  if confirmation_count < 2 then
    insert into public.trade_notifications(
      user_id, notification_type, title, body, href, dedupe_key, created_at
    ) values (
      counterpart_id,
      'final_confirmation_required',
      'Your confirmation is required',
      'The other participant confirmed the frozen agreement version.',
      '/trade-agreements/' || p_agreement_id::text,
      'confirmation_waiting:' || p_agreement_version_id::text || ':' || counterpart_id::text,
      now()
    )
    on conflict (dedupe_key) do nothing;
    return jsonb_build_object(
      'status', 'proposed',
      'confirmationCount', confirmation_count,
      'active', false
    );
  end if;

  if exists (
    select 1
    from public.agreements a
    where a.offer_id = agreement_row.offer_id
      and a.id <> agreement_row.id
      and a.lifecycle_status in ('active', 'evidence_due', 'disputed', 'completed')
  ) then
    raise exception 'Another agreement already activated for this offer.';
  end if;

  perform set_config('app.core_trade_internal', '1', true);
  for loser in
    update public.agreements
    set
      status = 'cancelled',
      lifecycle_status = 'cancelled',
      cancelled_at = now(),
      exit_reason = 'Superseded when another agreement activated for the same offer.',
      updated_at = now()
    where offer_id = agreement_row.offer_id
      and id <> agreement_row.id
      and lifecycle_status = 'proposed'
    returning id
  loop
    update public.trade_threads
    set status = 'closed', updated_at = now()
    where agreement_id = loser.id;
  end loop;

  update public.agreements
  set
    status = 'active',
    lifecycle_status = 'active',
    activated_at = now(),
    evidence_due_at = version_row.evidence_due_date,
    updated_at = now()
  where id = agreement_row.id;

  update public.offers
  set
    status = 'matched',
    workflow_status = 'closed',
    closed_at = coalesce(closed_at, now()),
    updated_at = now()
  where id = agreement_row.offer_id;

  perform moral_trade_private.revoke_offer_invitations(
    agreement_row.offer_id,
    'Another invitation for this offer reached bilateral confirmation.'
  );

  insert into public.trade_notifications(
    user_id, notification_type, title, body, href, dedupe_key, created_at
  ) values
    (
      agreement_row.proposer_id,
      'agreement_active',
      'Agreement active',
      'Both participants confirmed the frozen terms. Evidence and exit rules are now active.',
      '/trade-agreements/' || p_agreement_id::text,
      'agreement_active:' || p_agreement_id::text || ':' || agreement_row.proposer_id::text,
      now()
    ),
    (
      agreement_row.responder_id,
      'agreement_active',
      'Agreement active',
      'Both participants confirmed the frozen terms. Evidence and exit rules are now active.',
      '/trade-agreements/' || p_agreement_id::text,
      'agreement_active:' || p_agreement_id::text || ':' || agreement_row.responder_id::text,
      now()
    )
  on conflict (dedupe_key) do nothing;

  return jsonb_build_object(
    'status', 'active',
    'confirmationCount', confirmation_count,
    'active', true
  );
end;
$function$;

comment on function public.confirm_agreement_version_v2(uuid, uuid, uuid) is
  'Records one participant confirmation for the exact frozen version. Accepted marketplace agreements may confirm after their source offer is closed; only two distinct participant confirmations activate the agreement.';

revoke all on function public.confirm_agreement_version_v2(uuid, uuid, uuid)
  from public, anon;
grant execute on function public.confirm_agreement_version_v2(uuid, uuid, uuid)
  to authenticated, service_role;

notify pgrst, 'reload schema';
''',
    encoding="utf-8",
)


SQL_TEST.write_text(
    r'''-- Transactional regression for the deterministic MoralTrade QA marketplace fixture.
-- The test proves that one participant cannot activate by confirming twice, while two
-- distinct participants can activate the exact frozen version after marketplace acceptance
-- has already closed the source offer.

begin;

set local statement_timeout = '30s';
set local lock_timeout = '5s';

DO $test$
declare
  owner_id uuid;
  responder_id uuid;
  agreement_id_value uuid;
  agreement_version_id_value uuid;
  acceptance_result jsonb;
  first_confirmation jsonb;
  duplicate_confirmation jsonb;
  second_confirmation jsonb;
  confirmation_count integer;
  agreement_state text;
  agreement_status text;
  offer_state text;
  offer_workflow text;
begin
  select id into owner_id
  from public.profiles
  where email = 'qa-market-owner@example.com';

  select id into responder_id
  from public.profiles
  where email = 'qa-market-responder@example.com';

  if owner_id is null or responder_id is null then
    raise exception 'Refusing bilateral confirmation test outside the exact synthetic QA accounts.';
  end if;

  if not exists (
    select 1
    from public.offers
    where id = '10000000-0000-4000-8000-000000000158'::uuid
      and owner_id = owner_id
      and fingerprint = 'qa-pr-158-marketplace-fixture-v1'
      and status::text = 'open'
      and workflow_status = 'published'
  ) then
    raise exception 'Refusing bilateral confirmation test outside the clean deterministic QA offer.';
  end if;

  if exists (
    select 1 from public.interests
    where offer_id = '10000000-0000-4000-8000-000000000158'::uuid
  ) or exists (
    select 1 from public.agreements
    where offer_id = '10000000-0000-4000-8000-000000000158'::uuid
  ) then
    raise exception 'Deterministic QA offer must have no responses or agreements before the test.';
  end if;

  insert into public.interests (
    id,
    offer_id,
    user_id,
    interested_alias,
    message,
    status
  ) values (
    '10000000-0000-4000-8000-000000000161'::uuid,
    '10000000-0000-4000-8000-000000000158'::uuid,
    responder_id,
    'QA Counterparty',
    '[bilateral confirmation regression] synthetic response',
    'pending'
  );

  perform set_config('request.jwt.claim.sub', owner_id::text, true);
  perform set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', owner_id::text, 'role', 'authenticated')::text,
    true
  );

  acceptance_result := public.accept_marketplace_interest_v1(
    '10000000-0000-4000-8000-000000000161'::uuid,
    '10000000-0000-4000-8000-000000000158'::uuid,
    'Synthetic bilateral-confirmation regression agreement.',
    '',
    'Without this synthetic agreement, neither participant has the recorded reciprocal commitment.'
  );

  agreement_id_value := (acceptance_result -> 'agreement' ->> 'id')::uuid;
  if agreement_id_value is null then
    raise exception 'Acceptance did not return an agreement ID.';
  end if;

  select current_version_id, lifecycle_status, status::text
  into agreement_version_id_value, agreement_state, agreement_status
  from public.agreements
  where id = agreement_id_value;

  select status::text, workflow_status
  into offer_state, offer_workflow
  from public.offers
  where id = '10000000-0000-4000-8000-000000000158'::uuid;

  if agreement_version_id_value is null
     or agreement_state <> 'proposed'
     or agreement_status <> 'proposed' then
    raise exception 'Acceptance did not create one proposed agreement with a frozen version.';
  end if;

  if offer_state <> 'matched' or offer_workflow <> 'closed' then
    raise exception 'Acceptance did not close the source offer before confirmation.';
  end if;

  first_confirmation := public.confirm_agreement_version_v2(
    owner_id,
    agreement_id_value,
    agreement_version_id_value
  );

  select count(*), max(a.lifecycle_status), max(a.status::text)
  into confirmation_count, agreement_state, agreement_status
  from public.trade_agreement_confirmations c
  join public.trade_agreement_versions v on v.id = c.agreement_version_id
  join public.agreements a on a.id = v.agreement_id
  where c.agreement_version_id = agreement_version_id_value;

  if coalesce((first_confirmation ->> 'active')::boolean, true)
     or confirmation_count <> 1
     or agreement_state <> 'proposed'
     or agreement_status <> 'proposed' then
    raise exception 'The first distinct confirmation must persist once and leave the agreement proposed.';
  end if;

  duplicate_confirmation := public.confirm_agreement_version_v2(
    owner_id,
    agreement_id_value,
    agreement_version_id_value
  );

  select count(*), max(a.lifecycle_status), max(a.status::text)
  into confirmation_count, agreement_state, agreement_status
  from public.trade_agreement_confirmations c
  join public.trade_agreement_versions v on v.id = c.agreement_version_id
  join public.agreements a on a.id = v.agreement_id
  where c.agreement_version_id = agreement_version_id_value;

  if coalesce((duplicate_confirmation ->> 'active')::boolean, true)
     or confirmation_count <> 1
     or agreement_state <> 'proposed'
     or agreement_status <> 'proposed' then
    raise exception 'A duplicate confirmation by one participant must not activate the agreement.';
  end if;

  second_confirmation := public.confirm_agreement_version_v2(
    responder_id,
    agreement_id_value,
    agreement_version_id_value
  );

  select count(*), max(a.lifecycle_status), max(a.status::text)
  into confirmation_count, agreement_state, agreement_status
  from public.trade_agreement_confirmations c
  join public.trade_agreement_versions v on v.id = c.agreement_version_id
  join public.agreements a on a.id = v.agreement_id
  where c.agreement_version_id = agreement_version_id_value;

  if not coalesce((second_confirmation ->> 'active')::boolean, false)
     or confirmation_count <> 2
     or agreement_state <> 'active'
     or agreement_status <> 'active' then
    raise exception 'Two distinct confirmations of the same frozen version must activate the agreement.';
  end if;
end;
$test$;

select 'PASS: duplicate confirmation does not activate; two distinct confirmations activate the closed-offer agreement' as result;

rollback;
''',
    encoding="utf-8",
)


SOURCE_TEST.write_text(
    '''import assert from "node:assert/strict";\nimport { readFileSync } from "node:fs";\nimport path from "node:path";\nimport test from "node:test";\n\nconst repoRoot = process.cwd();\nconst dealroom = readFileSync(\n  path.join(repoRoot, "src/app/deals/[agreementId]/dealroom-main-sections.tsx"),\n  "utf8",\n);\nconst coreActions = readFileSync(\n  path.join(repoRoot, "src/app/core-trade-actions-base.ts"),\n  "utf8",\n);\nconst migration = readFileSync(\n  path.join(\n    repoRoot,\n    "supabase/migrations/20260727042000_allow_closed_marketplace_offer_bilateral_confirmation.sql",\n  ),\n  "utf8",\n);\nconst sqlRegression = readFileSync(\n  path.join(repoRoot, "supabase/tests/marketplace_bilateral_confirmation.sql"),\n  "utf8",\n);\n\nfunction between(source: string, start: string, end: string) {\n  const startIndex = source.indexOf(start);\n  assert.notEqual(startIndex, -1, `Missing start marker: ${start}`);\n  const endIndex = source.indexOf(end, startIndex + start.length);\n  assert.notEqual(endIndex, -1, `Missing end marker: ${end}`);\n  return source.slice(startIndex, endIndex);\n}\n\ntest("dealroom confirms the exact frozen version through the canonical action", () => {\n  assert.match(dealroom, /confirmAgreementVersionAction/);\n  assert.match(dealroom, /name=\"agreement_version_id\"/);\n  assert.match(dealroom, /value=\{agreement\.current_version_id\}/);\n  assert.match(dealroom, /name=\"return_to\"/);\n  assert.match(dealroom, /name=\"terms_reviewed\"/);\n  assert.match(dealroom, /Confirm current frozen version/);\n  assert.doesNotMatch(dealroom, /updateAgreementStatusAction/);\n  assert.doesNotMatch(dealroom, /Record confirmation and activate/);\n});\n\ntest("canonical confirmation action can return to the private dealroom", () => {\n  const action = between(\n    coreActions,\n    "export async function confirmAgreementVersionAction",\n    "export async function proposeAgreementAmendmentAction",\n  );\n  assert.match(action, /safeInternalPath\([\s\S]*read\(formData, \"return_to\"\)/);\n  assert.match(action, /confirm_agreement_version_v2/);\n  assert.match(action, /revalidatePath\(`\\/deals\\/\$\{agreementId\}`\)/);\n});\n\ntest("database repair allows only accepted closed marketplace agreements", () => {\n  assert.match(migration, /offer_row\.status::text = 'matched'/);\n  assert.match(migration, /offer_row\.workflow_status = 'closed'/);\n  assert.match(migration, /interest_row\.status::text = 'accepted'/);\n  assert.match(migration, /guest_interest_row\.status::text = 'accepted'/);\n  assert.match(migration, /count\(distinct c\.user_id\)/);\n});\n\ntest("SQL regression distinguishes duplicate and distinct confirmations", () => {\n  assert.match(sqlRegression, /duplicate confirmation by one participant/i);\n  assert.match(sqlRegression, /confirmation_count <> 1/);\n  assert.match(sqlRegression, /confirmation_count <> 2/);\n  assert.match(sqlRegression, /agreement_state <> 'active'/);\n  assert.match(sqlRegression, /rollback;/);\n});\n''',
    encoding="utf-8",
)

print("Applied the PR #158 bilateral-confirmation product repair.")
