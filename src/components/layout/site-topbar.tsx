import Link from "next/link";

interface NavLinkItem {
  href: string;
  label: string;
}

interface SiteTopbarProps {
  brandHref: string;
  links: NavLinkItem[];
  primaryAction?: NavLinkItem;
}

function NavItem({ href, label, className }: NavLinkItem & { className?: string }) {
  if (href.startsWith("#")) {
    return (
      <a className={className} href={href}>
        {label}
      </a>
    );
  }

  return (
    <Link className={className} href={href}>
      {label}
    </Link>
  );
}

export function SiteTopbar({ brandHref, links, primaryAction }: SiteTopbarProps) {
  return (
    <nav className="topbar">
      <NavItem className="brand" href={brandHref} label="Moral Trade" />
      <div className="topbar-nav">
        <div className="topbar-links">
          {links.map((link) => (
            <NavItem key={`${link.href}-${link.label}`} href={link.href} label={link.label} />
          ))}
        </div>
        {primaryAction ? (
          <div className="topbar-actions">
            <NavItem
              className="button button-nav"
              href={primaryAction.href}
              label={primaryAction.label}
            />
          </div>
        ) : null}
      </div>
    </nav>
  );
}
