import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Explore live offers",
  description:
    "Browse the live Moral Trade offer directory, grouped by participant with transparent ranking and filters.",
  alternates: {
    canonical: "/offers",
  },
};

export default function LegacyOfferPlanePage() {
  redirect("/offers?view=live");
}
