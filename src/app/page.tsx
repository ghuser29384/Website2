import type { Metadata } from "next";

import { HomePage } from "@/components/home/home-page";
import { getViewer } from "@/lib/app-data";
import { getAbsoluteUrl, SITE_NAME, truncateDescription } from "@/lib/seo";

const homeDescription = truncateDescription(
  "Moral Trade explores how trade and compromise between differing moral views can create gains, while remaining vulnerable to threats, power concentration, and blocked futures.",
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
      name: "Why can moral trade matter even if only some people aim at the good?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Because even partial convergence can still leave room for bargaining and compromise, so different moral views can reach outcomes each regards as better than acting alone.",
      },
    },
    {
      "@type": "Question",
      name: "What decides whether hypothetical gains from trade are actually realised?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Institutions, contracts, transaction costs, and whether parties actually take improving trades. Possible gains alone are not enough.",
      },
    },
    {
      "@type": "Question",
      name: "Why are threats a separate problem from trade?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Because a threat can leave at least one side worse off whichever option it chooses, unlike a voluntary exchange that both sides regard as better.",
      },
    },
    {
      "@type": "Question",
      name: "What can block a mostly-great future even if trade is possible?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Value-destroying threats, concentration of power, majority procedures that ban minority-valued goods, and other collective decision rules can all block the gains from trade.",
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
