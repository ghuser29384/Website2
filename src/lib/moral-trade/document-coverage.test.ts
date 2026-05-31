import assert from "node:assert/strict";
import test from "node:test";

import {
  getMoralTradeDocumentCoverageProfile,
  validateMoralTradeDocumentCoverageProfile,
  type MoralTradeDocumentCoverageProfile,
} from "@/lib/moral-trade/document-coverage";
import { GET as documentCoverageRoute } from "@/app/api/moral-trade/document-coverage/health/route";

test("document coverage profile maps improvement docs to implementation evidence", () => {
  const profile = getMoralTradeDocumentCoverageProfile();
  const validation = validateMoralTradeDocumentCoverageProfile(profile);

  assert.equal(validation.status, "pass");
  assert.equal(profile.sourceDocuments.length, 2);
  assert.ok(
    profile.sourceDocuments.some(
      (source) =>
        source.path === "moral trade4.md" &&
        source.requiredPhrases.some((phrase) =>
          phrase.includes("public validator suite"),
        ),
    ),
  );
  assert.ok(
    profile.sourceDocuments.some(
      (source) =>
        source.path === "Improving the Moral Trade Feature at MoralTrade.org.pdf" &&
        source.required,
    ),
  );
  assert.ok(
    profile.requirements.some(
      (requirement) =>
        requirement.key === "schema_bound_copilot" &&
        requirement.evidenceFiles.includes("src/lib/moral-trade/copilot.ts") &&
        requirement.routeEvidence.includes("/api/moral-trade/copilot/review"),
    ),
  );
  assert.ok(
    profile.requirements.some(
      (requirement) =>
        requirement.key === "provenance_first_evidence" &&
        requirement.evidenceFiles.includes("src/lib/moral-trade/provenance.ts") &&
        requirement.testFiles.includes("src/lib/moral-trade/provenance.test.ts"),
    ),
  );
  assert.ok(
    profile.nonClaims.some((nonClaim) => /not fabricated/i.test(nonClaim)),
  );
});

test("document coverage validation fails when source phrases or evidence files weaken", () => {
  const profile = getMoralTradeDocumentCoverageProfile();
  const weakened: MoralTradeDocumentCoverageProfile = {
    ...profile,
    sourceDocuments: profile.sourceDocuments.map((source) =>
      source.key === "moral_trade_feature_audit_markdown"
        ? {
            ...source,
            requiredPhrases: [...source.requiredPhrases, "this phrase should not exist"],
          }
        : source,
    ),
    requirements: profile.requirements.map((requirement) =>
      requirement.key === "workflow_cards_factor_codes"
        ? {
            ...requirement,
            evidenceFiles: [...requirement.evidenceFiles, "src/lib/missing-workflow.ts"],
          }
        : requirement,
    ),
  };
  const validation = validateMoralTradeDocumentCoverageProfile(weakened);

  assert.equal(validation.status, "fail");
  assert.ok(validation.blockers.some((blocker) => blocker.includes("source:")));
  assert.ok(
    validation.checks.some(
      (entry) =>
        entry.id === "requirement:workflow_cards_factor_codes" &&
        entry.status === "fail" &&
        entry.evidence.includes("src/lib/missing-workflow.ts"),
    ),
  );
});

test("document coverage route publishes the public contract without private state", async () => {
  const response = await documentCoverageRoute(
    new Request("http://localhost/api/moral-trade/document-coverage/health"),
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.ok, true);
  assert.equal(body.validation.status, "pass");
  assert.ok(
    body.publicContract.requirements.some(
      (requirement: { key: string; routeEvidence: string[] }) =>
        requirement.key === "evaluation_operations_security_performance" &&
        requirement.routeEvidence.includes("/api/moral-trade/security/health"),
    ),
  );
  assert.ok(
    body.publicContract.nonClaims.some((nonClaim: string) =>
      /not live production liquidity/i.test(nonClaim),
    ),
  );
});
