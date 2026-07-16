import type { Metadata } from "next";

import { HomePage } from "@/components/home/home-page";
import { getViewer } from "@/lib/app-data";
import { getAbsoluteUrl, truncateDescription } from "@/lib/seo";

const homeDescription = truncateDescription(
  "Moral Trade is a marketplace and coordination mechanism for completing real donations through reviewed payment routes, swapping commitments, redirecting offsets, and joining conditional funding pools.",
);

export const metadata: Metadata = {
  title: "Do more good without agreeing",
  description: homeDescription,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Moral Trade: do more good without agreeing",
    description: homeDescription,
    url: getAbsoluteUrl("/"),
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Moral Trade: do more good without agreeing",
    description: homeDescription,
  },
};

export default async function Page() {
  const viewer = await getViewer();

  return <HomePage isAuthenticated={Boolean(viewer)} />;
}
