import Link from "next/link";

import { MpgfPageFrame } from "@/components/mpgf/mpgf-page-frame";
import { getViewer } from "@/lib/app-data";

export default async function MpgfContributeSuccessPage() {
  const viewer = await getViewer();

  return (
    <MpgfPageFrame
      actions={<Link className="button button-primary" href="/mpgf/account/contributions">View contribution state</Link>}
      description="Your non-real-money pledge state is ready for the direct-working demo."
      title="Pledge recorded in demo mode."
      viewerPresent={Boolean(viewer)}
    >
      <section className="mpgf-panel">
        <h2>No money moved</h2>
        <p>
          This success state is intentionally pledge-only. It does not confirm a donation, charge,
          payment, subscription, receipt, or tax-deductible gift.
        </p>
      </section>
    </MpgfPageFrame>
  );
}
