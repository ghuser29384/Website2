import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getAbsoluteUrl, truncateDescription } from "@/lib/seo";

const homeDescription = truncateDescription(
  "Moral Trade helps people propose reciprocal commitments, review their terms, and track evidence.",
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

// The proxy owns first-visit routing and the live homepage rewrite.
// A direct App Router fallback must not revive the retired mock experience.
export default function Page() {
  redirect("/feed");
}
