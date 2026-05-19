import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { MpgfConsole } from "@/components/mpgf/mpgf-console";
import { MpgfPageFrame } from "@/components/mpgf/mpgf-page-frame";
import { getViewer } from "@/lib/app-data";
import { demoCycle } from "@/lib/mpgf/data";
import { loadMpgfParticipantState } from "@/lib/mpgf/persistence";
import { loadMpgfManualEvidenceReadiness, loadMpgfRealMoneyReadiness } from "@/lib/mpgf/real-money";
import { getAbsoluteUrl } from "@/lib/seo";

interface MpgfBallotPageProps {
  params: Promise<{ cycleId: string }>;
}

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: MpgfBallotPageProps): Promise<Metadata> {
  const { cycleId } = await params;

  if (cycleId !== demoCycle.id) {
    return {
      title: "MPGF Ballot",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  return {
    title: `MPGF Ballot for ${demoCycle.label}`,
    description: "Submit a non-real-money bounded marginal-value ballot for the MPGF demo cycle.",
    alternates: {
      canonical: `/mpgf/ballot/${demoCycle.id}`,
    },
    openGraph: {
      title: `MPGF Ballot for ${demoCycle.label}`,
      description: "Submit a non-real-money bounded marginal-value ballot for the MPGF demo cycle.",
      url: getAbsoluteUrl(`/mpgf/ballot/${demoCycle.id}`),
      type: "website",
    },
  };
}

export default async function MpgfBallotPage({ params }: MpgfBallotPageProps) {
  const { cycleId } = await params;
  const viewer = await getViewer();
  const participantState = await loadMpgfParticipantState({
    userId: viewer?.authUser.id,
    displayName: viewer?.displayName,
  });
  const manualEvidenceReadiness = await loadMpgfManualEvidenceReadiness();
  const realMoneyReadiness = await loadMpgfRealMoneyReadiness();

  if (cycleId !== demoCycle.id) {
    notFound();
  }

  return (
    <MpgfPageFrame
      description="Submit a bounded marginal-value ballot in demo mode and preview the deterministic allocation certificate."
      title={`Ballot for ${demoCycle.label}.`}
      realMoneyReadiness={realMoneyReadiness}
      viewerPresent={Boolean(viewer)}
    >
      <section className="section section-white">
        <MpgfConsole
          initialTab="ballot"
          manualEvidenceReadiness={manualEvidenceReadiness}
          participantState={participantState}
          realMoneyReadiness={realMoneyReadiness}
          viewerPresent={Boolean(viewer)}
        />
      </section>
    </MpgfPageFrame>
  );
}
