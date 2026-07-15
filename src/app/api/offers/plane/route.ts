import { NextResponse } from "next/server";

import { listOpenOffersPreview } from "@/lib/app-data";
import {
  offerPlaneItemFromOfferRecord,
  offerPlaneItemFromWorkedOffer,
} from "@/lib/offer-plane";
import { CANONICAL_WORKED_CASE_OFFERS } from "@/lib/seed-data";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  let liveOffers: Awaited<ReturnType<typeof listOpenOffersPreview>> = [];
  let liveOffersAvailable = true;

  try {
    liveOffers = await listOpenOffersPreview(160);
  } catch (error) {
    liveOffersAvailable = false;
    console.error("[offer-plane] Failed to load live offers for inline search", {
      message: error instanceof Error ? error.message : "Unknown offer-plane error",
    });
  }

  const items = [
    ...liveOffers.map(offerPlaneItemFromOfferRecord),
    ...CANONICAL_WORKED_CASE_OFFERS.map(offerPlaneItemFromWorkedOffer),
  ];

  return NextResponse.json(
    {
      items,
      liveOffersAvailable,
    },
    {
      headers: {
        "Cache-Control": "private, no-store, max-age=0",
      },
    },
  );
}
