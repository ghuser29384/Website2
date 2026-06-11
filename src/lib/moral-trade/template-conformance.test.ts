import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import {
  evaluateMoralTradeTemplateConformance,
  getMoralTradeTemplateConformanceContract,
  validateMoralTradeTemplateConformanceContract,
  type MoralTradeApprovedTradeTemplateRecord,
  type MoralTradeTemplateInstanceRecord,
} from "./template-conformance";

function readRepoFile(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

function hashFor(seed: string) {
  return `sha256:${createHash("sha256").update(seed).digest("hex")}`;
}

function templateRecord(
  overrides: Partial<MoralTradeApprovedTradeTemplateRecord> = {},
): MoralTradeApprovedTradeTemplateRecord {
  return {
    templateId: "template:tier-1-donation-offset",
    templateSlug: "tier-1-money-only-donation-offset",
    templateVersion: "2026-06-template-v1",
    tradeType: "donation_offset",
    templateState: "active",
    parameterPolicyHash: hashFor("template-parameter-policy"),
    parameterPolicyStatus: "resolved_immutable",
    allowedRecipientDestinationClasses: ["verified_charity", "fiscal_host"],
    eligibleCauseBucketRefs: ["cause-bucket:animal-welfare"],
    allowedEvidenceClaimTypes: ["payment_proof", "baseline_attestation"],
    challengeWindowPolicyRef: "challenge-window:standard-14-day",
    cancellationRuleRef: "cancellation:pre-lock-only",
    requiredControlPackRef: "risk-control-pack:tier-1-donation-offset",
    prohibitedParameterCodes: [
      "new_obligation",
      "new_evidence_standard",
      "new_side_payment",
      "new_counterparty",
    ],
    offTemplateBehavior: "manual_review",
    reviewedAt: "2026-06-11T12:00:00.000Z",
    expiresAt: "2026-10-11T12:00:00.000Z",
    supersededBy: null,
    ...overrides,
  };
}

function instanceRecord(
  overrides: Partial<MoralTradeTemplateInstanceRecord> = {},
): MoralTradeTemplateInstanceRecord {
  return {
    instanceId: "template-instance:demo",
    approvedTemplateRef: "template:tier-1-donation-offset",
    subjectType: "offset_offer",
    subjectRef: "offset-offer:demo",
    submittedParameterHash: hashFor("submitted-parameters"),
    normalizedParameterHash: hashFor("normalized-parameters"),
    templateParameterPolicyRef: "template-parameter-policy:tier-1-donation-offset",
    conformanceState: "conforms",
    offTemplateReasonCodes: [],
    freeTextCreatesNewObligations: false,
    freeTextCreatesNewEvidenceStandards: false,
    freeTextCreatesSidePayments: false,
    freeTextCreatesNewCounterparties: false,
    neutralReviewerApproved: false,
    renewedParticipantConfirmationRef: null,
    reviewedAt: "2026-06-11T12:00:00.000Z",
    expiresAt: "2026-10-11T12:00:00.000Z",
    supersededBy: null,
    ...overrides,
  };
}

test("template-conformance contract validates first-class approved-template governance", () => {
  const contract = getMoralTradeTemplateConformanceContract();
  const validation = validateMoralTradeTemplateConformanceContract(contract);

  assert.equal(validation.status, "pass");
  assert.deepEqual(validation.blockers, []);
  assert.ok(contract.firstClassRecordTables.includes("moral_trade_approved_trade_templates"));
  assert.ok(contract.firstClassRecordTables.includes("moral_trade_template_parameter_policies"));
  assert.ok(contract.firstClassRecordTables.includes("moral_trade_template_instance_records"));
  assert.ok(contract.policySnapshotSubjects.includes("approved_trade_template"));
  assert.ok(contract.policySnapshotSubjects.includes("template_parameter"));
  assert.ok(contract.tradeTypes.includes("donation_offset"));
  assert.ok(contract.tradeTypes.includes("pledge_swap"));
  assert.ok(contract.tradeTypes.includes("compensated_moral_action"));
  assert.ok(contract.conformanceStates.includes("off_template_manual_review"));
  assert.match(contract.failClosedRule, /active approved template/i);
  assert.match(contract.failClosedRule, /renewed participant confirmation/i);
  assert.match(contract.privacyBoundary, /participant-specific template instance records/i);
});

test("draft preview can pass without template records, but live and lock transitions cannot", () => {
  const preview = evaluateMoralTradeTemplateConformance({
    transition: "draft_preview",
    checkedAt: "2026-06-11T12:00:00.000Z",
    templates: [],
    instances: [],
  });

  assert.equal(preview.status, "pass");
  assert.equal(preview.requiredInstanceCount, 0);

  const live = evaluateMoralTradeTemplateConformance({
    transition: "live_offer_publication",
    checkedAt: "2026-06-11T12:00:00.000Z",
    templates: [],
    instances: [],
  });

  assert.equal(live.status, "blocked");
  assert.ok(live.blockers.includes("template_instance_record_required"));
  assert.deepEqual(live.userFacingBlockerCategories, [
    "Offer needs an approved template or reviewed exception",
  ]);
});

test("conforming active template instance can pass matched-trade lock", () => {
  const result = evaluateMoralTradeTemplateConformance({
    transition: "matched_trade_lock",
    checkedAt: "2026-06-11T12:00:00.000Z",
    templates: [templateRecord()],
    instances: [instanceRecord()],
  });

  assert.equal(result.status, "pass");
  assert.equal(result.passingInstanceCount, 1);
  assert.equal(result.conformingInstanceCount, 1);
  assert.equal(result.offTemplateExceptionCount, 0);
});

test("off-template exception requires neutral review and renewed confirmation", () => {
  const missingReview = evaluateMoralTradeTemplateConformance({
    transition: "reliance_bearing_transition",
    checkedAt: "2026-06-11T12:00:00.000Z",
    templates: [templateRecord()],
    instances: [
      instanceRecord({
        conformanceState: "off_template_manual_review",
        offTemplateReasonCodes: ["amount_range_reviewed"],
        neutralReviewerApproved: false,
        renewedParticipantConfirmationRef: null,
      }),
    ],
  });

  assert.equal(missingReview.status, "blocked");
  assert.ok(
    missingReview.blockers.includes(
      "off_template_neutral_review_missing:template-instance:demo",
    ),
  );
  assert.ok(
    missingReview.blockers.includes(
      "off_template_renewed_confirmation_missing:template-instance:demo",
    ),
  );

  const reviewedException = evaluateMoralTradeTemplateConformance({
    transition: "reliance_bearing_transition",
    checkedAt: "2026-06-11T12:00:00.000Z",
    templates: [templateRecord()],
    instances: [
      instanceRecord({
        conformanceState: "off_template_manual_review",
        offTemplateReasonCodes: ["amount_range_reviewed"],
        neutralReviewerApproved: true,
        renewedParticipantConfirmationRef: "participant-confirmation:renewed-template-exception",
      }),
    ],
  });

  assert.equal(reviewedException.status, "pass");
  assert.equal(reviewedException.offTemplateExceptionCount, 1);
});

test("free text cannot create new obligations, evidence standards, side payments, or counterparties", () => {
  const result = evaluateMoralTradeTemplateConformance({
    transition: "payment_capture",
    checkedAt: "2026-06-11T12:00:00.000Z",
    templates: [templateRecord()],
    instances: [
      instanceRecord({
        freeTextCreatesNewObligations: true,
        freeTextCreatesNewEvidenceStandards: true,
        freeTextCreatesSidePayments: true,
        freeTextCreatesNewCounterparties: true,
        offTemplateReasonCodes: [
          "new_obligation",
          "new_evidence_standard",
          "new_side_payment",
          "new_counterparty",
        ],
      }),
    ],
  });

  assert.equal(result.status, "blocked");
  assert.ok(result.blockers.includes("free_text_creates_new_obligations:template-instance:demo"));
  assert.ok(
    result.blockers.includes(
      "free_text_creates_new_evidence_standards:template-instance:demo",
    ),
  );
  assert.ok(result.blockers.includes("free_text_creates_side_payments:template-instance:demo"));
  assert.ok(
    result.blockers.includes("free_text_creates_new_counterparties:template-instance:demo"),
  );
  assert.ok(
    result.blockers.includes(
      "forbidden_off_template_reason:template-instance:demo:new_side_payment",
    ),
  );
});

test("template records fail closed for stale policy, missing parameter envelope, and invalid hashes", () => {
  const result = evaluateMoralTradeTemplateConformance({
    transition: "matched_trade_lock",
    checkedAt: "2026-06-11T12:00:00.000Z",
    templates: [
      templateRecord({
        templateState: "deprecated",
        parameterPolicyHash: "not-a-hash",
        parameterPolicyStatus: "mutable",
        allowedRecipientDestinationClasses: [],
        eligibleCauseBucketRefs: [],
        allowedEvidenceClaimTypes: [],
        challengeWindowPolicyRef: null,
        cancellationRuleRef: null,
        requiredControlPackRef: null,
      }),
    ],
    instances: [instanceRecord()],
  });

  assert.equal(result.status, "blocked");
  assert.ok(
    result.blockers.includes(
      "approved_template_not_active:template:tier-1-donation-offset:deprecated",
    ),
  );
  assert.ok(
    result.blockers.includes(
      "template_parameter_policy_not_immutable:template:tier-1-donation-offset:mutable",
    ),
  );
  assert.ok(
    result.blockers.includes(
      "invalid_template_parameter_policy_hash:template:tier-1-donation-offset",
    ),
  );
  assert.ok(
    result.blockers.includes(
      "template_recipient_destination_class_missing:template:tier-1-donation-offset",
    ),
  );
  assert.ok(
    result.blockers.includes(
      "template_required_control_pack_missing:template:tier-1-donation-offset",
    ),
  );
});

test("template-conformance route, health, spec, API contract, and schema are wired", () => {
  const source = readRepoFile("src/lib/moral-trade/template-conformance.ts");
  const contractRoute = readRepoFile(
    "src/app/api/moral-trade/template-conformance/contract/route.ts",
  );
  const healthRoute = readRepoFile("src/app/api/moral-trade/health/route.ts");
  const technicalSpec = readRepoFile("src/app/moral-trade/technical-spec/page.tsx");
  const apiContractSource = readRepoFile("src/lib/moral-trade/api-contract.ts");
  const apiContractProfile = readRepoFile("config/moral-trade/api-contract-profile.json");
  const migration = readRepoFile(
    "supabase/migrations/20260611_moral_trade_template_conformance_records.sql",
  );
  const schema = readRepoFile("supabase/schema.sql");
  const databaseTypes = readRepoFile("src/lib/supabase/database.types.ts");

  assert.match(source, /getMoralTradeTemplateConformanceContract/);
  assert.match(source, /evaluateMoralTradeTemplateConformance/);
  assert.match(source, /moral_trade_approved_trade_templates/);
  assert.match(source, /moral_trade_template_parameter_policies/);
  assert.match(source, /moral_trade_template_instance_records/);
  assert.match(source, /free_text_creates_new_obligations/);
  assert.match(contractRoute, /templateConformanceSampleEvaluationStatuses/);
  assert.match(healthRoute, /templateConformanceValidation/);
  assert.match(healthRoute, /templateConformanceFirstClassRecordTables/);
  assert.match(technicalSpec, /templateConformanceContract\.firstClassRecordTables/);
  assert.match(apiContractSource, /moral_trade_template_conformance_contract/);
  assert.match(apiContractProfile, /template_conformance_contract_response/);
  for (const tableSource of [migration, schema]) {
    assert.match(tableSource, /moral_trade_approved_trade_templates/);
    assert.match(tableSource, /moral_trade_template_parameter_policies/);
    assert.match(tableSource, /moral_trade_template_instance_records/);
    assert.match(tableSource, /approved_trade_template/);
    assert.match(tableSource, /template_parameter/);
    assert.match(tableSource, /free_text_creates_new_obligations_bool/);
  }
  assert.match(databaseTypes, /moral_trade_approved_trade_templates/);
  assert.match(databaseTypes, /moral_trade_template_instance_records/);
});
