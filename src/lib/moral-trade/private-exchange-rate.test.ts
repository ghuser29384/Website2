import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { GET as getPrivateExchangeRateContract } from "@/app/api/moral-trade/private-exchange-rate/contract/route";
import { POST as enforcePrivateExchangeRate } from "@/app/api/moral-trade/private-exchange-rate/enforce/route";
import {
  evaluateMoralTradePrivateExchangeRate,
  getMoralTradePrivateExchangeRateContract,
  validateMoralTradePrivateExchangeRateContract,
  type MoralTradePrivateExchangeRateQuoteRecord,
} from "@/lib/moral-trade/private-exchange-rate";

const HASH_A = "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const HASH_B = "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
const HASH_C = "sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc";

function quoteRecord(
  overrides: Partial<MoralTradePrivateExchangeRateQuoteRecord> = {},
): MoralTradePrivateExchangeRateQuoteRecord {
  return {
    recordId: "private-exchange-rate:test",
    subjectType: "matched_trade_lock_proposal",
    subjectId: "matched-trade-lock-proposal:test",
    participantIdHash: HASH_A,
    privateExchangeRateQuotePolicyRef: "policy-snapshot:private-exchange-rate",
    policyStatus: "resolved_immutable",
    quoteType: "clearing_ratio_bound",
    privateQuoteTermsHash: HASH_B,
    acceptableMinBps: 8_000,
    acceptableMaxBps: 12_500,
    settlementCurrency: null,
    disclosureScope: "counterparty_band_only",
    publicMoralPriceProhibited: true,
    publicCausePricePublished: false,
    globalExchangeRatePublished: false,
    publicEffectivenessComparisonPublished: false,
    moralValueInferencePublished: false,
    exactCounterpartyQuoteDisclosed: false,
    rawPrivateTermsPublic: false,
    quoteState: "locked",
    reviewerDecisionRef: "review-decision:private-exchange-rate",
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-06-12T00:00:00.000Z",
    ...overrides,
  };
}

test("private exchange-rate contract validates first-class quote records", () => {
  const contract = getMoralTradePrivateExchangeRateContract();
  const validation = validateMoralTradePrivateExchangeRateContract(contract);

  assert.equal(validation.status, "pass");
  assert.ok(
    contract.firstClassRecordTables.includes(
      "moral_trade_private_exchange_rate_quote_records",
    ),
  );
  assert.ok(contract.policySnapshotSubjects.includes("private_exchange_rate_quote"));
  assert.ok(contract.subjectTypes.includes("offset_offer"));
  assert.ok(contract.subjectTypes.includes("pledge_swap_offer"));
  assert.ok(contract.subjectTypes.includes("bargaining_round_record"));
  assert.ok(contract.quoteTypes.includes("clearing_ratio_bound"));
  assert.ok(contract.quoteTypes.includes("side_payment_bound"));
  assert.ok(contract.disclosureScopes.includes("counterparty_band_only"));
  assert.ok(contract.contractTests.includes("private_exchange_rate_quote_test"));
  assert.match(contract.publicNonPriceRule, /cause-price table/i);
  assert.match(contract.publicNonPriceRule, /willingness-to-trade/i);
  assert.match(contract.privacyBoundary, /compatibility bands/i);
});

test("reviewed private quote record can pass lock and public metric gates", () => {
  const evaluation = evaluateMoralTradePrivateExchangeRate({
    transition: "matched_trade_lock",
    privateExchangeRateRequired: true,
    requiredAffectedParticipantCount: 1,
    checkedAt: "2026-06-12T00:00:00.000Z",
    records: [quoteRecord()],
  });

  assert.equal(evaluation.status, "pass");
  assert.equal(evaluation.reviewedRecordCount, 1);
  assert.equal(evaluation.activeQuoteRecordCount, 1);
  assert.equal(evaluation.privacySafeRecordCount, 1);
  assert.equal(evaluation.affectedParticipantQuoteCount, 1);
  assert.equal(evaluation.publicPriceBlockerCount, 0);
  assert.deepEqual(evaluation.blockers, []);
});

test("missing affected participant private quote records fail closed", () => {
  const evaluation = evaluateMoralTradePrivateExchangeRate({
    transition: "clearing_run",
    privateExchangeRateRequired: true,
    requiredAffectedParticipantCount: 2,
    checkedAt: "2026-06-12T00:00:00.000Z",
    records: [quoteRecord()],
  });

  assert.equal(evaluation.status, "blocked");
  assert.equal(evaluation.affectedParticipantQuoteCount, 1);
  assert.ok(
    evaluation.blockers.includes(
      "private_exchange_rate_affected_participant_quote_coverage_missing",
    ),
  );
});

