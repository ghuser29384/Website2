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
}

export function MpgfPageFrame({
  actions,
  children,
  description,
  eyebrow = "Public Goods Fund",
  realMoneyReadiness,
  title,
  viewerPresent,
}: MpgfPageFrameProps) {
  const realMoneyReady = Boolean(realMoneyReadiness?.ready);

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
              <span>Every.org fast route</span>
              <span>Webhook before counting</span>
              <span>Reviewer verification</span>
              <span>{realMoneyReady ? "Integrated checkout available" : "Integrated checkout planned, not active"}</span>
            </div>
            {actions ? <div className="hero-actions">{actions}</div> : null}
          </section>

          <aside className="mpgf-status-panel" aria-label="Current MPGF pilot status">
            <p className="eyebrow">How participation works</p>
            <dl>
              <div>
                <dt>1. Choose route</dt>
                <dd>Use the Every.org fast route, saved commitment path, or fallback evidence flow.</dd>
              </div>
              <div>
                <dt>2. Wait for import</dt>
                <dd>Redirects remain pending until provider webhooks or reviewed evidence arrive.</dd>
              </div>
              <div>
                <dt>3. Review before counting</dt>
                <dd>The fund only counts reviewed evidence in contribution state.</dd>
              </div>
              <div>
                <dt>Integrated checkout</dt>
                <dd>{realMoneyReady ? "Available for eligible signed-in participants" : "Planned after provider approval"}</dd>
              </div>
            </dl>
            <Link className="inline-link" href="/mpgf/technical-spec">
              Technical spec
            </Link>
          </aside>
        </div>
      </header>

      <main id="main-content" tabIndex={-1}>{children}</main>
      <SiteFooter />
    </div>
  );
}
