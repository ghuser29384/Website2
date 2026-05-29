import { NextResponse } from "next/server";

import {
  getMoralTradeSchemaDocumentBySlug,
  getMoralTradeSchemaRegistry,
} from "@/lib/moral-trade/schema-registry";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ schema: string }> },
) {
  const { schema } = await context.params;
  const schemaDocument = getMoralTradeSchemaDocumentBySlug(schema);

  if (!schemaDocument) {
    const registry = getMoralTradeSchemaRegistry();

    return NextResponse.json(
      {
        ok: false,
        checkedAt: new Date().toISOString(),
        blockers: [`unknown_schema:${schema}`],
        availableSchemas: registry.schemaDocuments.map((entry) => entry.slug),
      },
      {
        status: 404,
        headers: {
          "Cache-Control": "public, max-age=300, s-maxage=300",
        },
      },
    );
  }

  return NextResponse.json(schemaDocument.document, {
    headers: {
      "Cache-Control": "public, max-age=300, s-maxage=3600",
    },
  });
}
