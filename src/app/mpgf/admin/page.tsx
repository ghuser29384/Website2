import Link from "next/link";

import { MpgfPageFrame } from "@/components/mpgf/mpgf-page-frame";
import { getViewer } from "@/lib/app-data";
import { isAdminEmail } from "@/lib/admin";
import { mpgfAdminSections } from "@/lib/mpgf/data";

export default async function MpgfAdminPage() {
  const viewer = await getViewer();
  const isAdmin = isAdminEmail(viewer?.authUser.email);

  return (
    <MpgfPageFrame
      actions={!viewer ? <Link className="button button-primary" href="/login?returnTo=/mpgf/admin">Sign in</Link> : null}
      description="Admin routes are mapped and gated. They expose no secrets and cannot enable real-money mode."
      title="MPGF admin control plane."
      viewerPresent={Boolean(viewer)}
    >
      <section className="mpgf-panel">
        <p className="eyebrow">{isAdmin ? "Admin verified" : "Gated route"}</p>
        <h2>{isAdmin ? "Administrative sections" : "Admin access required"}</h2>
        {isAdmin ? (
          <div className="mpgf-admin-grid">
            {mpgfAdminSections.map((section) => (
              <Link key={section} className="mpgf-admin-link" href={`/mpgf/admin/${section}`}>
                {section.replaceAll("-", " ")}
              </Link>
            ))}
          </div>
        ) : (
          <p>Administrative sections require an authenticated admin session.</p>
        )}
      </section>
    </MpgfPageFrame>
  );
}
