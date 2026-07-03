import type { Metadata } from "next";

import { HomePage } from "@/components/home/home-page";
import {
  getMarketplaceOverview,
  getViewer,
  listOpenOffersPage,
  OFFERS_PAGE_SIZE,
} from "@/lib/app-data";
import {
  buildMarketplaceDeals,
  buildMarketplaceSurface,
  parseMarketplaceQuery,
} from "@/lib/marketplace-deals";
import {
  demoMpgfAssuranceRound,
  demoMpgfMatchPool,
  demoMpgfPublicGoodsCampaigns,
} from "@/lib/mpgf/data";
import { getAbsoluteUrl, truncateDescription } from "@/lib/seo";
import { CANONICAL_WORKED_CASE_OFFERS } from "@/lib/seed-data";

const homeDescription = truncateDescription(
  "Moral Trade helps serious participants test one small, reviewable commitment across moral disagreement with explicit baselines, evidence rules, and no custody or escrow.",
);

export const metadata: Metadata = {
  title: "Reviewable moral cooperation pilot",
  description: homeDescription,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Moral Trade: reviewable moral cooperation pilot",
    description: homeDescription,
    url: getAbsoluteUrl("/"),
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Moral Trade: reviewable moral cooperation pilot",
    description: homeDescription,
  },
};

export default async function Page() {
  const [viewer, marketplaceOverview, offersPage] = await Promise.all([
    getViewer(),
    getMarketplaceOverview(),
    listOpenOffersPage(1, OFFERS_PAGE_SIZE, "all", "").catch((error) => {
      const message =
        error instanceof Error ? error.message : "Unable to load live marketplace offers.";
      if (message.includes("Dynamic server usage")) {
        throw error;
      }
      console.error("[home] Failed to load live marketplace offers", { message });
      return {
        items: [],
        page: 1,
        pageSize: OFFERS_PAGE_SIZE,
        hasNextPage: false,
        hasPreviousPage: false,
      };
    }),
  ]);
  const marketplaceQuery = parseMarketplaceQuery({});
  const marketplaceDeals = buildMarketplaceDeals({
    liveOffers: offersPage.items,
    publicGoodsCampaigns: demoMpgfPublicGoodsCampaigns
      .filter((campaign) => campaign.reviewStatus === "approved")
      .slice(0, 7),
    publicGoodsMatchPool: demoMpgfMatchPool,
    publicGoodsRound: demoMpgfAssuranceRound,
    workedOffers: CANONICAL_WORKED_CASE_OFFERS,
  });
  const marketplaceSurface = buildMarketplaceSurface(marketplaceDeals, marketplaceQuery);

  return (
    <HomePage
      isAuthenticated={Boolean(viewer)}
      liveOfferCount={offersPage.items.length}
      marketplaceOverview={marketplaceOverview}
      marketplaceQuery={marketplaceQuery}
      marketplaceSurface={marketplaceSurface}
    />
  );
}
