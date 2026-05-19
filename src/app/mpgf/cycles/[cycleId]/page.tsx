import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";

import { MpgfPageFrame } from "@/components/mpgf/mpgf-page-frame";
import { getViewer } from "@/lib/app-data";
import { demoCycle } from "@/lib/mpgf/data";
import { buildPublicSummary, computeExactMpgfAllocation, formatUsd } from "@/lib/mpgf/mechanism";
import { getAbsoluteUrl } from "@/lib/seo";

interface MpgfCyclePageProps {
  params: Promise<{ cycleId: string }>;
}

export async function generateMetadata({ params }: MpgfCyclePageProps): Promise<Metadata> {
  const { cycleId } = await params;

  if (cycleId !== demoCycle.id) {
    return {
      title: "MPGF Cycle",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  return {
    title: `${demoCycle.label} MPGF Cycle`,
    description: "Public non-real-money MPGF demo cycle summary with no external disbursement state.",
    alternates: {
      canonical: `/mpgf/cycles/${demoCycle.id}`,
    },
    openGraph: {
      title: `${demoCycle.label} MPGF Cycle`,
      description: "Public non-real-money MPGF demo cycle summary with no external disbursement state.",
      url: getAbsoluteUrl(`/mpgf/cycles/${demoCycle.id}`),
      type: "website",
    },
  };
}

export default async function MpgfCyclePage({ params }: MpgfCyclePageProps) {
  const { cycleId } = await params;
  const viewer = await getViewer();

  if (cycleId !== demoCycle.id) {
    notFound();
  }

  const allocation = computeExactMpgfAllocation();
  const summary = buildPublicSummary({ allocation });

  return (
    <MpgfPageFrame
      actions={<Link className="button button-primary" href={`/mpgf/ballot/${demoCycle.id}`}>Open ballot</Link>}
      description="Public cycle summary for the current non-real-money MPGF demo cycle."
      title={demoCycle.label}
      viewerPresent={Boolean(viewer)}
    >
      <section className="mpgf-detail-grid">
        <article className="mpgf-panel">
          <p className="eyebrow">Cycle status</p>
          <h2>{demoCycle.mode.replaceAll("_", " ")}</h2>
          <p>{summary.nonRealMoneyStatus}</p>
        </article>
        <article className="mpgf-panel">
          <p className="eyebrow">Summary fields</p>
          <dl className="mpgf-summary-grid">
            <div>
              <dt>Budget</dt>
              <dd>{formatUsd(summary.budgetCents)}</dd>
            </div>
            <div>
              <dt>Allocated</dt>
              <dd>{formatUsd(allocation.allocatedCents)}</dd>
            </div>
            <div>
              <dt>Authorized</dt>
              <dd>{formatUsd(summary.payoutAuthorizedCents)}</dd>
            </div>
            <div>
              <dt>Paid externally</dt>
              <dd>{formatUsd(summary.externallyPaidCents)}</dd>
            </div>
          </dl>
        </article>
      </section>
    </MpgfPageFrame>
  );
}
