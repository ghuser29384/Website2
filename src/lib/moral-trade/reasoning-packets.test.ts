import assert from "node:assert/strict";
import test from "node:test";

import { GET as reasoningPacketsRoute } from "../../app/api/moral-trade/reasoning/packets/route";
import {
  MORAL_TRADE_REASONING_PACKET_FILTERS,
  buildMoralTradeReasoningPacketRoutePayload,
  filterMoralTradeReasoningPackets,
  getMoralTradeReasoningPacketFilterCounts,
  getMoralTradeReasoningPacketFilterKey,
  getMoralTradeReasoningPacketContract,
  getMoralTradeReasoningPacketRecoveryContract,
  getMoralTradeReasoningPackets,
  validateMoralTradeReasoningPacketContract,
  type MoralTradeReasoningPacketContract,
} from "./reasoning-packets";

test("reasoning packets publish deterministic structured review output", () => {
  const packets = getMoralTradeReasoningPackets();
  const contract = getMoralTradeReasoningPacketContract(packets);
  const validation = validateMoralTradeReasoningPacketContract(contract, packets);

  assert.equal(validation.status, "pass");
  assert.equal(packets.length, 5);
  assert.equal(contract.packetCount, packets.length);
  assert.ok(packets.every((packet) => packet.href.startsWith("/offers/examples/")));
  assert.ok(packets.every((packet) => packet.factorCodes.includes("no_global_moral_ranking")));
  assert.ok(packets.every((packet) => packet.decisionSteps.length >= 8));
  assert.ok(packets.every((packet) => packet.decisionSteps.some((step) => step.key === "privacy_redaction")));
  assert.ok(packets.every((packet) => packet.evidenceRows.length > 0));
  assert.ok(packets.some((packet) => packet.uncertaintyFlags.length > 0));
  assert.ok(
    contract.contractTests.includes("reasoning_packets_api_route_smoke"),
  );
  assert.ok(
    contract.contractTests.includes("reasoning_packets_recovery_payload_smoke"),
  );
});

test("reasoning packet contract preserves linked validator contracts", () => {
  const contract = getMoralTradeReasoningPacketContract();
  const validation = validateMoralTradeReasoningPacketContract(contract);

  assert.equal(validation.status, "pass");
  assert.ok(contract.linkedContracts.reviewWorkflowContractVersion);
  assert.ok(contract.linkedContracts.provenanceSchemaVersion);
  assert.ok(contract.linkedContracts.reviewWorkflowCardCount >= 6);
  assert.ok(contract.linkedContracts.provenanceValidationRuleCount >= 5);
  assert.equal(contract.linkedContracts.provenanceSampleBundleStatus, "pass");
  assert.ok(contract.supportedFilters.some((filter) => filter.key === "needs-evidence"));
  assert.equal(contract.filterCounts.all, contract.packetCount);
});

test("reasoning packet filters expose inspectable public subsets", () => {
  const packets = getMoralTradeReasoningPackets();
  const counts = getMoralTradeReasoningPacketFilterCounts(packets);
  const needsEvidencePackets = filterMoralTradeReasoningPackets(packets, "needs-evidence");
  const passWithLimitsPackets = filterMoralTradeReasoningPackets(packets, "pass-with-limits");
  const blockedPackets = filterMoralTradeReasoningPackets(packets, "blocked");

  assert.deepEqual(
    MORAL_TRADE_REASONING_PACKET_FILTERS.map((filter) => filter.key),
    ["all", "needs-evidence", "human-review", "blocked", "pass-with-limits"],
  );
  assert.equal(getMoralTradeReasoningPacketFilterKey("not-a-real-filter"), "all");
  assert.equal(getMoralTradeReasoningPacketFilterKey(["needs-evidence"]), "needs-evidence");
  assert.equal(counts.all, packets.length);
  assert.equal(counts["needs-evidence"], needsEvidencePackets.length);
  assert.equal(counts["pass-with-limits"], passWithLimitsPackets.length);
  assert.equal(counts.blocked, blockedPackets.length);
  assert.equal(needsEvidencePackets.length, 1);
  assert.ok(needsEvidencePackets.every((packet) => packet.statusCode === "needs_evidence"));
  assert.ok(passWithLimitsPackets.length > 0);
  assert.ok(passWithLimitsPackets.every((packet) => packet.statusCode === "matchable"));
  assert.equal(blockedPackets.length, 0);
});

