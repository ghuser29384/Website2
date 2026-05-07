import { notFound } from "next/navigation";

import { MpgfConsole } from "@/components/mpgf/mpgf-console";
import { MpgfPageFrame } from "@/components/mpgf/mpgf-page-frame";
import { getViewer } from "@/lib/app-data";
import { demoCycle } from "@/lib/mpgf/data";

interface MpgfBallotPageProps {
  params: Promise<{ cycleId: string }>;
}

export default async function MpgfBallotPage({ params }: MpgfBallotPageProps) {
  const { cycleId } = await params;
  const viewer = await getViewer();

  if (cycleId !== demoCycle.id) {
    notFound();
  }

  return (
    <MpgfPageFrame
      description="Submit a bounded marginal-value ballot in demo mode and preview the deterministic allocation certificate."
      title={`Ballot for ${demoCycle.label}.`}
      viewerPresent={Boolean(viewer)}
    >
      <section className="section section-white">
        <MpgfConsole initialTab="ballot" />
      </section>
    </MpgfPageFrame>
  );
}
