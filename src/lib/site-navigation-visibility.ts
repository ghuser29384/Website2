import type { SiteNavLinkItem } from "./site";

// Launch hold: do not promote the public Evidence ledger before completed live
// trades have been confirmed. This is deliberately not inferred from demo data,
// local storage, sign-in state, or the presence of a listing. Re-enable it only
// after that production milestone is verified. Keep the route registry and all
// trade-specific evidence links intact; this policy controls menus, not access.
export function isSiteNavigationHrefVisible(href: string | undefined): boolean {
  const path = href?.split(/[?#]/, 1)[0].replace(/\/+$/, "");
  return path !== "/evidence";
}

export function getVisibleSiteNavLinks(links: readonly SiteNavLinkItem[]): SiteNavLinkItem[] {
  return links.flatMap((link) => {
    if (!isSiteNavigationHrefVisible(link.href)) return [];
    if (!link.items) return [link];

    const items = link.items.filter((item) => isSiteNavigationHrefVisible(item.href));
    // Avoid leaving an empty Help/More menu when its only item was Evidence.
    return items.length || link.href ? [{ ...link, items }] : [];
  });
}
