import Link from "next/link";

import { FOOTER_LINK_GROUPS } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="footer">
      <div className="footer-grid">
        <div className="footer-intro">
          <p className="eyebrow">Moral Trade</p>
          <h2>A public-interest project for disciplined moral coordination under disagreement.</h2>
          <p>
            Moral Trade is designed to make reasoning, verification, and institutional limits more
            inspectable than they would be in an informal bargain. The ambition is seriousness,
            not spectacle.
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
          discussion of moral public goods. These references inform the reasoning standard; they
          are not presented as endorsements.
        </p>
      </div>
    </footer>
  );
}
