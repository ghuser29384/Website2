#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path

ACTIONS = Path("src/app/actions.ts")
DEALROOM = Path("src/app/deals/[agreementId]/dealroom-main-sections.tsx")
SOURCE_TEST = Path("src/app/deals/dealroom-confirmation.test.ts")
SQL_TEST = Path("supabase/tests/marketplace_bilateral_confirmation.sql")


def replace_once(source: str, old: str, new: str, label: str) -> str:
    count = source.count(old)
    if count != 1:
        raise RuntimeError(f"Expected exactly one {label}; found {count}.")
    return source.replace(old, new, 1)


def patch_actions() -> None:
    source = ACTIONS.read_text(encoding="utf-8")
    marker = "export async function updateAgreementStatusAction(formData: FormData) {"
    if source.count(marker) != 1:
        raise RuntimeError("Expected one updateAgreementStatusAction declaration.")

    new_action = r'''export async function confirmAgreementVersionAction(formData: FormData) {
  if (!hasSupabaseEnv()) {
    redirectWithMessage("/dashboard", "error", "Supabase is not configured yet.");
  }

  const agreementId = readRequired(formData, "agreement_id");
  const agreementVersionId = readRequired(formData, "agreement_version_id");
  const returnTo = getSafeInternalPath(
    readOptional(formData, "return_to"),
    agreementId ? `/deals/${agreementId}` : "/commitments",
  );

  if (!agreementId || !agreementVersionId) {
    redirectWithMessage(
      returnTo,
      "error",
      "Agreement ID and frozen version ID are required.",
    );
  }

  const viewer = await requireViewer(returnTo);
  const supabase = await createClient();
  const { data: agreement, error: agreementError } = await supabase
    .from("agreements")
    .select(
      "id, offer_id, proposer_id, responder_id, lifecycle_status, current_version_id",
    )
    .eq("id", agreementId)
    .maybeSingle();

  if (agreementError || !agreement) {
    redirectWithMessage(
      returnTo,
      "error",
      agreementError?.message ?? "Agreement not found.",
    );
  }

  if (
    agreement.proposer_id !== viewer.authUser.id &&
    agreement.responder_id !== viewer.authUser.id
  ) {
    redirectWithMessage(
      returnTo,
      "error",
      "Only agreement participants can confirm a frozen version.",
    );
  }

  if (agreement.lifecycle_status !== "proposed" || !agreement.current_version_id) {
    redirectWithMessage(
      returnTo,
      "error",
      "This agreement is not awaiting confirmation of a frozen version.",
    );
  }

  if (agreement.current_version_id !== agreementVersionId) {
    redirectWithMessage(
      returnTo,
      "error",
      "The agreement changed after you reviewed it. Review and confirm the current frozen version.",
    );
  }

  const { data: confirmationResult, error: confirmationError } = await (
    supabase as any
  ).rpc("confirm_agreement_version_v2", {
    p_actor_id: viewer.authUser.id,
    p_agreement_id: agreementId,
    p_agreement_version_id: agreementVersionId,
  });

  const confirmation = confirmationResult as
    | { active?: boolean; confirmationCount?: number; status?: string }
    | null;

  if (confirmationError || !confirmation) {
    logSupabaseActionError(
      "Failed to confirm frozen agreement version",
      confirmationError,
      {
        agreementId,
        agreementVersionId,
        userId: viewer.authUser.id,
      },
    );
    redirectWithMessage(
      returnTo,
      "error",
      confirmationError?.message ?? "Unable to confirm the frozen agreement version.",
    );
  }

  revalidatePath("/dashboard");
  revalidatePath("/commitments");
  revalidatePath(`/deals/${agreementId}`);
  revalidatePath(`/trade-agreements/${agreementId}`);
  revalidatePath(`/agreements/${agreementId}`);
  revalidatePath(`/offers/${agreement.offer_id}`);

  if (confirmation.active || confirmation.status === "active") {
    redirectWithMessage(
      returnTo,
      "message",
      "Both participants confirmed the same frozen version. The agreement is active.",
    );
  }

  const confirmationCount = Number(confirmation.confirmationCount ?? 1);
  redirectWithMessage(
    returnTo,
    "message",
    `Confirmation ${confirmationCount} of 2 recorded. Waiting for the other participant to confirm the same frozen version.`,
  );
}

'''

    ACTIONS.write_text(source.replace(marker, new_action + marker, 1), encoding="utf-8")


