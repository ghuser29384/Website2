import type { Metadata } from "next";

import { ImmersiveWalkthrough } from "@/components/walkthrough/immersive-walkthrough";
import { getAbsoluteUrl, truncateDescription } from "@/lib/seo";

import "./walkthrough.css";

const description = truncateDescription(
  "Try an interactive Moral Trade walkthrough: find a deal across different priorities, tune terms both sides accept, redirect opposed donations, and explore conditional public-goods funding.",
);

export const metadata: Metadata = {
  title: "Interactive walkthrough",
  description,
  alternates: {
    canonical: "/walkthrough",
  },
  openGraph: {
    title: "Try Moral Trade",
    description,
    url: getAbsoluteUrl("/walkthrough"),
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Try Moral Trade",
    description,
  },
};

export default function WalkthroughPage() {
  return <ImmersiveWalkthrough tradeCreateHref="/trades/new" />;
}
