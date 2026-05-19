import Link from "next/link";
import type { ReactNode } from "react";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
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
  eyebrow = "Moral Public Goods Fund",
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

        <div className="mpgf-hero-grid">
          <section className="mpgf-hero-copy">
            <p className="eyebrow">{eyebrow}</p>
            <h1>{title}</h1>
            <p className="hero-text">{description}</p>
            <div className="mpgf-mode-strip" aria-label="MPGF mode">
              <span>Manual evidence first</span>
              <span>{realMoneyReady ? "Integrated checkout available" : "External payment evidence"}</span>
              <span>Reviewer verification</span>
            </div>
            {actions ? <div className="hero-actions">{actions}</div> : null}
          </section>

          <aside className="mpgf-status-panel" aria-label="Current MPGF pilot status">
            <p className="eyebrow">How participation works</p>
            <dl>
              <div>
                <dt>1. Pay externally</dt>
                <dd>Use the approved public payment destination for the pilot.</dd>
              </div>
              <div>
                <dt>2. Submit evidence</dt>
                <dd>Record the receipt, reference, amount, and payment date.</dd>
              </div>
              <div>
                <dt>3. Review before counting</dt>
                <dd>MPGF only counts reviewed evidence in contribution state.</dd>
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

      <main>{children}</main>
      <SiteFooter />
    </div>
  );
}
