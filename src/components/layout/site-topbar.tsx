"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { createClient } from "@/lib/supabase/browser";

interface NavLinkItem {
  href: string;
  label: string;
}

interface SiteTopbarProps {
  brandHref: string;
  links: NavLinkItem[];
  authLink?: NavLinkItem;
  primaryAction?: NavLinkItem;
  showLogout?: boolean;
  logoutRedirectTo?: string;
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

export function SiteTopbar({
  brandHref,
  links,
  authLink,
  primaryAction,
  showLogout = false,
  logoutRedirectTo = "/",
}: SiteTopbarProps) {
  const router = useRouter();
  const [isLoggingOut, startLogoutTransition] = useTransition();

  function handleLogout() {
    startLogoutTransition(async () => {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push(logoutRedirectTo);
      router.refresh();
    });
  }

  return (
    <nav className="topbar">
      <NavItem className="brand" href={brandHref} label="Moral Trade" />
      <div className="topbar-nav">
        <div className="topbar-links">
          {links.map((link) => (
            <NavItem key={`${link.href}-${link.label}`} href={link.href} label={link.label} />
          ))}
          {authLink ? (
            <NavItem
              className="topbar-auth-link"
              href={authLink.href}
              label={authLink.label}
            />
          ) : null}
        </div>
        {showLogout || primaryAction ? (
          <div className="topbar-actions">
            {showLogout ? (
              <button
                className="button button-secondary button-nav"
                disabled={isLoggingOut}
                type="button"
                onClick={handleLogout}
              >
                {isLoggingOut ? "Logging out..." : "Log out"}
              </button>
            ) : null}
            {primaryAction ? (
              <NavItem
                className="button button-nav"
                href={primaryAction.href}
                label={primaryAction.label}
              />
            ) : null}
          </div>
        ) : null}
      </div>
    </nav>
  );
}
