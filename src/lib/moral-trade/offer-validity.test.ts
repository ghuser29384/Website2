import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { GET as getOfferValidityContract } from "@/app/api/moral-trade/offer-validity/contract/route";
import { POST as enforceOfferValidity } from "@/app/api/moral-trade/offer-validity/enforce/route";
import {
  evaluateMoralTradeOfferValidity,
  getMoralTradeOfferValidityContract,
  validateMoralTradeOfferValidityContract,
  type MoralTradeOfferValidityRecord,
} from "@/lib/moral-trade/offer-validity";

const HASH_A = "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const HASH_B = "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";

function validityRecord(
  overrides: Partial<MoralTradeOfferValidityRecord> = {},
): MoralTradeOfferValidityRecord {
  return {
    recordId: "offer-validity:test",
    subjectType: "offset_offer",
    subjectId: "offset-offer:test",
    offerValidityPolicyRef: "policy-snapshot:offer-validity",
    policyStatus: "resolved_immutable",
    baselineSnapshotHash: HASH_A,
    termsSnapshotHash: HASH_B,
    empiricalAssumptionSnapshotRefs: ["empirical-assumption-snapshot:test"],
    evidenceStandardRefs: ["evidence-standard:baseline", "evidence-standard:payment"],
    jurisdictionPolicyVersion: "jurisdiction-policy:us-v1",
    recipientOrDestinationRefs: ["recipient:test", "payment-destination:test"],
    validFrom: "2026-06-01T00:00:00.000Z",
    offerExpiresAt: "2026-06-30T00:00:00.000Z",
    staleAt: "2026-06-25T00:00:00.000Z",
    renewalConfirmationRecordRefs: [],
    staleReasonCodes: [],
    validityState: "valid",
    reviewerDecisionRef: "review-decision:offer-validity",
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-06-12T00:00:00.000Z",
    ...overrides,
  };
}

test("offer-validity contract validates first-class freshness records", () => {
  const contract = getMoralTradeOfferValidityContract();
  const validation = validateMoralTradeOfferValidityContract(contract);

  assert.equal(validation.status, "pass");
  assert.ok(contract.firstClassRecordTables.includes("moral_trade_offer_validity_records"));
  assert.ok(contract.policySnapshotSubjects.includes("offer_validity"));
  assert.ok(contract.subjectTypes.includes("offset_offer"));
  assert.ok(contract.subjectTypes.includes("pledge_swap_offer"));
  assert.ok(contract.subjectTypes.includes("matched_trade_lock_proposal"));
  assert.ok(contract.validityStates.includes("renewed"));
  assert.ok(contract.staleReasonCodes.includes("counterparty_bucket_stale"));
  assert.ok(contract.contractTests.includes("offer_validity_record_test"));
  assert.match(contract.validityWindowRule, /renewed preview/i);
  assert.match(contract.failClosedRule, /baseline, terms, empirical-assumption/i);
});

test("reviewed active offer-validity record can pass match and lock gates", () => {
  const evaluation = evaluateMoralTradeOfferValidity({
    transition: "matched_trade_lock",
    validityRequired: true,
    checkedAt: "2026-06-12T00:00:00.000Z",
    records: [validityRecord()],
  });

  assert.equal(evaluation.status, "pass");
  assert.equal(evaluation.reviewedRecordCount, 1);
  assert.equal(evaluation.activeValidityRecordCount, 1);
  assert.equal(evaluation.staleOrExpiredRecordCount, 0);
  assert.deepEqual(evaluation.blockers, []);
});

test("missing offer-validity record fails closed when required", () => {
  const evaluation = evaluateMoralTradeOfferValidity({
    transition: "match_candidate_generation",
    validityRequired: true,
    checkedAt: "2026-06-12T00:00:00.000Z",
    records: [],
  });

  assert.equal(evaluation.status, "blocked");
  assert.ok(evaluation.blockers.includes("offer_validity_record_missing"));
});

