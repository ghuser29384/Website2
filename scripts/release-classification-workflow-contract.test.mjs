import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const policyWorkflowPath = ".github/workflows/release-classification.yml";
const selfTestWorkflowPath = ".github/workflows/release-classification-self-test.yml";
const templatePath = ".github/pull_request_template.md";

function read(path) {
  return readFileSync(path, "utf8");
}

test("the required policy workflow executes only current trusted base code", () => {
  const source = read(policyWorkflowPath);

  assert.match(source, /^name: Release classification$/m);
  assert.match(source, /^\s{2}pull_request_target:$/m);
  assert.match(source, /branches: \[main\]/);
  for (const eventType of ["opened", "edited", "synchronize", "reopened", "ready_for_review"]) {
    assert.match(source, new RegExp(`types: \\[[^\\]]*${eventType}`));
  }
  assert.match(source, /^\s{2}statuses: write$/m);
  assert.match(source, /^\s{2}contents: read$/m);
  assert.match(source, /ref: \$\{\{ github\.event\.pull_request\.base\.ref \}\}/);
  assert.doesNotMatch(source, /ref:\s*\$\{\{ github\.event\.pull_request\.base\.sha \}\}/);
  assert.doesNotMatch(source, /ref:\s*\$\{\{ github\.event\.pull_request\.head\.sha \}\}/);
  assert.doesNotMatch(source, /gh pr checkout|refs\/pull\/|npm (?:ci|install)|npx /);
  assert.match(source, /node scripts\/validate-release-pr-body\.mjs/);
});

test("the policy workflow publishes one stable required context only on the PR head", () => {
  const source = read(policyWorkflowPath);

  assert.match(source, /^\s{2}STATUS_CONTEXT: release-classification$/m);
  assert.equal(
    (source.match(/HEAD_SHA: \$\{\{ github\.event\.pull_request\.head\.sha \}\}/g) ?? [])
      .length,
    2,
  );
  assert.match(source, /state pending/);
  assert.match(source, /state=success/);
  assert.match(source, /state=failure/);
  assert.match(source, /if: always\(\)/);

  const statusTargets = [...source.matchAll(/statuses\/\$(\w+)/g)].map((match) => match[1]);
  assert.deepEqual(statusTargets, ["HEAD_SHA", "HEAD_SHA"]);
  assert.doesNotMatch(source, /merge_commit_sha|merge_sha|PR_NUMBER|merge candidate/i);
});

test("the self-test workflow covers every policy implementation file", () => {
  const source = read(selfTestWorkflowPath);
  for (const path of [
    ".github/pull_request_template.md",
    ".github/workflows/release-classification.yml",
    ".github/workflows/release-classification-self-test.yml",
    "docs/release-policy.md",
    "scripts/validate-release-pr-body.mjs",
    "scripts/validate-release-pr-body.test.mjs",
    "scripts/release-classification-workflow-contract.test.mjs",
  ]) {
    assert.ok(source.includes(`"${path}"`), `self-test paths should include ${path}`);
  }
  assert.match(source, /node --test/);
  assert.match(source, /YAML\.parse_file/);
  assert.match(source, /Validate this pull request body/);
});

test("the pull request template exposes every field enforced by the validator", () => {
  const template = read(templatePath);
  for (const heading of [
    "## Source of truth",
    "## Release classification",
    "### Classification evidence",
    "## Release disposition",
    "### Deployment and post-release procedure",
    "## Verification",
    "### Checks actually run",
    "## Production evidence",
  ]) {
    assert.ok(template.includes(heading), `template should include ${heading}`);
  }
  assert.match(template, /Deployment target \/ plan:/);
  assert.match(template, /Post-release verification plan:/);
});
