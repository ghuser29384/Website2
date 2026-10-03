import assert from "node:assert/strict";
import test from "node:test";

import {
  RELEASE_CLASSIFICATIONS,
  RELEASE_DISPOSITIONS,
  VERIFICATION_ITEMS,
  validateReleasePrBody,
} from "./validate-release-pr-body.mjs";

function checkbox(selected, label) {
  return `- [${selected ? "x" : " "}] **${label}**`;
}

function makeBody({
  classifications = ["Repository-only"],
  dispositions = [
    "Merge after repository gates; no manual production promotion required",
    "Ordinary automatic `main` deployment may occur, but it is not necessary to fix production",
  ],
  source = "User request in the release-policy follow-up conversation.",
  classificationEvidence =
    "The diff changes only GitHub workflow, test, template, and policy files that are not imported by production builds or runtime jobs.",
  deploymentPlan = "Not applicable for this repository-only change.",
  postReleasePlan = "No production smoke test or manual promotion is required.",
  checkedVerification = ["Focused tests passed", "Exact diff inspected for unrelated changes"],
  checksActuallyRun =
    "Executed `node --test scripts/validate-release-pr-body.test.mjs scripts/release-classification-workflow-contract.test.mjs`.",
  productionEvidence = {},
  summary = "Add a release-classification policy check.",
} = {}) {
  const classificationLines = RELEASE_CLASSIFICATIONS.map((label) =>
    checkbox(classifications.includes(label), label),
  ).join("\n");
  const dispositionLines = RELEASE_DISPOSITIONS.map((label) =>
    checkbox(dispositions.includes(label), label),
  ).join("\n");
  const verificationLines = VERIFICATION_ITEMS.map((label) =>
    checkbox(checkedVerification.includes(label), label),
  ).join("\n");

  const evidence = {
    "Merged commit": "",
    "Vercel deployment": "",
    "Target and aliases": "",
    "Canonical URLs checked": "",
    "Runtime-log inspection window": "",
    "Remaining risks or verification limits": "",
    ...productionEvidence,
  };

  return `## Summary

${summary}

## Source of truth

${source}

## Release classification

${classificationLines}

### Classification evidence

${classificationEvidence}

## Release disposition

${dispositionLines}

### Deployment and post-release procedure

- Deployment target / plan: ${deploymentPlan}
- Post-release verification plan: ${postReleasePlan}

## Verification

${verificationLines}

### Checks actually run

${checksActuallyRun}

## Production evidence

${Object.entries(evidence)
  .map(([label, value]) => `- ${label}: ${value}`)
  .join("\n")}
`;
}

function assertValid(body) {
  const result = validateReleasePrBody(body);
  assert.equal(result.valid, true, result.errors.join("\n"));
  return result;
}

function assertInvalid(body, expectedError) {
  const result = validateReleasePrBody(body);
  assert.equal(result.valid, false, "Expected validation to fail.");
  assert.ok(
    result.errors.some((error) => error.includes(expectedError)),
    `Expected an error containing ${JSON.stringify(expectedError)}.\nActual errors:\n${result.errors.join("\n")}`,
  );
  return result;
}

test("accepts a valid runtime-affecting pull request body", () => {
  const result = assertValid(
    makeBody({
      classifications: ["Runtime-affecting"],
      dispositions: ["Explicit production release and post-release smoke test required"],
      classificationEvidence:
        "The change modifies application routing and therefore changes production behavior.",
      deploymentPlan:
        "Deploy the exact merged commit through the moraltrade-site production project and verify its canonical aliases.",
      postReleasePlan:
        "Smoke-test the changed route on desktop and mobile, then inspect runtime errors for the deployment-specific window.",
      checkedVerification: ["Focused tests passed", "Production build passed"],
      checksActuallyRun:
        "Executed `node --test src/lib/example.test.ts` and `npm run build`; both commands passed.",
    }),
  );
  assert.equal(result.parsed.classification, "Runtime-affecting");
});

test("accepts a valid repository-only pull request body", () => {
  const result = assertValid(makeBody());
  assert.equal(result.parsed.classification, "Repository-only");
});

test("rejects a missing release classification", () => {
  assertInvalid(makeBody({ classifications: [] }), "Select exactly one release classification");
});

test("rejects multiple release classifications", () => {
  assertInvalid(
    makeBody({ classifications: ["Runtime-affecting", "Repository-only"] }),
    "Select exactly one release classification",
  );
});

test("rejects a contradictory release disposition", () => {
  assertInvalid(
    makeBody({
      dispositions: [
        "Explicit production release and post-release smoke test required",
        "Merge after repository gates; no manual production promotion required",
      ],
    }),
    "cannot both require and disclaim a manual production release",
  );
});

test("rejects incomplete production evidence when a runtime PR claims deployment", () => {
  assertInvalid(
    makeBody({
      classifications: ["Runtime-affecting"],
      dispositions: ["Explicit production release and post-release smoke test required"],
      classificationEvidence:
        "The change modifies browser-served assets and therefore changes production behavior.",
      deploymentPlan:
        "Deploy the exact merged commit through the moraltrade-site production project.",
      postReleasePlan:
        "Smoke-test the canonical route and inspect deployment-specific runtime errors.",
      summary: "The runtime change was deployed to production and the issue is fixed in production.",
      productionEvidence: {
        "Merged commit": "abc123",
      },
    }),
    "Production evidence field must be completed before making a production claim: Vercel deployment",
  );
});

test("requires a concrete source of truth", () => {
  assertInvalid(makeBody({ source: "Describe the source of truth." }), "Source of truth must contain");
});

test("requires nonempty classification evidence", () => {
  assertInvalid(
    makeBody({ classificationEvidence: "Explain why the selected classification applies." }),
    "Classification evidence must explain",
  );
});

test("requires executed verification evidence", () => {
  assertInvalid(
    makeBody({ checkedVerification: [], checksActuallyRun: "List exact commands and workflow runs." }),
    "Verification must mark at least one check",
  );
});

test("allows a blocked mixed change only with a deployment and post-release plan", () => {
  assertValid(
    makeBody({
      classifications: ["Mixed or uncertain"],
      dispositions: ["Do not merge or deploy yet; blockers remain"],
      classificationEvidence:
        "The diff contains both workflow-only changes and an application file, so it is treated as runtime-affecting.",
      deploymentPlan:
        "Once blockers clear, deploy the exact merged commit to the moraltrade-site production project.",
      postReleasePlan:
        "Verify the affected route and inspect deployment-scoped logs after the eventual release.",
    }),
  );
});

test("rejects production claims on repository-only changes", () => {
  assertInvalid(
    makeBody({ summary: "This repository-only repair was deployed to production." }),
    "Repository-only changes must not be reported as deployed",
  );
});

test("does not treat an explicit non-promotion statement as a production claim", () => {
  assertValid(
    makeBody({ summary: "This change was not promoted to production and requires no runtime release." }),
  );
});
