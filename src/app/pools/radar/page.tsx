import type { Metadata } from "next";

import { ThresholdRadar } from "@/components/pools/threshold-radar";
import { getAbsoluteUrl } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Threshold radar",
  description: "Explore conditional-funding campaigns by distance from activation.",
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
  alternates: {
    canonical: "/pools/radar",
  },
  openGraph: {
    title: "Threshold radar | Moral Trade",
    description: "Explore conditional-funding campaigns by distance from activation.",
    url: getAbsoluteUrl("/pools/radar"),
    type: "website",
  },
};

export default function ThresholdRadarPage() {
  return <ThresholdRadar />;
}
