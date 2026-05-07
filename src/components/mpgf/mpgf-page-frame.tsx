import Link from "next/link";
import type { ReactNode } from "react";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";

interface MpgfPageFrameProps {
  children: ReactNode;
  eyebrow?: string;
  title: string;
  description: string;
  viewerPresent: boolean;
  actions?: ReactNode;
}

export function MpgfPageFrame({
  actions,
  children,
  description,
  eyebrow = "Moral Public Goods Fund",
  title,
  viewerPresent,
}: MpgfPageFrameProps) {
  return (
    <div className="page-shell mpgf-shell">
      <header className="mpgf-hero">
        <SiteTopbar
          brandHref="/"
          links={getPrimaryNavLinks(viewerPresent)}
          {...getTopbarActions(viewerPresent)}
          showLogout={viewerPresent}
        />

        <div className="mpgf-hero-grid">
          <section className="mpgf-hero-copy">
            <p className="eyebrow">{eyebrow}</p>
            <h1>{title}</h1>
            <p className="hero-text">{description}</p>
            <div className="mpgf-mode-strip" aria-label="MPGF mode">
              <span>Non-real-money</span>
              <span>Pledge-only</span>
              <span>Real money disabled</span>
            </div>
            {actions ? <div className="hero-actions">{actions}</div> : null}
          </section>

          <aside className="mpgf-status-panel" aria-label="Current MPGF pilot status">
            <p className="eyebrow">Pilot state</p>
            <dl>
              <div>
                <dt>Cycle</dt>
                <dd>May 2026 demo</dd>
              </div>
              <div>
                <dt>Contribution mode</dt>
                <dd>Pledge-only</dd>
              </div>
              <div>
                <dt>Payments</dt>
                <dd>Disabled</dd>
              </div>
              <div>
                <dt>Payouts</dt>
                <dd>Disabled</dd>
              </div>
            </dl>
            <Link className="inline-link" href="/mpgf/technical-spec">
              Technical spec
            </Link>
          </aside>
        </div>
      </header>

      <main>{children}</main>
      <SiteFooter />
    </div>
  );
}
