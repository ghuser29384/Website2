import assert from "node:assert/strict";
import test from "node:test";

import {
  getMoralTradeReasoningPacketContract,
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
  assert.ok(packets.every((packet) => packet.evidenceRows.length > 0));
  assert.ok(packets.some((packet) => packet.uncertaintyFlags.length > 0));
  assert.ok(
    contract.contractTests.includes("reasoning_packets_api_route_smoke"),
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
  assert.ok(validation.blockers.some((blocker) => blocker.includes("public-link-and-contract-source")));
  assert.ok(validation.blockers.some((blocker) => blocker.includes("privacy-and-no-hidden-reasoning")));
  assert.ok(validation.blockers.some((blocker) => blocker.includes("contract-tests")));
});
