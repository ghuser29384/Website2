import type { Metadata } from "next";

import { HomePage } from "@/components/home/home-page";
import { getMarketplaceOverview, getViewer } from "@/lib/app-data";
import { getAbsoluteUrl, truncateDescription } from "@/lib/seo";

const homeDescription = truncateDescription(
  "Moral Trade helps people test clear, voluntary pledge swaps, donation offsets, and public-good commitments with written terms, evidence rules, and manual review.",
);

export const metadata: Metadata = {
  title: "Clear voluntary deals across moral disagreement",
  description: homeDescription,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Clear voluntary deals across moral disagreement",
    description: homeDescription,
    url: getAbsoluteUrl("/"),
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Clear voluntary deals across moral disagreement",
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
