import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("rendered DAC lifecycle assertions match canonical currency and consent-hash formatting", async () => {
  const browserSpec = await readFile("tests/mpgf-dac-product-lifecycle.spec.ts", "utf8");

  assert.ok(
    browserSpec.includes('name: /^\\$25(?:\\.00)? conditional pledge recorded$/'),
    "The post-pledge success assertion must accept canonical whole-dollar and two-decimal USD formatting.",
  );
  assert.ok(
    browserSpec.includes('name: /^\\$25(?:\\.00)? · pledged$/'),
    "The private receipt assertion must accept canonical whole-dollar and two-decimal USD formatting.",
  );
  assert.ok(
    !browserSpec.includes('name: "$25.00 conditional pledge recorded"'),
    "The browser gate must not require a non-canonical trailing .00 after recording a pledge.",
  );
  assert.ok(
    !browserSpec.includes('name: "$25.00 · pledged"'),
    "The browser gate must not require a non-canonical trailing .00 in a private pledge receipt.",
  );
  assert.ok(
    browserSpec.includes("/^Consent: sha256:[0-9a-f]{64}$/"),
    "The private receipt assertion must require the canonical sha256: consent-hash prefix.",
  );
  assert.ok(
    !browserSpec.includes("/^Consent: [0-9a-f]{64}$/"),
    "The browser gate must not expect an unprefixed consent hash.",
  );
  const canonicalReviewerHeading = 'name: "$25 · campaign-ce555555555545558555555555555555"';
  assert.equal(
    browserSpec.split(canonicalReviewerHeading).length - 1,
    3,
    "The reviewer proof must use the canonical whole-dollar pledge amount in every heading selector.",
  );
  assert.ok(
    !browserSpec.includes('$25.00 · campaign-ce555555555545558555555555555555'),
    "The reviewer proof must not require a non-canonical trailing .00.",
  );
  assert.ok(
    browserSpec.includes('page.getByText("$110", { exact: true }).first()'),
    "The successful terminal proof must require canonical whole-dollar formatting.",
  );
  assert.ok(
    browserSpec.includes('page.getByText("$10", { exact: true }).first()'),
    "The lapsed terminal proof must require canonical whole-dollar formatting.",
  );
  assert.ok(!browserSpec.includes('page.getByText("$110.00", { exact: true })'));
  assert.ok(!browserSpec.includes('page.getByText("$10.00", { exact: true })'));
});
