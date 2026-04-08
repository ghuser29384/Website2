import Link from "next/link";

import { FOOTER_LINK_GROUPS } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="footer">
      <div className="footer-grid">
        <div className="footer-intro">
          <p className="eyebrow">Moral Trade</p>
          <h2>Structured moral commitments, presented with explicit terms and visible limits.</h2>
          <p>
            Moral Trade is a public-interest prototype for reciprocal moral commitments. It is
            designed to make reasoning, verification, and uncertainty easier to inspect than
            they would be in an informal bargain.
          </p>
        </div>

        {FOOTER_LINK_GROUPS.map((group) => (
          <div key={group.title} className="footer-column">
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
      </div>

      <div className="footer-meta">
        <p>
          Reference points include Toby Ord&apos;s paper on moral trade and Forethought&apos;s
          discussion of moral public goods. No endorsements or institutional affiliations are
          claimed here.
        </p>
        <p>
          Current limitations are stated openly: no escrow, no legal review, and no guarantee
          that all morally relevant considerations have been captured by the interface.
        </p>
      </div>
    </footer>
  );
}
