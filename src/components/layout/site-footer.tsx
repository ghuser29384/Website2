import Link from "next/link";

import { MoralTradeWordmark, MutualStepMark } from "@/components/brand/moral-trade-wordmark";

const footerLinkGroups = [
  {
    title: "Use",
    links: [
      { href: "/offers", label: "Explore trades" },
      { href: "/worked-examples", label: "Worked examples" },
      { href: "/background-networking", label: "Private matching" },
      { href: "/cohort", label: "Join the network" },
    ],
  },
  {
    title: "Trust",
    links: [
      { href: "/trust", label: "What you can rely on" },
      { href: "/status", label: "Service status" },
      { href: "/validation", label: "Validation" },
      { href: "/safety", label: "Safety" },
    ],
  },
  {
    title: "Research",
    links: [
      { href: "/research", label: "Research and governance" },
      { href: "/sources", label: "Sources" },
      { href: "/moral-trade/technical-spec", label: "Technical specification" },
      { href: "/moral-goods-group-buying", label: "Moral public goods" },
    ],
  },
] as const;

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
          <h2>Cooperation does not require agreement.</h2>
          <p>
            A coordination platform for voluntary, bounded, evidence-reviewed commitments across
            moral disagreement.
          </p>
        </div>

        <nav aria-label="Footer" className="mt-footer-links">
          {footerLinkGroups.map((group) => (
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
          Moral Trade does not provide legal, tax, escrow, custody, or investment services. Terms
          remain voluntary and reviewable before reliance.
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
