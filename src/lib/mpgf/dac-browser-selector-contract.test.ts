import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("creator lifecycle proof targets the canonical heading and streamed not-found privacy boundary", async () => {
  const browserSpec = await readFile("tests/mpgf-dac-product-lifecycle.spec.ts", "utf8");
  const canonicalCreatorBlock = [
    'page.getByText("Creator lifecycle receipt", { exact: true }).first()',
    'page.getByRole("heading", { level: 1, name: "QA DAC open for conditional pledges" })',
    'page.getByText("Exact terms are locked", { exact: true })',
  ];

  for (const fragment of canonicalCreatorBlock) {
    assert.ok(browserSpec.includes(fragment), "Missing canonical creator proof fragment: " + fragment);
  }

  assert.ok(
    !browserSpec.includes(
      'page.getByText("Creator lifecycle receipt", { exact: true }).first()).toBeVisible();\n  await expect(page.getByRole("heading", { name: "QA DAC open for conditional pledges" })',
    ),
    "The creator proof must not use a heading selector that matches both the page title and nested campaign title.",
  );

  assert.ok(
    browserSpec.includes("expect([200, 404]).toContain(outsiderResponse?.status())"),
    "A streamed not-found response may be HTTP 200 or 404 depending on when headers commit.",
  );
  assert.ok(
    browserSpec.includes('meta[name=\"robots\"][content*=\"noindex\"]'),
    "The outsider proof must require Next.js not-found noindex metadata.",
  );
  assert.ok(
    !browserSpec.includes("expect(outsiderResponse?.status()).toBe(404)"),
    "The browser proof must not confuse streamed not-found rendering with transport status.",
  );
});
