import { NextResponse } from "next/server";

import {
  getMoralTradeSchemaRegistry,
  validateMoralTradeSchemaRegistry,
} from "@/lib/moral-trade/schema-registry";

export const dynamic = "force-dynamic";

export async function GET() {
  const registry = getMoralTradeSchemaRegistry();
  const validation = validateMoralTradeSchemaRegistry(registry);

  return NextResponse.json({
    ok: validation.status === "pass",
    checkedAt: new Date().toISOString(),
    registryVersion: registry.version,
    purpose: registry.purpose,
    validation,
    publicContract: {
      schemaDocuments: registry.schemaDocuments,
      schemaCount: registry.schemaDocuments.length,
      registryTests: registry.registryTests,
    },
    schemaDocuments: registry.schemaDocuments,
    blockers: validation.blockers,
  });
}
