import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import { POST as enforceDonorTax } from "@/app/api/moral-trade/donor-of-record-tax/enforce/route";

import {
  evaluateMoralTradeDonorOfRecordTax,
  getMoralTradeDonorOfRecordTaxContract,
  validateMoralTradeDonorOfRecordTaxContract,
  type MoralTradeDonorOfRecordTaxEvaluationInput,
} from "./donor-of-record-tax";

const CHECKED_AT = "2026-06-13T12:00:00.000Z";

function readRepoFile(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

function hashFor(seed: string) {
  return `sha256:${createHash("sha256").update(seed).digest("hex")}`;
}

function passingInput(
  overrides: Partial<MoralTradeDonorOfRecordTaxEvaluationInput> = {},
): MoralTradeDonorOfRecordTaxEvaluationInput {
  return {
    checkedAt: CHECKED_AT,
    donorOfRecordTaxRequired: true,
    records: [
      {
        charitableSolicitationReviewState: "passed",
        commercialCoVentureReviewState: "not_required_for_stage",
        createdAt: CHECKED_AT,
        donorAdvisedFundCreditState: "not_expected",
        donorOfRecordHash: hashFor("donor-of-record"),
        donorOfRecordPolicyRef: "policy:donor-of-record:v1",
        donorOfRecordType: "participant",
        doubleClaimReviewState: "passed",
        employerMatchCreditState: "not_expected",
        expiresAt: "2026-12-13T12:00:00.000Z",
        jurisdictionReviewState: "passed",
        receiptBeneficiaryHash: hashFor("receipt-beneficiary"),
        receiptSilentlyReassigned: false,
        recordId: "donor-of-record-tax:test",
        recordState: "receipt_ready",
        reviewerDecisionRef: "review:donor-tax",
        subjectRef: "donation-offset:test",
        subjectType: "donation_offset",
        supersededBy: null,
        taxBenefitClaimState: "not_claimed",
        taxBenefitCountedAsMoralImpact: false,
        taxDeductibilityImpliedWithoutPolicy: false,
        taxReceiptBehavior: "receipt_to_payer",
        taxReceiptPolicyRef: "policy:tax-receipt:v1",
        updatedAt: CHECKED_AT,
      },
    ],
    transition: "receipt_issuance",
    ...overrides,
  };
}

test("donor-of-record tax contract validates receipt and impact separation", () => {
  const contract = getMoralTradeDonorOfRecordTaxContract();
  const validation = validateMoralTradeDonorOfRecordTaxContract(contract);

  assert.equal(validation.status, "pass");
  assert.deepEqual(validation.blockers, []);
  assert.ok(contract.firstClassRecordTables.includes("moral_trade_donor_of_record_tax_reviews"));
  assert.ok(
    contract.firstClassRecordTables.includes(
      "moral_trade_donor_of_record_tax_enforcement_records",
    ),
  );
  assert.ok(contract.policySnapshotSubjects.includes("donor_of_record"));
  assert.ok(contract.policySnapshotSubjects.includes("tax_receipt"));
  assert.ok(contract.releaseGateTestHooks.includes("donor_of_record_tax_receipt_test"));
  assert.match(contract.receiptRule, /cannot be inferred from payment source/i);
  assert.match(contract.noTaxClaimRule, /must not imply tax deductibility/i);
  assert.match(contract.impactSeparationRule, /not moral-trade volume or impact/i);
  assert.ok(contract.sampleEvaluations.some((sample) => sample.status === "pass"));
  assert.ok(contract.sampleEvaluations.some((sample) => sample.status === "blocked"));
});

test("explicit donor and receipt-safe record passes receipt issuance", () => {
  const result = evaluateMoralTradeDonorOfRecordTax(passingInput());

  assert.equal(result.status, "pass");
  assert.equal(result.recordCount, 1);
  assert.equal(result.nonBlockingRecordCount, 1);
  assert.equal(result.explicitDonorRecordCount, 1);
  assert.equal(result.receiptSafeRecordCount, 1);
  assert.deepEqual(result.blockers, []);
});

test("unsupported tax benefit and double-claim states block public metrics", () => {
  const result = evaluateMoralTradeDonorOfRecordTax(
    passingInput({
      records: [
        {
          ...passingInput().records[0],
          commercialCoVentureReviewState: "under_review",
          donorAdvisedFundCreditState: "double_claimed",
          donorOfRecordType: "unknown",
          doubleClaimReviewState: "blocked",
          employerMatchCreditState: "under_review",
          receiptSilentlyReassigned: true,
          recordState: "previewed",
          taxBenefitClaimState: "supported_by_policy",
          taxBenefitCountedAsMoralImpact: true,
          taxDeductibilityImpliedWithoutPolicy: true,
          taxReceiptBehavior: "manual_review",
        },
      ],
      transition: "public_metric_publication",
    }),
  );

  assert.equal(result.status, "blocked");
  assert.ok(
    result.blockers.includes(
      "donor_of_record_type_not_explicit:donor-of-record-tax:test:unknown",
    ),
  );
  assert.ok(
    result.blockers.includes(
      "tax_receipt_behavior_not_final:donor-of-record-tax:test:manual_review",
    ),
  );
  assert.ok(
    result.blockers.includes(
      "donor_tax_double_claim_review_not_non_blocking:donor-of-record-tax:test:blocked",
    ),
  );
  assert.ok(
    result.blockers.includes(
      "donor_tax_donor_advised_fund_credit_not_supported:donor-of-record-tax:test:double_claimed",
    ),
  );
  assert.ok(result.blockers.includes("receipt_silently_reassigned:donor-of-record-tax:test"));
  assert.ok(
    result.blockers.includes(
      "tax_deductibility_implied_without_policy:donor-of-record-tax:test",
    ),
  );
  assert.ok(
    result.blockers.includes("tax_benefit_counted_as_moral_impact:donor-of-record-tax:test"),
  );
});

test("donor-of-record tax enforcement route fails closed on invalid JSON", async () => {
  const response = await enforceDonorTax(
    new Request("http://localhost/api/moral-trade/donor-of-record-tax/enforce", {
      body: "{",
      headers: { "content-type": "application/json" },
      method: "POST",
    }),
  );
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(body.ok, false);
  assert.equal(body.donorOfRecordTaxGateStatus, "blocked");
  assert.equal(body.matchedTradeLockAllowed, false);
  assert.equal(body.paymentAuthorizationAllowed, false);
  assert.equal(body.paymentCaptureAllowed, false);
  assert.equal(body.receiptIssuanceAllowed, false);
  assert.equal(body.publicMetricPublicationAllowed, false);
  assert.equal(body.releaseGatePromotionAllowed, false);
  assert.equal(body.stateMutation, false);
  assert.deepEqual(body.blockers, ["invalid_json_body"]);
});

test("donor-of-record tax wiring covers API profile, rate limits, database tables, and schema", () => {
  const apiContractSource = readRepoFile("src/lib/moral-trade/api-contract.ts");
  const apiProfile = readRepoFile("config/moral-trade/api-contract-profile.json");
  const rateLimitSource = readRepoFile("src/lib/moral-trade/api-rate-limit.ts");
  const operationsSource = readRepoFile("src/lib/moral-trade/operations.ts");
  const operationsProfile = readRepoFile("config/moral-trade/operations-profile.json");
  const databaseTypes = readRepoFile("src/lib/supabase/database.types.ts");
  const migration = readRepoFile(
    "supabase/migrations/20260613_moral_trade_donor_of_record_tax_enforcement_records.sql",
  );
  const schema = readRepoFile("supabase/schema.sql");
  const releaseGates = readRepoFile("src/lib/moral-trade/release-gates.ts");

  assert.match(apiContractSource, /moral_trade_donor_of_record_tax_contract/);
  assert.match(apiContractSource, /moral_trade_donor_of_record_tax_enforce/);
  assert.match(apiProfile, /donor_of_record_tax_contract_response/);
  assert.match(apiProfile, /donor_of_record_tax_enforce_request/);
  assert.match(apiProfile, /donor_of_record_tax_enforce_response/);
  assert.match(apiProfile, /donor_of_record_tax_enforce_route_contract/);
  assert.match(rateLimitSource, /donor_of_record_tax_enforce/);
  assert.match(operationsSource, /donor_of_record_tax_enforce/);
  assert.match(operationsProfile, /"key": "donor_of_record_tax_enforce"/);
  assert.match(databaseTypes, /moral_trade_donor_of_record_tax_reviews/);
  assert.match(databaseTypes, /moral_trade_donor_of_record_tax_enforcement_records/);
  assert.match(migration, /create table if not exists public\.moral_trade_donor_of_record_tax_enforcement_records/);
  assert.match(migration, /check \(payment_capture_allowed_bool = false\)/);
  assert.match(migration, /check \(receipt_issuance_allowed_bool = false\)/);
  assert.match(schema, /moral_trade_donor_of_record_tax_reviews/);
  assert.match(schema, /moral_trade_donor_of_record_tax_enforcement_records/);
  assert.match(releaseGates, /donor_of_record_tax_receipt_test/);
});
