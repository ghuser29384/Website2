import { NextResponse } from "next/server";

import {
  buildMoralTradeApiRateLimitResponse,
  takeMoralTradeApiRateLimitSlot,
} from "@/lib/moral-trade/api-rate-limit";
import {
  getMoralTradeDataModelProfile,
  validateMoralTradeDataModelProfile,
} from "@/lib/moral-trade/data-model";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const rateLimit = takeMoralTradeApiRateLimitSlot(request, "public_contract_read");

  if (rateLimit.limited) {
    return buildMoralTradeApiRateLimitResponse(
      rateLimit,
      "Rate-limited public contract read returns no contract payload until the window resets.",
    );
  }

  const profile = getMoralTradeDataModelProfile();
  const validation = validateMoralTradeDataModelProfile(profile);

  return NextResponse.json({
    ok: validation.status === "pass",
    checkedAt: new Date().toISOString(),
    profileVersion: profile.version,
    purpose: profile.purpose,
    validation,
    publicContract: {
      entities: profile.entities.map((entity) => ({
        key: entity.key,
        category: entity.category,
        privacyClass: entity.privacyClass,
        requiredFields: entity.requiredFields,
        relationships: entity.relationships,
      })),
      privacyClasses: profile.privacyClasses.map((privacyClass) => privacyClass.key),
      offerRequiredFields: profile.offerRequiredFields,
      relationshipBoundaries: profile.relationshipBoundaries.map((boundary) => boundary.key),
      nonClaims: profile.nonClaims,
      contractTests: profile.contractTests,
    },
    blockers: validation.blockers,
  });
}
