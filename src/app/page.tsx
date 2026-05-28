import type { Metadata } from "next";

import { HomePage } from "@/components/home/home-page";
import { getMarketplaceOverview, getViewer } from "@/lib/app-data";
import { getAbsoluteUrl, truncateDescription } from "@/lib/seo";

const homeDescription = truncateDescription(
  "Moral Trade helps serious participants test one small, reviewable commitment across moral disagreement with explicit baselines, evidence rules, and no custody or escrow.",
);

export const metadata: Metadata = {
  title: "Cooperate across deep value differences",
  description: homeDescription,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Cooperate across deep value differences",
    description: homeDescription,
    url: getAbsoluteUrl("/"),
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Cooperate across deep value differences",
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
