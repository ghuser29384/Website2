import type { Metadata } from "next";

import { ImmersiveWalkthrough } from "@/components/walkthrough/immersive-walkthrough";
import { getAbsoluteUrl, truncateDescription } from "@/lib/seo";

import "./walkthrough.css";
import "./skip-walkthrough.css";

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

type WalkthroughPageProps = {
  searchParams: Promise<{
    first_visit?: string | string[];
  }>;
};

export default async function WalkthroughPage({ searchParams }: WalkthroughPageProps) {
  const { first_visit: firstVisit } = await searchParams;
  const showSkip = Array.isArray(firstVisit) ? firstVisit.includes("1") : firstVisit === "1";

  return (
    <>
      {showSkip ? (
        <form action="/" className="mtw-skip-form" method="get">
          <button aria-label="Skip walkthrough" className="mtw-skip-button" type="submit">
            Skip
          </button>
        </form>
      ) : null}
      <ImmersiveWalkthrough tradeCreateHref="/trades/new" />
    </>
  );
}
