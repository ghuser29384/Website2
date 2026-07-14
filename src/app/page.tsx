import type { Metadata } from "next";

import { HomePage } from "@/components/home/home-page";
import { getViewer } from "@/lib/app-data";
import { getAbsoluteUrl, truncateDescription } from "@/lib/seo";

const homeDescription = truncateDescription(
  "Moral Trade turns moral disagreement into voluntary, bounded exchanges and shared public-good commitments with explicit baselines and reviewable evidence.",
);

export const metadata: Metadata = {
  title: "Cooperate without agreeing",
  description: homeDescription,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Moral Trade: cooperate without agreeing",
    description: homeDescription,
    url: getAbsoluteUrl("/"),
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Moral Trade: cooperate without agreeing",
    description: homeDescription,
  },
};

export default async function Page() {
  const viewer = await getViewer();

  return <HomePage isAuthenticated={Boolean(viewer)} />;
}
