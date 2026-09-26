import { NextResponse } from "next/server";

import {
  BOTTLENECK_ATLAS_FIELDS,
  BOTTLENECK_ATLAS_REVIEWED_AT,
  BOTTLENECK_ATLAS_VERSION,
  OPPORTUNITY_SYNTHESIS_TEMPLATES,
} from "@/lib/bottleneck-atlas";
import { OPPORTUNITY_SYNTHESIS_VERSION } from "@/lib/opportunity-synthesis";

export const revalidate = 3_600;

export async function GET() {
  return NextResponse.json(
    {
      atlasVersion: BOTTLENECK_ATLAS_VERSION,
      synthesisVersion: OPPORTUNITY_SYNTHESIS_VERSION,
      reviewedAt: BOTTLENECK_ATLAS_REVIEWED_AT,
      interpretation:
        "Field-level evidence is a search prior. It does not establish a current organization-specific bottleneck, available capacity, consent, or counterparty agreement.",
      fields: BOTTLENECK_ATLAS_FIELDS,
      templates: OPPORTUNITY_SYNTHESIS_TEMPLATES,
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    },
  );
}
