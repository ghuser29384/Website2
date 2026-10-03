import { getPrimaryNavLinks, type SiteNavLinkItem } from "@/lib/site";

/** Keep the route inventory stable for search and bespoke headers. */
export function usesDefaultHeader(links: SiteNavLinkItem[]): boolean {
  const inventory = getPrimaryNavLinks();
  return links.length === inventory.length && links.every((link, index) =>
    link.href === inventory[index].href && link.label === inventory[index].label && !link.items?.length,
  );
}

export const REFINED_HEADER_LINKS: SiteNavLinkItem[] = getPrimaryNavLinks();

export const HEADER_UTILITY_LINKS = [
  { href: "/dashboard", label: "Profile" },
  { href: "/trades/new", label: "Create a trade" },
  { href: "/saved-offers", label: "Saved offers" },
  { href: "/invite", label: "Invite" },
  { href: "/evidence", label: "Evidence" },
  { href: "/what-is-moral-trade", label: "How it works" },
  { href: "/safety", label: "Safety" },
];
