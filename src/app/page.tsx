import type { Metadata } from "next";

import { HomePage } from "@/components/home/home-page";
import { getMarketplaceOverview, getViewer } from "@/lib/app-data";
import { getAbsoluteUrl, truncateDescription } from "@/lib/seo";

const homeDescription = truncateDescription(
  "Browse and create reviewable moral trade offers: pledge swaps, donation offsets, and shared public-good commitments with explicit baselines, evidence rules, and no escrow claim.",
);

export const metadata: Metadata = {
  title: "Moral Trade marketplace for reviewable moral trades",
  description: homeDescription,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Moral Trade marketplace for reviewable moral trades",
    description: homeDescription,
    url: getAbsoluteUrl("/"),
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Moral Trade marketplace for reviewable moral trades",
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