test("public cause prices, global rates, private caps, and moral-value inference block", () => {
  const evaluation = evaluateMoralTradePrivateExchangeRate({
    transition: "public_metric_publication",
    privateExchangeRateRequired: true,
    requiredAffectedParticipantCount: 1,
    checkedAt: "2026-06-12T00:00:00.000Z",
    records: [
      quoteRecord({
        publicMoralPriceProhibited: false,
        publicCausePricePublished: true,
        globalExchangeRatePublished: true,
        publicEffectivenessComparisonPublished: true,
        moralValueInferencePublished: true,
        exactCounterpartyQuoteDisclosed: true,
        rawPrivateTermsPublic: true,
      }),
    ],
  });

  assert.equal(evaluation.status, "blocked");
  assert.equal(evaluation.publicPriceBlockerCount, 1);
  assert.ok(
    evaluation.blockers.includes(
      "private_exchange_rate_public_moral_price_not_prohibited:private-exchange-rate:test",
    ),
  );
  assert.ok(
    evaluation.blockers.includes(
      "private_exchange_rate_public_cause_price_published:private-exchange-rate:test",
    ),
  );
  assert.ok(
    evaluation.blockers.includes(
      "private_exchange_rate_global_exchange_rate_published:private-exchange-rate:test",
    ),
  );
  assert.ok(
    evaluation.blockers.includes(
      "private_exchange_rate_moral_value_inference_published:private-exchange-rate:test",
    ),
  );
  assert.ok(
    evaluation.blockers.includes(
      "private_exchange_rate_exact_counterparty_quote_disclosed:private-exchange-rate:test",
    ),
  );
  assert.ok(
    evaluation.blockers.includes(
      "private_exchange_rate_raw_private_terms_public:private-exchange-rate:test",
    ),
  );
  assert.ok(
    evaluation.userFacingBlockerCategories.some((category) =>
      /cannot publish moral prices/i.test(category),
    ),
  );
});

test("mutable, inactive, stale, invalid, and side-payment records block", () => {
  const evaluation = evaluateMoralTradePrivateExchangeRate({
    transition: "payment_capture",
    privateExchangeRateRequired: true,
    requiredAffectedParticipantCount: 1,
    checkedAt: "2026-06-12T00:00:00.000Z",
    records: [
      quoteRecord({
        participantIdHash: "bad-hash",
        policyStatus: "mutable",
        quoteType: "side_payment_bound",
        privateQuoteTermsHash: "bad-hash",
        acceptableMinBps: 20_000,
        acceptableMaxBps: 10_000,
        settlementCurrency: null,
        quoteState: "draft",
        reviewerDecisionRef: null,
        updatedAt: "2025-01-01T00:00:00.000Z",
      }),
    ],
  });

  assert.equal(evaluation.status, "blocked");
  assert.ok(
    evaluation.blockers.includes(
      "private_exchange_rate_participant_hash_missing:private-exchange-rate:test",
    ),
  );
  assert.ok(
    evaluation.blockers.includes(
      "private_exchange_rate_policy_not_immutable:private-exchange-rate:test:mutable",
    ),
  );
  assert.ok(
    evaluation.blockers.includes(
      "private_exchange_rate_quote_terms_hash_missing:private-exchange-rate:test",
    ),
  );
  assert.ok(
    evaluation.blockers.includes(
      "private_exchange_rate_bounds_invalid:private-exchange-rate:test",
    ),
  );
  assert.ok(
    evaluation.blockers.includes(
      "private_exchange_rate_settlement_currency_missing:private-exchange-rate:test",
    ),
  );
  assert.ok(
    evaluation.blockers.includes(
      "private_exchange_rate_quote_state_not_active:private-exchange-rate:test:draft",
    ),
  );
  assert.ok(
    evaluation.blockers.includes(
      "private_exchange_rate_quote_record_stale:private-exchange-rate:test",
    ),
  );
  assert.ok(evaluation.blockers.includes("active_private_exchange_rate_quote_record_missing"));
});

test("private exchange-rate route exposes public contract metadata", async () => {
  const response = await getPrivateExchangeRateContract(
    new Request("http://localhost/api/moral-trade/private-exchange-rate/contract"),
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.ok, true);
  assert.equal(body.validation.status, "pass");
  assert.ok(
    body.publicContract.firstClassRecordTables.includes(
      "moral_trade_private_exchange_rate_quote_records",
    ),
  );
  assert.ok(body.publicContract.quoteTypes.includes("clearing_ratio_bound"));
  assert.match(body.publicContract.publicNonPriceRule, /cause-price table/i);
  assert.match(body.publicContract.privacyBoundary, /raw private quote terms/i);
});

