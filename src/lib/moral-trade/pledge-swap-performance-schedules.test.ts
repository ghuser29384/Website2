import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import { POST as enforcePerformanceSchedule } from "@/app/api/moral-trade/pledge-swap-performance-schedules/enforce/route";

import {
  evaluateMoralTradePledgeSwapPerformanceSchedules,
  getMoralTradePledgeSwapPerformanceScheduleContract,
  validateMoralTradePledgeSwapPerformanceScheduleContract,
  type MoralTradePledgeSwapPerformanceScheduleEvaluationInput,
} from "./pledge-swap-performance-schedules";

const CHECKED_AT = "2026-06-13T12:00:00.000Z";

function readRepoFile(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

function passingInput(
  overrides: Partial<MoralTradePledgeSwapPerformanceScheduleEvaluationInput> = {},
): MoralTradePledgeSwapPerformanceScheduleEvaluationInput {
  return {
    checkedAt: CHECKED_AT,
    performanceScheduleRequired: true,
    schedules: [
      {
        breachRemedyPolicyRef: "policy:breach-remedy:v1",
        checkpointSchedule: [
          { checkpoint: "week-1", dueAt: "2026-06-20T00:00:00.000Z" },
        ],
        counterpartNonperformanceSuspensionRule:
          "Future duties suspend after a missed checkpoint until cure or reciprocal release.",
        createdAt: CHECKED_AT,
        clearedTradeAgreementRef: null,
        evidenceDueSchedule: [
          { checkpoint: "week-1", evidenceDueAt: "2026-06-21T00:00:00.000Z" },
        ],
        graceOrCurePeriodDays: 3,
        matchedTradeLockProposalRef: "matched-lock:demo",
        performanceEndAt: "2026-07-13T00:00:00.000Z",
        performanceSchedulePolicyRef: "policy:pledge-swap-performance:v1",
        performanceStartAt: "2026-06-13T00:00:00.000Z",
        pledgeSwapOfferId: "pledge-swap:demo",
        publicBreachDisclosureAllowed: false,
        reciprocalReleaseTrigger:
          "Completion, mutual release, uncured counterparty nonperformance, or neutral review decision.",
        recordId: "pledge-swap-performance-schedule:lock",
        reviewerDecisionRef: "review:performance-schedule",
        scheduleState: "locked",
        synchronizedStartRequired: true,
        updatedAt: CHECKED_AT,
      },
    ],
    transition: "matched_trade_lock",
    ...overrides,
  };
}

test("pledge-swap performance-schedule contract validates synchronization hooks", () => {
  const contract = getMoralTradePledgeSwapPerformanceScheduleContract();
  const validation = validateMoralTradePledgeSwapPerformanceScheduleContract(contract);

  assert.equal(validation.status, "pass");
  assert.deepEqual(validation.blockers, []);
  assert.ok(contract.firstClassRecordTables.includes("moral_trade_pledge_swap_performance_schedules"));
  assert.ok(contract.firstClassRecordTables.includes("moral_trade_pledge_swap_performance_schedule_enforcement_records"));
  assert.ok(contract.releaseGateTestHooks.includes("pledge_swap_synchronized_performance_test"));
  assert.match(contract.synchronizationRule, /synchronized/i);
  assert.match(contract.nonPunitiveBreachRule, /public shaming/i);
  assert.match(contract.reciprocalReleaseRule, /reciprocally released/i);
  assert.ok(contract.sampleEvaluations.some((sample) => sample.status === "pass"));
  assert.ok(contract.sampleEvaluations.some((sample) => sample.status === "blocked"));
});

test("locked synchronized schedule passes matched-trade lock", () => {
  const result = evaluateMoralTradePledgeSwapPerformanceSchedules(passingInput());

  assert.equal(result.status, "pass");
  assert.equal(result.scheduleCount, 1);
  assert.equal(result.nonBlockingScheduleCount, 1);
  assert.equal(result.synchronizedScheduleCount, 1);
  assert.equal(result.reciprocalReleaseScheduleCount, 1);
  assert.deepEqual(result.blockers, []);
});

test("unsynchronized punitive schedule fails public metric publication", () => {
  const result = evaluateMoralTradePledgeSwapPerformanceSchedules(
    passingInput({
      schedules: [
        {
          ...passingInput().schedules[0],
          publicBreachDisclosureAllowed: true,
          reciprocalReleaseTrigger: "",
          scheduleState: "active",
          synchronizedStartRequired: false,
        },
      ],
      transition: "public_metric_publication",
    }),
  );

  assert.equal(result.status, "blocked");
  assert.ok(
    result.blockers.includes(
      "pledge_swap_performance_schedule_synchronized_start_missing:pledge-swap-performance-schedule:lock",
    ),
  );
  assert.ok(
    result.blockers.includes(
      "pledge_swap_performance_schedule_reciprocal_release_missing:pledge-swap-performance-schedule:lock",
    ),
  );
  assert.ok(
    result.blockers.includes(
      "pledge_swap_performance_schedule_public_breach_disclosure_blocking:pledge-swap-performance-schedule:lock",
    ),
  );
  assert.ok(
    result.blockers.includes(
      "pledge_swap_performance_schedule_not_completion_ready:pledge-swap-performance-schedule:lock:active",
    ),
  );
});

test("performance-schedule enforcement route fails closed on invalid JSON", async () => {
  const response = await enforcePerformanceSchedule(
    new Request("http://localhost/api/moral-trade/pledge-swap-performance-schedules/enforce", {
      body: "{",
      headers: { "content-type": "application/json" },
      method: "POST",
    }),
  );
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(body.ok, false);
  assert.equal(body.performanceScheduleGateStatus, "blocked");
  assert.equal(body.runtimeTransitionAllowed, false);
  assert.equal(body.matchedTradeLockAllowed, false);
  assert.equal(body.performanceStartAllowed, false);
  assert.equal(body.checkpointEvidenceAllowed, false);
  assert.equal(body.performanceReleaseAllowed, false);
  assert.equal(body.breachRemedyAllowed, false);
  assert.equal(body.reciprocalReleaseAllowed, false);
  assert.equal(body.publicMetricPublicationAllowed, false);
  assert.equal(body.releaseGatePromotionAllowed, false);
  assert.equal(body.stateMutation, false);
  assert.deepEqual(body.blockers, ["invalid_json_body"]);
});

test("performance-schedule wiring covers API profile, rate limits, database tables, and schema", () => {
  const apiContractSource = readRepoFile("src/lib/moral-trade/api-contract.ts");
  const apiProfile = readRepoFile("config/moral-trade/api-contract-profile.json");
  const rateLimitSource = readRepoFile("src/lib/moral-trade/api-rate-limit.ts");
  const operationsSource = readRepoFile("src/lib/moral-trade/operations.ts");
  const operationsProfile = readRepoFile("config/moral-trade/operations-profile.json");
  const databaseTypes = readRepoFile("src/lib/supabase/database.types.ts");
  const migration = readRepoFile(
    "supabase/migrations/20260613_moral_trade_pledge_swap_performance_schedule_records.sql",
  );
  const schema = readRepoFile("supabase/schema.sql");
  const releaseGates = readRepoFile("src/lib/moral-trade/release-gates.ts");

  assert.match(apiContractSource, /moral_trade_pledge_swap_performance_schedule_contract/);
  assert.match(apiContractSource, /moral_trade_pledge_swap_performance_schedule_enforce/);
  assert.match(apiProfile, /pledge_swap_performance_schedule_contract_response/);
  assert.match(apiProfile, /pledge_swap_performance_schedule_enforce_request/);
  assert.match(apiProfile, /pledge_swap_performance_schedule_enforce_response/);
  assert.match(apiProfile, /pledge_swap_performance_schedule_enforce_route_contract/);
  assert.match(rateLimitSource, /pledge_swap_performance_schedule_enforce/);
  assert.match(operationsSource, /pledge_swap_performance_schedule_enforce/);
  assert.match(operationsProfile, /"key": "pledge_swap_performance_schedule_enforce"/);
  assert.match(databaseTypes, /moral_trade_pledge_swap_performance_schedules/);
  assert.match(databaseTypes, /moral_trade_pledge_swap_performance_schedule_enforcement_records/);
  assert.match(migration, /create table if not exists public\.moral_trade_pledge_swap_performance_schedules/);
  assert.match(migration, /create table if not exists public\.moral_trade_pledge_swap_performance_schedule_enforcement_records/);
  assert.match(migration, /'pledge_swap_performance'/);
  assert.match(migration, /check \(synchronized_start_required_bool = true\)/);
  assert.match(migration, /check \(public_breach_disclosure_allowed_bool = false\)/);
  assert.match(migration, /check \(breach_remedy_allowed_bool = false\)/);
  assert.match(schema, /moral_trade_pledge_swap_performance_schedule_enforcement_records/);
  assert.match(schema, /moral_trade_pledge_swap_performance_schedules/);
  assert.match(releaseGates, /pledge_swap_synchronized_performance_test/);
});
