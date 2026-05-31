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
  assert.ok(validation.canonicalInstructionHash?.startsWith("sha256:"));
  assert.equal(validation.sourceStackCount, profile.sourceStackReferences.length);
  assert.ok(profile.sourceStackReferences.length >= 12);
  assert.ok(
    profile.sourceStackReferences.some(
      (source) =>
        source.key === "w3c_prov" &&
        source.evidenceFiles.includes("src/lib/moral-trade/provenance.ts") &&
        source.routeEvidence.includes("/api/moral-trade/provenance/schema"),
    ),
  );
  assert.ok(
    profile.sourceStackReferences.some(
      (source) =>
        source.key === "nist_ai_rmf_xai" &&
        source.evidenceFiles.includes("src/lib/moral-trade/ai-governance.ts") &&
        source.routeEvidence.includes("/api/moral-trade/ai-governance/health"),
    ),
  );
  assert.equal(validation.sourceDocumentArtifacts.length, 2);
  assert.ok(
    validation.sourceDocumentArtifacts.every(
      (artifact) => artifact.artifactHash?.startsWith("sha256:") && artifact.hashMatches,
    ),
  );
  assert.equal(profile.sourceDocuments.length, 2);
  assert.equal(
    profile.canonicalInstruction.path,
    "docs/moral-trade/codex-build-instruction.md",
  );
  assert.ok(
    profile.canonicalInstruction.verificationCommands.some((command) =>
      command.includes("src/lib/moral-trade/*.test.ts"),
    ),
  );
  assert.ok(profile.canonicalInstruction.verificationCommands.includes("npm run lint"));
  assert.ok(profile.canonicalInstruction.verificationCommands.includes("git diff --check"));
  assert.ok(
    profile.canonicalInstruction.routeEvidence.includes(
      "/api/moral-trade/document-coverage/health",
    ),
  );
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
        : source.key === "moral_trade_feature_audit_pdf"
          ? {
              ...source,
              expectedSha256: "sha256:thishashshouldnotmatch",
            }
        : source,
    ),
    canonicalInstruction: {
      ...profile.canonicalInstruction,
      requiredPhrases: [
        ...profile.canonicalInstruction.requiredPhrases,
        "this instruction phrase should not exist",
      ],
      verificationCommands: [
        ...profile.canonicalInstruction.verificationCommands,
        "npm run impossible-moral-trade-check",
      ],
    },
    sourceStackReferences: profile.sourceStackReferences.map((source) =>
      source.key === "nist_ai_rmf_xai"
        ? {
            ...source,
            evidenceFiles: [
              ...source.evidenceFiles,
              "src/lib/moral-trade/missing-nist-governance.ts",
            ],
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
        entry.id === "source-artifact:moral_trade_feature_audit_pdf" &&
        entry.status === "fail" &&
        entry.evidence.includes("sha256:thishashshouldnotmatch"),
    ),
  );
  assert.ok(
    validation.checks.some(
      (entry) =>
        entry.id === "instruction:canonical-build" &&
        entry.status === "fail" &&
        entry.evidence.includes("npm run impossible-moral-trade-check"),
    ),
  );
  assert.ok(
    validation.checks.some(
      (entry) =>
        entry.id === "source-stack:nist_ai_rmf_xai" &&
        entry.status === "fail" &&
        entry.evidence.includes("src/lib/moral-trade/missing-nist-governance.ts"),
    ),
  );
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
  assert.equal(body.sourceDocumentArtifacts.length, 2);
  assert.ok(
    body.sourceDocumentArtifacts.every(
      (artifact: { artifactHash: string; hashMatches: boolean }) =>
        artifact.artifactHash.startsWith("sha256:") && artifact.hashMatches,
    ),
  );
  assert.ok(body.canonicalInstruction.artifactHash.startsWith("sha256:"));
  assert.ok(
    body.sourceStackReferences.some(
      (source: { key: string; routeEvidence: string[] }) =>
        source.key === "oecd_due_diligence" &&
        source.routeEvidence.includes("/api/moral-trade/externality/health"),
    ),
  );
  assert.ok(
    body.publicContract.sourceDocuments.every(
      (source: { artifactHash: string; expectedHash: string }) =>
        source.artifactHash.startsWith("sha256:") && source.expectedHash.startsWith("sha256:"),
    ),
  );
  assert.equal(
    body.publicContract.canonicalInstruction.path,
    "docs/moral-trade/codex-build-instruction.md",
  );
  assert.ok(body.publicContract.canonicalInstruction.artifactHash.startsWith("sha256:"));
  assert.ok(
    body.publicContract.canonicalInstruction.verificationCommands.includes("npm run lint"),
  );
  assert.ok(
    body.publicContract.canonicalInstruction.routeEvidence.includes(
      "/api/moral-trade/document-coverage/health",
    ),
  );
  assert.ok(
    body.publicContract.sourceStackReferences.some(
      (source: { key: string; evidenceFiles: string[] }) =>
        source.key === "human_ai_interaction" &&
        source.evidenceFiles.includes("src/lib/moral-trade/copilot.ts"),
    ),
  );
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
