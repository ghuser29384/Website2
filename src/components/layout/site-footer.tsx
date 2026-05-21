import { FooterLinkGroup } from "@/components/ui/page-primitives";
import { FOOTER_LINK_GROUPS } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="footer">
      <div className="footer-grid">
        <div className="footer-intro">
          <p className="eyebrow">Moral Trade</p>
          <h2>Voluntary trade under disagreement.</h2>
          <p>
            Moral Trade is a prototype marketplace for voluntary moral trade, donation offsets, and
            shared public-good coordination. It does not provide legal, tax, escrow, or custody
            services.
          </p>
        </div>

        {FOOTER_LINK_GROUPS.map((group) => (
          <FooterLinkGroup key={group.title} links={group.links} title={group.title} />
        ))}
      </div>

      <div className="footer-meta">
        <p>
          Reference points include Toby Ord&apos;s paper on moral trade and Forethought&apos;s
          discussion of convergence, compromise, threats, blockers, and moral public goods.
        </p>
      </div>
    </footer>
  );
}
