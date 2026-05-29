import { NextResponse } from "next/server";

import {
  buildMoralTradeApiRateLimitResponse,
  takeMoralTradeApiRateLimitSlot,
} from "@/lib/moral-trade/api-rate-limit";
import {
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

  const packets = getMoralTradeReasoningPackets();
  const contract = getMoralTradeReasoningPacketContract(packets);
  const validation = validateMoralTradeReasoningPacketContract(contract, packets);

  return NextResponse.json(
    {
      ok: validation.status === "pass",
      checkedAt: new Date().toISOString(),
      contractVersion: contract.version,
      purpose: contract.purpose,
      validation,
      publicContract: {
        sourceRoute: contract.sourceRoute,
        publicApiRoute: contract.publicApiRoute,
        packetCount: contract.packetCount,
        requiredPacketFields: contract.requiredPacketFields,
        linkedContracts: contract.linkedContracts,
        invariants: contract.invariants,
        samplePacketIds: contract.samplePackets.map((packet) => packet.id),
        contractTests: contract.contractTests,
      },
      packets,
      blockers: validation.blockers,
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
