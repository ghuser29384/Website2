import type { Metadata } from "next";

import { HomePage } from "@/components/home/home-page";
import { getMarketplaceOverview, getViewer } from "@/lib/app-data";
import { getAbsoluteUrl, truncateDescription } from "@/lib/seo";

const homeDescription = truncateDescription(
  "Moral Trade is a reviewed pilot for low-risk cooperation across moral disagreement: pledge swaps, donation offsets, and shared public-good commitments without escrow or hidden automation.",
);

export const metadata: Metadata = {
  title: "Moral Trade pilot for cooperation under disagreement",
  description: homeDescription,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Moral Trade pilot for cooperation under disagreement",
    description: homeDescription,
    url: getAbsoluteUrl("/"),
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Moral Trade pilot for cooperation under disagreement",
    description: homeDescription,
  },
};

export default async function Page() {
  const [viewer, marketplaceOverview] = await Promise.all([
    getViewer(),
    getMarketplaceOverview(),
  ]);

  return <HomePage isAuthenticated={Boolean(viewer)} marketplaceOverview={marketplaceOverview} />;
}
