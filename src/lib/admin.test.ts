import assert from "node:assert/strict";
import test from "node:test";

import {
  buildAgreementReviewerConsolePreview,
  evaluateAdminOperatorAccess,
  normalizeAgreementReviewerConflictState,
  normalizeNeutralReviewAssignment,
} from "@/lib/admin";
import type { BackgroundAccountSecuritySummary } from "@/lib/background-account-security";

const activeMfaSummary: BackgroundAccountSecuritySummary = {
  currentLevel: "aal2",
  error: null,
  factors: [],
  needsStepUp: false,
  nextLevel: "aal2",
  session: {
    accessTokenAgeSeconds: 120,
    accessTokenExpiresInSeconds: 3480,
    accessTokenLifetimeSeconds: 3600,
    accessTokenWindowStatus: "recommended",
    currentAal: "aal2",
    error: null,
    expiresAt: "2026-05-31T01:00:00.000Z",
    issuedAt: "2026-05-31T00:00:00.000Z",
    recommendedMaxAgeSeconds: 3600,
    reviewLabel: "Access-token window is within the background-networking recommendation.",
    revocationSupported: true,
    sessionIdSuffix: "55555555",
  },
  statusLabel: "MFA active for this session",
  statusTone: "secure",
  unverifiedTotpCount: 0,
  verifiedTotpCount: 1,
};

test("admin operator access requires allowlisted email and active MFA session", () => {
  const allowed = evaluateAdminOperatorAccess({
    adminEmails: ["admin@example.com"],
    email: "Admin@Example.com",
    mfaSummary: activeMfaSummary,
  });

  assert.equal(allowed.allowed, true);
  assert.equal(allowed.reason, "allowed");

  const wrongEmail = evaluateAdminOperatorAccess({
    adminEmails: ["admin@example.com"],
    email: "viewer@example.com",
    mfaSummary: activeMfaSummary,
  });

  assert.equal(wrongEmail.allowed, false);
  assert.equal(wrongEmail.reason, "admin_email_not_allowed");
});

test("admin operator access blocks missing, unavailable, and unverified MFA", () => {
  const noFactor = evaluateAdminOperatorAccess({
    adminEmails: ["admin@example.com"],
    email: "admin@example.com",
    mfaSummary: {
      ...activeMfaSummary,
      currentLevel: "aal1",
      statusLabel: "MFA not enrolled",
      statusTone: "warning",
      verifiedTotpCount: 0,
    },
  });

  assert.equal(noFactor.allowed, false);
  assert.equal(noFactor.reason, "mfa_factor_required");

  const needsStepUp = evaluateAdminOperatorAccess({
    adminEmails: ["admin@example.com"],
    email: "admin@example.com",
    mfaSummary: {
      ...activeMfaSummary,
      currentLevel: "aal1",
      needsStepUp: true,
      statusLabel: "MFA enrolled; session needs verification",
      statusTone: "warning",
    },
  });

  assert.equal(needsStepUp.allowed, false);
  assert.equal(needsStepUp.reason, "mfa_step_up_required");

  const unavailable = evaluateAdminOperatorAccess({
    adminEmails: ["admin@example.com"],
    email: "admin@example.com",
    mfaSummary: {
      ...activeMfaSummary,
      error: "Supabase MFA unavailable.",
    },
  });

  assert.equal(unavailable.allowed, false);
  assert.equal(unavailable.reason, "mfa_status_unavailable");
});

test("agreement reviewer console preview allows routine assigned operator review", () => {
  const preview = buildAgreementReviewerConsolePreview({
    assignedReviewerId: "reviewer-1",
    evidenceItemAttached: true,
    neutralReviewAssignment: "operator_review_only",
    reviewScope: "Receipt claim for donation-offset completion.",
    reviewerConflictState: "no_conflict_declared",
    reviewerRole: "operator",
    status: "under_review",
  });

  assert.equal(preview.schemaVersion, "agreement-reviewer-console-preview-v1");
  assert.equal(preview.readyForReviewerAction, true);
  assert.equal(preview.canMarkReviewedComplete, true);
  assert.equal(preview.neutralReviewRequired, false);
  assert.equal(preview.gates.every((gate) => gate.status === "pass"), true);
});

