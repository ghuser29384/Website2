import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import {
  evaluateMoralTradeRecipientAcceptance,
  getMoralTradeRecipientAcceptanceContract,
  validateMoralTradeRecipientAcceptanceContract,
  type MoralTradeAdverseAssociationReviewRecord,
  type MoralTradeRecipientAcceptancePolicyRecord,
  type MoralTradeRecipientAcceptanceRecord,
} from "./recipient-acceptance";

function readRepoFile(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

function hashFor(seed: string) {
  return `sha256:${createHash("sha256").update(seed).digest("hex")}`;
}

function policyRecord(
  overrides: Partial<MoralTradeRecipientAcceptancePolicyRecord> = {},
): MoralTradeRecipientAcceptancePolicyRecord {
  return {
    policyId: "recipient-acceptance-policy:tier-1-donation-offset",
    releaseStage: "tier_1_money_only_donation_offset",
    subjectType: "donation_offset",
    policyStatus: "resolved_immutable",
    policyHash: hashFor("recipient-acceptance-policy"),
    requiresRecipientConsent: true,
    requiresAdverseAssociationReview: true,
    maxReviewAgeDays: 45,
    reviewedAt: "2026-06-11T12:00:00.000Z",
    expiresAt: "2026-10-11T12:00:00.000Z",
    supersededBy: null,
    publicSummaryAllowed: true,
    ...overrides,
  };
}

function acceptanceRecord(
  overrides: Partial<MoralTradeRecipientAcceptanceRecord> = {},
): MoralTradeRecipientAcceptanceRecord {
  return {
    acceptanceId: "recipient-acceptance:offset-offer-demo",
    policyRef: "recipient-acceptance-policy:tier-1-donation-offset",
    recipientRef: "recipient:verified-charity-demo",
    subjectType: "donation_offset",
    subjectRef: "offset-offer:demo",
    acceptanceStatus: "accepted",
    visibleUserStatus: "recipient_accepted",
    recipientConsentHash: hashFor("recipient-consent"),
    acceptanceScopeHash: hashFor("recipient-acceptance-scope"),
    acceptedAt: "2026-06-11T12:00:00.000Z",
    reviewedAt: "2026-06-11T12:00:00.000Z",
    expiresAt: "2026-09-11T12:00:00.000Z",
    supersededBy: null,
    conditionalTermsPublic: false,
    recipientPrivateNotesPublic: false,
    donorPrivateTermsPublic: false,
    reviewerNotesPublic: false,
    ...overrides,
  };
}

function adverseAssociationReview(
  overrides: Partial<MoralTradeAdverseAssociationReviewRecord> = {},
): MoralTradeAdverseAssociationReviewRecord {
  return {
    reviewId: "adverse-association-review:offset-offer-demo",
    acceptanceRef: "recipient-acceptance:offset-offer-demo",
    policyRef: "recipient-acceptance-policy:tier-1-donation-offset",
    reviewStatus: "cleared",
    riskClass: "none",
    visibleUserStatus: "recipient_accepted",
    reviewHash: hashFor("adverse-association-review"),
    mitigationHash: null,
    reviewedAt: "2026-06-11T12:00:00.000Z",
    expiresAt: "2026-09-11T12:00:00.000Z",
    supersededBy: null,
    rawAssociationEvidencePublic: false,
    recipientIdentityExpansionPublic: false,
    privateDonorReasonPublic: false,
    reviewerNotesPublic: false,
    ...overrides,
  };
}

test("recipient-acceptance contract validates first-class acceptance and adverse-association records", () => {
  const contract = getMoralTradeRecipientAcceptanceContract();
  const validation = validateMoralTradeRecipientAcceptanceContract(contract);

  assert.equal(validation.status, "pass");
  assert.deepEqual(validation.blockers, []);
  assert.ok(contract.firstClassRecordTables.includes("moral_trade_recipient_acceptance_policies"));
  assert.ok(contract.firstClassRecordTables.includes("moral_trade_recipient_acceptance_records"));
  assert.ok(contract.firstClassRecordTables.includes("moral_trade_adverse_association_reviews"));
  assert.ok(contract.policySnapshotSubjects.includes("recipient_acceptance"));
  assert.ok(contract.policySnapshotSubjects.includes("adverse_association"));
  assert.ok(contract.acceptanceStatuses.includes("declined"));
  assert.ok(contract.acceptanceStatuses.includes("revoked"));
  assert.ok(contract.adverseAssociationStatuses.includes("severe"));
  assert.ok(contract.visibleRecipientStatuses.includes("adverse_association_review"));
  assert.match(contract.failClosedRule, /declined/i);
  assert.match(contract.failClosedRule, /adverse-association review/i);
  assert.match(contract.privacyBoundary, /raw adverse-association evidence/i);
});

test("non-money preview can pass without recipient acceptance, but lock cannot", () => {
  const preview = evaluateMoralTradeRecipientAcceptance({
    transition: "non_money_preview",
    checkedAt: "2026-06-11T12:00:00.000Z",
    policies: [],
    acceptanceRecords: [],
    adverseAssociationReviews: [],
  });

  assert.equal(preview.status, "pass");
  assert.equal(preview.requiredAcceptanceRecordCount, 0);

  const lock = evaluateMoralTradeRecipientAcceptance({
    transition: "matched_trade_lock",
    checkedAt: "2026-06-11T12:00:00.000Z",
    policies: [],
    acceptanceRecords: [],
    adverseAssociationReviews: [],
  });

  assert.equal(lock.status, "blocked");
  assert.ok(lock.blockers.includes("recipient_acceptance_policy_required"));
  assert.ok(lock.blockers.includes("recipient_acceptance_record_required"));
  assert.ok(lock.blockers.includes("adverse_association_review_required"));
});

test("declined or consent-missing recipient acceptance blocks payment capture", () => {
  const result = evaluateMoralTradeRecipientAcceptance({
    transition: "payment_capture",
    checkedAt: "2026-06-11T12:00:00.000Z",
    policies: [policyRecord()],
    acceptanceRecords: [
      acceptanceRecord({
        acceptanceStatus: "declined",
        visibleUserStatus: "declined_or_blocked",
        recipientConsentHash: null,
      }),
    ],
    adverseAssociationReviews: [adverseAssociationReview()],
  });

  assert.equal(result.status, "blocked");
  assert.ok(
    result.blockers.includes(
      "recipient_acceptance_not_accepted:recipient-acceptance:offset-offer-demo:declined",
    ),
  );
  assert.ok(
    result.blockers.includes(
      "recipient_acceptance_declined:recipient-acceptance:offset-offer-demo",
    ),
  );
  assert.ok(
    result.blockers.includes(
      "recipient_consent_missing:recipient-acceptance:offset-offer-demo",
    ),
  );
});

test("adverse-association severe, unresolved, or unmitigated high risk blocks", () => {
  const severe = evaluateMoralTradeRecipientAcceptance({
    transition: "payment_capture",
    checkedAt: "2026-06-11T12:00:00.000Z",
    policies: [policyRecord()],
    acceptanceRecords: [acceptanceRecord()],
    adverseAssociationReviews: [
      adverseAssociationReview({
        reviewStatus: "severe",
        riskClass: "severe",
        visibleUserStatus: "adverse_association_review",
      }),
    ],
  });

  assert.equal(severe.status, "blocked");
  assert.ok(
    severe.blockers.includes(
      "adverse_association_not_cleared:adverse-association-review:offset-offer-demo:severe",
    ),
  );
  assert.ok(
    severe.blockers.includes(
      "adverse_association_severe:adverse-association-review:offset-offer-demo",
    ),
  );

  const unresolved = evaluateMoralTradeRecipientAcceptance({
    transition: "matched_trade_lock",
    checkedAt: "2026-06-11T12:00:00.000Z",
    policies: [policyRecord()],
    acceptanceRecords: [acceptanceRecord()],
    adverseAssociationReviews: [
      adverseAssociationReview({
        reviewStatus: "unresolved",
        riskClass: "high",
      }),
    ],
  });

  assert.equal(unresolved.status, "blocked");
  assert.ok(
    unresolved.blockers.includes(
      "adverse_association_not_cleared:adverse-association-review:offset-offer-demo:unresolved",
    ),
  );
  assert.ok(
    unresolved.blockers.includes(
      "adverse_association_high_risk_unmitigated:adverse-association-review:offset-offer-demo",
    ),
  );
});

test("mitigated adverse association can support lock but not public metrics", () => {
  const mitigatedReview = adverseAssociationReview({
    reviewStatus: "mitigated",
    riskClass: "medium",
    mitigationHash: hashFor("mitigation"),
    visibleUserStatus: "accepted_with_conditions",
  });

  const lock = evaluateMoralTradeRecipientAcceptance({
    transition: "matched_trade_lock",
    checkedAt: "2026-06-11T12:00:00.000Z",
    policies: [policyRecord()],
    acceptanceRecords: [acceptanceRecord()],
    adverseAssociationReviews: [mitigatedReview],
  });

  assert.equal(lock.status, "pass");

  const publicMetric = evaluateMoralTradeRecipientAcceptance({
    transition: "public_metric_publication",
    checkedAt: "2026-06-11T12:00:00.000Z",
    policies: [policyRecord()],
    acceptanceRecords: [acceptanceRecord()],
    adverseAssociationReviews: [mitigatedReview],
  });

  assert.equal(publicMetric.status, "blocked");
  assert.ok(
    publicMetric.blockers.includes(
      "adverse_association_mitigation_not_sufficient:adverse-association-review:offset-offer-demo",
    ),
  );
});

test("recipient acceptance and adverse association privacy fields fail closed", () => {
  const result = evaluateMoralTradeRecipientAcceptance({
    transition: "matched_trade_lock",
    checkedAt: "2026-06-11T12:00:00.000Z",
    policies: [policyRecord()],
    acceptanceRecords: [
      acceptanceRecord({
        recipientPrivateNotesPublic: true,
        donorPrivateTermsPublic: true,
        reviewerNotesPublic: true,
      }),
    ],
    adverseAssociationReviews: [
      adverseAssociationReview({
        rawAssociationEvidencePublic: true,
        recipientIdentityExpansionPublic: true,
        privateDonorReasonPublic: true,
        reviewerNotesPublic: true,
      }),
    ],
  });

  assert.equal(result.status, "blocked");
  assert.ok(
    result.blockers.includes(
      "recipient_private_notes_public:recipient-acceptance:offset-offer-demo",
    ),
  );
  assert.ok(
    result.blockers.includes(
      "recipient_acceptance_donor_private_terms_public:recipient-acceptance:offset-offer-demo",
    ),
  );
  assert.ok(
    result.blockers.includes(
      "raw_adverse_association_evidence_public:adverse-association-review:offset-offer-demo",
    ),
  );
  assert.ok(
    result.blockers.includes(
      "recipient_identity_expansion_public:adverse-association-review:offset-offer-demo",
    ),
  );
  assert.ok(
    result.blockers.includes(
      "adverse_association_private_donor_reason_public:adverse-association-review:offset-offer-demo",
    ),
  );
});

test("recipient-acceptance contract is wired through route, health, spec, API profile, and migrations", () => {
  const route = readRepoFile(
    "src/app/api/moral-trade/recipient-acceptance/contract/route.ts",
  );
  const enforceRoute = readRepoFile(
    "src/app/api/moral-trade/recipient-acceptance/enforce/route.ts",
  );
  const health = readRepoFile("src/app/api/moral-trade/health/route.ts");
  const spec = readRepoFile("src/app/moral-trade/technical-spec/page.tsx");
  const apiContract = readRepoFile("src/lib/moral-trade/api-contract.ts");
  const apiRateLimit = readRepoFile("src/lib/moral-trade/api-rate-limit.ts");
  const operations = readRepoFile("src/lib/moral-trade/operations.ts");
  const operationsProfile = readRepoFile(
    "config/moral-trade/operations-profile.json",
  );
  const apiProfile = readRepoFile("config/moral-trade/api-contract-profile.json");
  const migration = readRepoFile(
    "supabase/migrations/20260611_moral_trade_recipient_acceptance_records.sql",
  );
  const schema = readRepoFile("supabase/schema.sql");
  const databaseTypes = readRepoFile("src/lib/supabase/database.types.ts");
  const forbiddenAllowColumns = [
    "recipient_listing_publication_allowed_bool",
    "lock_transition_allowed_bool",
    "payment_authorization_allowed_bool",
    "payment_capture_allowed_bool",
    "payout_release_allowed_bool",
    "public_metric_publication_allowed_bool",
    "release_gate_promotion_allowed_bool",
  ];

  assert.match(route, /getMoralTradeRecipientAcceptanceContract/);
  assert.match(route, /recipientAcceptanceSampleEvaluationStatuses/);
  assert.match(enforceRoute, /recipient_acceptance_enforce/);
  assert.match(
    enforceRoute,
    /moral_trade_recipient_acceptance_enforcement_records/,
  );
  assert.match(enforceRoute, /authentication_required:recipient_acceptance_enforce/);
  assert.match(enforceRoute, /database_insert_failed:recipient_acceptance_enforce/);
  assert.match(enforceRoute, /recipientListingPublicationAllowed: false/);
  assert.match(enforceRoute, /lockTransitionAllowed: false/);
  assert.match(enforceRoute, /paymentAuthorizationAllowed: false/);
  assert.match(enforceRoute, /paymentCaptureAllowed: false/);
  assert.match(enforceRoute, /payoutReleaseAllowed: false/);
  assert.match(enforceRoute, /publicMetricPublicationAllowed: false/);
  assert.match(enforceRoute, /releaseGatePromotionAllowed: false/);
  assert.match(health, /recipientAcceptanceValidation/);
  assert.match(health, /recipientAcceptanceFirstClassRecordTables/);
  assert.match(spec, /recipientAcceptanceContract\.firstClassRecordTables/);
  assert.match(spec, /\/api\/moral-trade\/recipient-acceptance\/contract/);
  assert.match(apiContract, /moral_trade_recipient_acceptance_contract/);
  assert.match(apiContract, /moral_trade_recipient_acceptance_enforce/);
  assert.match(apiRateLimit, /recipient_acceptance_enforce/);
  assert.match(operations, /recipient_acceptance_enforce/);
  assert.match(operationsProfile, /recipient_acceptance_enforce/);
  assert.match(apiProfile, /recipient_acceptance_contract_response/);
  assert.match(apiProfile, /recipient_acceptance_enforce_request/);
  assert.match(apiProfile, /recipient_acceptance_enforce_response/);
  assert.match(apiProfile, /recipient_acceptance_enforce_route_contract/);
  assert.match(migration, /moral_trade_recipient_acceptance_policies/);
  assert.match(migration, /moral_trade_recipient_acceptance_records/);
  assert.match(migration, /moral_trade_adverse_association_reviews/);
  assert.match(
    migration,
    /moral_trade_recipient_acceptance_enforcement_records/,
  );
  assert.match(migration, /owner_profile_id = auth\.uid\(\)/);
  assert.match(migration, /adverse_association/);
  assert.match(schema, /moral_trade_recipient_acceptance_records/);
  assert.match(schema, /moral_trade_adverse_association_reviews/);
  assert.match(schema, /moral_trade_recipient_acceptance_enforcement_records/);
  assert.match(databaseTypes, /moral_trade_recipient_acceptance_enforcement_records/);

  for (const column of forbiddenAllowColumns) {
    assert.match(migration, new RegExp(`check \\(${column} = false\\)`));
    assert.match(schema, new RegExp(`check \\(${column} = false\\)`));
  }
});
