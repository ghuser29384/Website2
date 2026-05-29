import { NextResponse } from "next/server";

import {
  buildMoralTradeApiRateLimitResponse,
  takeMoralTradeApiRateLimitSlot,
} from "@/lib/moral-trade/api-rate-limit";
import {
  getMoralTradeApiContractProfile,
  validateMoralTradeApiContractProfile,
} from "@/lib/moral-trade/api-contract";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const rateLimit = takeMoralTradeApiRateLimitSlot(request, "public_contract_read");

  if (rateLimit.limited) {
    return buildMoralTradeApiRateLimitResponse(
      rateLimit,
      "Rate-limited public contract read returns no contract payload until the window resets.",
    );
  }

  const profile = getMoralTradeApiContractProfile();
  const validation = validateMoralTradeApiContractProfile(profile);

  return NextResponse.json({
    ok: validation.status === "pass",
    checkedAt: new Date().toISOString(),
    profileVersion: profile.version,
    purpose: profile.purpose,
    validation,
    publicContract: {
      routes: profile.routes.map((route) => ({
        key: route.key,
        method: route.method,
        path: route.path,
        auth: route.auth,
        privacyClass: route.privacyClass,
        requestSchema: route.requestSchema,
        responseSchema: route.responseSchema,
        rateLimitSurface: route.rateLimitSurface,
        cacheControl: route.cacheControl,
      })),
      schemaDefinitions: profile.schemaDefinitions,
      privacyClasses: profile.privacyClasses.map((entry) => entry.key),
      apiTests: profile.apiTests,
    },
    blockers: validation.blockers,
  });
}
