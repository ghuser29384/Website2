import Link from "next/link";

import { MpgfPageFrame } from "@/components/mpgf/mpgf-page-frame";
import { getViewer } from "@/lib/app-data";

export default async function MpgfContributeCancelPage() {
  const viewer = await getViewer();

  return (
    <MpgfPageFrame
      actions={<Link className="button button-primary" href="/mpgf/contribute">Return to pledge demo</Link>}
      description="No MPGF pledge was changed."
      title="Contribution flow cancelled."
      viewerPresent={Boolean(viewer)}
    >
      <section className="mpgf-panel">
        <h2>Safe cancellation state</h2>
        <p>The MPGF pilot does not create payment-provider sessions, so cancellation cannot leave a dangling charge.</p>
      </section>
    </MpgfPageFrame>
  );
}
