import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const authenticatedBrowserSpec = readFileSync(
  "tests/feed-create-phase1-authenticated.spec.ts",
  "utf8",
);

function occurrences(source: string, fragment: string) {
  return source.split(fragment).length - 1;
}

test("the authenticated review assertion stays scoped to the named region and complete disclosure", () => {
  const namedRegion = [
    'const review = page.getByRole("region", {',
    '    name: "Confirm each material field separately.",',
    "  });",
  ].join("\n");
  const completeDisclosure =
    "Editing an imported field clears its confirmation. These confirmations are stored; the Feed match score and reasons are not.";
  const completeExactAssertion = [
    "review.getByText(",
    `      "${completeDisclosure}",`,
    "      { exact: true },",
  ].join("\n");
  const staleExactAssertion = [
    "review.getByText(",
    '      "These confirmations are stored; the Feed match score and reasons are not.",',
    "      { exact: true },",
  ].join("\n");

  assert.equal(occurrences(authenticatedBrowserSpec, namedRegion), 1);
  assert.equal(occurrences(authenticatedBrowserSpec, completeDisclosure), 1);
  assert.equal(authenticatedBrowserSpec.includes(completeExactAssertion), true);
  assert.equal(
    authenticatedBrowserSpec.includes(
      'const review = page.locator("section").filter({',
    ),
    false,
  );
  assert.equal(authenticatedBrowserSpec.includes(staleExactAssertion), false);
});
