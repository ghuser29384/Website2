import Link from "next/link";

import { MoralTradeWordmark, MutualStepMark } from "@/components/brand/moral-trade-wordmark";
import { FOOTER_LINK_GROUPS } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="footer mt-site-footer">
      <div className="mt-footer-lead">
        <Link aria-label="Moral Trade, home" className="mt-footer-brand" href="/">
          <MoralTradeWordmark />
        </Link>
        <MutualStepMark className="mt-footer-mark" />
      </div>

      <div className="footer-grid mt-footer-grid">
        <div className="footer-intro mt-footer-intro">
          <h2>A marketplace for productive difference.</h2>
          <p>
            Trade commitments, redirect offsetting donations, and join funding pools that activate
            only when their goal is met. Before you agree, Moral Trade shows what happens without a
            deal, the most you can commit, the evidence needed, payment terms, and how to leave.
          </p>
          <p>
            Research informs how Moral Trade works. The public product is the marketplace itself.
          </p>
        </div>

        <nav aria-label="Footer" className="mt-footer-links">
          {FOOTER_LINK_GROUPS.map((group) => (
            <div className="footer-column" key={group.title}>
              <h3>{group.title}</h3>
              <ul className="footer-links">
                {group.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href}>{link.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </div>

      <div className="footer-meta mt-footer-meta">
        <p>
          Moral Trade does not provide legal, tax, investment, or blanket impact certification.
          Before you make a payment, the site tells you whether it can hold, charge, send, or refund
          money for that specific trade.
        </p>
        <p>© 2026 Moral Trade</p>
        <div className="mt-footer-legal">
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/accessibility">Accessibility</Link>
          <Link href="/contact">Contact</Link>
        </div>
      </div>
    </footer>
  );
}
