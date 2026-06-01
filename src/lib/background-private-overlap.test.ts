import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import test from "node:test";

import {
  getBackgroundPrivateOverlapContract,
  validateBackgroundPrivateOverlapContract,
} from "@/lib/background-private-overlap";

test("private-overlap contract is design-review-only and not live-ready", () => {
  const contract = getBackgroundPrivateOverlapContract();
  const validation = validateBackgroundPrivateOverlapContract(contract);

  assert.equal(validation.status, "pass");
  assert.equal(validation.liveReady, false);
  assert.deepEqual(validation.blockers, []);
  assert.equal(contract.releaseState, "design_review_only");
  assert.equal(contract.liveEndpointEnabled, false);
  assert.equal(contract.storageState, "not_created");
  assert.ok(contract.requiredReviews.some((review) => /formal cryptographic/i.test(review)));
  assert.ok(contract.requiredReviews.some((review) => /DPIA/i.test(review)));
});

test("private-overlap contract rejects live endpoints before review", () => {
  const contract = getBackgroundPrivateOverlapContract();
  const weakened = {
    ...contract,
    liveEndpointEnabled: true,
  } as unknown as typeof contract;

  const validation = validateBackgroundPrivateOverlapContract(weakened);

  assert.equal(validation.status, "fail");
  assert.ok(validation.blockers.some((blocker) => blocker.includes("design-only-release-state")));
});

test("private-overlap contract rejects free-text namespaces and raw stored fields", () => {
  const contract = getBackgroundPrivateOverlapContract();
  const unsafeNamespace = {
    ...contract,
    namespaceRules: [
      ...contract.namespaceRules,
      {
        allowedSource: "free text notes",
        key: "free_text" as never,
        label: "Free text",
        rawValueRetention: "forbidden",
        storedRepresentation: "blinded_token_only",
      },
    ],
  };
  const unsafeStorage = {
    ...contract,
    futureStoredFields: [...contract.futureStoredFields, "raw_tag"],
  };

  assert.equal(validateBackgroundPrivateOverlapContract(unsafeNamespace).status, "fail");
  assert.equal(validateBackgroundPrivateOverlapContract(unsafeStorage).status, "fail");
});

test("private-overlap contract rejects missing cryptographic review", () => {
  const contract = getBackgroundPrivateOverlapContract();
  const weakened = {
    ...contract,
    requiredReviews: contract.requiredReviews.filter(
      (review) => !/formal cryptographic design review/i.test(review),
    ),
  };

  const validation = validateBackgroundPrivateOverlapContract(weakened);

  assert.equal(validation.status, "fail");
  assert.ok(validation.blockers.some((blocker) => blocker.includes("review-gates")));
});

test("private-overlap live route handlers are not shipped", () => {
  const liveRoutePaths = [
    "src/app/api/background/private-overlap/evaluate/route.ts",
    "src/app/api/background/private-overlap/refresh-tokens/route.ts",
    "src/app/api/background/private-overlap/tokens/route.ts",
  ];

  for (const routePath of liveRoutePaths) {
    assert.equal(existsSync(routePath), false, `${routePath} must remain unimplemented`);
  }
});
