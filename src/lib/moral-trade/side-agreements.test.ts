import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import { POST as enforceSideAgreement } from "@/app/api/moral-trade/side-agreements/enforce/route";

import {
  evaluateMoralTradeSideAgreementDisclosure,
  getMoralTradeSideAgreementContract,
  validateMoralTradeSideAgreementContract,
  type MoralTradeSideAgreementDisclosureRecord,
  type MoralTradeSideAgreementPolicySnapshotStatus,
  type MoralTradeSideAgreementReviewStatus,
} from "./side-agreements";

function readRepoFile(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

function hashFor(seed: string) {
  return `sha256:${createHash("sha256").update(seed).digest("hex")}`;
}

function reviewStatuses(
  status: MoralTradeSideAgreementReviewStatus,
): MoralTradeSideAgreementDisclosureRecord["reviewStatuses"] {
  return {
    anti_corruption: status,
    anti_threat: status,
    civil_rights_discrimination: status,
    collusion: status,
    confidentiality_privacy_rights: status,
    externality: status,
    financial_crime_fraud: status,
    legal_jurisdiction: status,
    participant_autonomy: status,
    reporting_integrity: status,
    representative_authority: status,
  };
}

function disclosure(
  overrides: Partial<MoralTradeSideAgreementDisclosureRecord> = {},
): MoralTradeSideAgreementDisclosureRecord {
  return {
    disclosureId: "side-agreement:test",
    subjectType: "donation_offset",
    subjectRef: "donation-offset:test",
    sideAgreementPresent: false,
    disclosureStatus: "none_declared",
    publicSafeSummary: "No side agreement is declared for this record.",
    privateDetailsRedacted: true,
    participantNoticeStatus: "not_required_for_stage",
    policySnapshotStatus: "resolved_immutable",
    disclosureHash: hashFor("side-agreement:test"),
    reviewedAt: "2026-06-08T12:00:00.000Z",
    expiresAt: "2026-12-08T12:00:00.000Z",
    supersededBy: null,
    reviewStatuses: reviewStatuses("not_required_for_stage"),
    ...overrides,
  };
}

test("side-agreement contract validates first-class disclosure governance", () => {
  const contract = getMoralTradeSideAgreementContract();
  const validation = validateMoralTradeSideAgreementContract(contract);

  assert.equal(validation.status, "pass");
  assert.deepEqual(validation.blockers, []);
  assert.ok(contract.firstClassRecordTables.includes("moral_trade_side_agreement_disclosures"));
  assert.ok(contract.firstClassRecordTables.includes("moral_trade_side_agreement_reviews"));
  assert.ok(
    contract.firstClassRecordTables.includes(
      "moral_trade_side_agreement_enforcement_records",
    ),
  );
  assert.ok(contract.policySnapshotSubjects.includes("side_agreement_disclosure"));
  assert.ok(contract.policySnapshotSubjects.includes("side_agreement_review"));
  assert.ok(contract.subjectTypes.includes("donation_offset"));
  assert.ok(contract.subjectTypes.includes("pledge_swap"));
  assert.ok(contract.subjectTypes.includes("compensated_moral_action"));
  assert.ok(contract.reviewDimensions.includes("collusion"));
  assert.ok(contract.reviewDimensions.includes("reporting_integrity"));
  assert.ok(contract.reviewDimensions.includes("civil_rights_discrimination"));
  assert.ok(contract.reviewDimensions.includes("confidentiality_privacy_rights"));
  assert.ok(contract.reviewDimensions.includes("representative_authority"));
  assert.ok(contract.failClosedStatuses.includes("missing"));
  assert.ok(contract.failClosedStatuses.includes("under_review"));
  assert.ok(contract.failClosedStatuses.includes("blocked"));
  assert.ok(contract.forbiddenPublicSummaryTerms.includes("reviewer notes"));
  assert.ok(contract.forbiddenPublicSummaryTerms.includes("provider payload"));
  assert.ok(
    contract.sampleEvaluations.some(
      (sample) => sample.transition === "draft_preview" && sample.status === "pass",
    ),
  );
  assert.ok(
    contract.sampleEvaluations.some(
      (sample) =>
        sample.transition === "matched_trade_lock" && sample.status === "pass",
    ),
  );
  assert.ok(
    contract.sampleEvaluations.some(
      (sample) => sample.transition === "payout_release" && sample.status === "blocked",
    ),
  );
});

test("side-agreement disclosure is required before reliance-bearing transitions", () => {
  const preview = evaluateMoralTradeSideAgreementDisclosure({
    transition: "draft_preview",
    checkedAt: "2026-06-08T12:00:00.000Z",
    disclosures: [],
  });

  assert.equal(preview.status, "pass");
  assert.equal(preview.requiredDisclosureCount, 0);

  const lock = evaluateMoralTradeSideAgreementDisclosure({
    transition: "matched_trade_lock",
    checkedAt: "2026-06-08T12:00:00.000Z",
    disclosures: [],
  });

  assert.equal(lock.status, "blocked");
  assert.ok(lock.blockers.includes("side_agreement_disclosure_required"));
  assert.deepEqual(lock.userFacingBlockerCategories, [
    "Side agreement disclosure needs review before lock",
  ]);
});

test("non-declared side agreement can pass only with explicit reviewed absence", () => {
  const pass = evaluateMoralTradeSideAgreementDisclosure({
    transition: "matched_trade_lock",
    checkedAt: "2026-06-08T12:00:00.000Z",
    disclosures: [disclosure()],
  });

  assert.equal(pass.status, "pass");
  assert.deepEqual(pass.blockers, []);
  assert.equal(pass.passingDisclosureCount, 1);

  const ambiguous = evaluateMoralTradeSideAgreementDisclosure({
    transition: "matched_trade_lock",
    checkedAt: "2026-06-08T12:00:00.000Z",
    disclosures: [disclosure({ disclosureStatus: "disclosed" })],
  });

  assert.equal(ambiguous.status, "blocked");
  assert.ok(
    ambiguous.blockers.includes(
      "side_agreement_absence_not_explicit:side-agreement:test:disclosed",
    ),
  );
});

test("present side agreement blocks until review dimensions, notice, and redaction pass", () => {
  const blocked = evaluateMoralTradeSideAgreementDisclosure({
    transition: "payout_release",
    checkedAt: "2026-06-08T12:00:00.000Z",
    disclosures: [
      disclosure({
        sideAgreementPresent: true,
        disclosureStatus: "under_review",
        participantNoticeStatus: "missing",
        privateDetailsRedacted: false,
        reviewStatuses: {
          ...reviewStatuses("passed"),
          collusion: "under_review",
          anti_threat: "missing",
          reporting_integrity: "blocked",
        },
      }),
    ],
  });

  assert.equal(blocked.status, "blocked");
  assert.ok(
    blocked.blockers.includes(
      "side_agreement_not_non_blocking:side-agreement:test:under_review",
    ),
  );
  assert.ok(
    blocked.blockers.includes(
      "side_agreement_private_details_not_redacted:side-agreement:test",
    ),
  );
  assert.ok(
    blocked.blockers.includes(
      "side_agreement_notice_not_recorded:side-agreement:test:missing",
    ),
  );
  assert.ok(
    blocked.blockers.includes(
      "side_agreement_review_not_non_blocking:collusion:under_review",
    ),
  );
  assert.ok(
    blocked.blockers.includes(
      "side_agreement_review_not_non_blocking:anti_threat:missing",
    ),
  );
  assert.ok(
    blocked.blockers.includes(
      "side_agreement_review_not_non_blocking:reporting_integrity:blocked",
    ),
  );
  assert.deepEqual(blocked.userFacingBlockerCategories, [
    "Side agreement disclosure needs review before payout",
  ]);
});

test("side-agreement records fail closed for unsafe public summaries, stale policies, and time defects", () => {
  const evaluate = (overrides: Partial<MoralTradeSideAgreementDisclosureRecord>) =>
    evaluateMoralTradeSideAgreementDisclosure({
      transition: "public_completion_claim",
      checkedAt: "2026-06-08T12:00:00.000Z",
      disclosures: [disclosure(overrides)],
    });

  const unsafeSummary = evaluate({
    publicSafeSummary: "Contains reviewer notes and provider payload.",
  });
  assert.ok(
    unsafeSummary.blockers.includes(
      "unsafe_side_agreement_public_summary:side-agreement:test",
    ),
  );

  const mutablePolicy = evaluate({
    policySnapshotStatus: "mutable" as MoralTradeSideAgreementPolicySnapshotStatus,
  });
  assert.ok(
    mutablePolicy.blockers.includes(
      "side_agreement_policy_snapshot_not_immutable:mutable",
    ),
  );

  const stale = evaluate({ reviewedAt: "2025-01-01T12:00:00.000Z" });
  assert.ok(
    stale.blockers.includes("stale_side_agreement_disclosure:side-agreement:test"),
  );

  const expired = evaluate({ expiresAt: "2026-01-01T12:00:00.000Z" });
  assert.ok(
    expired.blockers.includes("expired_side_agreement_disclosure:side-agreement:test"),
  );

  const brokenHash = evaluate({ disclosureHash: "sha256:broken" });
  assert.ok(
    brokenHash.blockers.includes(
      "invalid_side_agreement_disclosure_hash:side-agreement:test",
    ),
  );
});

test("side-agreement enforce route is fail-closed before persistence on invalid input", async () => {
  const response = await enforceSideAgreement(
    new Request("http://localhost/api/moral-trade/side-agreements/enforce", {
      body: "not-json",
      method: "POST",
    }),
  );
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(response.headers.get("Cache-Control"), "private, no-store");
  assert.equal(body.ok, false);
  assert.equal(body.sideAgreementGateStatus, "blocked");
  assert.equal(body.lockTransitionAllowed, false);
  assert.equal(body.paymentTransitionAllowed, false);
  assert.equal(body.payoutReleaseAllowed, false);
  assert.equal(body.relianceBearingTransitionAllowed, false);
  assert.equal(body.challengeDecisionAllowed, false);
  assert.equal(body.publicCompletionClaimAllowed, false);
  assert.equal(body.releaseGatePromotionAllowed, false);
  assert.equal(body.stateMutation, false);
  assert.equal(body.persistence.status, "not_recorded");
  assert.equal(
    body.persistence.table,
    "moral_trade_side_agreement_enforcement_records",
  );
  assert.deepEqual(body.blockers, ["invalid_json_body"]);
});

test("side-agreement route, health, technical spec, API contract, and migration are wired", () => {
  const source = readRepoFile("src/lib/moral-trade/side-agreements.ts");
  const route = readRepoFile("src/app/api/moral-trade/side-agreements/contract/route.ts");
  const enforceRoute = readRepoFile(
    "src/app/api/moral-trade/side-agreements/enforce/route.ts",
  );
  const health = readRepoFile("src/app/api/moral-trade/health/route.ts");
  const spec = readRepoFile("src/app/moral-trade/technical-spec/page.tsx");
  const apiContractSource = readRepoFile("src/lib/moral-trade/api-contract.ts");
  const apiContract = readRepoFile("config/moral-trade/api-contract-profile.json");
  const operationsProfile = readRepoFile("config/moral-trade/operations-profile.json");
  const operations = readRepoFile("src/lib/moral-trade/operations.ts");
  const migration = readRepoFile(
    "supabase/migrations/20260608_moral_trade_side_agreement_disclosures.sql",
  );
  const schema = readRepoFile("supabase/schema.sql");
  const databaseTypes = readRepoFile("src/lib/supabase/database.types.ts");

  assert.match(source, /moral_trade_side_agreement_disclosures/);
  assert.match(source, /moral_trade_side_agreement_reviews/);
  assert.match(source, /moral_trade_side_agreement_enforcement_records/);
  assert.match(source, /side_agreement_enforce_route_contract/);
  assert.match(source, /side_agreement_disclosure_required/);
  assert.match(source, /reporting_integrity/);
  assert.match(source, /civil_rights_discrimination/);
  assert.match(route, /getMoralTradeSideAgreementContract/);
  assert.match(route, /sideAgreementSampleEvaluationStatuses/);
  assert.match(enforceRoute, /side_agreement_enforce/);
  assert.match(enforceRoute, /moral_trade_side_agreement_enforcement_records/);
  assert.match(enforceRoute, /auth\.getUser/);
  assert.match(enforceRoute, /lockTransitionAllowed:\s*false/);
  assert.match(enforceRoute, /paymentTransitionAllowed:\s*false/);
  assert.match(enforceRoute, /payoutReleaseAllowed:\s*false/);
  assert.match(enforceRoute, /relianceBearingTransitionAllowed:\s*false/);
  assert.match(enforceRoute, /challengeDecisionAllowed:\s*false/);
  assert.match(enforceRoute, /publicCompletionClaimAllowed:\s*false/);
  assert.match(enforceRoute, /releaseGatePromotionAllowed:\s*false/);
  assert.match(health, /sideAgreementValidation/);
  assert.match(health, /sideAgreementFirstClassRecordTables/);
  assert.match(spec, /Side-agreement disclosure contract/);
  assert.match(spec, /side-agreements\/contract/);
  assert.match(apiContractSource, /moral_trade_side_agreement_enforce/);
  assert.match(apiContract, /moral_trade_side_agreement_contract/);
  assert.match(apiContract, /moral_trade_side_agreement_enforce/);
  assert.match(apiContract, /side_agreement_enforce_request/);
  assert.match(apiContract, /side_agreement_enforce_response/);
  assert.match(apiContract, /side_agreement_contract_response/);
  assert.match(apiContract, /private_no_store/);
  assert.match(operationsProfile, /side_agreement_enforce/);
  assert.match(operations, /side_agreement_enforce/);
  assert.match(migration, /moral_trade_side_agreement_disclosures/);
  assert.match(migration, /moral_trade_side_agreement_reviews/);
  assert.match(migration, /moral_trade_side_agreement_enforcement_records/);
  assert.match(migration, /lock_transition_allowed_bool = false/);
  assert.match(migration, /release_gate_promotion_allowed_bool = false/);
  assert.match(migration, /side_agreement_disclosure/);
  assert.match(schema, /moral_trade_side_agreement_disclosures/);
  assert.match(schema, /moral_trade_side_agreement_reviews/);
  assert.match(schema, /moral_trade_side_agreement_enforcement_records/);
  assert.match(databaseTypes, /moral_trade_side_agreement_disclosures/);
  assert.match(databaseTypes, /moral_trade_side_agreement_reviews/);
  assert.match(databaseTypes, /moral_trade_side_agreement_enforcement_records/);
});
