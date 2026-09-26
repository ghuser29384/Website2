import Link from "next/link";

import { MoralTradeWordmark, MutualStepMark } from "@/components/brand/moral-trade-wordmark";
import { FOOTER_LINK_GROUPS } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="footer mt-site-footer">
      <div className="mt-footer-lead">
        <Link prefetch={false} aria-label="Moral Trade, home" className="mt-footer-brand" href="/">
          <MoralTradeWordmark />
        </Link>
        <MutualStepMark className="mt-footer-mark" />
      </div>

      <div className="footer-grid mt-footer-grid">
        <div className="footer-intro mt-footer-intro">
          <h2>A marketplace for productive difference.</h2>
          <p>
            Trade commitments, redirect offsetting donations, and join conditional funding pools.
            Moral Trade keeps the no-deal default, maximum exposure, evidence, settlement, and exit
            terms visible before reliance.
          </p>
          <p>
            Research supports the mechanism. The public product is the marketplace and coordination
            infrastructure.
          </p>
        </div>

        <nav aria-label="Footer" className="mt-footer-links">
          {FOOTER_LINK_GROUPS.map((group) => (
            <div className="footer-column" key={group.title}>
              <h3>{group.title}</h3>
              <ul className="footer-links">
                {group.links.map((link) => (
                  <li key={link.href}>
                    <Link prefetch={false} href={link.href}>{link.label}</Link>
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
          Payment, custody, authorization, settlement, and refund capabilities are disclosed at the
          point where a user could rely on them.
        </p>
        <p>© 2026 Moral Trade</p>
        <div className="mt-footer-legal">
          <Link prefetch={false} href="/privacy">Privacy</Link>
          <Link prefetch={false} href="/terms">Terms</Link>
          <Link prefetch={false} href="/accessibility">Accessibility</Link>
          <Link prefetch={false} href="/contact">Contact</Link>
        </div>
      </div>
    </footer>
  );
}