def patch_dealroom() -> None:
    source = DEALROOM.read_text(encoding="utf-8")
    source = replace_once(
        source,
        '''import {
  addAgreementEventAction,
  updateAgreementStatusAction,
} from "@/app/actions";''',
        '''import {
  addAgreementEventAction,
  confirmAgreementVersionAction,
} from "@/app/actions";''',
        "dealroom actions import",
    )
    source = replace_once(
        source,
        '''            Counteroffers remain explicit events. The existing status action lets one
            participant activate a proposed agreement; it does not claim a separate
            bilateral confirmation record. Either party can still use the recorded exit
            conditions.''',
        '''            Counteroffers remain explicit events. Each participant must separately
            confirm the same frozen agreement version. The first confirmation leaves the
            agreement proposed; the second activates it. Either party can still use the
            recorded exit conditions.''',
        "bilateral confirmation explanatory copy",
    )
    source = replace_once(
        source,
        '''              {agreement.status === "proposed"
                ? "Terms are still proposed."
                : agreement.status === "active"''',
        '''              {agreement.status === "proposed"
                ? "Terms await bilateral confirmation."
                : agreement.status === "active"''',
        "proposed-state heading",
    )
    source = replace_once(
        source,
        '''              {agreement.status === "proposed"
                ? "Confirm only after both parties have reviewed the latest saved terms and the evidence rule."
                : agreement.status === "active"''',
        '''              {agreement.status === "proposed"
                ? "Your confirmation is recorded once for the current frozen version. The agreement activates only after the other participant confirms that same version."
                : agreement.status === "active"''',
        "proposed-state guidance",
    )
    source = replace_once(
        source,
        '''            {agreement.status === "proposed" ? (
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
            ) : (''',
        '''            {agreement.status === "proposed" ? (
              agreement.current_version_id ? (
                <form action={confirmAgreementVersionAction}>
                  <input name="agreement_id" type="hidden" value={agreement.id} />
                  <input
                    name="agreement_version_id"
                    type="hidden"
                    value={agreement.current_version_id}
                  />
                  <input name="return_to" type="hidden" value={returnTo} />
                  <button className="button button-primary" type="submit">
                    Confirm current frozen version
                  </button>
                </form>
              ) : (
                <p>The current agreement does not yet have a frozen version to confirm.</p>
              )
            ) : (''',
        "dealroom activation form",
    )
    DEALROOM.write_text(source, encoding="utf-8")


def write_source_test() -> None:
    SOURCE_TEST.write_text(
        r'''import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const actions = readFileSync(path.join(root, "src/app/actions.ts"), "utf8");
const dealroom = readFileSync(
  path.join(root, "src/app/deals/[agreementId]/dealroom-main-sections.tsx"),
  "utf8",
);

function between(source: string, start: string, end: string) {
  const startIndex = source.indexOf(start);
  assert.notEqual(startIndex, -1, `Missing start marker: ${start}`);
  const endIndex = source.indexOf(end, startIndex + start.length);
  assert.notEqual(endIndex, -1, `Missing end marker: ${end}`);
  return source.slice(startIndex, endIndex);
}

test("dealroom confirmation calls the canonical frozen-version RPC", () => {
  const action = between(
    actions,
    "export async function confirmAgreementVersionAction",
    "export async function updateAgreementStatusAction",
  );

  assert.match(action, /confirm_agreement_version_v2/);
  assert.match(action, /p_actor_id:\s*viewer\.authUser\.id/);
  assert.match(action, /p_agreement_id:\s*agreementId/);
  assert.match(action, /p_agreement_version_id:\s*agreementVersionId/);
  assert.match(action, /agreement\.current_version_id !== agreementVersionId/);
  assert.match(action, /confirmation\.active \|\| confirmation\.status === "active"/);
  assert.doesNotMatch(action, /\.from\("agreements"\)[\s\S]*?\.update\(\{\s*status/);
});

test("dealroom posts the immutable current version and describes bilateral activation", () => {
  assert.match(dealroom, /confirmAgreementVersionAction/);
  assert.match(dealroom, /name="agreement_version_id"/);
  assert.match(dealroom, /value=\{agreement\.current_version_id\}/);
  assert.match(dealroom, /Confirm current frozen version/);
  assert.match(dealroom, /The first confirmation leaves the[\s\S]*second activates it/);
  assert.doesNotMatch(dealroom, /action=\{updateAgreementStatusAction\}/);
  assert.doesNotMatch(dealroom, /Record confirmation and activate/);
});
''',
        encoding="utf-8",
    )


