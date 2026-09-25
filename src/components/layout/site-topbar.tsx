"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Fragment, useId, useState, useTransition } from "react";

import { MoralTradeWordmark } from "@/components/brand/moral-trade-wordmark";
import { createClient } from "@/lib/supabase/browser";

interface NavRouteItem {
  href: string;
  label: string;
  description?: string;
  section?: string;
}

interface NavLinkItem {
  href?: string;
  label: string;
  summary?: string;
  items?: NavRouteItem[];
}

interface SiteTopbarProps {
  brandHref: string;
  links: NavLinkItem[];
  authLink?: NavRouteItem;
  primaryAction?: NavRouteItem;
  showSearch?: boolean;
  showLogout?: boolean;
  logoutRedirectTo?: string;
}

function getHrefPath(href: string) {
  const [path] = href.split("#");
  return path || "/";
}

function isHrefActive(pathname: string | null, href: string) {
  const targetPath = getHrefPath(href);

  if (targetPath === "/") {
    return href === "/" && pathname === "/";
  }

  return pathname === targetPath || pathname?.startsWith(`${targetPath}/`);
}

function NavItem({ href, label, className }: { href: string; label: string; className?: string }) {
  const pathname = usePathname();
  const isActive = isHrefActive(pathname, href);

  return (
    <Link
      prefetch={false}
      aria-current={isActive ? "page" : undefined}
      className={[className, isActive ? "is-active" : ""].filter(Boolean).join(" ")}
      href={href}
    >
      {label}
    </Link>
  );
}

function NavMenu({
  isOpen,
  items,
  label,
  onOpenChange,
  summary,
}: {
  isOpen: boolean;
  items: NavRouteItem[];
  label: string;
  onOpenChange: (isOpen: boolean) => void;
  summary?: string;
}) {
  const pathname = usePathname();
  const hasActiveItem = items.some((item) => isHrefActive(pathname, item.href));

  return (
    <details
      className={["topbar-menu", hasActiveItem ? "is-active" : ""].filter(Boolean).join(" ")}
      open={isOpen}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          onOpenChange(false);
          event.currentTarget.querySelector("summary")?.focus();
        }
      }}
      onToggle={(event) => onOpenChange(event.currentTarget.open)}
    >
      <summary className="topbar-menu-trigger">
        <span>{label}</span>
        <span aria-hidden="true" className="topbar-menu-caret">
          ▾
        </span>
      </summary>
      <div className="topbar-menu-panel">
        {summary ? <p className="topbar-menu-heading">{summary}</p> : null}
        {items.map((item, index) => {
          const showSection = item.section && item.section !== items[index - 1]?.section;

          return item.href ? (
            <Fragment key={`${item.href}-${item.label}`}>
              {showSection ? <div className="topbar-menu-section">{item.section}</div> : null}
              <Link
                prefetch={false}
                aria-current={isHrefActive(pathname, item.href) ? "page" : undefined}
                className={["topbar-menu-link", isHrefActive(pathname, item.href) ? "is-active" : ""]
                  .filter(Boolean)
                  .join(" ")}
                href={item.href}
                onClick={() => onOpenChange(false)}
              >
                <span className="topbar-menu-icon" aria-hidden="true" />
                <span className="topbar-menu-copy">
                  <span>{item.label}</span>
                  {item.description ? <small>{item.description}</small> : null}
                </span>
              </Link>
            </Fragment>
          ) : null;
        })}
      </div>
    </details>
  );
}

export function SiteTopbar({
  brandHref,
  links,
  authLink,
  primaryAction,
  showSearch = true,
  showLogout = false,
  logoutRedirectTo = "/",
}: SiteTopbarProps) {
  const router = useRouter();
  const searchInputId = useId();
  const [isLoggingOut, startLogoutTransition] = useTransition();
  const [openMenuKey, setOpenMenuKey] = useState<string | null>(null);

  function handleMenuOpenChange(menuKey: string, isOpen: boolean) {
    setOpenMenuKey((currentMenuKey) =>
      isOpen ? menuKey : currentMenuKey === menuKey ? null : currentMenuKey,
    );
  }

  function handleLogout() {
    startLogoutTransition(async () => {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push(logoutRedirectTo);
      router.refresh();
    });
  }

  return (
    <nav
      aria-label="Primary"
      className={showSearch ? "topbar mt-site-topbar topbar-with-search" : "topbar mt-site-topbar"}
    >
      <Link prefetch={false} aria-label="Moral Trade, home" className="brand mt-brand-link" href={brandHref}>
        <MoralTradeWordmark />
      </Link>
      <div className="topbar-links">
        {links.map((link) =>
          link.items?.length ? (
            <NavMenu
              isOpen={openMenuKey === `primary-${link.label}`}
              items={link.items}
              key={link.label}
              label={link.label}
              summary={link.summary}
              onOpenChange={(isOpen) => handleMenuOpenChange(`primary-${link.label}`, isOpen)}
            />
          ) : link.href && link.href !== primaryAction?.href && link.href !== authLink?.href ? (
            <NavItem key={`${link.href}-${link.label}`} href={link.href} label={link.label} />
          ) : null,
        )}
      </div>
      {showSearch ? (
        <form action="/offers" className="topbar-search" method="get" role="search">
          <label className="sr-only" htmlFor={searchInputId}>
            Search offers
          </label>
          <div className="topbar-search-box" style={{ gridTemplateColumns: "minmax(0, 1fr) auto" }}>
            <input id={searchInputId} name="search" placeholder="Search offers" type="search" />
            <button className="topbar-search-submit" type="submit">Search</button>
          </div>
        </form>
      ) : null}
      {showLogout || authLink || primaryAction ? (
        <div className="topbar-actions">
          {showLogout ? (
            <NavMenu
              isOpen={openMenuKey === "account"}
              items={[
                { href: "/dashboard#my-trades", label: "My trades" },
                { href: "/dashboard#data-portability", label: "Profile data" },
                { href: "/cart", label: "Favourites" },
              ]}
              label="Account"
              onOpenChange={(isOpen) => handleMenuOpenChange("account", isOpen)}
            />
          ) : null}
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
