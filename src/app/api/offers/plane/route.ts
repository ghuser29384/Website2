import { NextResponse } from "next/server";

import { listOpenOffersPreview } from "@/lib/app-data";
import { categoryForOfferMode, type CredibilitySummary } from "@/lib/credibility";
import { listPublicCredibilityForLookups } from "@/lib/credibility-search";
import {
  offerPlaneItemFromOfferRecord,
  offerPlaneItemFromWorkedOffer,
} from "@/lib/offer-plane";
import { CANONICAL_WORKED_CASE_OFFERS } from "@/lib/seed-data";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function creditExplanation(summary: CredibilitySummary | undefined) {
  if (!summary) {
    return ["Contextual transaction credit is temporarily unavailable; treated as Unproven."];
  }

  const headline =
    summary.score === null
      ? `Contextual transaction credit: ${summary.level}`
      : `Contextual transaction credit: ${summary.score}/100`;

  return [
    headline,
    `${summary.confidence} confidence from ${summary.effectiveObservations.toFixed(1)} effective observation(s)`,
    summary.explanation,
  ];
}

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

  let credibilityByOffer = new Map<string, CredibilitySummary>();
  if (liveOffers.length) {
    try {
      credibilityByOffer = await listPublicCredibilityForLookups(
        liveOffers.map((offer) => ({
          key: offer.id,
          profileId: offer.owner_id,
          context: {
            role: "committer",
            category: categoryForOfferMode(offer.mode),
          },
        })),
      );
    } catch (error) {
      console.error("[offer-plane] Failed to load contextual credit scores", {
        message: error instanceof Error ? error.message : "Unknown contextual-credit error",
      });
    }
  }

  const items = [
    ...liveOffers.map((offer) => {
      const item = offerPlaneItemFromOfferRecord(offer);
      const credibility = credibilityByOffer.get(offer.id);

      return {
        ...item,
        creditScore: credibility?.score ?? null,
        scoreExplanation: {
          ...item.scoreExplanation,
          credit: creditExplanation(credibility),
        },
      };
    }),
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
