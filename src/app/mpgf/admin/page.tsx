import type { Metadata } from "next";
import Link from "next/link";

import { MpgfPageFrame } from "@/components/mpgf/mpgf-page-frame";
import { getViewer } from "@/lib/app-data";
import { evaluateAdminOperatorAccess, isAdminEmail } from "@/lib/admin";
import { loadBackgroundAccountSecuritySummary } from "@/lib/background-account-security";
import { loadMpgfProductionControlPlaneSummary } from "@/lib/mpgf/control-plane";
import { mpgfAdminSections } from "@/lib/mpgf/data";
import {
  getMpgfPublicGoodsAdminConsoles,
  validateMpgfPublicGoodsAdminConsoles,
} from "@/lib/mpgf/public-goods-admin-consoles";
import { getAbsoluteUrl } from "@/lib/seo";

export const metadata: Metadata = {
  title: "MPGF Admin",
  description: "Gated MPGF admin control plane for direct-working route readiness.",
  alternates: {
    canonical: "/mpgf/admin",
  },
  robots: {
    index: false,
    follow: false,
  },
  openGraph: {
    title: "MPGF Admin",
    description: "Gated MPGF admin control plane for direct-working route readiness.",
    url: getAbsoluteUrl("/mpgf/admin"),
    type: "website",
  },
};

export const dynamic = "force-dynamic";

export default async function MpgfAdminPage() {
  const viewer = await getViewer();
  const isAdmin = isAdminEmail(viewer?.authUser.email);
  const adminMfaSummary = isAdmin ? await loadBackgroundAccountSecuritySummary() : null;
  const adminAccess = evaluateAdminOperatorAccess({
    email: viewer?.authUser.email,
    mfaSummary: adminMfaSummary,
  });
  const controlPlane = adminAccess.allowed ? await loadMpgfProductionControlPlaneSummary() : null;
  const publicGoodsAdminConsoles = getMpgfPublicGoodsAdminConsoles();
  const publicGoodsAdminConsoleValidation = validateMpgfPublicGoodsAdminConsoles();

  return (
    <MpgfPageFrame
      actions={!viewer ? <Link className="button button-primary" href="/login?returnTo=/mpgf/admin">Sign in</Link> : null}
      description="Admin routes are mapped and gated. They expose no secrets and cannot enable real-money mode."
      title="MPGF admin control plane."
      viewerPresent={Boolean(viewer)}
    >
      <section className="mpgf-panel">
        <p className="eyebrow">{adminAccess.allowed ? "MFA-verified admin" : "Gated route"}</p>
        <h2>{adminAccess.allowed ? "Administrative sections" : "Admin access required"}</h2>
        {adminAccess.allowed ? (
          <>
            <div className="mpgf-control-summary">
              <div>
                <span>Overall status</span>
                <strong>{controlPlane?.status.replaceAll("_", " ")}</strong>
              </div>
              <div>
                <span>demo_complete</span>
                <strong>{controlPlane?.completionProfiles.demoComplete.replaceAll("_", " ")}</strong>
              </div>
              <div>
                <span>exact_pilot_complete</span>
                <strong>{controlPlane?.completionProfiles.exactPilotComplete.replaceAll("_", " ")}</strong>
              </div>
              <div>
                <span>real_money_complete</span>
                <strong>{controlPlane?.completionProfiles.realMoneyComplete.replaceAll("_", " ")}</strong>
              </div>
            </div>

            <div className="mpgf-admin-action-panel">
              <p className="eyebrow">moralpublicgoods131.md section 16</p>
              <h3>Operator console coverage</h3>
              <p>
                Registry, round, safety, sybil/collusion, and sponsor/governance consoles are
                mapped as MFA-gated, privacy-safe operator surfaces. They create no live authority
                and do not bypass moral public goods review, payment, authorization, sponsor, or
                audit gates.
              </p>
              <div className="mpgf-control-summary">
                <div>
                  <span>Consoles</span>
                  <strong>{publicGoodsAdminConsoleValidation.consoleCount}</strong>
                </div>
                <div>
                  <span>Required fields</span>
                  <strong>{publicGoodsAdminConsoleValidation.requiredLabelCount}</strong>
                </div>
                <div>
                  <span>Validation</span>
                  <strong>{publicGoodsAdminConsoleValidation.passed ? "passed" : "missing coverage"}</strong>
                </div>
              </div>
              <div className="mpgf-admin-grid">
                {publicGoodsAdminConsoles.map((consoleItem) => (
                  <Link key={consoleItem.key} className="mpgf-admin-link" href={consoleItem.adminHref}>
                    {consoleItem.title}
                  </Link>
                ))}
              </div>
            </div>

            <div className="mpgf-admin-action-panel">
              <p className="eyebrow">Self-service dominant assurance contracts</p>
              <h3>Exact-version DAC lifecycle review</h3>
              <p>
                Review creator proposals, freeze one immutable terms version, publish eligible
                campaigns, decide pledge eligibility, and record exactly one success or lapse
                outcome. The workflow cannot authorize or move money.
              </p>
              <div>
                <Link className="button button-primary" href="/mpgf/admin/dac-lifecycle">
                  Open DAC lifecycle review
                </Link>
              </div>
            </div>

            <div className="mpgf-gate-list">
              {controlPlane?.gates.map((gate) => (
                <article key={gate.key} className="mpgf-gate-row">
                  <div>
                    <p className="eyebrow">{gate.area.replaceAll("_", " ")}</p>
                    <h3>{gate.label}</h3>
                    <p>{gate.summary}</p>
                    {gate.blockers.length > 0 ? (
                      <ul className="mpgf-check-list">
                        {gate.blockers.slice(0, 4).map((blocker) => (
                          <li key={blocker}>{blocker}</li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                  <span className={`mpgf-gate-status mpgf-gate-status-${gate.status}`}>
                    {gate.status.replaceAll("_", " ")}
                  </span>
                </article>
              ))}
            </div>

            <div className="mpgf-admin-grid">
              {mpgfAdminSections.map((section) => (
                <Link key={section} className="mpgf-admin-link" href={`/mpgf/admin/${section}`}>
                  {section.replaceAll("-", " ")}
                </Link>
              ))}
            </div>
          </>
        ) : (
          <>
            <p>{adminAccess.message}</p>
            {isAdmin ? (
              <Link className="button button-secondary" href="/dashboard#account-security">
                Open account security
              </Link>
            ) : null}
          </>
        )}
      </section>
    </MpgfPageFrame>
  );
}
