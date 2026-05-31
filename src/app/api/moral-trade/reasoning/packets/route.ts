import {
  buildMoralTradeApiJsonResponse,
  buildMoralTradeApiRateLimitResponse,
  takeMoralTradeApiRateLimitSlot,
} from "@/lib/moral-trade/api-rate-limit";
import {
  filterMoralTradeReasoningPackets,
  getMoralTradeReasoningPacketFilterKey,
  getMoralTradeReasoningPacketContract,
  getMoralTradeReasoningPackets,
  validateMoralTradeReasoningPacketContract,
} from "@/lib/moral-trade/reasoning-packets";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const rateLimit = takeMoralTradeApiRateLimitSlot(request, "public_contract_read");

  if (rateLimit.limited) {
    return buildMoralTradeApiRateLimitResponse(
      rateLimit,
      "Rate-limited public contract read returns no contract payload until the window resets.",
    );
  }

  const allPackets = getMoralTradeReasoningPackets();
  const activeFilter = getMoralTradeReasoningPacketFilterKey(
    new URL(request.url).searchParams.get("status"),
  );
  const packets = filterMoralTradeReasoningPackets(allPackets, activeFilter);
  const contract = getMoralTradeReasoningPacketContract(allPackets);
  const validation = validateMoralTradeReasoningPacketContract(contract, allPackets);

  return buildMoralTradeApiJsonResponse(
    {
      ok: validation.status === "pass",
      checkedAt: new Date().toISOString(),
      contractVersion: contract.version,
      purpose: contract.purpose,
      activeFilter,
      packetCount: contract.packetCount,
      filteredPacketCount: packets.length,
      filterCounts: contract.filterCounts,
      validation,
      publicContract: {
        sourceRoute: contract.sourceRoute,
        publicApiRoute: contract.publicApiRoute,
        packetCount: contract.packetCount,
        supportedFilters: contract.supportedFilters,
        filterCounts: contract.filterCounts,
        requiredPacketFields: contract.requiredPacketFields,
        linkedContracts: contract.linkedContracts,
        invariants: contract.invariants,
        samplePacketIds: contract.samplePackets.map((packet) => packet.id),
        contractTests: contract.contractTests,
      },
      packets,
      blockers: validation.blockers,
    },
  );
}
