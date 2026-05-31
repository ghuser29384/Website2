import assert from "node:assert/strict";
import test from "node:test";

import {
  normalizeBackgroundTotpCode,
  summarizeBackgroundMfaFactors,
} from "./background-account-security";

test("normalizes background MFA codes without accepting broad input", () => {
  assert.deepEqual(normalizeBackgroundTotpCode("123 456"), {
    code: "123456",
    error: null,
  });
  assert.deepEqual(normalizeBackgroundTotpCode("123-456"), {
    code: "123456",
    error: null,
  });

  const invalid = normalizeBackgroundTotpCode("1234567");
  assert.equal(invalid.code, "");
  assert.match(invalid.error ?? "", /6-digit/);
});

test("summarizes MFA enrollment and session step-up state", () => {
  const noFactor = summarizeBackgroundMfaFactors({
    currentLevel: "aal1",
    factors: [],
    nextLevel: "aal1",
  });
  assert.equal(noFactor.statusLabel, "MFA not enrolled");
  assert.equal(noFactor.statusTone, "warning");

  const enrolledNeedsStepUp = summarizeBackgroundMfaFactors({
    currentLevel: "aal1",
    factors: [
      {
        created_at: "2026-05-30T00:00:00.000Z",
        factor_type: "totp",
        friendly_name: "Moral Trade",
        id: "factor-1",
        status: "verified",
        updated_at: "2026-05-30T00:00:00.000Z",
      },
    ],
    nextLevel: "aal2",
  });
  assert.equal(enrolledNeedsStepUp.statusLabel, "MFA enrolled; session needs verification");
  assert.equal(enrolledNeedsStepUp.needsStepUp, true);
  assert.equal(enrolledNeedsStepUp.verifiedTotpCount, 1);

  const active = summarizeBackgroundMfaFactors({
    currentLevel: "aal2",
    factors: enrolledNeedsStepUp.factors.map((factor) => ({
      created_at: factor.createdAt,
      factor_type: factor.factorType,
      friendly_name: factor.friendlyName,
      id: factor.id,
      status: factor.status,
      updated_at: factor.updatedAt,
    })),
    nextLevel: "aal2",
  });
  assert.equal(active.statusLabel, "MFA active for this session");
  assert.equal(active.statusTone, "secure");
  assert.equal(active.needsStepUp, false);
});
