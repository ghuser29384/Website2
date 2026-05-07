import { notFound } from "next/navigation";
import Link from "next/link";

import { MpgfPageFrame } from "@/components/mpgf/mpgf-page-frame";
import { isAdminEmail } from "@/lib/admin";
import { getViewer } from "@/lib/app-data";
import { mpgfAdminSections } from "@/lib/mpgf/data";

interface MpgfAdminSectionPageProps {
  params: Promise<{ section: string }>;
}

export default async function MpgfAdminSectionPage({ params }: MpgfAdminSectionPageProps) {
  const { section } = await params;
  const viewer = await getViewer();
  const isAdmin = isAdminEmail(viewer?.authUser.email);

  if (!mpgfAdminSections.includes(section as (typeof mpgfAdminSections)[number])) {
    notFound();
  }

  return (
    <MpgfPageFrame
      actions={<Link className="button button-secondary" href="/mpgf/admin">All admin sections</Link>}
      description="This admin section is present for route readiness and remains gated until an authenticated admin is available."
      title={`MPGF admin: ${section.replaceAll("-", " ")}.`}
      viewerPresent={Boolean(viewer)}
    >
      <section className="mpgf-panel">
        <p className="eyebrow">{isAdmin ? "Admin verified" : "Gated route"}</p>
        <h2>{isAdmin ? "Section ready" : "No administrative mutation available"}</h2>
        <p>
          This route maps the Build Instruction admin surface. In direct-working mode it exposes a
          safe placeholder state, performs no secret disclosure, and cannot approve real money,
          automated payouts, external payouts, or live authorizations.
        </p>
      </section>
    </MpgfPageFrame>
  );
}
