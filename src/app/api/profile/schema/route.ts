import {
  buildMoralTradeApiJsonResponse,
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

  return buildMoralTradeApiJsonResponse(
    {
      exportVersion: "background-networking-v7",
      importableCollections: [
        "backgroundProfilePackage",
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
      exportOnlyCollections: ["backgroundIntentClaims"],
      notes: [
        "Imports are scoped to the signed-in user only.",
        "Background profile packages use schemaVersion background-profile-package-v1 and import only broad preview fields, allowed tags, approved-summary metadata, retention metadata, and provenance hashes.",
        "Private wish entries, profile-sensitive text, source notes, connection summaries, and regenerated synthesis text are encrypted on write when imported.",
        "Background profile packages exclude raw source text, contact details before the introduced stage, exact wishes by default, analytics identifiers, and operator-only audit notes.",
        "Profile source notes carry retention_expires_at; expired or inactive source notes are excluded from deterministic synthesis.",
        "Source connections can carry structured allowed_field_keys, retention_expires_at, and ai_shadow_mode_allowed metadata; raw_ingestion_allowed is forced false on import.",
        "Saved searches may include public /offers filter metadata for cause-follow and live-offer notification workflows.",
        "Counterparty-linked records such as privacy grants, privacy access requests, match suggestions, introduction tasks, and agreements are not imported through this endpoint.",
        "After import, deterministic synthesis is refreshed from the imported records.",
        "Background intent claims are deterministic owner-scoped summaries; imports regenerate them instead of trusting portable claim rows.",
      ],
    },
    "public_contract_static",
  );
}
