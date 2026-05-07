import type { Metadata } from "next";
import Link from "next/link";

import { MpgfConsole } from "@/components/mpgf/mpgf-console";
import { MpgfPageFrame } from "@/components/mpgf/mpgf-page-frame";
import { getViewer } from "@/lib/app-data";
import { MPGF_COPY } from "@/lib/mpgf/data";
import { getAbsoluteUrl } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Contribute to MPGF",
  description: "Create a non-real-money MPGF pledge or monthly recurring pledge commitment.",
  alternates: {
    canonical: "/mpgf/contribute",
  },
  openGraph: {
    title: "Contribute to MPGF",
    description: "Create a non-real-money MPGF pledge or monthly recurring pledge commitment.",
    url: getAbsoluteUrl("/mpgf/contribute"),
    type: "website",
  },
};

export default async function MpgfContributePage() {
  const viewer = await getViewer();

  return (
    <MpgfPageFrame
      actions={
        viewer ? (
          <Link className="button button-secondary" href="/mpgf/account/contributions">My demo pledges</Link>
        ) : (
          <Link className="button button-secondary" href="/login?returnTo=/mpgf/contribute">Sign in for account state</Link>
        )
      }
      description={MPGF_COPY.pledgeOnly}
      title="Create pledge-only commitments without charging money."
      viewerPresent={Boolean(viewer)}
    >
      <section className="section section-white">
        <MpgfConsole initialTab="contribute" />
      </section>
    </MpgfPageFrame>
  );
}
