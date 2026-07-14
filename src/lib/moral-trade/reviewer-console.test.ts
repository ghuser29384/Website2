import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import { GET as reviewerConsoleContractRoute } from "@/app/api/moral-trade/reviewer-console/contract/route";

import {
  evaluateMoralTradeReviewerConsole,
  getMoralTradeReviewerConsoleContract,
  validateMoralTradeReviewerConsoleContract,
  type MoralTradeReviewerConsoleCaseRecord,
  type MoralTradeReviewerConsoleCheckKey,
  type MoralTradeReviewerConsoleCheckResult,
  type MoralTradeReviewerConsoleEvaluationInput,
} from "./reviewer-console";

const CHECKED_AT = "2026-06-25T12:05:00.000Z";

function passingCase(
  overrides: Partial<MoralTradeReviewerConsoleCaseRecord> = {},
): MoralTradeReviewerConsoleCaseRecord {
  return {
    caseId: "reviewer-console-case:test",
    checkedAt: "2026-06-25T12:00:00.000Z",
    conflictFactsPublic: false,
    expiresAt: "2026-07-25T12:00:00.000Z",
    marketplaceStateEventRef: "marketplace-state-event:test",
    neutralAssignmentRef: "neutral-panel:test",
    neutralAssignmentState: "panel_assigned",
    policySnapshotStatus: "resolved_immutable",
    reviewDecisionRef: "review-decision:test",
    reviewerConflictState: "none_declared",
    reviewerIdentityPublic: false,
    reviewerNotesPublic: false,
    subjectRef: "public-receipt:test",
    subjectType: "public_receipt_card",
    surface: "public_receipt_publication_review",
    ...overrides,
  };
}

function passingCheck(
  checkKey: MoralTradeReviewerConsoleCheckKey,
  overrides: Partial<MoralTradeReviewerConsoleCheckResult> = {},
): MoralTradeReviewerConsoleCheckResult {
  return {
    caseRef: "reviewer-console-case:test",
    checkedAt: "2026-06-25T12:00:00.000Z",
    checkKey,
    expiresAt: "2026-07-25T12:00:00.000Z",
    policySnapshotStatus: "resolved_immutable",
    rawEvidencePublic: false,
    reviewDecisionRef: "review-decision:test",
    reviewerNotesPublic: false,
    status: "passed",
    userFacingCategory: `Reviewed ${checkKey}`,
    ...overrides,
  };
}

function publicReceiptChecks() {
  return getMoralTradeReviewerConsoleContract().requiredPublicReceiptPublicationChecks;
}

function passingInput(
  overrides: Partial<MoralTradeReviewerConsoleEvaluationInput> = {},
): MoralTradeReviewerConsoleEvaluationInput {
  return {
    cases: [passingCase()],
    checkedAt: CHECKED_AT,
    checkResults: [
      ...getMoralTradeReviewerConsoleContract().requiredUiReviewChecks,
      ...publicReceiptChecks(),
    ].map((checkKey) => passingCheck(checkKey)),
    surface: "public_receipt_publication_review",
    ...overrides,
  };
}

test("moraltrade82 reviewer-console contract validates required public receipt and UI checks", () => {
  const contract = getMoralTradeReviewerConsoleContract();
  const validation = validateMoralTradeReviewerConsoleContract(contract);

  assert.equal(validation.status, "pass");
  assert.deepEqual(validation.blockers, []);
  assert.ok(contract.releaseGateTestHooks.includes("reviewer_conflict_tests"));
  assert.ok(contract.releaseGateTestHooks.includes("neutral_reviewer_approval"));
  assert.ok(contract.requiredUiReviewChecks.includes("plain_language_copy"));
  assert.ok(contract.requiredUiReviewChecks.includes("task_card_single_primary_action"));
  assert.ok(contract.requiredUiReviewChecks.includes("safe_template_default_disclosure"));
  assert.ok(contract.requiredPublicReceiptPublicationChecks.includes("privacy_publication"));
  assert.ok(contract.requiredPublicReceiptPublicationChecks.includes("verified_claims"));
  assert.ok(contract.requiredPublicReceiptPublicationChecks.includes("direct_donation_parity_non_preference"));
  assert.ok(contract.requiredPublicReceiptPublicationChecks.includes("net_personal_contribution"));
  assert.ok(contract.requiredPublicReceiptPublicationChecks.includes("anti_gamification"));
  assert.ok(contract.requiredPublicReceiptPublicationChecks.includes("verification_url_status"));
  assert.match(contract.finalDecisionAuditRule, /review_decision|marketplace_state_event/i);
});

test("reviewer-console evaluation passes only with non-conflicted neutral review and all required checks", () => {
  const result = evaluateMoralTradeReviewerConsole(passingInput());

  assert.equal(result.status, "pass");
  assert.equal(result.caseCount, 1);
  assert.equal(result.checkedRequirementCount, 18);
  assert.deepEqual(result.blockers, []);
});

