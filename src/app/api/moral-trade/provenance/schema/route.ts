import { NextResponse } from "next/server";

import { getMoralTradeProtocolProfile } from "@/lib/moral-trade/protocol";
import {
  MORAL_TRADE_PROVENANCE_OBJECT_SCHEMAS,
  MORAL_TRADE_PROVENANCE_SCHEMA_VERSION,
} from "@/lib/moral-trade/provenance";

export const dynamic = "force-dynamic";

export async function GET() {
  const profile = getMoralTradeProtocolProfile();

  return NextResponse.json({
    schemaVersion: MORAL_TRADE_PROVENANCE_SCHEMA_VERSION,
    profileVersion: profile.version,
    purpose:
      "Public object contract for Moral Trade evidence artifacts, external entity references, claims, reviewer decisions, privacy-safe match signals, traceability events, provenance activities, and agents.",
    objectSchemas: MORAL_TRADE_PROVENANCE_OBJECT_SCHEMAS,
    validationRules: [
      "Every evidence claim must link to existing artifacts.",
      "Artifact claim scopes must match the claim being reviewed.",
      "Duplicate proof reuse must be explicit, not silent.",
      "Evidence timestamps must be fresh enough for the review context or flagged.",
      "External payment or charity-routing events must link what happened, where it was recorded, why it matters, and which agents touched it.",
      "External charities, providers, and supplier-like entities need stable identifier references, dedupe keys, and verified registry or reviewer status before traceability reliance.",
      "Artifacts and activities must name provenance agents.",
    ],
  });
}
