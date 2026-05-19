import type { Metadata } from "next";
import Link from "next/link";

import { MpgfPageFrame } from "@/components/mpgf/mpgf-page-frame";
import { getViewer } from "@/lib/app-data";
import { loadMpgfRealMoneyReadiness } from "@/lib/mpgf/real-money";
import { getAbsoluteUrl } from "@/lib/seo";

export const metadata: Metadata = {
  title: "MPGF Contribution Cancelled",
  description: "Safe cancellation state for the non-real-money MPGF pledge-only demo flow.",
  alternates: {
    canonical: "/mpgf/contribute/cancel",
  },
  openGraph: {
    title: "MPGF Contribution Cancelled",
    description: "Safe cancellation state for the non-real-money MPGF pledge-only demo flow.",
    url: getAbsoluteUrl("/mpgf/contribute/cancel"),
    type: "website",
  },
};

export default async function MpgfContributeCancelPage() {
  const viewer = await getViewer();
  const realMoneyReadiness = await loadMpgfRealMoneyReadiness();

  return (
    <MpgfPageFrame
      actions={<Link className="button button-primary" href="/mpgf/contribute">Return to pledge demo</Link>}
      description="No MPGF pledge was changed."
      title="Contribution flow cancelled."
      realMoneyReadiness={realMoneyReadiness}
      viewerPresent={Boolean(viewer)}
    >
      <section className="mpgf-panel">
        <h2>Safe cancellation state</h2>
        <p>
          Returning from a cancelled Checkout session does not itself record an MPGF contribution.
          Stripe webhooks mark cancelled or expired provider sessions separately when applicable.
        </p>
      </section>
    </MpgfPageFrame>
  );
}
