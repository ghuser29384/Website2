import type { Metadata } from "next";
import Link from "next/link";

import { MpgfContributionControls } from "@/components/mpgf/mpgf-contribution-controls";
import { MpgfPageFrame } from "@/components/mpgf/mpgf-page-frame";
import { getViewer } from "@/lib/app-data";
import { loadMpgfParticipantState } from "@/lib/mpgf/persistence";
import { loadMpgfRealMoneyAccountState, loadMpgfRealMoneyReadiness } from "@/lib/mpgf/real-money";
import { getAbsoluteUrl } from "@/lib/seo";

export const metadata: Metadata = {
  title: "MPGF Contribution State",
  description: "View MPGF manual evidence, pledge records, and account contribution state.",
  alternates: {
    canonical: "/mpgf/account/contributions",
  },
  openGraph: {
    title: "MPGF Contribution State",
    description: "View MPGF manual evidence, pledge records, and account contribution state.",
    url: getAbsoluteUrl("/mpgf/account/contributions"),
    type: "website",
  },
};

export const dynamic = "force-dynamic";

export default async function MpgfAccountContributionsPage() {
  const viewer = await getViewer();
  const participantState = await loadMpgfParticipantState({
    userId: viewer?.authUser.id,
    displayName: viewer?.displayName,
  });
  const realMoneyReadiness = await loadMpgfRealMoneyReadiness();
  const realMoneyAccountState = await loadMpgfRealMoneyAccountState({
    userId: viewer?.authUser.id,
  });

  return (
    <MpgfPageFrame
      actions={
        viewer ? (
          <Link className="button button-primary" href="/mpgf/contribute">Submit evidence</Link>
        ) : (
          <Link className="button button-primary" href="/login?returnTo=/mpgf/account/contributions">Sign in</Link>
        )
      }
      description="Track submitted manual evidence, review status, and pledge rehearsal records from one account view."
      title="Your MPGF evidence and contribution state."
      realMoneyReadiness={realMoneyReadiness}
      viewerPresent={Boolean(viewer)}
    >
      <section className="section section-white">
        <MpgfContributionControls
          participantState={participantState}
          realMoneyAccountState={realMoneyAccountState}
          pledges={participantState.pledges}
          recurringCommitments={participantState.recurringCommitments}
          viewerPresent={Boolean(viewer)}
        />
      </section>
    </MpgfPageFrame>
  );
}
