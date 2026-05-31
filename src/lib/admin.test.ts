import assert from "node:assert/strict";
import test from "node:test";

import { evaluateAdminOperatorAccess } from "@/lib/admin";
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
