import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const repoRoot = process.cwd();
const actions = readFileSync(path.join(repoRoot, "src/app/actions.ts"), "utf8");
const migration = readFileSync(
  path.join(
    repoRoot,
    "supabase/migrations/20260726143000_restore_agreement_completion_contract_and_atomic_acceptance.sql",
  ),
  "utf8",
);
const sqlRegression = readFileSync(
  path.join(repoRoot, "supabase/tests/marketplace_interest_acceptance_atomicity.sql"),
  "utf8",
);

function between(source: string, start: string, end: string) {
  const startIndex = source.indexOf(start);
  assert.notEqual(startIndex, -1, `Missing start marker: ${start}`);
  const endIndex = source.indexOf(end, startIndex + start.length);
  assert.notEqual(endIndex, -1, `Missing end marker: ${end}`);
  return source.slice(startIndex, endIndex);
}

test("member and guest acceptance use database transaction boundaries", () => {
  const member = between(
    actions,
    "export async function acceptInterestAction",
    "export async function acceptGuestInterestAction",
  );
  const guest = between(
    actions,
    "export async function acceptGuestInterestAction",
    "export async function rateAgreementAction",
  );

  assert.match(member, /accept_marketplace_interest_v1/);
  assert.doesNotMatch(
    member,
    /\.from\("interests"\)[\s\S]{0,160}\.update\(\{[\s\S]{0,80}status:\s*"accepted"/,
  );
  assert.match(guest, /accept_marketplace_guest_interest_v1/);
  assert.doesNotMatch(
    guest,
    /\.from\("guest_interests"\)[\s\S]{0,160}\.update\(\{[\s\S]{0,80}status:\s*"accepted"/,
  );
});

test("migration restores completion review separately from lifecycle and makes acceptance atomic", () => {
  assert.match(migration, /add column if not exists completion_state text not null default 'pending_evidence'/);
  assert.match(migration, /comment on column public\.agreements\.lifecycle_status/);
  assert.match(migration, /create table if not exists public\.agreement_evidence_items/);
  assert.match(migration, /create table if not exists public\.agreement_review_cases/);

  const memberRpc = between(
    migration,
    "create or replace function public.accept_marketplace_interest_v1",
    "create or replace function public.accept_marketplace_guest_interest_v1",
  );
  const acceptedUpdate = memberRpc.indexOf("update public.interests");
  const agreementInsert = memberRpc.indexOf("insert into public.agreements");
  assert.ok(acceptedUpdate >= 0);
  assert.ok(agreementInsert > acceptedUpdate);
  assert.match(memberRpc, /security definer/);
  assert.match(memberRpc, /for update/);
});

test("SQL regression forces an agreement failure and asserts rollback", () => {
  assert.match(sqlRegression, /qa_forced_agreement_insert_failure/);
  assert.match(sqlRegression, /response_status <> 'pending'/);
  assert.match(sqlRegression, /offer_status <> 'open'/);
  assert.match(sqlRegression, /agreement_count <> 0/);
  assert.match(sqlRegression, /rollback;/);
});