test("stale, expired, unrenewed, mutable, and incomplete validity records block", () => {
  const evaluation = evaluateMoralTradeOfferValidity({
    transition: "payment_capture",
    validityRequired: true,
    checkedAt: "2026-06-12T00:00:00.000Z",
    records: [
      validityRecord({
        policyStatus: "mutable",
        baselineSnapshotHash: "bad-hash",
        termsSnapshotHash: "bad-hash",
        empiricalAssumptionSnapshotRefs: [],
        evidenceStandardRefs: [],
        jurisdictionPolicyVersion: "",
        recipientOrDestinationRefs: [],
        offerExpiresAt: "2026-06-05T00:00:00.000Z",
        staleAt: "2026-06-04T00:00:00.000Z",
        staleReasonCodes: [
          "baseline_snapshot_stale",
          "payment_method_stale",
          "renewal_confirmation_missing",
        ],
        validityState: "expired",
        reviewerDecisionRef: null,
      }),
    ],
  });

  assert.equal(evaluation.status, "blocked");
  assert.ok(evaluation.blockers.includes("offer_validity_policy_not_immutable:offer-validity:test:mutable"));
  assert.ok(evaluation.blockers.includes("offer_validity_baseline_snapshot_hash_missing:offer-validity:test"));
  assert.ok(evaluation.blockers.includes("offer_validity_terms_snapshot_hash_missing:offer-validity:test"));
  assert.ok(evaluation.blockers.includes("offer_validity_empirical_assumption_refs_missing:offer-validity:test"));
  assert.ok(evaluation.blockers.includes("offer_validity_evidence_standard_refs_missing:offer-validity:test"));
  assert.ok(evaluation.blockers.includes("offer_validity_jurisdiction_policy_missing:offer-validity:test"));
  assert.ok(evaluation.blockers.includes("offer_validity_recipient_or_destination_refs_missing:offer-validity:test"));
  assert.ok(evaluation.blockers.includes("offer_validity_expired:offer-validity:test"));
  assert.ok(evaluation.blockers.includes("offer_validity_stale:offer-validity:test"));
  assert.ok(evaluation.blockers.includes("offer_validity_state_expired:offer-validity:test"));
  assert.ok(evaluation.blockers.includes("offer_validity_renewal_confirmation_missing:offer-validity:test"));
  assert.ok(evaluation.blockers.includes("active_offer_validity_record_missing"));
});

test("renewed offer-validity record requires renewal confirmation refs", () => {
  const missing = evaluateMoralTradeOfferValidity({
    transition: "matched_trade_lock",
    validityRequired: true,
    checkedAt: "2026-06-12T00:00:00.000Z",
    records: [
      validityRecord({
        validityState: "renewed",
      }),
    ],
  });
  const renewed = evaluateMoralTradeOfferValidity({
    transition: "matched_trade_lock",
    validityRequired: true,
    checkedAt: "2026-06-12T00:00:00.000Z",
    records: [
      validityRecord({
        validityState: "renewed",
        renewalConfirmationRecordRefs: ["participant-confirmation:renewed-offer"],
      }),
    ],
  });

  assert.equal(missing.status, "blocked");
  assert.ok(missing.blockers.includes("offer_validity_renewal_confirmation_missing:offer-validity:test"));
  assert.equal(renewed.status, "pass");
});

test("offer-validity route exposes public contract metadata", async () => {
  const response = await getOfferValidityContract(
    new Request("http://localhost/api/moral-trade/offer-validity/contract"),
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.ok, true);
  assert.equal(body.validation.status, "pass");
  assert.ok(body.publicContract.firstClassRecordTables.includes("moral_trade_offer_validity_records"));
  assert.ok(body.publicContract.staleReasonCodes.includes("counterparty_bucket_stale"));
  assert.match(body.publicContract.validityWindowRule, /renewed participant confirmation/i);
});

