import type { Metadata } from "next";
import { permanentRedirect } from "next/navigation";

import { getAbsoluteUrl } from "@/lib/seo";

export const metadata: Metadata = {
  title: "How Moral Trade works",
  description:
    "See how Moral Trade turns differences in moral priorities into explicit, voluntary agreements with clear baselines, terms, and evidence.",
  alternates: { canonical: "/how-it-works" },
  openGraph: {
    title: "How Moral Trade works",
    description:
      "Follow the Moral Trade process from a no-trade baseline through voluntary terms, evidence, and verified completion.",
    url: getAbsoluteUrl("/how-it-works"),
    type: "website",
  },
};

export default function HowItWorksPage() {
  permanentRedirect("/#process-heading");
}
