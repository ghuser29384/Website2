import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import {
  createMoralTradeExternalEntityReference,
  createMoralTradeEvidenceArtifact,
  createMoralTradeTraceabilityEvent,
  getMoralTradeProvenanceContract,
  getMoralTradeProvenanceSampleBundle,
  MORAL_TRADE_PROVENANCE_OBJECT_SCHEMAS,
  validateMoralTradeProvenanceContract,
  validateMoralTradeProvenancePersistenceSql,
  validateMoralTradeProvenanceBundle,
  type MoralTradeEvidenceArtifact,
  type MoralTradeEvidenceClaim,
  type MoralTradeExternalEntityReference,
  type MoralTradeProvenanceActivity,
  type MoralTradeProvenanceAgent,
  type MoralTradeProvenanceBundle,
  type MoralTradeReviewDecision,
  type MoralTradeTraceabilityEvent,
} from "./provenance";

function readRepoFile(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

const submittedAt = "2026-05-01T12:00:00.000Z";
const now = new Date("2026-05-27T12:00:00.000Z");

const participant: MoralTradeProvenanceAgent = {
  id: "agent-participant-1",
  kind: "participant",
  label: "Submitting participant",
};

function externalEntity(overrides: Partial<MoralTradeExternalEntityReference> = {}) {
  return {
    ...createMoralTradeExternalEntityReference({
      id: "entity-charity-1",
      entityType: "charity",
      label: "Example Global Health Charity",
      identifierSystem: "every_org_slug",
      identifier: "Example-Global-Health",
      sourceLocator: "https://www.every.org/example-global-health?utm_source=test",
      verificationStatus: "external_registry_matched",
      redactionLevel: "public",
    }),
    ...overrides,
  } satisfies MoralTradeExternalEntityReference;
}

function artifact(overrides: Partial<MoralTradeEvidenceArtifact> = {}) {
  return {
    ...createMoralTradeEvidenceArtifact({
      id: "artifact-receipt-1",
      kind: "receipt",
      locator: "HTTPS://Example.org/Receipt?b=2&a=1#private",
      mediaType: "text/html",
      claimScopes: ["payment_or_donation_record", "factual_action"],
      submittedAt,
      submittedByAgentId: participant.id,
      redactionLevel: "reviewer_only",
    }),
    ...overrides,
  };
}

function claim(overrides: Partial<MoralTradeEvidenceClaim> = {}) {
  return {
    id: "claim-1",
    proposalId: "proposal-1",
    claimType: "receipt",
    artifactIds: ["artifact-receipt-1"],
    claimScope: "payment_or_donation_record",
    reviewerConfidence: "medium",
    uniquenessChecked: true,
    createdAt: submittedAt,
    ...overrides,
  } satisfies MoralTradeEvidenceClaim;
}

function activity(overrides: Partial<MoralTradeProvenanceActivity> = {}) {
  return {
    id: "activity-upload-1",
    kind: "evidence_submitted",
    at: submittedAt,
    usedEntityIds: [],
    generatedEntityIds: ["artifact-receipt-1"],
    agentIds: [participant.id],
    ...overrides,
  } satisfies MoralTradeProvenanceActivity;
}

function reviewDecision(overrides: Partial<MoralTradeReviewDecision> = {}) {
  return {
    id: "review-decision-1",
    proposalId: "proposal-1",
    outcome: "needs_more",
    reasonCodes: ["evidence_sufficiency"],
    summary: "Evidence remains reviewer-scoped before reliance.",
    reviewerId: participant.id,
    idempotencyKey: "agreement-review-decision:review-decision-1",
    decisionHash: "1".repeat(64),
    createdAt: submittedAt,
    ...overrides,
  } satisfies MoralTradeReviewDecision;
}

function traceabilityEvent(overrides: Partial<MoralTradeTraceabilityEvent> = {}) {
  return {
    ...createMoralTradeTraceabilityEvent({
      id: "trace-event-1",
      eventTime: submittedAt,
      recordedAt: submittedAt,
      action: "OBSERVE",
      businessStep: "payment_recorded",
      disposition: "in_review",
      what: {
        proposalId: "proposal-1",
        artifactIds: ["artifact-receipt-1"],
        claimIds: ["claim-1"],
        amountCents: 2500,
        currency: "USD",
      },
      where: {
        locationType: "charity",
        locator: "https://payments.example.org/receipt?b=2&a=1#private",
        provider: "test payment provider",
        externalEntityId: "entity-charity-1",
      },
      why: {
        reasonCodes: ["payment_or_donation_record"],
        sourceActivityId: "activity-upload-1",
      },
      agentIds: [participant.id],
      redactionLevel: "reviewer_only",
    }),
    ...overrides,
  } satisfies MoralTradeTraceabilityEvent;
}

function bundle(overrides: Partial<MoralTradeProvenanceBundle> = {}) {
  return {
    proposalId: "proposal-1",
    artifacts: [artifact()],
    claims: [claim()],
    reviewDecisions: [],
    activities: [activity()],
    agents: [participant],
    externalEntityReferences: [externalEntity()],
    ...overrides,
  } satisfies MoralTradeProvenanceBundle;
}

test("evidence artifacts normalize locators and get stable hashes", () => {
  const first = artifact();
  const second = createMoralTradeEvidenceArtifact({
    id: "artifact-receipt-2",
    kind: "receipt",
    locator: "https://example.org/Receipt?a=1&b=2",
    mediaType: "text/html",
    claimScopes: ["factual_action", "payment_or_donation_record"],
    submittedAt,
    submittedByAgentId: participant.id,
    redactionLevel: "reviewer_only",
  });

  assert.equal(first.normalizedLocator, "https://example.org/Receipt?a=1&b=2");
  assert.equal(first.sha256, second.sha256);
  assert.equal(first.sha256.length, 64);
});

test("provenance bundles pass with entity/activity/agent links", () => {
  const result = validateMoralTradeProvenanceBundle(bundle(), { now });

  assert.equal(result.status, "pass");
  assert.equal(result.blockers.length, 0);
  assert.ok(MORAL_TRADE_PROVENANCE_OBJECT_SCHEMAS.some((schema) => schema.key === "evidence_claim"));
  assert.ok(
    MORAL_TRADE_PROVENANCE_OBJECT_SCHEMAS.some((schema) => schema.key === "external_entity_reference"),
  );
  const matchSignalSchema = MORAL_TRADE_PROVENANCE_OBJECT_SCHEMAS.find(
    (schema) => schema.key === "match_signal",
  );

  assert.ok(matchSignalSchema);
  assert.ok(matchSignalSchema.required.includes("privacyPolicyId"));
  assert.ok(matchSignalSchema.required.includes("disclosureStage"));
  assert.ok(MORAL_TRADE_PROVENANCE_OBJECT_SCHEMAS.some((schema) => schema.key === "traceability_event"));
});

test("review decisions need idempotency keys and valid hashes", () => {
  const missingReviewDecisionHash = validateMoralTradeProvenanceBundle(
    bundle({
      reviewDecisions: [
        reviewDecision({
          decisionHash: "not-a-sha256",
        }),
      ],
    }),
    { now },
  );

  assert.equal(missingReviewDecisionHash.status, "fail");
  assert.ok(missingReviewDecisionHash.blockers.some((blocker) => blocker.includes("artifact-hashes")));
});

test("provenance contract publishes validator-backed sample bundle coverage", () => {
  const contract = getMoralTradeProvenanceContract();
  const validation = validateMoralTradeProvenanceContract(contract);
  const sampleValidation = validateMoralTradeProvenanceBundle(
    getMoralTradeProvenanceSampleBundle(),
    { now: new Date("2026-05-28T12:00:00.000Z") },
  );

  assert.equal(validation.status, "pass");
  assert.equal(sampleValidation.status, "pass");
  assert.ok(contract.validationRules.some((rule) => rule.key === "one-proof-one-claim"));
  assert.ok(contract.validationRules.some((rule) => rule.key === "traceability-events"));
  assert.ok(contract.validationRules.some((rule) => rule.key === "audit-question-answers"));
  assert.ok(contract.validationRules.some((rule) => rule.key === "external-entity-references"));
  assert.ok(
    contract.objectSchemas
      .find((schema) => schema.key === "traceability_event")
      ?.required.includes("auditQuestionAnswers"),
  );
  assert.ok(
    contract.objectSchemas
      .find((schema) => schema.key === "state_transition_event_record")
      ?.required.includes("auditQuestionAnswers"),
  );
  assert.equal(contract.sampleBundleSummary.validationStatus, "pass");
  assert.ok(contract.sampleBundleSummary.reviewDecisionCount > 0);
  assert.ok(
    contract.persistenceTables.some(
      (table) => table.table === "moral_trade_evidence_artifacts",
    ),
  );
  assert.ok(
    contract.persistenceTables.some(
      (table) => table.table === "moral_trade_state_transition_events",
    ),
  );
  assert.ok(contract.contractTests.includes("provenance_persistence_schema_smoke"));
  assert.ok(contract.contractTests.includes("technical_spec_provenance_contract_smoke"));
});

test("provenance persistence SQL is append-only and privacy scoped", () => {
  const validation = validateMoralTradeProvenancePersistenceSql({
    schemaSql: readRepoFile("supabase/schema.sql"),
    migrationSql: readRepoFile(
      "supabase/migrations/20260529_moral_trade_provenance_persistence.sql",
    ),
  });

  assert.equal(validation.status, "pass");
  assert.equal(validation.blockers.length, 0);
  assert.ok(
    validation.checks.some(
      (check) => check.id === "persistence-append-only-policies" && check.status === "pass",
    ),
  );
});

test("external entity references normalize identifiers and produce stable dedupe keys", () => {
  const first = externalEntity();
  const second = createMoralTradeExternalEntityReference({
    id: "entity-charity-2",
    entityType: "charity",
    label: "Example Global Health Charity",
    identifierSystem: "every_org_slug",
    identifier: "example global health",
    sourceLocator: "https://www.every.org/example-global-health?utm_source=test",
    verificationStatus: "external_registry_matched",
    redactionLevel: "public",
  });

  assert.equal(first.normalizedIdentifier, "example-global-health");
  assert.equal(first.dedupeKey, "charity:every_org_slug:example-global-health");
  assert.equal(first.sha256, second.sha256);
  assert.equal(first.sha256.length, 64);
});

test("traceability events link what, where, why, agents, and audit answers for external evidence", () => {
  const event = traceabilityEvent();
  const result = validateMoralTradeProvenanceBundle(
    bundle({
      traceabilityEvents: [event],
    }),
    { now },
  );

  assert.equal(result.status, "pass");
  assert.equal(result.blockers.length, 0);
  assert.equal(event.auditQuestionAnswers.whatHappened, "OBSERVE:payment_recorded:in_review:proposal-1");
  assert.deepEqual(event.auditQuestionAnswers.whoTouchedIt, [participant.id]);
  assert.equal(event.auditQuestionAnswers.whenRecorded, submittedAt);
});

test("traceability events fail when external location or linked evidence is not reviewable", () => {
  const result = validateMoralTradeProvenanceBundle(
    bundle({
      traceabilityEvents: [
        traceabilityEvent({
          normalizedLocator: null,
          what: {
            proposalId: "proposal-1",
            artifactIds: ["missing-artifact"],
            claimIds: ["claim-1"],
          },
          where: {
            locationType: "external_provider",
          },
        }),
      ],
    }),
    { now },
  );

  assert.equal(result.status, "fail");
  assert.ok(result.blockers.some((blocker) => blocker.includes("traceability-events")));
});

test("traceability events require explicit audit-question answers", () => {
  const result = validateMoralTradeProvenanceBundle(
    bundle({
      traceabilityEvents: [
        {
          ...traceabilityEvent(),
          auditQuestionAnswers: {
            whatHappened: "",
            whoTouchedIt: [],
            whenRecorded: "2026-05-01T12:01:00.000Z",
          },
        },
      ],
    }),
    { now },
  );

  assert.equal(result.status, "fail");
  assert.ok(result.blockers.some((blocker) => blocker.includes("audit-question-answers")));
});

test("charity traceability events require verified external entity references", () => {
  const missingEntity = validateMoralTradeProvenanceBundle(
    bundle({
      traceabilityEvents: [
        traceabilityEvent({
          where: {
            locationType: "charity",
            locator: "https://www.every.org/example-global-health",
          },
        }),
      ],
    }),
    { now },
  );
  const unverifiedEntity = validateMoralTradeProvenanceBundle(
    bundle({
      externalEntityReferences: [externalEntity({ verificationStatus: "unverified" })],
      traceabilityEvents: [traceabilityEvent()],
    }),
    { now },
  );
  const duplicateEntity = validateMoralTradeProvenanceBundle(
    bundle({
      externalEntityReferences: [
        externalEntity({ id: "entity-charity-1" }),
        externalEntity({ id: "entity-charity-2" }),
      ],
      traceabilityEvents: [traceabilityEvent()],
    }),
    { now },
  );

  assert.equal(missingEntity.status, "fail");
  assert.ok(missingEntity.blockers.some((blocker) => blocker.includes("external-entity-references")));
  assert.equal(unverifiedEntity.status, "fail");
  assert.ok(unverifiedEntity.blockers.some((blocker) => blocker.includes("external-entity-references")));
  assert.equal(duplicateEntity.status, "fail");
  assert.ok(duplicateEntity.blockers.some((blocker) => blocker.includes("external-entity-references")));
});

test("review decisions must name a known reviewer agent", () => {
  const result = validateMoralTradeProvenanceBundle(
    bundle({
      reviewDecisions: [
        {
          id: "review-decision-1",
          proposalId: "proposal-1",
          outcome: "needs_more",
          reasonCodes: ["evidence_sufficiency"],
          summary: "Reviewer identity is missing from the provenance bundle.",
          reviewerId: "missing-reviewer",
          idempotencyKey: "agreement-review-decision:missing-reviewer",
          decisionHash: "1".repeat(64),
          createdAt: submittedAt,
        },
      ],
    }),
    { now },
  );

  assert.equal(result.status, "fail");
  assert.ok(result.blockers.some((blocker) => blocker.includes("agent-links")));
});

test("wrong-scope evidence cannot satisfy a claim", () => {
  const result = validateMoralTradeProvenanceBundle(
    bundle({
      artifacts: [artifact({ claimScopes: ["factual_action"] })],
      claims: [claim({ claimScope: "counterfactual_baseline" })],
    }),
    { now },
  );

  assert.equal(result.status, "fail");
  assert.ok(result.blockers.some((blocker) => blocker.includes("scope-alignment")));
});

test("duplicate proof reuse must be explicit", () => {
  const result = validateMoralTradeProvenanceBundle(
    bundle({
      claims: [
        claim({ id: "claim-1" }),
        claim({ id: "claim-2", claimScope: "factual_action" }),
      ],
    }),
    { now },
  );

  assert.equal(result.status, "fail");
  assert.ok(result.blockers.some((blocker) => blocker.includes("one-proof-one-claim")));
});

test("stale evidence remains blocked until refreshed or reviewed", () => {
  const result = validateMoralTradeProvenanceBundle(
    bundle({
      artifacts: [artifact({ submittedAt: "2023-01-01T00:00:00.000Z" })],
    }),
    { now, maxArtifactAgeDays: 365 },
  );

  assert.equal(result.status, "fail");
  assert.ok(result.blockers.some((blocker) => blocker.includes("freshness-window")));
});
