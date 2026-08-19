import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migrationPath =
  "supabase/migrations/20260727043000_mpgf_equal_credit_advisory_ballots.sql";
const governanceRoutePath = "src/app/api/mpgf/governance/route.ts";
const ballotRoutePath = "src/app/api/mpgf/governance/ballots/route.ts";
const resultsRoutePath = "src/app/api/mpgf/governance/results/route.ts";
const componentPath =
  "src/components/mpgf/mpgf-phase-one-governance.tsx";

const migration = readFileSync(migrationPath, "utf8");

function functionBody(
  functionName: string,
  schema: "private" | "public" = "private",
) {
  const start = migration.indexOf(
    `create or replace function ${schema}.${functionName}`,
  );
  const nextFunction = migration.indexOf(
    "\ncreate or replace function ",
    start + 1,
  );
  const firstGrant = migration.indexOf(
    "\ngrant usage on schema private",
    start + 1,
  );
  const possibleEnds = [nextFunction, firstGrant].filter(
    (value) => value !== -1,
  );
  const end = Math.min(...possibleEnds);

  assert.notEqual(start, -1, `${functionName} must exist`);
  assert.notEqual(
    end,
    -1,
    `another function or function grants must follow ${functionName}`,
  );

  return migration.slice(start, end);
}

test("phase-one tables are RLS-protected and unavailable for direct participant writes", () => {
  const tables = [
    "rounds",
    "projects",
    "pledges",
    "eligible_voters",
    "candidate_snapshots",
    "ballots",
    "ballot_approvals",
    "checkout_handoffs",
    "idempotency_keys",
  ];

  for (const table of tables) {
    assert.match(
      migration,
      new RegExp(
        `alter table public\\.mpgf_phase_one_${table} enable row level security;`,
      ),
    );
  }

  assert.match(migration, /revoke all on table[\s\S]+from anon, authenticated;/);
  assert.doesNotMatch(migration, /grant (select|insert|update|delete) on table[\s\S]+to authenticated/i);
});

test("participant RPCs bind actors to auth.uid and never accept a profile parameter", () => {
  const pledgeBody = functionBody(
    "confirm_mpgf_phase_one_pledge",
  );
  const ballotBody = functionBody(
    "submit_mpgf_phase_one_ballot",
  );
  const checkoutBody = functionBody("confirm_mpgf_phase_one_external_checkout");

  for (const body of [pledgeBody, ballotBody, checkoutBody]) {
    assert.match(body, /v_actor uuid := auth\.uid\(\)/);
    assert.doesNotMatch(body, /p_(profile|actor|voter|user)_id/);
  }

  assert.match(migration, /revoke all on function public\.confirm_mpgf_phase_one_pledge[\s\S]+from public, anon;/);
  assert.match(migration, /grant execute on function public\.submit_mpgf_phase_one_ballot[\s\S]+to authenticated;/);
  assert.match(
    migration,
    /create or replace function public\.submit_mpgf_phase_one_ballot[\s\S]+security invoker[\s\S]+select private\.submit_mpgf_phase_one_ballot/,
  );
});

test("database tally uses one split credit and never pledge amount", () => {
  const publishBody = functionBody(
    "publish_mpgf_phase_one_results",
    "public",
  );
  const publicStateBody = functionBody("get_mpgf_phase_one_governance_state");

  for (const body of [publishBody, publicStateBody]) {
    assert.match(
      body,
      /sum\(1::numeric \/ nullif\(ballot\.selection_count, 0\)::numeric\)/,
    );
    assert.doesNotMatch(body, /pledge\.amount_cents|amount_cents \*|sum\(.*amount_cents/i);
  }

  assert.match(migration, /quorum_bps integer not null default 5000 check \(quorum_bps = 5000\)/);
  assert.match(migration, /v_quorum_required := \(v_eligible_count \+ 1\) \/ 2;/);
  assert.match(migration, /v_round\.quorum_met/);
});

test("electorate, candidates, and results freeze before participant writes can race", () => {
  const openBody = functionBody(
    "open_mpgf_phase_one_ballot",
    "public",
  );
  const ballotBody = functionBody("submit_mpgf_phase_one_ballot");

  assert.match(openBody, /from public\.mpgf_phase_one_pledges pledge[\s\S]+pledge\.status = 'confirmed'/);
  assert.match(openBody, /from public\.mpgf_phase_one_projects project[\s\S]+project\.status = 'approved'/);
  assert.match(ballotBody, /where id = p_round_id\s+for update;/);
  assert.match(ballotBody, /frozen approved candidate set/);
  assert.match(migration, /mpgf_phase_one_approval_candidate_same_round/);
  assert.match(migration, /mpgf_phase_one_voter_pledge_same_round_profile/);
});

test("published results remain advisory and checkout handoffs cannot claim payment", () => {
  const publicStateBody = functionBody("get_mpgf_phase_one_governance_state");
  const checkoutBody = functionBody("confirm_mpgf_phase_one_external_checkout");

  assert.doesNotMatch(publicStateBody, /external_checkout_url_snapshot/);
  assert.match(checkoutBody, /or not v_round\.quorum_met/);
  assert.match(checkoutBody, /v_project\.status <> 'approved'/);
  assert.match(checkoutBody, /'moneyMoved', false/);
  assert.match(checkoutBody, /'paymentConfirmed', false/);
  assert.match(checkoutBody, /'receiptRecorded', false/);
  assert.match(
    migration,
    /Results are advisory and cannot authorize a payment or transfer/,
  );
});

test("prominent governance routes use durable state rather than demo ballots", () => {
  const governanceRoute = readFileSync(governanceRoutePath, "utf8");
  const ballotRoute = readFileSync(ballotRoutePath, "utf8");
  const resultsRoute = readFileSync(resultsRoutePath, "utf8");
  const component = readFileSync(componentPath, "utf8");

  assert.match(governanceRoute, /loadMpgfPhaseOneGovernanceState/);
  assert.match(ballotRoute, /submitMpgfPhaseOneBallot/);
  assert.match(resultsRoute, /loadMpgfPhaseOneGovernanceState/);
  assert.doesNotMatch(ballotRoute, /createMpgfPublicGoodsGovernanceBallot/);
  assert.doesNotMatch(resultsRoute, /getMpgfPublicGoodsGovernanceResultsApi/);
  assert.match(component, /one voting credit per confirmed pledger/i);
  assert.match(component, /does not prove or record a payment/);
  assert.match(component, /Demo projects are not promoted as live opportunities/);
});