test("agreement reviewer console preview fails closed on unresolved conflict", () => {
  const preview = buildAgreementReviewerConsolePreview({
    assignedReviewerId: "reviewer-1",
    conflictOfInterestNotes: "",
    evidenceItemAttached: true,
    neutralReviewAssignment: "operator_review_only",
    reviewScope: "Evidence authenticity claim.",
    reviewerConflictState: "conflict_disclosed",
    status: "under_review",
  });
  const conflictGate = preview.gates.find((gate) => gate.key === "conflict-of-interest");
  const neutralGate = preview.gates.find((gate) => gate.key === "neutral-review-assignment");

  assert.equal(preview.neutralReviewRequired, true);
  assert.equal(preview.readyForReviewerAction, false);
  assert.equal(conflictGate?.status, "blocked");
  assert.deepEqual(conflictGate?.blockerCodes, ["reviewer_conflict_unresolved"]);
  assert.equal(neutralGate?.status, "blocked");
});

test("agreement reviewer console preview requires neutral handling for appeals", () => {
  const appealInput = {
    appealReason: "The participant says the reviewer missed a conflict.",
    assignedReviewerId: "reviewer-1",
    evidenceItemAttached: true,
    neutralReviewAssignment: "operator_review_only",
    reviewScope: "Appeal packet and completion evidence.",
    reviewerConflictState: "no_conflict_declared",
    status: "appealed",
  };
  const operatorOnly = buildAgreementReviewerConsolePreview(appealInput);

  assert.equal(operatorOnly.neutralReviewRequired, true);
  assert.equal(operatorOnly.readyForReviewerAction, false);
  assert.equal(
    operatorOnly.gates.find((gate) => gate.key === "neutral-review-assignment")?.status,
    "blocked",
  );

  const neutralAssigned = buildAgreementReviewerConsolePreview({
    ...appealInput,
    neutralReviewAssignment: "neutral_reviewer_assigned",
  });

  assert.equal(neutralAssigned.readyForReviewerAction, true);
});

test("agreement reviewer console preview requires panel notes for panel assignment", () => {
  const panelInput = {
    assignedReviewerId: "reviewer-1",
    evidenceItemAttached: true,
    neutralReviewAssignment: "neutral_panel_assigned",
    reviewPanelNotes: "",
    reviewScope: "Disputed evidence packet.",
    reviewerConflictState: "no_conflict_declared",
    status: "disputed_unresolved",
  };
  const missingNotes = buildAgreementReviewerConsolePreview(panelInput);
  const assignmentGate = missingNotes.gates.find((gate) => gate.key === "reviewer-assignment");

  assert.equal(assignmentGate?.status, "needs_review");
  assert.equal(missingNotes.readyForReviewerAction, false);

  const withNotes = buildAgreementReviewerConsolePreview({
    ...panelInput,
    reviewPanelNotes: "External reviewer plus operator observer; no participant relationship found.",
  });

  assert.equal(withNotes.gates.find((gate) => gate.key === "reviewer-assignment")?.status, "pass");
  assert.equal(withNotes.readyForReviewerAction, true);
});

test("agreement reviewer console normalizers fail closed for unknown values", () => {
  assert.equal(normalizeAgreementReviewerConflictState("clear"), "not_checked");
  assert.equal(normalizeAgreementReviewerConflictState("recused"), "recused");
  assert.equal(normalizeNeutralReviewAssignment("panel"), "unassigned");
  assert.equal(normalizeNeutralReviewAssignment("neutral_panel_assigned"), "neutral_panel_assigned");
});