test("reviewer-console evaluation blocks conflicts, missing neutral assignment, private leaks, and silent edits", () => {
  const result = evaluateMoralTradeReviewerConsole(
    passingInput({
      cases: [
        passingCase({
          conflictFactsPublic: true,
          marketplaceStateEventRef: null,
          neutralAssignmentRef: null,
          neutralAssignmentState: "missing",
          reviewDecisionRef: null,
          reviewerConflictState: "conflicted",
          reviewerIdentityPublic: true,
          reviewerNotesPublic: true,
        }),
      ],
      checkResults: [
        passingCheck("plain_language_copy", {
          rawEvidencePublic: true,
          reviewerNotesPublic: true,
          status: "failed",
        }),
      ],
    }),
  );

  assert.equal(result.status, "blocked");
  assert.ok(result.blockers.includes("reviewer_console_conflict_blocking:reviewer-console-case:test:conflicted"));
  assert.ok(result.blockers.includes("reviewer_console_neutral_assignment_missing:reviewer-console-case:test:missing"));
  assert.ok(result.blockers.includes("reviewer_console_neutral_assignment_ref_missing:reviewer-console-case:test"));
  assert.ok(result.blockers.includes("reviewer_console_reviewer_identity_public:reviewer-console-case:test"));
  assert.ok(result.blockers.includes("reviewer_console_reviewer_notes_public:reviewer-console-case:test"));
  assert.ok(result.blockers.includes("reviewer_console_conflict_facts_public:reviewer-console-case:test"));
  assert.ok(result.blockers.includes("reviewer_console_review_decision_missing:reviewer-console-case:test"));
  assert.ok(result.blockers.includes("reviewer_console_marketplace_state_event_missing:reviewer-console-case:test"));
  assert.ok(result.blockers.includes("reviewer_console_check_not_passed:reviewer-console-case:test:plain_language_copy:failed"));
  assert.ok(result.blockers.includes("reviewer_console_check_reviewer_notes_public:reviewer-console-case:test:plain_language_copy"));
  assert.ok(result.blockers.includes("reviewer_console_check_raw_evidence_public:reviewer-console-case:test:plain_language_copy"));
  assert.ok(result.blockers.includes("reviewer_console_check_missing:public_receipt_publication_review:verified_claims"));
  assert.ok(result.blockers.includes("reviewer_console_check_missing:public_receipt_publication_review:correction_revocation"));
});

test("not-required reviewer-console checks need immutable policy and public reason", () => {
  const result = evaluateMoralTradeReviewerConsole(
    passingInput({
      checkResults: [
        ...getMoralTradeReviewerConsoleContract().requiredUiReviewChecks,
        ...publicReceiptChecks(),
      ].map((checkKey) =>
        checkKey === "direct_donation_parity_non_preference"
          ? passingCheck(checkKey, {
              policySnapshotStatus: "mutable",
              status: "not_required_for_stage",
              userFacingCategory: "No parity path in this receipt",
            })
          : passingCheck(checkKey),
      ),
    }),
  );

  assert.equal(result.status, "blocked");
  assert.ok(
    result.blockers.includes(
      "reviewer_console_check_policy_not_immutable:reviewer-console-case:test:direct_donation_parity_non_preference:mutable",
    ),
  );
  assert.ok(
    result.blockers.includes(
      "reviewer_console_not_required_reason_missing:reviewer-console-case:test:direct_donation_parity_non_preference",
    ),
  );
});

test("reviewer-console contract route exposes safe public metadata", async () => {
  const response = await reviewerConsoleContractRoute(
    new Request("http://localhost/api/moral-trade/reviewer-console/contract"),
  );
  const body = await response.json();
  const serialized = JSON.stringify(body);

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  assert.equal(body.ok, true);
  assert.equal(body.validation.status, "pass");
  assert.ok(body.publicContract.firstClassRecordTables.includes("moral_trade_reviewer_console_cases"));
  assert.ok(body.publicContract.requiredPublicReceiptPublicationChecks.includes("anti_gamification"));
  assert.equal(serialized.includes("reviewer_notes_private"), false);
  assert.equal(serialized.includes("reviewer_identity_hash"), false);
  assert.equal(serialized.includes("conflict_facts"), false);
  assert.equal(serialized.includes("raw_evidence"), false);
  assert.equal(serialized.includes("participant_identity_hash"), false);
});

test("reviewer-console migration creates checklist and private-boundary records", () => {
  const migration = readFileSync(
    join(
      process.cwd(),
      "supabase/migrations/20260625_moral_trade_reviewer_console_checklists.sql",
    ),
    "utf8",
  );

  assert.match(migration, /create table if not exists public\.moral_trade_reviewer_console_cases/);
  assert.match(migration, /create table if not exists public\.moral_trade_reviewer_console_check_results/);
  assert.match(migration, /create table if not exists public\.moral_trade_reviewer_console_panel_assignments/);
  assert.match(migration, /create table if not exists public\.moral_trade_public_receipt_publication_reviews/);
  assert.match(migration, /reviewer_identity_public_bool boolean not null default false check \(reviewer_identity_public_bool = false\)/);
  assert.match(migration, /reviewer_notes_public_bool boolean not null default false check \(reviewer_notes_public_bool = false\)/);
  assert.match(migration, /conflict_facts_public_bool boolean not null default false check \(conflict_facts_public_bool = false\)/);
  assert.match(migration, /raw_evidence_public_bool boolean not null default false check \(raw_evidence_public_bool = false\)/);
  assert.match(migration, /plain_language_copy/);
  assert.match(migration, /safe_template_default_disclosure/);
  assert.match(migration, /anti_gamification/);
  assert.match(migration, /no_publicity_as_trade_term/);
  assert.match(migration, /verification_url_status/);
  assert.match(migration, /correction_revocation/);
});
