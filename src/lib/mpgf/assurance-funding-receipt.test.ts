import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  ASSURANCE_FUNDING_RECEIPT_BOUNDARY,
  calculateAssuranceFundingReceipt,
  parseAssurancePledgeDollars,
  parseAssuranceProbabilityPercent,
} from "./assurance-funding-receipt";

test("assurance funding receipt calculates expected other funding per pledged dollar", () => {
  const result = calculateAssuranceFundingReceipt({
    pledgeCents: 10_000,
    decisiveProbabilityBasisPoints: 2_000,
  });

  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.equal(result.scenarioPoolTargetCents, 100_000);
  assert.equal(result.otherFundingIfDecisiveCents, 90_000);
  assert.equal(result.expectedOtherFundingMicroUsd, 180_000_000);
  assert.equal(result.expectedOtherFundingPerPledgeDollarUsd, 1.8);
});

test("assurance funding receipt handles probability and target boundaries", () => {
  const zeroProbability = calculateAssuranceFundingReceipt({
    pledgeCents: 10_000,
    decisiveProbabilityBasisPoints: 0,
  });
  const fullProbability = calculateAssuranceFundingReceipt({
    pledgeCents: 10_000,
    decisiveProbabilityBasisPoints: 10_000,
  });
  const fullTarget = calculateAssuranceFundingReceipt({
    pledgeCents: 100_000,
    decisiveProbabilityBasisPoints: 10_000,
  });

  assert.equal(zeroProbability.ok && zeroProbability.expectedOtherFundingMicroUsd, 0);
  assert.equal(fullProbability.ok && fullProbability.expectedOtherFundingMicroUsd, 900_000_000);
  assert.equal(
    fullProbability.ok && fullProbability.expectedOtherFundingPerPledgeDollarUsd,
    9,
  );
  assert.equal(fullTarget.ok && fullTarget.otherFundingIfDecisiveCents, 0);
  assert.equal(fullTarget.ok && fullTarget.expectedOtherFundingPerPledgeDollarUsd, 0);
});

test("assurance funding receipt preserves sub-cent expectations without binary currency math", () => {
  const result = calculateAssuranceFundingReceipt({
    scenarioPoolTargetCents: 1_000,
    pledgeCents: 999,
    decisiveProbabilityBasisPoints: 5_000,
  });

  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.equal(result.otherFundingIfDecisiveCents, 1);
  assert.equal(result.expectedOtherFundingMicroUsd, 5_000);
  assert.equal(result.expectedOtherFundingPerPledgeDollarUsd, 5_000 / 9_990_000);
});

test("assurance funding receipt parses cents and probability basis points exactly", () => {
  assert.equal(parseAssurancePledgeDollars("9.99"), 999);
  assert.equal(parseAssurancePledgeDollars("1000"), 100_000);
  assert.equal(parseAssuranceProbabilityPercent("0"), 0);
  assert.equal(parseAssuranceProbabilityPercent("20.25"), 2_025);
  assert.equal(parseAssuranceProbabilityPercent("100.00"), 10_000);
  assert.equal(parseAssurancePledgeDollars("9.999"), null);
  assert.equal(parseAssuranceProbabilityPercent("100.01"), null);
  assert.equal(parseAssuranceProbabilityPercent(""), null);
});

test("assurance funding receipt rejects invalid or misleading scenario inputs", () => {
  for (const input of [
    { pledgeCents: 0, decisiveProbabilityBasisPoints: 2_000 },
    { pledgeCents: 99, decisiveProbabilityBasisPoints: 2_000 },
    { pledgeCents: 100_001, decisiveProbabilityBasisPoints: 2_000 },
    { pledgeCents: 10_000.5, decisiveProbabilityBasisPoints: 2_000 },
    { pledgeCents: 10_000, decisiveProbabilityBasisPoints: -1 },
    { pledgeCents: 10_000, decisiveProbabilityBasisPoints: 10_001 },
  ]) {
    const result = calculateAssuranceFundingReceipt(input);
    assert.equal(result.ok, false);
  }
});

test("assurance funding receipt rejects a scenario whose fixed-point product would overflow", () => {
  const result = calculateAssuranceFundingReceipt({
    scenarioPoolTargetCents: Number.MAX_SAFE_INTEGER,
    pledgeCents: 100,
    decisiveProbabilityBasisPoints: 10_000,
  });

  assert.deepEqual(result, {
    ok: false,
    error: "This scenario is too large to calculate safely.",
  });
});

test("public assurance receipt preserves the educational and no-live-data boundary", () => {
  const page = readFileSync("src/app/mpgf/page.tsx", "utf8");
  const component = readFileSync(
    "src/components/mpgf/mpgf-assurance-funding-receipt.tsx",
    "utf8",
  );

  assert.match(page, /id="assurance-funding"/);
  assert.match(page, /MpgfAssuranceFundingReceipt/);
  assert.match(component, /Expected other funding per \$1 pledged/);
  assert.match(component, /Your estimated chance this pledge would be decisive/);
  assert.match(component, /Funding estimate, not an impact guarantee/);
  assert.match(ASSURANCE_FUNDING_RECEIPT_BOUNDARY, /You supplied the decisive-chance estimate/);
  assert.match(ASSURANCE_FUNDING_RECEIPT_BOUNDARY, /does not use live round progress/);
  assert.equal(component.includes("you were pivotal"), false);
  assert.equal(component.includes("liveThreshold"), false);
  assert.equal(component.includes("roundId"), false);
});
