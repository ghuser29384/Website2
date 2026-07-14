import assert from "node:assert/strict";
import test from "node:test";

import { persistMoralTradeEvidenceSubmission } from "./evidence-persistence";

class FakeSupabaseTable {
  private filters: Array<[string, unknown]> = [];
  private insertedRow: Record<string, unknown> | null = null;

  constructor(
    private readonly rows: Map<string, Array<Record<string, unknown>>>,
    private readonly table: string,
  ) {}

  select() {
    return this;
  }

  eq(column: string, value: unknown) {
    this.filters.push([column, value]);
    return this;
  }

  maybeSingle() {
    const row = (this.rows.get(this.table) ?? []).find((candidate) =>
      this.filters.every(([column, value]) => candidate[column] === value),
    );

    return { data: row ?? null, error: null };
  }

  insert(row: Record<string, unknown>) {
    const stored = {
      ...row,
      id: row.id ?? "11111111-1111-4111-8111-111111111111",
    };
    const tableRows = this.rows.get(this.table) ?? [];
    tableRows.push(stored);
    this.rows.set(this.table, tableRows);
    this.insertedRow = stored;

    return {
      data: stored,
      error: null,
      select: () => ({
        single: () => ({ data: this.insertedRow, error: null }),
      }),
    };
  }
}

class FakeSupabase {
  readonly rows = new Map<string, Array<Record<string, unknown>>>();

  from(table: string) {
    return new FakeSupabaseTable(this.rows, table);
  }
}

test("evidence submission persists artifact, claim, traceability, activity, and scoped agent", async () => {
  const supabase = new FakeSupabase();
  const generatedIds = [
    "00000000-0000-4000-8000-000000000001",
    "00000000-0000-4000-8000-000000000002",
    "00000000-0000-4000-8000-000000000003",
    "00000000-0000-4000-8000-000000000004",
  ];
  const result = await persistMoralTradeEvidenceSubmission({
    actorAgentId: "owner-profile-1",
    actorAgentKind: "participant",
    actorLabel: "Owner alias",
    claimScope: "counterfactual_baseline",
    evidenceKind: "prior_intent",
    evidenceUrl: "https://example.org/Baseline?b=2&a=1#private",
    idFactory: () => generatedIds.shift() ?? "00000000-0000-4000-8000-000000000099",
    idempotencyKey: "baseline-bond:offer-1:counterfactual-baseline-evidence",
    offerId: "offer-1",
    ownerProfileId: "owner-profile-1",
    reasonCodes: ["counterfactual_baseline", "baseline_credibility_bond"],
    recordedAt: "2026-05-31T12:00:00.000Z",
    redactionLevel: "reviewer_only",
    subjectId: "offer-1",
    subjectKind: "offer",
    supabase,
  });

  assert.equal(result.error, null);
  assert.equal(result.ids?.agentId, "11111111-1111-4111-8111-111111111111");

  const agents = supabase.rows.get("moral_trade_provenance_agents") ?? [];
  const artifacts = supabase.rows.get("moral_trade_evidence_artifacts") ?? [];
  const claims = supabase.rows.get("moral_trade_evidence_claims") ?? [];
  const claimArtifacts = supabase.rows.get("moral_trade_evidence_claim_artifacts") ?? [];
  const traceabilityEvents = supabase.rows.get("moral_trade_traceability_events") ?? [];
  const activities = supabase.rows.get("moral_trade_provenance_activities") ?? [];

  assert.equal(agents.length, 1);
  assert.equal(artifacts.length, 1);
  assert.equal(claims.length, 1);
  assert.equal(claimArtifacts.length, 1);
  assert.equal(traceabilityEvents.length, 1);
  assert.equal(activities.length, 1);
  assert.equal(agents[0].agent_key, "evidence-submission:participant:owner-profile-1");
  assert.equal(artifacts[0].normalized_locator, "https://example.org/Baseline?a=1&b=2");
  assert.deepEqual(artifacts[0].claim_scopes, ["counterfactual_baseline"]);
  assert.equal(artifacts[0].redaction_level, "reviewer_only");
  assert.equal(claims[0].claim_scope, "counterfactual_baseline");
  assert.equal(claims[0].reviewer_confidence, "low");
  assert.equal(claimArtifacts[0].artifact_id, artifacts[0].id);
  assert.equal(traceabilityEvents[0].business_step, "evidence_uploaded");
  assert.equal(traceabilityEvents[0].disposition, "in_review");
  assert.equal(
    (traceabilityEvents[0].audit_question_answers as { whatHappened: string }).whatHappened,
    "OBSERVE:evidence_uploaded:in_review:offer-1",
  );
  assert.deepEqual(
    (traceabilityEvents[0].audit_question_answers as { whoTouchedIt: string[] }).whoTouchedIt,
    ["11111111-1111-4111-8111-111111111111"],
  );
  assert.equal(
    (traceabilityEvents[0].audit_question_answers as { whenRecorded: string }).whenRecorded,
    "2026-05-31T12:00:00.000Z",
  );
  assert.equal(
    (traceabilityEvents[0].where_recorded as { locator: string }).locator,
    "https://example.org/Baseline?a=1&b=2",
  );
  assert.equal(
    (traceabilityEvents[0].where_recorded as { locationType: string }).locationType,
    "public_log",
  );
  assert.equal(activities[0].kind, "evidence_submitted");
  assert.equal(activities[0].idempotency_key, "baseline-bond:offer-1:counterfactual-baseline-evidence");
});

