import type { Metadata } from "next";

import { ImmersiveWalkthrough } from "@/components/walkthrough/immersive-walkthrough";
import { getAbsoluteUrl, truncateDescription } from "@/lib/seo";

import "./walkthrough.css";

const description = truncateDescription(
  "Try an interactive Moral Trade walkthrough: find a deal across different priorities, redirect opposed donations, and use all-or-nothing funding to close a higher-impact job's salary gap.",
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