test("private exchange-rate enforcement rejects invalid JSON without state mutation", async () => {
  const response = await enforcePrivateExchangeRate(
    new Request("http://localhost/api/moral-trade/private-exchange-rate/enforce", {
      method: "POST",
      body: "{",
    }),
  );
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(response.headers.get("Cache-Control"), "private, no-store");
  assert.equal(body.ok, false);
  assert.equal(body.privateExchangeRateGateStatus, "blocked");
  assert.equal(body.draftPreviewAllowed, false);
  assert.equal(body.matchCandidateGenerationAllowed, false);
  assert.equal(body.matchedTradeLockAllowed, false);
  assert.equal(body.clearingRunAllowed, false);
  assert.equal(body.paymentCaptureAllowed, false);
  assert.equal(body.relianceAllowed, false);
  assert.equal(body.publicMetricPublicationAllowed, false);
  assert.equal(body.releaseGatePromotionAllowed, false);
  assert.equal(body.stateMutation, false);
  assert.deepEqual(body.blockers, ["invalid_json_body"]);
  assert.deepEqual(body.persistence, {
    requested: true,
    status: "not_recorded",
    recordId: null,
    table: "moral_trade_private_exchange_rate_enforcement_records",
  });
  assert.equal(body.contractValidation.status, "pass");
});

test("private exchange-rate contract is wired through route, health, spec, API profile, preview, and schema", () => {
  const route = readFileSync(
    "src/app/api/moral-trade/private-exchange-rate/contract/route.ts",
    "utf8",
  );
  const enforceRoute = readFileSync(
    "src/app/api/moral-trade/private-exchange-rate/enforce/route.ts",
    "utf8",
  );
  const health = readFileSync("src/app/api/moral-trade/health/route.ts", "utf8");
  const spec = readFileSync("src/app/moral-trade/technical-spec/page.tsx", "utf8");
  const apiProfile = readFileSync("config/moral-trade/api-contract-profile.json", "utf8");
  const apiContract = readFileSync("src/lib/moral-trade/api-contract.ts", "utf8");
  const apiRateLimit = readFileSync("src/lib/moral-trade/api-rate-limit.ts", "utf8");
  const operations = readFileSync("src/lib/moral-trade/operations.ts", "utf8");
  const operationsProfile = readFileSync("config/moral-trade/operations-profile.json", "utf8");
  const clearingPreview = readFileSync("src/lib/moral-trade/clearing-previews.ts", "utf8");
  const releaseGates = readFileSync("src/lib/moral-trade/release-gates.ts", "utf8");
  const migration = readFileSync(
    "supabase/migrations/20260612_moral_trade_private_exchange_rate_quote_records.sql",
    "utf8",
  );
  const enforcementMigration = readFileSync(
    "supabase/migrations/20260613_moral_trade_private_exchange_rate_enforcement_records.sql",
    "utf8",
  );
  const schema = readFileSync("supabase/schema.sql", "utf8");
  const databaseTypes = readFileSync("src/lib/supabase/database.types.ts", "utf8");

  assert.match(route, /getMoralTradePrivateExchangeRateContract/);
  assert.match(enforceRoute, /private_exchange_rate_enforce/);
  assert.match(enforceRoute, /moral_trade_private_exchange_rate_enforcement_records/);
  assert.match(enforceRoute, /draftPreviewAllowed: false/);
  assert.match(enforceRoute, /supabase_unconfigured:private_exchange_rate_enforce/);
  assert.match(enforceRoute, /authentication_required:private_exchange_rate_enforce/);
  assert.match(health, /privateExchangeRateValidation/);
  assert.match(spec, /\/api\/moral-trade\/private-exchange-rate\/contract/);
  assert.match(apiProfile, /private_exchange_rate_contract_response/);
  assert.match(apiProfile, /private_exchange_rate_enforce_request/);
  assert.match(apiProfile, /private_exchange_rate_enforce_response/);
  assert.match(apiProfile, /moral_trade_private_exchange_rate_contract/);
  assert.match(apiProfile, /moral_trade_private_exchange_rate_enforce/);
  assert.match(apiContract, /moral_trade_private_exchange_rate_enforce/);
  assert.match(apiRateLimit, /private_exchange_rate_enforce/);
  assert.match(operations, /private_exchange_rate_enforce/);
  assert.match(operationsProfile, /private_exchange_rate_enforce/);
  assert.match(clearingPreview, /privateExchangeRateStatus/);
  assert.match(releaseGates, /private_exchange_rate_quote_test/);
  assert.match(migration, /moral_trade_private_exchange_rate_quote_records/);
  assert.match(migration, /private_exchange_rate_quote/);
  assert.match(enforcementMigration, /moral_trade_private_exchange_rate_enforcement_records/);
  assert.match(enforcementMigration, /owner_profile_id = auth\.uid\(\)/);
  assert.match(enforcementMigration, /clearing_run_allowed_bool = false/);
  assert.match(enforcementMigration, /public_metric_publication_allowed_bool = false/);
  assert.match(enforcementMigration, /reliance_allowed_bool = false/);
  assert.match(schema, /moral_trade_private_exchange_rate_quote_records/);
  assert.match(schema, /moral_trade_private_exchange_rate_enforcement_records/);
  assert.match(schema, /private_exchange_rate_quote/);
  assert.match(databaseTypes, /moral_trade_private_exchange_rate_quote_records/);
  assert.match(databaseTypes, /moral_trade_private_exchange_rate_enforcement_records/);
  assert.match(databaseTypes, /private_exchange_rate_quote/);
});
