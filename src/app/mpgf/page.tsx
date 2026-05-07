import type { Metadata } from "next";
import Link from "next/link";

import { MpgfConsole } from "@/components/mpgf/mpgf-console";
import { MpgfPageFrame } from "@/components/mpgf/mpgf-page-frame";
import { getViewer } from "@/lib/app-data";
import { MPGF_COPY } from "@/lib/mpgf/data";
import { buildPublicSummary, computeExactMpgfAllocation, formatUsd } from "@/lib/mpgf/mechanism";
import { runMpgfDirectWorkingSmokeTest } from "@/lib/mpgf/validators";
import { getAbsoluteUrl } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Moral Public Goods Fund",
  description:
    "A non-real-money, pledge-only Moral Public Goods Fund pilot for coordinating moral trade around shared public goods.",
  alternates: {
    canonical: "/mpgf",
  },
  openGraph: {
    title: "Moral Public Goods Fund",
    description:
      "A non-real-money, pledge-only Moral Public Goods Fund pilot for coordinating moral trade around shared public goods.",
    url: getAbsoluteUrl("/mpgf"),
    type: "website",
  },
};

export default async function MpgfPage() {
  const viewer = await getViewer();
  const allocation = computeExactMpgfAllocation();
  const publicSummary = buildPublicSummary({ allocation });
  const smokeTest = runMpgfDirectWorkingSmokeTest();

  return (
    <MpgfPageFrame
      actions={
        <>
          <Link className="button button-primary" href="/mpgf/contribute">
            Create pledge
          </Link>
          <Link className="button button-secondary" href="/mpgf/pools">
            View pools
          </Link>
        </>
      }
      description={MPGF_COPY.plainLanguageSummary}
      title="Fund moral public goods without turning the pilot into real money."
      viewerPresent={Boolean(viewer)}
    >
      <section className="mpgf-kpi-grid" aria-label="MPGF current summary">
        <div className="mpgf-kpi">
          <span>Demo budget</span>
          <strong>{formatUsd(publicSummary.budgetCents)}</strong>
        </div>
        <div className="mpgf-kpi">
          <span>Allocated internally</span>
          <strong>{formatUsd(allocation.allocatedCents)}</strong>
        </div>
        <div className="mpgf-kpi">
          <span>External payouts</span>
          <strong>{formatUsd(publicSummary.externallyPaidCents)}</strong>
        </div>
        <div className="mpgf-kpi">
          <span>Smoke test</span>
          <strong>{smokeTest.status}</strong>
        </div>
      </section>

      <section className="section section-white">
        <div className="section-head">
          <p className="eyebrow">Direct-working mechanism</p>
          <h2>Try the pilot path from pledge to ballot to public summary</h2>
          <p>
            This is the production-safe MPGF mode specified by the Build Instruction: pledge-only,
            non-real-money, no live authorizations, no automated payouts, and no external payment
            evidence.
          </p>
        </div>
        <MpgfConsole />
      </section>
    </MpgfPageFrame>
  );
}
