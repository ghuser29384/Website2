import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import { GET as getPilotEvidenceContract } from "@/app/api/moral-trade/pilot-evidence/contract/route";
import {
  evaluateMoralTradePilotEvidence,
  getMoralTradePilotEvidenceContract,
  validateMoralTradePilotEvidenceContract,
  type MoralTradePilotEvidenceRecord,
} from "@/lib/moral-trade/pilot-evidence";

function readRepoFile(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

function record(
  overrides: Partial<MoralTradePilotEvidenceRecord> = {},
): MoralTradePilotEvidenceRecord {
  return {
    recordId: "pilot-evidence:test",
    pilotTrack: "donation_offset",
    releaseStage: "donation_offset_pilot",
    policyRef: "policy-snapshot:pilot-evidence-v1",
    policyStatus: "resolved_immutable",
    simulationEvidenceHash:
      "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    redTeamEvidenceHash:
      "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    preRegisteredCriteriaHash:
      "sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
    scaleUpCriteria:
      "Scale only after safety, privacy, dispute, and comprehension thresholds pass.",
    pauseCriteria:
      "Pause on unresolved critical safety, privacy, payment, or comprehension findings.",
    rollbackCriteria:
      "Rollback within the reviewed recovery window and preserve append-only evidence.",
    evidenceTypes: [
      "agent_based_market_simulation",
      "adversarial_red_team_review",
      "participant_comprehension_drill",
    ],
    successMetrics: [
      "matched_volume",
      "privacy_leak_rate",
      "dispute_rate",
      "participant_comprehension",
      "rollback_recovery_time",
    ],
    matchedVolumeOnly: false,
    replayRunCount: 8,
    redTeamFindingCount: 2,
    unresolvedCriticalFindingCount: 0,
    resultState: "passed",
    reviewerDecisionRef: "review-decision:pilot-evidence",
    criteriaPublishedAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-06-12T00:00:00.000Z",
    ...overrides,
  };
}

test("pilot-evidence contract validates simulation, red-team, and exit criteria", () => {
  const contract = getMoralTradePilotEvidenceContract();
  const validation = validateMoralTradePilotEvidenceContract(contract);

  assert.equal(validation.status, "pass");
  assert.ok(contract.firstClassRecordTables.includes("moral_trade_pilot_evidence_gates"));
  assert.ok(contract.policySnapshotSubjects.includes("pilot_evidence"));
  assert.ok(contract.pilotTracks.includes("donation_offset"));
  assert.ok(contract.pilotTracks.includes("pledge_swap"));
  assert.ok(contract.evidenceTypes.includes("agent_based_market_simulation"));
  assert.ok(contract.evidenceTypes.includes("adversarial_red_team_review"));
  assert.ok(contract.successMetrics.includes("matched_volume"));
  assert.ok(contract.successMetrics.includes("privacy_leak_rate"));
  assert.match(contract.simulationRule, /market simulation/i);
  assert.match(contract.redTeamRule, /red-team/i);
  assert.match(contract.exitCriteriaRule, /Scale-up, pause, and rollback criteria/i);
  assert.match(contract.matchedVolumeRule, /Matched volume alone cannot satisfy pilot success/i);
});

test("missing pilot evidence fails closed", () => {
  const evaluation = evaluateMoralTradePilotEvidence({
    transition: "donation_offset_payable_promotion",
    evidenceRequired: true,
    checkedAt: "2026-06-12T00:00:00.000Z",
    records: [],
  });

  assert.equal(evaluation.status, "blocked");
  assert.ok(evaluation.blockers.includes("pilot_evidence_missing"));
});

test("matched volume alone cannot satisfy pilot success", () => {
  const evaluation = evaluateMoralTradePilotEvidence({
    transition: "pledge_swap_reliance_promotion",
    evidenceRequired: true,
    checkedAt: "2026-06-12T00:00:00.000Z",
    records: [
      record({
        matchedVolumeOnly: true,
        successMetrics: ["matched_volume"],
      }),
    ],
  });

  assert.equal(evaluation.status, "blocked");
  assert.ok(
    evaluation.blockers.includes(
      "pilot_success_cannot_be_matched_volume_alone:pilot-evidence:test",
    ),
  );
});

test("simulation, red-team, and pre-registered exit criteria can pass", () => {
  const evaluation = evaluateMoralTradePilotEvidence({
    transition: "donation_offset_payable_promotion",
    evidenceRequired: true,
    checkedAt: "2026-06-12T00:00:00.000Z",
    records: [record()],
  });

  assert.equal(evaluation.status, "pass");
  assert.equal(evaluation.passingRecordCount, 1);
  assert.equal(evaluation.simulationEvidenceCount, 1);
  assert.equal(evaluation.redTeamEvidenceCount, 1);
  assert.deepEqual(evaluation.blockers, []);
});

test("pilot-evidence route exposes public contract metadata", async () => {
  const response = await getPilotEvidenceContract(
    new Request("http://localhost/api/moral-trade/pilot-evidence/contract"),
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.ok, true);
  assert.ok(body.publicContract.evidenceTypes.includes("agent_based_market_simulation"));
  assert.ok(body.publicContract.successMetrics.includes("rollback_recovery_time"));
  assert.match(body.publicContract.matchedVolumeRule, /Matched volume alone/i);
  assert.equal(
    body.publicContract.pilotEvidenceSampleEvaluationStatuses.donation_offset_payable_promotion,
    "pass",
  );
  assert.ok(!JSON.stringify(body).includes("simulationEvidenceHash"));
});

test("pilot-evidence contract is wired through API, health, spec, schema, and smoke tests", () => {
  const source = readRepoFile("src/lib/moral-trade/pilot-evidence.ts");
  const route = readRepoFile("src/app/api/moral-trade/pilot-evidence/contract/route.ts");
  const healthRoute = readRepoFile("src/app/api/moral-trade/health/route.ts");
  const technicalSpec = readRepoFile("src/app/moral-trade/technical-spec/page.tsx");
  const apiContractSource = readRepoFile("src/lib/moral-trade/api-contract.ts");
  const apiContractProfile = readRepoFile("config/moral-trade/api-contract-profile.json");
  const releaseGates = readRepoFile("src/lib/moral-trade/release-gates.ts");
  const clearingPreviews = readRepoFile("src/lib/moral-trade/clearing-previews.ts");
  const migration = readRepoFile(
    "supabase/migrations/20260612_zzzz_moral_trade_pilot_evidence_gates.sql",
  );
  const schema = readRepoFile("supabase/schema.sql");
  const databaseTypes = readRepoFile("src/lib/supabase/database.types.ts");
  const smokeTest = readRepoFile("src/lib/public-route-smoke.test.ts");

  assert.match(source, /market_simulation_red_team_test/);
  assert.match(source, /pilot_success_cannot_be_matched_volume_alone/);
  assert.match(route, /validateMoralTradePilotEvidenceContract/);
  assert.match(route, /matchedVolumeRule/);
  assert.match(healthRoute, /pilotEvidenceValidation/);
  assert.match(healthRoute, /pilotEvidenceFirstClassRecordTables/);
  assert.match(technicalSpec, /Pilot evidence gates/);
  assert.match(technicalSpec, /pilot-evidence\/contract/);
  assert.match(apiContractSource, /moral_trade_pilot_evidence_contract/);
  assert.match(apiContractProfile, /pilot_evidence_contract_response/);
  assert.match(releaseGates, /market_simulation_red_team_test/);
  assert.match(releaseGates, /pilot_exit_criteria_test/);
  assert.match(clearingPreviews, /pilotEvidenceStatus/);
  assert.match(migration, /moral_trade_pilot_evidence_gates/);
  assert.match(migration, /pilot_evidence/);
  assert.match(migration, /matched volume alone/i);
  assert.match(schema, /moral_trade_pilot_evidence_gates/);
  assert.match(databaseTypes, /moral_trade_pilot_evidence_gates/);
  assert.match(smokeTest, /pilotEvidenceSource/);
});