test("offer-validity enforcement rejects invalid JSON without state mutation", async () => {
  const response = await enforceOfferValidity(
    new Request("http://localhost/api/moral-trade/offer-validity/enforce", {
      method: "POST",
      body: "{",
    }),
  );
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(response.headers.get("Cache-Control"), "private, no-store");
  assert.equal(body.ok, false);
  assert.equal(body.offerValidityGateStatus, "blocked");
  assert.equal(body.draftPreviewAllowed, false);
  assert.equal(body.liveOfferPublicationAllowed, false);
  assert.equal(body.matchCandidateGenerationAllowed, false);
  assert.equal(body.matchedTradeLockAllowed, false);
  assert.equal(body.paymentCaptureAllowed, false);
  assert.equal(body.relianceAllowed, false);
  assert.equal(body.publicCompletionCountAllowed, false);
  assert.equal(body.releaseGatePromotionAllowed, false);
  assert.equal(body.stateMutation, false);
  assert.deepEqual(body.blockers, ["invalid_json_body"]);
  assert.deepEqual(body.persistence, {
    requested: true,
    status: "not_recorded",
    recordId: null,
    table: "moral_trade_offer_validity_enforcement_records",
  });
  assert.equal(body.contractValidation.status, "pass");
});

test("offer-validity contract is wired through route, health, spec, API profile, preview, and schema", () => {
  const route = readFileSync(
    "src/app/api/moral-trade/offer-validity/contract/route.ts",
    "utf8",
  );
  const enforceRoute = readFileSync(
    "src/app/api/moral-trade/offer-validity/enforce/route.ts",
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
  const migration = readFileSync(
    "supabase/migrations/20260612_moral_trade_offer_validity_records.sql",
    "utf8",
  );
  const enforcementMigration = readFileSync(
    "supabase/migrations/20260613_moral_trade_offer_validity_enforcement_records.sql",
    "utf8",
  );
  const schema = readFileSync("supabase/schema.sql", "utf8");
  const databaseTypes = readFileSync("src/lib/supabase/database.types.ts", "utf8");

  assert.match(route, /getMoralTradeOfferValidityContract/);
  assert.match(enforceRoute, /offer_validity_enforce/);
  assert.match(enforceRoute, /moral_trade_offer_validity_enforcement_records/);
  assert.match(enforceRoute, /draftPreviewAllowed: false/);
  assert.match(enforceRoute, /supabase_unconfigured:offer_validity_enforce/);
  assert.match(enforceRoute, /authentication_required:offer_validity_enforce/);
  assert.match(health, /offerValidityValidation/);
  assert.match(spec, /\/api\/moral-trade\/offer-validity\/contract/);
  assert.match(apiProfile, /offer_validity_contract_response/);
  assert.match(apiProfile, /offer_validity_enforce_request/);
  assert.match(apiProfile, /offer_validity_enforce_response/);
  assert.match(apiProfile, /moral_trade_offer_validity_contract/);
  assert.match(apiProfile, /moral_trade_offer_validity_enforce/);
  assert.match(apiContract, /moral_trade_offer_validity_enforce/);
  assert.match(apiRateLimit, /offer_validity_enforce/);
  assert.match(operations, /offer_validity_enforce/);
  assert.match(operationsProfile, /offer_validity_enforce/);
  assert.match(clearingPreview, /offerValidityStatus/);
  assert.match(migration, /moral_trade_offer_validity_records/);
  assert.match(migration, /offer_validity/);
  assert.match(enforcementMigration, /moral_trade_offer_validity_enforcement_records/);
  assert.match(enforcementMigration, /owner_profile_id = auth\.uid\(\)/);
  assert.match(enforcementMigration, /live_offer_publication_allowed_bool = false/);
  assert.match(enforcementMigration, /payment_capture_allowed_bool = false/);
  assert.match(enforcementMigration, /reliance_allowed_bool = false/);
  assert.match(schema, /moral_trade_offer_validity_records/);
  assert.match(schema, /moral_trade_offer_validity_enforcement_records/);
  assert.match(schema, /offer_validity/);
  assert.match(databaseTypes, /moral_trade_offer_validity_records/);
  assert.match(databaseTypes, /moral_trade_offer_validity_enforcement_records/);
  assert.match(databaseTypes, /offer_validity/);
});
