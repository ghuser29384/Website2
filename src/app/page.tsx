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
      name: "What is the main practical obstacle?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Insufficient trust. Ord divides this into factual trust and counterfactual trust, and treats the second as especially hard.",
      },
    },
    {
      "@type": "Question",
      name: "Is moral trade only for consequentialists?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "No. The paper argues that deontological and virtue-ethical views can also have reasons to engage in moral trade, though the gains and constraints may look different.",
      },
    },
    {
      "@type": "Question",
      name: "Can the gains be very large?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Ord argues that the potential gains can be large, especially where opposed charities or costly habits create major inefficiencies, though they are much harder to aggregate than gains from ordinary trade.",
      },
    },
    {
      "@type": "Question",
      name: "Does moral trade guarantee a better world overall?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "No. It guarantees only that the outcome is better according to the views of the parties to the trade. Externalities, objective moral truth, and perverse incentives can still make things worse overall.",
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
