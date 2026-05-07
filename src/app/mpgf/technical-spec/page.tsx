import type { Metadata } from "next";
import Link from "next/link";

import { MpgfPageFrame } from "@/components/mpgf/mpgf-page-frame";
import { getViewer } from "@/lib/app-data";
import { runMpgfDirectWorkingSmokeTest, validateMpgfPhaseA } from "@/lib/mpgf/validators";
import { getAbsoluteUrl } from "@/lib/seo";

export const metadata: Metadata = {
  title: "MPGF Technical Spec",
  description: "Technical state, validators, and canonical instruction pointers for the MPGF pilot.",
  alternates: {
    canonical: "/mpgf/technical-spec",
  },
  openGraph: {
    title: "MPGF Technical Spec",
    description: "Technical state, validators, and canonical instruction pointers for the MPGF pilot.",
    url: getAbsoluteUrl("/mpgf/technical-spec"),
    type: "website",
  },
};

export default async function MpgfTechnicalSpecPage() {
  const viewer = await getViewer();
  const phaseA = validateMpgfPhaseA();
  const smoke = runMpgfDirectWorkingSmokeTest();

  return (
    <MpgfPageFrame
      actions={<Link className="button button-primary" href="/mpgf">Open MPGF</Link>}
      description="The canonical Build Instruction has been materialized and the direct-working validators are exposed here."
      title="MPGF technical spec and gate evidence."
      viewerPresent={Boolean(viewer)}
    >
      <section className="mpgf-detail-grid">
        <article className="mpgf-panel">
          <p className="eyebrow">Canonical instruction</p>
          <h2>docs/mpgf/codex-build-instruction-final.md</h2>
          <p>
            Phase 0 materialized the latest source artifact into the canonical operative instruction
            document used for implementation.
          </p>
        </article>
        <article className="mpgf-panel">
          <p className="eyebrow">Validators</p>
          <dl className="mpgf-summary-grid">
            <div>
              <dt>Phase A</dt>
              <dd>{phaseA.status}</dd>
            </div>
            <div>
              <dt>Smoke test</dt>
              <dd>{smoke.status}</dd>
            </div>
            <div>
              <dt>Blockers</dt>
              <dd>{phaseA.blockers.length + smoke.blockers.length}</dd>
            </div>
            <div>
              <dt>Mode</dt>
              <dd>{smoke.featureMode.replaceAll("_", " ")}</dd>
            </div>
          </dl>
        </article>
      </section>

      <section className="mpgf-panel">
        <p className="eyebrow">Direct-working checks</p>
        <div className="mpgf-table">
          <div className="mpgf-table-row mpgf-table-head">
            <span>Check</span>
            <span>Status</span>
            <span>Evidence</span>
          </div>
          {smoke.checks.map((check) => (
            <div key={check.id} className="mpgf-table-row">
              <span>{check.label}</span>
              <span>{check.status}</span>
              <span>{check.evidence}</span>
            </div>
          ))}
        </div>
      </section>
    </MpgfPageFrame>
  );
}
