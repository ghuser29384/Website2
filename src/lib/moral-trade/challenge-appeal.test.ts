import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import { POST as enforceChallengeAppeal } from "@/app/api/moral-trade/challenge-appeal/enforce/route";
import {
  evaluateMoralTradeAppealCase,
  evaluateMoralTradeChallengeAppeal,
  getMoralTradeChallengeAppealContract,
  validateMoralTradeChallengeAppealContract,
  validateMoralTradeChallengeAppealDecision,
  type MoralTradeAppealCaseRecord,
  type MoralTradeAppealPolicyRecord,
  type MoralTradeChallengeAppealContract,
  type MoralTradeChallengeAppealDecision,
  type MoralTradeChallengeAppealInput,
} from "./challenge-appeal";

function readRepoFile(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

const baseAppeal = {
  requestId: "appeal-001",
  subject: "evidence_row",
  standing: "affected_party",
  trigger: "wrong_scope_evidence",
  claimId: "claim-001",
  evidenceRowId: "evidence-row-001",
  priorDecisionId: "review-decision-001",
  challengeWindowOpen: true,
  summary:
    "The evidence row proves payment only, but the decision used it as baseline evidence.",
  affectedPartyStandingSummary:
    "The public summary names a community affected by the challenged externality review.",
  remedyRequested: "Pause the completion badge and separate factual proof from baseline confidence.",
} satisfies MoralTradeChallengeAppealInput;

function appealPolicy(
  overrides: Partial<MoralTradeAppealPolicyRecord> = {},
): MoralTradeAppealPolicyRecord {
  return {
    policyId: "appeal-policy-evidence-row",
    subject: "evidence_row",
    status: "passed",
    noticeRequired: true,
    deadlineRequired: true,
    neutralReviewRequired: true,
    nonRetaliationRequired: true,
    safetyBlockerWaiverProhibited: true,
    settledObligationReopenProhibited: true,
    maxAppealAgeDays: 30,
    policyHash:
      "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    reviewedAt: "2026-06-01T00:00:00.000Z",
    supersededBy: null,
    ...overrides,
  };
}

function appealCase(
  overrides: Partial<MoralTradeAppealCaseRecord> = {},
): MoralTradeAppealCaseRecord {
  return {
    appealCaseId: "appeal-case-evidence-row",
    policyRef: "appeal-policy-evidence-row",
    subject: "evidence_row",
    standing: "affected_party",
    trigger: "wrong_scope_evidence",
    outcome: "open_challenge_window",
    status: "under_neutral_review",
    noticeState: "delivered",
    deadlineAt: "2026-06-20T00:00:00.000Z",
    filedAt: "2026-06-02T00:00:00.000Z",
    reviewedAt: null,
    expiresAt: "2026-06-25T00:00:00.000Z",
    neutralReviewStatus: "passed",
    standingStatus: "passed",
    scopeHash:
      "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    evidenceScopeRefs: ["evidence-row-001", "review-decision-001"],
    privateDetailsRedacted: true,
    safetyBlockerWaiverAttempted: false,
    settledObligationReopenAttempted: false,
    nonRetaliationNoticeSent: true,
    caseHash:
      "sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
    supersededBy: null,
    ...overrides,
  };
}

test("challenge appeal evaluation scopes wrong-scope evidence for human review", () => {
  const decision = evaluateMoralTradeChallengeAppeal(baseAppeal);

  assert.equal(decision.status, "ready_for_human_review");
  assert.equal(decision.outcome, "open_challenge_window");
  assert.equal(decision.humanReviewRequired, true);
  assert.equal(decision.stateMutation, false);
  assert.equal(decision.standingAccepted, true);
  assert.deepEqual(decision.blockers, []);
  assert.ok(decision.factorCodes.includes("specific_reviewed_claim"));
  assert.ok(decision.factorCodes.includes("affected_party_standing"));
  assert.ok(decision.factorCodes.includes("wrong_scope_evidence_review"));
  assert.ok(decision.factorCodes.includes("challenge_window_required"));
  assert.ok(decision.factorCodes.includes("no_unrelated_moral_disagreement"));
  assert.ok(decision.requiredArtifacts.includes("scoped evidence row and claim linkage"));
  assert.equal(decision.provenanceActivity, "challenge_window_opened");
  assert.equal(decision.traceabilityBusinessStep, "challenge_opened");
  assert.equal(validateMoralTradeChallengeAppealDecision(decision).status, "pass");
});

test("challenge appeal evaluation requires affected-party standing and remedy paths", () => {
  const decision = evaluateMoralTradeChallengeAppeal({
    ...baseAppeal,
    trigger: "externality_remedy_gap",
    subject: "externality_trigger",
    affectedPartyStandingSummary: "",
    remedyRequested: "",
  });

  assert.equal(decision.status, "needs_standing");
  assert.equal(decision.outcome, "route_human_review");
  assert.equal(decision.standingAccepted, false);
  assert.ok(decision.blockers.includes("affected_party_standing_summary_required"));
  assert.ok(decision.blockers.includes("remedy_requested_required"));
  assert.ok(decision.factorCodes.includes("externality_remedy_review"));
  assert.equal(decision.factorCodes.includes("affected_party_standing"), false);
  assert.equal(decision.factorCodes.includes("standing_established"), false);
  assert.ok(decision.requiredArtifacts.includes("affected-party standing summary and remedy path"));
  assert.equal(validateMoralTradeChallengeAppealDecision(decision).status, "pass");
});

test("challenge appeal evaluation blocks private-detail packets until redacted", () => {
  const decision = evaluateMoralTradeChallengeAppeal({
    ...baseAppeal,
    subject: "disclosure_decision",
    trigger: "privacy_disclosure_error",
    containsPrivateDetails: true,
  });

  assert.equal(decision.status, "needs_redaction");
  assert.equal(decision.outcome, "route_human_review");
  assert.ok(decision.blockers.includes("private_details_must_be_redacted_before_review"));
  assert.ok(decision.factorCodes.includes("private_details_redacted"));
  assert.ok(decision.factorCodes.includes("privacy_disclosure_review"));
  assert.match(decision.privacyActions.join(" "), /redact exact wishes/i);
  assert.equal(validateMoralTradeChallengeAppealDecision(decision).status, "pass");
});

test("challenge appeal evaluation honors compatible requested outcomes without state mutation", () => {
  const decision = evaluateMoralTradeChallengeAppeal({
    ...baseAppeal,
    subject: "externality_trigger",
    trigger: "externality_remedy_gap",
    challengeWindowOpen: false,
    requestedOutcome: "record_remedy",
  });

  assert.equal(decision.status, "ready_for_human_review");
  assert.equal(decision.outcome, "record_remedy");
  assert.equal(decision.stateMutation, false);
  assert.deepEqual(decision.blockers, []);
  assert.ok(decision.factorCodes.includes("externality_remedy_review"));
  assert.equal(validateMoralTradeChallengeAppealDecision(decision).status, "pass");
});

test("appeal cases fail closed when policy or first-class case records are missing", () => {
  const missing = evaluateMoralTradeAppealCase({
    subject: "evidence_row",
    trigger: "wrong_scope_evidence",
    requiresAppealCase: true,
    requiresNeutralReview: true,
    checkedAt: "2026-06-03T00:00:00.000Z",
    policies: [],
    appealCases: [],
  });

  assert.equal(missing.status, "blocked");
  assert.ok(missing.blockers.includes("appeal_policy_missing:evidence_row"));
  assert.ok(
    missing.blockers.includes(
      "appeal_case_missing:evidence_row:wrong_scope_evidence",
    ),
  );
});

test("appeal cases block missing notice, deadlines, neutral review, scope, redaction, and safety controls", () => {
  const blocked = evaluateMoralTradeAppealCase({
    subject: "evidence_row",
    trigger: "wrong_scope_evidence",
    requiresAppealCase: true,
    requiresNeutralReview: true,
    checkedAt: "2026-06-03T00:00:00.000Z",
    policies: [appealPolicy()],
    appealCases: [
      appealCase({
        noticeState: "missing",
        deadlineAt: null,
        neutralReviewStatus: "missing",
        standingStatus: "missing",
        scopeHash: null,
        evidenceScopeRefs: [],
        privateDetailsRedacted: false,
        safetyBlockerWaiverAttempted: true,
        settledObligationReopenAttempted: true,
        nonRetaliationNoticeSent: false,
        caseHash: "invalid-hash",
      }),
    ],
  });

  assert.equal(blocked.status, "blocked");
  assert.ok(blocked.blockers.includes("standing_missing:appeal-case-evidence-row"));
  assert.ok(blocked.blockers.includes("notice_missing:appeal-case-evidence-row"));
  assert.ok(blocked.blockers.includes("deadline_missing:appeal-case-evidence-row"));
  assert.ok(
    blocked.blockers.includes("neutral_review_missing:appeal-case-evidence-row"),
  );
  assert.ok(blocked.blockers.includes("scope_missing:appeal-case-evidence-row"));
  assert.ok(
    blocked.blockers.includes("evidence_scope_missing:appeal-case-evidence-row"),
  );
  assert.ok(
    blocked.blockers.includes("private_details_unredacted:appeal-case-evidence-row"),
  );
  assert.ok(
    blocked.blockers.includes(
      "safety_blocker_waiver_attempted:appeal-case-evidence-row",
    ),
  );
  assert.ok(
    blocked.blockers.includes(
      "settled_obligation_reopen_attempted:appeal-case-evidence-row",
    ),
  );
  assert.ok(
    blocked.blockers.includes("non_retaliation_missing:appeal-case-evidence-row"),
  );
  assert.ok(blocked.blockers.includes("invalid_case_hash:appeal-case-evidence-row"));
});

test("current appeal cases pass with notice, deadline, scope, neutral review, and non-retaliation evidence", () => {
  const current = evaluateMoralTradeAppealCase({
    subject: "evidence_row",
    trigger: "wrong_scope_evidence",
    requiresAppealCase: true,
    requiresNeutralReview: true,
    checkedAt: "2026-06-03T00:00:00.000Z",
    policies: [appealPolicy()],
    appealCases: [appealCase()],
  });

  assert.equal(current.status, "pass");
  assert.deepEqual(current.blockers, []);
});

test("challenge appeal evaluation rejects incompatible requested outcomes", () => {
  const decision = evaluateMoralTradeChallengeAppeal({
    ...baseAppeal,
    subject: "externality_trigger",
    trigger: "externality_remedy_gap",
    requestedOutcome: "correct_record",
  });

  assert.equal(decision.status, "needs_scope");
  assert.equal(decision.outcome, "request_evidence");
  assert.ok(
    decision.blockers.includes(
      "requested_outcome_not_compatible:correct_record:externality_remedy_gap",
    ),
  );
  assert.equal(validateMoralTradeChallengeAppealDecision(decision).status, "pass");
});

test("challenge appeal decision validation rejects autonomous state changes and broad appeals", () => {
  const decision = evaluateMoralTradeChallengeAppeal(baseAppeal) as MoralTradeChallengeAppealDecision;

  decision.humanReviewRequired = false as MoralTradeChallengeAppealDecision["humanReviewRequired"];
  decision.stateMutation = true as MoralTradeChallengeAppealDecision["stateMutation"];
  decision.factorCodes = ["wrong_scope_evidence_review"];
  decision.appealScopeStatement = "Reopen every moral disagreement.";

  const validation = validateMoralTradeChallengeAppealDecision(decision);

  assert.equal(validation.status, "fail");
  assert.ok(validation.blockers.some((blocker) => blocker.includes("human-review-and-nonmutation")));
  assert.ok(validation.blockers.some((blocker) => blocker.includes("required-factor-codes")));
  assert.ok(validation.blockers.some((blocker) => blocker.includes("appeal-scope-statement")));
});

test("challenge appeal contract validates scope, standing, privacy, provenance, and human control", () => {
  const contract = getMoralTradeChallengeAppealContract();
  const validation = validateMoralTradeChallengeAppealContract(contract);

  assert.equal(validation.status, "pass");
  assert.equal(contract.decisioningMode, "deterministic_challenge_appeal_scope_only");
  assert.equal(contract.stateMutation, false);
  assert.ok(contract.subjects.includes("evidence_row"));
  assert.ok(contract.standingCategories.includes("affected_party"));
  assert.ok(contract.appealTriggers.includes("privacy_disclosure_error"));
  assert.ok(contract.allowedOutcomes.includes("record_remedy"));
  assert.ok(contract.firstClassRecordTables.includes("moral_trade_appeal_policies"));
  assert.ok(contract.firstClassRecordTables.includes("moral_trade_appeal_cases"));
  assert.ok(contract.policySnapshotSubjects.includes("appeal_case"));
  assert.match(contract.enforcementRule, /cannot open appeals, correct records, allow reliance/);
  assert.ok(
    contract.enforcementRecordTables.includes(
      "moral_trade_challenge_appeal_enforcement_records",
    ),
  );
  assert.equal(contract.enforcementRoute.method, "POST");
  assert.equal(
    contract.enforcementRoute.path,
    "/api/moral-trade/challenge-appeal/enforce",
  );
  assert.equal(contract.enforcementRoute.auth, "authenticated");
  assert.ok(contract.appealCaseStatuses.includes("under_neutral_review"));
  assert.ok(contract.noticeStates.includes("delivered"));
  assert.ok(contract.failClosedStatuses.includes("notice_missing"));
  assert.ok(contract.failClosedStatuses.includes("neutral_review_missing"));
  assert.ok(contract.failClosedStatuses.includes("settled_obligation_reopen_attempted"));
  assert.ok(contract.approvedFactorCodes.includes("no_unrelated_moral_disagreement"));
  assert.ok(contract.approvedFactorCodes.includes("provenance_activity_required"));
  assert.ok(
    contract.sampleAppealCaseEvaluations.some((evaluation) => evaluation.status === "pass"),
  );
  assert.ok(
    contract.sampleAppealCaseEvaluations.some((evaluation) =>
      evaluation.blockers.includes("notice_missing:appeal-case-blocked"),
    ),
  );
  assert.ok(contract.contractTests.includes("appeal_case_record_contract"));
  assert.ok(contract.contractTests.includes("challenge_appeal_evaluate_route_contract"));
  assert.ok(contract.contractTests.includes("challenge_appeal_enforce_route_contract"));
  assert.ok(
    contract.contractTests.includes(
      "challenge_appeal_enforcement_record_schema_contract",
    ),
  );
});

test("challenge-appeal enforce route is fail-closed before persistence on invalid input", async () => {
  const response = await enforceChallengeAppeal(
    new Request("http://localhost/api/moral-trade/challenge-appeal/enforce", {
      body: "not-json",
      method: "POST",
    }),
  );
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(response.headers.get("Cache-Control"), "private, no-store");
  assert.equal(body.ok, false);
  assert.equal(body.challengeAppealGateStatus, "blocked");
  assert.equal(body.opensAppeal, false);
  assert.equal(body.correctsRecord, false);
  assert.equal(body.relianceBearingTransitionAllowed, false);
  assert.equal(body.safetyBlockerWaiverAllowed, false);
  assert.equal(body.settledObligationReopenAllowed, false);
  assert.equal(body.publicMetricAllowed, false);
  assert.equal(body.stateMutation, false);
  assert.equal(body.persistence.status, "not_recorded");
  assert.equal(
    body.persistence.table,
    "moral_trade_challenge_appeal_enforcement_records",
  );
  assert.deepEqual(body.blockers, ["invalid_json_body"]);
});

test("challenge-appeal route, health, spec, API contract, and schema are wired", () => {
  const source = readRepoFile("src/lib/moral-trade/challenge-appeal.ts");
  const contractRoute = readRepoFile(
    "src/app/api/moral-trade/challenge-appeal/contract/route.ts",
  );
  const enforceRoute = readRepoFile(
    "src/app/api/moral-trade/challenge-appeal/enforce/route.ts",
  );
  const healthRoute = readRepoFile("src/app/api/moral-trade/health/route.ts");
  const technicalSpec = readRepoFile("src/app/moral-trade/technical-spec/page.tsx");
  const apiContractSource = readRepoFile("src/lib/moral-trade/api-contract.ts");
  const apiContractProfile = readRepoFile("config/moral-trade/api-contract-profile.json");
  const migration = readRepoFile(
    "supabase/migrations/20260607_zzzzzzzzzzzzzz_moral_trade_appeal_case_records.sql",
  );
  const enforcementMigration = readRepoFile(
    "supabase/migrations/20260611_moral_trade_challenge_appeal_enforcement_records.sql",
  );
  const schema = readRepoFile("supabase/schema.sql");
  const databaseTypes = readRepoFile("src/lib/supabase/database.types.ts");

  assert.match(source, /moral_trade_challenge_appeal_enforcement_records/);
  assert.match(source, /challenge_appeal_enforce_route_contract/);
  assert.match(contractRoute, /enforcementRecordTables/);
  assert.match(contractRoute, /enforcementRoute/);
  assert.match(enforceRoute, /challenge_appeal_enforce/);
  assert.match(enforceRoute, /moral_trade_challenge_appeal_enforcement_records/);
  assert.match(enforceRoute, /auth\.getUser/);
  assert.match(enforceRoute, /opensAppeal:\s*false/);
  assert.match(enforceRoute, /correctsRecord:\s*false/);
  assert.match(enforceRoute, /relianceBearingTransitionAllowed:\s*false/);
  assert.match(enforceRoute, /safetyBlockerWaiverAllowed:\s*false/);
  assert.match(enforceRoute, /settledObligationReopenAllowed:\s*false/);
  assert.match(enforceRoute, /publicMetricAllowed:\s*false/);
  assert.match(enforceRoute, /stateMutation:\s*false/);
  assert.match(enforceRoute, /evaluation_hash/);
  assert.match(enforceRoute, /idempotency_key/);
  assert.match(healthRoute, /challengeAppealEnforcementRoute/);
  assert.match(healthRoute, /challengeAppealEnforcementRecordTables/);
  assert.match(technicalSpec, /Challenge appeal contract/);
  assert.match(technicalSpec, /challengeAppealContract\.enforcementRoute/);
  assert.match(technicalSpec, /challengeAppealContract\.enforcementRecordTables/);
  assert.match(apiContractSource, /moral_trade_challenge_appeal_enforce/);
  assert.match(apiContractProfile, /moral-trade-api-contract-v0\.53-2026-06/);
  assert.match(apiContractProfile, /challenge_appeal_enforce_request/);
  assert.match(apiContractProfile, /challenge_appeal_enforce_response/);
  assert.match(apiContractProfile, /moral_trade_challenge_appeal_enforce/);
  assert.match(migration, /moral_trade_appeal_policies/);
  assert.match(migration, /moral_trade_appeal_cases/);
  for (const tableSource of [enforcementMigration, schema]) {
    assert.match(
      tableSource,
      /create table if not exists public\.moral_trade_challenge_appeal_enforcement_records/,
    );
    assert.match(tableSource, /opens_appeal_bool boolean not null default false/);
    assert.match(tableSource, /corrects_record_bool boolean not null default false/);
    assert.match(
      tableSource,
      /reliance_bearing_transition_allowed_bool boolean not null default false/,
    );
    assert.match(
      tableSource,
      /safety_blocker_waiver_allowed_bool boolean not null default false/,
    );
    assert.match(
      tableSource,
      /settled_obligation_reopen_allowed_bool boolean not null default false/,
    );
    assert.match(tableSource, /public_metric_allowed_bool boolean not null default false/);
    assert.match(tableSource, /unique \(owner_profile_id, idempotency_key\)/);
    assert.match(tableSource, /enable row level security/);
    assert.match(tableSource, /moral_trade_challenge_appeal_enforcement_records_select_owner/);
    assert.match(tableSource, /moral_trade_challenge_appeal_enforcement_records_insert_owner/);
  }
  assert.match(databaseTypes, /moral_trade_challenge_appeal_enforcement_records/);
  assert.match(databaseTypes, /opens_appeal_bool: false/);
  assert.match(databaseTypes, /public_metric_allowed_bool: false/);
});

test("challenge appeal contract validation fails when safeguards are weakened", () => {
  const contract: MoralTradeChallengeAppealContract = {
    ...getMoralTradeChallengeAppealContract(),
    standingCategories: ["participant"],
    allowedOutcomes: ["uphold_decision"],
    approvedFactorCodes: ["specific_reviewed_claim"],
    invariants: ["Appeals reopen all moral disagreements."],
    sampleDecision: {
      ...getMoralTradeChallengeAppealContract().sampleDecision,
      stateMutation: true as MoralTradeChallengeAppealDecision["stateMutation"],
      humanReviewRequired: false as MoralTradeChallengeAppealDecision["humanReviewRequired"],
      factorCodes: ["wrong_scope_evidence_review"],
    },
    contractTests: [],
  };
  const validation = validateMoralTradeChallengeAppealContract(contract);

  assert.equal(validation.status, "fail");
  assert.ok(validation.blockers.some((blocker) => blocker.includes("standing-coverage")));
  assert.ok(validation.blockers.some((blocker) => blocker.includes("trigger-and-outcome-coverage")));
  assert.ok(validation.blockers.some((blocker) => blocker.includes("sample-decision-validation")));
  assert.ok(validation.blockers.some((blocker) => blocker.includes("narrow-appeal-scope")));
  assert.ok(validation.blockers.some((blocker) => blocker.includes("privacy-and-provenance")));
  assert.ok(validation.blockers.some((blocker) => blocker.includes("contract-tests")));
});
