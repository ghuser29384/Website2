import type { Metadata } from "next";
import Link from "next/link";

import { MpgfConsole } from "@/components/mpgf/mpgf-console";
import { MpgfPageFrame } from "@/components/mpgf/mpgf-page-frame";
import { getViewer } from "@/lib/app-data";
import { MPGF_COPY } from "@/lib/mpgf/data";
import { loadMpgfParticipantState } from "@/lib/mpgf/persistence";
import { loadMpgfManualEvidenceReadiness, loadMpgfRealMoneyReadiness } from "@/lib/mpgf/real-money";
import { getAbsoluteUrl } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Contribute to MPGF",
  description: "Submit manual external-payment evidence for MPGF review.",
  alternates: {
    canonical: "/mpgf/contribute",
  },
  openGraph: {
    title: "Contribute to MPGF",
    description: "Submit manual external-payment evidence for MPGF review.",
    url: getAbsoluteUrl("/mpgf/contribute"),
    type: "website",
  },
};

export const dynamic = "force-dynamic";

export default async function MpgfContributePage() {
  const viewer = await getViewer();
  const participantState = await loadMpgfParticipantState({
    userId: viewer?.authUser.id,
    displayName: viewer?.displayName,
  });
  const manualEvidenceReadiness = await loadMpgfManualEvidenceReadiness();
  const realMoneyReadiness = await loadMpgfRealMoneyReadiness();

  return (
    <MpgfPageFrame
      actions={
        viewer ? (
          <Link className="button button-secondary" href="/mpgf/account/contributions">My evidence and pledges</Link>
        ) : (
          <Link className="button button-secondary" href="/login?returnTo=/mpgf/contribute">Sign in to submit evidence</Link>
        )
      }
      description={MPGF_COPY.manualExternalPaymentEvidence}
      title="Submit manual evidence for an MPGF contribution."
      realMoneyReadiness={realMoneyReadiness}
      viewerPresent={Boolean(viewer)}
    >
      <section className="section section-white">
        <MpgfConsole
          initialTab="contribute"
          manualEvidenceReadiness={manualEvidenceReadiness}
          participantState={participantState}
          realMoneyReadiness={realMoneyReadiness}
          viewerPresent={Boolean(viewer)}
        />
      </section>
    </MpgfPageFrame>
  );
}
