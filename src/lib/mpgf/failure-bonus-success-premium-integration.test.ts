import { existsSync, readFileSync } from "node:fs";
import assert from "node:assert/strict";
import test from "node:test";

const pricingPath = "src/lib/mpgf/failure-bonus-success-premium.ts";
const consolePath = "src/components/mpgf/mpgf-console.tsx";
const persistencePath = "src/lib/mpgf/persistence.ts";
const actionPath = "src/app/mpgf/actions.ts";
const settlementPath = "src/lib/mpgf/public-goods-refund-bonus-non-mvp.ts";
const migrationPath =
  "supabase/migrations/20260726140000_mpgf_failure_bonus_success_premium_reserve.sql";
const databaseTestPath = "supabase/tests/mpgf_failure_bonus_success_premium_reserve.sql";
const docsPath = "docs/failure-bonus-success-premium.md";

test("proposal UI computes and discloses the complete cumulative premium schedule outside recipient thresholds", () => {
  const source = readFileSync(consolePath, "utf8");

  assert.match(source, /buildFailureBonusThresholdEditorQuote/);
  assert.match(source, /FAILURE_BONUS_THRESHOLD_EDITOR_MAX_THRESHOLDS/);
  assert.match(source, /Price one to ten cumulative thresholds/);
  assert.match(source, /One promise across the pool/);
  assert.match(source, /Each incremental funding tranche is priced once/);
  assert.match(source, /participant and per-person caps apply once across the whole pool/i);
  assert.match(source, /common Failure Bonus Reserve/i);
  assert.match(source, /It is not deducted from the recipient threshold/);
  assert.match(source, /Future success premiums never count as collateral/);
  assert.match(source, /operator approves the complete schedule atomically/i);
  assert.match(source, /pool_creator_or_sponsor/);
  assert.doesNotMatch(source, /contributors_pro_rata/);
  assert.match(source, /publicGoodsThresholdSchedule:/);
  assert.match(source, /publicGoodsFailureBonusEligibilityPolicy:/);
  assert.match(source, /publicGoodsSuccessPremiumIncludedInNetThreshold:[\s\S]*false as const/);
});

test("server persistence re-quotes the full schedule and rejects client-side premium or policy tampering", () => {
  const persistence = readFileSync(persistencePath, "utf8");
  const action = readFileSync(actionPath, "utf8");

  assert.match(persistence, /validateSubmittedFailureBonusSchedule/);
  assert.match(persistence, /requires a complete threshold schedule and eligibility policy/);
  assert.match(persistence, /Submitted failure-bonus caps do not match the immutable eligibility policy/);
  assert.match(persistence, /legacy threshold field must mirror threshold 1 of the cumulative schedule/);
  assert.match(persistence, /submitted threshold-1 premium rate does not match server pricing/);
  assert.match(persistence, /submitted threshold-1 premium amount does not match server pricing/);
  assert.match(persistence, /threshold-1 gross requirement does not match server pricing/);
  assert.match(persistence, /requires the pool creator or a named sponsor to pay the premium/);
  assert.match(persistence, /Success premiums must remain outside net recipient thresholds/);
  assert.match(persistence, /Pool creators cannot mark a success-premium schedule final or approved/);
  assert.match(persistence, /public_goods_threshold_schedule_json/);
  assert.match(persistence, /public_goods_failure_bonus_eligibility_json/);
  assert.match(persistence, /public_goods_failure_bonus_schedule_status/);
  assert.match(action, /publicGoodsThresholdSchedule/);
  assert.match(action, /publicGoodsFailureBonusEligibilityPolicy/);
  assert.match(action, /publicGoodsSuccessPremiumIncludedInNetThreshold\?: false/);
});

test("simulation settlement emits separate reserve credit, debit, and exposure-release events", () => {
  const source = readFileSync(settlementPath, "utf8");

  assert.match(source, /success_premium_credit/);
  assert.match(source, /failure_bonus_debit/);
  assert.match(source, /reserve_expense_debit/);
  assert.match(source, /bonus_exposure_release/);
  assert.match(source, /success_premium_funding_not_confirmed/);
  assert.match(source, /success_premium_must_be_outside_net_threshold/);
  assert.match(source, /cashDeltaCents/);
  assert.match(source, /exposureDeltaCents/);
  assert.match(source, /reserveLedgerEntries/);
});

test("database migration creates a simulation-safe common reserve and fail-closed ledger", () => {
  assert.equal(existsSync(migrationPath), true);
  assert.equal(existsSync(databaseTestPath), true);
  const migration = readFileSync(migrationPath, "utf8");
  const databaseTest = readFileSync(databaseTestPath, "utf8");

  assert.match(migration, /moral-trade-common-failure-bonus-usd/);
  assert.match(migration, /'simulation_only'/);
  assert.match(migration, /premium_included_in_net_recipient_threshold = false/);
  assert.match(migration, /mpgf_failure_bonus_premium_quotes/);
  assert.match(migration, /mpgf_failure_bonus_reserve_entries/);
  assert.match(migration, /mpgf_failure_bonus_provisional_pricing_valid/);
  assert.match(migration, /pg_catalog\.encode\(\s*extensions\.digest\(/);
  assert.match(migration, /Approved failure-bonus premium quotes are immutable/);
  assert.match(migration, /Success-premium credits must exactly match a final approved quote/);
  assert.match(migration, /Failure-bonus reserve cannot allocate more exposure than posted cash backing/);
  assert.match(migration, /Paused reserves cannot accept new bonus exposure/);
  assert.match(migration, /cannot release or debit another pool threshold/);
  assert.match(migration, /Posted failure-bonus reserve entries are immutable/);
  assert.match(migration, /partner_or_provider_held_not_platform_custody/);
  assert.match(migration, /grant all on public\.mpgf_failure_bonus_reserve_entries to service_role/);
  assert.equal(
    /grant\s+(?:insert|update|delete|all)[^;]*mpgf_failure_bonus_reserve_entries\s+to\s+(?:anon|authenticated)/i.test(
      migration,
    ),
    false,
  );

  assert.match(databaseTest, /Contributor-funded success premiums were accepted by the v0.1 proposal policy/);
  assert.match(databaseTest, /Reserve overbooking was not blocked/);
  assert.match(databaseTest, /Posted reserve entry was mutable/);
  assert.match(databaseTest, /success_premiums_credited_cents/);
});

test("implementation documentation records formula, tranche pricing, and live-money boundaries", () => {
  assert.equal(existsSync(pricingPath), true);
  assert.equal(existsSync(docsPath), true);
  const docs = readFileSync(docsPath, "utf8");

  assert.match(docs, /2\.01%/);
  assert.match(docs, /incremental tranche/);
  assert.match(docs, /not included in and is not deducted from the net recipient threshold/);
  assert.match(docs, /Future expected premiums are never treated as present collateral/);
  assert.match(docs, /does not enable production custody, charging, refunds, payouts, or reserve posting/);
});
