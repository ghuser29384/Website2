import type { Metadata } from "next";
import Link from "next/link";

import { MpgfConsole } from "@/components/mpgf/mpgf-console";
import { MpgfPageFrame } from "@/components/mpgf/mpgf-page-frame";
import { getViewer } from "@/lib/app-data";
import { MPGF_COPY } from "@/lib/mpgf/data";
import {
  buildPublicSummary,
  computeExactMpgfAllocation,
  formatUsd,
} from "@/lib/mpgf/mechanism";
import { loadMpgfParticipantState } from "@/lib/mpgf/persistence";
import { loadMpgfManualEvidenceReadiness, loadMpgfRealMoneyReadiness } from "@/lib/mpgf/real-money";
import { getAbsoluteUrl } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Moral Public Goods Fund",
  description:
    "Submit manual external-payment evidence for the Moral Public Goods Fund and review shared moral public goods.",
  alternates: {
    canonical: "/mpgf",
  },
  openGraph: {
    title: "Moral Public Goods Fund",
    description:
      "Submit manual external-payment evidence for the Moral Public Goods Fund and review shared moral public goods.",
    url: getAbsoluteUrl("/mpgf"),
    type: "website",
  },
};

export const dynamic = "force-dynamic";

export default async function MpgfPage() {
  const viewer = await getViewer();
  const allocation = computeExactMpgfAllocation();
  const publicSummary = buildPublicSummary({ allocation });
  const manualEvidenceReadiness = await loadMpgfManualEvidenceReadiness();
  const realMoneyReadiness = await loadMpgfRealMoneyReadiness();
  const participantState = await loadMpgfParticipantState({
    userId: viewer?.authUser.id,
    displayName: viewer?.displayName,
  });

  return (
    <MpgfPageFrame
      actions={
        <>
          <Link className="button button-primary" href="/mpgf/contribute">
            Submit manual evidence
          </Link>
          <Link className="button button-secondary" href="/mpgf/pools">
            Review candidate pools
          </Link>
        </>
      }
      description={MPGF_COPY.plainLanguageSummary}
      title="Fund moral public goods through reviewed external-payment evidence."
      realMoneyReadiness={realMoneyReadiness}
      viewerPresent={Boolean(viewer)}
    >
      <section className="mpgf-kpi-grid" aria-label="MPGF current summary">
        <div className="mpgf-kpi">
          <span>Illustrative budget</span>
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
          <span>Review status</span>
          <strong>{manualEvidenceReadiness.ready ? "Open" : "Persistence check"}</strong>
        </div>
      </section>

      <section className="section section-white">
        <div className="section-head">
          <p className="eyebrow">Flagship flow</p>
          <h2>Submit external-payment evidence, then track review state</h2>
          <p>
            The public MPGF pilot now starts with an external payment destination and a reviewable
            evidence record. Pledge and ballot tools remain available for understanding the
            mechanism, but evidence review is the main participant workflow.
          </p>
        </div>
        <MpgfConsole
          manualEvidenceReadiness={manualEvidenceReadiness}
          participantState={participantState}
          realMoneyReadiness={realMoneyReadiness}
          viewerPresent={Boolean(viewer)}
        />
      </section>
    </MpgfPageFrame>
  );
}
