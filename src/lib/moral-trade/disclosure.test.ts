import assert from "node:assert/strict";
import test from "node:test";

import {
  BACKGROUND_QUERY_COSTS,
  BACKGROUND_QUERY_DAILY_LIMITS,
} from "../background-query-budget";
import { PRIVACY_ACCESS_REQUEST_WINDOW_DAYS } from "../background-disclosure";
import {
  evaluateMoralTradeDisclosureGrant,
  getMoralTradeDisclosureContract,
  validateMoralTradeDisclosureContract,
  validateMoralTradeDisclosureDecision,
  type MoralTradeDisclosureContract,
  type MoralTradeDisclosureDecision,
} from "./disclosure";

test("disclosure grant evaluation approves purpose-bound consent-stage exact wishes", () => {
  const decision = evaluateMoralTradeDisclosureGrant({
    requestId: "grant-001",
    fieldKeys: ["exact_wish", "source_summary"],
    purpose: "Decide whether a specific consent-stage introduction should proceed.",
    stage: "consent",
    accessLevel: "specific",
    status: "draft",
    ownerProfileScoped: true,
    counterpartyScoped: true,
    matchScoped: true,
  });

  assert.equal(decision.status, "grant_ready");
  assert.deepEqual(decision.allowedFields, ["exact_wish", "source_summary"]);
  assert.deepEqual(decision.blockers, []);
  assert.equal(decision.ownerApprovalRequired, true);
  assert.equal(decision.stateMutation, false);
  assert.equal(decision.expiryDays, 30);
  assert.ok(decision.factorCodes.includes("mutual_consent_required"));
  assert.ok(decision.factorCodes.includes("owner_approval_required"));
  assert.ok(decision.factorCodes.includes("non_mutating_evaluation"));
  assert.equal(validateMoralTradeDisclosureDecision(decision).status, "pass");
});

test("disclosure grant evaluation blocks early contact and raw source notes", () => {
  const decision = evaluateMoralTradeDisclosureGrant({
    requestId: "grant-002",
    fieldKeys: ["contact_email", "raw_source_notes"],
    purpose: "Coordinate an intro without broad disclosure.",
    stage: "consent",
    accessLevel: "contact",
    containsRawSourceNotes: true,
    containsContactDetails: true,
  });

  assert.equal(decision.status, "unsupported_fields");
  assert.ok(decision.deniedFields.includes("raw_source_notes"));
  assert.ok(decision.blockers.some((blocker) => blocker.includes("introduced")));
  assert.ok(decision.blockers.includes("raw_source_notes_must_not_be_disclosed"));
  assert.ok(decision.blockers.includes("contact_details_require_introduced_stage"));
  assert.ok(decision.factorCodes.includes("introduced_contact_only"));
  assert.ok(decision.factorCodes.includes("step_up_auth_required"));
  assert.ok(decision.factorCodes.includes("raw_source_notes_redacted"));
  assert.equal(decision.stepUpAuthRequired, true);
  assert.equal(validateMoralTradeDisclosureDecision(decision).status, "pass");
});

test("disclosure grant evaluation flags live contact grants for MFA step-up", () => {
  const decision = evaluateMoralTradeDisclosureGrant({
    requestId: "grant-contact-001",
    fieldKeys: ["contact_email"],
    purpose: "Coordinate a mutually approved introduction after both sides consent.",
    stage: "introduced",
    accessLevel: "contact",
    status: "granted",
    ownerProfileScoped: true,
    counterpartyScoped: true,
    matchScoped: true,
  });

  assert.equal(decision.status, "grant_ready");
  assert.deepEqual(decision.blockers, []);
  assert.deepEqual(decision.allowedFields, ["contact_email"]);
  assert.equal(decision.stepUpAuthRequired, true);
  assert.ok(decision.factorCodes.includes("introduced_contact_only"));
  assert.ok(decision.factorCodes.includes("step_up_auth_required"));
  assert.equal(validateMoralTradeDisclosureDecision(decision).status, "pass");
});

test("disclosure decision validation rejects autonomous mutation and unapproved factors", () => {
  const decision = evaluateMoralTradeDisclosureGrant({
    requestId: "grant-003",
    fieldKeys: ["cause_areas"],
    purpose: "Check broad compatibility.",
    stage: "registry",
    accessLevel: "broad",
  }) as MoralTradeDisclosureDecision;

  decision.ownerApprovalRequired = false as MoralTradeDisclosureDecision["ownerApprovalRequired"];
  decision.stateMutation = true as MoralTradeDisclosureDecision["stateMutation"];
  decision.factorCodes = ["raw_private_note_similarity" as MoralTradeDisclosureDecision["factorCodes"][number]];

  const validation = validateMoralTradeDisclosureDecision(decision);

  assert.equal(validation.status, "fail");
  assert.ok(validation.blockers.some((blocker) => blocker.includes("owner-approval-and-nonmutation")));
  assert.ok(validation.blockers.some((blocker) => blocker.includes("approved-factor-codes")));
  assert.ok(validation.blockers.some((blocker) => blocker.includes("required-factor-codes")));
});

