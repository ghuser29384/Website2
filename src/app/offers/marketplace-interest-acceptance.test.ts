import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const repoRoot = process.cwd();
const actions = readFileSync(path.join(repoRoot, "src/app/actions.ts"), "utf8");
const completionMigration = readFileSync(
  path.join(
    repoRoot,
    "supabase/migrations/20260726143000_restore_agreement_completion_contract_and_atomic_acceptance.sql",
  ),
  "utf8",
);
const linkingMigration = readFileSync(
  path.join(
    repoRoot,
    "supabase/migrations/20260726163500_fix_atomic_acceptance_core_version_linking.sql",
  ),
  "utf8",
);
const internalMigration = readFileSync(
  path.join(
    repoRoot,
    "supabase/migrations/20260726164500_fix_atomic_acceptance_core_internal_write.sql",
  ),
  "utf8",
);
const offerMigration = readFileSync(
  path.join(
    repoRoot,
    "supabase/migrations/20260726165500_close_offer_on_atomic_acceptance.sql",
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

test("completion review remains separate from the bilateral lifecycle", () => {
  assert.match(
    completionMigration,
    /add column if not exists completion_state text not null default 'pending_evidence'/,
  );
  assert.match(completionMigration, /comment on column public\.agreements\.lifecycle_status/);
  assert.match(completionMigration, /create table if not exists public\.agreement_evidence_items/);
  assert.match(completionMigration, /create table if not exists public\.agreement_review_cases/);
});

test("atomic acceptance authorizes only the synchronous legacy bridge", () => {
  assert.equal(
    (linkingMigration.match(/set_config\('app\.core_trade_linking_agreement', '1', true\)/g) ?? []).length,
    2,
  );
  assert.equal(
    (internalMigration.match(/set_config\('app\.core_trade_linking_agreement', '1', true\)/g) ?? []).length,
    2,
  );
  assert.equal(
    (internalMigration.match(/set_config\('app\.core_trade_internal', '1', true\)/g) ?? []).length,
    2,
  );
  assert.equal(
    (internalMigration.match(/set_config\('app\.core_trade_linking_agreement', '', true\)/g) ?? []).length,
    2,
  );
  assert.equal(
    (internalMigration.match(/set_config\('app\.core_trade_internal', '', true\)/g) ?? []).length,
    2,
  );
  assert.equal((offerMigration.match(/workflow_status = 'closed'/g) ?? []).length, 2);
  assert.equal((offerMigration.match(/closed_at = now\(\)/g) ?? []).length, 2);
});

test("SQL regression proves rollback and successful frozen-version creation", () => {
  assert.match(sqlRegression, /qa_forced_agreement_insert_failure/);
  assert.match(sqlRegression, /response_status <> 'pending'/);
  assert.match(sqlRegression, /offer_status <> 'open'/);
  assert.match(sqlRegression, /offer_workflow_status <> 'closed'/);
  assert.match(sqlRegression, /offer_closed_at is null/);
  assert.match(sqlRegression, /agreement_count <> 0/);
  assert.match(sqlRegression, /acceptance_result->>'created'/);
  assert.match(sqlRegression, /agreement_row\.current_version_id is null/);
  assert.match(sqlRegression, /linked_thread_count <> 1/);
  assert.match(
    sqlRegression,
    /successful acceptance creates one proposed agreement, frozen version, and linked private thread/,
  );
  assert.match(sqlRegression, /rollback;/);
});
