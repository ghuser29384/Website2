import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Explore ordinary offers by challenge and return",
  description:
    "Explore Moral Trade offers and pledge swaps on the challenge-return plane embedded in the ordinary offer search page.",
  alternates: {
    canonical: "/offers",
  },
};

export default function LegacyOfferPlanePage() {
  redirect("/offers#challenge-return-explorer");
}
