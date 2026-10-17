import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationPath =
  "supabase/migrations/20260807050000_mpgf_dac_success_lapse.sql";
const regressionPath =
  "supabase/tests/mpgf_dac_success_lapse.sql";
const workflowPath =
  ".github/workflows/mpgf-dac-success-lapse-gates.yml";

async function read(path: string) {
  return readFile(path, "utf8");
}

test("DAC terminal architecture records one immutable aggregate outcome from the canonical pledge ledger", async () => {
  const migration = await read(migrationPath);

  assert.match(
    migration,
    /create table if not exists public\.mpgf_dac_campaign_outcomes/,
  );
  assert.match(
    migration,
    /constraint mpgf_dac_campaign_outcomes_campaign_unique\s+unique \(campaign_id\)/,
  );
  assert.match(
    migration,
    /create or replace function public\.mpgf_finalize_dac_campaign/,
  );
  assert.match(
    migration,
    /from public\.mpgf_public_goods_pledges as pledge[\s\S]*eligibility_state = 'eligible'[\s\S]*status = 'pledged'/,
  );
  assert.match(migration, /count\(distinct pledge\.profile_id\)/);
  assert.match(
    migration,
    /Every DAC pledge must have a final audited eligibility decision bound to its immutable consent intent before finalization/,
  );
  assert.match(
    migration,
    /The canonical DAC pledge differs from its immutable consent intent/,
  );
  assert.match(migration, /outcome_status in \('succeeded', 'lapsed'\)/);
  assert.match(migration, /mpgf_dac_campaign_outcomes_immutable/);
  assert.match(migration, /pool_succeeded/);
  assert.match(migration, /pool_lapsed/);
  assert.match(
    migration,
    /status in \('approved_as_candidate', 'succeeded', 'lapsed'\)/,
  );
  assert.doesNotMatch(
    migration,
    /create table(?: if not exists)? public\.mpgf_conditional_pledges/i,
  );
});

test("review and finalization are reviewer-authorized, exact-version, idempotent, terminal, and write-contained", async () => {
  const migration = await read(migrationPath);

  assert.match(
    migration,
    /create or replace function public\.mpgf_review_dac_pledge_eligibility/,
  );
  assert.match(migration, /mpgf_assert_authorized_pool_reviewer/g);
  assert.match(migration, /pg_advisory_xact_lock/g);
  assert.match(
    migration,
    /published_terms_version is distinct from pledge_row\.terms_version/,
  );
  assert.match(
    migration,
    /existing_outcome public\.mpgf_dac_campaign_outcomes%rowtype/,
  );
  assert.match(
    migration,
    /The existing DAC outcome disagrees with current terminal campaign state/,
  );
  assert.match(migration, /set status = outcome_status_value/);
  assert.match(migration, /set review_status = 'finalized'/);
  assert.match(
    migration,
    /Published pool campaign status may change only through an authorized service lifecycle/,
  );
  assert.match(
    migration,
    /A finalized DAC campaign cannot return to a nonterminal state/,
  );
  assert.match(
    migration,
    /revoke all on function public\.mpgf_finalize_dac_campaign/,
  );
  assert.match(
    migration,
    /grant execute on function public\.mpgf_finalize_dac_campaign[\s\S]*to service_role/,
  );
  assert.match(
    migration,
    /revoke all on table public\.mpgf_dac_campaign_outcomes[\s\S]*from service_role/,
  );
  assert.match(
    migration,
    /grant select on table public\.mpgf_dac_campaign_outcomes[\s\S]*to service_role/,
  );
  assert.doesNotMatch(
    migration,
    /grant all on table public\.mpgf_dac_campaign_outcomes[\s\S]*to service_role/,
  );
});

test("lapse expires signed intents while success and both outcomes create no payment behavior", async () => {
  const migration = await read(migrationPath);
  const regression = await read(regressionPath);

  assert.match(migration, /set status = 'expired'/);
  assert.match(migration, /'eventType', 'pledge_expired'/);
  assert.match(migration, /'active_signed_intents_preserved_no_payment'/);
  assert.match(migration, /'expired_without_payment'/);
  assert.match(migration, /'authorized', false/);
  assert.match(migration, /'mandateCreated', false/);
  assert.match(migration, /'charged', false/);
  assert.match(migration, /'captured', false/);
  assert.match(migration, /'settled', false/);
  assert.match(migration, /'failureBonusPaid', false/);
  assert.doesNotMatch(migration, /set\s+payment_intent_ref\s*=/i);
  assert.doesNotMatch(migration, /set\s+status\s*=\s*'captured'/i);

  assert.match(regression, /^begin;/);
  assert.match(regression, /rollback;\s*$/);
  assert.match(regression, /Premature lapse must fail/);
  assert.match(regression, /Replay the exact successful terminal transition/);
  assert.match(
    regression,
    /A threshold-met DAC with a pending eligibility decision must not finalize/,
  );
  assert.match(regression, /Replay the exact lapsed terminal transition/);
  assert.match(regression, /success_outcome\.eligible_amount_cents <> 11000/);
  assert.match(regression, /lapse_outcome\.eligible_amount_cents <> 1000/);
  assert.match(regression, /success_pledged_count <> 3/);
  assert.match(regression, /success_eligible_count <> 2/);
  assert.match(regression, /success_blocked_count <> 1/);
  assert.match(regression, /lapse_expired_count <> 1/);
  assert.match(regression, /payment_object_count <> 0/);
  assert.match(
    regression,
    /Service role unexpectedly has direct DAC outcome mutation privileges/,
  );
  assert.match(regression, /visible_outcomes <> 2/);
  assert.match(regression, /visible_private_events <> 0/);
});

test("permanent exact-head gate proves source, isolated QA, both terminal paths, and zero residue", async () => {
  const workflow = await read(workflowPath);

  assert.match(workflow, /mpgf-dac-success-lapse/);
  assert.match(workflow, /npm test/);
  assert.match(workflow, /npm run lint/);
  assert.match(workflow, /npx tsc --noEmit/);
  assert.match(workflow, /npm run build/);
  assert.match(workflow, /QA_SUPABASE_DB_URL/);
  assert.match(workflow, /hvmxfjjbdcgjjudmthdz/);
  assert.match(workflow, /mpgf_dac_success_lapse\.sql/);
  assert.match(workflow, /pool_succeeded/);
  assert.match(workflow, /pool_lapsed/);
  assert.match(workflow, /fixture_residue=0/);
  assert.match(workflow, /payment_refs=0/);
  assert.doesNotMatch(workflow, /PRODUCTION_SUPABASE_DB_URL/);
  assert.doesNotMatch(workflow, /vercel deploy/);
});

// Exact-head user-triggered rerun after temporary controller cleanup.
