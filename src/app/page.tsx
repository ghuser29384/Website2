import type { Metadata } from "next";

import { HomePage } from "@/components/home/home-page";
import { getViewer } from "@/lib/app-data";
import { getAbsoluteUrl, SITE_NAME, truncateDescription } from "@/lib/seo";

const homeDescription = truncateDescription(
  "Moral Trade is about how people with different moral views may make exchanges that each regards as morally better.",
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
        text: "No. It is for offers, reciprocal terms, and reviewable commitments, not for open-ended discussion.",
      },
    },
    {
      "@type": "Question",
      name: "Does Moral Trade claim to resolve deep moral disagreement?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "No. It asks whether people with different moral views can still find exchanges that each sees as morally better.",
      },
    },
    {
      "@type": "Question",
      name: "What keeps this from becoming shallow or manipulative?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "The site stays with offers, terms, counterfactual dependence, and verification.",
      },
    },
    {
      "@type": "Question",
      name: "Why doesn't trade guarantee a mostly-great future?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Because trade can be blocked or undermined by threats, concentrated power, and collective procedures that seal off futures some views value highly.",
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
