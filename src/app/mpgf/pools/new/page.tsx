import type { Metadata } from "next";

import { MpgfConsole } from "@/components/mpgf/mpgf-console";
import { MpgfPageFrame } from "@/components/mpgf/mpgf-page-frame";
import { getViewer } from "@/lib/app-data";
import { loadMpgfParticipantState } from "@/lib/mpgf/persistence";
import { loadMpgfManualEvidenceReadiness, loadMpgfRealMoneyReadiness } from "@/lib/mpgf/real-money";
import { getAbsoluteUrl } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Propose MPGF Pool",
  description: "Draft a non-real-money MPGF candidate pool proposal without live allocation or payout effects.",
  alternates: {
    canonical: "/mpgf/pools/new",
  },
  openGraph: {
    title: "Propose MPGF Pool",
    description: "Draft a non-real-money MPGF candidate pool proposal without live allocation or payout effects.",
    url: getAbsoluteUrl("/mpgf/pools/new"),
    type: "website",
  },
};

export const dynamic = "force-dynamic";

export default async function MpgfNewPoolPage() {
  const viewer = await getViewer();
  const participantState = await loadMpgfParticipantState({
    userId: viewer?.authUser.id,
    displayName: viewer?.displayName,
  });
  const manualEvidenceReadiness = await loadMpgfManualEvidenceReadiness();
  const realMoneyReadiness = await loadMpgfRealMoneyReadiness();

  return (
    <MpgfPageFrame
      description="Draft a candidate pool proposal for review without creating live allocation or payout effects."
      title="Propose a moral public good."
      realMoneyReadiness={realMoneyReadiness}
      viewerPresent={Boolean(viewer)}
    >
      <section className="section section-white">
        <MpgfConsole
          initialTab="pools"
          manualEvidenceReadiness={manualEvidenceReadiness}
          participantState={participantState}
          realMoneyReadiness={realMoneyReadiness}
          viewerPresent={Boolean(viewer)}
        />
      </section>
    </MpgfPageFrame>
  );
}
