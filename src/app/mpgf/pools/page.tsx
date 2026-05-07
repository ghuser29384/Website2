import type { Metadata } from "next";
import Link from "next/link";

import { MpgfConsole } from "@/components/mpgf/mpgf-console";
import { MpgfPageFrame } from "@/components/mpgf/mpgf-page-frame";
import { getViewer } from "@/lib/app-data";
import { demoAlternatives } from "@/lib/mpgf/data";
import { getAbsoluteUrl } from "@/lib/seo";

export const metadata: Metadata = {
  title: "MPGF Pools",
  description: "Approved demo ordinary-pool alternatives for the Moral Public Goods Fund.",
  alternates: {
    canonical: "/mpgf/pools",
  },
  openGraph: {
    title: "MPGF Pools",
    description: "Approved demo ordinary-pool alternatives for the Moral Public Goods Fund.",
    url: getAbsoluteUrl("/mpgf/pools"),
    type: "website",
  },
};

export default async function MpgfPoolsPage() {
  const viewer = await getViewer();

  return (
    <MpgfPageFrame
      actions={<Link className="button button-primary" href="/mpgf/pools/new">Draft pool proposal</Link>}
      description="These visible demo alternatives satisfy the production direct-working requirement without real-money effects."
      title="Approved demo ordinary-pool alternatives."
      viewerPresent={Boolean(viewer)}
    >
      <section className="mpgf-pool-directory">
        {demoAlternatives.map((alternative) => (
          <article key={alternative.id} className="mpgf-panel">
            <p className="eyebrow">{alternative.causeArea}</p>
            <h2>{alternative.name}</h2>
            <p>{alternative.description}</p>
            <p>{alternative.moralPublicGoodRationale}</p>
            <Link className="inline-link" href={`/mpgf/pools/${alternative.id}`}>View pool</Link>
          </article>
        ))}
      </section>

      <section className="section section-white">
        <MpgfConsole initialTab="pools" />
      </section>
    </MpgfPageFrame>
  );
}
