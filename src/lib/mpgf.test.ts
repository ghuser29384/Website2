import assert from "node:assert/strict";
import test from "node:test";

import {
  buildDemoLedgerTransactions,
  buildPublicSummary,
  computeExactMpgfAllocation,
  isLedgerBalanced,
} from "./mpgf/mechanism";
import { mpgfPublicRoutes } from "./mpgf/data";
import {
  canonicalMpgfHash,
  runMpgfDirectWorkingSmokeTest,
  validateLedgerTemplateRegistry,
  validateMpgfDeploymentEnvironment,
  validateMpgfDirectWorkingFixtures,
  validateMpgfInstructionMechanicalNormalization,
  validateMpgfPhaseA,
  validateMpgfProtocolParameters,
} from "./mpgf/validators";

test("MPGF exact demo allocation balances to the budget", () => {
  const allocation = computeExactMpgfAllocation();

  assert.equal(allocation.allocatedCents + allocation.carryoverCents, allocation.budgetCents);
  assert.equal(allocation.certificate.algorithm, "exact_integer_proportional_v0");
});

test("MPGF non-real-money demo ledger transactions are balanced", () => {
  const transactions = buildDemoLedgerTransactions();

  assert.ok(transactions.length > 0);
  assert.ok(transactions.every(isLedgerBalanced));
});

test("MPGF public summary exposes no live disbursement state in demo mode", () => {
  const summary = buildPublicSummary();

  assert.equal(summary.releasedInternalCents, 0);
  assert.equal(summary.payoutAuthorizedCents, 0);
  assert.equal(summary.externallyPaidCents, 0);
  assert.match(summary.nonRealMoneyStatus, /non-real-money/i);
});

test("MPGF Phase 0/A validators pass for direct-working artifacts", () => {
  assert.equal(validateMpgfInstructionMechanicalNormalization().status, "passed");
  assert.equal(validateMpgfProtocolParameters().status, "passed");
  assert.equal(validateLedgerTemplateRegistry().status, "passed");
  assert.equal(validateMpgfDirectWorkingFixtures().status, "passed");
  assert.equal(validateMpgfPhaseA().status, "passed");
});

test("MPGF direct-working smoke test passes without real-money mode", () => {
  const result = runMpgfDirectWorkingSmokeTest();

  assert.equal(result.status, "passed");
  assert.equal(result.featureMode, "non_real_money");
});

test("MPGF canonical hash is stable for nested JSON key order", () => {
  const left = {
    z: [{ b: 2, a: 1 }],
    a: {
      y: true,
      x: ["same", { beta: 2, alpha: 1 }],
    },
  };
  const right = {
    a: {
      x: ["same", { alpha: 1, beta: 2 }],
      y: true,
    },
    z: [{ a: 1, b: 2 }],
  };

  assert.equal(canonicalMpgfHash(left), canonicalMpgfHash(right));
});

test("MPGF canonical hash normalizes optional JSON edge fields", () => {
  assert.equal(canonicalMpgfHash({ present: true, absent: undefined }), canonicalMpgfHash({ present: true }));
  assert.equal(canonicalMpgfHash([undefined, Number.NaN]), canonicalMpgfHash([null, null]));
});

test("MPGF public route evidence includes pool proposal route", () => {
  assert.ok(mpgfPublicRoutes.includes("/mpgf/pools/new"));
});

test("MPGF production completion gate fails while production evidence is only pending", () => {
  const result = validateMpgfDeploymentEnvironment("completion_gate");

  assert.equal(result.status, "failed");
  assert.ok(result.errors.some((error) => error.id === "deployment-completion-evidence-not-passed"));
});
