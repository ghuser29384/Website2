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
  description: "Use a direct-to-charity Every.org route, save a non-custodial pledge intent, or submit reviewed external evidence.",
  alternates: {
    canonical: "/mpgf/contribute",
  },
  openGraph: {
    title: "Contribute to MPGF",
    description: "Use a direct-to-charity Every.org route, save a non-custodial pledge intent, or submit reviewed external evidence.",
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
          <Link className="button button-secondary" href="/login?returnTo=/mpgf/contribute">Sign in to contribute</Link>
        )
      }
      description="Start with a direct-to-charity Every.org route, save a pledge-only intent for threshold-cleared rounds, or use reviewed external evidence as fallback."
      title="Contribute through an external route or pledge intent."
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
