import type { Metadata } from "next";
import Link from "next/link";

import { MpgfPageFrame } from "@/components/mpgf/mpgf-page-frame";
import { getViewer } from "@/lib/app-data";
import { MPGF_COPY } from "@/lib/mpgf/data";
import { getAbsoluteUrl } from "@/lib/seo";

export const metadata: Metadata = {
  title: "About MPGF",
  description: "How the Moral Public Goods Fund relates to moral trade and shared public goods.",
  alternates: {
    canonical: "/mpgf/about",
  },
  openGraph: {
    title: "About MPGF",
    description: "How the Moral Public Goods Fund relates to moral trade and shared public goods.",
    url: getAbsoluteUrl("/mpgf/about"),
    type: "website",
  },
};

export default async function MpgfAboutPage() {
  const viewer = await getViewer();

  return (
    <MpgfPageFrame
      actions={<Link className="button button-primary" href="/mpgf/contribute">Open pledge demo</Link>}
      description={MPGF_COPY.moralPublicGoods}
      title="A coordination layer for goods many moral views value."
      viewerPresent={Boolean(viewer)}
    >
      <section className="section section-white">
        <div className="mpgf-explainer-grid">
          <article className="mpgf-panel">
            <p className="eyebrow">Moral public goods</p>
            <h2>Shared moral value</h2>
            <p>{MPGF_COPY.moralPublicGoods}</p>
          </article>
          <article className="mpgf-panel">
            <p className="eyebrow">Moral trade</p>
            <h2>Better deals across disagreement</h2>
            <p>{MPGF_COPY.moralTrade}</p>
          </article>
          <article className="mpgf-panel">
            <p className="eyebrow">Pilot safety</p>
            <h2>No real-money operations</h2>
            <p>{MPGF_COPY.nonRealMoney}</p>
          </article>
          <article className="mpgf-panel">
            <p className="eyebrow">Participant access</p>
            <h2>Support and public status</h2>
            <p>{MPGF_COPY.pilot_status}</p>
            <p>{MPGF_COPY.support_or_access}</p>
          </article>
        </div>
      </section>
    </MpgfPageFrame>
  );
}
