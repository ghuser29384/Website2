import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const root = new URL("../../../", import.meta.url);
const read = (path: string) => readFileSync(new URL(path, root), "utf8");
const hardening = read("supabase/migrations/20260814031500_mpgf_public_goods_compacts_state_hardening.sql");
const base = read("supabase/migrations/20260813163052_mpgf_public_goods_compacts.sql");
const state = read("src/lib/mpgf/public-goods-compacts-state.ts");
const service = read("src/lib/mpgf/public-goods-compacts-service.ts");
const workflow = read(".github/workflows/mpgf-public-goods-compacts-qa.yml");
const concurrencyQa = read("scripts/test-mpgf-public-goods-compacts-concurrency.sh");
const generatedTypesQa = read("scripts/verify-mpgf-public-goods-compacts-generated-types.mjs");

test("accepted constitutions and evidence snapshots cannot be rewritten", () => {
  assert.match(hardening, /historically_accepted/);
  assert.match(hardening, /Published Compact v2 terms are immutable after the first acceptance/);
  assert.match(hardening, /before update or delete[\s\S]*mpgf_public_goods_compact_reject_snapshot_mutation_v2/);
});

test("qualification proves identity, unique-person, authorization, scheduling, and settlement links", () => {
  for (const marker of [
    "identity_eligibility_record_id", "unique_person_key_hash",
    "dormant_authorization_snapshot_id", "scheduled_amount_snapshot_id",
    "settled_contribution_snapshot_id", "settlement_coverage_status = 'complete'",
  ]) assert.ok(hardening.includes(marker), `missing qualification evidence: ${marker}`);
  assert.match(hardening, /verified_unique_person/);
  assert.match(hardening, /valid dormant authorization snapshot/);
});

test("service-only freeze RPCs are unavailable to browsers", () => {
  for (const rpc of [
    "freeze_mpgf_public_goods_financial_cycle_v2", "freeze_mpgf_public_goods_readiness_v2",
    "freeze_mpgf_public_goods_voting_v2", "freeze_mpgf_public_goods_delegations_v2",
  ]) {
    assert.match(hardening, new RegExp(`revoke all on function public\\.${rpc}[\\s\\S]{0,120}from public, anon, authenticated`));
    assert.match(hardening, new RegExp(`grant execute on function public\\.${rpc}[\\s\\S]{0,120}to service_role`));
  }
});

test("readiness and ballot calculations serialize per frozen Compact cycle", () => {
  assert.match(hardening, /p_compact_id::text \|\| ':readiness:' \|\| p_cycle_key/);
  assert.match(hardening, /p_compact_id::text \|\| ':voting:' \|\| p_cycle_key/);
  assert.match(base, /unique \(compact_id, cycle_key, source_snapshot_hash\)/);
});

test("delegation rejects cap violations instead of truncating them and freezes exact holdings", () => {
  assert.match(hardening, /Delegation rejected: a proxy would control more than 10 percent/);
  assert.match(hardening, /coalesce\(delegation\.delegatee_membership_id, weight\.membership_id\)/);
  assert.match(hardening, /direct_incoming_count/);
  assert.match(hardening, /delegated_to_membership_id/);
  assert.doesNotMatch(hardening, /least\([^\n]*controlled_weight/i);
});

test("deep validation fails closed on arithmetic, charter, activation, and payment drift", () => {
  for (const marker of [
    "value.summary !== charter.summary", "hasExactTerms", "hasExactInvariants",
    "hasSafeObligation", "hasSafeAllocation", "hasSafeReadiness",
    "hasSafeMembership", "value.delegation !== null", "status: \"exited\"",
    "moneyTransferred", "paymentMandateCreated",
  ]) assert.ok(state.includes(marker), `missing state boundary: ${marker}`);
  assert.match(service, /Published examples are shown instead/);
  assert.match(service, /requiredFalseFlags\.some/);
});

test("exact-head database QA reconstructs v2 and serializes readiness without activation", () => {
  assert.match(workflow, /clean-ephemeral-full-chain/);
  assert.match(workflow, /genuinely concurrent readiness freeze test/);
  assert.match(workflow, /rollback-database-lifecycle/);
  assert.match(concurrencyQa, /freeze_mpgf_public_goods_readiness_v2/);
  assert.match(concurrencyQa, /100-person\/\$500 readiness froze once without activation or money/);
  assert.doesNotMatch(concurrencyQa, /founding-v1|join_mpgf_public_goods_compact\(/);
  assert.match(generatedTypesQa, /mpgf_public_goods_funding_qualification_snapshots/);
  assert.match(generatedTypesQa, /get_mpgf_public_goods_compacts_v2_state/);
});
