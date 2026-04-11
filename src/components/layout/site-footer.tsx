import Link from "next/link";

import { FOOTER_LINK_GROUPS } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="footer">
      <div className="footer-grid">
        <div className="footer-intro">
          <p className="eyebrow">Moral Trade</p>
          <h2>A project about gains from moral trade.</h2>
          <p>
            The central thought is simple: people with different moral views may be able to make
            exchanges that each sees as morally better.
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
          The site is organized around Toby Ord&apos;s paper on moral trade. It uses that paper as
          a source, not as an endorsement claim.
        </p>
      </div>
    </footer>
  );
}
