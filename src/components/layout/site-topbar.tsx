"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Fragment,
  useId,
  useMemo,
  useState,
  useTransition,
  type FormEvent,
  type KeyboardEvent,
} from "react";

import { MoralTradeWordmark } from "@/components/brand/moral-trade-wordmark";
import type { SmartQueryClarification, SmartQueryInterpretation } from "@/lib/smart-query";
import {
  filterSmartSiteSearchItems,
  getSmartSiteSearchTarget,
} from "@/lib/site-search-smart";
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

interface QueryApiResponse {
  error?: string;
  interpretation?: SmartQueryInterpretation;
  target?: string;
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
    <Link prefetch={false} className={[className, isActive ? "is-active" : ""].filter(Boolean).join(" ")} href={href}>
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
              <Link prefetch={false}
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
  const searchResultsId = useId();
  const clarificationInputId = useId();
  const [isLoggingOut, startLogoutTransition] = useTransition();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchBusy, setSearchBusy] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [searchClarification, setSearchClarification] =
    useState<SmartQueryClarification | null>(null);
  const [clarificationAnswer, setClarificationAnswer] = useState("");
  const [openMenuKey, setOpenMenuKey] = useState<string | null>(null);
  const searchResults = useMemo(
    () => filterSmartSiteSearchItems(searchQuery, 6),
    [searchQuery],
  );

  function handleMenuOpenChange(menuKey: string, isOpen: boolean) {
    if (isOpen) {
      setSearchOpen(false);
      setOpenMenuKey(menuKey);
      return;
    }

    setOpenMenuKey((currentMenuKey) => (currentMenuKey === menuKey ? null : currentMenuKey));
  }

  async function runSmartSearch(clarification?: { field: string; answer: string }) {
    const trimmedQuery = searchQuery.trim();
    setOpenMenuKey(null);

    if (!trimmedQuery) {
      router.push("/offers");
      return;
    }

    setSearchBusy(true);
    setSearchError("");
    setSearchOpen(true);
    try {
      const response = await fetch("/api/query/interpret", {
        method: "POST",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: trimmedQuery, surface: "global", clarification }),
      });
      const payload = await response.json() as QueryApiResponse;
      if (!response.ok || !payload.interpretation || !payload.target) {
        throw new Error(payload.error || "The search could not be interpreted.");
      }

      if (payload.interpretation.needsClarification && payload.interpretation.clarification) {
        setSearchClarification(payload.interpretation.clarification);
        setClarificationAnswer("");
        return;
      }

      setSearchClarification(null);
      setSearchOpen(false);
      router.push(payload.target);
    } catch (caught) {
      setSearchError(caught instanceof Error ? caught.message : "The search could not be interpreted.");
      setSearchOpen(false);
      router.push(getSmartSiteSearchTarget(trimmedQuery));
    } finally {
      setSearchBusy(false);
    }
  }

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void runSmartSearch();
  }

  function submitClarification(answer: string) {
    if (!searchClarification || !answer.trim()) return;
    void runSmartSearch({ field: searchClarification.field, answer: answer.trim() });
  }

  function handleClarificationKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") return;
    event.preventDefault();
    submitClarification(clarificationAnswer);
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
          ) : link.href ? (
            <NavItem key={`${link.href}-${link.label}`} href={link.href} label={link.label} />
          ) : null,
        )}
      </div>
      <details className="topbar-mobile-nav" suppressHydrationWarning>
        <summary>
          <span>Primary navigation</span>
          <span aria-hidden="true">Menu</span>
        </summary>
        <div className="topbar-mobile-nav-panel">
          {links.map((link) =>
            link.items?.length ? (
              <div className="topbar-mobile-nav-group" key={link.label}>
                <strong>{link.label}</strong>
                {link.items.map((item) => (
                  <NavItem key={`${item.href}-${item.label}`} href={item.href} label={item.label} />
                ))}
              </div>
            ) : link.href ? (
              <NavItem key={`${link.href}-${link.label}`} href={link.href} label={link.label} />
            ) : null,
          )}
        </div>
      </details>
      {showSearch ? (
        <form className="topbar-search" role="search" onSubmit={handleSearchSubmit}>
          <label className="sr-only" htmlFor={searchInputId}>
            Search the site
          </label>
          <div className="topbar-search-box">
            <span aria-hidden="true" className="topbar-search-icon">
              Search
            </span>
            <input
              aria-autocomplete="list"
              aria-controls={searchResultsId}
              aria-expanded={searchOpen && Boolean(searchQuery.trim())}
              aria-haspopup="listbox"
              id={searchInputId}
              role="combobox"
              name="search"
              placeholder="Search offers, people, pools, or evidence"
              type="search"
              value={searchQuery}
              onBlur={(event) => {
                const next = event.relatedTarget;
                if (next instanceof Node && event.currentTarget.form?.contains(next)) return;
                globalThis.setTimeout(() => setSearchOpen(false), 120);
              }}
              onChange={(event) => {
                setSearchQuery(event.target.value);
                setSearchOpen(true);
                setSearchClarification(null);
                setSearchError("");
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
                  setSearchClarification(null);
                  setSearchError("");
                }}
              >
                Clear
              </button>
            ) : null}
            <button className="topbar-search-submit" disabled={searchBusy} type="submit">
              {searchBusy ? "…" : "Go"}
            </button>
          </div>
          {searchOpen && searchQuery.trim() ? (
            <div
              aria-label="Search suggestions"
              className="topbar-search-results"
              id={searchResultsId}
              role="listbox"
            >
              {searchClarification ? (
                <div className="topbar-search-empty" data-testid="global-search-clarification" role="status">
                  <strong>{searchClarification.question}</strong>
                  {searchClarification.options?.length ? (
                    <div className="form-actions" aria-label="Clarification choices">
                      {searchClarification.options.map((option) => (
                        <button
                          className="button button-secondary"
                          disabled={searchBusy}
                          key={option}
                          onClick={() => submitClarification(option)}
                          type="button"
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="field">
                      <label htmlFor={clarificationInputId}>Your answer</label>
                      <input
                        autoFocus
                        id={clarificationInputId}
                        onChange={(event) => setClarificationAnswer(event.target.value)}
                        onKeyDown={handleClarificationKeyDown}
                        value={clarificationAnswer}
                      />
                      <button
                        className="button button-secondary"
                        disabled={searchBusy || !clarificationAnswer.trim()}
                        onClick={() => submitClarification(clarificationAnswer)}
                        type="button"
                      >
                        Continue
                      </button>
                    </div>
                  )}
                </div>
              ) : searchResults.length ? (
                searchResults.map((result) => (
                  <Link prefetch={false}
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
                  No direct route match. Press Go to run a semantic search.
                </div>
              )}
              {searchError ? <div className="topbar-search-empty" role="alert">{searchError}</div> : null}
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
