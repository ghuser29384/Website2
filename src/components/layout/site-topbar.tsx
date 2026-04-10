"use client";

import Image from "next/image";
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
      <Link aria-label="Moral Trade" className="brand" href={brandHref}>
        <Image
          alt="Moral Trade mark"
          className="brand-logo"
          height={44}
          priority
          src="/O%20(8).png"
          width={44}
        />
        <span className="brand-name">Moral Trade</span>
      </Link>
      <div className="topbar-links">
        {links.map((link) => (
          <NavItem key={`${link.href}-${link.label}`} href={link.href} label={link.label} />
        ))}
      </div>
      {showLogout || authLink || primaryAction ? (
        <div className="topbar-actions">
          {primaryAction ? (
            <NavItem className="button button-nav" href={primaryAction.href} label={primaryAction.label} />
          ) : null}
          {authLink ? (
            <NavItem
              className="button button-secondary button-nav"
              href={authLink.href}
              label={authLink.label}
            />
          ) : null}
          {showLogout ? (
            <button
              className="topbar-utility"
              disabled={isLoggingOut}
              type="button"
              onClick={handleLogout}
            >
              {isLoggingOut ? "Logging out..." : "Log out"}
            </button>
          ) : null}
        </div>
      ) : null}
    </nav>
  );
}
