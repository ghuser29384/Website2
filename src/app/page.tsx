import type { Metadata } from "next";

import { HomePage } from "@/components/home/home-page";
import { getViewer } from "@/lib/app-data";
import { getAbsoluteUrl, SITE_NAME, truncateDescription } from "@/lib/seo";

const homeDescription = truncateDescription(
  "Moral Trade is a public-interest platform for moral trade: structured public offers, reciprocal commitments, reasoning standards, and transparent methods for people with different moral priorities.",
);

export const metadata: Metadata = {
  title: SITE_NAME,
  description: homeDescription,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: SITE_NAME,
    description: homeDescription,
    url: getAbsoluteUrl("/"),
    type: "website",
  },
  twitter: {
    card: "summary",
    title: SITE_NAME,
    description: homeDescription,
  },
};

const faqStructuredData = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Is Moral Trade a discussion forum or social feed?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "No. Moral Trade focuses on structured public offers, reciprocal commitments, and explicit verification terms rather than engagement-driven discussion.",
      },
    },
    {
      "@type": "Question",
      name: "Does Moral Trade claim to resolve deep moral disagreement?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "No. It provides a disciplined way to coordinate when people with different priorities can still identify mutually worthwhile commitments.",
      },
    },
    {
      "@type": "Question",
      name: "What keeps the platform from becoming manipulative or shallow?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "The interface emphasizes bounded actions, evidence, review periods, and explicit limitations instead of infinite feeds, gamification, or popularity mechanics.",
      },
    },
  ],
};

export default async function Page() {
  const viewer = await getViewer();

  return (
    <>
      <script
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(faqStructuredData),
        }}
        type="application/ld+json"
      />
      <HomePage isAuthenticated={Boolean(viewer)} />
    </>
  );
}
