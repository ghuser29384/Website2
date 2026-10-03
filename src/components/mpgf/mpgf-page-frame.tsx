import Link from "next/link";
import type { ReactNode } from "react";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { Breadcrumbs } from "@/components/ui/page-primitives";
import type { MpgfRealMoneyReadiness } from "@/lib/mpgf/real-money-types";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";

interface MpgfPageFrameProps {
  children: ReactNode;
  eyebrow?: string;
  title: string;
  description: string;
  realMoneyReadiness?: MpgfRealMoneyReadiness;
  viewerPresent: boolean;
  actions?: ReactNode;
  modeItems?: string[];
  participationTitle?: string;
  participationItems?: Array<{ label: string; description: string }>;
  technicalSpecHref?: string;
}

export function MpgfPageFrame({
  actions,
  children,
  description,
  eyebrow = "Public Goods Fund",
  modeItems,
  participationItems,
  participationTitle = "How participation works",
  realMoneyReadiness,
  technicalSpecHref = "/mpgf/technical-spec",
  title,
  viewerPresent,
}: MpgfPageFrameProps) {
  const realMoneyReady = Boolean(realMoneyReadiness?.ready);
  const resolvedModeItems = modeItems ?? [
    "Every.org fast route",
    "Webhook before counting",
    "Reviewer verification",
    realMoneyReady ? "Approved external checkout available" : "Direct-to-charity or pledge-only",
  ];
  const resolvedParticipationItems = participationItems ?? [
    {
      label: "1. Choose route",
      description: "Use Every.org, a sponsor-backed route when active, or a non-custodial pledge intent.",
    },
    {
      label: "2. Wait for import",
      description: "Redirects remain pending until provider webhooks or reviewed evidence arrive.",
    },
    {
      label: "3. Review before counting",
      description: "The fund counts a contribution only after the relevant evidence state is reviewed.",
    },
    {
      label: "Payment route",
      description: realMoneyReady
        ? "An approved external provider route is available for eligible signed-in participants"
        : "Direct-to-charity payment, pledge intent, and reviewed external evidence only",
    },
  ];

  return (
    <div className="page-shell mpgf-shell">
      <header className="mpgf-hero">
        <SiteTopbar
          brandHref="/"
          links={getPrimaryNavLinks(viewerPresent)}
          {...getTopbarActions(viewerPresent)}
          showLogout={viewerPresent}
        />
        <Breadcrumbs items={[{ href: "/mpgf", label: "Public Goods Fund" }]} />

        <div className="mpgf-hero-grid">
          <section className="mpgf-hero-copy">
            <p className="eyebrow">{eyebrow}</p>
            <h1>{title}</h1>
            <p className="hero-text">{description}</p>
            <div className="mpgf-mode-strip" aria-label="Public Goods Fund mode">
              {resolvedModeItems.map((item) => <span key={item}>{item}</span>)}
            </div>
            {actions ? <div className="hero-actions">{actions}</div> : null}
          </section>

          <aside className="mpgf-status-panel" aria-label="Public Goods Fund participation status">
            <p className="eyebrow">{participationTitle}</p>
            <dl>
              {resolvedParticipationItems.map((item) => (
                <div key={item.label}>
                  <dt>{item.label}</dt>
                  <dd>{item.description}</dd>
                </div>
              ))}
            </dl>
            <Link className="inline-link" href={technicalSpecHref}>
              Technical spec
            </Link>
          </aside>
        </div>
      </header>

      <main id="main-content" tabIndex={-1}>
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
