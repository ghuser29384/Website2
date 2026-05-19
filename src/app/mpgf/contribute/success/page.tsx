import type { Metadata } from "next";
import Link from "next/link";

import { MpgfPageFrame } from "@/components/mpgf/mpgf-page-frame";
import { getViewer } from "@/lib/app-data";
import { loadMpgfRealMoneyReadiness } from "@/lib/mpgf/real-money";
import { getAbsoluteUrl } from "@/lib/seo";

export const metadata: Metadata = {
  title: "MPGF Pledge Recorded",
  description: "Confirmation state for a non-real-money MPGF pledge-only demo commitment.",
  alternates: {
    canonical: "/mpgf/contribute/success",
  },
  openGraph: {
    title: "MPGF Pledge Recorded",
    description: "Confirmation state for a non-real-money MPGF pledge-only demo commitment.",
    url: getAbsoluteUrl("/mpgf/contribute/success"),
    type: "website",
  },
};

export default async function MpgfContributeSuccessPage() {
  const viewer = await getViewer();
  const realMoneyReadiness = await loadMpgfRealMoneyReadiness();

  return (
    <MpgfPageFrame
      actions={<Link className="button button-primary" href="/mpgf/account/contributions">View contribution state</Link>}
      description="If this followed Stripe Checkout, final MPGF payment state is recorded by webhook confirmation."
      title="Contribution flow returned."
      realMoneyReadiness={realMoneyReadiness}
      viewerPresent={Boolean(viewer)}
    >
      <section className="mpgf-panel">
        <h2>Check contribution state</h2>
        <p>
          Checkout success means Stripe returned you to Moral Trade. MPGF contribution records,
          receipts of payment state, and monthly commitment activation are finalized by verified
          Stripe webhooks.
        </p>
      </section>
    </MpgfPageFrame>
  );
}
