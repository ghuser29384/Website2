import { NextResponse } from "next/server";

import {
  buildMoralTradeApiRateLimitResponse,
  takeMoralTradeApiRateLimitSlot,
} from "@/lib/moral-trade/api-rate-limit";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const rateLimit = takeMoralTradeApiRateLimitSlot(request, "public_contract_read");

  if (rateLimit.limited) {
    return buildMoralTradeApiRateLimitResponse(
      rateLimit,
      "Rate-limited public contract read returns no contract payload until the window resets.",
    );
  }

  return NextResponse.json({
    exportVersion: "background-networking-v5",
    importableCollections: [
      "wishProfile",
      "wishEntries",
      "personalDelegate",
      "sourceConnections",
      "profileSources",
      "helperStrategies",
      "savedSearches",
      "backgroundNotificationPreferences",
      "brokerageBounties",
    ],
    notes: [
      "Imports are scoped to the signed-in user only.",
      "Saved searches may include public /offers filter metadata for cause-follow and live-offer notification workflows.",
      "Counterparty-linked records such as privacy grants, privacy access requests, match suggestions, introduction tasks, and agreements are not imported through this endpoint.",
      "After import, deterministic synthesis is refreshed from the imported records.",
    ],
  });
}
