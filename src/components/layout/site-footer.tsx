import Link from "next/link";

import { MoralTradeWordmark, MutualStepMark } from "@/components/brand/moral-trade-wordmark";

const footerLinkGroups = [
  {
    title: "Explore",
    links: [
      { href: "/what-is-moral-trade", label: "What is Moral Trade?" },
      { href: "/offers", label: "Browse trades" },
      { href: "/worked-examples", label: "Worked examples" },
      { href: "/cohort", label: "Founding cohort" },
    ],
  },
  {
    title: "Standards",
    links: [
      { href: "/safety", label: "Safety" },
      { href: "/validation", label: "Validation" },
      { href: "/transparency", label: "Transparency" },
      { href: "/status", label: "Pilot status" },
    ],
  },
  {
    title: "Research",
    links: [
      { href: "/research", label: "Research & governance" },
      { href: "/sources", label: "Sources" },
      { href: "/moral-trade/technical-spec", label: "Technical specification" },
      { href: "/mpgf", label: "Moral public goods" },
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
            A pilot for small, voluntary, evidence-reviewed commitments across moral
            disagreement.
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
          Moral Trade does not provide legal, tax, escrow, custody, or investment services.
          Terms remain voluntary and reviewable before reliance.
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