test("disclosure contract validates staged disclosure and privacy grant boundaries", () => {
  const contract = getMoralTradeDisclosureContract();
  const validation = validateMoralTradeDisclosureContract(contract);

  assert.equal(validation.status, "pass");
  assert.equal(contract.decisioningMode, "deterministic_disclosure_grant_scope_only");
  assert.equal(contract.stateMutation, false);
  assert.ok(contract.accessLevels.includes("contact"));
  assert.ok(contract.audienceStages.includes("introduced"));
  assert.ok(contract.grantStatuses.includes("revoked"));
  assert.ok(contract.disclosureFields.some((field) => field.key === "exact_wish"));
  assert.ok(contract.disclosureFields.some((field) => field.key === "contact_email"));
  assert.ok(contract.redactedFields.includes("raw_source_notes"));
  assert.ok(
    contract.searchPrivacyControls.some(
      (control) =>
        control.key === "daily_registry_query_budget" &&
        control.scope === "registry_search" &&
        control.dailyLimit === BACKGROUND_QUERY_DAILY_LIMITS.registry_search &&
        control.cost === BACKGROUND_QUERY_COSTS.registry_search,
    ),
  );
  assert.ok(
    contract.searchPrivacyControls.some(
      (control) =>
        control.key === "sparse_result_privacy_floor" &&
        control.minResultCount === 3 &&
        control.minSpecificity === 3,
    ),
  );
  assert.ok(
    contract.searchPrivacyControls.some(
      (control) =>
        control.key === "detail_request_probe_limit" &&
        control.scope === "privacy_access_request" &&
        control.windowDays === PRIVACY_ACCESS_REQUEST_WINDOW_DAYS &&
        control.pendingLimit === 3 &&
        control.similarPendingLimit === 1 &&
        control.similarWeeklyLimit === 3 &&
        control.weeklyLimit === 6,
    ),
  );
  assert.ok(contract.approvedFactorCodes.includes("owner_approval_required"));
  assert.ok(contract.approvedFactorCodes.includes("step_up_auth_required"));
  assert.ok(contract.contractTests.includes("disclosure_query_budget_contract_smoke"));
  assert.ok(contract.contractTests.includes("disclosure_contact_step_up_contract_smoke"));
  assert.ok(contract.contractTests.includes("privacy_access_request_cadence_smoke"));
  assert.ok(contract.contractTests.includes("disclosure_grant_evaluate_route_contract"));
});

test("disclosure contract validation fails when consent and redaction safeguards are weakened", () => {
  const contract: MoralTradeDisclosureContract = {
    ...getMoralTradeDisclosureContract(),
    audienceStages: ["registry"],
    disclosureFields: [] as unknown as MoralTradeDisclosureContract["disclosureFields"],
    redactedFields: ["contact_details_before_introduction"],
    searchPrivacyControls: [],
    approvedFactorCodes: ["field_level_grant"],
    invariants: ["Everything may be disclosed publicly."],
    sampleDecision: {
      ...getMoralTradeDisclosureContract().sampleDecision,
      stateMutation: true as MoralTradeDisclosureDecision["stateMutation"],
      ownerApprovalRequired: false as MoralTradeDisclosureDecision["ownerApprovalRequired"],
    },
    contractTests: [],
  };
  const validation = validateMoralTradeDisclosureContract(contract);

  assert.equal(validation.status, "fail");
  assert.ok(validation.blockers.some((blocker) => blocker.includes("lattice-coverage")));
  assert.ok(validation.blockers.some((blocker) => blocker.includes("field-contract-coverage")));
  assert.ok(validation.blockers.some((blocker) => blocker.includes("sample-decision-validation")));
  assert.ok(validation.blockers.some((blocker) => blocker.includes("stage-and-contact-invariants")));
  assert.ok(validation.blockers.some((blocker) => blocker.includes("redaction-invariants")));
  assert.ok(validation.blockers.some((blocker) => blocker.includes("search-privacy-controls")));
  assert.ok(validation.blockers.some((blocker) => blocker.includes("approved-factor-codes")));
  assert.ok(validation.blockers.some((blocker) => blocker.includes("contract-tests")));
});
