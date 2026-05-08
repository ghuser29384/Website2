import Link from "next/link";

import { MpgfPageFrame } from "@/components/mpgf/mpgf-page-frame";
import { getViewer } from "@/lib/app-data";
import { demoPledges } from "@/lib/mpgf/data";
import { formatUsd } from "@/lib/mpgf/mechanism";

export default async function MpgfAccountContributionsPage() {
  const viewer = await getViewer();

  return (
    <MpgfPageFrame
      actions={
        viewer ? (
          <Link className="button button-primary" href="/mpgf/contribute">Create another pledge</Link>
        ) : (
          <Link className="button button-primary" href="/login?returnTo=/mpgf/account/contributions">Sign in</Link>
        )
      }
      description="View non-real-money pledge-only commitments and account-state controls."
      title="Your MPGF contribution state."
      viewerPresent={Boolean(viewer)}
    >
      <section className="section section-white">
        <div className="mpgf-table">
          <div className="mpgf-table-row mpgf-table-head">
            <span>Commitment</span>
            <span>Cadence</span>
            <span>Status</span>
            <span>Controls</span>
          </div>
          {demoPledges.map((pledge) => (
            <div key={pledge.id} className="mpgf-table-row">
              <span>{formatUsd(pledge.amountCents)}</span>
              <span>{pledge.cadence.replace("_", " ")}</span>
              <span>{pledge.status}</span>
              <span className="mpgf-inline-actions">
                <button className="button button-secondary" disabled type="button">Pause</button>
                <button className="button button-secondary" disabled type="button">Resume</button>
                <button className="button button-secondary" disabled type="button">Cancel</button>
              </span>
            </div>
          ))}
        </div>
      </section>
    </MpgfPageFrame>
  );
}
