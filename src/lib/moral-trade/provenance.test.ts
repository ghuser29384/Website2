import assert from "node:assert/strict";
import test from "node:test";

import {
  createMoralTradeExternalEntityReference,
  createMoralTradeEvidenceArtifact,
  createMoralTradeTraceabilityEvent,
  MORAL_TRADE_PROVENANCE_OBJECT_SCHEMAS,
  validateMoralTradeProvenanceBundle,
  type MoralTradeEvidenceArtifact,
  type MoralTradeEvidenceClaim,
  type MoralTradeExternalEntityReference,
  type MoralTradeProvenanceActivity,
  type MoralTradeProvenanceAgent,
  type MoralTradeProvenanceBundle,
  type MoralTradeTraceabilityEvent,
} from "./provenance";

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
  assert.ok(MORAL_TRADE_PROVENANCE_OBJECT_SCHEMAS.some((schema) => schema.key === "match_signal"));
  assert.ok(MORAL_TRADE_PROVENANCE_OBJECT_SCHEMAS.some((schema) => schema.key === "traceability_event"));
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

test("traceability events link what, where, why, and agents for external evidence", () => {
  const result = validateMoralTradeProvenanceBundle(
    bundle({
      traceabilityEvents: [traceabilityEvent()],
    }),
    { now },
  );

  assert.equal(result.status, "pass");
  assert.equal(result.blockers.length, 0);
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