test("reasoning packet API applies public status filters", async () => {
  const response = await reasoningPacketsRoute(
    new Request("http://localhost/api/moral-trade/reasoning/packets?status=needs-evidence"),
  );
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.equal(payload.ok, true);
  assert.equal(payload.recoveryMode, "normal");
  assert.equal(payload.activeFilter, "needs-evidence");
  assert.equal(payload.packetCount, 5);
  assert.equal(payload.filteredPacketCount, 1);
  assert.equal(payload.filterCounts.all, 5);
  assert.equal(payload.filterCounts["needs-evidence"], 1);
  assert.equal(payload.publicContract.filterCounts["pass-with-limits"], 4);
  assert.ok(
    payload.publicContract.supportedFilters.some(
      (filter: { key: string }) => filter.key === "blocked",
    ),
  );
  assert.equal(payload.packets.length, 1);
  assert.equal(payload.packets[0].sourceOfferId, "seed-lina");
});

test("reasoning packet payload fails closed when packet generation fails", () => {
  const payload = buildMoralTradeReasoningPacketRoutePayload({
    status: "needs-evidence",
    checkedAt: "2026-05-31T00:00:00.000Z",
    packetBuilder() {
      throw new Error("simulated packet builder failure with internal details");
    },
  });
  const recoveryContract = getMoralTradeReasoningPacketRecoveryContract();

  assert.equal(payload.ok, false);
  assert.equal(payload.recoveryMode, "packet_generation_failed");
  assert.equal(payload.checkedAt, "2026-05-31T00:00:00.000Z");
  assert.equal(payload.activeFilter, "needs-evidence");
  assert.equal(payload.packetCount, 0);
  assert.equal(payload.filteredPacketCount, 0);
  assert.equal(payload.filterCounts.all, 0);
  assert.deepEqual(payload.packets, []);
  assert.equal(payload.publicContract.packetCount, 0);
  assert.deepEqual(payload.publicContract.samplePacketIds, []);
  assert.deepEqual(payload.publicContract.linkedContracts, recoveryContract.linkedContracts);
  assert.ok(payload.blockers.includes("packet_generation_failed"));
  assert.ok(payload.validation.blockers.includes("packet_generation_failed"));
  assert.equal(JSON.stringify(payload).includes("simulated packet builder failure"), false);
  assert.match(JSON.stringify(payload), /validator blockers/i);
  assert.match(JSON.stringify(payload), /no state mutation/i);
});

test("reasoning packet validation fails when public packet safeguards are weakened", () => {
  const packets = getMoralTradeReasoningPackets();
  const contract: MoralTradeReasoningPacketContract = {
    ...getMoralTradeReasoningPacketContract(packets),
    invariants: ["Packets can include private offer exports."],
    contractTests: [],
  };
  const weakenedPackets = [
    {
      ...packets[0],
      factorCodes: packets[0].factorCodes.filter(
        (code) => code !== "no_global_moral_ranking",
      ),
      evidenceRows: [],
      decisionSteps: [],
      href: "/offers/private/secret",
      contractSources: ["canonical_worked_case_offer"],
    },
    ...packets.slice(1),
  ];
  const validation = validateMoralTradeReasoningPacketContract(
    contract,
    weakenedPackets,
  );

  assert.equal(validation.status, "fail");
  assert.ok(validation.blockers.some((blocker) => blocker.includes("evidence-and-uncertainty-output")));
  assert.ok(validation.blockers.some((blocker) => blocker.includes("factor-code-and-next-step-output")));
  assert.ok(validation.blockers.some((blocker) => blocker.includes("decision-step-output")));
  assert.ok(validation.blockers.some((blocker) => blocker.includes("public-link-and-contract-source")));
  assert.ok(validation.blockers.some((blocker) => blocker.includes("privacy-and-no-hidden-reasoning")));
  assert.ok(validation.blockers.some((blocker) => blocker.includes("contract-tests")));
});
