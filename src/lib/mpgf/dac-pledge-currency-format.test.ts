import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("rendered DAC pledge assertions match canonical currency and consent-hash formatting", async () => {
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
});
