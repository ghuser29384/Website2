"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useId, useMemo, useState, useTransition, type FormEvent } from "react";

import { createClient } from "@/lib/supabase/browser";
import { filterSiteSearchItems } from "@/lib/site-search";

interface NavRouteItem {
  href: string;
  label: string;
  description?: string;
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
    return pathname === "/";
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

function NavMenu({ label, summary, items }: { label: string; summary?: string; items: NavRouteItem[] }) {
  const pathname = usePathname();
  const hasActiveItem = items.some((item) => (item.href ? isHrefActive(pathname, item.href) : false));

  return (
    <details className={["topbar-menu", hasActiveItem ? "is-active" : ""].filter(Boolean).join(" ")}>
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
        {items.map((item) =>
          item.href ? (
            <Link
              key={`${item.href}-${item.label}`}
              className={["topbar-menu-link", isHrefActive(pathname, item.href) ? "is-active" : ""]
                .filter(Boolean)
                .join(" ")}
              href={item.href}
            >
              <span className="topbar-menu-icon" aria-hidden="true" />
              <span className="topbar-menu-copy">
                <span>{item.label}</span>
                {item.description ? <small>{item.description}</small> : null}
              </span>
            </Link>
          ) : null,
        )}
      </div>
    </details>
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
  const searchInputId = useId();
  const [isLoggingOut, startLogoutTransition] = useTransition();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const searchResults = useMemo(() => filterSiteSearchItems(searchQuery, 6), [searchQuery]);

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedQuery = searchQuery.trim();

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
    <nav aria-label="Primary" className="topbar topbar-with-search">
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
        {links.map((link) =>
          link.items?.length ? (
            <NavMenu key={link.label} items={link.items} label={link.label} summary={link.summary} />
          ) : link.href ? (
            <NavItem key={`${link.href}-${link.label}`} href={link.href} label={link.label} />
          ) : null,
        )}
      </div>
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
            }}
            onFocus={() => setSearchOpen(true)}
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
      {showLogout || authLink || primaryAction ? (
        <div className="topbar-actions">
          {showLogout ? (
            <NavMenu
              items={[
                { href: "/dashboard#my-trades", label: "My trades", description: "Review owned and engaged offers." },
                { href: "/dashboard#data-portability", label: "Profile data", description: "Export or import account data." },
                { href: "/cart", label: "Favourites", description: "Watch offers for later review." },
              ]}
              label="Account"
              summary="Manage your saved and private workspace."
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
