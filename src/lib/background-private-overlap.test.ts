import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import test from "node:test";

import {
  bucketBackgroundPrivateOverlapCount,
  buildBackgroundPrivateOverlapReceiptPayload,
  evaluateBackgroundPrivateOverlapPilotGate,
  getBackgroundPrivateOverlapContract,
  validateBackgroundPrivateOverlapCheckInput,
  validateBackgroundPrivateOverlapContract,
} from "@/lib/background-private-overlap";

test("private-overlap contract is governance-gated and not production live-ready", () => {
  const contract = getBackgroundPrivateOverlapContract();
  const validation = validateBackgroundPrivateOverlapContract(contract);

  assert.equal(validation.status, "pass");
  assert.equal(validation.liveReady, false);
  assert.deepEqual(validation.blockers, []);
  assert.equal(contract.releaseState, "governance_gated_pilot");
  assert.equal(contract.liveEndpointEnabled, false);
  assert.equal(contract.storageState, "pilot_schema_created");
  assert.ok(contract.plannedEndpoints.some((endpoint) => endpoint.path === "/api/background/private-overlap/check"));
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
  assert.ok(validation.blockers.some((blocker) => blocker.includes("governance-gated-release-state")));
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
        rawValueRetention: "forbidden" as const,
        storedRepresentation: "blinded_token_only" as const,
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

test("private-overlap pilot gate is curated-tag-only and non-production by default", () => {
  const gate = evaluateBackgroundPrivateOverlapPilotGate({
    adminFeatureFlagEnabled: true,
    cryptographicReviewApproved: true,
    dpiaApproved: true,
    environment: "production",
    externalReviewApproved: true,
    namespace: "exact_capability_tag",
    requestedTags: ["grantmaking", "exact wish: contact alice@example.org"],
    threatModelApproved: true,
  });

  assert.equal(gate.allowed, false);
  assert.equal(gate.liveEndpointEnabled, false);
  assert.equal(gate.rawInputsAccepted, false);
  assert.equal(gate.stateMutation, false);
  assert.equal(gate.curatedTagsOnly, true);
  assert.equal(gate.namespace, "exact_capability_tag");
  assert.ok(gate.blockers.includes("production_disabled_until_external_review"));
  assert.ok(gate.blockers.includes("free_text_or_raw_private_tag_rejected"));
});

test("private-overlap check validation rejects free text and raw tag input", () => {
  const validation = validateBackgroundPrivateOverlapCheckInput({
    counterpartyId: "counterparty-1",
    freeText: "Find people like this exact private wish",
    namespace: "capability_tags",
    rawTags: ["animal welfare"],
    stage: "consent",
  });

  assert.equal(validation.namespace, "exact_capability_tag");
  assert.equal(validation.stage, "consent");
  assert.ok(validation.blockers.includes("free_text_rejected"));
  assert.ok(validation.blockers.includes("raw_tag_input_rejected"));
});

test("private-overlap buckets counts and redacted receipt payloads", () => {
  assert.equal(bucketBackgroundPrivateOverlapCount(0), "none");
  assert.equal(bucketBackgroundPrivateOverlapCount(1), "1");
  assert.equal(bucketBackgroundPrivateOverlapCount(3), "2_to_3");
  assert.equal(bucketBackgroundPrivateOverlapCount(4), "4_plus");

  const payload = buildBackgroundPrivateOverlapReceiptPayload({
    blockers: ["dpia_required"],
    namespace: "exact_verification_tag",
    stage: "registry",
  });

  assert.deepEqual(payload, {
    blockers: ["dpia_required"],
    namespace: "exact_verification_tag",
    resultBucket: "blocked",
    stage: "registry",
    storedRawTags: false,
    version: "background-private-overlap-pilot-v0.2-2026-06",
  });
});
