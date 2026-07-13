"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Fragment, useId, useMemo, useState, useTransition, type FormEvent } from "react";

import { MoralTradeWordmark } from "@/components/brand/moral-trade-wordmark";
import { createClient } from "@/lib/supabase/browser";
import { filterSiteSearchItems } from "@/lib/site-search";

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
    <Link className={[className, isActive ? "is-active" : ""].filter(Boolean).join(" ")} href={href}>
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
  const hasActiveItem = items.some((item) => (item.href ? isHrefActive(pathname, item.href) : false));

  return (
    <details
      className={["topbar-menu", hasActiveItem ? "is-active" : ""].filter(Boolean).join(" ")}
      open={isOpen}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          onOpenChange(false);
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
        <div className="topbar-menu-heading">
          <strong>{label}</strong>
          {summary ? <span>{summary}</span> : null}
        </div>
        {items.map((item, index) => {
          const showSection = item.section && item.section !== items[index - 1]?.section;

          return item.href ? (
            <Fragment key={`${item.href}-${item.label}`}>
              {showSection ? <div className="topbar-menu-section">{item.section}</div> : null}
              <Link
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
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [openMenuKey, setOpenMenuKey] = useState<string | null>(null);
  const searchResults = useMemo(() => filterSiteSearchItems(searchQuery, 6), [searchQuery]);

  function handleMenuOpenChange(menuKey: string, isOpen: boolean) {
    if (isOpen) {
      setSearchOpen(false);
      setOpenMenuKey(menuKey);
      return;
    }

    setOpenMenuKey((currentMenuKey) => (currentMenuKey === menuKey ? null : currentMenuKey));
  }

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedQuery = searchQuery.trim();
    setOpenMenuKey(null);

    if (!trimmedQuery) {
      router.push("/offers");
      return;
    }

    setSearchOpen(false);
    router.push(`/offers?search=${encodeURIComponent(trimmedQuery)}`);
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
      <Link aria-label="Moral Trade, home" className="brand mt-brand-link" href={brandHref}>
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
          ) : link.href ? (
            <NavItem key={`${link.href}-${link.label}`} href={link.href} label={link.label} />
          ) : null,
        )}
      </div>
      {showSearch ? (
        <form className="topbar-search" role="search" onSubmit={handleSearchSubmit}>
          <label className="sr-only" htmlFor={searchInputId}>
            Search trades
          </label>
          <div className="topbar-search-box">
            <span aria-hidden="true" className="topbar-search-icon">
              Search
            </span>
            <input
              id={searchInputId}
              name="search"
              placeholder="Search trades"
              type="search"
              value={searchQuery}
              onBlur={() => {
                globalThis.setTimeout(() => setSearchOpen(false), 120);
              }}
              onChange={(event) => {
                setSearchQuery(event.target.value);
                setSearchOpen(true);
                setOpenMenuKey(null);
              }}
              onFocus={() => {
                setSearchOpen(true);
                setOpenMenuKey(null);
              }}
            />
            {searchQuery ? (
              <button
                aria-label="Clear search"
                className="topbar-search-clear"
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setSearchOpen(false);
                }}
              >
                Clear
              </button>
            ) : null}
            <button className="topbar-search-submit" type="submit">
              Go
            </button>
          </div>
          {searchOpen && searchQuery.trim() ? (
            <div className="topbar-search-results" role="listbox" aria-label="Search suggestions">
              {searchResults.length ? (
                searchResults.map((result) => (
                  <Link
                    className="topbar-search-result"
                    href={result.href}
                    key={`${result.kind}-${result.href}`}
                    role="option"
                    onClick={() => setSearchOpen(false)}
                  >
                    <span>{result.label}</span>
                    <small>{result.summary}</small>
                  </Link>
                ))
              ) : (
                <div className="topbar-search-empty" role="status">
                  No matching routes yet. Press Go to search offers.
                </div>
              )}
            </div>
          ) : null}
        </form>
      ) : null}
      {showLogout || authLink || primaryAction ? (
        <div className="topbar-actions">
          {showLogout ? (
            <NavMenu
              isOpen={openMenuKey === "account"}
              items={[
                { href: "/dashboard#my-trades", label: "My trades", description: "Review owned and engaged offers." },
                { href: "/dashboard#data-portability", label: "Profile data", description: "Export or import account data." },
                { href: "/cart", label: "Favourites", description: "Watch offers for later review." },
              ]}
              label="Account"
              summary="Manage your saved and private workspace."
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