test("agreement evidence submissions can use an opaque platform locator", async () => {
  const supabase = new FakeSupabase();
  const generatedIds = [
    "00000000-0000-4000-8000-000000000011",
    "00000000-0000-4000-8000-000000000012",
    "00000000-0000-4000-8000-000000000013",
    "00000000-0000-4000-8000-000000000014",
  ];
  const result = await persistMoralTradeEvidenceSubmission({
    actorAgentId: "responder-profile-1",
    actorAgentKind: "counterparty",
    actorLabel: "Responder alias",
    agreementId: "agreement-1",
    claimScope: "factual_action",
    evidenceKind: "attestation",
    evidenceUrl: "moraltrade://agreement-evidence/evidence-item-1",
    idFactory: () => generatedIds.shift() ?? "00000000-0000-4000-8000-000000000099",
    idempotencyKey: "agreement:agreement-1:evidence:evidence-item-1",
    ownerProfileId: "responder-profile-1",
    reasonCodes: ["agreement_evidence", "evidence_manual_attestation"],
    recordedAt: "2026-05-31T12:30:00.000Z",
    redactionLevel: "reviewer_only",
    subjectId: "agreement-1",
    subjectKind: "agreement",
    supabase,
    traceabilityLocationType: "platform",
  });

  assert.equal(result.error, null);

  const artifacts = supabase.rows.get("moral_trade_evidence_artifacts") ?? [];
  const claims = supabase.rows.get("moral_trade_evidence_claims") ?? [];
  const traceabilityEvents = supabase.rows.get("moral_trade_traceability_events") ?? [];
  const activities = supabase.rows.get("moral_trade_provenance_activities") ?? [];

  assert.equal(artifacts[0].agreement_id, "agreement-1");
  assert.equal(artifacts[0].subject_kind, "agreement");
  assert.equal(claims[0].claim_scope, "factual_action");
  assert.equal(
    (traceabilityEvents[0].where_recorded as { locationType: string }).locationType,
    "platform",
  );
  assert.equal(
    (traceabilityEvents[0].audit_question_answers as { whatHappened: string }).whatHappened,
    "OBSERVE:evidence_uploaded:in_review:agreement-1",
  );
  assert.equal(activities[0].idempotency_key, "agreement:agreement-1:evidence:evidence-item-1");
});