def write_sql_test() -> None:
    SQL_TEST.write_text(
        r'''-- Live QA regression for bilateral frozen-version confirmation.
-- Every mutation is transaction-local and rolled back.

begin;

set local statement_timeout = '45s';
set local lock_timeout = '10s';

DO $guard$
declare
  owner_id uuid;
  responder_id uuid;
  fixture_count integer;
begin
  select id into owner_id
  from public.profiles
  where email = 'qa-market-owner@example.com';

  select id into responder_id
  from public.profiles
  where email = 'qa-market-responder@example.com';

  select count(*) into fixture_count
  from public.offers
  where id = '10000000-0000-4000-8000-000000000158'::uuid
    and fingerprint = 'qa-pr-158-marketplace-fixture-v1'
    and owner_id = owner_id;

  if owner_id is null or responder_id is null or fixture_count <> 1 then
    raise exception 'Refusing bilateral confirmation regression outside the exact MoralTrade QA fixture.';
  end if;
end;
$guard$;

-- Establish a transaction-local clean fixture.
delete from public.trade_threads
where offer_id = '10000000-0000-4000-8000-000000000158'::uuid;

delete from public.agreements
where offer_id = '10000000-0000-4000-8000-000000000158'::uuid;

delete from public.interests
where offer_id = '10000000-0000-4000-8000-000000000158'::uuid;

delete from public.guest_interests
where offer_id = '10000000-0000-4000-8000-000000000158'::uuid;

update public.offers
set
  status = 'open',
  workflow_status = 'published',
  closed_at = null,
  deleted_at = null,
  updated_at = now()
where id = '10000000-0000-4000-8000-000000000158'::uuid;

insert into public.interests (
  id,
  offer_id,
  user_id,
  interested_alias,
  message,
  status
) values (
  '10000000-0000-4000-8000-000000000160'::uuid,
  '10000000-0000-4000-8000-000000000158'::uuid,
  (select id from public.profiles where email = 'qa-market-responder@example.com'),
  'QA Counterparty',
  '[bilateral confirmation regression] synthetic response',
  'pending'
);

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
declare
  owner_id uuid := (select id from public.profiles where email = 'qa-market-owner@example.com');
  responder_id uuid := (select id from public.profiles where email = 'qa-market-responder@example.com');
  acceptance jsonb;
  first_confirmation jsonb;
  duplicate_confirmation jsonb;
  second_confirmation jsonb;
  agreement_id_value uuid;
  version_id_value uuid;
  agreement_status text;
  lifecycle_status_value text;
  confirmation_count integer;
begin
  acceptance := public.accept_marketplace_interest_v1(
    '10000000-0000-4000-8000-000000000160'::uuid,
    '10000000-0000-4000-8000-000000000158'::uuid,
    'Bilateral confirmation regression',
    '',
    'Without this synthetic QA agreement, neither participant has a recorded reciprocal commitment.'
  );

  agreement_id_value := (acceptance -> 'agreement' ->> 'id')::uuid;
  if agreement_id_value is null then
    raise exception 'Acceptance did not return an agreement ID.';
  end if;

  select current_version_id, status::text, lifecycle_status
  into version_id_value, agreement_status, lifecycle_status_value
  from public.agreements
  where id = agreement_id_value;

  if version_id_value is null
     or agreement_status <> 'proposed'
     or lifecycle_status_value <> 'proposed' then
    raise exception 'Expected a proposed agreement with a frozen current version; got version %, status %, lifecycle %.',
      version_id_value,
      agreement_status,
      lifecycle_status_value;
  end if;

  first_confirmation := public.confirm_agreement_version_v2(
    owner_id,
    agreement_id_value,
    version_id_value
  );

  select status::text, lifecycle_status
  into agreement_status, lifecycle_status_value
  from public.agreements
  where id = agreement_id_value;

  select count(distinct user_id) into confirmation_count
  from public.trade_agreement_confirmations
  where agreement_version_id = version_id_value;

  if coalesce((first_confirmation ->> 'active')::boolean, false)
     or coalesce((first_confirmation ->> 'confirmationCount')::integer, 0) <> 1
     or agreement_status <> 'proposed'
     or lifecycle_status_value <> 'proposed'
     or confirmation_count <> 1 then
    raise exception 'First confirmation must leave the agreement proposed with one distinct confirmation. Result %, status %, lifecycle %, rows %.',
      first_confirmation,
      agreement_status,
      lifecycle_status_value,
      confirmation_count;
  end if;

  duplicate_confirmation := public.confirm_agreement_version_v2(
    owner_id,
    agreement_id_value,
    version_id_value
  );

  select status::text, lifecycle_status
  into agreement_status, lifecycle_status_value
  from public.agreements
  where id = agreement_id_value;

  select count(distinct user_id) into confirmation_count
  from public.trade_agreement_confirmations
  where agreement_version_id = version_id_value;

  if coalesce((duplicate_confirmation ->> 'active')::boolean, false)
     or coalesce((duplicate_confirmation ->> 'confirmationCount')::integer, 0) <> 1
     or agreement_status <> 'proposed'
     or lifecycle_status_value <> 'proposed'
     or confirmation_count <> 1 then
    raise exception 'Duplicate confirmation must be idempotent and must not activate. Result %, status %, lifecycle %, rows %.',
      duplicate_confirmation,
      agreement_status,
      lifecycle_status_value,
      confirmation_count;
  end if;

  perform set_config('request.jwt.claim.sub', responder_id::text, true);
  perform set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', responder_id, 'role', 'authenticated')::text,
    true
  );

  second_confirmation := public.confirm_agreement_version_v2(
    responder_id,
    agreement_id_value,
    version_id_value
  );

  select status::text, lifecycle_status
  into agreement_status, lifecycle_status_value
  from public.agreements
  where id = agreement_id_value;

  select count(distinct user_id) into confirmation_count
  from public.trade_agreement_confirmations
  where agreement_version_id = version_id_value;

  if not coalesce((second_confirmation ->> 'active')::boolean, false)
     or coalesce((second_confirmation ->> 'confirmationCount')::integer, 0) <> 2
     or agreement_status <> 'active'
     or lifecycle_status_value <> 'active'
     or confirmation_count <> 2 then
    raise exception 'Second distinct confirmation must activate. Result %, status %, lifecycle %, rows %.',
      second_confirmation,
      agreement_status,
      lifecycle_status_value,
      confirmation_count;
  end if;
end;
$exercise$;

select 'PASS: first confirmation stays proposed, duplicate is idempotent, and second distinct confirmation activates' as result;

rollback;
''',
        encoding="utf-8",
    )


def main() -> None:
    patch_actions()
    patch_dealroom()
    write_source_test()
    write_sql_test()
    print("Applied the PR #158 bilateral frozen-version confirmation repair and regressions.")


if __name__ == "__main__":
    main()
