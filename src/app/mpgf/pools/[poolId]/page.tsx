import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";

import { MpgfPageFrame } from "@/components/mpgf/mpgf-page-frame";
import { getViewer } from "@/lib/app-data";
import { demoAlternatives } from "@/lib/mpgf/data";
import { getAbsoluteUrl } from "@/lib/seo";

interface MpgfPoolPageProps {
  params: Promise<{ poolId: string }>;
}

export async function generateMetadata({ params }: MpgfPoolPageProps): Promise<Metadata> {
  const { poolId } = await params;
  const alternative = demoAlternatives.find((candidate) => candidate.id === poolId);

  if (!alternative) {
    return {
      title: "MPGF Pool",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  return {
    title: `${alternative.shortName} MPGF Pool`,
    description: alternative.moralPublicGoodRationale,
    alternates: {
      canonical: `/mpgf/pools/${alternative.id}`,
    },
    openGraph: {
      title: `${alternative.shortName} MPGF Pool`,
      description: alternative.moralPublicGoodRationale,
      url: getAbsoluteUrl(`/mpgf/pools/${alternative.id}`),
      type: "website",
    },
  };
}

export default async function MpgfPoolPage({ params }: MpgfPoolPageProps) {
  const { poolId } = await params;
  const viewer = await getViewer();
  const alternative = demoAlternatives.find((candidate) => candidate.id === poolId);

  if (!alternative) {
    notFound();
  }

  return (
    <MpgfPageFrame
      actions={<Link className="button button-primary" href="/mpgf/contribute">Pledge to MPGF demo</Link>}
      description={alternative.moralPublicGoodRationale}
      title={alternative.name}
      viewerPresent={Boolean(viewer)}
    >
      <section className="mpgf-detail-grid">
        <article className="mpgf-panel">
          <p className="eyebrow">Recipient</p>
          <h2>{alternative.recipientName}</h2>
          <p>{alternative.description}</p>
        </article>
        <article className="mpgf-panel">
          <p className="eyebrow">Risk and reliability</p>
          <dl className="mpgf-summary-grid">
            <div>
              <dt>Reliability</dt>
              <dd>{alternative.operationalReliabilityBps} bps</dd>
            </div>
            <div>
              <dt>Risk</dt>
              <dd>{alternative.riskBps} bps</dd>
            </div>
            <div>
              <dt>Tail loss</dt>
              <dd>{alternative.tailLossBps} bps</dd>
            </div>
            <div>
              <dt>Outcome unit</dt>
              <dd>{alternative.outcomeUnit}</dd>
            </div>
          </dl>
        </article>
      </section>
    </MpgfPageFrame>
  );
}
